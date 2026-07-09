import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { requireRole } from '@/shared/authorization/authorization';
import { deleteCategoryParamsSchema } from '@/modules/products/presentation/schemas/category-schemas';
import { DeleteCategoryUseCase } from '@/modules/products/application/delete-category-use-case';

async function deleteHandler(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const params = deleteCategoryParamsSchema.parse({ id });
    const useCase = new DeleteCategoryUseCase(
      container.getCategoryRepository(),
    );

    await useCase.execute({ id: params.id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export const DELETE = requireRole('ADMIN')(
  deleteHandler as unknown as (
    req: NextRequest,
    context?: unknown,
  ) => Promise<NextResponse>,
);
