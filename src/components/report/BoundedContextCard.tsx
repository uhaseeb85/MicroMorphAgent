import React, { useState } from 'react';
import type { BoundedContext } from '../../types';
import { ModuleStructureView } from './ModuleStructureView';

export function BoundedContextCard({ context }: { context: BoundedContext }) {
  const [expanded, setExpanded] = useState(false);

  const risk = context.riskScore;
  const riskColor =
    risk === 'low'    ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
    risk === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                        'text-rose-600 bg-rose-50 border-rose-100';

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-xl border bg-white"
         style={{ borderColor: 'hsl(214 20% 90%)' }}>
      
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-slate-50/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-bold tracking-tighter text-slate-900 truncate">
              {context.name}
            </h3>
            <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-500 border-slate-200">
                    {context.suggestedServiceName}
                </span>
            </div>
          </div>
          <div className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-widest shrink-0 ${riskColor}`}>
            {risk} RISK
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4">
          {[
            { label: 'Artifacts', value: context.packages.length, icon: '📦' },
            { label: 'Schemas', value: context.entities.length, icon: '🗄️' },
            { label: 'APIs', value: context.apis.length, icon: '🔌' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
                <span className="text-xs">{s.icon}</span>
                <span className="text-[10px] font-bold text-slate-900">{s.value}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div className="px-6 py-4">
        <p className="text-sm font-medium leading-relaxed text-slate-500 line-clamp-2">
          {context.llmRationale}
        </p>
      </div>

      {/* Entities pill list */}
      {context.entities.length > 0 && (
        <div className="px-6 pb-4 flex flex-wrap gap-1.5">
          {context.entities.slice(0, 3).map((e, i) => (
            <span key={i} className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-400 border-slate-100">
              {e}
            </span>
          ))}
          {context.entities.length > 3 && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 flex items-center">
              +{context.entities.length - 3} MORE
            </span>
          )}
        </div>
      )}

      {/* Module Structure expand toggle */}
      {context.proposedModuleStructure && (
        <div className="mt-auto border-t" style={{ borderColor: 'hsl(214 20% 92%)' }}>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full px-6 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors bg-white hover:bg-slate-50 text-slate-500"
          >
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                {expanded ? 'Hide' : 'Examine'} Blueprint
            </div>
            <span className="text-[10px] opacity-30">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="px-4 pb-6 bg-slate-50/20">
              <ModuleStructureView structure={context.proposedModuleStructure} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
