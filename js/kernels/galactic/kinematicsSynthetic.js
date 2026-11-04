// =============================================================================
// Galactic kernel: synthetic samples with a truth manifest (Prompt 235)
// -----------------------------------------------------------------------------
// The test of a method is whether it recovers a truth it was not told, under the
// selection the real sample carries. These generators take the real sample's
// rows as the design (positions, parallaxes, errors, colours, metallicities, the
// windows that excluded some) and replace the velocities with a model's, then
// observe them with the rows' own errors. Every number of the model is a
// synthetic truth chosen in tests/fixtures/kinematics/thresholds.json, none a
// published value, and the manifest of each sample says so.
//
// Not part of any lesson's bundle: only the validator, the oracle's input
// writer and the tests import this.
// =============================================================================

import { K_PM, A_G, icrsToGalactic } from './coords.js';
import { stream, gaussian } from '../../random/streams.js';

const DEG = Math.PI / 180;

/** The synthetic truth the validator reads from thresholds.json; this copy is checked equal to it by a test. */
export const SYNTHETIC_TRUTH = Object.freeze({
  disk: Object.freeze({ R0: 8.0, V0: 220, slope: -2.0 }),
  sunPeculiar: Object.freeze({ U: 10.0, V: 13.0, W: 7.0 }),
  driftK: 80,
  young: Object.freeze([22, 15, 11]),
  old: Object.freeze([45, 32, 24]),
  segue: Object.freeze({
    bin1: Object.freeze({ sigma: [140, 100, 95], meanAzimuthal: 0 }),
    bin2: Object.freeze({ sigma: [63, 45, 38], lag: 40 }),
    bin3: Object.freeze({ sigma: [40, 27, 19], lag: 20 }),
  }),
});

/** The truth values A and B of a disk with a straight rotation curve. */
export const oortTruth = ({ R0, V0, slope }) => ({
  A: 0.5 * (V0 / R0 - slope),
  B: -0.5 * (V0 / R0 + slope),
});

const vcAt = (R, d) => d.V0 + d.slope * (R - d.R0);

/** Row-order helper: ranks of a list (0 smallest), ties broken by index. */
const rankFractions = values => {
  const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b] || a - b);
  const q = new Float64Array(values.length);
  order.forEach((i, r) => {
    q[i] = (r + 0.5) / values.length;
  });
  return q;
};

/**
 * A synthetic neighbourhood sample on the real pack's geometry.
 *
 * @param {{ra: ArrayLike<number>, dec: ArrayLike<number>, parallax: ArrayLike<number>,
 *   parallax_err: ArrayLike<number>, pmra_err: ArrayLike<number>, pmdec_err: ArrayLike<number>,
 *   pm_corr: ArrayLike<number>, rv_err: ArrayLike<number>, bp_rp: ArrayLike<number>}} design
 *   the pack's columns by id
 * @param {{seed: number|string, label: string, truth?: object, noise?: boolean,
 *   populations?: 'mixed'|'young', distance?: number, dispersion?: boolean, rounding?: number}} opts
 *   `noise: false` and `dispersion: false` give the noise-free, cold disk of the
 *   analytic leg; `distance` places every star at one distance; `populations:
 *   'young'` makes every star young (no dispersion lever for the drift); `rounding`
 *   is the parallax step of the pack (0.02 mas)
 * @returns {{stars: Array<object>, manifest: object}}
 */
