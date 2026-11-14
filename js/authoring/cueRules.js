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
// It is handed to checkCatalog through the inputs (tools/authoring/inputs.mjs),
// not imported by js/authoring/rules.js: that module ships on the Composer
// route, which has no cue to check (a pack field has no `hint`) and no room.
//
//   error  a number in the cue is the step's answer, within its tolerance, or a
//          value its validate accepts for that field
//   warn   any other numeral in a cue, for review
//
// The author's own expected value lives under `want`, which no renderer reads.
// =============================================================================

import { toleranceFor } from '../answerCheck.js';

/** A digit of any script or a numeric symbol: what the lesson panel refuses to render in a cue. */
const hasNumeral = text => /[\p{Nd}\p{No}\p{Nl}]/u.test(String(text));

/** The numbers written in a cue, as either decimal convention writes them. */
const numbersIn = text =>
  [...String(text).matchAll(/\d+(?:[.,]\d+)?/g)].map(m =>
    Number(m[0].replace(',', '.'))
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
  return out;
}
