import type { StoragePort } from '../domain/storage-port';

const LOCAL_UPLOAD_ROUTE_PREFIX = '/api/uploads/local';

export class LocalStorageAdapter implements StoragePort {
  async generateUploadUrl(
    key: string,
    _contentType: string,
    _expiresIn?: number,
  ): Promise<string> {
    return buildLocalRouteUrl(key);
  }

  async generateReadUrl(key: string, _expiresIn?: number): Promise<string> {
    return buildLocalRouteUrl(key);
  }

  getPublicUrl(key: string): string {
    return buildLocalRouteUrl(key);
  }

  async delete(_key: string): Promise<void> {
    return undefined;
  }
}

function buildLocalRouteUrl(key: string): string {
  return `${LOCAL_UPLOAD_ROUTE_PREFIX}/${encodeURIComponent(key)}`;
}
