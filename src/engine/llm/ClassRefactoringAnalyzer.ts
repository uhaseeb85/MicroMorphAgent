import { JavaClass, ClassRefactoringSuggestion, SuggestedSRPClass } from '../../types';
import { LLMClient } from './LLMClient';

export interface SRPThresholds {
  methodThreshold: number;
  fieldThreshold: number;
}

interface LLMRefactoringItem {
  originalClass: string;
  rationale: string;
  suggestedClasses: SuggestedSRPClass[];
}

interface LLMRefactoringResponse {
  suggestions: LLMRefactoringItem[];
}

export class ClassRefactoringAnalyzer {
  private readonly llm: LLMClient;
  private static readonly ANALYSIS_BATCH_SIZE = 8;
  private static readonly ANALYSIS_CONCURRENCY = 2;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  /**
   * Returns only those classes that exceed the SRP thresholds.
   */
  static filterLargeClasses(classes: JavaClass[], thresholds: SRPThresholds): JavaClass[] {
    return classes.filter(
      (c) => c.methods.length >= thresholds.methodThreshold || c.fields.length >= thresholds.fieldThreshold
    );
  }

  static sizeSignal(cls: JavaClass): 'large' | 'very-large' {
    if (cls.methods.length >= 20 || cls.fields.length >= 15) return 'very-large';
    return 'large';
  }

  /**
   * LLM-powered analysis: batch up to 5 classes per call.
   */
  async analyze(
    classes: JavaClass[],
    thresholds: SRPThresholds
  ): Promise<ClassRefactoringSuggestion[]> {
    const large = ClassRefactoringAnalyzer.filterLargeClasses(classes, thresholds);
    if (large.length === 0) return [];

    const batches: JavaClass[][] = [];
    for (let i = 0; i < large.length; i += ClassRefactoringAnalyzer.ANALYSIS_BATCH_SIZE) {
      batches.push(large.slice(i, i + ClassRefactoringAnalyzer.ANALYSIS_BATCH_SIZE));
    }

    const results: ClassRefactoringSuggestion[] = [];
    for (let i = 0; i < batches.length; i += ClassRefactoringAnalyzer.ANALYSIS_CONCURRENCY) {
      const concurrentBatches = batches.slice(i, i + ClassRefactoringAnalyzer.ANALYSIS_CONCURRENCY);
      const batchResults = await Promise.all(concurrentBatches.map((batch) => this.analyzeBatch(batch)));
      results.push(...batchResults.flat());
    }

    return results;
  }

  private async analyzeBatch(batch: JavaClass[]): Promise<ClassRefactoringSuggestion[]> {
    const systemPrompt = `You are a senior Java architect identifying Single Responsibility Principle (SRP) violations in Spring Boot monolith classes that need to be split before microservice extraction.
For each class provided, propose a concrete refactoring: split it into 2-4 focused classes each with a single clear responsibility.
Return ONLY valid JSON matching this exact schema:
{
  "suggestions": [
    {
      "originalClass": "string (fully qualified class name)",
      "rationale": "string (why this class violates SRP and how splitting helps extraction)",
      "suggestedClasses": [
        {
          "name": "string (simple class name, CamelCase)",
          "responsibility": "string (one sentence describing the single responsibility)",
          "methods": ["string (method signature, e.g. findById(Long id): Owner)"],
          "fields": ["string (field declaration, e.g. private OwnerRepository ownerRepository)"]
        }
      ]
    }
  ]
}
Do not include markdown code fences. Output only raw JSON.`;

    const userPrompt = `Analyze these large Java classes for SRP violations:\n${JSON.stringify(
      batch.map((c) => ({
        fullyQualifiedName: c.fullyQualifiedName,
        packageName: c.packageName,
        layer: c.layer,
        annotations: c.annotations,
        methods: c.methods,
        fields: c.fields
      })),
      null,
      2
    )}`;

    try {
      const response = await this.llm.generateJson<LLMRefactoringResponse>(systemPrompt, userPrompt, 3000);
      const suggestions = Array.isArray(response.suggestions) ? response.suggestions : [];

      return batch.map((cls) => {
        const match = suggestions.find((s) => s.originalClass === cls.fullyQualifiedName);
        return {
          originalClass: cls.fullyQualifiedName,
          filePath: cls.filePath,
          packageName: cls.packageName,
          methodCount: cls.methods.length,
          fieldCount: cls.fields.length,
          sizeSignal: ClassRefactoringAnalyzer.sizeSignal(cls),
          suggestedClasses: match?.suggestedClasses ?? this.heuristicSplit(cls),
          rationale:
            match?.rationale ??
            `${cls.fullyQualifiedName.split('.').pop()} has ${cls.methods.length} methods and ${cls.fields.length} fields, indicating mixed responsibilities that should be separated before microservice extraction.`
        };
      });
    } catch {
      // Graceful fallback to heuristic per-class
      return batch.map((cls) => ({
        originalClass: cls.fullyQualifiedName,
        filePath: cls.filePath,
        packageName: cls.packageName,
        methodCount: cls.methods.length,
        fieldCount: cls.fields.length,
        sizeSignal: ClassRefactoringAnalyzer.sizeSignal(cls),
        suggestedClasses: this.heuristicSplit(cls),
        rationale: `${cls.fullyQualifiedName.split('.').pop()} has ${cls.methods.length} methods and ${cls.fields.length} fields. LLM analysis unavailable; heuristic split applied.`
      }));
    }
  }

