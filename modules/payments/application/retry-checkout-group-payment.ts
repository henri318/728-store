import { toCheckoutGroupPaymentChargeInput } from '../domain/entities/checkout-group';
import type { CheckoutGroupLookupPort } from '../domain/checkout-group-lookup-port';
import type {
  CheckoutGroupPaymentPort,
  CheckoutGroupPaymentChargeResult,
} from '../domain/checkout-group-payment-port';
import { CHECKOUT_GROUP_PAYMENT_STATUSES } from '../domain/value-objects/checkout-group-payment-status';

export class RetryCheckoutGroupPayment {
  constructor(
    private readonly checkoutGroupLookup: CheckoutGroupLookupPort,
    private readonly checkoutGroupPaymentPort: CheckoutGroupPaymentPort,
  ) {}

  async execute(
    checkoutGroupId: string,
  ): Promise<CheckoutGroupPaymentChargeResult> {
    const checkoutGroup =
      await this.checkoutGroupLookup.findById(checkoutGroupId);

    if (!checkoutGroup) {
      throw new Error('Checkout group not found');
    }

    if (
      checkoutGroup.paymentStatus !== CHECKOUT_GROUP_PAYMENT_STATUSES.FAILED
    ) {
      throw new Error('Checkout group payment is not retryable');
    }

    return this.checkoutGroupPaymentPort.charge(
      toCheckoutGroupPaymentChargeInput(checkoutGroup),
    );
  }
}
