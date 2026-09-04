// =============================================================================
// MOND: Modified Newtonian Dynamics, as an alternative to the halo
// -----------------------------------------------------------------------------
// Everything here is pure, like js/darkMatter.js next to it: numbers in, numbers
// out, no DOM and no settings object. That is what lets the force law, the
// rotation-curve panel, the lesson's widget and the tests all quote the same
// arithmetic, and it is what makes the claims checkable.
//
// What MOND is, and what it is not
// --------------------------------
// Milgrom (1983) proposed that below a characteristic acceleration a0 the
// relation between gravity and motion departs from Newton's. Where the
// Newtonian field gN is strong compared with a0, nothing changes. Where it is
// weak, the true acceleration approaches
//
//   g -> sqrt(gN a0)
//
// A point mass then has g = sqrt(G M a0)/r far out, and a circular orbit in that
// field has v^2/r = sqrt(G M a0)/r, so
//
//   v^4 = G M a0
//
// - a flat rotation curve, and a fixed relation between a galaxy's baryonic mass
// and its asymptotic speed. That relation is observed: it is the baryonic
// Tully-Fisher relation, and its scatter is small.
//
// This module implements MOND as a modification of the *acceleration*, applied
// to the Newtonian field of the visible matter. That is the "modified inertia /
// algebraic" reading, which is what almost every rotation-curve comparison in
// the literature actually uses. It is not a relativistic theory, it is not
// derived from an action, and it does not conserve momentum for an isolated
// pair the way the full field-theory formulation (AQUAL, Bekenstein & Milgrom
// 1984) does. Those are real defects and the lesson says so.
//
// What this module is careful NOT to imply
// ----------------------------------------
// Fitting a rotation curve does not establish a theory. A halo with two free
// parameters per galaxy and MOND with none can both reproduce the same curve,
// and they do. Deciding between them needs evidence from outside rotation
// curves - cluster dynamics, the cosmic microwave background, gravitational
// lensing, the Bullet Cluster - and on several of those MOND does badly without
// additional dark matter of its own. See MOND_LIMITATIONS below, which the
// documentation and the lesson both draw from.
//
// References
// ----------
//   Milgrom, M. 1983, ApJ 270, 365 - the original proposal.
//   Begeman, Broeils & Sanders 1991, MNRAS 249, 523 - a0 from rotation curves.
//   Famaey & Binney 2005, MNRAS 363, 603 - the "simple" interpolating function.
//   Famaey & McGaugh 2012, Living Rev. Relativity 15, 10 - the standard review,
//     including the failures.
//   McGaugh, Lelli & Schombert 2016, PRL 117, 201101 - the radial acceleration
//     relation, the modern empirical statement of the same regularity.
// =============================================================================

import { PARSEC_M } from './constants.js';
import { G_GALACTIC, galaxyCurveAt } from './darkMatter.js';

// --- The constant -------------------------------------------------------------

/**
 * Milgrom's constant, in SI.
 *
 * 1.2e-10 m/s^2. This is the value Begeman, Broeils & Sanders (1991) obtained
 * by fitting rotation curves and the one the Famaey & McGaugh review quotes; it
 * has not moved appreciably in thirty years of refitting. Published
 * determinations sit between about 1.1 and 1.3e-10 depending on the
 * interpolating function used, which is a reminder that a0 and the choice of
 * interpolation are not independently measurable from curves alone.
 *
 * It is quoted here in SI and converted everywhere else, so there is exactly
 * one number in the codebase that anyone has to check against a paper.
 */
export const A0_SI = 1.2e-10;

/** Metres in a kiloparsec. */
const KPC_M = PARSEC_M * 1e3;

/**
 * One (km/s)^2/kpc, expressed in m/s^2.
 *
 * (1000 m/s)^2 / (3.0857e19 m) = 3.2408e-14 m/s^2. This is the only unit
 * conversion in the MOND path, and every other quantity is derived from it.
 */
