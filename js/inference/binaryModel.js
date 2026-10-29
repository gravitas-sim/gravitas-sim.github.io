// =============================================================================
// The detached eclipsing binary as a model of the inference core (Prompt 217)
// -----------------------------------------------------------------------------
// The physics is js/stellar/binaries.js (two spheres, quadratic limb darkening,
// Kepler orbit); this file says what the fitter needs of it: the parameters
// with their bounds, the exact solution of the baseline, the derived
// quantities, a start from the data, and the identifiability of the result.
//
// The core's three kinds of parameter are kept apart as for a transit: fitted
// (tc, P, rsum, k, inc, J, e cos w, e sin w, each fixable), fixed settings the
// reader or the model supplies (the limb-darkening coefficients of each star,
// third light, the exposure) and derived (r1, r2, e, w, the light ratio, the
// durations, the secondary's phase) with their uncertainties through the
// covariance. Limb darkening is never fitted by default: it is read from a
// cited table for the stars' temperatures, and a reader who fits it is
// departing from this model (BINARIES.md).
// =============================================================================

import {
  contacts,
  derivedQuantities,
  eclipseFlux,
  identifiability,
} from '../stellar/binaries.js';

const { Math, Float64Array } = globalThis;

/** Quadratic coefficients of a Sun-like star in the TESS band (Claret 2017, rounded), the default for both stars. */
export const DEFAULT_LD = Object.freeze([0.4, 0.22]);

const median = v => {
  const s = Array.from(v).sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : NaN;
};

/** The phase-folded, binned flux at a period and a reference epoch. */
function fold(data, P, t0, nb) {
  const sum = new Float64Array(nb);
  const cnt = new Float64Array(nb);
  for (let i = 0; i < data.x.length; i++) {
    const ph = ((((data.x[i] - t0) / P) % 1) + 1) % 1;
    const b = Math.min(nb - 1, Math.floor(ph * nb));
    sum[b] += data.y[i];
    cnt[b]++;
  }
  return {
    mean: Float64Array.from(sum, (s, i) => (cnt[i] ? s / cnt[i] : NaN)),
    cnt,
  };
}

/**
 * The period of least phase dispersion in [lo, hi] (Stellingwerf 1978): fold on
 * each trial, bin in 200 phases and add the scatter inside the bins. The step
 * keeps a feature a twentieth of a period wide within a quarter of its width
 * across the whole span.
 */
function dispersionSearch(data, lo, hi) {
  const x = data.x;
  const span = x[x.length - 1] - x[0] || 1;
  const df = 0.0125 / span;
  const nb = 200;
  let best = lo;
  let bestScore = Infinity;
  const s = new Float64Array(nb);
  const s2 = new Float64Array(nb);
  const c = new Float64Array(nb);
  for (let f = 1 / hi; f <= 1 / lo; f += df) {
    const P = 1 / f;
    s.fill(0);
    s2.fill(0);
    c.fill(0);
    for (let i = 0; i < x.length; i++) {
      const ph = ((((x[i] - x[0]) * f) % 1) + 1) % 1;
      const b = Math.min(nb - 1, Math.floor(ph * nb));
      const y = data.y[i];
      s[b] += y;
      s2[b] += y * y;
      c[b]++;
    }
    let score = 0;
    for (let b = 0; b < nb; b++)
      if (c[b] > 0) score += s2[b] - (s[b] * s[b]) / c[b];
    if (score < bestScore) {
      bestScore = score;
      best = P;
    }
  }
  return best;
}

/**
 * Starting values from the folded data: the deepest bin is the primary, the
 * deepest bin at least a tenth of a period from it is the secondary, the width
 * of the primary's half depth gives rsum, the secondary's phase gives e cos w.
 * Refuses, naming the missing eclipse, when the deepest bin is not five times
 * the noise of its own points (D3).
 */
