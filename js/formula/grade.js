// =============================================================================
// A question whose expected value is a formula over the student's own numbers
// -----------------------------------------------------------------------------
// "What is P^2 / a^3 for your two measurements?" cannot have a typed answer: it
// is different for every student. A numeric question of an investigation pack
// may carry
//
//   formula: { expr: "to(P^2 / a^3, 'yr^2/AU^3')",
//              of: { P: 'orbit.period', a: 'orbit.axis' },   name -> step.field
//              tolerancePct: 5 }
//
// in place of `answer` and `tolerance`. `of` names fields of earlier measure
// steps; the expression is the formula language (./engine.js), authored with
// English decimals, and each field is read in the convention its student typed
// it in. The expected value is computed when an answer is graded, so a student
// who corrects a measurement changes what is expected of the question, and one
// who has not measured yet is not marked wrong (the answer is NaN, which the
// grader reads as "not gradable yet").
//
// Pure: no DOM. The lesson engine supplies the reader of a field.
// =============================================================================

import { evaluate, compile, CONSTANT_NAMES } from './engine.js';
import { FormulaError } from './parse.js';

export { useNumberReader } from './parse.js';

const REF = /^([A-Za-z0-9][A-Za-z0-9-]*)\.([A-Za-z][A-Za-z0-9_-]*)$/;

/** The expression, with the unit the answer is typed in applied. */
const wrapped = (formula, unit) =>
  unit ? `to((${formula.expr}), '${unit}')` : formula.expr;

/** The unit of a measure step's field: a string, or null when not stated. */
function fieldUnit(steps, ref) {
  const [, sid, field] = REF.exec(ref) ?? [];
  const step = steps.find(s => s.sid === sid && s.type === 'measure');
  const f = step?.fields?.find(x => x.id === field);
  return f ? (f.unit ?? null) : undefined;
}

/**
 * What is wrong with a question's formula, or null. For the validators: it
 * names the earlier measure steps and fields, reads each one's unit, checks
 * the expression against those units, and checks the result against the
 * question's own unit.
 *
 * @param {{expr: string, of: object}} formula
 * @param {string|undefined} unit - The question's unit
 * @param {object[]} steps - The steps before the question
 * @returns {null|{code: string, vars: object}} A formula code (js/i18n/en.formula.js)
 *   or `of` (a reference that names no field)
 */
export function formulaProblem(formula, unit, steps) {
  const inputs = {};
  for (const [name, ref] of Object.entries(formula.of)) {
    const u = fieldUnit(steps, ref);
    if (u === undefined || CONSTANT_NAMES.includes(name))
      return { code: 'of', vars: { name, ref } };
    inputs[name] = { unit: u, uncertainty: 'none' };
  }
  try {
    const { info } = compile(wrapped(formula, unit), { inputs });
    if (!unit && !info.dimensionless && info.unit !== null)
      return { code: 'unitless', vars: { unit: info.unitText } };
    return null;
  } catch (e) {
    if (e instanceof FormulaError) return { code: e.code, vars: e.vars };
    throw e;
  }
}

/**
 * The expected value of a formula question now: NaN until every field it reads
 * is a number.
 * @param {object} step - A compiled question step carrying `formula`
 * @param {object[]} steps - The lesson's steps
 * @param {(sid: string, field: string) => number} read - A student's field
 * @returns {number}
 */
export function expectedValue(step, steps, read) {
  const inputs = {};
  for (const [name, ref] of Object.entries(step.formula.of)) {
    const [, sid, field] = REF.exec(ref) ?? [];
    const value = read(sid, field);
    if (!Number.isFinite(value)) return NaN;
    inputs[name] = { value, unit: fieldUnit(steps, ref) ?? null };
  }
  try {
    return evaluate(wrapped(step.formula, step.unit), inputs).value;
  } catch (e) {
    if (e instanceof FormulaError) return NaN;
    throw e;
  }
}

/**
 * The lesson with each formula question's `answer` and `tolerance` as getters,
 * so every grader that reads a step (the panel, the report, the feedback)
 * reads the expected value of the student's own numbers.
 * @param {object} lesson - A compiled investigation
 * @param {(sid: string, field: string) => number} read
 * @returns {object} A copy; the lesson itself is not changed
 */
export function bindFormulas(lesson, read) {
  const steps = lesson.steps.map(s => {
    if (!s.formula) return s;
    const copy = { ...s };
    Object.defineProperty(copy, 'answer', {
      enumerable: true,
      get: () => expectedValue(copy, lesson.steps, read),
    });
    Object.defineProperty(copy, 'tolerance', {
      enumerable: true,
      get: () => (Math.abs(copy.answer) * (s.formula.tolerancePct ?? 5)) / 100,
    });
    return copy;
  });
  return { ...lesson, steps };
}
