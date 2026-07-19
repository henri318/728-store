import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { GenerateReadUrlUseCase } from '@/modules/uploads/application/generate-read-url-use-case';
import { getSessionUserContext } from '@/shared/authorization/session-user-context';
import { handleApiError } from '@/shared/presentation/error-handler';

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ orderId: string; customizationId: string }>;
  },
) {
  try {
    const session = await getSessionUserContext();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, customizationId } = await context.params;
    const order = await container.getOrderRepository().findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isCustomer = order.userId === session.userId;
    const seller = isCustomer
      ? null
      : await container.getSellerLookup().findByUserId(session.userId);
    const isSeller = seller?.sellerId === order.sellerId;
    const isAdmin = session.role === 'ADMIN';
    if (!isCustomer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const customization = order.lineItems
      ?.flatMap((item) => item.customizationSnapshot ?? [])
      .find((snapshot) => snapshot.id === customizationId);
    if (!customization?.imageUploadId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // The order authorization above permits the seller; the upload remains
    // owned by the buyer, so preserve that ownership check when signing.
    const readUrl = await new GenerateReadUrlUseCase(
      container.getUploadRepository(),
      container.getStoragePort(),
    ).execute(customization.imageUploadId, undefined, order.userId);
    const sourceUrl = new URL(readUrl.url, request.nextUrl.origin);
    const source = await fetch(sourceUrl);
    if (!source.ok || !source.body) {
      return NextResponse.json(
        { error: 'Download unavailable' },
        { status: 502 },
      );
    }

    const filename = sourceUrl.pathname.split('/').at(-1) ?? 'design';
    return new NextResponse(source.body, {
      headers: {
        'Content-Type':
          source.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename.replaceAll('"', '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
