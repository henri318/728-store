/**
 * Optimizes SVGs and generates an SVG sprite with <symbol> definitions.
 *
 * Usage pattern:
 *   <svg width="24" height="24"><use href="/img/sprites.svg#icon-profile"></use></svg>
 *
 * Input:  public/img/icons/iconos-*.svg (individual icon files)
 * Output: public/img/sprites.svg (symbol sprite for <use href> references)
 *         shared/presentation/sprites.css (utility classes for sizing)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { optimize } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../public/img/icons');
const OUTPUT_SVG = join(__dirname, '../public/img/sprites.svg');
const OUTPUT_CSS = join(__dirname, '../shared/presentation/sprites.css');

// Icon name mapping: filename -> class name
const ICON_MAP = {
  'iconos-01.svg': 'facebook',
  'iconos-02.svg': 'instagram',
  'iconos-03.svg': 'tiktok',
  'iconos-04.svg': 'cart',
  'iconos-07.svg': 'profile',
  'iconos-08.svg': 'whatsapp',
  'iconos-09.svg': 'email',
};

const files = Object.keys(ICON_MAP);

// Optimize each icon and extract viewBox content
const icons = files.map((file) => {
  const raw = readFileSync(join(ICONS_DIR, file), 'utf8');
  const result = optimize(raw, {
    plugins: [
      'preset-default',
      'removeDimensions',
      { name: 'removeAttrs', params: { attrs: '(fill|stroke)' } },
    ],
  });

  const viewBoxMatch = result.data.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // Extract inner content (paths, circles, etc.)
  const inner = result.data
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .trim();

  return {
    name: ICON_MAP[file],
    viewBox,
    content: inner,
    file,
    originalSize: readFileSync(join(ICONS_DIR, file), 'utf8').length,
    optimizedSize: result.data.length,
  };
});

// Generate sprite SVG with <symbol> definitions for <use href> references
const spriteSymbols = icons
  .map(
    (icon) =>
      `  <symbol id="icon-${icon.name}" viewBox="${icon.viewBox}">\n    ${icon.content}\n  </symbol>`,
  )
  .join('\n');

const spriteSvg = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
${spriteSymbols}
</svg>`;

writeFileSync(OUTPUT_SVG, spriteSvg, 'utf8');

// Generate CSS utility classes (sizing only — use <use href> for rendering)
const cssContent = `/* Auto-generated SVG sprite utilities — DO NOT EDIT */
/*
 * Usage:
 *   <svg class="icon-md" aria-hidden="true"><use href="/img/sprites.svg#icon-profile"></use></svg>
 *
 * Or inline without class:
 *   <svg width="24" height="24"><use href="/img/sprites.svg#icon-profile"></use></svg>
 */

/* Base icon sizing */
.icon-facebook,
.icon-instagram,
.icon-tiktok,
.icon-cart,
.icon-profile,
.icon-whatsapp,
.icon-email {
  display: inline-block;
  vertical-align: middle;
  width: 24px;
  height: 24px;
}

/* Size variants */
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 24px; height: 24px; }
.icon-lg { width: 32px; height: 32px; }
`;

writeFileSync(OUTPUT_CSS, cssContent, 'utf8');
