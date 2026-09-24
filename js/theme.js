// =============================================================================
// Theme: switches the design-token set and keeps the canvas in step
// -----------------------------------------------------------------------------
// The DOM is themed by CSS custom properties alone. The simulation canvas is
// painted by JS, so it reads the same tokens back out of the cascade rather
// than carrying its own copy of the palette.
// =============================================================================

import { t } from './i18n/index.js';

const STORAGE_KEY = 'gravitas_theme';

/**
 * The themes, in the order the picker lists them.
 *
 * Ids only. The names and the one-line descriptions are user-facing text and
 * live in the message catalog with the rest of it; themeLabel() and
 * themeHint() below read them back, so a Spanish reader gets "Luz de día"
 * without this registry knowing that Spanish exists.
 */
export const THEMES = [
  { id: 'midnight' },
  { id: 'deep' },
  { id: 'observatory' },
  { id: 'daylight' },
];

/**
 * A theme's display name.
 * @param {string} id - Theme id
 * @returns {string} The name, in the reader's language
 */
export const themeLabel = id => t(`theme.${id}.label`);

/**
 * A theme's one-line description.
 * @param {string} id - Theme id
 * @returns {string} The description, in the reader's language
 */
export const themeHint = id => t(`theme.${id}.hint`);

let current = 'midnight';
/** A theme an embed has fixed for this page, or null. */
let fixed = null;
const listeners = new Set();

/** @returns {string} The active theme id */
export const getTheme = () => current;

/**
 * Apply a theme.
 * @param {string} id - Theme id from THEMES
 */
export function setTheme(id) {
  if (fixed) id = fixed;
  const known = THEMES.some(t => t.id === id);
  current = known ? id : 'midnight';

  // The default theme is the bare :root definition, so it carries no attribute.
  if (current === 'midnight')
    document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', current);

  document.documentElement.style.colorScheme =
    current === 'daylight' ? 'light' : 'dark';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', readToken('--surface-0') || '#07080f');

  try {
    if (!fixed) window.localStorage?.setItem(STORAGE_KEY, current);
  } catch {
    /* storage unavailable */
  }

  listeners.forEach(fn => {
    try {
      fn(current);
    } catch {
      /* a bad listener must not break theme switching */
    }
  });
  window.dispatchEvent(
    new CustomEvent('gravitasThemeChanged', { detail: { theme: current } })
  );
}

/**
 * Hold this page to one theme, and never write it to storage.
 *
 * For an embed that names its theme (js/embedOptions.js): the figure is in
 * someone else's page, and neither that page nor the reader's own choice in
 * Gravitas should move it - nor should it move theirs. The builder's preview
 * is on Gravitas's own origin, so a theme remembered here would have become
 * the author's.
 *
 * @param {string} id - Theme id from THEMES; anything else is ignored
 */
export function fixTheme(id) {
  if (!THEMES.some(t => t.id === id)) return;
  fixed = id;
  setTheme(id);
}

/** Advance to the next theme in the list. @returns {string} New theme id */
export function cycleTheme() {
  const i = THEMES.findIndex(t => t.id === current);
  const next = THEMES[(i + 1) % THEMES.length];
  setTheme(next.id);
  return next.id;
}

/**
 * Read a design token from the cascade.
 * @param {string} name - Custom property name, e.g. '--accent'
 * @returns {string} Resolved value, trimmed
 */
export function readToken(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Subscribe to theme changes.
 * @param {Function} fn - Called with the new theme id
 * @returns {Function} Unsubscribe
 */
export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Restore the saved theme, or follow the OS preference on first visit. */
export function initTheme() {
  if (fixed) {
    setTheme(fixed);
    return;
  }
  let saved = null;
  try {
    saved = window.localStorage?.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (saved && THEMES.some(t => t.id === saved)) {
    setTheme(saved);
    return;
  }
  // Deliberately not following prefers-color-scheme: this is a dark-first
  // visualization and a light chrome around a black starfield reads as broken.
  // Daylight stays available as an explicit choice for bright rooms.
  setTheme('midnight');
}
