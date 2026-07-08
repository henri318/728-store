import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { EmailOrderLookupPort } from '../../domain/ports/email-order-lookup-port';
import { renderEmailTemplate } from '../templates/template-registry';

export interface OrderCompletedPayload {
  orderId: string;
  userId: string;
  sellerId: string;
  customizationId: string;
  readyAt: string;
}

export class HandleOrderCompleted {
  constructor(
    private readonly emailQueueRepository: EmailQueueRepository,
    private readonly emailOrderLookup: EmailOrderLookupPort,
  ) {}

  async handle(
    payload: OrderCompletedPayload | null | undefined,
  ): Promise<void> {
    if (!payload) return;
    if (
      !payload.orderId ||
      !payload.userId ||
      !payload.sellerId ||
      !payload.customizationId ||
      !payload.readyAt
    )
      return;

    const buyer = await this.emailOrderLookup.findBuyerContextByOrderId(
      payload.orderId,
    );
    const summary = await this.emailOrderLookup.getSummaryForEmail(
      payload.orderId,
    );
    if (!buyer || !summary) return;

    const rendered = renderEmailTemplate('order-completed', buyer.locale, {
      name: buyer.firstName,
      orderNumber: summary.orderNumber,
      total: summary.total,
      currency: summary.currency,
      itemsCount: summary.itemsCount,
    });

    await this.emailQueueRepository.create({
      to: buyer.email,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      template: 'order-completed',
      metadata: {
        orderId: payload.orderId,
        userId: payload.userId,
        sellerId: payload.sellerId,
        customizationId: payload.customizationId,
        readyAt: payload.readyAt,
      },
      idempotencyKey: buildIdempotencyKey(
        'order-completed',
        buyer.email,
        payload.orderId,
      ),
    });
  }
}
