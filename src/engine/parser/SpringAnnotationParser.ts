import { parse as javaParser } from 'java-parser';
import { JavaClass } from '../../types';

export class SpringAnnotationParser {
  private readonly LAYER_ANNOTATIONS = {
    controller: ['@RestController', '@Controller', '@FeignClient', '@GraphQLApi'],
    service:    ['@Service', '@Component', '@EventListener', '@ApplicationService'],
    repository: ['@Repository', '@JpaRepository', '@CrudRepository'],
    entity:     ['@Entity', '@Embeddable', '@MappedSuperclass', '@Table', '@Document'],
    config:     ['@Configuration', '@Enable', '@SpringBootApplication'],
  };

  parse(javaSource: string, filePath: string, repoSource: string): JavaClass {
    try {
      const cst = javaParser(javaSource);
      
      const packageName = this.extractPackageName(cst) || 'default';
      const className = this.extractClassName(cst);
      const fullyQualifiedName = className ? `${packageName}.${className}` : filePath;
      
      const annotations = this.extractAnnotations(cst);
      const imports = this.extractImports(cst);
      const methods = this.extractMethods(cst);
      const fields = this.extractFields(cst);

      // Layer detection
      let detectedLayer: JavaClass['layer'] = 'util'; // Default fallback
      for (const [layer, marks] of Object.entries(this.LAYER_ANNOTATIONS)) {
        if (annotations.some(ann => marks.some(m => ann.includes(m)))) {
          detectedLayer = layer as JavaClass['layer'];
          break;
        }
      }

      return {
        fullyQualifiedName,
        packageName,
        annotations,
        methods,
        fields,
        imports,
        repoSource,
        filePath,
        layer: detectedLayer
      };
    } catch (e: any) {
       console.warn(`Failed to parse Java file: ${filePath}`, e.message);
       // Return a stub if unparseable
       return {
         fullyQualifiedName: filePath,
         packageName: 'unknown',
         annotations: [],
         methods: [],
         fields: [],
         imports: [],
         repoSource,
         filePath,
         layer: 'util'
       };
    }
  }

  // --- CST Traversal Utilities ---
  // Using simplified string analysis for robustness against partial java-parser CST completeness
  // In a robust implementation, these would traverse `cst` deeply using visitor patterns.
  // For this browser app, we use a hybrid of CST where reliable and Regex for fallback.
  
  private extractPackageName(cst: any): string {
    // Attempt standard CST access or fallback to Regex
    const packageCtx = cst?.children?.packageDeclaration?.[0]?.children?.name?.[0]?.children?.Identifier;
    if (packageCtx) {
      return packageCtx.map((id: any) => id.image).join('.');
    }
    return '';
  }

  private extractClassName(cst: any): string {
    const classCtx = cst?.children?.typeDeclaration?.[0]?.children?.classDeclaration?.[0]?.children?.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0];
    if (classCtx) return classCtx.image;
    
    // Interface fallback
    const interfaceCtx = cst?.children?.typeDeclaration?.[0]?.children?.interfaceDeclaration?.[0]?.children?.normalInterfaceDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0];
    return interfaceCtx?.image || '';
  }

  private extractAnnotations(cst: any): string[] {
    // Due to java-parser complexity, Regex mapping is often more reliable for annotations in raw source
    return []; // We will inject a regex pass below for simplicity in this MVP
  }

  private extractImports(cst: any): string[] {
    return []; // Regex fallback below
  }

  private extractMethods(cst: any): string[] {
    return []; // Regex fallback below
  }

  private extractFields(cst: any): string[] {
    return []; // Regex fallback below
  }

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