export const GALACTIC_ACCEL_IN_SI = 1e6 / KPC_M;

/**
 * a0 in the units a rotation curve is written in: (km/s)^2 per kpc.
 *
 * Works out to about 3703. Kept derived rather than written down so that it
 * cannot drift from A0_SI.
 */
export const A0_GALACTIC = A0_SI / GALACTIC_ACCEL_IN_SI;

// --- Interpolating functions ---------------------------------------------------
//
// MOND is defined by an interpolating function that has to satisfy two limits
// and is otherwise unconstrained by the theory. That freedom is a genuine
// weakness - the transition region is where the theory has the least to say -
// and it is the reason both forms below are offered and named rather than one
// being buried in the arithmetic.
//
// Two conventions exist and they are easy to confuse:
//
//   mu(x) g = gN     with x = g / a0        acts on the true acceleration
//   g = nu(y) gN     with y = gN / a0       acts on the Newtonian one
//
// The second is what a rotation-curve calculation wants, because gN is what you
// can compute from the visible mass. The two are inverses of each other.

/**
 * The "simple" interpolating function, mu(x) = x / (1 + x).
 *
 * Famaey & Binney (2005) showed this fits the Milky Way's terminal-velocity
 * curve and external galaxies better than the older "standard" form, and it has
 * been the usual choice since. Its inverse is closed-form, which is why the
 * force law can use it without iterating.
 *
 * @param {number} x - g / a0
 * @returns {number} mu(x), in [0, 1)
 */
export const muSimple = x => (x > 0 ? x / (1 + x) : 0);

/**
 * The "standard" interpolating function, mu(x) = x / sqrt(1 + x^2).
 *
 * Milgrom's original choice, still quoted, and the reason the word "standard"
 * appears in the literature at all. It approaches the Newtonian limit more
 * slowly than the simple form, which is what the Solar System bounds dislike.
 *
 * @param {number} x - g / a0
 * @returns {number} mu(x), in [0, 1)
 */
export const muStandard = x => (x > 0 ? x / Math.sqrt(1 + x * x) : 0);

/**
 * nu for the simple mu: the factor the Newtonian acceleration is multiplied by.
 *
 * Solving mu(g/a0) g = gN with mu(x) = x/(1+x) gives a quadratic in g whose
 * positive root is
 *
 *   g = gN/2 * (1 + sqrt(1 + 4 a0/gN))
 *
 * so nu(y) = (1 + sqrt(1 + 4/y)) / 2 with y = gN/a0.
 *
 * Both limits fall out of that expression rather than being special-cased:
 * large y gives nu -> 1 + 1/y, and small y gives nu -> 1/sqrt(y), which is
 * g -> sqrt(gN a0).
 *
 * Written as it is rather than as the algebraically equal
 * `(1 + sqrt(1 + 4/y))/2` evaluated directly, because at large y that form is
 * 1 plus a vanishing correction computed as the difference of two numbers close
 * to 1, and it loses the correction entirely. The `2 / (sqrt(...) - 1)` shape
 * has the same problem at the other end. The branch below picks whichever is
 * stable in each regime; they agree to machine precision at the join.
 *
 * @param {number} y - gN / a0
 * @returns {number} nu(y) >= 1
 */
export function nuSimple(y) {
  if (!(y > 0) || !Number.isFinite(y)) return 1;
  if (y > 1e8) {
    // nu = 1 + 1/y - 1/y^2 + ... Two terms are far past double precision here.
    return 1 + 1 / y;
  }
  return (1 + Math.sqrt(1 + 4 / y)) / 2;
}

/**
 * nu for the standard mu: mu(x) = x / sqrt(1 + x^2).
 *
 * Solving mu(g/a0) g = gN gives g^4 - gN^2 g^2 - gN^2 a0^2 = 0, so
 *
 *   (g/a0)^2 = (y^2 + y sqrt(y^2 + 4)) / 2,    y = gN / a0
 *
 * and nu = g/gN follows.
 *
 * @param {number} y - gN / a0
 * @returns {number} nu(y) >= 1
 */
