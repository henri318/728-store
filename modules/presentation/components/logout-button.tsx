'use client';

import { signOut } from 'next-auth/react';

interface LogoutButtonProps {
  label: string;
}

export default function LogoutButton({ label }: LogoutButtonProps) {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      style={{ 
        margin: '0 1rem', 
        background: 'none', 
        border: 'none', 
        color: '#ff4d4f', 
        cursor: 'pointer',
        fontSize: '1rem',
        padding: 0
      }}
    >
      {label}
    </button>
  );
}
