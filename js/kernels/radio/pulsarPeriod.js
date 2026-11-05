// =============================================================================
// Pulsar kernel: the period with an interval, the periodogram, the whole analysis
// -----------------------------------------------------------------------------
//   refinePeriod          MEASURED: the period from the phase drift of M = 8
//                         sub-integrations (PULSAR-RULE-1 S9): each sub-integration is
//                         the channels aligned at the DM and summed, its arrival phase is
//                         taken against a leave-one-out template of the others, and a
//                         weighted line through phase against time gives a frequency
//                         offset s; P_new = P / (1 - s P). Leaving one out makes the
//                         slope (M / (M - 1)) too steep for equal weights, which the
//                         result divides out. Two passes
//   periodFromPeriodogram MEASURED: the strongest Lomb-Scargle peak (the existing
//                         js/kernels/variables/period.js) of the de-dispersed series
//                         rebinned to at most 2048 samples, with its width P^2 / T and the
//                         power at half and double the period
//   analyzePulsar         the whole pipeline: coarse DM, period search with its trial
//                         correction, DM refinement, period refinement, DM again; every
//                         stage can refuse by code
//
// Assumes what refineDm assumes, and that the period does not change over the
// observation. Pure: no DOM, no clock.
// =============================================================================

import { refuse, refusal, finite, RadioError } from './constants.js';
import { DISPERSION_CONSTANT } from './pulsarConstants.js';
import { checkDynamic, dedisperse } from './pulsarSeries.js';
import { foldSeries, searchPeriod } from './pulsarFold.js';
import {
  harmonics,
  rotate,
  binVariance,
  combine,
  matchTemplate,
} from './pulsarArrival.js';
import { coarseDm, refineDm, channelSigmas } from './pulsarDm.js';
import { findPeriod, periodogram } from '../variables/period.js';
import { covarianceInterval } from '../statistics/intervals.js';
import { noiseSigma } from './pulsarSeries.js';

const { Math, Float64Array } = globalThis;

/**
 * Refine a period from the phase drift of sub-integrations.
 * @param {object} dyn
 * @param {{period: number, dm: number, nbin?: number, subintegrations?: number,
 *   sigma?: number|number[], constant?: number, snrMin?: number, passes?: number}} o
 */
export function refinePeriod(dyn, o) {
  checkDynamic(dyn);
  const K = o.constant ?? DISPERSION_CONSTANT;
  const nbin = o.nbin ?? 64;
  const M = o.subintegrations ?? 8;
  const snrMin = o.snrMin ?? 5;
  const passes = o.passes ?? 2;
  finite(o.period, 'the period');
  finite(o.dm, 'the DM');
  if (!(o.period > 0)) refuse('bad-argument', 'the period must be positive');
  const { nchan, nsamp, dt, frequencyMHz: f, data } = dyn;
  if (o.period > (nsamp * dt) / 3)
    refuse(
      'bad-argument',
      'a period of more than a third of the series leaves under three pulses'
    );
  const sig = channelSigmas(dyn, o.sigma);
  const top = f[nchan - 1];
  const edges = Array.from({ length: M + 1 }, (_, m) =>
    Math.floor((m * nsamp) / M)
  );
  let P = o.period;
  let out = null;
  for (let pass = 0; pass < passes; pass++) {
    const subs = [];
    for (let m = 0; m < M; m++) {
      const per = [];
      for (let c = 0; c < nchan; c++) {
        const fold = foldSeries(data, dt, P, nbin, {
          start: c * nsamp + edges[m],
          end: c * nsamp + edges[m + 1],
          origin: c * nsamp,
        });
        if (fold.counts.some(n => n < 1))
          refuse(
            'bad-argument',
            'a phase bin is empty in a sub-integration: too few samples for this many bins'
          );
        const h = harmonics(fold.profile);
        const phase = (K * o.dm * (1 / (f[c] * f[c]) - 1 / (top * top))) / P;
        const r = rotate(h, phase);
        r.varBin = binVariance(sig[c], fold.counts);
        per.push(r);
      }
      const s = combine(per);
      subs.push({ re: s.re, im: s.im, nbin, varBin: s.varBin });
    }
    const rows = [];
    for (let m = 0; m < M; m++) {
      const tmpl = combine(subs, m);
      const r = matchTemplate(subs[m], tmpl, { snrMin });
      rows.push({
        index: m,
        time: ((edges[m] + edges[m + 1] - 1) / 2) * dt,
        ...r,
      });
    }
    const used = rows.filter(r => r.usable);
    if (used.length < 4)
      return refusal(
        'too-few-subintegrations',
        `only ${used.length} of ${M} sub-integrations carry a pulse above signal-to-noise ${snrMin}; 4 are needed for a phase drift`,
        { used: used.length, rows, period: P }
      );
    let sw = 0;
    let swt = 0;
    let swtt = 0;
    let swy = 0;
    let swty = 0;
    for (const r of used) {
      const w = 1 / r.sigma ** 2;
      sw += w;
      swt += w * r.time;
      swtt += w * r.time * r.time;
      swy += w * r.phase;
      swty += w * r.time * r.phase;
    }
    const det = sw * swtt - swt * swt;
    const slopeObs = (sw * swty - swt * swy) / det;
    const icept = (swtt * swy - swt * swty) / det;
    let chi2 = 0;
    for (const r of used) {
      const res = r.phase - (icept + slopeObs * r.time);
      r.residual = res;
      chi2 += (res * res) / r.sigma ** 2;
    }
    const dof = used.length - 2;
    const scale = dof >= 1 ? Math.max(1, chi2 / dof) : 1;
    const loo = (M - 1) / M;
    const s = slopeObs * loo;
    const sigmaS = Math.sqrt(sw / det) * Math.sqrt(scale) * loo;
    const Pnew = P / (1 - s * P);
    out = {
      period: Pnew,
      sigma: sigmaS * Pnew * Pnew,
      slopeTurnsPerS: s,
      used: used.length,
      chi2,
      dof,
      errorScale: Math.sqrt(scale),
      rows,
      periodIn: P,
    };
    P = Pnew;
  }
  const iv68 = covarianceInterval(out.period, out.sigma);
  const iv95 = covarianceInterval(out.period, out.sigma, { level: 0.95 });
  return {
    status: 'ok',
    period: out.period,
    sigma: out.sigma,
    interval68: iv68,
    interval95: iv95,
    subintegrations: M,
    usedSubintegrations: out.used,
    chi2: out.chi2,
    dof: out.dof,
    errorScale: out.errorScale,
    rows: out.rows,
    passes,
    dm: o.dm,
    method:
      'phase drift of sub-integrations against a leave-one-out template, divided by (M - 1) / M (PULSAR-RULE-1 S9)',
  };
}

