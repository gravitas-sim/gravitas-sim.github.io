#!/usr/bin/env node
// =============================================================================
// Skeleton for a lesson translation
// -----------------------------------------------------------------------------
// Writes a shadow of a lesson - the same shape, carrying only the fields that
// are words - with the English still in place, ready to be translated over.
//
//   node tools/build-lesson-translation-skeleton.mjs <locale> <lesson-id>
//   node tools/build-lesson-translation-skeleton.mjs es --all --stdout
//
// Doing this by hand is where a translation goes wrong: a mistyped path, an
// options array a member short, a `setup.scenario` translated into Spanish and
// a lesson that then loads no scenario at all. The shape comes off the lesson
// itself, so none of those are possible.
//
// It is a starting point, not a build step. Once a translation exists this
// script is not run over it again - that would throw the Spanish away. It
// prints to stdout unless told otherwise, and refuses to overwrite.
// =============================================================================

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { STRUCTURAL } from '../js/data/investigations/i18n.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'js', 'data', 'investigations');

/**
 * The translatable half of a value.
 *
 * Returns undefined for anything with no words in it, so an object whose every
 * field is machinery does not appear in the skeleton at all.
 *
 * @param {*} v - Part of a lesson
 * @param {string} key - The key it was found under
 * @returns {*} The same shape with only its strings, or undefined
 */
function wordsOf(v, key = '') {
  if (typeof v === 'function') return undefined;
  if (typeof v === 'string') {
    if (STRUCTURAL.has(key)) return undefined;
    return v;
  }
  if (Array.isArray(v)) {
    const out = v.map(x => wordsOf(x, key));
    return out.some(x => x !== undefined) ? out.map(x => x ?? null) : undefined;
  }
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const w = wordsOf(x, k);
      if (w !== undefined) out[k] = w;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

const HEADER = (
  id,
  locale
) => `// =============================================================================
// ${id} - ${locale}
// -----------------------------------------------------------------------------
// A shadow of ../${id}.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. \`null\` means "not translated";
// that entry keeps its English.
// =============================================================================
`;

/**
 * Render one translation skeleton.
 * @param {Object} inv - The English lesson
 * @param {string} locale - Locale id
 * @returns {Promise<string>} The file contents
 */
async function render(inv, locale) {
  const words = wordsOf(inv) || {};
  const raw = `${HEADER(inv.id, locale)}\nexport default ${JSON.stringify(words, null, 2)};\n`;
  const options = (await prettier.resolveConfig(path.join(DIR, 'x.js'))) || {};
  return prettier.format(raw, { ...options, filepath: path.join(DIR, 'x.js') });
}

const [, , locale, ...rest] = process.argv;
if (!locale) {
  console.error(
    'usage: build-lesson-translation-skeleton.mjs <locale> <id|--all> [--stdout]'
  );
  process.exit(1);
}
const toStdout = rest.includes('--stdout');
const ids = rest.includes('--all')
  ? INVESTIGATIONS.map(i => i.id)
  : rest.filter(a => !a.startsWith('--'));

const outDir = path.join(DIR, locale);
if (!toStdout) mkdirSync(outDir, { recursive: true });

for (const id of ids) {
  const inv = INVESTIGATIONS.find(i => i.id === id);
  if (!inv) {
    console.error(`no such lesson: ${id}`);
    process.exit(1);
  }
  const text = await render(inv, locale);
  if (toStdout) {
    process.stdout.write(text);
    continue;
  }
  const file = path.join(outDir, `${id}.js`);
  if (existsSync(file)) {
    console.log(`exists, left alone: ${path.relative(process.cwd(), file)}`);
    continue;
  }
  writeFileSync(file, text);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
