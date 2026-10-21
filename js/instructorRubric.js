// =============================================================================
// What a rubric criterion claims (Prompt 172)
// -----------------------------------------------------------------------------
// A criterion of a written step (js/rubric.js, js/platform/questionBank.js) may
// say what it claims (`kind`), the depth it is marked from (`depth`) and its
// share of the step's rubric (`weight`), each written only when set. This is
// what those fields mean and how the marks entered against them are summed. It
// is named js/instructor*.js so that the service worker installs it with the
// instructor modules, in the idle tier, and not in the first visit's install
// (tools/build-service-worker.mjs): only the review page reads it.
//
// js/rubric.js, which prints the criteria in the key, is a source of the
// instructor bundle and is not edited here; the key prints names and levels,
// not kinds, until the bundle is rebuilt with that change (D-R10-38).
// =============================================================================

import { criterionKey } from './gradebook/marks.js';

/**
 * What a rubric criterion claims (Prompt 172), the `kind` of a criterion:
 *   completion   an answer is there and speaks to the question
 *   correctness  the answer agrees with the key within the step's stated
 *                tolerance (the instructor judges it; a written answer has no
 *                machine verdict)
 *   reasoning    the explanation is present and sound, judged by the instructor
 *   uncertainty  the answer says how well the quantity is known
 * A criterion with no `kind` is `reasoning`: every criterion written before the
 * field existed was levels an instructor reads and judges. The list is held
 * equal to js/platform/questionBank.js's by tests/rubricSemantics.test.js (that
 * file serves routes with no request to spare, so it keeps its own copy).
 */
export const CRITERION_KINDS = Object.freeze([
  'completion',
  'correctness',
  'reasoning',
  'uncertainty',
]);
export const DEFAULT_CRITERION_KIND = 'reasoning';

/** Depths, shallowest first (js/investigations/depthPure.js). */
const DEPTH_ORDER = ['core', 'quantitative', 'advanced'];
const depthRank = d => Math.max(0, DEPTH_ORDER.indexOf(d));

/**
 * A step's rubric criteria with their semantics filled in, those marked at
 * `depth`: a criterion with a `depth` is marked from that depth deeper, one
 * without is marked at every depth. `n` is the criterion's place among all the
 * step's criteria, whatever the depth, so a mark keeps meaning when a class
 * reads at another depth. Points possible is the best level's points, or 1 when
 * the levels carry none; `weight` is the criterion's relative share of the
 * step's rubric fraction (rubricFraction) and defaults to 1.
 *
 * Names are the lesson's text, not plain text: the caller plains them.
 *
 * @param {object} step - A step with `rubricCriteria`
 * @param {?string} [depth] - The depth the report was read at; every
 *   criterion when omitted
 * @returns {Array<{n: number, name: string, kind: string, weight: number,
 *   depth: ?string, possible: number}>}
 */
export function criteriaPlan(step, depth = null) {
  const list = Array.isArray(step?.rubricCriteria) ? step.rubricCriteria : [];
  return list
    .map((c, i) => {
      const points = (Array.isArray(c?.levels) ? c.levels : [])
        .map(l => l?.points)
        .filter(Number.isFinite);
      return {
        n: i + 1,
        name: c?.name,
        kind: CRITERION_KINDS.includes(c?.kind)
          ? c.kind
          : DEFAULT_CRITERION_KIND,
        weight: Number.isFinite(c?.weight) && c.weight > 0 ? c.weight : 1,
        depth: DEPTH_ORDER.includes(c?.depth) ? c.depth : null,
        possible: points.length ? Math.max(...points) : 1,
      };
    })
    .filter(c => !depth || depthRank(c.depth) <= depthRank(depth));
}

/**
 * The step's rubric as one fraction, from the criteria marks entered: the
 * weighted mean of each marked criterion's mark over its points possible.
 * `fraction` is null until every criterion in `plan` has a mark, so a rubric
 * with a criterion unread is partial and says so, never silently low. It
 * is a summary for a class view (Prompt 173) and is not added to the step's
 * score: the step's own mark stays the instructor's.
 *
 * @param {Map<string, object>} marks - From marksIndex()
 * @param {string} fingerprint - The report's
 * @param {string} sid - The step's
 * @param {Array<object>} plan - From criteriaPlan()
 * @returns {{fraction: ?number, marked: number, of: number,
 *   byKind: Object<string, ?number>}} `byKind` is the same fraction for the
 *   criteria of each kind present, null while one of them is unmarked
 */
export function rubricFraction(marks, fingerprint, sid, plan) {
  const part = list => {
    let top = 0;
    let marked = 0;
    for (const c of list) {
      const m = marks.get(criterionKey(fingerprint, sid, c.n));
      if (!m || m.points === null) continue;
      marked++;
      top += c.weight * (Math.min(m.points, c.possible) / c.possible);
    }
    const total = list.reduce((a, c) => a + c.weight, 0);
    return {
      marked,
      fraction: marked === list.length && list.length ? top / total : null,
    };
  };
  const all = part(plan);
  const byKind = {};
  for (const k of new Set(plan.map(c => c.kind)))
    byKind[k] = part(plan.filter(c => c.kind === k)).fraction;
  return {
    fraction: all.fraction,
    marked: all.marked,
    of: plan.length,
    byKind,
  };
}
