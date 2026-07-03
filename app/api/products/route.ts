import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { requireRole } from '@/shared/authorization/authorization';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';
import { CreateProductUseCase } from '@/modules/products/application/create-product-use-case';
import { serializeProduct } from '@/modules/products/presentation/product-response';

/**
 * GET /api/products
 * Public catalog endpoint. Returns a paginated list of products with optional
 * filters (q, category, tags) and locale-scoped text search.
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
    });

    const productRepository = container.getProductRepository();
    const useCase = new ProductListQueryUseCase(productRepository);
    const result = await useCase.execute(filter);

    const trimmedQ = filter.q?.trim() ?? '';
    if (trimmedQ.length > 0) {
      try {
        const session = await container.getSession().getSession();
        await container
          .getOutboxRepository()
          .saveEvent(GlobalEvents.PRODUCT_SEARCH_EXECUTED, {
            userId: session?.id ?? null,
            term: trimmedQ,
            locale: filter.lang,
            occurredAt: new Date().toISOString(),
          });
      } catch {
        // Search results must not fail if outbox persistence is unavailable.
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

async function postHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = productFormSchema.parse(await req.json());
    const session = await container.getSession().getSession();

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seller = await container
      .getSellerRepository()
      .findByUserId(session.id);
    if (!seller) {
      return NextResponse.json(
        { error: 'No seller account found for this user' },
        { status: 403 },
      );
    }

    const useCase = new CreateProductUseCase(
      container.getProductRepository(),
      container.getOutboxRepository(),
    );
    const created = await useCase.execute({
      sellerId: seller.sellerId.value,
      sellerName: seller.name,
      locale: body.locale,
      name: body.name,
      description: body.description,
      price: body.price,
      customizationConfig: body.customizationConfig,
      images: body.images,
    });

    return NextResponse.json(serializeProduct(created), { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export const POST = requireRole('DESIGNER')(
  postHandler as unknown as (req: NextRequest) => Promise<NextResponse>,
);
