import styles from './auth-card.module.css';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className={`${styles.card}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
