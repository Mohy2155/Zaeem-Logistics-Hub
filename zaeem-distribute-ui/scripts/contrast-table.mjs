// Computes WCAG contrast for the theme token pairs and rewrites the table in src/styles/themes.scss.
// usage: node scripts/contrast-table.mjs   (exits 1 if any pair misses its AA threshold)
import { readFileSync, writeFileSync } from 'node:fs';

const tokensSrc = readFileSync(new URL('../src/styles/tokens.scss', import.meta.url), 'utf8');
const themesPath = new URL('../src/styles/themes.scss', import.meta.url);
let themesSrc = readFileSync(themesPath, 'utf8');

const primitives = Object.fromEntries([...tokensSrc.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]));
const theme = name => {
  const body = themesSrc.match(new RegExp(`@mixin ${name}-theme \\{([\\s\\S]*?)\\n\\}`))[1];
  const map = {};
  for (const [, key, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const ref = value.match(/var\(--([\w-]+)\)/);
    map[key] = ref ? primitives[ref[1]] : value.trim();
  }
  return map;
};

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [label, foreground token, background token, minimum]
const pairs = [
  ['text on surface', 'text', 'surface', 4.5],
  ['text on bg', 'text', 'bg', 4.5],
  ['text-muted on surface', 'text-muted', 'surface', 4.5],
  ['text-muted on sunken', 'text-muted', 'surface-sunken', 4.5],
  ['text-subtle on surface', 'text-subtle', 'surface', 4.5],
  ['text-subtle on sunken', 'text-subtle', 'surface-sunken', 4.5],
  ['accent-text on surface', 'accent-text', 'surface', 4.5],
  ['on-accent on accent', 'on-accent', 'accent', 4.5],
  ['on-accent on accent-hover', 'on-accent', 'accent-hover', 4.5],
  ['on-accent on danger', 'on-accent', 'danger', 4.5],
  ['accent-soft-text on accent-soft', 'accent-soft-text', 'accent-soft', 4.5],
  ['success-text on surface', 'success-text', 'surface', 4.5],
  ['success-text on success-soft', 'success-text', 'success-soft', 4.5],
  ['warning-text on surface', 'warning-text', 'surface', 4.5],
  ['warning-text on warning-soft', 'warning-text', 'warning-soft', 4.5],
  ['danger-text on surface', 'danger-text', 'surface', 4.5],
  ['danger-text on danger-soft', 'danger-text', 'danger-soft', 4.5],
  ['neutral-text on neutral-soft', 'neutral-text', 'neutral-soft', 4.5],
  ['sidebar-text on sidebar', 'sidebar-text', 'sidebar', 4.5],
  ['sidebar-text-muted on sidebar', 'sidebar-text-muted', 'sidebar', 4.5],
  ['sidebar-active-text on sidebar-active', 'sidebar-active-text', 'sidebar-active', 4.5],
  ['border-strong on surface (UI, 3:1)', 'border-strong', 'surface', 3],
  ['focus on surface (UI, 3:1)', 'focus', 'surface', 3],
  ['focus on bg (UI, 3:1)', 'focus', 'bg', 3],
  ['focus on sidebar (UI, 3:1)', 'focus', 'sidebar', 3],
];

const light = theme('light'), dark = theme('dark');
let failed = false;
const rows = pairs.map(([label, fg, bg, min]) => {
  const cells = [light, dark].map(t => {
    const r = ratio(t[`color-${fg}`], t[`color-${bg}`]);
    if (r < min) { failed = true; console.error(`FAIL ${label}: ${r.toFixed(2)} < ${min}`); }
    return r.toFixed(2).padStart(5);
  });
  return `// | ${label.padEnd(38)} | ${cells[0]} | ${cells[1]} |`;
});

const table = ['// | Pair                                   | Light | Dark  |',
  '// |----------------------------------------|-------|-------|', ...rows].join('\n');
themesSrc = themesSrc.replace(/\/\/ \| Pair[\s\S]*?\n(?=\n@mixin light-theme)/, table + '\n');
writeFileSync(themesPath, themesSrc);
console.log(table);
process.exit(failed ? 1 : 0);
