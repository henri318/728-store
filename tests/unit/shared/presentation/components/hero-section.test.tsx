import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/shared/presentation/components/hero-section';

describe('HeroSection', () => {
  it('renders the image with correct alt text', () => {
    render(
      <HeroSection imageSrc="/img/hero/Elementos-14.svg" imageAlt="Regalo" />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/img/hero/Elementos-14.svg');
    expect(img).toHaveAttribute('alt', 'Regalo');
  });

  it('applies the hero container class', () => {
    const { container } = render(
      <HeroSection imageSrc="/img/hero/Elementos-14.svg" imageAlt="Regalo" />,
    );
    const hero = container.firstChild as HTMLElement;
    expect(hero.className).toMatch(/hero/);
  });

  it('includes a wave-top SVG at the bottom', () => {
    const { container } = render(
      <HeroSection imageSrc="/img/hero/Elementos-14.svg" imageAlt="Regalo" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has coral colored wave path', () => {
    const { container } = render(
      <HeroSection imageSrc="/img/hero/Elementos-14.svg" imageAlt="Regalo" />,
    );
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('fill', 'var(--color-coral)');
  });
});
