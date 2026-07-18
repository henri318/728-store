import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { AddItemToCart } from '@/modules/cart/application/add-item-to-cart';
import { addItemSchema } from '@/modules/cart/presentation/schemas/cart-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';
import { enrichCartItem } from '@/modules/cart/presentation/enrich-cart-item';
import {
  getAuthenticatedUserId,
  parseBody,
} from '@/shared/presentation/route-helpers';

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
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const validated = await parseBody(request, addItemSchema);

    const cartRepository = container.getCartRepository();
    const productRepository = container.getCartProductRepository();
    const outboxRepository = container.getOutboxRepository();
    const customizationLookup = container.getCustomizationLookup();
    const transactionRunner = container.getTransactionRunner();
    const customizationCreator = container.getCustomerCustomizationCreator();

    const addItemToCart = new AddItemToCart(
      cartRepository,
      productRepository,
      outboxRepository,
      customizationLookup,
      transactionRunner,
      customizationCreator,
    );

    const item = await addItemToCart.execute({
      userId,
      productId: validated.productId,
      quantity: validated.quantity,
      customizationIdList: validated.customizationIdList,
      customization: validated.customization,
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

    const enriched = enrichCartItem(
      item,
      product ?? undefined,
      customizations,
      'es',
    );

    return NextResponse.json(enriched, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});
