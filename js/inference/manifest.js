// =============================================================================
// gravitas.inference/1: a fit, stated completely enough to repeat
// -----------------------------------------------------------------------------
//   {
//     format: 'gravitas.inference', formatVersion: 1,
//     data:      { observation, source: { kind, id, version }, columns,
//                  rows, used, masked, missing, time: { format, scale },
//                  exposure },
//     model:     { id, version },
//     parameters: { <name>: { mode: 'fitted' | 'fixed', value?, lo?, hi? } },
//     settings:  { exposure, supersample, annuli, dilution?, stellarRadius? },
//     algorithm: { id: 'grid-lm', version, lm, starts, profile },
//     limits:    { concurrency, trialTimeoutMs, totalTimeoutMs },
//     engine:    { fingerprint },
//     results:   null | { ... fitOnce() and every profile ... }
//   }
//
// The data is named, not copied: by the observation's id and its source's
// id and version (a data pack's `tess-hd209458-s56-lc@1.0.0`), with the rows
// used counted. The model and the algorithm carry versions, so a result made
// by an older core can say it was, and the engine fingerprint - a reference
// transit and orbit evaluated and hashed - says whether this build computes
// the same curves.
//
// Pure: no DOM.
// =============================================================================

import { MODELS } from './models.js';
import { transitFlux } from './transit.js';
import { rvCurve } from './rv.js';

export const FORMAT = 'gravitas.inference';
export const FORMAT_VERSION = 1;
export const ALGORITHM = Object.freeze({ id: 'grid-lm', version: '1.0.0' });

/** What a device may be asked to do: the same classes as the experiments. */
export const PROFILES = Object.freeze({
  // Row-passes a millisecond in one realm (see estimate()), from
  // `npm run bench:inference -- --cpu` on the machine in INFERENCE_CORE.md:
  // `rate` is the median case's, and `slowFitRate` and `slowProfileRate` the
  // slowest fit's and profile's, which price the most a request may take.
  // The low-end figures are the desktop's divided by four, because Chromium
  // does not slow a Worker down to measure one. `parallelShare` and
  // `setupMs` are the experiment bench's, for CPU-bound Workers on the same
  // machine (EXPERIMENTS.md), until the inference bench records its own on a
  // quiet one; the set-up is the larger of its measurements, for a Worker
  // bundle three times this one's size.
  'low-end': {
    maxConcurrency: 2,
    maxWallMs: 3 * 60_000,
    trialTimeoutMs: 120_000,
    maxRows: 50_000,
    maxEvaluations: 400_000,
    setupMs: 400,
    rate: 1_455,
    slowFitRate: 180,
    slowProfileRate: 700,
    parallelShare: 0.85,
  },
  desktop: {
    maxConcurrency: 8,
    maxWallMs: 10 * 60_000,
    trialTimeoutMs: 300_000,
    maxRows: 200_000,
    maxEvaluations: 4_000_000,
    setupMs: 100,
    rate: 5_825,
    slowFitRate: 730,
    slowProfileRate: 2_815,
    parallelShare: 0.5,
  },
});

/**
 * The profile a device belongs to, as the experiment runner decides it: four
 * cores or fewer, or four gigabytes or less where the browser says, is
 * low-end. And how many realms it gets: two, or one per spare core.
 */
export function deviceProfile(nav = {}) {
  const cores = nav.hardwareConcurrency || 2;
  const memory = nav.deviceMemory;
  const profile =
    cores <= 4 || (memory !== undefined && memory <= 4) ? 'low-end' : 'desktop';
  const concurrency =
    profile === 'low-end'
      ? 2
      : Math.max(1, Math.min(PROFILES.desktop.maxConcurrency, cores - 1));
  return { profile, concurrency, cores };
}

