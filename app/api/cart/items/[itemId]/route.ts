import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { UpdateCartItemQuantity } from '@/modules/cart/application/update-cart-item';
import { RemoveCartItem } from '@/modules/cart/application/remove-cart-item';
import { updateQuantitySchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';
import type { ProductEntity } from '@/modules/products/domain/product-repository';

/**
 * PATCH /api/cart/items/[itemId] — updates an item's quantity.
 *
 * Spec REQ-CART-030:
 *  - 200 with CartItemDTO (enriched)
 *  - 400 on validation error
 *  - 401 if unauthenticated
 *  - 403 if cross-user access
 *  - 404 if item not found
 */
export const PATCH = requireRole('CUSTOMER')(async function PATCH(
  request: NextRequest,
  context?: unknown,
) {
  const session = await container.getSession().getSession();
  const userId = session?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemId } = (await (
      context as { params: Promise<{ itemId: string }> }
    ).params) as { itemId: string };
    const body = await request.json();
    const validated = updateQuantitySchema.parse(body);

    const cartRepository = container.getCartRepository();
    const outboxRepository = container.getOutboxRepository();

    const updateCartItem = new UpdateCartItemQuantity(
      cartRepository,
      outboxRepository,
    );

    const item = await updateCartItem.execute({
      userId,
      itemId,
      quantity: validated.quantity,
    });

    // Enrich the item with product display data.
    const productsModuleRepo = container.getProductRepository();
    const product = await productsModuleRepo.findById(
      item.productId.value,
      'es',
    );

    const enriched = enrichCartItem(item, product ?? undefined);

    return NextResponse.json(enriched, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

/**
 * DELETE /api/cart/items/[itemId] — removes an item from the cart.
 *
 * Spec REQ-CART-030:
 *  - 204 on success
 *  - 401 if unauthenticated
 *  - 403 if cross-user access
 *  - 404 if item not found
 */
export const DELETE = requireRole('CUSTOMER')(async function DELETE(
  _request: NextRequest,
  context?: unknown,
) {
  const session = await container.getSession().getSession();
  const userId = session?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemId } = (await (
      context as { params: Promise<{ itemId: string }> }
    ).params) as { itemId: string };

    const cartRepository = container.getCartRepository();
    const outboxRepository = container.getOutboxRepository();

    const removeCartItem = new RemoveCartItem(cartRepository, outboxRepository);

    await removeCartItem.execute({ userId, itemId });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

// --- Enrichment helper ---

function enrichCartItem(
  item: CartItemEntity,
  product: ProductEntity | undefined,
): Record<string, unknown> {
  const productName = product?.translations?.[0]?.name ?? 'Unknown Product';
  const productImageUrl = product?.images?.[0]?.url ?? null;
  const sellerName = product?.sellerName ?? 'Unknown Seller';
  const unitPrice = item.unitPriceSnapshot.amount;
  const lineTotal = unitPrice * item.quantity;

  return {
    id: item.id,
    productId: item.productId.value,
    productName,
    productImageUrl,
    sellerId: item.sellerId.value,
    sellerName,
    quantity: item.quantity,
    unitPrice,
    lineTotal,
    customization: {
      text: null,
      color: null,
      size: null,
      imageUrl: null,
    },
  };
}
