// =============================================================================
// One breakpoint scale (Roadmap II Prompt 55)
// -----------------------------------------------------------------------------
// PLATFORM_MODEL.md specifies four layouts, at 375, 768, 1024 and 1440 px. The
// stylesheets had twenty distinct media-query widths between them (360, 400,
// 480, 560, 600, 620, 640, 700, 720, 760, 767, 768, 860, 900, 1024, 1099,
// 1100, 1180, 1200 and 1320), so a window a few pixels either side of any of
// them got a layout nobody had looked at. Now there are four tiers, one per
// layout, and each layout's width sits inside its tier rather than on an edge:
//
//   phone     up to 767    laid out at 375 (and 375 itself for the narrowest)
//   tablet    768 to 900   laid out at 768
//   laptop    901 to 1200  laid out at 1024
//   desktop   1201 and up  laid out at 1440
//
// A width query may name only an edge of that scale: `max-width` one of 375,
// 767, 900 or 1200, and `min-width` the next pixel up. The same holds for the
// inline styles of every page and for a script that compares the window's
// width with a number. DESIGN_SYSTEM.md has the table and the reasons.
// =============================================================================

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@jest/globals';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The upper edges of the four tiers, in CSS pixels. */
const MAX_WIDTHS = [375, 767, 900, 1200];
/** A `min-width` query starts the tier above an edge. */
const MIN_WIDTHS = MAX_WIDTHS.map(w => w + 1);

/** Kept as they were on purpose: archived, prototypes, or not ours. */
const SKIP = new Set([
  'node_modules',
  'vendor',
  'history',
  'spike',
  'dist',
  'test-results',
  'playwright-report',
  'coverage',
  'worktrees',
]);

function walk(dir, keep, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, keep, out);
    else if (keep(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Every width a stylesheet's media queries name, with where.
 *
 * @param {string} css - Stylesheet text
 * @returns {{feature: string, value: string, px: number}[]}
 */
function mediaWidths(css) {
  const found = [];
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const query of noComments.matchAll(/@media([^{]*)\{/g)) {
    for (const m of query[1].matchAll(
      /\(\s*(min-width|max-width|width)\s*:\s*([\d.]+)(px|rem|em)\s*\)/g
    )) {
      const px = m[3] === 'px' ? Number(m[2]) : Number(m[2]) * 16;
      found.push({ feature: m[1], value: `${m[2]}${m[3]}`, px });
    }
    // The range syntax, `(width < 768px)`, is a width query too.
    for (const m of query[1].matchAll(
      /\(\s*width\s*[<>]=?\s*([\d.]+)(px|rem|em)/g
    )) {
      found.push({ feature: 'range', value: `${m[1]}${m[2]}`, px: NaN });
    }
  }
  return found;
}

/** Is this one query width on the scale? */
function onScale({ feature, value, px }) {
  if (!value.endsWith('px')) return false;
  if (feature === 'max-width') return MAX_WIDTHS.includes(px);
  if (feature === 'min-width') return MIN_WIDTHS.includes(px);
  return false;
}

/** Literal widths a script compares the window with, and matchMedia strings. */
function scriptWidths(js) {
  const found = [];
  for (const m of js.matchAll(/innerWidth\s*(<=|<|>=|>)\s*(\d+)/g)) {
    found.push({ op: m[1], px: Number(m[2]) });
  }
  for (const m of js.matchAll(/matchMedia\(\s*['"`]([^'"`]*)['"`]/g)) {
    for (const w of mediaWidths(`@media ${m[1]} {`))
      found.push({ ...w, media: true });
  }
  return found;
}

/** A script's comparison is on the scale when it splits at an edge. */
function scriptOnScale(w) {
  if (w.media) return onScale(w);
  // `<= 767` and `> 767` split at the same place as `max-width: 767px`;
  // `< 768` and `>= 768` do too.
  const edge = w.op === '<=' || w.op === '>' ? w.px : w.px - 1;
  return MAX_WIDTHS.includes(edge);
}

const rel = file => path.relative(ROOT, file);

test('every media-query width in css/ is on the scale', () => {
  const off = [];
  let seen = 0;
  for (const file of walk(path.join(ROOT, 'css'), n => n.endsWith('.css'))) {
    for (const w of mediaWidths(readFileSync(file, 'utf8'))) {
      seen++;
      if (!onScale(w)) off.push(`${rel(file)}: (${w.feature}: ${w.value})`);
    }
  }
  expect(off).toEqual([]);
  // Proof the scan reads the files at all: the stylesheets have dozens.
  expect(seen).toBeGreaterThan(60);
});

test('so is every width in a page’s own <style>', () => {
  const off = [];
  for (const file of walk(ROOT, n => n.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    for (const block of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      for (const w of mediaWidths(block[1])) {
        if (!onScale(w)) off.push(`${rel(file)}: (${w.feature}: ${w.value})`);
      }
    }
  }
  expect(off).toEqual([]);
});

test('and every width a script compares the window with', () => {
  const off = [];
  let seen = 0;
  for (const file of walk(path.join(ROOT, 'js'), n => n.endsWith('.js'))) {
    for (const w of scriptWidths(readFileSync(file, 'utf8'))) {
      seen++;
      if (!scriptOnScale(w))
        off.push(`${rel(file)}: ${w.op ?? w.feature} ${w.px}`);
    }
  }
  expect(off).toEqual([]);
  expect(seen).toBeGreaterThan(2);
});

test('the check refuses a width that is not on the scale', () => {
  const css = `
    /* @media (max-width: 999px) in a comment is not a query */
    @media (max-width: 767px) { a { color: red } }
    @media (min-width: 768px) and (max-width: 1200px) { a { color: red } }
    @media (max-width: 480px) { a { color: red } }
    @media (min-width: 64rem) { a { color: red } }
    @media (width < 768px) { a { color: red } }
    @media (max-height: 700px) { a { color: red } }
  `;
  const widths = mediaWidths(css);
  expect(widths.map(w => w.value)).toEqual([
    '767px',
    '768px',
    '1200px',
    '480px',
    '64rem',
    '768px',
  ]);
  expect(widths.filter(w => !onScale(w)).map(w => w.value)).toEqual([
    '480px',
    '64rem',
    '768px',
  ]);
  const js =
    'if (window.innerWidth <= 620) {} if (innerWidth > 767) {} matchMedia("(max-width: 900px)")';
  expect(
    scriptWidths(js)
      .filter(w => !scriptOnScale(w))
      .map(w => w.px)
  ).toEqual([620]);
});