/**
 * The period from the existing Lomb-Scargle periodogram of a series, rebinned to
 * at most `maxSamples` by block means.
 * @param {ArrayLike<number>} series
 * @param {number} dt
 * @param {{pMin: number, pMax: number, maxSamples?: number, oversample?: number}} o
 */
export function periodFromPeriodogram(series, dt, o) {
  const maxSamples = o.maxSamples ?? 2048;
  const block = Math.max(1, Math.ceil(series.length / maxSamples));
  const n = Math.floor(series.length / block);
  const y = new Float64Array(n);
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < block; j++) s += series[i * block + j];
    y[i] = s / block;
    t[i] = (i * block + (block - 1) / 2) * dt;
  }
  const r = findPeriod(t, y, {
    minPeriod: o.pMin,
    maxPeriod: o.pMax,
    oversample: o.oversample ?? 4,
  });
  const T = n * block * dt;
  const [half, dbl] = periodogram(t, y, [r.period / 2, r.period * 2]);
  return {
    period: r.period,
    power: r.power,
    width: r.width,
    resolution: (r.period * r.period) / T,
    powerAtHalfPeriod: half,
    powerAtDoublePeriod: dbl,
    rebin: block,
    samples: n,
    method:
      'Lomb-Scargle (js/kernels/variables/period.js) on the de-dispersed channel sum',
  };
}

/**
 * The whole analysis of a dynamic spectrum (PULSAR-RULE-1): the period with its
 * interval and the DM with its interval, or a refusal by code.
 *
 * @param {object} dyn
 * @param {{dmRange: [number, number], periodRange: [number, number], nbin?: number,
 *   constant?: number, sigma?: number|number[], alpha?: number}} o
 */
