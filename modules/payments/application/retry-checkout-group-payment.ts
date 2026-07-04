import { toCheckoutGroupPaymentChargeInput } from '../domain/entities/checkout-group';
import type { CheckoutGroupLookupPort } from '../domain/checkout-group-lookup-port';
import type {
  CheckoutGroupPaymentPort,
  CheckoutGroupPaymentChargeResult,
} from '../domain/checkout-group-payment-port';

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

    return this.checkoutGroupPaymentPort.charge(
      toCheckoutGroupPaymentChargeInput(checkoutGroup),
    );
  }
}
