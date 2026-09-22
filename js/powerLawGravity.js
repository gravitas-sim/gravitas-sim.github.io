// =============================================================================
// A central power law, normalized at a reference radius
// -----------------------------------------------------------------------------
// The physics for one investigation: what changes when gravity stops being
// inverse-square, and what does not. Nothing here touches the engine. The
// application's gravity is Newtonian and stays Newtonian; this module computes
// its own orbits, on its own bodies, and hands back numbers.
//
// Why the law is written the way it is
// -----------------------------------------------------------------------------
// The obvious thing to write is
//
//     a(r) = GM / r^n
//
// and it is wrong, in a way that is easy to miss and fatal to the lesson. The
// expression is not dimensionless in n: the ratio to Newton is r^(2-n), which
// depends on what one length unit means. In Gravitas's units a body at 180
// length units feels 5% less gravity at n = 2.01 than at n = 2, and the same
// law written in AU would say something else at the same place. Worse, almost
// all of that is a change of *strength*, not of *shape* - most of what it does
// to an orbit can be reproduced by changing G and leaving the inverse square
// alone, so a student who watched it would learn "gravity got weaker", which is
// not the lesson.
//
// So the law carries an explicit reference radius r0:
//
//     a_n(r) = (GM / r^2) * (r0 / r)^(n - 2)  =  GM * r0^(n-2) / r^n
//
// which has three properties worth stating out loud, because they are the
// reason the investigation means anything:
//
//   n = 2 is Newton exactly, at every radius, bit for bit.
//   At r = r0 the acceleration is Newtonian for every n. The law is pinned
//     there, so changing n changes the *shape* of the field and not its
//     overall strength.
//   Rescaling the length unit changes nothing physical, because r0 rescales
//     with r and the ratio (r0/r) is dimensionless.
//
// r0 is a physical length that the lesson states - one astronomical unit - not
// a fudge factor hidden in a constant.
//
// What this is not
// -----------------------------------------------------------------------------
// Not a theory of gravity, not a modified-gravity phenomenology, and not MOND -
// MOND is a different model, it lives in js/mond.js, and it is keyed on an
// acceleration scale rather than a radius. Not relativity. This is a controlled
// experiment in which one exponent moves and everything else is held fixed, so
// that a student can see which results were consequences of the inverse square
// and which were consequences of the force merely being central.
//
// The potential
// -----------------------------------------------------------------------------
// A central power law is conservative for every n, so energy is conserved - but
// the Newtonian potential is no longer its potential, and a diagnostic that
// reports -GM/r while integrating a_n would show a violation that is not there.
// potentialEnergyPerMass() below is the potential that actually belongs to
// acceleration(), and powerLawGravity.test.js differentiates one and compares it
// to the other rather than taking either on trust.
//
// Softening: there is none here. The engine's `min_interaction_distance` is 0 in
// DEFAULT_SETTINGS, and this module never consults it - the two-body
// integrations below use the unsoftened law, which is exactly the law the
// unsoftened potential belongs to. `closestApproach` is reported with every run
// so a caller can show that the orbit stayed far from any radius where a
// softened force would have differed.
// =============================================================================

/**
 * The reference radius, in simulation length units.
 *
 * One astronomical unit. It is the radius at which the law is Newtonian for
 * every n, so it is the anchor the whole comparison hangs on, and a lesson that
 * does not say what it is has hidden the most important number in the model.
 */
export const REFERENCE_RADIUS_SIM = 100;

/**
 * The exponents a student may choose.
 *
 * The upper limit is the interesting one. A circular orbit under r^-n is stable
 * only for n < 3: at n = 3 the effective potential has no minimum, the apsidal
 * angle 2*pi/sqrt(3-n) diverges, and a body on a very slightly perturbed
 * circular orbit spirals rather than oscillating. That is a real result and the
 * lesson names it, but it is not somewhere to leave a student wondering why the
 * simulation broke, so the slider stops short of it and the last stretch is
 * labeled.
 *
 * The lower limit is set by the same measurement being useful: below about 1.5
 * the orbits are so wide and slow that a classroom-length run measures very
 * little.
 */
export const EXPONENT_RANGE = Object.freeze({ min: 1.5, max: 2.9 });

/** Where the near-circular analytic relation stops being a fair description. */
export const STABILITY_EXPONENT = 3;

