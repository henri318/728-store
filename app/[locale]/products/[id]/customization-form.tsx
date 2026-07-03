'use client';

import { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { ProductCustomizationConfigJson } from '@/modules/products/domain/value-objects/product-customization-config';
import { useCustomizationDraft } from './customization-draft-context';
import type { ProductImageItem } from './customization-experience';
import formStyles from './customization-form.module.css';

interface CustomizationFormLabels {
  customizationDesign: string;
  customizationPhrase: string;
  customizationColor: string;
  customizationSize: string;
  customizationSizePlaceholder: string;
  customizationUpload: string;
  customizationReplaceImage: string;
  customizationRemoveImage: string;
  customizationUploading: string;
  customizationInvalidImage: string;
  customizationImageTooLarge: string;
  customizationPreview: string;
  customizationPreviewUnavailable: string;
  customizationLimitedToDescription: string;
  customizationPreviewDisclaimer: string;
  customizationCanvasLabel: string;
  customizationCanvasHelp: string;
  customizationProductImageAlt: string;
  customizationDesignImageAlt: string;
  customizationUploadDesign: string;
  customizationReplaceDesign: string;
  customizationRemoveDesign: string;
  customizationDesignUploading: string;
  customizationDesignInvalid: string;
  customizationDesignTooLarge: string;
  customizationScaleLabel: string;
  customizationRotationLabel: string;
  customizationOpacityLabel: string;
  customizationPositionReadoutLabel: string;
  customizationPositionXLabel: string;
  customizationPositionYLabel: string;
  customizationCanvasReset: string;
}

interface CustomizationFormProps {
  customizationConfig: ProductCustomizationConfigJson;
  productImageUrl: string;
  productImages: ProductImageItem[];
  labels: CustomizationFormLabels;
  onValidate?: () => void;
}

export function CustomizationForm({
  customizationConfig,
  productImages,
  labels,
  _productImageUrl,
  onValidate,
}: CustomizationFormProps) {
  const { draft, errors, setText, setColor, setSize, validateDraft } =
    useCustomizationDraft();

  const config = ProductCustomizationConfig.fromJson(customizationConfig);

  const textErrorId = errors.text ? 'customization-text-error' : undefined;
  const _colorErrorId = errors.color ? 'customization-color-error' : undefined;
  const sizeErrorId = errors.size ? 'customization-size-error' : undefined;

  return (
    <form
      className="customization-form"
      id="customization-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (validateDraft()) {
          onValidate?.();
        }
      }}
    >
      <label className={formStyles.fieldLabel}>
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

      {productImages.length > 0 && (
        <div className={formStyles.colorSection}>
          <span className={formStyles.colorLabel}>
            {labels.customizationColor}
          </span>
          <div className={formStyles.colorCarousel}>
            {productImages.map((img) => {
              const selected = draft.color === img.alt;
              return (
                <div
                  key={img.url}
                  role="button"
                  tabIndex={0}
                  className={`${formStyles.colorItem} ${selected ? formStyles.colorItemSelected : ''}`}
                  onClick={() => setColor(img.alt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setColor(img.alt);
                    }
                  }}
                  title={img.alt}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt}
                    className={formStyles.colorThumb}
                  />
                  <span className={formStyles.colorAlt}>{img.alt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <label className={formStyles.fieldLabel}>
        <span>{labels.customizationSize}</span>
        <select
          value={draft.size ?? ''}
          onChange={(event) => setSize(event.target.value || null)}
          aria-invalid={errors.size ? 'true' : undefined}
          aria-describedby={sizeErrorId}
        >
          <option value="">{labels.customizationSizePlaceholder}</option>
          {config.getSizeOptions().map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.size && (
          <p id={sizeErrorId} role="alert">
            {errors.size}
          </p>
        )}
      </label>
    </form>
  );
}
