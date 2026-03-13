import React, { useState } from 'react';
import type { BoundedContext } from '../../types';
import { ModuleStructureView } from './ModuleStructureView';

export function BoundedContextCard({ context }: { context: BoundedContext }) {
  const [expanded, setExpanded] = useState(false);

  const risk = context.riskScore;
  const riskStyle = 
    risk === 'low'    ? { bg: 'hsl(140 55% 93%)', color: 'hsl(140 55% 30%)', border: 'hsl(140 40% 80%)' } :
    risk === 'medium' ? { bg: 'hsl(40 90% 93%)',  color: 'hsl(38 80% 35%)',  border: 'hsl(40 70% 78%)' } :
                        { bg: 'hsl(0 80% 94%)',   color: 'hsl(0 70% 40%)',   border: 'hsl(0 60% 80%)' };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-lg"
         style={{ border: '1px solid hsl(230 20% 88%)', background: 'white', boxShadow: '0 2px 8px hsl(230 20% 85% / 40%)' }}>
      
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-tight truncate" style={{ color: 'hsl(230 25% 15%)' }}>
              {context.name}
            </h3>
            <span className="font-mono text-xs mt-0.5 inline-block px-2 py-0.5 rounded"
                  style={{ background: 'hsl(244 80% 96%)', color: 'hsl(244 70% 50%)' }}>
              {context.suggestedServiceName}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0"
                style={{ background: riskStyle.bg, color: riskStyle.color, border: `1px solid ${riskStyle.border}` }}>
            {risk} risk
          </span>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1" style={{ color: 'hsl(230 15% 50%)' }}>
            <span style={{ color: 'hsl(244 70% 60%)' }}>📦</span>
            {context.packages.length} packages
          </div>
          <div className="flex items-center gap-1" style={{ color: 'hsl(230 15% 50%)' }}>
            <span>🗄️</span>
            {context.entities.length} entities
          </div>
          <div className="flex items-center gap-1" style={{ color: 'hsl(230 15% 50%)' }}>
            <span>🔌</span>
            {context.apis.length} APIs
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div className="px-5 pb-4">
        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'hsl(230 15% 45%)' }}>
          {context.llmRationale}
        </p>
      </div>

      {/* Entities pill list */}
      {context.entities.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {context.entities.slice(0, 5).map((e, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded font-mono"
                  style={{ background: 'hsl(230 20% 95%)', color: 'hsl(230 25% 35%)', border: '1px solid hsl(230 20% 87%)' }}>
              {e}
            </span>
          ))}
          {context.entities.length > 5 && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'hsl(230 15% 55%)' }}>
              +{context.entities.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Module Structure expand toggle */}
      {context.proposedModuleStructure && (
        <div className="border-t" style={{ borderColor: 'hsl(230 20% 90%)' }}>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full px-5 py-3 text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-gray-50"
            style={{ color: 'hsl(244 70% 55%)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {expanded ? 'Hide' : 'Show'} Module Structure
            <span className="ml-auto text-[10px]">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="px-4 pb-4">
              <ModuleStructureView structure={context.proposedModuleStructure} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
