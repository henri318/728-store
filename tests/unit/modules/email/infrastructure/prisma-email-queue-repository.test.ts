import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  emailQueueStore,
  emailQueueClaimStore,
  prismaMock,
  claimSnapshotBarrier,
} = vi.hoisted(() => {
  const emailQueueStore: Array<{
    id: string;
    to: string;
    subject: string;
    htmlBody: string;
    template: string | null;
    metadata: unknown;
    idempotencyKey: string;
    createdAt: Date;
  }> = [];

  const emailQueueClaimStore: Array<{
    id: string;
    to: string;
    subject: string;
    htmlBody: string;
    template: string | null;
    metadata: unknown;
    idempotencyKey: string;
    createdAt: Date;
    status: string;
    retryCount: number;
    maxRetries: number;
    scheduledAt: Date;
    updatedAt: Date;
  }> = [];

  const claimSnapshotBarrier = { count: 0 };

  const prismaMock = {
    emailQueue: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: { idempotencyKey: string } & Record<string, unknown>;
        }) => {
          const hasConflict = emailQueueStore.some(
            (row) => row.idempotencyKey === data.idempotencyKey,
          );
          if (hasConflict) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed on the fields: (`idempotencyKey`)',
              {
                code: 'P2002',
                clientVersion: 'mock',
              },
            );
          }

          const row = {
            id: `email-${emailQueueStore.length + 1}`,
            to: data.to as string,
            subject: data.subject as string,
            htmlBody: data.htmlBody as string,
            template: (data.template as string | null | undefined) ?? null,
            metadata: data.metadata,
            idempotencyKey: data.idempotencyKey,
            createdAt: new Date('2026-07-08T10:00:00.000Z'),
          };
          emailQueueStore.push(row);
          return row;
        },
      ),
      findFirst: vi.fn(
        async ({ where }: { where: { idempotencyKey?: string } }) => {
          if (!where.idempotencyKey) return null;
          return (
            emailQueueStore.find(
              (row) => row.idempotencyKey === where.idempotencyKey,
            ) ?? null
          );
        },
      ),
      findMany: vi.fn(async () => {
        const snapshot = emailQueueClaimStore
          .filter(
            (row) => row.status === 'PENDING' && row.scheduledAt <= new Date(),
          )
          .toSorted(
            (a, b) =>
              a.scheduledAt.getTime() - b.scheduledAt.getTime() ||
              a.createdAt.getTime() - b.createdAt.getTime() ||
              a.id.localeCompare(b.id),
          )
          .map((row) => ({ ...row }));

        claimSnapshotBarrier.count += 1;
        if (claimSnapshotBarrier.count === 1) {
          await new Promise<void>((resolve) => {
            queueMicrotask(resolve);
          });
        }

        return snapshot;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: {
            id?: { in: string[] };
            status?: string;
            updatedAt?: { lte: Date };
          };
          data: { status?: string; updatedAt?: Date };
        }) => {
          const ids = where.id?.in ?? [];
          const cutoff = where.updatedAt?.lte;
          let count = 0;

          for (const row of emailQueueClaimStore) {
            const hasMatchingIds = ids.length > 0 ? ids.includes(row.id) : true;
            const hasMatchingStatus = where.status
              ? row.status === where.status
              : true;
            const hasMatchingUpdatedAt = cutoff
              ? row.updatedAt <= cutoff
              : true;

            if (hasMatchingIds && hasMatchingStatus && hasMatchingUpdatedAt) {
              if (data.status) {
                row.status = data.status;
              }
              row.updatedAt = data.updatedAt ?? new Date();
              count += 1;
            }
          }

          return { count };
        },
      ),
    },
    $queryRaw: vi.fn(async (query: { values?: unknown[] }) => {
      const batchSize = Number(query.values?.[1] ?? 0);
      const now =
        query.values?.[0] instanceof Date ? query.values[0] : new Date();

      const claimed: Array<{
        id: string;
        to: string;
        subject: string;
        htmlBody: string;
        template: string | null;
        metadata: unknown;
        idempotencyKey: string;
        createdAt: Date;
        status: string;
        retryCount: number;
        maxRetries: number;
        scheduledAt: Date;
      }> = [];

      const claimableRows = emailQueueClaimStore
        .filter(
          (candidate) =>
            candidate.status === 'PENDING' && candidate.scheduledAt <= now,
        )
        .toSorted(
          (a, b) =>
            a.scheduledAt.getTime() - b.scheduledAt.getTime() ||
            a.createdAt.getTime() - b.createdAt.getTime() ||
            a.id.localeCompare(b.id),
        );

      for (const row of claimableRows) {
        if (claimed.length >= batchSize) break;
        row.status = 'PROCESSING';
        row.updatedAt = now;
        claimed.push({ ...row });
      }

      return claimed;
    }),
  };

  return {
    emailQueueStore,
    emailQueueClaimStore,
    prismaMock,
    claimSnapshotBarrier,
  };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: prismaMock,
}));

