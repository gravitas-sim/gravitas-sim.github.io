// =============================================================================
// Poisson rates, with the interval a count deserves (Prompt 243)
// -----------------------------------------------------------------------------
// A bin's count is a whole number drawn from a Poisson distribution. Its rate is the
// count over the live exposure and its error bar is an INTERVAL from the Poisson
// distribution itself: never sqrt(N), which is zero at no counts and wrong below about
// twenty. The interval is the exact one of Garwood (1936) at every count, the one the
// statistics kernel's `poissonInterval` offers as 'garwood' (its default switches to a
// profile interval above a hundred counts, which under-covers; this kernel does not use
// the default). With a background region the net rate has a profile-likelihood interval
// with the background rate profiled out (a likelihood-ratio deviance on one degree
// of freedom), constrained to a rate of 0 or more.
//
//   N_s ~ Poisson(T (S + r B)),  N_b ~ Poisson(T_b B),  S >= 0
//
// S is the net source rate, B the background rate per unit of the background region,
// r the ratio of the source region's area to the background region's, T and T_b the
// live exposures. The estimate is max(0, N_s / T - r N_b / T_b).
// =============================================================================

import { levelOfSigma, poissonInterval } from '../statistics/intervals.js';
import { chi2Quantile, lnGamma } from '../statistics/special.js';
import { refused } from '../statistics/check.js';
import { bandCounts, stamp, validateSeries } from './contract.js';

const { Math, Number } = globalThis;

/** The default level: the two-sided probability inside one normal sigma. */
export const ONE_SIGMA = levelOfSigma(1);

/**
 * An exact Poisson count of mean `mu` from a uniform stream `draw`. Below 20 by
 * sequential inversion from zero; from 20 up by inversion with the outcomes taken in the
 * order mode, mode + 1, mode - 1, mode + 2, ... (any fixed order of the outcomes is an
 * exact inversion). Never a Gaussian approximation.
 */
export function poissonDraw(draw, mu) {
  if (!(mu > 0)) return 0;
  const u = draw();
  if (mu < 20) {
    let p = Math.exp(-mu);
    let c = p;
    let k = 0;
    while (u > c && k < 200) {
      k++;
      p *= mu / k;
      c += p;
    }
    return k;
  }
  const m = Math.floor(mu);
  let acc = Math.exp(m * Math.log(mu) - mu - lnGamma(m + 1));
  if (u <= acc) return m;
  let pu = acc;
  let pd = acc;
  let up = m;
  let down = m;
  for (let it = 0; it < 100000; it++) {
    up++;
    pu *= mu / up;
    acc += pu;
    if (u <= acc) return up;
    if (down > 0) {
      pd *= down / mu;
      down--;
      acc += pd;
      if (u <= acc) return down;
    }
  }
  return m;
}

const assumes = Object.freeze([
  'independent counts at a constant rate within a bin',
  'the exposure is the live time of the bin (dead time already removed)',
  'exact (Garwood) interval: the coverage is at least the stated level at any rate',
]);

/**
 * The rate in each live bin (and pooled over them) with its exact Poisson interval.
 * @param {object} series - A counts series (contract)
 * @param {{band?: string|string[], level?: number}} [opts] - band id, list of ids or 'total'
 */
export function rate(series, { band = 'total', level = ONE_SIGMA } = {}) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  const bc = bandCounts(view, band);
  if (bc.status !== 'ok') return bc;
  const idx = [];
  const t = [];
  const r = [];
  const lo = [];
  const hi = [];
  const cnt = [];
  const exp = [];
  let N = 0;
  let T = 0;
  for (let i = 0; i < view.n; i++) {
    if (!view.live[i]) continue;
    const iv = poissonInterval([bc.src[i]], {
      exposure: view.exposure[i],
      level,
      method: 'garwood',
    });
    if (iv.status !== 'ok') return iv;
    idx.push(i);
    t.push(0.5 * (view.start[i] + view.stop[i]));
    r.push(iv.rate);
    lo.push(iv.lo);
    hi.push(iv.hi);
    cnt.push(bc.src[i]);
    exp.push(view.exposure[i]);
    N += bc.src[i];
    T += view.exposure[i];
  }
  const pooled = poissonInterval([N], {
    exposure: T,
    level,
    method: 'garwood',
  });
  return stamp(
    {
      status: 'ok',
      method: 'poisson-garwood',
      band: bc.ids,
      level,
      index: idx,
      t,
      rate: r,
      lo,
      hi,
      counts: cnt,
      exposure: exp,
      pooled: {
        counts: N,
        exposure: T,
        rate: pooled.rate,
        lo: pooled.lo,
        hi: pooled.hi,
      },
      background: view.background.kind,
      assumes,
    },
    view
  );
}

// --- the net rate ---------------------------------------------------------------

const xlogy = (x, y) => (x === 0 ? 0 : x * Math.log(y));

/** The background rate B that maximises the likelihood at net rate S >= 0. */
function bestBackground(S, Ns, Nb, T, Tb, r) {
  const k = r * T + Tb;
  const a = r * k;
  const b = k * S - r * (Ns + Nb);
  const c = Nb * S;
  if (c === 0) return Math.max(0, -b / a);
  const disc = Math.sqrt(b * b + 4 * a * c);
  return b > 0 ? (2 * c) / (b + disc) : (-b + disc) / (2 * a);
}