/**
 * Is this an exponent the model will accept?
 * @param {number} n - Proposed exponent
 * @returns {boolean} True when finite and inside EXPONENT_RANGE
 */
export const exponentAllowed = n =>
  typeof n === 'number' &&
  Number.isFinite(n) &&
  n >= EXPONENT_RANGE.min &&
  n <= EXPONENT_RANGE.max;

/**
 * Magnitude of the central acceleration at radius r.
 *
 * n === 2 returns the Newtonian expression itself rather than a general formula
 * that ought to agree with it, so "n = 2 is Newton" is a property of the code
 * and not of the floating-point unit.
 *
 * @param {number} r - Radius, simulation length units, > 0
 * @param {number} mu - G*M, in simulation units
 * @param {number} n - Force-law exponent
 * @param {number} [r0] - Reference radius, simulation length units
 * @returns {number} Acceleration magnitude, inward
 */
export function accelerationMagnitude(r, mu, n, r0 = REFERENCE_RADIUS_SIM) {
  if (!(r > 0) || !Number.isFinite(mu) || !Number.isFinite(n)) return NaN;
  if (n === 2) return mu / (r * r);
  return (mu * Math.pow(r0, n - 2)) / Math.pow(r, n);
}

/**
 * The acceleration as a vector at a position, with the center at the origin.
 *
 * @param {number} x - Position x
 * @param {number} y - Position y
 * @param {number} mu - G*M
 * @param {number} n - Exponent
 * @param {number} [r0] - Reference radius
 * @returns {{ax: number, ay: number}} Acceleration, pointing inward
 */
export function acceleration(x, y, mu, n, r0 = REFERENCE_RADIUS_SIM) {
  const r = Math.hypot(x, y);
  if (!(r > 0)) return { ax: NaN, ay: NaN };
  const a = accelerationMagnitude(r, mu, n, r0);
  return { ax: (-a * x) / r, ay: (-a * y) / r };
}

/**
 * Potential energy per unit mass for the law above.
 *
 * Phi(r) = -mu * r0^(n-2) / ((n-1) * r^(n-1))
 *
 * which is the integral of the inward acceleration, and reduces to the familiar
 * -mu/r at n = 2. The sign convention is the usual one: Phi is negative and
 * rises to zero at infinity for n > 1, so the radial acceleration is
 * -dPhi/dr, pointing inward.
 *
 * n = 1 is logarithmic and is outside EXPONENT_RANGE; it is handled rather than
 * returning Infinity so that a caller probing the boundary gets a number with a
 * meaning instead of a division by zero.
 *
 * @param {number} r - Radius, > 0
 * @param {number} mu - G*M
 * @param {number} n - Exponent
 * @param {number} [r0] - Reference radius
 * @returns {number} Potential energy per unit mass
 */
export function potentialEnergyPerMass(r, mu, n, r0 = REFERENCE_RADIUS_SIM) {
  if (!(r > 0) || !Number.isFinite(mu) || !Number.isFinite(n)) return NaN;
  // a_1(r) = mu/(r0 r), so Phi = (mu/r0) ln(r/r0). The 1/r0 is not decorative:
  // without it dPhi/dr is wrong by exactly that factor.
  if (n === 1) return (mu / r0) * Math.log(r / r0);
  if (n === 2) return -mu / r;
  return -(mu * Math.pow(r0, n - 2)) / ((n - 1) * Math.pow(r, n - 1));
}

/**
 * Circular speed for the ACTIVE law, not for Newton's.
 *
 * v^2 / r = a_n(r), so v = sqrt(r * a_n(r)). Initializing a comparison orbit
 * with the Newtonian sqrt(mu/r) at n != 2 would launch it off a circle, and the
 * experiment would then be measuring the bad initial condition as much as the
 * force law.
 *
 * @param {number} r - Orbital radius
 * @param {number} mu - G*M
 * @param {number} n - Exponent
 * @param {number} [r0] - Reference radius
 * @returns {number} Circular speed
 */
export function circularSpeed(r, mu, n, r0 = REFERENCE_RADIUS_SIM) {
  const a = accelerationMagnitude(r, mu, n, r0);
  return Math.sqrt(r * a);
}

