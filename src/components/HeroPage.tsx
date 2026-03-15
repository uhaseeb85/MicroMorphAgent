import React from 'react';
import { ThemeToggle } from './layout/ThemeToggle';
import {
  Layers,
  GitCommit,
  Network,
  ShieldAlert,
  Map,
  Box,
  Play,
  Zap,
  Activity,
  Code2,
} from 'lucide-react';

interface HeroPageProps {
  formNode: React.ReactNode;
  onTryDemo: () => void;
}

const FEATURES = [
  {
    icon: Layers,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    title: 'Bounded Context Detection',
    description:
      'Groups packages into candidate microservices using LLM reasoning over your real code structure — not just naming conventions.',
  },
  {
    icon: GitCommit,
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    title: 'Co-Change Matrix',
    description:
      'Mines Git commit history to find classes that evolve together, revealing hidden coupling invisible to static analysis.',
  },
  {
    icon: Network,
    color: 'text-teal-500 dark:text-teal-400',
    bg: 'bg-teal-500/10',
    title: 'Dependency Graph',
    description:
      'Builds an import- and annotation-level graph to quantify inbound and outbound coupling per class across the codebase.',
  },
  {
    icon: ShieldAlert,
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    title: 'Transactional Risk Analysis',
    description:
      'Flags @Transactional boundaries that span multiple candidate services, with recommended mitigations like Saga and Outbox.',
  },
  {
    icon: Map,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    title: 'Extraction Roadmap',
    description:
      'Produces an ordered, phased extraction plan with effort estimates, blocker callouts, and pattern recommendations.',
  },
  {
    icon: Box,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    title: 'Maven Module Scaffolding',
    description:
      'Generates proposed directory layouts and pom.xml shapes for every new service so you can start coding immediately.',
  },
];

const PHASES = [
  {
    n: 1,
    label: 'POM Discovery',
    desc: 'Fetches and parses pom.xml to extract groupId and module metadata.',
  },
  {
    n: 2,
    label: 'Code Ingestion',
    desc: 'Downloads all .java files and parses annotations, imports, and packages.',
  },
  {
    n: 3,
    label: 'Graph Construction',
    desc: 'Builds a co-change matrix and an import-level dependency graph.',
  },
  {
    n: 4,
    label: 'AI Summarization',
    desc: 'LLM generates semantic descriptions for every package.',
  },
  {
    n: 5,
    label: 'Decomposition',
    desc: 'LLM identifies bounded contexts, roadmap, risks, and module structures.',
  },
  {
    n: 6,
    label: 'Report',
    desc: 'Interactive report with graph, roadmap, risk panel, and PDF export.',
  },
];

const MODES = [
  {
    icon: Zap,
    iconColor: 'text-blue-500',
    badge: 'Full Power',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    title: 'AI Analysis',
    requires: 'GitHub token + OpenRouter key',
    desc: 'Full six-phase pipeline — LLM calls throughout, maximum insight.',
  },
  {
    icon: Activity,
    iconColor: 'text-violet-500',
    badge: 'No LLM',
    badgeClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    title: 'Static',
    requires: 'GitHub token only',
    desc: 'Phases 1–3 run normally; LLM phases fall back to heuristic algorithms for a partial report.',
  },
  {
    icon: Play,
    iconColor: 'text-emerald-500',
    badge: 'No credentials',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    title: 'Demo',
    requires: 'Nothing',
    desc: 'Runs against a synthetic Spring PetClinic dataset so you can explore the full UI instantly.',
  },
];

export function HeroPage({ formNode, onTryDemo }: HeroPageProps) {
  return (
    <div className="min-h-screen neo-shell text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b neo-divider neo-panel bg-[hsl(var(--background)/0.75)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-2xl neo-button-primary text-[15px] font-black tracking-tighter select-none">
              M
            </div>
            <div className="leading-none">
              <span className="font-bold text-sm tracking-tight text-foreground">MicroMorphAgent</span>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">
                Spring Boot Decomposer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24 space-y-24">

        {/* ── Hero — two-column ── */}
        <section className="pt-16 pb-4 grid lg:grid-cols-2 gap-12 items-start">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="neo-inset inline-flex items-center gap-2 rounded-full px-4 py-1.5 w-fit">
              <Code2 size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Spring Boot · Java · AI-Powered
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-[1.05] text-foreground">
              From monolith to microservices,{' '}
              <span className="opacity-50">in minutes.</span>
            </h1>

            {/* Subtext */}
            <p className="text-base text-muted-foreground leading-relaxed font-medium">
              Point MicroMorphAgent at any GitHub repository and get back a full
              AI-driven decomposition plan — bounded contexts, dependency graph,
              transactional risks, and Maven module scaffolds — all in the browser,
              no backend required.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3">
              {[
                { icon: Layers, color: 'text-blue-500', text: 'Bounded context detection from real code structure' },
                { icon: GitCommit, color: 'text-violet-500', text: 'Co-change matrix from Git commit history' },
                { icon: Network, color: 'text-teal-500', text: 'Import-level dependency graph per class' },
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
                Try Demo — no credentials
              </button>
            </div>
          </div>

          {/* Right column — sticky form */}
          <div className="lg:sticky lg:top-24">
            {formNode}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              What it analyses
            </p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">
              Everything that matters for decomposition
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, bg, title, description }) => (
              <div key={title} className="neo-panel rounded-3xl p-6 flex flex-col gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold tracking-tighter text-foreground text-[15px]">{title}</h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              How it works
            </p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">
              Six phases, one coherent plan
            </h2>
          </div>

          {/* Phase tiles — horizontal scroll on mobile */}
          <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-2">
            {PHASES.map(({ n, label, desc }) => (
              <div
                key={n}
                className="neo-panel-soft rounded-3xl p-5 flex flex-col gap-3 flex-1 min-w-[170px]"
              >
                {/* Phase number */}
                <div className="w-8 h-8 rounded-xl neo-button-primary flex items-center justify-center text-[11px] font-black">
                  {n}
                </div>
                <div className="space-y-1">
                  <p className="font-bold tracking-tighter text-foreground text-[13px]">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Analysis Modes ── */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Flexibility built in
            </p>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">
              Three modes, one tool
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODES.map(({ icon: Icon, iconColor, badge, badgeClass, title, requires, desc }) => (
              <div key={title} className="neo-panel rounded-3xl p-7 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <Icon size={22} className={iconColor} />
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${badgeClass}`}>
                    {badge}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black tracking-tighter text-foreground text-lg">{title}</h3>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Requires: {requires}
                  </p>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t neo-divider py-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          MicroMorphAgent — Client-side only · All rights reserved
        </p>
      </footer>
    </div>
  );
}
