// =============================================================================
// gravitas.experiment/1: an experiment, written down so it can be run again
// -----------------------------------------------------------------------------
// The bench's sweep (./sweep.js, bench.js) varies one laboratory setting over a
// row of values and runs each value on the live world, one after another. An
// experiment is the same idea stated completely enough to hand to a scheduler
// that runs every trial in a disposable Worker realm, in parallel, and to
// someone else who wants to run it again:
//
//   model        the scenario, and the platform API range it was written for
//   initial      laboratory settings held fixed across trials
//   seeds        the deterministic seed set; every trial runs once per seed
//   vary         one or two parameters: explicit values, an evenly divided
//                range, or a seeded uniform distribution
//   observables  the bench's metrics, and the bodies they are about
//   stop         the simulated duration, and events that end a trial early
//   numerics     the fixed frame the trial integrates at, and the sampling
//   limits       concurrency, time and size ceilings the scheduler enforces
//   summaries    what the result should report per parameter value
//
// Only what the bench can already vary is offered - the parameters in
// SWEEPABLE, inside their validated bounds - because those are the settings a
// rebuild carries (js/scenarios.js LAB_VARIABLES). Everything here is pure: no
// DOM, no engine, no Worker; the scheduler and the page import it, and so do
// the tests. EXPERIMENTS.md describes the format and the limits.
// =============================================================================

import { canonicalJson } from './canonicalState.js';
import { METRICS, METRIC_ARITY, METRIC_UNITS } from './metrics.js';
import { toCsv } from '../csv.js';
import { mulberry32, normalizeSeed } from '../rng.js';
import {
  FAILED_STATUSES,
  MAX_DURATION,
  MAX_VALUES,
  MIN_DURATION,
  PARTIAL_STATUSES,
  SWEEPABLE,
  parameterFor,
  planValues,
} from './sweep.js';
import { STATUS } from './status.js';

// A trial's statuses and the check on a realm's answer live in ./status.js,
// which imports nothing but ./sweep.js, so the scheduler can take them without
// bringing this module - and js/csv.js behind it - to every page that runs
// tasks through it.
export { STATUS, isTrialResult } from './status.js';

export const FORMAT = 'gravitas.experiment';
export const FORMAT_VERSION = 1;
export const RESULT_FORMAT = 'gravitas.experiment-result';
export const RESULT_VERSION = 1;
/** The platform API these manifests are written against (js/platform). */
export const PLATFORM_RANGE = '^1.0.0';

/** Statuses with no usable measurement. */
export const NO_RESULT = Object.freeze([
  ...FAILED_STATUSES,
  STATUS.TIMEOUT,
  STATUS.CORRUPT,
  STATUS.WORKER_FAILED,
  STATUS.RESOURCE_LIMIT,
  STATUS.CANCELED,
]);

/** Metrics an experiment can observe: the bench's own offer. */
export const EXPERIMENT_METRICS = Object.freeze([
  METRICS.DISTANCE_TO_PRIMARY,
  METRICS.ORBITAL_PERIOD,
  METRICS.CLOSEST_APPROACH,
  METRICS.SPEED,
  METRICS.SEPARATION,
  METRICS.TOTAL_ENERGY,
  METRICS.ANGULAR_MOMENTUM,
  METRICS.ENERGY_DRIFT,
  METRICS.ANGULAR_DRIFT,
]);
export const STOP_EVENTS = Object.freeze([
  'separation-below',
  'separation-above',
]);
export const SUMMARIES = Object.freeze([
  'mean',
  'min',
  'max',
  'spread',
  'status-counts',
]);
export const MAX_SEEDS = 20;
export const MAX_PARAMETERS = 2;
export const FRAME_SECONDS = Object.freeze([1 / 120, 1 / 60, 1 / 30]);

/**
 * What a device may be asked to do.
 *
 * The ceilings are what keeps a class of computers usable while an
 * experiment runs: a low-end machine gets two realms and a short budget; a
 * desktop gets one realm per spare core.
 *
 * The costs are measured, by `npm run bench:experiments` (EXPERIMENTS.md has
 * the tables), and most of them are fallbacks. An experiment is priced from
 * what its planning realm timed on the device itself (estimate()); only a
 * plan without that timing uses `setupMs`, a lone realm's start-up and build,
 * and `rate`, its speed in body-steps (one substep of one body) per
 * millisecond. Both are from the slowest laboratory the bench runs, so that a
 * price made without timing errs towards refusing. The low-end figures are
 * modelled, a quarter of the bench machine's, because Chromium cannot slow a
 * Worker down to measure one. `parallelShare` is not a fallback: it is how
 * much of a lone realm's speed each keeps while the profile's realms run
 * together, and it applies to every price.
 */
