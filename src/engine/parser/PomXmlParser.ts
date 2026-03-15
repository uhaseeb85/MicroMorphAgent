import { XMLParser } from 'fast-xml-parser';

export interface MavenDependency {
  groupId: string;
  artifactId: string;
  version?: string;
  scope?: string;
}

export interface BuildDescriptor {
  groupId: string;
  artifactId: string;
  modules: string[];
  dependencies: MavenDependency[];
  internalDeps: MavenDependency[];
  parentPom: any | null;
}

export class PomXmlParser {
  private parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
  });

  parse(content: string): BuildDescriptor {
    const xml = this.parser.parse(content);
    
    if (!xml || !xml.project) {
      throw new Error("Invalid pom.xml format: Missing <project> root");
    }

    const project = xml.project;
    
    // Resolve basic identifiers — wrap in String() to guard against parseTagValue:true
    // coercing numeric-looking values (e.g. <groupId>1234</groupId>) to numbers.
    const groupId = String(project.groupId || project.parent?.groupId || 'unknown.group');
    const artifactId = String(project.artifactId || 'unknown-artifact');
    
    // Multi-module parse
    let modules: string[] = [];
    if (project.modules && project.modules.module) {
      modules = Array.isArray(project.modules.module) 
        ? project.modules.module 
        : [project.modules.module];
    }

    // Dependencies
    const dependencies = this.extractDependencies(project);

    // Filter internal deps manually looking for matching group prefix
    const orgGroupPrefix = groupId.split('.').slice(0, 2).join('.');
    const internalDeps = dependencies.filter(d => 
      d.groupId.startsWith(orgGroupPrefix) && 
      d.groupId !== groupId // Exclude exact same if it's not a multi-module
    );

    return {
      groupId,
      artifactId,
      modules,
      dependencies,
      internalDeps,
      parentPom: project.parent || null
    };
  }

  private extractDependencies(project: any): MavenDependency[] {
    let deps: any[] = [];
    
    if (project.dependencies && project.dependencies.dependency) {
      deps = Array.isArray(project.dependencies.dependency) 
        ? project.dependencies.dependency 
        : [project.dependencies.dependency];
    }
    
    // Add dependencies from dependencyManagement if we want fully resolved, but 
    // basic dependencies array is usually enough to find internal multi-repo relations

    return deps.map(d => ({
      groupId: d.groupId || '',
      artifactId: d.artifactId || '',
      version: d.version || '',
      scope: d.scope || 'compile'
    }));
  }
}
