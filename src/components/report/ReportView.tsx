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
    <nav className="rounded-2xl overflow-hidden sticky top-6" style={{ border: '1px solid hsl(230 20% 88%)', background: 'white' }}>
      <div className="px-4 py-3 border-b text-[11px] font-bold uppercase tracking-widest"
           style={{ borderColor: 'hsl(230 20% 90%)', color: 'hsl(230 15% 50%)', background: 'hsl(230 25% 97%)' }}>
        {contexts.length} Services
      </div>
      <ul className="py-1">
        {contexts.map((ctx, i) => {
          const riskDot =
            ctx.riskScore === 'low'    ? 'hsl(140 55% 45%)' :
            ctx.riskScore === 'medium' ? 'hsl(40 90% 45%)' :
                                         'hsl(0 70% 50%)';
          return (
            <li key={i}>
              <button
                onClick={() => onSelect(i)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors"
                style={activeIdx === i ? {
                  background: 'hsl(244 80% 96%)',
                  color: 'hsl(244 70% 50%)',
                  fontWeight: 600
                } : {
                  color: 'hsl(230 15% 40%)'
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: riskDot }} />
                <span className="truncate">{ctx.suggestedServiceName}</span>
                {activeIdx === i && <span className="ml-auto text-[10px]">▶</span>}
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
  const riskStyle =
    risk === 'low'    ? { bg: 'hsl(140 55% 93%)', color: 'hsl(140 55% 30%)', border: 'hsl(140 40% 80%)' } :
    risk === 'medium' ? { bg: 'hsl(40 90% 93%)',  color: 'hsl(38 80% 35%)',  border: 'hsl(40 70% 78%)' } :
                        { bg: 'hsl(0 80% 94%)',   color: 'hsl(0 70% 40%)',   border: 'hsl(0 60% 80%)' };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(230 20% 88%)', background: 'white' }}>
      {/* Service Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(230 20% 90%)', background: 'hsl(230 25% 97%)' }}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'hsl(230 15% 55%)' }}>
              Service {index + 1} of {total}
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-0.5" style={{ color: 'hsl(230 25% 12%)' }}>
              {context.name}
            </h2>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded mt-1 inline-block"
                  style={{ background: 'hsl(244 80% 95%)', color: 'hsl(244 70% 48%)' }}>
              {context.suggestedServiceName}
            </span>
          </div>
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 mt-1"
                style={{ background: riskStyle.bg, color: riskStyle.color, border: `1px solid ${riskStyle.border}` }}>
            {risk} risk
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Rationale */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(230 15% 50%)' }}>
            Decomposition Rationale
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(230 15% 35%)' }}>
            {context.llmRationale}
          </p>
          {context.riskRationale && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'hsl(0 60% 45%)' }}>
              ⚠️ {context.riskRationale}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Packages',    value: context.packages.length,  icon: '📦' },
            { label: 'Entities',    value: context.entities.length,  icon: '🗄️' },
            { label: 'APIs',        value: context.apis.length,      icon: '🔌' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'hsl(230 25% 97%)', border: '1px solid hsl(230 20% 90%)' }}>
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="font-bold text-lg" style={{ color: 'hsl(230 25% 15%)' }}>{s.value}</div>
              <div className="text-[11px]" style={{ color: 'hsl(230 15% 55%)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Packages */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(230 15% 50%)' }}>
            Owned Packages
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {context.packages.map((p, i) => (
              <span key={i} className="text-xs font-mono px-2 py-1 rounded" title={p}
                    style={{ background: 'hsl(244 80% 97%)', color: 'hsl(244 60% 50%)', border: '1px solid hsl(244 60% 88%)' }}>
                {p.split('.').slice(-2).join('.')}
              </span>
            ))}
          </div>
        </div>

        {/* Entities */}
        {context.entities.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(230 15% 50%)' }}>
              JPA Entities
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {context.entities.map((e, i) => (
                <span key={i} className="text-xs font-mono px-2 py-1 rounded"
                      style={{ background: 'hsl(230 20% 95%)', color: 'hsl(230 25% 35%)', border: '1px solid hsl(230 20% 87%)' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Shared table conflicts */}
        {context.sharedTableConflicts.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: 'hsl(0 80% 97%)', border: '1px solid hsl(0 60% 85%)' }}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(0 65% 40%)' }}>
              ⚠️ Shared Table Conflicts
            </h4>
            <ul className="text-xs space-y-0.5" style={{ color: 'hsl(0 55% 40%)' }}>
              {context.sharedTableConflicts.map((c, i) => <li key={i}>• {c}</li>)}
            </ul>
          </div>
        )}

        {/* Module Structure — always visible */}
        {context.proposedModuleStructure ? (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'hsl(230 15% 50%)' }}>
              Proposed Module Structure
            </h4>
            <ModuleStructureView structure={context.proposedModuleStructure} />
          </div>
        ) : (
          <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'hsl(230 20% 96%)', color: 'hsl(230 15% 55%)' }}>
            Module structure not generated (static analysis mode).
          </div>
        )}
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
    { id: 'roadmap'  as const, label: `Roadmap` },
    { id: 'risks'    as const, label: `Risks (${plan.transactionalRisks.length})` },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'hsl(230 30% 96%)' }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-20 border-b px-6 py-3 flex items-center justify-between gap-4"
           style={{ background: 'white', borderColor: 'hsl(230 20% 88%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'hsl(244 80% 60%)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
          <span className="font-bold text-sm">Micromorph</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'hsl(140 55% 92%)', color: 'hsl(140 55% 30%)' }}>
            Analysis Complete
          </span>
        </div>

        {/* Summary pills */}
        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: 'hsl(230 15% 50%)' }}>
          <span><b style={{ color: 'hsl(230 25% 15%)' }}>{plan.dependencyGraph.length}</b> classes</span>
          <span>·</span>
          <span><b style={{ color: 'hsl(230 25% 15%)' }}>{plan.boundedContexts.length}</b> services</span>
          <span>·</span>
          <span><b style={{ color: 'hsl(0 65% 45%)' }}>{plan.transactionalRisks.length}</b> risks</span>
        </div>

        <div className="flex gap-2">
          {onNewAnalysis && (
            <button onClick={onNewAnalysis}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'hsl(230 20% 95%)', color: 'hsl(230 15% 40%)', border: '1px solid hsl(230 20% 87%)' }}>
              New Analysis
            </button>
          )}
          <button onClick={handleExportJson}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'hsl(230 20% 95%)', color: 'hsl(230 15% 40%)', border: '1px solid hsl(230 20% 87%)' }}>
            Export JSON
          </button>
          <button onClick={handleExportPdf}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, hsl(244 75% 62%), hsl(220 75% 68%))' }}>
            Download PDF
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 pt-4 pb-0 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-t-xl text-sm font-semibold transition-all"
            style={activeTab === tab.id ? {
              background: 'white',
              color: 'hsl(244 70% 55%)',
              border: '1px solid hsl(230 20% 88%)',
              borderBottom: '1px solid white',
              marginBottom: '-1px'
            } : {
              color: 'hsl(230 15% 50%)'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={reportRef} className="px-6 pt-4 pb-10">
        {activeTab === 'services' && (
          <div className="flex gap-5">
            {/* Sidebar nav */}
            <div className="w-52 shrink-0 hidden md:block">
              <ServiceNav contexts={plan.boundedContexts} activeIdx={activeService} onSelect={setActiveService} />
            </div>

            {/* Main content — one service at a time */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Mobile pill nav */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
                {plan.boundedContexts.map((ctx, i) => (
                  <button key={i} onClick={() => setActiveService(i)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap"
                    style={activeService === i ? {
                      background: 'hsl(244 80% 60%)', color: 'white'
                    } : {
                      background: 'white', color: 'hsl(230 15% 45%)', border: '1px solid hsl(230 20% 87%)'
                    }}>
                    {ctx.suggestedServiceName}
                  </button>
                ))}
              </div>

              <ServiceDetail
                context={plan.boundedContexts[activeService]}
                index={activeService}
                total={plan.boundedContexts.length}
              />

              {/* Prev / Next buttons */}
              <div className="flex justify-between pt-2">
                <button
                  disabled={activeService === 0}
                  onClick={() => setActiveService(i => i - 1)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-30"
                  style={{ background: 'white', border: '1px solid hsl(230 20% 87%)', color: 'hsl(230 15% 40%)' }}>
                  ← Previous
                </button>
                <button
                  disabled={activeService === plan.boundedContexts.length - 1}
                  onClick={() => setActiveService(i => i + 1)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-30"
                  style={{ background: 'hsl(244 80% 60%)', color: 'white' }}>
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="max-w-3xl">
            <ExtractionRoadmap steps={plan.extractionRoadmap} />
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="max-w-3xl">
            <TransactionalRiskPanel risks={plan.transactionalRisks} />
          </div>
        )}
      </div>
    </div>
  );
}
