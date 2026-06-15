import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import type { EventBusPort } from '@/modules/events/domain/event-bus-port';

/**
 * Tests for the EventBusPort contract, exercised against the in-memory
 * `EventBus` class (the default adapter). The same contract must be
 * satisfied by any future adapter (Redis, NATS, etc.) — these tests
 * therefore focus on observable behavior, not implementation details.
 */
describe('EventBusPort — port contract (via EventBus)', () => {
  let bus: EventBusPort;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on + emit — happy path', () => {
    it('should invoke a registered handler when its event is emitted', async () => {
      const handler = vi.fn();
      bus.on('order.paid', handler);

      await bus.emit('order.paid', { orderId: 'o-1' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ orderId: 'o-1' });
    });

    it('should invoke multiple handlers for the same event in registration order', async () => {
      const order: string[] = [];
      bus.on('order.paid', () => void order.push('h1'));
      bus.on('order.paid', () => void order.push('h2'));
      bus.on('order.paid', () => void order.push('h3'));

      await bus.emit('order.paid', {});

      expect(order).toEqual(['h1', 'h2', 'h3']);
    });

    it('should NOT invoke handlers registered for a different event', async () => {
      const paid = vi.fn();
      const created = vi.fn();
      bus.on('order.paid', paid);
      bus.on('order.created', created);

      await bus.emit('order.paid', { orderId: 'o-1' });

      expect(paid).toHaveBeenCalledTimes(1);
      expect(created).not.toHaveBeenCalled();
    });

    it('should be a no-op when emitting an event with no registered handlers', async () => {
      await expect(bus.emit('unknown.event', { x: 1 })).resolves.toBeUndefined();
    });

    it('should allow the same handler to be registered multiple times', async () => {
      const handler = vi.fn();
      bus.on('order.paid', handler);
      bus.on('order.paid', handler);
      bus.on('order.paid', handler);

      await bus.emit('order.paid', {});

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should support async handlers and await their resolution', async () => {
      const seen: string[] = [];
      bus.on('order.paid', async () => {
        await new Promise((r) => setTimeout(r, 5));
        seen.push('slow');
      });
      bus.on('order.paid', () => {
        seen.push('fast');
      });

      await bus.emit('order.paid', {});

      // Both handlers completed before emit resolves
      expect(seen).toEqual(expect.arrayContaining(['fast', 'slow']));
      expect(seen).toHaveLength(2);
    });

    it('should not couple handlers — a thrown handler does not stop siblings from running', async () => {
      const ran: string[] = [];
      bus.on('order.paid', () => {
        ran.push('a');
      });
      bus.on('order.paid', () => {
        ran.push('boom-throw');
        throw new Error('boom');
      });
      bus.on('order.paid', () => {
        ran.push('c');
      });

      // emit will throw, but the others should have already run
      await expect(bus.emit('order.paid', {})).rejects.toThrow('boom');
      expect(ran).toEqual(['a', 'boom-throw', 'c']);
    });
  });

  describe('on + emit — error propagation', () => {
    it('should reject when a handler throws synchronously', async () => {
      bus.on('order.paid', () => {
        throw new Error('sync boom');
      });

      await expect(bus.emit('order.paid', {})).rejects.toThrow('sync boom');
    });

    it('should reject when a handler rejects asynchronously', async () => {
      bus.on('order.paid', async () => {
        throw new Error('async boom');
      });

      await expect(bus.emit('order.paid', {})).rejects.toThrow('async boom');
    });

    it('should reject with the FIRST handler error when multiple handlers fail', async () => {
      bus.on('order.paid', () => {
        throw new Error('first');
      });
      bus.on('order.paid', () => {
        throw new Error('second');
      });

      await expect(bus.emit('order.paid', {})).rejects.toThrow('first');
    });

    it('should pass the original error object (not a wrapper)', async () => {
      const original = new Error('original');
      bus.on('order.paid', () => {
        throw original;
      });

      try {
        await bus.emit('order.paid', {});
        expect.fail('emit should have rejected');
      } catch (err) {
        expect(err).toBe(original);
      }
    });
  });

  describe('isolation between instances', () => {
    it('should not leak handlers between separate EventBus instances', async () => {
      const busA = new EventBus();
      const busB = new EventBus();
      const handler = vi.fn();

      busA.on('shared.event', handler);
      await busB.emit('shared.event', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
