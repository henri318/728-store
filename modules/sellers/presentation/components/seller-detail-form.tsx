'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { ErrorMessage } from '@/shared/ui/error-message';
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
}: SellerDetailFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

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

      const responseText = await response.text().catch(() => '');

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
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.sectionTitle}>{saveLabel}</h3>

      {error ? <ErrorMessage message={error} /> : null}
      {saved ? (
        <div role="status" className={styles.successMessage}>
          {saved}
        </div>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>{nameLabel}</span>
        <input
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{descriptionLabel}</span>
        <textarea
          className={styles.textarea}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </label>

      <div className={styles.formActions}>
        <Button type="submit" loading={loading}>
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
