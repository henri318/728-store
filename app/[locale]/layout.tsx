import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import LogoutButton from '@/shared/presentation/components/logout-button';
import LanguageSelector from '@/shared/presentation/components/language-selector';
import { outboxWorker } from '@/shared/infrastructure/outbox-worker';
import { getDictionary } from '@/shared/i18n/get-dictionary';

// Start the outbox worker when the server starts
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_OUTBOX_WORKER === 'true') {
  outboxWorker.start();
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  const dict = await getDictionary(locale as 'es' | 'cat');

  return (
    <html lang={locale}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <header style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Modular E-commerce</h1>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a href={`/${locale}`} style={{ textDecoration: 'none', color: '#0070f3' }}>{dict.common.home}</a>
            <LanguageSelector currentLocale={locale} />
            {session ? (
              <>
                <span style={{ fontSize: '0.9rem', color: '#666' }}>{dict.common.hi}, {session.user?.name}</span>
                <LogoutButton label={dict.common.logout} />
              </>
            ) : (
              <a href={`/${locale}/auth/signin`} style={{ textDecoration: 'none', color: '#0070f3' }}>{dict.common.login}</a>
            )}
          </nav>
        </header>
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
