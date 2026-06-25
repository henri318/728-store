import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WaveTransition } from '@/shared/presentation/components/wave-transition';

describe('WaveTransition', () => {
  it('renders an SVG element', () => {
    const { container } = render(<WaveTransition />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies the wave-bottom class', () => {
    const { container } = render(<WaveTransition />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toMatch(/waveBottom/);
  });

  it('renders the cream fill path', () => {
    const { container } = render(<WaveTransition />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the green-dark stroke path', () => {
    const { container } = render(<WaveTransition />);
    const paths = container.querySelectorAll('path');
    const strokePath = Array.from(paths).find(
      (p) => p.getAttribute('stroke') === 'var(--color-green-dark)',
    );
    expect(strokePath).toBeTruthy();
  });

  it('renders animated text by default', () => {
    const { container } = render(<WaveTransition />);
    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
  });

  it('renders the default text content with non-breaking spaces', () => {
    const { container } = render(<WaveTransition />);
    const textPath = container.querySelector('textPath');
    expect(textPath?.textContent).toContain('DETALLES QUE DEJAN HUELLA');
  });

  it('renders custom animated text', () => {
    const { container } = render(<WaveTransition animatedText="CUSTOM TEXT" />);
    const textPath = container.querySelector('textPath');
    expect(textPath?.textContent).toContain('CUSTOM TEXT');
  });

  it('has a textPath animate element for scrolling', () => {
    const { container } = render(<WaveTransition />);
    const animate = container.querySelector('animate');
    expect(animate).toBeInTheDocument();
    expect(animate).toHaveAttribute('attributeName', 'startOffset');
    expect(animate).toHaveAttribute('dur', '25s');
    expect(animate).toHaveAttribute('repeatCount', 'indefinite');
  });
});
