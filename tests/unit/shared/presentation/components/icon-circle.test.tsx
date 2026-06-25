import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconCircle } from '@/shared/presentation/components/icon-circle';

describe('IconCircle', () => {
  it('renders an img with the correct icon source', () => {
    render(<IconCircle icon="profile" color="green-dark" />);
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('/img/icons/iconos-07.svg');
  });

  it('applies the sm size class', () => {
    const { container } = render(
      <IconCircle icon="cart" color="coral" size="sm" />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('class')).toMatch(/sm/);
  });

  it('applies the md size class by default', () => {
    const { container } = render(<IconCircle icon="cart" color="coral" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('class')).toMatch(/md/);
  });

  it('applies the lg size class', () => {
    const { container } = render(
      <IconCircle icon="cart" color="coral" size="lg" />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('class')).toMatch(/lg/);
  });

  it('applies the correct color class', () => {
    const { container } = render(<IconCircle icon="facebook" color="cream" />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('class')).toMatch(/cream/);
  });

  it('applies the correct alt text', () => {
    render(<IconCircle icon="tiktok" color="green-light" alt="TikTok" />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('alt', 'TikTok');
  });

  it('uses icon name as alt when alt is not provided', () => {
    render(<IconCircle icon="whatsapp" color="green-dark" />);
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('alt', 'whatsapp');
  });

  it('maps profile icon to iconos-07.svg', () => {
    render(<IconCircle icon="profile" color="green-dark" />);
    const img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img/icons/iconos-07.svg');
  });

  it('maps email icon to iconos-09.svg', () => {
    render(<IconCircle icon="email" color="coral" />);
    const img = document.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/img/icons/iconos-09.svg');
  });
});
