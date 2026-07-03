import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { CreateUploadUseCase } from '@/modules/uploads/application/create-upload-use-case';
import { guestPresignedUrlSchema } from '@/modules/uploads/presentation/schemas/upload-schemas';
import { UploadType } from '@/modules/uploads/domain/value-objects/upload-type';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const deviceHash = getGuestDeviceHash(req, ip);
    const rateLimiter = container.getRateLimiter();
    const rateCheck = await rateLimiter.checkRateLimit(deviceHash, ip);
    if (rateCheck.blocked) {
      const headers = new Headers();
      if (rateCheck.retryAfterSeconds) {
        headers.set('Retry-After', String(rateCheck.retryAfterSeconds));
      }

      return NextResponse.json(
        {
          error:
            rateCheck.reason === 'ip'
              ? 'Guest upload rate limited by IP'
              : 'Guest upload rate limited',
        },
        { status: 429, headers },
      );
    }

    const body = guestPresignedUrlSchema.parse(await req.json());
    const guestUserId = `guest:${deviceHash}`;
    const createUpload = new CreateUploadUseCase(
      container.getUploadRepository(),
      container.getStoragePort(),
    );

    const result = await createUpload.execute({
      userId: guestUserId,
      type: UploadType.customization,
      fileName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
    });

    await rateLimiter.recordLoginAttempt(deviceHash, ip, true);

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '0.0.0.0';
  }

  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

function getGuestDeviceHash(req: NextRequest, ip: string): string {
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const acceptLanguage = req.headers.get('accept-language') ?? 'unknown';

  return createHash('sha256')
    .update(`${ip}|${userAgent}|${acceptLanguage}`)
    .digest('hex')
    .slice(0, 32);
}
