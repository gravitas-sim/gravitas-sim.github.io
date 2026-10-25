// =============================================================================
// Synthetic visual-binary series with a truth manifest (Prompt 187, ORBIT_FIT_GATE.md)
// -----------------------------------------------------------------------------
// A secondary's relative orbit from Thiele-Innes style elements, made by the 3-D
// kernel's own elements-to-state conversion (js/lab3d/elements.js: its Kepler
// solver and rotation, not the fitter's), projected onto the sky (x north,
// y east, the kernel's x and y), with seeded white noise of a stated standard
// deviation per axis (the forward models' noise). Used by the gate, the validation
// tool and the tests; never by the page.
// =============================================================================

import { fromElements } from '../js/lab3d/elements.js';
import { gaussian, stream } from '../js/random/streams.js';

const RAD = Math.PI / 180;
const TAU = 2 * Math.PI;

/** Noise-free offsets (north, east) at decimal years for elements in arcseconds, degrees, years. */
export function truePositions(el, years) {
  const mu = (TAU * TAU * el.a * el.a * el.a) / (el.P * el.P);
  return years.map(t => {
    const M = (TAU * (t - el.T)) / el.P;
    const s = fromElements(
      {
        a: el.a,
        e: el.e,
        i: el.i * RAD,
        Omega: el.Omega * RAD,
        omega: el.omega * RAD,
        M,
      },
      mu
    );
    return { x: s.x[0], y: s.x[1] };
  });
}

/**
 * A series and its truth manifest.
 * @param {{a: number, e: number, i: number, Omega: number, omega: number, P: number, T: number}} truth
 * @param {number[]} years - decimal Julian years
 * @param {{sigma: number, seed?: string, noise?: boolean, polar?: boolean, label?: string}} opts
 */
export function makeOrbitSeries(truth, years, opts) {
  const { sigma, seed = 'synth', noise = true, polar = false } = opts;
  const pos = truePositions(truth, years);
  const g = gaussian(stream('noise', opts.label ?? 'orbit-fit-187', seed));
  const epochs = pos.map((p, i) => {
    const x = p.x + (noise ? g() * sigma : 0);
    const y = p.y + (noise ? g() * sigma : 0);
    const time = { value: years[i], format: 'year' };
    if (!polar) return { time, x, y, sigma };
    const rho = Math.hypot(x, y);
    const theta = (((Math.atan2(y, x) / RAD) % 360) + 360) % 360;
    return { time, rho, theta, sigmaRho: sigma, sigmaTheta: sigma / rho / RAD };
  });
  return { epochs, truth: { ...truth, sigma, seed, noise } };
}

/** n epochs evenly spaced from start to start + span inclusive. */
export const evenYears = (start, span, n) =>
  Array.from({ length: n }, (_, k) => start + (span * k) / (n - 1));

/** A random orbit of the gate's distribution from a unit-uniform draw. */
export function randomOrbit(
  u,
  { e = [0.1, 0.8], cosI = [-0.85, 0.85], a = 1, P = 10, epoch = 2000 } = {}
) {
  const ecc = e[0] + (e[1] - e[0]) * u();
  const ci = cosI[0] + (cosI[1] - cosI[0]) * u();
  return {
    a,
    e: e[1] === 0 ? 0 : ecc,
    i: Math.acos(ci) / RAD,
    Omega: 360 * u(),
    omega: 360 * u(),
    P,
    T: epoch + P * u(),
  };
}

/** The orbit with Omega in [0, 180) and omega shifted to match: astrometry cannot tell the node from the opposite one. */
export const canonical = el => {
  const O = el.Omega % 180;
  const shift = Math.round((el.Omega - O) / 180) % 2 !== 0 ? 180 : 0;
  return { ...el, Omega: O, omega: (el.omega + shift) % 360 };
};

/** The gate's epochs: n from `start` to `start + span`, the interior ones jittered by +-jitter of the spacing (a regular cadence aliases the period). */
export function jitteredYears(start, span, n, u, jitter = 0.3) {
  const dt = span / (n - 1);
  return Array.from({ length: n }, (_, k) =>
    k === 0 || k === n - 1
      ? start + (span * k) / (n - 1)
      : start + dt * k + dt * jitter * (2 * u() - 1)
  );
}
