// =============================================================================
// A whole inference, spread across disposable Worker realms
// -----------------------------------------------------------------------------
// Two stages, each through the experiment scheduler (js/experiments/
// scheduler.js), so a fit gets the same bounds an experiment does: at most so
// many realms at once, a timeout per task and for the whole, cancellation that
// terminates every realm, and progress.
//
//   1. The fit, in one realm (./infer.js fitOnce): the grid, the refinement,
//      the covariance and the warnings.
//   2. One profile per fitted parameter, spread across realms: each re-fits
//      every other parameter at a row of values, which is most of the work,
//      and independent.
//
// The page never runs the model itself. Nothing here is a world the
// simulation shows, and MULTI_WORLD_DECISION.md holds: a realm is a Worker,
// not an engine instance.
// =============================================================================

import { createScheduler } from '../experiments/scheduler.js';

const accept = (r, task) =>
  r &&
  typeof r === 'object' &&
  r.index === task.index &&
  typeof r.status === 'string';

/** What a profile needs of the fit, without its residual arrays. */
const slim = fit => ({
  parameters: fit.parameters,
  chi2: fit.chi2,
  reducedChi2: fit.reducedChi2,
  scaled: fit.scaled,
  weighted: fit.weighted,
  nuisance: fit.nuisance,
});

/**
 * @param {{request: object, data: object, spawn: Function,
 *   concurrency: number, limits: object, profiles?: boolean,
 *   onProgress?: Function, now?: Function}} opts
 * @returns {{done: Promise<object>, cancel: Function}}
 */
export function runInference(opts) {
  const {
    request,
    data,
    spawn,
    concurrency,
    limits,
    profiles = true,
    onProgress = () => {},
    now,
  } = opts;
  let current = null;
  let canceled = false;
  const manifest = { limits };
  const stage = async (tasks, message, width, from, to) => {
    current = createScheduler({
      manifest,
      trials: tasks,
      spawn,
      concurrency: width,
      accept,
      message,
      now,
      onProgress: s =>
        onProgress({
          stage: from === 0 ? 'fit' : 'profiles',
          fraction: from + (to - from) * s.fraction,
          running: s.running.length,
          done: s.done,
          total: s.total,
        }),
    });
    return current.run();
  };
  const done = (async () => {
    const t0 = (now || (() => Date.now()))();
    const a = await stage(
      [{ index: 0, task: 'fit' }],
      t => ({ type: 'run', task: 'fit', index: t.index, request, data }),
      1,
      0,
      profiles ? 0.25 : 1
    );
    const fit = a.trials[0];
    if (canceled) return { status: 'canceled', fit: null, profiles: [] };
    if (fit.status !== 'ok')
      return { status: fit.status, error: fit.error, fit: null, profiles: [] };
    if (!profiles || !fit.free.length)
      return {
        status: 'ok',
        fit,
        profiles: [],
        wallMs: (now || Date.now)() - t0,
      };
    const tasks = fit.free.map((name, index) => ({
      index,
      task: 'profile',
      parameter: name,
    }));
    const b = await stage(
      tasks,
      t => ({
        type: 'run',
        task: 'profile',
        index: t.index,
        parameter: t.parameter,
        request,
        data,
        fit: slim(fit),
      }),
      Math.min(concurrency, tasks.length),
      0.25,
      1
    );
    return {
      status: canceled ? 'canceled' : b.status === 'complete' ? 'ok' : b.status,
      fit,
      profiles: b.trials,
      wallMs: (now || Date.now)() - t0,
    };
  })();
  return {
    done,
    cancel(reason = 'canceled') {
      canceled = true;
      current?.cancel(reason);
    },
  };
}
