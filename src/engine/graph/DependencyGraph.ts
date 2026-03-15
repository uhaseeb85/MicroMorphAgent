import { JavaClass, GraphNode } from '../../types';

export class DependencyGraphBuilder {
  
  build(
    javaClasses: JavaClass[], 
    coChangeMatrix: Map<string, Map<string, number>>
  ): GraphNode[] {
    const nodes = new Map<string, GraphNode>();
    const classesByPackage = new Map<string, Map<string, string>>();

    for (const javaClass of javaClasses) {
      const simpleName = javaClass.fullyQualifiedName.split('.').pop() || javaClass.fullyQualifiedName;
      const packageClasses = classesByPackage.get(javaClass.packageName) || new Map<string, string>();
      packageClasses.set(simpleName, javaClass.fullyQualifiedName);
      classesByPackage.set(javaClass.packageName, packageClasses);
    }

    // 1. Initialize nodes
    for (const jc of javaClasses) {
      const transactional = jc.methods.some(m => m.includes('@Transactional')) || 
                            jc.annotations.some(a => a.includes('@Transactional'));

      nodes.set(jc.fullyQualifiedName, {
        id: jc.fullyQualifiedName,
        packageName: jc.packageName,
        layer: jc.layer || 'util',
        annotations: jc.annotations,
        transactionalBoundary: transactional,
        inboundDeps: [],
        outboundDeps: [],
        coChangedWith: [],
        repoSource: jc.repoSource
      });
    }

    // 2. Resolve AST dependencies (imports + parsed type references) -> Outbound/Inbound
    for (const jc of javaClasses) {
      const sourceNode = nodes.get(jc.fullyQualifiedName)!;
      const explicitImports = new Map<string, string>();
      const wildcardImports: string[] = [];

      for (const imp of jc.imports) {
        if (imp.endsWith('.*')) {
          wildcardImports.push(imp.slice(0, -2));
          continue;
        }

        explicitImports.set(imp.split('.').pop() || imp, imp);

        if (nodes.has(imp)) {
          sourceNode.outboundDeps.push(imp);
          const targetNode = nodes.get(imp)!;
          targetNode.inboundDeps.push(sourceNode.id);
        }
      }
      
      for (const reference of jc.typeReferences) {
        const matchedTarget = this.resolveTypeReference(jc, reference, nodes, explicitImports, wildcardImports, classesByPackage);
        if (matchedTarget && matchedTarget !== jc.fullyQualifiedName) {
          sourceNode.outboundDeps.push(matchedTarget);
          const targetNode = nodes.get(matchedTarget)!;
          targetNode.inboundDeps.push(sourceNode.id);
        }
      }
    }

    // 3. Attach Co-Change Data
    for (const node of nodes.values()) {
      const targets = coChangeMatrix.get(node.id) || new Map();
      
      // Fallback matching by simple class name if FQN didn't map perfectly in git history
      if (targets.size === 0) {
        const simpleName = node.id.split('.').pop()!;
        const allKeys = Array.from(coChangeMatrix.keys());
        const bestKey = allKeys.find(k => k.endsWith(simpleName));
        if (bestKey) {
            const fallbackTargets = coChangeMatrix.get(bestKey) || new Map();
            for (const [targetName, freq] of fallbackTargets.entries()) {
                node.coChangedWith.push({
                   targetClass: targetName,
                   frequency: freq,
                   lastChanged: new Date().toISOString()
                });
            }
        }
      } else {
        for (const [targetName, freq] of targets.entries()) {
          node.coChangedWith.push({
            targetClass: targetName,
            frequency: freq,
            lastChanged: new Date().toISOString()
          });
        }
      }
      
      // Sort co-changes by frequency descending
      node.coChangedWith.sort((a, b) => b.frequency - a.frequency);
    }

    // Remove duplicates from arrays
    for (const node of nodes.values()) {
        node.outboundDeps = Array.from(new Set(node.outboundDeps));
        node.inboundDeps = Array.from(new Set(node.inboundDeps));
    }

    return Array.from(nodes.values());
  }

  private resolveTypeReference(
    javaClass: JavaClass,
    reference: string,
    nodes: Map<string, GraphNode>,
    explicitImports: Map<string, string>,
    wildcardImports: string[],
    classesByPackage: Map<string, Map<string, string>>
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

    return null;
  }
}
