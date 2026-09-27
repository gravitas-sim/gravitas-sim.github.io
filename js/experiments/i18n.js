// =============================================================================
// The experiment runner's translator
// -----------------------------------------------------------------------------
// The same shape as js/figure/i18n.js, for the same reason: /experiments/ is a
// small document page, and js/i18n/index.js would bring the application's
// whole catalog with it. It shares the `gravitas_locale` storage key, so a
// language chosen in the simulation is already chosen here, and reads only its
// own catalog pair. The function is `t`, so `npm run i18n:check` audits its
// ids. Static text carries `data-i18n`, `data-i18n-placeholder` and
// `data-i18n-aria-label`; translatePage() fills them.
//
// English is in the page; Spanish is fetched when it is chosen (setLanguage
// is async), so a reader in one language does not download the other.
// =============================================================================

import { EN_EXPERIMENTS } from '../i18n/en.experiments.js';

const LOAD = {
  es: () => import('../i18n/es.experiments.js').then(m => m.ES_EXPERIMENTS),
};
const loaded = new Set(['en']);

const STORAGE_KEY = 'gravitas_locale';

/** The languages this page is written in, in the order the switch offers them. */
export const LANGUAGES = Object.freeze([
  { id: 'en', endonym: 'English' },
  { id: 'es', endonym: 'Español' },
]);

const CATALOGS = { en: EN_EXPERIMENTS };
const known = id => LANGUAGES.some(l => l.id === id);
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
    if (saved && known(saved)) return saved;
  } catch {
    /* storage unavailable; the default is correct */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  const base = String(nav).toLowerCase().split('-')[0];
  return known(base) ? base : DEFAULT;
}

/**
 * Change the language, and remember it for the application too. A catalog
 * the page does not hold yet is fetched first; one that cannot be fetched
 * leaves the page in English.
 * @param {string} id - A language id
 * @returns {Promise<string>} The language actually in force
 */
export async function setLanguage(id) {
  let want = known(id) ? id : DEFAULT;
  if (!loaded.has(want)) {
    try {
      // Strings a lazy panel added first stay, on top of the catalog.
      CATALOGS[want] = { ...(await LOAD[want]()), ...CATALOGS[want] };
      loaded.add(want);
    } catch {
      want = DEFAULT;
    }
  }
  current = want;
  try {
    window.localStorage?.setItem(STORAGE_KEY, current);
  } catch {
    /* the page still works; the choice just will not survive a reload */
  }
  document.documentElement.setAttribute('lang', current);
  return current;
}

/**
 * Add a lazy panel's strings to the catalogs (js/experiments/analysisPanel.js
 * brings its own when it is opened, so the page does not carry them).
 * @param {{en: Object, es: Object}} more
 */
export function addMessages(more) {
  for (const [id, entries] of Object.entries(more))
    if (known(id)) CATALOGS[id] = { ...CATALOGS[id], ...entries };
}

/**
 * Translate. A missing string falls back to English, then to its own id.
 * @param {string} id - An `exp.` message id
 * @param {Object} [vars] - Placeholder values
 * @returns {string} The message
 */
export function t(id, vars) {
  const entry = CATALOGS[current]?.[id] ?? CATALOGS[DEFAULT][id];
  if (entry === undefined) {
    console.warn(`[experiments] no message for "${id}"`);
    return id;
  }
  if (!vars) return entry;
  return entry.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : whole
  );
}

/** Fill every element that names a message, in the current language. */
export function translatePage(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  }
  for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  }
  document.title = t('exp.doc.title');
}
