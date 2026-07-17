'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import type { ZodIssue } from 'zod';
import { TextField } from '@/shared/ui/text-field';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { EyeToggleWrapper } from '@/shared/ui/eye-toggle-wrapper';
import { PasswordStrengthIndicator } from '@/shared/ui/password-strength-indicator';
import { AuthCard } from '@/shared/ui/auth-card';
import { signupSchema } from '@/modules/auth/presentation/schemas/auth-schemas';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { checkPasswordMatch } from '@/shared/validation/password-match';
import { validateForm } from '@/shared/validation/validate-form';
import styles from './page.module.css';
import {
  AddressAutocompleteFields,
  type AddressValue,
} from '@/modules/users/presentation/components/address-autocomplete-fields';

type AddressFields = AddressValue;

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

function applyIssue(errors: FormErrors, issue: ZodIssue) {
  const path = issue.path?.join('.') || '';
  switch (path) {
    case 'firstName': {
      errors.firstName = issue.message;
      break;
    }
    case 'lastName': {
      errors.lastName = issue.message;
      break;
    }
    case 'email': {
      errors.email = issue.message;
      break;
    }
    case 'password': {
      errors.password = issue.message;
      break;
    }
    default: {
      if (path.startsWith('address.')) {
        const addrField = path.split('.', 2)[1] as keyof AddressFields;
        if (!errors.address) errors.address = {};
        errors.address[addrField] = issue.message;
      }
      break;
    }
  }
}

function validateFormLocal(
  form: FormState,
  passwordsDoNotMatch: string,
): FormErrors | null {
  // Check password match first
  const mismatch = checkPasswordMatch(
    form.password,
    form.confirmPassword,
    passwordsDoNotMatch,
  );
  if (mismatch) return mismatch;

  // Only validate address if user has expanded the section and filled at least one field
  const formToValidate = {
    ...form,
    address:
      form.address && Object.values(form.address).some((v) => v?.trim())
        ? form.address
        : undefined,
  };

  return validateForm(formToValidate, signupSchema, applyIssue);
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
    address: {},
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (Object.hasOwn(errors, field)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateFormLocal(
      form,
      dict.auth.passwordsDoNotMatch,
    );
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
          address: Object.values(form.address).some(Boolean)
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
    } catch (error: unknown) {
      setServerError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <h2 className={styles.title}>{dict.auth.signUpTitle}</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        {serverError && <ErrorMessage message={serverError} />}

        <TextField
          label={dict.auth.firstName}
          value={form.firstName}
          onChange={(v) => updateField('firstName', v)}
          error={errors.firstName}
          required
        />
        <TextField
          label={dict.auth.lastName}
          value={form.lastName}
          onChange={(v) => updateField('lastName', v)}
          error={errors.lastName}
          required
        />
        <TextField
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
            <AddressAutocompleteFields
              value={form.address}
              onChange={(address) => {
                setForm((prev) => ({ ...prev, address }));
                if (errors.address)
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.address;
                    return next;
                  });
              }}
              errors={errors.address}
              locale={locale === 'cat' ? 'cat' : 'es'}
              labels={{
                street: dict.auth.street,
                houseNumber: dict.auth.houseNumber,
                postalCode: dict.auth.postalCode,
                city: dict.auth.city,
                floor: dict.auth.floor,
                door: dict.auth.door,
                instructions: dict.auth.instructions,
                countryLabel: dict.auth.countryLabel,
                searchPlaceholder: dict.auth.searchPlaceholder,
                noResults: dict.auth.noResults,
                retry: dict.auth.retry,
                providerError: dict.auth.providerError,
                listboxLabel: dict.auth.listboxLabel,
                composedLabel: dict.auth.composedLabel,
              }}
            />
          </div>
        )}

        <Button type="submit" loading={loading}>
          {dict.auth.signUpButton}
        </Button>
      </form>
      <p className={styles.footer}>
        {dict.auth.alreadyHaveAccount}{' '}
        <Link href={`/${locale}/auth/signin`} className={styles.footerLink}>
          {dict.auth.loginButton}
        </Link>
      </p>
    </AuthCard>
  );
}
