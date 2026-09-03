// =============================================================================
// Messages: one catalogue, one lookup, one place a language is chosen
// -----------------------------------------------------------------------------
// Small on purpose. The application has about nine hundred user-facing strings,
// which is enough to need a catalogue and nowhere near enough to need a
// framework: a flat map per locale, a lookup with a fallback, and a DOM sweep
// for the static markup covers all of it in a couple of hundred lines.
//
// Three rules the rest of the codebase relies on:
//
//   English is the source of truth. js/i18n/en.js holds every string exactly
//   once; nothing else in the application may carry a second copy of one. A
//   locale file is a set of overrides against it and is allowed to be partial.
//
//   A missing message falls back to English, never to blank and never to a
//   half-sentence. The id itself is the last resort, which is loud enough to be
//   noticed in review and quiet enough not to break a layout.
//
//   The investigations are deliberately *absent* from this catalogue rather
//   than present and untranslated. A lesson is a piece of continuous writing
//   and a half-translated one is worse than an English one, so the boundary is
//   structural: a locale's lessons are whole files under
//   js/data/investigations/<locale>/, merged over the English lesson by
//   mergeTranslation(), and carry words only - never a scenario name, a seed,
//   a widget id or a numeric answer. LOCALES[].coverage says in one sentence,
//   in that language, how far a translation reaches.
//
// This module touches no DOM beyond localStorage and the custom event it fires.
// The markup sweep lives in js/i18n/dom.js.
// =============================================================================

import { EN } from './en.js';

const STORAGE_KEY = 'gravitas_locale';

/**
 * The locales offered, in the order the picker lists them.
 *
 * English is bundled; it is the fallback and every lookup may need it
 * synchronously. Every other locale is fetched the first time somebody chooses
 * it, so an English reader never downloads a catalogue they cannot read - the
 * Spanish one is 57KB of source, which is a sixth of the start-up bundle.
 *
 * `coverage` is a plain sentence rather than a message id, because the picker
 * has to show it for a locale that has not been loaded yet, and it is written
 * in that locale because it is addressed to the person who reads it.
 */
export const LOCALES = [
  {
    id: 'en',
    label: 'English',
    endonym: 'English',
    load: null,
    coverage: null,
  },
  {
    id: 'es',
    label: 'Spanish',
    endonym: 'Español',
    load: () => import('./es.js').then(m => m.ES),
    coverage: 'Interfaz e investigaciones en español.',
  },
];

const DEFAULT_LOCALE = 'en';

/** Catalogues that have actually arrived. English is always here. */
const CATALOGUES = { [DEFAULT_LOCALE]: EN };

/** In-flight loads, so choosing a language twice fetches it once. */
const pending = new Map();

/**
 * Make sure a locale's catalogue is in memory.
 * @param {string} id - Locale id
 * @returns {Promise<Object>} The catalogue, or English if it cannot be had
 */
export async function loadLocale(id) {
  if (CATALOGUES[id]) return CATALOGUES[id];
  const entry = LOCALES.find(l => l.id === id);
  if (!entry?.load) return EN;
  if (!pending.has(id)) {
    pending.set(
      id,
      entry
        .load()
        .then(catalogue => {
          CATALOGUES[id] = catalogue;
          return catalogue;
        })
        .catch(err => {
          // A locale that will not load is not a broken application: every
          // lookup falls through to English, which is exactly what happens.
          console.warn(`[i18n] could not load "${id}":`, err);
          return EN;
        })
    );
  }
  return pending.get(id);
}

/** @returns {boolean} True when a locale's catalogue is in memory */
export const isLocaleLoaded = id => Boolean(CATALOGUES[id]);

let current = DEFAULT_LOCALE;
const listeners = new Set();

/** @returns {string} The active locale id */
export const getLocale = () => current;

/** @returns {Object} The active locale's descriptor */
export const localeInfo = (id = current) =>
  LOCALES.find(l => l.id === id) || LOCALES[0];

/** @returns {boolean} True when `id` is a locale this build ships */
export const isSupportedLocale = id => LOCALES.some(l => l.id === id);

// --- Lookup -------------------------------------------------------------------

// Ids asked for and not found, so a build can be checked without drowning the
// console in one warning per frame for a string in a render loop.
const missing = new Set();

/** @returns {Array<string>} Ids that fell through to their own name */
export const missingMessages = () => [...missing];

/**
 * Fill `{name}` placeholders.
 *
 * Deliberately not a template engine. A placeholder is a bare name in braces;
 * anything else in the string is left exactly as the translator wrote it,
 * including the braces, so a stray brace in prose cannot swallow the sentence.
 *
 * @param {string} text - The message
 * @param {Object} vars - Values by placeholder name
 * @returns {string} The filled message
 */
function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : whole
  );
}

/**
 * Choose between the forms of a plural message.
 *
 * A message that varies with a count is written as `{ one, other }` - and as
 * `{ zero, one, few, many, other }` where a locale needs them. Intl.PluralRules
 * picks the category for the active locale, so Spanish and English are selected
 * by their own grammar rather than by an English `n === 1` test written once
 * and inherited everywhere.
 *
 * @param {Object} forms - The message's plural forms
 * @param {number} n - The count
 * @param {string} locale - Locale id
 * @returns {string} The chosen form
 */
function selectPlural(forms, n, locale) {
  let category = 'other';
  try {
    category = new Intl.PluralRules(locale).select(n);
  } catch {
    category = n === 1 ? 'one' : 'other';
  }
  return forms[category] ?? forms.other ?? forms.one ?? '';
}

