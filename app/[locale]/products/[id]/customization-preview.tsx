'use client';

import Image from 'next/image';
import type { ProductCustomizationConfig } from '@/modules/products/domain/value-objects/product-customization-config';
import type { CustomizationDraft } from './customization-draft-context';
import styles from './preview-overlay.module.css';

interface CustomizationPreviewLabels {
  customizationPreview: string;
  customizationPreviewDisclaimer: string;
  customizationPreviewUnavailable: string;
  customizationLimitedToDescription: string;
}

interface CustomizationPreviewProps {
  baseImageUrl: string;
  customizationConfig: ProductCustomizationConfig;
  draft: CustomizationDraft;
  labels: CustomizationPreviewLabels;
}

export function CustomizationPreview({
  baseImageUrl,
  customizationConfig,
  draft,
  labels,
}: CustomizationPreviewProps) {
  const canPreview =
    customizationConfig.previewEnabled &&
    customizationConfig.mode !== 'description' &&
    baseImageUrl.length > 0 &&
    !draft.error;

  const textStyle = customizationConfig.textOffset
    ? {
        left: `${customizationConfig.textOffset.x}px`,
        top: `${customizationConfig.textOffset.y}px`,
        transform: `rotate(${customizationConfig.textOffset.rotate ?? 0}deg) scale(${customizationConfig.textOffset.scale ?? 1})`,
        maxWidth: customizationConfig.textOffset.maxWidth
          ? `${customizationConfig.textOffset.maxWidth}px`
          : undefined,
      }
    : undefined;

  const imageStyle = customizationConfig.imageOffset
    ? {
        left: `${customizationConfig.imageOffset.x}px`,
        top: `${customizationConfig.imageOffset.y}px`,
        transform: `rotate(${customizationConfig.imageOffset.rotate ?? 0}deg) scale(${customizationConfig.imageOffset.scale ?? 1})`,
        maxWidth: customizationConfig.imageOffset.maxWidth
          ? `${customizationConfig.imageOffset.maxWidth}px`
          : undefined,
      }
    : undefined;

  return (
    <section className={styles.previewShell} aria-live="polite">
      <p className={styles.disclaimer}>
        {labels.customizationPreviewDisclaimer}
      </p>

      {!canPreview ? (
        <p className={styles.fallback}>
          {labels.customizationPreviewUnavailable}
        </p>
      ) : (
        <figure
          className={styles.previewFigure}
          aria-label={labels.customizationPreview}
        >
          <Image
            src={baseImageUrl}
            alt={labels.customizationPreview}
            width={640}
            height={640}
            className={styles.baseImage}
          />
          <div className={styles.overlayLayer}>
            {draft.text && (
              <span className={styles.textLayer} style={textStyle}>
                {draft.text}
              </span>
            )}
            {draft.imageUrl && (
              <Image
                src={draft.imageUrl}
                alt={labels.customizationPreview}
                width={240}
                height={240}
                className={styles.photoLayer}
                style={imageStyle}
              />
            )}
          </div>
        </figure>
      )}

      {customizationConfig.mode === 'description' && (
        <p className={styles.descriptionOnly}>
          {labels.customizationLimitedToDescription}
        </p>
      )}
    </section>
  );
}
