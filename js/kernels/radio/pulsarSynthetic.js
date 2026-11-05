// =============================================================================
// Pulsar kernel: a synthetic dynamic-spectrum generator
// -----------------------------------------------------------------------------
// The forward model, and the labelled fallback of RADIO_DATA_GATE.md (every
// pulse-series row is C, so this is the pack): an invented pulsar of period P and
// dispersion measure DM, a periodic pulse profile (Gaussian components), observed
// in nchan channels across a band, each sample point-sampled at j dt, with white
// Gaussian noise from the named stream `noise`. It is a world, not a measurement:
// nothing here is a number about any pulsar.
//
// The pulse that leaves at (n + phase0) P arrives in a channel at f at
//
//   t_n(f) = (n + phase0) P + K DM / f^2,
//
// so the signal in the channel at time t is the profile at the phase
// (t - K DM / f^2) / P - phase0. Intra-channel smearing is modelled by averaging
// the delayed pulse over `subchannels` equal sub-bands of the channel; with one
// sub-band the delay is the exact one of the channel centre. A channel's peak
// amplitude is `amplitude` (in units of the per-sample noise sigma) times
// (f / f_top)^spectralIndex.
//
// Pure given a seed: no DOM, no clock.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import { refuse, finite } from './constants.js';
import { DISPERSION_CONSTANT } from './pulsarConstants.js';

const { Math, Float64Array } = globalThis;

/** The label every generated series carries. */
export const PULSAR_SYNTHETIC_LABEL =
  'SYNTHETIC PULSAR SERIES: an invented pulsar observed by an invented receiver, with a stated period, dispersion measure and pulse profile, not a measurement of any pulsar';

/** The defaults of the validation contract's instrument. */
export const PULSAR_WORLD = Object.freeze({
  bandMHz: Object.freeze([1200, 1500]),
  channels: 16,
  dt: 0.002,
  samples: 6000,
  noiseSigma: 1,
  amplitude: 1,
  sigmaTurns: 0.03,
  subchannels: 1,
  phase0: 0,
  spectralIndex: 0,
  seed: 242,
});

/** The channel centres: fLo + (i + 1/2) df, ascending. */
export function channelCentres(bandMHz, channels) {
  const [lo, hi] = bandMHz;
  const df = (hi - lo) / channels;
  return Array.from({ length: channels }, (_, i) => lo + (i + 0.5) * df);
}

const wrap = x => x - Math.round(x);

/** The profile at a phase (turns): a sum of periodic Gaussian components. */
function profileAt(phase, components) {
  let v = 0;
  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    const d = wrap(phase - c.center);
    const z = d / c.sigma;
    if (z < 9 && z > -9) v += c.amp * Math.exp(-0.5 * z * z);
  }
  return v;
}

/**
 * Generate a dynamic spectrum.
 *
 * @param {object} o
 * @param {number} o.period - seconds
 * @param {number} o.dm - pc/cm^3
 * @param {number} [o.phase0] - turns
 * @param {number[]} [o.bandMHz], [o.channels], [o.dt], [o.samples], [o.noiseSigma]
 * @param {number} [o.amplitude], [o.sigmaTurns], [o.spectralIndex], [o.subchannels]
 * @param {Array<{amp: number, center: number, sigma: number}> |
 *   ((fMHz: number) => Array<{amp: number, center: number, sigma: number}>)} [o.components]
 *   the profile (amplitudes relative to `amplitude`, centres in turns from the peak);
 *   a function of the channel's frequency makes the profile change across the band
 * @param {number|string} [o.seed], [o.constant]
 * @returns {{label: string, frequencyMHz: number[], dt: number, nsamp: number,
 *   nchan: number, data: Float64Array, truth: object}}
 */
