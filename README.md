# MicroMorphAgent

AI-powered microservice decomposition for Spring Boot monoliths. Point it at a GitHub repository, pick a model, and get back a full decomposition plan — bounded contexts, dependency graph, transactional risks, extraction roadmap, and Maven module scaffolds — all running in the browser with no backend.

---

## Quick Start

```bash
git clone https://github.com/uhaseeb85/MicroMorphAgent.git
cd MicroMorphAgent
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), enter your credentials, and run an analysis.

```bash
npm run build    # production build
npm run preview  # serve the production build locally
```

---

## What You Get

| Output | Description |
|--------|-------------|
| **Bounded Contexts** | One card per candidate microservice — packages, entities, APIs, risk score, LLM rationale, and proposed Maven module layout. |
| **Dependency Graph** | Interactive force-directed graph with nodes colour-coded by layer (controller / service / repository / entity / config / util). |
| **Extraction Roadmap** | Ordered extraction steps with effort estimates, blockers, Saga requirements, and pattern recommendations. |
| **Transactional Risk Panel** | Severity-sorted `@Transactional` boundary violations with affected classes and mitigation patterns. |
| **PDF Export** | One-click full-report download via jsPDF + html2canvas. |

---

## How It Works

Six sequential phases run in a real-time dashboard:

| # | Phase | What happens |
|---|-------|--------------|
| 1 | POM Discovery | Fetches and parses `pom.xml` to extract `groupId` and module metadata. |
| 2 | Code Ingestion | Downloads all `.java` files via the GitHub Contents API; parses annotations, imports, and package structure. |
| 3 | Graph Construction | Builds a co-change matrix from Git commit history and an import-level dependency graph. |
| 4 | AI Summarization | Sends per-package class summaries to the LLM to produce semantic package descriptions. |
| 5 | Decomposition Reasoning | LLM identifies bounded contexts, generates the roadmap, risk table, and per-service module structures. |
| 6 | Report | Renders the interactive report. |

---

## Analysis Modes

| Mode | Requires | Behaviour |
|------|----------|-----------|
| **AI Analysis** | GitHub token + OpenRouter key | Full six-phase pipeline with LLM calls throughout. |
| **Static** | GitHub token only | Phases 1–3 run normally; LLM phases fall back to heuristic algorithms, producing a partial report. |
| **Demo** | Nothing | Runs against a synthetic Spring PetClinic dataset so you can explore the UI without any credentials. |

---

## Prerequisites

- Node.js ≥ 18, npm ≥ 9
- **GitHub Personal Access Token** — `repo` scope; needed for private repos and to avoid rate limits on public ones.
- **OpenRouter API Key** — required for AI Analysis and Static modes. Get one at [openrouter.ai](https://openrouter.ai). Not needed for Demo mode.

---

## Configuration

All settings are entered in the onboarding form and persisted to `localStorage` (`decomp_config`).

| Setting | Description | Default |
|---------|-------------|---------|
| GitHub Token | PAT with `repo` scope. | — |
| OpenRouter API Key | Key from openrouter.ai. | — |
| LLM Model | Any model in the OpenRouter catalogue. | `anthropic/claude-3.7-sonnet` |
| Repository URL(s) | One or more GitHub repo URLs. First is treated as primary. | — |
| Branch | Branch to analyse. | `main` |
| Granularity | `coarse` (2–4 services) / `balanced` (4–7) / `fine` (8+). | `balanced` |
| Analysis Mode | `ai`, `static`, or `demo`. | `ai` |
| Max Commit History | Recent commits to mine for co-change data. | 200 |
| Include Test Files | Include `*Test.java` and `*IT.java` files. | false |
| Co-Change Window | Exclude commits older than this many days. | 180 |

---

## Tech Stack

| | |
|-|-|
| UI | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Visualisation | D3.js + react-force-graph-2d |
| LLM | OpenRouter (OpenAI-compatible SDK) |
| GitHub API | Octokit REST |
| XML | fast-xml-parser |
| PDF | jsPDF + html2canvas |

---

## Project Structure

```
src/
├── components/
│   ├── analysis/        # Real-time progress dashboard
│   ├── layout/          # App shell
│   ├── onboarding/      # Configuration form
│   └── report/          # Bounded contexts, graph, roadmap, risks
├── engine/
│   ├── Orchestrator.ts              # Pipeline controller
│   ├── github/
│   │   ├── RepoFetcher.ts           # File and POM fetching
│   │   └── GitHistoryFetcher.ts     # Commit history mining
│   ├── graph/
│   │   ├── CoChangeMatrix.ts        # Co-change frequency matrix
│   │   └── DependencyGraph.ts       # Import-level dependency graph
│   ├── llm/
│   │   ├── LLMClient.ts             # OpenRouter wrapper
│   │   ├── Summarizer.ts            # Per-package summarisation
│   │   ├── BoundedContextAnalyzer.ts
│   │   ├── RoadmapGenerator.ts
│   │   └── ModuleStructureGenerator.ts
│   └── parser/
│       ├── PomXmlParser.ts
│       └── SpringAnnotationParser.ts
├── store/
│   └── analysisStore.ts  # Zustand global state
├── types/
│   └── index.ts
└── utils/
    └── rateLimiter.ts    # Concurrency / rate-limit helpers
```

---

## Security

This is a fully client-side application — there are no server-side environment variables. Credentials are entered in the UI, stored in `localStorage`, and sent directly to GitHub and OpenRouter from the browser. Do not share your `localStorage` contents or browser session with untrusted parties.

---

## Contributing

1. Fork and create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes and verify the build: `npm run build`
3. Fix any lint issues: `npm run lint`
4. Open a pull request against `main`

See [github-instructions.md](github-instructions.md) for the full Git workflow, branch naming conventions, and PR guidelines.

---

## License

Private — all rights reserved.
