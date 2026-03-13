import { ExtractionStep, BoundedContext, TransactionalRisk, GraphNode } from '../../types';
import { LLMClient } from './LLMClient';

export interface RoadmapResponse {
  extractionRoadmap: ExtractionStep[];
  transactionalRisks: TransactionalRisk[];
}

export class RoadmapGenerator {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async generate(
    boundedContexts: BoundedContext[],
    transactionalNodes: GraphNode[]
  ): Promise<RoadmapResponse> {
    
    const txRiskPayload = transactionalNodes
        .filter(n => n.transactionalBoundary && n.outboundDeps.length > 0)
        .map(n => `Class: ${n.id} in ${n.packageName} > calls > ${n.outboundDeps.join(', ')}`);

    const systemPrompt = `You are a senior technical program manager / architect defining a microservice extraction roadmap.
Given the proposed bounded contexts and @Transactional distributed boundaries, determine:
1. The exact sequence in which these services should be extracted from the monolith. Rank from easiest/highest-ROI to hardest.
2. The specific transactional consistency risks when breaking these systems apart.
Return ONLY valid JSON in this exact schema:
{
  "extractionRoadmap": [
    {
      "order": number,
      "boundedContext": "string (must match a provided context name)",
      "estimatedEffort": "days" | "weeks" | "months",
      "blockers": ["string (names of contexts that must be extracted first)"],
      "patternRecommendations": ["string (e.g. Strangler Fig, Anti-corruption Layer)"],
      "sagaRequired": boolean
    }
  ],
  "transactionalRisks": [
    {
      "description": "string",
      "affectedClasses": ["string"],
      "affectedDomains": ["string"],
      "severity": "critical" | "high" | "medium",
      "mitigationPattern": "saga" | "outbox" | "two-phase-commit" | "eventual-consistency",
      "explanation": "string"
    }
  ]
}
Do not include markdown code block syntax. Only output raw JSON.`;

    const userPrompt = `Proposed Bounded Contexts:
${JSON.stringify(boundedContexts, null, 2)}

Transactional Boundaries (Risk Signals):
${JSON.stringify(txRiskPayload, null, 2)}`;

    try {
      const response = await this.llm.generateJson<RoadmapResponse>(
        systemPrompt, 
        userPrompt, 
        4000
      );
      
      // Safety bounds
      const roadmap = Array.isArray(response.extractionRoadmap) ? response.extractionRoadmap : [];
      const risks = Array.isArray(response.transactionalRisks) ? response.transactionalRisks : [];
      
      return {
        extractionRoadmap: roadmap.sort((a, b) => a.order - b.order),
        transactionalRisks: risks.sort((a,b) => a.severity === 'critical' ? -1 : 1)
      };
    } catch (e: any) {
      console.error("Roadmap generation failed", e);
      throw new Error(`Roadmap Generation Error: ${e.message}`);
    }
  }
}
