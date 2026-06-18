import { z } from 'zod';

export const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
