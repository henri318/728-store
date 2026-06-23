import type {
  UploadEntity,
  UploadRepository,
} from '@/modules/uploads/domain/upload-repository';

/**
 * In-memory UploadRepository for tests.
 * Implements the UploadRepository port with a simple array store.
 * No tests needed per PR1 constraint — this is a test double, not business logic.
 */
export class MemoryUploadRepository implements UploadRepository {
  private store: UploadEntity[] = [];

  async save(entity: UploadEntity): Promise<void> {
    const index = this.store.findIndex((e) => e.id === entity.id);
    if (index !== -1) {
      this.store[index] = entity;
    } else {
      this.store.push(entity);
    }
  }

  async findById(id: string): Promise<UploadEntity | null> {
    return this.store.find((e) => e.id === id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.store = this.store.filter((e) => e.id !== id);
  }

  async findPendingOlderThan(hours: number): Promise<UploadEntity[]> {
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error(
        `findPendingOlderThan: hours must be a positive finite number, got ${hours}`,
      );
    }
    const cutoff = new Date(Date.now() - hours * 3600_000);
    return this.store.filter(
      (e) => e.status === 'PENDING' && e.createdAt < cutoff,
    );
  }

  /** Helper for seeding test data. */
  seed(entities: UploadEntity[]) {
    this.store = entities;
  }
}
