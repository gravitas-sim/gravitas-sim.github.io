// =============================================================================
// How a task ended, and whether a realm's answer is a trial's result
// -----------------------------------------------------------------------------
// Split from ./experimentManifest.js, which re-exports both, so that
// ./scheduler.js can have them without the manifest's validation and its CSV
// writer. The scheduler also runs the inference core's tasks (js/inference/
// run.js), from a panel that must not reach the modules its page starts with.
// =============================================================================

import { TRIAL_STATUS } from './sweep.js';

/**
 * How a trial ended: the sweep's statuses, and what only a scheduler can see.
 */
export const STATUS = Object.freeze({
  ...TRIAL_STATUS,
  /** It ran past its time limit and its realm was terminated. */
  TIMEOUT: 'timeout',
  /** Its realm answered with something that is not a trial result. */
  CORRUPT: 'corrupt',
  /** Its realm failed to start, or died without answering. */
  WORKER_FAILED: 'workerFailed',
  /** Its result was larger than the experiment allows, and was not kept. */
  RESOURCE_LIMIT: 'resourceLimit',
});

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Is this what a realm should have sent back for this trial? */
export function isTrialResult(r, trial, metrics) {
  if (!isObject(r) || r.index !== trial.index || r.seed !== trial.seed)
    return false;
  if (typeof r.status !== 'string' || !Object.values(STATUS).includes(r.status))
    return false;
  if (!isObject(r.results) || !isObject(r.series)) return false;
  for (const id of metrics) {
    const v = r.results[id];
    if (!(v === null || Number.isFinite(v))) return false;
    if (!Array.isArray(r.series[id])) return false;
  }
  return Number.isInteger(r.steps) && r.steps >= 0;
}
