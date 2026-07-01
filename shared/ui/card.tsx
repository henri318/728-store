import styles from './card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'aside';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className,
  as: Component = 'div',
  padding = 'md',
}: CardProps) {
  const classes = [
    styles.card,
    padding !== 'none' && styles[`padding-${padding}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes}>{children}</Component>;
}
