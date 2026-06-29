import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { MigrateGuestCart } from '@/modules/cart/application/migrate-guest-cart';
import { migrateGuestCartSchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import type { CartItemEntity } from '@/modules/cart/domain/entities/cart-item';
import type { ProductEntity } from '@/modules/products/domain/product-repository';
import type { CustomizationSnapshot } from '@/modules/cart/domain/customization-lookup-port';

/**
 * POST /api/cart/migrate — migrates a guest cart (localStorage) to the
 * authenticated user's server cart.
 *
 * Spec REQ-CART-030:
 *  - 200 with { cart: CartDTO, migratedCount, skippedProductIds[], skippedCustomizationProductIds[] }
 *  - 400 on validation error (invalid strategy or items)
 *  - 401 if unauthenticated
 *
 * The client sends the guest cart items from localStorage along with a
 * merge strategy. The use case filters out unavailable products, applies
 * the strategy, and returns the resulting server cart.
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
    const validated = migrateGuestCartSchema.parse(body);

    const cartRepository = container.getCartRepository();
    const productRepository = container.getCartProductRepository();
    const outboxRepository = container.getOutboxRepository();
    const customizationLookup = container.getCustomizationLookup();

    const migrateGuestCart = new MigrateGuestCart(
      cartRepository,
      productRepository,
      outboxRepository,
      customizationLookup,
    );

    const result = await migrateGuestCart.execute({
      userId,
      guestItems: validated.guestItems,
      strategy: validated.strategy,
    });

    // Enrich the cart items with product display data.
    const productsModuleRepo = container.getProductRepository();
    const productIds = [
      ...new Set(result.cart.items.map((i) => i.productId.value)),
    ];
    const products = await Promise.all(
      productIds.map((id) => productsModuleRepo.findById(id, 'es')),
    );
    const productMap = new Map<string, ProductEntity>();
    products.forEach((p) => {
      if (p) productMap.set(p.id, p);
    });

    const allCustomizationIds = [
      ...new Set(result.cart.items.flatMap((i) => i.customizationIdList)),
    ];
    const allCustomizations =
      allCustomizationIds.length > 0
        ? await customizationLookup.findByIds(allCustomizationIds)
        : [];
    const customizationMap = new Map(allCustomizations.map((c) => [c.id, c]));

    const enrichedItems = result.cart.items.map((item) =>
      enrichCartItem(
        item,
        productMap.get(item.productId.value),
        item.customizationIdList
          .map((id) => customizationMap.get(id))
          .filter((c): c is CustomizationSnapshot => c != null),
      ),
    );

    return NextResponse.json(
      {
        cart: {
          id: result.cart.id,
          userId: result.cart.userId,
          status: result.cart.status,
          items: enrichedItems,
          createdAt: result.cart.createdAt.toISOString(),
          updatedAt: result.cart.updatedAt.toISOString(),
        },
        migratedCount: result.migratedCount,
        skippedProductIds: result.skippedProductIds,
        skippedCustomizationProductIds: result.skippedCustomizationProductIds,
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
