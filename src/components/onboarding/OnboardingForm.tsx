import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../store/analysisStore';
import type { AnalysisConfig, RepoInput } from '../../types';

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
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

type Granularity = 'coarse' | 'balanced' | 'fine';
type AnalysisMode = 'ai' | 'static' | 'demo';
type LLMProvider = 'openrouter';

const GRANULARITY_OPTIONS: { value: Granularity; label: string; sub: string; hint: string }[] = [
  { value: 'coarse', label: 'Coarse', sub: 'Broad groupings', hint: '2–4 services' },
  { value: 'balanced', label: 'Balanced', sub: 'Recommended', hint: '4–7 services' },
  { value: 'fine', label: 'Fine', sub: 'Max decomposition', hint: '8+ services' },
];

export function OnboardingForm({ onSubmit }: { onSubmit?: () => void } = {}) {
  const setConfig = useAnalysisStore(state => state.setConfig);
  const saved = loadSaved();

  const [githubToken, setGithubToken] = useState(saved?.githubToken || '');
  const [llmProvider] = useState<LLMProvider>('openrouter');
  const [openRouterKey, setOpenRouterKey] = useState(saved?.openRouterApiKey || '');
  const [openRouterModel, setOpenRouterModel] = useState(saved?.options?.llmModel || 'anthropic/claude-3.7-sonnet');
  const [repos, setRepos] = useState<RepoInput[]>(saved?.repos?.length ? saved.repos : [{ url: '', role: 'primary' }]);
  const [granularity, setGranularity] = useState<Granularity>(saved?.options?.granularity || 'balanced');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(saved?.options?.analysisMode || 'ai');
  
  // Always show advanced settings for API key configuration in AI mode
  const [showAdvanced, setShowAdvanced] = useState(true);

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
        // Sort by name or popularity? Let's keep it as is but filter maybe?
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analysisMode === 'ai') {
      if (!openRouterKey) { alert('OpenRouter API Key is required'); return; }
    }
    
    // Auto-fill dummy repo for demo
    let finalRepos = repos;
    if (analysisMode === 'demo' && repos.every(r => !r.url.trim())) {
      finalRepos = [{ url: 'https://github.com/spring-projects/spring-petclinic', role: 'primary' }];
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

    localStorage.setItem('decomp_config', JSON.stringify(config));
    setConfig(config);
    onSubmit?.();
  };

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'hsl(222 25% 15%)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="font-bold text-[17px] tracking-tight" style={{ color: 'hsl(222 25% 15%)' }}>Micromorph</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border" style={{ color: 'hsl(215 15% 45%)', borderColor: 'hsl(214 20% 90%)', background: 'hsl(210 20% 98%)' }}>
          Beta v1.0
        </span>
      </header>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-4 max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1]"
          style={{ color: 'hsl(222 25% 15%)' }}>
          Transform your Monolith into Microservices.
        </h1>
        <p className="mt-5 text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'hsl(215 15% 45%)' }}>
          Decompose legacy Java Spring applications into modernized, 
          independent domain services with semantic analysis.
        </p>
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit}
        className="mx-auto max-w-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
        style={{ background: 'white', border: '1px solid hsl(214 20% 90%)' }}>
        <div className="p-10 space-y-8">

          {/* Repos */}
          <div className="space-y-3" style={analysisMode === 'demo' ? { opacity: 0.7, pointerEvents: 'none' } : {}}>
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'hsl(230 20% 50%)' }}>
              {analysisMode === 'demo' ? 'Repository (Pre-configured)' : 'Repository URL'}
            </label>
            {repos.map((repo, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all"
                  style={{ 
                    border: '1.5px solid hsl(230 20% 88%)', 
                    background: analysisMode === 'demo' ? 'hsl(230 10% 94%)' : 'hsl(230 30% 98%)',
                    cursor: analysisMode === 'demo' ? 'not-allowed' : 'text'
                  }}
                  placeholder={analysisMode === 'demo' ? "spring-projects/spring-petclinic" : "https://github.com/org/spring-monolith"}
                  value={analysisMode === 'demo' ? "https://github.com/spring-projects/spring-petclinic" : repo.url}
                  onChange={e => updateRepo(i, e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'hsl(244 80% 65%)')}
                  onBlur={e => (e.target.style.borderColor = 'hsl(230 20% 88%)')}
                  required={analysisMode !== 'demo'}
                  disabled={analysisMode === 'demo'}
                />
                {i > 0 && (
                  <button type="button" onClick={() => setRepos(repos.filter((_, ri) => ri !== i))}
                    className="px-3 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: 'hsl(0 80% 96%)', color: 'hsl(0 70% 50%)' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {analysisMode !== 'demo' && (
              <button type="button" onClick={() => setRepos([...repos, { url: '', role: 'dependency' }])}
                className="text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ color: 'hsl(244 70% 60%)' }}>
                + Add submodule / dependency repo
              </button>
            )}
          </div>

          {/* GitHub Token */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(230 20% 25%)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Personal Access Token
              <span className="text-xs font-normal" style={{ color: 'hsl(230 15% 60%)' }}>(Optional)</span>
            </label>
            <input
              type="password"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{ border: '1.5px solid hsl(230 20% 88%)', background: 'hsl(230 30% 98%)', fontFamily: 'monospace' }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              onFocus={e => (e.target.style.borderColor = 'hsl(244 80% 65%)')}
              onBlur={e => (e.target.style.borderColor = 'hsl(230 20% 88%)')}
            />
            <p className="text-xs" style={{ color: 'hsl(230 15% 58%)' }}>Required only for private repositories.</p>
          </div>

          {/* Granularity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'hsl(215 15% 45%)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                Service Granularity
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {GRANULARITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setGranularity(opt.value)}
                  className="rounded-xl py-3.5 px-3 text-center transition-all border outline-none"
                  style={granularity === opt.value ? {
                    background: 'hsl(222 25% 15%)',
                    borderColor: 'hsl(222 25% 15%)',
                    color: 'white'
                  } : {
                    background: 'white',
                    borderColor: 'hsl(214 20% 90%)',
                    color: 'hsl(215 15% 45%)'
                  }}>
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70 uppercase tracking-tighter">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Engine */}
          <div className="space-y-4">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'hsl(215 15% 45%)' }}>
              Analysis Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                {
                  value: 'ai' as AnalysisMode, label: 'AI Deep', sub: 'Semantic',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
                },
                {
                  value: 'static' as AnalysisMode, label: 'Static', sub: 'AST-Only',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                },
                {
                  value: 'demo' as AnalysisMode, label: 'Demo', sub: 'Sandbox',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                }
              ]).map(opt => (
                <button key={opt.value} type="button" onClick={() => setAnalysisMode(opt.value)}
                  className="rounded-xl py-3 px-4 text-left flex flex-col gap-1.5 transition-all border outline-none"
                  style={analysisMode === opt.value ? {
                    background: 'hsl(222 25% 15%)',
                    borderColor: 'hsl(222 25% 15%)',
                    color: 'white'
                  } : {
                    background: 'white',
                    borderColor: 'hsl(214 20% 90%)',
                    color: 'hsl(215 15% 45%)'
                  }}>
                  {opt.icon}
                  <div>
                    <div className="font-bold text-[10px] uppercase tracking-wider">{opt.label}</div>
                    <div className="text-[9px] opacity-70 font-medium">{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced (LLM config) */}
          {analysisMode === 'ai' && (
            <div className="space-y-3">
              <div className="rounded-xl p-5 space-y-5" style={{ background: 'hsl(210 20% 98%)', border: '1px solid hsl(214 20% 90%)' }}>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest pl-1" style={{ color: 'hsl(215 15% 45%)' }}>OpenRouter API Key</label>
                    <input type="password" className="w-full rounded-xl px-4 py-2.5 text-sm outline-none shadow-sm transition-all focus:ring-1 focus:ring-slate-400"
                      style={{ border: '1px solid hsl(214 20% 88%)', fontFamily: 'monospace' }}
                      placeholder="sk-or-v1-..." value={openRouterKey} onChange={e => setOpenRouterKey(e.target.value)} />
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(215 15% 45%)' }}>Language Model</label>
                      <button type="button" onClick={fetchModels} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
                        {loadingModels ? 'Updating...' : 'Refresh List'}
                      </button>
                    </div>
                    <select
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none appearance-none shadow-sm bg-white"
                      style={{ border: '1px solid hsl(214 20% 88%)', background: 'white url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%2364748b%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E") no-repeat right 0.75rem center/1rem' }}
                      value={openRouterModel}
                      onChange={e => setOpenRouterModel(e.target.value)}
                    >
                      {orModels.length > 0 ? (
                        orModels.map(m => {
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          );
                        })
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
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="px-10 pb-10">
          <button type="submit"
            className="w-full py-4 rounded-xl text-white text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all hover:bg-slate-800 active:scale-[0.98] shadow-lg shadow-slate-200"
            style={{ background: 'hsl(222 25% 15%)' }}>
            Morph to Microservices
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-xs py-8" style={{ color: 'hsl(230 15% 60%)' }}>
        Developer Contact : uhaseeb85@gmail.com
      </p>
    </div>
  );
}
