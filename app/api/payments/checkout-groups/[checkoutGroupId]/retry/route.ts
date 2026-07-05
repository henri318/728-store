import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { requireRole } from '@/shared/authorization/authorization';
import { handleApiError } from '@/shared/presentation/error-handler';
import { RetryCheckoutGroupPayment } from '@/modules/payments/application/retry-checkout-group-payment';
import { container } from '@/composition-root/container';

export const POST = requireRole('CUSTOMER')(async function POST(
  _request: NextRequest,
  context: unknown,
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkoutGroupId } = await (
      context as {
        params: Promise<{ checkoutGroupId: string }>;
      }
    ).params;
    const lookup = container.getCheckoutGroupLookup();
    const paymentPort = container.getCheckoutGroupPaymentPort();

    const useCase = new RetryCheckoutGroupPayment(lookup, paymentPort);
    const result = await useCase.execute(checkoutGroupId, userId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});
