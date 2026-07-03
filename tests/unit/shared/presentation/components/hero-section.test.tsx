import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/shared/ui/hero-section';

describe('HeroSection', () => {
  it('renders the image with correct alt text', () => {
    render(
      <HeroSection imageSrc="/img/hero/Elementos-14.svg" imageAlt="Regalo" />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/img/hero/Elementos-14.svg');
    expect(img).toHaveAttribute('alt', 'Regalo');
  });
});
