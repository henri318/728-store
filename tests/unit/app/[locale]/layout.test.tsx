import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/shared/infrastructure/auth-options', () => ({ authOptions: {} }));
vi.mock('@/shared/infrastructure/prisma', () => ({
  prisma: { order: { count: vi.fn() } },
}));
vi.mock('@/shared/layout/language-selector', () => ({ default: () => null }));
vi.mock('@/shared/layout/session-provider', () => ({
  SessionProviderWrapper: ({ children }: { children: React.ReactNode }) =>
    children,
}));
vi.mock('@/shared/layout/header-nav', () => ({ HeaderNav: () => null }));
vi.mock('@/shared/layout/verification-banner-wrapper', () => ({
  VerificationBannerWrapper: () => null,
}));
vi.mock('@/shared/ui/header-banner', () => ({ HeaderBanner: () => null }));
vi.mock('@/shared/ui/social-footer', () => ({ SocialFooter: () => null }));
vi.mock('@/modules/cart/presentation/guest-cart-context', () => ({
  GuestCartProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/modules/cart/presentation/components/cart-popup-context', () => ({
  CartPopupProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/modules/cart/presentation/components/cart-popup', () => ({
  CartPopup: () => null,
}));
vi.mock('@/modules/cart/presentation/components/cart-merge-detector', () => ({
  CartMergeDetector: () => null,
}));
vi.mock('@/workers/outbox-worker', () => ({
  outboxWorker: { start: vi.fn() },
}));
vi.mock('@/composition-root/container', () => ({ initContainer: vi.fn() }));
vi.mock('@/shared/i18n/get-dictionary', () => ({
  getDictionary: vi.fn().mockResolvedValue({ common: {} }),
}));
vi.mock('next/image', () => ({ default: () => null }));

import RootLayout from '@/app/[locale]/layout';

describe('RootLayout', () => {
  it('uses the BCP-47 Catalan language tag for the cat route locale', async () => {
    const element = await RootLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ locale: 'cat' }),
    });

    expect(element.props.lang).toBe('ca');
  });
});
