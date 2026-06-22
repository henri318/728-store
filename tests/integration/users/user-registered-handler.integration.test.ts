import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupDb } from '@/tests/helpers/test-db';
import { RegisterUserUseCase } from '@/modules/users/application/register-user-use-case';
import { PrismaUserRepository } from '@/modules/users/infrastructure/prisma-user-repository';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { prisma } from '@/shared/infrastructure/prisma';
import { GlobalEvents } from '@/modules/events/domain/event-registry';

/**
 * User Registration — Integration test for outbox event persistence.
 *
 * Verifies that when a user registers, the USER_REGISTERED event
 * is persisted in the OutboxEvent table (transactional outbox pattern).
 * Uses real Docker PostgreSQL — no mocks.
 */
describe('User Registration — Outbox Integration', () => {
  let userRepo: PrismaUserRepository;
  let outboxRepo: PrismaOutboxRepository;
  let useCase: RegisterUserUseCase;

  beforeAll(async () => {
    await cleanupDb();
    userRepo = new PrismaUserRepository();
    outboxRepo = new PrismaOutboxRepository();
    useCase = new RegisterUserUseCase(userRepo, outboxRepo, {
      hash: async (pw: string) => `hashed:${pw}`,
      verify: async () => true,
    });
  });

  afterAll(async () => {
    await cleanupDb();
  });

  it('should persist a USER_REGISTERED event in the outbox', async () => {
    const result = await useCase.execute({
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'password123',
    });

    // Verify user was created
    expect(result.userId).toBeDefined();
    expect(result.email.value).toBe('newuser@example.com');

    // Verify outbox event was persisted
    const events = await prisma.outboxEvent.findMany({
      where: { eventType: GlobalEvents.USER_REGISTERED },
      orderBy: { createdAt: 'desc' },
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    const event = events[0];
    expect(event.eventType).toBe(GlobalEvents.USER_REGISTERED);
    expect(event.status).toBe('PENDING');

    // Verify payload contains the user ID
    const payload = event.payload as Record<string, unknown>;
    expect(payload.userId).toBe(result.userId.value);
  });

  it('should persist the user in the database', async () => {
    const result = await useCase.execute({
      email: 'persist@example.com',
      firstName: 'Persist',
      lastName: 'Test',
      password: 'password123',
    });

    const user = await prisma.user.findUnique({
      where: { id: result.userId.value },
    });

    expect(user).not.toBeNull();
    expect(user!.email).toBe('persist@example.com');
    expect(user!.firstName).toBe('Persist');
    expect(user!.lastName).toBe('Test');
    expect(user!.role).toBe('CUSTOMER');
  });

  it('should emit USER_UPDATED event on profile update', async () => {
    // Register a user first
    const registered = await useCase.execute({
      email: 'update@example.com',
      firstName: 'Original',
      lastName: 'Name',
      password: 'password123',
    });

    // Update the user via the use case
    const { UpdateUserUseCase } =
      await import('@/modules/users/application/use-cases/update-user-use-case');
    const updateUseCase = new UpdateUserUseCase(userRepo, outboxRepo);
    await updateUseCase.execute({
      userId: registered.userId.value,
      firstName: 'Updated',
    });

    // Verify outbox event
    const events = await prisma.outboxEvent.findMany({
      where: { eventType: GlobalEvents.USER_UPDATED },
      orderBy: { createdAt: 'desc' },
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    const payload = events[0].payload as Record<string, unknown>;
    expect(payload.userId).toBe(registered.userId.value);
  });
});
