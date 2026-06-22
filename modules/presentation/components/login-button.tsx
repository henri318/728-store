'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { LoginModal } from '@/modules/presentation/components/login-modal';
import styles from './login-button.module.css';

interface LoginButtonProps {
  label: string;
}

export function LoginButton({ label }: LoginButtonProps) {
  const { status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hide the login trigger when the user is authenticated
  if (status === 'authenticated') {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={styles.button}
      >
        {label}
      </button>
      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
