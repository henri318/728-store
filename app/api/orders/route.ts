import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderUseCase, CreateOrderDTO, OrderLineItemInput, CustomizationInput } from '@/modules/orders/application/create-order-use-case';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/prisma-order-repository';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma-product-repository';
import { PrismaOutboxRepository } from '@/shared/infrastructure/prisma-outbox-repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { requireRole } from '@/shared/kernel/authorization';

// NOTE: This API route assumes that product data (basePrice) and sellerId are fetched correctly.
// It also assumes that image uploads would be handled separately (e.g., via a dedicated upload service).

// requireRole('client') handles authentication AND DB-verified role check.
// The session is re-fetched inside the handler for the userId needed by the use case.
export const POST = requireRole('client')(async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as NonNullable<typeof session>).user.id;

  try {
    // Parse form data for POST requests
    const formData = await request.formData();
    
    const productId = formData.get('productId') as string;
    const quantity = parseInt(formData.get('quantity') as string || '1', 10); // Default to 1 if not provided
    const customizationText = formData.get('customizationText') as string | null;
    const customizationColor = formData.get('customizationColor') as string | null;
    const customizationSize = formData.get('customizationSize') as string | null;
    const customizationImageFile = formData.get('customizationImage') as File | null;

    // Basic validation
    if (!productId || isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid product or quantity' }, { status: 400 });
    }

    // Construct the DTO for CreateOrderUseCase
    // The form submits one product at a time. So, items array will have one element.
    const createOrderDTO: CreateOrderDTO = {
      userId: userId,
      items: [
        {
          productId: productId,
          quantity: quantity,
          customization: {
            text: customizationText,
            color: customizationColor,
            size: customizationSize,
            // Placeholder for imageUrl. Actual image upload logic needs to be implemented.
            imageUrl: customizationImageFile ? '/path/to/uploaded/image.jpg' : null, 
          } as CustomizationInput, // Type assertion
        } as OrderLineItemInput, // Type assertion
      ],
    };

    // Instantiate dependencies (use actual implementations for API routes)
    // Ensure these repositories are correctly configured and available.
    const orderRepository = new PrismaOrderRepository(); // Use Prisma for live API
    const productRepository = new PrismaProductRepository();
    const outboxRepository = new PrismaOutboxRepository();

    const createOrderUseCase = new CreateOrderUseCase(
      orderRepository,
      productRepository,
      outboxRepository
    );

    const newOrder = await createOrderUseCase.execute(createOrderDTO);

    // Respond with the created order.
    // A more complete flow might redirect to a success page or order confirmation.
    return NextResponse.json(newOrder, { status: 201 });

  } catch (error: any) {
    console.error('Error creating order:', error);
    
    // Handle specific errors (generic messages only)
    if (error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Generic error response
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
});
