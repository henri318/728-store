import styles from './middle-section.module.css';

interface MiddleSectionProps {
  children?: React.ReactNode;
}

export function MiddleSection({ children }: MiddleSectionProps) {
  return (
    <section className={styles.middleSection}>
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
