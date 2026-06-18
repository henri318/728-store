import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderUseCase, CreateOrderDTO, OrderLineItemInput, CustomizationInput } from '@/modules/orders/application/create-order-use-case';
import { OrderProductRepositoryAdapter } from '@/modules/orders/infrastructure/product-repository-adapter';
import { container } from '@/composition-root/container';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { requireRole } from '@/shared/authorization/authorization';
import { createOrderFormSchema } from '@/modules/orders/presentation/schemas/order-schemas';
import { handleApiError } from '@/shared/presentation/error-handler';

// NOTE: This API route assumes that product data (basePrice) and sellerId are fetched correctly.
// It also assumes that image uploads would be handled separately (e.g., via a dedicated upload service).

// requireRole('CUSTOMER') handles authentication AND DB-verified role check.
// The session is re-fetched inside the handler for the userId needed by the use case.
export const POST = requireRole('CUSTOMER')(async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  // Our auth configuration attaches `id` to the session user.
  const userId = (session?.user as { id: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse form data for POST requests
    const formData = await request.formData();

    // Validate with zod before constructing DTO
    const validated = createOrderFormSchema.parse({
      productId: formData.get('productId') as string | null,
      quantity: formData.get('quantity') as string | null,
      customizationText: formData.get('customizationText') as string | null,
      customizationColor: formData.get('customizationColor') as string | null,
      customizationSize: formData.get('customizationSize') as string | null,
    });

    const { productId, quantity, customizationText, customizationColor, customizationSize } = validated;
    const customizationImageFile = formData.get('customizationImage') as File | null;

    // Construct the DTO for CreateOrderUseCase
    // The form submits one product at a time. So, items array will have one element.
    const customizationInput: CustomizationInput = {
      text: customizationText,
      color: customizationColor,
      size: customizationSize,
      imageUrl: customizationImageFile ? '' : null,
    };

    const orderLineItemInput: OrderLineItemInput = {
      productId: productId,
      quantity: quantity,
      customization: customizationInput,
    };

    const createOrderDTO: CreateOrderDTO = {
      userId: userId,
      items: [orderLineItemInput],
    };

    // Resolve dependencies from the container — no direct infrastructure imports
    const orderRepository = container.getOrderRepository();
    const productRepository = new OrderProductRepositoryAdapter(container.getProductRepository());
    const outboxRepository = container.getOutboxRepository();

    const createOrderUseCase = new CreateOrderUseCase(
      orderRepository,
      productRepository,
      outboxRepository
    );

    const newOrder = await createOrderUseCase.execute(createOrderDTO);

    // Respond with the created order.
    // A more complete flow might redirect to a success page or order confirmation.
    return NextResponse.json(newOrder, { status: 201 });

  } catch (error: unknown) {
    return handleApiError(error);
  }
});
