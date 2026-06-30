'use client';

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface CustomizationDraft {
  text: string | null;
  color: string | null;
  size: string | null;
  imageUploadId: string | null;
  imageUrl: string | null;
  error: string | null;
}

export type CustomizationDraftErrors = Partial<
  Record<'text' | 'color' | 'size' | 'imageUrl', string>
>;

export interface CustomizationDraftContextType {
  draft: CustomizationDraft;
  errors: CustomizationDraftErrors;
  setText: (value: string | null) => void;
  setColor: (value: string | null) => void;
  setSize: (value: string | null) => void;
  setImage: (value: {
    imageUploadId: string | null;
    imageUrl: string | null;
  }) => void;
  clearImage: () => void;
  setError: (value: string | null) => void;
  validateDraft: () => boolean;
}

const defaultDraft: CustomizationDraft = {
  text: null,
  color: null,
  size: null,
  imageUploadId: null,
  imageUrl: null,
  error: null,
};

const CustomizationDraftContext =
  createContext<CustomizationDraftContextType | null>(null);

export function CustomizationDraftProvider({
  children,
  initialDraft,
}: {
  children: ReactNode;
  initialDraft?: Partial<Omit<CustomizationDraft, 'error'>>;
}) {
  const [draft, setDraft] = useState<CustomizationDraft>({
    ...defaultDraft,
    ...initialDraft,
  });
  const [errors, setErrors] = useState<CustomizationDraftErrors>({});

  const clearValidationErrors = useCallback(() => setErrors({}), []);

  const setText = useCallback(
    (value: string | null) => {
      setDraft((current) => ({ ...current, text: value, error: null }));
      clearValidationErrors();
    },
    [clearValidationErrors],
  );

  const setColor = useCallback(
    (value: string | null) => {
      setDraft((current) => ({ ...current, color: value, error: null }));
      clearValidationErrors();
    },
    [clearValidationErrors],
  );

  const setSize = useCallback(
    (value: string | null) => {
      setDraft((current) => ({ ...current, size: value, error: null }));
      clearValidationErrors();
    },
    [clearValidationErrors],
  );

  const setImage = useCallback(
    (value: { imageUploadId: string | null; imageUrl: string | null }) => {
      setDraft((current) => ({ ...current, ...value, error: null }));
      clearValidationErrors();
    },
    [clearValidationErrors],
  );

  const clearImage = useCallback(() => {
    setDraft((current) => ({
      ...current,
      imageUploadId: null,
      imageUrl: null,
      error: null,
    }));
    clearValidationErrors();
  }, [clearValidationErrors]);

  const setError = useCallback((value: string | null) => {
    setDraft((current) => ({ ...current, error: value }));
  }, []);

  const validateDraft = useCallback(() => {
    const nextErrors: CustomizationDraftErrors = {};

    const text = draft.text?.trim() ?? '';
    const color = draft.color?.trim() ?? '';
    const size = draft.size?.trim() ?? '';
    const imageUrl = draft.imageUrl?.trim() ?? '';

    if (text.length > 500) {
      nextErrors.text = 'Customization text must be at most 500 characters.';
    }

    if (color.length > 50) {
      nextErrors.color = 'Customization color must be at most 50 characters.';
    }

    if (size.length > 50) {
      nextErrors.size = 'Customization size must be at most 50 characters.';
    }

    if (
      imageUrl &&
      !/^https?:\/\//.test(imageUrl) &&
      !imageUrl.startsWith('/')
    ) {
      nextErrors.imageUrl = 'Customization image must be a valid URL.';
    }

    setErrors(nextErrors);
    setError(Object.values(nextErrors)[0] ?? null);

    return Object.keys(nextErrors).length === 0;
  }, [draft.color, draft.imageUrl, draft.size, draft.text, setError]);

  const value = useMemo<CustomizationDraftContextType>(
    () => ({
      draft,
      errors,
      setText,
      setColor,
      setSize,
      setImage,
      clearImage,
      setError,
      validateDraft,
    }),
    [
      draft,
      errors,
      setText,
      setColor,
      setSize,
      setImage,
      clearImage,
      setError,
      validateDraft,
    ],
  );

  return (
    <CustomizationDraftContext value={value}>
      {children}
    </CustomizationDraftContext>
  );
}

export function useCustomizationDraft(): CustomizationDraftContextType {
  const context = use(CustomizationDraftContext);
  if (!context) {
    throw new Error(
      'useCustomizationDraft must be used within a CustomizationDraftProvider',
    );
  }
  return context;
}
