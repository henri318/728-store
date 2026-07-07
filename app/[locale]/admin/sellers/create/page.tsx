'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { ZodIssue } from 'zod';
import { TextField } from '@/shared/ui/text-field';
import { DescriptionField } from '@/shared/ui/description-field';
import { BackLink } from '@/shared/ui/back-link';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { EyeToggleWrapper } from '@/shared/ui/eye-toggle-wrapper';
import { createSellerSchema } from '@/modules/sellers/presentation/schemas/seller-schemas';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import { checkPasswordMatch } from '@/shared/validation/password-match';
import { validateForm as validateFormGeneric } from '@/shared/validation/validate-form';
import { useFormField } from '@/shared/presentation/use-form-field';
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

function applyIssue(errors: FormErrors, issue: ZodIssue) {
  const path = issue.path?.join('.') || '';
  switch (path) {
    case 'email': {
      errors.email = issue.message;
      break;
    }
    case 'password': {
      errors.password = issue.message;
      break;
    }
    case 'firstName': {
      errors.firstName = issue.message;
      break;
    }
    case 'lastName': {
      errors.lastName = issue.message;
      break;
    }
    case 'name': {
      errors.name = issue.message;
      break;
    }
    case 'description': {
      errors.description = issue.message;
      break;
    }
  }
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

export default function CreateSellerPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const dict = useDictionary();
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const { form, loading, setLoading, updateField } = useFormField(
    {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      name: '',
      description: '',
    },
    errors,
    setErrors,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const mismatch = checkPasswordMatch(
      form.password,
      form.confirmPassword,
      dict.auth.passwordsDoNotMatch,
    );
    if (mismatch) {
      setErrors(mismatch);
      return;
    }

    const payload = normalizePayload(form);
    const validationErrors = validateFormGeneric(
      payload,
      createSellerSchema,
      applyIssue,
    );
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
    } catch (error: unknown) {
      setServerError(
        error instanceof Error ? error.message : dict.admin.createSellerError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <BackLink href={`/${locale}/admin/sellers`}>
        {dict.admin.backToSellers}
      </BackLink>

      <Card padding="lg">
        <h2 className={styles.title}>{dict.admin.createSellerTitle}</h2>
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
          <EyeToggleWrapper
            label={dict.auth.confirmPassword}
            value={form.confirmPassword}
            onChange={(v) => updateField('confirmPassword', v)}
            error={errors.confirmPassword}
            required
          />
          <TextField
            label={dict.admin.sellerBusinessName}
            value={form.name}
            onChange={(v) => updateField('name', v)}
            error={errors.name}
            required
          />
          <DescriptionField
            label={dict.admin.sellerDescription}
            value={form.description}
            onChange={(v) => updateField('description', v)}
            error={errors.description}
          />

          <div className={styles.buttonRow}>
            <Button type="submit" loading={loading}>
              {dict.admin.createSeller}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
