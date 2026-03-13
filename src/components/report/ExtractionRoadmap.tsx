import React from 'react';
import { ExtractionStep } from '../../types';

export function ExtractionRoadmap({ steps }: { steps: ExtractionStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative border-l border-muted-foreground/30 ml-4 lg:ml-8 py-4 space-y-12">
      {steps.map((step, index) => (
        <div key={index} className="relative pl-8">
          {/* Timeline Dot */}
          <div className="absolute -left-3.5 top-1.5 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-xs shadow-sm shadow-primary/20">
            {step.order}
          </div>

          <div className="bg-card border border-border shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold bg-muted px-3 py-1 rounded inline-flex tracking-tight">
                  Extract: {step.boundedContext}
                </h3>
              </div>
              
              <div className="flex gap-2 text-sm font-medium">
                {step.sagaRequired && (
                  <span className="bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    SAGA Required
                  </span>
                )}
                <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full">
                  ⏱️ {step.estimatedEffort}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border">
              {step.blockers.length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Blockers</h4>
                  <ul className="space-y-1">
                    {step.blockers.map((b, i) => (
                      <li key={i} className="text-sm flex items-start gap-2 text-destructive">
                         <span>⚠️</span> {b} must be extracted first
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Blockers</h4>
                  <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                    <span>✅</span> Ready for immediate extraction
                  </p>
                </div>
              )}

              {step.patternRecommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommended Patterns</h4>
                  <ul className="flex flex-wrap gap-2">
                    {step.patternRecommendations.map((p, i) => (
                      <li key={i} className="text-sm font-medium bg-secondary text-secondary-foreground border border-border rounded-md px-3 py-1">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
