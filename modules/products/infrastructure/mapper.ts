import type { ProductEntity } from '../domain/entities/product';
import type { ProductImageEntity } from '../domain/entities/product-image';
import type { TagEntity } from '../domain/entities/tag';
import type { CategoryEntity } from '../domain/entities/category';
import { ProductStatus } from '../domain/value-objects/product-status';

/**
 * Shape of a Prisma `Product` row as returned from the database.
 *
 * Kept as a structural type (no Prisma import) so the mapper stays
 * decoupled from the Prisma client and can be unit-tested without
 * any database dependency.
 *
 * `basePrice` accepts both `number` and Prisma `Decimal` (which has
 * a `toString()` method). The mapper converts via `Number()`.
 */
export interface PrismaProductRow {
  id: string;
  basePrice: number | { toString(): string };
  sellerId: string;
  seller: { name: string };
  status: string;
  categoryId: string | null;
  category: PrismaCategoryRow | null;
  createdAt: Date;
  updatedAt: Date;
  translations: PrismaTranslationRow[];
  customizations: PrismaCustomizationRow[];
  images: PrismaProductImageRow[];
  tags: PrismaTagRow[];
}

export interface PrismaTranslationRow {
  locale: string;
  name: string;
  description: string | null;
}

export interface PrismaCustomizationRow {
  id: string;
  text: string | null;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  productId: string;
  createdAt: Date;
}

export interface PrismaProductImageRow {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  productId: string;
  createdAt: Date;
}

export interface PrismaTagRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface PrismaCategoryRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
}

/** Shape of a Prisma `Product` create input. */
export interface PrismaProductCreateInput {
  id: string;
  basePrice: number;
  sellerId: string;
  status: string;
  categoryId: string | null;
  updatedAt: Date;
}

/** Shape of a Prisma `ProductImage` create input. */
export interface PrismaProductImageCreateInput {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  productId: string;
}

/** Shape of a Prisma `Tag` create input. */
export interface PrismaTagCreateInput {
  id: string;
  name: string;
  slug: string;
}

/** Shape of a Prisma `Category` create input. */
export interface PrismaCategoryCreateInput {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

/**
 * Convert a Prisma `Product` row to a domain `ProductEntity`.
 *
 * Pure function — no I/O, no Prisma client access. Safe to call in
 * unit tests without a database connection.
 */
export function toDomainProduct(
  prismaProduct: PrismaProductRow,
): ProductEntity {
  return {
    id: prismaProduct.id,
    basePrice: Number(String(prismaProduct.basePrice)),
    sellerId: prismaProduct.sellerId,
    sellerName: prismaProduct.seller.name,
    status: prismaProduct.status as ProductStatus,
    categoryId: prismaProduct.categoryId,
    category: prismaProduct.category
      ? toDomainCategory(prismaProduct.category)
      : null,
    createdAt: prismaProduct.createdAt,
    updatedAt: prismaProduct.updatedAt,
    translations: prismaProduct.translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      description: t.description,
    })),
    customizations: prismaProduct.customizations.map((c) => ({
      id: c.id,
      text: c.text,
      color: c.color,
      size: c.size,
      imageUrl: c.imageUrl,
      productId: c.productId,
      createdAt: c.createdAt,
    })),
    images: prismaProduct.images.map((img) => toDomainProductImage(img)),
    tags: prismaProduct.tags.map((tag) => toDomainTag(tag)),
  };
}

/**
 * Convert a domain `ProductEntity` to a Prisma create input.
 *
 * Pure function — produces a plain object suitable for
 * `prisma.product.create({ data: ... })`. Caller is responsible for
 * passing it to the Prisma client.
 */
export function toPersistenceProduct(
  product: ProductEntity,
): PrismaProductCreateInput {
  return {
    id: product.id,
    basePrice: product.basePrice,
    sellerId: product.sellerId,
    status: product.status,
    categoryId: product.categoryId,
    updatedAt: product.updatedAt,
  };
}

/**
 * Convert a Prisma `ProductImage` row to a domain `ProductImageEntity`.
 */
export function toDomainProductImage(
  prismaImage: PrismaProductImageRow,
): ProductImageEntity {
  return {
    id: prismaImage.id,
    url: prismaImage.url,
    alt: prismaImage.alt,
    position: prismaImage.position,
    productId: prismaImage.productId,
    createdAt: prismaImage.createdAt,
  };
}

/**
 * Convert a Prisma `Tag` row to a domain `TagEntity`.
 */
export function toDomainTag(prismaTag: PrismaTagRow): TagEntity {
  return {
    id: prismaTag.id,
    name: prismaTag.name,
    slug: prismaTag.slug,
    createdAt: prismaTag.createdAt,
  };
}

/**
 * Convert a Prisma `Category` row to a domain `CategoryEntity`.
 */
export function toDomainCategory(
  prismaCategory: PrismaCategoryRow,
): CategoryEntity {
  return {
    id: prismaCategory.id,
    name: prismaCategory.name,
    slug: prismaCategory.slug,
    parentId: prismaCategory.parentId,
    createdAt: prismaCategory.createdAt,
  };
}

/**
 * Convert a domain `ProductImageEntity` to a Prisma create input.
 */
export function toPersistenceProductImage(
  image: ProductImageEntity,
): PrismaProductImageCreateInput {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    position: image.position,
    productId: image.productId,
  };
}

/**
 * Convert a domain `TagEntity` to a Prisma create input.
 */
export function toPersistenceTag(tag: TagEntity): PrismaTagCreateInput {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  };
}

/**
 * Convert a domain `CategoryEntity` to a Prisma create input.
 */
export function toPersistenceCategory(
  category: CategoryEntity,
): PrismaCategoryCreateInput {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
  };
}
