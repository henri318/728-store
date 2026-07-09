import { buildIdempotencyKey } from '@/shared/lib/idempotency-key';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { EmailUserLookupPort } from '../../domain/ports/email-user-lookup-port';
import { renderEmailTemplate } from '../templates/template-registry';

export interface SellerCreatedPayload {
  sellerId: string;
  userId: string;
  name: string;
}

export class HandleSellerCreated {
  constructor(
    private readonly emailQueueRepository: EmailQueueRepository,
    private readonly emailUserLookup: EmailUserLookupPort,
  ) {}

  async handle(
    payload: SellerCreatedPayload | null | undefined,
  ): Promise<void> {
    if (!payload) return;
    if (!payload.sellerId || !payload.userId || !payload.name) return;

    const user = await this.emailUserLookup.findById(payload.userId);
    if (!user) return;

    const rendered = renderEmailTemplate('seller-created', user.locale, {
      name: user.firstName,
      sellerName: payload.name,
    });

    await this.emailQueueRepository.create({
      to: user.email,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      template: 'seller-created',
      metadata: {
        sellerId: payload.sellerId,
        userId: payload.userId,
        sellerName: payload.name,
      },
      idempotencyKey: buildIdempotencyKey(
        'seller-created',
        user.email,
        payload.sellerId,
      ),
    });
  }
}
