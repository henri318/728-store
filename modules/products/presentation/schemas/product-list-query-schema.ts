import { z } from 'zod';

/**
 * Query schema for `GET /api/products`.
 *
 * Coerces numeric params, applies bounds, and allows only the
 * product-list allow-list for `sortBy`.
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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
});

export type ProductListQueryInput = z.infer<typeof productListQuerySchema>;
