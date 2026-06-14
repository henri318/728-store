import { prisma } from '@/shared/infrastructure/prisma';
import { ProductEntity, ProductRepository } from '../domain/product-repository';

export class PrismaProductRepository implements ProductRepository {
  async findAll(locale: string): Promise<ProductEntity[]> {
    const products = await prisma.product.findMany({
      include: {
        seller: true,
        translations: {
          where: { locale }
        },
        customizations: true
      }
    });

    return products.map(product => ({
      id: product.id,
      basePrice: Number(product.basePrice),
      sellerId: product.sellerId,
      sellerName: product.seller.name,
      translations: product.translations.map(t => ({
        locale: t.locale,
        name: t.name,
        description: t.description
      }))
    }));
  }

  async findById(id: string, locale: string): Promise<ProductEntity | null> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        translations: {
          where: { locale }
        },
        customizations: true
      }
    });

    if (!product) return null;

    return {
      id: product.id,
      basePrice: Number(product.basePrice),
      sellerId: product.sellerId,
      sellerName: product.seller.name,
      translations: product.translations.map(t => ({
        locale: t.locale,
        name: t.name,
        description: t.description
      }))
    };
  }
}