/**
 * The exponent of the period-radius relation for circular orbits.
 *
 * From v = sqrt(r a_n(r)) and P = 2*pi*r/v:
 *   P = 2*pi*r / sqrt(r * mu * r0^(n-2) / r^n) = 2*pi * r^((n+1)/2) / sqrt(mu r0^(n-2))
 * so log P against log r is a straight line of slope (n+1)/2, and n = 2 gives
 * Kepler's 3/2.
 *
 * This is the discriminator worth putting in front of a student: changing G
 * moves the intercept and leaves the slope alone, so a measured slope is a
 * statement about the exponent and not about the strength.
 *
 * @param {number} n - Exponent
 * @returns {number} Expected slope of log(P) against log(r)
 */
export const expectedKeplerSlope = n => (n + 1) / 2;

/**
 * Apsidal precession per radial period, in radians, for a NEARLY CIRCULAR orbit.
 *
 * The standard small-oscillation result: a body slightly off a circular orbit
 * oscillates radially at sqrt(3-n) times its orbital frequency, so the angle
 * between successive periapses is 2*pi/sqrt(3-n) and the advance per radial
 * period is that minus a full turn.
 *
 * This is an APPROXIMATION and callers must label it as one. It is exact only
 * in the limit of zero eccentricity. Measured against RK4 integrations it holds
 * to about 0.04% at e = 0.02, about 1% at e = 0.1, and degrades quickly after
 * that - roughly 6% at e = 0.2 for n = 2.5. NEAR_CIRCULAR_DOMAIN records those
 * measurements so a caller can say where it is being trusted.
 *
 * It diverges as n approaches 3, which is the stability boundary and not a
 * numerical accident.
 *
 * @param {number} n - Exponent
 * @returns {number} Precession per radial period, radians
 */
export const apsidalPrecessionNearCircular = n =>
  n >= STABILITY_EXPONENT
    ? Infinity
    : 2 * Math.PI * (1 / Math.sqrt(STABILITY_EXPONENT - n) - 1);

/**
 * Where the relation above was measured to hold, and how well.
 *
 * Measured by integrating with RK4 at dt = 0.002 and comparing the mean
 * periapsis-to-periapsis advance against the formula. Recorded rather than
 * asserted so the lesson can state a domain instead of implying the
 * approximation is exact.
 */
export const NEAR_CIRCULAR_DOMAIN = Object.freeze([
  Object.freeze({ eccentricity: 0.02, worstRelativeError: 4e-4 }),
  Object.freeze({ eccentricity: 0.1, worstRelativeError: 1.2e-2 }),
  Object.freeze({ eccentricity: 0.2, worstRelativeError: 6.2e-2 }),
]);

/**
 * The eccentricity the investigation runs its precession orbit at.
 *
 * Large enough that the ellipse and its turning are visible on the canvas,
 * small enough that the near-circular curve drawn beside the measurement is
 * honest at the stated tolerance: at e = 0.1 the formula is within about 1% of
 * the integrated orbit across the whole allowed range of n.
 */
export const LESSON_ECCENTRICITY = 0.1;

// --- Integration --------------------------------------------------------------
//
// The lab integrates its own two-body problem rather than borrowing the
// engine's. Two reasons, and the second is the important one.
//
// The engine's default scheme is symplectic Euler, which is first order; its
// own spurious apsidal precession at a classroom timestep is small but not
// zero, and the whole point of the precession experiment is to separate a
// physical signal from a numerical one. Measuring with a fourth-order scheme
// and then *showing* the student a timestep refinement is a cleaner
// demonstration than asserting the floor is small.
//
// And gravity is not reachable through one function in this codebase. The
// Barnes-Hut worker in js/physicsWorker.js sums its own inverse square, the
// inspector readouts in js/ui.js compute their own, js/physics.js has an inline
// inverse square in sampleTwoBodyOrbit that never calls
// gravitational_acceleration at all, and there are more. A switch that changed
// some of those and not others would be a scene that was Newtonian in the
// places nobody looked, which is worse than no feature. A contained model
// cannot drift that way: everything it reports, it computed.

/**
 * One RK4 step of a two-body problem about a fixed center.
 * @param {{x:number,y:number,vx:number,vy:number}} s - State, mutated
 * @param {number} dt - Timestep
 * @param {number} mu - G*M
 * @param {number} n - Exponent
 * @param {number} r0 - Reference radius
 */
