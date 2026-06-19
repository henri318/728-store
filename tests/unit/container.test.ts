import { describe, it, expect, beforeEach } from 'vitest';
import {
  container,
  getUserRepository,
  getOrderRepository,
  getProductRepository,
  getEmailQueueRepository,
  getUserLookup,
  getRoleRepository,
  getEmailSender,
  getOutboxRepository,
  getPasswordHasher,
  getRateLimiter,
  getEventBus,
} from '@/composition-root/container';
import { MemoryUserRepository } from '@/tests/doubles/memory-user-repository';
import { MemoryRoleRepository } from '@/tests/doubles/memory-role-repository';
import { MemoryEmailQueueRepository } from '../doubles/memory-email-queue-repository';
import { MemoryUserLookup } from '../doubles/memory-user-lookup';
import { MemoryOutboxRepository } from '../doubles/memory-outbox-repository';
import { MemoryPasswordHasher } from '../doubles/memory-password-hasher';
import { MemoryRateLimiter } from '../doubles/memory-rate-limiter';
import { EventBus } from '@/modules/events/infrastructure/in-memory-event-bus';
import type { ConsoleEmailSender } from '@/modules/email/infrastructure/console-email-sender';

/**
 * Tests for the expanded container (3 → 8 port bindings).
 *
 * Verifies:
 *  - All 5 new getters auto-initialize on first call
 *  - initContainer is idempotent
 *  - Test setters override bindings (and overrides persist)
 *  - The existing 3 getters keep their behavior
 */
describe('Container — expanded wiring', () => {
  beforeEach(() => {
    // Reset every binding to ensure each test starts clean
    container.setEmailSender(undefined as any);
    container.setOutboxRepository(undefined as any);
    container.setPasswordHasher(undefined as any);
    container.setRateLimiter(undefined as any);
    container.setEventBus(undefined as any);
    container.setUserRepository(undefined as any);
    container.setOrderRepository(undefined as any);
    container.setProductRepository(undefined as any);
    container.setEmailQueueRepository(undefined as any);
    container.setUserLookup(undefined as any);
    container.setRoleRepository(undefined as any);
  });

  describe('auto-initialization on first getter call', () => {
    it('should auto-init when getUserRepository is called', () => {
      const repo = getUserRepository();
      expect(repo).toBeDefined();
    });

    it('should auto-init when getOrderRepository is called', () => {
      const repo = getOrderRepository();
      expect(repo).toBeDefined();
    });

    it('should auto-init when getProductRepository is called', () => {
      const repo = getProductRepository();
      expect(repo).toBeDefined();
    });

    it('should auto-init when getEmailQueueRepository is called', () => {
      const repo = getEmailQueueRepository();
      expect(repo).toBeDefined();
    });

    it('should auto-init when getUserLookup is called', () => {
      const lookup = getUserLookup();
      expect(lookup).toBeDefined();
    });

    it('should auto-init when getRateLimiter is called', () => {
      const limiter = getRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter.checkRateLimit).toBe('function');
      expect(typeof limiter.recordLoginAttempt).toBe('function');
    });

    it('should auto-init when getEventBus is called', () => {
      const bus = getEventBus();
      expect(bus).toBeDefined();
      expect(typeof bus.on).toBe('function');
      expect(typeof bus.emit).toBe('function');
    });

    it('should auto-init when getRoleRepository is called', () => {
      const repo = getRoleRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.save).toBe('function');
      expect(typeof repo.findAll).toBe('function');
      expect(typeof repo.findByName).toBe('function');
      expect(typeof repo.existsByName).toBe('function');
    });
  });

  describe('initContainer idempotency', () => {
    it('should not re-create bindings when called twice', () => {
      const first = getUserRepository();
      container.init();
      const second = getUserRepository();
      expect(second).toBe(first);
    });
  });

  describe('test setters override bindings', () => {
    it('should let setUserRepository override the bound Prisma adapter', () => {
      const memory = new MemoryUserRepository();
      container.setUserRepository(memory);
      expect(getUserRepository()).toBe(memory);
    });

    it('should let setOrderRepository override the bound Prisma adapter', () => {
      const fake = { save: async () => null, findById: async () => null, saveOrderLineItems: async () => {}, updateStatus: async () => {} } as any;
      container.setOrderRepository(fake);
      expect(getOrderRepository()).toBe(fake);
    });

    it('should let setProductRepository override the bound Prisma adapter', () => {
      const fake = { findAll: async () => [], findById: async () => null } as any;
      container.setProductRepository(fake);
      expect(getProductRepository()).toBe(fake);
    });

    it('should let setEmailQueueRepository override the bound Prisma adapter', () => {
      const memory = new MemoryEmailQueueRepository();
      container.setEmailQueueRepository(memory);
      expect(getEmailQueueRepository()).toBe(memory);
    });

    it('should let setUserLookup override the bound Prisma adapter', () => {
      const memory = new MemoryUserLookup();
      container.setUserLookup(memory);
      expect(getUserLookup()).toBe(memory);
    });

    it('should let setRateLimiter override the bound Prisma adapter', () => {
      const memory = new MemoryRateLimiter();
      container.setRateLimiter(memory);
      expect(getRateLimiter()).toBe(memory);
    });

    it('should let setEventBus override the bound bus (test isolation)', () => {
      const bus = new EventBus();
      container.setEventBus(bus);
      expect(getEventBus()).toBe(bus);
    });

    it('should let setRoleRepository override the bound Prisma adapter', () => {
      const memory = new MemoryRoleRepository();
      container.setRoleRepository(memory);
      expect(getRoleRepository()).toBe(memory);
    });

    it('should let overrides survive a subsequent initContainer call (state check short-circuits)', () => {
      const memory = new MemoryUserRepository();
      container.setUserRepository(memory);
      container.init();
      expect(getUserRepository()).toBe(memory);
    });
  });

  describe('existing 3 getters — backward compat', () => {
    it('should still return an EmailSender', () => {
      const sender = getEmailSender();
      expect(sender).toBeDefined();
      expect(typeof sender.send).toBe('function');
    });

    it('should still return an OutboxRepository', () => {
      const repo = getOutboxRepository();
      expect(repo).toBeDefined();
      expect(typeof repo.saveEvent).toBe('function');
    });

    it('should still return a PasswordHasher', () => {
      const hasher = getPasswordHasher();
      expect(hasher).toBeDefined();
      expect(typeof hasher.hash).toBe('function');
      expect(typeof hasher.verify).toBe('function');
    });

    it('should still return a RateLimiter', () => {
      const limiter = getRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter.checkRateLimit).toBe('function');
      expect(typeof limiter.recordLoginAttempt).toBe('function');
    });

    it('should still return an EventBus', () => {
      const bus = getEventBus();
      expect(bus).toBeDefined();
      expect(typeof bus.on).toBe('function');
      expect(typeof bus.emit).toBe('function');
    });

    it('should still let test setters override the 3 existing bindings', () => {
      const memoryOutbox = new MemoryOutboxRepository();
      const memoryHasher = new MemoryPasswordHasher();
      container.setOutboxRepository(memoryOutbox);
      container.setPasswordHasher(memoryHasher);
      expect(getOutboxRepository()).toBe(memoryOutbox);
      expect(getPasswordHasher()).toBe(memoryHasher);
    });
  });
});