/** The log likelihood (constants dropped) at (S, B). */
function logLike(S, B, Ns, Nb, T, Tb, r) {
  return (
    xlogy(Ns, T * (S + r * B)) - T * (S + r * B) + xlogy(Nb, Tb * B) - Tb * B
  );
}

/**
 * The profile deviance of one net rate: `shat` the constrained estimate and
 * `deviance(S)` = 2 (L(shat) - L_profile(S)), 0 at shat and rising either way.
 */
export function netProfile(Ns, Nb, T, Tb, r) {
  const raw = Ns / T - (r * Nb) / Tb;
  const shat = Math.max(0, raw);
  const Bhat = raw >= 0 ? Nb / Tb : (Ns + Nb) / (r * T + Tb);
  const Lmax = logLike(shat, Bhat, Ns, Nb, T, Tb, r);
  return {
    shat,
    raw,
    deviance: S => {
      const B = bestBackground(S, Ns, Nb, T, Tb, r);
      return Math.max(0, 2 * (Lmax - logLike(S, B, Ns, Nb, T, Tb, r)));
    },
  };
}

function bisect(f, a, b, rising) {
  for (let i = 0; i < 300; i++) {
    const mid = 0.5 * (a + b);
    if (mid === a || mid === b) break;
    if (f(mid) > 0 === rising) b = mid;
    else a = mid;
  }
  return 0.5 * (a + b);
}

/**
 * The net rate of a source with a background region and its profile interval at `level`.
 * @param {{counts: number, exposure: number, bkgCounts: number, bkgExposure?: number,
 *   areaRatio: number, level?: number}} p - counts in the source region, live exposures
 *   (the background's defaults to the source's), area ratio r = source area / background area
 */
export function netRateInterval({
  counts,
  exposure,
  bkgCounts,
  bkgExposure = exposure,
  areaRatio,
  level = ONE_SIGMA,
}) {
  if (
    !Number.isInteger(counts) ||
    counts < 0 ||
    !Number.isInteger(bkgCounts) ||
    bkgCounts < 0
  )
    return refused('counts', 'the counts are not whole numbers of 0 or more');
  if (!(exposure > 0) || !(bkgExposure > 0) || !(areaRatio > 0))
    return refused('exposure', 'an exposure or the area ratio is not positive');
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const thr = chi2Quantile(level, 1);
  const prof = netProfile(counts, bkgCounts, exposure, bkgExposure, areaRatio);
  const f = S => prof.deviance(S) - thr;
  const lo = prof.shat === 0 || f(0) <= 0 ? 0 : bisect(f, 0, prof.shat, false);
  let top = Math.max(prof.shat, 1 / exposure) * 2;
  while (f(top) < 0 && top < 1e12) top *= 2;
  const hi = bisect(f, prof.shat, top, true);
  return {
    status: 'ok',
    method: 'poisson-profile-net',
    level,
    rate: prof.shat,
    rawEstimate: prof.raw,
    lo,
    hi,
    assumes: [
      'Poisson counts in the source and background regions',
      'a constant rate within the bin and a known area ratio',
      'a profile (deviance) interval: not exact, its coverage is measured (HIGH_ENERGY.md)',
      'the net rate is constrained to 0 or more',
    ],
  };
}

/** The net rate in each live bin and pooled, with the profile interval. Needs a background region. */
export function netRate(series, { band = 'total', level = ONE_SIGMA } = {}) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  if (view.background.kind !== 'region')
    return refused(
      'background',
      'a net rate needs a background region (counts and an area ratio)'
    );
  const bc = bandCounts(view, band);
  if (bc.status !== 'ok') return bc;
  const out = { index: [], t: [], rate: [], lo: [], hi: [] };
  let Ns = 0;
  let Nb = 0;
  let T = 0;
  let Tb = 0;
  for (let i = 0; i < view.n; i++) {
    if (!view.live[i]) continue;
    const iv = netRateInterval({
      counts: bc.src[i],
      exposure: view.exposure[i],
      bkgCounts: bc.bkg[i],
      bkgExposure: view.background.exposure[i],
      areaRatio: view.background.areaRatio,
      level,
    });
    if (iv.status !== 'ok') return iv;
    out.index.push(i);
    out.t.push(0.5 * (view.start[i] + view.stop[i]));
    out.rate.push(iv.rate);
    out.lo.push(iv.lo);
    out.hi.push(iv.hi);
    Ns += bc.src[i];
    Nb += bc.bkg[i];
    T += view.exposure[i];
    Tb += view.background.exposure[i];
  }
  const pooled = netRateInterval({
    counts: Ns,
    exposure: T,
    bkgCounts: Nb,
    bkgExposure: Tb,
    areaRatio: view.background.areaRatio,
    level,
  });
  return stamp(
    {
      status: 'ok',
      method: pooled.method,
      band: bc.ids,
      level,
      ...out,
      pooled: { counts: Ns, bkgCounts: Nb, exposure: T, ...pooled },
      assumes: pooled.assumes,
    },
    view
  );
}
