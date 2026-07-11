import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { ConfirmUploadUseCase } from '@/modules/uploads/application/confirm-upload-use-case';
import { getSessionUserContext } from '@/shared/authorization/session-user-context';

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
    const session = await getSessionUserContext();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.userId;
    const isAdmin = session.role === 'ADMIN';

    // Execute use case
    const uploadRepo = container.getUploadRepository();
    const outboxRepo = container.getOutboxRepository();
    const txRunner = container.getTransactionRunner();
    const confirmUpload = new ConfirmUploadUseCase(
      uploadRepo,
      outboxRepo,
      txRunner,
    );

    const result = await confirmUpload.execute(id, userId, isAdmin);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
