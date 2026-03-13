import { Octokit } from '@octokit/rest';
import { RepoInput } from '../../types';
import { RateLimiter } from '../../utils/rateLimiter';

export interface CommitData {
  sha: string;
  date: Date;
  changedFiles: string[];
}

export class GitHistoryFetcher {
  private octokit: Octokit;
  private rateLimiter: RateLimiter;

  constructor(token?: string) {
    this.octokit = new Octokit(token ? { auth: token } : {});
    this.rateLimiter = new RateLimiter(50, 100);
  }

  async fetchCommitHistory(repoInput: RepoInput, maxHistory: number, windowDays: number): Promise<CommitData[]> {
    const { owner, repo } = this.parseRepoUrl(repoInput.url);
    const branch = repoInput.branch || 'HEAD';
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    console.log(`Fetching commit history for ${owner}/${repo} (up to ${maxHistory} commits or ${windowDays} days)...`);

    // 1. Fetch commits list
    let allCommits: any[] = [];
    try {
      allCommits = await this.octokit.paginate(
        this.octokit.repos.listCommits,
        {
          owner,
          repo,
          sha: branch,
          since: cutoffDate.toISOString(),
          per_page: 100
        },
        (response, done) => {
          if (response.data.length + allCommits.length >= maxHistory) {
            done();
            return response.data.slice(0, maxHistory - allCommits.length);
          }
          return response.data;
        }
      );
    } catch (e) {
      console.warn(`Failed to fetch commits for ${repoInput.url}`, e);
      return [];
    }

    // Trim just in case pagination returned extra
    allCommits = allCommits.slice(0, maxHistory);
    
    if (allCommits.length === 0) {
      return [];
    }

    // 2. Fetch specific changed files per commit
    // Note: listCommits doesn't return full files array for each commit unless you get individual commit
    const commitsWithFiles = await this.rateLimiter.batchFetch(allCommits, async (commitInfo) => {
      const fullCommit = await this.octokit.repos.getCommit({
        owner,
        repo,
        ref: commitInfo.sha
      });

      const changedFiles = (fullCommit.data.files || [])
        .map(f => f.filename)
        .filter(f => f.endsWith('.java'));

      return {
        sha: fullCommit.data.sha,
        date: new Date(fullCommit.data.commit.author?.date || fullCommit.data.commit.committer?.date || Date.now()),
        changedFiles
      };
    });

    return commitsWithFiles.filter(c => c.changedFiles.length > 0);
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const cleanUrl = url.trim().replace(/\/$/, "");
    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL for commit history: ${url}`);
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
}
