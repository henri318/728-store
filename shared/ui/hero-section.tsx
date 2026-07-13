import Image from 'next/image';
import styles from './hero-section.module.css';

interface HeroSectionProps {
  imageSrc: string;
  imageAlt: string;
}

export function HeroSection({ imageSrc, imageAlt }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        loading="eager"
        sizes="100vw"
        className={styles.heroImage}
      />
    </section>
  );
}
