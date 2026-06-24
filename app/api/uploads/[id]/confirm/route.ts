import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { ConfirmUploadUseCase } from '@/modules/uploads/application/confirm-upload-use-case';

/**
 * POST /api/uploads/[id]/confirm
 * Marks an upload as CONFIRMED and emits file.uploaded event.
 */
export async function POST(
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
    const outboxRepo = container.getOutboxRepository();
    const txRunner = container.getTransactionRunner();
    const confirmUpload = new ConfirmUploadUseCase(
      uploadRepo,
      outboxRepo,
      txRunner,
    );

    const result = await confirmUpload.execute(id);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
