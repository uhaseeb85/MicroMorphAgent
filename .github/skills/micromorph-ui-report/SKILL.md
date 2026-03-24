---
name: micromorph-ui-report
description: 'Work on MicroMorphAgent onboarding, analysis dashboard, report panels, dependency graph view, PDF export, or Zustand-driven UI state. Use for src/components, App.tsx, analysisStore.ts, and report presentation changes.'
argument-hint: 'Describe the UI workflow or panel you want to change and whether it affects onboarding, progress dashboard, report rendering, graph visualization, or PDF export.'
user-invocable: true
---

# MicroMorph UI And Report

Use this skill for frontend changes that affect the onboarding flow, progress experience, or the final decomposition report.

## When to Use
- Change onboarding fields, defaults, or validation.
- Update dashboard progress cards, timelines, and activity log behavior.
- Modify report panels such as bounded contexts, roadmap, transactional risks, graph view, or SRP refactoring.
- Adjust PDF export output or styling.
- Trace a UI issue back to Zustand state wiring.

## Procedure
1. Identify the user flow: onboarding, live analysis, or final report.
2. Inspect the corresponding component plus `src/store/analysisStore.ts` and `src/types/index.ts` if the displayed data changes.
3. Keep the visual language consistent with the existing neo-panel style rather than introducing a separate design system.
4. For onboarding changes, ensure `normalizeAnalysisConfig()` and local-storage behavior remain valid.
5. For report changes, verify the exported PDF still renders meaningful content through `ReportExportDocument`.
6. Validate with `npm run build` and `npm run lint`.

## Guardrails
- This app is fully client-side; credentials are entered in the browser and stored in `localStorage` under `decomp_config`.
- Do not break demo mode by requiring credentials in shared UI flows.
- Dashboard progress should reflect the actual store fields rather than duplicating derived state ad hoc.
- Report panels should tolerate partial data from static mode.

## Primary Files
- `src/App.tsx`
- `src/components/onboarding/OnboardingForm.tsx`
- `src/components/analysis/AnalysisDashboard.tsx`
- `src/components/report/ReportView.tsx`
- `src/components/report/*.tsx`
- `src/store/analysisStore.ts`
- `src/types/index.ts`

## References
- [UI workflow map](./references/ui-workflow-map.md)
