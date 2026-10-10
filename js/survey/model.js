// =============================================================================
// Surveys of synthetic populations: who gets counted, and who is missed
// -----------------------------------------------------------------------------
// A universe (stars of known absolute magnitude, scattered uniformly through a
// cone of known solid angle) is observed by an instrument with a stated
// magnitude limit, completeness function and errors that grow with faintness.
// Because the universe is made here, the truth is known: the luminosity
// function that went in, the stars that were missed and the distances that
// were never measured. Everything below is pure: no DOM, no clock, and every
// random draw is keyed by the seed and the star's index, so changing the limit
// never changes the noise of the stars that remain.
//
// What it contains, and what it leaves out
// -----------------------------------------------------------------------------
// The magnitude is a bolometric magnitude, M = 4.74 - 2.5 log10(L / Lsun): a
// survey that sees all wavelengths at once. There is no bolometric correction,
// no interstellar extinction, no binaries, and the stars are spread uniformly
// in space (no disc, no halo, no clustering). Proper motions are drawn from an
// isotropic Gaussian velocity distribution that has nothing to do with the
// stars' masses. Each is a simplification a real survey has to face and this
// one does not.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';
import { gaussianAt } from '../rvSurvey.js';
import { synthesisePopulation } from '../stellar/population.js';
import { quantile, bootstrap, sortedFinite } from '../analysis/stats.js';

// Bound once: in Jest's vm context free global reads are slow (see the
// analysis lab's stats.js).
const { Math, Number, Float64Array, Int32Array } = globalThis;

export const SOLAR_BOLOMETRIC_MAG = 4.74;
/** 1 AU/yr in km/s, for turning a transverse speed into a proper motion. */
export const KMS_PER_AU_YR = 4.74047;
/** Square degrees on the whole sky. */
export const SKY_DEG2 = 41252.96;
/** Malmquist (1936): at a fixed apparent magnitude in a uniform-density
 *  field, <M> = M0 - (3 ln 10 / 5) sigma^2, with 3 ln 10 / 5 = 1.3816. */
export const MALMQUIST_COEFFICIENT = (3 * Math.LN10) / 5;

export const absoluteMagnitude = luminositySun =>
  SOLAR_BOLOMETRIC_MAG - 2.5 * Math.log10(luminositySun);

/** An error that is flat for bright stars and grows as 10^(slope m) for faint
 *  ones (photon noise: slope 0.2 is flux error proportional to sqrt(flux)). */
export const errorAt = (spec, m) =>
  spec.floor * Math.sqrt(1 + 10 ** (2 * spec.slope * (m - spec.m0)));

/** The fraction of stars at apparent magnitude m the instrument finds. */
export const completenessAt = (c, m) =>
  c ? 1 / (1 + Math.exp((m - c.m50) / c.width)) : 1;

/** The default instrument: a deep survey with Gaia-like astrometry (0.02 mas
 *  to G = 13, growing as flux error: 0.2 mas at 18). */
export const DEFAULT_INSTRUMENT = Object.freeze({
  limit: 18,
  skyAreaDeg2: 100,
  completeness: null,
  errors: Object.freeze({
    mag: Object.freeze({ floor: 0.01, m0: 17, slope: 0.2 }),
    parallax: Object.freeze({ floor: 0.02, m0: 13, slope: 0.2 }),
    pm: Object.freeze({ floor: 0.02, m0: 13, slope: 0.2 }),
  }),
});

/** Merge a partial instrument over the defaults and check it. */
export function readInstrument(partial = {}) {
  const inst = {
    ...DEFAULT_INSTRUMENT,
    ...partial,
    errors: { ...DEFAULT_INSTRUMENT.errors, ...(partial.errors ?? {}) },
  };
  const fin = v => Number.isFinite(v);
  if (!fin(inst.limit)) throw new Error('the survey needs a magnitude limit');
  if (!(inst.skyAreaDeg2 > 0 && inst.skyAreaDeg2 <= SKY_DEG2))
    throw new Error('the sky area is between 0 and the whole sky, in deg²');
  if (
    inst.completeness &&
    !(inst.completeness.width > 0 && fin(inst.completeness.m50))
  )
    throw new Error('a completeness function needs m50 and a positive width');
  for (const k of ['mag', 'parallax', 'pm']) {
    const e = inst.errors[k];
    if (!(e.floor > 0 && fin(e.m0) && fin(e.slope) && e.slope >= 0))
      throw new Error(`the ${k} error needs a positive floor, m0 and a slope`);
  }
  return inst;
}

