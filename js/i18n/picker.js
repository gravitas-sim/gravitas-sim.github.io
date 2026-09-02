// =============================================================================
// The language picker
// -----------------------------------------------------------------------------
// Built from the LOCALES registry rather than written into the markup, for the
// same reason the theme dock is: the list cannot then drift from what the build
// actually ships.
//
// Two items, each a language code and the language's own name for itself:
// "ES  Español", not "Spanish", since the person looking for it is looking for
// the word they use for their own language.
//
// Nothing else. There used to be a line of coverage text under each option,
// because the investigations were English-only and a student who chose Español
// and then met an English lesson had to be told that this was the state of the
// translation rather than a page that had failed to load. The lessons are
// translated now, so the sentence describes nothing, and a menu of two
// languages does not need three lines to say so.
// =============================================================================

import { LOCALES, getLocale, setLocale, localeInfo, t } from './index.js';

/**
 * Wire the picker. Safe to call once, from init.
 * @returns {boolean} True if the picker exists in this document
 */
export function initLocalePicker() {
  const btn = document.getElementById('localeButton');
  const menu = document.getElementById('localeMenu');
  const name = document.getElementById('localeButtonName');
  const code = document.getElementById('localeButtonCode');
  if (!btn || !menu) return false;

  const render = () => {
    menu.innerHTML = LOCALES.map(l => {
      const active = l.id === getLocale();
      return `<button type="button" role="menuitemradio"
                aria-checked="${active}"
                class="theme-menu-item locale-menu-item is-compact${active ? ' is-active' : ''}"
                data-locale-option="${l.id}">
                <span class="locale-menu-code" aria-hidden="true">${l.id.toUpperCase()}</span>
                <span class="theme-menu-label">${l.endonym}</span>
              </button>`;
    }).join('');
    if (name) name.textContent = localeInfo().endonym;
    // The badge carries the code rather than a generic glyph, so the current
    // language is readable without opening the menu and matches the badge on
    // the option that set it.
    if (code) code.textContent = getLocale().toUpperCase();
    btn.setAttribute(
      'aria-label',
      `${t('locale.picker.label')}: ${localeInfo().endonym}`
    );
  };

  const close = ({ refocus = false } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  };
  const open = () => {
    render();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('.is-active, .locale-menu-item')?.focus();
  };

  btn.addEventListener('click', () => (menu.hidden ? open() : close()));
  menu.addEventListener('click', e => {
    const item = e.target.closest('[data-locale-option]');
    if (!item) return;
    setLocale(item.dataset.localeOption);
    close({ refocus: true });
  });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close({ refocus: true });
    }
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !e.target.closest('.locale-dock')) close();
  });
  window.addEventListener('gravitasEscape', () => close({ refocus: true }));
  window.addEventListener('gravitasLocaleChanged', render);

  render();
  return true;
}
