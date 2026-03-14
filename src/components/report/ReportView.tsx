import React, { useState, useRef } from 'react';
import type { DecompositionPlan, BoundedContext } from '../../types';
import { ModuleStructureView } from './ModuleStructureView';
import { ExtractionRoadmap } from './ExtractionRoadmap';
import { TransactionalRiskPanel } from './TransactionalRiskPanel';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function ServiceNav({ contexts, activeIdx, onSelect }: {
  contexts: BoundedContext[];
  activeIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <nav className="rounded-2xl overflow-hidden sticky top-6 border bg-white shadow-sm" style={{ borderColor: 'hsl(214 20% 90%)' }}>
      <div className="px-5 py-4 border-b flex items-center gap-2 bg-slate-50"
           style={{ borderColor: 'hsl(214 20% 92%)' }}>
        <div className="w-1.5 h-3.5 bg-slate-900 rounded-full" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {contexts.length} Core Services
        </span>
      </div>
      <ul className="py-2">
        {contexts.map((ctx, i) => {
          const riskColor =
            ctx.riskScore === 'low'    ? 'bg-emerald-500' :
            ctx.riskScore === 'medium' ? 'bg-amber-500' :
                                         'bg-rose-500';
          return (
            <li key={i}>
              <button
                onClick={() => onSelect(i)}
                className="w-full text-left px-5 py-3 flex items-center gap-3 text-sm transition-all group"
                style={activeIdx === i ? {
                  background: 'hsl(210 20% 98%)',
                  color: 'hsl(222 25% 15%)',
                  fontWeight: 700
                } : {
                  color: 'hsl(215 15% 45%)'
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${riskColor}`} />
                <span className="truncate tracking-tight">{ctx.suggestedServiceName}</span>
                {activeIdx === i && (
                    <div className="ml-auto w-1 h-4 bg-slate-900 rounded-full" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ServiceDetail({ context, index, total }: { context: BoundedContext; index: number; total: number }) {
  const risk = context.riskScore;
  const riskColor =
    risk === 'low'    ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
    risk === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                        'text-rose-600 bg-rose-50 border-rose-100';

  return (
    <div className="rounded-2xl overflow-hidden border bg-white shadow-sm" style={{ borderColor: 'hsl(214 20% 90%)' }}>
      <div className="px-8 py-6 border-b bg-slate-50/50" style={{ borderColor: 'hsl(214 20% 92%)' }}>
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Service Infrastructure {index + 1} / {total}
            </span>
            <h2 className="text-3xl font-bold tracking-tighter text-slate-900">
              {context.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border bg-white text-slate-600 border-slate-200">
                    {context.suggestedServiceName}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
                    Internal Target
                </span>
            </div>
          </div>
          <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase tracking-widest shrink-0 ${riskColor}`}>
            LEVEL: {risk} RISK
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1 h-3 bg-slate-300 rounded-full" />
                Contextual Rationale
              </h4>
              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                {context.llmRationale}
              </p>
              {context.riskRationale && (
                <div className="mt-4 p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                    <p className="text-[11px] font-bold text-rose-600 leading-relaxed uppercase tracking-tight">
                        Security & Transactional Boundary Note:
                    </p>
                    <p className="text-xs mt-1 text-rose-700 leading-relaxed font-medium">
                        {context.riskRationale}
                    </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Artifacts', value: context.packages.length, icon: '📦' },
                { label: 'Schemas', value: context.entities.length, icon: '🗄️' },
                { label: 'Endpoints', value: context.apis.length, icon: '🔌' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-5 border text-center bg-slate-50/30" style={{ borderColor: 'hsl(214 20% 92%)' }}>
                  <div className="text-xl mb-2">{s.icon}</div>
                  <div className="font-bold text-2xl text-slate-900 tracking-tighter">{s.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1 h-3 bg-slate-300 rounded-full" />
                Package Ownership
              </h4>
              <div className="flex flex-wrap gap-2">
                {context.packages.map((p, i) => (
                  <span key={i} className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-slate-50 text-slate-500 border-slate-200" title={p}>
                    {p.split('.').slice(-2).join('.')}
                  </span>
                ))}
              </div>
            </div>

            {context.entities.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <div className="w-1 h-3 bg-slate-300 rounded-full" />
                  Domain Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {context.entities.map((e, i) => (
                    <span key={i} className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-white text-slate-600 border-slate-200">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>

        {context.sharedTableConflicts.length > 0 && (
          <div className="rounded-xl p-5 border border-rose-100 bg-rose-50/30">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-rose-600 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Shared Table Convergence Risk
            </h4>
            <ul className="grid sm:grid-cols-2 gap-2">
              {context.sharedTableConflicts.map((c, i) => (
                  <li key={i} className="text-xs font-bold text-rose-700 font-mono">
                    <span className="opacity-50">#</span> {c}
                  </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <div className="w-1 h-3 bg-slate-300 rounded-full" />
              Structural Implementation Blueprint
            </h4>
            {context.proposedModuleStructure ? (
              <ModuleStructureView structure={context.proposedModuleStructure} />
            ) : (
              <div className="rounded-2xl p-8 text-center border-2 border-dashed border-slate-100 bg-slate-50/30">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Blueprint not generated (Static Mode active)
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export function ReportView({ plan, onNewAnalysis }: { plan: DecompositionPlan; onNewAnalysis?: () => void }) {
  const [activeService, setActiveService] = useState(0);
  const [activeTab, setActiveTab]         = useState<'services' | 'roadmap' | 'risks'>('services');
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `decomposition-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    try {
      const canvas  = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf     = new jsPDF('p', 'mm', 'a4');
      const w       = pdf.internal.pageSize.getWidth();
      pdf.addImage(imgData, 'JPEG', 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save('microservice-roadmap.pdf');
    } catch (e) {
      alert('PDF export failed. Try Export JSON instead.');
    }
  };

  const tabs = [
    { id: 'services' as const, label: `Services (${plan.boundedContexts.length})` },
    { id: 'roadmap'  as const, label: `Extraction Roadmap` },
    { id: 'risks'    as const, label: `Domain Risks (${plan.transactionalRisks.length})` },
  ];

  return (
    <div className="min-h-screen pb-20 bg-slate-50/50">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 border-b px-8 py-4 flex items-center justify-between gap-6 bg-white shadow-sm"
           style={{ borderColor: 'hsl(214 20% 90%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-900 border shadow-lg border-slate-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="space-y-0.5">
              <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-none">MicroMorph</h1>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    Verification Complete
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    v1.0.4
                  </span>
              </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Size</div>
                    <div className="text-xs font-bold text-slate-900">{plan.dependencyGraph.length} Components</div>
                </div>
                <div className="w-[1px] h-6 bg-slate-200" />
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Targets</div>
                    <div className="text-xs font-bold text-slate-900">{plan.boundedContexts.length} Services</div>
                </div>
                <div className="w-[1px] h-6 bg-slate-200" />
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Level</div>
                    <div className="text-xs font-bold text-amber-600">{plan.transactionalRisks.length} Detected</div>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3">
          {onNewAnalysis && (
            <button onClick={onNewAnalysis}
              className="text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
              New Instance
            </button>
          )}
          <div className="w-[1px] h-6 bg-slate-200 mx-1" />
          <button onClick={handleExportJson}
            className="text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            JSON
          </button>
          <button onClick={handleExportPdf}
            className="text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all bg-slate-900 text-white shadow-md hover:bg-slate-800">
            Export Report
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8">
          {/* Tab bar */}
          <div className="mt-8 flex gap-1 border-b" style={{ borderColor: 'hsl(214 20% 90%)' }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative"
                style={{
                  color: activeTab === tab.id ? 'hsl(222 25% 15%)' : 'hsl(215 15% 60%)',
                }}>
                {tab.label}
                {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div ref={reportRef} className="py-8">
            {activeTab === 'services' && (
              <div className="grid md:grid-cols-[260px_1fr] gap-8">
                <div className="space-y-6">
                  <ServiceNav contexts={plan.boundedContexts} activeIdx={activeService} onSelect={setActiveService} />
                </div>

                <div className="space-y-4">
                  <ServiceDetail
                    context={plan.boundedContexts[activeService]}
                    index={activeService}
                    total={plan.boundedContexts.length}
                  />

                  <div className="flex justify-between items-center py-4 px-2">
                    <button
                      disabled={activeService === 0}
                      onClick={() => setActiveService(i => i - 1)}
                      className="text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30">
                      ← Sequence Previous
                    </button>
                    <button
                      disabled={activeService === plan.boundedContexts.length - 1}
                      onClick={() => setActiveService(i => i + 1)}
                      className="text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:opacity-30">
                      Sequence Next →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'roadmap' && (
              <div className="max-w-4xl mx-auto">
                <ExtractionRoadmap steps={plan.extractionRoadmap} />
              </div>
            )}

            {activeTab === 'risks' && (
              <div className="max-w-4xl mx-auto">
                <TransactionalRiskPanel risks={plan.transactionalRisks} />
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
