// =============================================================================
// The rule content/placeholder: what an empty box may say
// -----------------------------------------------------------------------------
// An answer box is on screen before the student has measured anything, so its
// cue (a field's `hint`, a numeric step's `placeholder`) names the form of an
// answer and never a value. The lesson panel refuses to render a cue with a
// numeral (cueText in js/investigations/stepView.js, the same definition of a
// numeral); this rule is what makes the author fix the source, and it reads the
// numbers inside the text ("e.g. 8.0 ± 0.1"), not only a bare number.
//
// Node-side, like the rest of tools/authoring: tools/authoring/inputs.mjs hands
// it to checkCatalog, and js/authoring/rules.js, which ships on the Composer
// route, does not import it. A pack field has no `hint` and nothing precaches
// this file.
//
//   error  a number in the cue is the step's answer, within its tolerance, or a
//          value its validate accepts for that field
//   warn   any other numeral in a cue, for review
//
// The author's own expected value lives under `want`, which no renderer reads.
//
// It also judges the slips a measure field names (`fields[].misconceptions`, the matcher of
// js/answerFeedback.js): each is declared well, and none of its words, nor a measure step's
// feedback, holds the field's expected value, the step's answer or a number within tolerance of
// either (a feedback text names a kind of slip and never gives a value).
// =============================================================================

import { toleranceFor } from '../../js/answerCheck.js';
import { STANDARD_MISCONCEPTIONS } from '../../js/answerFeedback.js';
import { parseNumber } from '../../js/answerParse.js';

/** A digit of any script or a numeric symbol: what the lesson panel refuses to render in a cue. */
const hasNumeral = text => /[\p{Nd}\p{No}\p{Nl}]/u.test(String(text));

/** The numbers written in a cue, as either decimal convention writes them. */
const numbersIn = text =>
  [...String(text).matchAll(/\d+(?:[.,]\d+)?/g)].map(
    m => parseNumber(m[0], m[0].includes(',') ? 'es' : 'en').value
  );

/**
 * What the cues of one step give away.
 *
 * @param {Object} step - Step definition (a Spanish reading is checked the same way)
 * @param {Object} models - The English step's expected values by field id, as numbers
 * @param {Object} ctx - The probe context a validate is called with
 * @returns {Array<{level: string, message: string}>} Findings
 */
export function cueFindings(step, models, ctx) {
  const out = [];
  const answer = Number.isFinite(step.answer) ? step.answer : null;
  const tol = Math.abs(toleranceFor(step) ?? 0);
  const typed = (step.fields || []).filter(
    f => typeof f.compute !== 'function'
  );
  const accepts = (field, n) => {
    if (!step.fields || typeof step.validate !== 'function') return false;
    if (typed.some(f => !Number.isFinite(models[f.id]))) return false;
    try {
      const v = { ...models, [field.id]: n };
      for (const f of step.fields)
        if (typeof f.compute === 'function') v[f.id] = Number(f.compute(v));
      return step.validate(v, ctx)?.level === 'ok';
    } catch {
      return false;
    }
  };
  const judge = (where, cue, field) => {
    if (typeof cue !== 'string' || !hasNumeral(cue)) return;
    const given = field
      ? numbersIn(cue).some(n => n === models[field.id] || accepts(field, n))
      : answer !== null &&
        numbersIn(cue).some(n => Math.abs(n - answer) <= tol);
    out.push({
      level: given ? 'error' : 'warn',
      message: given
        ? `${where} "${cue}" holds a value the step accepts; a cue says what form the answer takes, not what it is`
        : `${where} "${cue}" holds a numeral, so it is not shown; check that it is not the answer`,
    });
  };
  if (step.kind === 'numeric') judge('the placeholder', step.placeholder);
  for (const f of step.fields || []) judge(`field "${f.id}" cue`, f.hint, f);
  return out.concat(slipFindings(step, models));
}

const WHEN_KEYS = ['role', 'moment', 'setting', 'interval'];
const words = x => typeof x === 'string' && x.trim() !== '';
const range = r =>
  r &&
  typeof r === 'object' &&
  Object.keys(r).every(k => k === 'min' || k === 'max') &&
  Object.values(r).every(Number.isFinite);

