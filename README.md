# MicroMorphAgent

> **AI-powered microservice decomposition agent for Spring Boot monoliths.**

MicroMorphAgent analyzes your Java/Spring Boot repository and produces a data-driven decomposition plan — identifying bounded contexts, transactional risks, an extraction roadmap, and per-service Maven module structures — all from inside the browser, with no backend required.

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration Options](#configuration-options)
- [Analysis Modes](#analysis-modes)
- [Output & Report](#output--report)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Automatic bounded context detection** — groups packages into candidate microservices using LLM reasoning over your code structure.
- **Co-change matrix analysis** — mines Git commit history to find classes that evolve together, surfacing hidden coupling.
- **Dependency graph** — builds an import/annotation-level graph to quantify inbound and outbound coupling per class.
- **Transactional risk analysis** — flags `@Transactional` boundaries that span multiple candidate services, with recommended mitigation patterns (Saga, Outbox, etc.).
- **Phased extraction roadmap** — ordered extraction steps with effort estimates and blocker callouts.
- **Maven module scaffolding** — generates proposed directory layouts and `pom.xml` shapes for each new service.
- **Three analysis modes** — full AI, static heuristic, or interactive demo (no API keys required).
- **Export to PDF** — one-click report download from the browser.
- **OpenRouter model picker** — choose any model available on OpenRouter (GPT-4o, Claude 3, Gemini, Llama 3, etc.) at runtime.

---

## How It Works

Analysis runs in six sequential phases, each displayed in a real-time dashboard:

| Phase | Description |
|-------|-------------|
| 1 – POM Discovery | Fetches and parses `pom.xml` to extract `groupId` and module info. |
| 2 – Code Ingestion | Downloads all `.java` files via the GitHub Contents API and parses annotations, imports, and package structure. |
| 3 – Graph Construction | Builds a co-change matrix from Git commit history and a dependency graph from class imports. |
| 4 – LLM Summarization | Sends per-package class summaries to the LLM to generate semantic descriptions. |
| 5 – Decomposition Reasoning | LLM identifies bounded contexts, generates the extraction roadmap, transactional risk table, and per-service module structures. |
| 6 – Report | Renders an interactive report with force-directed graph, roadmap, and risk panels. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Data Visualization | D3.js + react-force-graph-2d |
| LLM Gateway | OpenRouter (via OpenAI-compatible SDK) |
| GitHub API | Octokit REST |
| XML Parsing | fast-xml-parser |
| PDF Export | jsPDF + html2canvas |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **GitHub Personal Access Token** (`repo` scope) — needed to read private repositories and to avoid rate limits on public ones.
- An **OpenRouter API Key** — required for AI and static modes. Sign up at [openrouter.ai](https://openrouter.ai).

> Demo mode requires no API keys and runs entirely offline against synthetic data.

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/uhaseeb85/MicroMorphAgent.git
cd MicroMorphAgent

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build       # Type-check + Vite production build
npm run preview     # Serve the production build locally
```

---

## Configuration Options

The onboarding form exposes the following settings:

| Setting | Description | Default |
|---------|-------------|---------|
| **GitHub Token** | PAT with `repo` scope. Stored in `localStorage`. | — |
| **OpenRouter API Key** | API key from openrouter.ai. Stored in `localStorage`. | — |
| **LLM Model** | Any model from the OpenRouter catalogue, selected at runtime. | `anthropic/claude-3.7-sonnet` |
| **Repository URL(s)** | One or more GitHub repo URLs. First is treated as `primary`. | — |
| **Branch** | Branch to analyse (defaults to repo default). | `main` |
| **Granularity** | `coarse` (2–4 services) / `balanced` (4–7) / `fine` (8+). | `balanced` |
| **Analysis Mode** | `ai`, `static`, or `demo`. See [Analysis Modes](#analysis-modes). | `ai` |
| **Max Commit History** | Number of recent commits to mine for co-change data. | 200 |
| **Include Test Files** | Whether to include `*Test.java` and `*IT.java` files. | false |
| **Co-Change Window (days)** | Commits older than this are excluded from co-change analysis. | 180 |

All settings are persisted in `localStorage` under the key `decomp_config` and restored on next visit.

---

## Analysis Modes

### `ai` (default)
Full pipeline. Requires both a GitHub token and an OpenRouter API key. All six phases run with LLM calls for summarization, bounded-context identification, roadmap generation, and module structure scaffolding.

### `static`
GitHub token required; no OpenRouter key needed. Phases 1–3 run normally (POM parsing, code ingestion, graph construction). Phase 4 (LLM summarization) is skipped. Phases 5–6 attempt LLM calls and fall back to heuristic algorithms if they fail, so a partial report is still produced.

### `demo`
No credentials required. Runs a fully synthetic end-to-end walkthrough against a mock Spring PetClinic dataset to let you explore the UI and report format without touching any real repository.

---

## Output & Report

After analysis completes the **Report View** provides:

- **Bounded Contexts panel** — one card per detected microservice with packages, entities, APIs, risk score, LLM rationale, and the proposed Maven module directory tree.
- **Dependency Graph** — interactive force-directed graph; nodes are colour-coded by architectural layer (controller / service / repository / entity / config / util).
- **Extraction Roadmap** — ordered table of extraction steps with effort, blockers, saga requirements, and pattern recommendations.
- **Transactional Risk Panel** — severity-sorted risks with affected classes, domains, and mitigation patterns.
- **Export to PDF** — renders the full report to a downloadable PDF via jsPDF + html2canvas.

---

## Project Structure

```
src/
├── components/
│   ├── analysis/        # Real-time progress dashboard (phases, stats, activity log)
│   ├── layout/          # AppLayout shell
│   ├── onboarding/      # Configuration form
│   └── report/          # Report panels (bounded contexts, graph, roadmap, risks)
├── engine/
│   ├── Orchestrator.ts  # Main pipeline controller; coordinates all phases
│   ├── github/
│   │   ├── RepoFetcher.ts          # GitHub Contents API — file and POM fetching
│   │   └── GitHistoryFetcher.ts    # GitHub Commits API — history mining
│   ├── graph/
│   │   ├── CoChangeMatrix.ts       # Builds co-change frequency matrix from commits
│   │   └── DependencyGraph.ts      # Constructs import-level dependency graph
│   ├── llm/
│   │   ├── LLMClient.ts            # OpenRouter wrapper (OpenAI-compatible)
│   │   ├── Summarizer.ts           # Per-package semantic summarization
│   │   ├── BoundedContextAnalyzer.ts  # Bounded context identification
│   │   ├── RoadmapGenerator.ts     # Extraction roadmap + transactional risks
│   │   └── ModuleStructureGenerator.ts  # Maven module scaffolding per service
│   └── parser/
│       ├── PomXmlParser.ts         # Maven POM XML parser (fast-xml-parser)
│       └── SpringAnnotationParser.ts   # Java source annotation & import parser
├── store/
│   └── analysisStore.ts  # Zustand global state (config, progress, plan)
├── types/
│   └── index.ts          # All shared TypeScript interfaces
└── utils/
    └── rateLimiter.ts    # Concurrency / rate-limit helpers for API calls
```

---

## Environment Variables

This project is a fully client-side application. There are **no server-side environment variables**. All credentials are entered in the UI and stored in `localStorage`; they are never transmitted to any server other than GitHub and OpenRouter directly from the browser.

> **Security note:** Do not share your `localStorage` contents or browser session with untrusted parties, as your API keys are stored there in plaintext.

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feat/my-feature`).
2. Make your changes and ensure the project builds (`npm run build`).
3. Run the linter (`npm run lint`) and fix any issues.
4. Open a pull request against `main` with a clear description of the change.

Please see [github-instructions.md](github-instructions.md) for the full Git workflow, branch naming conventions, and PR guidelines.

---

## License

This project is private. All rights reserved.
