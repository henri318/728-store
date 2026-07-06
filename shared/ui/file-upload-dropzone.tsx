'use client';

import { useId, useRef } from 'react';
import type { DragEvent } from 'react';
import styles from './file-upload-dropzone.module.css';

export interface FileUploadDropzoneItem {
  id: string;
  name: string;
  size?: number | null;
}

interface FileUploadDropzoneProps {
  title: string;
  helpText?: string;
  buttonLabel: string;
  removeLabel: string;
  items: FileUploadDropzoneItem[];
  multiple?: boolean;
  accept?: string;
  variant?: 'full' | 'compact';
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  emptyLabel?: string;
  selectedItemId?: string | null;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onRemoveItem: (itemId: string) => void;
}

export function FileUploadDropzone({
  title,
  helpText,
  buttonLabel,
  removeLabel,
  items,
  multiple = false,
  accept,
  variant = 'full',
  disabled = false,
  busy = false,
  busyLabel,
  emptyLabel,
  selectedItemId,
  onFilesSelected,
  onRemoveItem,
}: FileUploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const describedById = useId();

  const openPicker = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = [...fileList];
    if (files.length === 0 || disabled || busy) return;

    await onFilesSelected(multiple ? files : files.slice(0, 1));
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await handleFiles(event.dataTransfer.files);
  };

  return (
    <section
      className={`${styles.root} ${styles[variant]}`}
      aria-labelledby={`${inputId}-title`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <div className={styles.copy}>
          <h3 id={`${inputId}-title`} className={styles.title}>
            {title}
          </h3>
          {helpText ? <p id={describedById}>{helpText}</p> : null}
        </div>

        <button
          type="button"
          className={styles.trigger}
          onClick={openPicker}
          disabled={disabled || busy}
        >
          {buttonLabel}
        </button>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className={styles.input}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={buttonLabel}
        aria-describedby={helpText ? describedById : undefined}
        disabled={disabled || busy}
        onChange={(event) => {
          void handleFiles(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
        }}
      />

      {busy && busyLabel ? (
        <p className={styles.busy} role="status" aria-live="polite">
          {busyLabel}
        </p>
      ) : null}

      {items.length === 0 ? (
        emptyLabel ? (
          <p className={styles.emptyState}>{emptyLabel}</p>
        ) : null
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const isSelected = selectedItemId === item.id;

            return (
              <li
                key={item.id}
                className={`${styles.item} ${isSelected ? styles.selected : ''}`}
              >
                <div className={styles.itemMeta}>
                  <span className={styles.itemName}>{item.name}</span>
                  {typeof item.size === 'number' ? (
                    <span className={styles.itemSize}>
                      {formatBytes(item.size)}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`${removeLabel} ${item.name}`}
                  onClick={() => onRemoveItem(item.id)}
                >
                  {removeLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const value = bytes / 1024;
    return `${Number.isSafeInteger(value) ? value.toFixed(0) : value.toFixed(1)} KB`;
  }

  const value = bytes / (1024 * 1024);
  return `${Number.isSafeInteger(value) ? value.toFixed(0) : value.toFixed(1)} MB`;
}