/**
 * The universe: n stars of known absolute magnitude, uniform in space.
 *
 * @param {object} [spec]
 * @param {'population'|'gaussian'} [spec.kind] - 'population' draws stars from
 *   the stellar-population synthesis (js/stellar/population.js); 'gaussian' is
 *   a standard candle with scatter, the textbook case Malmquist solved
 * @param {number} [spec.count] - Stars to draw (a population drops the few
 *   that have left the main sequence)
 * @param {string} [spec.seed]
 * @param {number} [spec.maxPc] - The cone's depth
 * @param {number} [spec.areaDeg2] - The cone's sky area
 * @param {number} [spec.meanM] - Gaussian: mean absolute magnitude
 * @param {number} [spec.sigmaM] - Gaussian: its scatter
 * @param {number} [spec.sigmaV] - One-axis velocity dispersion, km/s
 */
export function makeUniverse(spec = {}) {
  const {
    kind = 'population',
    count = 3000,
    seed = 'survey-1',
    maxPc = 1000,
    areaDeg2 = 100,
    meanM = 5,
    sigmaM = 0.7,
    sigmaV = 30,
  } = spec;
  let M;
  let stars = null;
  if (kind === 'population') {
    stars = synthesisePopulation({ count, seed: `${seed}:population` }).stars;
    M = Float64Array.from(stars, s => absoluteMagnitude(s.luminositySun));
  } else if (kind === 'gaussian') {
    M = Float64Array.from(
      { length: count },
      (_, i) => meanM + sigmaM * gaussianAt(`${seed}:M`, i)
    );
  } else throw new Error(`no universe of kind "${kind}"`);
  const n = M.length;
  const place = mulberry32(normalizeSeed(`${seed}:place`));
  const omega = (areaDeg2 / SKY_DEG2) * 4 * Math.PI;
  const d = new Float64Array(n);
  const m = new Float64Array(n);
  const plx = new Float64Array(n);
  const pmRa = new Float64Array(n);
  const pmDec = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    d[i] = maxPc * Math.cbrt(place());
    m[i] = M[i] + 5 * Math.log10(d[i] / 10);
    plx[i] = 1000 / d[i];
    const k = plx[i] / KMS_PER_AU_YR; // mas/yr per km/s
    pmRa[i] = sigmaV * gaussianAt(`${seed}:vra`, i) * k;
    pmDec[i] = sigmaV * gaussianAt(`${seed}:vdec`, i) * k;
  }
  return {
    kind,
    seed,
    maxPc,
    areaDeg2,
    omega,
    volume: (omega * maxPc ** 3) / 3,
    n,
    M,
    d,
    m,
    plx,
    pmRa,
    pmDec,
    ids: Array.from({ length: n }, (_, i) => `s${i}`),
    stars,
    meanM,
    sigmaM,
    sigmaV,
  };
}

/**
 * Observe a universe. Selection is on the OBSERVED magnitude, as at a
 * telescope: a faint star can scatter in, a bright one out.
 * @returns {object} per-star arrays (all n), the detection flag and counts
 */
export function observe(u, partialInstrument = {}) {
  const inst = readInstrument(partialInstrument);
  const key = `${u.seed}:obs`;
  const n = u.n;
  const mObs = new Float64Array(n);
  const sigM = new Float64Array(n);
  const plxObs = new Float64Array(n);
  const sigPlx = new Float64Array(n);
  const pmRaObs = new Float64Array(n);
  const pmDecObs = new Float64Array(n);
  const sigPm = new Float64Array(n);
  const detected = new Uint8Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) {
    sigM[i] = errorAt(inst.errors.mag, u.m[i]);
    mObs[i] = u.m[i] + sigM[i] * gaussianAt(`${key}:mag`, i);
    // The errors of astrometry follow the star's true magnitude (what the
    // instrument had to work with), the selection follows the measured one.
    sigPlx[i] = errorAt(inst.errors.parallax, u.m[i]);
    sigPm[i] = errorAt(inst.errors.pm, u.m[i]);
    plxObs[i] = u.plx[i] + sigPlx[i] * gaussianAt(`${key}:plx`, i);
    pmRaObs[i] = u.pmRa[i] + sigPm[i] * gaussianAt(`${key}:pmra`, i);
    pmDecObs[i] = u.pmDec[i] + sigPm[i] * gaussianAt(`${key}:pmdec`, i);
    if (mObs[i] <= inst.limit) {
      const c = completenessAt(inst.completeness, mObs[i]);
      const draw = mulberry32(normalizeSeed(`${key}:detect:${i}`))();
      if (draw < c) {
        detected[i] = 1;
        count++;
      }
    }
  }
  const idx = [];
  for (let i = 0; i < n; i++) if (detected[i]) idx.push(i);
  return {
    instrument: inst,
    universe: u,
    mObs,
    sigM,
    plxObs,
    sigPlx,
    pmRaObs,
    pmDecObs,
    sigPm,
    detected,
    index: Int32Array.from(idx),
    count,
    missed: n - count,
  };
}

