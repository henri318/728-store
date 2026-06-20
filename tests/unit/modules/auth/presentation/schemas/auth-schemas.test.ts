import { describe, it, expect } from 'vitest';
import { signupSchema } from '@/modules/auth/presentation/schemas/auth-schemas';

describe('signupSchema - confirmPassword field', () => {
  const baseData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'securepass1',
  };

  it('passes when confirmPassword matches password', () => {
    const result = signupSchema.safeParse({
      ...baseData,
      confirmPassword: 'securepass1',
    });
    expect(result.success).toBe(true);
  });

  it('fails when confirmPassword does not match password', () => {
    const result = signupSchema.safeParse({
      ...baseData,
      confirmPassword: 'differentpass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmPasswordError = result.error.issues.find(
        (issue) => issue.path.includes('confirmPassword')
      );
      expect(confirmPasswordError).toBeDefined();
      expect(confirmPasswordError!.message).toBe('Las contraseñas no coinciden');
    }
  });

  it('passes when confirmPassword is not provided (optional for API)', () => {
    const result = signupSchema.safeParse(baseData);
    expect(result.success).toBe(true);
  });

  it('passes when confirmPassword is empty string (optional for API)', () => {
    const result = signupSchema.safeParse({
      ...baseData,
      confirmPassword: '',
    });
    expect(result.success).toBe(true);
  });
});
