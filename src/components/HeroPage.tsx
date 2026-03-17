import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './layout/ThemeToggle';
import {
  Layers,
  GitCommit,
  Network,
  Play,
  Code2,
  Github,
  FileCode2,
  Cpu,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

interface HeroPageProps {
  formNode: React.ReactNode;
  onTryDemo: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Does any code or data leave my browser?',
    a: 'Your source code never leaves the browser. The app fetches .java files and commit metadata directly from the GitHub API using your token, parses them in-memory with a WebAssembly-compiled Lezer Java AST parser, and builds all graphs client-side. The only data sent externally is the per-package summaries (class names, annotations, cross-package imports) forwarded to your chosen OpenRouter model for semantic analysis.'
  },
  {
    q: 'How does the Java parser work?',
    a: 'Each .java file is parsed using Lezer\'s Java grammar running entirely in the browser. The AST walk extracts: the package declaration, all import statements, class/interface/enum name, Spring annotations (@RestController, @Service, @Repository, @Entity, @Configuration etc.), method signatures, field declarations, and all type references used inside the class body. If the AST parse fails, a regex fallback extracts the same fields. Nothing is sent to a server for parsing.'
  },
  {
    q: 'How is the dependency graph built?',
    a: 'After parsing, each class becomes a graph node. Outbound edges are resolved in two passes: (1) explicit imports that match another class in the same repo are direct edges; (2) unqualified type references (e.g. field types, method parameters, return types) are matched against explicit imports or same-package classes. The result is an import- and annotation-level directed graph with inbound and outbound counts per node.'
  },
  {
    q: 'What is a co-change matrix and how is it used?',
    a: 'The co-change matrix is built from Git commit history. For each commit, every pair of .java files changed together increments a frequency counter. The matrix is bi-directional for fast lookup. Only files matching the standard Maven path (src/main/java/…) are indexed by fully-qualified class name. The top 50 co-change pairs are included in the payload sent to the LLM as a structural coupling signal alongside the AST-derived dependency graph.'
  },
  {
    q: 'What does the LLM actually receive and produce?',
    a: 'Phase 4 sends one LLM call per package: class names with their detected layer, Spring annotations, cross-package imports, and @Transactional methods. The LLM returns a JSON object with the package\'s business domain, architectural role, and coupling concerns. Phase 5 sends all package summaries together with the top co-change pairs and @Transactional boundary crossings; the LLM groups them into bounded contexts with a name, service name, packages, entities, inferred APIs, dependency counts, risk score, and rationale. A second Phase 5 call generates an ordered extraction roadmap and transactional risk table. A third parallelised call generates a Maven module layout per service.'
  },
  {
    q: 'How does Static Mode differ from AI Mode?',
    a: 'Static Mode skips all LLM calls. Bounded contexts are derived heuristically from package namespace grouping and the dependency graph: top-level sub-packages after the groupId are treated as candidate domains, then inbound/outbound coupling scores are used to rank and merge them. The extraction roadmap is ordered by ascending total coupling (low-coupled services are extracted first). Transactional risks are detected by scanning for @Transactional nodes whose outbound dependencies cross context boundaries. No API key is required.'
  },
  {
    q: 'How are external library dependencies handled?',
    a: 'The dependency graph only creates nodes for classes that exist in the analysed repository. Imports that resolve to external libraries (standard library, Spring framework, third-party JARs) do not create nodes and are not included in dependency edges. They are, however, still visible in the cross-package import list forwarded to the LLM so the model can infer the role of each package (e.g. a class that imports Hibernate types is likely a persistence layer). pom.xml is parsed for groupId and module metadata but dependency versions are not currently used in the graph.'
  },
  {
    q: 'What is the rate limiter doing?',
    a: 'The GitHub API has per-minute request limits. The built-in RateLimiter batches file fetches at 50 concurrent requests with a 100 ms floor between batches. Commit detail fetches (one request per commit to get its changed-file list) are similarly batched. This prevents 429 errors on large repositories while keeping analysis time reasonable.'
  },
  {
    q: 'How is granularity controlled?',
    a: 'The granularity setting (coarse / balanced / fine) is injected as a directive into the system prompt for the BoundedContextAnalyzer LLM call. Coarse targets 2–4 services and instructs the model to only split on strong domain boundaries. Balanced targets 4–7 services. Fine instructs the model to split aggressively, targeting 8 or more services. This is a soft directive — the model may produce more or fewer contexts depending on the actual code structure.'
  },
  {
    q: 'What happens if an LLM call fails mid-analysis?',
    a: 'Package summarisation failures are caught per-package and fall back to a minimal summary (domain inferred from the last segment of the package name, role marked as unclear). If the bounded-context or roadmap LLM call fails, the error is surfaced in the activity log and analysis stops with an error message. Per-service module structure generation failures are caught individually — the service is included in the report without a module layout rather than aborting the whole pipeline.'
  },
  {
    q: 'Is my GitHub token or API key stored anywhere?',
    a: 'Credentials are stored only in your browser\'s localStorage under the key decomp_config. They are never sent to any server operated by this app. They are transmitted as Authorization headers directly from your browser to github.com and openrouter.ai respectively over HTTPS. Clearing your browser\'s site data removes them completely.'
  },
];

