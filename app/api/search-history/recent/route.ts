import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GetRecentSearchesUseCase } from '@/modules/search-history/application/get-recent-searches-use-case';

/**
 * GET /api/search-history/recent
 *
 * Returns up to 5 most-recent distinct search terms for the
 * authenticated user. Guests receive 401 — there is no fallback to
 * browser storage. v1 spec.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await container.getSession().getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const locale = req.nextUrl.searchParams.get('locale') ?? 'es';

    const useCase = new GetRecentSearchesUseCase(
      container.getSearchHistoryRepository(),
    );
    const entries = await useCase.execute({
      userId: session.id,
      locale,
    });

    return NextResponse.json(
      {
        items: entries.map((e) => ({
          term: e.term,
          searchedAt: e.searchedAt.toISOString(),
        })),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
