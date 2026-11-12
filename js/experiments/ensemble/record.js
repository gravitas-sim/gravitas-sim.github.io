// =============================================================================
// The experiment record of the ensemble runner: gravitas.experiment/2
// -----------------------------------------------------------------------------
// One document holds an experiment and, once it has run, its result: the inputs
// (the kind, the master seed, the number of trials, the named streams and the
// fork each trial draws from, the kernel versions, the kind's config) and under
// `ensemble.result` the trials (each a gravitas.artifact envelope, Prompt 150),
// the engine it ran on, the summary and the digest a report cites. A record
// re-runs from itself alone and the new digest equals the old one (./run.js).
//
// Version. The record is gravitas.experiment/1 as before unless it uses an
// ensemble field, then /2 (withVersion): a 2.0.0 reader silently drops an unknown
// field, so the version, which it refuses in words, is the capability-required
// refusal the compatibility policy asks for (FORMATS.md, tests/compat/boundary.mjs
// 'ensemble-fields'). A /1 manifest is written byte for byte as it always was.
//
// The digest is SHA-256 over the exact canonical JSON of the inputs and of every
// trial's index, status, outcome and envelope. Wall times and anything else a
// run measures about itself are outside it.
// =============================================================================

import { canonicalJsonExact, sha256Hex } from '../../hash.js';
import {
  ALGORITHM,
  STREAMS,
  VERSION as STREAM_VERSION,
} from '../../random/streams.js';
import { ID_EXPERIMENT } from '../../names.js';
import { artifact } from '../../platform/artifact.js';
import { DRAW_BUDGET } from '../../kernels/statistics/resample.js';
import { computeValue } from '../../quality.js';
import {
  FORMAT_VERSION as SWEEP_VERSION,
  planTrials,
  trialCount,
  validateExperiment,
} from '../experimentManifest.js';
import { STATUS } from '../status.js';
import {
  ENSEMBLE_VERSION,
  KINDS,
  KIND_IDS,
  STATISTICS_METHODS,
} from './kinds.js';

export const FORMAT = ID_EXPERIMENT;
export const BASE_VERSION = SWEEP_VERSION;
export const FORMAT_VERSION = 2;
export const FORKS = Object.freeze({
  trial: 'trial-index',
  legacy: 'legacy-sweep',
});
export const TRIAL_LABEL = 'trial';
/** A result row is about this many bytes: the cap on trials is the result budget over it. */
export const ROW_BYTES = 2048;

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim() !== '';
const clone = x => JSON.parse(JSON.stringify(x));

/** The lowest version that carries this record: /2 only for an ensemble field. */
export const withVersion = doc =>
  doc.ensemble === undefined ? doc : { ...doc, formatVersion: FORMAT_VERSION };

/** How many trials a record may ask for, from the result bytes its limits allow. */
export const trialCap = limits =>
  Math.max(2, Math.floor((limits?.maxResultBytes ?? 4_000_000) / ROW_BYTES));

const streamEntry = (id, key) => ({
  id,
  algorithm: ALGORITHM,
  version: STREAM_VERSION,
  key,
});

/** The kernels a record names, with their versions, as this build has them. */
export function kernelVersions(ens) {
  return {
    'random-streams': `${ALGORITHM}@${STREAM_VERSION}`,
    'ensemble-runner': String(ENSEMBLE_VERSION),
    statistics: STATISTICS_METHODS,
    ...KINDS[ens.kind].kernels(ens),
  };
}

/**
 * A record that has not run: the inputs, with the streams and the kernels filled
 * in from what the kind uses. `sweep` is a gravitas.experiment/1 manifest, carried
 * as the record's own top-level fields.
 */
