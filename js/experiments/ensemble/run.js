// Running an ensemble experiment, and running it again (Prompt 265).
//
// startEnsemble puts a record's trials on the Worker pool (Prompt 153,
// js/workers/pool.js): deterministic scheduling, each job carrying its own stream
// fork, a time limit per trial and for the run, a result byte cap, a memory
// declaration, progress, cancellation that keeps what finished, and resume that
// runs only what was not kept. runSerial does the same in one realm, with no pool:
// the headless form and the page's when no Worker is wanted. Both end in the same
// record, and the same digest: a trial is a function of the record and its own
// stream, so neither the order nor the realm is in the answer (tests/
// experimentEnsemble.test.js holds that).
//
// replay runs a record from its inputs alone and compares the new digest with the
// old one; reproducibility says first whether this build can be expected to agree.

import { createPool } from '../../workers/pool.js';
import { STATUS } from '../status.js';
import { REALM_BYTES } from '../experimentManifest.js';
import {
  TRIAL_LABEL,
  kernelVersions,
  planJobs,
  recordDigest,
  validateEnsemble,
  verifyDigest,
} from './record.js';
import { runJob } from './trial.js';
import { summarize } from './summary.js';

/** Statuses a resume may keep: outcomes of the trial, not of scheduling. */
export const RESUMABLE = Object.freeze([
  STATUS.OK,
  STATUS.BUILD_FAILED,
  STATUS.BODIES_MISSING,
  STATUS.NOT_FINITE,
  STATUS.LOST_BODY,
  STATUS.CAPPED,
  STATUS.STALLED,
]);

const clone = x => JSON.parse(JSON.stringify(x));
const isRow = (r, job) =>
  r !== null &&
  typeof r === 'object' &&
  r.index === job.index &&
  typeof r.status === 'string' &&
  Object.values(STATUS).includes(r.status);

/** The record as inputs only: the result, if any, taken off. */
export function inputsOf(m) {
  const copy = clone(m);
  delete copy.ensemble.result;
  return copy;
}

/** The rows a resume keeps from an earlier, partial record. */
export const keptRows = m =>
  (m.ensemble.result?.trials ?? []).filter(r => RESUMABLE.includes(r.status));

/** The finished record: the inputs, the rows, the engine and the digest. */
export async function finish(
  manifest,
  rows,
  { status = 'complete', stopReason = null, engine = null } = {}
) {
  const out = inputsOf(manifest);
  out.ensemble.result = {
    status,
    ...(stopReason ? { stopReason } : {}),
    ...(engine ? { engine } : {}),
    trials: rows,
  };
  out.ensemble.result.digest = await recordDigest(out);
  out.ensemble.result.summary = summarize(out);
  return out;
}

/**
 * Start a record's trials on a pool.
 * @param {object} manifest - A valid gravitas.experiment/2 record
 * @param {object} o
 * @param {Function} o.spawn - Makes a realm: a Worker of ./worker.js
 * @param {number} [o.concurrency]
 * @param {number} [o.memoryBytes] - What a trial's realm is held to (default REALM_BYTES)
 * @param {object} [o.pool] - An existing createPool, to share its caps and ledger
 * @param {object[]} [o.completed] - Rows of an earlier run to keep (keptRows)
 * @param {object|Function} [o.engine] - The engine fingerprint, or a function giving it
 * @returns {{run: Function, cancel: Function, state: Function}} run() resolves with the record
 */
export function startEnsemble(manifest, o) {
  const problems = validateEnsemble(manifest);
  if (problems.length)
    throw new Error(
      `not a runnable ensemble: ${problems[0].path} ${problems[0].message}`
    );
  const e = manifest.ensemble;
  const jobs = planJobs(manifest).map(j => ({
    ...j,
    ...(j.stream ? { stream: j.stream } : {}),
    deterministic: true,
    memoryBytes: o.memoryBytes ?? REALM_BYTES,
  }));
  const limits = e.limits ?? {};
  const completed = (o.completed ?? []).filter(r => {
    const job = jobs[r?.index];
    return job && RESUMABLE.includes(r.status) && isRow(r, job);
  });
  const batch = (
    o.pool ??
    createPool({
      spawn: o.spawn,
      concurrency: o.concurrency ?? 1,
      defaultJobBytes: o.memoryBytes ?? REALM_BYTES,
      now: o.now,
      setTimer: o.setTimer,
      clearTimer: o.clearTimer,
    })
  ).batch(jobs, {
    deterministic: true,
    noun: 'trial',
    owner: 'ensemble runner',
    accept: isRow,
    message: (job, m) => ({
      type: 'run',
      manifest: inputsOf(manifest),
      job: {
        index: job.index,
        ...(job.trial ? { trial: job.trial } : {}),
        ...(m.stream ? { stream: m.stream } : {}),
      },
    }),
    completed,
    totalTimeoutMs: limits.totalTimeoutMs,
    jobTimeoutMs: limits.trialTimeoutMs,
    maxResultBytes: limits.maxResultBytes,
    onJob: o.onTrial,
    onProgress: o.onProgress,
  });
  return {
    cancel: reason => batch.cancel(reason),
    state: () => batch.state(),
    async run() {
      const out = await batch.run();
      const engine =
        typeof o.engine === 'function' ? await o.engine() : (o.engine ?? null);
      return finish(manifest, out.trials, {
        status: out.status,
        stopReason: out.stopReason,
        engine: engine ? { fingerprint: engine } : null,
      });
    },
  };
}

