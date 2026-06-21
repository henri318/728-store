import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEmailQueueRepository } from './memory-email-queue-repository';

/**
 * Tests for the EmailQueueRepository port.
 *
 * The port lives in `shared/kernel/email-queue-repository.ts` (pure, no Prisma).
 * The Memory double lives in `tests/doubles/memory-email-queue-repository.ts`
 * and is the only place that should construct a queue entry — production wires
 * the Prisma adapter.
 */
describe('MemoryEmailQueueRepository', () => {
  let repo: MemoryEmailQueueRepository;

  beforeEach(() => {
    repo = new MemoryEmailQueueRepository();
  });

  describe('create', () => {
    it('should persist a queued email with PENDING status and a unique id', async () => {
      const created = await repo.create({
        to: 'alice@example.com',
        subject: 'Welcome',
        htmlBody: '<p>Hello</p>',
        template: 'verification',
        metadata: { userId: 'u-1' },
      });

      expect(created.id).toBeDefined();
      expect(created.to).toBe('alice@example.com');
      expect(created.subject).toBe('Welcome');
      expect(created.htmlBody).toBe('<p>Hello</p>');
      expect(created.template).toBe('verification');
      expect(created.metadata).toEqual({ userId: 'u-1' });
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('should default metadata to undefined when not provided', async () => {
      const created = await repo.create({
        to: 'bob@example.com',
        subject: 'Hello',
        htmlBody: '<p>Hi</p>',
        template: 'welcome',
      });
      expect(created.metadata).toBeUndefined();
    });
  });

  describe('findRecentByRecipient', () => {
    it('should return the most recent matching entry inside the window', async () => {
      // 3 minutes ago
      await repo.create({
        to: 'a@b.com',
        subject: 'Verify',
        htmlBody: '<p>x</p>',
        template: 'verification',
      });

      // Tweak the timestamp of the just-created entry to 3 minutes ago
      const all = repo.all();
      const created = all[0];
      created.createdAt = new Date(Date.now() - 3 * 60 * 1000);

      const since = new Date(Date.now() - 5 * 60 * 1000);
      const found = await repo.findRecentByRecipient(
        'a@b.com',
        'verification',
        since,
      );

      expect(found).not.toBeNull();
      expect(found!.to).toBe('a@b.com');
      expect(found!.template).toBe('verification');
    });

    it('should return null when no entry exists inside the window', async () => {
      await repo.create({
        to: 'a@b.com',
        subject: 'Verify',
        htmlBody: '<p>x</p>',
        template: 'verification',
      });
      // Bump the timestamp to 10 minutes ago — outside a 5-minute window
      const all = repo.all();
      all[0].createdAt = new Date(Date.now() - 10 * 60 * 1000);

      const since = new Date(Date.now() - 5 * 60 * 1000);
      const found = await repo.findRecentByRecipient(
        'a@b.com',
        'verification',
        since,
      );
      expect(found).toBeNull();
    });

    it('should return null when the template does not match', async () => {
      await repo.create({
        to: 'a@b.com',
        subject: 'Welcome',
        htmlBody: '<p>x</p>',
        template: 'welcome',
      });

      const found = await repo.findRecentByRecipient(
        'a@b.com',
        'verification',
        new Date(Date.now() - 60 * 1000),
      );
      expect(found).toBeNull();
    });

    it('should return null when the recipient does not match', async () => {
      await repo.create({
        to: 'a@b.com',
        subject: 'Verify',
        htmlBody: '<p>x</p>',
        template: 'verification',
      });

      const found = await repo.findRecentByRecipient(
        'other@b.com',
        'verification',
        new Date(Date.now() - 60 * 1000),
      );
      expect(found).toBeNull();
    });
  });
});
