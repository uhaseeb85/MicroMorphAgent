import type { AnalysisConfig, RepoInput } from '../types';

export function normalizeRepoInput(repo: Partial<RepoInput>): RepoInput {
  return {
    sourceType: repo.sourceType === 'local' ? 'local' : 'github',
    url: repo.url || '',
    branch: repo.branch,
    role: repo.role || 'primary',
    groupId: repo.groupId,
    displayName: repo.displayName,
    sourceId: repo.sourceId
  };
}

export function normalizeAnalysisConfig(raw: unknown): AnalysisConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<AnalysisConfig> & { repos?: Partial<RepoInput>[] };
  if (!Array.isArray(candidate.repos)) {
    return null;
  }

  return {
    githubToken: candidate.githubToken || '',
    llmProvider: 'openrouter',
    openRouterApiKey: candidate.openRouterApiKey,
    repos: candidate.repos.map(normalizeRepoInput),
    options: {
      maxCommitHistory: candidate.options?.maxCommitHistory || 300,
      includeTestFiles: candidate.options?.includeTestFiles || false,
      gitCoChangeWindowDays: candidate.options?.gitCoChangeWindowDays || 90,
      llmModel: candidate.options?.llmModel || 'anthropic/claude-3.7-sonnet',
      granularity: candidate.options?.granularity || 'balanced',
      analysisMode: candidate.options?.analysisMode || 'ai'
    }
  };
}

export function hasLocalSources(config: AnalysisConfig | null): boolean {
  return !!config?.repos.some((repo) => repo.sourceType === 'local');
}