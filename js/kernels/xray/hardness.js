// =============================================================================
// The hardness ratio and the hardness-intensity points (Prompt 243)
// -----------------------------------------------------------------------------
//   HR = (H - S) / (H + S)
//
// H and S are the counts in two stated energy bands, so HR is a statement about
// COUNTS, not about flux or spectral shape: it depends on the detector's response in
// both bands, which this kernel does not model. It lies in [-1, 1].
//
// Total form (counts of the source region as they stand): given N = H + S, H is
// binomial in N with p = H / N, and the exact (Clopper-Pearson) interval of p, mapped by
// HR = 2 p - 1, covers at least the stated level at every p. Its ends at H = 0 and
// H = N are the exact ones, -1 and 1 among them; nothing is Gaussian.
//
// Net form (a background region): the two net rates and the two background rates are
// nuisance quantities. The interval of HR is the set where the profile deviance, the
// total net rate and both backgrounds maximised, is at most the chi-square quantile on
// one degree of freedom. It is not exact; its coverage is measured (HIGH_ENERGY.md).
// =============================================================================

import { betaI, chi2Quantile } from '../statistics/special.js';
import { refused } from '../statistics/check.js';
import { binByCounts } from './binning.js';
import { ONE_SIGMA, netProfile, rate } from './poisson.js';
import { stamp, validateSeries } from './contract.js';

const { Math, Number } = globalThis;

