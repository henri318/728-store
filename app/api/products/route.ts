import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';

/**
 * GET /api/products
 *
 * Public catalog endpoint. Returns a paginated list of products with
 * optional filters (q, category, tags) and locale-scoped text search.
 *
 * Audience contract:
 *  - `audience=public` → only ACTIVE products; default pageSize 10.
 *  - `audience=seller` → own catalog, all statuses (legacy default).
 *  - `audience=admin`  → every product, every status.
 *
 * For `audience=public` with a non-empty `q`, a PRODUCT_SEARCH_EXECUTED
 * event is emitted via the outbox. The search-history module
 * subscribes to it and persists the term for authenticated users only.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const params = req.nextUrl.searchParams;

    const filter = productListQuerySchema.parse({
      page: params.get('page') ?? undefined,
      pageSize: params.get('pageSize') ?? undefined,
      q: params.get('q') ?? undefined,
      category: params.get('category') ?? undefined,
      tags: params.get('tags') ?? undefined,
      lang: params.get('lang') ?? undefined,
      sortBy: params.get('sortBy') ?? undefined,
      sortDir: params.get('sortDir') ?? undefined,
      sellerId: params.get('sellerId') ?? undefined,
      audience: params.get('audience') ?? undefined,
    });

    const productRepository = container.getProductRepository();
    // Outbox is only wired for public-audience searches (events are a
    // no-op for other audiences). We read the current session user so
    // the event payload can carry `userId: null` for guests.
    const session = await container.getSession().getSession();
    const useCase = new ProductListQueryUseCase(
      productRepository,
      container.getOutboxRepository(),
    );
    const result = await useCase.execute({
      ...filter,
      userId: session?.id ?? null,
    });

    // Map items to a client-safe JSON shape: ProductPrice serializes
    // as { money: { amount, currency } } via JSON.stringify, but the
    // client expects { amount, currency, formattedPrice }. We also
    // pre-format the price string so no function crosses the boundary.
    const mapped = {
      ...result,
      items: result.items.map((product) => ({
        id: product.id,
        basePrice: {
          amount: product.basePrice.amount,
          currency: product.basePrice.currency,
          formattedPrice: product.basePrice.format(),
        },
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        translations: product.translations,
        images: product.images,
        tags: product.tags,
        category: product.category,
        categoryId: product.categoryId,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
    };

    return NextResponse.json(mapped, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
