const localDirectoryHandles = new Map<string, FileSystemDirectoryHandle>();

export function registerLocalDirectory(handle: FileSystemDirectoryHandle): string {
  const sourceId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localDirectoryHandles.set(sourceId, handle);
  return sourceId;
}

export function getLocalDirectory(sourceId: string): FileSystemDirectoryHandle | null {
  return localDirectoryHandles.get(sourceId) || null;
}

export function clearLocalDirectory(sourceId: string): void {
  localDirectoryHandles.delete(sourceId);
}

export function clearAllLocalDirectories(): void {
  localDirectoryHandles.clear();
}