import { getServerSession } from 'next-auth';
import type { Metadata, Viewport } from 'next';
import { authOptions } from '@/shared/infrastructure/auth-options';
import { prisma } from '@/shared/infrastructure/prisma';
import LanguageSelector from '@/modules/presentation/components/language-selector';
import { SessionProviderWrapper } from '@/modules/presentation/components/session-provider';
import { HeaderNav } from '@/modules/presentation/components/header-nav';
import { VerificationBannerWrapper } from '@/modules/presentation/components/verification-banner-wrapper';
import { HeaderBanner } from '@/shared/presentation/components/header-banner';
import { SocialFooter } from '@/shared/presentation/components/social-footer';
import type { Role } from '@/modules/roles/domain/roles';
import { outboxWorker } from '@/workers/outbox-worker';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';
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

  const titleMap: Record<string, string> = {
    es: 'Plataforma de Comercio Electrónico Modular',
    cat: 'Plataforma de Comerç Electrònic Modular',
  };

  const descriptionMap: Record<string, string> = {
    es: 'Descubre la mejor plataforma de comercio electrónico modular. Diseñada para vendedores y compradores con tecnología moderna y fácil uso.',
    cat: 'Descobreix la millor plataforma de comerç electrònic modular. Dissenyada per a venedors i compradors amb tecnologia moderna i fàcil ús.',
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const alternates: Record<string, string> = {};

  ['es', 'cat'].forEach((lang) => {
    alternates[lang] = `${baseUrl}/${lang}`;
  });

  return {
    title: {
      template: '%s | 728store',
      default: `${titleMap[locale]} | 728store`,
    },
    description: descriptionMap[locale],
    keywords: [
      'ecommerce',
      'modular',
      'tienda online',
      'plataforma',
      'venta online',
      locale === 'cat' ? 'compra online' : 'comprar online',
    ],
    robots: {
      index: true,
      follow: true,
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
          <header className={styles.header}>
            <div className={styles.spacer} />
            <a href={`/${locale}`} className={styles.logo}>
              <img
                src="/img/logo/logo.svg"
                alt="Siete 28 Logo"
                className={styles.logoImg}
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
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
