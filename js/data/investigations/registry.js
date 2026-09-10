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
import { gradedSteps, positionIn } from './catalogue.js';
import { mergeTranslation } from './i18n.js';
// Two hundred bytes that hold one string and import nothing. The registry
// cannot read the interface's locale - it deliberately imports no i18n - but it
// can read what the application asked for, which is what lets this module be
// loaded on demand without a window in which lessons come back in the wrong
// language. See js/lessonLocale.js.
import {
  requestedLessonLocale,
  registerLessonLocaleSink,
} from '../../lessonLocale.js';

export { gradedSteps };

/**
 * The card-level catalogue, in the language lessons are being served in.
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

const MANIFESTS = {
  en: () => Promise.resolve({ MANIFEST: MANIFEST_EN }),
  es: () => import('./manifest.es.js'),
};

/**
 * The lesson loaders, by id.
 *
 * Written out rather than built from a template string because a bundler has to
 * see a static specifier to split a chunk for it: `import('./' + id + '.js')`
 * either bundles all ten into one chunk or fails outright, which is the exact
 * thing this module exists to avoid.
 */
const LOADERS = {
  'keplers-laws': () => import('./keplers-laws.js'),
  'retrograde-motion': () => import('./retrograde-motion.js'),
  'transit-photometry': () => import('./transit-photometry.js'),
  'orbital-energy': () => import('./orbital-energy.js'),
  'weighing-stars': () => import('./weighing-stars.js'),
  'black-holes': () => import('./black-holes.js'),
  'radial-velocity': () => import('./radial-velocity.js'),
  'goldilocks-question': () => import('./goldilocks-question.js'),
  'missing-mass': () => import('./missing-mass.js'),
  tides: () => import('./tides.js'),
  'butterfly-effect': () => import('./butterfly-effect.js'),
  'when-orbits-lock': () => import('./when-orbits-lock.js'),
  'detect-this-planet': () => import('./detect-this-planet.js'),
  'design-the-schedule': () => import('./design-the-schedule.js'),
  'binary-star-planets': () => import('./binary-star-planets.js'),
  'gravity-assist': () => import('./gravity-assist.js'),
  'hohmann-transfer': () => import('./hohmann-transfer.js'),
  'lagrange-points': () => import('./lagrange-points.js'),
  'listening-to-spacetime': () => import('./listening-to-spacetime.js'),
  'a-universe-of-stars': () => import('./a-universe-of-stars.js'),
  'lives-of-stars': () => import('./lives-of-stars.js'),
};

/**
 * The translations, by locale and then by lesson.
 *
 * A translation is a shadow of a lesson carrying only its words - see ./i18n.js
 * - so it is a fraction of the size of the lesson and is fetched alongside it
 * only when the interface is in that language. English needs none: it is what
 * the lessons are written in.
 *
 * Static specifiers again, for the same reason as above.
 */
const TRANSLATIONS = {
  es: {
    'keplers-laws': () => import('./es/keplers-laws.js'),
    'retrograde-motion': () => import('./es/retrograde-motion.js'),
    'transit-photometry': () => import('./es/transit-photometry.js'),
    'orbital-energy': () => import('./es/orbital-energy.js'),
    'weighing-stars': () => import('./es/weighing-stars.js'),
    'black-holes': () => import('./es/black-holes.js'),
    'radial-velocity': () => import('./es/radial-velocity.js'),
    'goldilocks-question': () => import('./es/goldilocks-question.js'),
    'missing-mass': () => import('./es/missing-mass.js'),
    tides: () => import('./es/tides.js'),
    'butterfly-effect': () => import('./es/butterfly-effect.js'),
    'when-orbits-lock': () => import('./es/when-orbits-lock.js'),
    'detect-this-planet': () => import('./es/detect-this-planet.js'),
    'design-the-schedule': () => import('./es/design-the-schedule.js'),
    'binary-star-planets': () => import('./es/binary-star-planets.js'),
    'gravity-assist': () => import('./es/gravity-assist.js'),
    'hohmann-transfer': () => import('./es/hohmann-transfer.js'),
    'lagrange-points': () => import('./es/lagrange-points.js'),
    'listening-to-spacetime': () => import('./es/listening-to-spacetime.js'),
    'a-universe-of-stars': () => import('./es/a-universe-of-stars.js'),
    'lives-of-stars': () => import('./es/lives-of-stars.js'),
  },
};

/** @returns {boolean} True if this locale has lesson translations at all */
export const hasLessonTranslations = locale =>
  Object.hasOwn(TRANSLATIONS, locale);

// Keyed by `${locale}:${id}`, so switching language and switching back does not
// re-merge, and so a lesson open in Spanish and the same lesson opened again in
// Spanish are the same object.
/** Lessons already fetched, so a second open is instant and identity is stable. */
const loaded = new Map();
/** In-flight requests, so two rapid clicks share one network fetch. */
const pending = new Map();

