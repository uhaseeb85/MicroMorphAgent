import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../store/analysisStore';
import type { AnalysisConfig, RepoInput } from '../../types';
import { ThemeToggle } from '../layout/ThemeToggle';
import { registerLocalDirectory } from '../../engine/local/LocalSourceSession';
import { hasLocalSources, normalizeAnalysisConfig } from '../../utils/analysisConfig';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem('decomp_config');
    if (!raw) {
      return null;
    }

    const parsed = normalizeAnalysisConfig(JSON.parse(raw));
    if (!parsed || hasLocalSources(parsed)) {
      return null;
    }

    return parsed;
  } catch { return null; }
}

type Granularity = 'coarse' | 'balanced' | 'fine';
type AnalysisMode = 'ai' | 'static' | 'demo';
type SourceMode = 'github' | 'local';

type DirectoryPickerHost = typeof globalThis & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

const GRANULARITY_OPTIONS: { value: Granularity; label: string; sub: string; hint: string }[] = [
  { value: 'coarse', label: 'Coarse', sub: 'Broad groupings', hint: '2-4 services' },
  { value: 'balanced', label: 'Balanced', sub: 'Recommended', hint: '4-7 services' },
  { value: 'fine', label: 'Fine', sub: 'Max decomposition', hint: '8+ services' },
];

