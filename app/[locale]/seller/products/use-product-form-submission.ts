import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildPayload, mapErrors } from './product-form-payload';
import { findTranslationWithMissingName } from './product-form-translation-helpers';
import type {
  FormErrors,
  FormState,
  ProductFormProps,
} from './product-form-types';

interface ProductFormSubmissionOptions {
  locale: string;
  mode: ProductFormProps['mode'];
  productId?: string;
  form: FormState;
  labels: ProductFormProps['labels'];
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSaved: React.Dispatch<React.SetStateAction<string | null>>;
  setServerError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useProductFormSubmission({
  locale,
  mode,
  productId,
  form,
  labels,
  setForm,
  setErrors,
  setLoading,
  setSaved,
  setServerError,
}: ProductFormSubmissionOptions) {
  const router = useRouter();
  const endpoint =
    mode === 'create' ? '/api/products' : `/api/products/${productId}`;

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setServerError(null);
      setSaved(null);
      setErrors({});
      const missingLocale = findTranslationWithMissingName(form);
      if (missingLocale) {
        setForm((current) => ({ ...current, activeLocale: missingLocale }));
        setErrors({
          name: labels.missingTranslationNameError
            .split('{locale}')
            .join(missingLocale.toUpperCase()),
        });
        return;
      }
      const parsed = buildPayload(form.activeLocale, form);
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
          let data: { error?: string } | null = null;
          try {
            data = (await response.json()) as { error?: string } | null;
          } catch {
            data = null;
          }
          throw new Error(data?.error || labels.error);
        }
        setSaved(labels.saved);
        router.push(`/${locale}/seller/products`);
        router.refresh();
      } catch (error) {
        setServerError(error instanceof Error ? error.message : labels.error);
      } finally {
        setLoading(false);
      }
    },
    [
      endpoint,
      form,
      labels,
      locale,
      mode,
      router,
      setErrors,
      setForm,
      setLoading,
      setSaved,
      setServerError,
    ],
  );

  return { handleSubmit };
}
