'use client';

interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <span
      role="alert"
      style={{
        color: '#ff4d4f',
        fontSize: '0.8rem',
        marginTop: '0.2rem',
      }}
    >
      {message}
    </span>
  );
}
