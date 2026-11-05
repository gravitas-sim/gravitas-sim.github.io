// =============================================================================
// Pulsar kernel: the dispersion measure of a dynamic spectrum
// -----------------------------------------------------------------------------
//   coarseDm   MEASURED: the harmonic-summed Fourier power of the de-dispersed channel
//              sum over a grid of trial DM (it needs the period range, not the period:
//              the sum is most periodic when the channels are aligned), step =
//              (P_guess / 128) / (K |1 / f_lo^2 - 1 / f_hi^2|), refined by a parabola;
//              reports whether the maximum is at an edge of the range and whether a
//              second, separate maximum is nearly as high
//   refineDm   MEASURED: the DM correction from per-channel arrival phases against a
//              leave-one-out template at the current DM, a weighted line through
//              (K / f^2, arrival time), iterated; the interval is the fit's covariance
//              scaled by sqrt(max(1, chi2 / dof)) and given by the statistics kernel
//
// The refinement is PULSAR-RULE-1 S6 to S8 (tests/fixtures/pulsars/thresholds.json,
// committed first). It assumes white noise, a profile that is the same shape in every
// channel, a delay of exactly K DM / f^2, and a constant period; a frequency-dependent
// profile moves the arrival time the way a DM does and cannot be told from it (the
// residual diagnostic sees only what does not fit a line). Pure: no DOM, no clock.
// =============================================================================

import { refuse, refusal, finite } from './constants.js';
import { DISPERSION_CONSTANT } from './pulsarConstants.js';
import { checkDynamic, noiseSigma } from './pulsarSeries.js';
import { foldSeries } from './pulsarFold.js';
import { nextPow2, fftPower, harmonicSumSearch } from './pulsarFft.js';
import {
  harmonics,
  rotate,
  binVariance,
  combine,
  matchTemplate,
  harmonicPower,
} from './pulsarArrival.js';
import { chi2Sf } from '../statistics/special.js';
import { covarianceInterval } from '../statistics/intervals.js';

const { Math, Float64Array, Int32Array } = globalThis;

/** The per-channel noise sigma: given (a number or an array), or estimated from the differences. */
export function channelSigmas(dyn, given) {
  const { nchan, nsamp, data } = dyn;
  const out = new Array(nchan);
  for (let c = 0; c < nchan; c++) {
    if (given === undefined || given === null)
      out[c] = noiseSigma(data, c * nsamp, (c + 1) * nsamp);
    else out[c] = Array.isArray(given) ? given[c] : given;
    if (!(out[c] > 0))
      refuse('bad-argument', 'a channel has a non-positive noise sigma', {
        channel: c,
      });
  }
  return out;
}

const median = a => {
  const s = Float64Array.from(a).sort();
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};

/**
 * The coarse DM from the harmonic-summed Fourier power of the de-dispersed channel sum.
 * @param {object} dyn
 * @param {{dmRange: [number, number], periodRange: [number, number], constant?: number,
 *   sigma?: number|number[], harmonics?: number}} o - the period range bounds the fundamental
 *   bins searched; the DM step uses its geometric mean
 */
