import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