  /**
   * Static-mode heuristic: groups methods by verb-prefix to infer sub-class responsibilities.
   */
  analyzeHeuristic(classes: JavaClass[], thresholds: SRPThresholds): ClassRefactoringSuggestion[] {
    const large = ClassRefactoringAnalyzer.filterLargeClasses(classes, thresholds);
    return large.map((cls) => ({
      originalClass: cls.fullyQualifiedName,
      filePath: cls.filePath,
      packageName: cls.packageName,
      methodCount: cls.methods.length,
      fieldCount: cls.fields.length,
      sizeSignal: ClassRefactoringAnalyzer.sizeSignal(cls),
      suggestedClasses: this.heuristicSplit(cls),
      rationale: `${cls.fullyQualifiedName.split('.').pop()} has ${cls.methods.length} methods and ${cls.fields.length} fields — exceeds SRP thresholds. Heuristic refactoring suggestions derived from method naming patterns.`
    }));
  }

  private heuristicSplit(cls: JavaClass): SuggestedSRPClass[] {
    const shortName = cls.fullyQualifiedName.split('.').pop() ?? cls.fullyQualifiedName;

    const groups: Record<string, { methods: string[]; label: string; responsibility: string }> = {
      query: {
        methods: [],
        label: `${shortName}QueryHandler`,
        responsibility: `Handles all read/query operations for ${shortName}.`
      },
      command: {
        methods: [],
        label: `${shortName}CommandHandler`,
        responsibility: `Handles all write/mutation operations for ${shortName}.`
      },
      domain: {
        methods: [],
        label: `${shortName}DomainService`,
        responsibility: `Encapsulates core business logic and domain rules for ${shortName}.`
      },
      util: {
        methods: [],
        label: `${shortName}Mapper`,
        responsibility: `Handles data mapping, transformation, and utility operations for ${shortName}.`
      }
    };

    for (const method of cls.methods) {
      const lower = method.toLowerCase();
      if (/^(find|get|fetch|load|list|search|read|count|exists)/.test(lower)) {
        groups.query.methods.push(method);
      } else if (/^(save|create|update|add|persist|delete|remove|store|set|put|post|patch)/.test(lower)) {
        groups.command.methods.push(method);
      } else if (/^(map|convert|transform|build|serialize|deserialize|to|from|format)/.test(lower)) {
        groups.util.methods.push(method);
      } else {
        groups.domain.methods.push(method);
      }
    }

    // Only include groups that received methods; always include at least 2
    const populated = Object.values(groups).filter((g) => g.methods.length > 0);
    const result = populated.length >= 2 ? populated : Object.values(groups).slice(0, 2);

    // Split fields evenly across populated groups (simple heuristic)
    const fieldChunkSize = Math.ceil(cls.fields.length / result.length);
    return result.map((g, i) => ({
      name: g.label,
      responsibility: g.responsibility,
      methods: g.methods,
      fields: cls.fields.slice(i * fieldChunkSize, (i + 1) * fieldChunkSize)
    }));
  }
}
