// =============================================================================
// gravitas.observing-setup/1: how a quantity is observed
// -----------------------------------------------------------------------------
// A model says what is there; a setup says what an instrument would record of
// it: when it looks, for how long, how precisely, with what systematics, and
// with which seed. Three private versions of this idea existed before (the
// radial-velocity panel's synthetic run, the experiment runner's observables,
// the exoplanet suite's simulated system); this is the one they now share.
//
//   {
//     format: 'gravitas.observing-setup', formatVersion: 1,
//     id?, title?, seed: 'text',
//     observables?: ['radial-velocity'],     what it measures, in words
//     epochs: { kind: 'regular' | 'irregular' | 'clustered' | 'listed',
//               unit: 'd' (default, or 'sim'), start, duration,
//               count | cadence, jitter, clusters, tight, list, gaps },
//     exposure?: { time, supersample },       integration, in the epoch unit
//     noise?:    { white?:    { sigma, unit },
//                  red?:      { sigma, timescale },
//                  outliers?: { fraction, amplitude } },
//     systematics?: { offset, trend },        added to the model; trend per unit
//     instrument: { kind, ... }               see INSTRUMENT_KINDS
//   }
//
// The contracts it keeps:
//
// - Every random draw is keyed by its epoch's index and the seed (never by
//   Math.random or by the order draws happen in), so removing an epoch with a
//   gap never changes the noise of the ones that remain, and the radial-velocity
//   panel's old runs reproduce to the last digit (js/rvSurvey.js gaussianAt).
// - The stated uncertainty is the white sigma and nothing else. Red noise and
//   outliers are real and unstated, as they are at a telescope; the truth
//   manifest of the observation says what was injected.
// - A noise-free setup (no sigma, no red noise, no outliers, no systematics)
//   returns the model exactly.
//
// Pure and Worker-safe: no DOM, no Math.random, imports only pure modules.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';
import { gaussianAt } from '../rvSurvey.js';
import { planSchedule } from '../rvSchedule.js';
import { isObject, readVersioned } from '../platform/common.js';
import { parseUnit, dimensionOf } from '../observatory/units.js';

export const FORMAT = 'gravitas.observing-setup';
export const FORMAT_VERSION = 1;
export const EPOCH_KINDS = Object.freeze([
  'regular',
  'irregular',
  'clustered',
  'listed',
]);
export const INSTRUMENT_KINDS = Object.freeze([
  'photometer',
  'spectrograph',
  'astrometer',
  'imager',
  'catalogue',
  'metrics',
]);
/** Largest number of pixels or rows one setup may ask for. */
export const MAX_POINTS = 4_000_000;
/** Most epochs a regular or listed setup may have; irregular and clustered
 *  setups keep the radial-velocity planner's limit of 400. */
export const MAX_EPOCHS = 100_000;
const PLANNER_EPOCHS = 400;

const finite = v => typeof v === 'number' && Number.isFinite(v);

/** The time unit of the epochs: a registry time unit, or the simulation's own. */
function epochUnitOk(u) {
  if (u === 'sim') return true;
  const p = parseUnit(u);
  return p.ok && p.unit !== null && dimensionOf(p.unit) === 'time';
}

/**
 * Everything wrong with an observing setup, each with where it is.
 * @returns {Array<{path: string, message: string}>} Empty when valid
 */
