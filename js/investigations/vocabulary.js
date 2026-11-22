// The rest of the reset words (js/i18n/en.reset.js, es.reset.js), fetched when
// one is first needed: the toast after a reset, starting over, and Spanish at
// once. The control, the note and the rail speak from the base catalog; the
// markup that names the others carries data-late until this arrives.

import { applyTranslations } from '../i18n/dom.js';
import { registerMessages, t } from '../i18n/index.js';
import { EN_RESET } from '../i18n/en.reset.js';
import { ES_RESET } from '../i18n/es.reset.js';

// Quietly: a panel redrawn for every registered string would lose its place.
registerMessages('en', EN_RESET, true);
registerMessages('es', ES_RESET, true);

/** Hand the late markup to the translator, and translate it. */
export function activate() {
  for (const [late, now] of [
    ['data-late', 'data-i18n'],
    ['data-late-title', 'data-i18n-title'],
  ])
    for (const el of document.querySelectorAll(`[${late}]`)) {
      el.setAttribute(now, el.getAttribute(late));
      el.removeAttribute(late);
    }
  applyTranslations();
}

/** The toast that says what a scene reset did: the scene, the instrument or both. */
export const resetSaid = step =>
  t(`reset.did.${step.scene ? (step.tool ? 'both' : 'scene') : 'tool'}`);
