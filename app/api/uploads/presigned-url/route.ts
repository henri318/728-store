import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { CreateUploadUseCase } from '@/modules/uploads/application/create-upload-use-case';
import { presignedUrlSchema } from '@/modules/uploads/presentation/schemas/upload-schemas';

/**
 * POST /api/uploads/presigned-url
 * Creates a pending upload and returns a presigned URL for direct R2 upload.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = presignedUrlSchema.parse(await req.json());

    // Execute use case
    const uploadRepo = container.getUploadRepository();
    const storage = container.getStoragePort();
    const createUpload = new CreateUploadUseCase(uploadRepo, storage);

    const result = await createUpload.execute({
      userId,
      type: body.type,
      fileName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
