'use client';

import { useEffect, useRef } from 'react';

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
    let cancelled = false;

    async function draw() {
      const c = canvasRef.current?.getContext('2d');
      if (!c) return;

      const productImg = await loadImage(productImageUrl);
      const designImg = await loadImage(designImageUrl);
      if (cancelled) return;

      c.clearRect(0, 0, width, height);
      c.fillStyle = '#f4f2e6';
      c.fillRect(0, 0, width, height);

      if (productImg) {
        drawCover(c, productImg, width, height);
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
      cancelled = true;
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => resolve(null));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const ratio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let drawWidth: number;
  let drawHeight: number;

  if (ratio > targetRatio) {
    drawHeight = height;
    drawWidth = height * ratio;
  } else {
    drawWidth = width;
    drawHeight = width / ratio;
  }

  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawDesign(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  position: DesignPositionData,
  width: number,
  height: number,
) {
  const scaleFactor = position.scale / 100;
  const baseWidth = Math.min(width, image.naturalWidth);
  const ratio = image.naturalHeight / image.naturalWidth;
  const drawWidth = baseWidth * scaleFactor;
  const drawHeight = drawWidth * ratio;

  const centerX = position.x * width;
  const centerY = position.y * height;

  ctx.translate(centerX, centerY);
  ctx.rotate((position.rotation_deg * Math.PI) / 180);
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
}