/**
 * Run a record's trials one after another in this realm.
 * @param {object} manifest
 * @param {{realm?: object, completed?: object[], onTrial?: Function, engine?: string}} [o]
 */
export async function runSerial(manifest, o = {}) {
  const problems = validateEnsemble(manifest);
  if (problems.length)
    throw new Error(
      `not a runnable ensemble: ${problems[0].path} ${problems[0].message}`
    );
  const kept = new Map(
    (o.completed ?? [])
      .filter(r => RESUMABLE.includes(r.status))
      .map(r => [r.index, r])
  );
  const rows = [];
  for (const job of planJobs(manifest)) {
    let row = kept.get(job.index);
    if (!row) {
      const j = job.stream
        ? {
            ...job,
            stream: {
              ...job.stream,
              labels: [...job.stream.labels, job.index],
            },
          }
        : job;
      try {
        row = await runJob(manifest, j, { realm: o.realm });
      } catch (err) {
        row = {
          index: job.index,
          status: STATUS.WORKER_FAILED,
          error: String(err?.message || err),
        };
      }
    }
    rows.push(row);
    o.onTrial?.(row);
  }
  return finish(manifest, rows, {
    engine: o.engine ? { fingerprint: o.engine } : null,
  });
}

/**
 * Whether this build can be expected to reproduce a record, and if not, why not.
 * The record is replayed either way, so the difference can be seen.
 * @param {object} m - A record that has run
 * @param {{engine?: string}} [here]
 */
export async function reproducibility(m, here = {}) {
  const reasons = [];
  const problems = validateEnsemble(m);
  if (problems.length)
    reasons.push(
      `its inputs are no longer valid here: ${problems[0].path} ${problems[0].message}`
    );
  const d = await verifyDigest(m);
  if (!d.ok) reasons.push(d.reason);
  if (!problems.length) {
    const mine = kernelVersions(m.ensemble);
    for (const [id, version] of Object.entries(m.ensemble.kernels ?? {}))
      if (mine[id] !== version)
        reasons.push(
          `kernel ${id} was ${version} when it ran and is ${mine[id] ?? 'absent'} here`
        );
    for (const id of Object.keys(mine))
      if (!(id in (m.ensemble.kernels ?? {})))
        reasons.push(
          `kernel ${id} (${mine[id]}) is used here and the record does not name it`
        );
  }
  const then = m.ensemble?.result?.engine?.fingerprint;
  if (then && here.engine && then !== here.engine)
    reasons.push(
      `the engine integrates differently now (fingerprint ${then} then, ${here.engine} here)`
    );
  return { reproducible: reasons.length === 0, reasons };
}

/**
 * Run a record again from its inputs and compare. `run` takes the inputs and
 * returns a finished record (runSerial, or startEnsemble(...).run()).
 * @returns {{identical: boolean, digest: string, was: string, differences: object[]}}
 */
export async function replay(m, run, here = {}) {
  const verdict = await reproducibility(m, here);
  const fresh = await run(inputsOf(m));
  const was = m.ensemble.result?.digest ?? null;
  const digest = fresh.ensemble.result.digest;
  const differences = [];
  const a = m.ensemble.result?.trials ?? [];
  const b = fresh.ensemble.result.trials;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = JSON.stringify([a[i]?.status, a[i]?.outcome, a[i]?.artifact]);
    const y = JSON.stringify([b[i]?.status, b[i]?.outcome, b[i]?.artifact]);
    if (x !== y) differences.push({ index: i, was: a[i], now: b[i] });
  }
  return {
    identical: was === digest,
    digest,
    was,
    differences,
    verdict,
    record: fresh,
  };
}

export { TRIAL_LABEL };