export function nuStandard(y) {
  if (!(y > 0) || !Number.isFinite(y)) return 1;
  if (y > 1e8) return 1 + 1 / (2 * y * y);
  const xSq = (y * y + y * Math.sqrt(y * y + 4)) / 2;
  return Math.sqrt(xSq) / y;
}

/** The prescriptions this project offers, by name. */
export const INTERPOLATIONS = {
  simple: { nu: nuSimple, mu: muSimple, label: 'simple' },
  standard: { nu: nuStandard, mu: muStandard, label: 'standard' },
};

/**
 * The default prescription.
 *
 * The simple form, following Famaey & Binney (2005) and most rotation-curve
 * work since. Named in one place so the panel, the lesson and the tests cannot
 * disagree about which curve is being drawn.
 */
export const DEFAULT_INTERPOLATION = 'simple';

/**
 * The factor by which MOND multiplies a Newtonian acceleration.
 *
 * @param {number} gN - Newtonian acceleration from the visible matter
 * @param {number} a0 - Milgrom's constant, in the same acceleration units
 * @param {string} [form] - Which interpolating function
 * @returns {number} nu >= 1, or 1 when there is nothing to modify
 */
export function mondBoost(gN, a0, form = DEFAULT_INTERPOLATION) {
  if (!(gN > 0) || !(a0 > 0) || !Number.isFinite(gN) || !Number.isFinite(a0)) {
    return 1;
  }
  const nu = (INTERPOLATIONS[form] || INTERPOLATIONS[DEFAULT_INTERPOLATION]).nu;
  const out = nu(gN / a0);
  return Number.isFinite(out) && out >= 1 ? out : 1;
}

/**
 * The MOND acceleration corresponding to a Newtonian one.
 *
 * @param {number} gN - Newtonian acceleration from the visible matter
 * @param {number} a0 - Milgrom's constant, same units
 * @param {string} [form] - Which interpolating function
 * @returns {number} The modified acceleration, same units
 */
export function mondAccel(gN, a0, form = DEFAULT_INTERPOLATION) {
  if (!(gN > 0) || !Number.isFinite(gN)) return 0;
  return gN * mondBoost(gN, a0, form);
}

/**
 * Turn a Newtonian circular speed into the MOND one at the same radius.
 *
 * A circular orbit has g = v^2/r either way, so the speeds are related by the
 * square root of the same boost factor:
 *
 *   v_MOND = v_N * sqrt(nu(gN/a0)),   gN = v_N^2 / r
 *
 * This is what the rotation-curve panel and the fitting widget both draw.
 *
 * @param {number} r - Radius, any length unit
 * @param {number} vNewton - Newtonian circular speed from the visible matter
 * @param {number} a0 - Milgrom's constant, in (velocity^2 / length) to match
 * @param {string} [form] - Which interpolating function
 * @returns {number} Circular speed under MOND
 */
export function mondCircularSpeed(
  r,
  vNewton,
  a0,
  form = DEFAULT_INTERPOLATION
) {
  if (!(r > 0) || !(vNewton > 0)) return 0;
  const gN = (vNewton * vNewton) / r;
  return vNewton * Math.sqrt(mondBoost(gN, a0, form));
}

/**
 * The asymptotic flat speed MOND predicts for a given baryonic mass.
 *
 *   v_flat = (G M a0)^(1/4)
 *
 * There is nothing fitted in this. Given the mass you can see and a constant
 * that is the same for every galaxy, it is a prediction of one number. It is
 * also the baryonic Tully-Fisher relation, which is observed independently of
 * any theory.
 *
 * @param {number} mass - Baryonic (visible) mass
 * @param {number} a0 - Milgrom's constant in matching units
 * @param {number} [G] - Gravitational constant in matching units
 * @returns {number} Asymptotic circular speed
 */
