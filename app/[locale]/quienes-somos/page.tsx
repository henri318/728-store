import Image from 'next/image';
import type { Metadata } from 'next';
import { getDictionary } from '@/shared/i18n/get-dictionary';
import { APP_BASE_URL } from '@/shared/kernel/config';
import styles from './page.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');
  const canonical = `${APP_BASE_URL}/${locale}/quienes-somos`;
  const defaultUrl = `${APP_BASE_URL}/es/quienes-somos`;

  return {
    title: dict.common.aboutMetaTitle,
    description: dict.common.aboutMetaDescription,
    alternates: {
      canonical,
      languages: {
        es: defaultUrl,
        ca: `${APP_BASE_URL}/cat/quienes-somos`,
        'x-default': defaultUrl,
      },
    },
    openGraph: {
      url: canonical,
      title: dict.common.aboutMetaTitle,
      description: dict.common.aboutMetaDescription,
      images: ['/img/decorations/Al-Taller.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.common.aboutMetaTitle,
      description: dict.common.aboutMetaDescription,
      images: ['/img/decorations/Al-Taller.png'],
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as 'es' | 'cat');

  return (
    <section className={styles.page} aria-labelledby="about-title">
      <div className={styles.content}>
        <div className={styles.copy}>
          <h1 id="about-title" className={styles.title}>
            {dict.common.aboutTitle}
          </h1>
          <p className={styles.description}>{dict.common.aboutDescription}</p>
          <p className={styles.description}>{dict.common.aboutStory}</p>
          <p className={styles.slogan}>{dict.common.aboutSlogan}</p>
        </div>

        <div className={styles.imageFrame}>
          <Image
            src="/img/decorations/Al-Taller.png"
            alt={dict.common.aboutImageAlt}
            width={660}
            height={660}
            className={styles.image}
            priority
          />
        </div>
      </div>
    </section>
  );
}
