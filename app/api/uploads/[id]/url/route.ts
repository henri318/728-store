import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GenerateReadUrlUseCase } from '@/modules/uploads/application/generate-read-url-use-case';
import { readUrlSchema } from '@/modules/uploads/presentation/schemas/upload-schemas';

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const parsed = readUrlSchema.parse(query);

    // Execute use case
    const uploadRepo = container.getUploadRepository();
    const storage = container.getStoragePort();
    const generateReadUrl = new GenerateReadUrlUseCase(uploadRepo, storage);

    const result = await generateReadUrl.execute(id, parsed.expires);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
