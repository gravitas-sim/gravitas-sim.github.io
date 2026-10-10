// A spectrum from the radiation kernel: a blackbody continuum (Planck's law,
// js/kernels/radiation/planck.js), absorption lines of stated equivalent width
// and intrinsic width, a Doppler shift, and an instrument of stated resolving
// power.
//
// The flux is relative: the continuum is scaled to a mean of 1 across the
// window, so the unit is dimensionless and the noise sigma is in the same
// units. A line of rest-frame equivalent width W and intrinsic FWHM w, seen at
// redshift z through an instrument of resolving power R, is a Gaussian
// absorption of area (1 + z) W centred at (1 + z) lambda_rest, of FWHM
// sqrt(((1 + z) w)^2 + (lambda_obs / R)^2). The pixels sample it at their
// centres.
import { planckLambda } from '../../kernels/radiation/planck.js';
import {
  observedWavelength,
  zFromVelocity,
} from '../../kernels/radiation/doppler.js';
import { applyNoise } from '../setup.js';
import { syntheticObservation, valueColumns } from '../observation.js';
import { requireSetup } from './common.js';

export const ID = 'spectrum';
export const VERSION = '1.0.0';
const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);
const MAX_PIXELS = 200000;

/** The wavelength grid, nm: the dispersion, or a third of a resolution element. */
export function wavelengthGrid(instrument) {
  const [lo, hi] = instrument.window ?? [];
  if (!(lo > 0 && hi > lo))
    throw new Error('a spectrum needs instrument.window, in nm');
  const step =
    instrument.dispersion ??
    (instrument.resolvingPower
      ? (0.5 * (lo + hi)) / instrument.resolvingPower / 3
      : null);
  if (!(step > 0))
    throw new Error('a spectrum needs instrument.dispersion or resolvingPower');
  const n = Math.floor((hi - lo) / step) + 1;
  if (n < 2 || n > MAX_PIXELS)
    throw new Error(
      `the window and dispersion give ${n} pixels; 2 to ${MAX_PIXELS} are allowed`
    );
  return Float64Array.from({ length: n }, (_, i) => lo + i * step);
}

/** Where a line lands, and how wide: the observed centre, FWHM and area, nm. */
export function observedLine(line, z, instrument) {
  const centreNm = observedWavelength(line.restNm, z);
  const intrinsic = (line.fwhmNm ?? 0) * (1 + z);
  const R = instrument.resolvingPower;
  const instrumental = R ? centreNm / R : 2 * (instrument.dispersion ?? 0);
  return {
    centreNm,
    fwhmNm: Math.hypot(intrinsic, instrumental),
    areaNm: line.ewNm * (1 + z),
  };
}

export function run(state, rawSetup, opts = {}) {
  const s = state.spectrum;
  if (!s || !(s.teffK > 0))
    throw new Error('the spectrum model needs state.spectrum with teffK');
  const setup = requireSetup(rawSetup, ['spectrograph']);
  const lambda = wavelengthGrid(setup.instrument);
  const z = zFromVelocity(s.velocityKmS ?? 0);
  const lines = (s.lines ?? []).map(l => ({
    ...l,
    ...observedLine(l, z, setup.instrument),
  }));
  const cont = Float64Array.from(lambda, l => planckLambda(l * 1e-9, s.teffK));
  const mean = cont.reduce((a, b) => a + b, 0) / cont.length;
  const clean = new Float64Array(lambda.length);
  for (let i = 0; i < lambda.length; i++) {
    let depth = 0;
    for (const l of lines) {
      const sigma = l.fwhmNm / FWHM_PER_SIGMA;
      const x = (lambda[i] - l.centreNm) / sigma;
      if (Math.abs(x) < 8)
        depth +=
          (l.areaNm / (sigma * Math.sqrt(2 * Math.PI))) *
          Math.exp(-0.5 * x * x);
    }
    clean[i] = (cont[i] / mean) * (1 - depth);
  }
  const idx = Int32Array.from(lambda, (_, i) => i);
  const noisy = applyNoise(clean, lambda, idx, setup);
  const parameters = [
    { id: 'teff', name: 'temperature', value: s.teffK, unit: 'K' },
    {
      id: 'velocity',
      name: 'radial velocity',
      value: s.velocityKmS ?? 0,
      unit: 'km/s',
    },
    { id: 'z', name: 'redshift', value: z, unit: '' },
    ...lines.flatMap((l, k) => [
      {
        id: `line${k}.centre`,
        name: `line ${l.restNm} nm: observed centre`,
        value: l.centreNm,
        unit: 'nm',
      },
      {
        id: `line${k}.ew`,
        name: `line ${l.restNm} nm: equivalent width, observed`,
        value: l.areaNm,
        unit: 'nm',
      },
      {
        id: `line${k}.fwhm`,
        name: `line ${l.restNm} nm: observed FWHM`,
        value: l.fwhmNm,
        unit: 'nm',
      },
    ]),
  ];
  return syntheticObservation({
    model: ID,
    version: VERSION,
    setup,
    kind: 'spectrum',
    title: opts.title ?? 'Synthetic spectrum',
    columns: [
      {
        id: 'wavelength',
        name: 'Wavelength',
        unit: 'nm',
        role: 'x',
        values: lambda,
      },
      ...valueColumns('flux', 'Relative flux', '', noisy.values, noisy.sigma),
    ],
    axes: { x: 'wavelength', y: 'flux' },
    truth: {
      parameters,
      injected: noisy.injected,
      notes: [
        'Blackbody continuum; lines are Gaussian absorptions (no damping wings, no blends).',
        'Each pixel samples the model at its centre. Flux is continuum-relative, mean 1 over the window.',
      ],
    },
    extra: {
      spectral: {
        column: 'wavelength',
        quantity: 'wavelength',
        medium: 'vacuum',
        frame: 'observer',
      },
    },
  });
}
