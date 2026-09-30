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
//   controls    a select, textarea, button or text-like input with no class,
//               on a tool page
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
 * ☉ in M☉ and the planets' signs, arrows, and ©, ® and ™.
 */
const NOTATION =
  /[\u2609\u263D\u263E\u263F-\u2647\u26E2\u2190-\u21FF\u00A9\u00AE\u2122]/gu;
export const countEmoji = text =>
  (text.replace(NOTATION, '').match(/\p{Extended_Pictographic}/gu) || [])
    .length;

/** Native controls with no class at all, in a page's markup. */
export const countBareControls = html => {
  let n = 0;
  for (const m of markupOf(html).matchAll(
    /<(select|button|textarea|input)\b([^>]*)>/g
  )) {
    const attrs = m[2];
    // Choices and hidden fields have no chrome of their own to style.
    if (/type="(hidden|checkbox|radio|range)"/.test(attrs)) continue;
    if (!/\bclass=/.test(attrs)) n++;
  }
  return n;
};

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
  const out = { colors: {}, important: {}, emoji: {}, controls: {} };
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
  return problems;
}

export const readRecord = () => JSON.parse(readFileSync(RECORD, 'utf8'));
const total = counts => Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
const summary = c =>
  `${total(c.colors)} colour literals, ${total(c.important)} !important rules, ${total(c.emoji)} emoji and ${total(c.controls)} unstyled controls`;

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
          note: 'Per file: colour literals and !important rules outside css/tokens.css (stylesheets and pages’ own <style>), emoji in the message catalogs and page markup, and unstyled native controls on the tool pages. Written by node tools/design-ratchet.mjs --record; a file may not rise above its count, and one that falls has its count lowered here.',
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
