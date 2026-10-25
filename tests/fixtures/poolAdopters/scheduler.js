// The experiment scheduler as a client of the Worker pool (Prompt 153): the
// file js/experiments/scheduler.js becomes when the adoption lands. Every
// behaviour the scheduler had (ordering by trial index, a timeout per trial and
// for the run, the result byte cap, cancellation that terminates every realm,
// checkpoints) is the pool's; what stays here is what only an experiment has:
// the shape of a trial that did not run, which statuses a checkpoint may keep,
// and what a trial's result is. tests/workerPoolAdoption.test.js holds it to
// the scheduler it replaces, outcome for outcome.

import { createPool } from '../../../js/workers/pool.js';
import { STATUS, isTrialResult } from '../../../js/experiments/status.js';

/** Statuses a checkpoint may keep: outcomes of the physics, not of scheduling. */
export const RESUMABLE = Object.freeze([
  STATUS.OK,
  STATUS.BUILD_FAILED,
  STATUS.BODIES_MISSING,
  STATUS.NOT_FINITE,
  STATUS.LOST_BODY,
  STATUS.CAPPED,
  STATUS.STALLED,
]);

/** A trial that did not run, or whose realm did not give an answer. */
function stub(trial, status, extra = {}) {
  return {
    index: trial.index,
    params: trial.params,
    seed: trial.seed,
    status,
    results: {},
    kinds: {},
    series: {},
    frames: 0,
    steps: 0,
    samples: 0,
    simTime: 0,
    wallMs: 0,
    numerics: null,
    ...extra,
  };
}

/**
 * @param {object} opts - As the scheduler always took them, plus `pool` (an
 *   existing createPool, to share its caps and ledger) and `memoryBytes`, what
 *   a trial's realm is held to
 */
export function createScheduler(opts) {
  const { manifest, trials, spawn, concurrency, pool } = opts;
  const limits = manifest.limits;
  const metrics = manifest.observables?.metrics || [];
  const accept =
    opts.accept || ((r, trial) => isTrialResult(r, trial, metrics));
  const completed = (opts.completed || []).filter(r => {
    const trial = trials[r?.index];
    return trial && RESUMABLE.includes(r.status) && accept(r, trial);
  });
  return (
    pool ||
    createPool({
      spawn,
      concurrency,
      defaultJobBytes: opts.memoryBytes,
      now: opts.now,
      setTimer: opts.setTimer,
      clearTimer: opts.clearTimer,
    })
  ).batch(trials, {
    deterministic: true,
    noun: 'trial',
    owner: 'scheduler',
    accept,
    message: opts.message || (trial => ({ type: 'run', manifest, trial })),
    outcome: (trial, status, extra, from) =>
      stub(
        trial,
        status,
        status === STATUS.RESOURCE_LIMIT
          ? { ...extra, steps: from?.steps || 0 }
          : extra
      ),
    completed,
    totalTimeoutMs: limits.totalTimeoutMs,
    jobTimeoutMs: limits.trialTimeoutMs,
    maxResultBytes: limits.maxResultBytes,
    onJob: opts.onTrial,
    onProgress: opts.onProgress,
  });
}
