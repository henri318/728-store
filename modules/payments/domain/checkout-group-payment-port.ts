export interface CheckoutGroupPaymentChargeInput {
  checkoutGroupId: string;
  amount: number;
  currency: 'EUR';
}

export interface CheckoutGroupPaymentChargeResult {
  paymentId: string;
  status: 'completed' | 'failed';
}

export interface CheckoutGroupPaymentPort {
  charge(
    input: CheckoutGroupPaymentChargeInput,
  ): Promise<CheckoutGroupPaymentChargeResult>;
}
