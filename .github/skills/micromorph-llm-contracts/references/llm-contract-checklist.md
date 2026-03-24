# LLM Contract Checklist

## Stages
- Package summaries: `Summarizer.ts`
- Bounded contexts: `BoundedContextAnalyzer.ts`
- Roadmap and transactional risks: `RoadmapGenerator.ts`
- Maven module structures: `ModuleStructureGenerator.ts`
- SRP suggestions: `ClassRefactoringAnalyzer.ts`

## Contract Rules
- Return raw JSON only.
- Avoid markdown code fences.
- Keep field names stable unless there is a deliberate migration.
- Reflect schema changes in `src/types/index.ts`.

## Integration Rules
- `LLMClient.ts` is the shared integration point.
- `Orchestrator.ts` sequences all LLM stages and progress updates.
- Static mode must remain valid without LLM output.

## Prompt Design Rules
- State what the model must not invent.
- Prefer concrete schemas over narrative output.
- Include enough context for the model to reason about packages and dependencies without sending raw source unnecessarily.

## Common Pitfalls
- Prompt updated but type contract left stale.
- UI expects fields that static mode never produces.
- Adding fields to one LLM stage without updating downstream report panels.
- Relaxing the JSON-only instruction and breaking parsing.
