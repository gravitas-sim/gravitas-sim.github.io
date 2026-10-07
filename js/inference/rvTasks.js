// =============================================================================
// The circular radial-velocity fit, as inference tasks
// -----------------------------------------------------------------------------
// What js/inference/inferenceWorker.js runs for the sandbox RV workspace
// (js/rvWorkspace.js), through the scheduler (./rvClient.js): the period search
// and the fit at one period of the `rv-circular` model (./rvCircular.js), and
// its `monte-carlo-refit` uncertainty (./rvMonteCarlo.js). The code is the
// code the workspace ran on its own thread before the move, unchanged, so a
// recording gives the same digits (tests/rvCircularMove.test.js holds that
// against results written before the move).
//
// Task messages carry the recording's points as the workspace holds them and
// the realm applies the same usablePoints() split the panel shows.
// =============================================================================

import { fitAtPeriod, periodSearch, usablePoints } from './rvCircular.js';
import { runMonteCarlo } from './rvMonteCarlo.js';

/**
 * The model, as the inference core names it (INFERENCE_CORE.md). Not in
 * ./models.js's registry, which is what the Observatory's fit panel offers and
 * which its Levenberg-Marquardt engine fits: this one is solved in closed form
 * at each period of a grid, in ./rvCircular.js, by `grid-linear` 1.0.0.
 */
export const RV_CIRCULAR = Object.freeze({
  id: 'rv-circular',
  version: '1.0.0',
  quantity: 'radial velocity against time',
  parameters: Object.freeze([
    { name: 'period', kind: 'searched' },
    { name: 'K', kind: 'linear', note: 'hypot(A, B)' },
    { name: 'phase', kind: 'linear', note: 'atan2(A, B)' },
    { name: 'gamma', kind: 'linear' },
  ]),
  uncertainty: Object.freeze({ id: 'monte-carlo-refit', version: '1.0.0' }),
});

/** The task kinds this module answers. */
export const RV_TASKS = Object.freeze(['rv-search', 'rv-fit', 'rv-mc']);

/**
 * @param {{task: string, index: number, request: object}} msg
 * @param {object} [hooks] - onProgress({done, total}), shouldCancel, yieldTo
 * @returns {Promise<object>} `{ status: 'ok', result }`; result is null when
 *   the search or fit cannot be done (bad bounds, fewer than three points)
 */
export async function runRvTask({ task, request }, hooks = {}) {
  if (task === 'rv-mc') {
    return { status: 'ok', result: await runMonteCarlo(request.spec, hooks) };
  }
  const { usable } = usablePoints(request.points || []);
  return {
    status: 'ok',
    result:
      task === 'rv-search'
        ? periodSearch(usable, request.bounds)
        : fitAtPeriod(usable, request.period),
  };
}