/**
 * The locale lessons are fetched in.
 *
 * Initialised from what the application has already asked for rather than from
 * a hardcoded 'en'. This module is loaded on demand, so by the time it exists
 * the reader may have chosen a language several seconds ago; starting in
 * English and waiting to be told would serve one lesson in the wrong language
 * for every switch made before the first lesson was opened.
 */
let lessonLocale = requestedLessonLocale() || 'en';

/** The in-flight catalogue fetch, if there is one. See lessonCatalogueReady. */
let manifestLoad = null;

/**
 * Choose the language lessons are loaded in.
 *
 * Separate from the interface locale rather than reading it directly, so this
 * module keeps its promise of importing nothing: a lesson is content, and the
 * registry that serves it should not drag the i18n runtime into the chunk. The
 * application connects the two in js/main.js.
 *
 * @param {string} locale - A locale id
 */
export function setLessonLocale(locale) {
  lessonLocale = locale || 'en';
  // The catalogue follows the lessons. Fetched rather than bundled, so a
  // reader who never switches language never pays for the other one.
  const load = MANIFESTS[lessonLocale] || MANIFESTS.en;
  manifestLoad = load()
    .then(mod => {
      // A second change while this one was in flight wins.
      if (MANIFESTS[lessonLocale] === load) MANIFEST = mod.MANIFEST;
      return MANIFEST;
    })
    .catch(() => {
      MANIFEST = MANIFEST_EN;
      return MANIFEST;
    });
  return manifestLoad;
}

/** @returns {string} The language lessons are currently loaded in */
export const getLessonLocale = () => lessonLocale;

/**
 * Resolves when MANIFEST holds the catalogue for the current language.
 *
 * The card-level catalogue is one file per language and is fetched, so there
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
export function lessonCatalogueReady() {
  return manifestLoad || Promise.resolve(MANIFEST);
}

// And fetch the card-level catalogue for that language, now, without waiting to
// be told. The lesson bodies are already correct - `lessonLocale` above decides
// those - but the browser's cards come from a per-language manifest, and a
// reader who chose Spanish before this module existed should not see a grid of
// English titles until something else happens to call setLessonLocale.
if (lessonLocale !== 'en') setLessonLocale(lessonLocale);

// And from here on, a language change reaches this module directly rather than
// through another import. Registered last, so a change that arrives during
// module evaluation is not applied to a half-built registry.
registerLessonLocaleSink(setLessonLocale);

/** @returns {Array<string>} Every lesson id, in catalogue order */
export const investigationIds = () => MANIFEST.map(m => m.id);

/**
 * The card-level description of a lesson, without loading the lesson.
 * @param {string} id - Investigation id
 * @returns {Object|undefined} A manifest entry
 */
export const investigationMeta = id => MANIFEST.find(m => m.id === id);

/** @param {string} id - Investigation id @returns {boolean} True if it exists */
export const hasInvestigation = id => Object.hasOwn(LOADERS, id);

/**
 * A lesson already in memory, or undefined.
 *
 * For the places that want to use a lesson if it happens to be loaded and do
 * something cheaper otherwise. Never triggers a fetch.
 *
 * @param {string} id - Investigation id
 * @returns {Object|undefined} The investigation
 */
export const loadedInvestigation = (id, locale = lessonLocale) =>
  loaded.get(`${TRANSLATIONS[locale]?.[id] ? locale : 'en'}:${id}`);

/**
 * Load one lesson.
 *
 * Memoized on both sides: a resolved lesson is returned from the map, and a
 * lesson still arriving is returned as the same promise, so the double click a
 * student gives a card fetches once.
 *
 * @param {string} id - Investigation id
 * @returns {Promise<Object|undefined>} The investigation, or undefined if no
 *   such lesson exists
 */
export function loadInvestigation(id, locale = lessonLocale) {
  const loader = LOADERS[id];
  if (!loader) return Promise.resolve(undefined);

  const translate = TRANSLATIONS[locale]?.[id];
  const key = `${translate ? locale : 'en'}:${id}`;
  if (loaded.has(key)) return Promise.resolve(loaded.get(key));
  if (pending.has(key)) return pending.get(key);

  const p = Promise.all([
    loader(),
    // A translation that fails to arrive must not take the lesson down with
    // it: the English is the lesson, and the words are an improvement on it.
    translate
      ? translate().catch(err => {
          console.warn(`No ${locale} translation for ${id}:`, err);
          return null;
        })
      : null,
  ])
    .then(([mod, words]) => {
      const inv = words
        ? mergeTranslation(mod.default, words.default)
        : mod.default;
      loaded.set(key, inv);
      pending.delete(key);
      return inv;
    })
    .catch(err => {
      // Left out of `loaded` so a retry is possible: a lesson that failed to
      // arrive because the network dropped should not be permanently missing
      // for the rest of the session.
      pending.delete(key);
      throw err;
    });
  pending.set(key, p);
  return p;
}

/**
 * Every lesson, in catalogue order.
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
