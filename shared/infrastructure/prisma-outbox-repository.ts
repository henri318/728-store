import { prisma } from '@/shared/infrastructure/prisma';
import { OutboxEvent, OutboxRepository } from '@/shared/kernel/outbox-repository';

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

  async findPending(limit: number): Promise<OutboxEvent[]> {
    const rows = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      payload: row.payload,
      status: row.status,
      createdAt: row.createdAt,
      processedAt: row.processedAt,
    }));
  }

  async markProcessed(id: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  async markFailed(id: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED' },
    });
  }
}
