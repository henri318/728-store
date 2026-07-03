import Image from 'next/image';
import styles from './bottom-section.module.css';

interface BottomSectionProps {
  children?: React.ReactNode;
}

export function BottomSection({ children }: BottomSectionProps) {
  return (
    <section className={styles.bottomSection}>
      <Image
        src="/img/decorations/formas-16.svg"
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
