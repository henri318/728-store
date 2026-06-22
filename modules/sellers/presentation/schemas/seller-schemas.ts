import { z } from 'zod';
import { SellerStatus } from '../../domain/seller-status';

/**
 * Zod schemas for the seller presentation layer (HTTP request validation).
 *
 * The DTO shape is validated here, but use-case-level business rules
 * (uniqueness, state transitions, etc.) live in the application layer.
 */

/** GET /api/sellers?status=active|suspended|banned */
export const listSellersQuerySchema = z.object({
  status: z.nativeEnum(SellerStatus).optional(),
});

/**
 * POST /api/sellers — admin-only.
 *
 * Creates a new user (with the SELLER role) and a seller profile in one
 * request. The seller is always created with status=active.
 */
export const createSellerSchema = z.object({
  // User fields
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  // Seller fields
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

/** PATCH /api/sellers/[id] */
export const updateSellerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});

/** PATCH /api/sellers/[id]/status */
export const changeSellerStatusSchema = z.object({
  status: z.nativeEnum(SellerStatus),
});
