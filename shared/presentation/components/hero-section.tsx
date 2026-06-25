import styles from './hero-section.module.css';

interface HeroSectionProps {
  imageSrc: string;
  imageAlt: string;
}

export function HeroSection({ imageSrc, imageAlt }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <img src={imageSrc} alt={imageAlt} className={styles.heroImage} />
      <svg
        className={styles.waveTop}
        viewBox="0 0 1440 150"
        preserveAspectRatio="none"
      >
        <path
          fill="var(--color-coral)"
          d="M0,50 C400,150 1000,-10 1440,60 L1440,155 L0,155 Z"
        />
      </svg>
    </section>
  );
}
