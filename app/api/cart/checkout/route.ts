import { NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { CheckoutCart } from '@/modules/cart/application/checkout-cart';
import { handleApiError } from '@/shared/presentation/error-handler';
import { PriceChangedError } from '@/modules/cart/domain/errors';

/**
 * POST /api/cart/checkout — previews the checkout totals.
 *
 * Spec REQ-CART-030:
 *  - 200 with { preview, priceChanges: [] }
 *  - 401 if unauthenticated
 *  - 409 if prices changed (PriceChangedError with priceChanges[])
 *  - 422 if cart is empty (EmptyCartError)
 *
 * This is a read-only preview — it never mutates state. The actual
 * checkout happens in POST /api/cart/checkout/confirm.
 */
export const POST = requireRole('CUSTOMER')(async function POST() {
  const session = await container.getSession().getSession();
  const userId = session?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cartRepository = container.getCartRepository();
    const productRepository = container.getCartProductRepository();
    const outboxRepository = container.getOutboxRepository();
    const paidOrderCountPort = container.getPaidOrderCountPort();
    const transactionRunner = container.getTransactionRunner();

    const checkoutCart = new CheckoutCart(
      cartRepository,
      productRepository,
      outboxRepository,
      paidOrderCountPort,
      transactionRunner,
    );

    const preview = await checkoutCart.preview(userId);

    return NextResponse.json(
      {
        preview: {
          subtotal: preview.subtotal,
          discount: preview.discount,
          shipping: preview.shipping,
          total: preview.total,
          currency: preview.currency,
          isFirstPurchase: preview.isFirstPurchase,
        },
        priceChanges: [],
      },
      { status: 200 },
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
