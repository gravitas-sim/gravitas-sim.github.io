// =============================================================================
// Pulsar kernel: the dynamic spectrum, its checks, the noise and de-dispersion
// -----------------------------------------------------------------------------
// A dynamic spectrum is { frequencyMHz (ascending, strictly), dt (s), nsamp,
// nchan, data } with data a flat nchan by nsamp array (channel-major) of numbers.
//
//   checkDynamic      refuses by code anything that is not that
//   noiseSigma        DERIVED: 1.4826 MAD(successive differences) / sqrt(2); white
//                     noise assumed, a signal's sharp edges are outliers the median
//                     ignores
//   channelDelays     DERIVED: the advance of each channel that aligns it with the
//                     top channel, K DM (1 / f_c^2 - 1 / f_top^2)
//   dedisperse        DERIVED: shift each channel by that advance ('nearest' keeps
//                     white noise white; 'linear' interpolates) and take the mean;
//                     samples without data in every channel are dropped, none wrapped
//
// Pure: no DOM, no clock.
// =============================================================================

import { refuse, finite } from './constants.js';
import { DISPERSION_CONSTANT } from './pulsarConstants.js';

const { Math, Float64Array } = globalThis;

/** Check a dynamic spectrum; throws a RadioError with a code. */
export function checkDynamic(dyn) {
  if (!dyn || typeof dyn !== 'object')
    refuse('bad-argument', 'the dynamic spectrum is missing');
  const { frequencyMHz: f, dt, nsamp, nchan, data } = dyn;
  if (!Array.isArray(f) || f.length < 1)
    refuse('bad-argument', 'frequencyMHz must be a non-empty array');
  if (!(Number.isFinite(dt) && dt > 0))
    refuse('bad-argument', 'the sample time must be a positive number', { dt });
  if (!(Number.isInteger(nsamp) && nsamp >= 8))
    refuse('bad-argument', 'nsamp must be a whole number of at least 8', {
      nsamp,
    });
  if (nchan !== f.length)
    refuse('bad-argument', 'nchan must equal the number of frequencies', {
      nchan,
      frequencies: f.length,
    });
  for (let i = 0; i < f.length; i++) {
    if (!(Number.isFinite(f[i]) && f[i] > 0))
      refuse('bad-frequencies', 'every frequency must be positive and finite', {
        index: i,
      });
    if (i > 0 && !(f[i] > f[i - 1]))
      refuse('bad-frequencies', 'frequencies must be strictly ascending', {
        index: i,
      });
  }
  if (!data || data.length !== nchan * nsamp)
    refuse('bad-argument', 'data must have nchan * nsamp entries', {
      length: data?.length,
      expected: nchan * nsamp,
    });
  for (let i = 0; i < data.length; i++)
    if (!Number.isFinite(data[i]))
      refuse(
        'bad-argument',
        'the data hold a value that is not a finite number',
        {
          index: i,
        }
      );
  return dyn;
}

function median(sorted) {
  const n = sorted.length;
  return n % 2
    ? sorted[(n - 1) / 2]
    : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]);
}

/**
 * The white-noise standard deviation of a series from its successive differences.
 * @param {ArrayLike<number>} y
 * @param {number} [start], [end] - the slice (end exclusive)
 */
export function noiseSigma(y, start = 0, end = y.length) {
  const n = end - start - 1;
  if (n < 3) refuse('bad-argument', 'too few samples to estimate the noise');
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = y[start + i + 1] - y[start + i];
  d.sort();
  const m = median(d);
  const dev = new Float64Array(n);
  for (let i = 0; i < n; i++) dev[i] = Math.abs(d[i] - m);
  dev.sort();
  return (1.4826 * median(dev)) / Math.SQRT2;
}

/** The delay (seconds) by which each channel lags the top channel at a DM. */
export function channelDelays(frequencyMHz, dm, o = {}) {
  finite(dm, 'the dispersion measure');
  const K = o.constant ?? DISPERSION_CONSTANT;
  const top = frequencyMHz[frequencyMHz.length - 1];
  return frequencyMHz.map(f => K * dm * (1 / (f * f) - 1 / (top * top)));
}

/**
 * De-disperse a dynamic spectrum at a DM and sum the channels.
 * @param {object} dyn
 * @param {number} dm - pc/cm^3, 0 or more
 * @param {{method?: 'nearest'|'linear', constant?: number}} [o]
 * @returns {{series: Float64Array, length: number, dt: number, method: string,
 *   delaysS: number[], shifts: number[], dm: number, constant: number,
 *   referenceMHz: number, droppedSamples: number}}
 */
export function dedisperse(dyn, dm, o = {}) {
  checkDynamic(dyn);
  finite(dm, 'the dispersion measure');
  if (dm < 0)
    refuse('bad-argument', 'a dispersion measure cannot be negative', { dm });
  const method = o.method ?? 'nearest';
  if (method !== 'nearest' && method !== 'linear')
    refuse('bad-argument', 'the method is "nearest" or "linear"');
  const { dt, nsamp, nchan, data } = dyn;
  const K = o.constant ?? DISPERSION_CONSTANT;
  const delays = channelDelays(dyn.frequencyMHz, dm, { constant: K });
  const shifts = delays.map(d => d / dt);
  let length;
  if (method === 'nearest') {
    const r = shifts.map(Math.round);
    const maxShift = Math.max(...r);
    length = nsamp - maxShift;
    if (length < 8)
      refuse('bad-argument', 'the sweep at this DM is as long as the series', {
        dm,
        sweepSamples: maxShift,
        nsamp,
      });
    const out = new Float64Array(length);
    for (let c = 0; c < nchan; c++) {
      const base = c * nsamp + r[c];
      for (let j = 0; j < length; j++) out[j] += data[base + j];
    }
    for (let j = 0; j < length; j++) out[j] /= nchan;
    return {
      series: out,
      length,
      dt,
      method,
      delaysS: delays,
      shifts: r,
      dm,
      constant: K,
      referenceMHz: dyn.frequencyMHz[nchan - 1],
      droppedSamples: maxShift,
    };
  }
  const fl = shifts.map(Math.floor);
  const maxFloor = Math.max(...fl);
  length = nsamp - 1 - maxFloor;
  if (length < 8)
    refuse('bad-argument', 'the sweep at this DM is as long as the series', {
      dm,
      sweepSamples: maxFloor,
      nsamp,
    });
  const out = new Float64Array(length);
  for (let c = 0; c < nchan; c++) {
    const fr = shifts[c] - fl[c];
    const base = c * nsamp + fl[c];
    for (let j = 0; j < length; j++)
      out[j] += data[base + j] * (1 - fr) + data[base + j + 1] * fr;
  }
  for (let j = 0; j < length; j++) out[j] /= nchan;
  return {
    series: out,
    length,
    dt,
    method,
    delaysS: delays,
    shifts,
    dm,
    constant: K,
    referenceMHz: dyn.frequencyMHz[nchan - 1],
    droppedSamples: nsamp - length,
  };
}
