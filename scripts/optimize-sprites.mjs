/**
 * Optimizes SVGs and generates a CSS sprite sheet with coordinate-based classes.
 *
 * Input:  public/img/icons/iconos-*.svg (individual icon files)
 * Output: public/img/sprites.svg (single SVG with all icons)
 *         shared/presentation/sprites.css (CSS classes with background-position)
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

const ICON_SIZE = 24; // Each icon cell in the sprite
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

// Generate sprite SVG (symbols for <use> reference)
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

// Generate CSS sprite sheet with coordinates
// Layout: icons arranged horizontally, each 24px wide
const cssClasses = icons
  .map(
    (icon, i) =>
      `.icon-${icon.name} {
  background-image: url('/img/sprites.svg');
  background-repeat: no-repeat;
  background-position: -${i * ICON_SIZE}px 0;
  width: ${ICON_SIZE}px;
  height: ${ICON_SIZE}px;
  display: inline-block;
}`,
  )
  .join('\n\n');

const cssContent = `/* Auto-generated SVG sprite classes — DO NOT EDIT */
/* Use: <span class="icon-profile"></span> or apply as CSS background */

${cssClasses}

/* Size variants */
.icon-sm { width: 16px; height: 16px; background-size: 16px 16px; }
.icon-md { width: 24px; height: 24px; background-size: 24px 24px; }
.icon-lg { width: 32px; height: 32px; background-size: 32px 32px; }
`;

writeFileSync(OUTPUT_CSS, cssContent, 'utf8');

// Done — files written above
