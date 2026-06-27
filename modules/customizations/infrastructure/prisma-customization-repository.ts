import { prisma } from '@/shared/infrastructure/prisma';
import type { CustomizationRepository } from '../domain/customization-repository';
import type { CustomizationEntity } from '../domain/entities/customization';

/**
 * PrismaCustomizationRepository — Prisma adapter for the CustomizationRepository port.
 *
 * No business logic here — pure delegation to Prisma.
 */
export class PrismaCustomizationRepository implements CustomizationRepository {
  async save(entity: CustomizationEntity): Promise<CustomizationEntity> {
    const result = await prisma.customization.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        sellerId: entity.sellerId,
        productId: entity.productId,
        text: entity.text,
        color: entity.color,
        size: entity.size,
        imageUrl: entity.imageUrl,
        createdAt: entity.createdAt,
      },
      update: {
        text: entity.text,
        color: entity.color,
        size: entity.size,
        imageUrl: entity.imageUrl,
      },
    });

    return this.toDomain(result);
  }

  async findById(id: string): Promise<CustomizationEntity | null> {
    const result = await prisma.customization.findUnique({ where: { id } });
    return result ? this.toDomain(result) : null;
  }

  async findByIds(ids: string[]): Promise<CustomizationEntity[]> {
    if (ids.length === 0) return [];

    const results = await prisma.customization.findMany({
      where: { id: { in: ids } },
    });
    return results.map((r) => this.toDomain(r));
  }

  async findByProductId(productId: string): Promise<CustomizationEntity[]> {
    const results = await prisma.customization.findMany({
      where: { productId },
    });
    return results.map((r) => this.toDomain(r));
  }

  async findBySellerId(sellerId: string): Promise<CustomizationEntity[]> {
    const results = await prisma.customization.findMany({
      where: { sellerId },
    });
    return results.map((r) => this.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await prisma.customization.delete({ where: { id } });
  }

  async isReferencedByOrders(id: string): Promise<boolean> {
    // Check if any OrderLineItem has this id in its customizationIdList array
    const count = await prisma.orderLineItem.count({
      where: {
        customizationIdList: {
          has: id,
        },
      },
    });
    return count > 0;
  }

  private toDomain(row: {
    id: string;
    sellerId: string;
    productId: string;
    text: string | null;
    color: string | null;
    size: string | null;
    imageUrl: string | null;
    createdAt: Date;
  }): CustomizationEntity {
    return {
      id: row.id,
      sellerId: row.sellerId,
      productId: row.productId,
      text: row.text,
      color: row.color,
      size: row.size,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt,
    };
  }
}
