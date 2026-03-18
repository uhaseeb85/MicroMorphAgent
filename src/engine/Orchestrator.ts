import { useAnalysisStore } from '../store/analysisStore';
import { RepoFetcher } from './github/RepoFetcher';
import { CommitData, GitHistoryFetcher } from './github/GitHistoryFetcher';
import { LocalSourceFetcher } from './local/LocalSourceFetcher';
import { PomXmlParser } from './parser/PomXmlParser';
import { SpringAnnotationParser } from './parser/SpringAnnotationParser';
import { CoChangeMatrix } from './graph/CoChangeMatrix';
import { DependencyGraphBuilder } from './graph/DependencyGraph';
import { LLMClient } from './llm/LLMClient';
import { Summarizer, PackageSummary } from './llm/Summarizer';
import { BoundedContextAnalyzer } from './llm/BoundedContextAnalyzer';
import { RoadmapGenerator, RoadmapResponse } from './llm/RoadmapGenerator';
import { ModuleStructureGenerator } from './llm/ModuleStructureGenerator';
import { ClassRefactoringAnalyzer } from './llm/ClassRefactoringAnalyzer';
import { AnalysisConfig, DecompositionPlan, JavaClass, BoundedContext, GraphNode, ModuleStructure, RepoInput, ClassRefactoringSuggestion } from '../types';

