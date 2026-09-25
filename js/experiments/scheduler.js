// =============================================================================
// Run an experiment's trials in disposable Worker realms, within limits
// -----------------------------------------------------------------------------
// Each trial gets a fresh Worker (js/experiments/experimentWorker.js), which is
// terminated the moment it answers. That is the whole isolation story: no
// trial can inherit another's id counter, conservation baseline or caches,
// because no two trials ever share a realm (MULTI_WORLD_DECISION.md).
//
// What this adds on top of "start a Worker":
//
//   concurrency    at most N realms at once, N from the device profile
//   ordering       results are reported by trial index, whatever order they
//                  finish in, so two runs of one manifest are comparable
//                  line by line
//   progress       every trial's fraction, and the run's
//   cancellation   every running realm terminated, every queued trial
//                  reported as canceled rather than dropped
//   timeouts       a trial past its limit is terminated and reported; the
//                  whole run stops at its own limit and says it did
//   result caps    a trial whose answer would take the run past its byte
//                  budget keeps its status and loses its numbers
//   corruption     an answer that is not a trial result is a status, not an
//                  exception
//   checkpoints    trials already finished (from an earlier, interrupted run
//                  of the same manifest) are not run again
//
// Checkpoints are per trial and nothing finer. Trials are independent and
// each is a pure function of the manifest, its parameters and its seed, so a
// finished trial is a finished fact; the state inside a running realm is a
// physics world that has no serialization, so a trial interrupted halfway is
// run again from the start. Only real outcomes are kept - a trial that was
// canceled, timed out or lost its realm is a scheduling event, not a result.
//
// Workers are made by an injected `spawn`, so the tests can hand it realms
// that hang, answer garbage or die, and the page hands it the real thing.
// =============================================================================

import { STATUS, isTrialResult } from './experimentManifest.js';

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
 * @param {object} opts
 * @param {object} opts.manifest - A validated gravitas.experiment/1
 * @param {Array<object>} opts.trials - planTrials(manifest)
 * @param {() => {postMessage: Function, terminate: Function}} opts.spawn
 * @param {number} opts.concurrency - Realms at once
 * @param {Array<object>} [opts.completed] - Results from a checkpoint
 * @param {(result: object) => void} [opts.onTrial] - Each trial, as it ends
 * @param {(state: object) => void} [opts.onProgress] - After any change
 * @param {Function} [opts.now] - A clock in milliseconds
 * @param {Function} [opts.setTimer] - setTimeout, injectable for tests
 * @param {Function} [opts.clearTimer] - clearTimeout
 */
