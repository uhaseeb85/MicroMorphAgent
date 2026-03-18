// User-supplied configuration
export interface AnalysisConfig {
  repos: RepoInput[];
  githubToken: string;
  openRouterApiKey?: string;
  llmProvider: 'openrouter';
  options: AnalysisOptions;
}

export interface RepoInput {
  sourceType: 'github' | 'local';
  url: string;
  branch?: string;
  role: 'primary' | 'dependency' | 'auto-discovered';
  groupId?: string;
  displayName?: string;
  sourceId?: string;
}

export interface AnalysisOptions {
  maxCommitHistory: number;
  includeTestFiles: boolean;
  gitCoChangeWindowDays: number;
  llmModel: string;
  granularity: 'coarse' | 'balanced' | 'fine';
  analysisMode: 'ai' | 'static' | 'demo';
  srpMethodThreshold: number;
  srpFieldThreshold: number;
}

export interface InjectionPoint {
  fieldOrParam: string;
  type: string;
  mechanism: 'constructor' | 'field' | 'setter';
  qualifierValue?: string;
}

export interface EndpointMapping {
  path: string;
  httpMethod: string;
}

export interface AnnotationDetail {
  name: string;
  params: Record<string, string>;
}

export interface TransactionalMethodInfo {
  methodName: string;
  propagation?: string;
  readOnly?: boolean;
  isolation?: string;
}

export interface GenericTypeRef {
  rawType: string;
  typeArgs: string[];
}

export interface JavaClass {
  fullyQualifiedName: string;
  packageName: string;
  annotations: string[];
  methods: string[];
  fields: string[];
  imports: string[];
  typeReferences: string[];
  repoSource: string;
  filePath: string;
  layer?: 'controller' | 'service' | 'repository' | 'entity' | 'config' | 'util';
  superClass?: GenericTypeRef;
  interfaces?: string[];
  injectionPoints?: InjectionPoint[];
  endpointMappings?: EndpointMapping[];
  annotationDetails?: AnnotationDetail[];
  transactionalMethods?: TransactionalMethodInfo[];
  innerClasses?: string[];
  genericSuperTypes?: GenericTypeRef[];
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

export interface SuggestedSRPClass {
  name: string;
  responsibility: string;
  methods: string[];
  fields: string[];
}

export interface ClassRefactoringSuggestion {
  originalClass: string;
  filePath: string;
  packageName: string;
  methodCount: number;
  fieldCount: number;
  sizeSignal: 'large' | 'very-large';
  suggestedClasses: SuggestedSRPClass[];
  rationale: string;
  boundedContext?: string;
}

export interface DecompositionPlan {
  boundedContexts: BoundedContext[];
  extractionRoadmap: ExtractionStep[];
  transactionalRisks: TransactionalRisk[];
  sharedLibAssessment: SharedComponent[];
  dependencyGraph: GraphNode[];
  classRefactoringSuggestions: ClassRefactoringSuggestion[];
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