/** Everything wrong with an inference manifest, each with its path. */
export function validateInference(m) {
  const out = [];
  const need = (ok, path, message) => {
    if (!ok) out.push({ path, message });
    return ok;
  };
  if (!need(m && typeof m === 'object', '', 'is not an object')) return out;
  need(m.format === FORMAT, 'format', `is not ${FORMAT}`);
  need(m.formatVersion === FORMAT_VERSION, 'formatVersion', 'is not 1');
  const model = MODELS[m.model?.id];
  if (
    !need(model, 'model.id', `is not one of ${Object.keys(MODELS).join(', ')}`)
  )
    return out;
  need(
    m.model.version === model.version,
    'model.version',
    `this build fits ${model.id} ${model.version}`
  );
  need(
    typeof m.data?.observation === 'string',
    'data.observation',
    'names no observation'
  );
  const names = [
    ...model.parameters.map(p => p.name),
    ...(model.nuisance || []).map(p => p.name),
  ];
  for (const [name, p] of Object.entries(m.parameters || {})) {
    if (
      !need(
        names.includes(name),
        `parameters.${name}`,
        `is not a ${model.id} parameter`
      )
    )
      continue;
    need(
      ['fitted', 'fixed'].includes(p.mode ?? 'fitted'),
      `parameters.${name}.mode`,
      'is fitted or fixed'
    );
    if ((p.mode ?? 'fitted') === 'fixed') {
      need(
        Number.isFinite(p.value),
        `parameters.${name}.value`,
        'a fixed parameter needs its value'
      );
    } else {
      const spec =
        model.parameters.find(q => q.name === name) ||
        model.nuisance.find(q => q.name === name);
      const lo = p.lo ?? spec.lo;
      const hi = p.hi ?? spec.hi;
      need(
        Number.isFinite(lo) && Number.isFinite(hi) && lo < hi,
        `parameters.${name}`,
        'a fitted parameter needs bounds, the lower below the upper'
      );
      if (spec.lo !== undefined)
        need(
          lo >= spec.lo && hi <= spec.hi,
          `parameters.${name}`,
          `is bounded by ${spec.lo} and ${spec.hi}`
        );
      if (p.value !== undefined)
        need(
          p.value >= lo && p.value <= hi,
          `parameters.${name}.value`,
          'starts outside its bounds'
        );
    }
  }
  for (const p of model.parameters) {
    if (p.lo === undefined && !m.parameters?.[p.name]) {
      out.push({
        path: `parameters.${p.name}`,
        message: 'needs bounds or a fixed value: it has no default range',
      });
    }
  }
  const s = m.settings || {};
  if (model.id === 'transit-quadratic') {
    need(
      s.exposure === undefined || s.exposure >= 0,
      'settings.exposure',
      'is a duration'
    );
    need(
      s.supersample === undefined ||
        (Number.isInteger(s.supersample) &&
          s.supersample >= 1 &&
          s.supersample <= 31),
      'settings.supersample',
      'is 1 to 31'
    );
    need(
      s.annuli === undefined ||
        (Number.isInteger(s.annuli) && s.annuli >= 8 && s.annuli <= 512),
      'settings.annuli',
      'is 8 to 512'
    );
    need(
      s.dilution === undefined ||
        (Number.isFinite(s.dilution) && s.dilution >= 0 && s.dilution < 1),
      'settings.dilution',
      "is the other stars' fraction of the light, 0 up to 1"
    );
    need(
      s.stellarRadius === undefined ||
        (s.stellarRadius.value > 0 &&
          (s.stellarRadius.sigma === undefined || s.stellarRadius.sigma >= 0)),
      'settings.stellarRadius',
      'is { value, sigma? } in solar radii'
    );
  }
  return out;
}

/**
 * What a fit will cost, and whether a device should run it.
 *
 * Work is counted in row-passes: one model evaluation is one pass over the
 * rows, plus, for a transit, the share of points in transit times the
 * exposure samples times the rings; one trial of the period search is two
 * passes (fold, then the boxes; or, for an orbit, the normal equations, then
 * the chi-square). Evaluations are counted the way ./infer.js makes them.
 *
 * Time is work over the profile's rate, measured by `npm run bench:inference`
 * (tools/inference-bench.mjs), plus a realm's set-up for each stage; the
 * profiles are spread over the realms, each keeping `parallelShare` of a lone
 * realm's speed beside the others.
 *
 * @param {object} m - An inference manifest
 * @param {number} rows - Rows the fit uses
 * @param {string} profile - 'low-end' | 'desktop'
 * @param {{profiles?: boolean, concurrency?: number}} [opts]
 * @returns {{evaluations: number, rows: number, gridTrials: number,
 *   work: number, fitWork: number, profileWork: number,
 *   ms: {fit: number, profiles: number, total: number}, msMax: object,
 *   refusals: Array<{reason: string, detail: object}>}}
 */
