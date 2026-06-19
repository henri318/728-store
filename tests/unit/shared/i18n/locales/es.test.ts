import { describe, it, expect } from 'vitest';
import es from '@/shared/i18n/locales/es.json';

describe('es.json locale keys', () => {
  describe('common', () => {
    it('has shared UI button labels', () => {
      expect(es.common.submit).toBeDefined();
      expect(es.common.cancel).toBeDefined();
      expect(es.common.close).toBeDefined();
      expect(es.common.loading).toBeDefined();
    });

    it('has validation error messages', () => {
      expect(es.common.required).toBeDefined();
      expect(es.common.invalidEmail).toBeDefined();
      expect(es.common.passwordMinLength).toBeDefined();
    });

    it('has banner messages', () => {
      expect(es.common.unverifiedBanner).toBeDefined();
      expect(es.common.resendVerification).toBeDefined();
    });
  });

  describe('auth', () => {
    it('has signup form labels', () => {
      expect(es.auth.firstName).toBeDefined();
      expect(es.auth.lastName).toBeDefined();
      expect(es.auth.email).toBeDefined();
      expect(es.auth.password).toBeDefined();
      expect(es.auth.signUpTitle).toBeDefined();
      expect(es.auth.signUpButton).toBeDefined();
    });

    it('has address sub-section labels', () => {
      expect(es.auth.address).toBeDefined();
      expect(es.auth.street).toBeDefined();
      expect(es.auth.city).toBeDefined();
      expect(es.auth.postalCode).toBeDefined();
      expect(es.auth.country).toBeDefined();
    });

    it('has login modal labels', () => {
      expect(es.auth.signInTitle).toBeDefined();
      expect(es.auth.loginButton).toBeDefined();
      expect(es.auth.alreadyHaveAccount).toBeDefined();
      expect(es.auth.dontHaveAccount).toBeDefined();
    });

    it('has password change labels', () => {
      expect(es.auth.currentPassword).toBeDefined();
      expect(es.auth.newPassword).toBeDefined();
      expect(es.auth.confirmPassword).toBeDefined();
      expect(es.auth.changePasswordTitle).toBeDefined();
      expect(es.auth.passwordChanged).toBeDefined();
    });

    it('has forgot/reset password labels', () => {
      expect(es.auth.forgotPasswordTitle).toBeDefined();
      expect(es.auth.resetPasswordTitle).toBeDefined();
      expect(es.auth.sendResetLink).toBeDefined();
      expect(es.auth.checkEmailMessage).toBeDefined();
    });

    it('has verification labels', () => {
      expect(es.auth.verifyEmailTitle).toBeDefined();
      expect(es.auth.emailVerified).toBeDefined();
      expect(es.auth.tokenExpired).toBeDefined();
      expect(es.auth.invalidToken).toBeDefined();
    });

    it('has error messages', () => {
      expect(es.auth.errorMailExists).toBeDefined();
      expect(es.auth.invalidCredentials).toBeDefined();
      expect(es.auth.passwordsDoNotMatch).toBeDefined();
      expect(es.auth.wrongCurrentPassword).toBeDefined();
    });
  });

  describe('profile', () => {
    it('has profile page labels', () => {
      expect(es.profile.title).toBeDefined();
      expect(es.profile.updateSuccess).toBeDefined();
      expect(es.profile.deleteAccount).toBeDefined();
      expect(es.profile.deleteConfirmTitle).toBeDefined();
      expect(es.profile.deleteConfirmMessage).toBeDefined();
      expect(es.profile.accountDeactivated).toBeDefined();
    });
  });

  it('has no missing namespaces', () => {
    expect(es.common).toBeDefined();
    expect(es.auth).toBeDefined();
    expect(es.profile).toBeDefined();
  });
});
