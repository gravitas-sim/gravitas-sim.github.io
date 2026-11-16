// =============================================================================
// The investigation registry
// -----------------------------------------------------------------------------
// Twelve lessons, each in its own file, loaded one at a time.
//
// The lessons are the heaviest content in the application: 8,460 lines and
// 225KB between them, and a student who opens one opens exactly one. Holding
// them in a single module meant that reading Kepler's Laws also parsed the
// other eleven, including every widget hook and probe closure in them.
//
// So there are two ways in, and which one a caller wants depends on whether it
// is showing a lesson or reasoning about all of them:
//
//   MANIFEST            everything the browser needs to draw ten cards - title,
//                       subtitle, duration, level, summary, thumbnail, series,
//                       and the two counts a card quotes. A few kilobytes,
//                       always resident, and generated from the lessons
//                       themselves so it cannot drift from them.
//   loadInvestigation() the lesson itself, imported on demand and memoized.
//
// The generator is tools/build-investigation-manifest.js and
// tests/investigationRegistry.test.js fails if the checked-in manifest is not
// what the generator would write today.
//
// Consumers that genuinely need all ten at once - the answer-key generator, the
// instructor materials build, and the data tests - import ../investigations.js
// instead, which pulls the ten in statically and hands back the same array this
// module's ids describe. That path is synchronous on purpose: a build script
// should not have to await its inputs.
// =============================================================================

import { MANIFEST as MANIFEST_EN } from './manifest.js';
import {
  getLessonLocale,
  gradedSteps,
  positionIn,
  loadInvestigation,
  onLessonLocale,
  setLoaderLocale,
} from './loaders.js';

// The lessons themselves are ./loaders.js's; every name is here too, so a
// caller that wants the cards and the lessons imports one module.
export { gradedSteps };
export {
  getLessonLocale,
  hasInvestigation,
  loadInvestigation,
  loadedInvestigation,
  provideLessonLoaders,
} from './loaders.js';

/**
 * The card-level catalog, in the language lessons are being served in.
 *
 * The browser draws ten cards before any lesson is loaded, so the titles on
 * those cards cannot come from the lessons; they come from a manifest, and
 * there is therefore one manifest per language. English is bundled because it
 * is the fallback; the others arrive with the locale.
 *
 * A live binding rather than a constant: importers see the current language
 * because they read `MANIFEST` at the moment they use it. Anything that keeps
 * a reference across a language change should re-read it on
 * `gravitasLocaleChanged`, which is what the lesson browser does.
 */
export let MANIFEST = MANIFEST_EN;

/**
 * The cards of a language with their summaries.
 *
 * The manifest carries no summary: the paragraph is written once, in
 * summaries.js, and fetched here only when the lesson browser asks for the
 * catalog, so opening a lesson never pays for twenty-four of them.
 */
const withSummaries = (cards, summaries, fallback = {}) =>
  cards.map(card => ({
    ...card,
    summary: summaries[card.id] || fallback[card.id],
  }));
// A summaries file that fails to load leaves the cards (and their titles)
// whole, only without the paragraph.
const noSummaries = () => ({});

const MANIFESTS = {
  en: () =>
    import('./summaries.js')
      .then(s => s.SUMMARIES)
      .catch(noSummaries)
      .then(s => ({ MANIFEST: withSummaries(MANIFEST_EN, s) })),
  es: () =>
    Promise.all([
      import('./manifest.es.js'),
      import('./summaries.es.js').then(s => s.SUMMARIES_ES, noSummaries),
      import('./summaries.js').then(s => s.SUMMARIES, noSummaries),
    ]).then(([m, es, en]) => ({
      MANIFEST: withSummaries(m.MANIFEST, es, en),
    })),
};

/** The in-flight catalog fetch, if there is one. See lessonCatalogReady. */
let manifestLoad = null;
/** Whether the browser has asked for the cards with their summaries. */
let summariesWanted = false;

/**
 * Fetch the card-level catalog for a language.
 *
 * Follows the lessons: ./loaders.js tells this module when the language
 * changes. The catalog is fetched rather than bundled, so a reader who never
 * switches language never pays for the other one.
 *
 * @param {string} locale - A locale id
 * @returns {Promise<Array>} The manifest for that language
 */
function loadCatalog(locale) {
  // English cards need no fetch until the browser asks for them with their
  // summaries; a lesson opened by link never does.
  if (locale === 'en' && !summariesWanted) {
    MANIFEST = MANIFEST_EN;
    return (manifestLoad = Promise.resolve(MANIFEST));
  }
  const load = MANIFESTS[locale] || MANIFESTS.en;
  manifestLoad = load()
    .then(mod => {
      // A second change while this one was in flight wins.
      if (MANIFESTS[getLessonLocale()] === load) MANIFEST = mod.MANIFEST;
      return MANIFEST;
    })
    .catch(() => {
      MANIFEST = MANIFEST_EN;
      return MANIFEST;
    });
  return manifestLoad;
}

/**
 * Choose the language lessons and their cards are loaded in.
 * @param {string} locale - A locale id
 * @returns {Promise<Array>} The manifest for that language
 */
export function setLessonLocale(locale) {
  setLoaderLocale(locale);
  return manifestLoad;
}

/**
 * Resolves when MANIFEST holds the catalog for the current language.
 *
 * The card-level catalog is one file per language and is fetched, so there
 * is always a moment after a language change when MANIFEST is still the
 * previous language's. That moment used to fall while nobody was looking: the
 * application told this module the locale at start-up, seconds before anybody
 * opened the browser.
 *
 * Now that this module is loaded on demand, the fetch starts when the reader
 * opens the browser and the first render can lose the race - a grid of English
 * titles for a reader who chose Spanish. Anything that renders from MANIFEST
 * awaits this first. It is already resolved in the overwhelmingly common case
 * of English, or of a second open.
 *
 * @returns {Promise<Array>} The manifest for the current language
 */
export function lessonCatalogReady() {
  if (!summariesWanted) {
    summariesWanted = true;
    return loadCatalog(getLessonLocale());
  }
  return manifestLoad || loadCatalog(getLessonLocale());
}

// Follow the language from here on, and fetch the card-level catalog for the
// current one now, without waiting to be told: the browser's cards come from a
// per-language manifest, and a reader who chose Spanish before this module
// existed should not see a grid of English titles until something else happens
// to change the language.
onLessonLocale(loadCatalog);
if (getLessonLocale() !== 'en') loadCatalog(getLessonLocale());

/** @returns {Array<string>} Every lesson id, in catalog order */
export const investigationIds = () => MANIFEST.map(m => m.id);

/**
 * The card-level description of a lesson, without loading the lesson.
 * @param {string} id - Investigation id
 * @returns {Object|undefined} A manifest entry
 */
export const investigationMeta = id => MANIFEST.find(m => m.id === id);

/**
 * Every lesson, in catalog order.
 *
 * The asynchronous counterpart to ../investigations.js, for a browser-side
 * caller that really does need all ten - there is currently none, and that is
 * the point of the manifest.
 *
 * @returns {Promise<Array<Object>>} All investigations
 */
export const loadAllInvestigations = () =>
  Promise.all(investigationIds().map(loadInvestigation));

/**
 * Where a lesson sits in its series, if it belongs to one.
 *
 * Bound to the manifest, which is what the browser has: the ten cards are drawn
 * before any lesson is loaded, and "2 of 3" is on the card.
 *
 * @param {Object} inv - Investigation or manifest entry
 * @returns {{label: string, index: number, of: number}|null} Position, or null
 */
export const seriesPosition = inv => positionIn(MANIFEST, inv);
