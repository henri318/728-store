import { z } from 'zod';

export const createOrderFormSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  customizationText: z.string().max(500).nullable().optional(),
  customizationColor: z.string().max(50).nullable().optional(),
  customizationSize: z.string().max(50).nullable().optional(),
});

export const orderListQuerySchema = z.object({
  status: z.enum(['all', 'new', 'in_progress', 'completed']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
