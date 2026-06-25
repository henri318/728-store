import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialFooter } from '@/shared/presentation/components/social-footer';

describe('SocialFooter', () => {
  it('renders 5 social links', () => {
    render(<SocialFooter />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });

  it('renders facebook link with correct image', () => {
    render(<SocialFooter />);
    const fbLink = screen.getByLabelText('Facebook');
    const img = fbLink.querySelector('img');
    expect(img).toHaveAttribute('src', '/img/icons/iconos-01.svg');
  });

  it('renders instagram link with correct image', () => {
    render(<SocialFooter />);
    const igLink = screen.getByLabelText('Instagram');
    const img = igLink.querySelector('img');
    expect(img).toHaveAttribute('src', '/img/icons/iconos-02.svg');
  });

  it('renders tiktok link', () => {
    render(<SocialFooter />);
    const ttLink = screen.getByLabelText('TikTok');
    expect(ttLink).toBeTruthy();
  });

  it('renders whatsapp link', () => {
    render(<SocialFooter />);
    const waLink = screen.getByLabelText('WhatsApp');
    expect(waLink).toBeTruthy();
  });

  it('renders email link', () => {
    render(<SocialFooter />);
    const emailLink = screen.getByLabelText('Email');
    expect(emailLink).toBeTruthy();
  });

  it('applies the footer container class', () => {
    const { container } = render(<SocialFooter />);
    const footer = container.firstChild as HTMLElement;
    const className = footer.getAttribute('class') ?? '';
    expect(className).toMatch(/footer/);
  });

  it('links open in new tab', () => {
    render(<SocialFooter />);
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