// -----------------------------------------------------------------------------
// Luminosity function
// -----------------------------------------------------------------------------

/** Bin edges, evenly spaced. */
export const edgesOf = (lo, hi, step) => {
  const out = [];
  for (let e = lo; e <= hi + 1e-9; e += step)
    out.push(Math.round(e * 1e9) / 1e9);
  return out;
};

/** The distance at which a star of absolute magnitude M reaches the limit, pc. */
export const limitDistance = (M, limit) => 10 ** ((limit - M + 5) / 5);

/**
 * The volume in which a star of absolute magnitude M would have been counted:
 * the cone's solid angle times the integral of the detection probability
 * over d² dd, from 0 to the cone's depth or to where the star reaches the
 * limit, whichever is nearer. With a hard limit and no completeness function
 * this is the 1/Vmax volume of Schmidt (1968), in closed form.
 */
export function effectiveVolume(M, instrument, omega, maxPc) {
  const end = Math.min(maxPc, limitDistance(M, instrument.limit));
  if (!(end > 0)) return 0;
  const c = instrument.completeness;
  if (!c) return (omega * end ** 3) / 3;
  const N = 400;
  const h = end / N;
  let s = 0;
  for (let k = 0; k < N; k++) {
    const dd = (k + 0.5) * h;
    s += completenessAt(c, M + 5 * Math.log10(dd / 10)) * dd * dd;
  }
  return omega * s * h;
}

/** Counts per bin of M, with the edges, for a list of absolute magnitudes. */
function binOf(M, edges) {
  const nb = edges.length - 1;
  const out = new Float64Array(nb);
  const lo = edges[0];
  const step = edges[1] - edges[0];
  for (const v of M) {
    const b = Math.floor((v - lo) / step + 1e-12);
    if (b >= 0 && b < nb) out[b]++;
  }
  return out;
}

/**
 * The luminosity function that went in: stars per cubic parsec per magnitude.
 * @returns {{edges: number[], centers: number[], phi: Float64Array, counts: Float64Array}}
 */
export function trueLuminosityFunction(u, edges) {
  const step = edges[1] - edges[0];
  const counts = binOf(u.M, edges);
  return {
    edges,
    centers: edges.slice(0, -1).map(e => e + step / 2),
    counts,
    phi: Float64Array.from(counts, c => c / (u.volume * step)),
  };
}

/**
 * The luminosity function a survey recovers, by the effective-volume method.
 * Each detected star counts 1 / (the volume it could have been seen in), in
 * its bin of absolute magnitude.
 *
 * @param {object} obs - From observe()
 * @param {number[]} edges
 * @param {'truth'|'catalogue'} [mode] - 'truth' uses each star's real absolute
 *   magnitude (what only a synthetic survey can do); 'catalogue' computes it
 *   as an analyst would, from the measured magnitude and parallax, and drops
 *   a star whose parallax is not positive
 */
export function recoveredLuminosityFunction(obs, edges, mode = 'truth') {
  const u = obs.universe;
  const step = edges[1] - edges[0];
  const nb = edges.length - 1;
  const phi = new Float64Array(nb);
  const varSum = new Float64Array(nb);
  const counts = new Float64Array(nb);
  const cache = new Map();
  let dropped = 0;
  for (const i of obs.index) {
    const M =
      mode === 'truth'
        ? u.M[i]
        : obs.plxObs[i] > 0
          ? obs.mObs[i] + 5 * Math.log10(obs.plxObs[i]) - 10
          : NaN;
    if (!Number.isFinite(M)) {
      dropped++;
      continue;
    }
    const b = Math.floor((M - edges[0]) / step + 1e-12);
    if (b < 0 || b >= nb) continue;
    const key = Math.round(M * 1000);
    let v = cache.get(key);
    if (v === undefined) {
      v = effectiveVolume(key / 1000, obs.instrument, u.omega, u.maxPc);
      cache.set(key, v);
    }
    if (!(v > 0)) continue;
    phi[b] += 1 / v / step;
    varSum[b] += (1 / v / step) ** 2;
    counts[b]++;
  }
  return {
    edges,
    centers: edges.slice(0, -1).map(e => e + step / 2),
    phi,
    sigma: Float64Array.from(varSum, s => Math.sqrt(s)),
    counts,
    dropped,
  };
}

