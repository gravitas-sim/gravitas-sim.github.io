// =============================================================================
// The 3-D lab's translator (/3d/)
// -----------------------------------------------------------------------------
// The same shape as ../i18n.js (the diagnostics page's), with the lab's own
// catalog pair, so neither page downloads the other's words. It shares the
// `gravitas_locale` key, and the function is `t`, so `npm run i18n:check`
// audits its ids. English is the page's own; Spanish loads when a reader
// arrives with it or chooses it (loadLanguage), as the Observatory's does, so
// an English reader never downloads it. Until it loads, t() falls back to
// English.
// =============================================================================

import { EN_LAB3DLAB } from '../../i18n/en.lab3dLab.js';

const STORAGE_KEY = 'gravitas_locale';

const CATALOGS = { en: EN_LAB3DLAB, es: {} };
const LOADERS = {
  es: () => import('../../i18n/es.lab3dLab.js').then(m => m.ES_LAB3DLAB),
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

/** A stored choice, then the browser's language, then English. */
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

/** Change the language, and remember it for the application too. */
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

/** Translate. A missing string falls back to English, then to its own id. */
export function t(id, vars) {
  const entry = CATALOGS[current]?.[id] ?? CATALOGS[DEFAULT][id];
  if (entry === undefined) return id;
  if (!vars) return entry;
  return entry.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : whole
  );
}

/** Fill every element that names a message, in the current language. */
export function translatePage(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]'))
    el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-aria-label]'))
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
}
