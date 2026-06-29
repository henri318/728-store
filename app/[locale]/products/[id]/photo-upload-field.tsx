'use client';

import { useState, useTransition } from 'react';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg'];

export interface PhotoUploadResult {
  imageUploadId: string;
  imageUrl: string;
}

interface PhotoUploadFieldProps {
  label: string;
  replaceLabel: string;
  removeLabel: string;
  invalidImageLabel: string;
  imageTooLargeLabel: string;
  value: string | null;
  onUpload: (file: File) => Promise<PhotoUploadResult>;
  onUploaded?: (result: PhotoUploadResult) => void;
  onRemove: () => void;
}

export function PhotoUploadField({
  label,
  replaceLabel,
  removeLabel,
  invalidImageLabel,
  imageTooLargeLabel,
  value,
  onUpload,
  onUploaded,
  onRemove,
}: PhotoUploadFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError(invalidImageLabel);
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError(imageTooLargeLabel);
      return;
    }

    setError(null);
    startTransition(() => {
      void onUpload(file).then((result) => {
        onUploaded?.(result);
      });
    });
  };

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFile(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <label>
        <span>{value ? replaceLabel : label}</span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'customization-photo-error' : undefined}
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {value && (
        <button type="button" onClick={onRemove}>
          {removeLabel}
        </button>
      )}
      {error && (
        <p id="customization-photo-error" role="alert">
          {error}
        </p>
      )}
      {isPending && !error && (
        <p id="customization-photo-status" role="status" aria-live="polite">
          Uploading...
        </p>
      )}
    </div>
  );
}