export function ensembleManifest({
  kind,
  title,
  seed,
  trials,
  config = {},
  summary = {},
  limits,
  sweep,
}) {
  const ens = {
    kind,
    seed: String(seed),
    trials: kind === 'sweep' ? trialCount(sweep) : trials,
    fork: kind === 'sweep' ? FORKS.legacy : FORKS.trial,
    config,
    // The draws are the record's own statement of what it computed: DRAW_BUDGET's
    // default on the full tier, the low tier's smaller count otherwise (js/quality.js,
    // Prompt 285), and either way what the verifier reads back.
    summary: {
      level: 0.95,
      draws: computeValue('bootstrapDraws'),
      ...summary,
    },
    ...(limits ? { limits } : {}),
  };
  if (kind === 'sweep') {
    // The sweep's world is built with each manifest seed (the engine stream, the
    // seed as given) and a distribution's values come from its own seed.
    ens.streams = [
      ...sweep.seeds.map(s => streamEntry('engine', String(s))),
      ...sweep.vary
        .filter(v => isObject(v.distribution))
        .map(v => streamEntry('experiments', String(v.distribution.seed))),
    ];
  } else {
    ens.streams = [
      streamEntry(KINDS[kind]?.stream, `${ens.seed}:${TRIAL_LABEL}`),
    ];
  }
  ens.kernels = KINDS[kind] ? kernelVersions(ens) : {};
  return withVersion({
    ...(kind === 'sweep' ? clone(sweep) : {}),
    format: FORMAT,
    formatVersion: BASE_VERSION,
    title: title ?? sweep?.title ?? 'Experiment',
    ensemble: ens,
  });
}

/**
 * Every problem with a record, each naming its field. A record that has run is
 * checked as the inputs it carries; its result is checked by `verifyDigest`.
 * @returns {Array<{path: string, message: string}>}
 */
