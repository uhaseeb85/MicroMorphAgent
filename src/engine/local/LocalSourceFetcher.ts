import type { RepoInput } from '../../types';
import type { JavaFile } from '../github/RepoFetcher';
import { getLocalDirectory } from './LocalSourceSession';

interface LocalFileEntry {
  path: string;
  handle: FileSystemFileHandle;
}

type FileSystemHandleEntry = FileSystemFileHandle | FileSystemDirectoryHandle;

interface IterableDirectoryHandle extends FileSystemDirectoryHandle {
  entries(): AsyncIterable<[string, FileSystemHandleEntry]>;
}

export class LocalSourceFetcher {
  async fetchJavaFiles(repoInput: RepoInput, includeTestFiles: boolean): Promise<JavaFile[]> {
    const rootHandle = this.getRootHandle(repoInput);
    const fileEntries = await this.collectFiles(rootHandle);

    const javaFiles = fileEntries.filter((entry) => {
      if (!entry.path.endsWith('.java')) {
        return false;
      }

      return includeTestFiles || !/(^|\/)src\/test\//.test(entry.path);
    });

    return Promise.all(
      javaFiles.map(async (entry) => {
        const file = await entry.handle.getFile();
        const content = await file.text();
        return {
          path: entry.path,
          content,
          repo: repoInput.displayName || repoInput.url
        };
      })
    );
  }

  async fetchFileContent(repoInput: RepoInput, relativePath: string): Promise<string> {
    const rootHandle = this.getRootHandle(repoInput);
    const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\//, '');
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