import styles from './social-footer.module.css';

interface SocialLink {
  icon: string;
  alt: string;
  href: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  { icon: 'facebook', alt: 'Facebook', href: 'https://facebook.com' },
  { icon: 'instagram', alt: 'Instagram', href: 'https://instagram.com' },
  { icon: 'tiktok', alt: 'TikTok', href: 'https://tiktok.com' },
  { icon: 'whatsapp', alt: 'WhatsApp', href: 'https://wa.me' },
  { icon: 'email', alt: 'Email', href: 'mailto:info@728store.com' },
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
            <use href={`/img/sprites.svg#icon-${link.icon}`} />
          </svg>
        </a>
      ))}
    </footer>
  );
}