export const PROFILES = Object.freeze({
  'low-end': {
    maxConcurrency: 2,
    maxTrials: 120,
    maxWallMs: 5 * 60_000,
    trialTimeoutMs: 60_000,
    maxResultBytes: 4_000_000,
    maxSamplesPerTrial: 4000,
    maxMemoryBytes: 256_000_000,
    setupMs: 220,
    rate: 50,
    parallelShare: 0.85,
  },
  desktop: {
    maxConcurrency: 8,
    maxTrials: 400,
    maxWallMs: 20 * 60_000,
    trialTimeoutMs: 120_000,
    maxResultBytes: 16_000_000,
    maxSamplesPerTrial: 20000,
    maxMemoryBytes: 1_000_000_000,
    setupMs: 60,
    rate: 200,
    parallelShare: 0.5,
  },
});

/**
 * What one realm costs in memory before it samples anything: its engine, its
 * world and the Worker itself. The bench measured 2 to 4 MB of JavaScript
 * heap a realm; the rest is an allowance for what a heap figure does not see.
 */
export const REALM_BYTES = 8_000_000;

/**
 * The profile a device belongs to. Four cores or fewer, or four gigabytes of
 * memory or less where the browser says, is low-end.
 * @param {{hardwareConcurrency?: number, deviceMemory?: number}} nav
 */
export function detectProfile(nav = {}) {
  const cores = nav.hardwareConcurrency || 2;
  const memory = nav.deviceMemory;
  return cores <= 4 || (Number.isFinite(memory) && memory <= 4)
    ? 'low-end'
    : 'desktop';
}

/** How many realms to run at once on this device. */
export function concurrencyFor(profile, nav = {}, asked = Infinity) {
  const cores = nav.hardwareConcurrency || 2;
  return Math.max(
    1,
    Math.min(asked, PROFILES[profile].maxConcurrency, Math.max(1, cores - 1))
  );
}

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The values one `vary` entry stands for, in the order trials run them. */
export function valuesFor(entry) {
  if (isObject(entry?.distribution)) {
    const d = entry.distribution;
    const draw = mulberry32(normalizeSeed(d.seed));
    const out = [];
    for (let i = 0; i < d.samples; i++)
      out.push(d.min + draw() * (d.max - d.min));
    return out.sort((a, b) => a - b);
  }
  return planValues(entry || {});
}

/**
 * Every problem with a manifest, each naming the field it is about.
 * @param {unknown} m
 * @returns {Array<{path: string, message: string}>}
 */
