// =============================================================================
// The words for a revised step or investigation
// -----------------------------------------------------------------------------
// ./revisions.js is pure and says nothing in words. A reader that has to tell a
// student or an instructor what was revised loads both languages through this,
// once, so a switch of language mid-page has what it needs. The strings are
// ../i18n/{en,es}.revisions.js (namespace `rev`).
// =============================================================================

import { getLocale, registerMessages, t } from '../i18n/index.js';
import { wasIn } from './revisions.js';

let loading = null;

/** @returns {Promise<void>} Resolves when both languages are registered */
export function ensureRevisionMessages() {
  loading ??= Promise.all([
    import('../i18n/en.revisions.js'),
    import('../i18n/es.revisions.js'),
  ])
    .then(([en, es]) => {
      registerMessages('en', en.EN_REVISIONS);
      registerMessages('es', es.ES_REVISIONS);
    })
    .catch(err => {
      loading = null;
      throw err;
    });
  return loading;
}

/**
 * What happened to a retired step, in a sentence.
 *
 * @param {{to: ?string, release: string, was: *}} entry - From successorOf()
 * @param {?object} lesson - The lesson, for the successor's title
 * @returns {string} The sentence in the reader's language
 */
export function revisionLine(entry, lesson) {
  const was = wasIn(entry.was, getLocale());
  const next = lesson?.steps?.find(s => s.sid === entry.to);
  return next
    ? t('rev.replaced', { was, release: entry.release, title: next.title })
    : t('rev.removed', { was, release: entry.release });
}
