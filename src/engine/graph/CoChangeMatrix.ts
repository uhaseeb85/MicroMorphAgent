import { CommitData } from '../github/GitHistoryFetcher';

export interface CoChangeFrequency {
  classA: string;
  classB: string;
  frequency: number;
}

export class CoChangeMatrix {
  build(commits: CommitData[]): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();

    for (const commit of commits) {
      // Create pairs of all files changed in this single commit
      const files = commit.changedFiles;
      
      for (let i = 0; i < files.length; i++) {
        for (let j = i + 1; j < files.length; j++) {
          const classA = this.pathToClassName(files[i]);
          const classB = this.pathToClassName(files[j]);
          
          if (!classA || !classB || classA === classB) continue;

          this.increment(matrix, classA, classB);
          this.increment(matrix, classB, classA); // bi-directional for fast lookup
        }
      }
    }

    return matrix;
  }

  getTopPairs(matrix: Map<string, Map<string, number>>, limit = 50): CoChangeFrequency[] {
    const pairs: CoChangeFrequency[] = [];
    const seen = new Set<string>();

    for (const [classA, targets] of matrix.entries()) {
      for (const [classB, frequency] of targets.entries()) {
        const id = [classA, classB].sort().join('-');
        if (!seen.has(id)) {
          seen.add(id);
          pairs.push({ classA, classB, frequency });
        }
      }
    }

    return pairs.sort((a, b) => b.frequency - a.frequency).slice(0, limit);
  }

  private increment(matrix: Map<string, Map<string, number>>, source: string, target: string) {
    if (!matrix.has(source)) {
      matrix.set(source, new Map());
    }
    const targets = matrix.get(source)!;
    targets.set(target, (targets.get(target) || 0) + 1);
  }

  private pathToClassName(path: string): string | null {
    // Converts src/main/java/com/example/MyClass.java -> com.example.MyClass
    const match = path.match(/src\/(main|test)\/java\/(.+)\.java$/);
    if (match) {
      return match[2].replace(/\//g, '.');
    }
    
    // Fallback if structure is non-standard
    if (path.endsWith('.java')) {
      return path.split('/').pop()?.replace('.java', '') || null;
    }
    return null;
  }
}
