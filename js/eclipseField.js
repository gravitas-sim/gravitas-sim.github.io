// =============================================================================
// The views of the eclipse panels (Prompt 217, BINARIES.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/eclipseWidgets.js
// and tests/binariesLessons.test.js (which recomputes every number a lesson
// states from them). Nothing is calculated here that the kernel or the inference
// core does not: the light curve is js/inference/binaries.js, the fit, its
// uncertainties, its rank analysis and its profile are js/inference/infer.js on
// the eclipsing-binary model (js/inference/binaryModel.js), and the data are
// SYNTHETIC with their truth in the preset, which says so.
//
// Pure: no DOM, no clock. A fit is cached per preset, so a lesson that moves a
// slider does not repeat it.
// =============================================================================

import {
  contacts,
  eclipseFlux,
  lightRatio,
  residualsFail,
  secondaryPhase,
  derivedQuantities,
} from './inference/binaries.js';
import { fitOnce, profileTask } from './inference/infer.js';
import { syntheticEclipse } from './inference/synthetic.js';

const { Math, Float64Array, Map } = globalThis;

const LD = Object.freeze({ ldA: [0.4, 0.22], ldB: [0.5, 0.18], thirdLight: 0 });

/**
 * The systems the panels fit, by index. Each is synthetic: `truth` is what
 * made it, kept here so a lesson can say what the fit should have returned.
 */
export const PRESETS = Object.freeze([
  {
    id: 'pair',
    truth: {
      tc: 0.4,
      P: 3.2,
      rsum: 0.19,
      k: 0.75,
      inc: 87.6,
      J: 0.55,
      ecosw: 0,
      esinw: 0,
      ...LD,
    },
    cadence: 1 / 72,
    span: 9.6,
    sigma: 0.0004,
    free: ['tc', 'P', 'rsum', 'k', 'inc', 'J'],
    bounds: { tc: [0.3, 0.5], P: [3.168, 3.232] },
  },
  {
    id: 'eccentric',
    truth: {
      tc: 0.9,
      P: 5.5,
      rsum: 0.14,
      k: 0.8,
      inc: 88.0,
      J: 0.7,
      ecosw: 0.14,
      esinw: 0.1,
      ...LD,
    },
    cadence: 1 / 36,
    span: 11,
    sigma: 0.0003,
    free: ['tc', 'P', 'rsum', 'k', 'inc', 'J', 'ecosw', 'esinw'],
    bounds: { tc: [0.8, 1.0], P: [5.445, 5.555] },
  },
  {
    id: 'grazing',
    truth: {
      tc: 0.4,
      P: 3.2,
      rsum: 0.16,
      k: 0.9,
      inc: 81.4393,
      J: 0.8,
      ecosw: 0,
      esinw: 0,
      ...LD,
    },
    cadence: 1 / 72,
    span: 9.6,
    sigma: 0.00025,
    free: ['tc', 'P', 'rsum', 'k', 'inc', 'J'],
    bounds: { tc: [0.3, 0.5], P: [3.168, 3.232] },
  },
  {
    id: 'spotted',
    truth: {
      tc: 0.4,
      P: 3.2,
      rsum: 0.19,
      k: 0.75,
      inc: 87.6,
      J: 0.55,
      ecosw: 0,
      esinw: 0,
      ...LD,
    },
    cadence: 1 / 72,
    span: 9.6,
    sigma: 0.0004,
    free: ['tc', 'P', 'rsum', 'k', 'inc', 'J'],
    bounds: { tc: [0.3, 0.5], P: [3.168, 3.232] },
    modulation: { amplitude: 0.003, period: 1.7, phase: 0.7 },
  },
]);

export const PRESET_COUNT = PRESETS.length;
const idx = (v, n) => Math.max(0, Math.min(n - 1, Math.round(v ?? 0)));

const timesOf = p => {
  const n = Math.floor(p.span / p.cadence) + 1;
  return Float64Array.from({ length: n }, (_, j) => j * p.cadence);
};

/** The synthetic rows of a preset, a fixed seed per preset. */
export function dataOfPreset(i) {
  const p = PRESETS[idx(i, PRESETS.length)];
  return syntheticEclipse({
    seed: `binaries-217-lesson-${p.id}`,
    times: timesOf(p),
    sigma: p.sigma,
    truth: { ...p.truth, annuli: 64 },
    modulation: p.modulation ?? null,
  });
}

/** The inference request for a preset: the parameters it fits and the limb darkening it holds. */
export function requestOfPreset(i) {
  const p = PRESETS[idx(i, PRESETS.length)];
  const parameters = {};
  for (const n of ['tc', 'P', 'rsum', 'k', 'inc', 'J', 'ecosw', 'esinw']) {
    if (p.free.includes(n)) {
      const b = p.bounds[n];
      parameters[n] = b
        ? { mode: 'fitted', lo: b[0], hi: b[1] }
        : { mode: 'fitted' };
    } else parameters[n] = { mode: 'fixed', value: 0 };
  }
  return {
    model: { id: 'eclipsing-binary', version: '1.0.0' },
    parameters,
    settings: { ldA: p.truth.ldA, ldB: p.truth.ldB, thirdLight: 0 },
    algorithm: { profile: { points: 9, span: 4 } },
  };
}

// ---- the curve panel ----------------------------------------------------------------

