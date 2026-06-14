import { prisma } from '@/shared/infrastructure/prisma';
import { eventBus } from '@/shared/kernel/event-bus';

export class OutboxService {
  /**
   * Guards an event in the same transaction as the business operation.
   * This is the "Transactional" part of the Outbox Pattern.
   */
  static async recordEvent(eventType: string, payload: any, tx: any = prisma) {
    return await tx.outboxEvent.create({
      data: {
        eventType,
        payload: JSON.stringify(payload),
        status: 'PENDING',
      },
    });
  }

  /**
   * Processes pending events and publishes them to the EventBus.
   * In a real system, this would be a background job.
   */
  static async processEvents() {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of pendingEvents) {
      try {
        await eventBus.emit(event.eventType, JSON.parse(event.payload as string));
        
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`[Outbox] Error processing event ${event.id}:`, error);
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }
}
