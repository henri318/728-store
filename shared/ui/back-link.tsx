import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './back-link.module.css';

interface BackLinkProps {
  href: string;
  children: ReactNode;
}

export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}
