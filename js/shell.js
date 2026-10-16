// The shell's behaviour; its markup is in the page (tools/shell.mjs), and the
// navigation works without this. Short on purpose: every route counts it.

const root = document.documentElement;
const store = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  return null;
};

/** Apply a theme as js/theme.js does, without its catalog. */
export function applyTheme(id) {
  if (id === 'midnight') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);
  root.style.colorScheme = id === 'daylight' ? 'light' : 'dark';
}

/**
 * Wire the shell up.
 * @param {object} [o]
 * @param {(lang: string) => void} [o.onLanguage] - Re-translate in place;
 *   without it the page reloads, and reads the stored choice as it opens
 * @param {(id: string) => void} [o.onTheme] - Apply a theme; the default
 *   sets the attribute and remembers it
 */
export function mountShell({ onLanguage, onTheme } = {}) {
  const head = document.querySelector('.gs-shell');
  if (!head) return;
  head.classList.add('gs-js');
  const groups = [...head.querySelectorAll('details')];
  const toggle = head.querySelector('.gs-toggle');
  const controls = head.querySelector('.gs-controls');
  toggle.hidden = controls.hidden = false;

  for (const d of groups)
    d.addEventListener('toggle', () => {
      if (d.open) for (const o of groups) if (o !== d) o.open = false;
    });
  head.addEventListener('keydown', e => {
    const d = groups.find(o => o.open);
    if (e.key !== 'Escape' || !d) return;
    d.open = false;
    d.querySelector('summary').focus();
  });
  document.addEventListener('click', e => {
    if (!head.contains(e.target)) for (const d of groups) d.open = false;
  });
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    head.classList.toggle('is-open', open);
  });

  const lang = head.querySelector('[data-gs-lang]');
  // The stored choice, which an English-only page cannot follow.
  const want = store('gravitas_locale') || root.lang;
  lang.value = want.startsWith('es') ? 'es' : 'en';
  lang.addEventListener('change', () => {
    store('gravitas_locale', lang.value);
    if (!onLanguage) return location.reload();
    root.lang = lang.value;
    onLanguage(lang.value);
  });

  const theme = head.querySelector('[data-gs-theme]');
  const names = () => {
    for (const o of theme.options) {
      o.dataset.en ??= o.textContent;
      o.textContent = root.lang.startsWith('es') ? o.dataset.es : o.dataset.en;
    }
  };
  names();
  new MutationObserver(names).observe(root, { attributeFilter: ['lang'] });
  const saved = store('gravitas_theme');
  theme.value = saved || 'midnight';
  if (!theme.value) theme.value = 'midnight';
  if (!onTheme) applyTheme(theme.value);
  theme.addEventListener('change', () => {
    if (onTheme) return onTheme(theme.value);
    store('gravitas_theme', theme.value);
    applyTheme(theme.value);
  });
  window.addEventListener('gravitasThemeChanged', e => {
    theme.value = e.detail.theme;
  });
}
