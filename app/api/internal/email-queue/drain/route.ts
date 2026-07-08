import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { container } from '@/composition-root/container';
import { isTimingSafeEqual as timingSafeEqual } from '@/shared/lib/timing-safe-equal';

const drainQuerySchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * POST /api/internal/email-queue/drain
 * Protected internal endpoint for serverless/cron drain-and-retry operations.
 */
export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.INTERNAL_JOBS_SECRET;
    const providedSecret = req.headers.get('x-internal-jobs-secret');

    if (!configuredSecret || !providedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configuredSecretBuffer = Buffer.from(configuredSecret);
    const providedSecretBuffer = Buffer.from(providedSecret);

    if (
      configuredSecretBuffer.length !== providedSecretBuffer.length ||
      !timingSafeEqual(configuredSecretBuffer, providedSecretBuffer)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = drainQuerySchema.safeParse({
      batchSize: req.nextUrl.searchParams.get('batchSize') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid batchSize' }, { status: 400 });
    }

    const drainService = container.getEmailQueueDrainService();
    const result = await drainService.drain({
      batchSize: parsed.data.batchSize,
      source: 'http',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error('[InternalEmailQueueDrain]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
