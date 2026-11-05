// =============================================================================
// Radio kernel: a synthetic HI spectrum generator
// -----------------------------------------------------------------------------
// The forward model, and the labelled fallback of RADIO_DATA_GATE.md (every HI
// row is C, so this is the pack): gas of constant density between two radii on
// circular orbits with a stated rotation curve, a Gaussian random motion of
// dispersion sigma_v, the line's radiative transfer along the sightline, white
// noise from a named stream, on a channel axis uniform in frequency, with a
// truth manifest. It is a world, not a measurement: nothing here is a number
// about the Milky Way.
//
// The line of sight is integrated by the midpoint rule in distance. For gas at
// distance d the LSR velocity is v(d) (geometry.js) and the heliocentric one
// v(d) - shift, with the shift of the world's LSR option. A parcel of column
// n dd per cm^2 contributes N(v) = n dd phi(v - v(d); sigma_v) per km/s, and
//
//   thin:  T_B = N(v) / C_N               (spin temperature infinite)
//   thick: dtau = N(v) / (C_N T_s) per parcel and T_B accumulates as
//          T_s (1 - e^-dtau) e^-tau_foreground, front to back,
//
// which reduce to each other for tau << 1. No background continuum.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import {
  C_KMS,
  HI_LINE,
  KPC_CM,
  refuse,
} from './constants.js';
import { lsrShift } from './lsr.js';
import {
  losVelocity,
  tangentGeometry,
  terminalVelocity,
  wrapLongitude,
  worldCurve,
} from './geometry.js';
import { COLUMN_COEFFICIENT } from './column.js';

/** The label every generated spectrum carries. */
export const SYNTHETIC_LABEL =
  'SYNTHETIC HI SPECTRUM: an invented world with a stated rotation curve and gas disk, not a measurement of the Galaxy';

/** The defaults of the worlds of the validation contract. */
export const WORLD = Object.freeze({
  r0: 8,
  theta0: 220,
  rc: 1.5,
  alphas: Object.freeze({ flat: 0, rising: 0.05, falling: -0.05 }),
  densityCm3: 0.05,
  rIn: 1,
  rOut: 18,
  sigmaV: 5,
  noiseK: 0.1,
  losStep: 0.0025,
  channels: 501,
  widthKmS: 1,
  lsr: 'schonrich',
});

/**
 * A channel axis uniform in frequency about the rest frequency, ascending, the
 * spacing equal to `widthKmS` of radio velocity at the rest frequency.
 */
export function channelFrequencies({
  count = WORLD.channels,
  widthKmS = WORLD.widthKmS,
  restHz = HI_LINE.restFrequencyHz,
} = {}) {
  const df = (restHz * widthKmS) / C_KMS;
  return Array.from({ length: count }, (_, i) => restHz + (i - (count - 1) / 2) * df);
}

/**
 * The noise-free spectrum of a world along one sightline.
 *
 * @param {object} o
 * @param {number} o.l - longitude, degrees; b is 0
 * @param {string} [o.curveName] - 'flat' | 'rising' | 'falling' (WORLD.alphas) unless `curve`
 * @param {(R: number) => number} [o.curve] - Theta(R) in km/s
 * @param {number} [o.sigmaV], [o.densityCm3], [o.rIn], [o.rOut], [o.r0], [o.theta0]
 * @param {number} [o.spinTemperatureK] - Infinity (default) for the thin limit
 * @param {number} [o.radialStreamingKmS] - outward streaming, projected on the line of sight
 * @param {string|object} [o.lsr] - the world's LSR option
 * @param {number} [o.channels], [o.widthKmS]
 * @returns {{label: string, frequencyHz: number[], velocityHelio: number[], temperature: number[], truth: object}}
 */
