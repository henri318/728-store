import { prisma } from '@/shared/infrastructure/prisma';
import { ProductEntity, ProductRepository } from '../domain/product-repository';
import { toDomainProduct, toPersistenceProduct } from './mapper';

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

    return products.map((product) => toDomainProduct(product));
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

    return toDomainProduct(product);
  }

  async save(entity: ProductEntity): Promise<void> {
    const data = toPersistenceProduct(entity);
    await prisma.product.create({
      data: {
        ...data,
        images: {
          create: entity.images.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt,
            position: img.position,
            productId: img.productId,
          })),
        },
        tags: {
          connect: entity.tags.map((tag) => ({ id: tag.id })),
        },
      },
    });
  }

  async update(entity: ProductEntity): Promise<boolean> {
    const data = toPersistenceProduct(entity);
    const result = await prisma.product.update({
      where: { id: entity.id },
      data: {
        basePrice: data.basePrice,
        status: data.status,
        categoryId: data.categoryId,
        updatedAt: data.updatedAt,
      },
    });
    return result !== null;
  }
}
