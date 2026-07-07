import type { UploadEntity } from './entities/upload';

/**
 * UploadRepository — the persistence port for uploads.
 *
 * Use cases depend on this interface. The Prisma adapter
 * implements it in the infrastructure layer.
 */
export interface UploadRepository {
  save(entity: UploadEntity): Promise<void>;
  findById(id: string): Promise<UploadEntity | null>;
  remove(id: string): Promise<void>;
  findPendingOlderThan(hours: number): Promise<UploadEntity[]>;
}

export { type UploadEntity } from './entities/upload';
