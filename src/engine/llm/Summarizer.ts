import { JavaClass } from '../../types';
import { LLMClient } from './LLMClient';

export interface PackageSummary {
  packageName: string;
  domain: string;
  role: string;
  couplingConcerns: string;
}

export class Summarizer {
  private static readonly CACHE_KEY = 'micromorph.package-summary-cache.v1';
  private static readonly CACHE_VERSION = 1;
  private static readonly MAX_CACHE_ENTRIES = 250;
  private static cacheLoaded = false;
  private static cache = new Map<string, { summary: PackageSummary; updatedAt: number }>();

  private readonly llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async summarizePackage(packageName: string, classes: JavaClass[]): Promise<PackageSummary> {
    if (classes.length === 0) {
       return { packageName, domain: 'Unknown', role: 'Empty', couplingConcerns: 'None' };
    }

    const cacheKey = this.getCacheKey(packageName, classes);
    const cached = this.getCachedSummary(cacheKey);
    if (cached) {
      return cached;
    }

    const classNames = classes.map(c => `${c.fullyQualifiedName} (${c.layer})`);
    const annotations = new Set<string>();
    const outboundImports = new Set<string>();
    const transactionalMethods = new Set<string>();
    const endpointMappings: string[] = [];
    const injectionSummary = { constructor: 0, field: 0, setter: 0 };
    const supertypeSummary: string[] = [];
    const layerCounts = new Map<string, number>();

    classes.forEach(c => {
      const layerKey = c.layer || 'util';
      layerCounts.set(layerKey, (layerCounts.get(layerKey) || 0) + 1);
      c.annotations.forEach(a => annotations.add(a));
      c.imports.forEach(i => {
        if (!i.startsWith(packageName) && !i.startsWith('java.') && !i.startsWith('org.springframework.')) {
           outboundImports.add(i);
        }
      });

      // Structured transactional methods
      if (c.transactionalMethods && c.transactionalMethods.length > 0) {
        for (const tm of c.transactionalMethods) {
          const props = [tm.methodName];
          if (tm.propagation) props.push(`propagation=${tm.propagation}`);
          if (tm.readOnly) props.push('readOnly');
          transactionalMethods.add(props.join(' '));
        }
      } else {
        // Fallback for classes parsed before enrichment
        c.methods.forEach(m => {
          if (m.includes('@Transactional')) {
            transactionalMethods.add(m);
          }
        });
      }

      // Endpoint mappings
      for (const ep of c.endpointMappings ?? []) {
        endpointMappings.push(`${ep.httpMethod} ${ep.path}`);
      }

      // Injection mechanism breakdown
      for (const ip of c.injectionPoints ?? []) {
        injectionSummary[ip.mechanism] += 1;
      }

      // Superclass / interfaces
      if (c.superClass) {
        supertypeSummary.push(`${c.fullyQualifiedName.split('.').pop()} extends ${c.superClass.rawType}`);
      }
      for (const iface of c.interfaces ?? []) {
        supertypeSummary.push(`${c.fullyQualifiedName.split('.').pop()} implements ${iface}`);
      }
    });

    const systemPrompt = `You are a strict Spring Boot analysis tool computing package summaries.
Analyze the provided package structure and output ONLY a valid JSON object describing:
1. 'domain': the business domain this package represents (e.g. 'Billing', 'User Management', 'Core Infra', 'Shared Utilities')
2. 'role': its architectural role (e.g. 'persistence layer', 'controller orchestration', 'domain logic', 'shared utility library', 'internal service layer')
3. 'couplingConcerns': risk analysis of dependencies outside its domain

Note: Packages that have no REST endpoints are valid service-layer or utility packages. Identify them accurately as internal libraries or service layers rather than assuming REST API presence.

Response Schema:
{
  "domain": string,
  "role": string,
  "couplingConcerns": string
}
The input may contain representative samples and aggregated counts for large packages. Use the counts and samples together; do not assume omitted items are absent.`;

    const compactPayload = {
      packageName,
      classCount: classes.length,
      layerCounts: this.mapToSortedObject(layerCounts),
      classSamples: this.compactList(classNames, 28),
      annotations: this.compactList(Array.from(annotations), 16),
      topExternalDependencies: this.summarizeImports(Array.from(outboundImports)),
      transactionalMethodCount: transactionalMethods.size,
      transactionalMethodSamples: this.compactList(
        Array.from(transactionalMethods).map((method) => this.shortenMethodSignature(method)),
        10,
        120
      ),
      endpointCount: endpointMappings.length,
      endpointSamples: this.compactList(endpointMappings, 10, 80),
      injectionMechanisms: injectionSummary,
      supertypeSamples: this.compactList(supertypeSummary, 10, 120)
    };

    const userPrompt = `Package analysis input: ${JSON.stringify(compactPayload)}`;

    try {
      const result = await this.llm.generateJson<{ domain: string; role: string; couplingConcerns: string }>(
        systemPrompt, 
        userPrompt, 
        800
      );
      const summary = {
        packageName,
        ...result
      };
      this.storeCachedSummary(cacheKey, summary);
      return summary;
    } catch (e) {
      console.warn(`Failed to summarize package ${packageName}, using fallback`, e);
      return {
        packageName,
        domain: packageName.split('.').pop() || 'Unknown',
        role: "Unclear due to generation error",
        couplingConcerns: "Unable to analyze"
      };
    }
  }