export function syntheticNeighbourhood(design, opts) {
  const truth = opts.truth ?? SYNTHETIC_TRUTH;
  const noise = opts.noise !== false;
  const dispersion = opts.dispersion !== false;
  const rounding = opts.rounding ?? 0.02;
  const u = stream('noise', opts.seed, opts.label);
  const z = gaussian(u);
  const n = design.ra.length;
  const q = rankFractions(Array.from(design.bp_rp));
  const D = truth.disk;
  const stars = [];
  let oldCount = 0;
  for (let i = 0; i < n; i++) {
    const ra = design.ra[i];
    const dec = design.dec[i];
    const { l, b } = icrsToGalactic(ra, dec);
    const plxTrue = opts.distance ? 1 / opts.distance : design.parallax[i];
    const d = 1 / plxTrue;
    const cl = Math.cos(l * DEG);
    const sl = Math.sin(l * DEG);
    const cb = Math.cos(b * DEG);
    const sb = Math.sin(b * DEG);
    const x = -D.R0 + d * cb * cl;
    const y = d * cb * sl;
    const R = Math.hypot(x, y);
    const eR = [x / R, y / R, 0];
    const ePhi = [y / R, -x / R, 0];
    const old = opts.populations === 'young' ? false : u() < q[i];
    if (old) oldCount++;
    const sig = old ? truth.old : truth.young;
    const lag = dispersion ? (sig[0] * sig[0]) / truth.driftK : 0;
    const uR = dispersion ? sig[0] * z() : 0;
    const vPhi = dispersion ? sig[1] * z() : 0;
    const w = dispersion ? sig[2] * z() : 0;
    const speedPhi = vcAt(R, D) - lag + vPhi;
    // The star's velocity in the Galactic axes, and the Sun's, which is circular at R0 plus its peculiar motion.
    const vs = [
      speedPhi * ePhi[0] + uR * eR[0],
      speedPhi * ePhi[1] + uR * eR[1],
      w,
    ];
    const sun = [
      truth.sunPeculiar.U,
      D.V0 + truth.sunPeculiar.V,
      truth.sunPeculiar.W,
    ];
    const v = [vs[0] - sun[0], vs[1] - sun[1], vs[2] - sun[2]];
    const nHat = [cb * cl, cb * sl, sb];
    const vr = v[0] * nHat[0] + v[1] * nHat[1] + v[2] * nHat[2];
    const vt = [v[0] - vr * nHat[0], v[1] - vr * nHat[1], v[2] - vr * nHat[2]];
    // Galactic to ICRS (A_G is the ICRS to Galactic matrix, so its transpose goes back).
    const vIcrs = [0, 1, 2].map(
      k => A_G[0][k] * vt[0] + A_G[1][k] * vt[1] + A_G[2][k] * vt[2]
    );
    const east = [-Math.sin(ra * DEG), Math.cos(ra * DEG), 0];
    const north = [
      -Math.cos(ra * DEG) * Math.sin(dec * DEG),
      -Math.sin(ra * DEG) * Math.sin(dec * DEG),
      Math.cos(dec * DEG),
    ];
    const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
    let pmRa = dot(vIcrs, east) / (K_PM * d);
    let pmDec = dot(vIcrs, north) / (K_PM * d);
    let rv = vr;
    let parallax = plxTrue;
    if (noise) {
      const sa = design.pmra_err[i];
      const sd = design.pmdec_err[i];
      const rho = design.pm_corr[i];
      const z1 = z();
      const z2 = z();
      pmRa += sa * z1;
      pmDec += sd * (rho * z1 + Math.sqrt(Math.max(0, 1 - rho * rho)) * z2);
      rv += design.rv_err[i] * z();
      parallax = plxTrue + design.parallax_err[i] * z();
      if (rounding > 0) parallax = Math.round(parallax / rounding) * rounding;
    }
    stars.push({
      ra,
      dec,
      parallax,
      pmRa,
      pmDec,
      rv,
      bpRp: design.bp_rp[i],
      truePopulation: old ? 'old' : 'young',
    });
  }
  return {
    stars,
    manifest: {
      kind: 'synthetic neighbourhood on the real pack geometry',
      seed: opts.seed,
      stream: u.stream.key,
      label: opts.label,
      stars: n,
      oldStars: oldCount,
      populations: opts.populations ?? 'mixed',
      noise,
      dispersion,
      distance: opts.distance ?? null,
      truth: {
        ...oortTruth(D),
        disk: D,
        sunPeculiar: truth.sunPeculiar,
        driftK: truth.driftK,
        vSun: truth.sunPeculiar.V,
      },
      note: 'synthetic truth, labelled; no published value',
    },
  };
}

/**
 * A synthetic SEGUE sample on the real survivors' design.
 *
 * @param {Array<{ra: number, dec: number, feh: number, e: number, windowed: boolean}>} design
 * @param {{seed: number|string, label: string, window: [number, number], truth?: object,
 *   edges?: number[], sigmaZero?: boolean, mixture?: {from: number, to: number, fraction: number}}} opts
 *   `sigmaZero` gives every star an intrinsic sigma of 0 (the refusal leg);
 *   `mixture` replaces a fraction of the stars of bin `to` with stars of bin `from`'s population
 * @returns {{stars: Array<object>, truthByBin: Array<{mean: number, sigma: number, n: number}>, manifest: object}}
 */
