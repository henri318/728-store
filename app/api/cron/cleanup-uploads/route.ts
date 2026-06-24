import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { CleanupUploadsUseCase } from '@/modules/uploads/application/cleanup-uploads-use-case';

/**
 * GET /api/cron/cleanup-uploads
 * Runs orphan cleanup for pending uploads older than 24 hours.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute cleanup
    const uploadRepo = container.getUploadRepository();
    const storage = container.getStoragePort();
    const cleanup = new CleanupUploadsUseCase(uploadRepo, storage);

    const result = await cleanup.execute();

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('[CronCleanupUploads]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