export function coarseDm(dyn, o) {
  checkDynamic(dyn);
  const { dmRange, periodRange } = o;
  const K = o.constant ?? DISPERSION_CONSTANT;
  if (!Array.isArray(dmRange) || dmRange.length !== 2)
    refuse('bad-range', 'dmRange must be [dmMin, dmMax]');
  const [lo, hi] = dmRange;
  finite(lo, 'dmMin');
  finite(hi, 'dmMax');
  if (lo < 0)
    refuse('bad-range', 'the DM range cannot start below 0', { dmRange });
  if (!(hi > lo))
    refuse('bad-range', 'the DM range is inverted or empty', { dmRange });
  if (!Array.isArray(periodRange) || periodRange.length !== 2)
    refuse('bad-range', 'periodRange must be [pMin, pMax]');
  const [pMin, pMax] = periodRange;
  if (!(pMin > 0 && pMax > pMin))
    refuse('bad-range', 'the period range is inverted, empty or not positive', {
      periodRange,
    });
  const pGuess = Math.sqrt(pMin * pMax);
  const { nchan, nsamp, dt, data, frequencyMHz: f } = dyn;
  if (nchan < 2)
    refuse(
      'not-constrained',
      'one frequency cannot separate a delay from a constant'
    );
  const flo = f[0];
  const fhi = f[nchan - 1];
  const span = K * (1 / (flo * flo) - 1 / (fhi * fhi));
  const step = pGuess / 128 / span;
  if (step > hi)
    refuse(
      'not-constrained',
      'the band is too narrow for this range: even at the largest DM in the range the delay across it is under 1/128 of the period, so no DM in the range is distinguishable from another',
      { step, dmRange, sweepAtLargestDmS: span * hi, periodGuess: pGuess }
    );
  const n = Math.floor((hi - lo) / step) + 1;
  if (n < 3)
    refuse(
      'bad-range',
      'the DM range holds fewer than three trial values at this resolution',
      {
        step,
        dmRange,
      }
    );
  const inv = f.map(x => K * (1 / (x * x) - 1 / (fhi * fhi)));
  const maxShift = Math.round((inv[0] * hi) / dt);
  const L = nsamp - maxShift;
  if (L < 8)
    refuse(
      'bad-argument',
      'the sweep at the largest DM is as long as the series',
      {
        dm: hi,
        sweepSamples: maxShift,
        nsamp,
      }
    );
  const sig = channelSigmas(dyn, o.sigma);
  const sigSum = Math.sqrt(sig.reduce((a, b) => a + b * b, 0)) / nchan;
  const size = nextPow2(2 * L);
  const kLo = Math.max(1, Math.floor((size * dt) / pMax));
  const kHi = Math.ceil((size * dt) / pMin);
  const work = { re: new Float64Array(size), im: new Float64Array(size) };
  const grid = new Float64Array(n);
  const S = new Float64Array(n);
  const bins = new Int32Array(n);
  const sum = new Float64Array(L);
  for (let i = 0; i < n; i++) {
    const dm = lo + i * step;
    grid[i] = dm;
    sum.fill(0);
    for (let c = 0; c < nchan; c++) {
      const r = Math.round((inv[c] * dm) / dt);
      const base = c * nsamp + r;
      for (let j = 0; j < L; j++) sum[j] += data[base + j];
    }
    for (let j = 0; j < L; j++) sum[j] /= nchan;
    const power = fftPower(sum, L, sigSum, size, work);
    const h = harmonicSumSearch(
      power,
      kLo,
      Math.min(kHi, size / 2 - 1),
      o.harmonics ?? 4
    );
    S[i] = h.statistic;
    bins[i] = h.bin;
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (S[i] > S[best]) best = i;
  let dmBest = grid[best];
  if (best > 0 && best < n - 1) {
    const a = S[best - 1];
    const b = S[best];
    const c = S[best + 1];
    const den = a - 2 * b + c;
    if (den < 0)
      dmBest += Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) * step;
  }
  const med = median(S);
  const excess = S[best] - med;
  // the main lobe: the run around the maximum above half its excess, plus three steps
  let a = best;
  while (a > 0 && S[a - 1] - med >= 0.5 * excess) a--;
  let z = best;
  while (z < n - 1 && S[z + 1] - med >= 0.5 * excess) z++;
  const from = a - 3;
  const to = z + 3;
  let second = null;
  for (let i = 1; i < n - 1; i++) {
    if (i >= from && i <= to) continue;
    if (S[i] > S[i - 1] && S[i] >= S[i + 1])
      if (second === null || S[i] > S[second]) second = i;
  }
  const ambiguous =
    second !== null && excess > 0 && (S[second] - med) / excess >= 0.9
      ? { dm: grid[second], ratio: (S[second] - med) / excess }
      : null;
  return {
    dm: dmBest,
    step,
    trials: n,
    grid,
    statistic: S,
    bins,
    frequencyHz: bins[best] / (size * dt),
    peakIndex: best,
    lobe: [grid[a], grid[z]],
    atEdge: best <= 0 || best >= n - 1,
    ambiguous,
    pGuess,
    constant: K,
    dmRange: [lo, hi],
  };
}

/**
 * Refine a DM from per-channel arrival phases at a known period.
 *
 * @param {object} dyn
 * @param {{period: number, dm0: number, nbin?: number, sigma?: number|number[],
 *   constant?: number, snrMin?: number, minChannels?: number, dmRange?: [number, number],
 *   maxPasses?: number, alpha?: number}} o
 * @returns {object} { status: 'ok', dm, sigma, interval68, interval95, ... } or a refusal record
 */
