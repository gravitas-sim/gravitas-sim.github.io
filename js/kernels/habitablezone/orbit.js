// The flux an eccentric orbit receives, and the fraction of the year it spends
// in a band of distance (the existing lesson's model, js/habitability.js, in
// closed form). Pure; distances in AU, fluxes in Earth units.
import { HabitableZoneError, finite, params, positive } from './errors.js';

function orbitOf(p) {
  params(p);
  const L = positive(p.luminositySolar, 'the luminosity', 'luminosity');
  const a = positive(p.semiMajorAU, 'the semi-major axis', 'orbit');
  const e = finite(p.eccentricity, 'the eccentricity');
  if (!(e >= 0 && e < 1)) {
    throw new HabitableZoneError(
      'eccentricity',
      'the eccentricity must lie in [0, 1)',
      { eccentricity: e }
    );
  }
  return { L, a, e };
}

/**
 * Periapsis and apoapsis distances and fluxes, and the flux averaged over time.
 * The time mean of 1 / r^2 over an orbit is 1 / (a^2 sqrt(1 - e^2)): a planet
 * on an eccentric orbit receives more than one on a circle of the same a.
 *
 * @param {{luminositySolar:number, semiMajorAU:number, eccentricity:number}} p
 */
export function orbitFluxes(p) {
  const { L, a, e } = orbitOf(p);
  const periapsisAU = a * (1 - e);
  const apoapsisAU = a * (1 + e);
  const periapsisFlux = L / (periapsisAU * periapsisAU);
  const apoapsisFlux = L / (apoapsisAU * apoapsisAU);
  return {
    periapsisAU,
    apoapsisAU,
    periapsisFlux,
    apoapsisFlux,
    meanFlux: L / (a * a * Math.sqrt(1 - e * e)),
    circularFlux: L / (a * a),
    // ((1 + e) / (1 - e))^2, the peak-to-trough ratio of the flux
    fluxRatio: apoapsisFlux === 0 ? Infinity : periapsisFlux / apoapsisFlux,
  };
}

/** The fraction of a year spent at distance below r, from Kepler's equation. */
function timeBelow(r, a, e) {
  if (r <= a * (1 - e)) return 0;
  if (r >= a * (1 + e)) return 1;
  const E = Math.acos((1 - r / a) / e);
  return (E - e * Math.sin(E)) / Math.PI;
}

/**
 * The fraction of the year with the planet's distance inside [innerAU, outerAU]:
 * time, not arc. Kepler's equation at the band's ends, nothing sampled.
 *
 * @param {{semiMajorAU:number, eccentricity:number, innerAU:number, outerAU:number}} p
 * @returns {number} 0 to 1
 */
export function fractionOfYearInBand(p) {
  params(p);
  const a = positive(p.semiMajorAU, 'the semi-major axis', 'orbit');
  const e = finite(p.eccentricity, 'the eccentricity');
  if (!(e >= 0 && e < 1)) {
    throw new HabitableZoneError(
      'eccentricity',
      'the eccentricity must lie in [0, 1)',
      { eccentricity: e }
    );
  }
  const inner = finite(p.innerAU, 'the inner edge');
  const outer = finite(p.outerAU, 'the outer edge');
  if (!(inner >= 0) || !(outer > inner)) {
    throw new HabitableZoneError('band', 'the band needs 0 <= inner < outer', {
      innerAU: inner,
      outerAU: outer,
    });
  }
  // A circle is at one distance all year, and the band includes both its ends:
  // a planet exactly on an edge is in.
  if (e === 0) return a >= inner && a <= outer ? 1 : 0;
  return timeBelow(outer, a, e) - timeBelow(inner, a, e);
}