/**
 * Look a message up in a catalogue, without falling back.
 * @param {Object} catalogue - A locale's map
 * @param {string} id - Message id
 * @returns {string|Object|undefined} The raw entry
 */
const raw = (catalogue, id) =>
  catalogue && Object.prototype.hasOwnProperty.call(catalogue, id)
    ? catalogue[id]
    : undefined;

/**
 * Translate.
 *
 * @param {string} id - Message id
 * @param {Object} [vars] - Placeholder values; `n` also selects a plural form
 * @returns {string} The message in the active locale, or in English, or the id
 */
export function t(id, vars) {
  let entry = raw(CATALOGUES[current], id);
  if (entry === undefined && current !== DEFAULT_LOCALE) {
    entry = raw(CATALOGUES[DEFAULT_LOCALE], id);
  }
  if (entry === undefined) {
    if (!missing.has(id)) {
      missing.add(id);
      // Once per id per session. A string in a render loop would otherwise
      // produce sixty warnings a second and hide every other message.
      console.warn(`[i18n] no message for "${id}"`);
    }
    return id;
  }
  const text =
    typeof entry === 'string'
      ? entry
      : selectPlural(entry, Number(vars?.n ?? 0), current);
  return interpolate(text, vars);
}

/**
 * True when the active locale carries its own text for an id.
 *
 * The language picker uses this to describe its own coverage honestly rather
 * than from a hand-maintained percentage that would drift.
 *
 * @param {string} id - Message id
 * @returns {boolean} True if the active locale has it
 */
export const hasMessage = id => raw(CATALOGUES[current], id) !== undefined;

/**
 * How much of the catalogue a locale actually carries.
 * @param {string} [id] - Locale id
 * @returns {{translated: number, total: number}} Counts against English
 */
export function coverageOf(id = current) {
  const total = Object.keys(CATALOGUES[DEFAULT_LOCALE]).length;
  // A locale that has not been fetched reports nothing translated, which is
  // true of what is in memory and is only ever asked after a locale is active.
  const cat = CATALOGUES[id] || {};
  let translated = 0;
  for (const key of Object.keys(CATALOGUES[DEFAULT_LOCALE])) {
    if (Object.prototype.hasOwnProperty.call(cat, key)) translated++;
  }
  return { translated, total };
}

// --- Numbers and lists --------------------------------------------------------

/**
 * A number written the way the active locale writes numbers.
 *
 * Separate from js/format.js, which is about significant figures and units in a
 * scientific readout and is deliberately locale-independent: a measurement in
 * an exported dataset must not change its decimal separator with the interface
 * language. This is for counts in prose - "48 scenarios" - where the grouping
 * separator should follow the language.
 *
 * @param {number} n - The value
 * @returns {string} Localized digits
 */
export function num(n) {
  try {
    return new Intl.NumberFormat(current).format(n);
  } catch {
    return String(n);
  }
}

// --- Choosing a locale --------------------------------------------------------

/**
 * Switch language and repaint everything that depends on it.
 *
 * Changing locale is a presentation change and nothing else: it must never
 * touch the simulation, the scenario, the seed or the share state. Every
 * listener here redraws text; none of them rebuilds a world.
 *
 * The catalogue is fetched first when it is not already in memory, so the
 * interface never repaints into a half-loaded language. Callers that do not
 * await simply see the change land a tick later.
 *
 * @param {string} id - Locale id
 * @param {Object} [opts]
 * @param {boolean} [opts.persist] - Write the choice to storage
 * @returns {Promise<string>} The locale actually applied
 */
export async function setLocale(id, { persist = true } = {}) {
  const next = isSupportedLocale(id) ? id : DEFAULT_LOCALE;
  if (!CATALOGUES[next]) await loadLocale(next);
  const changed = next !== current;
  current = next;

  document.documentElement.setAttribute('lang', current);

  if (persist) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, current);
    } catch {
      /* storage unavailable (private mode, sandboxed iframe) */
    }
  }

  listeners.forEach(fn => {
    try {
      fn(current);
    } catch (err) {
      // One bad listener must not leave half the interface in the old language.
      console.warn('[i18n] listener failed:', err);
    }
  });
  window.dispatchEvent(
    new CustomEvent('gravitasLocaleChanged', {
      detail: { locale: current, changed },
    })
  );
  return current;
}

/**
 * Subscribe to language changes.
 * @param {Function} fn - Called with the new locale id
 * @returns {Function} Unsubscribe
 */
export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The locale to open in, before any listener exists.
 *
 * A stored choice wins. Failing that the browser's language is honoured only
 * when this build actually ships it, which keeps a French or Japanese visitor
 * in English rather than in a language they did not ask for and cannot read
 * any better. Region subtags are ignored: es-MX and es-419 are both `es` here.
 *
 * @returns {string} A locale id
 */
export function preferredLocale() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (saved && isSupportedLocale(saved)) return saved;
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  const base = String(nav).toLowerCase().split('-')[0];
  return isSupportedLocale(base) && base !== DEFAULT_LOCALE
    ? base
    : DEFAULT_LOCALE;
}

/**
 * Restore the saved or preferred language. Call once, before anything paints.
 *
 * English applies synchronously, so the first paint is never in the id-name
 * fallback. A stored non-English choice is fetched and applied a moment later,
 * behind the splash, which is up for three and a half seconds.
 *
 * @returns {Promise<string>} The locale finally applied
 */
export function initI18n() {
  const wanted = preferredLocale();
  if (wanted === DEFAULT_LOCALE || CATALOGUES[wanted]) {
    return setLocale(wanted, { persist: false });
  }
  document.documentElement.setAttribute('lang', wanted);
  return setLocale(wanted, { persist: false });
}
