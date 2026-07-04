import { describe, expect, it, vi } from 'vitest';
import type {
  CheckoutGroupEntity,
  CheckoutGroupOrderSnapshot,
} from '@/modules/payments/domain/entities/checkout-group';
import { toCheckoutGroupPaymentChargeInput } from '@/modules/payments/domain/entities/checkout-group';
import { RetryCheckoutGroupPayment } from '@/modules/payments/application/retry-checkout-group-payment';
import type { CheckoutGroupLookupPort } from '@/modules/payments/domain/checkout-group-lookup-port';
import { CHECKOUT_GROUP_PAYMENT_STATUSES } from '@/modules/payments/domain/value-objects/checkout-group-payment-status';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { Money } from '@/shared/kernel/domain/value-objects/money';

describe('CheckoutGroup contracts', () => {
  it('maps the checkout-group aggregate into a checkout-group payment request', () => {
    const checkoutGroup: CheckoutGroupEntity = {
      id: 'checkout-group-1',
      userId: 'user-1',
      currency: 'EUR',
      totalAmount: Money.create(149.9, Currency.EUR),
      paymentStatus: CHECKOUT_GROUP_PAYMENT_STATUSES.PENDING,
      paymentAttemptCount: 0,
      latestPaymentId: null,
    };

    expect(toCheckoutGroupPaymentChargeInput(checkoutGroup)).toEqual({
      checkoutGroupId: 'checkout-group-1',
      amount: 149.9,
      currency: 'EUR',
    });
  });

  it('retries a checkout-group payment by checkoutGroupId without mutating linked order snapshots', async () => {
    const linkedOrders: CheckoutGroupOrderSnapshot[] = [
      {
        orderId: 'order-1',
        checkoutGroupId: 'checkout-group-1',
        sellerId: 'seller-1',
        total: Money.create(90, Currency.EUR),
        status: 'new',
      },
      {
        orderId: 'order-2',
        checkoutGroupId: 'checkout-group-1',
        sellerId: 'seller-2',
        total: Money.create(59.9, Currency.EUR),
        status: 'new',
      },
    ];

    const checkoutGroup = deepFreeze<CheckoutGroupEntity>({
      id: 'checkout-group-1',
      userId: 'user-1',
      currency: 'EUR',
      totalAmount: Money.create(149.9, Currency.EUR),
      paymentStatus: CHECKOUT_GROUP_PAYMENT_STATUSES.FAILED,
      paymentAttemptCount: 2,
      latestPaymentId: 'payment-1',
      linkedOrders,
    });

    const lookup: CheckoutGroupLookupPort = {
      findById: vi.fn().mockResolvedValue(checkoutGroup),
    };
    const charge = vi.fn().mockResolvedValue({
      paymentId: 'payment-2',
      status: 'completed' as const,
    });

    const useCase = new RetryCheckoutGroupPayment(lookup, {
      charge,
    });

    await expect(useCase.execute('checkout-group-1')).resolves.toEqual({
      paymentId: 'payment-2',
      status: 'completed',
    });

    expect(lookup.findById).toHaveBeenCalledWith('checkout-group-1');
    expect(charge).toHaveBeenCalledWith({
      checkoutGroupId: 'checkout-group-1',
      amount: 149.9,
      currency: 'EUR',
    });
    expect(checkoutGroup).toEqual({
      id: 'checkout-group-1',
      userId: 'user-1',
      currency: 'EUR',
      totalAmount: Money.create(149.9, Currency.EUR),
      paymentStatus: CHECKOUT_GROUP_PAYMENT_STATUSES.FAILED,
      paymentAttemptCount: 2,
      latestPaymentId: 'payment-1',
      linkedOrders: [
        {
          orderId: 'order-1',
          checkoutGroupId: 'checkout-group-1',
          sellerId: 'seller-1',
          total: Money.create(90, Currency.EUR),
          status: 'new',
        },
        {
          orderId: 'order-2',
          checkoutGroupId: 'checkout-group-1',
          sellerId: 'seller-2',
          total: Money.create(59.9, Currency.EUR),
          status: 'new',
        },
      ],
    });
    expect(checkoutGroup.linkedOrders).toEqual(linkedOrders);
  });

  it('rejects a completed checkout-group payment before charging', async () => {
    const checkoutGroup = deepFreeze<CheckoutGroupEntity>({
      id: 'checkout-group-1',
      userId: 'user-1',
      currency: 'EUR',
      totalAmount: Money.create(149.9, Currency.EUR),
      paymentStatus: CHECKOUT_GROUP_PAYMENT_STATUSES.COMPLETED,
      paymentAttemptCount: 1,
      latestPaymentId: 'payment-1',
    });

    const lookup: CheckoutGroupLookupPort = {
      findById: vi.fn().mockResolvedValue(checkoutGroup),
    };
    const charge = vi.fn();
    const useCase = new RetryCheckoutGroupPayment(lookup, {
      charge,
    });

    await expect(useCase.execute('checkout-group-1')).rejects.toThrow(
      'Checkout group payment is not retryable',
    );

    expect(lookup.findById).toHaveBeenCalledWith('checkout-group-1');
    expect(charge).not.toHaveBeenCalled();
  });

  it('rejects a missing checkout-group id before attempting payment', async () => {
    const lookup: CheckoutGroupLookupPort = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const charge = vi.fn();
    const useCase = new RetryCheckoutGroupPayment(lookup, {
      charge,
    });

    await expect(useCase.execute('missing-checkout-group')).rejects.toThrow(
      'Checkout group not found',
    );

    expect(lookup.findById).toHaveBeenCalledWith('missing-checkout-group');
    expect(charge).not.toHaveBeenCalled();
  });
});

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value) as T;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    return Object.freeze(value) as T;
  }

  return value;
}
