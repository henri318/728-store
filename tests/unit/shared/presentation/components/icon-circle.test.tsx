import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconCircle } from '@/shared/presentation/components/icon-circle';

describe('IconCircle', () => {
  it('renders a span with role="img"', () => {
    render(<IconCircle icon="profile" color="green-dark" />);
    const el = screen.getByRole('img');
    expect(el).toBeTruthy();
  });

  it('renders an svg with the correct sprite href', () => {
    render(<IconCircle icon="profile" color="green-dark" />);
    const use = document.querySelector('use');
    expect(use).toBeTruthy();
    expect(use?.getAttribute('href')).toBe('/img/sprites.svg#icon-profile');
  });

  it('applies the sm size class', () => {
    const { container } = render(
      <IconCircle icon="cart" color="coral" size="sm" />,
    );
    const span = container.querySelector('span');
    expect(span?.getAttribute('class')).toMatch(/sm/);
  });

  it('applies the md size class by default', () => {
    const { container } = render(<IconCircle icon="cart" color="coral" />);
    const span = container.querySelector('span');
    expect(span?.getAttribute('class')).toMatch(/md/);
  });

  it('applies the lg size class', () => {
    const { container } = render(
      <IconCircle icon="cart" color="coral" size="lg" />,
    );
    const span = container.querySelector('span');
    expect(span?.getAttribute('class')).toMatch(/lg/);
  });

  it('applies the correct color class', () => {
    const { container } = render(<IconCircle icon="facebook" color="cream" />);
    const span = container.querySelector('span');
    expect(span?.getAttribute('class')).toMatch(/cream/);
  });

  it('applies the correct aria-label', () => {
    render(<IconCircle icon="tiktok" color="green-light" alt="TikTok" />);
    const el = screen.getByRole('img');
    expect(el).toHaveAttribute('aria-label', 'TikTok');
  });

  it('uses icon name as aria-label when alt is not provided', () => {
    render(<IconCircle icon="whatsapp" color="green-dark" />);
    const el = screen.getByRole('img');
    expect(el).toHaveAttribute('aria-label', 'whatsapp');
  });

  it('maps profile icon to sprite href', () => {
    render(<IconCircle icon="profile" color="green-dark" />);
    const use = document.querySelector('use');
    expect(use?.getAttribute('href')).toBe('/img/sprites.svg#icon-profile');
  });

  it('maps email icon to sprite href', () => {
    render(<IconCircle icon="email" color="coral" />);
    const use = document.querySelector('use');
    expect(use?.getAttribute('href')).toBe('/img/sprites.svg#icon-email');
  });
});
