import { JavaClass, GraphNode, CoChangeEntry } from '../../types';
import { CoChangeMatrix } from './CoChangeMatrix';

export class DependencyGraphBuilder {
  
  build(
    javaClasses: JavaClass[], 
    coChangeMatrix: Map<string, Map<string, number>>
  ): GraphNode[] {
    const nodes = new Map<string, GraphNode>();

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

    // 2. Resolve AST dependencies (Imports) -> Outbound/Inbound
    for (const jc of javaClasses) {
      const sourceNode = nodes.get(jc.fullyQualifiedName)!;
      
      for (const imp of jc.imports) {
        // Only track dependencies within our analyzed system, not external libraries
        // Check if the import matches any known fully qualified name, or if it's a wildcard import package
        let matchedTarget: string | null = null;
        
        if (nodes.has(imp)) {
          matchedTarget = imp;
        } else if (imp.endsWith('.*')) {
          // Wildcard import: resolving all classes in the package requires a symbol table
          // which isn't available in the browser. This import is intentionally dropped.
          // The package-level coupling is still captured via co-change data.
          console.debug(`[DependencyGraph] wildcard import dropped: ${imp} (from ${jc.fullyQualifiedName})`);
        }

        if (matchedTarget) {
           sourceNode.outboundDeps.push(matchedTarget);
           const targetNode = nodes.get(matchedTarget)!;
           targetNode.inboundDeps.push(sourceNode.id);
        }
      }
      
      // Attempt heuristic type matching from fields for classes in the SAME package (which don't need imports)
      // This is a browser approximation. A real parser resolves symbols.
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
}
