import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutboxService } from '@/shared/infrastructure/outbox-service';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { EventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * Tests for the refactored OutboxService.
 *
 * The service no longer imports Prisma directly — it receives the
 * OutboxRepository via constructor and uses the port's
 * findPending / markProcessed / markFailed methods.
 *
 * The event bus is also injected per test, so handlers from one
 * case never leak into another.
 */
describe('OutboxService — port-based implementation', () => {
  let outboxRepo: MemoryOutboxRepository;
  let bus: EventBus;
  let service: OutboxService;

  beforeEach(() => {
    outboxRepo = new MemoryOutboxRepository();
    bus = new EventBus();
    service = new OutboxService(outboxRepo, bus);
  });

  describe('processEvents — happy path', () => {
    it('should emit PENDING events via the event bus and mark them PROCESSED', async () => {
      const seen: string[] = [];
      bus.on(GlobalEvents.ORDER_PAID, (data: any) => {
        seen.push(`paid:${data?.orderId}`);
      });
      bus.on(GlobalEvents.ORDER_CREATED, (data: any) => {
        seen.push(`created:${data?.orderId}`);
      });

      outboxRepo.seedEvent({
        id: 'e1',
        eventType: GlobalEvents.ORDER_PAID,
        payload: { orderId: 'o1' },
        createdAt: new Date(),
      });
      outboxRepo.seedEvent({
        id: 'e2',
        eventType: GlobalEvents.ORDER_CREATED,
        payload: { orderId: 'o2' },
        createdAt: new Date(Date.now() + 1),
      });

      // Act
      await service.processEvents();

      // Assert — both events marked PROCESSED with processedAt
      const events = outboxRepo.allEvents();
      const e1 = events.find((e) => e.id === 'e1')!;
      const e2 = events.find((e) => e.id === 'e2')!;
      expect(e1.status).toBe('PROCESSED');
      expect(e1.processedAt).toBeInstanceOf(Date);
      expect(e2.status).toBe('PROCESSED');
      expect(e2.processedAt).toBeInstanceOf(Date);
      // Both handlers were called
      expect(seen).toEqual(expect.arrayContaining(['paid:o1', 'created:o2']));
    });
  });

  describe('processEvents — handler failure', () => {
    it('should mark the event FAILED when the handler throws, and still process others', async () => {
      bus.on(GlobalEvents.ORDER_PAID, () => {
        throw new Error('handler boom');
      });
      bus.on(GlobalEvents.ORDER_CREATED, () => {
        /* success */
      });

      outboxRepo.seedEvent({
        id: 'fail-1',
        eventType: GlobalEvents.ORDER_PAID,
        payload: { orderId: 'o1' },
        createdAt: new Date(),
      });
      outboxRepo.seedEvent({
        id: 'ok-1',
        eventType: GlobalEvents.ORDER_CREATED,
        payload: { orderId: 'o2' },
        createdAt: new Date(Date.now() + 1),
      });

      // Act — silence expected console.error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await service.processEvents();
      errorSpy.mockRestore();

      // Assert
      const events = outboxRepo.allEvents();
      const fail1 = events.find((e) => e.id === 'fail-1')!;
      const ok1 = events.find((e) => e.id === 'ok-1')!;
      expect(fail1.status).toBe('FAILED');
      expect(ok1.status).toBe('PROCESSED');
    });
  });

  describe('processEvents — pending order', () => {
    it('should process events in createdAt ASC order', async () => {
      // Track the order in which the outbox repository is asked to mark events
      // — this is independent of the event bus (which is a global singleton
      // that may have handlers from other tests).
      const processedOrder: string[] = [];
      const markProcessedSpy = vi.spyOn(outboxRepo, 'markProcessed');
      markProcessedSpy.mockImplementation(async (id: string) => {
        processedOrder.push(id);
        // Re-implement the real behavior
        const events = outboxRepo.allEvents();
        const e = events.find((x) => x.id === id);
        if (e) {
          e.status = 'PROCESSED';
          e.processedAt = new Date();
        }
      });

      const t0 = Date.now();
      outboxRepo.seedEvent({
        id: 'third',
        eventType: 'unique.test.event.A',
        payload: { orderId: 'third' },
        createdAt: new Date(t0 + 30),
      });
      outboxRepo.seedEvent({
        id: 'first',
        eventType: 'unique.test.event.B',
        payload: { orderId: 'first' },
        createdAt: new Date(t0 + 10),
      });
      outboxRepo.seedEvent({
        id: 'second',
        eventType: 'unique.test.event.C',
        payload: { orderId: 'second' },
        createdAt: new Date(t0 + 20),
      });

      // Silence expected handler errors
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await service.processEvents();
      errorSpy.mockRestore();

      // The order of markProcessed calls should be ASC: first, second, third
      expect(processedOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('processEvents — empty queue', () => {
    it('should be a no-op when no events are pending', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.processEvents()).resolves.toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('isolation between tests', () => {
    it('should not share event bus handlers with other tests (uses injected bus)', async () => {
      const seen: string[] = [];
      bus.on(GlobalEvents.ORDER_PAID, (data: any) => {
        seen.push(`paid:${data?.orderId}`);
      });

      outboxRepo.seedEvent({
        id: 'iso-1',
        eventType: GlobalEvents.ORDER_PAID,
        payload: { orderId: 'iso-1' },
        createdAt: new Date(),
      });

      await service.processEvents();
      expect(seen).toEqual(['paid:iso-1']);
    });
  });
});
