// =============================================================================
// Answer keys, derived from the lessons themselves
// -----------------------------------------------------------------------------
// An answer key that is written by hand goes stale the first time a lesson is
// edited, and the failure is silent: the class gets a key that disagrees with
// the website and nobody finds out until a student argues about a grade.
//
// So nothing here is written down twice. Every question, option list, correct
// answer, tolerance and explanation is read out of js/data/investigations.js,
// and every derived answer is then put back through the site's own
// checkAnswer() to prove the key would be marked correct. verifyKey() below is
// that proof, and it runs in the test suite.
//
// What cannot be derived is prose: why an answer is right in an instructor's
// words, what to expect from an open-ended measurement. That lives in
// js/data/instructorContent.js and is merged in by the document builder, never
// mixed into the derivation.
// =============================================================================

import { checkAnswer, toleranceFor } from './answerCheck.js';

/** Strip the small set of inline tags a lesson uses, for plain-text output. */
export function plainText(html) {
  return String(html ?? '')
    .replace(/<sub>(.*?)<\/sub>/g, '_$1')
    .replace(/<sup>(.*?)<\/sup>/g, '^$1')
    .replace(/<\/?(strong|em)>/g, '')
    .replace(/\s*\\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** How a step is treated in the key. */
const categoryOf = step => {
  if (step.type === 'predict') return 'prediction';
  if (step.type === 'measure') return 'measurement';
  if (step.type === 'explore') return 'activity';
  if (step.kind === 'choice') return 'graded';
  if (step.kind === 'numeric') return 'graded';
  if (step.kind === 'short') return 'written';
  return 'reading';
};

/**
 * Everything the answer key needs about one step, taken from the step itself.
 * @param {Object} step - Step definition
 * @param {number} index - Zero-based position in the lesson
 * @returns {Object} One key entry
 */
export function entryFor(step, index) {
  const entry = {
    step: index + 1,
    type: step.type,
    kind: step.kind ?? null,
    title: step.title,
    category: categoryOf(step),
    prompt: step.prompt ? plainText(step.prompt) : null,
    explanation: step.because ? plainText(step.because) : null,
  };

  if (Array.isArray(step.options)) {
    entry.options = step.options.map(plainText);
    entry.answerIndex = step.answer;
    entry.answerLabel = String.fromCharCode(65 + step.answer);
    entry.answerText = plainText(step.options[step.answer]);
  }

  if (step.kind === 'numeric') {
    const tol = toleranceFor(step);
    entry.answerValue = step.answer;
    entry.tolerance = tol;
    entry.unit = step.unit ?? null;
    entry.acceptedLow = step.answer - tol;
    entry.acceptedHigh = step.answer + tol;
  }

  if (step.kind === 'short')
    entry.rubric = step.rubric ? plainText(step.rubric) : null;

  if (step.type === 'measure') {
    entry.fields = (step.fields || []).map(f => ({
      id: f.id,
      label: plainText(f.label),
      unit: f.unit ?? null,
      derived: Boolean(f.compute),
      hint: f.hint ?? null,
    }));
    entry.hasValidator = typeof step.validate === 'function';
    entry.importable = Boolean(step.importFromSelection);
  }

  if (step.type === 'explore' && step.checklist) {
    entry.checklist = step.checklist.map(plainText);
  }

  if (step.tool) entry.tool = step.tool.id;

  return entry;
}

/**
 * The answer key for one investigation.
 * @param {Object} inv - Investigation definition
 * @returns {Object} Metadata plus one entry per step
 */
export function answerKeyFor(inv) {
  return {
    id: inv.id,
    title: inv.title,
    subtitle: inv.subtitle,
    duration: inv.duration,
    level: inv.level,
    stepCount: inv.steps.length,
    objectives: (inv.objectives || []).map(plainText),
    entries: inv.steps.map(entryFor),
  };
}

/** The entries an instructor actually has to mark. */
export const gradedEntries = key =>
  key.entries.filter(
    e => e.category === 'graded' || e.category === 'prediction'
  );

/**
 * Prove the key would be marked correct by the website.
 *
 * Every derived answer is fed back through checkAnswer(), and a numeric answer
 * is additionally probed just outside its stated tolerance: a key that quotes a
 * range wider than the site accepts sends a class to argue about answers the
 * site is rejecting.
 *
 * @param {Object} inv - Investigation definition
 * @returns {Array<string>} Problems found; empty means the key is sound
 */
export function verifyKey(inv) {
  const problems = [];
  const key = answerKeyFor(inv);

  inv.steps.forEach((step, i) => {
    const e = key.entries[i];
    const where = `${inv.id} step ${i + 1} (${step.title})`;

    if (e.answerIndex !== undefined) {
      if (!checkAnswer(step, e.answerIndex)) {
        problems.push(`${where}: the derived choice is not accepted`);
      }
      if (!(e.answerIndex >= 0 && e.answerIndex < e.options.length)) {
        problems.push(`${where}: answer index is outside the option list`);
      }
      if (!e.explanation) {
        problems.push(`${where}: graded choice with no explanation to give`);
      }
    }

    if (e.answerValue !== undefined) {
      if (!checkAnswer(step, e.answerValue)) {
        problems.push(`${where}: the derived value is not accepted`);
      }
      const outside = e.answerValue + e.tolerance * 1.001 + 1e-12;
      if (checkAnswer(step, outside)) {
        problems.push(
          `${where}: the quoted tolerance is narrower than the site's`
        );
      }
      if (!(e.tolerance > 0)) {
        problems.push(`${where}: numeric step with no usable tolerance`);
      }
    }

    if (e.category === 'written' && !e.rubric) {
      problems.push(`${where}: short answer with no rubric for the instructor`);
    }
    if (
      e.prompt === null &&
      (e.category === 'graded' || e.category === 'prediction')
    ) {
      problems.push(`${where}: graded step with no prompt`);
    }
  });

  return problems;
}

/**
 * A one-line count of what an investigation asks of a student.
 * @param {Object} inv - Investigation definition
 * @returns {Object} Counts by category
 */
export function questionCounts(inv) {
  const key = answerKeyFor(inv);
  const count = c => key.entries.filter(e => e.category === c).length;
  return {
    total: key.entries.length,
    graded: count('graded'),
    predictions: count('prediction'),
    measurements: count('measurement'),
    activities: count('activity'),
    written: count('written'),
    reading: count('reading'),
  };
}