/** Control values to a parameter set (the preset's period and epoch, the limb darkening fixed). */
export function paramsOf(v, base = PRESETS[0].truth) {
  return {
    ...base,
    rsum: v.rsum ?? base.rsum,
    k: v.k ?? base.k,
    inc: v.inc ?? base.inc,
    J: v.J ?? base.J,
    ecosw: v.ecosw ?? 0,
    esinw: v.esinw ?? 0,
    annuli: 64,
  };
}

const sample = (n, f) => Float64Array.from({ length: n }, (_, i) => f(i));

/**
 * The model curve against orbital phase, with the derived numbers and, when a
 * data set is asked for, the synthetic rows and the chi-square of the model
 * against them.
 * @param {{rsum?: number, k?: number, inc?: number, J?: number, ecosw?: number,
 *   esinw?: number, data?: number}} v - `data` is 0 for none, else a preset number + 1
 */
export function curveView(v) {
  const dataIndex = Math.round(v.data ?? 0) - 1;
  const base =
    dataIndex >= 0
      ? PRESETS[idx(dataIndex, PRESETS.length)].truth
      : PRESETS[0].truth;
  const p = paramsOf(v, base);
  const phase = sample(721, i => i / 720);
  const t = Float64Array.from(phase, ph => p.tc + p.P * ph);
  const flux = eclipseFlux(t, p);
  const q = derivedQuantities(p);
  const prim = contacts(p, 'primary');
  const sec = contacts(p, 'secondary');
  const depthOf = c =>
    c
      ? 1 -
        Math.min(
          ...eclipseFlux(
            sample(41, i => c.first + ((c.last - c.first) * i) / 40),
            p
          )
        )
      : 0;
  const out = {
    params: p,
    phase,
    flux,
    derived: q,
    primaryDepth: depthOf(prim),
    secondaryDepth: depthOf(sec),
    primaryFlat: prim ? flatBottom(p, prim, 'primary') : false,
    secondaryFlat: sec ? flatBottom(p, sec, 'secondary') : false,
    lightRatio: lightRatio(p),
    secondaryPhase: secondaryPhase(p),
    total: null,
    data: null,
  };
  if (dataIndex >= 0) {
    const d = dataOfPreset(dataIndex);
    const preset = PRESETS[idx(dataIndex, PRESETS.length)];
    const model = eclipseFlux(d.x, {
      ...p,
      tc: preset.truth.tc,
      P: preset.truth.P,
    });
    // The baseline is the weighted mean ratio, solved exactly as the fit does.
    let a = 0;
    let c = 0;
    for (let i = 0; i < model.length; i++) {
      a += d.y[i] * model[i];
      c += model[i] * model[i];
    }
    const f0 = a / c;
    let chi2 = 0;
    for (let i = 0; i < model.length; i++)
      chi2 += ((d.y[i] - f0 * model[i]) / d.sigma[i]) ** 2;
    const step = Math.max(1, Math.floor(d.x.length / 500));
    const ph = [];
    const y = [];
    for (let i = 0; i < d.x.length; i += step) {
      ph.push(((((d.x[i] - preset.truth.tc) / preset.truth.P) % 1) + 1) % 1);
      y.push(d.y[i] / f0);
    }
    out.data = {
      id: preset.id,
      phase: ph,
      flux: y,
      chi2,
      rows: d.x.length,
      reducedChi2: chi2 / (d.x.length - 6),
    };
  }
  return out;
}

/**
 * Whether an eclipse has a flat bottom: the star that is hidden is the smaller
 * and goes wholly behind the larger one (a total eclipse). The other eclipse of
 * such a pair is a transit, whose bottom curves because the larger star is
 * darker at its limb.
 */
function flatBottom(p, c, which) {
  const r1 = p.rsum / (1 + p.k);
  const r2 = p.k * r1;
  const [hidden, front] = which === 'primary' ? [r1, r2] : [r2, r1];
  return hidden < front && c.minSeparation + hidden <= front;
}

// ---- the fit panel ------------------------------------------------------------------

const fits = new Map();
const profiles = new Map();

/**
 * The fit of a preset, with its profile of k when asked. The core's own result:
 * nothing re-derived here.
 */
export function fitView(v) {
  const i = idx(v.dataset ?? 0, PRESETS.length);
  const preset = PRESETS[i];
  if (!fits.has(i)) {
    const data = dataOfPreset(i);
    const request = requestOfPreset(i);
    let fit = null;
    let error = null;
    try {
      fit = fitOnce(request, data);
    } catch (e) {
      error = e.message;
    }
    fits.set(i, { data, request, fit, error });
  }
  const run = fits.get(i);
  let profile = null;
  if (run.fit && Math.round(v.profile ?? 0) === 1) {
    if (!profiles.has(i))
      profiles.set(i, profileTask(run.request, run.data, run.fit, 'k'));
    profile = profiles.get(i);
  }
  const fit = run.fit;
  return {
    preset,
    data: run.data,
    fit,
    error: run.error,
    profile,
    residualFail: fit ? residualsFail(fit) : null,
    param: name => fit?.parameters.find(q => q.name === name),
    derivedOf: name => fit?.derived.find(q => q.name === name),
  };
}

/** The standard deviation a fit states for a parameter: scaled when the fit says its error bars were too small. */
export const sigmaOf = q => (q ? (q.sigmaScaled ?? q.sigma) : NaN);
