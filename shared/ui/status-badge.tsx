import styles from './status-badge.module.css';

interface StatusBadgeProps {
  status: string;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={styles.statusBadge} data-status={status.toLowerCase()}>
      {label}
    </span>
  );
}
