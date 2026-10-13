// The two arms' period searches, run in the inference Worker.
//
// js/rvCompare.js searched both arms on the page, and a long schedule makes
// each search take seconds (a 400-epoch run over ten years is 20,000 solves).
// The search is the one the Worker already answers for the workspace
// (js/inference/rvTasks.js), so the numbers are the page's own. Kept out of
// rvCompare.js so the comparison's arithmetic stays Worker-free for its tests.

import { MODEL_PARAMETERS, usablePoints } from './inference/rvCircular.js';
import { runRv } from './inference/rvClient.js';

/**
 * Both arms' period searches, side by side.
 *
 * The search describeArm would run (null for an arm with too few usable
 * points). The Worker applies the default fitting policy, so a caller that
 * keeps degraded points must search on the page instead.
 *
 * @param {Array<object>} arms - {measurements}, A then B
 * @param {{minPeriod: number, maxPeriod: number, samples?: number}} bounds
 * @returns {Promise<Array<?object>>} One result per arm; rejects if a realm fails
 */
export function searchArms(arms, bounds) {
  const { minPeriod, maxPeriod, samples } = bounds;
  return Promise.all(
    arms.map(arm => {
      const { usable } = usablePoints(arm.measurements);
      if (usable.length <= MODEL_PARAMETERS) return null;
      return runRv('rv-search', {
        points: usable,
        bounds: { minPeriod, maxPeriod, samples },
      });
    })
  );
}
