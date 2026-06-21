import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next-auth SessionProvider
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-auth-session-provider">{children}</div>
  ),
}));

import { SessionProviderWrapper } from '@/modules/presentation/components/session-provider';

describe('SessionProviderWrapper', () => {
  it('renders children inside NextAuth SessionProvider', () => {
    render(
      <SessionProviderWrapper session={null}>
        <span>Child content</span>
      </SessionProviderWrapper>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(
      screen.getByTestId('next-auth-session-provider'),
    ).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <SessionProviderWrapper session={null}>
        <span>First</span>
        <span>Second</span>
      </SessionProviderWrapper>,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('renders nothing when no children provided', () => {
    render(
      <SessionProviderWrapper session={null}>{null}</SessionProviderWrapper>,
    );
    expect(
      screen.getByTestId('next-auth-session-provider'),
    ).toBeInTheDocument();
  });
});
