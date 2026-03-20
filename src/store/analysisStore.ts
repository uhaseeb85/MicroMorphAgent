import { create } from 'zustand';
import type { AnalysisConfig, DecompositionPlan } from '../types';

export interface ActivityItem {
  id: string;
  type: 'file' | 'git' | 'llm' | 'graph' | 'pom' | 'success' | 'info';
  message: string;
  timestamp: number;
  status?: 'pending' | 'success' | 'error';
}

export type ThemeMode = 'light' | 'dark';

interface AnalysisState {
  config: AnalysisConfig | null;
  phase: number;
  progressMessage: string;
  isAnalyzing: boolean;
  plan: DecompositionPlan | null;
  errorMessage: string | null;
  theme: ThemeMode;

  // Detailed progress tracking
  filesProcessed: number;
  totalFiles: number;
  currentFile: string;
  filesFetched: number;
  totalFilesToFetch: number;
  currentFetchFile: string;
  commitsFetched: number;
  llmCallsMade: number;
  llmCallsTotal: number;
  currentLLMCall: string;
  packagesAnalyzed: number;
  totalPackages: number;
  currentPackage: string;
  dependencyNodes: number;
  coChangePairs: number;
  activityLog: ActivityItem[];

  setConfig: (config: AnalysisConfig) => void;
  setPhase: (phase: number, message: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setPlan: (plan: DecompositionPlan) => void;
  setError: (msg: string) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  resetPipeline: () => void;

  // Progress tracking actions
  setFetchProgress: (fetched: number, total: number, current?: string) => void;
  setFileProgress: (processed: number, total: number, current?: string) => void;
  setGitProgress: (commits: number) => void;
  setLLMProgress: (made: number, total: number, current?: string) => void;
  setPackageProgress: (analyzed: number, total: number, current?: string) => void;
  setGraphStats: (nodes: number, coChangePairs: number) => void;
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  updateActivityStatus: (id: string, status: ActivityItem['status']) => void;
}

const MAX_ACTIVITY_ITEMS = 50;
const FILE_LOG_INTERVAL = 25;

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  config: null,
  phase: 0,
  progressMessage: '',
  isAnalyzing: false,
  plan: null,
  errorMessage: null,
  theme: 'light',

  // Detailed progress tracking
  filesProcessed: 0,
  totalFiles: 0,
  currentFile: '',
  filesFetched: 0,
  totalFilesToFetch: 0,
  currentFetchFile: '',
  commitsFetched: 0,
  llmCallsMade: 0,
  llmCallsTotal: 0,
  currentLLMCall: '',
  packagesAnalyzed: 0,
  totalPackages: 0,
  currentPackage: '',
  dependencyNodes: 0,
  coChangePairs: 0,
  activityLog: [],

  setConfig: (config) => set({
    config,
    phase: 0,
    progressMessage: '',
    plan: null,
    errorMessage: null,
    filesProcessed: 0,
    totalFiles: 0,
    currentFile: '',
    filesFetched: 0,
    totalFilesToFetch: 0,
    currentFetchFile: '',
    commitsFetched: 0,
    llmCallsMade: 0,
    llmCallsTotal: 0,
    currentLLMCall: '',
    packagesAnalyzed: 0,
    totalPackages: 0,
    currentPackage: '',
    dependencyNodes: 0,
    coChangePairs: 0,
    activityLog: []
  }),

  setPhase: (phase, progressMessage) => {
    set({ phase, progressMessage });
    // Add phase change to activity log
    const phaseNames = [
      'Repository Discovery',
      'Code Ingestion',
      'Graph Construction',
      'LLM Analysis',
      'Decomposition Reasoning'
    ];
    if (phase > 0 && phase <= phaseNames.length) {
      get().addActivity({
        type: 'info',
        message: `Starting Phase ${phase}: ${phaseNames[phase - 1]}`,
        status: 'pending'
      });
    }
  },

  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  setPlan: (plan) => {
    set({ plan });
    get().addActivity({
      type: 'success',
      message: 'Analysis complete! Generated decomposition plan.',
      status: 'success'
    });
  },

  setError: (errorMessage) => {
    set({ errorMessage, isAnalyzing: false });
    get().addActivity({
      type: 'info',
      message: `Error: ${errorMessage}`,
      status: 'error'
    });
  },

  setTheme: (theme) => set({ theme }),

  toggleTheme: () => set((state) => ({
    theme: state.theme === 'dark' ? 'light' : 'dark'
  })),

  resetPipeline: () => set({
    phase: 0,
    progressMessage: '',
    isAnalyzing: false,
    plan: null,
    errorMessage: null,
    filesProcessed: 0,
    totalFiles: 0,
    currentFile: '',
    filesFetched: 0,
    totalFilesToFetch: 0,
    currentFetchFile: '',
    commitsFetched: 0,
    llmCallsMade: 0,
    llmCallsTotal: 0,
    currentLLMCall: '',
    packagesAnalyzed: 0,
    totalPackages: 0,
    currentPackage: '',
    dependencyNodes: 0,
    coChangePairs: 0,
    activityLog: []
  }),

  setFetchProgress: (filesFetched, totalFilesToFetch, currentFetchFile) => {
    set({ filesFetched, totalFilesToFetch, currentFetchFile });
  },

  setFileProgress: (filesProcessed, totalFiles, currentFile) => {
    set({ filesProcessed, totalFiles, currentFile });
    if (currentFile && filesProcessed % FILE_LOG_INTERVAL === 0) {
      get().addActivity({
        type: 'file',
        message: `Parsed ${filesProcessed} / ${totalFiles} files`,
        status: 'success'
      });
    }
  },

  setGitProgress: (commitsFetched) => {
    set({ commitsFetched });
  },

  setLLMProgress: (llmCallsMade, llmCallsTotal, currentLLMCall) => {
    set({ llmCallsMade, llmCallsTotal, currentLLMCall });
    if (currentLLMCall) {
      get().addActivity({
        type: 'llm',
        message: `LLM analyzing: ${currentLLMCall}`,
        status: 'pending'
      });
    }
  },

  setPackageProgress: (packagesAnalyzed, totalPackages, currentPackage) => {
    set({ packagesAnalyzed, totalPackages, currentPackage });
  },

  setGraphStats: (dependencyNodes, coChangePairs) => {
    set({ dependencyNodes, coChangePairs });
  },

  addActivity: (item) => {
    const newItem: ActivityItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now()
    };
    set((state) => ({
      activityLog: [newItem, ...state.activityLog].slice(0, MAX_ACTIVITY_ITEMS)
    }));
  },

  updateActivityStatus: (id, status) => {
    set((state) => ({
      activityLog: state.activityLog.map(item =>
        item.id === id ? { ...item, status } : item
      )
    }));
  }
}));
