import type { ZodError } from 'zod';
import { productFormSchema } from '@/modules/products/presentation/schemas/product-form-schema';
import { photoIdsFor } from './product-form-image-helpers';
import { cleanPhotoLabels } from './product-form-translation-helpers';
import type {
  FormErrors,
  FormState,
  SupportedLocale,
} from './product-form-types';

export function buildPayload(locale: SupportedLocale, form: FormState) {
  const current = form.translations[locale];
  const hasCustomizableBase = form.images.customizableBase.length > 0;
  const effectiveMode =
    hasCustomizableBase && form.customizationConfig?.mode === 'description'
      ? 'text_photo'
      : form.customizationConfig?.mode;
  const customizationConfig = form.customizationConfig
    ? { ...form.customizationConfig, mode: effectiveMode }
    : undefined;
  const photoIds = photoIdsFor(form.images);
  const translations = Object.values(form.translations)
    .map((translation) => {
      const name = translation.name.trim();
      const description = translation.description.trim();
      const designChangeDescription =
        translation.designChangeDescription?.trim() ?? '';
      return {
        locale: translation.locale,
        name,
        description: description || undefined,
        tags: [...translation.tags],
        sizes: [...translation.sizes],
        designChangeDescription: designChangeDescription || null,
        photoLabels: cleanPhotoLabels(translation.photoLabels, photoIds),
      };
    })
    .filter(
      (translation) =>
        translation.name.length > 0 ||
        translation.description !== undefined ||
        translation.tags.length > 0 ||
        translation.sizes.length > 0 ||
        translation.designChangeDescription !== null ||
        Object.keys(translation.photoLabels).length > 0,
    );
  const images = [
    ...(form.images.cover ? [{ ...form.images.cover, position: 0 }] : []),
    ...form.images.showcase.map((image, index) => ({
      ...image,
      position: index,
    })),
    ...form.images.customizableBase.map((image, index) => ({
      ...image,
      position: index,
    })),
  ].map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.alt.trim(),
    position: image.position,
    purpose: image.purpose,
    mimeType: image.mimeType,
    posterUrl: image.posterUrl,
  }));
  const designChangeDescription = current.designChangeDescription?.trim() ?? '';
  const payload = {
    locale,
    name: current.name.trim(),
    description: current.description.trim() || undefined,
    price: form.price,
    translation: {
      tags: [...current.tags],
      sizes: [...current.sizes],
      designChangeDescription: designChangeDescription || null,
      photoLabels: cleanPhotoLabels(current.photoLabels, photoIds),
    },
    translations,
    customizationConfig,
    images,
  };
  const result = productFormSchema.safeParse(payload);
  return result.success
    ? { success: true as const, payload: result.data }
    : { success: false as const, error: result.error, payload };
}

export function mapErrors(error: ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const path = issue.path[0] as keyof FormErrors | undefined;
    if (path !== undefined && !Object.hasOwn(errors, path)) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
