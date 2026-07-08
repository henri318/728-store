import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const userRows = new Map<
    string,
    {
      id: string;
      email: string | null;
      firstName: string;
      preferredLanguage: string | null;
    }
  >();

  const orderRows = new Map<
    string,
    {
      id: string;
      userId: string;
      total: number;
      checkoutGroup: { currency: string } | null;
      lineItems: Array<{ id: string }>;
    }
  >();

  const prismaMock = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return userRows.get(where.id) ?? null;
      }),
    },
    order: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = orderRows.get(where.id);
        if (!row) return null;

        return {
          ...row,
          checkoutGroup: row.checkoutGroup,
          lineItems: row.lineItems,
          user: userRows.get(row.userId) ?? null,
        };
      }),
    },
  };

  return { userRows, orderRows, prismaMock };
});

vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: mocks.prismaMock,
}));

import { PrismaEmailOrderLookup } from '@/modules/email/infrastructure/prisma-email-order-lookup';
import { PrismaEmailUserLookup } from '@/modules/email/infrastructure/prisma-email-user-lookup';

describe('PrismaEmailUserLookup', () => {
  let lookup: PrismaEmailUserLookup;

  beforeEach(() => {
    mocks.userRows.clear();
    mocks.orderRows.clear();
    vi.clearAllMocks();
    lookup = new PrismaEmailUserLookup();
  });

  it('returns buyer context with locale fallback when the user has no supported locale', async () => {
    mocks.userRows.set('user-1', {
      id: 'user-1',
      email: 'buyer@test.com',
      firstName: 'Ana',
      preferredLanguage: 'fr',
    });

    await expect(lookup.findById('user-1')).resolves.toEqual({
      email: 'buyer@test.com',
      firstName: 'Ana',
      locale: 'es',
    });
  });

  it('returns null when the user has no email address', async () => {
    mocks.userRows.set('user-1', {
      id: 'user-1',
      email: null,
      firstName: 'Ana',
      preferredLanguage: 'es',
    });

    await expect(lookup.findById('user-1')).resolves.toBeNull();
    await expect(lookup.findEmailByUserId('user-1')).resolves.toBeNull();
  });

  it('returns null when the user does not exist', async () => {
    await expect(lookup.findById('missing-user')).resolves.toBeNull();
    await expect(lookup.findEmailByUserId('missing-user')).resolves.toBeNull();
  });

  it('returns the email address when requested directly', async () => {
    mocks.userRows.set('user-1', {
      id: 'user-1',
      email: 'buyer@test.com',
      firstName: 'Ana',
      preferredLanguage: 'es',
    });

    await expect(lookup.findEmailByUserId('user-1')).resolves.toBe(
      'buyer@test.com',
    );
  });
});

describe('PrismaEmailOrderLookup', () => {
  let lookup: PrismaEmailOrderLookup;

  beforeEach(() => {
    mocks.userRows.clear();
    mocks.orderRows.clear();
    vi.clearAllMocks();
    lookup = new PrismaEmailOrderLookup();
  });

  it('returns buyer context from the order and user records', async () => {
    mocks.userRows.set('user-1', {
      id: 'user-1',
      email: 'buyer@test.com',
      firstName: 'Ana',
      preferredLanguage: 'es',
    });
    mocks.orderRows.set('order-1', {
      id: 'order-1',
      userId: 'user-1',
      total: 125.5,
      checkoutGroup: { currency: 'EUR' },
      lineItems: [{ id: 'line-1' }],
    });

    await expect(lookup.findBuyerContextByOrderId('order-1')).resolves.toEqual({
      email: 'buyer@test.com',
      firstName: 'Ana',
      locale: 'es',
    });
  });

  it('returns the order summary using the order id, checkout currency, and line item count', async () => {
    mocks.userRows.set('user-1', {
      id: 'user-1',
      email: 'buyer@test.com',
      firstName: 'Ana',
      preferredLanguage: 'es',
    });
    mocks.orderRows.set('order-1', {
      id: 'order-1',
      userId: 'user-1',
      total: 125.5,
      checkoutGroup: { currency: 'EUR' },
      lineItems: [{ id: 'line-1' }, { id: 'line-2' }],
    });

    await expect(lookup.getSummaryForEmail('order-1')).resolves.toEqual({
      orderNumber: 'order-1',
      total: 125.5,
      currency: 'EUR',
      itemsCount: 2,
    });
  });

  it('returns null when the order does not exist', async () => {
    await expect(
      lookup.findBuyerContextByOrderId('missing-order'),
    ).resolves.toBeNull();
    await expect(
      lookup.getSummaryForEmail('missing-order'),
    ).resolves.toBeNull();
  });

  it('returns null when the order buyer user is missing', async () => {
    mocks.orderRows.set('order-1', {
      id: 'order-1',
      userId: 'missing-user',
      total: 125.5,
      checkoutGroup: { currency: 'EUR' },
      lineItems: [{ id: 'line-1' }],
    });

    await expect(
      lookup.findBuyerContextByOrderId('order-1'),
    ).resolves.toBeNull();
  });

  it.each([NaN, Infinity, -Infinity])(
    'falls back to 0 when the stored total is non-finite (%s)',
    async (total) => {
      mocks.userRows.set('user-1', {
        id: 'user-1',
        email: 'buyer@test.com',
        firstName: 'Ana',
        preferredLanguage: 'es',
      });
      mocks.orderRows.set('order-1', {
        id: 'order-1',
        userId: 'user-1',
        total,
        checkoutGroup: { currency: 'EUR' },
        lineItems: [{ id: 'line-1' }],
      });

      await expect(lookup.getSummaryForEmail('order-1')).resolves.toEqual({
        orderNumber: 'order-1',
        total: 0,
        currency: 'EUR',
        itemsCount: 1,
      });
    },
  );

  it('falls back to EUR when the checkout group is missing', async () => {
    mocks.userRows.set('user-1', {
      id: 'user-1',
      email: 'buyer@test.com',
      firstName: 'Ana',
      preferredLanguage: 'es',
    });
    mocks.orderRows.set('order-1', {
      id: 'order-1',
      userId: 'user-1',
      total: 125.5,
      checkoutGroup: null,
      lineItems: [],
    });

    await expect(lookup.getSummaryForEmail('order-1')).resolves.toEqual({
      orderNumber: 'order-1',
      total: 125.5,
      currency: 'EUR',
      itemsCount: 0,
    });
  });
});
