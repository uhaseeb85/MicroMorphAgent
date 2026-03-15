import React from 'react';
import { TransactionalRisk } from '../../types';

export function TransactionalRiskPanel({ risks }: { risks: TransactionalRisk[] }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="neo-panel p-12 border-2 border-dashed rounded-[2rem] text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/15">
            <span className="text-2xl text-emerald-500">✓</span>
        </div>
        <h3 className="text-xl font-bold mb-1 text-foreground tracking-tight">System Integrity Verified</h3>
        <p className="text-sm text-muted-foreground font-medium">No cross-domain transactional boundaries detected in the current plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="neo-button-primary px-6 py-4 rounded-[2rem] flex items-center gap-4">
        <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
            <span className="text-lg">⚠</span>
        </div>
        <div>
            <p className="text-sm font-bold tracking-tight">Critical Deployment Constraint Detected</p>
            <p className="text-[11px] font-medium leading-relaxed opacity-70">
                Atomic splitting will invalidate existing persistence contexts. Distributed consistency patterns are required for extraction.
            </p>
        </div>
      </div>
      
      <div className="grid gap-6">
        {risks.map((risk, i) => (
          <div key={i} className="neo-panel border rounded-[2rem] p-6 relative overflow-hidden">
             
             {risk.severity === 'critical' && (
               <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
                 Critical System Risk
               </div>
             )}
             
            <div className="flex items-start gap-4 mb-6">
              <div className="neo-inset w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-foreground tracking-tighter leading-tight">
                  {risk.description}
                </h4>
                <div className="flex gap-2 mt-2">
                  <span className="neo-badge text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest text-muted-foreground">
                    ID: Boundary-{i+100}
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/15 uppercase tracking-widest">
                    Mitigation: {risk.mitigationPattern.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground/75 font-medium leading-relaxed mb-6">
              {risk.explanation}
            </p>

            <div className="pt-6 border-t neo-divider grid sm:grid-cols-2 gap-8">
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Affected Persistence Classes
                </h5>
                <ul className="text-[11px] font-mono font-bold text-foreground/80 space-y-1.5">
                  {risk.affectedClasses.map((cls, cIdx) => (
                    <li key={cIdx} className="truncate" title={cls}>
                        <span className="text-border mr-2">/</span> {cls.split('.').pop()}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Cross-Domain Impact
                </h5>
                <div className="flex flex-wrap gap-2">
                  {risk.affectedDomains.map((dom, dIdx) => (
                    <span key={dIdx} className="neo-button-primary text-[10px] font-bold px-2.5 py-1 rounded-xl">
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
