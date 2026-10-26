// Ring criteria: where a moon's mean-motion resonance falls in a ring, and
// whether the ring's own gravity makes it clump (Toomre). Point-mass Kepler
// relations, no oblateness (TIDAL_KERNEL.md names the size of what is left out).
import { G_SI } from '../../constants.js';
import { TidesError, params, positive } from './errors.js';

/**
 * The radius of the p:q mean-motion resonance inside a moon: the moon's period
 * is p/q of the particle's there, so a_r = a_m (q/p)^(2/3). `p > q >= 1` are
 * integers; 2:1 with Mimas is the Cassini Division.
 *
 * @param {{semiMajorAxis:number, p:number, q:number}} c
 * @returns {{radius:number, periodRatio:number}}
 */
export function resonanceRadius(c) {
  params(c);
  const a = positive(c.semiMajorAxis, 'semiMajorAxis');
  const { p, q } = c;
  if (
    !Number.isInteger(p) ||
    !Number.isInteger(q) ||
    q < 1 ||
    p <= q ||
    p > 1000
  ) {
    throw new TidesError(
      'resonance-order',
      'a resonance needs integers p > q >= 1 (p up to 1000)'
    );
  }
  return { radius: a * Math.cbrt((q / p) * (q / p)), periodRatio: p / q };
}

/**
 * The first-order and second-order resonances nearest a radius inside a moon,
 * best first: what a student asks of a gap ("which resonance is this?").
 *
 * @param {{semiMajorAxis:number, radius:number}} c
 * @param {number} [maxQ] - the largest q to try
 * @returns {Array<{p:number, q:number, radius:number, offset:number}>} offset = (r_res - radius) / radius
 */
export function nearestResonances(c, maxQ = 6) {
  params(c);
  const a = positive(c.semiMajorAxis, 'semiMajorAxis');
  const radius = positive(c.radius, 'radius');
  if (radius >= a) {
    throw new TidesError('input', 'the radius must lie inside the moon');
  }
  const found = [];
  for (let q = 1; q <= maxQ; q++) {
    for (let p = q + 1; p <= q + 2; p++) {
      const r = resonanceRadius({ semiMajorAxis: a, p, q }).radius;
      found.push({ p, q, radius: r, offset: (r - radius) / radius });
    }
  }
  return found.sort((x, y) => Math.abs(x.offset) - Math.abs(y.offset));
}

/**
 * Toomre's Q for a Kepler disc: Q = c kappa sigma_v / (3.36 G Sigma) for
 * particles, with pi in place of 3.36 for a fluid. Below 1 the disc clumps.
 *
 * @param {{primaryMass:number, radius:number, velocityDispersion:number, surfaceDensity:number, kind?:'particles'|'fluid'}} c
 * @returns {{Q:number, kappa:number, coefficient:number, unstable:boolean}}
 */
export function toomreQ(c) {
  params(c);
  const M = positive(c.primaryMass, 'primaryMass');
  const r = positive(c.radius, 'radius');
  const sigma = positive(c.velocityDispersion, 'velocityDispersion');
  const surface = positive(c.surfaceDensity, 'surfaceDensity');
  const kind = c.kind === undefined ? 'particles' : c.kind;
  if (kind !== 'particles' && kind !== 'fluid') {
    throw new TidesError('input', 'kind must be particles or fluid');
  }
  const kappa = Math.sqrt((G_SI * M) / (r * r * r));
  const coefficient = kind === 'particles' ? 3.36 : Math.PI;
  const Q = (sigma * kappa) / (coefficient * G_SI * surface);
  return { Q, kappa, coefficient, unstable: Q < 1 };
}