export function validateEnsemble(m) {
  const out = [];
  const need = (ok, path, message) =>
    Boolean(ok) || (out.push({ path, message }), false);
  if (!isObject(m)) return [{ path: '', message: 'is not an object' }];
  need(m.format === FORMAT, 'format', `must be "${FORMAT}"`);
  need(
    m.formatVersion === FORMAT_VERSION,
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(isText(m.title), 'title', 'is required');
  const e = m.ensemble;
  if (!need(isObject(e), 'ensemble', 'is required')) return out;
  const kind = KINDS[e.kind];
  if (
    !need(
      Boolean(kind) && KIND_IDS.includes(e.kind),
      'ensemble.kind',
      `one of ${KIND_IDS.join(', ')}`
    )
  )
    return out;
  need(isText(e.seed), 'ensemble.seed', 'a seed as text');
  const sweep = e.kind === 'sweep';
  need(
    e.fork === (sweep ? FORKS.legacy : FORKS.trial),
    'ensemble.fork',
    sweep
      ? `must be "${FORKS.legacy}" for a sweep`
      : `must be "${FORKS.trial}": trial i draws from stream(id, seed, "${TRIAL_LABEL}", i)`
  );
  if (sweep) {
    const base = clone(m);
    delete base.ensemble;
    base.formatVersion = BASE_VERSION;
    for (const p of validateExperiment(base))
      out.push({ path: p.path, message: p.message });
    if (!out.length)
      need(
        e.trials === trialCount(m),
        'ensemble.trials',
        `must be ${trialCount(m)}, the sweep's trials`
      );
  } else {
    const cap = trialCap(e.limits);
    need(
      Number.isInteger(e.trials) && e.trials >= 2 && e.trials <= cap,
      'ensemble.trials',
      `a whole number from 2 to ${cap}`
    );
  }
  if (Array.isArray(e.streams) && e.streams.length) {
    e.streams.forEach((s, i) => {
      const at = `ensemble.streams[${i}]`;
      need(
        isObject(s) && STREAMS.includes(s.id),
        `${at}.id`,
        `one of ${STREAMS.join(', ')}`
      );
      need(
        s?.algorithm === ALGORITHM && s?.version === STREAM_VERSION,
        `${at}.algorithm`,
        `this build draws ${ALGORITHM} version ${STREAM_VERSION}`
      );
      need(isText(s?.key), `${at}.key`, 'is required');
      if (!sweep) {
        need(
          s?.id === kind.stream,
          `${at}.id`,
          `a ${e.kind} experiment draws from the "${kind.stream}" stream, not "${s?.id}"`
        );
        need(
          s?.key === `${e.seed}:${TRIAL_LABEL}`,
          `${at}.key`,
          `must be "${e.seed}:${TRIAL_LABEL}"`
        );
      }
    });
  } else
    need(false, 'ensemble.streams', 'names the streams the trials draw from');
  need(
    isObject(e.kernels) && Object.values(e.kernels).every(isText),
    'ensemble.kernels',
    'an object of kernel versions'
  );
  for (const [path, message] of sweep ? [] : kind.check(e))
    out.push({ path: `ensemble.${path}`, message });
  const s = e.summary;
  need(
    isObject(s) &&
      s.level > 0 &&
      s.level < 1 &&
      Number.isInteger(s.draws) &&
      s.draws >= 100 &&
      s.draws <= DRAW_BUDGET.max,
    'ensemble.summary',
    `a level between 0 and 1 and from 100 to ${DRAW_BUDGET.max} draws`
  );
  return out;
}

/** The trials of a record, in the order they are reported: what a job needs. */
export function planJobs(m) {
  const e = m.ensemble;
  if (e.kind === 'sweep')
    return planTrials(m).map(t => ({ index: t.index, trial: t }));
  return Array.from({ length: e.trials }, (_, index) => ({
    index,
    stream: { id: KINDS[e.kind].stream, seed: e.seed, labels: [TRIAL_LABEL] },
  }));
}

// --- trials as envelopes (Prompt 150) -------------------------------------------

/** A trial's row: its envelope when it measured something, and its outcome class. */
export function trialRow(m, index, outcome) {
  const row = { index, status: outcome.status };
  if (outcome.outcome !== undefined) row.outcome = outcome.outcome;
  if (outcome.error) row.error = outcome.error;
  if (outcome.quantities?.length)
    row.artifact = artifact({
      id: `trial-${index}`,
      source: {
        kind: 'experiment',
        id: `${m.ensemble.kind}:${m.ensemble.seed}`,
      },
      quantities: outcome.quantities.map(({ id, value, unit, origin }) => ({
        id,
        value,
        unit,
        origin,
        uncertainty: { kind: 'none' },
      })),
    });
  return row;
}

/** The rows that gave numbers: `{index, outcome, values: {id: number}}`. */
export function usable(trials) {
  return trials
    .filter(r => r?.status === STATUS.OK && r.artifact)
    .map(r => ({
      index: r.index,
      outcome: r.outcome,
      values: Object.fromEntries(
        r.artifact.quantities.map(q => [q.id, q.value])
      ),
      units: Object.fromEntries(r.artifact.quantities.map(q => [q.id, q.unit])),
    }));
}

// --- the digest ----------------------------------------------------------------

/** What the digest covers: the inputs and each trial's index, status, outcome and envelope. */
export function digestSource(m) {
  const inputs = clone(m);
  const trials = (inputs.ensemble.result?.trials ?? []).map(
    ({ index, status, outcome, artifact: a }) => ({
      index,
      status,
      ...(outcome !== undefined ? { outcome } : {}),
      ...(a ? { artifact: a } : {}),
    })
  );
  delete inputs.ensemble.result;
  return canonicalJsonExact({ inputs, trials });
}

/** SHA-256 of a record, as a report cites it. */
export const recordDigest = m => sha256Hex(digestSource(m));

/** Does the record's stated digest match its content? */
export async function verifyDigest(m) {
  const stated = m?.ensemble?.result?.digest;
  if (!isText(stated))
    return { ok: false, reason: 'the record states no digest' };
  const now = await recordDigest(m);
  return now === stated
    ? { ok: true, digest: now }
    : {
        ok: false,
        reason: `its digest is ${stated} and its content hashes to ${now}: it was edited after it ran`,
      };
}

/**
 * A report cites an experiment by its record's digest: a provenance block for
 * the artifact envelope (js/platform/artifact.js `provenance.citations`).
 */
export function citation(m) {
  const e = m.ensemble;
  const digest = e.result?.digest;
  if (!isText(digest))
    throw new Error(
      'only a record that has run, and states its digest, can be cited'
    );
  return {
    citations: [
      {
        kind: 'experiment',
        format: `${FORMAT}/${m.formatVersion}`,
        digest,
        ensemble: e.kind,
        seed: e.seed,
        trials: e.trials,
        streams: e.streams.map(
          s => `${s.id}:${s.algorithm}@${s.version}:${s.key}`
        ),
        kernels: { ...e.kernels },
      },
    ],
  };
}
