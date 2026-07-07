'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

export function useFormField<T extends Record<string, unknown>>(
  initial: T,
  errors: Partial<Record<keyof T, string | undefined>>,
  setErrors: Dispatch<
    SetStateAction<Partial<Record<keyof T, string | undefined>>>
  >,
) {
  const [form, setForm] = useState<T>(initial);
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof T, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (Object.hasOwn(errors, field)) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return { form, setForm, loading, setLoading, updateField };
}
