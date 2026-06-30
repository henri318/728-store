import styles from './icon-circle.module.css';

type IconName =
  | 'profile'
  | 'cart'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'whatsapp'
  | 'email'
  | 'add'
  | 'search';
type IconColor = 'green-dark' | 'cream' | 'coral' | 'green-light' | 'lila';
type IconSize = 'sm' | 'md' | 'lg';

interface IconCircleProps {
  icon: IconName;
  color: IconColor;
  size?: IconSize;
  alt?: string;
}

export function IconCircle({ icon, color, size = 'md', alt }: IconCircleProps) {
  return (
    <span
      className={`${styles.circle} ${styles[size]} ${styles[color]}`}
      role="img"
      aria-label={alt ?? icon}
    >
      <svg className={styles.iconSvg} aria-hidden="true">
        <use href={`/img/icons/sprites.svg#icon-${icon}`} />
      </svg>
    </span>
  );
}
