import styles from './wave-transition.module.css';

interface WaveTransitionProps {
  animatedText?: string;
}

export function WaveTransition({
  animatedText = 'DETALLES QUE DEJAN HUELLA',
}: WaveTransitionProps) {
  const nbsp = '\u00A0';
  const gap = nbsp.repeat(60);
  const repeatedText = `${animatedText}${gap}${animatedText}`;

  return (
    <svg
      className={styles.waveBottom}
      viewBox="0 0 1440 180"
      preserveAspectRatio="none"
    >
      <defs>
        <path
          id="curveTextPath"
          d="M-50,90 C320,180 420,0 840,60 C1140,100 1280,30 1490,90"
        />
      </defs>

      <path
        fill="#f4f2e6"
        d="M-50,90 C320,180 420,0 840,60 C1140,100 1280,30 1490,90 L1490,180 L-50,180 Z"
      />

      <path
        fill="none"
        stroke="#0d5c46"
        strokeWidth="28"
        d="M-50,90 C320,180 420,0 840,60 C1140,100 1280,30 1490,90"
      />

      <text fill="#ffffff" fontSize="20" fontWeight="bold" letterSpacing="5">
        <textPath href="#curveTextPath" dominantBaseline="middle">
          <animate
            attributeName="startOffset"
            from="100%"
            to="-100%"
            dur="25s"
            repeatCount="indefinite"
          />
          {repeatedText}
        </textPath>
      </text>
    </svg>
  );
}
