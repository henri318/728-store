import type { CheckoutGroupPaymentStatus } from '../value-objects/checkout-group-payment-status';
import type { CheckoutGroupPaymentChargeInput } from '../checkout-group-payment-port';
import type { Money } from '@/shared/kernel/domain/value-objects/money';

export interface CheckoutGroupEntity {
  readonly id: string;
  readonly userId: string;
  readonly currency: 'EUR';
  readonly totalAmount: Money;
  readonly paymentStatus: CheckoutGroupPaymentStatus;
  readonly paymentAttemptCount: number;
  readonly latestPaymentId: string | null;
  readonly linkedOrders?: ReadonlyArray<CheckoutGroupOrderSnapshot>;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface CheckoutGroupOrderSnapshot {
  readonly orderId: string;
  readonly checkoutGroupId: string;
  readonly sellerId: string;
  readonly total: Money;
  readonly status: string;
}

export function toCheckoutGroupPaymentChargeInput(
  checkoutGroup: CheckoutGroupEntity,
): CheckoutGroupPaymentChargeInput {
  return {
    checkoutGroupId: checkoutGroup.id,
    amount: checkoutGroup.totalAmount.amount,
    currency: checkoutGroup.currency,
  };
}
