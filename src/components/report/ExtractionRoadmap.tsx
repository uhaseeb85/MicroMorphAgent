import React from 'react';
import { ExtractionStep } from '../../types';

export function ExtractionRoadmap({ steps }: { steps: ExtractionStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative border-l-2 ml-4 lg:ml-8 py-4 space-y-12" style={{ borderColor: 'hsl(var(--border))' }}>
      {steps.map((step, index) => (
        <div key={index} className="relative pl-10">
          {/* Timeline Dot */}
          <div className="absolute -left-[14px] top-1 w-7 h-7 rounded-2xl neo-button-primary flex items-center justify-center font-bold text-[10px]">
            {step.order}
          </div>

          <div className="neo-panel rounded-[2rem] p-6 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Extraction</span>
                <h3 className="text-2xl font-bold tracking-tighter text-foreground">
                  {step.boundedContext}
                </h3>
              </div>
              
              <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                {step.sagaRequired && (
                  <span className="bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    SAGA Required
                  </span>
                )}
                <span className="neo-badge text-muted-foreground px-3 py-1.5 rounded-xl">
                  Effort: {step.estimatedEffort}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t neo-divider">
              {step.blockers.length > 0 ? (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Blocker Dependencies
                  </h4>
                  <ul className="space-y-2">
                    {step.blockers.map((b, i) => (
                      <li key={i} className="text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-2 bg-rose-500/10 p-2 rounded-xl border border-rose-500/15">
                         <span className="opacity-70">⚠</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Blocker Dependencies
                  </h4>
                  <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/15">
                    <span>✓</span> Ready for Extraction
                  </div>
                </div>
              )}

              {step.patternRecommendations.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Pattern Architecture
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {step.patternRecommendations.map((p, i) => (
                      <span key={i} className="neo-button-primary text-[10px] font-mono font-bold uppercase tracking-tighter rounded-xl px-3 py-1.5">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
