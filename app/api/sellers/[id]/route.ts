import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GetSellerUseCase } from '@/modules/sellers/application/use-cases/get-seller-use-case';
import { UpdateSellerUseCase } from '@/modules/sellers/application/use-cases/update-seller-use-case';
import { DeleteSellerUseCase } from '@/modules/sellers/application/use-cases/delete-seller-use-case';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import { updateSellerSchema } from '@/modules/sellers/presentation/schemas/seller-schemas';

/** Shape returned for any seller in JSON responses. */
function toSellerResponse(seller: {
  sellerId: { value: string };
  name: string;
  description: string | null;
  userId: string;
  status: SellerStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: seller.sellerId.value,
    name: seller.name,
    description: seller.description,
    userId: seller.userId,
    status: seller.status,
    createdAt: seller.createdAt.toISOString(),
    updatedAt: seller.updatedAt.toISOString(),
  };
}

/**
 * GET /api/sellers/[id]
 * Public for active sellers.
 * Admin can see any seller (including banned).
 * Banned / soft-deleted sellers are hidden from non-admin callers.
 */

/**
 * GET /api/sellers/[id]
 * Public for active sellers.
 * Admin can see any seller (including banned).
 * Banned / soft-deleted sellers are hidden from non-admin callers.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const sellerRepository = container.getSellerRepository();
    const getSeller = new GetSellerUseCase(sellerRepository);
    const seller = await getSeller.execute({ sellerId: id });

    // Visibility check: banned or soft-deleted are hidden from non-admin
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    const isAdmin = role === 'ADMIN';

    if (seller.deletedAt && !isAdmin) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }
    if (seller.status === SellerStatus.BANNED && !isAdmin) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json(toSellerResponse(seller), { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/sellers/[id]
 * Admin OR the seller themselves can update.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    // Auth check FIRST — 401 must come before any 404
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string } | undefined)?.id;
    const role = (session.user as { role?: string } | undefined)?.role;

    // Load seller
    const sellerRepository = container.getSellerRepository();
    const existing = await sellerRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    if (role !== 'ADMIN' && userId !== existing.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = updateSellerSchema.parse(await req.json());

    const outboxRepository = container.getOutboxRepository();
    const updateSeller = new UpdateSellerUseCase(
      sellerRepository,
      outboxRepository,
    );
    const updated = await updateSeller.execute({
      sellerId: id,
      name: body.name,
      description: body.description ?? undefined,
    });

    return NextResponse.json(toSellerResponse(updated), { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/sellers/[id]
 * Admin OR the seller themselves can soft-delete.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    // Auth check FIRST — 401 must come before any 404
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string } | undefined)?.id;
    const role = (session.user as { role?: string } | undefined)?.role;

    const sellerRepository = container.getSellerRepository();
    const existing = await sellerRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    if (role !== 'ADMIN' && userId !== existing.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const outboxRepository = container.getOutboxRepository();
    const deleteSeller = new DeleteSellerUseCase(
      sellerRepository,
      outboxRepository,
    );
    const result = await deleteSeller.execute({ sellerId: id });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
