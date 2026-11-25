// =============================================================================
// The notice a migrated scenario revision opens under
// -----------------------------------------------------------------------------
// A link made for an earlier revision of a scenario whose old world is not kept
// opens the corrected world, and says so in words: announced, and shown until
// it is dismissed (SCENARIO_REVISIONS.md). Loaded only when such a link is
// opened, so no visit pays for it; it takes the reason, in both languages, from
// the registry's entry.
// =============================================================================

import { getLocale, registerMessages, t } from './i18n/index.js';
import { EN_REVISION } from './i18n/en.revision.js';
import { ES_REVISION } from './i18n/es.revision.js';
import { announce } from './notify.js';

/** The notice's id in the page. */
export const NOTICE_ID = 'revisionNotice';

/**
 * Show the notice for a migrated revision, replacing one already up.
 *
 * @param {{en: string, es: string}} reason - Why the corrected world differs
 * @returns {?HTMLElement} The notice, or null where there is no page
 */
export function showRevisionNotice(reason) {
  if (typeof document === 'undefined') return null;
  registerMessages('en', EN_REVISION, true);
  registerMessages('es', ES_REVISION, true);
  const text = t('revision.notice', {
    reason: reason?.[getLocale()] || reason?.en || '',
  }).trim();
  document.getElementById(NOTICE_ID)?.remove();
  // The toast's own look, kept until dismissed instead of timed out.
  const el = Object.assign(document.createElement('div'), {
    id: NOTICE_ID,
    className: 'toast is-visible',
  });
  el.setAttribute('role', 'status');
  el.style.maxWidth = 'min(40rem, 92vw)';
  el.style.borderRadius = 'var(--radius-lg)';
  el.style.bottom = 'calc(var(--space-10) + var(--space-8) + 3.5rem)';
  const message = Object.assign(document.createElement('span'), {
    textContent: text,
  });
  const dismiss = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'ui-button',
    textContent: t('revision.dismiss'),
    onclick: () => el.remove(),
  });
  el.append(message, ' ', dismiss);
  document.body.append(el);
  announce(text);
  return el;
}
