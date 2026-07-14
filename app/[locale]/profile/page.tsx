'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { TextField } from '@/shared/ui/text-field';
import { BackLink } from '@/shared/ui/back-link';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { DeleteConfirmModal } from '@/shared/ui/delete-confirm-modal';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './page.module.css';
import {
  AddressAutocompleteFields,
  type AddressValue,
} from '@/modules/users/presentation/components/address-autocomplete-fields';

type AddressFields = AddressValue;

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
  const isShowAddress = role === 'CUSTOMER';
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    address: {},
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

    let isCancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/users/me');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }
        if (!isCancelled) {
          setForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            address: data.address || {},
          });
        }
      } catch (error_: unknown) {
        if (!isCancelled) {
          setError(
            error_ instanceof Error ? error_.message : 'Failed to load profile',
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [status, locale, router]);

  if (status === 'loading' || loading) {
    return <div className={styles.loading}>{dict.common.loading}</div>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const userFields = [
      'street',
      'houseNumber',
      'postalCode',
      'city',
      'floor',
      'door',
      'instructions',
    ] as const;
    const hasAddress = userFields.some((f) => form.address[f]?.trim());
    const body: Record<string, unknown> = {};
    if (form.firstName) body.firstName = form.firstName;
    if (form.lastName) body.lastName = form.lastName;
    if (isShowAddress && hasAddress) body.address = form.address;

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
    } catch (error_: unknown) {
      setError(
        error_ instanceof Error ? error_.message : 'Failed to update profile',
      );
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
      globalThis.location.assign('/');
    } catch (error_: unknown) {
      setError(
        error_ instanceof Error ? error_.message : 'Failed to delete account',
      );
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className={styles.container}>
      <BackLink href={`/${locale}`}>{dict.common.backToHome}</BackLink>

      <Card padding="lg">
        <h2 className={styles.title}>{dict.profile.title}</h2>

        {error && <ErrorMessage message={error} />}
        {success && (
          <div role="alert" className={styles.successMessage}>
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className={styles.form}>
          <TextField
            label={dict.auth.firstName}
            value={form.firstName}
            onChange={(v) => setForm((prev) => ({ ...prev, firstName: v }))}
            required
          />
          <TextField
            label={dict.auth.lastName}
            value={form.lastName}
            onChange={(v) => setForm((prev) => ({ ...prev, lastName: v }))}
            required
          />
          <TextField
            label={dict.auth.email}
            type="email"
            value={form.email}
            onChange={() => {}}
            disabled
          />

          {isShowAddress && (
            <div className={styles.addressSection}>
              <h3 className={styles.addressTitle}>{dict.auth.address}</h3>
              <div className={styles.addressFields}>
                <AddressAutocompleteFields
                  value={form.address}
                  onChange={(address) =>
                    setForm((prev) => ({ ...prev, address }))
                  }
                  locale={locale === 'cat' ? 'cat' : 'es'}
                  labels={{
                    street: dict.auth.street,
                    houseNumber: dict.auth.houseNumber,
                    postalCode: dict.auth.postalCode,
                    city: dict.auth.city,
                    floor: dict.auth.floor,
                    door: dict.auth.door,
                    instructions: dict.auth.instructions,
                    countryLabel: dict.auth.countryLabel,
                    searchPlaceholder: dict.auth.searchPlaceholder,
                    noResults: dict.auth.noResults,
                    retry: dict.auth.retry,
                    providerError: dict.auth.providerError,
                    listboxLabel: dict.auth.listboxLabel,
                    composedLabel: dict.auth.composedLabel,
                  }}
                />
              </div>
            </div>
          )}

          <div className={styles.buttonRow}>
            <Button type="submit" loading={saving}>
              {dict.common.submit}
            </Button>
          </div>
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

        <DeleteConfirmModal
          open={showDeleteModal}
          title={dict.profile.deleteConfirmTitle}
          message={dict.profile.deleteConfirmMessage}
          confirmLabel={dict.profile.deleteAccount}
          cancelLabel={dict.common.cancel}
          loading={saving}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      </Card>
    </div>
  );
}
