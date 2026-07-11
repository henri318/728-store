import { z } from 'zod';

export const createCategorySchema = z
  .object({
    nameEs: z.string().trim().min(1).max(100),
    nameCat: z.string().trim().min(1).max(100),
  })
  .strict();

export const deleteCategoryParamsSchema = z.object({
  id: z.string().trim().min(1),
});
