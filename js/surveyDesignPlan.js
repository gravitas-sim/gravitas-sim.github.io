// =============================================================================
// The verdict of a plan step (Prompt 215, SURVEY_DESIGN.md)
// -----------------------------------------------------------------------------
// A measure step that carries `plan` is open-ended: its fields are a plan (a facility,
// an exposure, visits, nights, a threshold) and what the student says it reaches (the
// depth and the number of sources). There is no single right plan. The step is judged by
// the survey kernel: the plan must be FEASIBLE for the step's goal (depth, area, optionally
// a reliability), and the student's stated depth and count must agree with what the kernel
// says THIS plan reaches, within the step's tolerances. Many different plans pass; the
// instructor's key states the rule, not a plan (js/answerKey.js).
//
// A lazy module: the lesson engine loads it only for a lesson with a plan step, and the
// verdict is then a synchronous call (js/investigations.js validateStep).
// Pure: no DOM.
// =============================================================================

import { t, registerMessages } from './i18n/index.js';
import { EN_SURVEYDESIGN } from './i18n/en.surveyDesign.js';
import { ES_SURVEYDESIGN } from './i18n/es.surveyDesign.js';
import { CLASSES, assess, evaluate } from './kernels/survey/index.js';
import { FACILITIES, inSky, setupAt } from './surveyDesignField.js';
import { fixed } from './format.js';

registerMessages('en', EN_SURVEYDESIGN);
registerMessages('es', ES_SURVEYDESIGN);

const { Math } = globalThis;

/** The fields every plan step has, in the order the form shows them. */
export const PLAN_FIELDS = Object.freeze([
  'facility',
  'exposure',
  'visits',
  'nights',
  'threshold',
  'depth',
  'n',
]);

const say = (level, message) => ({ level, message });

/**
 * @param {object} step - a measure step with `plan: {class, goal:{depth, areaDeg2, minReliability?}, tolerance:{depth, countsPct}}`
 * @param {object} v - the field values (numbers)
 * @returns {{level:string, message:string}|null} null until every field is a number
 */
export function planVerdict(step, v) {
  if (!PLAN_FIELDS.every(k => Number.isFinite(v[k]))) return null;
  const i = Math.round(v.facility) - 1;
  if (!(i >= 0 && i < FACILITIES.length))
    return say('error', t('sdP.badFacility', { n: FACILITIES.length }));
  const visits = Math.round(v.visits);
  const cls = CLASSES[step.plan.class];
  const setup = setupAt(i).setup;
  const plan = inSky(
    { exposure: v.exposure, visits, nights: v.nights, threshold: v.threshold },
    setup
  );
  const r = evaluate({ setup, plan, cls });
  if (!r.ok)
    return say('error', t('sdP.refused', { code: t(`sdP.code.${r.code}`) }));
  const goal = step.plan.goal;
  if (goal.maxNights && v.nights > goal.maxNights)
    return say('error', t('sdP.tooManyNights', { n: goal.maxNights }));
  const verdict = assess(r, goal);
  if (!verdict.feasible)
    return say(
      'error',
      t('sdP.notFeasible', {
        why: verdict.reasons.map(c => t(`sdW.reason.${c}`)).join('; '),
        d: fixed(r.depth, 1),
        a: fixed(r.areaDeg2, r.areaDeg2 < 100 ? 1 : 0),
      })
    );
  const tol = step.plan.tolerance;
  const dOk = Math.abs(v.depth - r.depth) <= tol.depth;
  const nOk =
    Math.abs(v.n - r.counts.perDeg2.detected) <=
    (tol.countsPct / 100) * r.counts.perDeg2.detected;
  if (!dOk || !nOk)
    return say(
      'warn',
      t('sdP.inconsistent', {
        what: [dOk ? '' : t('sdP.what.depth'), nOk ? '' : t('sdP.what.n')]
          .filter(Boolean)
          .join(` ${t('sdP.and')} `),
      })
    );
  return say(
    'ok',
    t('sdP.ok', {
      d: fixed(r.depth, 1),
      a: fixed(r.areaDeg2, r.areaDeg2 < 100 ? 1 : 0),
      f: fixed(r.counts.falsePositives, 0),
      r: fixed(100 * r.counts.reliability, 1),
    })
  );
}
