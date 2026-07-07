import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { CreateCustomization } from '@/modules/customizations/application/create-customization';
import { toCustomizationResponse } from '@/modules/customizations/presentation/to-customization-response';
import { createCustomizationSchema } from '@/modules/customizations/presentation/schemas/customization-schemas';
import {
  getCurrentSellerId,
  parseBody,
} from '@/shared/presentation/route-helpers';

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
        items: customizations.map((c) => toCustomizationResponse(c)),
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

    const body = await parseBody(request, createCustomizationSchema);
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
