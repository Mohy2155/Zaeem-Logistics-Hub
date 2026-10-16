import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/*
 * Design-system guards: colours come from tokens in src/styles/, templates carry no static
 * style="" attributes, and no emoji stand in for icons. See openspec frontend-ui-overhaul (task 9.2).
 */

const SRC = resolve(process.cwd(), 'src');

/** Files that style generated documents (Excel/PDF), not the UI; their colours are part of the document design. */
const COLOUR_ALLOWLIST = new Set(['app/pages/portal/invoice-export.ts', 'app/pages/payments/receipt-export.ts']);

// "#abc"/"#aabbcc" not preceded by "&" (HTML entities) or a word character, and not part of a longer word.
const HEX = /(?<![&\w])#[0-9a-fA-F]{3,8}(?![\w-])/g;
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
// A static attribute only: [style.x]="…" and [style]="…" bindings are fine.
const STATIC_STYLE = /(?<![\w.[\]-])style\s*=\s*["']/g;
const EMOJI = /\p{Extended_Pictographic}/gu;

interface Violation {
  file: string;
  line: number;
  text: string;
}

function scan(file: string, content: string, pattern: RegExp): Violation[] {
  const found: Violation[] = [];
  content.split(/\r?\n/).forEach((text, index) => {
    pattern.lastIndex = 0;
    if (pattern.test(text)) found.push({ file, line: index + 1, text: text.trim() });
  });
  return found;
}

export function colourViolations(file: string, content: string): Violation[] {
  return [...scan(file, content, HEX), ...scan(file, content, COLOUR_FUNCTION)];
}

export function staticStyleViolations(file: string, content: string): Violation[] {
  return scan(file, content, STATIC_STYLE);
}

export function emojiViolations(file: string, content: string): Violation[] {
  return scan(file, content, EMOJI);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|html|scss)$/.test(name) && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

const rel = (path: string) => relative(SRC, path).split(sep).join('/');
const describeAll = (violations: Violation[]) => violations.map(v => `${v.file}:${v.line}  ${v.text}`).join('\n');

describe('style guards: the checks themselves', () => {
  it('catch raw colours but not entities, ids or template references', () => {
    expect(colourViolations('x.scss', '.a { color: #1e293b; }')).toHaveLength(1);
    expect(colourViolations('x.scss', '.a { background: rgba(0, 0, 0, 0.5); }')).toHaveLength(1);
    expect(colourViolations('x.ts', "const c = 'oklch(70% 0.1 250)';")).toHaveLength(1);
    expect(colourViolations('x.html', '<span>&#8230;</span> <select #clientSelect> <a href="#main">')).toEqual([]);
    expect(colourViolations('x.scss', '.a { color: var(--color-text); }')).toEqual([]);
  });

  it('catch static style attributes but not style bindings', () => {
    expect(staticStyleViolations('x.html', '<div style="margin: 0">')).toHaveLength(1);
    expect(staticStyleViolations('x.html', "<div style='margin: 0'>")).toHaveLength(1);
    expect(staticStyleViolations('x.html', '<div [style.width]="w" [style]="s" [attr.style]="t">')).toEqual([]);
  });

  it('catch emoji but not typographic symbols', () => {
    expect(emojiViolations('x.html', '<button>🚀 Launch</button>')).toHaveLength(1);
    expect(emojiViolations('x.html', '<p>✅ Done</p>')).toHaveLength(1);
    expect(emojiViolations('x.html', '<p>Oct 16 – Oct 29 · $1.00 — “ok” …</p>')).toEqual([]);
  });
});

describe('style guards: application sources', () => {
  const files = existsSync(SRC) ? sourceFiles(SRC).filter(f => !rel(f).startsWith('styles/')) : [];
  const read = (f: string) => readFileSync(f, 'utf-8');

  it('finds the sources to check', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it('use colour tokens instead of raw colour values outside src/styles/', () => {
    const violations = files.filter(f => !COLOUR_ALLOWLIST.has(rel(f))).flatMap(f => colourViolations(rel(f), read(f)));
    expect(violations, describeAll(violations)).toEqual([]);
  });

  it('have no static style="" attributes in templates', () => {
    const violations = files.filter(f => /\.(html|ts)$/.test(f)).flatMap(f => staticStyleViolations(rel(f), read(f)));
    expect(violations, describeAll(violations)).toEqual([]);
  });

  it('have no emoji in templates', () => {
    const violations = files.filter(f => /\.(html|ts)$/.test(f)).flatMap(f => emojiViolations(rel(f), read(f)));
    expect(violations, describeAll(violations)).toEqual([]);
  });
});
