// =============================================================================
// Two tracers, one accessible region
// -----------------------------------------------------------------------------
// The one thing the zero-velocity diagram is reliably misread as saying is that
// an open neck is a route. It is not: it is a gap in a wall. The lesson has
// always said so in words and then asked the student to push the tracer around
// until they believed it, which is a demonstration rather than an experiment -
// two students pushing differently get two different pictures and no shared
// evidence.
//
// This is the controlled version. Same restricted three-body system, same
// tracer, same place, same speed in the rotating frame, same Jacobi constant,
// same open neck - and two different directions. Everything that decides where
// the tracer is ALLOWED to go is identical between the two arms by
// construction, so whatever the two paths do differently is a fact about
// trajectories and not about accessibility.
//
// Why the speed and the two directions are what they are
// -----------------------------------------------------------------------------
// The speed puts C between C(L1) and C(L2), which is the only band where the
// lesson's claim is sharp: the neck between the stars is open and the exterior
// is still walled off, so "it could have gone through and did not" is a
// statement about one specific gap. At the laboratory's mass ratio that band is
// 0.539 to 0.574 in normalised rotating-frame speed, and 0.565 sits inside it
// with room at both ends for the round trip through the world's own units.
//
// The directions were chosen by integrating, not by taste, and they are checked
// here rather than trusted: 30 degrees crosses the neck about a tenth of a
// period in and comes back; 130 degrees never gets closer to L1 than 0.17 in
// two periods. Both stay clear of both stars - the nearest approach is 0.19 of
// the separation, which is 1.5 AU in the laboratory - so neither arm is a
// near-collision dressed up as a trajectory.
//
// What this deliberately does not do
// -----------------------------------------------------------------------------
// It says nothing about stability. That is the lesson's third question and it
// has its own screens; a pair of runs over two binary periods cannot speak to
// it, and this module has no vocabulary for it on purpose.
// =============================================================================

import { jacobiConstant, lagrangePoints, regimeFor } from '../cr3bp.js';

/** The laboratory this activity belongs to, and the state it starts from. */
export const BASELINE = Object.freeze({
  scenario: 'Lagrange Point Lab',
  seed: 'lagrange',
  /** Where the tracer is put, in rotating-frame units of the separation. */
  position: Object.freeze({ x: 0.6, y: 0 }),
  /**
   * How fast, in the same normalised units.
   *
   * Between C(L1) and C(L2) at this mass ratio, so the neck between the stars
   * is open and the way out is not. Checked by neckIsOpen() rather than
   * assumed, because the mass ratio is a laboratory variable a reader can
   * change.
   */
  speed: 0.565,
  /** How long to watch, in binary periods. The same for both arms. */
  periods: 2,
});

/**
 * The two directions, in degrees, measured in the rotating frame.
 *
 * Same speed, same starting point, same everything else. The only difference
 * between arm A and arm B in this whole activity is this number.
 */
export const DIRECTIONS = Object.freeze({ a: 30, b: 130 });

/**
 * How closely the two arms' Jacobi constants have to agree.
 *
 * They are equal exactly in arithmetic - C is 2*Omega(x, y) minus the square
 * of the speed, and neither term knows the direction - so this is a tolerance
 * on the round trip through the world: a rotating-frame velocity is turned
 * into a world velocity, assigned to a body, and read back. A part in a
 * million is far tighter than anything that would change the picture and far
 * looser than the round trip's own error.
 */
export const C_TOLERANCE = 1e-6;

/**
 * A rotating-frame velocity of the given speed and direction.
 *
 * @param {number} deg - Direction, degrees counter-clockwise from +x
 * @param {number} [speed] - Rotating-frame speed, normalised
 * @returns {{vx: number, vy: number}} The velocity
 */
export function velocityFor(deg, speed = BASELINE.speed) {
  const a = (deg * Math.PI) / 180;
  return { vx: speed * Math.cos(a), vy: speed * Math.sin(a) };
}

/**
 * The initial conditions of one arm, as the panel reports them.
 *
 * Everything a reader needs to check that the two arms differ in one thing:
 * where the tracer is, how fast it is going, which way, what that makes C, and
 * which necks that opens.
 *
 * @param {object} state - From cr3bpPanel.tracerState()
 * @param {number} mu - Mass parameter
 * @param {number} deg - The direction asked for, for the record
 * @returns {?object} The conditions
 */
export function initialConditions(state, mu, deg) {
  if (!state || !Number.isFinite(mu)) return null;
  const C = jacobiConstant(state, mu);
  const regime = regimeFor(C, mu);
  return {
    direction: deg,
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
    speed: Math.hypot(state.vx, state.vy),
    // The direction the tracer actually has, which is not quite the one asked
    // for once the velocity has been through the world and back. Reported
    // rather than assumed, for the same reason the speed is.
    appliedDirection: (Math.atan2(state.vy, state.vx) * 180) / Math.PI,
    C,
    regime: regime?.regime ?? null,
    l1Open: Boolean(regime?.l1Open),
    l2Open: Boolean(regime?.l2Open),
    thresholds: regime?.thresholds ?? null,
  };
}

/**
 * Whether the two arms really do have the same accessible region.
 *
 * The premise of the whole activity, and it is checked rather than asserted:
 * if this fails, the two paths differ for a reason the activity was built to
 * exclude, and the panel says so instead of drawing a conclusion.
 *
 * @param {object} a - initialConditions() of arm A
 * @param {object} b - initialConditions() of arm B
 * @param {number} [tolerance] - Allowed difference in C
 * @returns {object} Whether they match, and by how much they miss
 */
