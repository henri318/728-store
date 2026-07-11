import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the prisma module BEFORE importing the service.
// The service uses prisma.$transaction to maintain atomicity; we mock
// the transaction to use a fake `tx` object that just records calls.
const txMock = {
  order: {
    update: vi.fn(),
  },
  outboxEvent: {
    create: vi.fn(),
  },
};

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: {
    $transaction: vi.fn(
      async (callback: (tx: typeof txMock) => Promise<void>) =>
        callback(txMock),
    ),
  },
}));

// Import after the mock is registered
import { TransactionalOrderService } from '@/modules/orders/infrastructure/transactional-order-service';
import { MemoryOutboxRepository } from '@/tests/doubles/memory-outbox-repository';
import { MemoryOrderRepository } from '@/tests/doubles/memory-order-repository';
import { OrderEntity } from '@/modules/orders/domain/order-repository';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * Tests for TransactionalOrderService.
 *
 * The service:
 *  - Pre-flight check via OrderRepository.findById (port)
 *  - Opens prisma.$transaction
 *  - Calls orderRepository.updateStatus(orderId, status, tx) — goes through the port
 *  - Calls outboxRepository.saveEvent with the tx client
 *  - Throws on missing order (checked via the OrderRepository port)
 */
describe('TransactionalOrderService', () => {
  let outboxRepo: MemoryOutboxRepository;
  let orderRepo: MemoryOrderRepository;
  let saveEventSpy: ReturnType<typeof vi.spyOn>;
  let updateStatusSpy: ReturnType<typeof vi.spyOn>;
  let service: TransactionalOrderService;

  beforeEach(() => {
    vi.clearAllMocks();

    outboxRepo = new MemoryOutboxRepository();
    orderRepo = new MemoryOrderRepository();
    saveEventSpy = vi.spyOn(outboxRepo, 'saveEvent');
    updateStatusSpy = vi.spyOn(orderRepo, 'updateStatus');

    service = new TransactionalOrderService(orderRepo, outboxRepo);
  });

  describe('updateStatusAndEmit — atomic happy path', () => {
    it('should update the order status and record the outbox event', async () => {
      // Seed the order in the in-memory repo
      const order: OrderEntity = {
        id: 'o1',
        userId: 'u1',
        sellerId: 's1',
        total: 100,
        status: 'new',
        lineItems: [],
      };
      await orderRepo.save(order);

      await service.updateStatusAndEmit(
        'o1',
        'in_progress',
        GlobalEvents.ORDER_PAID,
        {
          orderId: 'o1',
          userId: 'u1',
          amount: 100,
        },
      );

      // updateStatus was called through the repository port with tx
      expect(updateStatusSpy).toHaveBeenCalledWith(
        'o1',
        'in_progress',
        expect.anything(), // tx is passed as 3rd arg
      );

      // saveEvent was called with the tx client
      expect(saveEventSpy).toHaveBeenCalledWith(
        GlobalEvents.ORDER_PAID,
        {
          orderId: 'o1',
          userId: 'u1',
          amount: 100,
        },
        expect.anything(), // tx is passed as 3rd arg
      );

      // The order status was actually updated in the repository
      const updated = await orderRepo.findById('o1');
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('updateStatusAndEmit — missing order', () => {
    it('should throw when the order does not exist', async () => {
      await expect(
        service.updateStatusAndEmit(
          'ghost',
          'in_progress',
          GlobalEvents.ORDER_PAID,
          {
            orderId: 'ghost',
          },
        ),
      ).rejects.toThrow('Order not found');

      // No side effects
      expect(updateStatusSpy).not.toHaveBeenCalled();
      expect(saveEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateStatusAndEmit — atomicity guard', () => {
    it('should not record the event if the status update throws', async () => {
      // Seed the order
      await orderRepo.save({
        id: 'o1',
        userId: 'u1',
        sellerId: 's1',
        total: 100,
        status: 'new',
        lineItems: [],
      });

      // Make updateStatus throw to simulate a DB failure
      updateStatusSpy.mockRejectedValue(new Error('DB write failed'));

      await expect(
        service.updateStatusAndEmit(
          'o1',
          'in_progress',
          GlobalEvents.ORDER_PAID,
          {
            orderId: 'o1',
          },
        ),
      ).rejects.toThrow('DB write failed');

      // saveEvent must NOT have been called because the transaction aborted
      expect(saveEventSpy).not.toHaveBeenCalled();
    });
  });
});
