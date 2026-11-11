#!/usr/bin/env node
// =============================================================================
// Four migrations to the design system that may only go one way
// -----------------------------------------------------------------------------
//   node tools/design-ratchet.mjs            check the sources against the record
//   node tools/design-ratchet.mjs --record   rewrite the record from the sources
//
// Roadmap II Prompt 51 moves every page onto one component language. Measured
// before it started, the sources had hundreds of colours written as literals
// rather than tokens, !important rules the cascade layers were meant to make
// unnecessary, emoji standing in for icons in the interface's strings, and
// browser-default controls on the tool pages beside the application's styled
// ones. Moving them all at once would be one unreviewable commit, so each is
// counted per file and tools/design-ratchet.json holds the count:
//
//   colors      a hex, rgb() or hsl() literal outside css/tokens.css, in a
//               stylesheet or a page's own <style>
//   important   an !important outside css/tokens.css
//   emoji       an emoji in a message catalog (js/i18n) or in a page's markup
//   controls    a select, textarea, button or text-like input on a tool page
//               without a component class (one beginning ui-)
//   contrast    the contrast ratio of every foreground and ground the tokens
//               pair, in each of the four themes (Prompt 279): text on the four
//               surfaces, the accent as text and as the focus ring, a label on
//               its button's face, the object hues on the sky. A pair below the
//               WCAG minimum it is held to fails; one that falls fails; one that
//               rises fails until recorded, so the ratios can only rise.
//
// A file above its count fails; a file below it fails too until the record is
// rewritten with --record, so the counts can only fall - the rule of
// tools/number-ratchet.mjs and the fixed sleeps in the browser suite.
// tests/designRatchet.test.js runs the check.
// =============================================================================

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pages } from './csp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = path.join(ROOT, 'tools', 'design-ratchet.json');

/** The tool pages, PLATFORM_MODEL.md's "Tool" template. */
export const TOOL_PAGES = [
  'observatory/index.html',
  'catalog/index.html',
  'library/index.html',
  'my-work/index.html',
  'experiments/index.html',
  'figure/index.html',
  'studio/index.html',
  'studio/lesson/index.html',
  'studio/course/index.html',
  'course/index.html',
  'instructors/submissions/index.html',
  'lab3d/index.html',
  '3d/index.html',
  'mission/index.html',
  'mission/lab/index.html',
  'sky/index.html',
];

const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const withoutComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** A page's own <style> blocks, joined. */
const inlineStyles = html =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map(m => m[1])
    .join('\n');
/**
 * A page's markup without its scripts, styles or comments, nor the shared
 * shell, which tools/shell.mjs stamps and css/shell.css styles.
 */
const markupOf = html =>
  html
    .replace(/<!-- shell:(\w+)[^>]*-->[\s\S]*?<!-- \/shell:\1 -->/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

/** Colour literals in a stylesheet's text. */
export const countColors = css =>
  (withoutComments(css).match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g) || [])
    .length;

/** !important in a stylesheet's text. */
export const countImportant = css =>
  (withoutComments(css).match(/!important/g) || []).length;

/**
 * Emoji: the Unicode Extended_Pictographic property, which is what one is,
 * less what it also covers that is notation rather than an icon - the Sun's
 * ☉ in M☉ and the planets' signs, arrows, and ©, ® and ™. A star is notation
 * only as a subscript on a stellar quantity, R★ or M<sub>★</sub>; a star
 * anywhere else is an icon.
 *
 * The star is also named outright. The property's membership is the
 * runtime's Unicode data, and CI's Node 20 does not count \u2605 where the Mac's
 * Node 24 does, so a count resting on the property alone would differ
 * between the machine that records it and the one that checks it.
 */
const NOTATION =
  /[\u2609\u263D\u263E\u263F-\u2647\u26E2\u2190-\u21FF\u00A9\u00AE\u2122]|(?<=[RMLT](?:<sub>|_)?)\u2605/gu;
export const countEmoji = text =>
  (text.replace(NOTATION, '').match(/\p{Extended_Pictographic}|\u2605/gu) || [])
    .length;

/**
 * The native controls the count is about, in a page's markup, as their
 * attribute strings. Choices and hidden fields have no chrome of their own to
 * style.
 */
export const nativeControls = html =>
  [...markupOf(html).matchAll(/<(select|button|textarea|input)\b([^>]*)>/g)]
    .map(m => m[2])
    .filter(attrs => !/type="(hidden|checkbox|radio|range)"/.test(attrs));

/**
 * Native controls without a component class, in a page's markup. A class of
 * the page's own does not count: .fb-code styled one box on one page, and the
 * point of the count is that every page's controls look like every other's.
 */
export const countBareControls = html =>
  nativeControls(html).filter(attrs => {
    const cls = (attrs.match(/\bclass="([^"]*)"/) || [])[1] ?? '';
    return !cls.split(/\s+/).some(c => c.startsWith('ui-'));
  }).length;

