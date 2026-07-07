export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => resolve(null));
    img.src = src;
  });
}

export function drawCover(
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

export function drawDesign(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  position: { x: number; y: number; scale: number; rotation_deg: number },
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
