// =============================================================================
// Model-checked expectations (Prompt 66, step 7)
// -----------------------------------------------------------------------------
// A numeric question in a lesson carries its expected value as a literal:
// `answer: 84`. A literal is a claim about the model that nothing checks, so
// it drifts when the model moves and nobody finds out. Every literal numeric
// answer is therefore exactly one of:
//
//   MODELS     recomputed from the lesson's own kernel, widget or probe
//              function by tests/modelCheckedExpectations.test.js, which is
//              generated from this table: one test per entry, each proving the
//              literal by the SAME value (the recomputed number rounded to the
//              literal's own significant digits equals the literal, and sits
//              inside the step's tolerance). A tolerance is never loosened to
//              make an entry pass; a mismatch is a finding.
//   SOURCED    a published value, carried with its source (the same
//              {text, doi | bibcode | url} shape js/data/realSystemSources.js
//              uses for the `sources` field of Prompt 62).
//   UNCHECKED  an explicit, justified allowlist of what is not yet either.
//              It can only shrink: the author check refuses a numeric literal
//              that is in none of the three, refuses an allowlist entry for a
//              step that is not there or is now checked, and
//              tests/modelCheckedExpectations.test.js pins its size.
//
// These live here and not on the steps for the reason D-SRC-01 gives for the
// real-system sources: bytes. Every lesson route is at its ceiling, a
// recomputation is code, and nothing shipped needs to read any of it. The
// check is Node-only (author:check and Jest), so it costs no route a byte.
// Entries are keyed `lesson-id/step-sid`; a sid is stable (id/step), so
// inserting a step above one moves nothing here.
// =============================================================================

export const RULE_ID = 'instructor/model-checked';
export const RULE_DESCRIPTION =
  "A literal numeric answer is recomputed from the lesson's own model by a fixture test, carries a published source, or is on the shrinking allowlist";

/** The numeric questions with a literal answer, in lesson order. */
export function numericLiterals(investigations) {
  const out = [];
  for (const inv of investigations) {
    inv.steps.forEach((step, index) => {
      if (
        step.type === 'question' &&
        step.kind === 'numeric' &&
        typeof step.answer === 'number'
      ) {
        out.push({
          key: `${inv.id}/${step.sid}`,
          lesson: inv.id,
          sid: step.sid,
          index,
          step,
        });
      }
    });
  }
  return out;
}

/**
 * The significant digits a literal is written to: 8.686 has four, 780 two
 * (trailing zeros of an integer are not significant), 0.177 three.
 */
export function significantDigits(x) {
  const t = String(x).replace('-', '').replace(/e.*$/i, '');
  const digits = t.replace('.', '').replace(/^0+/, '');
  return Math.max(
    1,
    (t.includes('.') ? digits : digits.replace(/0+$/, '')).length
  );
}

/** True when `value`, rounded to the literal's own digits, is the literal. */
export function reproduces(value, literal) {
  return (
    Number.isFinite(value) &&
    Number(value.toPrecision(significantDigits(literal))) === literal
  );
}

/**
 * Findings for the rule: a literal in none of the three tables, and an
 * allowlist entry that is stale (no such step, or it is checked now).
 */
export function modelCheckFindings(
  investigations,
  { models, sourced, unchecked }
) {
  const findings = [];
  const literals = numericLiterals(investigations);
  const known = new Set(literals.map(l => l.key));
  for (const l of literals) {
    if (models[l.key] || sourced[l.key] || unchecked[l.key]) continue;
    findings.push({
      where: l.lesson,
      step: l.index,
      message: `the numeric answer ${l.step.answer} is a literal that nothing checks: recompute it from the lesson's own model in MODELS, give it a published source in SOURCED (tools/authoring/modelChecked.mjs), or - only with a justification - allowlist it`,
    });
  }
  for (const [key, why] of Object.entries(unchecked)) {
    const [lesson] = key.split('/');
    if (!known.has(key)) {
      findings.push({
        where: lesson,
        step: null,
        message: `the unchecked allowlist names ${key}, which is not a numeric literal in this catalog: remove it`,
      });
    } else if (models[key] || sourced[key]) {
      findings.push({
        where: lesson,
        step: null,
        message: `${key} is checked now: remove it from the unchecked allowlist, which only shrinks`,
      });
    } else if (typeof why !== 'string' || why.trim().length < 20) {
      findings.push({
        where: lesson,
        step: null,
        message: `${key} is allowlisted without a justification`,
      });
    }
  }
  for (const [key, entry] of Object.entries(sourced)) {
    const ok =
      Array.isArray(entry.sources) &&
      entry.sources.length > 0 &&
      entry.sources.every(s => s.text && (s.doi || s.bibcode || s.url));
    if (!ok) {
      findings.push({
        where: key.split('/')[0],
        step: null,
        message: `${key}: a sourced value needs sources [{text, doi | bibcode | url}]`,
      });
    }
  }
  return findings;
}

/** Recomputed from the lesson's own kernel; filled in by the conversions. */
export const MODELS = {};

/** Carries a published source. */
export const SOURCED = {};

/** The ceiling the allowlist may never exceed: its size when the rule landed. */
export const UNCHECKED_CEILING = 34;

