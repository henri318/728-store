import { z } from 'zod';

const designBlendModeSchema = z.enum([
  'source-over',
  'multiply',
  'overlay',
  'soft-light',
]);

export const designPositionSchema = z
  .object({
    imageUrl: z.string().min(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(10).max(200),
    rotation_deg: z.number().min(-45).max(45),
    opacity: z.number().min(0).max(100),
    blend_mode: designBlendModeSchema,
  })
  .strict();
