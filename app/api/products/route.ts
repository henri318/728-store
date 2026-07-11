import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { ProductListQueryUseCase } from '@/modules/products/application/product-list-query-use-case';
import { CreateProductUseCase } from '@/modules/products/application/create-product-use-case';
import { productListQuerySchema } from '@/modules/products/presentation/schemas/product-list-query-schema';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';
import { serializeProduct } from '@/modules/products/presentation/product-response';
import type { ProductAudience } from '@/modules/products/domain/product-repository';

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
    const session = await container.getSession().getSession();

    // Derive audience from the authenticated user's role (SEC-01).
    // Role is verified from the database — never trust the JWT.
    let audience: ProductAudience;
    let effectiveSellerId = filter.sellerId;

    if (session?.id) {
      const user = await container.getUserLookup().findById(session.id);

      if (user?.role === 'DESIGNER') {
        audience = 'seller';
        const seller = await container
          .getSellerRepository()
          .findByUserId(session.id);
        effectiveSellerId = seller?.sellerId.value;
      } else if (user?.role === 'ADMIN') {
        audience = filter.audience ?? 'admin';
      } else {
        // CUSTOMER, unknown role, or user not found — public access.
        audience = 'public';
        effectiveSellerId = undefined;
      }
    } else {
      audience = 'public';
    }

    const useCase = new ProductListQueryUseCase(
      productRepository,
      container.getOutboxRepository(),
    );

    const result = await useCase.execute({
      ...filter,
      sellerId: effectiveSellerId,
      audience,
      userId: session?.id ?? null,
    });

    const mapped = {
      ...result,
      items: result.items.map((product) => {
        const serialized = serializeProduct(product, {
          publicView: audience === 'public',
          listingView: true,
        });

        return {
          ...serialized,
          basePrice: {
            ...serialized.basePrice,
            formattedPrice: product.basePrice.format(),
          },
        };
      }),
    };

    return NextResponse.json(mapped, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export const POST = requireRole('DESIGNER')(async function POST(
  request: NextRequest,
) {
  try {
    const rawBody = await request.json();
    const body = productFormSchema.parse(rawBody);
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

    const product = await useCase.execute({
      sellerId: seller.sellerId.value,
      sellerName: seller.name,
      locale: body.locale,
      name: body.name,
      description: body.description,
      price: body.price,
      translation: body.translation,
      translations: body.translations,
      customizationConfig: body.customizationConfig,
      images: body.images,
    });

    return NextResponse.json(serializeProduct(product), { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});
