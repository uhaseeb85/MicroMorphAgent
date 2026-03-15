import React, { useEffect, useState } from 'react';
import { OnboardingForm } from './components/onboarding/OnboardingForm';
import { ReportView } from './components/report/ReportView';
import { AnalysisDashboard } from './components/analysis/AnalysisDashboard';
import { useAnalysisStore } from './store/analysisStore';
import { Orchestrator } from './engine/Orchestrator';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { clearAllLocalDirectories } from './engine/local/LocalSourceSession';
import { hasLocalSources, normalizeAnalysisConfig } from './utils/analysisConfig';

const THEME_STORAGE_KEY = 'decomp_theme';

function App() {
  const config = useAnalysisStore((state) => state.config);
  const setConfig = useAnalysisStore((state) => state.setConfig);
  const isAnalyzing = useAnalysisStore((state) => state.isAnalyzing);
  const plan = useAnalysisStore((state) => state.plan);
  const phase = useAnalysisStore((state) => state.phase);
  const errorMessage = useAnalysisStore((state) => state.errorMessage);
  const resetPipeline = useAnalysisStore((state) => state.resetPipeline);
  const theme = useAnalysisStore((state) => state.theme);
  const setTheme = useAnalysisStore((state) => state.setTheme);

  const [editMode, setEditMode] = useState(false);
  const [resultsConfirmed, setResultsConfirmed] = useState(false);

  // Load persisted config on first mount
  useEffect(() => {
    const saved = localStorage.getItem('decomp_config');
    if (saved) {
      try {
        const parsed = normalizeAnalysisConfig(JSON.parse(saved));
        if (!parsed) {
          localStorage.removeItem('decomp_config');
          return;
        }

        if (hasLocalSources(parsed)) {
          localStorage.removeItem('decomp_config');
          return;
        }

        setConfig(parsed);
      } catch {
        localStorage.removeItem('decomp_config');
      }
    }
  }, [setConfig]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Kick off analysis when config is freshly set
  useEffect(() => {
    if (config && !plan && !isAnalyzing && phase === 0 && !editMode) {
      const engine = new Orchestrator(config);
      engine.runAnalysis().catch(err => console.error('Pipeline failed', err));
    }
  }, [config, plan, isAnalyzing, phase, editMode]);

  const fullReset = () => {
    clearAllLocalDirectories();
    localStorage.removeItem('decomp_config');
    globalThis.location.reload();
  };

  // ── Edit config without nuking settings ──
  const handleEditConfig = () => {
    resetPipeline();
    setResultsConfirmed(false);
    setEditMode(true);
  };

  const handleRetry = () => {
    resetPipeline();
    setResultsConfirmed(false);
    setEditMode(false);
  };

  // Show form if no config, or user clicked Edit
  if (!config || editMode) {
    return <OnboardingForm onSubmit={() => setEditMode(false)} />;
  }

  // Show report only after the user confirms they want to review it.
  if (plan && resultsConfirmed) {
    return <ReportView plan={plan} onNewAnalysis={handleEditConfig} />;
  }

  // Error state
  if (errorMessage) {
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('api-key');
    return (
      <div className="neo-shell min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-4">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <div className="neo-panel w-full rounded-[2rem] overflow-hidden">
          <div className="p-8 border-b neo-divider bg-[hsl(var(--background)/0.35)]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 neo-button-primary">
                <span className="text-white text-xl">⚠</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tighter text-foreground">Analysis Integration Failed</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Orchestration Error Context</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="neo-inset rounded-2xl p-5">
                <p className="text-[11px] font-mono font-bold leading-relaxed break-words text-rose-500 dark:text-rose-300">
                  {errorMessage}
                </p>
            </div>
            {isAuthError && (
              <div className="rounded-2xl p-4 border border-amber-300/30 bg-amber-200/15 dark:bg-amber-400/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-1">Authorization Missing</p>
                <p className="text-xs text-amber-800 dark:text-amber-100 font-medium leading-relaxed">
                  The API handshake failed. Update your provider credentials in the configuration panel to proceed.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={handleEditConfig}
                className="neo-button-primary flex-1 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all">
                Update Configuration
              </button>
              <button onClick={handleRetry}
                className="neo-button px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-all">
                Retry
              </button>
            </div>
            <button onClick={fullReset}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-rose-500 transition-colors">
              Reset Session Data
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
      resultsReady={!!plan}
      onViewResults={() => setResultsConfirmed(true)}
    />
  );
}

export default App;
