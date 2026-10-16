// =============================================================================
// The Library page's translator
// -----------------------------------------------------------------------------
// The shape of js/catalog/i18n.js, for the same reason: /library/ is a small
// page, and js/i18n/index.js would bring the application's whole catalog with
// it. It shares the `gravitas_locale` key, so a language chosen anywhere in
// Gravitas is already chosen here. The function is `t`, so
// `npm run i18n:check` audits its ids.
// =============================================================================

import { EN_LIBRARY } from '../i18n/en.library.js';

const STORAGE_KEY = 'gravitas_locale';
// English is the page's own; Spanish loads when a reader arrives with it or
// chooses it (loadLanguage), so an English reader never downloads it.
const CATALOGS = { en: EN_LIBRARY, es: {} };
const LOADERS = {
  es: () => import('../i18n/es.library.js').then(m => m.ES_LIBRARY),
};
const loaded = new Set(['en']);

/** Load a language's catalog, if it is not loaded yet. */
export async function loadLanguage(id) {
  if (loaded.has(id) || !LOADERS[id]) return;
  CATALOGS[id] = await LOADERS[id]();
  loaded.add(id);
}
const DEFAULT = 'en';
let current = DEFAULT;

/** @returns {string} The language the page is rendering in */
export const language = () => current;

/** The stored language, then the browser's, then English. */
export function preferred() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (saved && Object.hasOwn(CATALOGS, saved)) return saved;
  } catch {
    /* storage unavailable; the default is correct */
  }
  const base = String(navigator.language || '')
    .toLowerCase()
    .split('-')[0];
  return Object.hasOwn(CATALOGS, base) ? base : DEFAULT;
}

/** Render in a language; the shell has already stored the choice. */
export function setLanguage(id) {
  current = Object.hasOwn(CATALOGS, id) ? id : DEFAULT;
  document.documentElement.setAttribute('lang', current);
  return current;
}

/**
 * Translate. A missing string falls back to English, then to its own id.
 * @param {string} id - A `lib.` message id
 * @param {Object} [vars] - Placeholder values
 * @returns {string} The message
 */
export function t(id, vars) {
  const entry = CATALOGS[current]?.[id] ?? CATALOGS[DEFAULT][id] ?? id;
  return vars
    ? entry.replace(/\{(\w+)\}/g, (whole, name) =>
        Object.hasOwn(vars, name) ? String(vars[name]) : whole
      )
    : entry;
}

/** A `{en, es}` pair from library.json, in the page's language. */
export const pick = words => words?.[current] || words?.en || '';

/** Fill every element that names a message, in the current language. */
export function translatePage(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]'))
    el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-placeholder]'))
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  for (const el of root.querySelectorAll('[data-i18n-aria-label]'))
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  document.title = t('lib.doc.title');
}
