// =============================================================================
// Which kind of variable: a labeled synthetic sample, features, and a confusion table
// -----------------------------------------------------------------------------
// The sample is SYNTHETIC. Each star is a light curve made by the periodic
// forward model (js/forward/models/periodic.js) from a class template whose
// period, amplitude and shape ranges are stylised from the clumps variable-
// star catalogues show (Soszynski et al. 2008, 2009; Graham et al. 2013, ApJ
// 777, 68), observed at an irregular set of nights with noise, and then
// measured by the same pipeline a real light curve goes through: a period
// search, a Fourier fit, an amplitude and the shape numbers R21 and phi21. The
// label is the truth the template carries; the measured features are not.
//
// The classifier is k nearest neighbours on standardised features with
// leave-one-out, so no star is classified by itself. The answer is a confusion
// table (truth by prediction), not a single verdict, because the point is which
// classes the chosen features cannot separate: period alone cannot tell an RR
// Lyrae star from an eclipsing binary, and shape can.
// =============================================================================

// The periodic model alone, not the registry: the registry links every forward
// model, and a Jest family load that races another family over them loses one.
import { run as runPeriodic } from '../../../../../../js/forward/models/periodic.js';
import { mulberry32, normalizeSeed } from '../../../../../../js/rng.js';
import {
  harmonicFit,
  curveStats,
  magnitudesOf,
} from '../../../../../../js/kernels/variables/fit.js';
import { findPeriod, refinePeriod } from './period.js';
import { ID_OBSERVING_SETUP } from '../../../../../../js/names.js';

const { Math } = globalThis;

export const VERSION = '1.0.0';

/** The classes and their templates. Ranges: period in days, A1 the first harmonic's flux amplitude. */
export const CLASSES = Object.freeze([
  {
    id: 'rrab',
    kind: 'harmonic',
    period: [0.45, 0.8],
    a1: [0.27, 0.4],
    // A sawtooth: A_k = A1 / k with the even harmonics inverted; scatter on R21.
    r: [0.5, 0.33],
    phases: [0, 180, 0],
    rScatter: 0.05,
  },
  {
    id: 'rrc',
    kind: 'harmonic',
    period: [0.25, 0.45],
    a1: [0.14, 0.24],
    r: [0.13, 0.04],
    phases: [0, 100, 0],
    rScatter: 0.05,
  },
  {
    id: 'cepheid',
    kind: 'harmonic',
    period: [2, 30],
    a1: [0.12, 0.34],
    r: [0.38, 0.17],
    phases: [0, 150, 60],
    rScatter: 0.07,
  },
  {
    id: 'dscuti',
    kind: 'harmonic',
    period: [0.04, 0.2],
    a1: [0.04, 0.2],
    r: [0.2, 0.06],
    phases: [0, 120, 0],
    rScatter: 0.08,
  },
  { id: 'eclipsing', kind: 'eclipsing', period: [0.4, 6] },
]);

/** Feature sets a lesson compares. */
export const FEATURE_SETS = Object.freeze({
  period: ['logP'],
  periodAmplitude: ['logP', 'logAmp'],
  shape: ['logP', 'logAmp', 'r21'],
});

const draw = (rand, [lo, hi]) => lo + (hi - lo) * rand();
const drawLog = (rand, [lo, hi]) =>
  Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * rand());

/** The nights a ground-based run visits: `nights` nights, two or three visits each, seeded. */
export function nightlyEpochs(seed, nights = 60) {
  const rand = mulberry32(normalizeSeed(`${seed}:nights`));
  const list = [];
  for (let n = 0; n < nights; n++) {
    if (rand() < 0.2) continue; // weather
    const visits = 2 + Math.floor(rand() * 2);
    for (let v = 0; v < visits; v++)
      list.push(Math.round((n + 0.1 + 0.3 * rand()) * 1e6) / 1e6);
  }
  return list.sort((a, b) => a - b);
}

/** One star of a class: the state for the forward model and the truth it carries. */
export function drawStar(cls, rand) {
  const periodDays = drawLog(rand, cls.period);
  const t0 = rand() * periodDays;
  if (cls.kind === 'eclipsing') {
    const r1 = draw(rand, [0.12, 0.35]);
    const r2 = draw(rand, [0.08, r1]);
    return {
      periodic: {
        kind: 'eclipsing',
        periodDays,
        t0,
        r1,
        r2,
        surfaceBrightnessRatio: draw(rand, [0.4, 1]),
        inclinationDeg: draw(rand, [84, 90]),
      },
    };
  }
  const a1 = draw(rand, cls.a1);
  const harmonics = [{ amplitude: a1, phaseDeg: cls.phases[0] }];
  cls.r.forEach((r, k) =>
    harmonics.push({
      amplitude:
        a1 *
        Math.max(0.01, r + cls.rScatter * (rand() - 0.5) * 2 * (k ? 0.5 : 1)),
      phaseDeg: cls.phases[k + 1] + 20 * (rand() - 0.5),
    })
  );
  return { periodic: { kind: 'harmonic', periodDays, t0, mean: 1, harmonics } };
}

