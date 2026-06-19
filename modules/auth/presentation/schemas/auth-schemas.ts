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

/** POST /api/users/me/change-password */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

/** POST /api/auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/** POST /api/auth/reset-password */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

/** PATCH /api/users/me */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
});