/**
 * Recovered over true, bin by bin, for the bins with at least `minCount`
 * detected stars; the ratio and its Poisson error. 1 is a perfect recovery.
 */
export function recoveryRatios(truth, recovered, minCount = 1) {
  return truth.centers.map((c, b) => {
    const ok = truth.phi[b] > 0 && recovered.counts[b] >= minCount;
    return {
      M: c,
      truth: truth.phi[b],
      recovered: recovered.phi[b],
      ratio: ok ? recovered.phi[b] / truth.phi[b] : NaN,
      error: ok ? recovered.sigma[b] / truth.phi[b] : NaN,
      detected: recovered.counts[b],
      all: truth.counts[b],
    };
  });
}

// -----------------------------------------------------------------------------
// Biases, completeness and counts
// -----------------------------------------------------------------------------

const meanOf = (xs, idx) => {
  let s = 0;
  for (const i of idx) s += xs[i];
  return idx.length ? s / idx.length : NaN;
};
const allIndex = n => Int32Array.from({ length: n }, (_, i) => i);

/**
 * Malmquist bias, measured: the mean absolute magnitude of the stars the
 * survey counted against the mean of every star there is, overall and in
 * shells of distance. A negative difference means the counted stars are
 * brighter than the population.
 */
export function malmquistShells(obs, edgesPc) {
  const u = obs.universe;
  const rows = [];
  for (let s = 0; s + 1 < edgesPc.length; s++) {
    const inShell = i => u.d[i] >= edgesPc[s] && u.d[i] < edgesPc[s + 1];
    const all = [];
    const seen = [];
    for (let i = 0; i < u.n; i++)
      if (inShell(i)) {
        all.push(i);
        if (obs.detected[i]) seen.push(i);
      }
    const mAll = meanOf(u.M, all);
    const mSeen = meanOf(u.M, seen);
    rows.push({
      from: edgesPc[s],
      to: edgesPc[s + 1],
      stars: all.length,
      counted: seen.length,
      fraction: all.length ? seen.length / all.length : NaN,
      meanAll: mAll,
      meanCounted: mSeen,
      bias: mSeen - mAll,
    });
  }
  return rows;
}

/** The whole-sample version: counted minus all, in magnitudes. */
export function malmquistBias(obs) {
  const u = obs.universe;
  const all = allIndex(u.n);
  const meanAll = meanOf(u.M, all);
  const meanCounted = meanOf(u.M, obs.index);
  return { meanAll, meanCounted, bias: meanCounted - meanAll };
}

/**
 * Malmquist bias at a fixed apparent magnitude (the textbook form): the mean
 * absolute magnitude of stars with true apparent magnitude in [lo, hi) less
 * the population's mean. For a Gaussian luminosity function of scatter sigma
 * in a uniform field it tends to -1.3816 sigma^2 as the bin narrows.
 */
export function malmquistAtMagnitude(u, lo, hi) {
  const idx = [];
  for (let i = 0; i < u.n; i++) if (u.m[i] >= lo && u.m[i] < hi) idx.push(i);
  return {
    stars: idx.length,
    bias: meanOf(u.M, idx) - meanOf(u.M, allIndex(u.n)),
  };
}

/** The analytic Malmquist offset for a Gaussian luminosity function. */
export const malmquistFormula = sigma => -MALMQUIST_COEFFICIENT * sigma * sigma;

/**
 * Lutz-Kelker style bias, measured: among the stars whose measured parallax
 * is at least `snr` times its error (the sample an analyst would trust), the
 * mean fractional error of the measured parallax, and the mean error of the
 * absolute magnitude computed from it. More faint, distant stars scatter into
 * such a sample from below than bright, near ones scatter out of it, so
 * parallaxes in it are measured too large and the stars look too faint.
 */
export function parallaxSelectionBias(obs, snr) {
  const u = obs.universe;
  const idx = [];
  for (let i = 0; i < u.n; i++)
    if (obs.detected[i] && obs.plxObs[i] / obs.sigPlx[i] >= snr) idx.push(i);
  let frac = 0;
  let dM = 0;
  for (const i of idx) {
    frac += obs.plxObs[i] / u.plx[i] - 1;
    dM += 5 * Math.log10(obs.plxObs[i] / u.plx[i]);
  }
  const k = idx.length || NaN;
  return {
    stars: idx.length,
    meanFractionalError: frac / k,
    meanDeltaM: dM / k,
  };
}

