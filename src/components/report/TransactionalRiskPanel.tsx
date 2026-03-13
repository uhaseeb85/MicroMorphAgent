import React from 'react';
import { TransactionalRisk } from '../../types';

export function TransactionalRiskPanel({ risks }: { risks: TransactionalRisk[] }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="p-8 border border-green-200 bg-green-50 rounded-xl text-center text-green-800">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-bold mb-1">No Cross-Domain Transactional Boundaries Detected</h3>
        <p className="text-sm">The decomposition plan does not split any @Transactional scopes across services.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-sm text-sm">
        <strong>Warning:</strong> Splitting these packages will break existing database transactions. Distributed transaction patterns must be implemented.
      </div>
      
      <div className="grid gap-4">
        {risks.map((risk, i) => (
          <div key={i} className={`border border-border rounded-xl p-5 bg-card relative ${risk.severity === 'critical' ? 'border-red-400 shadow-sm' : ''}`}>
             
             {risk.severity === 'critical' && (
               <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                 Critical Risk
               </div>
             )}
             
            <div className="flex items-start gap-4 mb-3">
              <div className="text-2xl mt-1">⚠️</div>
              <div>
                <h4 className="text-base font-bold text-card-foreground leading-tight">
                  {risk.description}
                </h4>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded border">
                    Mitigation: {risk.mitigationPattern.toUpperCase().replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-3 leading-relaxed ml-10">
              {risk.explanation}
            </p>

            <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-4 ml-10">
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Affected Classes</h5>
                <ul className="text-sm font-mono text-muted-foreground space-y-1">
                  {risk.affectedClasses.map((cls, cIdx) => (
                    <li key={cIdx} className="truncate" title={cls}>• {cls.split('.').pop()}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Domains Split</h5>
                <div className="flex flex-wrap gap-1.5">
                  {risk.affectedDomains.map((dom, dIdx) => (
                    <span key={dIdx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
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
