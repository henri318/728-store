import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/shared/authorization/authorization';
import { container } from '@/composition-root/container';
import { handleApiError } from '@/shared/presentation/error-handler';
import { CreateCustomerCustomization } from '@/modules/customizations/application/create-customer-customization';
import {
  createCustomerCustomizationSchema,
  customizationResponseSchema,
} from '@/modules/customizations/presentation/schemas/customization-schemas';
import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { ProductCapabilityPort } from '@/modules/products/domain/product-capability-port';

export const POST = requireRole('CUSTOMER')(async function POST(
  request: NextRequest,
) {
  try {
    const session = await container.getSession().getSession();
    const userId = session?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = createCustomerCustomizationSchema.parse(await request.json());
    const productRepository = container.getProductRepository();
    const product = await productRepository.findById(body.productId, 'es');
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const capabilityPort: ProductCapabilityPort = {
      async getConfig(productId: string) {
        if (productId !== product.id) {
          const other = await productRepository.findById(productId, 'es');
          return other?.customizationConfig ?? null;
        }

        return (
          product.customizationConfig ?? ProductCustomizationConfig.default()
        );
      },
    };

    const customization = await new CreateCustomerCustomization(
      container.getCustomizationRepository(),
      capabilityPort,
    ).execute(body, userId);

    return NextResponse.json(toCustomizationResponse(customization), {
      status: 201,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
});

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
