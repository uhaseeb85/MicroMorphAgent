# UI Workflow Map

## Main User Journeys
1. Hero page introduces the product and routes into onboarding.
2. Onboarding collects credentials, repository or local-folder inputs, analysis mode, granularity, and SRP thresholds.
3. Analysis dashboard streams real-time progress, counts, and activity log entries.
4. Report view renders bounded contexts, dependency graph, roadmap, transactional risks, module structures, and SRP suggestions.
5. PDF export captures a report-friendly document through `html2canvas` and `jsPDF`.

## Key Components
- `src/App.tsx`: top-level flow control.
- `src/components/HeroPage.tsx`: landing experience.
- `src/components/onboarding/OnboardingForm.tsx`: config capture and persistence.
- `src/components/analysis/AnalysisDashboard.tsx`: live progress UI.
- `src/components/report/ReportView.tsx`: report shell and export path.

## UX Constraints
- Preserve support for AI, static, and demo modes.
- Preserve support for GitHub and local-folder sources.
- Keep report components resilient when optional fields are absent.
- Keep export content readable in a light PDF context even if the interactive UI uses themed styles.
