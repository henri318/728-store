import { prisma } from '@/shared/infrastructure/prisma';
import type {
  CheckoutGroupPaymentChargeInput,
  CheckoutGroupPaymentChargeResult,
  CheckoutGroupPaymentPort,
} from '../domain/checkout-group-payment-port';

export class PrismaCheckoutGroupPaymentPort implements CheckoutGroupPaymentPort {
  async charge(
    input: CheckoutGroupPaymentChargeInput,
  ): Promise<CheckoutGroupPaymentChargeResult> {
    const paymentId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.checkoutGroupPaymentAttempt.create({
        data: {
          checkoutGroupId: input.checkoutGroupId,
          paymentId,
          amount: input.amount,
          currency: input.currency,
          status: 'completed',
        },
      });

      await tx.checkoutGroup.update({
        where: { id: input.checkoutGroupId },
        data: {
          paymentStatus: 'completed',
          latestPaymentId: paymentId,
          paymentAttemptCount: { increment: 1 },
        },
      });
    });

    return {
      paymentId,
      status: 'completed',
    };
  }
}
