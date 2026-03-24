# Pipeline Architecture

## Current Flow
1. Phase 1: Parse `pom.xml` and derive Maven metadata.
2. Phase 2: Ingest Java files from GitHub or a local folder.
3. Phase 3: Build co-change and dependency graph signals.
4. Phase 4: Run per-package LLM summarization in AI mode only.
5. Phase 5: Produce bounded contexts, roadmap, risks, module structures, and SRP suggestions.
6. Phase 6: Render the interactive report.

## Source Modes
- GitHub source: includes file fetching and commit history mining.
- Local folder source: parses files in-browser and skips commit history.

## Analysis Modes
- `ai`: full pipeline with LLM-backed reasoning.
- `static`: structural analysis only after graph construction; no LLM calls.
- `demo`: synthetic data path via `runDemo()`.

## Output Ownership
- `Orchestrator.ts` is the composition root for the analysis pipeline.
- `types/index.ts` owns the `DecompositionPlan` and related contracts.
- `analysisStore.ts` owns progress and activity state used by the dashboard.
- `ReportView.tsx` and child panels render the final plan.

## Existing Concurrency Knobs
- `LOCAL_FILE_READ_BATCH_SIZE = 48`
- `LOCAL_PARSE_BATCH_SIZE = 6`
- `LLM_PACKAGE_SUMMARY_CONCURRENCY = 3`
- `LLM_MODULE_STRUCTURE_CONCURRENCY = 2`
- `UI_YIELD_INTERVAL = 4`

## Common Failure Modes
- Output type changed in engine but not in `types/index.ts`.
- Progress UI drift where counters no longer reflect actual work.
- Static mode accidentally invoking LLM code paths.
- Local-folder path reusing GitHub-specific assumptions.
