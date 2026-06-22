'use client';

import { signOut } from 'next-auth/react';
import styles from './logout-button.module.css';

interface LogoutButtonProps {
  label: string;
}

export default function LogoutButton({ label }: LogoutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className={styles.button}
    >
      {label}
    </button>
  );
}
