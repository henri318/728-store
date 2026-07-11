import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { ProductShowcaseGallery } from '@/app/[locale]/products/[id]/product-showcase-gallery';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line sonarjs/no-unused-vars
    const { unoptimized: _unoptimized, ...rest } =
      props as ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean };
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe('ProductShowcaseGallery', () => {
  const labels = {
    previous: 'Previous',
    next: 'Next',
  };

  const items = [
    {
      id: 'cover-1',
      url: '/cover.jpg',
      alt: 'Cover art',
      mimeType: 'image/jpeg',
      posterUrl: null,
    },
    {
      id: 'showcase-1',
      url: '/demo.mp4',
      alt: 'Demo video',
      mimeType: 'video/mp4',
      posterUrl: '/poster.jpg',
    },
  ];

  it('starts on the cover and moves to the showcase media with the next button', () => {
    render(<ProductShowcaseGallery items={items} labels={labels} />);

    expect(screen.getByAltText('Cover art')).toBeInTheDocument();
    expect(screen.queryByLabelText('Demo video')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: labels.next }));

    const video = screen.getByLabelText('Demo video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('poster', '/poster.jpg');
    expect(screen.queryByAltText('Cover art')).toBeNull();
  });

  it('supports swipe navigation', () => {
    render(<ProductShowcaseGallery items={items} labels={labels} />);

    const viewport = screen.getByTestId('showcase-viewport');
    expect(viewport).toHaveAttribute('tabindex', '0');

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 220,
      clientY: 40,
    });
    fireEvent.pointerUp(viewport, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 120,
      clientY: 40,
    });

    expect(screen.getByLabelText('Demo video')).toBeInTheDocument();
  });

  it('falls back to touch swipe navigation when pointer events are unavailable', () => {
    vi.stubGlobal('PointerEvent', undefined);

    try {
      render(<ProductShowcaseGallery items={items} labels={labels} />);

      const viewport = screen.getByTestId('showcase-viewport');

      fireEvent.touchStart(viewport, {
        touches: [{ clientX: 220, clientY: 40 }],
      });
      fireEvent.touchEnd(viewport, {
        changedTouches: [{ clientX: 120, clientY: 40 }],
      });

      expect(screen.getByLabelText('Demo video')).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('supports keyboard navigation for accessibility', () => {
    render(<ProductShowcaseGallery items={items} labels={labels} />);

    const viewport = screen.getByTestId('showcase-viewport');

    fireEvent.keyDown(viewport, { key: 'ArrowRight' });

    expect(screen.getByLabelText('Demo video')).toBeInTheDocument();
  });
});
