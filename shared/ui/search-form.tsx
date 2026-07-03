import styles from './search-form.module.css';

interface SearchFormProps {
  placeholder: string;
  ariaLabel: string;
  defaultValue?: string;
  hiddenFields?: Record<string, string>;
}

export function SearchForm({
  placeholder,
  ariaLabel,
  defaultValue,
  hiddenFields,
}: SearchFormProps) {
  return (
    <form className={styles.searchForm} method="get">
      <div className={styles.inputWrap}>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={styles.searchInput}
          aria-label={ariaLabel}
        />
        <button
          type="submit"
          className={styles.searchButton}
          aria-label={ariaLabel}
        >
          <svg aria-hidden="true" className={styles.searchIcon}>
            <use href="/img/icons/sprites.svg#icon-search" />
          </svg>
        </button>
      </div>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) => (
          <input type="hidden" key={key} name={key} value={value} />
        ))}
    </form>
  );
}
