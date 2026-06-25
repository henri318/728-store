import styles from './bottom-section.module.css';

interface BottomSectionProps {
  children?: React.ReactNode;
}

export function BottomSection({ children }: BottomSectionProps) {
  return (
    <section className={styles.bottomSection}>
      <img
        src="/img/decorations/formas-16.svg"
        alt=""
        className={styles.decoration}
        aria-hidden="true"
      />
      {children}
    </section>
  );
}
