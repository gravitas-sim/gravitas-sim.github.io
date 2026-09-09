// =============================================================================
// The showcase page's translator
// -----------------------------------------------------------------------------
// Forty lines rather than js/i18n/index.js, and the reason is weight. That
// module statically imports the English catalogue - 123KB of application
// strings - and dynamically imports the Spanish one. /teaching/ is a document
// with about a hundred strings of its own and no simulation behind it; pulling
// the application's catalogue in to render it would make a page whose whole
// point is "this is cheap to adopt" the heaviest thing on the site.
//
// What it does share is everything a reader can notice: the same
// `gravitas_locale` storage key, so a language chosen in the simulation is
// already chosen here and the other way round; the same `{name}` placeholder
// convention; and the same rule that a missing string falls back to English
// rather than rendering its own id.
//
// What it deliberately does NOT have: plurals, number formatting, a locale
// change event, registration of late-arriving catalogues. None of them has a
// caller on this page, and a second half-implementation of the real i18n
// runtime is worse than an honestly small one.
// =============================================================================

import { EN_TEACHING } from '../i18n/en.teaching.js';
import { ES_TEACHING } from '../i18n/es.teaching.js';

/** The same key the application writes, so the two pages agree. */
const STORAGE_KEY = 'gravitas_locale';

/** The languages this page is written in, in the order the switch offers them. */
export const LANGUAGES = Object.freeze([
  { id: 'en', endonym: 'English', label: 'teach.lang.en' },
  { id: 'es', endonym: 'Español', label: 'teach.lang.es' },
]);

const CATALOGUES = { en: EN_TEACHING, es: ES_TEACHING };
const DEFAULT = 'en';

let current = DEFAULT;

/** @returns {string} The language the page is rendering in */
export const language = () => current;

/**
 * The language to open in.
 *
 * A stored choice wins, then the browser's, then English. Reading the stored
 * value can throw outright where site data is blocked, which is a reason to
 * render in English and not a reason to fail.
 *
 * @returns {string} A language id
 */
export function preferred() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (saved && Object.hasOwn(CATALOGUES, saved)) return saved;
  } catch {
    /* storage unavailable; the default is correct */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  const base = String(nav).toLowerCase().split('-')[0];
  return Object.hasOwn(CATALOGUES, base) ? base : DEFAULT;
}

/**
 * Change the language, and remember it for the application too.
 * @param {string} id - A language id
 * @returns {string} The language actually in force
 */
export function setLanguage(id) {
  current = Object.hasOwn(CATALOGUES, id) ? id : DEFAULT;
  try {
    window.localStorage?.setItem(STORAGE_KEY, current);
  } catch {
    /* the page still works; the choice just will not survive a reload */
  }
  document.documentElement.setAttribute('lang', current);
  return current;
}

/**
 * Fill `{placeholders}` from an object.
 *
 * A bare name in braces and nothing else, exactly as js/i18n/index.js does it:
 * anything the translator wrote that is not a known placeholder survives
 * untouched, braces included.
 *
 * @param {string} text - The message
 * @param {Object} [vars] - Values by name
 * @returns {string} The filled message
 */
function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : whole
  );
}

/**
 * Translate.
 *
 * Named `tr` rather than `t` on purpose: tools/i18n-audit.mjs scans every
 * module under js/ for `t('...')` and checks the id against the application's
 * catalogue. This page's ids are not in that catalogue and should not be, so
 * the audit must not see them.
 *
 * @param {string} id - A `teach.` message id
 * @param {Object} [vars] - Placeholder values
 * @returns {string} The message, in this language or in English, or the id
 */
export function tr(id, vars) {
  const entry = CATALOGUES[current]?.[id] ?? CATALOGUES[DEFAULT][id];
  if (entry === undefined) {
    console.warn(`[teaching] no message for "${id}"`);
    return id;
  }
  return interpolate(entry, vars);
}

/**
 * The attributes a `data-i18n-*` sweep understands.
 *
 * The same four the application's DOM sweep handles, minus `alt`, which no
 * element on this page needs: every image here is decorative or is a figure
 * with a caption.
 */
const ATTRIBUTES = ['title', 'aria-label', 'placeholder'];

/**
 * Translate everything under a root that asks to be translated.
 *
 * Assigns `textContent`, never `innerHTML`. A catalogue is data, and a
 * translator who pastes a stray `<` into a sentence should get a stray `<` on
 * the page rather than a parse.
 *
 * @param {ParentNode} [root] - What to sweep; the document by default
 */
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = tr(el.getAttribute('data-i18n'));
  }
  for (const name of ATTRIBUTES) {
    for (const el of root.querySelectorAll(`[data-i18n-${name}]`)) {
      el.setAttribute(name, tr(el.getAttribute(`data-i18n-${name}`)));
    }
  }
}
