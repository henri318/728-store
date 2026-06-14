'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(form),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        // Map the backend error to a friendly message
        if (data.error === 'User already exists') {
          throw new Error('El mail ya existe. Por favor, usá otro.');
        }
        throw new Error(data.error || 'Algo salió mal. Reintentá.');
      }

      router.push('/auth/signin?registered=true');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{ padding: '0.7rem', background: '#fff1f0', border: '1px solid #ffa39e', color: '#cf1322', borderRadius: '4px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        <input 
          type="text" 
          placeholder="Name" 
          required
          value={form.name} 
          onChange={(e) => setForm({ ...form, name: e.target.value })} 
          style={{ padding: '0.5rem' }}
        />
        <input 
          type="email" 
          placeholder="Email" 
          required
          value={form.email} 
          onChange={(e) => setForm({ ...form, email: e.target.value })} 
          style={{ padding: '0.5rem' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          required
          value={form.password} 
          onChange={(e) => setForm({ ...form, password: e.target.value })} 
          style={{ padding: '0.5rem' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '0.7rem', 
            background: loading ? '#ccc' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Registering...' : 'Sign Up'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Already have an account? <a href="/auth/signin">Sign In</a>
      </p>
    </div>
  );
}

