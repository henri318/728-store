import styles from './middle-section.module.css';

interface MiddleSectionProps {
  children?: React.ReactNode;
  ariaLabel?: string;
}

export function MiddleSection({ children, ariaLabel }: MiddleSectionProps) {
  return (
    <section className={styles.middleSection} aria-label={ariaLabel}>
      <img
        src="/img/decorations/formas-15.svg"
        alt=""
        className={styles.decoration}
        aria-hidden="true"
      />
      {children}
    </section>
  );
}
