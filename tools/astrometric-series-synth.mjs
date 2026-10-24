// =============================================================================
// Synthetic astrometric series with a truth manifest (Prompt 186, ASTROMETRY.md)
// -----------------------------------------------------------------------------
// A source at distance 1/parallax parsecs with a constant barycentric velocity
// tangent to the sky, seen from the Earth's barycentric position through the exact
// spherical geometry: the apparent direction is the normalised vector from the
// Earth to the source, so the series is NOT made by the linear model the fit uses
// (the two differ by a term of order parallax times the offset, below a
// micro-arcsecond). Positions are right ascension and declination with a seeded
// Gaussian error per axis. No aberration, no light deflection, no light time.
// Used by the validation tool and the tests; never by the page.
// =============================================================================

import { gaussian, stream } from '../js/random/streams.js';

const RAD = Math.PI / 180;
const ARCSEC = RAD / 3600;
const PC_AU = 648000 / Math.PI;
const YEAR = 365.25;

/** The exact apparent (ra, dec) in degrees of a source at the epochs, given the Earth's barycentric positions (au). */
export function apparent(truth, jds, earths) {
  const a0 = truth.ra * RAD;
  const d0 = truth.dec * RAD;
  const p0 = [
    Math.cos(d0) * Math.cos(a0),
    Math.cos(d0) * Math.sin(a0),
    Math.sin(d0),
  ];
  const ea = [-Math.sin(a0), Math.cos(a0), 0];
  const ed = [
    -Math.cos(a0) * Math.sin(d0),
    -Math.sin(a0) * Math.sin(d0),
    Math.cos(d0),
  ];
  const dist = PC_AU / truth.parallax;
  const m = [0, 1, 2].map(
    k => truth.mu[0] * ARCSEC * ea[k] + truth.mu[1] * ARCSEC * ed[k]
  );
  return jds.map((jd, i) => {
    const t = (jd - jds[0]) / YEAR;
    const u = [0, 1, 2].map(k => dist * (p0[k] + m[k] * t) - earths[i][k]);
    const n = Math.hypot(...u);
    return {
      ra: (((Math.atan2(u[1], u[0]) / RAD) % 360) + 360) % 360,
      dec: Math.asin(u[2] / n) / RAD,
    };
  });
}

/**
 * A series and its truth manifest.
 * @param {{ra: number, dec: number, parallax: number, mu: number[], sigma: number}} truth - degrees; arcsec; arcsec per year (mu_a* and mu_d); arcsec per axis
 * @param {number[]} jds - TDB Julian dates
 * @param {{at: Function}} earth
 * @param {{seed?: string, noise?: boolean, scale?: string}} [opts] - the stream label; `noise: false` for the exact positions
 */
export function makeSeries(truth, jds, earth, opts = {}) {
  const { seed = 'synth', noise = true, scale = 'tdb' } = opts;
  const pos = apparent(
    truth,
    jds,
    jds.map(jd => earth.at(jd))
  );
  const g = gaussian(stream('noise', 'astrometric-series-186', seed));
  const epochs = pos.map((p, i) => {
    const na = noise ? g() * truth.sigma : 0;
    const nd = noise ? g() * truth.sigma : 0;
    return {
      time: { value: jds[i], format: 'jd', scale },
      ra: p.ra + (na * ARCSEC) / Math.cos(p.dec * RAD) / RAD,
      dec: p.dec + (nd * ARCSEC) / RAD,
      sigma: truth.sigma,
    };
  });
  return { epochs, truth: { ...truth, seed, noise } };
}

/** n epochs evenly spaced over `span` days from `start`. */
export const evenEpochs = (start, span, n) =>
  Array.from({ length: n }, (_, k) => start + (span * k) / (n - 1));

/** n epochs uniform at random in [start, start + span] from a unit-uniform draw. */
export const randomEpochs = (start, span, n, draw) =>
  Array.from({ length: n }, () => start + span * draw()).sort((a, b) => a - b);
