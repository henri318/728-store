import { describe, it, expect } from 'vitest';
import cat from '@/shared/i18n/locales/cat.json';
import es from '@/shared/i18n/locales/es.json';

describe('cat.json locale keys', () => {
  it('has common namespace', () => {
    expect(cat.common).toBeDefined();
  });

  it('has auth namespace', () => {
    expect(cat.auth).toBeDefined();
  });

  it('has profile namespace', () => {
    expect(cat.profile).toBeDefined();
  });

  it('has login/register keys', () => {
    expect(cat.auth.signInTitle).toBeDefined();
    expect(cat.auth.signUpTitle).toBeDefined();
    expect(cat.auth.email).toBeDefined();
    expect(cat.auth.password).toBeDefined();
    expect(cat.auth.loginButton).toBeDefined();
  });

  it('has signup field keys', () => {
    expect(cat.auth.firstName).toBeDefined();
    expect(cat.auth.lastName).toBeDefined();
  });

  it('has address sub-section keys', () => {
    expect(cat.auth.address).toBeDefined();
    expect(cat.auth.street).toBeDefined();
    expect(cat.auth.city).toBeDefined();
    expect(cat.auth.postalCode).toBeDefined();
    expect(cat.auth.country).toBeDefined();
  });

  it('has password change keys', () => {
    expect(cat.auth.changePasswordTitle).toBeDefined();
    expect(cat.auth.currentPassword).toBeDefined();
    expect(cat.auth.newPassword).toBeDefined();
    expect(cat.auth.confirmPassword).toBeDefined();
  });

  it('has forgot/reset password keys', () => {
    expect(cat.auth.forgotPasswordTitle).toBeDefined();
    expect(cat.auth.resetPasswordTitle).toBeDefined();
  });

  it('has verification keys', () => {
    expect(cat.auth.verifyEmailTitle).toBeDefined();
    expect(cat.auth.emailVerified).toBeDefined();
  });

  it('has error message keys', () => {
    expect(cat.auth.errorMailExists).toBeDefined();
    expect(cat.auth.invalidCredentials).toBeDefined();
    expect(cat.auth.passwordsDoNotMatch).toBeDefined();
  });

  it('has profile page keys', () => {
    expect(cat.profile.title).toBeDefined();
    expect(cat.profile.deleteAccount).toBeDefined();
  });

  it('has shared UI keys in common', () => {
    expect(cat.common.submit).toBeDefined();
    expect(cat.common.cancel).toBeDefined();
    expect(cat.common.loading).toBeDefined();
    expect(cat.common.required).toBeDefined();
    expect(cat.common.unverifiedBanner).toBeDefined();
  });

  it('has fallback: every key present in es but missing in cat defaults to es value', () => {
    // Verify cat.json is a superset of es.json keys at the same structure
    const missingKeys: string[] = [];
    for (const namespace of Object.keys(es) as Array<keyof typeof es>) {
      for (const key of Object.keys(es[namespace])) {
        if (!(cat as any)[namespace]?.[key]) {
          missingKeys.push(`${namespace}.${key}`);
        }
      }
    }
    expect(missingKeys).toEqual([]);
  });
});
