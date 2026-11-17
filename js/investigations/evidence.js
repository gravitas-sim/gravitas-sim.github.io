// What a reveal step sets beside a prediction: an estimate and the student's own readings.
// Pure: data in, data out, so the verdict box and both report writers share it.

import { localeOfAnswer, typedNumber } from '../answerParse.js';

/** Whether a step asks for an estimate (a value or a range) rather than a choice. */
export const isEstimate = s => s?.type === 'predict' && s.kind === 'estimate';

/**
 * The estimate a student committed, as numbers. A value is stored as its text, a
 * range as `low;high`, both under the step's own key beside the convention they were typed in.
 * @param {string} key - The step's response key
 * @returns {?{low: number, high: number, range: boolean, text: string[]}} Null when it cannot be read
 */
export function readEstimate(step, responses, key) {
  const raw = responses?.[key];
  if (typeof raw !== 'string') return null;
  const locale = localeOfAnswer(responses, key, 'en');
  const parts = raw.split(';');
  const n = parts.map(p => typedNumber(p, locale));
  if (parts.length !== (step.range ? 2 : 1) || n.some(v => !Number.isFinite(v)))
    return null;
  const text = (n[0] <= n[n.length - 1] ? parts : [...parts].reverse()).map(p =>
    p.trim()
  );
  return {
    low: Math.min(...n),
    high: Math.max(...n),
    range: Boolean(step.range),
    text,
  };
}

/** An estimate as words: `pattern` is the language's "{low} to {high}"; a value is its text. */
export const estimateText = (est, unit, pattern) =>
  `${est.range ? pattern.replace('{low}', est.text[0]).replace('{high}', est.text[1]) : est.text[0]}${unit ? ` ${unit}` : ''}`;

const parsed = raw => {
  try {
    return JSON.parse(raw) || null;
  } catch {
    return null;
  }
};

/**
 * The readings a reveal step names, in the order it names them. `keyOf` gives a step's response key from its sid.
 * @returns {Array<{field: Object, text: string, value: number, how: ?Object}>} One per entry
 *   whose step and field exist; `text` is '' when the student gave none
 */
export function readingsFor(step, steps, responses, keyOf) {
  return (step.evidence || []).flatMap(e => {
    const field = steps
      .find(s => s.sid === e.step)
      ?.fields?.find(f => f.id === e.field);
    if (!field) return [];
    const key = `${keyOf(e.step)}:${e.field}`;
    const text = String(responses?.[key] ?? '').trim();
    return [
      {
        field,
        text,
        value: text
          ? typedNumber(text, localeOfAnswer(responses, key, 'en'))
          : NaN,
        how: parsed(responses?.[`${key}:src`]),
      },
    ];
  });
}

/**
 * Whether a reading fell inside a committed range: a fact, never a grade. A single
 * value has no inside, and a reading that is missing or not a number has none to compare.
 * @returns {?boolean} True or false for a range and a number, else null
 */
export const fellInside = (estimate, value) =>
  estimate?.range && Number.isFinite(value)
    ? value >= estimate.low && value <= estimate.high
    : null;

/** The reveal step's prediction that is an estimate, if one names it. */
export const estimateFor = (steps, step) =>
  steps.find(s => isEstimate(s) && s.reveal === step.sid) ?? null;