import { PrismaEmailQueueRepository } from '@/modules/email/infrastructure/prisma-email-queue-repository';

describe('PrismaEmailQueueRepository', () => {
  let repo: PrismaEmailQueueRepository;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    emailQueueStore.length = 0;
    (prismaMock.emailQueue.findMany as ReturnType<typeof vi.fn>).mockClear();
    (prismaMock.emailQueue.updateMany as ReturnType<typeof vi.fn>).mockClear();
    (prismaMock.$queryRaw as ReturnType<typeof vi.fn>).mockClear();
    claimSnapshotBarrier.count = 0;
    emailQueueClaimStore.length = 0;
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    repo = new PrismaEmailQueueRepository();
  });

  it('persists the idempotency key when creating a queued email', async () => {
    await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>Done</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    expect(prismaMock.emailQueue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        to: 'buyer@test.com',
        subject: 'Order placed',
        htmlBody: '<p>Done</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-1' },
        idempotencyKey: 'order-placed:buyer@test.com:order-1',
      }),
    });
  });

  it('returns the existing row when the idempotency key conflicts', async () => {
    const first = await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>Done</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    const second = await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>Done</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    expect(second).toEqual(first);
    expect(emailQueueStore).toHaveLength(1);
    expect(prismaMock.emailQueue.findFirst).toHaveBeenCalledWith({
      where: { idempotencyKey: 'order-placed:buyer@test.com:order-1' },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[PrismaEmailQueueRepository] Recovered duplicate email queue entry',
      expect.objectContaining({
        idempotencyKey: 'order-placed:buyer@test.com:order-1',
        template: 'order-placed',
      }),
    );
    expect(warnSpy.mock.calls[0]?.[1]).not.toHaveProperty('to');
  });

  it('returns the first persisted row when a duplicate key is retried with different content', async () => {
    const first = await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>First</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1', version: 1 },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    const second = await repo.create({
      to: 'buyer+retry@test.com',
      subject: 'Order placed again',
      htmlBody: '<p>Second</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1', version: 2 },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    expect(second).toEqual(first);
    expect(second).not.toMatchObject({
      to: 'buyer+retry@test.com',
      subject: 'Order placed again',
      htmlBody: '<p>Second</p>',
    });
  });

  it('rethrows the original error when a duplicate insert cannot recover an existing row', async () => {
    await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>Done</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    prismaMock.emailQueue.findFirst.mockResolvedValueOnce(null);

    await expect(
      repo.create({
        to: 'buyer@test.com',
        subject: 'Order placed',
        htmlBody: '<p>Done</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-1' },
        idempotencyKey: 'order-placed:buyer@test.com:order-1',
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(warnSpy).toHaveBeenCalledWith(
      '[PrismaEmailQueueRepository] Duplicate email queue insert could not be recovered',
      expect.objectContaining({
        idempotencyKey: 'order-placed:buyer@test.com:order-1',
        template: 'order-placed',
      }),
    );
    expect(warnSpy.mock.calls[0]?.[1]).not.toHaveProperty('to');
  });

  it('rethrows non-P2002 errors without recovery', async () => {
    const originalError = new Error('database unavailable');
    prismaMock.emailQueue.create.mockRejectedValueOnce(originalError);

    await expect(
      repo.create({
        to: 'buyer@test.com',
        subject: 'Order placed',
        htmlBody: '<p>Done</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-1' },
        idempotencyKey: 'order-placed:buyer@test.com:order-1',
      }),
    ).rejects.toThrow(originalError);
  });

  it('claims only due rows up to the requested batch size and marks them processing atomically', async () => {
    emailQueueClaimStore.push(
      {
        id: 'email-1',
        to: 'buyer1@test.com',
        subject: 'First',
        htmlBody: '<p>One</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-1' },
        idempotencyKey: 'order-placed:buyer1@test.com:order-1',
        createdAt: new Date('2026-07-08T10:00:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:00:00.000Z'),
        updatedAt: new Date('2026-07-08T10:00:00.000Z'),
      },
      {
        id: 'email-2',
        to: 'buyer2@test.com',
        subject: 'Second',
        htmlBody: '<p>Two</p>',
        template: null,
        metadata: { orderId: 'order-2' },
        idempotencyKey: 'order-placed:buyer2@test.com:order-2',
        createdAt: new Date('2026-07-08T10:01:00.000Z'),
        status: 'PENDING',
        retryCount: 1,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:01:00.000Z'),
        updatedAt: new Date('2026-07-08T10:01:00.000Z'),
      },
      {
        id: 'email-3',
        to: 'buyer3@test.com',
        subject: 'Third',
        htmlBody: '<p>Three</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-3' },
        idempotencyKey: 'order-placed:buyer3@test.com:order-3',
        createdAt: new Date('2026-07-08T10:02:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:02:00.000Z'),
        updatedAt: new Date('2026-07-08T10:02:00.000Z'),
      },
      {
        id: 'email-4',
        to: 'buyer4@test.com',
        subject: 'Future',
        htmlBody: '<p>Later</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-4' },
        idempotencyKey: 'order-placed:buyer4@test.com:order-4',
        createdAt: new Date('2026-07-08T10:03:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:10:00.000Z'),
        updatedAt: new Date('2026-07-08T10:03:00.000Z'),
      },
    );

    const claimed = await repo.claimPending(
      new Date('2026-07-08T10:05:00.000Z'),
      2,
    );

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.emailQueue.findMany).not.toHaveBeenCalled();
    expect(prismaMock.emailQueue.updateMany).not.toHaveBeenCalled();
    expect(claimed).toHaveLength(2);
    expect(claimed.map((row) => row.id)).toEqual(['email-1', 'email-2']);
    expect(claimed).toMatchObject([
      { status: 'PROCESSING', template: 'order-placed' },
      { status: 'PROCESSING', template: '' },
    ]);
    expect(emailQueueClaimStore.map((row) => row.status)).toEqual([
      'PROCESSING',
      'PROCESSING',
      'PENDING',
      'PENDING',
    ]);
  });

  it('does not return the same email twice when two claimers drain concurrently', async () => {
    emailQueueClaimStore.push(
      {
        id: 'email-1',
        to: 'buyer1@test.com',
        subject: 'First',
        htmlBody: '<p>One</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-1' },
        idempotencyKey: 'order-placed:buyer1@test.com:order-1',
        createdAt: new Date('2026-07-08T10:00:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:00:00.000Z'),
        updatedAt: new Date('2026-07-08T10:00:00.000Z'),
      },
      {
        id: 'email-2',
        to: 'buyer2@test.com',
        subject: 'Second',
        htmlBody: '<p>Two</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-2' },
        idempotencyKey: 'order-placed:buyer2@test.com:order-2',
        createdAt: new Date('2026-07-08T10:01:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:01:00.000Z'),
        updatedAt: new Date('2026-07-08T10:01:00.000Z'),
      },
      {
        id: 'email-3',
        to: 'buyer3@test.com',
        subject: 'Third',
        htmlBody: '<p>Three</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-3' },
        idempotencyKey: 'order-placed:buyer3@test.com:order-3',
        createdAt: new Date('2026-07-08T10:02:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:02:00.000Z'),
        updatedAt: new Date('2026-07-08T10:02:00.000Z'),
      },
    );

    const [firstClaim, secondClaim] = await Promise.all([
      repo.claimPending(new Date('2026-07-08T10:05:00.000Z'), 2),
      repo.claimPending(new Date('2026-07-08T10:05:00.000Z'), 2),
    ]);

    const allClaimedIds = [...firstClaim, ...secondClaim].map((row) => row.id);

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    expect(new Set(allClaimedIds).size).toBe(allClaimedIds.length);
    expect(allClaimedIds).toEqual(['email-1', 'email-2', 'email-3']);
    expect(emailQueueClaimStore.map((row) => row.status)).toEqual([
      'PROCESSING',
      'PROCESSING',
      'PROCESSING',
    ]);
  });

  it('releases stale processing rows so a later drain can claim them again', async () => {
    emailQueueClaimStore.push(
      {
        id: 'email-1',
        to: 'buyer1@test.com',
        subject: 'First',
        htmlBody: '<p>One</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-1' },
        idempotencyKey: 'order-placed:buyer1@test.com:order-1',
        createdAt: new Date('2026-07-08T09:40:00.000Z'),
        status: 'PROCESSING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T09:40:00.000Z'),
        updatedAt: new Date('2026-07-08T09:40:00.000Z'),
      },
      {
        id: 'email-2',
        to: 'buyer2@test.com',
        subject: 'Second',
        htmlBody: '<p>Two</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-2' },
        idempotencyKey: 'order-placed:buyer2@test.com:order-2',
        createdAt: new Date('2026-07-08T10:01:00.000Z'),
        status: 'PROCESSING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:01:00.000Z'),
        updatedAt: new Date('2026-07-08T10:01:00.000Z'),
      },
      {
        id: 'email-3',
        to: 'buyer3@test.com',
        subject: 'Third',
        htmlBody: '<p>Three</p>',
        template: 'order-placed',
        metadata: { orderId: 'order-3' },
        idempotencyKey: 'order-placed:buyer3@test.com:order-3',
        createdAt: new Date('2026-07-08T10:02:00.000Z'),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date('2026-07-08T10:02:00.000Z'),
        updatedAt: new Date('2026-07-08T10:02:00.000Z'),
      },
    );

    const released = await repo.recoverStaleProcessing(
      new Date('2026-07-08T10:05:00.000Z'),
      15 * 60 * 1000,
    );

    expect(released).toBe(1);
    expect(emailQueueClaimStore.map((row) => row.status)).toEqual([
      'PENDING',
      'PROCESSING',
      'PENDING',
    ]);
  });
});
