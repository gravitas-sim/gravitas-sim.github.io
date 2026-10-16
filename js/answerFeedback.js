// =============================================================================
// Staged hints, and the small set of mistakes worth naming
// -----------------------------------------------------------------------------
// Two ideas, kept apart on purpose.
//
// **Hints are asked for.** A student who is stuck gets a conceptual reminder
// first - what the question is about - then, if they ask again, a method hint
// telling them how to get at it, and only after an explicit reveal the worked
// explanation. Each stage has to be requested, because a hint that appears
// unbidden does the thinking before the student has tried to.
//
// **Misconceptions are recognized, not inferred.** A wrong number can be wrong
// for any number of reasons and almost all of them are unknowable from the
// number alone. So nothing here guesses: an author writes down the specific
// mistakes a question invites - a radius where a diameter was asked for, a
// peak-to-peak range where a semi-amplitude was asked for - and only those are
// named. Every other wrong answer is simply wrong, and says so.
//
// Pure and dependency-free for the same reason js/answerCheck.js is: the
// instructor materials are built in Node and have to describe the same
// behavior the site produces.
// =============================================================================

/** The hint stages of the original two-stage form, in the order offered. */
export const HINT_STAGES = Object.freeze(['concept', 'method']);

/** A ladder holds at most this many hints. */
export const HINT_LIMIT = 3;

/** Every id a recorded hint can carry: the original two, and a ladder's. */
const HINT_IDS = Object.freeze([...HINT_STAGES, 'h1', 'h2', 'h3']);

/**
 * The outcome classes a graded numeric step can give feedback for.
 *
 * Authored text per class teaches the check to make, never the answer. The
 * classes are relationships between the number typed and the right one (see
 * answerClass), the only thing a number can evidence.
 */
export const FEEDBACK_CLASSES = Object.freeze([
  'correct',
  'close',
  'wrong-sign',
  'wrong-unit',
  'wrong-order-of-magnitude',
  'off',
]);

/**
 * The mistakes a step can declare, and what each one is.
 *
 * A rule is a *relationship* between the student's number and the right one,
 * because that is the only thing a number can evidence. `factor: 2` means "you
 * gave twice the answer", which is what a radius-for-diameter slip looks like
 * from outside. What it is *called* - and therefore what the student is told -
 * is the author's judgment about their own question, not this module's.
 */
export const STANDARD_MISCONCEPTIONS = Object.freeze({
  // Asked for a radius, gave a diameter. Or the reverse.
  radiusForDiameter: { factor: 0.5 },
  diameterForRadius: { factor: 2 },
  // Asked for a semi-amplitude K, gave the full peak-to-peak range.
  peakToPeakForSemiAmplitude: { factor: 2 },
  semiAmplitudeForPeakToPeak: { factor: 0.5 },
  // Read a period in days where the answer wanted years, or the reverse.
  daysForYears: { factor: 365.25 },
  yearsForDays: { factor: 1 / 365.25 },
  // Answered in radians where degrees were asked for.
  radiansForDegrees: { factor: Math.PI / 180 },
});

/**
 * The hints a step offers, as a ladder of at most three, in order.
 *
 * `hints` is an array (up to three, each shown on request) or the original
 * object of a concept hint and a method hint, which reads as a ladder of two.
 * An id is `h1`..`h3` by position, or the stage's own name for the object
 * form, so a stage recorded by an earlier build still reads as the same hint.
 *
 * @param {object} step - Step definition
 * @returns {Array<{id: string, text: string}>} The ladder, possibly empty
 */
export function hintLadder(step) {
  const h = step?.hints;
  if (Array.isArray(h)) {
    return h
      .slice(0, HINT_LIMIT)
      .map((text, i) => ({ id: `h${i + 1}`, text }))
      .filter(x => typeof x.text === 'string' && x.text);
  }
  return h && typeof h === 'object'
    ? HINT_STAGES.filter(k => h[k]).map(k => ({ id: k, text: h[k] }))
    : [];
}

/**
 * What hints a step offers, if any.
 *
 * @param {object} step - Step definition
 * @returns {?{concept: ?string, method: ?string, worked: ?string,
 *   ladder: Array<{id: string, text: string}>}} The hints
 */
export function hintsFor(step) {
  const ladder = hintLadder(step);
  const worked = step?.worked ?? null;
  if (!ladder.length && !worked) return null;
  const h = step?.hints;
  return {
    concept: Array.isArray(h) ? null : (h?.concept ?? null),
    method: Array.isArray(h) ? null : (h?.method ?? null),
    worked,
    ladder,
  };
}

/**
 * The next thing a student can ask for, given what they have already used.
 *
 * Stages are offered in order and none is skipped: a student cannot reach the
 * worked explanation without having been offered the hints that might have
 * made it unnecessary. Returns null when there is nothing left to give.
 *
 * @param {object} step - Step definition
 * @param {Array<string>} used - Stages already taken
 * @returns {?string} A ladder id, or 'reveal'
 */
export function nextHintStage(step, used = []) {
  const hints = hintsFor(step);
  if (!hints) return null;
  const taken = new Set(used);
  const next = hints.ladder.find(x => !taken.has(x.id));
  if (next) return next.id;
  if (hints.worked && !taken.has('reveal')) return 'reveal';
  return null;
}