export function validateExperiment(m) {
  const out = [];
  const need = (ok, path, message) => ok || out.push({ path, message });
  if (!isObject(m)) return [{ path: '', message: 'is not an object' }];
  need(m.format === FORMAT, 'format', `must be "${FORMAT}"`);
  need(
    m.formatVersion === FORMAT_VERSION,
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(typeof m.title === 'string' && m.title.trim(), 'title', 'is required');

  const scenario = m.model?.scenario;
  const lab = SWEEPABLE[scenario];
  need(
    Boolean(lab),
    'model.scenario',
    `one of ${Object.keys(SWEEPABLE).join(', ')}`
  );
  need(
    m.model?.platform === PLATFORM_RANGE,
    'model.platform',
    `must be "${PLATFORM_RANGE}"`
  );

  const settings = m.initial?.settings ?? {};
  need(
    isObject(settings),
    'initial.settings',
    'an object of laboratory settings'
  );
  for (const key of Object.keys(settings)) {
    const def = parameterFor(scenario, key);
    need(
      Boolean(def),
      `initial.settings.${key}`,
      'not a setting this scenario carries across a rebuild'
    );
    if (def)
      need(
        Number.isFinite(settings[key]) &&
          settings[key] >= def.min &&
          settings[key] <= def.max,
        `initial.settings.${key}`,
        `a number from ${def.min} to ${def.max}`
      );
  }

  const seeds = m.seeds;
  need(
    Array.isArray(seeds) && seeds.length >= 1 && seeds.length <= MAX_SEEDS,
    'seeds',
    `from 1 to ${MAX_SEEDS} seeds`
  );
  if (Array.isArray(seeds)) {
    need(new Set(seeds).size === seeds.length, 'seeds', 'no seed twice');
    seeds.forEach((s, i) =>
      need(typeof s === 'string' && s.trim(), `seeds[${i}]`, 'a seed as text')
    );
  }

  need(
    Array.isArray(m.vary) &&
      m.vary.length >= 1 &&
      m.vary.length <= MAX_PARAMETERS,
    'vary',
    `one or ${MAX_PARAMETERS} parameters`
  );
  const seen = new Set();
  (Array.isArray(m.vary) ? m.vary : []).forEach((entry, i) => {
    const at = `vary[${i}]`;
    const def = lab && parameterFor(scenario, entry?.parameter);
    if (!def)
      return need(
        false,
        `${at}.parameter`,
        `not a parameter ${scenario || 'this scenario'} can vary`
      );
    need(!seen.has(entry.parameter), `${at}.parameter`, 'varied twice');
    seen.add(entry.parameter);
    need(
      !(entry.parameter in settings),
      `${at}.parameter`,
      'also held fixed in initial.settings'
    );
    const kinds = ['values', 'from', 'distribution'].filter(
      k => entry[k] !== undefined
    );
    need(
      kinds.length === 1,
      at,
      'exactly one of values, from/to/count or distribution'
    );
    if (entry.distribution !== undefined) {
      const d = entry.distribution;
      need(
        d?.kind === 'uniform',
        `${at}.distribution.kind`,
        'must be "uniform"'
      );
      need(
        Number.isInteger(d?.samples) &&
          d.samples >= 1 &&
          d.samples <= MAX_VALUES,
        `${at}.distribution.samples`,
        `from 1 to ${MAX_VALUES}`
      );
      need(
        typeof d?.seed === 'string' && d.seed,
        `${at}.distribution.seed`,
        'a seed, so the draw is the same every time'
      );
      need(
        Number.isFinite(d?.min) && Number.isFinite(d?.max) && d.min < d.max,
        `${at}.distribution`,
        'min below max'
      );
    } else if (entry.values !== undefined) {
      need(
        Array.isArray(entry.values) &&
          entry.values.length >= 1 &&
          entry.values.length <= MAX_VALUES &&
          entry.values.every(Number.isFinite),
        `${at}.values`,
        `from 1 to ${MAX_VALUES} numbers`
      );
    } else {
      need(
        Number.isFinite(entry.from) &&
          Number.isFinite(entry.to) &&
          entry.from !== entry.to,
        `${at}.from`,
        'a range with two different ends'
      );
      need(
        Number.isInteger(entry.count) &&
          entry.count >= 3 &&
          entry.count <= MAX_VALUES,
        `${at}.count`,
        `from 3 to ${MAX_VALUES}`
      );
    }
    const values = valuesFor(entry);
    if (values.length) {
      need(
        Math.min(...values) >= def.min && Math.max(...values) <= def.max,
        at,
        `values from ${def.min} to ${def.max}`
      );
      if (def.exclude) {
        const inside = values.filter(
          v => v > def.exclude.from && v < def.exclude.to
        );
        need(
          !inside.length,
          at,
          `no value between ${def.exclude.from} and ${def.exclude.to}, where this scenario is a collision`
        );
      }
    }
  });

  const metrics = m.observables?.metrics;
  need(
    Array.isArray(metrics) && metrics.length >= 1,
    'observables.metrics',
    'at least one metric'
  );
  const roles = m.observables?.roles ?? lab?.roles;
  (Array.isArray(metrics) ? metrics : []).forEach((id, i) => {
    need(
      EXPERIMENT_METRICS.includes(id),
      `observables.metrics[${i}]`,
      `one of ${EXPERIMENT_METRICS.join(', ')}`
    );
    const arity = METRIC_ARITY[id] ?? 0;
    need(
      arity <= (roles?.bodies?.length || 0) + (roles?.primary ? 1 : 0),
      `observables.metrics[${i}]`,
      'needs more bodies than the roles name'
    );
  });
  need(
    isObject(roles) && Array.isArray(roles.bodies) && roles.bodies.length >= 1,
    'observables.roles',
    'the bodies the metrics are about'
  );

  need(
    Number.isFinite(m.stop?.duration) &&
      m.stop.duration >= MIN_DURATION &&
      m.stop.duration <= MAX_DURATION,
    'stop.duration',
    `simulated time from ${MIN_DURATION} to ${MAX_DURATION}`
  );
  (m.stop?.events || []).forEach((e, i) => {
    need(
      STOP_EVENTS.includes(e?.kind),
      `stop.events[${i}].kind`,
      `one of ${STOP_EVENTS.join(', ')}`
    );
    need(
      Number.isFinite(e?.au) && e.au > 0,
      `stop.events[${i}].au`,
      'a distance in AU'
    );
  });

  need(
    FRAME_SECONDS.some(f => Math.abs(f - m.numerics?.frameSeconds) < 1e-12),
    'numerics.frameSeconds',
    'one of 1/120, 1/60, 1/30'
  );
  need(
    Number.isInteger(m.numerics?.sampleEvery) &&
      m.numerics.sampleEvery >= 1 &&
      m.numerics.sampleEvery <= 100,
    'numerics.sampleEvery',
    'every 1 to 100 frames'
  );

  const L = m.limits || {};
  const hard = PROFILES.desktop;
  need(
    Number.isInteger(L.concurrency) &&
      L.concurrency >= 1 &&
      L.concurrency <= hard.maxConcurrency,
    'limits.concurrency',
    `from 1 to ${hard.maxConcurrency}`
  );
  need(
    Number.isFinite(L.trialTimeoutMs) &&
      L.trialTimeoutMs >= 1000 &&
      L.trialTimeoutMs <= hard.trialTimeoutMs,
    'limits.trialTimeoutMs',
    `from 1000 to ${hard.trialTimeoutMs}`
  );
  need(
    Number.isFinite(L.totalTimeoutMs) &&
      L.totalTimeoutMs >= 1000 &&
      L.totalTimeoutMs <= hard.maxWallMs,
    'limits.totalTimeoutMs',
    `from 1000 to ${hard.maxWallMs}`
  );
  need(
    Number.isInteger(L.maxSamplesPerTrial) &&
      L.maxSamplesPerTrial >= 10 &&
      L.maxSamplesPerTrial <= hard.maxSamplesPerTrial,
    'limits.maxSamplesPerTrial',
    `from 10 to ${hard.maxSamplesPerTrial}`
  );
  need(
    Number.isInteger(L.maxResultBytes) &&
      L.maxResultBytes >= 10_000 &&
      L.maxResultBytes <= hard.maxResultBytes,
    'limits.maxResultBytes',
    `from 10000 to ${hard.maxResultBytes}`
  );

  (m.summaries || []).forEach((s, i) =>
    need(
      SUMMARIES.includes(s),
      `summaries[${i}]`,
      `one of ${SUMMARIES.join(', ')}`
    )
  );
  if (!out.length) {
    const n = trialCount(m);
    need(
      n <= hard.maxTrials,
      'vary',
      `${n} trials; an experiment runs at most ${hard.maxTrials}`
    );
  }
  return out;
}

/** How many trials a manifest asks for. */
export function trialCount(m) {
  return m.vary.reduce((n, v) => n * valuesFor(v).length, 1) * m.seeds.length;
}

/**
 * Every trial, in the order results are reported: each combination of values,
 * the first parameter slowest, and every seed within a combination. The same
 * manifest gives the same list, index for index, on every machine.
 * @returns {Array<{index: number, params: object, seed: string}>}
 */
export function planTrials(m) {
  const axes = m.vary.map(v => ({ key: v.parameter, values: valuesFor(v) }));
  const combos = axes.reduce(
    (acc, axis) =>
      acc.flatMap(c => axis.values.map(v => ({ ...c, [axis.key]: v }))),
    [{}]
  );
  const trials = [];
  for (const params of combos) {
    for (const seed of m.seeds)
      trials.push({ index: trials.length, params, seed });
  }
  return trials;
}

/** A short, stable identity for a manifest, as the bench hashes a state. */
export function experimentHash(m) {
  const text = canonicalJson(m);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * What running it will cost, from one planned trial (trialRunner.planTrial,
 * run in a realm) and the device's measured rate.
 *
 * @param {object} m - The manifest
 * @param {{bodies: number, steps: number, samples: number}} plan - Trial 0
 * @param {string} profile - A PROFILES key
 * @param {number} concurrency - Realms at once
 */
export function estimate(m, plan, profile, concurrency) {
  const P = PROFILES[profile];
  const trials = trialCount(m);
  // A fixed cost and a running one. Every trial starts a realm, imports the
  // engine into it cold, builds its world and warms up before it runs at
  // speed; for a short trial that is most of its time.
  //
  // Timed on this device where the plan says (trialRunner.js calibrate():
  // the planning realm's own start-up and build, and a short burst of the
  // planned world). Otherwise the profile's figures, which the bench measured
  // on the slowest laboratory, so that a guess errs towards refusing.
  const c = plan.calibration;
  const timed = Number.isFinite(c?.stepsPerMs) && c.stepsPerMs > 0;
  const soloMs = timed
    ? (plan.startMs || 0) +
      (plan.buildMs || 0) +
      (c.warmupMs || 0) +
      plan.steps / c.stepsPerMs
    : P.setupMs + (plan.steps * Math.max(1, plan.bodies)) / P.rate;
  // Realms running together share the device's cores, caches and clock, and
  // each keeps only part of a lone realm's speed; the bench measured how much.
  const trialMs = soloMs / (concurrency > 1 ? P.parallelShare : 1);
  const samples = Math.min(plan.samples, m.limits.maxSamplesPerTrial);
  // A result keeps each metric's reduced value and a thinned series of at
  // most 120 points; the samples themselves stay in the realm and die with it.
  const bytesPerTrial = 600 + m.observables.metrics.length * (40 + 120 * 40);
  // Each realm holds its engine and world, and its own samples: about 48
  // bytes a sample per metric. The realm itself was measured at 2 to 4 MB of
  // heap; REALM_BYTES allows for what a heap figure does not see.
  const realmBytes = REALM_BYTES + samples * m.observables.metrics.length * 48;
  const resultBytes = trials * bytesPerTrial;
  return {
    trials,
    bodies: plan.bodies,
    stepsPerTrial: plan.steps,
    samplesPerTrial: samples,
    // Planned before the cap: more than the cap, and every trial is `capped`.
    // The first sample is taken before the first frame, so the cap is reached
    // after one sample fewer's worth of frames.
    samplesPlanned: plan.samples,
    reachable:
      plan.frameAdvance > 0
        ? (m.limits.maxSamplesPerTrial - 1) *
          (m.numerics?.sampleEvery || 1) *
          plan.frameAdvance
        : null,
    timed,
    trialMs,
    wallMs: Math.ceil(trials / concurrency) * trialMs || 0,
    resultBytes,
    realmBytes,
    memoryBytes: concurrency * realmBytes + resultBytes,
    concurrency,
  };
}

/**
 * Why a device should not run this, if it should not. Refused before
 * anything starts: an experiment that would outlast the device's budget, hold
 * more than its memory allows, or wait on a single trial longer than the
 * timeout is one that would look frozen, so it is not offered.
 * @returns {Array<{reason: string, detail: object}>} Empty when it may run
 */
export function refusals(est, m, profile) {
  const P = PROFILES[profile];
  const out = [];
  if (est.trials > P.maxTrials)
    out.push({
      reason: 'tooManyTrials',
      detail: { trials: est.trials, max: P.maxTrials },
    });
  if (est.wallMs > Math.min(P.maxWallMs, m.limits.totalTimeoutMs))
    out.push({
      reason: 'tooLong',
      detail: {
        ms: Math.round(est.wallMs),
        max: Math.min(P.maxWallMs, m.limits.totalTimeoutMs),
      },
    });
  if (est.trialMs > Math.min(P.trialTimeoutMs, m.limits.trialTimeoutMs) * 0.8)
    out.push({
      reason: 'trialTooLong',
      detail: {
        ms: Math.round(est.trialMs),
        max: Math.min(P.trialTimeoutMs, m.limits.trialTimeoutMs),
      },
    });
  if (est.resultBytes > Math.min(P.maxResultBytes, m.limits.maxResultBytes))
    out.push({
      reason: 'tooMuchData',
      detail: {
        bytes: est.resultBytes,
        max: Math.min(P.maxResultBytes, m.limits.maxResultBytes),
      },
    });
  if (m.limits.maxSamplesPerTrial > P.maxSamplesPerTrial)
    out.push({
      reason: 'tooManySamples',
      detail: {
        samples: m.limits.maxSamplesPerTrial,
        max: P.maxSamplesPerTrial,
      },
    });
  // Sampled every frame, a trial longer than the cap allows stops at the cap,
  // and a capped trial is left out of every average: an experiment of them
  // runs to the end and reports nothing. Unless a stop event may end each
  // trial first, it is refused, with the length that would fit.
  if (
    est.samplesPlanned > m.limits.maxSamplesPerTrial &&
    !(m.stop?.events || []).length
  )
    out.push({
      reason: 'wouldBeCapped',
      detail: {
        reachable: Math.floor(est.reachable ?? 0),
        duration: m.stop.duration,
      },
    });
  if (est.memoryBytes > P.maxMemoryBytes)
    out.push({
      reason: 'tooMuchMemory',
      detail: { bytes: est.memoryBytes, max: P.maxMemoryBytes },
    });
  if (m.limits.concurrency > P.maxConcurrency)
    out.push({
      reason: 'tooManyRealms',
      detail: { realms: m.limits.concurrency, max: P.maxConcurrency },
    });
  return out;
}

/** The limits a new manifest gets on a profile. */
export function defaultLimits(profile, nav = {}) {
  const P = PROFILES[profile];
  return {
    concurrency: concurrencyFor(profile, nav),
    trialTimeoutMs: P.trialTimeoutMs,
    totalTimeoutMs: P.maxWallMs,
    maxSamplesPerTrial: Math.min(5000, P.maxSamplesPerTrial),
    maxResultBytes: P.maxResultBytes,
  };
}

// --- Migration -------------------------------------------------------------------

/**
 * A bench sweep (js/experiments/sweep.js validateSweepSpec's shape) as an
 * experiment, so a sweep a reader has already set up can be run in realms.
 */
export function fromSweepSpec(spec, { profile = 'desktop', nav = {} } = {}) {
  const lab = SWEEPABLE[spec.scenario];
  const vary =
    Array.isArray(spec.values) && spec.values.length
      ? { parameter: spec.parameter, values: [...spec.values] }
      : {
          parameter: spec.parameter,
          from: spec.from,
          to: spec.to,
          count: spec.count,
        };
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    title: `${spec.scenario}: ${spec.parameter}`,
    model: { scenario: spec.scenario, platform: PLATFORM_RANGE },
    initial: { settings: {} },
    seeds: [String(spec.seed ?? 'sweep')],
    vary: [vary],
    observables: { metrics: [...spec.metrics], roles: lab?.roles },
    stop: { duration: spec.duration, events: [] },
    numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
    limits: defaultLimits(profile, nav),
    summaries: ['mean', 'min', 'max', 'status-counts'],
  };
}

/**
 * Read a manifest of any version this build knows, or say why not.
 * @returns {{manifest: object|null, notes: string[], error: string|null}}
 */
export function migrateExperiment(input) {
  if (!isObject(input))
    return { manifest: null, notes: [], error: 'not an object' };
  if (input.format === FORMAT) {
    if (input.formatVersion === FORMAT_VERSION)
      return { manifest: input, notes: [], error: null };
    return {
      manifest: null,
      notes: [],
      error:
        input.formatVersion > FORMAT_VERSION
          ? `written for ${FORMAT}/${input.formatVersion}, newer than this Gravitas reads (${FORMAT_VERSION}); open it in a newer version`
          : `${FORMAT}/${input.formatVersion} is not a version that was ever published`,
    };
  }
  // A bench sweep specification, as the Experiments panel builds one.
  if (
    typeof input.scenario === 'string' &&
    typeof input.parameter === 'string'
  ) {
    return {
      manifest: fromSweepSpec(input),
      notes: ['converted from a bench sweep; one seed, the bench’s own'],
      error: null,
    };
  }
  return {
    manifest: null,
    notes: [],
    error: 'neither an experiment nor a sweep',
  };
}

// --- Results -------------------------------------------------------------------

/**
 * A result's trials as CSV, one row a trial in planned order.
 *
 * Written through js/csv.js like every other export, because a seed is text
 * the reader types or pastes: a seed that begins like a formula would
 * otherwise reach a spreadsheet as one and run.
 *
 * @param {object} result - A gravitas.experiment-result/1
 * @returns {string} The document, CRLF line endings
 */
export function resultCsv(result) {
  const m = result.manifest;
  const keys = m.vary.map(v => v.parameter);
  const metrics = m.observables.metrics;
  return toCsv([
    [
      'trial',
      ...keys,
      'seed',
      'status',
      ...metrics.map(id => `${id} (${METRIC_UNITS[id]})`),
      'steps',
      'wall_ms',
      'error',
    ],
    ...result.trials.map(tr => [
      tr.index + 1,
      ...keys.map(k => tr.params[k]),
      tr.seed,
      tr.status,
      ...metrics.map(id => tr.results?.[id] ?? ''),
      tr.steps,
      tr.wallMs,
      tr.error || '',
    ]),
  ]);
}

/**
 * Per parameter value, what the metric did across the seeds. Trials without
 * a usable number, and partial trials, are counted and not averaged in -
 * the sweep's rule (./sweep.js summarize).
 */
export function summarizeExperiment(m, trials) {
  const out = {};
  const counts = { total: trials.length };
  for (const s of Object.values(STATUS)) counts[s] = 0;
  for (const tr of trials) counts[tr.status] = (counts[tr.status] || 0) + 1;
  out.statusCounts = counts;
  out.metrics = {};
  for (const metric of m.observables.metrics) {
    const groups = new Map();
    for (const tr of trials) {
      const key = canonicalJson(tr.params);
      if (!groups.has(key))
        groups.set(key, {
          params: tr.params,
          values: [],
          partial: 0,
          missing: 0,
        });
      const g = groups.get(key);
      const v = tr.results?.[metric];
      if (tr.status === STATUS.OK && Number.isFinite(v)) g.values.push(v);
      else if (PARTIAL_STATUSES.includes(tr.status)) g.partial++;
      else g.missing++;
    }
    out.metrics[metric] = [...groups.values()].map(g => {
      const n = g.values.length;
      const mean = n ? g.values.reduce((a, b) => a + b, 0) / n : null;
      const sd =
        n > 1
          ? Math.sqrt(
              g.values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)
            )
          : null;
      return {
        params: g.params,
        n,
        mean,
        min: n ? Math.min(...g.values) : null,
        max: n ? Math.max(...g.values) : null,
        spread: sd,
        partial: g.partial,
        missing: g.missing,
      };
    });
  }
  return out;
}

