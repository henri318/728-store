import Image from 'next/image';
import styles from './social-footer.module.css';

interface SocialLink {
  src: string;
  alt: string;
  href: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    src: '/img/icons/iconos-01.svg',
    alt: 'Facebook',
    href: 'https://facebook.com',
  },
  {
    src: '/img/icons/iconos-02.svg',
    alt: 'Instagram',
    href: 'https://instagram.com',
  },
  {
    src: '/img/icons/iconos-03.svg',
    alt: 'TikTok',
    href: 'https://tiktok.com',
  },
  { src: '/img/icons/iconos-08.svg', alt: 'WhatsApp', href: 'https://wa.me' },
  {
    src: '/img/icons/iconos-09.svg',
    alt: 'Email',
    href: 'mailto:info@728store.com',
  },
];

export function SocialFooter() {
  return (
    <footer className={styles.footer}>
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.alt}
          href={link.href}
          aria-label={link.alt}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src={link.src}
            alt={link.alt}
            width={50}
            height={50}
            className={styles.icon}
          />
        </a>
      ))}
    </footer>
  );
}
