// =============================================================================
// Do the labels say the same thing every time, in both languages?
// -----------------------------------------------------------------------------
// tools/glossary.mjs holds the table (LABELS: navigation, library, instrument,
// quantity and unit names; TERMINOLOGY: prose forms). This file holds the
// catalogs to it.
//
//   labels       a check, and it fails: an id the glossary names must carry the
//                glossary's English and Spanish exactly, and any other entry
//                whose English is exactly a glossary label must carry its
//                Spanish. Labels and identifiers, never prose.
//   terminology  a report, and it does not fail: where Spanish prose uses a
//                form the glossary does not prefer, counted and sampled, for
//                the reader who will decide (TRANSLATION.md).
//   accents      a report, and it does not fail: a Spanish word that appears in
//                the catalog both with and without an accent mark, which is
//                either a valid pair (si, sí) or a missing accent.
//
// Divergences that exist today are listed on the label (`known`), because the
// catalogs are an input of the instructor bundle's source digest and are not
// edited by tooling work. The list is a ratchet: it can only shrink.
//
// Pure functions of the catalogs and the table; tools/i18n-audit.mjs prints.
// =============================================================================

import { LABELS, TERMINOLOGY } from './glossary.mjs';

/**
 * Hold one language pair of catalogs to the label table.
 *
 * @param {Object<string,*>} en - English catalog, merged
 * @param {Object<string,*>} es - Spanish catalog, merged
 * @param {object[]} [labels] - The table
 * @returns {{problems: string[], checked: number, known: number}} Result
 */
export function checkLabels(en, es, labels = LABELS) {
  const problems = [];
  let checked = 0;
  let known = 0;
  const seen = new Map();
  for (const label of labels) {
    const explicit = new Set(label.ids ?? []);
    const swept = Object.keys(en).filter(id => en[id] === label.en);
    for (const id of new Set([...explicit, ...swept])) {
      checked++;
      const where = `${label.id} (${label.kind}): ${id}`;
      if (seen.has(id) && seen.get(id) !== label.id)
        problems.push(
          `${where} is claimed by two labels (${seen.get(id)} too)`
        );
      seen.set(id, label.id);
      if (en[id] !== label.en) {
        problems.push(
          `${where}: the English is ${JSON.stringify(en[id])} but the glossary says ${JSON.stringify(label.en)}. Change the glossary (tools/glossary.mjs) with the English, in both languages.`
        );
        continue;
      }
      const text = es[id];
      const accepted = [
        label.es,
        ...(explicit.has(id) ? [] : (label.allow ?? [])),
      ];
      const waived = label.known?.[id];
      if (waived !== undefined) {
        known++;
        if (accepted.includes(text))
          problems.push(
            `${where} now says ${JSON.stringify(text)}: remove it from known on the label`
          );
        else if (text !== waived)
          problems.push(
            `${where} says ${JSON.stringify(text)}; the label records ${JSON.stringify(waived)} as known and the glossary says ${JSON.stringify(label.es)}`
          );
        continue;
      }
      if (!accepted.includes(text))
        problems.push(
          `${where}: the Spanish is ${JSON.stringify(text)} but the glossary says ${JSON.stringify(label.es)}${label.allow ? ` (or ${label.allow.map(a => JSON.stringify(a)).join(', ')})` : ''}`
        );
    }
    for (const id of Object.keys(label.known ?? {}))
      if (!explicit.has(id) && en[id] !== label.en)
        problems.push(
          `${label.id}: known id ${id} no longer has the English ${JSON.stringify(label.en)}`
        );
  }
  return { problems, checked, known };
}

/**
 * Where Spanish prose uses a form the glossary does not prefer.
 *
 * @param {string[]} texts - Spanish prose
 * @param {object[]} [terms] - TERMINOLOGY
 * @returns {Array<{id: string, preferred: number, variants: Array<{pattern: string, count: number, sample: ?string}>}>} Counts
 */
export function terminology(texts, terms = TERMINOLOGY) {
  return terms.map(term => {
    const count = pattern => {
      let n = 0;
      let sample = null;
      for (const t of texts) {
        const hits = t.match(
          new RegExp(
            pattern.source,
            pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
          )
        );
        if (hits) {
          n += hits.length;
          sample ??= t.slice(0, 80);
        }
      }
      return { n, sample };
    };
    return {
      id: term.id,
      preferred: count(term.prefer).n,
      variants: term.variants.map(v => {
        const { n, sample } = count(v);
        return { pattern: String(v), count: n, sample };
      }),
    };
  });
}

/** A word with its accent marks taken off. */
const fold = w => w.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');

/** Spanish words that are correct with and without the mark, which the report skips. */
const VALID_PAIRS = new Set(
  'que esta este ese esos esas aquel como donde cual cuales cuando cuanto quien si solo aun el tu mi se te de mas estas cambio paso periodo periodos uso'.split(
    ' '
  )
);

/**
 * Words the Spanish catalog spells both with and without an accent mark.
 *
 * `si`/`sí` and `periodo`/`período` are valid pairs; `Direccion` beside
 * `Dirección` is a missing mark. The list cannot tell them apart and does not
 * try: it puts both counts in front of a reader.
 *
 * @param {string[]} texts - Spanish text
 * @param {number} [limit] - How many to return, the most split first
 * @returns {Array<{word: string, bare: number, accented: Object<string,number>}>} Pairs
 */
export function accentVariants(texts, limit = 25) {
  const counts = new Map();
  for (const t of texts) {
    for (const w of t
      .replace(/<[^>]*>/g, ' ')
      .match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/g) ?? []) {
      const lower = w.toLowerCase();
      counts.set(lower, (counts.get(lower) ?? 0) + 1);
    }
  }
  const groups = new Map();
  for (const [w, n] of counts) {
    const key = fold(w);
    const g = groups.get(key) ?? { bare: 0, accented: {} };
    if (VALID_PAIRS.has(key)) continue;
    if (w === key) g.bare += n;
    else g.accented[w] = n;
    groups.set(key, g);
  }
  return [...groups]
    .filter(([, g]) => g.bare > 0 && Object.keys(g.accented).length)
    .map(([word, g]) => ({ word, ...g }))
    .sort(
      (a, b) =>
        Math.min(
          b.bare,
          Object.values(b.accented).reduce((x, y) => x + y, 0)
        ) -
        Math.min(
          a.bare,
          Object.values(a.accented).reduce((x, y) => x + y, 0)
        )
    )
    .slice(0, limit);
}
