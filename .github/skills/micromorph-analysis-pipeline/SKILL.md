---
name: micromorph-analysis-pipeline
description: 'Modify MicroMorphAgent analysis pipeline, Orchestrator.ts, analysis phases, progress updates, analysis modes, local-folder analysis, or end-to-end decomposition flow. Use for sequencing changes across engine, store, and report generation.'
argument-hint: 'Describe the pipeline change, affected phase, and whether it impacts AI, static, demo, GitHub, or local-folder analysis.'
user-invocable: true
---

# MicroMorph Analysis Pipeline

Use this skill when work spans multiple analysis phases or when a change starts in the engine and needs to stay consistent through progress reporting and final report output.

## When to Use
- Add, remove, or reorder analysis phases.
- Change AI, static, demo, GitHub, or local-folder behavior.
- Update how progress is reported to the Zustand store.
- Wire a new engine output into the final decomposition plan.
- Diagnose an end-to-end issue where ingestion, analysis, and reporting all participate.

## Procedure
1. Start from `src/engine/Orchestrator.ts` and identify the phase boundary that owns the behavior.
2. Verify whether the change affects one mode or all modes: `ai`, `static`, `demo`, GitHub source, or local folder source.
3. Update the producing engine code first, then align types in `src/types/index.ts` and store updates in `src/store/analysisStore.ts` if the output shape changes.
4. Keep progress counters and activity log messages coherent with the actual work being done.
5. If a new artifact is produced, ensure it is added to the `DecompositionPlan` and surfaced in the report UI.
6. Validate with `npm run build` and `npm run lint`.

## Guardrails
- Preserve the six-phase mental model unless the task explicitly changes it.
- Avoid adding hidden mode-specific behavior; branch by mode explicitly.
- Local-folder analysis intentionally skips Git commit history and co-change signals.
- Static mode should avoid LLM calls and use heuristic fallbacks.
- Demo mode should remain self-contained and not require credentials.

## Primary Files
- `src/engine/Orchestrator.ts`
- `src/store/analysisStore.ts`
- `src/types/index.ts`
- `src/utils/analysisConfig.ts`
- `src/components/analysis/AnalysisDashboard.tsx`
- `src/components/report/ReportView.tsx`

## References
- [Pipeline architecture](./references/pipeline-architecture.md)
