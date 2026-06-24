import type { StoragePort } from '@/modules/uploads/domain/storage-port';

/**
 * In-memory StoragePort for tests.
 *
 * Tracks generated URLs and deleted keys for assertions.
 * No real R2 calls — pure test double.
 */
export class MemoryStorageAdapter implements StoragePort {
  public uploadedKeys: string[] = [];
  public deleted: string[] = [];
  public readUrls: Map<string, string> = new Map();
  public publicDomain = 'https://mock-r2.example.com';

  async generateUploadUrl(
    key: string,
    _contentType: string,
    _expiresIn?: number,
  ): Promise<string> {
    this.uploadedKeys.push(key);
    return `https://mock-r2.upload/${key}`;
  }

  async generateReadUrl(key: string, _expiresIn?: number): Promise<string> {
    const url = `https://mock-r2.read/${key}`;
    this.readUrls.set(key, url);
    return url;
  }

  getPublicUrl(key: string): string {
    return `${this.publicDomain}/${key}`;
  }

  async delete(key: string): Promise<void> {
    this.deleted.push(key);
  }
}
