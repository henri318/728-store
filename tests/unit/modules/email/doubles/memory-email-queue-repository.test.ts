import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryEmailQueueRepository } from '@/tests/doubles/memory-email-queue-repository';

describe('MemoryEmailQueueRepository', () => {
  let repo: MemoryEmailQueueRepository;

  beforeEach(() => {
    repo = new MemoryEmailQueueRepository();
  });

  it('stores only one row for the same idempotency key', async () => {
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
    expect(repo.all()).toHaveLength(1);
  });

  it('allows different idempotency keys to create separate rows', async () => {
    await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>Done</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'order-placed:buyer@test.com:order-1',
    });

    await repo.create({
      to: 'buyer@test.com',
      subject: 'Order placed',
      htmlBody: '<p>Done</p>',
      template: 'order-placed',
      metadata: { orderId: 'order-2' },
      idempotencyKey: 'order-placed:buyer@test.com:order-2',
    });

    expect(repo.all()).toHaveLength(2);
  });
});
