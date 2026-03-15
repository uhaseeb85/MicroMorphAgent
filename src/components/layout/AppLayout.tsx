import React from 'react';
import { useAnalysisStore } from '../../store/analysisStore';
import { ThemeToggle } from './ThemeToggle';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const phase = useAnalysisStore((state) => state.phase);
  const isAnalyzing = useAnalysisStore((state) => state.isAnalyzing);
  const progressMessage = useAnalysisStore((state) => state.progressMessage);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading tracking-tight">Spring Monolith Decomposer</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">AI-Powered Microservice Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAnalyzing && (
            <div className="flex items-center gap-3 text-sm border border-border/50 bg-background rounded-full px-4 py-1.5 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="font-medium">Phase {phase}:</span>
              <span className="text-muted-foreground">{progressMessage}</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground mt-auto bg-card">
        <p>Spring Monolith Decomposer — Client-Side Only Analysis</p>
      </footer>
    </div>
  );
}
