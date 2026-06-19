'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Modal } from '@/modules/presentation/components/modal';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/',
        redirect: false,
      });

      if (result?.error) {
        setError('Credenciales inválidas');
      } else if (result?.ok) {
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('CredentialsSignin')) {
        setError('Credenciales inválidas');
      } else {
        setError(message || 'Credencials invàlides');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Iniciar sesión</h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />
          {error && (
            <span role="alert" style={{ color: '#ff4d4f', fontSize: '0.85rem' }}>
              {error}
            </span>
          )}
          <Button type="submit" loading={loading}>
            Iniciar sesión
          </Button>
        </form>
      </div>
    </Modal>
  );
}
