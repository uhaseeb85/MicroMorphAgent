import React, { useState } from 'react';
import { ClassRefactoringSuggestion, SuggestedSRPClass } from '../../types';

function SRPSubClassCard({ cls }: { cls: SuggestedSRPClass }) {
  return (
    <div className="neo-inset rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="neo-button-primary w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="min-w-0">
          <h5 className="font-bold text-sm tracking-tight text-foreground font-mono">{cls.name}</h5>
          <p className="text-[11px] text-muted-foreground font-medium mt-1 leading-relaxed">{cls.responsibility}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t neo-divider">
        {cls.methods.length > 0 && (
          <div>
            <h6 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <div className="w-1 h-2.5 bg-border rounded-full" />
              Methods ({cls.methods.length})
            </h6>
            <ul className="space-y-1">
              {cls.methods.map((m, i) => (
                <li key={i} className="text-[10px] font-mono text-foreground/75 truncate" title={m}>
                  <span className="text-muted-foreground mr-1.5">›</span>{m}
                </li>
              ))}
            </ul>
          </div>
        )}
        {cls.fields.length > 0 && (
          <div>
            <h6 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <div className="w-1 h-2.5 bg-border rounded-full" />
              Fields ({cls.fields.length})
            </h6>
            <ul className="space-y-1">
              {cls.fields.map((f, i) => (
                <li key={i} className="text-[10px] font-mono text-foreground/75 truncate" title={f}>
                  <span className="text-muted-foreground mr-1.5">›</span>{f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function RefactoringCard({
  suggestion,
  index
}: {
  suggestion: ClassRefactoringSuggestion;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const shortName = suggestion.originalClass.split('.').pop() ?? suggestion.originalClass;
  const isVeryLarge = suggestion.sizeSignal === 'very-large';
  const sizeColor = isVeryLarge
    ? 'text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-300'
    : 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-300';
  const sizeLabel = isVeryLarge ? 'Very Large' : 'Large';

  // Truncate path: show last 3 segments
  const pathParts = suggestion.filePath.replace(/\\/g, '/').split('/');
  const truncatedPath = pathParts.length > 3 ? `.../${pathParts.slice(-3).join('/')}` : suggestion.filePath;

  return (
    <div className="neo-panel rounded-[2rem] overflow-hidden">
      {/* Card Header */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Candidate {index + 1}
              </span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${sizeColor}`}>
                {sizeLabel}
              </span>
              {suggestion.boundedContext && (
                <span className="neo-button-primary text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg">
                  {suggestion.boundedContext}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold tracking-tighter text-foreground font-mono">{shortName}</h3>
            <p className="text-[10px] font-mono text-muted-foreground truncate" title={suggestion.originalClass}>
              {suggestion.originalClass}
            </p>
            <p className="text-[9px] text-muted-foreground/60 font-mono truncate" title={suggestion.filePath}>
              {truncatedPath}
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-2 items-end">
            <div className="neo-inset rounded-xl px-3 py-2 text-center min-w-[60px]">
              <div className="font-bold text-lg text-foreground tracking-tighter">{suggestion.methodCount}</div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Methods</div>
            </div>
            <div className="neo-inset rounded-xl px-3 py-2 text-center min-w-[60px]">
              <div className="font-bold text-lg text-foreground tracking-tighter">{suggestion.fieldCount}</div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Fields</div>
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            SRP Violation Rationale
          </p>
          <p className="text-xs text-foreground/75 font-medium leading-relaxed">{suggestion.rationale}</p>
        </div>
      </div>

      {/* Expand / Collapse Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-6 py-3 flex items-center justify-between border-t neo-divider transition-colors hover:bg-foreground/[0.02]"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Suggested Refactoring → {suggestion.suggestedClasses.length} Classes
        </span>
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded: Sub-class suggestions */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 grid gap-4 sm:grid-cols-2">
          {suggestion.suggestedClasses.map((cls, i) => (
            <SRPSubClassCard key={i} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClassRefactoringPanel({
  suggestions
}: {
  suggestions: ClassRefactoringSuggestion[];
}) {
  const [sortBy, setSortBy] = useState<'size' | 'context'>('size');

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="neo-panel p-12 border-2 border-dashed rounded-[2rem] text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/15">
          <span className="text-2xl text-emerald-500">✓</span>
        </div>
        <h3 className="text-xl font-bold mb-1 text-foreground tracking-tight">All Classes Are Well-Sized</h3>
        <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">
          No classes exceeded the SRP thresholds you configured. The codebase is ready for microservice extraction without intra-class refactoring.
        </p>
      </div>
    );
  }

  const veryLargeCount = suggestions.filter(s => s.sizeSignal === 'very-large').length;
  const totalSuggestedClasses = suggestions.reduce((acc, s) => acc + s.suggestedClasses.length, 0);
  const totalNewClasses = totalSuggestedClasses - suggestions.length; // net additions

  const sorted = [...suggestions].sort((a, b) => {
    if (sortBy === 'size') {
      if (a.sizeSignal !== b.sizeSignal) return a.sizeSignal === 'very-large' ? -1 : 1;
      return (b.methodCount + b.fieldCount) - (a.methodCount + a.fieldCount);
    }
    return (a.boundedContext ?? 'zzz').localeCompare(b.boundedContext ?? 'zzz');
  });

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className="neo-panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Refactoring Impact Summary
            </span>
            <h2 className="text-2xl font-bold tracking-tighter text-foreground">
              {suggestions.length} Classes Flagged
            </h2>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground tracking-tighter">{veryLargeCount}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-300">Very Large</div>
            </div>
            <div className="w-[1px] bg-border self-stretch" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground tracking-tighter">{suggestions.length - veryLargeCount}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-300">Large</div>
            </div>
            <div className="w-[1px] bg-border self-stretch" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground tracking-tighter">+{totalNewClasses}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Net New Classes</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-1.5 neo-inset rounded-2xl">
            <button
              onClick={() => setSortBy('size')}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${sortBy === 'size' ? 'neo-toggle-active text-foreground' : 'text-muted-foreground'}`}
            >
              By Size
            </button>
            <button
              onClick={() => setSortBy('context')}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${sortBy === 'context' ? 'neo-toggle-active text-foreground' : 'text-muted-foreground'}`}
            >
              By Service
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t neo-divider">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Refactor Before Extraction
              </p>
              <p className="text-xs text-foreground/70 font-medium leading-relaxed mt-1">
                These classes carry mixed responsibilities that will complicate service boundary definitions. Splitting them into focused classes now reduces coupling — each sub-class is more likely to belong cleanly to a single microservice domain.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Cards */}
      <div className="space-y-4">
        {sorted.map((s, i) => (
          <RefactoringCard key={s.originalClass} suggestion={s} index={i} />
        ))}
      </div>
    </div>
  );
}