/** The stylesheets under css/, the tokens aside. */
const stylesheets = () =>
  readdirSync(path.join(ROOT, 'css'))
    .filter(f => f.endsWith('.css') && f !== 'tokens.css')
    .map(f => `css/${f}`)
    .sort();

/** The message catalogs. */
const catalogs = () =>
  readdirSync(path.join(ROOT, 'js', 'i18n'))
    .filter(f => f.endsWith('.js'))
    .map(f => `js/i18n/${f}`)
    .sort();

/** Every count for every file that has any. */
export function measure() {
  const out = {
    colors: {},
    important: {},
    emoji: {},
    controls: {},
    contrast: measureContrast(),
  };
  const put = (kind, rel, n) => {
    if (n) out[kind][rel] = n;
  };
  for (const rel of stylesheets()) {
    const css = read(rel);
    put('colors', rel, countColors(css));
    put('important', rel, countImportant(css));
  }
  for (const rel of pages()) {
    const html = read(rel);
    const own = inlineStyles(html);
    put('colors', rel, countColors(own));
    put('important', rel, countImportant(own));
    put('emoji', rel, countEmoji(markupOf(html)));
  }
  for (const rel of catalogs()) put('emoji', rel, countEmoji(read(rel)));
  for (const rel of TOOL_PAGES) {
    if (existsSync(path.join(ROOT, rel)))
      put('controls', rel, countBareControls(read(rel)));
  }
  return out;
}

// -----------------------------------------------------------------------------
// Contrast in every theme
// -----------------------------------------------------------------------------

/** The themes of css/tokens.css; the bare :root block is the first. */
export const THEMES = ['midnight', 'deep', 'observatory', 'daylight'];

const SURFACES = ['--surface-0', '--surface-1', '--surface-2', '--surface-3'];
const SKY = ['--space-far', '--space-near'];
const OBJECT_HUES = [
  '--hue-blackhole',
  '--hue-star',
  '--hue-planet',
  '--hue-gasgiant',
  '--hue-asteroid',
  '--hue-comet',
  '--hue-neutron',
  '--hue-dwarf',
];

/**
 * What is held to what, and the WCAG minimum it must reach: 4.5 for text
 * (1.4.3), 3 for the focus ring and for a graphic that carries meaning
 * (1.4.11). `--c3` is the white the settings list's hovered option is drawn in.
 */
export const CONTRAST_PAIRS = [
  ...['--text-primary', '--text-secondary', '--text-muted'].map(fg => ({
    fg,
    grounds: SURFACES,
    min: 4.5,
  })),
  ...['--accent', '--success', '--warning', '--danger'].map(fg => ({
    fg,
    grounds: SURFACES,
    min: 4.5,
  })),
  { fg: '--hud-text', grounds: ['--hud-surface'], min: 4.5 },
  { fg: '--hud-text-strong', grounds: ['--hud-surface'], min: 4.5 },
  {
    fg: '--accent-contrast',
    grounds: ['--accent', '--accent-strong'],
    min: 4.5,
  },
  { fg: '--text-inverse', grounds: ['--accent'], min: 4.5 },
  { fg: '--c3', grounds: ['--accent-deep'], min: 4.5 },
  { fg: '--focus-ring-color', grounds: SURFACES, min: 3 },
  ...OBJECT_HUES.map(fg => ({ fg, grounds: SKY, min: 3 })),
];

/** The custom properties each theme sets, the default block first. */
export function loadTokens() {
  const css = withoutComments(read('css/tokens.css'));
  const blocks = {};
  for (const m of css.matchAll(
    /:root(?:\[data-theme='(\w+)'\])?\s*\{([^{}]*)\}/g
  )) {
    const theme = m[1] || 'midnight';
    const own = (blocks[theme] ??= {});
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
      own[d[1]] = d[2].trim();
  }
  return blocks;
}

/** A token's literal value in a theme, following var() and the default block. */
const resolve = (blocks, theme, name, depth = 0) => {
  const value = blocks[theme]?.[name] ?? blocks.midnight[name];
  if (value === undefined || depth > 8) return null;
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  return ref ? resolve(blocks, theme, ref[1], depth + 1) : value;
};

/** "#rgb", "#rrggbb", "#rrggbbaa", rgb(), rgba() to {r, g, b, a}. */
const parseColor = text => {
  const v = String(text).trim();
  let m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map(c => c + c).join('');
    const n = h.match(/../g).map(x => parseInt(x, 16));
    return {
      r: n[0],
      g: n[1],
      b: n[2],
      a: n[3] === undefined ? 1 : n[3] / 255,
    };
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(x => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)));
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  }
  return null;
};

const over = (f, b) => ({
  r: f.r * f.a + b.r * (1 - f.a),
  g: f.g * f.a + b.g * (1 - f.a),
  b: f.b * f.a + b.b * (1 - f.a),
  a: 1,
});

