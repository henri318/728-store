import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../../../');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('Integration: Header and Footer Layout', () => {
  describe('layout.tsx imports', () => {
    it('imports globals.css', () => {
      const content = readFile('app/[locale]/layout.tsx');
      expect(content).toContain("import '../globals.css'");
    });

    it('imports HeaderBanner', () => {
      const content = readFile('app/[locale]/layout.tsx');
      expect(content).toContain('HeaderBanner');
    });

    it('imports SocialFooter', () => {
      const content = readFile('app/[locale]/layout.tsx');
      expect(content).toContain('SocialFooter');
    });

    it('renders HeaderBanner with promotional text', () => {
      const content = readFile('app/[locale]/layout.tsx');
      expect(content).toMatch(/<HeaderBanner\s+text=\{/);
    });

    it('renders SocialFooter', () => {
      const content = readFile('app/[locale]/layout.tsx');
      expect(content).toContain('<SocialFooter />');
    });

    it('renders the logo image centered', () => {
      const content = readFile('app/[locale]/layout.tsx');
      expect(content).toContain('/img/logo/logo.svg');
    });
  });

  describe('layout.module.css matches gemini.html', () => {
    it('uses font-family-primary', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('var(--font-family-primary)');
    });

    it('uses color-cream for background', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('var(--color-cream)');
    });

    it('has gemini.html header height 150px', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('height: 150px');
    });

    it('has centered logo with absolute positioning', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('position: absolute');
      expect(css).toContain('left: 50%');
      expect(css).toContain('translateX(-50%)');
    });

    it('has logo height 130px', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('height: 130px');
    });

    it('has spacer with flex: 1', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('flex: 1');
    });

    it('has responsive breakpoint at 768px', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('768px');
    });

    it('has mobile header height 100px', () => {
      const css = readFile('app/[locale]/layout.module.css');
      expect(css).toContain('height: 100px');
    });
  });

  describe('header-nav.tsx uses sprite icons', () => {
    it('uses CSS module', () => {
      const content = readFile(
        'modules/presentation/components/header-nav.tsx',
      );
      expect(content).toContain("styles from './header-nav.module.css'");
    });

    it('has no inline style objects', () => {
      const content = readFile(
        'modules/presentation/components/header-nav.tsx',
      );
      expect(content).not.toMatch(/style=\{\{/);
    });

    it('uses iconos-07.svg for profile', () => {
      const content = readFile(
        'modules/presentation/components/header-nav.tsx',
      );
      expect(content).toContain('iconos-07.svg');
    });

    it('uses iconos-04.svg for cart', () => {
      const content = readFile('modules/presentation/components/cart-icon.tsx');
      expect(content).toContain('iconos-04.svg');
    });

    it('has userIcon class for sizing', () => {
      const css = readFile(
        'modules/presentation/components/header-nav.module.css',
      );
      expect(css).toContain('userIcon');
    });
  });
});
