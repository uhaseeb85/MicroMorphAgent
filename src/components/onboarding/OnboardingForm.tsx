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
    <div className="min-h-screen" style={{ background: 'hsl(230 30% 96%)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(244 80% 60%)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-tight">Micromorph</span>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{ color: 'hsl(244 60% 55%)', borderColor: 'hsl(244 60% 80%)', background: 'hsl(244 80% 97%)' }}>
          v1.0.0-beta
        </span>
      </header>

      {/* Hero */}
      <div className="text-center pt-12 pb-10 px-4">
        <h1 className="text-5xl font-black tracking-tight leading-tight max-w-xl mx-auto"
          style={{ color: 'hsl(230 30% 12%)' }}>
          Transform your{' '}
          <span style={{ background: 'linear-gradient(135deg, hsl(244 80% 60%), hsl(220 80% 70%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Monolith
          </span>
          <br />into Microservices.
        </h1>
        <p className="mt-4 text-base max-w-md mx-auto leading-relaxed" style={{ color: 'hsl(230 15% 45%)' }}>
          Drop a link to your legacy Java Spring repository. Our engine will analyze the codebase,
          map out domains, and generate a modernized architecture blueprint in seconds.
        </p>
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit}
        className="mx-auto max-w-lg rounded-2xl shadow-xl overflow-hidden"
        style={{ background: 'white', border: '1px solid hsl(230 20% 90%)' }}>
        <div className="p-8 space-y-7">

          {/* Repos */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'hsl(230 20% 50%)' }}>
              Repository URL
            </label>
            {repos.map((repo, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all"
                  style={{ border: '1.5px solid hsl(230 20% 88%)', background: 'hsl(230 30% 98%)' }}
                  placeholder="https://github.com/org/spring-monolith"
                  value={repo.url}
                  onChange={e => updateRepo(i, e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'hsl(244 80% 65%)')}
                  onBlur={e => (e.target.style.borderColor = 'hsl(230 20% 88%)')}
                  required
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
            <button type="button" onClick={() => setRepos([...repos, { url: '', role: 'dependency' }])}
              className="text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ color: 'hsl(244 70% 60%)' }}>
              + Add submodule / dependency repo
            </button>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'hsl(230 20% 50%)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                Decomposition Granularity
              </label>
              <span className="text-xs font-medium" style={{ color: 'hsl(230 15% 55%)' }}>
                {GRANULARITY_OPTIONS.find(g => g.value === granularity)?.hint}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GRANULARITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setGranularity(opt.value)}
                  className="rounded-xl py-3 px-3 text-center transition-all border"
                  style={granularity === opt.value ? {
                    background: 'hsl(244 80% 96%)',
                    borderColor: 'hsl(244 80% 65%)',
                    color: 'hsl(244 80% 50%)'
                  } : {
                    background: 'hsl(230 30% 98%)',
                    borderColor: 'hsl(230 20% 88%)',
                    color: 'hsl(230 15% 40%)'
                  }}>
                  <div className="font-bold text-sm">{opt.label}</div>
                  <div className="text-[11px] mt-0.5 opacity-70">{opt.sub}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: 'hsl(230 15% 58%)' }}>
              Controls how aggressively related packages are grouped into a single service.
            </p>
          </div>

          {/* Analysis Engine */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'hsl(230 20% 50%)' }}>
              Analysis Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  value: 'ai' as AnalysisMode, label: 'AI Analysis', sub: 'Deep Semantic',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>
                },
                {
                  value: 'static' as AnalysisMode, label: 'Static Analysis', sub: 'Fast AST',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                },
                {
                  value: 'demo' as AnalysisMode, label: 'Demo Mode', sub: 'Interactive Walkthrough',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                }
              ]).map(opt => (
                <button key={opt.value} type="button" onClick={() => setAnalysisMode(opt.value)}
                  className="rounded-xl py-3 px-4 text-left flex items-center gap-2.5 transition-all border"
                  style={analysisMode === opt.value ? {
                    background: 'hsl(244 80% 96%)',
                    borderColor: 'hsl(244 80% 65%)',
                    color: 'hsl(244 80% 50%)'
                  } : {
                    background: 'hsl(230 30% 98%)',
                    borderColor: 'hsl(230 20% 88%)',
                    color: 'hsl(230 15% 40%)'
                  }}>
                  {opt.icon}
                  <div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-[11px] opacity-70">{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced (LLM config) */}
          {analysisMode === 'ai' && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 space-y-4" style={{ background: 'hsl(230 30% 97%)', border: '1px solid hsl(230 20% 90%)' }}>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider pl-1" style={{ color: 'hsl(230 20% 50%)' }}>OpenRouter API Key</label>
                    <input type="password" className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ border: '1.5px solid hsl(230 20% 85%)', fontFamily: 'monospace' }}
                      placeholder="sk-or-v1-..." value={openRouterKey} onChange={e => setOpenRouterKey(e.target.value)} />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(230 20% 50%)' }}>Model Selection</label>
                      <button type="button" onClick={fetchModels} className="text-[10px] font-bold uppercase tracking-wider hover:opacity-70" style={{ color: 'hsl(244 80% 60%)' }}>
                        {loadingModels ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                    <select
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none appearance-none"
                      style={{ border: '1.5px solid hsl(230 20% 85%)', background: 'white url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%236b7280%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E") no-repeat right 0.75rem center/1rem' }}
                      value={openRouterModel}
                      onChange={e => setOpenRouterModel(e.target.value)}
                    >
                      {orModels.length > 0 ? (
                        orModels.map(m => {
                          const inputCost = (parseFloat(m.pricing.prompt) * 1000000).toFixed(2);
                          const outputCost = (parseFloat(m.pricing.completion) * 1000000).toFixed(2);
                          return (
                            <option key={m.id} value={m.id}>
                              {m.name} (${inputCost}/${outputCost} per 1M tokens)
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
        <div className="px-8 pb-8">
          <button type="submit"
            className="w-full py-4 rounded-xl text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, hsl(244 75% 62%), hsl(220 75% 68%))', boxShadow: '0 4px 20px hsl(244 80% 60% / 35%)' }}>
            Morph to Microservices
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-xs py-8" style={{ color: 'hsl(230 15% 60%)' }}>
        Built with Antigravity · For Java Spring Monoliths
      </p>
    </div>
  );
}