export function validateSetup(s) {
  const out = [];
  const need = (ok, path, message) => {
    if (!ok) out.push({ path, message });
    return ok;
  };
  if (!need(isObject(s), '', 'is not an object')) return out;
  need(s.format === FORMAT, 'format', `is not ${FORMAT}`);
  need(s.formatVersion === FORMAT_VERSION, 'formatVersion', 'is not 1');
  need(
    typeof s.seed === 'string' && s.seed !== '',
    'seed',
    'is required, as text'
  );
  if (s.observables !== undefined)
    need(
      Array.isArray(s.observables) &&
        s.observables.every(o => typeof o === 'string'),
      'observables',
      'is a list of names'
    );
  const e = s.epochs;
  // A single frame or a catalogue has no schedule of its own.
  // A spectrum (a spectrograph with a wavelength window) is likewise one
  // exposure; a spectrograph without one is a radial-velocity series.
  const unscheduled =
    s.instrument?.kind === 'imager' ||
    s.instrument?.kind === 'catalogue' ||
    (s.instrument?.kind === 'spectrograph' &&
      s.instrument.window !== undefined);
  if (unscheduled && e === undefined) {
    // nothing to check
  } else if (need(isObject(e), 'epochs', 'is required')) {
    need(
      EPOCH_KINDS.includes(e.kind),
      'epochs.kind',
      `is not one of ${EPOCH_KINDS.join(', ')}`
    );
    need(
      e.unit === undefined || epochUnitOk(e.unit),
      'epochs.unit',
      'is a unit of time, or sim'
    );
    need(
      e.start === undefined || finite(e.start),
      'epochs.start',
      'is a number'
    );
    if (e.kind === 'listed') {
      need(
        Array.isArray(e.list) &&
          e.list.length >= 2 &&
          e.list.length <= MAX_EPOCHS &&
          e.list.every(v => finite(v) && v >= 0),
        'epochs.list',
        'is at least two times from the start, none negative'
      );
    } else if (e.kind) {
      need(
        finite(e.duration) && e.duration >= 0,
        'epochs.duration',
        'is a length of time, not negative'
      );
      const n = finite(e.count);
      const c = finite(e.cadence);
      need(
        (n && Number.isInteger(e.count) && e.count >= 2) ||
          (c && e.cadence > 0 && e.kind === 'regular'),
        'epochs.count',
        'is a whole number of at least 2 (a regular setup may give a cadence)'
      );
      if (n)
        need(
          e.count <= (e.kind === 'regular' ? MAX_EPOCHS : PLANNER_EPOCHS),
          'epochs.count',
          `is at most ${e.kind === 'regular' ? MAX_EPOCHS : PLANNER_EPOCHS} for a ${e.kind} setup`
        );
    }
    for (const [i, g] of (e.gaps ?? []).entries())
      need(
        Array.isArray(g) && g.length === 2 && finite(g[0]) && g[1] > g[0],
        `epochs.gaps[${i}]`,
        'is a start and a later end'
      );
  }
  if (s.exposure !== undefined) {
    need(
      isObject(s.exposure) &&
        finite(s.exposure.time) &&
        s.exposure.time >= 0 &&
        (s.exposure.supersample === undefined ||
          (Number.isInteger(s.exposure.supersample) &&
            s.exposure.supersample >= 1 &&
            s.exposure.supersample <= 64)),
      'exposure',
      'is a time, not negative, and a supersample of 1 to 64'
    );
  }
  const nz = s.noise ?? {};
  if (nz.white !== undefined) {
    need(
      isObject(nz.white) && finite(nz.white.sigma) && nz.white.sigma >= 0,
      'noise.white.sigma',
      'is a standard deviation, not negative'
    );
    const u = parseUnit(nz.white?.unit ?? '');
    need(u.ok, 'noise.white.unit', u.reason ?? 'is not a unit');
  }
  if (nz.red !== undefined)
    need(
      isObject(nz.red) &&
        finite(nz.red.sigma) &&
        nz.red.sigma >= 0 &&
        finite(nz.red.timescale) &&
        nz.red.timescale > 0,
      'noise.red',
      'is a sigma and a positive correlation timescale'
    );
  if (nz.outliers !== undefined)
    need(
      isObject(nz.outliers) &&
        finite(nz.outliers.fraction) &&
        nz.outliers.fraction >= 0 &&
        nz.outliers.fraction <= 0.5 &&
        finite(nz.outliers.amplitude) &&
        nz.outliers.amplitude >= 0,
      'noise.outliers',
      'is a fraction up to 0.5 and an amplitude, not negative'
    );
  const sy = s.systematics ?? {};
  for (const k of ['offset', 'trend'])
    need(
      sy[k] === undefined || finite(sy[k]),
      `systematics.${k}`,
      'is a number'
    );
  if (need(isObject(s.instrument), 'instrument', 'is required')) {
    const i = s.instrument;
    need(
      INSTRUMENT_KINDS.includes(i.kind),
      'instrument.kind',
      `is not one of ${INSTRUMENT_KINDS.join(', ')}`
    );
    const pos = ['resolvingPower', 'pixelScale', 'psfFwhm', 'width', 'height'];
    for (const k of pos)
      need(
        i[k] === undefined || (finite(i[k]) && i[k] > 0),
        `instrument.${k}`,
        'is a positive number'
      );
    if (i.kind === 'spectrograph' && i.window !== undefined)
      need(
        Array.isArray(i.window) &&
          i.window.length === 2 &&
          finite(i.window[0]) &&
          i.window[1] > i.window[0] &&
          i.window[0] > 0,
        'instrument.window',
        'is a first and a later wavelength, nm'
      );
    if (i.bandpass !== undefined)
      need(
        (typeof i.bandpass === 'string' && i.bandpass !== '') ||
          (Array.isArray(i.bandpass) &&
            i.bandpass.every(b => typeof b === 'string')),
        'instrument.bandpass',
        'names a band, or a list of them (the kernel decodes it)'
      );
    if (i.kind === 'imager')
      need(
        Number.isInteger(i.width) &&
          Number.isInteger(i.height) &&
          i.width * i.height <= MAX_POINTS,
        'instrument.width',
        `is a whole pixel count, at most ${MAX_POINTS} in all`
      );
    need(
      i.limitingMagnitude === undefined || finite(i.limitingMagnitude),
      'instrument.limitingMagnitude',
      'is a number'
    );
  }
  return out;
}

