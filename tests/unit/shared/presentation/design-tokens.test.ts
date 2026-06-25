import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Design Tokens (design-tokens.css)', () => {
  let cssContent: string;

  beforeAll(() => {
    const tokensPath = path.resolve(
      __dirname,
      '../../../../shared/presentation/design-tokens.css',
    );
    cssContent = fs.readFileSync(tokensPath, 'utf-8');
  });

  describe(':root selector exists', () => {
    it('contains a :root block', () => {
      expect(cssContent).toContain(':root');
    });
  });

  describe('Color variables', () => {
    it('defines --color-green-dark', () => {
      expect(cssContent).toMatch(/--color-green-dark:\s*#0d5c46/i);
    });

    it('defines --color-cream', () => {
      expect(cssContent).toMatch(/--color-cream:\s*#f4f2e6/i);
    });

    it('defines --color-coral', () => {
      expect(cssContent).toMatch(/--color-coral:\s*#df8072/i);
    });

    it('defines --color-green-light', () => {
      expect(cssContent).toMatch(/--color-green-light:\s*#cbe08c/i);
    });

    it('defines --color-lila', () => {
      expect(cssContent).toMatch(/--color-lila:\s*#b1accd/i);
    });

    it('defines --color-white', () => {
      expect(cssContent).toMatch(/--color-white:\s*#ffffff/i);
    });

    it('defines --color-black', () => {
      expect(cssContent).toMatch(/--color-black:\s*#000000/);
    });
  });

  describe('Typography variables', () => {
    it('defines --font-family-primary with Poppins', () => {
      expect(cssContent).toMatch(/--font-family-primary:.*Poppins/);
    });

    it('defines --font-weight-regular as 400', () => {
      expect(cssContent).toMatch(/--font-weight-regular:\s*400/);
    });

    it('defines --font-weight-medium as 500', () => {
      expect(cssContent).toMatch(/--font-weight-medium:\s*500/);
    });

    it('defines --font-weight-semibold as 600', () => {
      expect(cssContent).toMatch(/--font-weight-semibold:\s*600/);
    });

    it('defines --font-weight-bold as 700', () => {
      expect(cssContent).toMatch(/--font-weight-bold:\s*700/);
    });
  });

  describe('Icon size variables', () => {
    it('defines --icon-size-sm as 24px', () => {
      expect(cssContent).toMatch(/--icon-size-sm:\s*24px/);
    });

    it('defines --icon-size-md as 32px', () => {
      expect(cssContent).toMatch(/--icon-size-md:\s*32px/);
    });

    it('defines --icon-size-lg as 48px', () => {
      expect(cssContent).toMatch(/--icon-size-lg:\s*48px/);
    });
  });

  describe('Spacing variables', () => {
    it('defines --spacing-xs as 0.25rem', () => {
      expect(cssContent).toMatch(/--spacing-xs:\s*0\.25rem/);
    });

    it('defines --spacing-sm as 0.5rem', () => {
      expect(cssContent).toMatch(/--spacing-sm:\s*0\.5rem/);
    });

    it('defines --spacing-md as 1rem', () => {
      expect(cssContent).toMatch(/--spacing-md:\s*1rem/);
    });

    it('defines --spacing-lg as 1.5rem', () => {
      expect(cssContent).toMatch(/--spacing-lg:\s*1\.5rem/);
    });

    it('defines --spacing-xl as 2rem', () => {
      expect(cssContent).toMatch(/--spacing-xl:\s*2rem/);
    });
  });

  describe('Z-index variables', () => {
    it('defines --z-base as 0', () => {
      expect(cssContent).toMatch(/--z-base:\s*0/);
    });

    it('defines --z-blobs as 10', () => {
      expect(cssContent).toMatch(/--z-blobs:\s*10/);
    });

    it('defines --z-content as 20', () => {
      expect(cssContent).toMatch(/--z-content:\s*20/);
    });

    it('defines --z-header as 100', () => {
      expect(cssContent).toMatch(/--z-header:\s*100/);
    });

    it('defines --z-banner as 200', () => {
      expect(cssContent).toMatch(/--z-banner:\s*200/);
    });

    it('defines --z-dropdown as 300', () => {
      expect(cssContent).toMatch(/--z-dropdown:\s*300/);
    });

    it('defines --z-modal as 400', () => {
      expect(cssContent).toMatch(/--z-modal:\s*400/);
    });
  });
});
