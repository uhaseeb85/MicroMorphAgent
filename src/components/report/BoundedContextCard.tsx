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
    <div className="neo-panel rounded-[2rem] overflow-hidden flex flex-col transition-all hover:scale-[1.01]">
      
      {/* Header */}
      <div className="px-6 pt-6 pb-4 bg-[hsl(var(--background)/0.24)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-bold tracking-tighter text-foreground truncate">
              {context.name}
            </h3>
            <div className="flex items-center gap-2">
                <span className="neo-badge font-mono text-[10px] font-bold px-2.5 py-1 rounded-full text-muted-foreground">
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
                <span className="text-[10px] font-bold text-foreground">{s.value}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div className="px-6 py-4">
        <p className="text-sm font-medium leading-relaxed text-foreground/75 line-clamp-2">
          {context.llmRationale}
        </p>
      </div>

      {/* Entities pill list */}
      {context.entities.length > 0 && (
        <div className="px-6 pb-4 flex flex-wrap gap-1.5">
          {context.entities.slice(0, 3).map((e, i) => (
            <span key={i} className="neo-badge text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg text-muted-foreground">
              {e}
            </span>
          ))}
          {context.entities.length > 3 && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center">
              +{context.entities.length - 3} MORE
            </span>
          )}
        </div>
      )}

      {/* Module Structure expand toggle */}
      {context.proposedModuleStructure && (
        <div className="mt-auto border-t neo-divider">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full px-6 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-colors bg-transparent hover:bg-background/25 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                {expanded ? 'Hide' : 'Examine'} Blueprint
            </div>
            <span className="text-[10px] opacity-30">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="px-4 pb-6 bg-background/10">
              <ModuleStructureView structure={context.proposedModuleStructure} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
