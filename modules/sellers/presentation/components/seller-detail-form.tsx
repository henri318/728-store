'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
import { TextField } from '@/shared/ui/text-field';
import { DescriptionField } from '@/shared/ui/description-field';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import styles from '@/app/[locale]/admin/sellers/[sellerId]/page.module.css';

interface SellerDetailFormProps {
  sellerId: string;
  nameLabel: string;
  descriptionLabel: string;
  saveLabel: string;
  savedLabel: string;
  errorLabel: string;
  initialName: string;
  initialDescription: string;
  unsavedChangesLabels?: {
    title: string;
    message: string;
    leave: string;
    stay: string;
  };
}

export function SellerDetailForm({
  sellerId,
  nameLabel,
  descriptionLabel,
  saveLabel,
  savedLabel,
  errorLabel,
  initialName,
  initialDescription,
  unsavedChangesLabels,
}: SellerDetailFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const guard = useUnsavedChangesGuard(
    saved === null &&
      (name !== initialName || description !== initialDescription),
    unsavedChangesLabels ?? {
      title: 'Unsaved changes',
      message: 'You have unsaved changes. Leave this page?',
      leave: 'Leave',
      stay: 'Stay',
    },
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(null);

    try {
      const response = await fetch(`/api/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      let responseText = '';
      try {
        responseText = await response.text();
      } catch {
        responseText = '';
      }

      if (!response.ok) {
        let errorMessage = '';

        if (responseText.trim()) {
          try {
            const data = JSON.parse(responseText) as {
              error?: string;
              message?: string;
            };
            errorMessage = data.error ?? data.message ?? responseText.trim();
          } catch {
            errorMessage = responseText.trim();
          }
        }

        throw new Error(errorMessage || errorLabel);
      }

      setSaved(savedLabel);
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : errorLabel);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {guard}
      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 className={styles.sectionTitle}>{saveLabel}</h3>

        {error ? <ErrorMessage message={error} /> : null}
        {saved ? (
          <div role="status" className={styles.successMessage}>
            {saved}
          </div>
        ) : null}

        <TextField label={nameLabel} value={name} onChange={setName} required />

        <DescriptionField
          label={descriptionLabel}
          value={description}
          onChange={setDescription}
        />

        <div className={styles.formActions}>
          <Button type="submit" loading={loading}>
            {saveLabel}
          </Button>
        </div>
      </form>
    </>
  );
}