/** The setup with its defaults written in, so two spellings compare equal. */
export function normalizeSetup(s) {
  const e = s.epochs ?? {};
  return {
    ...s,
    epochs: { unit: 'd', start: 0, ...e },
    exposure: { time: 0, supersample: 1, ...(s.exposure ?? {}) },
    noise: { ...(s.noise ?? {}) },
    systematics: { ...(s.systematics ?? {}) },
  };
}

/** Whether the setup adds nothing to the model: it returns the model exactly. */
export function isNoiseFree(s) {
  const nz = s.noise ?? {};
  const sy = s.systematics ?? {};
  return (
    !(nz.white?.sigma > 0) &&
    !(nz.red?.sigma > 0) &&
    !(nz.outliers?.fraction > 0 && nz.outliers?.amplitude > 0) &&
    !sy.offset &&
    !sy.trend
  );
}

/**
 * The times a setup observes at, each with the index its noise is keyed by.
 *
 * The count of a regular setup given a cadence is the run's duration over its
 * cadence, plus one: a duration of exactly one cadence is two epochs (js/
 * rvSurvey.js epochCount, which this replaces for new setups).
 *
 * @returns {{times: Float64Array, indices: Int32Array, offsets: number[],
 *   plan: object}} Times are start + offset; a gap removes epochs and leaves
 *   the survivors' indices alone
 */
export function planEpochs(setup) {
  const { epochs: e, seed } = normalizeSetup(setup);
  const count =
    e.count ??
    (e.cadence > 0 ? Math.floor(e.duration / e.cadence + 1e-9) + 1 : 2);
  const inGap = o => (e.gaps ?? []).some(([from, to]) => o >= from && o < to);
  const quantise = v => Math.round(v * 1e6) / 1e6;
  if (
    (e.kind === 'regular' && count > PLANNER_EPOCHS) ||
    (e.kind === 'listed' && e.list.length > PLANNER_EPOCHS)
  ) {
    // Beyond the radial-velocity planner's 400: the same rules, written out.
    // Regular epochs are evenly spaced from 0 to the duration; a listed setup
    // is sorted and de-duplicated; both keep the indices of the ungapped list.
    const all =
      e.kind === 'regular'
        ? Array.from({ length: count }, (_, i) =>
            quantise((i * (e.duration ?? 0)) / (count - 1))
          )
        : [...new Set(e.list.map(quantise))].sort((a, b) => a - b);
    const kept = [];
    all.forEach((offset, index) => {
      if (!inGap(offset)) kept.push({ index, offset });
    });
    return {
      times: Float64Array.from(kept, p => e.start + p.offset),
      indices: Int32Array.from(kept, p => p.index),
      offsets: kept.map(p => p.offset),
      plan: { kind: e.kind, epochs: kept, ok: true, problems: [] },
    };
  }
  const plan = planSchedule({
    kind: e.kind === 'listed' ? 'explicit' : e.kind,
    epochs: count,
    baselineDays: e.duration ?? 0,
    jitter: e.jitter,
    clusters: e.clusters,
    tightDays: e.tight,
    explicit: e.list,
    gaps: e.gaps,
    seed,
  });
  const offsets = plan.epochs.map(p => p.offset);
  return {
    times: Float64Array.from(offsets, o => e.start + o),
    indices: Int32Array.from(plan.epochs, p => p.index),
    offsets,
    plan,
  };
}