/** The observing setup of the sample: nightly visits, 1 percent white noise. */
export const sampleSetup = (seed, nights = 60) => ({
  format: ID_OBSERVING_SETUP,
  formatVersion: 1,
  seed,
  epochs: { kind: 'listed', list: nightlyEpochs(seed, nights), unit: 'd' },
  noise: { white: { sigma: 0.01, unit: '' } },
  instrument: { kind: 'photometer' },
});

/**
 * Measure one light curve the way a real one is measured: a period search, a
 * refinement, a Fourier fit, the shape numbers.
 * @param {ArrayLike<number>} t
 * @param {ArrayLike<number>} mag
 * @param {{minPeriod?: number, maxPeriod?: number, K?: number}} [opts]
 */
export function measureLightCurve(
  t,
  mag,
  { minPeriod = 0.03, maxPeriod = 40, K = 4 } = {}
) {
  const found = findPeriod(t, mag, { minPeriod, maxPeriod, oversample: 4 });
  const P = refinePeriod(t, mag, found.period, K, 0.3 * found.width).period;
  const fit = harmonicFit(t, mag, P, K, { t0: t[0] });
  if (!fit) return null;
  const s = curveStats(fit);
  return {
    period: P,
    power: found.power,
    logP: Math.log10(P),
    amplitude: s.amplitude,
    logAmp: Math.log10(Math.max(s.amplitude, 1e-4)),
    r21: s.r21,
    r31: s.r31,
    phi21: s.phi21,
    mean: s.mean,
    rms: fit.rms,
  };
}

/**
 * The labeled sample: `perClass` stars of each class, simulated and measured.
 * Deterministic for a seed.
 * @returns {Array<{id: string, cls: string, truthPeriod: number} & ReturnType<typeof measureLightCurve>>}
 */
export function makeSample({ perClass = 24, seed = 'variables-sample' } = {}) {
  const rows = [];
  for (const cls of CLASSES) {
    const rand = mulberry32(normalizeSeed(`${seed}:${cls.id}`));
    for (let i = 0; i < perClass; i++) {
      const id = `${cls.id}-${i + 1}`;
      const state = drawStar(cls, rand);
      const obs = runPeriodic(state, sampleSetup(`${seed}:${id}`));
      const col = name => obs.columns.find(c => c.id === name).values;
      const t = col('time');
      const mag = magnitudesOf(col('value'));
      const m = measureLightCurve(t, mag);
      if (m)
        rows.push({
          id,
          cls: cls.id,
          truthPeriod: state.periodic.periodDays,
          ...m,
        });
    }
  }
  return rows;
}

/**
 * Leave-one-out k nearest neighbours on standardised features.
 * @param {Array<object>} rows - from makeSample
 * @param {string[]} features - keys of a row
 * @returns {string[]} the predicted class of each row
 */
export function classifyLeaveOneOut(rows, features, k = 5) {
  const n = rows.length;
  const mean = features.map(f => rows.reduce((s, r) => s + r[f], 0) / n);
  const sd = features.map(
    (f, j) =>
      Math.sqrt(
        rows.reduce((s, r) => s + (r[f] - mean[j]) ** 2, 0) / (n - 1)
      ) || 1
  );
  const z = rows.map(r => features.map((f, j) => (r[f] - mean[j]) / sd[j]));
  return rows.map((_, i) => {
    const d = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      let s = 0;
      for (let q = 0; q < features.length; q++) s += (z[i][q] - z[j][q]) ** 2;
      d.push({ s, cls: rows[j].cls });
    }
    d.sort((a, b) => a.s - b.s);
    const votes = new Map();
    for (const { cls } of d.slice(0, k))
      votes.set(cls, (votes.get(cls) ?? 0) + 1);
    return [...votes.entries()].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)
    )[0][0];
  });
}

/**
 * The confusion table: rows are the truth, columns the prediction.
 * @returns {{classes: string[], matrix: number[][], accuracy: number,
 *   perClass: Array<{cls: string, recall: number, precision: number}>}}
 */
export function confusion(rows, predicted, classes = CLASSES.map(c => c.id)) {
  const idx = Object.fromEntries(classes.map((c, i) => [c, i]));
  const matrix = classes.map(() => classes.map(() => 0));
  rows.forEach((r, i) => {
    matrix[idx[r.cls]][idx[predicted[i]]]++;
  });
  let ok = 0;
  classes.forEach((_, i) => (ok += matrix[i][i]));
  return {
    classes,
    matrix,
    accuracy: ok / rows.length,
    perClass: classes.map((cls, i) => {
      const row = matrix[i].reduce((s, v) => s + v, 0);
      const col = matrix.reduce((s, r) => s + r[i], 0);
      return {
        cls,
        recall: row ? matrix[i][i] / row : NaN,
        precision: col ? matrix[i][i] / col : NaN,
      };
    }),
  };
}
