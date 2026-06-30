'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { Modal } from '@/shared/ui/modal';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './page.module.css';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const dict = useDictionary();
  const role = session?.user?.role;
  const showAddress = role === 'CUSTOMER';
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${locale}/auth/signin`);
      return;
    }
    if (status !== 'authenticated') return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/users/me');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }
        if (!cancelled) {
          setForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            address: data.address || {
              street: '',
              city: '',
              postalCode: '',
              country: '',
            },
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load profile',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, locale, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const hasAddress = Object.values(form.address).some((v) => v.trim());
    const body: Record<string, unknown> = {};
    if (form.firstName) body.firstName = form.firstName;
    if (form.lastName) body.lastName = form.lastName;
    if (showAddress && hasAddress) body.address = form.address;

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
    return <div className={styles.loading}>{dict.common.loading}</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{dict.profile.title}</h2>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div role="alert" className={styles.successMessage}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className={styles.form}>
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

        {showAddress && (
          <div className={styles.addressSection}>
            <h3 className={styles.addressTitle}>{dict.auth.address}</h3>
            <div className={styles.addressFields}>
              <Input
                label={dict.auth.street}
                value={form.address.street}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, street: v },
                  }))
                }
              />
              <Input
                label={dict.auth.city}
                value={form.address.city}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: v },
                  }))
                }
              />
              <Input
                label={dict.auth.postalCode}
                value={form.address.postalCode}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, postalCode: v },
                  }))
                }
              />
              <Input
                label={dict.auth.country}
                value={form.address.country}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, country: v },
                  }))
                }
              />
            </div>
          </div>
        )}

        <Button type="submit" loading={saving}>
          {dict.common.submit}
        </Button>
      </form>

      <div className={styles.deleteSection}>
        <Button
          type="button"
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          {dict.profile.deleteAccount}
        </Button>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <h3 className={styles.modalTitle}>{dict.profile.deleteConfirmTitle}</h3>
        <p className={styles.modalMessage}>
          {dict.profile.deleteConfirmMessage}
        </p>
        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            {dict.common.cancel}
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={saving}
            onClick={handleDelete}
          >
            {dict.profile.deleteAccount}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