const FLOW_STEPS = [
  {
    icon: Github,
    label: 'Connect to GitHub',
    sub: 'Auth & API access',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-500/10',
    glowColor: '#94a3b8',
  },
  {
    icon: FileCode2,
    label: 'Retrieve Source Files',
    sub: 'Download .java classes',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    glowColor: '#3b82f6',
  },
  {
    icon: GitCommit,
    label: 'Fetch Commit History',
    sub: 'Mine co-change signals',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    glowColor: '#8b5cf6',
  },
  {
    icon: Network,
    label: 'Build Dependency Graph',
    sub: 'Map class-level coupling',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    glowColor: '#14b8a6',
  },
  {
    icon: Cpu,
    label: 'LLM Analysis',
    sub: 'AI reasons over code',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    glowColor: '#f59e0b',
  },
  {
    icon: Layers,
    label: 'Decomposition Plan',
    sub: 'Contexts, risks & roadmap',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    glowColor: '#10b981',
  },
];





export function HeroPage({ formNode, onTryDemo }: HeroPageProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % FLOW_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen neo-shell text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b neo-divider neo-panel bg-[hsl(var(--background)/0.75)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect width="28" height="28" rx="8" fill="hsl(var(--foreground))" />
              <path d="M7 19V9l4.5 6 2.5-3.5 2.5 3.5L21 9v10" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="14" cy="14" r="2" fill="hsl(var(--background))" />
            </svg>
            <span className="font-black text-base tracking-tight text-foreground select-none">Micro Morph</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 space-y-16 lg:space-y-24">

        {/* ── Hero — two-column ── */}
        <section className="pt-10 sm:pt-16 pb-4 grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="neo-inset inline-flex items-center gap-2 rounded-full px-4 py-1.5 w-fit">
              <Code2 size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                AI-Powered Decomposition Plan
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-[1.05] text-foreground">
              From monolith to microservices,{' '}
              <span className="opacity-50">in minutes.</span>
            </h1>

            {/* Subtext */}
            <p className="text-base text-muted-foreground leading-relaxed font-medium">
              Point MicroMorp at any Java GitHub repository and get back a full
              AI-driven decomposition plan — bounded contexts, dependency graph,
              transactional risks, and Maven module scaffolds.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3">
              {[
                { icon: Layers, color: 'text-blue-500', text: 'Identify functional modules from code' },
                { icon: GitCommit, color: 'text-violet-500', text: 'Analyze code evolution with Git history' },
                { icon: Network, color: 'text-teal-500', text: 'Visualize class-level dependencies' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <Icon size={16} className={color} />
                  <span className="text-sm text-muted-foreground font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Try Demo CTA */}
            <div className="pt-2">
              <button
                onClick={onTryDemo}
                className="neo-button flex items-center gap-2 px-8 py-3.5 rounded-3xl text-[12px] font-bold uppercase tracking-widest text-muted-foreground transition-all"
              >
                <Play size={14} />
                Try Demo
              </button>
            </div>
          </div>

          {/* Right column — sticky form */}
          <div className="lg:sticky lg:top-24">
            {formNode}
          </div>
        </section>

        {/* ── How It Works — Animated Flow ── */}
        <section className="space-y-8">
          <style>{`
            @keyframes travelRight {
              0%   { transform: translateX(-100%); opacity: 0; }
              15%  { opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateX(200%); opacity: 0; }
            }
            @keyframes travelDown {
              0%   { transform: translateY(-100%); opacity: 0; }
              15%  { opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateY(200%); opacity: 0; }
            }
          `}</style>
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">How it works</p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">
              From repository to roadmap
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Six automated steps transform your codebase into a complete decomposition plan.
            </p>
          </div>

          <div className="neo-panel rounded-3xl p-6 sm:p-10">
            {/* Desktop: horizontal row */}
            <div className="hidden md:flex items-start justify-between">
              {FLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                const isDone = index < activeStep;
                return (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center gap-2.5 w-24 flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${step.bg} ${isActive ? 'scale-110' : isDone ? 'opacity-70' : 'opacity-35'}`}
                        style={isActive ? { boxShadow: `0 0 22px 5px ${step.glowColor}50` } : {}}
                      >
                        {isDone ? (
                          <CheckCircle2 size={22} className="text-emerald-500" />
                        ) : (
                          <Icon size={22} className={isActive ? step.color : 'text-muted-foreground/50'} />
                        )}
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className={`text-[11px] font-bold leading-snug transition-colors duration-500 ${isActive ? 'text-foreground' : isDone ? 'text-muted-foreground/60' : 'text-muted-foreground/35'}`}>
                          {step.label}
                        </p>
                        <p className={`text-[10px] leading-snug transition-colors duration-500 ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>
                          {step.sub}
                        </p>
                      </div>
                    </div>
                    {index < FLOW_STEPS.length - 1 && (
                      <div className="flex-1 relative h-px mt-6 mx-1 bg-border/40 overflow-hidden">
                        {isDone && (
                          <div
                            className="absolute inset-0 transition-all duration-700"
                            style={{ background: `${step.glowColor}50` }}
                          />
                        )}
                        {isActive && (
                          <div
                            className="absolute inset-y-0 w-1/2"
                            style={{
                              background: `linear-gradient(to right, transparent, ${step.glowColor}cc, transparent)`,
                              animation: 'travelRight 1.8s linear infinite',
                            }}
                          />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Mobile: vertical stack */}
            <div className="flex md:hidden flex-col">
              {FLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                const isDone = index < activeStep;
                return (
                  <React.Fragment key={step.label}>
                    <div className={`flex items-center gap-4 px-3 py-2.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-foreground/5' : ''}`}>
                      <div
                        className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-500 ${step.bg} ${isActive ? '' : isDone ? 'opacity-70' : 'opacity-35'}`}
                        style={isActive ? { boxShadow: `0 0 16px 4px ${step.glowColor}40` } : {}}
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : (
                          <Icon size={18} className={isActive ? step.color : 'text-muted-foreground/50'} />
                        )}
                      </div>
                      <div>
                        <p className={`text-[12px] font-bold transition-colors duration-500 ${isActive ? 'text-foreground' : isDone ? 'text-muted-foreground/60' : 'text-muted-foreground/35'}`}>
                          {step.label}
                        </p>
                        <p className={`text-[11px] transition-colors duration-500 ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>
                          {step.sub}
                        </p>
                      </div>
                    </div>
                    {index < FLOW_STEPS.length - 1 && (
                      <div className="ml-8 w-px h-5 relative bg-border/40 overflow-hidden">
                        {isDone && (
                          <div className="absolute inset-0" style={{ background: `${step.glowColor}50` }} />
                        )}
                        {isActive && (
                          <div
                            className="absolute inset-x-0 h-1/2"
                            style={{
                              background: `linear-gradient(to bottom, transparent, ${step.glowColor}cc, transparent)`,
                              animation: 'travelDown 1.8s linear infinite',
                            }}
                          />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Under the hood</p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">Frequently asked questions</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Deep-dive answers on how MicroMorph works technically — from parsing to LLM prompts to credential storage.
            </p>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="neo-panel rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span className="text-lg font-bold text-foreground leading-snug">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`flex-shrink-0 text-muted-foreground transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isOpen ? '400px' : '0px' }}
                  >
                    <p className="px-6 pb-5 text-base text-foreground/80 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t neo-divider py-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          MicroMorph· All rights reserved
        </p>
      </footer>
    </div>
  );
}
