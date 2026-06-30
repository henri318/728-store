import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconCircle } from '@/shared/presentation/components/icon-circle';

describe('IconCircle', () => {
  it('renders an accessible image with the provided label', () => {
    render(<IconCircle icon="profile" color="green-dark" alt="Profile" />);

    expect(screen.getByRole('img', { name: 'Profile' })).toBeInTheDocument();
  });

  it('falls back to the icon name when no label is provided', () => {
    render(<IconCircle icon="whatsapp" color="green-dark" />);

    expect(screen.getByRole('img', { name: 'whatsapp' })).toBeInTheDocument();
  });

  it('maps the profile icon to the expected sprite', () => {
    render(<IconCircle icon="profile" color="green-dark" />);

    expect(document.querySelector('use')).toHaveAttribute(
      'href',
      '/img/sprites.svg#icon-profile',
    );
  });

  it('maps the email icon to the expected sprite', () => {
    render(<IconCircle icon="email" color="coral" />);

    expect(document.querySelector('use')).toHaveAttribute(
      'href',
      '/img/sprites.svg#icon-email',
    );
  });
});
