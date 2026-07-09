import { prisma } from '@/shared/infrastructure/prisma';
import { normalizeEmailLocale } from '../application/email-locale';
import type {
  EmailOrderLookupPort,
  EmailOrderLookupSnapshot,
  EmailOrderSummary,
} from '../domain/ports/email-order-lookup-port';

type LoadedOrder = {
  id: string;
  total: unknown;
  checkoutGroup: { currency: string } | null;
  lineItems: Array<{ id: string }>;
  user: {
    email: string | null;
    firstName: string;
    preferredLanguage: string | null;
  } | null;
};

export class PrismaEmailOrderLookup implements EmailOrderLookupPort {
  private async loadOrder(orderId: string): Promise<LoadedOrder | null> {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        total: true,
        checkoutGroup: { select: { currency: true } },
        lineItems: { select: { id: true } },
        user: {
          select: {
            email: true,
            firstName: true,
            preferredLanguage: true,
          },
        },
      },
    });
  }

  async findBuyerContextByOrderId(
    orderId: string,
  ): Promise<EmailOrderLookupSnapshot | null> {
    const order = await this.loadOrder(orderId);
    if (!order?.user?.email) return null;

    return {
      email: order.user.email,
      firstName: order.user.firstName,
      locale: normalizeEmailLocale(order.user.preferredLanguage),
    };
  }

  async getSummaryForEmail(orderId: string): Promise<EmailOrderSummary | null> {
    const order = await this.loadOrder(orderId);
    if (!order) return null;

    return {
      orderNumber: order.id,
      total: Number.isFinite(Number(order.total)) ? Number(order.total) : 0,
      currency: order.checkoutGroup?.currency ?? 'EUR',
      itemsCount: order.lineItems.length,
    };
  }
}
