import { parser as javaParser } from '@lezer/java';
import type { TreeCursor } from '@lezer/common';
import { JavaClass } from '../../types';

interface ParsedTypeDeclaration {
  name: string;
  annotations: string[];
  methods: string[];
  fields: string[];
  typeReferences: string[];
}

export class SpringAnnotationParser {
  private readonly LAYER_ANNOTATIONS = {
    controller: ['@RestController', '@Controller', '@FeignClient', '@GraphQLApi'],
    service:    ['@Service', '@Component', '@EventListener', '@ApplicationService'],
    repository: ['@Repository', '@JpaRepository', '@CrudRepository'],
    entity:     ['@Entity', '@Embeddable', '@MappedSuperclass', '@Table', '@Document'],
    config:     ['@Configuration', '@Enable', '@SpringBootApplication'],
  };

  private readonly FIELD_DECLARATIONS = new Set([
    'FieldDeclaration',
    'ConstantDeclaration'
  ]);

  private readonly EXECUTABLE_DECLARATIONS = new Set([
    'MethodDeclaration',
    'ConstructorDeclaration',
    'AnnotationTypeElementDeclaration'
  ]);

  public parseSource(javaSource: string, filePath: string, repoSource: string): JavaClass {
    try {
      return this.parseAst(javaSource, filePath, repoSource);
    } catch (error) {
      console.warn(`[SpringAnnotationParser] AST parse failed for ${filePath}, falling back to regex extraction.`, error);
      return this.parseRegexFallback(javaSource, filePath, repoSource);
    }
  }

  public parseStringFallback(javaSource: string, filePath: string, repoSource: string): JavaClass {
    return this.parseSource(javaSource, filePath, repoSource);
  }

  private parseAst(javaSource: string, filePath: string, repoSource: string): JavaClass {
    const tree = javaParser.parse(javaSource);
    const cursor = tree.cursor();
    const imports = new Set<string>();
    let packageName = 'default';
    let hasPrimaryType = false;
    let primaryType: ParsedTypeDeclaration = {
      name: '',
      annotations: [],
      methods: [],
      fields: [],
      typeReferences: []
    };

    const visit = () => {
      switch (cursor.name) {
        case 'PackageDeclaration': {
          packageName = this.extractPackageName(cursor, javaSource) || packageName;
          return;
        }
        case 'ImportDeclaration': {
          const importName = this.extractImportName(cursor, javaSource);
          if (importName) {
            imports.add(importName);
          }
          return;
        }
        case 'ClassDeclaration':
        case 'InterfaceDeclaration':
        case 'EnumDeclaration':
        case 'AnnotationTypeDeclaration': {
          if (!hasPrimaryType) {
            primaryType = this.extractPrimaryType(cursor, javaSource);
            hasPrimaryType = true;
          }
          return;
        }
        default:
          break;
      }

      if (cursor.firstChild()) {
        do {
          visit();
        } while (cursor.nextSibling());
        cursor.parent();
      }
    };

    visit();

    const className = hasPrimaryType ? primaryType.name : this.getFallbackClassName(filePath);
    const annotations = hasPrimaryType ? primaryType.annotations : [];
    const fullyQualifiedName = packageName === 'default' ? className : `${packageName}.${className}`;

    return {
      fullyQualifiedName,
      packageName,
      annotations,
      methods: hasPrimaryType ? primaryType.methods : [],
      fields: hasPrimaryType ? primaryType.fields : [],
      imports: Array.from(imports),
      typeReferences: hasPrimaryType ? primaryType.typeReferences : [],
      repoSource,
      filePath,
      layer: this.detectLayer(annotations, className, packageName)
    };
  }

  private extractPrimaryType(cursor: TreeCursor, source: string): ParsedTypeDeclaration {
    const annotations = new Set<string>();
    const methods: string[] = [];
    const fields: string[] = [];
    const typeReferences = new Set<string>();
    let className = '';

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Modifiers') {
          this.collectAnnotations(cursor, source, annotations);
        } else if (cursor.name === 'Definition' && !className) {
          className = source.slice(cursor.from, cursor.to).trim();
        } else if (cursor.name === 'Superclass' || cursor.name === 'SuperInterfaces' || cursor.name === 'ExtendsInterfaces') {
          this.collectTypeReferences(cursor, source, typeReferences);
        } else if (
          cursor.name === 'ClassBody' ||
          cursor.name === 'InterfaceBody' ||
          cursor.name === 'EnumBody' ||
          cursor.name === 'AnnotationTypeBody'
        ) {
          this.collectMembers(cursor, source, methods, fields, typeReferences);
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    return {
      name: className,
      annotations: Array.from(annotations),
      methods,
      fields,
      typeReferences: Array.from(typeReferences)
    };
  }

  private collectMembers(
    cursor: TreeCursor,
    source: string,
    methods: string[],
    fields: string[],
    typeReferences: Set<string>
  ): void {
    if (!cursor.firstChild()) {
      return;
    }

    do {
      if (this.FIELD_DECLARATIONS.has(cursor.name)) {
        fields.push(this.compactWhitespace(source.slice(cursor.from, cursor.to)));
        this.collectTypeReferences(cursor, source, typeReferences);
      } else if (this.EXECUTABLE_DECLARATIONS.has(cursor.name)) {
        methods.push(this.extractExecutableSignature(cursor, source));
        this.collectTypeReferences(cursor, source, typeReferences);
      } else if (cursor.name === 'EnumConstant') {
        fields.push(this.compactWhitespace(source.slice(cursor.from, cursor.to)));
      }
    } while (cursor.nextSibling());

    cursor.parent();
  }

