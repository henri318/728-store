import type { StoragePort } from '@/modules/uploads/domain/storage-port';

/**
 * In-memory StoragePort for tests.
 * Implements the StoragePort port with simple mock URLs.
 * No tests needed per PR1 constraint — this is a test double, not business logic.
 */
export class MemoryStorageAdapter implements StoragePort {
  public deleted: string[] = [];

  async generateUploadUrl(key: string): Promise<string> {
    return `https://mock-r2/${key}`;
  }

  async generateReadUrl(key: string): Promise<string> {
    return `https://mock-r2/read/${key}`;
  }

  async delete(key: string): Promise<void> {
    this.deleted.push(key);
  }
}
