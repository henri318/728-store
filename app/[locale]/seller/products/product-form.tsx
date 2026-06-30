'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type ZodError } from 'zod';
import { ProductStatus } from '@/modules/products/domain/value-objects/product-status';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';

type ProductFormMode = 'create' | 'edit';

interface ProductFormProps {
  locale: string;
  mode: ProductFormMode;
  productId?: string;
  initialValues: {
    name: string;
    description: string;
    price: number;
    status: ProductStatus;
    customizationConfig: string;
  };
  labels: {
    title: string;
    backToProducts: string;
    nameLabel: string;
    descriptionLabel: string;
    priceLabel: string;
    statusLabel: string;
    customizationConfigLabel: string;
    customizationConfigHint: string;
    save: string;
    saved: string;
    error: string;
    statusDraft: string;
    statusActive: string;
    statusArchived: string;
    statusEliminated: string;
  };
}

interface FormState {
  name: string;
  description: string;
  price: string;
  status: ProductStatus;
  customizationConfig: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  status?: string;
  customizationConfig?: string;
}

function buildPayload(locale: string, form: FormState) {
  const customizationConfig = form.customizationConfig.trim()
    ? JSON.parse(form.customizationConfig)
    : undefined;

  const payload = {
    locale,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    price: form.price,
    status: form.status,
    customizationConfig,
  };

  const result = productFormSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false as const,
      error: result.error,
      payload,
    };
  }

  return { success: true as const, payload: result.data };
}

export function ProductForm({
  locale,
  mode,
  productId,
  initialValues,
  labels,
}: ProductFormProps) {
  const router = useRouter();
  const nameId = 'product-name';
  const descriptionId = 'product-description';
  const priceId = 'product-price';
  const statusId = 'product-status';
  const customizationConfigId = 'product-customization-config';
  const [form, setForm] = useState<FormState>({
    name: initialValues.name,
    description: initialValues.description,
    price: String(initialValues.price),
    status: initialValues.status,
    customizationConfig: initialValues.customizationConfig,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => (mode === 'create' ? '/api/products' : `/api/products/${productId}`),
    [mode, productId],
  );

  const submitLabel = labels.save;

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const mapErrors = (error: ZodError): FormErrors => {
    const next: FormErrors = {};

    for (const issue of error.issues) {
      const path = issue.path[0] as keyof FormErrors | undefined;
      if (path && !next[path]) {
        next[path] = issue.message;
      }
    }

    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    setSaved(null);
    setErrors({});

    let parsed;
    try {
      parsed = buildPayload(locale, form);
    } catch {
      setErrors({
        customizationConfig: 'Customization config must be valid JSON',
      });
      return;
    }

    if (!parsed.success) {
      setErrors(mapErrors(parsed.error));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || labels.error);
      }

      setSaved(labels.saved);
      router.push(`/${locale}/seller/products`);
      router.refresh();
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{labels.title}</h2>

      <p>
        <Link href={`/${locale}/seller/products`}>{labels.backToProducts}</Link>
      </p>

      {serverError ? <p role="alert">{serverError}</p> : null}
      {saved ? <p role="status">{saved}</p> : null}

      <label htmlFor={nameId}>
        <span>{labels.nameLabel}</span>
        <input
          id={nameId}
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          required
        />
        {errors.name ? <p role="alert">{errors.name}</p> : null}
      </label>

      <label htmlFor={descriptionId}>
        <span>{labels.descriptionLabel}</span>
        <textarea
          id={descriptionId}
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          rows={4}
        />
        {errors.description ? <p role="alert">{errors.description}</p> : null}
      </label>

      <label htmlFor={priceId}>
        <span>{labels.priceLabel}</span>
        <input
          id={priceId}
          type="number"
          step="0.01"
          value={form.price}
          onChange={(event) => updateField('price', event.target.value)}
          required
        />
        {errors.price ? <p role="alert">{errors.price}</p> : null}
      </label>

      <label htmlFor={statusId}>
        <span>{labels.statusLabel}</span>
        <select
          id={statusId}
          value={form.status}
          onChange={(event) =>
            updateField('status', event.target.value as ProductStatus)
          }
        >
          <option value={ProductStatus.DRAFT}>{labels.statusDraft}</option>
          <option value={ProductStatus.ACTIVE}>{labels.statusActive}</option>
          <option value={ProductStatus.ARCHIVED}>
            {labels.statusArchived}
          </option>
          <option value={ProductStatus.ELIMINATED}>
            {labels.statusEliminated}
          </option>
        </select>
        {errors.status ? <p role="alert">{errors.status}</p> : null}
      </label>

      <label htmlFor={customizationConfigId}>
        <span>{labels.customizationConfigLabel}</span>
        <textarea
          id={customizationConfigId}
          aria-label={labels.customizationConfigLabel}
          value={form.customizationConfig}
          onChange={(event) =>
            updateField('customizationConfig', event.target.value)
          }
          rows={8}
        />
        <small>{labels.customizationConfigHint}</small>
        {errors.customizationConfig ? (
          <p role="alert">{errors.customizationConfig}</p>
        ) : null}
      </label>

      <button type="submit" disabled={loading}>
        {loading ? labels.save : submitLabel}
      </button>
    </form>
  );
}
