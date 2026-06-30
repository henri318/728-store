import { z } from 'zod';
import { ProductStatus } from '../../domain/value-objects/product-status';

export const changeProductStatusSchema = z.object({
  status: z.nativeEnum(ProductStatus),
});
