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



export function HeroPage({ formNode, onTryDemo }: HeroPageProps) {
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
              Point MicroMorphAgent at any GitHub repository and get back a full
              AI-driven decomposition plan — bounded contexts, dependency graph,
              transactional risks, and Maven module scaffolds — all in the browser,
              no backend required.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3">
              {[
                { icon: Layers, color: 'text-blue-500', text: 'Identify functional modules from code (AI-powered)' },
                { icon: GitCommit, color: 'text-violet-500', text: 'Analyze code evolution with Git history (Non-AI)' },
                { icon: Network, color: 'text-teal-500', text: 'Visualize class-level dependencies (Non-AI)' },
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
