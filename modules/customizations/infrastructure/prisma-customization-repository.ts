import { PrismaClient } from '@prisma/client';
import { prisma } from '@/shared/infrastructure/prisma';
import type { CustomizationRepository } from '../domain/customization-repository';
import { coerceDesignPosition } from '@/shared/kernel/domain/value-objects/design-position';
import type { CustomizationEntity } from '../domain/entities/customization';

/**
 * PrismaCustomizationRepository — Prisma adapter for the CustomizationRepository port.
 *
 * No business logic here — pure delegation to Prisma.
 *
 * designPosition is stored as JSONB. We deliberately accept the
 * Prisma JsonValue shape and coerce to our DesignPositionValue
 * type at the boundary so the domain layer never depends on Prisma.
 */
export class PrismaCustomizationRepository implements CustomizationRepository {
  private toDomain(row: {
    id: string;
    productId: string;
    text: string | null;
    color: string | null;
    size: string | null;
    imageUrl: string | null;
    designPosition: unknown;
    createdAt: Date;
  }): CustomizationEntity {
    return {
      id: row.id,
      productId: row.productId,
      text: row.text,
      color: row.color,
      size: row.size,
      imageUrl: row.imageUrl,
      designPosition: coerceDesignPosition(row.designPosition),
      createdAt: row.createdAt,
    };
  }

  async save(
    entity: CustomizationEntity,
    tx?: unknown,
  ): Promise<CustomizationEntity> {
    const client = (tx ?? prisma) as PrismaClient;
    const result = await client.customization.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        productId: entity.productId,
        text: entity.text,
        color: entity.color,
        size: entity.size,
        imageUrl: entity.imageUrl,
        designPosition:
          (entity.designPosition as unknown as object | null) ?? undefined,
        createdAt: entity.createdAt,
      },
      update: {
        text: entity.text,
        color: entity.color,
        size: entity.size,
        imageUrl: entity.imageUrl,
        designPosition:
          (entity.designPosition as unknown as object | null) ?? undefined,
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
      where: { product: { sellerId } },
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
}
