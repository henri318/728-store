'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { type ZodError } from 'zod';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { ErrorMessage } from '@/modules/presentation/components/error-message';
import { EyeToggleWrapper } from '@/modules/presentation/components/eye-toggle-wrapper';
import { PasswordStrengthIndicator } from '@/modules/presentation/components/password-strength-indicator';
import { signupSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './page.module.css';

interface AddressFields {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: AddressFields;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  address?: Partial<AddressFields>;
}

function validateForm(
  form: FormState,
  passwordsDoNotMatch: string,
): FormErrors | null {
  // Check password match first
  if (form.password !== form.confirmPassword) {
    return { confirmPassword: passwordsDoNotMatch };
  }

  // Only validate address if user has expanded the section and filled at least one field
  const formToValidate = {
    ...form,
    address:
      form.address && Object.values(form.address).some((v) => v?.trim())
        ? form.address
        : undefined,
  };

  const result = signupSchema.safeParse(formToValidate);
  if (result.success) return null;

  const errors: FormErrors = {};
  const issues = (result.error as ZodError).issues ?? [];

  for (const issue of issues) {
    const path = issue.path?.join('.') || '';
    if (path === 'firstName') errors.firstName = issue.message;
    else if (path === 'lastName') errors.lastName = issue.message;
    else if (path === 'email') errors.email = issue.message;
    else if (path === 'password') errors.password = issue.message;
    else if (path.startsWith('address.')) {
      const addrField = path.split('.')[1] as keyof AddressFields;
      if (!errors.address) errors.address = {};
      errors.address[addrField] = issue.message;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export default function SignUpPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'es';
  const dict = useDictionary();
  const { update } = useSession();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: { street: '', city: '', postalCode: '', country: '' },
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateAddressField = (field: keyof AddressFields, value: string) => {
    setForm((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
    if (errors.address?.[field]) {
      setErrors((prev) => {
        const next = {
          ...prev,
          address: prev.address ? { ...prev.address } : undefined,
        };
        if (next.address) {
          delete next.address[field];
          if (Object.keys(next.address).length === 0) {
            next.address = undefined;
          }
        }
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateForm(form, dict.auth.passwordsDoNotMatch);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          address: Object.values(form.address).some((v) => v)
            ? form.address
            : undefined,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'Resource already exists') {
          throw new Error(dict.auth.errorMailExists);
        }
        if (data.details && Array.isArray(data.details)) {
          const firstError = data.details[0];
          throw new Error(firstError.message || dict.auth.genericSignupError);
        }
        throw new Error(data.error || dict.auth.genericSignupError);
      }

      // Auto-login after successful registration
      const signInResult = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        await update(); // Refresh session without page reload
        router.push(`/${locale}`);
      } else {
        // Fallback: redirect to sign-in if auto-login fails
        router.push(`/${locale}/auth/signin?registered=true`);
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{dict.auth.signUpTitle}</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        {serverError && <ErrorMessage message={serverError} />}

        <Input
          label={dict.auth.firstName}
          value={form.firstName}
          onChange={(v) => updateField('firstName', v)}
          error={errors.firstName}
          required
        />
        <Input
          label={dict.auth.lastName}
          value={form.lastName}
          onChange={(v) => updateField('lastName', v)}
          error={errors.lastName}
          required
        />
        <Input
          label={dict.auth.email}
          type="email"
          value={form.email}
          onChange={(v) => updateField('email', v)}
          error={errors.email}
          required
        />
        <EyeToggleWrapper
          label={dict.auth.password}
          value={form.password}
          onChange={(v) => updateField('password', v)}
          error={errors.password}
          required
        />
        <PasswordStrengthIndicator password={form.password} />
        <EyeToggleWrapper
          label={dict.auth.confirmPassword}
          value={form.confirmPassword}
          onChange={(v) => updateField('confirmPassword', v)}
          error={errors.confirmPassword}
          required
        />

        <div className={styles.addressToggle}>
          <button
            type="button"
            onClick={() => setShowAddress((prev) => !prev)}
            className={styles.addressToggleButton}
          >
            {showAddress
              ? `▾ ${dict.auth.hideAddress}`
              : `▸ ${dict.auth.addAddress}`}
          </button>
        </div>

        {showAddress && (
          <div className={styles.addressFields}>
            <Input
              label={dict.auth.street}
              value={form.address.street}
              onChange={(v) => updateAddressField('street', v)}
              error={errors.address?.street}
            />
            <Input
              label={dict.auth.city}
              value={form.address.city}
              onChange={(v) => updateAddressField('city', v)}
              error={errors.address?.city}
            />
            <Input
              label={dict.auth.postalCode}
              value={form.address.postalCode}
              onChange={(v) => updateAddressField('postalCode', v)}
              error={errors.address?.postalCode}
            />
            <Input
              label={dict.auth.country}
              value={form.address.country}
              onChange={(v) => updateAddressField('country', v)}
              error={errors.address?.country}
            />
          </div>
        )}

        <Button type="submit" loading={loading}>
          {dict.auth.signUpButton}
        </Button>
      </form>
      <p className={styles.footer}>
        {dict.auth.alreadyHaveAccount}{' '}
        <a href={`/${locale}/auth/signin`} className={styles.footerLink}>
          {dict.auth.loginButton}
        </a>
      </p>
    </div>
  );
}
