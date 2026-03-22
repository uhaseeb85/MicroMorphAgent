import React, { useState, useRef } from 'react';
import type { DecompositionPlan, BoundedContext } from '../../types';
import { ModuleStructureView } from './ModuleStructureView';
import { ExtractionRoadmap } from './ExtractionRoadmap';
import { TransactionalRiskPanel } from './TransactionalRiskPanel';
import { ClassRefactoringPanel } from './ClassRefactoringPanel';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ThemeToggle } from '../layout/ThemeToggle';

function ReportExportDocument({ plan }: { plan: DecompositionPlan }) {
  const sectionStyle: React.CSSProperties = {
    marginBottom: 28,
    padding: 24,
    border: '1px solid #d7dce4',
    borderRadius: 18,
    background: '#ffffff'
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 10px',
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 999,
    border: '1px solid #d7dce4',
    background: '#f5f7fb',
    fontSize: 11,
    fontWeight: 700,
    color: '#334155'
  };

  return (
    <div style={{ background: '#ffffff', color: '#0f172a', width: 1100, padding: 40, fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif' }}>
      <header style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>MicroMorph Report</p>
        <h1 style={{ margin: '10px 0 6px', fontSize: 30 }}>Microservice Decomposition Plan</h1>
        <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>Generated {new Date(plan.generatedAt).toLocaleString()}</p>
      </header>

      <section style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', fontWeight: 700 }}>Components</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{plan.dependencyGraph.length}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', fontWeight: 700 }}>Services</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{plan.boundedContexts.length}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', fontWeight: 700 }}>Transactional Risks</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{plan.transactionalRisks.length}</p>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: 22 }}>Service Boundaries</h2>
        {plan.boundedContexts.map((context, index) => (
          <div key={context.suggestedServiceName} style={{ padding: '18px 0', borderTop: index === 0 ? 'none' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{context.name}</h3>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569', fontWeight: 700 }}>{context.suggestedServiceName}</p>
              </div>
              <span style={{ ...badgeStyle, marginRight: 0 }}>{context.riskScore.toUpperCase()} RISK</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#334155' }}>{context.llmRationale}</p>
            {context.riskRationale && (
              <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: '#9f1239', fontWeight: 600 }}>{context.riskRationale}</p>
            )}
            <div>
              {context.packages.map((pkg) => (
                <span key={pkg} style={badgeStyle}>{pkg}</span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: 22 }}>Extraction Roadmap</h2>
        {plan.extractionRoadmap.map((step) => (
          <div key={`${step.order}-${step.boundedContext}`} style={{ padding: '16px 0', borderTop: step.order === 1 ? 'none' : '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 700 }}>Step {step.order}</p>
            <h3 style={{ margin: '6px 0', fontSize: 18 }}>{step.boundedContext}</h3>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#475569' }}>Estimated effort: {step.estimatedEffort}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>Patterns: {step.patternRecommendations.join(', ') || 'None'}</p>
            {step.blockers.length > 0 && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#9f1239' }}>Blockers: {step.blockers.join(', ')}</p>
            )}
          </div>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontSize: 22 }}>Transactional Risks</h2>
        {plan.transactionalRisks.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>No cross-domain transactional risks detected.</p>
        ) : (
          plan.transactionalRisks.map((risk, index) => (
            <div key={`${risk.description}-${index}`} style={{ padding: '16px 0', borderTop: index === 0 ? 'none' : '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{risk.description}</h3>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{risk.explanation}</p>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#475569' }}>Domains: {risk.affectedDomains.join(', ')}</p>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Classes: {risk.affectedClasses.join(', ')}</p>
            </div>
          ))
        )}
      </section>

      {plan.classRefactoringSuggestions && plan.classRefactoringSuggestions.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, fontSize: 22 }}>SRP Refactoring Suggestions</h2>
          {plan.classRefactoringSuggestions.map((suggestion, index) => {
            const shortName = suggestion.originalClass.split('.').pop();
            return (
              <div key={`${suggestion.originalClass}-${index}`} style={{ padding: '16px 0', borderTop: index === 0 ? 'none' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 18, fontFamily: 'monospace' }}>{shortName}</h3>
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{suggestion.originalClass}</p>
                    {suggestion.boundedContext && (
                      <span style={{ ...badgeStyle, background: '#f0f9ff', color: '#0369a1' }}>{suggestion.boundedContext}</span>
                    )}
                    <span style={{ ...badgeStyle, background: suggestion.sizeSignal === 'very-large' ? '#fff1f2' : '#fffbeb', color: suggestion.sizeSignal === 'very-large' ? '#9f1239' : '#92400e' }}>
                      {suggestion.sizeSignal === 'very-large' ? 'Very Large' : 'Large'} · {suggestion.methodCount}m / {suggestion.fieldCount}f
                    </span>
                  </div>
                </div>
                <p style={{ margin: '8px 0 12px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{suggestion.rationale}</p>
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Suggested Classes:</p>
                  {suggestion.suggestedClasses.map((cls, ci) => (
                    <div key={ci} style={{ padding: '8px 12px', marginBottom: 6, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{cls.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{cls.responsibility}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ServiceNav({ contexts, activeIdx, onSelect }: {
  contexts: BoundedContext[];
  activeIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <nav className="neo-panel rounded-[2rem] overflow-hidden sticky top-6">
      <div className="px-5 py-4 border-b neo-divider flex items-center gap-2 bg-transparent">
        <div className="w-1.5 h-3.5 bg-foreground rounded-full" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
                  background: 'var(--surface-subtle)',
                  color: 'hsl(var(--foreground))',
                  fontWeight: 700
                } : {
                  color: 'hsl(var(--muted-foreground))'
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${riskColor}`} />
                <span className="truncate tracking-tight">{ctx.suggestedServiceName}</span>
                {activeIdx === i && (
                    <div className="ml-auto w-1 h-4 bg-foreground rounded-full" />
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
    <div className="neo-panel rounded-[2rem] overflow-hidden">
      <div className="px-5 sm:px-8 py-4 sm:py-6 border-b neo-divider bg-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Service Infrastructure {index + 1} / {total}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground">
              {context.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
                <span className="neo-badge font-mono text-[11px] font-bold px-2.5 py-1 rounded-full text-foreground/80">
                    {context.suggestedServiceName}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-2">
                    Internal Target
                </span>
            </div>
          </div>
          <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase tracking-widest shrink-0 ${riskColor}`}>
            LEVEL: {risk} RISK
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-8 space-y-8 sm:space-y-10">
        <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <div className="w-1 h-3 bg-border rounded-full" />
                Contextual Rationale
              </h4>
              <p className="text-sm leading-relaxed text-foreground/80 font-medium">
                {context.llmRationale}
              </p>
              {context.riskRationale && (
                <div className="mt-4 p-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 dark:bg-rose-400/8">
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
                <div key={s.label} className="neo-inset rounded-2xl p-5 text-center">
                  <div className="text-xl mb-2">{s.icon}</div>
                  <div className="font-bold text-2xl text-foreground tracking-tighter">{s.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            {context.apis.length === 0 && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                  Internal Service Layer — No REST Endpoints Exposed
                </span>
              </div>
            )}
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <div className="w-1 h-3 bg-border rounded-full" />
                Package Ownership
              </h4>
              <div className="flex flex-wrap gap-2">
                {context.packages.map((p, i) => (
                  <span key={i} className="neo-badge text-[10px] font-mono font-bold px-2 py-1 rounded-xl text-muted-foreground" title={p}>
                    {p.split('.').slice(-2).join('.')}
                  </span>
                ))}
              </div>
            </div>

            {context.entities.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <div className="w-1 h-3 bg-border rounded-full" />
                  Domain Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {context.entities.map((e, i) => (
                    <span key={i} className="neo-badge text-[10px] font-mono font-bold px-2 py-1 rounded-xl text-foreground/80">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>

        {context.sharedTableConflicts.length > 0 && (
          <div className="rounded-2xl p-5 border border-rose-300/25 bg-rose-400/10 dark:bg-rose-400/8">
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
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <div className="w-1 h-3 bg-border rounded-full" />
              Structural Implementation Blueprint
            </h4>
            {context.proposedModuleStructure ? (
              <ModuleStructureView structure={context.proposedModuleStructure} />
            ) : (
              <div className="neo-inset rounded-2xl p-8 text-center border-2 border-dashed border-border/70">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
  const [activeTab, setActiveTab]         = useState<'services' | 'roadmap' | 'risks' | 'refactoring'>('services');
  const reportRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
    if (!exportRef.current) return;
    try {
      const exportNode = exportRef.current;
      const canvas = await html2canvas(exportNode, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        windowWidth: exportNode.scrollWidth,
        windowHeight: exportNode.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imageHeight);
      while (position + pageHeight < imageHeight) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imageHeight);
      }

      pdf.save('microservice-roadmap.pdf');
    } catch {
      alert('PDF export failed. Try JSON export or re-run the analysis.');
    }
  };

  const tabs = [
    { id: 'services'     as const, label: `Services (${plan.boundedContexts.length})` },
    { id: 'roadmap'      as const, label: `Extraction Roadmap` },
    { id: 'risks'        as const, label: `Domain Risks (${plan.transactionalRisks.length})` },
    { id: 'refactoring'  as const, label: `Refactoring (${(plan.classRefactoringSuggestions ?? []).length})` },
  ];

  return (
    <div className="neo-shell min-h-screen pb-20 text-foreground">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 border-b neo-divider px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-6 bg-background/70 backdrop-blur-xl">
        <button
          onClick={onNewAnalysis}
          disabled={!onNewAnalysis}
          className={`flex items-center gap-4 transition-opacity ${onNewAnalysis ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'}`}
        >
          <div className="neo-button-primary w-10 h-10 rounded-2xl flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="space-y-0.5">
              <h1 className="font-bold text-sm tracking-tight text-foreground leading-none">MicroMorph</h1>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    Verification Complete
                  </span>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    v1.0.4
                  </span>
              </div>
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Size</div>
                    <div className="text-xs font-bold text-foreground">{plan.dependencyGraph.length} Components</div>
                </div>
                <div className="w-[1px] h-6 bg-border" />
                <div className="text-right">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Targets</div>
                    <div className="text-xs font-bold text-foreground">{plan.boundedContexts.length} Services</div>
                </div>
                <div className="w-[1px] h-6 bg-border" />
                <div className="text-right">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Risk Level</div>
                    <div className="text-xs font-bold text-amber-600">{plan.transactionalRisks.length} Detected</div>
                </div>
                <div className="w-[1px] h-6 bg-border" />
                <div className="text-right">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Refactoring</div>
                    <div className="text-xs font-bold text-amber-600">{(plan.classRefactoringSuggestions ?? []).length} Hints</div>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {onNewAnalysis && (
            <button onClick={onNewAnalysis}
              className="hidden sm:block neo-button text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-2xl transition-all text-muted-foreground">
              Home
            </button>
          )}
          <div className="hidden sm:block w-[1px] h-6 bg-border mx-1" />
          <button onClick={handleExportJson}
            className="neo-button text-[11px] font-bold uppercase tracking-widest px-3 sm:px-4 py-2 rounded-2xl transition-all text-muted-foreground">
            JSON
          </button>
          <button onClick={handleExportPdf}
            className="neo-button-primary text-[11px] font-bold uppercase tracking-widest px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl transition-all">
            <span className="hidden sm:inline">Export </span>PDF
          </button>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-20000px', top: 0, width: 1100, pointerEvents: 'none' }}
      >
        <div ref={exportRef}>
          <ReportExportDocument plan={plan} />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          {/* Tab bar */}
          <div className="mt-6 sm:mt-8 flex gap-1 sm:gap-2 rounded-full p-1.5 sm:p-2 neo-inset overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 text-[11px] font-bold uppercase tracking-widest transition-all relative rounded-full ${activeTab === tab.id ? 'neo-toggle-active text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
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
                      className="neo-button text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-2xl text-muted-foreground disabled:opacity-30">
                      ← Previous Service
                    </button>
                    <button
                      disabled={activeService === plan.boundedContexts.length - 1}
                      onClick={() => setActiveService(i => i + 1)}
                      className="neo-button-primary text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-2xl disabled:opacity-30">
                      Next Service →
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

            {activeTab === 'refactoring' && (
              <div className="max-w-4xl mx-auto">
                <ClassRefactoringPanel suggestions={plan.classRefactoringSuggestions ?? []} />
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