export function createScheduler(opts) {
  const {
    manifest,
    trials,
    spawn,
    concurrency,
    onTrial = () => {},
    onProgress = () => {},
    now = () => Date.now(),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = id => clearTimeout(id),
  } = opts;
  const limits = manifest.limits;
  const metrics = manifest.observables.metrics;
  const results = new Map();
  const resumed = new Set();
  for (const r of opts.completed || []) {
    const trial = trials[r?.index];
    if (
      trial &&
      RESUMABLE.includes(r.status) &&
      isTrialResult(r, trial, metrics)
    ) {
      results.set(r.index, r);
      resumed.add(r.index);
    }
  }
  const queue = trials.filter(t => !results.has(t.index));
  const active = new Map();
  let bytes = [...results.values()].reduce(
    (n, r) => n + JSON.stringify(r).length,
    0
  );
  let state = 'idle';
  let stopReason = null;
  let finish = null;
  let totalTimer = null;
  let startedAt = null;

  const snapshot = () => ({
    state,
    stopReason,
    total: trials.length,
    done: results.size,
    resumed: resumed.size,
    running: [...active.values()].map(a => ({
      index: a.trial.index,
      fraction: a.fraction,
    })),
    queued: queue.length,
    bytes,
    elapsedMs: startedAt === null ? 0 : now() - startedAt,
    fraction:
      (results.size +
        [...active.values()].reduce((s, a) => s + a.fraction, 0)) /
      (trials.length || 1),
  });

  function settle(trial, result) {
    const slot = active.get(trial.index);
    if (!slot || slot.settled) return;
    slot.settled = true;
    clearTimer(slot.timer);
    try {
      slot.worker.terminate();
    } catch {
      /* already gone */
    }
    active.delete(trial.index);
    // A realm's whole life, start-up and imports included, beside the
    // trial's own timing: the difference is what one Worker per trial costs.
    let out = { ...result, realmMs: Math.round(now() - slot.startedAt) };
    const size = JSON.stringify(out).length;
    if (bytes + size > limits.maxResultBytes) {
      out = stub(trial, STATUS.RESOURCE_LIMIT, {
        error: `its result (${size} bytes) would take the run past ${limits.maxResultBytes} bytes`,
        steps: result.steps || 0,
      });
    }
    bytes += JSON.stringify(out).length;
    results.set(trial.index, out);
    onTrial(out);
    onProgress(snapshot());
    pump();
  }

  function launch(trial) {
    let worker;
    try {
      worker = spawn();
    } catch (err) {
      results.set(
        trial.index,
        stub(trial, STATUS.WORKER_FAILED, {
          error: String(err?.message || err),
        })
      );
      onTrial(results.get(trial.index));
      return;
    }
    const slot = {
      trial,
      worker,
      fraction: 0,
      settled: false,
      timer: null,
      startedAt: now(),
    };
    active.set(trial.index, slot);
    slot.timer = setTimer(() => {
      settle(
        trial,
        stub(trial, STATUS.TIMEOUT, {
          error: `still running after ${limits.trialTimeoutMs} ms`,
          wallMs: Math.round(now() - slot.startedAt),
        })
      );
    }, limits.trialTimeoutMs);
    worker.onmessage = e => {
      const msg = e?.data;
      if (slot.settled) return;
      if (msg?.type === 'progress' && Number.isFinite(msg.fraction)) {
        slot.fraction = Math.max(0, Math.min(1, msg.fraction));
        onProgress(snapshot());
      } else if (msg?.type === 'result') {
        settle(
          trial,
          isTrialResult(msg.result, trial, metrics)
            ? msg.result
            : stub(trial, STATUS.CORRUPT, {
                error:
                  'the realm answered with something that is not this trial’s result',
              })
        );
      } else if (msg?.type === 'error') {
        settle(
          trial,
          stub(trial, STATUS.WORKER_FAILED, {
            error: String(msg.message || 'the realm failed'),
          })
        );
      } else {
        settle(
          trial,
          stub(trial, STATUS.CORRUPT, {
            error: 'the realm sent a message this scheduler does not know',
          })
        );
      }
    };
    worker.onerror = e => {
      e?.preventDefault?.();
      settle(
        trial,
        stub(trial, STATUS.WORKER_FAILED, {
          error: String(e?.message || 'the realm did not start'),
        })
      );
    };
    worker.onmessageerror = () =>
      settle(
        trial,
        stub(trial, STATUS.CORRUPT, {
          error: 'the realm’s answer could not be read',
        })
      );
    worker.postMessage({ type: 'run', manifest, trial });
  }

  function pump() {
    if (state !== 'running') return;
    while (active.size < concurrency && queue.length) launch(queue.shift());
    if (!active.size && !queue.length) end(stopReason ? 'partial' : 'complete');
  }

  function stopAll(status, reason) {
    // The queue first: settling a running trial pumps, and a pump with
    // anything still queued would start it in the middle of stopping.
    while (queue.length) {
      const t = queue.shift();
      results.set(t.index, stub(t, STATUS.CANCELED, { error: reason }));
      onTrial(results.get(t.index));
    }
    for (const slot of [...active.values()]) {
      settle(slot.trial, stub(slot.trial, status, { error: reason }));
    }
  }

  function end(final) {
    if (state === 'finished') return;
    state = 'finished';
    clearTimer(totalTimer);
    const ordered = trials.map(t => results.get(t.index));
    const out = {
      status: final,
      stopReason,
      trials: ordered,
      resumed: [...resumed].sort((a, b) => a - b),
      elapsedMs: now() - startedAt,
      bytes,
    };
    onProgress(snapshot());
    finish?.(out);
  }

  return {
    /** Start, and resolve when every trial has an outcome. */
    run() {
      if (state !== 'idle') throw new Error('a scheduler runs once');
      state = 'running';
      startedAt = now();
      return new Promise(resolve => {
        finish = resolve;
        totalTimer = setTimer(() => {
          stopReason = `the run reached its limit of ${limits.totalTimeoutMs} ms`;
          stopAll(STATUS.TIMEOUT, stopReason);
          pump();
        }, limits.totalTimeoutMs);
        onProgress(snapshot());
        pump();
      });
    },
    /** Stop everything now. What finished is kept; the rest is canceled. */
    cancel(reason = 'canceled by the reader') {
      if (state !== 'running') return;
      stopReason = reason;
      state = 'stopping';
      stopAll(STATUS.CANCELED, reason);
      state = 'running';
      end('canceled');
    },
    state: snapshot,
  };
}
