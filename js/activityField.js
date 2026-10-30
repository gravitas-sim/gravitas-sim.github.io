// =============================================================================
// The views of the stellar-activity panels (Prompt 220, STELLAR_ACTIVITY.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/activityWidgets.js
// and tests/stellarActivityLessons.test.js (which recomputes every number a lesson
// states from them). Nothing is calculated here that the kernel does not:
// the spot model, the rotation period and its alias, the flare detection, the
// equivalent durations and the power-law slope are js/kernels/activity/.
//
// Two kinds of light curve: SYNTHETIC ones (a spotted star with a truth the panel can
// show, drawn from the named streams of Prompt 149) and the two AUTHENTIC ones of
// js/activityData.js (AU Microscopii and EK Draconis, TESS), which arrive as sidecars
// after the module, so a view of them is null until they are in.
//
// Pure: no DOM, no clock. Every result is cached by its inputs, so a lesson that moves
// a slider does not repeat a search.
// =============================================================================

import {
  syntheticActivity,
  rotationPeriod,
  spectrumOf,
  binSeries,
  detectFlares,
  cumulativeFrequency,
  powerLawSlope,
  scanEdMin,
  completenessEd,
  shearPeriods,
} from './kernels/activity/index.js';

const { Math, Float64Array, Map } = globalThis;

/** The equatorial period of the synthetic star, days. */
export const SPOT_PERIOD = 4;
const SPOT_DAYS = 16;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const flag = x => Math.round(x ?? 0) === 1;

// ---- the authentic curves --------------------------------------------------------------

let curves = { auMic: null, ekDra: null };
/** A test or a page that already has the curves hands them in. */
export const provideCurves = c => {
  curves = { ...curves, ...c };
  caches.clear();
};
export const curvesIn = () => !!(curves.auMic && curves.ekDra);
const caches = new Map();
const memo = (key, make) => {
  if (!caches.has(key)) caches.set(key, make());
  return caches.get(key);
};

/** The stars of the rotation panel, by index. */
export const STARS = Object.freeze([
  {
    id: 'auMic',
    maxPeriod: 13,
    binMinutes: 30,
    published: 4.85,
    publishedSigma: 0.03,
  },
  { id: 'ekDra', maxPeriod: 13, binMinutes: 0, published: null },
]);

// ---- the spot panel ----------------------------------------------------------------------

/**
 * The synthetic spotted star at the control values, and what the kernel makes of it.
 * @param {{lat?: number, size?: number, contrast?: number, inc?: number,
 *   second?: number, shear?: number, view?: number}} v
 */
export function spotsView(v) {
  const lat = clamp(v.lat ?? 30, 0, 80);
  const size = clamp(v.size ?? 15, 5, 30);
  const contrast = clamp(v.contrast ?? 0.65, 0.3, 0.95);
  const inc = clamp(v.inc ?? 70, 20, 90);
  const second = flag(v.second);
  const shear = clamp(v.shear ?? 0, 0, 0.4);
  const key = `spots:${lat}:${size}:${contrast}:${inc}:${second}:${shear}`;
  return memo(key, () => {
    const spots = [{ lat, lon: 0, radius: size, contrast }];
    if (second) spots.push({ lat, lon: 180, radius: size, contrast });
    const d = syntheticActivity({
      seed: 'activity-220-lesson-spots',
      days: SPOT_DAYS,
      cadenceMin: 30,
      period: SPOT_PERIOD,
      inc,
      shear,
      spots,
      noise: 0.0004,
      flares: null,
    });
    const rot = rotationPeriod(d.t, d.flux, { minPeriod: 0.5, maxPeriod: 8 });
    const sp = spectrumOf(d.t, d.flux, { minPeriod: 0.5, maxPeriod: 8 });
    let lo = Infinity;
    let hi = -Infinity;
    for (const y of d.truth.spotted) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
    const [pLat] = shearPeriods(SPOT_PERIOD, shear, [lat]);
    const [pPole] = shearPeriods(SPOT_PERIOD, shear, [60]);
    return {
      lat,
      size,
      contrast,
      inc,
      second,
      shear,
      data: d,
      rotation: rot,
      spectrum: sp,
      amplitude: hi - lo,
      spotPeriod: pLat,
      periodAt60: pPole,
      periodEq: SPOT_PERIOD,
      days: SPOT_DAYS,
    };
  });
}

/** Phase of each time against a period, in [0, 1). */
export const foldPhase = (t, period, t0 = 0) =>
  Float64Array.from(t, x => ((((x - t0) / period) % 1) + 1) % 1);

// ---- the authentic rotation panel ----------------------------------------------------

/**
 * A rotation period of AU Mic or EK Dra from its TESS sector, or null until the curves are in.
 * @param {{star?: number}} v
 */