/** The x in [0, 1] with I_x(a, b) = p, by bisection. */
export function betaQuantile(p, a, b) {
  if (!(p >= 0 && p <= 1) || !(a > 0) || !(b > 0)) return NaN;
  if (p === 0) return 0;
  if (p === 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (betaI(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

const ASSUMES_TOTAL = Object.freeze([
  'a statement about counts in two bands, not about flux: the detector response in each band is not modelled',
  'the counts are independent Poisson counts of one source region over one exposure',
  'exact (Clopper-Pearson) interval of the hard fraction: the coverage is at least the stated level at any hardness',
]);

/** The hardness of two counts with the exact interval. */
export function hardnessCounts({ hard, soft, level = ONE_SIGMA }) {
  if (
    !Number.isInteger(hard) ||
    hard < 0 ||
    !Number.isInteger(soft) ||
    soft < 0
  )
    return refused('counts', 'the counts are not whole numbers of 0 or more');
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const N = hard + soft;
  if (N === 0)
    return refused(
      'noCounts',
      'no counts in either band: the hardness is not defined'
    );
  const alpha = (1 - level) / 2;
  const pLo = hard === 0 ? 0 : betaQuantile(alpha, hard, N - hard + 1);
  const pHi = hard === N ? 1 : betaQuantile(1 - alpha, hard + 1, N - hard);
  return {
    status: 'ok',
    method: 'binomial-exact',
    level,
    hard,
    soft,
    hr: (hard - soft) / N,
    lo: 2 * pLo - 1,
    hi: 2 * pHi - 1,
    assumes: ASSUMES_TOTAL,
  };
}

// --- the net form ------------------------------------------------------------------

function golden(f, a, b, n = 60) {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < n; i++) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return Math.min(fc, fd);
}

/** The hardness of the net rates with a profile interval. */
export function netHardnessInterval({
  soft,
  hard,
  exposure,
  bkgExposure = exposure,
  areaRatio,
  level = ONE_SIGMA,
}) {
  for (const b of [soft, hard])
    if (
      !Number.isInteger(b?.counts) ||
      b.counts < 0 ||
      !Number.isInteger(b?.bkgCounts) ||
      b.bkgCounts < 0
    )
      return refused('counts', 'the counts are not whole numbers of 0 or more');
  if (!(exposure > 0) || !(bkgExposure > 0) || !(areaRatio > 0))
    return refused('exposure', 'an exposure or the area ratio is not positive');
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const ps = netProfile(
    soft.counts,
    soft.bkgCounts,
    exposure,
    bkgExposure,
    areaRatio
  );
  const ph = netProfile(
    hard.counts,
    hard.bkgCounts,
    exposure,
    bkgExposure,
    areaRatio
  );
  const tot = ps.shat + ph.shat;
  if (!(tot > 0))
    return refused(
      'noCounts',
      'no net counts in either band: the hardness is not defined'
    );
  const hhat = (ph.shat - ps.shat) / tot;
  const thr = chi2Quantile(level, 1);
  const dev = h => {
    if (h >= 1) return ps.deviance(0);
    if (h <= -1) return ph.deviance(0);
    const a = (1 - h) / 2;
    const b = (1 + h) / 2;
    const s1 = ps.shat / a;
    const s2 = ph.shat / b;
    const lo = Math.min(s1, s2);
    const hi = Math.max(s1, s2);
    const f = sg => ps.deviance(a * sg) + ph.deviance(b * sg);
    return hi - lo < 1e-300 ? f(lo) : golden(f, lo, hi);
  };
  const root = (a, b, rising) => {
    for (let i = 0; i < 100; i++) {
      const mid = 0.5 * (a + b);
      if (mid === a || mid === b) break;
      if (dev(mid) - thr > 0 === rising) b = mid;
      else a = mid;
    }
    return 0.5 * (a + b);
  };
  const step = 0.02;
  let lo = -1;
  for (let h = hhat; h > -1; h -= step) {
    const next = Math.max(-1, h - step);
    if (dev(next) > thr) {
      lo = root(next, h, false);
      break;
    }
  }
  let hi = 1;
  for (let h = hhat; h < 1; h += step) {
    const next = Math.min(1, h + step);
    if (dev(next) > thr) {
      hi = root(h, next, true);
      break;
    }
  }
  return {
    status: 'ok',
    method: 'profile-net-hardness',
    level,
    hr: hhat,
    lo,
    hi,
    assumes: [
      'a statement about net counts in two bands, not about flux: the detector response is not modelled',
      'Poisson counts in the source and background regions and a known area ratio',
      'a profile (deviance) interval: not exact, its coverage is measured (HIGH_ENERGY.md)',
      'each net rate is constrained to 0 or more',
    ],
  };
}

// --- on a series -------------------------------------------------------------------

function pickBands(view, soft, hard) {
  const si = view.bandIds.indexOf(soft);
  const hi = view.bandIds.indexOf(hard);
  if (si < 0 || hi < 0 || si === hi)
    return refused(
      'bandsNeeded',
      'a hardness needs two different bands of the series, named by id'
    );
  if (si > hi)
    return refused(
      'bandsNeeded',
      'the soft band must be the lower in energy than the hard band'
    );
  return { status: 'ok' };
}

/**
 * The hardness of each live bin and of the whole series.
 * @param {object} series - A counts series
 * @param {{soft: string, hard: string, mode?: 'total'|'net', level?: number}} opts
 */
export function hardness(
  series,
  { soft, hard, mode = 'total', level = ONE_SIGMA } = {}
) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  const ok = pickBands(view, soft, hard);
  if (ok.status !== 'ok') return ok;
  if (mode !== 'total' && mode !== 'net')
    return refused('background', "the mode is 'total' or 'net'");
  if (mode === 'net' && view.background.kind !== 'region')
    return refused('background', 'the net hardness needs a background region');
  const per = { index: [], t: [], hr: [], lo: [], hi: [] };
  const sum = { hard: 0, soft: 0, bHard: 0, bSoft: 0, T: 0, Tb: 0 };
  for (let i = 0; i < view.n; i++) {
    if (!view.live[i]) continue;
    const H = view.counts[hard][i];
    const S = view.counts[soft][i];
    const bH = mode === 'net' ? view.background.counts[hard][i] : 0;
    const bS = mode === 'net' ? view.background.counts[soft][i] : 0;
    sum.hard += H;
    sum.soft += S;
    sum.bHard += bH;
    sum.bSoft += bS;
    sum.T += view.exposure[i];
    if (mode === 'net') sum.Tb += view.background.exposure[i];
    const r =
      mode === 'net'
        ? netHardnessInterval({
            soft: { counts: S, bkgCounts: bS },
            hard: { counts: H, bkgCounts: bH },
            exposure: view.exposure[i],
            bkgExposure: view.background.exposure[i],
            areaRatio: view.background.areaRatio,
            level,
          })
        : hardnessCounts({ hard: H, soft: S, level });
    per.index.push(i);
    per.t.push(0.5 * (view.start[i] + view.stop[i]));
    if (r.status === 'ok') {
      per.hr.push(r.hr);
      per.lo.push(r.lo);
      per.hi.push(r.hi);
    } else {
      per.hr.push(null);
      per.lo.push(null);
      per.hi.push(null);
    }
  }
  const pooled =
    mode === 'net'
      ? netHardnessInterval({
          soft: { counts: sum.soft, bkgCounts: sum.bSoft },
          hard: { counts: sum.hard, bkgCounts: sum.bHard },
          exposure: sum.T,
          bkgExposure: sum.Tb,
          areaRatio: view.background.areaRatio,
          level,
        })
      : hardnessCounts({ hard: sum.hard, soft: sum.soft, level });
  if (pooled.status !== 'ok') return pooled;
  return stamp(
    {
      status: 'ok',
      method: pooled.method,
      mode,
      soft,
      hard,
      level,
      ...per,
      pooled: { ...pooled, hardCounts: sum.hard, softCounts: sum.soft },
      assumes: pooled.assumes,
    },
    view
  );
}

/**
 * Hardness-intensity points: the series is binned by counts (soft plus hard counts,
 * `minCounts` in each point), and each point has the total rate of the two bands with
 * its exact interval and the hardness with its interval, in time order. The kernel draws
 * no track and names no state: a point is a measurement, the order is the time order.
 * @param {object} series
 * @param {{soft: string, hard: string, minCounts: number, maxGap?: number,
 *   mode?: 'total'|'net', level?: number}} opts
 */
export function hardnessIntensity(
  series,
  { soft, hard, minCounts, maxGap, mode = 'total', level = ONE_SIGMA } = {}
) {
  const view = series?.status === 'ok' ? series : validateSeries(series);
  if (view.status !== 'ok') return view;
  const ok = pickBands(view, soft, hard);
  if (ok.status !== 'ok') return ok;
  const binned = binByCounts(view, { band: [soft, hard], minCounts, maxGap });
  if (binned.status !== 'ok') return binned;
  const b = validateSeries(binned.series);
  if (b.status !== 'ok') return b;
  const rt = rate(b, { band: [soft, hard], level });
  if (rt.status !== 'ok') return rt;
  const hr = hardness(b, { soft, hard, mode, level });
  if (hr.status !== 'ok') return hr;
  const points = rt.index.map((i, k) => ({
    t: rt.t[k],
    rate: rt.rate[k],
    rateLo: rt.lo[k],
    rateHi: rt.hi[k],
    hr: hr.hr[k],
    hrLo: hr.lo[k],
    hrHi: hr.hi[k],
    counts: rt.counts[k],
    exposure: rt.exposure[k],
    short: binned.groups[k].short,
    members: binned.groups[k].members,
  }));
  return stamp(
    {
      status: 'ok',
      soft,
      hard,
      mode,
      level,
      minCounts,
      points,
      intensity: 'the total rate of the two bands, counts per live second',
      assumes: [...rt.assumes, ...hr.assumes],
    },
    view
  );
}
