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
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'hsl(230 30% 96%)' }}>
        <div className="max-w-lg w-full rounded-2xl overflow-hidden shadow-xl" style={{ background: 'white', border: '1px solid hsl(230 20% 88%)' }}>
          <div className="p-6 border-b" style={{ background: 'hsl(0 80% 97%)', borderColor: 'hsl(0 50% 88%)' }}>
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="text-xl font-bold" style={{ color: 'hsl(0 65% 35%)' }}>Analysis Failed</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm font-mono p-3 rounded-lg leading-relaxed break-words"
              style={{ background: 'hsl(230 20% 96%)', color: 'hsl(0 60% 40%)', border: '1px solid hsl(230 20% 88%)' }}>
              {errorMessage}
            </p>
            {isAuthError && (
              <div className="rounded-xl p-4 text-sm" style={{ background: 'hsl(40 90% 96%)', border: '1px solid hsl(40 70% 82%)' }}>
                <p className="font-semibold mb-1" style={{ color: 'hsl(38 80% 35%)' }}>Invalid API Key</p>
                <p style={{ color: 'hsl(38 60% 45%)' }}>
                  Click "Edit Configuration" to update your API key. Your GitHub token and repo URL will be preserved.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={handleEditConfig}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, hsl(244 75% 62%), hsl(220 75% 68%))' }}>
                Edit Configuration
              </button>
              <button onClick={handleRetry}
                className="py-2.5 px-4 rounded-xl text-sm font-semibold"
                style={{ background: 'hsl(230 20% 95%)', color: 'hsl(230 15% 40%)', border: '1px solid hsl(230 20% 87%)' }}>
                Retry
              </button>
              <button onClick={fullReset}
                className="py-2.5 px-4 rounded-xl text-sm font-semibold"
                style={{ color: 'hsl(0 65% 50%)' }}>
                Reset
              </button>
            </div>
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
