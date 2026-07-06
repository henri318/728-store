'use client';

import { useState, type KeyboardEvent } from 'react';
import { useDictionary } from '@/shared/i18n/dictionary-context';
import styles from './tag-list.module.css';

interface TagListProps {
  label: string;
  placeholder?: string;
  addLabel: string;
  emptyLabel: string;
  value: string[] | null;
  onChange: (value: string[] | null) => void;
}

export function TagList({
  label,
  placeholder,
  addLabel,
  emptyLabel,
  value,
  onChange,
}: TagListProps) {
  const dict = useDictionary();
  const [inputValue, setInputValue] = useState('');

  const tags = value ?? [];

  const commitTags = (raw: string) => {
    const rawTags = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawTags.length === 0) return;

    const existingLower = new Set(tags.map((t) => t.toLowerCase()));
    const next = [...tags];
    for (const t of rawTags) {
      if (existingLower.has(t.toLowerCase())) {
        continue;
      }

      next.push(t);
      existingLower.add(t.toLowerCase());
    }

    onChange(next.length > 0 ? next : null);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTags(inputValue);
    }
  };

  const inputId = `tag-list-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          id={inputId}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => commitTags(inputValue)}
        >
          {addLabel}
        </button>
      </div>
      {tags.length > 0 ? (
        <div className={styles.list}>
          {tags.map((tag, i) => (
            <span key={tag} className={styles.pill}>
              <span>{tag}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeTag(i)}
                aria-label={`${dict.common.removeFromCart ?? 'Remove'} ${tag}`}
              >
                {'\u00D7'}
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{emptyLabel}</p>
      )}
    </div>
  );
}
