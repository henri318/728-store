import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GetUploadUseCase } from '@/modules/uploads/application/get-upload-use-case';
import { DeleteUploadUseCase } from '@/modules/uploads/application/delete-upload-use-case';

/**
 * GET /api/uploads/[id]
 * Returns upload metadata.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute use case
    const uploadRepo = container.getUploadRepository();
    const getUpload = new GetUploadUseCase(uploadRepo);
    const upload = await getUpload.execute(id);

    return NextResponse.json(
      {
        id: upload.id,
        fileName: upload.fileName,
        storageKey: upload.storageKey,
        mimeType: upload.mimeType,
        size: upload.size,
        uploadedBy: upload.uploadedBy,
        type: upload.type,
        status: upload.status,
        createdAt: upload.createdAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/uploads/[id]
 * Removes upload metadata and R2 object. Owner or admin only.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    const role = (session.user as { role?: string })?.role;
    const isAdmin = role === 'ADMIN';

    // Execute use case
    const uploadRepo = container.getUploadRepository();
    const storage = container.getStoragePort();
    const outboxRepo = container.getOutboxRepository();
    const txRunner = container.getTransactionRunner();
    const deleteUpload = new DeleteUploadUseCase(
      uploadRepo,
      storage,
      outboxRepo,
      txRunner,
    );

    await deleteUpload.execute(id, userId!, isAdmin);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
