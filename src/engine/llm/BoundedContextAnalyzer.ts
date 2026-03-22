import { BoundedContext, GraphNode } from '../../types';
import { LLMClient } from './LLMClient';
import { PackageSummary } from './Summarizer';

interface ContextPayload {
  packageSummaries: PackageSummary[];
  topCoChangePairs: { classA: string, classB: string, frequency: number }[];
  transactionalCrossings: string[];
}

export class BoundedContextAnalyzer {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async analyze(
    summaries: PackageSummary[], 
    coChanges: any[], 
    transactionalNodes: GraphNode[],
    granularity: 'coarse' | 'balanced' | 'fine' = 'balanced'
  ): Promise<BoundedContext[]> {
    
    const granularityInstruction: Record<string, string> = {
      coarse:   'Prefer FEWER, LARGER services (2-4 total). Only split on strong domain boundaries.',
      balanced: 'Target 4-7 services. Balance cohesion with autonomy.',
      fine:     'Prefer MANY SMALLER services (8+ total). Split aggressively on each distinct bounded context.'
    };

    const txCrossings = transactionalNodes
      .filter(n => n.transactionalBoundary)
      .map(n => `Class: ${n.id} | Outbound Calls: ${n.outboundDeps.join(', ')}`);

    const payload: ContextPayload = {
      packageSummaries: summaries,
      topCoChangePairs: coChanges.slice(0, 50),
      transactionalCrossings: txCrossings
    };

    const systemPrompt = [
      'You are a senior software architect performing microservice decomposition.',
      `Granularity directive: ${granularityInstruction[granularity]}`,
      'Analyze the provided package summaries, git co-change pairs, and cross-package @Transactional usages.',
      'Group packages into discrete Bounded Contexts (Microservices).',
      'Return ONLY valid JSON matching this exact schema:',
      '{',
      '  "boundedContexts": [',
      '    {',
      '      "name": "string (e.g. OrderManagement)",',
      '      "suggestedServiceName": "string (e.g. order-service)",',
      '      "packages": ["string"],',
      '      "entities": ["string"],',
      '      "apis": ["string (e.g. GET /api/orders) — use an empty array [] for pure service layers or internal libraries with no REST endpoints"],',
      '      "inboundDependencyCount": number,',
      '      "outboundDependencyCount": number,',
      '      "sharedTableConflicts": ["string (e.g. users_table split)"],',
      '      "riskScore": "low" | "medium" | "high",',
      '      "riskRationale": "string",',
      '      "llmRationale": "string (Why these packages belong together)"',
      '    }',
      '  ]',
      '}',
      'Note: Some bounded contexts may be pure service layers, shared utility modules, or internal libraries with no REST endpoints. For these, use an empty "apis" array — do not fabricate endpoints.',
      'Do not use markdown code fences. Only output raw JSON.'
    ].join('\n');

    const userPrompt = `Monolith Analysis Data:\n${JSON.stringify(payload, null, 2)}`;

    try {
      const response = await this.llm.generateJson<{ boundedContexts: BoundedContext[] }>(
        systemPrompt, 
        userPrompt, 
        4000
      );
      return response.boundedContexts || [];
    } catch (e: any) {
      console.error('Failed to analyze bounded contexts', e);
      throw new Error(`BoundedContext Analysis Error: ${e.message}`);
    }
  }
}
