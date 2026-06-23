import { prisma } from '@/shared/infrastructure/prisma';
import type { UploadRepository } from '../domain/upload-repository';
import type { UploadEntity } from '../domain/entities/upload';
import { UploadType } from '../domain/value-objects/upload-type';
import { UploadStatus } from '../domain/value-objects/upload-status';
import { toDomainUpload, toPersistenceUpload } from './mapper';

/**
 * Prisma adapter implementing the UploadRepository port.
 *
 * Handles CRUD operations and the orphan cleanup query against
 * the Upload table in PostgreSQL.
 */
const VALID_UPLOAD_TYPES = Object.values(UploadType);
const VALID_UPLOAD_STATUSES = Object.values(UploadStatus);

export class PrismaUploadRepository implements UploadRepository {
  async save(entity: UploadEntity): Promise<void> {
    // Validate enum values before persisting
    if (!VALID_UPLOAD_TYPES.includes(entity.type)) {
      throw new Error(`Invalid UploadType: ${entity.type}`);
    }
    if (!VALID_UPLOAD_STATUSES.includes(entity.status)) {
      throw new Error(`Invalid UploadStatus: ${entity.status}`);
    }

    const data = toPersistenceUpload(entity);
    await prisma.upload.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        fileName: data.fileName,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        size: data.size,
        uploadedBy: data.uploadedBy,
        type: data.type,
        status: data.status,
        createdAt: data.createdAt,
      },
      update: {
        fileName: data.fileName,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        size: data.size,
        uploadedBy: data.uploadedBy,
        type: data.type,
        status: data.status,
      },
    });
  }

  async findById(id: string): Promise<UploadEntity | null> {
    const row = await prisma.upload.findUnique({ where: { id } });
    if (!row) return null;
    return toDomainUpload(row);
  }

  async remove(id: string): Promise<void> {
    await prisma.upload.deleteMany({ where: { id } });
  }

  async findPendingOlderThan(hours: number): Promise<UploadEntity[]> {
    const cutoff = new Date(Date.now() - hours * 3600_000);
    const rows = await prisma.upload.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
    });
    return rows.map((row) => toDomainUpload(row));
  }
}
