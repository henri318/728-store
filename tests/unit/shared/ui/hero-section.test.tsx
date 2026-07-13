import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

import { HeroSection } from '@/shared/ui/hero-section';

describe('HeroSection', () => {
  it('eagerly loads its above-the-fold image', () => {
    render(
      <HeroSection
        imageSrc="/img/decorations/Portada.png"
        imageAlt="Portada"
      />,
    );

    expect(screen.getByAltText('Portada')).toHaveAttribute('loading', 'eager');
  });
});