  private compactList(items: string[], limit: number, maxItemLength: number = 100): { items: string[]; omittedCount: number } {
    const sorted = [...items].sort((left, right) => left.localeCompare(right));
    const truncatedItems = sorted.slice(0, limit).map((item) =>
      item.length > maxItemLength ? `${item.slice(0, maxItemLength - 1)}...` : item
    );

    return {
      items: truncatedItems,
      omittedCount: Math.max(0, sorted.length - truncatedItems.length)
    };
  }

  private summarizeImports(imports: string[]): { items: string[]; omittedCount: number } {
    const counts = new Map<string, number>();

    imports.forEach((importName) => {
      const normalized = this.normalizeImport(importName);
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });

    const rankedImports = Array.from(counts.entries())
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([importName, count]) => count > 1 ? `${importName} (x${count})` : importName);

    return this.compactList(rankedImports, 18, 90);
  }

  private normalizeImport(importName: string): string {
    const parts = importName.split('.');
    if (parts.length <= 3) {
      return importName;
    }

    return parts.slice(0, 3).join('.') + '.*';
  }

  private shortenMethodSignature(method: string): string {
    return method.replaceAll(/\s+/g, ' ').trim();
  }

  private mapToSortedObject(values: Map<string, number>): Record<string, number> {
    return Object.fromEntries(
      Array.from(values.entries()).sort((left, right) => left[0].localeCompare(right[0]))
    );
  }

  private getCacheKey(packageName: string, classes: JavaClass[]): string {
    const cacheVersion = Summarizer.CACHE_VERSION;
    const cacheFingerprint = this.hashString(JSON.stringify({
      cacheVersion,
      packageName,
      model: this.llm.getModelName(),
      classes: classes
        .map((javaClass) => ({
          fullyQualifiedName: javaClass.fullyQualifiedName,
          layer: javaClass.layer || 'util',
          annotations: [...javaClass.annotations].sort((left, right) => left.localeCompare(right)),
          externalImports: javaClass.imports
            .filter((importName) => !importName.startsWith(packageName) && !importName.startsWith('java.') && !importName.startsWith('org.springframework.'))
            .sort((left, right) => left.localeCompare(right)),
          transactionalMethods: (javaClass.transactionalMethods ?? [])
            .map((tm) => `${tm.methodName}${tm.propagation ? `:${tm.propagation}` : ''}${tm.readOnly ? ':ro' : ''}`)
            .sort((left, right) => left.localeCompare(right)),
          endpointCount: javaClass.endpointMappings?.length ?? 0,
          injectionCount: javaClass.injectionPoints?.length ?? 0,
          methodCount: javaClass.methods.length,
          fieldCount: javaClass.fields.length
        }))
        .sort((left, right) => left.fullyQualifiedName.localeCompare(right.fullyQualifiedName))
    }));

    return `${packageName}:${cacheFingerprint}`;
  }

  private hashString(value: string): string {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.codePointAt(index) || 0;
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16);
  }

  private getCachedSummary(cacheKey: string): PackageSummary | null {
    this.loadCache();
    return Summarizer.cache.get(cacheKey)?.summary || null;
  }

  private storeCachedSummary(cacheKey: string, summary: PackageSummary): void {
    this.loadCache();
    Summarizer.cache.set(cacheKey, { summary, updatedAt: Date.now() });
    this.pruneCache();
    this.persistCache();
  }

  private loadCache(): void {
    if (Summarizer.cacheLoaded || !this.canUseStorage()) {
      Summarizer.cacheLoaded = true;
      return;
    }

    try {
      const raw = globalThis.localStorage.getItem(Summarizer.CACHE_KEY);
      if (!raw) {
        Summarizer.cacheLoaded = true;
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, { summary: PackageSummary; updatedAt: number }>;
      Summarizer.cache = new Map(Object.entries(parsed));
    } catch (error) {
      console.warn('[Summarizer] Failed to load summary cache, starting empty.', error);
      Summarizer.cache = new Map();
    } finally {
      Summarizer.cacheLoaded = true;
    }
  }

  private persistCache(): void {
    if (!this.canUseStorage()) {
      return;
    }

    try {
      const serialized = JSON.stringify(Object.fromEntries(Summarizer.cache.entries()));
      globalThis.localStorage.setItem(Summarizer.CACHE_KEY, serialized);
    } catch (error) {
      console.warn('[Summarizer] Failed to persist summary cache.', error);
    }
  }

  private pruneCache(): void {
    if (Summarizer.cache.size <= Summarizer.MAX_CACHE_ENTRIES) {
      return;
    }

    const entriesByAge = Array.from(Summarizer.cache.entries())
      .sort((left, right) => left[1].updatedAt - right[1].updatedAt);

    while (entriesByAge.length > Summarizer.MAX_CACHE_ENTRIES) {
      const oldest = entriesByAge.shift();
      if (oldest) {
        Summarizer.cache.delete(oldest[0]);
      }
    }
  }

  private canUseStorage(): boolean {
    return globalThis.localStorage !== undefined;
  }
}
