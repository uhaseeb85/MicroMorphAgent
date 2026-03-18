import { parser as javaParser } from '@lezer/java';
import type { TreeCursor } from '@lezer/common';
import type {
  JavaClass,
  AnnotationDetail,
  InjectionPoint,
  EndpointMapping,
  TransactionalMethodInfo,
  GenericTypeRef
} from '../../types';

interface ParsedTypeDeclaration {
  name: string;
  annotations: string[];
  annotationDetails: AnnotationDetail[];
  methods: string[];
  fields: string[];
  typeReferences: string[];
  superClass: GenericTypeRef | undefined;
  interfaces: string[];
  genericSuperTypes: GenericTypeRef[];
  injectionPoints: InjectionPoint[];
  endpointMappings: EndpointMapping[];
  transactionalMethods: TransactionalMethodInfo[];
  innerClasses: string[];
}

export class SpringAnnotationParser {
  private readonly LAYER_ANNOTATIONS = {
    controller: ['@RestController', '@Controller', '@FeignClient', '@GraphQLApi'],
    service:    ['@Service', '@Component', '@EventListener', '@ApplicationService'],
    repository: ['@Repository', '@JpaRepository', '@CrudRepository'],
    entity:     ['@Entity', '@Embeddable', '@MappedSuperclass', '@Table', '@Document'],
    config:     ['@Configuration', '@Enable', '@SpringBootApplication'],
  };

  private readonly SPRING_MANAGED = new Set([
    '@Component', '@Service', '@Controller', '@RestController',
    '@Repository', '@Configuration', '@SpringBootApplication',
  ]);

  private readonly INJECTION_ANNOTATIONS = new Set([
    '@Autowired', '@Inject', '@Resource',
  ]);

  private readonly MAPPING_TO_HTTP: Record<string, string> = {
    '@RequestMapping': 'REQUEST',
    '@GetMapping': 'GET',
    '@PostMapping': 'POST',
    '@PutMapping': 'PUT',
    '@DeleteMapping': 'DELETE',
    '@PatchMapping': 'PATCH',
  };

  private readonly SPRING_DATA_REPOS = new Set([
    'JpaRepository', 'CrudRepository', 'PagingAndSortingRepository',
    'MongoRepository', 'ReactiveCrudRepository', 'ReactiveMongoRepository',
    'R2dbcRepository',
  ]);

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
      annotationDetails: [],
      methods: [],
      fields: [],
      typeReferences: [],
      superClass: undefined,
      interfaces: [],
      genericSuperTypes: [],
      injectionPoints: [],
      endpointMappings: [],
      transactionalMethods: [],
      innerClasses: []
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

    // Derive class-level endpoint prefix
    const classLevelMapping = primaryType.annotationDetails.find(
      (a) => a.name === '@RequestMapping'
    );
    const classPrefix = classLevelMapping?.params['value'] || classLevelMapping?.params['path'] || '';

    // Prefix method-level endpoints with class-level path
    const endpointMappings = primaryType.endpointMappings.map((ep) => ({
      ...ep,
      path: classPrefix ? `${classPrefix.replace(/\/+$/, '')}/${ep.path.replace(/^\/+/, '')}` : ep.path,
    }));

