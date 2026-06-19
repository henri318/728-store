'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { LoginModal } from '@/modules/presentation/components/login-modal';

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
        style={{
          background: 'none',
          border: 'none',
          color: '#0070f3',
          cursor: 'pointer',
          fontSize: '1rem',
          textDecoration: 'none',
          padding: 0,
        }}
      >
        {label}
      </button>
      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
