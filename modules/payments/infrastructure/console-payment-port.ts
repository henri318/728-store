import type {
  CheckoutGroupPaymentChargeInput,
  CheckoutGroupPaymentChargeResult,
  CheckoutGroupPaymentPort,
} from '../domain/checkout-group-payment-port';

export class ConsolePaymentPort implements CheckoutGroupPaymentPort {
  async charge(
    input: CheckoutGroupPaymentChargeInput,
  ): Promise<CheckoutGroupPaymentChargeResult> {
    const paymentId = crypto.randomUUID();
    console.log('[ConsolePaymentPort] Simulated charge:', {
      checkoutGroupId: input.checkoutGroupId,
      amount: input.amount,
      currency: input.currency,
      paymentId,
    });
    return { paymentId, status: 'completed' };
  }
}
