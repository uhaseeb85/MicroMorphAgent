---
name: micromorph-llm-contracts
description: 'Modify LLM prompts, JSON schemas, OpenRouter integration, summarization outputs, bounded-context analysis, roadmap generation, module structure generation, or SRP refactoring prompts in MicroMorphAgent. Use for LLMClient and all src/engine/llm generators and analyzers.'
argument-hint: 'Describe which LLM stage you want to change, the schema or prompt change needed, and whether types or UI outputs also need to change.'
user-invocable: true
---

# MicroMorph LLM Contracts

Use this skill when changing any prompt or LLM-generated JSON contract so the engine, types, and UI remain synchronized.

## When to Use
- Update prompt instructions or output schema.
- Add a field to package summaries, bounded contexts, roadmap steps, transactional risks, module structures, or SRP suggestions.
- Tune concurrency, batching, or max-token usage for LLM calls.
- Adjust how OpenRouter models are invoked through `LLMClient.ts`.
- Debug invalid JSON responses or schema drift.

## Procedure
1. Identify the LLM stage: summarization, bounded-context analysis, roadmap, module structure, or class refactoring.
2. Update the TypeScript output contract before or alongside the prompt text.
3. Keep prompts explicit that the model must return raw JSON only with no markdown fences.
4. Align `LLMClient.ts` parsing expectations with the target schema.
5. If new data surfaces in the report, thread it through `Orchestrator.ts`, `types/index.ts`, and the relevant UI panel.
6. Re-check non-AI paths so static mode still produces a valid partial plan.
7. Validate with `npm run build`.

## Guardrails
- Preserve machine-readable JSON contracts.
- Do not add ambiguous free-text fields when an enum or structured shape is possible.
- Keep prompts honest about missing data; never instruct the model to fabricate endpoints or relationships.
- Favor minimal schema changes because each new field ripples through engine, types, and UI.

## Primary Files
- `src/engine/llm/LLMClient.ts`
- `src/engine/llm/Summarizer.ts`
- `src/engine/llm/BoundedContextAnalyzer.ts`
- `src/engine/llm/RoadmapGenerator.ts`
- `src/engine/llm/ModuleStructureGenerator.ts`
- `src/engine/llm/ClassRefactoringAnalyzer.ts`
- `src/types/index.ts`
- `src/engine/Orchestrator.ts`

## References
- [LLM contract checklist](./references/llm-contract-checklist.md)
