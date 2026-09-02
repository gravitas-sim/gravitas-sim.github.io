// =============================================================================
// Translating the words a lesson computes
// -----------------------------------------------------------------------------
// A lesson is translated by ../data/investigations/es/<id>.js, a shadow that
// carries its words. That covers everything a lesson *states* - titles, bodies,
// options, tips - because those are data.
//
// It cannot cover what a lesson *computes*. A probe is a function that reads
// the live simulation and returns rows to display; a check is a function that
// reads a student's answer and returns a sentence about it. Those sentences are
// inside function bodies, and a shadow of a lesson's data has no way to reach
// them.
//
// So they are translated here instead, by what they say rather than by where
// they are. The engine passes every string a lesson function produced through
// lessonText(); if the catalogue has a translation for it, that is used, and if
// it does not, the English stands. That is why this is keyed on the English:
// the lesson files stay content-only and import nothing, and a lesson can add a
// new message without anything breaking - it simply appears untranslated until
// somebody translates it.
//
// The slug is a stable function of the English, so a message that is reworded
// gets a new id and correctly loses its stale translation rather than keeping
// it.
// =============================================================================

import { t, hasMessage } from './index.js';

/** A short, stable id for a sentence. */
export function lessonKey(text) {
  const slug = String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((w, i) =>
      i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()
    )
    .join('');
  // Length as a cheap discriminator between two messages that open the same
  // way, which the diagnostic messages often do.
  return `lessonFn.${slug || 'x'}${String(text).length}`;
}

/**
 * Translate a string a lesson function produced, if there is a translation.
 *
 * @param {*} text - Whatever the lesson returned
 * @returns {*} The translated string, or the original untouched
 */
export function lessonText(text) {
  if (typeof text !== 'string' || !text.trim()) return text;
  const key = lessonKey(text);
  return hasMessage(key) ? t(key) : text;
}
