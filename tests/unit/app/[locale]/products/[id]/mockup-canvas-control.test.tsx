import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockupCanvasControl } from '@/app/[locale]/products/[id]/mockup-canvas-control';

const context = vi.hoisted(() => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
}));

const labels = {
  canvasLabel: 'Canvas',
  canvasHelp: 'Help',
  productImageAlt: 'Product',
  designImageAlt: 'Design',
  uploadDesign: 'Upload',
  replaceDesign: 'Replace',
  removeDesign: 'Remove',
  uploading: 'Uploading',
  invalidImage: 'Invalid',
  imageTooLarge: 'Too large',
  scaleLabel: 'Scale',
  rotationLabel: 'Rotation',
  opacityLabel: 'Opacity',
  positionXLabel: 'X',
  positionYLabel: 'Y',
  positionReadoutLabel: 'Position',
  resetLabel: 'Reset',
  uploadingLabel: 'Uploading',
};

function renderCanvas() {
  return render(
    <MockupCanvasControl
      productImageUrl="/product.png"
      labels={labels}
      onUpload={vi.fn()}
      onPositionChange={vi.fn()}
    />,
  );
}

describe('MockupCanvasControl backing store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it('uses the DPR multiplier without changing the CSS canvas dimensions', () => {
    const { getByLabelText } = renderCanvas();
    const canvas = getByLabelText('Canvas') as HTMLCanvasElement;

    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(450);
    expect(canvas.style.width).toBe('');
    expect(canvas.style.height).toBe('');
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('matches the CSS backing store at standard DPR and updates after a DPR change', () => {
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    });
    const { getByLabelText } = renderCanvas();
    const canvas = getByLabelText('Canvas') as HTMLCanvasElement;

    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(225);

    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: 3,
    });
    globalThis.dispatchEvent(new Event('resize'));

    expect(canvas.width).toBe(900);
    expect(canvas.height).toBe(675);
    expect(context.setTransform).toHaveBeenLastCalledWith(3, 0, 0, 3, 0, 0);
  });

  it('redraws once after a replacement product image has loaded', () => {
    const { getByAltText, rerender } = renderCanvas();
    const firstImage = getByAltText('') as HTMLImageElement;

    rerender(
      <MockupCanvasControl
        productImageUrl="/replacement.png"
        labels={labels}
        onUpload={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    );

    const replacementImage = getByAltText('') as HTMLImageElement;
    expect(replacementImage).toBe(firstImage);
    expect(replacementImage.getAttribute('src')).toBe('/replacement.png');
    fireEvent.load(replacementImage);
    expect(context.clearRect).toHaveBeenCalled();
  });
});
