import styles from './pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildPageUrl: (page: number) => string;
  prevLabel: string;
  nextLabel: string;
  pageInfo?: string;
  ariaLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  buildPageUrl,
  prevLabel,
  nextLabel,
  pageInfo,
  ariaLabel,
}: PaginationProps) {
  const Wrapper = ariaLabel ? 'nav' : 'div';
  const wrapperProps = ariaLabel ? { 'aria-label': ariaLabel } : {};

  return (
    <Wrapper className={styles.pagination} {...wrapperProps}>
      {currentPage <= 1 ? (
        <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`}>
          {prevLabel}
        </span>
      ) : (
        <a href={buildPageUrl(currentPage - 1)} className={styles.pageButton}>
          {prevLabel}
        </a>
      )}
      {pageInfo && <span className={styles.pageInfo}>{pageInfo}</span>}
      {currentPage >= totalPages ? (
        <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`}>
          {nextLabel}
        </span>
      ) : (
        <a href={buildPageUrl(currentPage + 1)} className={styles.pageButton}>
          {nextLabel}
        </a>
      )}
    </Wrapper>
  );
}