function rk4Step(s, dt, mu, n, r0) {
  const d = (x, y, vx, vy) => {
    const { ax, ay } = acceleration(x, y, mu, n, r0);
    return [vx, vy, ax, ay];
  };
  const { x, y, vx, vy } = s;
  const k1 = d(x, y, vx, vy);
  const h = dt / 2;
  const k2 = d(x + h * k1[0], y + h * k1[1], vx + h * k1[2], vy + h * k1[3]);
  const k3 = d(x + h * k2[0], y + h * k2[1], vx + h * k2[2], vy + h * k2[3]);
  const k4 = d(
    x + dt * k3[0],
    y + dt * k3[1],
    vx + dt * k3[2],
    vy + dt * k3[3]
  );
  s.x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
  s.y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  s.vx += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  s.vy += (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
}

/**
 * Start a body at periapsis on an orbit of the requested eccentricity.
 *
 * "Eccentricity" is not a closed-form element for a general power law - the
 * orbit is not an ellipse - so it is defined here operationally, as the factor
 * by which the launch speed exceeds the circular speed at that radius:
 * v = v_circ * sqrt(1 + e). At n = 2 that is exactly the Keplerian
 * eccentricity, and at other n it is a controlled way to say "this much less
 * circular", which is what the experiment needs.
 *
 * @param {number} rp - Launch radius
 * @param {number} e - Eccentricity parameter, 0 is circular
 * @param {number} mu - G*M
 * @param {number} n - Exponent
 * @param {number} [r0] - Reference radius
 * @returns {{x:number,y:number,vx:number,vy:number}} Initial state
 */
export function stateAtPeriapsis(rp, e, mu, n, r0 = REFERENCE_RADIUS_SIM) {
  return {
    x: rp,
    y: 0,
    vx: 0,
    vy: circularSpeed(rp, mu, n, r0) * Math.sqrt(1 + e),
  };
}

/**
 * Integrate one orbit and report the apsidal precession and the conserved
 * quantities.
 *
 * The precession is measured as the mean change in the direction of periapsis
 * between successive periapsis passages, which is the quantity the near-circular
 * relation predicts. A periapsis is detected as a minimum of r, refined by
 * fitting a parabola to the three samples around it so the answer is not
 * quantized by the timestep - without that refinement the measured floor at
 * n = 2 is dominated by where the samples happened to land rather than by the
 * integrator.
 *
 * Returns null for `precession` when fewer than three periapses were seen,
 * rather than inventing a mean from one interval. A caller must treat that as a
 * missing measurement and report it as one.
 *
 * @param {object} opts - Run parameters
 * @param {number} opts.n - Exponent
 * @param {number} [opts.mu] - G*M
 * @param {number} [opts.r0] - Reference radius
 * @param {number} [opts.rp] - Launch radius
 * @param {number} [opts.eccentricity] - Launch eccentricity parameter
 * @param {number} [opts.dt] - Timestep
 * @param {number} [opts.revolutions] - How many periapses to collect
 * @returns {object} Measurements, with `precession` null when unmeasurable
 */
export function runPrecession({
  n,
  mu = 1000,
  r0 = REFERENCE_RADIUS_SIM,
  rp = REFERENCE_RADIUS_SIM,
  eccentricity = LESSON_ECCENTRICITY,
  dt = 0.01,
  revolutions = 12,
} = {}) {
  const s = stateAtPeriapsis(rp, eccentricity, mu, n, r0);
  const energy0 = specificEnergy(s, mu, n, r0);
  const angular0 = specificAngularMomentum(s);

  const apses = [];
  let closestApproach = Infinity;
  let worstEnergy = 0;
  let worstAngular = 0;
  // Three-sample window for the parabolic minimum.
  let rPrev2 = NaN;
  let rPrev1 = NaN;
  let aPrev2 = NaN;
  let aPrev1 = NaN;
  const maxSteps = 8e6;

  for (let i = 0; i < maxSteps && apses.length <= revolutions; i++) {
    rk4Step(s, dt, mu, n, r0);
    const r = Math.hypot(s.x, s.y);
    const ang = Math.atan2(s.y, s.x);
    closestApproach = Math.min(closestApproach, r);
    worstEnergy = Math.max(
      worstEnergy,
      Math.abs(specificEnergy(s, mu, n, r0) - energy0) / Math.abs(energy0)
    );
    worstAngular = Math.max(
      worstAngular,
      Math.abs(specificAngularMomentum(s) - angular0) / Math.abs(angular0)
    );
    if (Number.isFinite(rPrev2) && rPrev1 < rPrev2 && rPrev1 <= r) {
      // Parabolic vertex through (-1, rPrev2), (0, rPrev1), (1, r).
      const denom = rPrev2 - 2 * rPrev1 + r;
      const frac = denom === 0 ? 0 : (0.5 * (rPrev2 - r)) / denom;
      apses.push(interpolateAngle(aPrev2, aPrev1, ang, frac));
    }
    rPrev2 = rPrev1;
    rPrev1 = r;
    aPrev2 = aPrev1;
    aPrev1 = ang;
  }

  return {
    n,
    dt,
    eccentricity,
    referenceRadius: r0,
    periapsisCount: apses.length,
    closestApproach: Number.isFinite(closestApproach) ? closestApproach : null,
    precession: meanAngularAdvance(apses),
    energyDrift: worstEnergy,
    angularDrift: worstAngular,
  };
}

/**
 * Interpolate an angle at a fractional offset between three samples.
 * @param {number} a0 - Angle one step before the middle sample
 * @param {number} a1 - Middle sample
 * @param {number} a2 - Angle one step after
 * @param {number} frac - Offset from the middle sample, in steps
 * @returns {number} Interpolated angle
 */
function interpolateAngle(a0, a1, a2, frac) {
  const step = frac < 0 ? wrapPi(a1 - a0) : wrapPi(a2 - a1);
  return a1 + step * frac;
}

/** Wrap an angle into (-pi, pi]. @param {number} a - Angle @returns {number} Wrapped */
const wrapPi = a => {
  let v = a;
  while (v > Math.PI) v -= 2 * Math.PI;
  while (v <= -Math.PI) v += 2 * Math.PI;
  return v;
};

/**
 * Mean advance between successive apsides, or null when there is no interval to
 * average. A single interval is reported; zero intervals is a missing
 * measurement and says so.
 *
 * @param {Array<number>} angles - Apsis directions in order
 * @returns {number|null} Mean advance per radial period, radians
 */
export function meanAngularAdvance(angles) {
  if (!Array.isArray(angles) || angles.length < 3) return null;
  let total = 0;
  for (let i = 1; i < angles.length; i++)
    total += wrapPi(angles[i] - angles[i - 1]);
  return total / (angles.length - 1);
}

/**
 * Specific orbital energy under the ACTIVE law.
 *
 * The potential term is potentialEnergyPerMass, not -mu/r. Reporting a
 * Newtonian potential while integrating a_n is the trap this whole module is
 * arranged to avoid: it would show energy drifting by parts in 1e5 on an orbit
 * whose energy is in fact conserved to parts in 1e8.
 *
 * @param {{x:number,y:number,vx:number,vy:number}} s - State
 * @param {number} mu - G*M
 * @param {number} n - Exponent
 * @param {number} [r0] - Reference radius
 * @returns {number} Specific energy
 */
export function specificEnergy(s, mu, n, r0 = REFERENCE_RADIUS_SIM) {
  const r = Math.hypot(s.x, s.y);
  return (
    0.5 * (s.vx * s.vx + s.vy * s.vy) + potentialEnergyPerMass(r, mu, n, r0)
  );
}

/**
 * Specific angular momentum about the center.
 * @param {{x:number,y:number,vx:number,vy:number}} s - State
 * @returns {number} z component of r x v
 */
export const specificAngularMomentum = s => s.x * s.vy - s.y * s.vx;

/**
 * Sample the orbit's path, for drawing.
 *
 * The same integration runPrecession uses, reported as points rather than as a
 * number, so the curve a reader sees and the precession they read off it come
 * from one calculation. Drawing a separate idealized ellipse beside a measured
 * angle would be two authors of one number.
 *
 * @param {object} opts - Run parameters, as runPrecession
 * @param {number} opts.n - Exponent
 * @param {number} [opts.mu] - G*M
 * @param {number} [opts.r0] - Reference radius
 * @param {number} [opts.rp] - Launch radius
 * @param {number} [opts.eccentricity] - Launch eccentricity parameter
 * @param {number} [opts.dt] - Timestep
 * @param {number} [opts.revolutions] - How many radial periods to trace
 * @returns {{points: Array<{x:number,y:number}>, maxR: number}} The path
 */
export function orbitPath({
  n,
  mu = 1000,
  r0 = REFERENCE_RADIUS_SIM,
  rp = REFERENCE_RADIUS_SIM,
  eccentricity = LESSON_ECCENTRICITY,
  dt = 0.05,
  revolutions = 4,
} = {}) {
  const s = stateAtPeriapsis(rp, eccentricity, mu, n, r0);
  const points = [{ x: s.x, y: s.y }];
  let maxR = Math.hypot(s.x, s.y);
  let apses = 0;
  let prevR = maxR;
  let prevDr = 0;
  for (let i = 0; i < 400000 && apses <= revolutions; i++) {
    rk4Step(s, dt, mu, n, r0);
    const r = Math.hypot(s.x, s.y);
    if (r > maxR) maxR = r;
    if (prevDr < 0 && r - prevR >= 0) apses++;
    prevDr = r - prevR;
    prevR = r;
    // One point every few steps: the curve is smooth and a caller drawing it
    // into a few hundred pixels cannot use forty thousand of them.
    if (i % 4 === 0) points.push({ x: s.x, y: s.y });
  }
  return { points, maxR };
}

/**
 * Measure the period-radius slope from circular orbits under the active law.
 *
 * Each orbit is launched at its own correct circular speed for this n, and its
 * period is measured by timing a full return in azimuth rather than assumed
 * from a formula, so the fitted slope is a measurement and not a restatement of
 * expectedKeplerSlope.
 *
 * @param {object} opts - Run parameters
 * @param {number} opts.n - Exponent
 * @param {number} [opts.mu] - G*M
 * @param {number} [opts.r0] - Reference radius
 * @param {Array<number>} [opts.radii] - Orbital radii to time
 * @param {number} [opts.stepsPerOrbit] - Timestep resolution
 * @returns {object} Points, fitted slope, residual and the expected slope
 */
export function runKeplerSlope({
  n,
  mu = 1000,
  r0 = REFERENCE_RADIUS_SIM,
  radii = [40, 60, 90, 135, 200, 300],
  stepsPerOrbit = 20000,
} = {}) {
  const points = [];
  for (const r of radii) {
    const v = circularSpeed(r, mu, n, r0);
    const approxPeriod = (2 * Math.PI * r) / v;
    const dt = approxPeriod / stepsPerOrbit;
    const s = { x: r, y: 0, vx: 0, vy: v };
    let turned = 0;
    let prev = 0;
    let period = null;
    for (let i = 0; i < stepsPerOrbit * 3; i++) {
      rk4Step(s, dt, mu, n, r0);
      const ang = Math.atan2(s.y, s.x);
      turned += wrapPi(ang - prev);
      prev = ang;
      if (turned >= 2 * Math.PI) {
        // Linear interpolation back to exactly one turn.
        period =
          (i + 1) * dt -
          ((turned - 2 * Math.PI) / (2 * Math.PI)) * approxPeriod;
        break;
      }
    }
    if (period !== null) points.push({ radius: r, period });
  }
  return {
    n,
    points,
    ...fitLogSlope(points),
    expected: expectedKeplerSlope(n),
  };
}

/**
 * Least-squares slope of log(period) against log(radius).
 *
 * Returns nulls rather than NaN arithmetic when there are too few points to fit,
 * so a degenerate run is a missing measurement a caller can report.
 *
 * @param {Array<{radius:number, period:number}>} points - Measured orbits
 * @returns {{slope:number|null, residual:number|null}} Fit and its worst residual
 */
export function fitLogSlope(points) {
  const usable = (points || []).filter(
    p => p && p.radius > 0 && p.period > 0 && Number.isFinite(p.period)
  );
  if (usable.length < 2) return { slope: null, residual: null };
  const xs = usable.map(p => Math.log(p.radius));
  const ys = usable.map(p => Math.log(p.period));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return { slope: null, residual: null };
  const slope = num / den;
  const intercept = my - slope * mx;
  let residual = 0;
  for (let i = 0; i < xs.length; i++) {
    residual = Math.max(
      residual,
      Math.abs(ys[i] - (slope * xs[i] + intercept))
    );
  }
  return { slope, residual };
}

/**
 * Advance a set of mutually interacting bodies under the active law.
 *
 * This is the one place the model is an N-body problem rather than a
 * two-body one, and it exists for a single purpose: to show that linear
 * momentum is still conserved. The pair terms are computed once per pair and
 * applied equally and oppositely, which is what makes momentum conservation a
 * property of the arithmetic rather than a result that has to come out right.
 * That is true for any n, and demonstrating it is the point.
 *
 * @param {Array<object>} bodies - Bodies with mass, x, y, vx, vy; mutated
 * @param {object} opts - Run parameters
 * @param {number} opts.n - Exponent
 * @param {number} [opts.g] - Gravitational constant
 * @param {number} [opts.r0] - Reference radius
 * @param {number} [opts.dt] - Timestep
 * @param {number} [opts.steps] - How many steps
 * @returns {object} Worst fractional drift in each conserved quantity
 */
export function runConservation({
  bodies,
  n,
  g = 1,
  r0 = REFERENCE_RADIUS_SIM,
  dt = 0.01,
  steps = 20000,
} = {}) {
  const bs = bodies.map(b => ({ ...b }));
  const p0 = totalMomentum(bs);
  const l0 = totalAngularMomentum(bs);
  const e0 = totalEnergy(bs, g, n, r0);
  const pScale = bs.reduce((s, b) => s + b.mass * Math.hypot(b.vx, b.vy), 0);
  let worstP = 0;
  let worstL = 0;
  let worstE = 0;
  let closest = Infinity;

  for (let step = 0; step < steps; step++) {
    const ax = new Float64Array(bs.length);
    const ay = new Float64Array(bs.length);
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const dx = bs[j].x - bs[i].x;
        const dy = bs[j].y - bs[i].y;
        const r = Math.hypot(dx, dy);
        if (!(r > 0)) continue;
        closest = Math.min(closest, r);
        // One magnitude per pair, applied to both: equal and opposite by
        // construction, for every n.
        const aUnit = accelerationMagnitude(r, g, n, r0);
        ax[i] += (aUnit * bs[j].mass * dx) / r;
        ay[i] += (aUnit * bs[j].mass * dy) / r;
        ax[j] -= (aUnit * bs[i].mass * dx) / r;
        ay[j] -= (aUnit * bs[i].mass * dy) / r;
      }
    }
    for (let i = 0; i < bs.length; i++) {
      bs[i].vx += ax[i] * dt;
      bs[i].vy += ay[i] * dt;
    }
    for (let i = 0; i < bs.length; i++) {
      bs[i].x += bs[i].vx * dt;
      bs[i].y += bs[i].vy * dt;
    }
    const p = totalMomentum(bs);
    worstP = Math.max(
      worstP,
      Math.hypot(p.x - p0.x, p.y - p0.y) / (pScale || 1)
    );
    worstL = Math.max(
      worstL,
      Math.abs(totalAngularMomentum(bs) - l0) / Math.abs(l0 || 1)
    );
    worstE = Math.max(
      worstE,
      Math.abs(totalEnergy(bs, g, n, r0) - e0) / Math.abs(e0 || 1)
    );
  }
  return {
    n,
    momentumDrift: worstP,
    angularDrift: worstL,
    energyDrift: worstE,
    closestApproach: Number.isFinite(closest) ? closest : null,
  };
}

