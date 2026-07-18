import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { CheckoutCart } from '@/modules/cart/application/checkout-cart';
import { HandleCartCheckedOut } from '@/modules/orders/application/handle-cart-checked-out';
import type { CartCheckedOutPayload } from '@/modules/orders/application/handle-cart-checked-out';
import { confirmCheckoutSchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import { PriceChangedError } from '@/modules/cart/domain/errors';
import { checkoutEligibilitySchema } from '@/modules/cart/presentation/schemas/checkout-eligibility-schema';
import {
  getAuthenticatedUserId,
  parseBody,
} from '@/shared/presentation/route-helpers';

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
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const validated = await parseBody(request, confirmCheckoutSchema);
    const address = checkoutEligibilitySchema.safeParse(validated.address);
    if (!address.success) {
      return NextResponse.json(
        {
          error: 'A complete Spain delivery address is required',
          fieldErrors: address.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

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
      address.data,
    );

    // Serverless deployments do not keep the in-process outbox worker alive.
    // Consume this checkout's durable event before responding so the order
    // exists when the client navigates to its detail page.
    const orderRepository = container.getOrderRepository();
    const orderHandler = new HandleCartCheckedOut(
      orderRepository,
      outboxRepository,
      transactionRunner,
      customizationLookup,
    );
    await orderHandler.execute(
      result.eventPayload as unknown as CartCheckedOutPayload,
    );
    const orderIds = await orderRepository.findIdsByCartId(result.cart.id);

    return NextResponse.json(
      {
        orderIds,
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
