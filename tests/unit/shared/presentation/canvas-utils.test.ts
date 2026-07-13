import { describe, expect, it, vi } from 'vitest';
import { drawContain } from '@/shared/presentation/canvas-utils';

function drawImageFor(naturalWidth: number, naturalHeight: number) {
  const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
  const image = { naturalWidth, naturalHeight } as HTMLImageElement;

  drawContain(ctx, image, 600, 450);

  return ctx.drawImage;
}

describe('drawContain', () => {
  it('fits a wide image and centers it with vertical margins', () => {
    expect(drawImageFor(1600, 900)).toHaveBeenCalledWith(
      expect.anything(),
      0,
      56.25,
      600,
      337.5,
    );
  });

  it('fits a tall image and centers it with horizontal margins', () => {
    expect(drawImageFor(900, 1600)).toHaveBeenCalledWith(
      expect.anything(),
      173.4375,
      0,
      253.125,
      450,
    );
  });
});