/**
 * Whether a value matches a declared misconception.
 *
 * The comparison is against the answer *scaled by the rule's factor*, using the
 * step's own tolerance scaled the same way - so a rule for "twice the answer"
 * is as forgiving about twice the answer as the question is about the answer.
 *
 * Deliberately narrow. It fires only on rules the author wrote for this
 * question, and only when the number really is the value that mistake produces;
 * a student who is simply wrong gets told they are wrong, not told a story
 * about their reasoning.
 *
 * @param {object} step - Step definition, with `misconceptions`
 * @param {number} value - The student's parsed answer
 * @param {number} tolerance - The tolerance the step applies
 * @returns {?{id: string, message: ?string, factor: number}} The match, or null
 */
export function matchMisconception(step, value, tolerance) {
  const rules = step?.misconceptions;
  if (!Array.isArray(rules) || !rules.length) return null;
  // A choice: a rule bound to an option names the mistake that option is.
  if (Array.isArray(step.options)) {
    const rule = rules.find(
      r => Number.isInteger(r?.option) && r.option === value
    );
    return rule && value !== step.answer
      ? { id: rule.id ?? null, message: rule.say ?? null, factor: 1 }
      : null;
  }
  if (!Number.isFinite(value) || !Number.isFinite(step?.answer)) return null;

  for (const rule of rules) {
    const standard = STANDARD_MISCONCEPTIONS[rule?.id] || {};
    const factor = Number(rule?.factor ?? standard.factor);
    const target = Number.isFinite(rule?.equals)
      ? rule.equals
      : Number.isFinite(factor)
        ? step.answer * factor
        : null;
    if (target === null || !Number.isFinite(target)) continue;

    // Scale the tolerance with the target, so the rule is neither stricter nor
    // looser about its own value than the question is about the right one.
    const scale =
      Number.isFinite(factor) && factor !== 0 ? Math.abs(factor) : 1;
    const window = Math.abs(tolerance) * scale;
    if (Math.abs(value - target) <= window * (1 + 1e-9) + 1e-12) {
      return {
        id: rule.id ?? null,
        message: rule.say ?? null,
        factor: Number.isFinite(factor) ? factor : 1,
      };
    }
  }
  return null;
}

/**
 * A record of how much help a student took, for the report.
 *
 * Not a penalty. Asking for a hint and then getting it right is a student
 * learning, which is the object of the exercise; a grade that punishes it
 * teaches them to guess instead. The report shows it as information beside the
 * answer, and `checkAnswer` never sees it.
 *
 * @param {Array<string>} used - Stages taken
 * @returns {{hints: number, revealed: boolean, stages: Array<string>}} The tally
 */
export function helpTaken(used = []) {
  const stages = Array.isArray(used) ? used.filter(Boolean) : [];
  return {
    hints: new Set(stages.filter(s => HINT_IDS.includes(s))).size,
    revealed: stages.includes('reveal'),
    stages,
  };
}

/**
 * The stages recorded under a step's `:help` key.
 * @param {*} stored - The stored value, a comma-separated string
 * @returns {Array<string>} The stages, in the order taken
 */
export const helpStages = stored =>
  String(stored ?? '')
    .split(',')
    .filter(Boolean);

// Conversions a student can slip on that are not a power of ten, so that a
// number off by one of them is a wrong unit rather than merely wrong.
const UNIT_FACTORS = [
  24,
  60,
  3600,
  86400,
  365.25,
  Math.PI / 180,
  1.495978707e8,
  215.03,
  109.08,
].flatMap(f => [f, 1 / f]);

/** Unit refusals from the parser: the student gave a unit that cannot be right. */
const UNIT_REASONS = ['incompatibleUnit', 'unknownUnit', 'unitNotAllowed'];

/** A near miss is within this many tolerances of the answer. */
const CLOSE_TOLERANCES = 3;

/**
 * Which class of outcome a graded numeric answer is.
 *
 * Built on what gradeAnswer already decides (js/answerCheck.js): it says
 * correct, incorrect or unreadable and this says what kind of incorrect. The
 * order matters and is the order of the questions a person would ask: the
 * right size and the wrong sign, then a unit slip, then close, then a power of
 * ten or more out, and otherwise just off. None of it infers a reason; each
 * class is a relationship between two numbers.
 *
 * @param {object} step - Step definition
 * @param {{status: string, value: ?number, reason: ?string}} graded - From gradeAnswer
 * @param {number} tolerance - What the step accepts, from toleranceFor
 * @returns {?string} One of FEEDBACK_CLASSES, or null for a step not graded
 */
export function answerClass(step, graded, tolerance) {
  if (!graded) return null;
  if (graded.status === 'correct') return 'correct';
  if (graded.status === 'unreadable') {
    return UNIT_REASONS.includes(graded.reason) ? 'wrong-unit' : null;
  }
  const a = step?.answer;
  const v = graded.value;
  if (graded.status !== 'incorrect' || !Number.isFinite(a)) return null;
  if (!Number.isFinite(v)) return 'off';
  const tol = Math.abs(tolerance);
  const near = (x, t) => Math.abs(v - x) <= t * (1 + 1e-9) + 1e-12;
  if (a !== 0 && near(-a, tol)) return 'wrong-sign';
  if (a !== 0 && UNIT_FACTORS.some(f => near(a * f, tol * Math.abs(f))))
    return 'wrong-unit';
  if (near(a, CLOSE_TOLERANCES * tol)) return 'close';
  if (a !== 0 && v !== 0 && Math.abs(Math.log10(Math.abs(v / a))) >= 0.9)
    return 'wrong-order-of-magnitude';
  return 'off';
}

/**
 * The text a step authored for an outcome class, if it did.
 * @param {object} step - Step definition
 * @param {?string} cls - From answerClass
 * @returns {?string} The words, or null
 */
export const feedbackFor = (step, cls) =>
  (cls && typeof step?.feedback?.[cls] === 'string' && step.feedback[cls]) ||
  null;