export function OnboardingForm({ onSubmit, embedded }: { onSubmit?: () => void; embedded?: boolean } = {}) {
  const setConfig = useAnalysisStore(state => state.setConfig);
  const saved = loadSaved();

  const [githubToken, setGithubToken] = useState(saved?.githubToken || '');
  const [openRouterKey, setOpenRouterKey] = useState(saved?.openRouterApiKey || '');
  const [openRouterModel, setOpenRouterModel] = useState(saved?.options?.llmModel || 'anthropic/claude-3.7-sonnet');
  const [repos, setRepos] = useState<RepoInput[]>(saved?.repos?.length ? saved.repos : [{ sourceType: 'github', url: '', role: 'primary' }]);
  const [granularity, setGranularity] = useState<Granularity>(saved?.options?.granularity || 'balanced');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(saved?.options?.analysisMode || 'ai');
  const [sourceMode, setSourceMode] = useState<SourceMode>(saved?.repos?.[0]?.sourceType === 'local' ? 'local' : 'github');
  const [localDirectoryHandle, setLocalDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localFolderName, setLocalFolderName] = useState('');

  const [orModels, setOrModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/models');
      const data = await resp.json();
      if (data.data) {
        setOrModels(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch OpenRouter models', e);
    } finally {
      setLoadingModels(false);
    }
  };

  const updateRepo = (i: number, url: string) => {
    const next = [...repos];
    next[i].url = url.trim().replace(/\.git$/, '');
    setRepos(next);
  };

  const handlePickLocalFolder = async () => {
    const pickerWindow = globalThis as DirectoryPickerHost;
    if (!pickerWindow.showDirectoryPicker) {
      alert('Local folder selection currently requires a Chromium-based browser.');
      return;
    }

    try {
      const handle = await pickerWindow.showDirectoryPicker();
      setLocalDirectoryHandle(handle);
      setLocalFolderName(handle.name);
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        alert('Could not access the selected folder. Please try again.');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analysisMode === 'ai') {
      if (!openRouterKey) { alert('OpenRouter API Key is required'); return; }
    }

    let finalRepos = repos;
    if (analysisMode === 'demo' && repos.every(r => !r.url.trim())) {
      finalRepos = [{ sourceType: 'github', url: 'https://github.com/spring-projects/spring-petclinic', role: 'primary' }];
    } else if (sourceMode === 'local') {
      if (!localDirectoryHandle) {
        alert('Please select a local project folder.');
        return;
      }

      const sourceId = registerLocalDirectory(localDirectoryHandle);
      finalRepos = [{
        sourceType: 'local',
        url: `local://${localDirectoryHandle.name}`,
        displayName: localDirectoryHandle.name,
        sourceId,
        role: 'primary'
      }];
    } else if (repos.some(r => !r.url.trim())) {
      alert('Please provide at least one repository URL');
      return;
    }

    const config: AnalysisConfig = {
      githubToken,
      llmProvider: 'openrouter',
      openRouterApiKey: openRouterKey,
      repos: finalRepos,
      options: {
        maxCommitHistory: 300,
        includeTestFiles: false,
        gitCoChangeWindowDays: 90,
        granularity,
        analysisMode,
        llmModel: openRouterModel
      }
    };

    if (finalRepos.some((repo) => repo.sourceType === 'local')) {
      localStorage.removeItem('decomp_config');
    } else {
      localStorage.setItem('decomp_config', JSON.stringify(config));
    }

    setConfig(config);
    onSubmit?.();
  };

  const inputFocus = (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    event.target.style.borderColor = 'hsl(var(--ring))';
  };

  const inputBlur = (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    event.target.style.borderColor = 'hsl(var(--border))';
  };

  const formCard = (
    <form
      onSubmit={handleSubmit}
      className={`neo-panel rounded-[2rem] overflow-hidden ${embedded ? 'w-full' : 'mx-auto max-w-lg'}`}
    >
      <div className="p-8 space-y-7">

        {/* Project Source */}
        <div className="space-y-4" style={analysisMode === 'demo' ? { opacity: 0.7, pointerEvents: 'none' } : {}}>
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Project Source
          </label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'github' as const, label: 'GitHub', sub: 'Remote repository' },
              { id: 'local' as const, label: 'Local Folder', sub: 'Chromium only' }
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSourceMode(option.id)}
                className={`rounded-2xl py-3 px-4 text-left flex flex-col gap-1.5 transition-all outline-none ${sourceMode === option.id ? 'neo-button-primary' : 'neo-button text-muted-foreground'}`}
              >
                <div className="font-bold text-[10px] uppercase tracking-wider">{option.label}</div>
                <div className="text-[9px] opacity-70 font-medium">{option.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Repository URL */}
        <div className="space-y-3" style={analysisMode === 'demo' ? { opacity: 0.7, pointerEvents: 'none' } : {}}>
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {analysisMode === 'demo' ? 'Repository (Pre-configured)' : sourceMode === 'local' ? 'Local Project Folder' : 'Repository URL'}
          </label>
          {sourceMode === 'local' && analysisMode !== 'demo' ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePickLocalFolder}
                className="neo-button w-full rounded-2xl px-4 py-3 text-sm font-semibold text-foreground"
              >
                {localFolderName ? 'Change Local Folder' : 'Choose Local Folder'}
              </button>
              <div className="neo-inset rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Selected Folder
                </p>
                <p className="text-sm font-mono text-foreground/85 break-all">
                  {localFolderName || 'No folder selected yet'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Local folder analysis runs in-browser and skips Git commit history. Use a Chromium-based browser for folder selection.
              </p>
            </div>
          ) : (
            <>
              {repos.map((repo, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    className="neo-field flex-1 rounded-2xl px-4 py-3 text-sm font-mono outline-none"
                    style={{ cursor: analysisMode === 'demo' ? 'not-allowed' : 'text' }}
                    placeholder={analysisMode === 'demo' ? 'spring-projects/spring-petclinic' : 'https://github.com/org/spring-monolith'}
                    value={analysisMode === 'demo' ? 'https://github.com/spring-projects/spring-petclinic' : repo.url}
                    onChange={e => updateRepo(i, e.target.value)}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required={analysisMode !== 'demo'}
                    disabled={analysisMode === 'demo'}
                  />
                  {i > 0 && (
                    <button type="button" onClick={() => setRepos(repos.filter((_, ri) => ri !== i))}
                      className="neo-button px-3 rounded-2xl text-sm font-medium text-rose-500 dark:text-rose-300 transition-colors">
                      X
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          {analysisMode !== 'demo' && sourceMode === 'github' && (
            <button type="button" onClick={() => setRepos([...repos, { sourceType: 'github', url: '', role: 'dependency' }])}
              className="text-xs font-semibold flex items-center gap-1 transition-colors text-foreground/80 hover:text-foreground">
              + Add submodule / dependency repo
            </button>
          )}
        </div>

        {/* GitHub Token */}
        {sourceMode === 'github' && analysisMode !== 'demo' && (
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Personal Access Token
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </label>
            <input
              type="password"
              className="neo-field w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{ fontFamily: 'monospace' }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
            <p className="text-xs text-muted-foreground">Required only for private repositories.</p>
          </div>
        )}

        {/* Granularity */}
        <div className="space-y-4">
          <label className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            Service Granularity
          </label>
          <div className="grid grid-cols-3 gap-3">
            {GRANULARITY_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setGranularity(opt.value)}
                className={`rounded-2xl py-3.5 px-3 text-center transition-all outline-none ${granularity === opt.value ? 'neo-button-primary' : 'neo-button text-muted-foreground'}`}>
                <div className="font-bold text-xs">{opt.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70 uppercase tracking-tighter">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Analysis Strategy */}
        <div className="space-y-4">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Analysis Strategy
          </label>
          <div className="grid grid-cols-3 gap-3">
            {([
              {
                value: 'ai' as AnalysisMode, label: 'AI Analysis', sub: '',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
              },
              {
                value: 'static' as AnalysisMode, label: 'Static', sub: 'No LLM',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              },
              {
                value: 'demo' as AnalysisMode, label: 'Demo', sub: 'Sandbox',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
              }
            ]).map(opt => (
              <button key={opt.value} type="button" onClick={() => setAnalysisMode(opt.value)}
                className={`rounded-2xl py-3 px-4 text-left flex flex-col gap-1.5 transition-all outline-none ${analysisMode === opt.value ? 'neo-button-primary' : 'neo-button text-muted-foreground'}`}>
                {opt.icon}
                <div>
                  <div className="font-bold text-[10px] uppercase tracking-wider">{opt.label}</div>
                  <div className="text-[9px] opacity-70 font-medium">{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* LLM Config */}
        {analysisMode === 'ai' && (
          <div className="neo-inset rounded-[1.5rem] p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-muted-foreground">OpenRouter API Key</label>
              <input type="password" className="neo-field w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
                style={{ fontFamily: 'monospace' }}
                placeholder="sk-or-v1-..." value={openRouterKey} onChange={e => setOpenRouterKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Language Model</label>
                <button type="button" onClick={fetchModels} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                  {loadingModels ? 'Updating...' : 'Refresh List'}
                </button>
              </div>
              <select
                className="neo-field w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
                value={openRouterModel}
                onChange={e => setOpenRouterModel(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
              >
                {orModels.length > 0 ? (
                  orModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))
                ) : (
                  <>
                    <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="openai/gpt-4o">GPT-4o</option>
                    <option value="deepseek/deepseek-chat">DeepSeek V3</option>
                  </>
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="px-8 pb-8">
        <button type="submit"
          className="neo-button-primary w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]">
          Morph to Microservices
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </form>
  );

  if (embedded) return formCard;

  return (
    <div className="neo-shell min-h-screen text-foreground">
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="neo-button-primary w-10 h-10 rounded-2xl flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="font-bold text-[17px] tracking-tight text-foreground">Micromorph</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="neo-badge text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-muted-foreground">
            Beta v1.0
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="text-center pt-16 pb-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
          Transform your Monolith into Microservices.
        </h1>
        <p className="mt-5 text-lg leading-relaxed max-w-xl mx-auto text-muted-foreground">
          Decompose legacy Java Spring applications into modernized,
          independent domain services with semantic analysis.
        </p>
      </div>

      {formCard}

      <p className="text-center text-xs py-8 text-muted-foreground">
        Developer Contact : uhaseeb85@gmail.com
      </p>
    </div>
  );
}