// =============================================================================
// The Library's search against a committed query set (Roadmap III Prompt 287)
// -----------------------------------------------------------------------------
// tools/library-queries.json lists what a student or an instructor types, in
// English and in Spanish, and where the entry that answers it has to rank. The
// rows run against the real catalog (library/library.json and the objectives in
// library/search-index.json) through the same ranker the page uses
// (js/library/search.js), with the page's own words for the card's facts, so a
// ranking change that loses an answer, in either language, fails here. A set
// that only ever grows is the point: the search was tuned against 248 entries,
// and every later closeout adds more.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { rank } from '../js/library/search.js';
import { EN_LIBRARY } from '../js/i18n/en.library.js';
import { ES_LIBRARY } from '../js/i18n/es.library.js';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const LIB = JSON.parse(read('library/library.json'));
const OBJECTIVES = JSON.parse(read('library/search-index.json')).objectives;
const SET = JSON.parse(read('tools/library-queries.json'));
const CATALOG = { en: EN_LIBRARY, es: ES_LIBRARY };
const IDS = new Set(LIB.entries.map(e => e.id));

/** The results of one query, best first, as the page ranks them. */
function search(query, lang) {
  const T = CATALOG[lang];
  const shown = LIB.kindShown ?? {};
  const entries = LIB.entries.map(e => ({
    ...e,
    title: e.title[lang] ?? e.title.en,
    summary: e.summary?.[lang] ?? e.summary?.en ?? '',
  }));
  return [
    ...rank(entries, query, {
      subjects: e =>
        (e.subjects ?? []).map(
          id => LIB.subjects.find(s => s.id === id).label[lang]
        ),
      facts: e =>
        [
          T[`lib.badge.${shown[e.kind] ?? e.kind}`],
          e.level && T[`lib.level.${e.level}`],
          e.length && T[`lib.length.${e.length}`],
          e.mathematics && T[`lib.mathematics.${e.mathematics}`],
          e.data && T[`lib.data.${e.data}`],
        ].filter(Boolean),
      where: e => [T[`lib.format.${e.format}`]],
      objectives: id => (OBJECTIVES[id]?.[lang] ?? []).join(' '),
    }).keys(),
  ];
}

describe('the committed query set', () => {
  test('names only entries the Library has, and is large enough to mean something', () => {
    expect(SET.queries.length).toBeGreaterThanOrEqual(35);
    for (const row of SET.queries) {
      expect(row.expect.length).toBeGreaterThan(0);
      for (const id of row.expect)
        expect([id, IDS.has(id)]).toEqual([id, true]);
      expect(row.within).toBeGreaterThanOrEqual(1);
      expect(row.within).toBeLessThanOrEqual(8);
    }
  });

  for (const lang of ['en', 'es']) {
    test(`every query finds its answer within its rank, in ${lang}`, () => {
      const misses = [];
      for (const row of SET.queries) {
        const got = search(row[lang], lang);
        const best = Math.min(
          ...row.expect.map(id => {
            const at = got.indexOf(id);
            return at < 0 ? Infinity : at + 1;
          })
        );
        if (best > row.within)
          misses.push(
            `${lang} "${row[lang]}": best answer at ${best}, wanted within ${row.within}; first: ${got.slice(0, 3).join(', ')}`
          );
      }
      expect(misses).toEqual([]);
    });

    test(`a query that is not a word of the catalog finds nothing, in ${lang}`, () => {
      for (const q of SET.refuse[lang])
        expect([q, search(q, lang)]).toEqual([q, []]);
    });
  }

  test('every row is a different query in each language, so the Spanish is not the English typed twice', () => {
    const same = SET.queries.filter(r => r.en === r.es).map(r => r.en);
    // Words that are the same in both languages are allowed, and listed.
    expect(same.sort()).toEqual(['eclipse', 'hubble', 'supernova']);
  });
});
