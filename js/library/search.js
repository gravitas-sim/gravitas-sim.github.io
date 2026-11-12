// =============================================================================
// Searching the Library, with the reason a result matched
// -----------------------------------------------------------------------------
// Roadmap III Prompt 163. Loaded when the first query is typed, so the
// Library's first view does not pay for it. It reads what the page already has
// in the reader's language (title and summary), the words the facets use (the
// subject's name, the level, the length, the mathematics, the data), the id,
// and the learning objectives of the lessons that have them, which arrive in
// library/search-index.json on that first query. No network beyond that file of
// the site, no stored query, no ranking by anything a reader did.
//
// Every word of the query has to match something (not fuzzy: "trans" finds
// transits, a slip finds nothing; a plural finds its singular). A word counts most in the title, then the id
// and the subject, then the summary and the objectives, then the details; a
// word at the start of a word of the field beats the middle of one. The result
// names the fields that matched, so a result is never a mystery.
// =============================================================================

import { fold } from '../data/investigations/browse.js';

/** Field weights, heaviest first: what a word found there is worth. */
export const WEIGHTS = Object.freeze({
  title: 10,
  id: 6,
  subjects: 6,
  where: 5,
  summary: 3,
  objectives: 3,
  facts: 2,
});

/** Words as the folded query is cut: whitespace-separated, accents gone. */
export const words = query => fold(query).split(/\s+/).filter(Boolean);

/** Where a word is in a folded field: 2 at the start of a word, 1 inside, 0 absent. */
function where(field, word) {
  const at = field.indexOf(word);
  if (at < 0) return 0;
  return at === 0 || /[^a-z0-9]/.test(field[at - 1]) ? 2 : 1;
}

/**
 * Rank the entries for a query.
 * @param {Array<object>} entries - Library entries with `title` and `summary`
 *   already in the reader's language (strings)
 * @param {string} query - What was typed
 * @param {object} ctx
 * @param {(entry: object) => string[]} ctx.subjects - The names of its subjects
 * @param {(entry: object) => string[]} ctx.facts - The words of its level,
 *   length, mathematics, kind and data
 * @param {(entry: object) => string[]} [ctx.where] - Where it runs, as its card says
 *   ("In the mission lab"; Prompt 287)
 * @param {(id: string) => string} [ctx.objectives] - A lesson's objectives, one string
 * @returns {Map<string, {score: number, why: string[]}>} Matches, best first
 */
export function rank(entries, query, ctx) {
  const wanted = words(query);
  const hits = [];
  if (!wanted.length) return new Map();
  const phrase = fold(query).trim();
  for (const entry of entries) {
    const fields = {
      title: fold(entry.title),
      id: fold(
        String(entry.id)
          .replace(/^[a-z]+:/, '')
          .replace(/[-./]/g, ' ')
      ),
      subjects: fold(ctx.subjects(entry).join(' ')),
      where: fold(ctx.where?.(entry).join(' ') ?? ''),
      summary: fold(entry.summary),
      objectives: fold(ctx.objectives?.(entry.id) ?? ''),
      facts: fold(ctx.facts(entry).join(' ')),
    };
    let score = 0;
    const why = new Set();
    let all = true;
    for (const raw of wanted) {
      let best = 0;
      let bestField = null;
      // A plural finds its singular ("transits", "órbitas"): the word as typed
      // and without a final s, the better of the two in each field.
      const forms =
        raw.length > 3 && raw.endsWith('s') ? [raw, raw.slice(0, -1)] : [raw];
      for (const [name, text] of Object.entries(fields)) {
        const w = Math.max(...forms.map(word => where(text, word)));
        if (!w) continue;
        // A word inside a word is worth three fifths of one that starts it.
        const value = WEIGHTS[name] * (w === 2 ? 1 : 0.6);
        if (value > best) {
          best = value;
          bestField = name;
        }
        // Every field a word is found in is a reason, not only the best one.
        why.add(name);
      }
      if (!bestField) {
        all = false;
        break;
      }
      score += best;
    }
    if (!all) continue;
    if (fields.title.startsWith(phrase)) score += 5;
    // Prompt 287: the words together, in order, beat the same words found
    // apart ("dark matter" in a summary beats "dark" in one and "matter" in
    // another), worth the weight of the field that holds them.
    if (wanted.length > 1) {
      const together = Object.entries(fields)
        .filter(([, text]) => where(text, phrase) === 2)
        .map(([name]) => WEIGHTS[name]);
      if (together.length) score += Math.max(...together);
    }
    // The id is the title's own words in the technical form: it is a reason
    // only when the title did not already say so.
    if (why.has('title')) why.delete('id');
    hits.push({
      id: entry.id,
      score,
      why: Object.keys(WEIGHTS).filter(f => why.has(f)),
    });
  }
  hits.sort((a, b) => b.score - a.score);
  return new Map(hits.map(h => [h.id, h]));
}
