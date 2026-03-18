import { JavaClass, GraphNode } from '../../types';

export class DependencyGraphBuilder {
  build(
    javaClasses: JavaClass[], 
    coChangeMatrix: Map<string, Map<string, number>>
  ): GraphNode[] {
    const nodes = new Map<string, GraphNode>();
    const classesByPackage = new Map<string, Map<string, string>>();
    const classesBySimpleName = new Map<string, string[]>();
    const outboundDepsByNode = new Map<string, Set<string>>();
    const inboundDepsByNode = new Map<string, Set<string>>();
    const coChangeFallbackIndex = this.buildCoChangeFallbackIndex(coChangeMatrix);

    this.indexClasses(javaClasses, classesByPackage, classesBySimpleName);
    this.initializeNodes(javaClasses, nodes, outboundDepsByNode, inboundDepsByNode);
    this.attachAstDependencies(
      javaClasses,
      nodes,
      classesByPackage,
      classesBySimpleName,
      outboundDepsByNode,
      inboundDepsByNode
    );
    this.finalizeDependencySets(nodes, outboundDepsByNode, inboundDepsByNode);
    this.attachCoChangeData(nodes, coChangeMatrix, coChangeFallbackIndex);

    return Array.from(nodes.values());
  }

  private indexClasses(
    javaClasses: JavaClass[],
    classesByPackage: Map<string, Map<string, string>>,
    classesBySimpleName: Map<string, string[]>
  ): void {
    for (const javaClass of javaClasses) {
      const simpleName = javaClass.fullyQualifiedName.split('.').pop() || javaClass.fullyQualifiedName;
      const packageClasses = classesByPackage.get(javaClass.packageName) || new Map<string, string>();
      packageClasses.set(simpleName, javaClass.fullyQualifiedName);
      classesByPackage.set(javaClass.packageName, packageClasses);

      const simpleNameMatches = classesBySimpleName.get(simpleName) || [];
      simpleNameMatches.push(javaClass.fullyQualifiedName);
      classesBySimpleName.set(simpleName, simpleNameMatches);
    }
  }

  private initializeNodes(
    javaClasses: JavaClass[],
    nodes: Map<string, GraphNode>,
    outboundDepsByNode: Map<string, Set<string>>,
    inboundDepsByNode: Map<string, Set<string>>
  ): void {
    for (const javaClass of javaClasses) {
      nodes.set(javaClass.fullyQualifiedName, this.createNode(javaClass));
      outboundDepsByNode.set(javaClass.fullyQualifiedName, new Set<string>());
      inboundDepsByNode.set(javaClass.fullyQualifiedName, new Set<string>());
    }
  }

  private createNode(javaClass: JavaClass): GraphNode {
    const transactional = (javaClass.transactionalMethods?.length ?? 0) > 0 ||
      javaClass.annotations.some(a => a.includes('@Transactional'));

    return {
      id: javaClass.fullyQualifiedName,
      packageName: javaClass.packageName,
      layer: javaClass.layer || 'util',
      annotations: javaClass.annotations,
      transactionalBoundary: transactional,
      inboundDeps: [],
      outboundDeps: [],
      coChangedWith: [],
      repoSource: javaClass.repoSource
    };
  }

  private attachAstDependencies(
    javaClasses: JavaClass[],
    nodes: Map<string, GraphNode>,
    classesByPackage: Map<string, Map<string, string>>,
    classesBySimpleName: Map<string, string[]>,
    outboundDepsByNode: Map<string, Set<string>>,
    inboundDepsByNode: Map<string, Set<string>>
  ): void {
    for (const javaClass of javaClasses) {
      const explicitImports = new Map<string, string>();
      const wildcardImports: string[] = [];

      for (const importedType of javaClass.imports) {
        if (importedType.endsWith('.*')) {
          wildcardImports.push(importedType.slice(0, -2));
          continue;
        }

        explicitImports.set(importedType.split('.').pop() || importedType, importedType);
        this.addDependency(javaClass.fullyQualifiedName, importedType, nodes, outboundDepsByNode, inboundDepsByNode);
      }

      for (const reference of javaClass.typeReferences) {
        const matchedTarget = this.resolveTypeReference(
          javaClass,
          reference,
          nodes,
          explicitImports,
          wildcardImports,
          classesByPackage,
          classesBySimpleName
        );
        if (matchedTarget && matchedTarget !== javaClass.fullyQualifiedName) {
          this.addDependency(javaClass.fullyQualifiedName, matchedTarget, nodes, outboundDepsByNode, inboundDepsByNode);
        }
      }

      // Injection-point edges (constructor, field, setter)
      for (const ip of javaClass.injectionPoints ?? []) {
        const resolved = this.resolveTypeReference(
          javaClass, ip.type.replace(/<.*>$/, ''), nodes,
          explicitImports, wildcardImports, classesByPackage, classesBySimpleName
        );
        if (resolved && resolved !== javaClass.fullyQualifiedName) {
          this.addDependency(javaClass.fullyQualifiedName, resolved, nodes, outboundDepsByNode, inboundDepsByNode);
        }
      }

      // Superclass edge
      if (javaClass.superClass) {
        const resolved = this.resolveTypeReference(
          javaClass, javaClass.superClass.rawType, nodes,
          explicitImports, wildcardImports, classesByPackage, classesBySimpleName
        );
        if (resolved && resolved !== javaClass.fullyQualifiedName) {
          this.addDependency(javaClass.fullyQualifiedName, resolved, nodes, outboundDepsByNode, inboundDepsByNode);
        }
      }

      // Interface edges
      for (const iface of javaClass.interfaces ?? []) {
        const resolved = this.resolveTypeReference(
          javaClass, iface, nodes,
          explicitImports, wildcardImports, classesByPackage, classesBySimpleName
        );
        if (resolved && resolved !== javaClass.fullyQualifiedName) {
          this.addDependency(javaClass.fullyQualifiedName, resolved, nodes, outboundDepsByNode, inboundDepsByNode);
        }
      }

      // Generic supertype type-argument edges
      for (const gst of javaClass.genericSuperTypes ?? []) {
        for (const typeArg of gst.typeArgs) {
          const resolved = this.resolveTypeReference(
            javaClass, typeArg, nodes,
            explicitImports, wildcardImports, classesByPackage, classesBySimpleName
          );
          if (resolved && resolved !== javaClass.fullyQualifiedName) {
            this.addDependency(javaClass.fullyQualifiedName, resolved, nodes, outboundDepsByNode, inboundDepsByNode);
          }
        }
      }
    }
  }

