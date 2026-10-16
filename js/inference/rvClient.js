// =============================================================================
// The RV workspace's way to the inference core
// -----------------------------------------------------------------------------
// One task, one disposable inference Worker, through the experiment scheduler
// (js/experiments/scheduler.js) with the same timeout, progress and result
// limits every inference task gets (./run.js). The page never runs the
// circular model itself: the period search, the fit at a period and the Monte
// Carlo all run in js/inference/inferenceWorker.js.
//
// A reader's cancel is a message to the realm, not a terminate, so a Monte
// Carlo answers with the trials it had finished; the scheduler's own cancel
// stays as the backstop if the realm does not answer.
// =============================================================================

import { createScheduler } from '../experiments/scheduler.js';

const LIMITS = Object.freeze({
  trialTimeoutMs: 900_000,
  totalTimeoutMs: 900_000,
  maxResultBytes: 64_000_000,
});

/** How long a canceled realm gets to answer before it is terminated. */
const GRACE_MS = 3000;

let spawnOverride = null;

/**
 * Replace the realm factory. For tests, which have no Workers: they hand in an
 * object that answers like inferenceWorker.js does.
 *
 * @param {?Function} fn - () => {postMessage, terminate, onmessage}, or null
 */
export const setRvSpawn = fn => {
  spawnOverride = fn;
};

// Against the page, as the Observatory's fit panel does: in dist/ this module
// is a hashed chunk, in the sources it is in js/inference/, and the page is in
// the same place in both.
const defaultSpawn = () =>
  new Worker(new URL('js/inference/inferenceWorker.js', document.baseURI), {
    type: 'module',
  });

/**
 * @param {'rv-search'|'rv-fit'|'rv-mc'} task
 * @param {object} request - What the task reads (./rvTasks.js)
 * @param {{onProgress?: Function, shouldCancel?: Function}} [hooks]
 *   onProgress({done, total}) for a Monte Carlo; shouldCancel is polled on
 *   each report
 * @returns {Promise<?object>} The task's result, which may be null (no fit
 *   possible); rejects when the realm failed, timed out or was lost
 */
export async function runRv(task, request, hooks = {}) {
  const { onProgress, shouldCancel } = hooks;
  let realm = null;
  let asked = false;
  let timer = null;
  const spawn = () => {
    realm = (spawnOverride || defaultSpawn)();
    return realm;
  };
  const run = createScheduler({
    manifest: { limits: LIMITS },
    trials: [{ index: 0, task }],
    spawn,
    concurrency: 1,
    accept: r => r && r.index === 0 && typeof r.status === 'string',
    message: t => ({ type: 'run', task, index: t.index, request }),
    onProgress: s => {
      const f = s.running[0]?.fraction;
      if (f === undefined) return;
      onProgress?.({ fraction: f });
      if (shouldCancel?.() && !asked) {
        asked = true;
        realm?.postMessage({ type: 'cancel' });
        timer = setTimeout(() => run.cancel(), GRACE_MS);
      }
    },
  });
  const out = await run.run();
  clearTimeout(timer);
  const r = out.trials[0];
  if (r.status !== 'ok')
    throw new Error(`${task}: ${r.status} ${r.error || ''}`);
  return r.result;
}

/**
 * The workspace's uncertainty analysis, through the core.
 *
 * @param {object} spec - points, params, minPeriod, maxPeriod, trials, seed
 * @param {{onProgress?: Function, shouldCancel?: Function}} [hooks]
 *   onProgress({done, total}) as batches finish
 * @returns {Promise<object>} The report, or a refusal (./rvMonteCarlo.js)
 */
export function runMonteCarlo(spec, hooks = {}) {
  const total = Math.trunc(Number(spec.trials));
  return runRv(
    'rv-mc',
    { spec },
    {
      shouldCancel: hooks.shouldCancel,
      onProgress: ({ fraction }) =>
        hooks.onProgress?.({ done: Math.round(fraction * total), total }),
    }
  );
}
