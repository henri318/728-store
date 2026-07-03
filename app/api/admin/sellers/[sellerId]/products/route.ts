import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { requireRole } from '@/shared/authorization/authorization';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';

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
    const params = request.nextUrl.searchParams;
    const filter = productListQuerySchema.parse({
      page: params.get('page') ?? undefined,
      pageSize: params.get('pageSize') ?? undefined,
      q: params.get('q') ?? undefined,
      lang: params.get('lang') ?? params.get('locale') ?? undefined,
      sortBy: params.get('sortBy') ?? undefined,
      sortDir: params.get('sortDir') ?? undefined,
      sellerId,
    });

    const productRepository = container.getProductRepository();
    const useCase = new ProductListQueryUseCase(productRepository);
    const result = await useCase.execute({ ...filter, audience: 'admin' });

    return NextResponse.json(
      {
        ...result,
        items: result.items.map((product) => ({
          id: product.id,
          name: product.translations[0]?.name ?? 'Untranslated',
          status: product.status,
          basePrice: {
            amount: product.basePrice.amount,
            currency: product.basePrice.currency,
          },
          updatedAt: product.updatedAt.toISOString(),
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
