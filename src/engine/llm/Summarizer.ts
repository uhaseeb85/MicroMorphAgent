import { JavaClass } from '../../types';
import { LLMClient } from './LLMClient';

export interface PackageSummary {
  packageName: string;
  domain: string;
  role: string;
  couplingConcerns: string;
}

export class Summarizer {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async summarizePackage(packageName: string, classes: JavaClass[]): Promise<PackageSummary> {
    if (classes.length === 0) {
       return { packageName, domain: 'Unknown', role: 'Empty', couplingConcerns: 'None' };
    }

    const classNames = classes.map(c => `${c.fullyQualifiedName} (${c.layer})`);
    const annotations = new Set<string>();
    const outboundImports = new Set<string>();
    const transactionalMethods = new Set<string>();

    classes.forEach(c => {
      c.annotations.forEach(a => annotations.add(a));
      c.imports.forEach(i => {
        if (!i.startsWith(packageName) && !i.startsWith('java.') && !i.startsWith('org.springframework.')) {
           outboundImports.add(i);
        }
      });
      c.methods.forEach(m => {
        if (m.includes('@Transactional')) {
          transactionalMethods.add(m);
        }
      });
    });

    const systemPrompt = `You are a strict Spring Boot analysis tool computing package summaries.
Analyze the provided package structure and output ONLY a valid JSON object describing:
1. 'domain': the business domain this package represents (e.g. 'Billing', 'User Management', 'Core Infra')
2. 'role': its architectural role (e.g. 'persistence layer', 'controller orchestration', 'domain logic')
3. 'couplingConcerns': risk analysis of dependencies outside its domain

Response Schema:
{
  "domain": string,
  "role": string,
  "couplingConcerns": string
}`;

    const userPrompt = `Package: ${packageName}
Classes: ${Array.from(classNames).join(', ')}
Annotations: ${Array.from(annotations).join(', ')}
Cross-package Imports: ${Array.from(outboundImports).join(', ')}
@Transactional methods: ${Array.from(transactionalMethods).join(', ')}`;

    try {
      const result = await this.llm.generateJson<{ domain: string; role: string; couplingConcerns: string }>(
        systemPrompt, 
        userPrompt, 
        300
      );
      return {
        packageName,
        ...result
      };
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
}