/** Not yet recomputed or sourced, each with the reason. */
export const UNCHECKED = {
  'keplers-laws/use-the-law':
    'Not yet recomputed: the answer is a hand-worked literal (8 years) that no test derives from the model.',
  'keplers-laws/weighing-another-star':
    'Not yet recomputed: the answer is a hand-worked literal (0.91 M_sun) that no test derives from the model.',
  'retrograde-motion/how-often-does-earth-catch':
    'Not yet recomputed: the answer is a hand-worked literal (780 days) that no test derives from the model.',
  'retrograde-motion/a-lap-gained':
    'Not yet recomputed: the answer is a hand-worked literal (783 days) that no test derives from the model.',
  'retrograde-motion/counting-the-machinery':
    'Not yet recomputed: the answer is a hand-worked literal (20 devices) that no test derives from the model.',
  'transit-photometry/from-a-depth-to-a':
    'Not yet recomputed: the answer is a hand-worked literal (0.1) that no test derives from the model.',
  'transit-photometry/how-lucky-do-you-have':
    'Not yet recomputed: the answer is a hand-worked literal (215 to one) that no test derives from the model.',
  'black-holes/where-the-room-comes-from':
    'Not yet recomputed: the answer is a hand-worked literal (9 zeros) that no test derives from the model.',
  'radial-velocity/weigh-hd-209458-b':
    'Not yet recomputed: the answer is a hand-worked literal (0.69 M_J) that no test derives from the model.',
  'radial-velocity/how-dense-is-it':
    'Not yet recomputed: the answer is a hand-worked literal (0.33 g/cm³) that no test derives from the model.',
  'goldilocks-question/writing-it-down-then-using':
    'Not yet recomputed: the answer is a hand-worked literal (0.111 Earths) that no test derives from the model.',
  'goldilocks-question/venus-by-the-rule-you':
    'Not yet recomputed: the answer is a hand-worked literal (1.92 Earths) that no test derives from the model.',
  'missing-mass/how-much-of-it-is':
    'Not yet recomputed: the answer is a hand-worked literal (3.4 ×) that no test derives from the model.',
  'missing-mass/weigh-the-cluster-by-its':
    'Not yet recomputed: the answer is a hand-worked literal (1756 M☉) that no test derives from the model.',
  'missing-mass/now-compare':
    'Not yet recomputed: the answer is a hand-worked literal (18.3 ×) that no test derives from the model.',
  'missing-mass/the-prediction-mond-makes':
    'Not yet recomputed: the answer is a hand-worked literal (136 km/s) that no test derives from the model.',
  'tides/how-steeply-does-it-fall':
    'Not yet recomputed: the answer is a hand-worked literal (8 ×) that no test derives from the model.',
  'tides/where-the-balance-tips':
    'Not yet recomputed: the answer is a hand-worked literal (1.5 Earth radii) that no test derives from the model.',
  'butterfly-effect/linear-in-numbers':
    'Not yet recomputed: the answer is a hand-worked literal (1000000 km) that no test derives from the model.',
  'butterfly-effect/how-long-does-a-prediction':
    'Not yet recomputed: the answer is a hand-worked literal (95 simulated seconds) that no test derives from the model.',
  'when-orbits-lock/what-180-means':
    'Not yet recomputed: the answer is a hand-worked literal (90 degrees) that no test derives from the model.',
  'detect-this-planet/why-it-failed':
    'Not yet recomputed: the answer is a hand-worked literal (1 orbits) that no test derives from the model.',
  'detect-this-planet/how-deep-is-an-earth':
    'Not yet recomputed: the answer is a hand-worked literal (84 ppm) that no test derives from the model.',
  'binary-star-planets/work-out-the-boundary':
    'Not yet recomputed: the answer is a hand-worked literal (0.177) that no test derives from the model.',
  'binary-star-planets/circumbinary-boundary':
    'Not yet recomputed: the answer is a hand-worked literal (3.605) that no test derives from the model.',
  'gravity-assist/the-ceiling':
    'Not yet recomputed: the answer is a hand-worked literal (8.686 km/s) that no test derives from the model.',
  'hohmann-transfer/transfer-semi-major':
    'Not yet recomputed: the answer is a hand-worked literal (1.75 AU) that no test derives from the model.',
  'hohmann-transfer/vis-viva-departure':
    'Not yet recomputed: the answer is a hand-worked literal (35.6 km/s) that no test derives from the model.',
  'hohmann-transfer/first-burn-size':
    'Not yet recomputed: the answer is a hand-worked literal (5.815 km/s) that no test derives from the model.',
  'hohmann-transfer/transfer-time':
    'Not yet recomputed: the answer is a hand-worked literal (422.7 days) that no test derives from the model.',
  'hohmann-transfer/second-burn-size':
    'Not yet recomputed: the answer is a hand-worked literal (4.598 km/s) that no test derives from the model.',
  'hohmann-transfer/total-cost':
    'Not yet recomputed: the answer is a hand-worked literal (10.41 km/s) that no test derives from the model.',
  'lagrange-points/l4-distance':
    'Not yet recomputed: the answer is a hand-worked literal (1) that no test derives from the model.',
  'power-law-gravity/predict-the-slope':
    'Not yet recomputed: the answer is a hand-worked literal (1.95) that no test derives from the model.',
};