export function estimate(
  m,
  rows,
  profile,
  { profiles = true, concurrency } = {}
) {
  const P = PROFILES[profile];
  const model = MODELS[m.model.id];
  const mode = name => m.parameters?.[name]?.mode ?? 'fitted';
  const free = model.parameters.filter(p => mode(p.name) === 'fitted').length;
  const transit = model.id === 'transit-quadratic';
  const starts = transit && mode('b') === 'fixed' ? 1 : 3;
  const perFit = starts * 25 * (2 * free + 3);
  const jitterTrials = model.nuisance && mode('jitter') === 'fitted' ? 20 : 1;
  const points = m.algorithm?.profile?.points ?? 11;
  // Its points, the best fit's own, and up to three more a side inside the
  // crossing brackets (./infer.js profileTask()).
  const profileEvals = profiles ? free * (points + 7) * 2 * 12 * (2 * free) : 0;
  const evaluations = perFit * jitterTrials + profileEvals;
  const perEval =
    rows *
    (1 +
      (transit ? 0.06 : 0) *
        (m.settings?.supersample ?? 5) *
        (m.settings?.annuli ?? 32) *
        0.08);

  // The period search, as ./infer.js sizes it.
  const span = m.data?.span ?? 30;
  const Pb = m.parameters?.P;
  let gridTrials = 0;
  if (Pb && mode('P') !== 'fixed' && Pb.lo > 0 && Pb.hi > Pb.lo) {
    gridTrials = transit
      ? // Its shortest trial duration, an hour, in the data's unit.
        Math.ceil(
          ((Pb.hi - Pb.lo) * 4 * (span / Pb.lo)) / ((m.data?.perDay ?? 1) / 24)
        ) + 1
      : Math.ceil(((1 / Pb.lo - 1 / Pb.hi) * span) / 0.1) + 1;
  }
  const fitWork = perFit * jitterTrials * perEval + gridTrials * rows * 2;
  const profileWork = profileEvals * perEval;

  const realms = Math.max(
    1,
    Math.min(concurrency ?? P.maxConcurrency, P.maxConcurrency, free || 1)
  );
  const time = (fitRate, profileRate) => {
    const fit = P.setupMs + fitWork / fitRate;
    const profile =
      profiles && free
        ? P.setupMs +
          (Math.ceil(free / realms) * (profileWork / free)) /
            (profileRate * (realms > 1 ? P.parallelShare : 1))
        : 0;
    // The longest single task, which is what a realm's timeout is set on.
    const task = Math.max(
      fit,
      profiles && free
        ? P.setupMs +
            profileWork /
              free /
              (profileRate * (realms > 1 ? P.parallelShare : 1))
        : 0
    );
    return { fit, profiles: profile, total: fit + profile, task };
  };
  // Typical, and the most: a fit's evaluations are counted at a typical
  // number of refinement steps, and one that converges slowly - a grazing
  // transit - takes several times as many.
  const ms = time(P.rate, P.rate);
  const msMax = time(P.slowFitRate, P.slowProfileRate);

  const refusals = [];
  if (rows > P.maxRows)
    refusals.push({ reason: 'tooManyRows', detail: { rows, max: P.maxRows } });
  if (evaluations > P.maxEvaluations)
    refusals.push({
      reason: 'tooManyEvaluations',
      detail: { evaluations, max: P.maxEvaluations },
    });
  if (transit && gridTrials > 200_000)
    refusals.push({
      reason: 'periodRangeTooWide',
      detail: { trials: gridTrials, max: 200_000 },
    });
  // A task that would outlast its own timeout is refused before it starts,
  // not stopped after the reader has waited for it.
  if (ms.total > P.maxWallMs || ms.task > P.trialTimeoutMs)
    refusals.push({
      reason: 'tooSlow',
      detail: {
        seconds: Math.round(ms.total / 1000),
        max: Math.round(Math.min(P.maxWallMs, P.trialTimeoutMs) / 1000),
      },
    });
  return {
    evaluations,
    rows,
    gridTrials,
    work: fitWork + profileWork,
    fitWork,
    profileWork,
    ms,
    msMax,
    refusals,
  };
}

/**
 * The engine's fingerprint: a reference transit and orbit, hashed. A build
 * whose curves differ in any digit that matters gives a different one.
 */
export function engineFingerprint() {
  const t = Array.from({ length: 64 }, (_, i) => -0.1 + (0.2 * i) / 63);
  const f = transitFlux(
    t,
    { t0: 0, P: 3.5, k: 0.12, aRs: 8.8, b: 0.5, u1: 0.4, u2: 0.25 },
    { exposure: 0.01, supersample: 5, annuli: 32 }
  );
  const v = rvCurve(
    t.map(x => x * 20),
    { P: 3.5, tc: 0, K: 85, sqrtEcosw: 0.2, sqrtEsinw: 0.3 }
  );
  let h = 0x811c9dc5;
  const text = [...f, ...v].map(x => x.toFixed(12)).join(',');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * A manifest for a fit of an observation.
 * @param {object} observation - gravitas.observation/1
 * @param {object} data - ./infer.js dataFrom()
 * @param {object} request - { model, parameters, settings, algorithm }
 */
export function inferenceManifest(observation, data, request, limits) {
  const model = MODELS[request.model.id];
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    data: {
      observation: observation.id,
      title: observation.title,
      source: observation.source,
      columns: data.columns,
      units: data.units,
      rows: data.counts.total,
      used: data.counts.used,
      masked: data.counts.masked,
      missing: data.counts.missing,
      withoutUncertainty: data.counts.withoutUncertainty,
      span: data.x.length ? data.x[data.x.length - 1] - data.x[0] : 0,
      perDay: data.perDay ?? null,
      time: observation.time
        ? { format: observation.time.format, scale: observation.time.scale }
        : null,
    },
    model: { id: model.id, version: model.version },
    parameters: request.parameters,
    settings: request.settings || {},
    algorithm: { ...ALGORITHM, ...(request.algorithm || {}) },
    limits,
    engine: { fingerprint: engineFingerprint() },
    results: null,
  };
}
