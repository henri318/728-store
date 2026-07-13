import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/composition-root/container';
import { GetSimilarProductsUseCase } from '@/modules/products/application/get-similar-products-use-case';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const product = await container
      .getProductRepository()
      .findById(id, 'es', 'public');

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const tagNames = [...new Set(product.tags.map((tag) => tag.slug))];

    const useCase = new GetSimilarProductsUseCase(
      container.getProductRepository(),
    );

    const similar = await useCase.execute(id, tagNames, 'es', 3);

    const items = similar.map((p) => ({
      id: p.id,
      basePrice: {
        amount: p.basePrice.amount,
        currency: p.basePrice.currency,
        formattedPrice: p.basePrice.format(),
      },
      sellerId: p.sellerId,
      sellerName: p.sellerName,
      translations: p.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.description,
      })),
      cover: p.cover ? { url: p.cover.url, alt: p.cover.alt } : null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error(
      '[similar-products] Failed to fetch similar products:',
      error,
    );
    return NextResponse.json({ items: [] });
  }
}
