import { JavaClass } from '../../types';

export class SpringAnnotationParser {
  private readonly LAYER_ANNOTATIONS = {
    controller: ['@RestController', '@Controller', '@FeignClient', '@GraphQLApi'],
    service:    ['@Service', '@Component', '@EventListener', '@ApplicationService'],
    repository: ['@Repository', '@JpaRepository', '@CrudRepository'],
    entity:     ['@Entity', '@Embeddable', '@MappedSuperclass', '@Table', '@Document'],
    config:     ['@Configuration', '@Enable', '@SpringBootApplication'],
  };

  // Purely string-based extractions for speed and reliability in the browser MVP
  public parseStringFallback(javaSource: string, filePath: string, repoSource: string): JavaClass {
    const lines = javaSource.split('\n');
    let packageName = 'default';
    const imports: string[] = [];
    const annotations: string[] = [];
    const methods: string[] = [];
    
    const pkgMatch = javaSource.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
    if (pkgMatch) packageName = pkgMatch[1];
    
    const importRegex = /import\s+([a-zA-Z0-9_.]+)\s*;/g;
    let match;
    while ((match = importRegex.exec(javaSource)) !== null) {
      imports.push(match[1]);
    }

    const annRegex = /@([A-Z][a-zA-Z0-9_]+)(\([^)]*\))?/g;
    while ((match = annRegex.exec(javaSource)) !== null) {
      annotations.push('@' + match[1]); // e.g. @RestController
    }

    const classMatch = javaSource.match(/(?:public|protected|private)?\s*(?:class|interface|enum|record)\s+([A-Z][a-zA-Z0-9_]+)/);
    const className = classMatch ? classMatch[1] : filePath.split('/').pop()?.replace('.java', '') || 'Unknown';
    const fullyQualifiedName = `${packageName}.${className}`;

    // Transactional method heuristic (important for risk detection)
    lines.forEach((line, i) => {
      if (line.includes('@Transactional')) {
        // Look ahead for method signature
        for(let j=1; j<3; j++) {
            if (lines[i+j] && lines[i+j].match(/(public|protected).+\(/)) {
                methods.push(`@Transactional ${lines[i+j].trim().split('{')[0]}`);
                break;
            }
        }
      }
    });

    let detectedLayer: JavaClass['layer'] = 'util';
    for (const [layer, marks] of Object.entries(this.LAYER_ANNOTATIONS)) {
      if (annotations.some(ann => marks.some(m => ann.includes(m)))) {
        detectedLayer = layer as JavaClass['layer'];
        break;
      }
    }

    return {
      fullyQualifiedName,
      packageName,
      annotations: Array.from(new Set(annotations)),
      methods,
      fields: [],
      imports: Array.from(new Set(imports)),
      repoSource,
      filePath,
      layer: detectedLayer
    };
  }
}