    // Detect constructor injection in Spring-managed beans
    const isSpringManaged = annotations.some((a) => this.SPRING_MANAGED.has(a));
    const injectionPoints = isSpringManaged
      ? primaryType.injectionPoints
      : primaryType.injectionPoints.filter((ip) => ip.mechanism !== 'constructor');

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
      layer: this.detectLayer(annotations, className, packageName, primaryType.interfaces, endpointMappings),
      superClass: primaryType.superClass,
      interfaces: primaryType.interfaces,
      annotationDetails: primaryType.annotationDetails,
      injectionPoints,
      endpointMappings,
      transactionalMethods: primaryType.transactionalMethods,
      innerClasses: primaryType.innerClasses,
      genericSuperTypes: primaryType.genericSuperTypes,
    };
  }

  private extractPrimaryType(cursor: TreeCursor, source: string): ParsedTypeDeclaration {
    const annotations = new Set<string>();
    const annotationDetails: AnnotationDetail[] = [];
    const methods: string[] = [];
    const fields: string[] = [];
    const typeReferences = new Set<string>();
    const interfaces: string[] = [];
    const genericSuperTypes: GenericTypeRef[] = [];
    const injectionPoints: InjectionPoint[] = [];
    const endpointMappings: EndpointMapping[] = [];
    const transactionalMethods: TransactionalMethodInfo[] = [];
    const innerClasses: string[] = [];
    let className = '';
    let superClass: GenericTypeRef | undefined;

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Modifiers') {
          this.collectAnnotations(cursor, source, annotations, annotationDetails);
        } else if (cursor.name === 'Definition' && !className) {
          className = source.slice(cursor.from, cursor.to).trim();
        } else if (cursor.name === 'Superclass') {
          const extracted = this.extractSuperType(cursor, source, typeReferences);
          if (extracted) {
            superClass = extracted;
            if (extracted.typeArgs.length > 0) {
              genericSuperTypes.push(extracted);
            }
          }
        } else if (cursor.name === 'SuperInterfaces' || cursor.name === 'ExtendsInterfaces') {
          this.extractInterfaces(cursor, source, interfaces, typeReferences, genericSuperTypes);
        } else if (
          cursor.name === 'ClassBody' ||
          cursor.name === 'InterfaceBody' ||
          cursor.name === 'EnumBody' ||
          cursor.name === 'AnnotationTypeBody'
        ) {
          this.collectMembers(
            cursor, source, annotations, methods, fields, typeReferences,
            injectionPoints, endpointMappings, transactionalMethods, innerClasses
          );
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    return {
      name: className,
      annotations: Array.from(annotations),
      annotationDetails,
      methods,
      fields,
      typeReferences: Array.from(typeReferences),
      superClass,
      interfaces,
      genericSuperTypes,
      injectionPoints,
      endpointMappings,
      transactionalMethods,
      innerClasses
    };
  }

  private collectMembers(
    cursor: TreeCursor,
    source: string,
    classAnnotations: Set<string>,
    methods: string[],
    fields: string[],
    typeReferences: Set<string>,
    injectionPoints: InjectionPoint[],
    endpointMappings: EndpointMapping[],
    transactionalMethods: TransactionalMethodInfo[],
    innerClasses: string[]
  ): void {
    if (!cursor.firstChild()) {
      return;
    }

    do {
      if (this.FIELD_DECLARATIONS.has(cursor.name)) {
        fields.push(this.compactWhitespace(source.slice(cursor.from, cursor.to)));
        this.collectTypeReferences(cursor, source, typeReferences);
        this.detectFieldInjection(cursor, source, injectionPoints);
      } else if (cursor.name === 'ConstructorDeclaration') {
        methods.push(this.extractExecutableSignature(cursor, source));
        this.collectTypeReferences(cursor, source, typeReferences);
        this.extractConstructorInjectionPoints(cursor, source, injectionPoints);
      } else if (cursor.name === 'MethodDeclaration' || cursor.name === 'AnnotationTypeElementDeclaration') {
        const signature = this.extractExecutableSignature(cursor, source);
        methods.push(signature);
        this.collectTypeReferences(cursor, source, typeReferences);
        this.extractMethodAnnotationSignals(
          cursor, source, signature, classAnnotations,
          endpointMappings, transactionalMethods, injectionPoints
        );
      } else if (cursor.name === 'EnumConstant') {
        fields.push(this.compactWhitespace(source.slice(cursor.from, cursor.to)));
      } else if (
        cursor.name === 'ClassDeclaration' ||
        cursor.name === 'InterfaceDeclaration' ||
        cursor.name === 'EnumDeclaration'
      ) {
        const innerName = this.extractInnerClassName(cursor, source);
        if (innerName) {
          innerClasses.push(innerName);
        }
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

  private collectAnnotations(
    cursor: TreeCursor,
    source: string,
    annotations: Set<string>,
    annotationDetails?: AnnotationDetail[]
  ): void {
    if (!cursor.firstChild()) {
      return;
    }

    do {
      if (cursor.name === 'MarkerAnnotation' || cursor.name === 'Annotation') {
        const detail = this.extractAnnotationDetail(cursor, source);
        if (detail) {
          annotations.add(detail.name);
          annotationDetails?.push(detail);
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

    // Walk into TypeArguments to capture generic type parameters (e.g. List<UserService> adds UserService)
    if (cursor.name === 'TypeArguments') {
      if (cursor.firstChild()) {
        do {
          this.collectTypeReferences(cursor, source, typeReferences);
        } while (cursor.nextSibling());
        cursor.parent();
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

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Identifier' || cursor.name === 'ScopedIdentifier') {
          importPath = source.slice(cursor.from, cursor.to).trim();
        } else if (cursor.name === 'Asterisk') {
          wildcard = true;
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    if (!importPath) {
      return null;
    }

    return wildcard ? `${importPath}.*` : importPath;
  }

  private extractAnnotationDetail(cursor: TreeCursor, source: string): AnnotationDetail | null {
    let annotationName = '';
    let paramsText = '';

    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Identifier' || cursor.name === 'ScopedIdentifier') {
          annotationName = source.slice(cursor.from, cursor.to).trim();
        } else if (cursor.name === 'AnnotationArgumentList' || cursor.name === 'ElementValuePairList') {
          paramsText = source.slice(cursor.from, cursor.to).trim();
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    if (!annotationName) {
      return null;
    }

    const shortName = annotationName.split('.').pop() || annotationName;
    const name = `@${shortName}`;
    const params = this.parseAnnotationParams(paramsText);
    return { name, params };
  }

  private parseAnnotationParams(raw: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (!raw) return params;

    // Strip outer parentheses
    let inner = raw;
    if (inner.startsWith('(') && inner.endsWith(')')) {
      inner = inner.slice(1, -1).trim();
    }
    if (!inner) return params;

    // Single unnamed value: @RequestMapping("/api")
    if (!inner.includes('=')) {
      params['value'] = this.stripQuotes(inner);
      return params;
    }

    // Named pairs: propagation = REQUIRES_NEW, readOnly = true
    const pairRegex = /(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|[^,)]+)/g;
    let match;
    while ((match = pairRegex.exec(inner)) !== null) {
      params[match[1]] = this.stripQuotes(match[2].trim());
    }

    return params;
  }

  private stripQuotes(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }

  // ---------- Superclass / Interface extraction ----------

  private extractSuperType(
    cursor: TreeCursor,
    source: string,
    typeReferences: Set<string>
  ): GenericTypeRef | null {
    this.collectTypeReferences(cursor, source, typeReferences);
    const typeText = this.extractFirstTypeName(cursor, source);
    if (!typeText) return null;
    return this.parseGenericTypeRef(typeText, source, cursor);
  }

  private extractInterfaces(
    cursor: TreeCursor,
    source: string,
    interfaces: string[],
    typeReferences: Set<string>,
    genericSuperTypes: GenericTypeRef[]
  ): void {
    this.collectTypeReferences(cursor, source, typeReferences);
    // Parse the raw text to get comma-separated interface names with generics
    const raw = source.slice(cursor.from, cursor.to).trim();
    // Remove leading keywords like "implements" or "extends"
    const afterKeyword = raw.replace(/^(?:implements|extends)\s+/i, '');
    // Split on commas that aren't inside angle brackets
    const parts = this.splitOutsideAngleBrackets(afterKeyword);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const ref = this.parseGenericTypeRefFromText(trimmed);
      interfaces.push(ref.rawType);
      if (ref.typeArgs.length > 0) {
        genericSuperTypes.push(ref);
      }
    }
  }

  private extractFirstTypeName(cursor: TreeCursor, source: string): string | null {
    // Get the raw text after the keyword (e.g. "extends Foo<Bar>")
    const raw = source.slice(cursor.from, cursor.to).trim();
    const afterKeyword = raw.replace(/^(?:extends|implements)\s+/i, '');
    return afterKeyword || null;
  }

  private parseGenericTypeRef(_typeText: string, _source: string, _cursor: TreeCursor): GenericTypeRef {
    // Parse from the full text to handle complex generics from source
    const raw = _source.slice(_cursor.from, _cursor.to).trim();
    const afterKeyword = raw.replace(/^(?:extends|implements)\s+/i, '');
    return this.parseGenericTypeRefFromText(afterKeyword);
  }

  private parseGenericTypeRefFromText(text: string): GenericTypeRef {
    const angleBracketStart = text.indexOf('<');
    if (angleBracketStart === -1) {
      return { rawType: text.trim(), typeArgs: [] };
    }

    const rawType = text.slice(0, angleBracketStart).trim();
    const angleBracketEnd = text.lastIndexOf('>');
    if (angleBracketEnd <= angleBracketStart) {
      return { rawType, typeArgs: [] };
    }

    const inner = text.slice(angleBracketStart + 1, angleBracketEnd);
    const typeArgs = this.splitOutsideAngleBrackets(inner).map(
      (arg) => arg.trim().replace(/<.*>$/, '') // Strip nested generics to get the raw type name
    ).filter(Boolean);

    return { rawType, typeArgs };
  }

  private splitOutsideAngleBrackets(text: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '<') depth++;
      else if (ch === '>') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(text.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(text.slice(start));
    return parts;
  }

  // ---------- Injection point detection ----------

  private detectFieldInjection(
    cursor: TreeCursor,
    source: string,
    injectionPoints: InjectionPoint[]
  ): void {
    const fieldAnnotations: AnnotationDetail[] = [];
    const fieldModAnnotations = new Set<string>();

    // Walk to find Modifiers containing injection annotations
    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Modifiers') {
          this.collectAnnotations(cursor, source, fieldModAnnotations, fieldAnnotations);
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    const isInjected = fieldAnnotations.some((a) => this.INJECTION_ANNOTATIONS.has(a.name));
    if (!isInjected) return;

    const fieldText = source.slice(cursor.from, cursor.to);
    const typeAndName = this.extractFieldTypeAndName(fieldText);
    if (!typeAndName) return;

    const qualifier = fieldAnnotations.find((a) => a.name === '@Qualifier');
    injectionPoints.push({
      fieldOrParam: typeAndName.name,
      type: typeAndName.type,
      mechanism: 'field',
      qualifierValue: qualifier?.params['value'],
    });
  }

  private extractFieldTypeAndName(fieldText: string): { type: string; name: string } | null {
    // Remove annotations and modifiers, find "Type name" or "Type name = ..."
    const cleaned = fieldText
      .replaceAll(/@\w+(?:\([^)]*\))?/g, '')
      .replaceAll(/\b(?:private|protected|public|static|final|volatile|transient)\b/g, '')
      .trim();

    // Match "SomeType<...> fieldName" or "SomeType fieldName"
    const match = /^([\w.<>,\s?[\]]+?)\s+(\w+)\s*[;=]/.exec(cleaned);
    if (!match) return null;
    return { type: match[1].trim(), name: match[2] };
  }

  private extractConstructorInjectionPoints(
    cursor: TreeCursor,
    source: string,
    injectionPoints: InjectionPoint[]
  ): void {
    // Walk constructor children to find FormalParameters
    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'FormalParameters') {
          this.extractParamsAsInjection(cursor, source, injectionPoints, 'constructor');
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }
  }

  private extractParamsAsInjection(
    cursor: TreeCursor,
    source: string,
    injectionPoints: InjectionPoint[],
    mechanism: 'constructor' | 'setter'
  ): void {
    if (!cursor.firstChild()) return;

    do {
      if (cursor.name === 'FormalParameter' || cursor.name === 'SpreadParameter') {
        const paramText = source.slice(cursor.from, cursor.to).trim();
        const parsed = this.parseParamTypeAndName(paramText);
        if (parsed) {
          injectionPoints.push({ fieldOrParam: parsed.name, type: parsed.type, mechanism });
        }
      }
    } while (cursor.nextSibling());
    cursor.parent();
  }

  private parseParamTypeAndName(paramText: string): { type: string; name: string } | null {
    // Strip annotations
    const cleaned = paramText.replaceAll(/@\w+(?:\([^)]*\))?/g, '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length < 2) return null;
    return { type: parts.slice(0, -1).join(' '), name: parts[parts.length - 1] };
  }

  // ---------- Method-level annotation signals ----------

  private extractMethodAnnotationSignals(
    cursor: TreeCursor,
    source: string,
    signature: string,
    _classAnnotations: Set<string>,
    endpointMappings: EndpointMapping[],
    transactionalMethods: TransactionalMethodInfo[],
    injectionPoints: InjectionPoint[]
  ): void {
    const methodAnnotations: AnnotationDetail[] = [];
    const methodAnns = new Set<string>();

    // Walk to find Modifiers
    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Modifiers') {
          this.collectAnnotations(cursor, source, methodAnns, methodAnnotations);
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }

    // Endpoint mappings
    for (const detail of methodAnnotations) {
      const httpMethod = this.MAPPING_TO_HTTP[detail.name];
      if (httpMethod) {
        endpointMappings.push({
          path: detail.params['value'] || detail.params['path'] || '/',
          httpMethod: httpMethod === 'REQUEST' ? (detail.params['method'] || 'GET') : httpMethod,
        });
      }
    }

    // @Transactional
    const txAnnotation = methodAnnotations.find((a) => a.name === '@Transactional');
    if (txAnnotation) {
      const methodName = this.extractMethodNameFromSignature(signature);
      transactionalMethods.push({
        methodName,
        propagation: txAnnotation.params['propagation'],
        readOnly: txAnnotation.params['readOnly'] === 'true',
        isolation: txAnnotation.params['isolation'],
      });
    }

    // Setter injection: setXxx method with @Autowired
    const isSetterInjection = methodAnnotations.some((a) => this.INJECTION_ANNOTATIONS.has(a.name))
      && /\bset[A-Z]/.test(signature);
    if (isSetterInjection) {
      // Extract first parameter as the injected type
      const paramMatch = /\(\s*([\w<>,.\s?[\]]+?)\s+(\w+)\s*\)/.exec(signature);
      if (paramMatch) {
        const qualifier = methodAnnotations.find((a) => a.name === '@Qualifier');
        injectionPoints.push({
          fieldOrParam: paramMatch[2],
          type: paramMatch[1].trim(),
          mechanism: 'setter',
          qualifierValue: qualifier?.params['value'],
        });
      }
    }
  }

  private extractMethodNameFromSignature(signature: string): string {
    // "public void doSomething(Foo f)" → "doSomething"
    const match = /(\w+)\s*\(/.exec(signature);
    return match ? match[1] : signature;
  }

  // ---------- Inner class extraction ----------

  private extractInnerClassName(cursor: TreeCursor, source: string): string | null {
    if (cursor.firstChild()) {
      do {
        if (cursor.name === 'Definition') {
          const name = source.slice(cursor.from, cursor.to).trim();
          cursor.parent();
          return name;
        }
      } while (cursor.nextSibling());
      cursor.parent();
    }
    return null;
  }

  // ---------- Layer detection ----------

  private detectLayer(
    annotations: string[],
    className: string,
    packageName: string,
    interfaces?: string[],
    endpointMappings?: EndpointMapping[]
  ): JavaClass['layer'] {
    for (const [layer, marks] of Object.entries(this.LAYER_ANNOTATIONS)) {
      if (annotations.some((annotation) => marks.includes(annotation))) {
        return layer as JavaClass['layer'];
      }
    }

    // Detect Spring Data repositories by interface hierarchy
    if (interfaces?.some((iface) => this.SPRING_DATA_REPOS.has(iface))) {
      return 'repository';
    }

    // Detect controllers by endpoint mappings presence
    if (endpointMappings && endpointMappings.length > 0) {
      return 'controller';
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
