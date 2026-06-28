import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { ListSellersUseCase } from '@/modules/sellers/application/use-cases/list-sellers-use-case';
import { CreateSellerWithUserUseCase } from '@/modules/sellers/application/use-cases/create-seller-with-user-use-case';
import { SellerStatus } from '@/modules/sellers/domain/seller-status';
import {
  createSellerSchema,
  listSellersQuerySchema,
} from '@/modules/sellers/presentation/schemas/seller-schemas';
import { requireRole } from '@/shared/authorization/authorization';

/**
 * GET /api/sellers
 * Admin-only. Returns the list of sellers.
 * Optional ?status=active|suspended|banned filter.
 *
 * requireRole('ADMIN') performs:
 *   1. 401 if no session
 *   2. DB-verified role check (re-checks role from DB, not from JWT)
 *   3. 403 if role is not ADMIN
 */
export const GET = requireRole('ADMIN')(async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filter = listSellersQuerySchema.parse({
      status: params.get('status') ?? undefined,
      page: params.get('page') ?? undefined,
      pageSize: params.get('pageSize') ?? undefined,
      q: params.get('q') ?? undefined,
      sortBy: params.get('sortBy') ?? undefined,
      sortDir: params.get('sortDir') ?? undefined,
    });

    const sellerRepository = container.getSellerRepository();
    const useCase = new ListSellersUseCase(sellerRepository);
    const result = await useCase.execute(filter);

    return NextResponse.json(
      {
        items: result.items.map(toSellerResponse),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

/**
 * POST /api/sellers
 * Admin-only. Atomically creates a new user (SELLER role) and a seller
 * profile in a single Prisma transaction via CreateSellerWithUserUseCase.
 *
 * requireRole('ADMIN') performs:
 *   1. 401 if no session
 *   2. DB-verified role check (re-checks role from DB, not from JWT)
 *   3. 403 if role is not ADMIN
 */
export const POST = requireRole('ADMIN')(async function POST(req: NextRequest) {
  try {
    const body = createSellerSchema.parse(await req.json());

    const useCase = new CreateSellerWithUserUseCase(
      container.getUserRepository(),
      container.getSellerRepository(),
      container.getOutboxRepository(),
      container.getPasswordHasher(),
      container.getTransactionRunner(),
    );

    const seller = await useCase.execute({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      name: body.name,
      description: body.description,
    });

    return NextResponse.json(toSellerResponse(seller), { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

/** Convert a SellerEntity to a JSON-friendly shape. */
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