/** A uniform in [0, 1) for one epoch of one stream, keyed as the noise is. */
export const uniformAt = (seed, index) =>
  mulberry32(normalizeSeed(`${seed}:${index}`))();

/**
 * Add a setup's systematics and noise to model values.
 *
 * @param {ArrayLike<number>} model - What the instrument would read, noise-free
 * @param {ArrayLike<number>} times - Epoch times, in the epoch unit
 * @param {ArrayLike<number>} indices - Each epoch's index (keys the draws)
 * @param {object} setup
 * @returns {{values: Float64Array, sigma: Float64Array|null, injected: object}}
 *   `sigma` is the stated uncertainty (white only), null when there is none
 */
export function applyNoise(model, times, indices, setup) {
  const s = normalizeSetup(setup);
  const n = model.length;
  const values = Float64Array.from(model);
  const injected = {
    offset: s.systematics.offset ?? 0,
    trend: s.systematics.trend ?? 0,
    whiteSigma: s.noise.white?.sigma ?? 0,
    redSigma: s.noise.red?.sigma ?? 0,
    outlierRows: [],
  };
  const t0 = n ? times[0] : 0;
  if (injected.offset || injected.trend)
    for (let i = 0; i < n; i++)
      values[i] += injected.offset + injected.trend * (times[i] - t0);
  const white = injected.whiteSigma;
  if (white > 0)
    for (let i = 0; i < n; i++)
      values[i] += white * gaussianAt(s.seed, indices[i]);
  if (injected.redSigma > 0) {
    // A damped random walk with stationary standard deviation `sigma` and
    // correlation time `timescale`: x_k = phi x_(k-1) + sqrt(1 - phi^2) s z_k.
    const { sigma, timescale } = s.noise.red;
    let x = 0;
    for (let i = 0; i < n; i++) {
      const z = gaussianAt(`${s.seed}:red`, indices[i]);
      if (i === 0) x = sigma * z;
      else {
        const phi = Math.exp(-(times[i] - times[i - 1]) / timescale);
        x = phi * x + Math.sqrt(1 - phi * phi) * sigma * z;
      }
      values[i] += x;
    }
  }
  const o = s.noise.outliers;
  if (o?.fraction > 0 && o.amplitude > 0) {
    for (let i = 0; i < n; i++) {
      if (uniformAt(`${s.seed}:outlier`, indices[i]) >= o.fraction) continue;
      const sign =
        uniformAt(`${s.seed}:outlier-sign`, indices[i]) < 0.5 ? -1 : 1;
      values[i] += sign * o.amplitude;
      injected.outlierRows.push(i);
    }
  }
  return {
    values,
    sigma: white > 0 ? new Float64Array(n).fill(white) : null,
    injected,
  };
}

/** The mean of f over one exposure centred on t, in `n` equal slices. */
export function overExposure(f, t, exposure, n) {
  if (!(exposure > 0) || n <= 1) return f(t);
  let sum = 0;
  for (let j = 0; j < n; j++) sum += f(t + exposure * ((j + 0.5) / n - 0.5));
  return sum / n;
}