export function refineDm(dyn, o) {
  checkDynamic(dyn);
  const K = o.constant ?? DISPERSION_CONSTANT;
  const nbin = o.nbin ?? 64;
  const snrMin = o.snrMin ?? 5;
  const minChannels = o.minChannels ?? 4;
  const maxPasses = o.maxPasses ?? 5;
  const alpha = o.alpha ?? 1e-3;
  const { period } = o;
  finite(period, 'the period');
  finite(o.dm0, 'the starting DM');
  if (!(period > 0)) refuse('bad-argument', 'the period must be positive');
  if (!(Number.isInteger(nbin) && nbin >= 8))
    refuse('bad-argument', 'nbin must be a whole number of at least 8', {
      nbin,
    });
  const { nchan, nsamp, dt, frequencyMHz: f } = dyn;
  if (period > (nsamp * dt) / 3)
    refuse(
      'bad-argument',
      'a period of more than a third of the series leaves under three pulses'
    );
  if (nchan < 2)
    return refusal(
      'not-constrained',
      'a series at one frequency cannot give a dispersion measure: the delay is a constant that the pulse arrival time absorbs',
      { channels: nchan }
    );
  const sig = channelSigmas(dyn, o.sigma);
  const hm = new Array(nchan);
  for (let c = 0; c < nchan; c++) {
    const fold = foldSeries(dyn.data, dt, period, nbin, {
      start: c * nsamp,
      end: (c + 1) * nsamp,
      origin: c * nsamp,
    });
    if (fold.counts.some(n => n < 1))
      refuse(
        'bad-argument',
        'a phase bin is empty: too few samples for this many bins'
      );
    const h = harmonics(fold.profile);
    h.varBin = binVariance(sig[c], fold.counts);
    hm[c] = h;
  }
  const top = f[nchan - 1];
  const x = f.map(v => K / (v * v));
  let dm = o.dm0;
  let last = null;
  let passes = 0;
  let converged = false;
  let detection = null;
  for (; passes < maxPasses;) {
    passes++;
    const phase = f.map(
      v => (K * dm * (1 / (v * v) - 1 / (top * top))) / period
    );
    const aligned = hm.map((h, c) => {
      const r = rotate(h, phase[c]);
      r.varBin = h.varBin;
      return r;
    });
    const sum = combine(aligned);
    if (passes === 1) {
      const hp = harmonicPower(sum, sum.varBin);
      detection = { chi2: hp.chi2, dof: hp.dof, p: chi2Sf(hp.chi2, hp.dof) };
      if (!(detection.p < alpha))
        return refusal(
          'no-pulsar',
          'the channels folded at this period and aligned at this DM show no pulse above the noise',
          { detection, period, dm }
        );
    }
    const rows = [];
    for (let c = 0; c < nchan; c++) {
      const tmpl = combine(aligned, c);
      const m = matchTemplate(aligned[c], tmpl, { snrMin });
      rows.push({ channel: c, frequencyMHz: f[c], ...m });
    }
    const used = rows.filter(r => r.usable);
    if (used.length < minChannels)
      return refusal(
        'too-few-channels',
        `only ${used.length} channels carry a pulse above signal-to-noise ${snrMin}; ${minChannels} are needed to separate a delay that follows 1 / f^2 from a constant`,
        { used: used.length, needed: minChannels, rows, period, dm }
      );
    let sw = 0;
    let swx = 0;
    let swxx = 0;
    let swy = 0;
    let swxy = 0;
    for (const r of used) {
      const w = 1 / (r.sigma * period) ** 2;
      const xx = x[r.channel];
      const y = r.phase * period;
      sw += w;
      swx += w * xx;
      swxx += w * xx * xx;
      swy += w * y;
      swxy += w * xx * y;
    }
    const det = sw * swxx - swx * swx;
    if (!(det / (sw * swxx) > 1e-12))
      return refusal(
        'not-constrained',
        'the used channels span too little of 1 / f^2 to separate the delay from a constant',
        { used: used.length, rows }
      );
    const slope = (sw * swxy - swx * swy) / det;
    const icept = (swxx * swy - swx * swxy) / det;
    let chi2 = 0;
    for (const r of used) {
      const w = 1 / (r.sigma * period) ** 2;
      const res = r.phase * period - (icept + slope * x[r.channel]);
      r.residualS = res;
      chi2 += w * res * res;
    }
    const dof = used.length - 2;
    const scale = dof >= 1 ? Math.max(1, chi2 / dof) : 1;
    const sigma0 = Math.sqrt(sw / det);
    last = {
      rows,
      used: used.length,
      slope,
      icept,
      chi2,
      dof,
      scale,
      sigma: sigma0 * Math.sqrt(scale),
      sigmaFormal: sigma0,
      dmUsed: dm,
    };
    dm += slope;
    if (Math.abs(slope) < 1e-3 * sigma0) {
      converged = true;
      break;
    }
  }
  const structured = last.dof >= 1 && chi2Sf(last.chi2, last.dof) < 1e-3;
  const iv68 = covarianceInterval(dm, last.sigma);
  const iv95 = covarianceInterval(dm, last.sigma, { level: 0.95 });
  if (o.dmRange && iv95.hi - iv95.lo > o.dmRange[1] - o.dmRange[0])
    return refusal(
      'not-constrained',
      'the 95 percent interval of the DM is wider than the search range: the band does not constrain it',
      {
        sigma: last.sigma,
        dm,
        interval95: [iv95.lo, iv95.hi],
        dmRange: o.dmRange,
      }
    );
  return {
    status: 'ok',
    dm,
    sigma: last.sigma,
    interval68: iv68,
    interval95: iv95,
    chi2: last.chi2,
    dof: last.dof,
    chi2Reduced: last.dof >= 1 ? last.chi2 / last.dof : null,
    errorScale: Math.sqrt(last.scale),
    structuredResiduals: structured,
    usedChannels: last.used,
    channels: last.rows,
    detection,
    passes,
    converged,
    period,
    constant: K,
    method:
      'arrival phases against a leave-one-out template, weighted line in K / f^2 (PULSAR-RULE-1 S6 to S8)',
  };
}
