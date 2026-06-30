'use client';

import type { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import { PhotoUploadField } from './photo-upload-field';
import { useCustomizationDraft } from './customization-draft-context';

interface CustomizationFormLabels {
  customizationDesign: string;
  customizationPhrase: string;
  customizationColor: string;
  customizationSize: string;
  customizationUpload: string;
  customizationReplaceImage: string;
  customizationRemoveImage: string;
  customizationInvalidImage: string;
  customizationImageTooLarge: string;
  customizationPreview: string;
  customizationPreviewUnavailable: string;
  customizationLimitedToDescription: string;
  customizationPreviewDisclaimer: string;
}

interface CustomizationFormProps {
  customizationConfig: ProductCustomizationConfig;
  labels: CustomizationFormLabels;
  onValidate?: () => void;
}

export function CustomizationForm({
  customizationConfig,
  labels,
  onValidate,
}: CustomizationFormProps) {
  const {
    draft,
    errors,
    setText,
    setColor,
    setSize,
    setImage,
    clearImage,
    validateDraft,
  } = useCustomizationDraft();

  const allowsText = customizationConfig.allowsText();
  const allowsStyleOptions = customizationConfig.allowsStyleOptions();
  const allowsPhoto = customizationConfig.allowsPhoto();

  const textErrorId = errors.text ? 'customization-text-error' : undefined;
  const colorErrorId = errors.color ? 'customization-color-error' : undefined;
  const sizeErrorId = errors.size ? 'customization-size-error' : undefined;

  return (
    <form
      className="customization-form"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      {customizationConfig.mode === 'description' ? (
        <label>
          <span>{labels.customizationDesign}</span>
          <textarea
            maxLength={500}
            aria-invalid={errors.text ? 'true' : undefined}
            aria-describedby={textErrorId}
            value={draft.text ?? ''}
            onChange={(event) => setText(event.target.value || null)}
          />
          {errors.text && (
            <p id={textErrorId} role="alert">
              {errors.text}
            </p>
          )}
        </label>
      ) : allowsText ? (
        <label>
          <span>{labels.customizationPhrase}</span>
          <input
            type="text"
            maxLength={500}
            value={draft.text ?? ''}
            onChange={(event) => setText(event.target.value || null)}
            aria-describedby={textErrorId}
            aria-invalid={errors.text ? 'true' : undefined}
          />
          {errors.text && (
            <p id={textErrorId} role="alert">
              {errors.text}
            </p>
          )}
        </label>
      ) : null}

      {allowsStyleOptions && (
        <>
          <label>
            <span>{labels.customizationColor}</span>
            <input
              type="text"
              maxLength={50}
              value={draft.color ?? ''}
              onChange={(event) => setColor(event.target.value || null)}
              aria-invalid={errors.color ? 'true' : undefined}
              aria-describedby={colorErrorId}
            />
            {errors.color && (
              <p id={colorErrorId} role="alert">
                {errors.color}
              </p>
            )}
          </label>
          <label>
            <span>{labels.customizationSize}</span>
            <input
              type="text"
              maxLength={50}
              value={draft.size ?? ''}
              onChange={(event) => setSize(event.target.value || null)}
              aria-invalid={errors.size ? 'true' : undefined}
              aria-describedby={sizeErrorId}
            />
            {errors.size && (
              <p id={sizeErrorId} role="alert">
                {errors.size}
              </p>
            )}
          </label>
        </>
      )}

      {allowsPhoto && (
        <PhotoUploadField
          label={labels.customizationUpload}
          replaceLabel={labels.customizationReplaceImage}
          removeLabel={labels.customizationRemoveImage}
          invalidImageLabel={labels.customizationInvalidImage}
          imageTooLargeLabel={labels.customizationImageTooLarge}
          value={draft.imageUrl}
          onRemove={clearImage}
          onUpload={async (file) => {
            const response = await fetch('/api/uploads/guest/presigned-url', {
              method: 'POST',
              body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
              }),
              headers: { 'content-type': 'application/json' },
            });

            if (!response.ok) {
              throw new Error('Upload failed');
            }

            const result = (await response.json()) as {
              id: string;
              uploadUrl: string;
              storageKey: string;
            };

            await fetch(result.uploadUrl, {
              method: 'PUT',
              headers: { 'content-type': file.type },
              body: file,
            });

            const imageUrl = URL.createObjectURL(file);
            const uploadResult = {
              imageUploadId: result.id,
              imageUrl,
            };
            setImage(uploadResult);
            return uploadResult;
          }}
          onUploaded={(result) => setImage(result)}
        />
      )}

      <button
        type="button"
        onClick={() => {
          validateDraft();
          onValidate?.();
        }}
      >
        {labels.customizationPreview}
      </button>

      {customizationConfig.mode === 'description' && (
        <p>{labels.customizationLimitedToDescription}</p>
      )}
    </form>
  );
}
