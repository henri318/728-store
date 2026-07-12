'use client';

import type { ProductCustomizationConfigJson } from '@/modules/products/domain/value-objects/product-customization-config';
import { ProductImagePurpose } from '@/modules/products/domain/value-objects/product-image-purpose';
import { useCustomizationDraft } from './customization-draft-context';
import type { ProductImageItem } from './customization-experience';
import { SelectField } from '@/shared/ui/select-field';
import { DescriptionField } from '@/shared/ui/description-field';
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
  sizes?: string[];
  productImages: ProductImageItem[];
  labels: CustomizationFormLabels;
  helpText?: string | null;
  onValidate?: () => void;
}

export function CustomizationForm({
  customizationConfig: _customizationConfig,
  sizes,
  productImages,
  labels,
  helpText,
  onValidate,
}: CustomizationFormProps) {
  const { draft, errors, setText, setColor, setSize, validateDraft } =
    useCustomizationDraft();
  const sizeOptions = sizes ?? [];
  const customizableBaseImages = productImages.filter(
    (image) => image.purpose === ProductImagePurpose.CUSTOMIZABLE_BASE,
  );

  return (
    <form
      className="customization-form"
      id="customization-form"
      data-testid="customization-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (validateDraft()) {
          onValidate?.();
        }
      }}
    >
      {customizableBaseImages.length > 0 && (
        <div
          className={formStyles.colorSection}
          data-testid="customization-style-selectors"
        >
          <span className={formStyles.colorLabel}>
            {labels.customizationColor}
          </span>
          <div className={formStyles.colorCarousel}>
            {customizableBaseImages.map((img) => {
              const isSelected = draft.color === img.alt;
              return (
                <div
                  key={img.url}
                  role="button"
                  tabIndex={0}
                  className={`${formStyles.colorItem} ${isSelected ? formStyles.colorItemSelected : ''}`}
                  onClick={() => setColor(img.alt)}
                  onKeyDown={(e) => {
                    if (!(e.key === 'Enter' || e.key === ' ')) {
                      return;
                    }

                    e.preventDefault();
                    setColor(img.alt);
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

      {sizeOptions.length > 0 && (
        <div data-testid="customization-style-selectors">
          <SelectField
            label={labels.customizationSize}
            value={draft.size ?? ''}
            onChange={(value) => setSize(value || null)}
            options={sizeOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            placeholder={labels.customizationSizePlaceholder}
            error={errors.size}
          />
        </div>
      )}

      <DescriptionField
        label={labels.customizationDesign}
        value={draft.text ?? ''}
        onChange={(value) => setText(value || null)}
        error={errors.text}
        helpText={helpText?.trim() || undefined}
        rows={2}
      />
    </form>
  );
}
