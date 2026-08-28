// =============================================================================
// Theme — switches the design-token set and keeps the canvas in step
// -----------------------------------------------------------------------------
// The DOM is themed by CSS custom properties alone. The simulation canvas is
// painted by JS, so it reads the same tokens back out of the cascade rather
// than carrying its own copy of the palette.
// =============================================================================

const STORAGE_KEY = 'gravitas_theme';

export const THEMES = [
  { id: 'deep', label: 'Deep Space', hint: 'Default. Balanced dark blue.' },
  { id: 'midnight', label: 'Midnight', hint: 'Near-black, high contrast.' },
  {
    id: 'observatory',
    label: 'Observatory',
    hint: 'Red chrome — preserves night vision.',
  },
  { id: 'daylight', label: 'Daylight', hint: 'Light UI for bright rooms.' },
];

let current = 'deep';
const listeners = new Set();

/** @returns {string} The active theme id */
export const getTheme = () => current;

/**
 * Apply a theme.
 * @param {string} id - Theme id from THEMES
 */
export function setTheme(id) {
  const known = THEMES.some(t => t.id === id);
  current = known ? id : 'deep';

  // 'deep' is the bare :root definition, so it carries no attribute.
  if (current === 'deep')
    document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', current);

  document.documentElement.style.colorScheme =
    current === 'daylight' ? 'light' : 'dark';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', readToken('--surface-0') || '#07080f');

  try {
    window.localStorage?.setItem(STORAGE_KEY, current);
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
  // visualisation and a light chrome around a black starfield reads as broken.
  // Daylight stays available as an explicit choice for bright rooms.
  setTheme('deep');
}