/** The fraction of stars counted, by true apparent magnitude. */
export function completenessCurve(obs, edges) {
  const u = obs.universe;
  const all = binOf(u.m, edges);
  const seen = binOf(
    Float64Array.from(obs.index, i => u.m[i]),
    edges
  );
  const step = edges[1] - edges[0];
  return edges.slice(0, -1).map((e, b) => ({
    m: e + step / 2,
    stars: all[b],
    counted: seen[b],
    fraction: all[b] ? seen[b] / all[b] : NaN,
    model: completenessAt(obs.instrument.completeness, e + step / 2),
  }));
}

/** Cumulative counts N(<m) on a grid of apparent magnitude, of a list. */
export function cumulativeCounts(mags, grid) {
  const s = sortedFinite(mags);
  return grid.map(m => {
    let lo = 0;
    let hi = s.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid] <= m) lo = mid + 1;
      else hi = mid;
    }
    return { m, n: lo };
  });
}

/**
 * The slope of log10 N(<m) against m between two magnitudes, by least squares
 * on the points of a 0.25 mag grid with at least `minN` stars. A uniform
 * density of stars of one brightness gives 0.6 (the Euclidean count: every
 * magnitude is a factor 10^0.2 in distance and the count grows as its cube);
 * dust, a boundary, a disc or an incomplete sample bends it.
 */
export function countSlope(mags, lo, hi, minN = 10) {
  const grid = [];
  for (let m = lo; m <= hi + 1e-9; m += 0.25) grid.push(m);
  const pts = cumulativeCounts(mags, grid).filter(p => p.n >= minN);
  if (pts.length < 3) return null;
  const x = pts.map(p => p.m);
  const y = pts.map(p => Math.log10(p.n));
  const mx = x.reduce((a, b) => a + b, 0) / x.length;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  let sxy = 0;
  let sxx = 0;
  x.forEach((v, i) => {
    sxy += (v - mx) * (y[i] - my);
    sxx += (v - mx) ** 2;
  });
  return { slope: sxy / sxx, points: pts.length };
}

// -----------------------------------------------------------------------------
// Statistics of surveys: many seeds, and a bootstrap
// -----------------------------------------------------------------------------

/**
 * Sweep the limit over seeds. For each limit and seed, a fresh universe is
 * observed; the rows summarise the spread over seeds of the counted fraction,
 * the Malmquist bias and (for the catalogue estimate) the recovered
 * luminosity function in one bin, with the analysis lab's quantiles.
 */
export function sweepLimit({ universe, instrument, limits, seeds, bin }) {
  return limits.map(limit => {
    const frac = [];
    const bias = [];
    const ratio = [];
    for (const seed of seeds) {
      const u = makeUniverse({
        ...universe,
        seed: `${universe.seed ?? 'sweep'}:${seed}`,
      });
      const obs = observe(u, { ...instrument, limit });
      frac.push(obs.count / u.n);
      bias.push(malmquistBias(obs).bias);
      if (bin) {
        const edges = [bin[0], bin[1]];
        const t = trueLuminosityFunction(u, edges);
        const r = recoveredLuminosityFunction(obs, edges, 'truth');
        if (t.phi[0] > 0 && r.counts[0] > 0) ratio.push(r.phi[0] / t.phi[0]);
      }
    }
    const q = xs => {
      const s = sortedFinite(xs);
      return {
        lo: quantile(s, 0.025),
        median: quantile(s, 0.5),
        hi: quantile(s, 0.975),
      };
    };
    return {
      limit,
      fraction: q(frac),
      bias: q(bias),
      ratio: ratio.length ? q(ratio) : null,
      seeds: seeds.length,
    };
  });
}

/**
 * A bootstrap interval for the luminosity function in each bin: resample the
 * counted stars (with replacement), recompute the effective-volume sum, and
 * take the analysis lab's percentile interval.
 * @returns {Array<{M: number, estimate: number, lo: number, hi: number}|null>}
 */
export function bootstrapLuminosityFunction(obs, edges, o = {}) {
  const u = obs.universe;
  const step = edges[1] - edges[0];
  const nb = edges.length - 1;
  return Array.from({ length: nb }, (_, b) => {
    const w = [];
    for (const i of obs.index) {
      const M = u.M[i];
      if (M >= edges[b] && M < edges[b + 1])
        w.push(1 / effectiveVolume(M, obs.instrument, u.omega, u.maxPc) / step);
    }
    const r = bootstrap(
      w,
      xs => {
        let s = 0;
        for (const v of xs) s += v;
        return s;
      },
      { resamples: o.resamples ?? 400, seed: `${u.seed}:boot:${b}` }
    );
    return r ? { M: edges[b] + step / 2, ...r } : null;
  });
}