function startsAt(data, request, P) {
  const nb = 360;
  const t0 = data.x[0];
  const { mean, cnt } = fold(data, P, t0, nb);
  const ok = Array.from(mean, (v, i) => (cnt[i] >= 1 ? i : -1)).filter(
    i => i >= 0
  );
  if (ok.length < 20) return null;
  const base = median(ok.map(i => mean[i]));
  // The scatter of single points from their neighbours, the noise of one row.
  const d = [];
  for (let i = 1; i < data.y.length; i++)
    d.push(Math.abs(data.y[i] - data.y[i - 1]));
  const row = median(d) / 0.6745 / Math.SQRT2;
  const dist = (a, b) => Math.min(Math.abs(a - b), nb - Math.abs(a - b));
  let ip = ok[0];
  for (const i of ok) if (mean[i] < mean[ip]) ip = i;
  const depth1 = base - mean[ip];
  if (!(depth1 > 5 * (row / Math.sqrt(Math.max(1, cnt[ip])))))
    return {
      refusal: `no eclipse found: the deepest dip, ${depth1.toExponential(2)} of the flux, is not five times the noise of its own points`,
    };
  let is = -1;
  for (const i of ok)
    if (dist(i, ip) >= nb / 10 && (is < 0 || mean[i] < mean[is])) is = i;
  const depth2 = is >= 0 ? Math.max(0, base - mean[is]) : 0;
  // Half-depth width of the primary, in bins, walking out each side.
  const half = base - depth1 / 2;
  let w = 1;
  for (const s of [-1, 1])
    for (let j = 1; j < nb / 4; j++) {
      const v = mean[(ip + s * j + nb * 4) % nb];
      if (!(v < half)) break;
      w++;
    }
  const widthPhase = w / nb;
  const phase = (ip + 0.5) / nb;
  const phaseSec = is >= 0 ? (is + 0.5) / nb : phase + 0.5;
  let dphi = (phaseSec - phase) % 1;
  if (dphi < 0) dphi += 1;
  return {
    tc: t0 + phase * P,
    rsum: Math.min(0.6, Math.max(0.04, 5.7 * widthPhase)),
    J: Math.min(1, Math.max(0.05, depth1 > 0 ? depth2 / depth1 : 0.5)),
    ecosw: Math.max(-0.5, Math.min(0.5, (Math.PI / 2) * (dphi - 0.5))),
  };
}

