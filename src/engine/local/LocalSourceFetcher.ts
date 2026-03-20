import type { RepoInput } from '../../types';
import type { JavaFile } from '../github/RepoFetcher';
import { getLocalDirectory } from './LocalSourceSession';
import { RateLimiter } from '../../utils/rateLimiter';

export interface LocalFileEntry {
  path: string;
  handle: FileSystemFileHandle;
}

export interface LocalFetchProgressCallback {
  onFileFetched?: (filePath: string, fetchedSoFar: number, totalCount: number) => void;
}

type FileSystemHandleEntry = FileSystemFileHandle | FileSystemDirectoryHandle;

interface IterableDirectoryHandle extends FileSystemDirectoryHandle {
  entries(): AsyncIterable<[string, FileSystemHandleEntry]>;
}

export class LocalSourceFetcher {
  private readonly readLimiter = new RateLimiter(8, 10);

  async fetchJavaFiles(repoInput: RepoInput, includeTestFiles: boolean): Promise<JavaFile[]> {
    const javaEntries = await this.listJavaFiles(repoInput, includeTestFiles);
    return this.fetchJavaFileBatch(javaEntries, repoInput);
  }

  async listJavaFiles(repoInput: RepoInput, includeTestFiles: boolean): Promise<LocalFileEntry[]> {
    const rootHandle = this.getRootHandle(repoInput);
    const fileEntries = await this.collectFiles(rootHandle);

    return fileEntries.filter((entry) => {
      if (!entry.path.endsWith('.java')) {
        return false;
      }

      return includeTestFiles || !/(^|\/)src\/test\//.test(entry.path);
    });
  }

  async fetchJavaFileBatch(
    entries: LocalFileEntry[],
    repoInput: RepoInput,
    progress?: LocalFetchProgressCallback
  ): Promise<JavaFile[]> {
    let fetched = 0;
    return this.readLimiter.batchFetch(
      entries,
      async (entry) => {
        const file = await entry.handle.getFile();
        const content = await file.text();

        return {
          path: entry.path,
          content,
          repo: repoInput.displayName || repoInput.url
        };
      },
      {
        onItemComplete: (entry) => {
          fetched += 1;
          progress?.onFileFetched?.(entry.path, fetched, entries.length);
        }
      }
    );
  }

  async fetchFileContent(repoInput: RepoInput, relativePath: string): Promise<string> {
    const rootHandle = this.getRootHandle(repoInput);
    const normalizedPath = relativePath.replaceAll('\\', '/').replace(/^\//, '');
    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments.length === 0) {
      return '';
    }

    const fileHandle = await this.resolveFileHandle(rootHandle, segments);
    if (!fileHandle) {
      return '';
    }

    const file = await fileHandle.getFile();
    return file.text();
  }

  private getRootHandle(repoInput: RepoInput): FileSystemDirectoryHandle {
    if (!repoInput.sourceId) {
      throw new Error('Local project source is missing its directory handle. Re-select the folder from Home.');
    }

    const handle = getLocalDirectory(repoInput.sourceId);
    if (!handle) {
      throw new Error('Local project access expired. Re-select the folder from Home.');
    }

    return handle;
  }

  private async collectFiles(
    handle: FileSystemDirectoryHandle,
    currentPath = ''
  ): Promise<LocalFileEntry[]> {
    const entries: LocalFileEntry[] = [];

    for await (const [, entry] of (handle as IterableDirectoryHandle).entries()) {
      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        entries.push({ path: nextPath, handle: entry });
        continue;
      }

      if (entry.kind === 'directory' && !this.shouldSkipDirectory(entry.name)) {
        entries.push(...await this.collectFiles(entry, nextPath));
      }
    }

    return entries;
  }

  private async resolveFileHandle(
    handle: FileSystemDirectoryHandle,
    segments: string[]
  ): Promise<FileSystemFileHandle | null> {
    const [head, ...tail] = segments;

    if (!head) {
      return null;
    }

    if (tail.length === 0) {
      try {
        return await handle.getFileHandle(head);
      } catch {
        return null;
      }
    }

    try {
      const directoryHandle = await handle.getDirectoryHandle(head);
      return this.resolveFileHandle(directoryHandle, tail);
    } catch {
      return null;
    }
  }

  private shouldSkipDirectory(name: string): boolean {
    return name === '.git' || name === 'node_modules' || name === 'target' || name === 'build' || name === 'dist';
  }
}