/** What is wrong with how one slip is declared, in words; empty when nothing is. */
function declaredBadly(m, f, step, model) {
  const bad = [];
  const standard = STANDARD_MISCONCEPTIONS[m?.id];
  const kinds = ['factor', 'equals', 'when'].filter(k => m?.[k] !== undefined);
  if (kinds.length > 1) bad.push(`has ${kinds.join(' and ')}; it takes one`);
  if (!kinds.length && !standard)
    bad.push('has no factor, equals or when, and its id is not a standard one');
  if (m?.factor !== undefined && !(Number.isFinite(m.factor) && m.factor))
    bad.push('has a factor that is not a number other than zero');
  if (m?.equals !== undefined && !Number.isFinite(m.equals))
    bad.push('has an equals that is not a number');
  if (
    (m?.factor !== undefined || (!kinds.length && standard)) &&
    !Number.isFinite(model)
  )
    bad.push(
      "is judged against the field's expected value (`want`), which it has not"
    );
  const w = m?.when;
  if (w !== undefined) {
    const point = f.source && f.source.span === undefined;
    const keys = w && typeof w === 'object' ? Object.keys(w) : [];
    if (!keys.length || keys.some(k => !WHEN_KEYS.includes(k)))
      bad.push(
        `has a when with none of ${WHEN_KEYS.join(', ')}, or another key`
      );
    if (w?.role !== undefined && ![].concat(w.role).every(words))
      bad.push('has a when role that is not a role name');
    if (w?.moment !== undefined && !range(w.moment))
      bad.push('has a when moment that is not {min, max}');
    if (
      w?.setting !== undefined &&
      !(w.setting && typeof w.setting === 'object')
    )
      bad.push('has a when setting that is not {name: value}');
    if (
      w?.interval !== undefined &&
      !Object.values(w.interval || {}).every(range)
    )
      bad.push('has a when interval that is not {from, to, n} of {min, max}');
    const onPoint = ['role', 'moment', 'setting'].some(
      k => w?.[k] !== undefined
    );
    if (onPoint && !point && !step.importFromSelection)
      bad.push(
        'judges how a value was taken, and this field has no point source'
      );
    if (w?.interval !== undefined && f.source?.span === undefined)
      bad.push('judges an interval, and this field has no span source');
  }
  return bad;
}

/** Findings on the slips a measure field names and the feedback of a measure step. */
function slipFindings(step, models) {
  const out = [];
  const add = (rule, message) => out.push({ level: 'error', rule, message });
  const answer = Number.isFinite(step.answer) ? step.answer : null;
  const gives = (text, f) => {
    const model = f ? models[f.id] : undefined;
    const tol = f ? (f.tolerance ?? Math.abs(model) * 0.05) : 0;
    const near = (n, x, t) =>
      Number.isFinite(x) &&
      Math.abs(Math.abs(n) - Math.abs(x)) <= t * (1 + 1e-9) + 1e-12;
    return numbersIn(text).some(
      n =>
        near(n, model, tol) ||
        near(n, answer, Math.abs(toleranceFor(step) ?? 0)) ||
        (!f && Object.values(models).some(x => near(n, x, Math.abs(x) * 0.05)))
    );
  };
  for (const f of step.fields || []) {
    if (f.misconceptions === undefined) continue;
    if (!Array.isArray(f.misconceptions)) {
      add('content/feedback', `field "${f.id}" misconceptions is not a list`);
      continue;
    }
    const ids = new Set();
    f.misconceptions.forEach((m, n) => {
      const where = `field "${f.id}" slip ${n + 1}`;
      if (!words(m?.id)) add('content/feedback', `${where} has no id`);
      else if (ids.has(m.id))
        add('content/feedback', `${where} repeats the id "${m.id}"`);
      else ids.add(m.id);
      if (!words(m?.say)) add('content/feedback', `${where} says nothing`);
      for (const why of declaredBadly(m, f, step, models[f.id]))
        add('content/feedback', `${where} ${why}`);
      if (words(m?.say) && gives(m.say, f))
        add(
          'content/hint-leak',
          `${where} says a value the step accepts; name the slip, not the number`
        );
    });
  }
  if (step.type === 'measure') {
    const texts = [
      ...Object.entries(step.feedback || {}).map(([k, v]) => [
        `"${k}" feedback`,
        v,
      ]),
      ...(step.misconceptions || []).map(m => [
        `misconception "${m?.id}"`,
        m?.say,
      ]),
    ];
    for (const [where, text] of texts)
      if (words(text) && gives(text))
        add('content/hint-leak', `the ${where} says a value a field expects`);
  }
  return out;
}
