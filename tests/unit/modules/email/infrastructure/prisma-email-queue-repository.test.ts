import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { emailQueueStore, prismaMock } = vi.hoisted(() => {
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
    },
  };

  return { emailQueueStore, prismaMock };
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
      }),
    );
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
      }),
    );
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
});
