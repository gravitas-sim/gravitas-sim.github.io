// A reading taken in a lesson as one notebook entry: the number as printed, a
// standard error for an interval's mean, and how it was taken.
import { t as translate } from '../i18n/index.js';
import {
  KIND,
  SOURCE,
  buildEntry,
  provenanceOf,
  quantity,
  say,
} from './entry.js';
import { parseNumber } from '../answerParse.js';

const t = (id, vars) => say(translate(id, vars), id, vars);

/**
 * @param {object} r - label, text (as printed), unit, locale, src (how it was
 *   taken), uncertainty (an interval's standard error) and provenance
 * @returns {?object} A notebook entry, or null when the text is not a number
 */
export function fromReading({
  label,
  text,
  unit,
  locale,
  src,
  uncertainty,
  provenance,
}) {
  const read = parseNumber(text, locale);
  if (!read.ok) return null;
  const span = src.k === 's';
  return buildEntry({
    source: SOURCE.LESSON_READING,
    title: label,
    quantities: [
      quantity({
        label,
        value: read.value,
        unit,
        kind: KIND.MEASURED,
        uncertainty,
        note: t('nb.reading.note', { text }),
      }),
    ],
    provenance: provenanceOf({
      ...provenance,
      flags: ['simulated', span ? 'interval' : 'read-off'],
    }),
  });
}
