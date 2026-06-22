import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { ChangeSellerStatusUseCase } from '@/modules/sellers/application/use-cases/change-seller-status-use-case';
import { changeSellerStatusSchema } from '@/modules/sellers/presentation/schemas/seller-schemas';
import { requireRole } from '@/shared/authorization/authorization';

/**
 * Internal handler — receives the `context` typed as `unknown` so it
 * matches the wrapper's `RouteHandler` signature. The cast inside the
 * handler is safe because Next.js always passes the same shape.
 */
async function patchHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const body = changeSellerStatusSchema.parse(await request.json());

    const sellerRepository = container.getSellerRepository();
    const outboxRepository = container.getOutboxRepository();
    const transactionRunner = container.getTransactionRunner();
    const useCase = new ChangeSellerStatusUseCase(
      sellerRepository,
      outboxRepository,
      transactionRunner,
    );

    const updated = await useCase.execute({
      sellerId: id,
      status: body.status,
    });

    return NextResponse.json(
      {
        id: updated.sellerId.value,
        name: updated.name,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/sellers/[id]/status
 * Admin-only. Transitions a seller to a new status.
 *
 * requireRole('ADMIN') performs:
 *   1. 401 if no session
 *   2. DB-verified role check (re-checks role from DB, not from JWT)
 *   3. 403 if role is not ADMIN
 */
export const PATCH = requireRole('ADMIN')(
  patchHandler as unknown as (
    req: NextRequest,
    context?: unknown,
  ) => Promise<NextResponse>,
);
