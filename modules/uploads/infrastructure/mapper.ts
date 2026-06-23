import type { UploadEntity } from '../domain/entities/upload';
import { UploadType } from '../domain/value-objects/upload-type';
import { UploadStatus } from '../domain/value-objects/upload-status';

/**
 * Shape of a Prisma `Upload` row as returned from the database.
 *
 * Kept as a structural type (no Prisma import) so the mapper stays
 * decoupled from the Prisma client and can be unit-tested without
 * any database dependency.
 */
export interface PrismaUploadRow {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  type: string;
  status: string;
  createdAt: Date;
}

/** Shape of a Prisma `Upload` create input. */
export interface PrismaUploadInput {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  type: string;
  status: string;
  createdAt: Date;
}

/**
 * Convert a Prisma `Upload` row to a domain `UploadEntity`.
 *
 * Pure function — no I/O, no Prisma client access. Safe to call in
 * unit tests without a database connection.
 */
export function toDomainUpload(prismaUpload: PrismaUploadRow): UploadEntity {
  return {
    id: prismaUpload.id,
    fileName: prismaUpload.fileName,
    storageKey: prismaUpload.storageKey,
    mimeType: prismaUpload.mimeType,
    size: prismaUpload.size,
    uploadedBy: prismaUpload.uploadedBy,
    type: prismaUpload.type as UploadType,
    status: prismaUpload.status as UploadStatus,
    createdAt: prismaUpload.createdAt,
  };
}

/**
 * Convert a domain `UploadEntity` to a Prisma create input.
 *
 * Pure function — produces a plain object suitable for
 * `prisma.upload.create({ data: ... })`. Caller is responsible for
 * passing it to the Prisma client.
 */
export function toPersistenceUpload(entity: UploadEntity): PrismaUploadInput {
  return {
    id: entity.id,
    fileName: entity.fileName,
    storageKey: entity.storageKey,
    mimeType: entity.mimeType,
    size: entity.size,
    uploadedBy: entity.uploadedBy,
    type: entity.type,
    status: entity.status,
    createdAt: entity.createdAt,
  };
}