const luminance = c => {
  const f = x => {
    const v = x / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};

/** WCAG's contrast ratio of two opaque colors. */
export const contrastRatio = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * Every pair's ratio in every theme, floored to two places (a ratio is a
 * claim: 4.499 must not read as 4.50). A translucent foreground is laid over
 * its ground first, as the browser paints it.
 *
 * @returns {Object<string, Object<string, number>>} theme -> "fg|ground" -> ratio
 */
export function measureContrast(blocks = loadTokens()) {
  const out = {};
  for (const theme of THEMES) {
    out[theme] = {};
    for (const { fg, grounds } of CONTRAST_PAIRS) {
      for (const g of grounds) {
        const front = parseColor(resolve(blocks, theme, fg));
        const back = parseColor(resolve(blocks, theme, g));
        if (!front || !back)
          throw new Error(`${theme}: ${fg} or ${g} is not a color`);
        const ratio = contrastRatio(over(front, back), back);
        out[theme][`${fg}|${g}`] = Math.floor(ratio * 100) / 100;
      }
    }
  }
  return out;
}

/** The WCAG minimum a "fg|ground" key is held to. */
const minimumOf = key =>
  CONTRAST_PAIRS.find(p => p.fg === key.split('|')[0]).min;

/** Where the measured ratios break a minimum or differ from the record. */
export function checkContrast(now, record = {}) {
  const problems = [];
  for (const theme of THEMES) {
    for (const [key, ratio] of Object.entries(now[theme] ?? {})) {
      const [fg, ground] = key.split('|');
      const min = minimumOf(key);
      const label = `${theme}: ${fg} on ${ground}`;
      if (ratio < min)
        problems.push(
          `${label} is ${ratio}:1, under the ${min}:1 it must reach.`
        );
      const had = record[theme]?.[key];
      if (had === undefined)
        problems.push(
          `${label} is not in the record. node tools/design-ratchet.mjs --record`
        );
      else if (ratio < had)
        problems.push(`${label} fell from ${had}:1 to ${ratio}:1.`);
      else if (ratio > had)
        problems.push(
          `${label} rose from ${had}:1 to ${ratio}:1. Raise it: node tools/design-ratchet.mjs --record`
        );
    }
  }
  return problems;
}

const WHAT = {
  colors: ['colour literals', 'Use a token from css/tokens.css'],
  important: ['!important rules', 'Resolve it with the cascade layers'],
  emoji: ['emoji', 'Use an icon from the icon set, with a text label'],
  controls: [
    'unstyled native controls',
    'Give it a component class (css/components.css)',
  ],
};

/**
 * Where the sources differ from the record.
 * @returns {string[]} Problems, empty when they agree
 */
export function check(now = measure(), record = readRecord()) {
  const problems = [];
  for (const kind of Object.keys(WHAT)) {
    const [noun, fix] = WHAT[kind];
    const got = now[kind] ?? {};
    const has = record[kind] ?? {};
    const files = new Set([...Object.keys(got), ...Object.keys(has)]);
    for (const rel of [...files].sort()) {
      const n = got[rel] ?? 0;
      const max = has[rel] ?? 0;
      if (n > max)
        problems.push(`${rel}: ${n} ${noun}, over its ${max}. ${fix}.`);
      else if (n < max)
        problems.push(
          `${rel}: ${n} ${noun}, under its ${max}. Lower it: node tools/design-ratchet.mjs --record`
        );
    }
  }
  if (now.contrast)
    problems.push(...checkContrast(now.contrast, record.contrast ?? {}));
  return problems;
}

export const readRecord = () => JSON.parse(readFileSync(RECORD, 'utf8'));
const total = counts => Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
const summary = c =>
  `${total(c.colors)} colour literals, ${total(c.important)} !important rules, ${total(c.emoji)} emoji, ${total(c.controls)} unstyled controls and ${Object.values(c.contrast ?? {}).reduce((a, t) => a + Object.keys(t).length, 0)} contrast pairs`;

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes('--record')) {
    const now = measure();
    writeFileSync(
      RECORD,
      `${JSON.stringify(
        {
          note: 'Per file: colour literals and !important rules outside css/tokens.css (stylesheets and pages’ own <style>), emoji in the message catalogs and page markup, and unstyled native controls on the tool pages; and, per theme, the contrast ratio of each token pair, which may only rise (Prompt 279). Written by node tools/design-ratchet.mjs --record; a file may not rise above its count, and one that falls has its count lowered here.',
          ...now,
        },
        null,
        2
      )}\n`
    );
    console.log(`Recorded ${summary(now)}.`);
  } else {
    const problems = check();
    if (problems.length) {
      console.error(problems.join('\n'));
      process.exit(1);
    }
    console.log(`Within the record: ${summary(readRecord())}.`);
  }
}
