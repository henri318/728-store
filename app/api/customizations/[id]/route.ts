import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { GetCustomizationById } from '@/modules/customizations/application/get-customization-by-id';
import { UpdateCustomization } from '@/modules/customizations/application/update-customization';
import { DeleteCustomization } from '@/modules/customizations/application/delete-customization';
import {
  updateCustomizationSchema,
  customizationResponseSchema,
} from '@/modules/customizations/presentation/schemas/customization-schemas';

export const GET = requireRole('DESIGNER')(async function GET(
  _request: NextRequest,
  context?: unknown,
) {
  try {
    const sellerId = await getCurrentSellerId();
    if (!sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;
    const customization = await new GetCustomizationById(
      container.getCustomizationRepository(),
    ).execute({ id });

    if (!customization) {
      return NextResponse.json(
        { error: 'Customization not found' },
        { status: 404 },
      );
    }

    const product = await container
      .getProductRepository()
      .findById(customization.productId, 'es');
    if (!product) {
      // If the product was deleted, the customization cannot be rendered, so treat it as not found.
      return NextResponse.json(
        { error: 'Customization not found' },
        { status: 404 },
      );
    }
    if (product.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(toCustomizationResponse(customization), {
      status: 200,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

export const PATCH = requireRole('DESIGNER')(async function PATCH(
  request: NextRequest,
  context?: unknown,
) {
  try {
    const sellerId = await getCurrentSellerId();
    if (!sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;
    const body = updateCustomizationSchema.parse(await request.json());

    const customizationRepository = container.getCustomizationRepository();
    const productRepository = container.getProductRepository();
    const useCase = new UpdateCustomization(customizationRepository, {
      getSellerIdForCustomization: async (customizationId: string) => {
        const customization =
          await customizationRepository.findById(customizationId);
        if (!customization) return null;

        const product = await productRepository.findById(
          customization.productId,
          'es',
        );
        return product?.sellerId ?? null;
      },
    });

    const customization = await useCase.execute({
      id,
      sellerId,
      ...body,
    });

    return NextResponse.json(toCustomizationResponse(customization), {
      status: 200,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

export const DELETE = requireRole('DESIGNER')(async function DELETE(
  _request: NextRequest,
  context?: unknown,
) {
  try {
    const sellerId = await getCurrentSellerId();
    if (!sellerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await (context as { params: Promise<{ id: string }> })
      .params;
    const customizationRepository = container.getCustomizationRepository();
    const productRepository = container.getProductRepository();
    const useCase = new DeleteCustomization(customizationRepository, {
      getSellerIdForCustomization: async (customizationId: string) => {
        const customization =
          await customizationRepository.findById(customizationId);
        if (!customization) return null;

        const product = await productRepository.findById(
          customization.productId,
          'es',
        );
        return product?.sellerId ?? null;
      },
    });

    await useCase.execute({ id, sellerId });
    return NextResponse.json({ ok: true }, { status: 200 });
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
