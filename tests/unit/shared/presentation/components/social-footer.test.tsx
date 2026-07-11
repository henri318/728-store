import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialFooter } from '@/shared/ui/social-footer';

describe('SocialFooter', () => {
  it('renders all social links with correct attributes', () => {
    render(<SocialFooter />);
    const links = screen.getAllByRole('link');

    expect(links.length).toBe(5);

    const expected = [
      { label: 'Facebook', href: 'https://www.facebook.com/728merch' },
      { label: 'Instagram', href: 'https://www.instagram.com/728_studio' },
      {
        label: 'TikTok',
        href: 'https://www.tiktok.com/@studio.728?_r=1&_t=ZN-97e3Ez9CP0Y',
      },
      { label: 'WhatsApp', href: 'https://wa.me/34635274152' },
      { label: 'Email', href: 'mailto:informes.728@gmail.com' },
    ];

    for (const { label, href } of expected) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });
});