export function asymptoticSpeed(mass, a0, G = G_GALACTIC) {
  if (!(mass > 0) || !(a0 > 0) || !(G > 0)) return 0;
  return Math.pow(G * mass * a0, 0.25);
}

/**
 * A model galaxy's rotation curve under MOND.
 *
 * Takes the same model object the halo decomposition uses, but reads only its
 * visible components. The halo parameters are ignored on purpose: under MOND
 * there is no halo, and quietly adding one to a curve labelled MOND would be
 * the single most misleading thing this file could do.
 *
 * @param {number} r - Radius, kpc
 * @param {object} model - As galaxyCurveAt: bulgeMass, discMass, discScale
 * @param {number} [a0] - Milgrom's constant in galactic units
 * @param {number} [G] - Gravitational constant in matching units
 * @returns {{visible: number, total: number, boost: number}} Speeds at r
 */
export function mondCurveAt(r, model, a0 = A0_GALACTIC, G = G_GALACTIC) {
  const visible = galaxyCurveAt(r, { ...model, haloVFlat: 0 }, G).visible;
  const gN = r > 0 ? (visible * visible) / r : 0;
  return {
    visible,
    total: mondCircularSpeed(r, visible, a0),
    boost: mondBoost(gN, a0),
  };
}

/**
 * How well MOND matches a set of observed points, in the same terms the halo
 * decomposition is scored in.
 *
 * Deliberately the same shape as curveResidual in js/darkMatter.js, so the
 * lesson can put the two numbers beside each other and a reader can see that
 * they are the same measurement of goodness rather than two different scales.
 *
 * @param {Array<{r: number, v: number}>} observed - Measured points
 * @param {object} model - Visible components only
 * @param {number} [a0] - Milgrom's constant in galactic units
 * @param {number} [G] - Gravitational constant
 * @returns {{rms: number, worst: number, worstR: number, n: number}} Fit quality
 */
export function mondResidual(
  observed,
  model,
  a0 = A0_GALACTIC,
  G = G_GALACTIC
) {
  let sum = 0;
  let worst = 0;
  let worstR = 0;
  let n = 0;
  for (const p of observed) {
    if (!(p.r > 0) || !Number.isFinite(p.v)) continue;
    const d = mondCurveAt(p.r, model, a0, G).total - p.v;
    sum += d * d;
    if (Math.abs(d) > Math.abs(worst)) {
      worst = d;
      worstR = p.r;
    }
    n++;
  }
  return n
    ? { rms: Math.sqrt(sum / n), worst, worstR, n }
    : { rms: NaN, worst: 0, worstR: 0, n: 0 };
}

// --- Simulation units ----------------------------------------------------------
//
// The galaxy scenarios are scale models. They have to be: a real spiral is
// 10^9 times the size of the Solar System and Gravitas draws both. So a0, which
// is a physical acceleration, has to be carried into the simulation's units
// through a declared mapping, and this is the one place that happens.
//
// A scenario that wants MOND declares two numbers - how many kiloparsecs one
// length unit represents and how many solar masses one mass unit represents -
// and everything else follows from requiring Newton's law to hold in both
// systems at once:
//
//   a_phys / a_sim = G_phys * (M_sun per unit) / ( (kpc per unit)^2 * G_sim )
//
// so a0_sim = a0_galactic / that ratio.
//
// A scenario that declares no mapping gets no MOND. That is deliberate: there
// is no defensible way to apply a galactic acceleration scale to a planetary
// system or a black-hole encounter, and doing it silently would be worse than
// refusing.