export function generateSpectrum(o) {
  const w = { ...WORLD, ...o };
  const l = wrapLongitude(o.l);
  const geo = tangentGeometry(l, w.r0);
  if (geo.status !== 'ok')
    refuse('no-tangent-point', 'the generator makes sightlines inside the solar circle');
  const curve =
    o.curve ??
    worldCurve({
      theta0: w.theta0,
      r0: w.r0,
      rc: w.rc,
      alpha: WORLD.alphas[o.curveName ?? 'flat'],
    });
  const frequencyHz = channelFrequencies({ count: w.channels, widthKmS: w.widthKmS });
  const n = frequencyHz.length;
  const vHelio = frequencyHz.map(
    f => C_KMS * (1 - f / HI_LINE.restFrequencyHz)
  );
  const shift = lsrShift(l, 0, w.lsr);
  const Ts = o.spinTemperatureK ?? Infinity;
  const thin = !Number.isFinite(Ts);
  const sig = w.sigmaV;
  const norm = 1 / (sig * Math.sqrt(2 * Math.PI));
  const reach = Math.ceil(7 * sig / w.widthKmS) + 3;

  const sl = Math.sin((l * Math.PI) / 180);
  const dMax =
    w.r0 * Math.cos((l * Math.PI) / 180) +
    Math.sqrt(Math.max(0, w.rOut * w.rOut - w.r0 * w.r0 * sl * sl));
  const steps = Math.ceil(dMax / w.losStep);
  const T = new Float64Array(n);
  const tauFg = thin ? null : new Float64Array(n);
  let columnCm2 = 0;
  let vMax = -Infinity;
  let vMin = Infinity;
  const colPerParcel = w.densityCm3 * w.losStep * KPC_CM;
  for (let s = 0; s < steps; s++) {
    const d = (s + 0.5) * w.losStep;
    const R = Math.sqrt(
      w.r0 * w.r0 + d * d - 2 * w.r0 * d * Math.cos((l * Math.PI) / 180)
    );
    if (R < w.rIn || R > w.rOut) continue;
    columnCm2 += colPerParcel;
    const vl = losVelocity({
      l,
      b: 0,
      d,
      curve,
      r0: w.r0,
      theta0: w.theta0,
      radialKmS: w.radialStreamingKmS ?? 0,
    });
    if (vl > vMax) vMax = vl;
    if (vl < vMin) vMin = vl;
    const vh = vl - shift;
    const c0 = Math.round((n - 1) / 2 - vh / w.widthKmS);
    const a = Math.max(0, c0 - reach);
    const z = Math.min(n - 1, c0 + reach);
    for (let c = a; c <= z; c++) {
      const dv = vHelio[c] - vh;
      const phi = Math.exp(-0.5 * (dv * dv) / (sig * sig)) * norm;
      const colV = colPerParcel * phi; // cm^-2 per km/s
      if (thin) T[c] += colV / COLUMN_COEFFICIENT;
      else {
        const dtau = colV / (COLUMN_COEFFICIENT * Ts);
        T[c] += Ts * (1 - Math.exp(-dtau)) * Math.exp(-tauFg[c]);
        tauFg[c] += dtau;
      }
    }
  }
  const side = geo.side;
  return {
    label: SYNTHETIC_LABEL,
    frequencyHz,
    velocityHelio: vHelio,
    temperature: Array.from(T),
    truth: {
      l,
      b: 0,
      world: o.curveName ?? 'custom',
      r0: w.r0,
      theta0: w.theta0,
      sigmaV: sig,
      spinTemperatureK: thin ? null : Ts,
      densityCm3: w.densityCm3,
      rIn: w.rIn,
      rOut: w.rOut,
      radialStreamingKmS: w.radialStreamingKmS ?? 0,
      lsr: { option: typeof w.lsr === 'string' ? w.lsr : 'custom', shiftKmS: shift },
      tangentRadiusKpc: geo.radius,
      tangentDistanceKpc: geo.distance,
      terminalVelocityLsr: terminalVelocity({ l, curve, r0: w.r0, theta0: w.theta0 }),
      circularSpeedAtTangent: curve(geo.radius),
      lineOfSightExtremeLsr: side > 0 ? vMax : vMin,
      columnCm2,
      noiseK: 0,
      losStepKpc: w.losStep,
      channelWidthKmS: w.widthKmS,
      mask: true,
    },
  };
}

/**
 * The same spectrum with white Gaussian noise of sigma `sigmaK` from the named
 * stream 'noise' at `seed` forked by `labels`; the truth gains noiseK.
 */
export function withNoise(spectrum, sigmaK, seed, ...labels) {
  const draw = gaussian(stream('noise', seed, ...labels));
  return {
    ...spectrum,
    temperature: spectrum.temperature.map(t => t + sigmaK * draw()),
    truth: { ...spectrum.truth, noiseK: sigmaK, noiseSeed: [seed, ...labels].join(':') },
  };
}
