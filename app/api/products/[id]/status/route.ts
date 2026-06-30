import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { requireRole } from '@/shared/authorization/authorization';
import { handleApiError } from '@/shared/presentation/error-handler';
import { changeProductStatusSchema } from '@/modules/products/presentation/schemas/change-product-status-schema';
import { ChangeProductStatusUseCase } from '@/modules/products/application/change-product-status-use-case';

async function patchHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = changeProductStatusSchema.parse(await request.json());

    const session = await container.getSession().getSession();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await container.getUserLookup().findById(session.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN';
    const sellerId = await getCurrentSellerId();

    // ADMIN can manage any product; DESIGNER can only manage their own
    if (!isAdmin && !sellerId) {
      return NextResponse.json(
        { error: 'No seller account found for this user' },
        { status: 403 },
      );
    }

    const product = await container.getProductRepository().findById(id, 'es');
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // DESIGNER must own the product; ADMIN can manage any
    if (!isAdmin && product.sellerId !== sellerId) {
      return NextResponse.json(
        { error: 'You do not own this product' },
        { status: 403 },
      );
    }

    const useCase = new ChangeProductStatusUseCase(
      container.getProductRepository(),
    );
    const updated = await useCase.execute({
      productId: id,
      sellerId: product.sellerId, // Use the product's sellerId, not the current user's
      status: body.status,
    });

    return NextResponse.json(
      {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export const PATCH = requireRole(
  'DESIGNER',
  'ADMIN',
)(
  patchHandler as unknown as (
    req: NextRequest,
    context?: unknown,
  ) => Promise<NextResponse>,
);

async function getCurrentSellerId(): Promise<string | null> {
  const session = await container.getSession().getSession();
  if (!session?.id) return null;

  const seller = await container.getSellerRepository().findByUserId(session.id);
  return seller?.sellerId.value ?? null;
}
