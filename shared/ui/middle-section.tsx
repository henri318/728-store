import Image from 'next/image';
import styles from './middle-section.module.css';

interface MiddleSectionProps {
  children?: React.ReactNode;
  ariaLabel?: string;
}

export function MiddleSection({ children, ariaLabel }: MiddleSectionProps) {
  return (
    <section className={styles.middleSection} aria-label={ariaLabel}>
      <Image
        src="/img/decorations/formas-15.svg"
        alt=""
        width={250}
        height={250}
        className={styles.decoration}
        aria-hidden="true"
      />
      {children}
    </section>
  );
}