export function analyzePulsar(dyn, o) {
  checkDynamic(dyn);
  const K = o.constant ?? DISPERSION_CONSTANT;
  const nbin = o.nbin ?? 64;
  const alpha = o.alpha ?? 1e-3;
  const { periodRange, dmRange } = o;
  if (!Array.isArray(periodRange) || periodRange.length !== 2)
    refuse('bad-range', 'periodRange must be [pMin, pMax]');
  const [pMin, pMax] = periodRange;
  if (!(pMin > 0 && pMax > pMin))
    refuse('bad-range', 'the period range is inverted, empty or not positive', {
      periodRange,
    });
  const { nchan, nsamp, dt, data } = dyn;
  const stages = {};

  if (nchan === 1) {
    const series = data.subarray
      ? data.subarray(0, nsamp)
      : data.slice(0, nsamp);
    const sig = o.sigma ?? noiseSigma(series);
    const s = searchPeriod(series, dt, { pMin, pMax, nbin, sigma: sig });
    stages.search = s;
    if (!(s.pCorrected < alpha))
      return refusal(
        'no-pulsar',
        'no period in the range folds to a profile above the noise',
        {
          search: s,
        }
      );
    if (s.atRangeEdge)
      return refusal(
        'period-at-range-edge',
        'the strongest period is at an edge of the range',
        { search: s }
      );
    const pr = refinePeriod(dyn, {
      period: s.period,
      dm: 0,
      nbin,
      sigma: sig,
      constant: K,
    });
    return {
      status: pr.status === 'ok' ? 'partial' : 'refused',
      period: pr,
      dm: refusal(
        'not-constrained',
        'a series at one frequency cannot give a dispersion measure: the delay is a constant that the pulse arrival time absorbs',
        { channels: 1 }
      ),
      search: s,
      constant: K,
    };
  }

  let coarse;
  try {
    coarse = coarseDm(dyn, {
      dmRange,
      periodRange,
      constant: K,
      sigma: o.sigma,
    });
  } catch (e) {
    if (e instanceof RadioError && e.code === 'not-constrained')
      return refusal(e.code, e.message, e.detail);
    throw e;
  }
  stages.coarse = coarse;
  const dd = dedisperse(dyn, coarse.dm, { method: 'nearest', constant: K });
  const sumSigma = noiseSigma(dd.series);
  const search = searchPeriod(dd.series, dt, {
    pMin,
    pMax,
    nbin,
    sigma: sumSigma,
    trials: coarse.trials,
  });
  stages.search = search;
  if (!(search.pCorrected < alpha))
    return refusal(
      'no-pulsar',
      `no period in the range folds the de-dispersed series to a profile above the noise (trial-corrected probability ${search.pCorrected.toPrecision(3)} over ${search.trials} trials)`,
      { search, coarse: summary(coarse) }
    );
  if (coarse.atEdge)
    return refusal(
      'dm-at-range-edge',
      'the coarse DM is at an edge of the search range: the true DM may lie outside it',
      { coarse: summary(coarse), search }
    );
  if (coarse.ambiguous)
    return refusal(
      'ambiguous-dm',
      'a second, separate DM aligns the channels almost as well: the DM is ambiguous at this period and band',
      { coarse: summary(coarse), search }
    );
  if (search.atRangeEdge)
    return refusal(
      'period-at-range-edge',
      'the strongest period is at an edge of the range',
      {
        search,
      }
    );
  const common = { nbin, constant: K, sigma: o.sigma, dmRange };
  const d1 = refineDm(dyn, {
    ...common,
    period: search.period,
    dm0: coarse.dm,
  });
  if (d1.status !== 'ok')
    return { ...d1, stage: 'dm-first-pass', search, coarse: summary(coarse) };
  const p1 = refinePeriod(dyn, {
    period: search.period,
    dm: d1.dm,
    nbin,
    constant: K,
    sigma: o.sigma,
  });
  if (p1.status !== 'ok') return { ...p1, stage: 'period', search, dm: d1 };
  const d2 = refineDm(dyn, { ...common, period: p1.period, dm0: d1.dm });
  if (d2.status !== 'ok')
    return { ...d2, stage: 'dm-second-pass', search, period: p1 };
  const final = dedisperse(dyn, Math.max(0, d2.dm), {
    method: 'linear',
    constant: K,
  });
  const fold = foldSeries(final.series, dt, p1.period, nbin);
  return {
    status: 'ok',
    period: p1,
    dm: d2,
    detection: {
      p: search.p,
      pCorrected: search.pCorrected,
      trials: search.trials,
      chi2: search.chi2,
      dof: search.dof,
      range: search.range,
    },
    search,
    coarse: summary(coarse),
    profile: {
      nbin,
      values: Array.from(fold.profile),
      counts: Array.from(fold.counts),
    },
    constant: K,
    stages,
  };
}

function summary(c) {
  return {
    dm: c.dm,
    step: c.step,
    trials: c.trials,
    atEdge: c.atEdge,
    ambiguous: c.ambiguous,
    dmRange: c.dmRange,
    constant: c.constant,
  };
}
