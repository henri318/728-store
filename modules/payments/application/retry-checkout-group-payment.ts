import { toCheckoutGroupPaymentChargeInput } from '../domain/entities/checkout-group';
import type { CheckoutGroupLookupPort } from '../domain/checkout-group-lookup-port';
import type {
  CheckoutGroupPaymentPort,
  CheckoutGroupPaymentChargeResult,
} from '../domain/checkout-group-payment-port';
import { CHECKOUT_GROUP_PAYMENT_STATUSES } from '../domain/value-objects/checkout-group-payment-status';
import {
  AppError,
  ConflictError,
  NotFoundError,
} from '@/shared/kernel/app-error';

export class RetryCheckoutGroupPayment {
  constructor(
    private readonly checkoutGroupLookup: CheckoutGroupLookupPort,
    private readonly checkoutGroupPaymentPort: CheckoutGroupPaymentPort,
  ) {}

  async execute(
    checkoutGroupId: string,
    userId: string,
  ): Promise<CheckoutGroupPaymentChargeResult> {
    const checkoutGroup =
      await this.checkoutGroupLookup.findById(checkoutGroupId);

    if (!checkoutGroup) {
      throw new NotFoundError('Checkout group not found');
    }

    if (checkoutGroup.userId !== userId) {
      throw new AppError('Forbidden', 403, 'Forbidden');
    }

    if (
      checkoutGroup.paymentStatus !== CHECKOUT_GROUP_PAYMENT_STATUSES.FAILED
    ) {
      throw new ConflictError(
        'Checkout group payment is not retryable',
        'Checkout group payment is not retryable',
      );
    }

    try {
      return await this.checkoutGroupPaymentPort.charge(
        toCheckoutGroupPaymentChargeInput(checkoutGroup),
      );
    } catch (error) {
      // If charge fails due to concurrent retry, convert to ConflictError
      if (
        error instanceof Error &&
        error.message === 'Checkout group payment is not retryable'
      ) {
        throw new ConflictError(
          'Checkout group payment is not retryable',
          'Checkout group payment is not retryable',
        );
      }
      throw error;
    }
  }
}
