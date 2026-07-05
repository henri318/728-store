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
      // Atomically check and update only if status is 'failed'
      const updated = await tx.checkoutGroup.updateMany({
        where: {
          id: input.checkoutGroupId,
          paymentStatus: 'failed',
        },
        data: {
          paymentStatus: 'completed',
          latestPaymentId: paymentId,
          paymentAttemptCount: { increment: 1 },
        },
      });

      // If no rows were updated, the checkout group was not in 'failed' state
      if (updated.count === 0) {
        throw new Error('Checkout group payment is not retryable');
      }

      await tx.checkoutGroupPaymentAttempt.create({
        data: {
          checkoutGroupId: input.checkoutGroupId,
          paymentId,
          amount: input.amount,
          currency: input.currency,
          status: 'completed',
        },
      });
    });

    return {
      paymentId,
      status: 'completed',
    };
  }
}