export const ECLIPSING_BINARY = {
  id: 'eclipsing-binary',
  version: '1.0.0',
  quantity: 'relative flux against time',
  parameters: [
    { name: 'tc', unit: 'd', label: 'time of primary conjunction' },
    { name: 'P', unit: 'd', label: 'period' },
    {
      name: 'rsum',
      unit: '',
      label: '(R1 + R2) / a',
      lo: 0.02,
      hi: 0.9,
      start: 0.2,
    },
    { name: 'k', unit: '', label: 'R2 / R1', lo: 0.05, hi: 20, start: 1 },
    {
      name: 'inc',
      unit: 'deg',
      label: 'inclination',
      lo: 45,
      hi: 90,
      start: 88,
    },
    {
      name: 'J',
      unit: '',
      label: 'central surface brightness ratio S2/S1',
      lo: 0.01,
      hi: 1,
      start: 0.8,
    },
    { name: 'ecosw', unit: '', label: 'e cos w', lo: -0.7, hi: 0.7, start: 0 },
    { name: 'esinw', unit: '', label: 'e sin w', lo: -0.7, hi: 0.7, start: 0 },
  ],
  linear: [{ name: 'f0', unit: '', label: 'baseline flux' }],
  notClaimed: [
    "Masses: eclipses give radii as fractions of the orbit and a ratio of surface brightnesses; a mass needs the stars' radial velocities and the orbit's size in kilometres (the SB2-plus-eclipse chain).",
    'The radius ratio of a grazing or a shallow partial eclipse: it is a valley of rsum, k and inc, not a number, and the result says so when it is one.',
    'A well-determined e sin w: the ratio of the two eclipse durations fixes it weakly, and a third body, apsidal motion or a wrong limb darkening moves it as much.',
    'Anything the model leaves out: reflection, ellipsoidal variation, Doppler beaming, gravity darkening, spots, pulsation, a third body. A fit with reduced chi-square or correlated residuals above the stated test is telling you so.',
    'Absolute radii or temperatures: a surface brightness ratio in one band is not a temperature ratio without a calibration, and a fractional radius is not a length.',
  ],
  assumptions: [
    'Two spherical stars on a Keplerian orbit, detached (no mass transfer, no tidal distortion).',
    'Quadratic limb darkening with the coefficients of the settings (ldA, ldB), fixed.',
    'One band; third light fixed (default 0, for data already corrected).',
    "The parameter w is that of the orbit of star 2 about star 1 (Winn 2010): the primary star's own, the one radial-velocity work quotes, is w + 180 degrees. Star 1 is the star eclipsed at the primary eclipse, and J is at most 1, so the primary is the deeper eclipse.",
    'Each point is the mean over its exposure, sampled at `supersample` instants.',
  ],

  predict(v, x, settings = {}) {
    return eclipseFlux(
      x,
      {
        tc: v.tc,
        P: v.P,
        rsum: v.rsum,
        k: v.k,
        inc: v.inc,
        J: v.J,
        ecosw: v.ecosw,
        esinw: v.esinw,
        ldA: settings.ldA || DEFAULT_LD,
        ldB: settings.ldB || DEFAULT_LD,
        thirdLight: settings.thirdLight || 0,
        annuli: settings.annuli || 64,
      },
      settings
    );
  },

  /** y = f0 * shape: f0 is the weighted mean ratio, exactly. */
  solveLinear(data, w, shape) {
    let a = 0;
    let c = 0;
    for (let i = 0; i < shape.length; i++) {
      a += w[i] * data.y[i] * shape[i];
      c += w[i] * shape[i] * shape[i];
    }
    const f0 = c > 0 ? a / c : 1;
    return { fit: shape.map(s => f0 * s), linear: { f0 } };
  },

  /** Keep e below 0.7 by scaling the pair back onto its circle. */
  project(theta, free) {
    const a = free.findIndex(p => p.name === 'ecosw');
    const b = free.findIndex(p => p.name === 'esinw');
    if (a < 0 || b < 0) return theta;
    const r = Math.hypot(theta[a], theta[b]);
    if (r <= 0.7) return theta;
    const out = theta.slice();
    out[a] *= 0.7 / r;
    out[b] *= 0.7 / r;
    return out;
  },

  /** Starts from the folded data; the period from the reader's bounds, searched when they are wide. */
  starts(data, request) {
    const req = request.parameters || {};
    const lo = req.P?.lo ?? 0.2;
    const hi = req.P?.hi ?? lo * 1.1;
    const fixedP = req.P?.mode === 'fixed' ? req.P.value : null;
    let periods;
    if (fixedP !== null) periods = [fixedP];
    else if (hi / lo <= 1.05) periods = [(lo + hi) / 2];
    else {
      // Wide: the string of least phase dispersion, and its double, since two
      // eclipses of equal depth fold onto each other at half the period.
      const P0 = dispersionSearch(data, lo, hi);
      periods = [P0, ...(2 * P0 <= hi ? [2 * P0] : [])];
    }
    const out = [];
    for (const P of periods) {
      const s = startsAt(data, request, P);
      if (s?.refusal) throw new Error(s.refusal);
      if (!s) continue;
      const tcReq = req.tc;
      let tc = tcReq?.mode === 'fixed' ? tcReq.value : s.tc;
      if (tcReq?.lo !== undefined && tcReq.mode !== 'fixed') {
        while (tc < tcReq.lo) tc += P;
        while (tc > tcReq.hi) tc -= P;
      }
      for (const k of [0.7, 1, 1.5])
        for (const inc of [86, 89])
          out.push({
            tc,
            P,
            rsum: s.rsum,
            k,
            inc,
            J: s.J,
            ecosw: s.ecosw,
            esinw: 0,
          });
    }
    if (!out.length)
      throw new Error(
        'no eclipse found: too few rows across the orbit to fold'
      );
    return out;
  },

  derived(v, settings = {}) {
    const q = derivedQuantities({
      tc: v.tc,
      P: v.P,
      rsum: v.rsum,
      k: v.k,
      inc: v.inc,
      J: v.J,
      ecosw: v.ecosw,
      esinw: v.esinw,
      ldA: settings.ldA || DEFAULT_LD,
      ldB: settings.ldB || DEFAULT_LD,
    });
    return {
      r1: { value: q.r1, unit: '', label: 'R1 / a' },
      r2: { value: q.r2, unit: '', label: 'R2 / a' },
      e: { value: q.e, unit: '', label: 'eccentricity' },
      omega: {
        value: q.w,
        unit: 'deg',
        label: 'argument of periastron (star 2 about star 1)',
      },
      lightRatio: { value: q.lightRatio, unit: '', label: 'light ratio L2/L1' },
      secondaryPhase: {
        value: q.secondaryPhase,
        unit: '',
        label: 'phase of the secondary eclipse',
      },
      primaryDuration: {
        value: q.primaryDuration,
        unit: 'd',
        label: 'primary eclipse duration, first to last contact',
      },
      secondaryDuration: {
        value: q.secondaryDuration,
        unit: 'd',
        label: 'secondary eclipse duration, first to last contact',
      },
    };
  },

  /** What the data fix and what they leave open (binaries.js identifiability()). */
  identify(out) {
    return identifiability(out);
  },
};

export { contacts };
