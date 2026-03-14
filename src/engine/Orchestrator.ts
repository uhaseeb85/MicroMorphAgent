import { useAnalysisStore } from '../store/analysisStore';
import { RepoFetcher } from './github/RepoFetcher';
import { GitHistoryFetcher } from './github/GitHistoryFetcher';
import { PomXmlParser } from './parser/PomXmlParser';
import { SpringAnnotationParser } from './parser/SpringAnnotationParser';
import { CoChangeMatrix } from './graph/CoChangeMatrix';
import { DependencyGraphBuilder } from './graph/DependencyGraph';
import { LLMClient } from './llm/LLMClient';
import { Summarizer, PackageSummary } from './llm/Summarizer';
import { BoundedContextAnalyzer } from './llm/BoundedContextAnalyzer';
import { RoadmapGenerator, RoadmapResponse } from './llm/RoadmapGenerator';
import { ModuleStructureGenerator } from './llm/ModuleStructureGenerator';
import { AnalysisConfig, DecompositionPlan, JavaClass, BoundedContext } from '../types';

export class Orchestrator {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
  }

  async runAnalysis(): Promise<DecompositionPlan> {
    const store = useAnalysisStore.getState();
    store.setAnalyzing(true);

    // Debug: Log the config being used
    console.log('[Orchestrator] Starting analysis with config:', {
      provider: this.config.llmProvider,
      model: this.config.options.llmModel,
      hasOpenRouterKey: !!this.config.openRouterApiKey,
      repos: this.config.repos.map(r => r.url)
    });

    if (this.config.options.analysisMode === 'demo') {
      return this.runDemo();
    }

    try {
      const repoFetcher = new RepoFetcher(this.config.githubToken);
      const gitFetcher = new GitHistoryFetcher(this.config.githubToken);
      const pomParser = new PomXmlParser();
      const springParser = new SpringAnnotationParser();
      const coChangeMatrixBuilder = new CoChangeMatrix();
      const graphBuilder = new DependencyGraphBuilder();

      const llmClient = new LLMClient(this.config);
      const summarizer = new Summarizer(llmClient);
      const contextAnalyzer = new BoundedContextAnalyzer(llmClient);
      const roadmapGenerator = new RoadmapGenerator(llmClient);
      const moduleStructureGen = new ModuleStructureGenerator(llmClient);

      // Phase 1: POM parsing
      store.setPhase(1, 'Discovering repository structure and analyzing Maven/Gradle files...');
      store.addActivity({ type: 'pom', message: 'Fetching pom.xml from repository...', status: 'pending' });

      const primaryRepo = this.config.repos.find(r => r.role === 'primary') || this.config.repos[0];
      let baseGroupId = 'com.example';

      try {
        const pomContent = await repoFetcher.fetchFileContent(primaryRepo.url, 'pom.xml', primaryRepo.branch);
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
      store.setPhase(2, 'Fetching Java source files via GitHub API...');
      store.addActivity({ type: 'git', message: 'Scanning repository for Java files...', status: 'pending' });

      const javaSourceFiles = await repoFetcher.fetchJavaFiles(primaryRepo, this.config.options.includeTestFiles);
      store.setFileProgress(0, javaSourceFiles.length, '');
      store.addActivity({ type: 'git', message: `Found ${javaSourceFiles.length} Java files`, status: 'success' });

      store.setPhase(2, `Parsing ${javaSourceFiles.length} Java files locally...`);
      const javaClasses: JavaClass[] = [];

      for (let i = 0; i < javaSourceFiles.length; i++) {
        const file = javaSourceFiles[i];
        const parsed = springParser.parseStringFallback(file.content, file.path, file.repo);
        javaClasses.push(parsed);
        store.setFileProgress(i + 1, javaSourceFiles.length, file.path);

        // Throttle activity updates to avoid overwhelming the UI
        if (i % 10 === 0 || i === javaSourceFiles.length - 1) {
          store.setFileProgress(i + 1, javaSourceFiles.length, file.path);
        }
      }

      // Phase 3: Graph Construction
      store.setPhase(3, 'Fetching Git Commit History for Co-Change Analysis...');
      store.addActivity({ type: 'git', message: `Fetching last ${this.config.options.maxCommitHistory} commits...`, status: 'pending' });

      const commits = await gitFetcher.fetchCommitHistory(
        primaryRepo,
        this.config.options.maxCommitHistory,
        this.config.options.gitCoChangeWindowDays
      );
      store.setGitProgress(commits.length);
      store.addActivity({ type: 'git', message: `Fetched ${commits.length} commits for analysis`, status: 'success' });

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

      // Phase 4: LLM Package Summarization (skip in static mode)
      const summaries: PackageSummary[] = [];
      if (this.config.options.analysisMode !== 'static') {
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

          const summary = await summarizer.summarizePackage(pkgName, classes);
          summaries.push(summary);

          store.setPackageProgress(i, packageMap.size, pkgName);
          store.setLLMProgress(i, packageMap.size, '');
          store.addActivity({ type: 'llm', message: `Analyzed package: ${pkgName.split('.').slice(-2).join('.')}`, status: 'success' });
        }

        store.addActivity({ type: 'llm', message: `Completed ${packageMap.size} LLM package summaries`, status: 'success' });
      } else {
        store.setPhase(4, 'Static mode: skipping LLM package summarization...');
        store.addActivity({ type: 'info', message: 'Static mode enabled - skipping LLM analysis', status: 'success' });
      }

      // Phase 5: Decomposition Reasoning
      store.setPhase(5, 'Identifying Microservice Bounded Contexts...');
      store.addActivity({ type: 'llm', message: 'Identifying bounded contexts from package summaries...', status: 'pending' });

      let boundedContexts: BoundedContext[] = [];
      try {
        boundedContexts = await contextAnalyzer.analyze(summaries, topCoChanges, graphNodes, this.config.options.granularity);
      } catch (e) {
        if (this.config.options.analysisMode === 'static') {
          console.warn('LLM Bounded Context Analysis failed in static mode, using fallback:', e);
          boundedContexts = this.generateStaticBoundedContexts(javaClasses);
        } else {
          throw e;
        }
      }
      store.addActivity({ type: 'llm', message: `Identified ${boundedContexts.length} bounded contexts`, status: 'success' });

      store.setPhase(5, 'Generating Extraction Roadmap...');
      store.addActivity({ type: 'llm', message: 'Generating extraction roadmap and transactional risk analysis...', status: 'pending' });

      let roadmapAndRisks: RoadmapResponse;
      try {
        roadmapAndRisks = await roadmapGenerator.generate(boundedContexts, graphNodes);
      } catch (e) {
        if (this.config.options.analysisMode === 'static') {
          console.warn('Roadmap generation failed in static mode, using fallback:', e);
          roadmapAndRisks = this.generateHeuristicRoadmap(boundedContexts);
        } else {
          throw e;
        }
      }
      store.addActivity({ type: 'llm', message: `Generated roadmap with ${roadmapAndRisks.extractionRoadmap.length} steps and ${roadmapAndRisks.transactionalRisks.length} risks`, status: 'success' });

      // Phase 5b: Generate per-service module structures
      store.setPhase(5, 'Generating module structures for each microservice...');
      store.addActivity({ type: 'llm', message: 'Generating Maven module structures for each service...', status: 'pending' });
      store.setLLMProgress(0, boundedContexts.length, 'Generating module structures...');

      const enrichedContexts = await Promise.all(
        boundedContexts.map(async (ctx, idx) => {
          try {
            store.setLLMProgress(idx, boundedContexts.length, ctx.suggestedServiceName);
            const structure = await moduleStructureGen.generateForContext(ctx, baseGroupId);
            store.addActivity({ type: 'llm', message: `Generated structure for ${ctx.suggestedServiceName}`, status: 'success' });
            return { ...ctx, proposedModuleStructure: structure };
          } catch (e) {
            store.addActivity({ type: 'info', message: `Skipped module structure for ${ctx.suggestedServiceName}`, status: 'success' });
            return ctx;
          }
        })
      );
      store.setLLMProgress(boundedContexts.length, boundedContexts.length, '');

      const plan: DecompositionPlan = {
        boundedContexts: enrichedContexts,
        extractionRoadmap: roadmapAndRisks.extractionRoadmap,
        transactionalRisks: roadmapAndRisks.transactionalRisks,
        sharedLibAssessment: [],
        dependencyGraph: graphNodes,
        generatedAt: new Date().toISOString(),
        reposAnalyzed: this.config.repos.map(r => r.url)
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
    await sleep(800);
    store.addActivity({ type: 'pom', message: 'Parsed POM: spring-petclinic (org.springframework.samples)', status: 'success' });

    // Phase 2
    store.setPhase(2, 'Fetching Java source files via GitHub API...');
    store.addActivity({ type: 'git', message: 'Scanning repository for Java files...', status: 'pending' });
    await sleep(600);
    const mockFilesCount = 42;
    store.addActivity({ type: 'git', message: `Found ${mockFilesCount} Java files`, status: 'success' });
    store.setFileProgress(0, mockFilesCount, '');
    for (let i = 0; i < mockFilesCount; i++) {
       if (i % 5 === 0) {
         store.setFileProgress(i, mockFilesCount, `petclinic/model/Owner${i}.java`);
         await sleep(50);
       }
    }
    store.setFileProgress(mockFilesCount, mockFilesCount, 'petclinic/PetClinicApplication.java');

    // Phase 3
    store.setPhase(3, 'Fetching Git Commit History for Co-Change Analysis...');
    store.addActivity({ type: 'git', message: 'Fetching last 300 commits...', status: 'pending' });
    await sleep(1000);
    store.setGitProgress(300);
    store.addActivity({ type: 'git', message: 'Fetched 300 commits for analysis', status: 'success' });
    store.setPhase(3, 'Constructing Co-Change Matrix...');
    await sleep(500);
    store.setGraphStats(0, 12);
    store.addActivity({ type: 'graph', message: 'Identified 12 strong co-change patterns', status: 'success' });
    store.setPhase(3, 'Building Unified Dependency Graph...');
    await sleep(400);
    store.setGraphStats(42, 12);
    store.addActivity({ type: 'graph', message: 'Built graph with 42 nodes and 156 edges', status: 'success' });

    // Phase 4
    store.setPhase(4, 'Generating semantic package summaries via LLM...');
    const demoPackages = ['owner', 'vet', 'visit', 'pet', 'system'];
    store.setPackageProgress(0, demoPackages.length, '');
    store.setLLMProgress(0, demoPackages.length, '');
    for(let i=0; i<demoPackages.length; i++) {
      store.setLLMProgress(i, demoPackages.length, `Summarizing ${demoPackages[i]}...`);
      await sleep(1200);
      store.addActivity({ type: 'llm', message: `Analyzed package: ${demoPackages[i]}`, status: 'success' });
      store.setPackageProgress(i+1, demoPackages.length, demoPackages[i]);
    }

    // Phase 5
    store.setPhase(5, 'Identifying Microservice Bounded Contexts...');
    await sleep(1500);
    store.addActivity({ type: 'llm', message: 'Identified 3 bounded contexts: Customer, Veterinary, Clinic', status: 'success' });
    
    store.setPhase(5, 'Generating Extraction Roadmap...');
    await sleep(1000);
    store.addActivity({ type: 'llm', message: 'Generated roadmap with 3 steps and 2 transactional risks', status: 'success' });

    store.setPhase(5, 'Generating module structures for each microservice...');
    await sleep(800);
    store.addActivity({ type: 'llm', message: 'Generated Maven module structures for Customer Service', status: 'success' });
    await sleep(500);
    store.addActivity({ type: 'llm', message: 'Generated Maven module structures for Vet Service', status: 'success' });

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

  private generateStaticBoundedContexts(javaClasses: JavaClass[]): BoundedContext[] {
    const packageGroups = new Map<string, string[]>();
    for (const jc of javaClasses) {
      // Group by the first 3 segments of the package name (e.g., com.example.v1)
      const parts = jc.packageName.split('.');
      const topLevel = parts.length > 3 ? parts.slice(0, 3).join('.') : jc.packageName;
      const pkg = packageGroups.get(topLevel) || [];
      pkg.push(jc.packageName);
      packageGroups.set(topLevel, Array.from(new Set(pkg)));
    }

    return Array.from(packageGroups.entries()).map(([name, pkgs]) => {
      const serviceName = (name.split('.').pop() || name).toLowerCase();
      return {
        name: name.split('.').pop() || name,
        suggestedServiceName: `${serviceName}-service`,
        packages: pkgs,
        entities: [],
        apis: [],
        inboundDependencyCount: 0,
        outboundDependencyCount: 0,
        sharedTableConflicts: [],
        riskScore: 'low' as const,
        riskRationale: 'Generated via static package grouping (LLM fallback/static mode).',
        llmRationale: 'Packages were grouped based on shared namespace prefix because deep semantic analysis was skipped or unavailable.'
      };
    });
  }

  private generateHeuristicRoadmap(boundedContexts: BoundedContext[]): RoadmapResponse {
    return {
      extractionRoadmap: boundedContexts.map((ctx, i) => ({
        order: i + 1,
        boundedContext: ctx.name,
        estimatedEffort: 'weeks',
        blockers: [],
        patternRecommendations: ['Strangler Fig Pattern'],
        sagaRequired: false
      })),
      transactionalRisks: []
    };
  }
}
