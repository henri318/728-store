import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { AdminListSellerProductsUseCase } from '@/modules/products/application/admin-list-seller-products-use-case';
import { requireRole } from '@/shared/authorization/authorization';

/**
 * Internal handler — receives the `context` typed as `unknown` so it
 * matches the wrapper's `RouteHandler` signature. The cast inside the
 * handler is safe because Next.js always passes the same shape.
 */
async function getHandler(
  request: NextRequest,
  context: { params: Promise<{ sellerId: string }> },
): Promise<NextResponse> {
  try {
    const { sellerId } = await context.params;
    const locale = request.nextUrl.searchParams.get('locale') ?? 'es';

    const productRepository = container.getProductRepository();
    const useCase = new AdminListSellerProductsUseCase(productRepository);
    const products = await useCase.execute({ sellerId, locale });

    return NextResponse.json(
      {
        products: products.map((p) => ({
          id: p.id,
          name: p.translations[0]?.name ?? 'Untranslated',
          status: p.status,
          basePrice: p.basePrice.amount,
          updatedAt: p.updatedAt.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/sellers/[sellerId]/products
 * Admin-only. Returns the list of products for a specific seller.
 * Optional ?locale=es|cat query param (defaults to 'es').
 *
 * requireRole('ADMIN') performs:
 *   1. 401 if no session
 *   2. DB-verified role check (re-checks role from DB, not from JWT)
 *   3. 403 if role is not ADMIN
 */
export const GET = requireRole('ADMIN')(
  getHandler as unknown as (
    req: NextRequest,
    context?: unknown,
  ) => Promise<NextResponse>,
);
