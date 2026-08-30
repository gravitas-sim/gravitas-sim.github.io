// =============================================================================
// Answer checking
// -----------------------------------------------------------------------------
// Extracted from investigations.js so that it has no dependencies at all.
//
// The lesson engine imports ui.js, which needs a browser. The instructor answer
// keys are generated at build time in Node, and they have to be judged right or
// wrong by *exactly* the rule the website applies, or the key that goes to a
// class disagrees with the site the class is using. One function, imported by
// both, is the only way to be sure of that.
// =============================================================================

/**
 * Decide whether a student's answer is correct.
 *
 * @param {Object} step - Step definition
 * @param {*} value - The student's answer
 * @returns {boolean|null} True, false, or null when the step is not graded
 */
export function checkAnswer(step, value) {
  if (!step) return null;
  if (step.kind === 'choice' || step.type === 'predict') {
    if (typeof step.answer !== 'number') return null;
    return Number(value) === step.answer;
  }
  if (step.kind === 'numeric') {
    // Strip units and stray characters: a student who types "29.5 km" has
    // answered the question, and marking that wrong tests typing, not physics.
    const n = Number(String(value).replace(/[^0-9eE+\-.]/g, ''));
    if (!Number.isFinite(n)) return false;
    const tol = step.tolerance ?? Math.abs(step.answer) * 0.05;
    // A hair of slack, because binary floating point does not represent most
    // decimals exactly: |7.6 - 8| evaluates to 0.4000000000000004, so a student
    // who worked out exactly the value at the edge of the stated tolerance was
    // being told they were wrong by four parts in 10^16.
    return Math.abs(n - step.answer) <= tol * (1 + 1e-9) + 1e-12;
  }
  return null;
}

/**
 * The tolerance a numeric step actually applies, including the default.
 * @param {Object} step - Step definition
 * @returns {number|null} Tolerance, or null when the step is not numeric
 */
export function toleranceFor(step) {
  if (step?.kind !== 'numeric') return null;
  return step.tolerance ?? Math.abs(step.answer) * 0.05;
}
