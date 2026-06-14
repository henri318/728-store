import { prisma } from '@/shared/infrastructure/prisma';
import { OutboxRepository } from '@/shared/kernel/memory-outbox-repository';

export class PrismaOutboxRepository implements OutboxRepository {
  async saveEvent(eventType: string, payload: any, tx: any = prisma): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        eventType,
        payload,
        status: 'PENDING',
      },
    });
  }
}
