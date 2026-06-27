import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialFooter } from '@/shared/presentation/components/social-footer';

describe('SocialFooter', () => {
  it('renders 5 social links', () => {
    render(<SocialFooter />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });

  it('renders facebook link with correct sprite href', () => {
    render(<SocialFooter />);
    const fbLink = screen.getByLabelText('Facebook');
    const use = fbLink.querySelector('use');
    expect(use).toHaveAttribute('href', '/img/sprites.svg#icon-facebook');
  });

  it('renders instagram link with correct sprite href', () => {
    render(<SocialFooter />);
    const igLink = screen.getByLabelText('Instagram');
    const use = igLink.querySelector('use');
    expect(use).toHaveAttribute('href', '/img/sprites.svg#icon-instagram');
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
