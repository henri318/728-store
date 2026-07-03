'use client';

import styles from './header-banner.module.css';

interface HeaderBannerProps {
  text: string;
  speed?: number;
}

export function HeaderBanner({ text, speed = 25 }: HeaderBannerProps) {
  return (
    <div className={styles.banner}>
      <div
        className={styles.content}
        style={{ animationDuration: `${speed}s` }}
      >
        <span className={styles.text}>{text}</span>
        <span className={styles.text} aria-hidden="true">
          {text}
        </span>
        <span className={styles.text} aria-hidden="true">
          {text}
        </span>
        <span className={styles.text} aria-hidden="true">
          {text}
        </span>
      </div>
    </div>
  );
}