export class Orchestrator {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
  }

  async runAnalysis(): Promise<DecompositionPlan> {
    const store = useAnalysisStore.getState();
    const isStaticMode = this.config.options.analysisMode === 'static';
    store.setAnalyzing(true);

    // Debug: Log the config being used
    console.log('[Orchestrator] Starting analysis with config:', {
      provider: this.config.llmProvider,
      model: this.config.options.llmModel,
      hasOpenRouterKey: !!this.config.openRouterApiKey,
      repos: this.config.repos.map((repo) => this.getRepoLabel(repo))
    });

    if (this.config.options.analysisMode === 'demo') {
      return this.runDemo().catch((error: any) => {
        store.setError(error.message || String(error));
        throw error;
      });
    }

    try {
      const repoFetcher = new RepoFetcher(this.config.githubToken);
      const gitFetcher = new GitHistoryFetcher(this.config.githubToken);
      const localFetcher = new LocalSourceFetcher();
      const pomParser = new PomXmlParser();
      const springParser = new SpringAnnotationParser();
      const coChangeMatrixBuilder = new CoChangeMatrix();
      const graphBuilder = new DependencyGraphBuilder();

      const llmClient = isStaticMode ? null : new LLMClient(this.config);
      const summarizer = llmClient ? new Summarizer(llmClient) : null;
      const contextAnalyzer = llmClient ? new BoundedContextAnalyzer(llmClient) : null;
      const roadmapGenerator = llmClient ? new RoadmapGenerator(llmClient) : null;
      const moduleStructureGen = llmClient ? new ModuleStructureGenerator(llmClient) : null;
      const refactoringAnalyzer = llmClient ? new ClassRefactoringAnalyzer(llmClient) : null;

      // Phase 1: POM parsing
      store.setPhase(1, 'Discovering repository structure and analyzing Maven/Gradle files...');
      store.addActivity({ type: 'pom', message: 'Fetching pom.xml from repository...', status: 'pending' });

      const primaryRepo = this.config.repos.find(r => r.role === 'primary') || this.config.repos[0];
      const isLocalRepo = primaryRepo.sourceType === 'local';
      let baseGroupId = 'com.example';

      try {
        const pomContent = isLocalRepo
          ? await localFetcher.fetchFileContent(primaryRepo, 'pom.xml')
          : await repoFetcher.fetchFileContent(primaryRepo.url, 'pom.xml', primaryRepo.branch);
        if (pomContent) {
          const pomData = pomParser.parse(pomContent);
          if (pomData.groupId) baseGroupId = pomData.groupId;
          store.addActivity({ type: 'pom', message: `Parsed POM: ${pomData.artifactId} (${pomData.groupId})`, status: 'success' });
          console.log('Parsed POM:', pomData.artifactId, '| groupId:', baseGroupId);
        } else {
          store.addActivity({ type: 'pom', message: 'No pom.xml found, using defaults', status: 'success' });
        }
      } catch (e) {
        store.addActivity({ type: 'pom', message: 'No pom.xml found, proceeding with raw source ingestion', status: 'success' });
        console.log('No pom.xml found, proceeding with raw source ingestion.');
      }

      // Phase 2: Code Ingestion
      store.setPhase(2, isLocalRepo ? 'Reading Java source files from selected local folder...' : 'Fetching Java source files via GitHub API...');
      store.addActivity({
        type: 'git',
        message: isLocalRepo ? 'Scanning local folder for Java files...' : 'Scanning repository for Java files...',
        status: 'pending'
      });

      const javaSourceFiles = isLocalRepo
        ? await localFetcher.fetchJavaFiles(primaryRepo, this.config.options.includeTestFiles)
        : await repoFetcher.fetchJavaFiles(primaryRepo, this.config.options.includeTestFiles);
      store.setFileProgress(0, javaSourceFiles.length, '');
      store.addActivity({ type: 'git', message: `Found ${javaSourceFiles.length} Java files`, status: 'success' });

      store.setPhase(2, `Parsing ${javaSourceFiles.length} Java files locally...`);
      const javaClasses: JavaClass[] = [];

      for (let i = 0; i < javaSourceFiles.length; i++) {
        const file = javaSourceFiles[i];
        const parsed = springParser.parseSource(file.content, file.path, file.repo);
        javaClasses.push(parsed);

        // Throttle progress updates to avoid flooding the activity log
        if (i % 10 === 0 || i === javaSourceFiles.length - 1) {
          store.setFileProgress(i + 1, javaSourceFiles.length, file.path);
        }
      }

      // Phase 3: Graph Construction
      let commits: CommitData[] = [];
      if (isLocalRepo) {
        store.setPhase(3, 'Skipping Git commit history for local folder analysis...');
        store.addActivity({
          type: 'info',
          message: 'Local folder analysis does not include commit history or co-change signals. Structural dependency analysis remains active.',
          status: 'success'
        });
      } else {
        store.setPhase(3, 'Fetching Git Commit History for Co-Change Analysis...');
        store.addActivity({ type: 'git', message: `Fetching last ${this.config.options.maxCommitHistory} commits...`, status: 'pending' });

        commits = await gitFetcher.fetchCommitHistory(
          primaryRepo,
          this.config.options.maxCommitHistory,
          this.config.options.gitCoChangeWindowDays
        );
      }
      store.setGitProgress(commits.length);
      store.addActivity({
        type: 'git',
        message: isLocalRepo ? 'Continuing without commit history data for the selected local folder' : `Fetched ${commits.length} commits for analysis`,
        status: 'success'
      });

      store.setPhase(3, 'Constructing Co-Change Matrix...');
      store.addActivity({ type: 'graph', message: 'Building co-change matrix from commit history...', status: 'pending' });

      const coChangeMatrix = coChangeMatrixBuilder.build(commits);
      const topCoChanges = coChangeMatrixBuilder.getTopPairs(coChangeMatrix, 50);
      store.setGraphStats(0, topCoChanges.length);
      store.addActivity({ type: 'graph', message: `Identified ${topCoChanges.length} co-change patterns`, status: 'success' });

      store.setPhase(3, 'Building Unified Dependency Graph...');
      store.addActivity({ type: 'graph', message: 'Constructing dependency graph from class relationships...', status: 'pending' });

      const graphNodes = graphBuilder.build(javaClasses, coChangeMatrix);
      store.setGraphStats(graphNodes.length, topCoChanges.length);
      store.addActivity({ type: 'graph', message: `Built graph with ${graphNodes.length} nodes and ${graphNodes.reduce((acc, n) => acc + n.outboundDeps.length, 0)} edges`, status: 'success' });

      const summaries: PackageSummary[] = [];
      let boundedContexts: BoundedContext[] = [];
      let roadmapAndRisks: RoadmapResponse;
      let enrichedContexts: BoundedContext[] = [];      let classRefactoringSuggestions: ClassRefactoringSuggestion[] = [];
      if (!isStaticMode) {
        // Phase 4: LLM Package Summarization
        store.setPhase(4, 'Generating semantic package summaries via LLM...');

        const packageMap = new Map<string, JavaClass[]>();
        for (const jc of javaClasses) {
          const pkg = packageMap.get(jc.packageName) || [];
          pkg.push(jc);
          packageMap.set(jc.packageName, pkg);
        }

        store.setPackageProgress(0, packageMap.size, '');
        store.setLLMProgress(0, packageMap.size, '');
        store.addActivity({ type: 'llm', message: `Starting LLM analysis of ${packageMap.size} packages...`, status: 'pending' });

        let i = 0;
        for (const [pkgName, classes] of packageMap.entries()) {
          i++;
          store.setPhase(4, `Summarizing package ${pkgName} (${i}/${packageMap.size})...`);
          store.setPackageProgress(i - 1, packageMap.size, pkgName);
          store.setLLMProgress(i - 1, packageMap.size, pkgName);

          const summary = await summarizer!.summarizePackage(pkgName, classes);
          summaries.push(summary);

          store.setPackageProgress(i, packageMap.size, pkgName);
          store.setLLMProgress(i, packageMap.size, '');
          store.addActivity({ type: 'llm', message: `Analyzed package: ${pkgName.split('.').slice(-2).join('.')}`, status: 'success' });
        }

        store.addActivity({ type: 'llm', message: `Completed ${packageMap.size} LLM package summaries`, status: 'success' });
        // Phase 5: Decomposition Reasoning
        store.setPhase(5, 'Identifying Microservice Bounded Contexts...');
        store.addActivity({ type: 'llm', message: 'Identifying bounded contexts from package summaries...', status: 'pending' });

        boundedContexts = await contextAnalyzer!.analyze(summaries, topCoChanges, graphNodes, this.config.options.granularity);
        store.addActivity({ type: 'llm', message: `Identified ${boundedContexts.length} bounded contexts`, status: 'success' });

        store.setPhase(5, 'Generating Extraction Roadmap...');
        store.addActivity({ type: 'llm', message: 'Generating extraction roadmap and transactional risk analysis...', status: 'pending' });

        roadmapAndRisks = await roadmapGenerator!.generate(boundedContexts, graphNodes);
        store.addActivity({ type: 'llm', message: `Generated roadmap with ${roadmapAndRisks.extractionRoadmap.length} steps and ${roadmapAndRisks.transactionalRisks.length} risks`, status: 'success' });

        // Phase 5b: Generate per-service module structures
        store.setPhase(5, 'Generating module structures for each microservice...');
        store.addActivity({ type: 'llm', message: 'Generating Maven module structures for each service...', status: 'pending' });
        store.setLLMProgress(0, boundedContexts.length, 'Generating module structures...');

        enrichedContexts = await Promise.all(
          boundedContexts.map(async (ctx, idx) => {
            try {
              store.setLLMProgress(idx, boundedContexts.length, ctx.suggestedServiceName);
              const structure = await moduleStructureGen!.generateForContext(ctx, baseGroupId);
              store.addActivity({ type: 'llm', message: `Generated structure for ${ctx.suggestedServiceName}`, status: 'success' });
              return { ...ctx, proposedModuleStructure: structure };
            } catch (e) {
              store.addActivity({ type: 'info', message: `Skipped module structure for ${ctx.suggestedServiceName}`, status: 'success' });
              return ctx;
            }
          })
        );
        store.setLLMProgress(boundedContexts.length, boundedContexts.length, '');

        // Phase 5c: SRP Refactoring Analysis
        const srpThresholds = {
          methodThreshold: this.config.options.srpMethodThreshold,
          fieldThreshold: this.config.options.srpFieldThreshold
        };
        const largeClassCount = ClassRefactoringAnalyzer.filterLargeClasses(javaClasses, srpThresholds).length;
        if (largeClassCount > 0) {
          store.setPhase(5, `Analyzing ${largeClassCount} large classes for SRP violations...`);
          store.addActivity({ type: 'llm', message: `Detecting SRP violations in ${largeClassCount} oversized classes...`, status: 'pending' });
          classRefactoringSuggestions = await refactoringAnalyzer!.analyze(javaClasses, srpThresholds);
          // Enrich with bounded context name
          for (const suggestion of classRefactoringSuggestions) {
            const matchingCtx = enrichedContexts.find((ctx) =>
              ctx.packages.some((pkg) =>
                suggestion.packageName === pkg || suggestion.packageName.startsWith(`${pkg}.`)
              )
            );
            if (matchingCtx) suggestion.boundedContext = matchingCtx.name;
          }
          store.addActivity({ type: 'llm', message: `Found ${classRefactoringSuggestions.length} refactoring opportunities`, status: 'success' });
        } else {
          store.addActivity({ type: 'info', message: 'No classes exceeded SRP thresholds — monolith classes are well-sized.', status: 'success' });
        }
      } else {
        store.setPhase(4, 'Static mode: deriving package boundaries from code structure...');
        store.addActivity({ type: 'info', message: 'Static mode enabled - using structural analysis only (no LLM calls)', status: 'pending' });

        boundedContexts = this.generateStaticBoundedContexts(javaClasses, graphNodes);
        store.addActivity({ type: 'graph', message: `Derived ${boundedContexts.length} bounded contexts from namespaces and dependencies`, status: 'success' });

        store.setPhase(5, 'Static mode: generating heuristic extraction roadmap...');
        store.addActivity({ type: 'graph', message: 'Estimating extraction order and transactional risks from dependency signals...', status: 'pending' });
        roadmapAndRisks = this.generateHeuristicRoadmap(boundedContexts, graphNodes);
        store.addActivity({ type: 'graph', message: `Generated heuristic roadmap with ${roadmapAndRisks.extractionRoadmap.length} steps and ${roadmapAndRisks.transactionalRisks.length} risks`, status: 'success' });

        store.setPhase(5, 'Static mode: generating module blueprints...');
        enrichedContexts = boundedContexts.map((ctx) => ({
          ...ctx,
          proposedModuleStructure: this.generateStaticModuleStructure(ctx, baseGroupId)
        }));
        store.addActivity({ type: 'graph', message: `Generated ${enrichedContexts.length} heuristic module blueprints`, status: 'success' });

        // Static SRP analysis
        const srpThresholds = {
          methodThreshold: this.config.options.srpMethodThreshold,
          fieldThreshold: this.config.options.srpFieldThreshold
        };
        const staticRefactoringAnalyzer = new ClassRefactoringAnalyzer(null as any);
        classRefactoringSuggestions = staticRefactoringAnalyzer.analyzeHeuristic(javaClasses, srpThresholds);
        for (const suggestion of classRefactoringSuggestions) {
          const matchingCtx = enrichedContexts.find((ctx) =>
            ctx.packages.some((pkg) =>
              suggestion.packageName === pkg || suggestion.packageName.startsWith(`${pkg}.`)
            )
          );
          if (matchingCtx) suggestion.boundedContext = matchingCtx.name;
        }
        store.addActivity({ type: 'graph', message: `Detected ${classRefactoringSuggestions.length} heuristic refactoring candidates`, status: 'success' });
      }

      const plan: DecompositionPlan = {
        boundedContexts: enrichedContexts,
        extractionRoadmap: roadmapAndRisks.extractionRoadmap,
        transactionalRisks: roadmapAndRisks.transactionalRisks,
        sharedLibAssessment: [],
        dependencyGraph: graphNodes,
        classRefactoringSuggestions,
        generatedAt: new Date().toISOString(),
        reposAnalyzed: this.config.repos.map((repo) => this.getRepoLabel(repo))
      };

      store.setPlan(plan);
      store.setAnalyzing(false);
      store.setPhase(6, 'Analysis Complete!');

      return plan;

    } catch (error: any) {
      store.setError(error.message || String(error));
      throw error;
    }
  }

  private async runDemo(): Promise<DecompositionPlan> {
    const store = useAnalysisStore.getState();
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    store.setAnalyzing(true);
    
    // Phase 1
    store.setPhase(1, 'Discovering repository structure and analyzing Maven/Gradle files...');
    store.addActivity({ type: 'pom', message: 'Fetching pom.xml from repository...', status: 'pending' });
    await sleep(1400);
    store.addActivity({ type: 'pom', message: 'Parsed POM: spring-petclinic (org.springframework.samples)', status: 'success' });

    // Phase 2
    store.setPhase(2, 'Fetching Java source files via GitHub API...');
    store.addActivity({ type: 'git', message: 'Scanning repository for Java files...', status: 'pending' });
    await sleep(1000);
    const mockFilesCount = 42;
    store.addActivity({ type: 'git', message: `Found ${mockFilesCount} Java files`, status: 'success' });
    store.setFileProgress(0, mockFilesCount, '');
    for (let i = 0; i < mockFilesCount; i++) {
       if (i % 5 === 0) {
         store.setFileProgress(i, mockFilesCount, `petclinic/model/Owner${i}.java`);
         await sleep(180);
       }
    }
    store.setFileProgress(mockFilesCount, mockFilesCount, 'petclinic/PetClinicApplication.java');

    // Phase 3
    store.setPhase(3, 'Fetching Git Commit History for Co-Change Analysis...');
    store.addActivity({ type: 'git', message: 'Fetching last 300 commits...', status: 'pending' });
    await sleep(1500);
    store.setGitProgress(300);
    store.addActivity({ type: 'git', message: 'Fetched 300 commits for analysis', status: 'success' });
    store.setPhase(3, 'Constructing Co-Change Matrix...');
    await sleep(900);
    store.setGraphStats(0, 12);
    store.addActivity({ type: 'graph', message: 'Identified 12 strong co-change patterns', status: 'success' });
    store.setPhase(3, 'Building Unified Dependency Graph...');
    await sleep(850);
    store.setGraphStats(42, 12);
    store.addActivity({ type: 'graph', message: 'Built graph with 42 nodes and 156 edges', status: 'success' });

    // Phase 4
    store.setPhase(4, 'Generating semantic package summaries via LLM...');
    const demoPackages = ['owner', 'vet', 'visit', 'pet', 'system'];
    store.setPackageProgress(0, demoPackages.length, '');
    store.setLLMProgress(0, demoPackages.length, '');
    for(let i=0; i<demoPackages.length; i++) {
      store.setLLMProgress(i, demoPackages.length, `Summarizing ${demoPackages[i]}...`);
      await sleep(1800);
      store.addActivity({ type: 'llm', message: `Analyzed package: ${demoPackages[i]}`, status: 'success' });
      store.setPackageProgress(i+1, demoPackages.length, demoPackages[i]);
    }

    // Phase 5
    store.setPhase(5, 'Identifying Microservice Bounded Contexts...');
    await sleep(1900);
    store.addActivity({ type: 'llm', message: 'Identified 3 bounded contexts: Customer, Veterinary, Clinic', status: 'success' });
    
    store.setPhase(5, 'Generating Extraction Roadmap...');
    await sleep(1400);
    store.addActivity({ type: 'llm', message: 'Generated roadmap with 3 steps and 2 transactional risks', status: 'success' });

    store.setPhase(5, 'Generating module structures for each microservice...');
    await sleep(1200);
    store.addActivity({ type: 'llm', message: 'Generated Maven module structures for Customer Service', status: 'success' });
    await sleep(900);
    store.addActivity({ type: 'llm', message: 'Generated Maven module structures for Vet Service', status: 'success' });

    store.setPhase(5, 'Analyzing large classes for SRP violations...');
    await sleep(1100);
    store.addActivity({ type: 'llm', message: 'Detected 2 SRP refactoring candidates: OwnerController, ClinicService', status: 'success' });

    // Final Plan
    const plan: DecompositionPlan = {
      generatedAt: new Date().toISOString(),
      reposAnalyzed: ['https://github.com/spring-projects/spring-petclinic'],
      dependencyGraph: [],
      sharedLibAssessment: [],
      transactionalRisks: [
        {
          description: 'Distributed transaction between Owner and Visit during deletion',
          affectedClasses: ['OwnerController', 'VisitRepository'],
          affectedDomains: ['Customer', 'Clinic'],
          severity: 'high',
          mitigationPattern: 'saga',
          explanation: 'Deleting an owner requires cascading deletes for visits across service boundaries.'
        }
      ],
      extractionRoadmap: [
        { order: 1, boundedContext: 'Customer', estimatedEffort: 'weeks', blockers: [], patternRecommendations: ['Strangler Fig'], sagaRequired: true },
        { order: 2, boundedContext: 'Veterinary', estimatedEffort: 'days', blockers: [], patternRecommendations: ['Direct Migration'], sagaRequired: false }
      ],
      classRefactoringSuggestions: [
        {
          originalClass: 'org.springframework.samples.petclinic.owner.OwnerController',
          filePath: 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
          packageName: 'org.springframework.samples.petclinic.owner',
          methodCount: 12,
          fieldCount: 4,
          sizeSignal: 'very-large' as const,
          boundedContext: 'Customer',
          rationale: 'OwnerController mixes HTTP request handling, business validation, and view preparation logic. Splitting into query and command handlers enables cleaner microservice boundaries and improves testability.',
          suggestedClasses: [
            {
              name: 'OwnerQueryHandler',
              responsibility: 'Handles all read operations: finding owners by ID, listing all owners, and search queries.',
              methods: ['findOwner(int ownerId): Owner', 'initFindForm(): String', 'processFindForm(Owner owner, BindingResult result): String'],
              fields: ['private OwnerRepository owners']
            },
            {
              name: 'OwnerCommandHandler',
              responsibility: 'Handles all write operations: creating and updating owners and their pets.',
              methods: ['initCreationForm(Map<String,Object> model): String', 'processCreationForm(Owner owner, BindingResult result): String', 'initUpdateOwnerForm(int ownerId, Model model): String', 'processUpdateOwnerForm(Owner owner, BindingResult result, int ownerId): String'],
              fields: ['private OwnerRepository owners']
            },
            {
              name: 'PetCommandHandler',
              responsibility: 'Manages all pet lifecycle operations: adding pets to owners and recording visits.',
              methods: ['initPetTypes(): Collection<PetType>', 'initNewPetForm(Owner owner, Model model): String', 'processNewPetForm(Owner owner, Pet pet, BindingResult result): String', 'initUpdatePetForm(int petId, Model model): String', 'processUpdatePetForm(Pet pet, BindingResult result, int ownerId): String'],
              fields: ['private OwnerRepository owners', 'private PetTypeFormatter petTypeFormatter']
            }
          ]
        },
        {
          originalClass: 'org.springframework.samples.petclinic.system.ClinicService',
          filePath: 'src/main/java/org/springframework/samples/petclinic/system/ClinicService.java',
          packageName: 'org.springframework.samples.petclinic.system',
          methodCount: 9,
          fieldCount: 5,
          sizeSignal: 'large' as const,
          boundedContext: 'Veterinary',
          rationale: 'ClinicService acts as a catch-all facade aggregating operations for owners, pets, vets, and visits. Each of these domains will become a separate microservice, so splitting them now reduces extraction risk.',
          suggestedClasses: [
            {
              name: 'OwnerDomainService',
              responsibility: 'Manages owner and pet data persistence and business rules within the Customer bounded context.',
              methods: ['findOwnerById(int id): Owner', 'saveOwner(Owner owner): void', 'findPetTypes(): Collection<PetType>'],
              fields: ['private OwnerRepository ownerRepository', 'private PetRepository petRepository']
            },
            {
              name: 'VetDomainService',
              responsibility: 'Manages veterinarian data and specialties within the Veterinary bounded context.',
              methods: ['findVets(): Collection<Vet>'],
              fields: ['private VetRepository vetRepository']
            },
            {
              name: 'VisitDomainService',
              responsibility: 'Handles visit scheduling and retrieval across pet and owner associations.',
              methods: ['findVisitsByPetId(int petId): Collection<Visit>', 'saveVisit(Visit visit): void'],
              fields: ['private VisitRepository visitRepository']
            }
          ]
        }
      ],
      boundedContexts: [
        {
          name: 'Customer',
          suggestedServiceName: 'customer-service',
          packages: ['org.springframework.samples.petclinic.owner'],
          entities: ['Owner', 'Pet', 'PetType'],
          apis: ['GET /owners', 'POST /owners', 'GET /owners/{id}'],
          inboundDependencyCount: 2,
          outboundDependencyCount: 1,
          sharedTableConflicts: ['visits'],
          riskScore: 'medium',
          riskRationale: 'Central domain with high shared data usage.',
          llmRationale: 'The owner package contains the core entities but shares data with visits, requiring a saga pattern for consistency.',
          proposedModuleStructure: {
            rootArtifactId: 'customer-service',
            mavenGroupId: 'com.petclinic.customer',
            directories: [
              { path: 'src/main/java/com/petclinic/customer/domain', description: 'Domain Entities', files: ['Owner.java', 'Pet.java'] },
              { path: 'src/main/java/com/petclinic/customer/web', description: 'REST Controllers', files: ['OwnerController.java'] }
            ],
            keyClasses: ['Owner', 'Pet'],
            exposedApis: ['GET /api/v1/customers'],
            consumedApis: [],
            databaseSchema: 'Owns owners, pets tables.',
            dockerfileSuggestion: 'FROM eclipse-temurin:21-jre'
          }
        },
        {
          name: 'Veterinary',
          suggestedServiceName: 'vet-service',
          packages: ['org.springframework.samples.petclinic.vet'],
          entities: ['Vet', 'Specialty'],
          apis: ['GET /vets'],
          inboundDependencyCount: 0,
          outboundDependencyCount: 0,
          sharedTableConflicts: [],
          riskScore: 'low',
          riskRationale: 'Self-contained reference data.',
          llmRationale: 'The vet package is purely informational and rarely changes alongside owners or visits.',
          proposedModuleStructure: {
            rootArtifactId: 'vet-service',
            mavenGroupId: 'com.petclinic.vet',
            directories: [
              { path: 'src/main/java/com/petclinic/vet/domain', description: 'Domain Entities', files: ['Vet.java'] }
            ],
            keyClasses: ['Vet'],
            exposedApis: ['GET /api/v1/vets'],
            consumedApis: [],
            databaseSchema: 'Owns vets, specialties tables.',
            dockerfileSuggestion: 'FROM eclipse-temurin:21-jre'
          }
        }
      ]
    };

    await sleep(500);
    store.setPlan(plan);
    store.setAnalyzing(false);
    store.setPhase(6, 'Analysis Complete!');
    return plan;
  }

  private getRepoLabel(repo: RepoInput): string {
    return repo.displayName || repo.url;
  }

  private generateStaticBoundedContexts(javaClasses: JavaClass[], graphNodes: GraphNode[]): BoundedContext[] {
    const groupedClasses = new Map<string, JavaClass[]>();
    const nodeById = new Map(graphNodes.map((node) => [node.id, node]));

    for (const javaClass of javaClasses) {
      const groupName = this.getStaticGroupName(javaClass.packageName);
      const existing = groupedClasses.get(groupName) || [];
      existing.push(javaClass);
      groupedClasses.set(groupName, existing);
    }

    return Array.from(groupedClasses.entries()).map(([groupName, classes]) => {
      const classIds = new Set(classes.map((javaClass) => javaClass.fullyQualifiedName));
      const packages = Array.from(new Set(classes.map((javaClass) => javaClass.packageName))).sort();
      const entities = Array.from(new Set(
        classes
          .filter((javaClass) => javaClass.layer === 'entity')
          .map((javaClass) => javaClass.fullyQualifiedName.split('.').pop() || javaClass.fullyQualifiedName)
      )).sort();
      const apis = Array.from(new Set(
        classes
          .filter((javaClass) => javaClass.layer === 'controller')
          .map((javaClass) => `Controller: ${javaClass.fullyQualifiedName.split('.').pop() || javaClass.fullyQualifiedName}`)
      ));

      const inboundDeps = new Set<string>();
      const outboundDeps = new Set<string>();
      const sharedTableConflicts = new Set<string>();

      for (const javaClass of classes) {
        const node = nodeById.get(javaClass.fullyQualifiedName);
        if (!node) continue;

        for (const target of node.outboundDeps) {
          if (!classIds.has(target)) {
            outboundDeps.add(target);
          }
        }

        for (const source of node.inboundDeps) {
          if (!classIds.has(source)) {
            inboundDeps.add(source);
          }
        }

        if (node.transactionalBoundary && node.outboundDeps.some((target) => !classIds.has(target))) {
          sharedTableConflicts.add(javaClass.fullyQualifiedName.split('.').pop() || javaClass.fullyQualifiedName);
        }
      }

      const riskScore = this.getStaticRiskScore(inboundDeps.size, outboundDeps.size, sharedTableConflicts.size);
      const displayName = groupName.split('.').pop() || groupName;
      const serviceName = `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-service`;

      return {
        name: displayName,
        suggestedServiceName: serviceName,
        packages,
        entities,
        apis,
        inboundDependencyCount: inboundDeps.size,
        outboundDependencyCount: outboundDeps.size,
        sharedTableConflicts: Array.from(sharedTableConflicts).sort(),
        riskScore,
        riskRationale: sharedTableConflicts.size > 0
          ? 'Transactional or tightly coupled classes were detected crossing package-group boundaries.'
          : `Derived from structural coupling signals: ${inboundDeps.size} inbound and ${outboundDeps.size} outbound cross-context dependencies.`,
        llmRationale: 'Generated from package structure, annotations, controller/entity detection, and dependency graph signals without semantic LLM analysis.'
      };
    }).sort((left, right) => left.name.localeCompare(right.name));
  }

  private generateHeuristicRoadmap(boundedContexts: BoundedContext[], graphNodes: GraphNode[]): RoadmapResponse {
    const contextByClass = new Map<string, BoundedContext>();
    for (const context of boundedContexts) {
      for (const pkg of context.packages) {
        for (const node of graphNodes) {
          if (node.packageName === pkg || node.packageName.startsWith(`${pkg}.`)) {
            contextByClass.set(node.id, context);
          }
        }
      }
    }

    const transactionalRisks = graphNodes
      .filter((node) => node.transactionalBoundary)
      .map((node) => {
        const sourceContext = contextByClass.get(node.id);
        const affectedDomains = new Set<string>();
        const affectedClasses = new Set<string>([node.id.split('.').pop() || node.id]);

        for (const target of node.outboundDeps) {
          const targetContext = contextByClass.get(target);
          if (sourceContext && targetContext && targetContext.name !== sourceContext.name) {
            affectedDomains.add(sourceContext.name);
            affectedDomains.add(targetContext.name);
            affectedClasses.add(target.split('.').pop() || target);
          }
        }

        if (affectedDomains.size === 0) {
          return null;
        }

        return {
          description: `Transactional boundary in ${node.id.split('.').pop() || node.id} crosses service boundaries`,
          affectedClasses: Array.from(affectedClasses),
          affectedDomains: Array.from(affectedDomains),
          severity: affectedDomains.size > 2 ? 'high' as const : 'medium' as const,
          mitigationPattern: 'saga' as const,
          explanation: 'This risk was derived from static transactional annotations and cross-context dependency edges rather than semantic workflow analysis.'
        };
      })
      .filter((risk): risk is NonNullable<typeof risk> => risk !== null);

    const orderedContexts = [...boundedContexts].sort((left, right) => {
      const leftScore = this.getRoadmapComplexity(left);
      const rightScore = this.getRoadmapComplexity(right);
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }
      return left.name.localeCompare(right.name);
    });

    return {
      extractionRoadmap: orderedContexts.map((ctx, i) => ({
        order: i + 1,
        boundedContext: ctx.name,
        estimatedEffort: this.getStaticEffort(ctx),
        blockers: [],
        patternRecommendations: ctx.riskScore === 'high'
          ? ['Strangler Fig Pattern', 'Outbox Pattern']
          : ctx.riskScore === 'medium'
            ? ['Strangler Fig Pattern']
            : ['Branch by Abstraction'],
        sagaRequired: transactionalRisks.some((risk) => risk.affectedDomains.includes(ctx.name))
      })),
      transactionalRisks
    };
  }

  private generateStaticModuleStructure(context: BoundedContext, baseGroupId: string): ModuleStructure {
    const artifactId = context.suggestedServiceName;
    const groupId = `${baseGroupId}.${artifactId.replace(/-service$/, '').replace(/-/g, '.')}`;
    const basePath = `src/main/java/${groupId.replace(/\./g, '/')}`;
    const entityFiles = context.entities.map((entity) => `${entity}.java`);
    const controllerFiles = context.apis.map((api) => api.replace('Controller: ', '')).map((name) => `${name}.java`);

    return {
      rootArtifactId: artifactId,
      mavenGroupId: groupId,
      directories: [
        { path: `${basePath}/controller`, description: 'REST entrypoints inferred from controller classes', files: controllerFiles },
        { path: `${basePath}/service`, description: 'Application and domain orchestration services', files: context.entities.map((entity) => `${entity}Service.java`) },
        { path: `${basePath}/repository`, description: 'Persistence adapters and repositories', files: context.entities.map((entity) => `${entity}Repository.java`) },
        { path: `${basePath}/domain`, description: 'Domain entities and core value objects', files: entityFiles },
        { path: `${basePath}/config`, description: 'Service bootstrap and configuration', files: ['ServiceConfig.java'] },
        { path: 'src/main/resources', description: 'Application configuration', files: ['application.yml'] }
      ],
      keyClasses: context.entities.map((entity) => `${groupId}.domain.${entity}`),
      exposedApis: context.apis.length > 0 ? context.apis : [`GET /api/${artifactId.replace(/-service$/, '')}`],
      consumedApis: [],
      databaseSchema: context.entities.length > 0
        ? `Likely owns ${context.entities.map((entity) => entity.toLowerCase()).join(', ')} data structures.`
        : 'No obvious entity ownership detected from static analysis.',
      dockerfileSuggestion: 'FROM eclipse-temurin:21-jre-jammy\nCOPY target/*.jar app.jar\nENTRYPOINT ["java","-jar","/app.jar"]'
    };
  }

  private getStaticGroupName(packageName: string): string {
    const parts = packageName.split('.');
    return parts.length > 3 ? parts.slice(0, 3).join('.') : packageName;
  }

  private getStaticRiskScore(inboundCount: number, outboundCount: number, transactionalCount: number): 'low' | 'medium' | 'high' {
    if (transactionalCount > 0 || outboundCount >= 6 || inboundCount >= 6) {
      return 'high';
    }
    if (outboundCount >= 3 || inboundCount >= 3) {
      return 'medium';
    }
    return 'low';
  }

  private getRoadmapComplexity(context: BoundedContext): number {
    return (
      context.inboundDependencyCount +
      context.outboundDependencyCount +
      context.sharedTableConflicts.length * 3 +
      context.entities.length
    );
  }

  private getStaticEffort(context: BoundedContext): 'days' | 'weeks' | 'months' {
    const complexity = this.getRoadmapComplexity(context);
    if (complexity >= 12) {
      return 'months';
    }
    if (complexity >= 5) {
      return 'weeks';
    }
    return 'days';
  }
}