// --- Older formats, read into this one --------------------------------------

const LEGACY_KIND = {
  regular: 'regular',
  irregular: 'irregular',
  clustered: 'clustered',
  explicit: 'listed',
};

/**
 * The radial-velocity panel's survey configuration (js/rvSurvey.js
 * normalizeSurveyConfig) as an observing setup.
 *
 * Epochs, noise and seed carry over; `sigmaMs` becomes a white sigma in m/s.
 * The panel keys its noise by epoch index with the same generator this module
 * uses, so the same seed reproduces the same run.
 */
export function setupFromSurveyConfig(cfg = {}) {
  const baseline = Number.isFinite(cfg.baselineDays) ? cfg.baselineDays : 3.52;
  const epochs = { unit: 'd', start: 0, duration: baseline };
  if (cfg.kind) {
    epochs.kind = LEGACY_KIND[cfg.kind] ?? 'regular';
    if (cfg.epochs !== undefined && cfg.epochs !== null)
      epochs.count = cfg.epochs;
    if (epochs.kind === 'listed') epochs.list = [...(cfg.explicit ?? [])];
    if (cfg.jitter != null) epochs.jitter = cfg.jitter;
    if (cfg.clusters != null) epochs.clusters = cfg.clusters;
    if (cfg.tightDays != null) epochs.tight = cfg.tightDays;
    if (cfg.gaps?.length) epochs.gaps = cfg.gaps.map(g => [...g]);
    if (epochs.kind !== 'listed' && epochs.count === undefined)
      epochs.count = 12;
  } else {
    epochs.kind = 'regular';
    epochs.cadence = Number.isFinite(cfg.cadenceDays) ? cfg.cadenceDays : 0.32;
  }
  const sigma = Number(cfg.sigmaMs ?? 8);
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    seed: String(cfg.seed ?? 'survey-1'),
    observables: ['radial-velocity'],
    epochs,
    noise:
      sigma > 0 ? { white: { sigma, unit: 'm/s' } } : { white: { sigma: 0 } },
    instrument: { kind: 'spectrograph' },
  };
}

/**
 * An experiment manifest's observables as an observing setup: the trial's
 * metrics, read at the thinned series the result keeps (at most 120 points of
 * the trial's simulated duration), with no noise because a trial is exact.
 */
export function setupFromExperiment(manifest) {
  const m = manifest?.observables?.metrics ?? [];
  const duration = manifest?.stop?.duration;
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    seed: String(manifest?.seeds?.[0] ?? 'experiment'),
    observables: [...m],
    epochs: { kind: 'regular', unit: 'sim', start: 0, duration, count: 120 },
    noise: { white: { sigma: 0 } },
    instrument: { kind: 'metrics' },
  };
}

/**
 * Read an observing setup of any version this build knows.
 *
 * Accepts the current format, and the radial-velocity panel's survey
 * configuration (which carries no format: it is read as version 0).
 *
 * @returns {{ok: true, setup: object, migrated: boolean, notes: string[]}
 *   | {ok: false, reason: string, message: string}}
 */
export function readSetup(doc) {
  const legacy =
    isObject(doc) &&
    doc.format === undefined &&
    ('cadenceDays' in doc || 'sigmaMs' in doc || 'baselineDays' in doc);
  const input = legacy
    ? { format: FORMAT, formatVersion: 0, survey: doc }
    : doc;
  const r = readVersioned(input, {
    format: FORMAT,
    current: FORMAT_VERSION,
    min: 0,
    migrations: {
      0: d => ({
        doc: setupFromSurveyConfig(d.survey ?? {}),
        notes: ['read from a radial-velocity survey configuration'],
      }),
    },
  });
  if (!r.ok) return r;
  const problems = validateSetup(r.doc);
  if (problems.length)
    return {
      ok: false,
      reason: 'invalid',
      message: problems
        .map(p => `${p.path || 'setup'} ${p.message}`)
        .join('; '),
    };
  return { ok: true, setup: r.doc, migrated: r.migrated, notes: r.notes };
}
