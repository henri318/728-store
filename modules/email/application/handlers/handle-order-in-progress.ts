import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { EmailOrderLookupPort } from '../../domain/ports/email-order-lookup-port';
import { renderEmailTemplate } from '../templates/template-registry';

export interface OrderInProgressPayload {
  orderId: string;
  userId: string;
  paymentId: string;
  totalAmount: number;
  paidAt: string;
}

export class HandleOrderInProgress {
  constructor(
    private readonly emailQueueRepository: EmailQueueRepository,
    private readonly emailOrderLookup: EmailOrderLookupPort,
  ) {}

  async handle(
    payload: OrderInProgressPayload | null | undefined,
  ): Promise<void> {
    if (!payload) return;
    if (
      !payload.orderId ||
      !payload.userId ||
      !payload.paymentId ||
      !payload.paidAt
    )
      return;

    const buyer = await this.emailOrderLookup.findBuyerContextByOrderId(
      payload.orderId,
    );
    const summary = await this.emailOrderLookup.getSummaryForEmail(
      payload.orderId,
    );
    if (!buyer || !summary) return;

    const rendered = renderEmailTemplate('order-in-progress', buyer.locale, {
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
      template: 'order-in-progress',
      metadata: {
        orderId: payload.orderId,
        userId: payload.userId,
        paymentId: payload.paymentId,
        paidAt: payload.paidAt,
        totalAmount: payload.totalAmount,
      },
      idempotencyKey: buildIdempotencyKey(
        'order-in-progress',
        buyer.email,
        payload.orderId,
      ),
    });
  }
}
