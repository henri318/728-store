import { NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { GetCart } from '@/modules/cart/application/get-cart';
import { handleApiError } from '@/shared/presentation/error-handler';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import type { CustomizationSnapshot } from '@/modules/cart/domain/customization-lookup-port';

/**
 * GET /api/cart — returns the authenticated user's ACTIVE cart.
 *
 * Spec REQ-CART-030:
 *  - 200 with CartDTO (items enriched with productName, productImageUrl, sellerName)
 *  - 401 if unauthenticated
 *
 * The enrichment is a presenter concern: the domain returns CartItemEntity
 * with value objects (ProductId, SellerId, Money). The route translates
 * these into a flat DTO with display-friendly fields.
 */
export const GET = requireRole('CUSTOMER')(async function GET() {
  const session = await container.getSession().getSession();
  const userId = session?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cartRepository = container.getCartRepository();
    const customizationLookup = container.getCustomizationLookup();
    const getCart = new GetCart(cartRepository);
    const cart = await getCart.execute(userId);

    // Enrich items with product name, image URL, and seller name.
    const productRepository = container.getProductRepository();
    const productIds = [...new Set(cart.items.map((i) => i.productId.value))];
    const productMap = new Map<string, ProductEntity>();
    for (const id of productIds) {
      const product = await productRepository.findById(id, 'es');
      if (product) productMap.set(product.id, product);
    }

    // Resolve all customizations in a single batch.
    const allCustomizationIds = [
      ...new Set(cart.items.flatMap((i) => i.customizationIdList)),
    ];
    const allCustomizations =
      allCustomizationIds.length > 0
        ? await customizationLookup.findByIds(allCustomizationIds)
        : [];
    const customizationMap = new Map(allCustomizations.map((c) => [c.id, c]));

    const items = cart.items.map((item) => {
      const customizations = item.customizationIdList
        .map((id) => customizationMap.get(id))
        .filter((c): c is CustomizationSnapshot => c != null);
      return enrichCartItem(
        item,
        productMap.get(item.productId.value),
        customizations,
      );
    });

    return NextResponse.json(
      {
        id: cart.id,
        userId: cart.userId,
        status: cart.status,
        items,
        createdAt: cart.createdAt.toISOString(),
        updatedAt: cart.updatedAt.toISOString(),
      },
      { status: 200 },
    );
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
