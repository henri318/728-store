import { getServerSession } from 'next-auth';
import { authOptions } from '@/shared/infrastructure/auth-options';
import LanguageSelector from '@/modules/presentation/components/language-selector';
import { SessionProviderWrapper } from '@/modules/presentation/components/session-provider';
import { HeaderNav } from '@/modules/presentation/components/header-nav';
import { VerificationBannerWrapper } from '@/modules/presentation/components/verification-banner-wrapper';
import { outboxWorker } from '@/workers/outbox-worker';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';

// Start the outbox worker when the server starts
if (
  process.env.NODE_ENV !== 'production' ||
  process.env.ENABLE_OUTBOX_WORKER === 'true'
) {
  outboxWorker.start();
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

  return (
    <html lang={locale}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <SessionProviderWrapper session={session}>
          <header
            style={{
              padding: '1rem',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
              Modular E-commerce
            </h1>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a
                href={`/${locale}`}
                style={{ textDecoration: 'none', color: '#0070f3' }}
              >
                {dict.common.home}
              </a>
              <LanguageSelector currentLocale={locale} />
              <HeaderNav loginLabel={dict.common.login} />
            </nav>
          </header>
          <main style={{ padding: '2rem' }}>
            <DictionaryProvider dict={dict}>
              <VerificationBannerWrapper />
              {children}
            </DictionaryProvider>
          </main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
