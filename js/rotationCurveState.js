// =============================================================================
// What the rotation curve says, without the panel
// -----------------------------------------------------------------------------
// The numbers behind the rotation-curve panel (js/rotationCurve.js): which
// bodies count, the fit, the two predictions, the law in force, and what a
// cluster of galaxies offers to be measured. The panel is fetched when it is
// first opened; the data export and the lesson probes read these numbers
// without it, so they live here and the panel re-exports them.
// =============================================================================

import {
  galaxies,
  stars,
  planets,
  gas_giants,
  asteroids,
  bh_list,
  neutron_stars,
  white_dwarfs,
  getPhysicsSetting,
} from './physics.js';
import {
  massCenter,
  rotationCurvePoints,
  fitPowerLaw,
  enclosedVisibleMass,
  velocityDispersion,
} from './darkMatter.js';
import { a0InSimUnits } from './mond.js';

// The last fit, kept so the readout does not flicker between frames when a
// body briefly leaves the fitting window.
let lastFit = null;

/** Forget the last fit: the panel was opened, or a new world was built. */
export const resetRotationCurveFit = () => {
  lastFit = null;
};

/**
 * Every body whose motion counts as part of the rotation curve.
 *
 * Debris and accretion-disk particles are left out. They are numerous, mostly
 * unbound, and they would bury the signal in a cloud of points that describe
 * fragments rather than orbits.
 *
 * @returns {Array} Bodies
 */
export function curveBodies() {
  return [
    ...stars,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...neutron_stars,
    ...white_dwarfs,
    ...bh_list,
    ...galaxies,
  ].filter(b => b && b.alive !== false && isFinite(b.mass) && b.mass > 0);
}

/** @returns {?{vFlat: number, coreRadius: number}} Halo parameters, or null */
function halo() {
  return getPhysicsSetting('galaxy_gravity') === 'halo'
    ? {
        vFlat: getPhysicsSetting('halo_v_flat'),
        coreRadius: getPhysicsSetting('halo_core_radius'),
      }
    : null;
}

/** @returns {string} Which law is in the force law: newtonian, halo or mond */
export function galaxyGravityMode() {
  return getPhysicsSetting('galaxy_gravity') || 'newtonian';
}

/**
 * Milgrom's constant in this scenario's units, or 0 when MOND cannot run here.
 *
 * Zero for every scenario that has not declared what a simulation unit
 * represents, which is every scenario except the three galaxy scale models.
 *
 * @returns {number} a0 in simulation acceleration units
 */
function mondA0() {
  return a0InSimUnits(
    {
      kpcPerUnit: getPhysicsSetting('galaxy_kpc_per_unit'),
      solarMassPerUnit: getPhysicsSetting('galaxy_msun_per_unit'),
    },
    getPhysicsSetting('gravitational_constant')
  );
}

/**
 * The current state of the plot: points, center, fit, and the two predictions.
 *
 * Separated from the drawing so the numbers can be read without a canvas, which
 * is what the tests and the investigation's own checks use.
 *
 * @returns {object} Everything the panel knows this frame
 */
export function rotationCurveState() {
  const bodies = curveBodies();
  const center = massCenter(bodies);
  const all = rotationCurvePoints(bodies, center);
  const G = getPhysicsSetting('gravitational_constant');

  // Drop the central mass, and only the central mass. A rotation curve plots
  // tracers moving in a field; the body making the field is not a tracer of
  // itself, and a real rotation curve never carries a point for the bulge.
  // Leaving it in put a body at r = 6 with the model predicting 49 there, which
  // set the vertical scale from a point that means nothing and squashed the
  // whole disc into the bottom eighth of the plot.
  //
  // Identified as the heaviest body sitting near the middle, rather than by a
  // radius cutoff: a cutoff wide enough to catch a galactic bulge also threw
  // away Mercury, which is a tracer and belongs on the plot.
  const outermost = all.length ? all[all.length - 1].r : 0;
  let heaviest = null;
  for (const p of all) if (!heaviest || p.mass > heaviest.mass) heaviest = p;
  const central =
    heaviest && heaviest.r < outermost * 0.05 ? heaviest.body : null;
  const points = central ? all.filter(p => p.body !== central) : all;

  // Fit only the outer part. Inside the bulge the curve rises with radius for
  // reasons that have nothing to do with dark matter, and including that region
  // would drag a genuinely Keplerian slope toward zero and manufacture the
  // result the lesson is asking students to test for.
  const rMax = points.length ? points[points.length - 1].r : 0;
  const rFitMin = rMax * 0.25;
  const fit = fitPowerLaw(points, rFitMin);
  if (fit) lastFit = fit;

  return {
    bodies,
    center,
    points,
    G,
    halo: halo(),
    mode: galaxyGravityMode(),
    a0: mondA0(),
    rFitMin,
    fit: fit || lastFit,
    visibleMass: center.mass,
    enclosedAtEdge: enclosedVisibleMass(bodies, center, rMax),
  };
}

/**
 * What a cluster of galaxies offers to be measured.
 *
 * A cluster is a swarm, not a disc, so a rotation curve is the wrong
 * instrument for it: its members are on randomly oriented orbits and there is
 * no rotation to plot. What there is instead is a velocity dispersion and a
 * size, and those two numbers plus the virial theorem are the whole of
 * Zwicky's 1933 measurement.
 *
 * The panel reports the measurements and stops there. It does not do the
 * virial arithmetic, because doing that arithmetic is the exercise.
 *
 * @returns {?object} Cluster measurements, or null when there is no cluster
 */
export function clusterState() {
  const members = galaxies.filter(g => g && g.alive !== false);
  if (members.length < 3) return null;

  const center = massCenter(members);
  const { sigma, meanSquare } = velocityDispersion(members);

  let radius = 0;
  for (const g of members) {
    radius = Math.max(
      radius,
      Math.hypot(g.pos.x - center.x, g.pos.y - center.y)
    );
  }

  return {
    count: members.length,
    sigma,
    meanSquare,
    radius,
    visibleMass: center.mass,
  };
}

/** @returns {boolean} Whether the halo is currently in the force law */
export const darkMatterHaloOn = () =>
  getPhysicsSetting('galaxy_gravity') === 'halo';
