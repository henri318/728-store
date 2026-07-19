'use client';

import { DesignPreview } from '@/modules/presentation/components/design-preview';

interface DesignPositionData {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: string;
}

interface OrderItemPreviewProps {
  productImageUrl: string | null;
  designImageUrl: string | null;
  designPosition: DesignPositionData | null;
  productName: string;
}

export function OrderItemPreview({
  productImageUrl,
  designImageUrl,
  designPosition,
  productName,
}: OrderItemPreviewProps) {
  const hasDesign = designImageUrl && designPosition;

  if (hasDesign && productImageUrl) {
    return (
      <DesignPreview
        productImageUrl={productImageUrl}
        designImageUrl={designImageUrl}
        designPosition={designPosition}
        width={80}
        height={80}
        borderRadius={8}
      />
    );
  }

  const fallbackImageUrl = productImageUrl ?? designImageUrl;

  if (fallbackImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackImageUrl}
        alt={productName}
        style={{
          width: 80,
          height: 80,
          objectFit: 'cover',
          borderRadius: 8,
          flexShrink: 0,
        }}
      />
    );
  }

  return null;
}
