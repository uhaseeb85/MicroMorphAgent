import { Octokit } from '@octokit/rest';
import { RepoInput } from '../../types';
import { RateLimiter } from '../../utils/rateLimiter';

// Browser-safe base64 decoder (replaces Node.js Buffer)
function decodeBase64(encoded: string): string {
  // GitHub API wraps base64 in newlines — strip them first
  const clean = encoded.replace(/\n/g, '');
  return decodeURIComponent(
    atob(clean).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );
}

export interface JavaFile {
  path: string;
  content: string;
  repo: string;
}

export class RepoFetcher {
  private octokit: Octokit;
  private rateLimiter: RateLimiter;

  constructor(token?: string) {
    this.octokit = new Octokit(token ? { auth: token } : {});
    this.rateLimiter = new RateLimiter(50, 100);
  }

  async fetchJavaFiles(repoInput: RepoInput, includeTestFiles: boolean): Promise<JavaFile[]> {
    const { owner, repo } = this.parseRepoUrl(repoInput.url);
    const branch = repoInput.branch || 'HEAD';

    // Get the tree
    console.log(`Fetching file tree for ${owner}/${repo}...`);
    const tree = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: '1'
    });

    if (!tree.data.tree) {
      throw new Error("Failed to fetch repository tree");
    }

    // Filter to .java files
    const javaFiles = tree.data.tree
      .filter((f): f is Required<typeof f> => f.type === 'blob' && !!f.path && f.path.endsWith('.java'))
      .filter(f => includeTestFiles || !f.path.includes('/test/'));

    console.log(`Found ${javaFiles.length} Java files in ${repoInput.url}.`);

    if (javaFiles.length === 0) {
      return [];
    }

    // Batch fetch content
    return this.rateLimiter.batchFetch(javaFiles, async (fileNode) => {
      const response = await this.octokit.git.getBlob({
        owner,
        repo,
        file_sha: fileNode.sha!
      });
      
      const content = decodeBase64(response.data.content);
      
      return {
        path: fileNode.path,
        content,
        repo: repoInput.url
      };
    });
  }

  async fetchFileContent(repoUrl: string, path: string, branch = 'HEAD'): Promise<string> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });
      
      if ('content' in response.data) {
        return decodeBase64(response.data.content);
      }
      throw new Error(`Path ${path} is not a file`);
    } catch (e: any) {
      if (e.status === 404) {
        return ''; // File doesn't exist
      }
      throw e;
    }
  }

  public parseRepoUrl(url: string): { owner: string; repo: string } {
    try {
      const cleanUrl = url.trim().replace(/\/$/, "");
      const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
      }
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    } catch (e) {
      throw new Error(`Failed to parse repository URL: ${url}`);
    }
  }
}