/**
 * Convert a0 into the simulation's own acceleration units.
 *
 * @param {object} scale - The scenario's declared physical scale
 * @param {number} scale.kpcPerUnit - Kiloparsecs one length unit represents
 * @param {number} scale.solarMassPerUnit - Solar masses one mass unit represents
 * @param {number} G - The gravitational constant in simulation units
 * @param {number} [a0Galactic] - a0 in (km/s)^2/kpc, for tests
 * @returns {number} a0 in simulation acceleration units, or 0 when the scale is
 *   missing or unusable - which switches MOND off rather than guessing
 */
export function a0InSimUnits(scale, G, a0Galactic = A0_GALACTIC) {
  const kpc = scale?.kpcPerUnit;
  const msun = scale?.solarMassPerUnit;
  if (!(kpc > 0) || !(msun > 0) || !(G > 0)) return 0;
  const physicalPerSim = (G_GALACTIC * msun) / (kpc * kpc * G);
  if (!(physicalPerSim > 0) || !Number.isFinite(physicalPerSim)) return 0;
  return a0Galactic / physicalPerSim;
}

/**
 * The speed scale a declared galaxy mapping implies, in km/s per simulation
 * velocity unit.
 *
 * A scale model has two physical interpretations at once and they do not agree.
 * The simulation's own units are anchored on the astronomical unit and the
 * solar mass, so its formatter reads one velocity unit as about 9 km/s. The
 * galaxy mapping a scenario declares reads the same unit as about 11 km/s,
 * because it is describing a different object. Quoting a galactic quantity
 * through the first conversion would be wrong by a fifth and silently so.
 *
 * Derived from requiring Newton's law in both systems, exactly as
 * a0InSimUnits is: V^2 = G_phys * (M_sun per unit) / (G_sim * (kpc per unit)).
 *
 * @param {object} scale - The scenario's declared physical scale
 * @param {number} scale.kpcPerUnit - Kiloparsecs one length unit represents
 * @param {number} scale.solarMassPerUnit - Solar masses one mass unit is
 * @param {number} G - The gravitational constant in simulation units
 * @returns {number} km/s per simulation velocity unit, or 0 with no scale
 */
export function simSpeedToKmS(scale, G) {
  const kpc = scale?.kpcPerUnit;
  const msun = scale?.solarMassPerUnit;
  if (!(kpc > 0) || !(msun > 0) || !(G > 0)) return 0;
  return Math.sqrt((G_GALACTIC * msun) / (G * kpc));
}

/**
 * MOND applied to an acceleration vector.
 *
 * The boost is a scalar function of the field's magnitude, so the direction is
 * untouched and only the length changes. Returning the input unchanged when
 * there is nothing to do keeps the caller free of special cases.
 *
 * @param {number} ax - Newtonian acceleration, x
 * @param {number} ay - Newtonian acceleration, y
 * @param {number} a0 - Milgrom's constant in the same units
 * @param {string} [form] - Which interpolating function
 * @returns {{ax: number, ay: number, boost: number}} The modified vector
 */
export function mondVector(ax, ay, a0, form = DEFAULT_INTERPOLATION) {
  const gN = Math.hypot(ax, ay);
  if (!(gN > 0) || !(a0 > 0) || !Number.isFinite(gN)) {
    return { ax, ay, boost: 1 };
  }
  const boost = mondBoost(gN, a0, form);
  return { ax: ax * boost, ay: ay * boost, boost };
}

// --- What to say about it ------------------------------------------------------

/**
 * The honest list, quoted by the model documentation and the lesson.
 *
 * Kept here, next to the implementation, so that a change to what the code does
 * and a change to what the project claims about it happen in the same file.
 * Each entry is an i18n key; the text lives in the catalogues.
 */
export const MOND_LIMITATIONS = [
  // Rotation curves are the case MOND was built for and the case it wins. Every
  // other line here is somewhere it does not.
  'mond.limitation.clusters',
  'mond.limitation.bullet',
  'mond.limitation.cmb',
  'mond.limitation.relativistic',
  'mond.limitation.interpolation',
  'mond.limitation.external',
];
