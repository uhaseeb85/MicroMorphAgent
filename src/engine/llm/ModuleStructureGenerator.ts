import { BoundedContext, ModuleStructure } from '../../types';
import { LLMClient } from './LLMClient';

export class ModuleStructureGenerator {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async generateForContext(context: BoundedContext, baseGroupId: string = 'com.example'): Promise<ModuleStructure> {
    const systemPrompt = `You are a senior Spring Boot architect generating a concrete Maven module structure for a newly extracted microservice.
Return ONLY a raw JSON object matching this EXACT schema:
{
  "rootArtifactId": "string (kebab-case, e.g. order-service)",
  "mavenGroupId": "string (e.g. com.example.order)",
  "directories": [
    {
      "path": "string (e.g. src/main/java/com/example/order/controller)",
      "description": "string (what lives here)",
      "files": ["ClassName.java", ...]
    }
  ],
  "keyClasses": ["FullyQualifiedClassName", ...],
  "exposedApis": ["GET /api/orders", "POST /api/orders/{id}/cancel", ...],
  "consumedApis": ["order-service: GET /api/...", ...],
  "databaseSchema": "string (short description of owned tables or collections)",
  "dockerfileSuggestion": "string (one-line dockerfile hint, e.g. FROM eclipse-temurin:21-jre)"
}
Do NOT include markdown, only output the JSON object.`;

    const userPrompt = `Microservice Context:
Name: ${context.name}
Service Name: ${context.suggestedServiceName}
Base GroupId: ${baseGroupId}
Packages owned: ${context.packages.join(', ')}
JPA Entities: ${context.entities.join(', ')}
APIs: ${context.apis.join(', ')}
Risk: ${context.riskScore}
Rationale: ${context.llmRationale}`;

    try {
      const result = await this.llm.generateJson<ModuleStructure>(systemPrompt, userPrompt, 1500);
      return result;
    } catch (e) {
      // Graceful fallback: generate a basic structure heuristically
      return this.heuristicFallback(context, baseGroupId);
    }
  }

  private heuristicFallback(context: BoundedContext, baseGroupId: string): ModuleStructure {
    const artifactId = context.suggestedServiceName;
    const groupId = `${baseGroupId}.${artifactId.replace(/-/g, '.')}`;
    const basePath = `src/main/java/${groupId.replace(/\./g, '/')}`;

    return {
      rootArtifactId: artifactId,
      mavenGroupId: groupId,
      directories: [
        { path: `${basePath}/controller`, description: 'REST API controllers (Spring MVC)', files: context.entities.map(e => `${e}Controller.java`) },
        { path: `${basePath}/service`, description: 'Business logic and orchestration', files: context.entities.map(e => `${e}Service.java`) },
        { path: `${basePath}/repository`, description: 'JPA Repositories and query methods', files: context.entities.map(e => `${e}Repository.java`) },
        { path: `${basePath}/domain`, description: 'JPA Entities and domain objects', files: context.entities.map(e => `${e}.java`) },
        { path: `${basePath}/config`, description: 'Spring configuration classes', files: ['ServiceConfig.java', 'SecurityConfig.java'] },
        { path: 'src/main/resources', description: 'Application config', files: ['application.yml', 'application-docker.yml'] },
        { path: 'src/test/java', description: 'Unit and integration tests', files: [] },
      ],
      keyClasses: context.entities.map(e => `${groupId}.domain.${e}`),
      exposedApis: context.apis.length > 0 ? context.apis : [`GET /api/${artifactId.replace('-service', '')}`, `POST /api/${artifactId.replace('-service', '')}`],
      consumedApis: [],
      databaseSchema: `Owns tables: ${context.entities.map(e => e.toLowerCase() + 's').join(', ')}`,
      dockerfileSuggestion: 'FROM eclipse-temurin:21-jre-jammy\nCOPY target/*.jar app.jar\nENTRYPOINT ["java","-jar","/app.jar"]'
    };
  }
}
