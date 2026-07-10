import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const deleteCategoryParamsSchema = z.object({
  id: z.string().trim().min(1),
});