export function generateDynamicSpectrum(o) {
  const w = { ...PULSAR_WORLD, ...o };
  finite(w.period, 'the period');
  if (!(w.period > 0)) refuse('bad-argument', 'the period must be positive');
  finite(w.dm, 'the dispersion measure');
  if (w.dm < 0)
    refuse('bad-argument', 'the dispersion measure cannot be negative');
  finite(w.noiseSigma, 'the noise sigma');
  if (!(w.noiseSigma >= 0))
    refuse('bad-argument', 'the noise sigma cannot be negative');
  const [lo, hi] = w.bandMHz;
  if (!(lo > 0 && hi > lo))
    refuse('bad-argument', 'the band must be ascending and positive', {
      bandMHz: w.bandMHz,
    });
  if (!(w.channels >= 1 && Number.isInteger(w.channels)))
    refuse(
      'bad-argument',
      'the channel count must be a whole number of at least 1'
    );
  if (!(w.dt > 0)) refuse('bad-argument', 'the sample time must be positive');
  const nsamp =
    o.samples !== undefined
      ? w.samples
      : o.duration !== undefined
        ? Math.round(o.duration / w.dt)
        : w.samples;
  if (!(Number.isInteger(nsamp) && nsamp >= 8))
    refuse(
      'bad-argument',
      'there must be a whole number of at least 8 samples'
    );
  const m = w.subchannels;
  if (!(Number.isInteger(m) && m >= 1))
    refuse('bad-argument', 'subchannels must be a whole number of at least 1');
  const K = w.constant ?? DISPERSION_CONSTANT;
  const nchan = w.channels;
  const df = (hi - lo) / nchan;
  const freqs = channelCentres(w.bandMHz, nchan);
  const fTop = freqs[nchan - 1];
  const draw = gaussian(stream('noise', w.seed, 'pulsar'));
  const base = w.components ?? [{ amp: 1, center: 0, sigma: w.sigmaTurns }];
  const data = new Float64Array(nchan * nsamp);
  const delays = new Array(nchan);
  const smear = new Array(nchan);
  const expectedSnr = new Array(nchan);
  for (let c = 0; c < nchan; c++) {
    const f = freqs[c];
    const comps = (typeof base === 'function' ? base(f) : base).map(x => ({
      ...x,
      amp: x.amp * w.amplitude * Math.pow(f / fTop, w.spectralIndex),
    }));
    const subDelay = new Float64Array(m);
    for (let s = 0; s < m; s++) {
      const fs = f - df / 2 + ((s + 0.5) * df) / m;
      subDelay[s] = (K * w.dm) / (fs * fs);
    }
    delays[c] = (K * w.dm) / (f * f);
    smear[c] = K * w.dm * (1 / (f - df / 2) ** 2 - 1 / (f + df / 2) ** 2);
    const row = c * nsamp;
    let energy = 0;
    for (let j = 0; j < nsamp; j++) {
      const t = j * w.dt;
      let v = 0;
      for (let s = 0; s < m; s++)
        v += profileAt((t - subDelay[s]) / w.period - w.phase0, comps);
      v /= m;
      energy += v * v;
      data[row + j] = v + (w.noiseSigma > 0 ? w.noiseSigma * draw() : 0);
    }
    expectedSnr[c] =
      w.noiseSigma > 0 ? Math.sqrt(energy) / w.noiseSigma : Infinity;
  }
  const sweepS = delays[0] - delays[nchan - 1];
  return {
    label: PULSAR_SYNTHETIC_LABEL,
    frequencyMHz: freqs,
    dt: w.dt,
    nsamp,
    nchan,
    data,
    truth: {
      label: PULSAR_SYNTHETIC_LABEL,
      period: w.period,
      dm: w.dm,
      phase0: w.phase0,
      constant: K,
      bandMHz: [lo, hi],
      channelWidthMHz: df,
      dt: w.dt,
      samples: nsamp,
      durationS: nsamp * w.dt,
      pulses: (nsamp * w.dt) / w.period,
      amplitude: w.amplitude,
      sigmaTurns: typeof base === 'function' ? null : (base[0]?.sigma ?? null),
      components: typeof base === 'function' ? 'a function of frequency' : base,
      spectralIndex: w.spectralIndex,
      subchannels: m,
      noiseSigma: w.noiseSigma,
      seed: w.seed,
      delaysS: delays,
      smearingS: smear,
      sweepS,
      sweepTurns: sweepS / w.period,
      expectedChannelSnr: expectedSnr,
    },
  };
}

/**
 * A pulsar's period and DM from a row of the NANOGrav pack (Prompt 240): the
 * period is 1 / F0 and the DM is the narrowband one. The row's own numbers are
 * the generator's truth, so a series built from it tests recovery of the
 * catalogue's values, not an authentic observation of the pulsar.
 * @param {{name?: string, f0Hz: number, dmPcCm3: number}} row
 */
export function pulsarFromRow(row) {
  finite(row.f0Hz, 'F0');
  finite(row.dmPcCm3, 'the dispersion measure');
  if (!(row.f0Hz > 0)) refuse('bad-argument', 'F0 must be positive');
  return { name: row.name, period: 1 / row.f0Hz, dm: row.dmPcCm3 };
}
