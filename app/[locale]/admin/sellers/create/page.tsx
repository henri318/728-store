'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { type ZodError } from 'zod';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { EyeToggleWrapper } from '@/shared/ui/eye-toggle-wrapper';
import { createSellerSchema } from '@/modules/sellers/presentation/schemas/seller-schemas';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { checkPasswordMatch } from '@/shared/validation/password-match';
import styles from './page.module.css';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  name: string;
  description: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  description?: string;
}

function normalizePayload(form: FormState) {
  return {
    email: form.email.trim(),
    password: form.password,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
  };
}

function validateForm(
  form: FormState,
  passwordsDoNotMatch: string,
): FormErrors | null {
  const mismatch = checkPasswordMatch(
    form.password,
    form.confirmPassword,
    passwordsDoNotMatch,
  );
  if (mismatch) return mismatch;

  const payload = normalizePayload(form);
  const result = createSellerSchema.safeParse(payload);
  if (result.success) return null;

  const errors: FormErrors = {};
  const issues = (result.error as ZodError).issues ?? [];

  for (const issue of issues) {
    const path = issue.path?.join('.') || '';
    if (path === 'email') errors.email = issue.message;
    else if (path === 'password') errors.password = issue.message;
    else if (path === 'firstName') errors.firstName = issue.message;
    else if (path === 'lastName') errors.lastName = issue.message;
    else if (path === 'name') errors.name = issue.message;
    else if (path === 'description') errors.description = issue.message;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export default function CreateSellerPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const dict = useDictionary();
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const payload = normalizePayload(form);
      const res = await fetch('/api/sellers', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || dict.admin.createSellerError);
      }

      router.push(`/${locale}/admin/sellers`);
      router.refresh();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : dict.admin.createSellerError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{dict.admin.createSellerTitle}</h2>
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
        <EyeToggleWrapper
          label={dict.auth.confirmPassword}
          value={form.confirmPassword}
          onChange={(v) => updateField('confirmPassword', v)}
          error={errors.confirmPassword}
          required
        />
        <Input
          label={dict.admin.sellerBusinessName}
          value={form.name}
          onChange={(v) => updateField('name', v)}
          error={errors.name}
          required
        />
        <Input
          label={dict.admin.sellerDescription}
          value={form.description}
          onChange={(v) => updateField('description', v)}
          error={errors.description}
        />

        <Button type="submit" loading={loading}>
          {dict.admin.createSeller}
        </Button>
      </form>
      <p className={styles.footer}>
        <Link href={`/${locale}/admin/sellers`} className={styles.footerLink}>
          {dict.admin.backToSellers}
        </Link>
      </p>
    </div>
  );
}
