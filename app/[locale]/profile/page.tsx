'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/modules/presentation/components/input';
import { Button } from '@/modules/presentation/components/button';
import { ErrorMessage } from '@/modules/presentation/components/error-message';
import { Modal } from '@/modules/presentation/components/modal';
import { useDictionary } from '@/shared/i18n/dictionary-context';

interface AddressFields {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  address: AddressFields;
}

interface ProfileForm extends ProfileData {
  address: AddressFields;
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const dict = useDictionary();
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    address: { street: '', city: '', postalCode: '', country: '' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load profile');
      }
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        address: data.address || { street: '', city: '', postalCode: '', country: '' },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
    }
  }, [status, fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const hasAddress = Object.values(form.address).some((v) => v.trim());
    const body: Record<string, unknown> = {};
    if (form.firstName) body.firstName = form.firstName;
    if (form.lastName) body.lastName = form.lastName;
    if (hasAddress) body.address = form.address;

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      setSuccess(dict.profile.updateSuccess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }
      // Redirect to home after soft-delete
      window.location.href = '/';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>{dict.common.loading}</div>;
  }

  return (
    <div style={{ maxWidth: '520px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>{dict.profile.title}</h2>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div role="alert" style={{ color: '#52c41a', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label={dict.auth.firstName}
          value={form.firstName}
          onChange={(v) => setForm((prev) => ({ ...prev, firstName: v }))}
          required
        />
        <Input
          label={dict.auth.lastName}
          value={form.lastName}
          onChange={(v) => setForm((prev) => ({ ...prev, lastName: v }))}
          required
        />
        <Input
          label={dict.auth.email}
          type="email"
          value={form.email}
          onChange={() => {}}
          disabled
        />

        <div style={{ borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>{dict.auth.address}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <Input
              label={dict.auth.street}
              value={form.address.street}
              onChange={(v) => setForm((prev) => ({
                ...prev,
                address: { ...prev.address, street: v },
              }))}
            />
            <Input
              label={dict.auth.city}
              value={form.address.city}
              onChange={(v) => setForm((prev) => ({
                ...prev,
                address: { ...prev.address, city: v },
              }))}
            />
            <Input
              label={dict.auth.postalCode}
              value={form.address.postalCode}
              onChange={(v) => setForm((prev) => ({
                ...prev,
                address: { ...prev.address, postalCode: v },
              }))}
            />
            <Input
              label={dict.auth.country}
              value={form.address.country}
              onChange={(v) => setForm((prev) => ({
                ...prev,
                address: { ...prev.address, country: v },
              }))}
            />
          </div>
        </div>

        <Button type="submit" loading={saving}>
          {dict.common.submit}
        </Button>
      </form>

      <div style={{ borderTop: '1px solid #eee', marginTop: '1.5rem', paddingTop: '1rem' }}>
        <Button
          type="button"
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          {dict.profile.deleteAccount}
        </Button>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <h3 style={{ marginTop: 0 }}>{dict.profile.deleteConfirmTitle}</h3>
        <p style={{ marginBottom: '1.5rem' }}>
          {dict.profile.deleteConfirmMessage}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)}>
            {dict.common.cancel}
          </Button>
          <Button type="button" variant="danger" loading={saving} onClick={handleDelete}>
            {dict.profile.deleteAccount}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