  private addDependency(
    sourceId: string,
    targetId: string,
    nodes: Map<string, GraphNode>,
    outboundDepsByNode: Map<string, Set<string>>,
    inboundDepsByNode: Map<string, Set<string>>
  ): void {
    if (!nodes.has(targetId) || sourceId === targetId) {
      return;
    }

    outboundDepsByNode.get(sourceId)?.add(targetId);
    inboundDepsByNode.get(targetId)?.add(sourceId);
  }

  private finalizeDependencySets(
    nodes: Map<string, GraphNode>,
    outboundDepsByNode: Map<string, Set<string>>,
    inboundDepsByNode: Map<string, Set<string>>
  ): void {
    for (const node of nodes.values()) {
      node.outboundDeps = Array.from(outboundDepsByNode.get(node.id) || []);
      node.inboundDeps = Array.from(inboundDepsByNode.get(node.id) || []);
    }
  }

  private attachCoChangeData(
    nodes: Map<string, GraphNode>,
    coChangeMatrix: Map<string, Map<string, number>>,
    coChangeFallbackIndex: Map<string, string>
  ): void {
    for (const node of nodes.values()) {
      const targets = this.resolveCoChangeTargets(node.id, coChangeMatrix, coChangeFallbackIndex);
      const timestamp = new Date().toISOString();

      for (const [targetName, freq] of targets.entries()) {
        node.coChangedWith.push({
          targetClass: targetName,
          frequency: freq,
          lastChanged: timestamp
        });
      }

      node.coChangedWith.sort((a, b) => b.frequency - a.frequency);
    }
  }

  private resolveCoChangeTargets(
    nodeId: string,
    coChangeMatrix: Map<string, Map<string, number>>,
    coChangeFallbackIndex: Map<string, string>
  ): Map<string, number> {
    const directTargets = coChangeMatrix.get(nodeId);
    if (directTargets && directTargets.size > 0) {
      return directTargets;
    }

    const simpleName = nodeId.split('.').pop() || nodeId;
    const fallbackKey = coChangeFallbackIndex.get(simpleName);
    return fallbackKey ? (coChangeMatrix.get(fallbackKey) || new Map<string, number>()) : new Map<string, number>();
  }

  private buildCoChangeFallbackIndex(coChangeMatrix: Map<string, Map<string, number>>): Map<string, string> {
    const coChangeFallbackIndex = new Map<string, string>();

    for (const key of coChangeMatrix.keys()) {
      const simpleName = key.split('.').pop() || key;
      if (!coChangeFallbackIndex.has(simpleName)) {
        coChangeFallbackIndex.set(simpleName, key);
      }
    }

    return coChangeFallbackIndex;
  }

  private resolveTypeReference(
    javaClass: JavaClass,
    reference: string,
    nodes: Map<string, GraphNode>,
    explicitImports: Map<string, string>,
    wildcardImports: string[],
    classesByPackage: Map<string, Map<string, string>>,
    classesBySimpleName: Map<string, string[]>
  ): string | null {
    const normalizedReference = reference.trim();
    if (!normalizedReference) {
      return null;
    }

    if (nodes.has(normalizedReference)) {
      return normalizedReference;
    }

    const directImport = explicitImports.get(normalizedReference);
    if (directImport && nodes.has(directImport)) {
      return directImport;
    }

    const samePackageMatch = classesByPackage.get(javaClass.packageName)?.get(normalizedReference);
    if (samePackageMatch && nodes.has(samePackageMatch)) {
      return samePackageMatch;
    }

    for (const wildcardPackage of wildcardImports) {
      const wildcardMatch = classesByPackage.get(wildcardPackage)?.get(normalizedReference);
      if (wildcardMatch && nodes.has(wildcardMatch)) {
        return wildcardMatch;
      }
    }

    const simpleNameMatches = classesBySimpleName.get(normalizedReference);
    if (simpleNameMatches?.length === 1) {
      const [onlyMatch] = simpleNameMatches;
      if (nodes.has(onlyMatch)) {
        return onlyMatch;
      }
    }

    return null;
  }
}
