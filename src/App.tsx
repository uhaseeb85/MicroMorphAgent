import React, { useEffect, useState } from 'react';
import { OnboardingForm } from './components/onboarding/OnboardingForm';
import { ReportView } from './components/report/ReportView';
import { AnalysisDashboard } from './components/analysis/AnalysisDashboard';
import { useAnalysisStore } from './store/analysisStore';
import { Orchestrator } from './engine/Orchestrator';

function App() {
  const { config, setConfig, isAnalyzing, plan, phase, errorMessage, resetPipeline } =
    useAnalysisStore();

  const [editMode, setEditMode] = useState(false);

  // Load persisted config on first mount
  useEffect(() => {
    const saved = localStorage.getItem('decomp_config');
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [setConfig]);

  // Kick off analysis when config is freshly set
  useEffect(() => {
    if (config && !plan && !isAnalyzing && phase === 0 && !editMode) {
      const engine = new Orchestrator(config);
      engine.runAnalysis().catch(err => console.error('Pipeline failed', err));
    }
  }, [config, plan, isAnalyzing, phase, editMode]);

  const fullReset = () => {
    localStorage.removeItem('decomp_config');
    window.location.reload();
  };

  // ── Edit config without nuking settings ──
  const handleEditConfig = () => {
    resetPipeline();
    setEditMode(true);
  };

  const handleRetry = () => {
    resetPipeline();
    setEditMode(false);
  };

  // Show form if no config, or user clicked Edit
  if (!config || editMode) {
    return <OnboardingForm onSubmit={() => setEditMode(false)} />;
  }

  // Show report
  if (plan) {
    return <ReportView plan={plan} onNewAnalysis={handleEditConfig} />;
  }

  // Error state
  if (errorMessage) {
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('api-key');
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50/50">
        <div className="max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl bg-white border" style={{ borderColor: 'hsl(214 20% 90%)' }}>
          <div className="p-8 border-b bg-rose-50/30" style={{ borderColor: 'hsl(0 100% 96%)' }}>
            <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-rose-200">
                <span className="text-white text-xl">⚠</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tighter text-slate-900">Analysis Integration Failed</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Orchestration Error Context</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="rounded-xl p-5 border bg-slate-50 border-slate-200">
                <p className="text-[11px] font-mono font-bold leading-relaxed break-words text-rose-600">
                  {errorMessage}
                </p>
            </div>
            {isAuthError && (
              <div className="rounded-xl p-4 border border-amber-100 bg-amber-50/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">Authorization Missing</p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  The API handshake failed. Update your provider credentials in the configuration panel to proceed.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={handleEditConfig}
                className="flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-all">
                Update Configuration
              </button>
              <button onClick={handleRetry}
                className="px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all">
                Retry
              </button>
            </div>
            <button onClick={fullReset}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">
              Reset Session Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading / in-progress state - Use the new Analysis Dashboard
  return (
    <AnalysisDashboard
      onEditConfig={handleEditConfig}
      onCancel={fullReset}
    />
  );
}

export default App;
