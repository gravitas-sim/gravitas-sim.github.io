// =============================================================================
// Translating the static markup
// -----------------------------------------------------------------------------
// index.html carries about a hundred and eighty user-facing strings in the
// document itself: rail labels, dialog headings, and a great many `title`
// tooltips that are the application's main form of inline help.
//
// Rewriting all of that into JavaScript would move a lot of copy out of the
// place a reviewer can read it and into template literals. Instead each element
// names the message it should carry:
//
//   <span data-i18n="rail.group.tools">Tools</span>
//   <button data-i18n-title="rail.action.screenshot.hint" title="Take a ...">
//   <div data-i18n-aria-label="gallery.dialog.label" aria-label="Scenarios">
//
// The English text stays in the markup as the rendered default, so the page is
// readable with JavaScript disabled and a reviewer can see what an element says
// without a lookup. On boot, and on every language change, the sweep below
// overwrites it from the catalogue - which is also what catches an id that has
// drifted away from the markup, because the element visibly changes to the id.
// =============================================================================

import { t, onLocaleChange } from './index.js';

/** Attribute name -> the element property or attribute it sets. */
const ATTRS = [
  ['data-i18n-title', 'title'],
  ['data-i18n-aria-label', 'aria-label'],
  ['data-i18n-placeholder', 'placeholder'],
  ['data-i18n-alt', 'alt'],
];

/**
 * Apply the catalogue to a subtree.
 *
 * Idempotent, and safe to call on markup that has already been translated: the
 * message id is the source, never the current contents, so re-running it in a
 * second language does not translate a translation.
 *
 * @param {ParentNode} [root] - Subtree to sweep; defaults to the document
 */
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const id = el.getAttribute('data-i18n');
    if (!id) continue;
    // textContent, not innerHTML: a catalogue is data, and a translator must
    // not be able to inject markup into the page by writing a tag in a message.
    // The handful of strings that genuinely need emphasis carry it in the
    // markup around a translated span instead.
    el.textContent = t(id);
  }
  for (const [dataAttr, target] of ATTRS) {
    for (const el of root.querySelectorAll(`[${dataAttr}]`)) {
      const id = el.getAttribute(dataAttr);
      if (!id) continue;
      el.setAttribute(target, t(id));
    }
  }
}

/**
 * Sweep now, and again whenever the language changes.
 *
 * The returned unsubscribe exists for tests; the application never stops
 * listening.
 *
 * @returns {Function} Unsubscribe
 */
export function initI18nDom() {
  applyTranslations();
  return onLocaleChange(() => applyTranslations());
}
