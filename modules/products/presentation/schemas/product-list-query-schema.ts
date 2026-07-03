import { z } from 'zod';

/**
 * Query schema for `GET /api/products`.
 *
 * Coerces numeric params, applies bounds, and allows only the
 * product-list allow-list for `sortBy`.
 *
 * `audience` is required to be one of 'public' | 'seller' | 'admin'.
 * Backward compat: omitted → 'seller' (the previous behavior).
 *
 * `pageSize` is capped at 50 for the public audience: 5 increments of 10
 * per scroll provides a mild DoS guard while keeping the UX smooth.
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // pageSize is validated and bounded but has NO default here — the use
  // case applies audience-specific defaults (10 for public, 20 otherwise)
  // so the legacy `/api/products` (audience=seller) keeps its 20 default
  // while the public storefront silently picks up the smaller page size.
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  tags: z
    .union([
      z.string().transform((value) =>
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
      z.array(z.string()),
    ])
    .optional(),
  lang: z.string().default('es'),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  sellerId: z.string().trim().optional(),
  // `audience` is optional here. The use case applies a default of
  // 'seller' so legacy callers (admin / seller / the existing seller
  // dashboard) keep their behavior without the schema silently injecting
  // a field they didn't pass.
  audience: z.enum(['public', 'seller', 'admin']).optional(),
});

export type ProductListQueryInput = z.infer<typeof productListQuerySchema>;
