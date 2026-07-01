import styles from './social-footer.module.css';

interface SocialLink {
  icon: string;
  alt: string;
  href: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    icon: 'facebook',
    alt: 'Facebook',
    href: 'https://www.facebook.com/728merch',
  },
  {
    icon: 'instagram',
    alt: 'Instagram',
    href: 'https://www.instagram.com/728_studio',
  },
  {
    icon: 'tiktok',
    alt: 'TikTok',
    href: 'https://www.tiktok.com/@studio.728?_r=1&_t=ZN-97e3Ez9CP0Y',
  },
  { icon: 'whatsapp', alt: 'WhatsApp', href: 'https://wa.me/34635274152' },
  { icon: 'email', alt: 'Email', href: 'mailto:informes.728@gmail.com' },
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
          <svg className={styles.icon} aria-hidden="true">
            <use href={`/img/icons/sprites.svg#icon-${link.icon}`} />
          </svg>
        </a>
      ))}
    </footer>
  );
}
