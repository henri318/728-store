import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { requireRole } from '@/shared/authorization/authorization';
import { handleApiError } from '@/shared/presentation/error-handler';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';
import { UpdateProductUseCase } from '@/modules/products/application/update-product-use-case';
import { serializeProduct } from '@/modules/products/presentation/product-response';

async function patchHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = productFormSchema.parse(await request.json());
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

    const product = await container
      .getProductRepository()
      .findById(id, body.locale);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.sellerId !== seller.sellerId.value) {
      return NextResponse.json(
        { error: 'You do not own this product' },
        { status: 403 },
      );
    }

    const useCase = new UpdateProductUseCase(
      container.getProductRepository(),
      container.getOutboxRepository(),
    );
    const updated = await useCase.execute({
      productId: id,
      sellerId: seller.sellerId.value,
      locale: body.locale,
      name: body.name,
      description: body.description,
      price: body.price,
      status: body.status,
      customizationConfig: body.customizationConfig,
    });

    return NextResponse.json(serializeProduct(updated), { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export const PATCH = requireRole('DESIGNER')(
  patchHandler as unknown as (
    req: NextRequest,
    context?: unknown,
  ) => Promise<NextResponse>,
);
