import type { ProductEntity } from '../domain/entities/product';
import type { ProductImageEntity } from '../domain/entities/product-image';
import type { TagEntity } from '../domain/entities/tag';
import type { CategoryEntity } from '../domain/entities/category';
import { ProductPrice } from '../domain/value-objects/product-price';
import { ProductStatus } from '../domain/value-objects/product-status';
import { ProductCustomizationConfig } from '../domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '../domain/value-objects/product-image-purpose';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';

type PrismaProductImagePurpose = import('@prisma/client').ProductImagePurpose;

export interface PrismaProductRow {
  id: string;
  basePrice: number | { toString(): string };
  currency?: string;
  sellerId: string;
  seller: { name: string };
  status: string;
  categoryId: string | null;
  category: PrismaCategoryRow | null;
  customizationConfig?: import('@prisma/client').Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  translations: PrismaTranslationRow[];
  images: PrismaProductImageRow[];
  tags: PrismaTagRow[];
}

export interface PrismaTranslationRow {
  locale: string;
  name: string;
  description: string | null;
  tags?: string[] | null;
  sizes?: string[] | null;
  designChangeDescription?: string | null;
}

export interface PrismaProductImageRow {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  purpose: PrismaProductImagePurpose;
  mimeType: string;
  posterUrl: string | null;
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
  slug: string;
  parentId: string | null;
  createdAt: Date;
  translations?: PrismaCategoryTranslationRow[];
}

export interface PrismaCategoryTranslationRow {
  locale: string;
  name: string;
}

/** Shape of a Prisma `Product` create input. */
export interface PrismaProductCreateInput {
  id: string;
  basePrice: number;
  currency: string;
  sellerId: string;
  status: string;
  categoryId: string | null;
  customizationConfig?: import('@prisma/client').Prisma.InputJsonValue;
  updatedAt: Date;
}

export interface PrismaProductCustomizationConfigJson {
  [key: string]: unknown;
  mode: 'description' | 'text' | 'photo' | 'text_photo';
  previewEnabled: boolean;
  previewTemplateUrl: string | null;
  textOffset: PrismaPreviewOffsetJson | null;
  imageOffset: PrismaPreviewOffsetJson | null;
}

export interface PrismaPreviewOffsetJson {
  [key: string]: unknown;
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  maxWidth?: number;
}

export interface PrismaProductCustomizationConfigRow {
  mode?: 'description' | 'text' | 'photo' | 'text_photo';
  previewEnabled?: boolean;
  previewTemplateUrl?: string | null;
  textOffset?: PrismaPreviewOffsetJson | null;
  imageOffset?: PrismaPreviewOffsetJson | null;
}

/** Shape of a Prisma `ProductImage` create input. */
export interface PrismaProductImageCreateInput {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  purpose: PrismaProductImagePurpose;
  mimeType: string;
  posterUrl: string | null;
  productId: string;
}

export type PrismaProductImageNestedCreateInput = Omit<
  PrismaProductImageCreateInput,
  'productId'
>;

/** Shape of a Prisma `Tag` create input. */
export interface PrismaTagCreateInput {
  id: string;
  name: string;
  slug: string;
}

/** Shape of a Prisma `Category` create input. */
export interface PrismaCategoryCreateInput {
  id: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
  translations: { create: Array<{ locale: string; name: string }> };
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
  // Legacy rows may omit currency; EUR is the explicit persisted fallback.
  const currency = prismaProduct.currency ?? Currency.EUR;

  return {
    id: prismaProduct.id,
    basePrice: ProductPrice.create(
      Number(String(prismaProduct.basePrice)),
      currency as Currency,
    ),
    sellerId: prismaProduct.sellerId,
    sellerName: prismaProduct.seller.name,
    status: prismaProduct.status as ProductStatus,
    categoryId: prismaProduct.categoryId,
    category: prismaProduct.category
      ? toDomainCategory(prismaProduct.category)
      : null,
    customizationConfig: ProductCustomizationConfig.fromJson(
      prismaProduct.customizationConfig ?? null,
    ),
    createdAt: prismaProduct.createdAt,
    updatedAt: prismaProduct.updatedAt,
    translations: prismaProduct.translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      description: t.description,
      tags: t.tags ?? [],
      sizes: t.sizes ?? [],
      designChangeDescription: t.designChangeDescription ?? null,
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
  const persistence: PrismaProductCreateInput = {
    id: product.id,
    basePrice: product.basePrice.amount,
    currency: product.basePrice.currency,
    sellerId: product.sellerId,
    status: product.status,
    categoryId: product.categoryId,
    updatedAt: product.updatedAt,
  };

  if (product.customizationConfig && !product.customizationConfig.isDefault()) {
    persistence.customizationConfig =
      product.customizationConfig.toJson() as import('@prisma/client').Prisma.InputJsonValue;
  }

  return persistence;
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
    purpose: prismaImage.purpose as ProductImagePurpose,
    mimeType: prismaImage.mimeType,
    posterUrl: prismaImage.posterUrl,
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
    slug: prismaCategory.slug,
    parentId: prismaCategory.parentId,
    createdAt: prismaCategory.createdAt,
    translations: (prismaCategory.translations ?? []).map((translation) => ({
      locale: translation.locale as 'es' | 'cat',
      name: translation.name,
    })),
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
    purpose: image.purpose as PrismaProductImagePurpose,
    mimeType: image.mimeType,
    posterUrl: image.posterUrl,
    productId: image.productId,
  };
}

/**
 * Convert a domain `ProductImageEntity` to a nested Prisma create input.
 *
 * Nested product image creates must not include `productId`; Prisma binds the
 * relation through the parent `Product` write.
 */
export function toPersistenceNestedProductImage(
  image: ProductImageEntity,
): PrismaProductImageNestedCreateInput {
  return {
    id: image.id,
    url: image.url,
    alt: image.alt,
    position: image.position,
    purpose: image.purpose as PrismaProductImagePurpose,
    mimeType: image.mimeType,
    posterUrl: image.posterUrl,
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
  const persistence: PrismaCategoryCreateInput = {
    id: category.id,
    slug: category.slug,
    parentId: category.parentId,
    createdAt: category.createdAt,
    translations: {
      create: (category.translations ?? []).map((translation) => ({
        ...translation,
      })),
    },
  };
  return persistence;
}