export function syntheticSegue(design, opts) {
  const T = opts.truth ?? SYNTHETIC_TRUTH;
  const truth = T.segue;
  const edges = opts.edges ?? [-1.0, -0.5];
  const sun = T.sunPeculiar;
  const V0 = T.disk.V0;
  const u = stream('noise', opts.seed, opts.label);
  const z = gaussian(u);
  const pops = [truth.bin1, truth.bin2, truth.bin3];
  const stars = [];
  const acc = pops.map(() => ({ n: 0, m: 0, v: 0, mm: 0 }));
  for (const row of design) {
    let b = 0;
    while (b < edges.length && row.feh >= edges[b]) b++;
    let pop = pops[b];
    if (opts.mixture && b === opts.mixture.to && u() < opts.mixture.fraction)
      pop = pops[opts.mixture.from];
    const { l, b: bb } = icrsToGalactic(row.ra, row.dec);
    const nHat = [
      Math.cos(bb * DEG) * Math.cos(l * DEG),
      Math.cos(bb * DEG) * Math.sin(l * DEG),
      Math.sin(bb * DEG),
    ];
    // Heliocentric mean velocity of the population in the Galactic axes.
    const azimuthal = pop.meanAzimuthal !== undefined ? pop.meanAzimuthal : V0 - pop.lag;
    const mean = [-sun.U, azimuthal - (V0 + sun.V), -sun.W];
    const sig = opts.sigmaZero ? [0, 0, 0] : pop.sigma;
    const mLos = mean[0] * nHat[0] + mean[1] * nHat[1] + mean[2] * nHat[2];
    const vLos =
      sig[0] ** 2 * nHat[0] ** 2 + sig[1] ** 2 * nHat[1] ** 2 + sig[2] ** 2 * nHat[2] ** 2;
    const sLos = Math.sqrt(vLos);
    let measured;
    let tries = 0;
    do {
      measured = mLos + sLos * z() + row.e * z();
      tries++;
    } while (
      row.windowed &&
      measured >= opts.window[0] &&
      measured <= opts.window[1] &&
      tries < 10000
    );
    stars.push({ feh: row.feh, v: measured, e: row.e, windowed: row.windowed, bin: b });
    const a = acc[b];
    a.n++;
    a.m += mLos;
    a.v += vLos;
    a.mm += mLos * mLos;
  }
  const truthByBin = acc.map(a => {
    const m = a.n ? a.m / a.n : NaN;
    // Pooled variance about the pooled mean: mean variance plus the spread of the means.
    const varPooled = a.n ? a.v / a.n + a.mm / a.n - m * m : NaN;
    return { n: a.n, mean: m, sigma: Math.sqrt(Math.max(varPooled, 0)) };
  });
  return {
    stars,
    truthByBin,
    manifest: {
      kind: 'synthetic SEGUE sight line on the real survivors',
      seed: opts.seed,
      stream: u.stream.key,
      label: opts.label,
      stars: design.length,
      truthByBin: truthByBin.map(t => ({
        n: t.n,
        mean: Number(t.mean.toPrecision(8)),
        sigma: Number(t.sigma.toPrecision(8)),
      })),
      note: 'synthetic truth, labelled; the intrinsic line-of-sight sigma is the pooled value of the bin before the window, with each star drawn from the population conditional on being outside its window',
    },
  };
}

/** The mean line-of-sight variance of a bin of the real design (closed form), for the analytic leg. */
export function pooledLosSigma(design, bin, { truth = SYNTHETIC_TRUTH, edges = [-1.0, -0.5] } = {}) {
  const pop = [truth.segue.bin1, truth.segue.bin2, truth.segue.bin3][bin];
  const sun = truth.sunPeculiar;
  let n = 0;
  let sv = 0;
  let sm = 0;
  let smm = 0;
  for (const row of design) {
    let b = 0;
    while (b < edges.length && row.feh >= edges[b]) b++;
    if (b !== bin) continue;
    const { l, b: bb } = icrsToGalactic(row.ra, row.dec);
    const nHat = [
      Math.cos(bb * DEG) * Math.cos(l * DEG),
      Math.cos(bb * DEG) * Math.sin(l * DEG),
      Math.sin(bb * DEG),
    ];
    const az = pop.meanAzimuthal !== undefined ? pop.meanAzimuthal : truth.disk.V0 - pop.lag;
    const m = -sun.U * nHat[0] + (az - (truth.disk.V0 + sun.V)) * nHat[1] - sun.W * nHat[2];
    const v = pop.sigma[0] ** 2 * nHat[0] ** 2 + pop.sigma[1] ** 2 * nHat[1] ** 2 + pop.sigma[2] ** 2 * nHat[2] ** 2;
    n++;
    sv += v;
    sm += m;
    smm += m * m;
  }
  const m = sm / n;
  return { n, mean: m, sigma: Math.sqrt(sv / n + smm / n - m * m) };
}
