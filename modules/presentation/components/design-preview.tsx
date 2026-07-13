'use client';

import { useEffect, useRef } from 'react';
import {
  loadImage,
  drawContain,
  drawDesign,
} from '@/shared/presentation/canvas-utils';

export interface DesignPositionData {
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation_deg: number;
  opacity: number;
  blend_mode: string;
}

interface DesignPreviewProps {
  productImageUrl: string;
  designImageUrl: string;
  designPosition: DesignPositionData;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function DesignPreview({
  productImageUrl,
  designImageUrl,
  designPosition,
  width = 100,
  height = 100,
  borderRadius = 6,
}: DesignPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function draw() {
      const c = canvasRef.current?.getContext('2d');
      if (!c) return;

      const productImg = await loadImage(productImageUrl);
      const designImg = await loadImage(designImageUrl);
      if (isCancelled) return;

      c.clearRect(0, 0, width, height);
      c.fillStyle = '#f4f2e6';
      c.fillRect(0, 0, width, height);

      if (productImg) {
        drawContain(c, productImg, width, height);
      }

      if (designImg) {
        c.globalCompositeOperation =
          designPosition.blend_mode === 'multiply'
            ? 'multiply'
            : ('source-over' as GlobalCompositeOperation);
        c.globalAlpha = designPosition.opacity / 100;
        drawDesign(c, designImg, designPosition, width, height);
      }
    }

    draw();

    return () => {
      isCancelled = true;
    };
  }, [productImageUrl, designImageUrl, designPosition, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width,
        height,
        borderRadius,
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
}
