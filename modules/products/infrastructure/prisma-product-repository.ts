import { prisma } from '@/shared/infrastructure/prisma';
import { ProductEntity, ProductRepository } from '../domain/product-repository';
import { ProductStatus } from '../domain/value-objects/product-status';

export class PrismaProductRepository implements ProductRepository {
  async findAll(locale: string): Promise<ProductEntity[]> {
    const products = await prisma.product.findMany({
      include: {
        seller: true,
        translations: {
          where: { locale },
        },
        customizations: true,
        images: {
          orderBy: { position: 'asc' },
        },
        tags: true,
      },
    });

    return products.map((product) => ({
      id: product.id,
      basePrice: Math.round(Number(product.basePrice) * 100) / 100,
      sellerId: product.sellerId,
      sellerName: product.seller.name,
      status: product.status as ProductStatus,
      categoryId: product.categoryId,
      updatedAt: product.updatedAt,
      translations: product.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.description,
      })),
      customizations: product.customizations.map((c) => ({
        id: c.id,
        text: c.text,
        color: c.color,
        size: c.size,
        imageUrl: c.imageUrl,
        productId: c.productId,
        createdAt: c.createdAt,
      })),
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        position: img.position,
        productId: img.productId,
        createdAt: img.createdAt,
      })),
      tags: product.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt,
      })),
    }));
  }

  async findById(id: string, locale: string): Promise<ProductEntity | null> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: true,
        translations: {
          where: { locale },
        },
        customizations: true,
        images: {
          orderBy: { position: 'asc' },
        },
        tags: true,
      },
    });

    if (!product) return null;

    return {
      id: product.id,
      basePrice: Math.round(Number(product.basePrice) * 100) / 100,
      sellerId: product.sellerId,
      sellerName: product.seller.name,
      status: product.status as ProductStatus,
      categoryId: product.categoryId,
      updatedAt: product.updatedAt,
      translations: product.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.description,
      })),
      customizations: product.customizations.map((c) => ({
        id: c.id,
        text: c.text,
        color: c.color,
        size: c.size,
        imageUrl: c.imageUrl,
        productId: c.productId,
        createdAt: c.createdAt,
      })),
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        position: img.position,
        productId: img.productId,
        createdAt: img.createdAt,
      })),
      tags: product.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt,
      })),
    };
  }

  // Stub — full implementation in PR3 (mapper + repository refactor)
  async save(_entity: ProductEntity): Promise<void> {
    throw new Error('Not implemented — will be wired in PR3');
  }

  // Stub — full implementation in PR3 (mapper + repository refactor)
  async update(_entity: ProductEntity): Promise<boolean> {
    throw new Error('Not implemented — will be wired in PR3');
  }
}
