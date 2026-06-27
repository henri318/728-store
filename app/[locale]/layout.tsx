import { getServerSession } from 'next-auth';
import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { prisma } from '@/shared/infrastructure/prisma';
import LanguageSelector from '@/modules/presentation/components/language-selector';
import { SessionProviderWrapper } from '@/modules/presentation/components/session-provider';
import { HeaderNav } from '@/modules/presentation/components/header-nav';
import { VerificationBannerWrapper } from '@/modules/presentation/components/verification-banner-wrapper';
import { HeaderBanner } from '@/shared/presentation/components/header-banner';
import { SocialFooter } from '@/shared/presentation/components/social-footer';
import type { Role } from '@/modules/roles/domain/roles';
import { GuestCartProvider } from '@/modules/cart/presentation/guest-cart-context';
import { CartPopupProvider } from '@/modules/presentation/components/cart-popup-context';
import { CartPopup } from '@/modules/presentation/components/cart-popup';
import { outboxWorker } from '@/workers/outbox-worker';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';
import { APP_BASE_URL } from '@/shared/kernel/config';
import '../globals.css';
import styles from './layout.module.css';

const ADMIN_ROLE: Role = 'ADMIN';
const DESIGNER_ROLE: Role = 'DESIGNER';

if (
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_OUTBOX_WORKER === 'true'
) {
  outboxWorker.start();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  const baseUrl = APP_BASE_URL;
  const alternates: Record<string, string> = {};

  ['es', 'cat'].forEach((lang) => {
    alternates[lang] = `${baseUrl}/${lang}`;
  });

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: '%s | 728store',
      default: dict.common.homeTitle,
    },
    description: dict.common.homeDescription,
    keywords: dict.common.keywords.split(', '),
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/icon.svg',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        es: alternates['es'],
        ca: alternates['cat'],
        'x-default': alternates['es'],
      },
    },
  };
}

export function generateViewport(): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  const dict = await getDictionary(locale as 'es' | 'cat');

  // Show promo banner for guests, and for authenticated users who are not
  // ADMIN/DESIGNER and have no orders
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isInternal = role === ADMIN_ROLE || role === DESIGNER_ROLE;
  let showBanner = !isInternal;
  if (showBanner && session?.user?.id) {
    const orderCount = await prisma.order.count({
      where: { userId: session.user.id },
    });
    showBanner = orderCount === 0;
  }

  return (
    <html lang={locale}>
      <body className={styles.body}>
        <SessionProviderWrapper session={session}>
          <GuestCartProvider>
            <CartPopupProvider>
              <header className={styles.header}>
                <div className={styles.spacer} />
                <a href={`/${locale}`} className={styles.logo}>
                  <Image
                    src="/img/logo/logo.svg"
                    alt="Siete 28 Logo"
                    width={130}
                    height={130}
                    className={styles.logoImg}
                    priority
                  />
                </a>
                <div className={styles.userIcons}>
                  <HeaderNav
                    loginLabel={dict.common.login}
                    profileAlt={dict.common.profileIcon}
                    cartAlt={dict.common.cartIcon}
                  />
                  <LanguageSelector currentLocale={locale} />
                </div>
              </header>

              {showBanner && <HeaderBanner text={dict.common.promoBanner} />}

              <main className={styles.main}>
                <DictionaryProvider dict={dict}>
                  <VerificationBannerWrapper />
                  {children}
                </DictionaryProvider>
              </main>

              <SocialFooter />
              <CartPopup
                labels={{
                  title: dict.common.cartIcon,
                  empty: dict.common.cartEmpty,
                  browseProducts: dict.common.browseProducts,
                  checkout: dict.common.checkout,
                  viewFullCart: dict.common.viewFullCart,
                  subtotal: dict.common.subtotal,
                  loading: dict.common.loadingCart,
                }}
              />
            </CartPopupProvider>
          </GuestCartProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
