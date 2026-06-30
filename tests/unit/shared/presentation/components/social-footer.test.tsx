import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialFooter } from '@/shared/presentation/components/social-footer';

describe('SocialFooter', () => {
  it('renders 5 social links', () => {
    render(<SocialFooter />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });

  it('renders the expected social link labels', () => {
    render(<SocialFooter />);

    for (const label of [
      'Facebook',
      'Instagram',
      'TikTok',
      'WhatsApp',
      'Email',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('opens links in a new tab', () => {
    render(<SocialFooter />);

    screen.getAllByRole('link').forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
  });

  it('uses the expected external destinations for major links', () => {
    render(<SocialFooter />);

    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/728merch',
    );
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/728_studio',
    );
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:informes.728@gmail.com',
    );
  });
});
