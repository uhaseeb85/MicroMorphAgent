import React from 'react';
import { TransactionalRisk } from '../../types';

export function TransactionalRiskPanel({ risks }: { risks: TransactionalRisk[] }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="p-12 border-2 border-dashed rounded-2xl text-center bg-white" style={{ borderColor: 'hsl(214 20% 90%)' }}>
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <span className="text-2xl text-emerald-500">✓</span>
        </div>
        <h3 className="text-xl font-bold mb-1 text-slate-900 tracking-tight">System Integrity Verified</h3>
        <p className="text-sm text-slate-500 font-medium">No cross-domain transactional boundaries detected in the current plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center shrink-0">
            <span className="text-lg">⚠</span>
        </div>
        <div>
            <p className="text-sm font-bold tracking-tight">Critical Deployment Constraint Detected</p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Atomic splitting will invalidate existing persistence contexts. Distributed consistency patterns are required for extraction.
            </p>
        </div>
      </div>
      
      <div className="grid gap-6">
        {risks.map((risk, i) => (
          <div key={i} className="border rounded-2xl p-6 bg-white shadow-sm relative overflow-hidden" style={{ borderColor: 'hsl(214 20% 90%)' }}>
             
             {risk.severity === 'critical' && (
               <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
                 Critical System Risk
               </div>
             )}
             
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 tracking-tighter leading-tight">
                  {risk.description}
                </h4>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest text-slate-500">
                    ID: Boundary-{i+100}
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">
                    Mitigation: {risk.mitigationPattern.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
              {risk.explanation}
            </p>

            <div className="pt-6 border-t grid sm:grid-cols-2 gap-8" style={{ borderColor: 'hsl(214 20% 92%)' }}>
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Affected Persistence Classes
                </h5>
                <ul className="text-[11px] font-mono font-bold text-slate-600 space-y-1.5">
                  {risk.affectedClasses.map((cls, cIdx) => (
                    <li key={cIdx} className="truncate" title={cls}>
                        <span className="text-slate-300 mr-2">/</span> {cls.split('.').pop()}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Cross-Domain Impact
                </h5>
                <div className="flex flex-wrap gap-2">
                  {risk.affectedDomains.map((dom, dIdx) => (
                    <span key={dIdx} className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg shadow-sm">
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
