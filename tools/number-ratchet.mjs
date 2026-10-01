// =============================================================================
// Three migrations that may only go one way: numbers through the formatter,
// units through the registry, and typed numbers through one parser
// -----------------------------------------------------------------------------
//   node tools/number-ratchet.mjs            check the sources against the record
//   node tools/number-ratchet.mjs --record   rewrite the record from the sources
//
// Roadmap II Prompt 59 gives every user-visible number one formatter
// (js/format.js) and every unit one registry (js/units/registry.js). When the
// registry landed the sources had 616 toFixed and toPrecision calls and 320
// unit literals it did not know - lesson labels, prose, the validation
// suite's descriptions - and moving them all at once would change what
// hundreds of readouts print in one unreviewable commit.
//
// So each is counted per file, and tools/number-ratchet.json holds the count.
// A file above its count fails: new code formats through js/format.js and
// names units the registry knows. A file below it fails too, until the record
// is rewritten with --record, so the counts can only fall. The same rule as
// the fixed sleeps in the browser suite (tools/check-test-policy.mjs).
//
// The third is Prompt 59's step 5. A number a person types is read by
// js/answerParse.js's parseNumber, which knows the locale's decimal mark and
// refuses what is ambiguous; `Number(field.value)` and the one-shot
// `.replace(',', '.')` do neither. Both are counted, sliders and selects too
// (valueAsNumber is the cheap way out for those), and the count only falls.
//
// tests/numberRatchet.test.js runs the check.
// =============================================================================

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isUnit } from '../js/units/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = path.join(ROOT, 'tools', 'number-ratchet.json');

/** The files that are the formatter and the registry themselves. */
const OWNERS = new Set(['js/format.js', 'js/units/registry.js']);

/** Every source under js/, except the catalogs, which carry no code. */
function sources() {
  const out = [];
  const walk = rel => {
    for (const entry of readdirSync(path.join(ROOT, rel), {
      withFileTypes: true,
    })) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (next !== 'js/i18n') walk(next);
      } else if (entry.name.endsWith('.js') && !OWNERS.has(next)) {
        out.push(next);
      }
    }
  };
  walk('js');
  return out.sort();
}

/** Lines without their line comments. */
const code = src => src.split('\n').map(line => line.replace(/\/\/.*$/, ''));

/** toFixed and toPrecision calls outside comments. */
export const countFormatting = src =>
  code(src).reduce(
    (n, line) => n + (line.match(/\.to(?:Fixed|Precision)\s*\(/g) || []).length,
    0
  );

/** `unit: '...'` literals the registry does not know. */
export const countUnknownUnits = src =>
  code(src).reduce((n, line) => {
    for (const m of line.matchAll(/\bunit\s*:\s*(['"])((?:(?!\1).)*)\1/g))
      if (!isUnit(m[2])) n++;
    return n;
  }, 0);

/** A field's text read as a number directly, or its comma swapped once. */
export const countRawParsing = src =>
  code(src).reduce(
    (n, line) =>
      n +
      (line.match(/\b(?:Number|parseFloat|parseInt)\s*\([^)]*\.value\b/g) || [])
        .length +
      (line.match(/\.replace\(\s*(['"]),\1\s*,\s*(['"])\.\2\s*\)/g) || [])
        .length,
    0
  );

/** The parser itself, which is where the reading belongs. */
const PARSER = 'js/answerParse.js';

/** Every count for every file that has any. */
export function measure() {
  const formatting = {};
  const units = {};
  const parsing = {};
  for (const rel of sources()) {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const f = countFormatting(src);
    const u = countUnknownUnits(src);
    const p = rel === PARSER ? 0 : countRawParsing(src);
    if (f) formatting[rel] = f;
    if (u) units[rel] = u;
    if (p) parsing[rel] = p;
  }
  return { formatting, units, parsing };
}

const WHAT = {
  formatting: [
    'toFixed/toPrecision calls',
    'Format through js/format.js instead',
  ],
  units: [
    'unit literals the registry does not know',
    'Name a unit of js/units/registry.js, or add it there',
  ],
  parsing: [
    'raw reads of a typed number',
    'Read it with parseNumber from js/answerParse.js',
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
    const has = record[kind] ?? {};
    const got = now[kind] ?? {};
    const files = new Set([...Object.keys(got), ...Object.keys(has)]);
    for (const rel of [...files].sort()) {
      const n = got[rel] ?? 0;
      const max = has[rel] ?? 0;
      if (n > max)
        problems.push(`${rel}: ${n} ${noun}, over its ${max}. ${fix}.`);
      else if (n < max)
        problems.push(
          `${rel}: ${n} ${noun}, under its ${max}. Lower it: node tools/number-ratchet.mjs --record`
        );
    }
  }
  return problems;
}

export const readRecord = () => JSON.parse(readFileSync(RECORD, 'utf8'));

const total = counts => Object.values(counts).reduce((a, b) => a + b, 0);

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
          note: 'Per file under js/: toFixed/toPrecision calls outside js/format.js, unit literals js/units/registry.js does not know, and typed numbers read without js/answerParse.js (Number/parseFloat/parseInt of a .value, or a one-shot comma swap). Written by node tools/number-ratchet.mjs --record; a file may not rise above its count, and one that falls has its count lowered here.',
          ...now,
        },
        null,
        2
      )}\n`
    );
    console.log(
      `Recorded ${total(now.formatting)} formatting calls, ${total(now.units)} unknown unit literals and ${total(now.parsing)} raw reads of a typed number.`
    );
  } else {
    const problems = check();
    if (problems.length) {
      console.error(problems.join('\n'));
      process.exit(1);
    }
    const r = readRecord();
    console.log(
      `Within the record: ${total(r.formatting)} formatting calls, ${total(r.units)} unknown unit literals, ${total(r.parsing ?? {})} raw reads of a typed number.`
    );
  }
}
