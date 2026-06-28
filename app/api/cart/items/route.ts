import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { AddItemToCart } from '@/modules/cart/application/add-item-to-cart';
import { addItemSchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import type { CustomizationSnapshot } from '@/modules/cart/domain/customization-lookup-port';

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
    const customizationLookup = container.getCustomizationLookup();

    const addItemToCart = new AddItemToCart(
      cartRepository,
      productRepository,
      outboxRepository,
      customizationLookup,
    );

    const item = await addItemToCart.execute({
      userId,
      productId: validated.productId,
      quantity: validated.quantity,
      customizationIdList: validated.customizationIdList,
    });

    // Enrich the item with product display data + resolved customizations.
    const productsModuleRepo = container.getProductRepository();
    const product = await productsModuleRepo.findById(
      item.productId.value,
      'es',
    );

    const customizations =
      item.customizationIdList.length > 0
        ? await customizationLookup.findByIds(item.customizationIdList)
        : [];

    const enriched = enrichCartItem(item, product ?? undefined, customizations);

    return NextResponse.json(enriched, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

// --- Enrichment helper ---

function enrichCartItem(
  item: CartItemEntity,
  product: ProductEntity | undefined,
  customizations: CustomizationSnapshot[],
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
    customizationIdList: item.customizationIdList,
    customizations: customizations.map((c) => ({
      id: c.id,
      text: c.text,
      color: c.color,
      size: c.size,
      imageUrl: c.imageUrl,
    })),
  };
}
