import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { requireRole } from '@/shared/authorization/authorization';
import { createCategorySchema } from '@/modules/products/presentation/schemas/category-schemas';
import { ListCategoriesUseCase } from '@/modules/products/application/list-categories-use-case';
import { CreateCategoryUseCase } from '@/modules/products/application/create-category-use-case';

export const GET = requireRole('ADMIN')(async function GET(req: NextRequest) {
  try {
    const useCase = new ListCategoriesUseCase(
      container.getCategoryRepository(),
    );
    const locale =
      req.nextUrl.searchParams.get('locale') === 'cat' ? 'cat' : 'es';
    const items = await useCase.execute(locale);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

export const POST = requireRole('ADMIN')(async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const body = createCategorySchema.parse(rawBody);
    const useCase = new CreateCategoryUseCase(
      container.getCategoryRepository(),
    );
    const category = await useCase.execute(body);

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});