  private extractExecutableSignature(cursor: TreeCursor, source: string): string {
    let signatureEnd = cursor.to;

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Block') {
          signatureEnd = cursor.from;
          break;
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    return this.compactWhitespace(source.slice(cursor.from, signatureEnd).replace(/;+\s*$/, ''));
  }

  private collectAnnotations(cursor: TreeCursor, source: string, annotations: Set<string>): void {
    if (!cursor.firstChild()) {
      return;
    }

    do {
      if (cursor.name === 'MarkerAnnotation' || cursor.name === 'Annotation') {
        const annotation = this.extractAnnotationName(cursor, source);
        if (annotation) {
          annotations.add(annotation);
        }
      }
    } while (cursor.nextSibling());

    cursor.parent();
  }

  private collectTypeReferences(cursor: TreeCursor, source: string, typeReferences: Set<string>): void {
    if (cursor.name === 'TypeName' || cursor.name === 'ScopedTypeName') {
      const reference = source.slice(cursor.from, cursor.to).trim();
      if (reference) {
        typeReferences.add(reference);
      }
      return;
    }

    if (!cursor.firstChild()) {
      return;
    }

    do {
      this.collectTypeReferences(cursor, source, typeReferences);
    } while (cursor.nextSibling());

    cursor.parent();
  }

  private extractPackageName(cursor: TreeCursor, source: string): string {
    let packageName = '';

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Identifier' || cursor.name === 'ScopedIdentifier') {
          packageName = source.slice(cursor.from, cursor.to).trim();
          break;
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    return packageName;
  }

  private extractImportName(cursor: TreeCursor, source: string): string | null {
    let importPath = '';
    let wildcard = false;
    let isStatic = false;

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'static') {
          isStatic = true;
        } else if (cursor.name === 'Identifier' || cursor.name === 'ScopedIdentifier') {
          importPath = source.slice(cursor.from, cursor.to).trim();
        } else if (cursor.name === 'Asterisk') {
          wildcard = true;
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    if (!importPath || isStatic) {
      return null;
    }

    return wildcard ? `${importPath}.*` : importPath;
  }

  private extractAnnotationName(cursor: TreeCursor, source: string): string | null {
    let annotationName = '';

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Identifier' || cursor.name === 'ScopedIdentifier') {
          annotationName = source.slice(cursor.from, cursor.to).trim();
          break;
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    if (!annotationName) {
      return null;
    }

    const shortName = annotationName.split('.').pop() || annotationName;
    return `@${shortName}`;
  }

  private detectLayer(
    annotations: string[],
    className: string,
    packageName: string
  ): JavaClass['layer'] {
    for (const [layer, marks] of Object.entries(this.LAYER_ANNOTATIONS)) {
      if (annotations.some((annotation) => marks.includes(annotation))) {
        return layer as JavaClass['layer'];
      }
    }

    if (className.endsWith('Controller') || packageName.includes('.controller')) {
      return 'controller';
    }
    if (className.endsWith('Service') || packageName.includes('.service')) {
      return 'service';
    }
    if (className.endsWith('Repository') || packageName.includes('.repository') || packageName.includes('.repo')) {
      return 'repository';
    }
    if (className.endsWith('Entity') || packageName.includes('.entity') || packageName.includes('.domain')) {
      return 'entity';
    }
    if (className.endsWith('Configuration') || className.endsWith('Config') || packageName.includes('.config')) {
      return 'config';
    }

    return 'util';
  }

  private compactWhitespace(value: string): string {
    return value.replaceAll(/\s+/g, ' ').trim();
  }

  private getFallbackClassName(filePath: string): string {
    return filePath.split('/').pop()?.replace('.java', '') || 'Unknown';
  }

  private parseRegexFallback(javaSource: string, filePath: string, repoSource: string): JavaClass {
    const lines = javaSource.split('\n');
    let packageName = 'default';
    const imports: string[] = [];
    const annotations: string[] = [];
    const methods: string[] = [];
    
    const pkgMatch = /package\s+([a-zA-Z0-9_.]+)\s*;/.exec(javaSource);
    if (pkgMatch) packageName = pkgMatch[1];
    
    const importRegex = /import\s+([a-zA-Z0-9_.]+)\s*;/g;
    let match;
    while ((match = importRegex.exec(javaSource)) !== null) {
      imports.push(match[1]);
    }

    const annRegex = /@([A-Z]\w+)(\([^)]*\))?/g;
    while ((match = annRegex.exec(javaSource)) !== null) {
      annotations.push('@' + match[1]); // e.g. @RestController
    }

    const classMatch = /(?:public|protected|private)?\s*(?:class|interface|enum|record)\s+([A-Z]\w+)/.exec(javaSource);
    const className = classMatch ? classMatch[1] : filePath.split('/').pop()?.replace('.java', '') || 'Unknown';
    const fullyQualifiedName = `${packageName}.${className}`;

    // Transactional method heuristic (important for risk detection)
    lines.forEach((line, i) => {
      if (line.includes('@Transactional')) {
        // Look ahead for method signature
        for(let j=1; j<3; j++) {
            if (/(public|protected).+\(/.exec(lines[i + j] ?? '')) {
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
      typeReferences: [],
      repoSource,
      filePath,
      layer: detectedLayer
    };
  }
}
