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
// **Misconceptions are recognised, not inferred.** A wrong number can be wrong
// for any number of reasons and almost all of them are unknowable from the
// number alone. So nothing here guesses: an author writes down the specific
// mistakes a question invites - a radius where a diameter was asked for, a
// peak-to-peak range where a semi-amplitude was asked for - and only those are
// named. Every other wrong answer is simply wrong, and says so.
//
// Pure and dependency-free for the same reason js/answerCheck.js is: the
// instructor materials are built in Node and have to describe the same
// behaviour the site produces.
// =============================================================================

/** The hint stages, in the order they are offered. */
export const HINT_STAGES = Object.freeze(['concept', 'method']);

/**
 * The mistakes a step can declare, and what each one is.
 *
 * A rule is a *relationship* between the student's number and the right one,
 * because that is the only thing a number can evidence. `factor: 2` means "you
 * gave twice the answer", which is what a radius-for-diameter slip looks like
 * from outside. What it is *called* - and therefore what the student is told -
 * is the author's judgement about their own question, not this module's.
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
 * What hints a step offers, if any.
 *
 * @param {object} step - Step definition
 * @returns {?{concept: ?string, method: ?string, worked: ?string}} The hints
 */
export function hintsFor(step) {
  const h = step?.hints;
  const worked = step?.worked ?? null;
  if (!h && !worked) return null;
  return {
    concept: h?.concept ?? null,
    method: h?.method ?? null,
    worked,
  };
}

/**
 * The next thing a student can ask for, given what they have already used.
 *
 * Stages are offered in order and none is skipped: a student cannot reach the
 * worked explanation without having been offered the two hints that might have
 * made it unnecessary. Returns null when there is nothing left to give.
 *
 * @param {object} step - Step definition
 * @param {Array<string>} used - Stages already taken
 * @returns {?string} 'concept' | 'method' | 'reveal'
 */
export function nextHintStage(step, used = []) {
  const hints = hintsFor(step);
  if (!hints) return null;
  const taken = new Set(used);
  for (const stage of HINT_STAGES) {
    if (hints[stage] && !taken.has(stage)) return stage;
  }
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
    hints: stages.filter(s => HINT_STAGES.includes(s)).length,
    revealed: stages.includes('reveal'),
    stages,
  };
}
