import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { CheckoutCart } from '@/modules/cart/application/checkout-cart';
import { confirmCheckoutSchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import { PriceChangedError } from '@/modules/cart/domain/errors';

/**
 * POST /api/cart/checkout/confirm — confirms the checkout.
 *
 * Spec REQ-CART-030:
 *  - 201 with { orderIds, total, currency }
 *  - 401 if unauthenticated
 *  - 409 if prices changed and user hasn't accepted (PriceChangedError)
 *  - 422 if cart is empty (EmptyCartError)
 *
 * The `acceptPriceChanges` flag controls whether the checkout proceeds
 * when prices have drifted since the user added items. If true, the
 * snapshots are updated to current prices and the checkout completes.
 * If false, a PriceChangedError is raised (409).
 */
export const POST = requireRole('CUSTOMER')(async function POST(
  request: NextRequest,
) {
  const session = await container.getSession().getSession();
  const userId = session?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = confirmCheckoutSchema.parse(body);

    const cartRepository = container.getCartRepository();
    const productRepository = container.getCartProductRepository();
    const outboxRepository = container.getOutboxRepository();
    const paidOrderCountPort = container.getPaidOrderCountPort();
    const transactionRunner = container.getTransactionRunner();
    const customizationLookup = container.getCustomizationLookup();

    const checkoutCart = new CheckoutCart(
      cartRepository,
      productRepository,
      outboxRepository,
      paidOrderCountPort,
      transactionRunner,
      customizationLookup,
    );

    const result = await checkoutCart.confirm(
      userId,
      validated.acceptPriceChanges,
    );

    return NextResponse.json(
      {
        orderIds: result.orderIds,
        total: result.totals.total,
        currency: result.totals.currency,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // PriceChangedError needs special handling: return 409 with priceChanges[]
    if (error instanceof PriceChangedError) {
      return NextResponse.json(
        {
          error: error.safeMessage,
          priceChanges: error.priceChanges.map((pc) => ({
            itemId: pc.itemId,
            oldPrice: pc.oldPrice.amount,
            newPrice: pc.newPrice.amount,
          })),
        },
        { status: 409 },
      );
    }
    return handleApiError(error);
  }
});