/**
 * Whether a saved result can be reproduced here, and if not, why not.
 * @param {object} result - A gravitas.experiment-result/1
 * @param {{engine: string, app: string}} here - This build
 */
export function reproducibility(result, here) {
  const reasons = [];
  if (
    result?.format !== RESULT_FORMAT ||
    result.formatVersion !== RESULT_VERSION
  ) {
    return {
      reproducible: false,
      reasons: [`not a ${RESULT_FORMAT}/${RESULT_VERSION}`],
      notes: [],
    };
  }
  const { manifest } = result;
  const problems = validateExperiment(manifest);
  if (problems.length)
    reasons.push(
      `its manifest is no longer valid here: ${problems[0].path} ${problems[0].message}`
    );
  if (result.engine?.fingerprint !== here.engine) {
    reasons.push(
      `the engine integrates differently now (fingerprint ${result.engine?.fingerprint} then, ${here.engine} here): the same manifest will give different numbers, and that difference is the change to the engine, not to the experiment`
    );
  }
  const notes = [];
  if (result.engine?.app !== here.app) {
    // A different build is not a reason on its own: if the engine integrates
    // identically, the numbers will be the same.
    notes.push(
      `it was made by Gravitas ${result.engine?.app}; this is ${here.app}`
    );
  }
  if (result.hash !== experimentHash(manifest))
    reasons.push('its manifest has been edited since it was run');
  return { reproducible: reasons.length === 0, reasons, notes };
}

export { NO_RESULT as NO_MEASUREMENT, SWEEPABLE };
