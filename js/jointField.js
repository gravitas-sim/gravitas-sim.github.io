// =============================================================================
// The views of the joint-fit panels (Prompt 227, JOINT_INFERENCE.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/jointWidgets.js and
// tests/jointLessons.test.js (which recomputes every number a lesson states from
// them). Nothing is calculated here that the joint kernel does not: the formulas
// are js/inference/jointPlanet.js's.
//
// The system is SYNTHETIC and says so: the pinned fit is the joint fit
// (js/inference/jointModel.js, model `transit-rv-joint`) of the seeded data that
// tools/joint-inference-oracle/oracle.py made, a hot Jupiter of one star with a
// light curve of four transits and thirty velocities from two instruments.
// STORED holds that fit's values and covariance; the panel does not refit (a fit
// takes seconds) but re-derives the planet from the stored covariance and the
// star the reader states, which is exactly what a change of the star changes.
//
// Pure: no DOM, no clock.
// =============================================================================

import { linearPlanet, MJUP_PER_MEARTH } from './inference/jointPlanet.js';
import { PLANETS } from './kernels/interiors/bodies.js';

const { Math } = globalThis;

/**
 * The stored joint fit of the synthetic system (the oracle's S1 data, the
 * joint model, e held at 0, the jitter by its -2 ln L search). Truth, for
 * the teacher: mass 0.7 Jupiter masses around a 1.1 solar-mass, 1.15 solar-radius
 * star (a hot Jupiter of period 3.5247 d), radius ratio 0.12.
 */
export const STORED = Object.freeze({
  names: ['P', 'k', 'aRs', 'b', 'K'],
  mean: [3.5244169, 0.11840057, 9.0350808, 0.4309577, 85.595632],
  covariance: [
    [1.9539455e-8, 2.9450851e-8, -0.0000076557086, 0.0000018115969, -0.0000020397369],
    [2.9450851e-8, 0.000016036015, -0.0021754803, 0.00063478066, -0.0000028369924],
    [-0.0000076557086, -0.0021754803, 0.36986493, -0.099002062, 0.00076257401],
    [0.0000018115969, 0.00063478066, -0.099002062, 0.027380328, -0.00017902597],
    [-0.0000020397369, -0.0000028369924, 0.00076257401, -0.00017902597, 1.2232968],
  ],
  jitter: 2.3296,
  chi2: 978.08,
  dof: 1026,
  truth: { Mp: 0.7, k: 0.12, Ms: 1.1, Rs: 1.15 },
});

/**
 * What leaving the star out costs, measured by tools/joint-inference-validate.mjs on a seeded
 * ensemble (legs C2 to C4, tests/fixtures/joint-inference/results.json): the share of replicates
 * whose one-sigma interval held the truth, with the star's uncertainty inside it and with the
 * star taken as exact. Pinned here by tests/jointInference.test.js against that file.
 */
export const COVERAGE = Object.freeze({ n: 100, Rp: 0.68, RpAlone: 0.5, rhoP: 0.68, rhoPAlone: 0.5 });

/** The stated star's central values: a catalog-like entry for the synthetic star. */
export const STAR = Object.freeze({ mass: 1.1, radius: 1.15 });

/** The pairs of the stellar-uncertainty controls: percent of the central value. */
export const SIGMA_STEPS = Object.freeze([0, 1, 2, 3.5, 5, 8, 12]);

/**
 * The planet from the stored fit and a stated star.
 * @param {{massPct: number, radiusPct: number, correlation?: number,
 *   massValue?: number, radiusValue?: number}} s
 */
export function planetFrom(s) {
  const Ms = s.massValue ?? STAR.mass;
  const Rs = s.radiusValue ?? STAR.radius;
  const star = {
    mass: { value: Ms, sigma: (Ms * s.massPct) / 100 },
    radius: { value: Rs, sigma: (Rs * s.radiusPct) / 100 },
    correlation: s.correlation ?? 0,
  };
  const out = linearPlanet({ ...STORED, star });
  return { star, ...out, MpEarth: scale(out.Mp, MJUP_PER_MEARTH) };
}

