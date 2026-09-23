// =============================================================================
// A count a reader sees has to be the count the software has
// -----------------------------------------------------------------------------
// The welcome screen told every instructor who opened Gravitas that there were
// "Six guided investigations", in English and in Spanish, over a manifest of
// twenty-two. It had been six once. Nothing was wired to notice.
//
// `npm run docs:check` now holds those two strings to MANIFEST.length through
// tools/docs-facts.mjs, which is the mechanism that repairs them. This is the
// other half: a sweep that finds any *new* place someone writes a number next
// to the word "investigations", in either language, and fails if it disagrees.
// A rule that only knows about the two strings it was written for would not
// have caught the two strings it was written for.
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { completeCatalogs } from '../tools/i18n-catalog.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  'twenty-one': 21,
  'twenty-two': 22,
  'twenty-three': 23,
  'twenty-four': 24,
  'twenty-five': 25,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuna: 21,
  veintidós: 22,
};

const NUMBER = `\\d+|${Object.keys(WORDS).join('|')}`;
// A number, then at most two adjectives, then the noun.
const CLAIM = new RegExp(
  `\\b(${NUMBER})\\b((?:\\s+[a-záéíóúñ]+){0,2}?)\\s+(investigations|investigaciones)\\b`,
  'gi'
);

/** @param {string} n - A numeral or a number word @returns {number} Its value */
const valueOf = n => WORDS[n.toLowerCase()] ?? Number(n);

/** Every "<number> ... investigations" claim in a piece of text. */
function claims(where, text) {
  if (typeof text !== 'string') return [];
  return [...text.matchAll(CLAIM)].map(m => ({
    where,
    said: valueOf(m[1]),
    text: m[0].replace(/\s+/g, ' '),
  }));
}

/** An HTML page's visible text. */
function visibleText(rel) {
  return readFileSync(path.join(REPO, rel), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

describe('the public investigation count', () => {
  test('the sweep can see a claim, right or wrong', () => {
    expect(
      claims('probe', 'Six guided investigations for anyone')[0].said
    ).toBe(6);
    expect(claims('probe', '22 investigaciones guiadas')[0].said).toBe(22);
    expect(claims('probe', 'guided investigations, plural')).toEqual([]);
  });

  test('every claim in the message catalogs equals the manifest', async () => {
    const { MANIFEST } = await import('../js/data/investigations/manifest.js');
    // Every fragment of every locale, from the directory rather than a list
    // of eight files that had already missed both placement catalogs.
    const { catalogs } = await completeCatalogs();
    const found = [];
    for (const { merged, homeOf } of catalogs.values())
      for (const [key, value] of Object.entries(merged))
        found.push(...claims(`${homeOf.get(key)} ${key}`, value));
    // At least one, or this test would pass over a catalog that never
    // mentions the number and prove nothing.
    expect(found.length).toBeGreaterThan(0);
    expect(
      found
        .filter(c => c.said !== MANIFEST.length)
        .map(c => `${c.where}: "${c.text}"`)
    ).toEqual([]);
  });

  test('every claim on the standalone pages equals the manifest', async () => {
    const { MANIFEST } = await import('../js/data/investigations/manifest.js');
    const found = [];
    for (const page of [
      'index.html',
      'model/index.html',
      'teaching/index.html',
      'instructors/index.html',
      'validation/index.html',
    ])
      found.push(...claims(page, visibleText(page)));
    expect(
      found
        .filter(c => c.said !== MANIFEST.length)
        .map(c => `${c.where}: "${c.text}"`)
    ).toEqual([]);
  });
});
