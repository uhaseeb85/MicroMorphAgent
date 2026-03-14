// User-supplied configuration
export interface AnalysisConfig {
  repos: RepoInput[];
  githubToken: string;
  openRouterApiKey?: string;
  llmProvider: 'openrouter';
  options: AnalysisOptions;
}

export interface RepoInput {
  url: string;
  branch?: string;
  role: 'primary' | 'dependency' | 'auto-discovered';
  groupId?: string;
}

export interface AnalysisOptions {
  maxCommitHistory: number;
  includeTestFiles: boolean;
  gitCoChangeWindowDays: number;
  llmModel: string;
  granularity: 'coarse' | 'balanced' | 'fine';
  analysisMode: 'ai' | 'static';
}

export interface JavaClass {
  fullyQualifiedName: string;
  packageName: string;
  annotations: string[];
  methods: string[];
  fields: string[];
  imports: string[];
  repoSource: string;
  filePath: string;
  layer?: 'controller' | 'service' | 'repository' | 'entity' | 'config' | 'util';
}

export interface GraphNode {
  id: string; // FQN
  packageName: string;
  layer: 'controller' | 'service' | 'repository' | 'entity' | 'config' | 'util';
  annotations: string[];
  transactionalBoundary: boolean;
  inboundDeps: string[];
  outboundDeps: string[];
  coChangedWith: CoChangeEntry[];
  repoSource: string;
}

export interface CoChangeEntry {
  targetClass: string;
  frequency: number;
  lastChanged: string; // ISO date string
}

export interface SharedComponent {
  className: string;
  consumingDomains: string[];
  recommendation: 'platform-service' | 'duplicate-per-domain' | 'split';
  rationale: string;
}

export interface DecompositionPlan {
  boundedContexts: BoundedContext[];
  extractionRoadmap: ExtractionStep[];
  transactionalRisks: TransactionalRisk[];
  sharedLibAssessment: SharedComponent[];
  dependencyGraph: GraphNode[];
  generatedAt: string;
  reposAnalyzed: string[];
}

export interface BoundedContext {
  name: string;
  suggestedServiceName: string;
  packages: string[];
  entities: string[];
  apis: string[];
  inboundDependencyCount: number;
  outboundDependencyCount: number;
  sharedTableConflicts: string[];
  riskScore: 'low' | 'medium' | 'high';
  riskRationale: string;
  llmRationale: string;
  proposedModuleStructure?: ModuleStructure;
}

export interface ModuleStructure {
  rootArtifactId: string;
  mavenGroupId: string;
  directories: DirectoryEntry[];
  keyClasses: string[];
  exposedApis: string[];
  consumedApis: string[];
  databaseSchema: string;
  dockerfileSuggestion: string;
}

export interface DirectoryEntry {
  path: string;
  description: string;
  files: string[];
}

export interface ExtractionStep {
  order: number;
  boundedContext: string;
  estimatedEffort: 'days' | 'weeks' | 'months';
  blockers: string[];
  patternRecommendations: string[];
  sagaRequired: boolean;
}

export interface TransactionalRisk {
  description: string;
  affectedClasses: string[];
  affectedDomains: string[];
  severity: 'critical' | 'high' | 'medium';
  mitigationPattern: 'saga' | 'outbox' | 'two-phase-commit' | 'eventual-consistency';
  explanation: string;
}
