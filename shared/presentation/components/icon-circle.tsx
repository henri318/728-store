import Image from 'next/image';
import styles from './icon-circle.module.css';

type IconName =
  | 'profile'
  | 'cart'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'whatsapp'
  | 'email';
type IconColor = 'green-dark' | 'cream' | 'coral' | 'green-light' | 'lila';
type IconSize = 'sm' | 'md' | 'lg';

interface IconCircleProps {
  icon: IconName;
  color: IconColor;
  size?: IconSize;
  alt?: string;
}

const SIZE_MAP: Record<IconSize, number> = { sm: 40, md: 62, lg: 80 };

export function IconCircle({ icon, color, size = 'md', alt }: IconCircleProps) {
  return (
    <Image
      src={`/img/icons/iconos-${getIconFile(icon)}.svg`}
      alt={alt ?? icon}
      width={SIZE_MAP[size]}
      height={SIZE_MAP[size]}
      className={`${styles.circle} ${styles[size]} ${styles[color]}`}
    />
  );
}

function getIconFile(icon: IconName): string {
  const map: Record<IconName, string> = {
    profile: '07',
    cart: '04',
    facebook: '01',
    instagram: '02',
    tiktok: '03',
    whatsapp: '08',
    email: '09',
  };
  return map[icon];
}
