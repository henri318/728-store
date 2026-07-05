import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import {
  canTransitionOrderStatus,
  ORDER_LIFECYCLE_STATUSES,
  type OrderLifecycleStatus,
} from '@/modules/orders/domain/value-objects/order-lifecycle';

async function readStatus(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    return typeof body.status === 'string' ? body.status : null;
  }

  const formData = await request.formData();
  const status = formData.get('status');
  return typeof status === 'string' ? status : null;
}

export const POST = requireRole('DESIGNER')(async function POST(
  request: NextRequest,
  context: unknown,
) {
  try {
    const { orderId } = await (
      context as { params: Promise<{ orderId: string }> }
    ).params;
    const status = await readStatus(request);
    if (!status || (status !== 'in_progress' && status !== 'completed')) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const orderRepository = container.getOrderRepository();
    const order = await orderRepository.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const sellerId = await getCurrentSellerId();
    if (!sellerId || order.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!isOrderLifecycleStatus(order.status)) {
      return NextResponse.json(
        { error: 'Invalid transition' },
        { status: 409 },
      );
    }

    if (!canTransitionOrderStatus(order.status, status)) {
      return NextResponse.json(
        { error: 'Invalid transition' },
        { status: 409 },
      );
    }

    await orderRepository.updateStatus(orderId, status);
    return NextResponse.json({ orderId, status }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

async function getCurrentSellerId(): Promise<string | null> {
  const session = await container.getSession().getSession();
  if (!session?.id) return null;

  const seller = await container.getSellerRepository().findByUserId(session.id);
  return seller?.sellerId.value ?? null;
}

function isOrderLifecycleStatus(value: string): value is OrderLifecycleStatus {
  return (
    value === ORDER_LIFECYCLE_STATUSES.NEW ||
    value === ORDER_LIFECYCLE_STATUSES.IN_PROGRESS ||
    value === ORDER_LIFECYCLE_STATUSES.COMPLETED
  );
}
