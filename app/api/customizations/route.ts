import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { CreateCustomization } from '@/modules/customizations/application/create-customization';
import {
  createCustomizationSchema,
  customizationResponseSchema,
} from '@/modules/customizations/presentation/schemas/customization-schemas';

export const GET = requireRole('DESIGNER')(async function GET() {
  try {
    const sellerId = await getCurrentSellerId();
    if (!sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customizations = await container
      .getCustomizationRepository()
      .findBySellerId(sellerId);

    return NextResponse.json(
      {
        items: customizations.map(toCustomizationResponse),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

export const POST = requireRole('DESIGNER')(async function POST(
  request: NextRequest,
) {
  try {
    const sellerId = await getCurrentSellerId();
    if (!sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = createCustomizationSchema.parse(await request.json());
    const productRepository = container.getProductRepository();
    const product = await productRepository.findById(body.productId, 'es');
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (product.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const useCase = new CreateCustomization(
      container.getCustomizationRepository(),
      {
        exists: async (productId: string) =>
          (await productRepository.findById(productId, 'es')) !== null,
      },
    );

    const customization = await useCase.execute(body);

    return NextResponse.json(toCustomizationResponse(customization), {
      status: 201,
    });
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

function toCustomizationResponse(customization: {
  id: string;
  productId: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  createdAt: Date;
}) {
  return customizationResponseSchema.parse({
    id: customization.id,
    productId: customization.productId,
    text: customization.text,
    color: customization.color,
    size: customization.size,
    imageUrl: customization.imageUrl,
    createdAt: customization.createdAt.toISOString(),
  });
}
