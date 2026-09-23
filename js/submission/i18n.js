// =============================================================================
// The submission review page's translator
// -----------------------------------------------------------------------------
// The same shape as js/teaching/i18n.js, for the same reason: this is a small
// document page, and js/i18n/index.js would bring the application's whole
// catalog with it. It shares what a reader can notice - the `gravitas_locale`
// storage key, so a language chosen in the simulation is already chosen here,
// and the `{name}` placeholders - and reads only its own catalog pair.
//
// One difference, on purpose: the function is `t`, not `tr`. The i18n audit
// scans every `t('...')` under js/ and checks the id exists in the merged
// catalog, which includes this page's fragment, so an id typed wrong here
// fails `npm run i18n:check` instead of rendering as itself.
// =============================================================================

import { EN_SUBMISSIONS } from '../i18n/en.submissions.js';
import { ES_SUBMISSIONS } from '../i18n/es.submissions.js';

const STORAGE_KEY = 'gravitas_locale';

/** The languages this page is written in, in the order the switch offers them. */
export const LANGUAGES = Object.freeze([
  { id: 'en', endonym: 'English' },
  { id: 'es', endonym: 'Español' },
]);

const CATALOGS = { en: EN_SUBMISSIONS, es: ES_SUBMISSIONS };
const DEFAULT = 'en';
let current = DEFAULT;

/** @returns {string} The language the page is rendering in */
export const language = () => current;

/**
 * The language to open in: a stored choice, then the browser's, then English.
 * @returns {string} A language id
 */
export function preferred() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (saved && Object.hasOwn(CATALOGS, saved)) return saved;
  } catch {
    /* storage unavailable; the default is correct */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  const base = String(nav).toLowerCase().split('-')[0];
  return Object.hasOwn(CATALOGS, base) ? base : DEFAULT;
}

/**
 * Change the language, and remember it for the application too.
 * @param {string} id - A language id
 * @returns {string} The language actually in force
 */
export function setLanguage(id) {
  current = Object.hasOwn(CATALOGS, id) ? id : DEFAULT;
  try {
    window.localStorage?.setItem(STORAGE_KEY, current);
  } catch {
    /* the page still works; the choice just will not survive a reload */
  }
  document.documentElement.setAttribute('lang', current);
  return current;
}

/**
 * Translate. A missing string falls back to English, then to its own id.
 * @param {string} id - A `sub.` message id
 * @param {Object} [vars] - Placeholder values
 * @returns {string} The message
 */
export function t(id, vars) {
  const entry = CATALOGS[current]?.[id] ?? CATALOGS[DEFAULT][id];
  if (entry === undefined) {
    console.warn(`[submissions] no message for "${id}"`);
    return id;
  }
  if (!vars) return entry;
  return entry.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : whole
  );
}

/**
 * Whether a message exists, in any language this page has.
 * @param {string} id - A `sub.` message id
 * @returns {boolean} Whether it does
 */
export const has = id => Object.hasOwn(CATALOGS[DEFAULT], id);

/**
 * Translate every element under a root that asks: `data-i18n` for the text,
 * `data-i18n-aria-label` and `data-i18n-placeholder` for those attributes.
 * @param {ParentNode} [root] - Where to look
 */
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const attr of ['aria-label', 'placeholder']) {
    const key = `data-i18n-${attr}`;
    for (const el of root.querySelectorAll(`[${key}]`)) {
      el.setAttribute(attr, t(el.getAttribute(key)));
    }
  }
}
