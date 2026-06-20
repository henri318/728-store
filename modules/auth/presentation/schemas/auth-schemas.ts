import { z } from 'zod';

export const signupSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio').max(50),
  lastName: z.string().min(1, 'El apellido es obligatorio').max(50),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga'),
  confirmPassword: z.string(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
});

/** POST /api/users/me/change-password */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga'),
});

/** POST /api/auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

/** POST /api/auth/reset-password */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga'),
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
