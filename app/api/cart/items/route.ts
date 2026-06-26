import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { AddItemToCart } from '@/modules/cart/application/add-item-to-cart';
import { addItemSchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';
import type { ProductEntity } from '@/modules/products/domain/product-repository';

/**
 * POST /api/cart/items — adds a product to the user's ACTIVE cart.
 *
 * Spec REQ-CART-030:
 *  - 201 with CartItemDTO (enriched with productName, productImageUrl, sellerName)
 *  - 400 on validation error (Zod)
 *  - 401 if unauthenticated
 *  - 404 if product not found
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
    const validated = addItemSchema.parse(body);

    const cartRepository = container.getCartRepository();
    const productRepository = container.getCartProductRepository();
    const outboxRepository = container.getOutboxRepository();

    const addItemToCart = new AddItemToCart(
      cartRepository,
      productRepository,
      outboxRepository,
    );

    const item = await addItemToCart.execute({
      userId,
      productId: validated.productId,
      quantity: validated.quantity,
      customization: {
        text: validated.customizationText,
        color: validated.customizationColor,
        size: validated.customizationSize,
        imageUrl: validated.customizationImageUrl,
      },
    });

    // Enrich the item with product display data.
    const productsModuleRepo = container.getProductRepository();
    const product = await productsModuleRepo.findById(
      item.productId.value,
      'es',
    );

    const enriched = enrichCartItem(item, product ?? undefined);

    return NextResponse.json(enriched, { status: 201 });
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
      text: item.customizationText,
      color: item.customizationColor,
      size: item.customizationSize,
      imageUrl: item.customizationImageUrl,
    },
  };
}
