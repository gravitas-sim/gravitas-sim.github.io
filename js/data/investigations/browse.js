// =============================================================================
// Browsing the catalogue: search and filters
// -----------------------------------------------------------------------------
// Everything here reads the generated manifest. There is no second list of
// lessons: the subjects a filter offers are the tags the lessons declare, the
// lengths are bucketed from the durations they declare, and how much
// arithmetic each asks for is counted from its own steps. Add a lesson, run
// `npm run manifest`, and the filters know about it.
//
// No DOM. The browser panel renders what these return; the rules for what
// matches live here so they can be checked without a page.
// =============================================================================

import { BROWSE_META } from './browseData.js';
import { LENGTH, lengthOf, calculationOf } from './sequences.js';

/**
 * The filter metadata for one lesson.
 *
 * Empty rather than undefined for a lesson the generator has not seen, so a
 * catalogue and a stale browseData.js produce a lesson with no subjects rather
 * than a crash in the middle of the grid.
 *
 * @param {string} id - Lesson id
 * @returns {{tags: string[], numericCount: number}} Metadata
 */
export const metaFor = id => BROWSE_META[id] || { tags: [], numericCount: 0 };

/** The subjects a lesson declares. */
export const tagsOf = entry => metaFor(entry?.id).tags;

/** How far through a lesson somebody is, as a filter. */
export const PROGRESS = Object.freeze({
  /** Not opened on this device. */
  NEW: 'new',
  /** Opened, not finished. */
  GOING: 'going',
  /** Every step seen. */
  DONE: 'done',
});

/** The order they are offered in. */
export const PROGRESSES = [PROGRESS.NEW, PROGRESS.GOING, PROGRESS.DONE];

/** Nothing selected: the whole catalogue, in catalogue order. */
export const NO_FILTERS = Object.freeze({
  query: '',
  subject: '',
  length: '',
  progress: '',
  calculation: '',
});

/**
 * Whether anything is narrowing the list.
 *
 * @param {object} filters - A filter set
 * @returns {boolean} True if the reader has chosen something
 */
export const isFiltered = filters =>
  Object.keys(NO_FILTERS).some(
    key => String(filters?.[key] ?? '').trim() !== ''
  );

/**
 * The subjects the catalogue actually covers, with how many lessons each has.
 *
 * Sorted by name rather than by count, because a filter is a place to look
 * something up and alphabetical is where a reader's eye goes.
 *
 * @param {Array<object>} manifest - The catalogue
 * @returns {Array<{tag:string, count:number}>} Subjects
 */
export function subjectsOf(manifest = []) {
  const counts = new Map();
  manifest.forEach(entry =>
    tagsOf(entry).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1))
  );
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/**
 * Fold a string for searching: lower case, accents removed.
 *
 * The Spanish catalogue is full of accented words and a reader typing on a
 * phone keyboard will not reach for them. "energia" should find "energía".
 *
 * @param {string} text - Anything
 * @returns {string} Folded
 */
export const fold = text =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Everything about a lesson a search should look at.
 *
 * The id is in here with its hyphens opened out, and it earns its place: the
 * titles are deliberately plain-language - "Getting There From Here", "Where
 * Can It Get To?" - while the ids carry the technical name a reader is most
 * likely to type. Somebody searching "hohmann" or "lagrange" means it, and
 * without the id they would be told the catalogue has nothing.
 */
const haystack = entry =>
  fold(
    [
      entry.title,
      entry.subtitle,
      entry.summary,
      String(entry.id || '').replace(/-/g, ' '),
      ...tagsOf(entry),
    ].join(' ')
  );

/**
 * Does a lesson match a query?
 *
 * Every whitespace-separated word has to appear somewhere, in any order, as a
 * substring. Not fuzzy: a reader who types "trans" wants transits, and a
 * reader who mistypes would rather see nothing than see the wrong thing.
 *
 * @param {object} entry - A manifest entry
 * @param {string} query - What was typed
 * @returns {boolean} Match
 */
export function matchesQuery(entry, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = haystack(entry);
  return words.every(word => hay.includes(word));
}

/**
 * Which progress bucket a lesson is in for this reader.
 *
 * @param {{done:number, total:number, started:boolean}} p - From progressFor
 * @returns {string} One of PROGRESS
 */
export function progressBucket(p) {
  if (!p?.started) return PROGRESS.NEW;
  return p.total && p.done >= p.total ? PROGRESS.DONE : PROGRESS.GOING;
}

/**
 * Apply a filter set to the catalogue.
 *
 * Returns the entries that survive, in catalogue order, each with the derived
 * facts the cards want so nothing has to work them out twice.
 *
 * @param {Array<object>} manifest - The catalogue
 * @param {object} filters - A filter set; missing keys mean "any"
 * @param {(id:string)=>object} progressOf - Reads saved progress
 * @returns {Array<object>} Entries with `length`, `calculation` and `progress`
 */
export function filterCatalogue(manifest = [], filters = {}, progressOf) {
  const wantSubject = filters.subject || '';
  const wantLength = filters.length || '';
  const wantProgress = filters.progress || '';
  const wantCalculation = filters.calculation || '';

  return manifest
    .map(entry => {
      const p = progressOf ? progressOf(entry.id) : null;
      return {
        entry,
        length: lengthOf(entry),
        calculation: calculationOf(entry),
        progress: p ? progressBucket(p) : PROGRESS.NEW,
        saved: p,
      };
    })
    .filter(
      row =>
        (!wantSubject || tagsOf(row.entry).includes(wantSubject)) &&
        (!wantLength || row.length === wantLength) &&
        (!wantProgress || row.progress === wantProgress) &&
        (!wantCalculation || row.calculation === wantCalculation) &&
        matchesQuery(row.entry, filters.query || '')
    );
}

/**
 * A filter worth suggesting when a search found nothing.
 *
 * An empty result is only useful if it says what to do next. If dropping one
 * filter would bring lessons back, that is the one to offer; the caller shows
 * it as a button rather than leaving the reader to guess which of four
 * controls is the problem.
 *
 * @param {Array<object>} manifest - The catalogue
 * @param {object} filters - The filter set that found nothing
 * @param {(id:string)=>object} progressOf - Reads saved progress
 * @returns {?{key:string, count:number}} The filter to drop, or null
 */
export function loosening(manifest, filters, progressOf) {
  const keys = Object.keys(NO_FILTERS).filter(
    key => String(filters?.[key] ?? '').trim() !== ''
  );
  if (keys.length < 2) return null;
  let best = null;
  for (const key of keys) {
    const relaxed = { ...filters, [key]: '' };
    const count = filterCatalogue(manifest, relaxed, progressOf).length;
    if (count > 0 && (!best || count > best.count)) best = { key, count };
  }
  return best;
}

export { LENGTH, lengthOf, calculationOf };