const scale = (q, f) => ({
  value: q.value * f,
  sigmaFit: q.sigmaFit * f,
  sigmaStar: q.sigmaStar * f,
  sigma: q.sigma * f,
  share: q.share,
});

/** The relative sigma, percent, of the planet's density with the star's two sigmas both at `pct` percent. */
export const densityPercent = (pct, correlation = 0) => {
  const p = planetFrom({ massPct: pct, radiusPct: pct, correlation });
  return (100 * p.rhoP.sigma) / p.rhoP.value;
};

/**
 * The star's mean density from the transit (the stored true a/R* and P) against
 * its density from the stated mass and radius, g/cm^3, and the tension z.
 */
export function densityTension(s) {
  const p = planetFrom(s);
  const G = 6.6743e-11;
  const GMSUN = 1.3271244e20;
  const RSUN = 6.957e8;
  const rho = (aRs, P) => ((3 * Math.PI * aRs ** 3) / (G * (P * 86400) ** 2)) / 1000;
  const [P, , aRs] = STORED.mean;
  const cov = STORED.covariance;
  const gA = (3 * rho(aRs, P)) / aRs;
  const gP = (-2 * rho(aRs, P)) / P;
  const vt = gA * gA * cov[2][2] + gP * gP * cov[0][0] + 2 * gA * gP * cov[0][2];
  const Ms = p.star.mass.value;
  const Rs = p.star.radius.value;
  const stated = ((GMSUN * Ms) / G / ((4 / 3) * Math.PI * (RSUN * Rs) ** 3)) / 1000;
  const gM = stated / Ms;
  const gR = (-3 * stated) / Rs;
  const sm = p.star.mass.sigma;
  const sr = p.star.radius.sigma;
  const vs = gM * gM * sm * sm + gR * gR * sr * sr + 2 * p.star.correlation * gM * gR * sm * sr;
  const t = rho(aRs, P);
  const z = (t - stated) / Math.sqrt(vt + vs);
  return { transit: t, sigmaTransit: Math.sqrt(vt), stated, sigmaStated: Math.sqrt(vs), z };
}

/** Constant-density lines of the diagram: radius in Earth radii against mass in Earth masses. */
export const DENSITIES = Object.freeze([0.3, 1, 3, 5.51, 12]);

const EARTH_RADIUS_KM = 6378.137;
const EARTH_GM = 398600.4418;

/** The Solar System's planets as points of the diagram, from the Prompt 203 table (typed, not rechecked). */
export function solarSystemPoints() {
  return Object.values(PLANETS).filter(p => p.name !== 'Moon').map(p => ({
    name: p.name,
    mass: p.gm[0] / EARTH_GM,
    radius: p.radius.mean[0] / EARTH_RADIUS_KM,
  }));
}

/**
 * The line of constant bulk density g/cm^3: R(M) in Earth radii for masses in
 * Earth masses, from rho = M / (4 pi R^3 / 3) with the Earth's nominal GM and
 * equatorial radius (the Earth's own mean density, 5.51 g/cm^3, lies on the 5.51 line
 * only up to its oblateness, which this diagram does not claim).
 */
export function densityLine(rho, masses) {
  const G = 6.6743e-11;
  return masses.map(m => {
    const kg = (m * EARTH_GM * 1e9) / G;
    const r = ((3 * kg) / (4 * Math.PI * rho * 1000)) ** (1 / 3);
    return r / (EARTH_RADIUS_KM * 1000);
  });
}

/** The planet's point and its one-sigma box in Earth units. */
export function planetBox(s) {
  const p = planetFrom(s);
  const toE = 71492 / EARTH_RADIUS_KM;
  return {
    mass: p.MpEarth,
    radius: {
      value: p.Rp.value * toE,
      sigma: p.Rp.sigma * toE,
      sigmaFit: p.Rp.sigmaFit * toE,
    },
    rhoP: p.rhoP,
  };
}
