'use client';

import { useState } from 'react';
import { TextField } from '@/shared/ui/text-field';
import { BackLink } from '@/shared/ui/back-link';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { DeleteConfirmModal } from '@/shared/ui/delete-confirm-modal';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import {
  AddressAutocompleteFields,
  type AddressValue,
} from '@/modules/users/presentation/components/address-autocomplete-fields';
import styles from './page.module.css';

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  address: AddressValue;
}

interface ProfileFormProps {
  locale: string;
  profile: ProfileData;
  role?: string;
}

export function ProfileForm({ locale, profile, role }: ProfileFormProps) {
  const dict = useDictionary();
  const isShowAddress = role === 'CUSTOMER';
  const [form, setForm] = useState<ProfileData>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const hasAddress = [
      form.address.street,
      form.address.houseNumber,
      form.address.postalCode,
      form.address.city,
      form.address.floor,
      form.address.door,
      form.address.instructions,
    ].some((value) => value?.trim());
    const hasAddressChanged =
      JSON.stringify(form.address) !== JSON.stringify(profile.address);
    const body: Record<string, unknown> = {};
    if (form.firstName) body.firstName = form.firstName;
    if (form.lastName) body.lastName = form.lastName;
    if (isShowAddress && hasAddressChanged) {
      body.address = hasAddress ? form.address : null;
    }

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

          {success && (
            <div role="alert" className={styles.successMessage}>
              {success}
            </div>
          )}
          <div className={styles.buttonRow}>
            <Button type="submit" loading={saving}>
              {dict.profile.save}
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
