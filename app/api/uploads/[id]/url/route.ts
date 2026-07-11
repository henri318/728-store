import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GenerateReadUrlUseCase } from '@/modules/uploads/application/generate-read-url-use-case';
import { readUrlSchema } from '@/modules/uploads/presentation/schemas/upload-schemas';
import { getSessionUserContext } from '@/shared/authorization/session-user-context';

/**
 * GET /api/uploads/[id]/url
 * Generates a presigned read URL for the upload.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    // Auth check
    const session = await getSessionUserContext();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.userId;
    const isAdmin = session.role === 'ADMIN';

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const parsed = readUrlSchema.parse(query);

    // Execute use case
    const uploadRepo = container.getUploadRepository();
    const storage = container.getStoragePort();
    const generateReadUrl = new GenerateReadUrlUseCase(uploadRepo, storage);

    const result = await generateReadUrl.execute(
      id,
      parsed.expires,
      userId,
      isAdmin,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