export function sameAccessibleRegion(a, b, tolerance = C_TOLERANCE) {
  if (!a || !b) {
    return { ok: false, reason: 'missingArm', difference: null, tolerance };
  }
  const difference = Math.abs(a.C - b.C);
  const scale = Math.max(Math.abs(a.C), Math.abs(b.C), 1);
  const relative = difference / scale;
  if (relative > tolerance) {
    return {
      ok: false,
      reason: 'constantsDiffer',
      difference,
      relative,
      tolerance,
    };
  }
  if (!a.l1Open || !b.l1Open) {
    return { ok: false, reason: 'neckClosed', difference, relative, tolerance };
  }
  // Both open would be a different activity: with the exterior reachable too,
  // "it did not use the L1 neck" stops being a statement about one gap.
  if (a.l2Open || b.l2Open) {
    return {
      ok: false,
      reason: 'exteriorOpen',
      difference,
      relative,
      tolerance,
    };
  }
  return { ok: true, reason: null, difference, relative, tolerance };
}

/**
 * What one arm's path did, in the rotating frame.
 *
 * Reduced from samples the panel took while the run was recording, each one a
 * rotating-frame position and the simulated time it was taken at. The frame is
 * the same one the overlay draws in, which is the point: a reader comparing
 * the two paths on screen is comparing the same coordinates these numbers are
 * quoted in.
 *
 * @param {Array<{t: number, x: number, y: number}>} samples - The path
 * @param {number} mu - Mass parameter, for L1's position
 * @param {object} [opts] - `asked`, the simulated span the arm was asked for
 * @returns {object} What happened, and how completely it was watched
 */
export function describePath(samples, mu, opts = {}) {
  const path = (samples || []).filter(
    p => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.t)
  );
  const l1 = lagrangePoints(mu)?.find(p => p.name === 'L1') ?? null;
  const base = {
    samples: path.length,
    span: path.length > 1 ? path[path.length - 1].t - path[0].t : 0,
    asked: Number.isFinite(opts.asked) ? opts.asked : null,
    l1x: l1?.x ?? null,
    crossed: false,
    firstCrossing: null,
    timeBeyond: 0,
    closestToL1: null,
    xRange: null,
    yRange: null,
  };
  if (!path.length || !l1) return { ...base, complete: false };

  let closest = Infinity;
  let beyond = 0;
  let first = null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const t0 = path[0].t;
  for (const [i, p] of path.entries()) {
    const d = Math.hypot(p.x - l1.x, p.y);
    if (d < closest) closest = d;
    if (p.x > l1.x) {
      if (first === null) first = p.t - t0;
      // Trapezoidal in time, so a coarse sampler does not turn a long
      // excursion into a short one by missing its middle.
      if (i > 0) beyond += p.t - path[i - 1].t;
    }
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return {
    ...base,
    crossed: first !== null,
    firstCrossing: first,
    timeBeyond: beyond,
    closestToL1: closest,
    xRange: [minX, maxX],
    yRange: [minY, maxY],
    // Whether the arm was watched for as long as it was asked to be. An arm
    // that was cut short cannot support "it did not cross", and the panel says
    // which of the two it is looking at.
    complete: base.asked === null ? true : base.span >= base.asked * 0.98,
  };
}

/**
 * The comparison, and the sentence it does and does not support.
 *
 * @param {object} a - {conditions, path} for arm A
 * @param {object} b - The same for arm B
 * @returns {?object} The verdict, or null if either arm is missing
 */
export function comparePaths(a, b) {
  if (!a?.conditions || !b?.conditions) return null;
  const region = sameAccessibleRegion(a.conditions, b.conditions);
  const pathsDiffer =
    a.path && b.path
      ? a.path.crossed !== b.path.crossed ||
        Math.abs((a.path.closestToL1 ?? 0) - (b.path.closestToL1 ?? 0)) > 0.02
      : false;
  return {
    region,
    // The two speeds, to show they really are the same magnitude.
    speedA: a.conditions.speed,
    speedB: b.conditions.speed,
    speedMismatch:
      Math.abs(a.conditions.speed - b.conditions.speed) /
      Math.max(a.conditions.speed, 1e-12),
    crossedA: Boolean(a.path?.crossed),
    crossedB: Boolean(b.path?.crossed),
    pathsDiffer,
    /**
     * Whether both arms were watched for the whole window.
     *
     * The one thing that turns "did not cross during this run" into something
     * weaker still. An arm that stopped early did not fail to cross; it was
     * not watched long enough to say.
     */
    bothComplete: Boolean(a.path?.complete && b.path?.complete),
    /**
     * The claim the activity supports, named so nothing else can be read off
     * it. Never "cannot cross": the window is finite, and a trajectory that
     * has not used a gap in two periods may use it in the third.
     */
    conclusion: !region.ok
      ? 'notControlled'
      : !(a.path?.complete && b.path?.complete)
        ? 'windowIncomplete'
        : pathsDiffer
          ? 'sameRegionDifferentPaths'
          : 'sameRegionSimilarPaths',
  };
}

/**
 * The observation window in simulated time, from the pair the tracer orbits.
 *
 * @param {object} system - From cr3bpPanel.readSystem()
 * @param {number} G - The gravitational constant in force
 * @param {number} [periods] - How many binary periods
 * @returns {?number} Simulated time units, or null if the pair is not there
 */
export function windowFor(system, G, periods = BASELINE.periods) {
  if (!system?.primary || !system?.secondary || !(system.separation > 0)) {
    return null;
  }
  const n = Math.sqrt(
    (G * (system.primary.mass + system.secondary.mass)) / system.separation ** 3
  );
  if (!(n > 0)) return null;
  return (periods * 2 * Math.PI) / n;
}
