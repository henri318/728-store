import { z } from 'zod';
import { checkoutEligibilitySchema } from './checkout-eligibility-schema';
import { designPositionSchema } from '@/shared/validation/design-position-schema';

/**
 * Zod schemas for cart API request validation.
 *
 * Follows the same pattern as `modules/orders/presentation/schemas/order-schemas.ts`.
 * All schemas use `z.coerce.number()` for quantity fields so form submissions
 * (which arrive as strings) are automatically coerced to integers.
 */

// --- addItem ---

const customerCustomizationSchema = z.object({
  text: z.string().max(500).nullable().optional(),
  color: z
    .string()
    .max(50)
    .refine((value) => value.trim().length > 0, {
      message: 'Customization color cannot be empty if provided',
    })
    .nullable()
    .optional(),
  size: z
    .string()
    .max(50)
    .refine((value) => value.trim().length > 0, {
      message: 'Customization size cannot be empty if provided',
    })
    .nullable()
    .optional(),
  imageUrl: z
    .string()
    .regex(/^https?:\/\/.+/, 'Image URL must start with http:// or https://')
    .nullable()
    .optional(),
  designPosition: designPositionSchema.nullable().optional(),
});

export const addItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity must be at most 99'),
  customizationIdList: z.array(z.string().min(1)).optional().default([]),
  customization: customerCustomizationSchema.optional(),
});

export type AddItemInput = z.infer<typeof addItemSchema>;

// --- updateQuantity ---

export const updateQuantitySchema = z.object({
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity must be at most 99'),
  customizationIdList: z.array(z.string()).optional(),
  customization: customerCustomizationSchema.optional(),
});

export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;

// --- confirmCheckout ---

export const confirmCheckoutSchema = z.object({
  acceptPriceChanges: z.boolean(),
  address: checkoutEligibilitySchema.optional(),
});

export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>;

// --- migrateGuestCart ---

const designPositionMigrationSchema = z
  .object({
    imageUrl: z.string().min(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(10).max(200),
    rotation_deg: z.number().min(-45).max(45),
    opacity: z.number().min(0).max(100),
    blend_mode: z.enum(['source-over', 'multiply', 'overlay', 'soft-light']),
  })
  .strict()
  .nullable()
  .optional();

const guestCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  sellerId: z.string().min(1, 'Seller ID is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity must be at most 99'),
  unitPriceSnapshot: z.number().min(0, 'Price must be non-negative'),
  customizationText: z.string().nullable().optional(),
  customizationColor: z.string().nullable().optional(),
  customizationSize: z.string().nullable().optional(),
  customizationImageUrl: z.string().nullable().optional(),
  customizationImageUploadId: z.string().nullable().optional(),
  customizationDesignPosition: designPositionMigrationSchema,
});

export const migrateGuestCartSchema = z.object({
  guestItems: z.array(guestCartItemSchema),
  strategy: z.enum(['merge', 'keep-server', 'keep-guest']),
});

export type MigrateGuestCartInput = z.infer<typeof migrateGuestCartSchema>;
export type GuestCartItemInput = z.infer<typeof guestCartItemSchema>;
