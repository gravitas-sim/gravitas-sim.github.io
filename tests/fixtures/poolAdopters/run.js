// A whole inference on the Worker pool (Prompt 153): the file
// js/inference/run.js becomes when the adoption lands. Two stages, each a run
// on the pool, so a fit gets what any pool job gets: at most so many realms at
// once, a timeout per job and for the whole, cancellation that terminates every
// realm, progress, a memory declaration against the page's aggregate cap, and
// a generation, so a newer inference on the same channel ends this one "stale"
// instead of letting two answer a panel that shows one.
//
//   1. The fit, in one realm (infer.js fitOnce).
//   2. One profile per fitted parameter (infer.js profileTask), spread across
//      realms, independent, started in parameter order whatever finishes first.
//
// The page never runs the model itself.

import { createPool } from '../../../js/workers/pool.js';

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

/** The record of a task that gave no result: what it was, and why not. */
const failed = (task, status, extra) => ({
  index: task.index,
  task: task.task,
  parameter: task.parameter,
  status,
  ...extra,
});

/**
 * What one inference realm holds: the Worker and the inference core's modules,
 * and the observation's columns and the fit's work arrays, 8 bytes a value.
 * `perRow` and `base` are measured (INFERENCE_CORE.md, tools/worker-probe.mjs).
 */
export const realmBytes = (rows, free, { base = 6e6, perRow = 8 } = {}) =>
  base + rows * perRow * (4 + 2 * free);

/**
 * @param {{request: object, data: object, spawn: Function,
 *   concurrency: number, limits: object, profiles?: boolean,
 *   caps?: {memoryBytes?: number, jobBytes?: number}, pool?: object,
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
    caps = {},
    onProgress = () => {},
    now,
  } = opts;
  const pool = opts.pool || createPool({ spawn, concurrency, now, ...caps });
  let current = null;
  let canceled = false;
  const rows = data?.x?.length || 0;
  const stage = async (tasks, message, memoryBytes, from, to) => {
    current = pool.batch(
      tasks.map(t => ({ ...t, memoryBytes })),
      {
        channel: 'inference',
        deterministic: true,
        noun: 'trial',
        owner: 'scheduler',
        accept,
        message,
        outcome: failed,
        totalTimeoutMs: limits.totalTimeoutMs,
        jobTimeoutMs: limits.trialTimeoutMs,
        maxResultBytes: limits.maxResultBytes,
        onProgress: s =>
          onProgress({
            stage: from === 0 ? 'fit' : 'profiles',
            fraction: from + (to - from) * s.fraction,
            running: s.running.length,
            done: s.done,
            total: s.total,
          }),
      }
    );
    return current.run();
  };
  const done = (async () => {
    const t0 = (now || (() => Date.now()))();
    const free = Object.keys(request?.parameters || {}).length || 8;
    const a = await stage(
      [{ index: 0, task: 'fit' }],
      t => ({ type: 'run', task: 'fit', index: t.index, request, data }),
      realmBytes(rows, free),
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
      realmBytes(rows, fit.free.length),
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