/**
 * Total linear momentum.
 * @param {Array<object>} bs - Bodies
 * @returns {{x:number,y:number}} Momentum
 */
export const totalMomentum = bs => ({
  x: bs.reduce((s, b) => s + b.mass * b.vx, 0),
  y: bs.reduce((s, b) => s + b.mass * b.vy, 0),
});

/**
 * Total angular momentum about the origin.
 * @param {Array<object>} bs - Bodies
 * @returns {number} Angular momentum
 */
export const totalAngularMomentum = bs =>
  bs.reduce((s, b) => s + b.mass * (b.x * b.vy - b.y * b.vx), 0);

/**
 * Total energy, with the potential that belongs to the active law.
 * @param {Array<object>} bs - Bodies
 * @param {number} g - Gravitational constant
 * @param {number} n - Exponent
 * @param {number} r0 - Reference radius
 * @returns {number} Total energy
 */
export function totalEnergy(bs, g, n, r0) {
  let e = 0;
  for (const b of bs) e += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const r = Math.hypot(bs[j].x - bs[i].x, bs[j].y - bs[i].y);
      // Phi per unit mass at separation r, times the reduced pair mass product.
      e += bs[i].mass * bs[j].mass * potentialEnergyPerMass(r, g, n, r0);
    }
  }
  return e;
}
