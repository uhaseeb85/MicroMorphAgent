import React from 'react';
import { ExtractionStep } from '../../types';

export function ExtractionRoadmap({ steps }: { steps: ExtractionStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative border-l-2 ml-4 lg:ml-8 py-4 space-y-12" style={{ borderColor: 'hsl(214 20% 90%)' }}>
      {steps.map((step, index) => (
        <div key={index} className="relative pl-10">
          {/* Timeline Dot */}
          <div className="absolute -left-[14px] top-1 w-6 h-6 rounded-lg bg-slate-900 border-4 border-white flex items-center justify-center font-bold text-[10px] text-white shadow-md">
            {step.order}
          </div>

          <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300" style={{ borderColor: 'hsl(214 20% 90%)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Extraction</span>
                <h3 className="text-2xl font-bold tracking-tighter text-slate-900">
                  {step.boundedContext}
                </h3>
              </div>
              
              <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                {step.sagaRequired && (
                  <span className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    SAGA Required
                  </span>
                )}
                <span className="bg-slate-50 text-slate-600 border border-slate-100 px-3 py-1.5 rounded-lg">
                  Effort: {step.estimatedEffort}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t" style={{ borderColor: 'hsl(214 20% 92%)' }}>
              {step.blockers.length > 0 ? (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Blocker Dependencies
                  </h4>
                  <ul className="space-y-2">
                    {step.blockers.map((b, i) => (
                      <li key={i} className="text-xs font-bold text-rose-600 flex items-center gap-2 bg-rose-50/50 p-2 rounded-lg border border-rose-100/50">
                         <span className="opacity-70">⚠</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Blocker Dependencies
                  </h4>
                  <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <span>✓</span> Ready for Extraction
                  </div>
                </div>
              )}

              {step.patternRecommendations.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Pattern Architecture
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {step.patternRecommendations.map((p, i) => (
                      <span key={i} className="text-[10px] font-mono font-bold uppercase tracking-tighter bg-slate-900 text-white rounded-lg px-3 py-1.5 shadow-sm">
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
