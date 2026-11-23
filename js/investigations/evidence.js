// A prediction set beside the student's own readings. Pure, shared by the verdict box and the reports.

// Imports only its own data (trayCites.js, used nowhere else): the engine's own functions come from stepView.js
// (`revealModule`), because an import of them here would split a shared chunk and add a request on every lesson route.
import { CITES } from './trayCites.js';

let kit = {};
export const setKit = k => (kit = k);

export const isEstimate = s => s?.type === 'predict' && s.kind === 'estimate';

/** The committed estimate (a value, or `low;high`) as numbers and the text typed, or null. `key` is the step's response key. */
export function readEstimate(step, responses, key) {
  const raw = responses?.[key];
  if (typeof raw !== 'string') return null;
  const parts = raw.split(';');
  const n = parts.map(p =>
    kit.typedNumber(p, kit.localeOfAnswer(responses, key))
  );
  if (parts.length !== (step.range ? 2 : 1) || n.some(v => !Number.isFinite(v)))
    return null;
  const text = (n[0] <= n.at(-1) ? parts : [...parts].reverse()).map(p =>
    p.trim()
  );
  return {
    low: Math.min(...n),
    high: Math.max(...n),
    range: !!step.range,
    text,
  };
}

/** An estimate as words; `pattern` is the language's "{low} to {high}". */
export const estimateText = (est, unit, pattern) =>
  `${est.range ? pattern.replace('{low}', est.text[0]).replace('{high}', est.text[1]) : est.text[0]}${unit ? ` ${unit}` : ''}`;

const parsed = raw => {
  try {
    return JSON.parse(raw) || null;
  } catch {
    return null;
  }
};

/** The readings a reveal step names, in order; `keyOf(sid)` gives a step's response key. `text` is '' when none was given. */
export const readingsFor = (step, steps, responses, keyOf) =>
  (step.evidence || []).flatMap(e => {
    const field = steps
      .find(s => s.sid === e.step)
      ?.fields?.find(f => f.id === e.field);
    const key = `${keyOf(e.step)}:${e.field}`;
    const text = String(responses?.[key] ?? '').trim();
    return field
      ? [
          {
            field,
            text,
            value: text
              ? kit.typedNumber(text, kit.localeOfAnswer(responses, key))
              : NaN,
            how: parsed(responses?.[`${key}:src`]),
          },
        ]
      : [];
  });

/** Whether a reading fell inside a committed range: a fact, never a grade (null for a value, or no reading). */
export const fellInside = (est, value) =>
  est?.range && Number.isFinite(value)
    ? value >= est.low && value <= est.high
    : null;

/** The estimate prediction that names `step` as its reveal. */
export const estimateFor = (steps, step) =>
  steps.find(s => isEstimate(s) && s.reveal === step.sid) ?? null;

/** A field that holds a number the student read or typed: not derived, not a label or a menu. */
const isReading = f => !f.compute && f.kind !== 'text' && !f.options;

/**
 * What a written answer could cite, by step and field: the readings the measure steps before it take, and the
 * predictions whose reveal comes before it. A closing question that trayCites.js names narrows both to the steps
 * listed there. Nothing is chosen from what the student has typed: this is the lesson's data alone, so it is the same
 * for every student.
 * @param {object[]} steps - The lesson's steps
 * @param {object} step - A short-answer step
 * @param {string} lesson - The lesson's id
 * @returns {{readings: {step: string, field: string}[], predictions: {step: string, reveal: string}[]}}
 */
export function citable(steps, step, lesson) {
  const at = steps.indexOf(step);
  if (at < 0 || step.kind !== 'short') return { readings: [], predictions: [] };
  const only = CITES[lesson]?.[step.sid];
  const before = steps.slice(0, at).filter(s => !only || only.includes(s.sid));
  const revealed = s => {
    const r = steps.findIndex(x => x.sid === s.reveal);
    return r >= 0 && r < at;
  };
  return {
    readings: before
      .filter(s => s.type === 'measure')
      .flatMap(s =>
        (s.fields || [])
          .filter(isReading)
          .map(f => ({ step: s.sid, field: f.id }))
      ),
    predictions: before
      .filter(
        s =>
          s.type === 'predict' &&
          s.reveal &&
          (isEstimate(s) || Array.isArray(s.options)) &&
          revealed(s)
      )
      .map(s => ({ step: s.sid, reveal: s.reveal })),
  };
}
