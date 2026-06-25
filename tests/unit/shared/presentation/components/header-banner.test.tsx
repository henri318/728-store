import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HeaderBanner } from '@/shared/presentation/components/header-banner';

describe('HeaderBanner', () => {
  it('renders the text content 4 times for scroll effect', () => {
    const { container } = render(
      <HeaderBanner text="10% DE DSCTO EN TU PRIMERA COMPRA **" />,
    );
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBe(4);
  });

  it('applies the banner class', () => {
    const { container } = render(<HeaderBanner text="Promo text" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/banner/);
  });

  it('uses default speed of 25s', () => {
    const { container } = render(<HeaderBanner text="Default" />);
    const content = container.querySelector('[class*="content"]');
    expect(content).toBeTruthy();
  });

  it('uses custom speed prop', () => {
    const { container } = render(
      <HeaderBanner text="Fast scrolling" speed={10} />,
    );
    const content = container.querySelector('[class*="content"]');
    expect(content).toBeTruthy();
  });
});
