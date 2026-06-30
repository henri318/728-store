/**
 * Optimizes SVGs and generates an SVG sprite with <symbol> definitions.
 *
 * Usage pattern:
 *   <svg width="24" height="24"><use href="/img/icons/sprites.svg#icon-profile"></use></svg>
 *
 * Input:  ../../icons/*.svg (individual icon files — root-level /icons directory)
 * Output: ../public/img/icons/sprites.svg (symbol sprite for <use href> references)
 *         ../shared/presentation/sprites.css (utility classes for sizing)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { optimize } from 'svgo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../icons');
const OUTPUT_SVG = join(__dirname, '../public/img/icons/sprites.svg');
const OUTPUT_CSS = join(__dirname, '../shared/presentation/sprites.css');

// Icon name mapping: filename -> class/id name
// Files are read directly from the /icons directory at repo root
const ICON_MAP = {
  'Facebook.svg': 'facebook',
  'Instagram.svg': 'instagram',
  'Tiktok.svg': 'tiktok',
  'Carrito.svg': 'cart',
  'Inicio Sesion.svg': 'profile',
  'Whatsapp.svg': 'whatsapp',
  'Mensaje.svg': 'email',
  'Añadir.svg': 'add',
  'Buscar.svg': 'search',
  'Papelera.svg': 'trash',
};

const files = Object.keys(ICON_MAP);

/**
 * Converts class-based fills (.cls-n { fill: #xxx }) to inline fill attributes.
 * CSS classes inside <symbol> don't reliably apply in the shadow DOM created
 * by <use href="...">, so we inline them at build time.
 */
function resolveClassFills(svgContent) {
  const styleRegex = /<defs>\s*<style>([\s\S]*?)<\/style>\s*<\/defs>/;
  const match = svgContent.match(styleRegex);
  if (!match) return svgContent;

  const cssText = match[1];
  const classMap = {};
  const ruleRegex = /\.(\S+)\s*\{[^}]*?fill:\s*([^;}]+)[^}]*?\}/g;
  let m;
  while ((m = ruleRegex.exec(cssText)) !== null) {
    classMap[m[1]] = m[2].trim();
  }

  if (Object.keys(classMap).length === 0) return svgContent;

  let result = svgContent;
  for (const [cls, fill] of Object.entries(classMap)) {
    const classAttr = new RegExp(`class="${cls}"`, 'g');
    result = result.replace(classAttr, `fill="${fill}"`);
  }

  result = result.replace(styleRegex, '');
  return result;
}

// Optimize each icon and extract viewBox content
const icons = files.map((file) => {
  const raw = readFileSync(join(ICONS_DIR, file), 'utf8');
  // Resolve class-based fills to inline fills BEFORE optimization,
  // so SVGO doesn't strip the <defs><style> block before we can process it.
  const preprocessed = resolveClassFills(raw);
  const result = optimize(preprocessed, {
    plugins: ['preset-default', 'removeDimensions'],
  });

  const svgContent = result.data;

  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

  // Extract inner content (paths, circles, etc.)
  const inner = svgContent
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
const allIconClasses = icons.map((i) => `.icon-${i.name}`).join(',\n');

const cssContent = `/* Auto-generated SVG sprite utilities — DO NOT EDIT */
/*
 * Usage:
 *   <svg class="icon-md" aria-hidden="true"><use href="/img/icons/sprites.svg#icon-profile"></use></svg>
 *
 * Or inline without class:
 *   <svg width="24" height="24"><use href="/img/icons/sprites.svg#icon-profile"></use></svg>
 */

/* Base icon sizing */
${allIconClasses} {
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

// Print summary
console.log(`\n✓ Sprite generated: ${OUTPUT_SVG}`);
console.log(`  ${icons.length} icons optimized`);
icons.forEach((i) =>
  console.log(`  • ${i.file.padEnd(22)} → icon-${i.name.padEnd(10)} ${i.originalSize}B → ${i.optimizedSize}B`),
);
const totalOriginal = icons.reduce((s, i) => s + i.originalSize, 0);
const totalOptimized = icons.reduce((s, i) => s + i.optimizedSize, 0);
console.log(`  Total: ${totalOriginal}B → ${totalOptimized}B (${Math.round((1 - totalOptimized / totalOriginal) * 100)}% savings)`);
console.log(`✓ CSS generated: ${OUTPUT_CSS}`);