export function rotationView(v) {
  const i = clamp(Math.round(v.star ?? 0), 0, STARS.length - 1);
  const star = STARS[i];
  const raw = curves[star.id];
  if (!raw) return null;
  return memo(`rotation:${i}`, () => {
    const b = star.binMinutes
      ? binSeries(raw.t, raw.flux, star.binMinutes, 8)
      : { t: raw.t, y: raw.flux };
    const rot = rotationPeriod(b.t, b.y, {
      minPeriod: 0.5,
      maxPeriod: star.maxPeriod,
    });
    const sp = spectrumOf(b.t, b.y, {
      minPeriod: 0.5,
      maxPeriod: star.maxPeriod,
    });
    return { star, index: i, t: b.t, y: b.y, rotation: rot, spectrum: sp };
  });
}

// ---- the flares of AU Mic ---------------------------------------------------------------

/** The flares of AU Mic by the kernel's rule, with the rotation period of the same star. */
export function flaresOfAuMic() {
  const raw = curves.auMic;
  if (!raw) return null;
  return memo('flares:auMic', () => {
    const { rotation } = rotationView({ star: 0 });
    const det = detectFlares(raw.t, raw.flux, raw.err, {
      period: rotation.period,
    });
    const days = raw.t.length * (2 / 1440);
    const byEd = det.flares
      .map((f, k) => ({ ...f, k }))
      .sort((a, b) => b.ed - a.ed);
    return { raw, det, rotation, days, byEd };
  });
}

/**
 * The view of a day of AU Mic with its flares marked (view 0) or one flare (view 1).
 * @param {{view?: number, day?: number, flare?: number}} v
 */
export function flareView(v) {
  const f = flaresOfAuMic();
  if (!f) return null;
  const raw = f.raw;
  const view = Math.round(v.view ?? 0) === 1 ? 1 : 0;
  const rank = clamp(Math.round(v.flare ?? 1), 1, f.byEd.length) - 1;
  const one = f.byEd[rank];
  let a;
  let b;
  if (view === 1) {
    a = one.tPeak - 0.08;
    b = one.tPeak + 0.25;
  } else {
    a = raw.t[0] + clamp(Math.round(v.day ?? 0), 0, 27);
    b = a + 1;
  }
  const idx = [];
  for (let i = 0; i < raw.t.length; i++)
    if (raw.t[i] >= a && raw.t[i] < b) idx.push(i);
  const inWindow = f.det.flares.filter(x => x.tPeak >= a && x.tPeak < b);
  return {
    view,
    rank,
    one,
    window: [a, b],
    t: idx.map(i => raw.t[i]),
    flux: idx.map(i => raw.flux[i]),
    quiet: idx.map(i => f.det.q[i]),
    flares: inWindow,
    total: f.det.flares.length,
    sigma: f.det.sigma,
    days: f.days,
    period: f.rotation.period,
  };
}

// ---- the frequency distribution -----------------------------------------------------------

/**
 * The cumulative frequency of equivalent durations and the slope above a floor.
 * @param {{source?: number, floor?: number}} v - source 0 AU Mic, 1 the synthetic star;
 *   floor 0 the completeness limit, 1 the Clauset scan, 2 every flare
 */
export function ffdView(v) {
  const source = Math.round(v.source ?? 0) === 1 ? 1 : 0;
  const floorMode = clamp(Math.round(v.floor ?? 0), 0, 2);
  let run;
  if (source === 0) {
    const f = flaresOfAuMic();
    if (!f) return null;
    run = {
      eds: f.det.flares.map(x => x.ed),
      sigma: f.det.sigma,
      days: f.days,
      truth: null,
    };
  } else {
    run = memo('ffd:synthetic', () => {
      const d = syntheticActivity({
        seed: 'activity-220-lesson-ffd',
        days: 27,
        cadenceMin: 2,
        period: 4.856,
        inc: 70,
        spots: [{ lat: 30, lon: 0, radius: 18, contrast: 0.6 }],
        noise: 3.4e-4,
        flares: { rate: 3, alpha: 1.8, edMin: 5, edMax: 3000 },
      });
      const det = detectFlares(d.t, d.flux, d.err, { period: 4.856 });
      return {
        eds: det.flares.map(x => x.ed),
        sigma: det.sigma,
        days: d.t.length * (2 / 1440),
        truth: {
          alpha: d.truth.spec.flares.alpha,
          injected: d.truth.flares.length,
        },
      };
    });
  }
  const eds = run.eds;
  const cum = cumulativeFrequency(eds, run.days);
  let edMin;
  if (floorMode === 0) edMin = completenessEd(run.sigma);
  else if (floorMode === 1)
    edMin = scanEdMin(eds)?.edMin ?? completenessEd(run.sigma);
  else edMin = Math.min(...eds);
  const fit = powerLawSlope(eds, edMin);
  return {
    source,
    floorMode,
    cum,
    edMin,
    fit,
    flares: eds.length,
    days: run.days,
    sigma: run.sigma,
    truth: run.truth,
  };
}

/** The power law's cumulative rate at an equivalent duration, through (edMin, n / days). */
export const lawRate = (view, ed) =>
  (view.fit.n / view.days) * (ed / view.edMin) ** (1 - view.fit.alpha);
