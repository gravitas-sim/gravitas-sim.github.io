// =============================================================================
// The circular restricted three-body problem
// -----------------------------------------------------------------------------
// Two massive bodies on a circular orbit about their common barycentre, and a
// third of negligible mass that feels them both and pulls on neither. It is
// the simplest system in which the two-body intuitions stop working, and it is
// where Lagrange points, zero-velocity curves and the whole vocabulary of
// "energetically accessible" come from.
//
// The normalisation, stated once and used everywhere
// -----------------------------------------------------------------------------
// Every quantity here is dimensionless, in the units this problem is
// conventionally written in:
//
//   length   the separation of the two massive bodies is 1
//   mass     their total mass is 1, and mu = m2 / (m1 + m2) is the only
//            parameter the problem has
//   time     chosen so the mean motion is 1, which makes G = 1 and the
//            orbital period 2*pi
//
// The frame rotates with the pair, counter-clockwise, about their barycentre,
// which sits at the origin. The heavier body is at (-mu, 0) and the lighter at
// (1 - mu, 0). So mu <= 1/2 always, x = 1 is one separation beyond the
// barycentre in the direction of the secondary, and the Earth-Moon system has
// mu = 0.0121506.
//
// The sign convention, which is the one people get wrong
// -----------------------------------------------------------------------------
// The Jacobi constant is
//
//   C = 2*Omega(x, y) - v^2      with Omega = (x^2 + y^2)/2 + (1-mu)/r1 + mu/r2
//
// where v is the speed in the ROTATING frame. Written this way C is a measure
// of how little energy the tracer has: a LARGER C means a SLOWER tracer and a
// SMALLER accessible region. That is backwards from every other energy in this
// application, and it is the convention the literature uses, so it is stated
// here, stated in the panel, and stated in the lesson rather than left for a
// reader to infer from a graph going the wrong way.
//
// Two conventions are in circulation and they differ by a constant. Many texts
// add mu*(1-mu)/2 to Omega, which makes the value at the triangular points
// exactly 3. This file does not add it, so under the definition above
//
//   C4 = C5 = 3 - mu + mu^2
//
// which is 2.98800 for the Earth-Moon system rather than 2.98785. The
// difference is only ever a constant offset applied to every C alike, so no
// comparison in this file changes - but a reader checking a number against a
// textbook will find the last four digits disagree, and that is worth knowing
// before it is discovered.
//
// A point (x, y) is accessible to a tracer of Jacobi constant C when
// 2*Omega(x, y) >= C, because v^2 = 2*Omega - C cannot be negative. The
// boundary, where the two are equal, is the zero-velocity curve.
//
// What this file will not tell you
// -----------------------------------------------------------------------------
// Accessible is not the same as reachable and neither is the same as stable,
// and conflating them is the single most common error made with these
// diagrams. Everything here answers only the first question - whether the
// energy forbids a point - and says so in its names. Whether a particular
// tracer actually goes somewhere is a question for the integrator, and whether
// it stays is a question this problem answers only for L4 and L5, and only
// then when mu is below Routh's value.
// =============================================================================

/** Routh's critical mass ratio: above it, L4 and L5 are linearly unstable. */
export const ROUTH_MU = (1 - Math.sqrt(69) / 9) / 2;

/** Names of the five equilibria, in the order lagrangePoints returns them. */
export const LAGRANGE_NAMES = Object.freeze(['L1', 'L2', 'L3', 'L4', 'L5']);

/**
 * The mass parameter, from two masses.
 *
 * Always the lighter body's share, so mu is at most one half whichever way the
 * arguments arrive.
 *
 * @param {number} m1 - One mass
 * @param {number} m2 - The other
 * @returns {?number} mu in (0, 1/2], or null if the masses are unusable
 */
export function massRatio(m1, m2) {
  if (!(m1 > 0) || !(m2 > 0)) return null;
  const total = m1 + m2;
  return Math.min(m1, m2) / total;
}

/**
 * The effective potential in the rotating frame.
 *
 * The centrifugal term plus both gravitational terms. Singular at each massive
 * body, which is physically right - the potential really is unbounded there -
 * and returns Infinity rather than NaN so that comparisons against it behave.
 *
 * @param {number} x - Rotating-frame x, in units of the separation
 * @param {number} y - Rotating-frame y
 * @param {number} mu - Mass parameter
 * @returns {number} Omega
 */
export function effectivePotential(x, y, mu) {
  const dx1 = x + mu;
  const dx2 = x - (1 - mu);
  const r1 = Math.hypot(dx1, y);
  const r2 = Math.hypot(dx2, y);
  if (r1 === 0 || r2 === 0) return Infinity;
  return (x * x + y * y) / 2 + (1 - mu) / r1 + mu / r2;
}

/**
 * The gradient of the effective potential.
 *
 * Used to find the equilibria and to check that they are equilibria, which is
 * a better test than comparing against remembered decimals.
 *
 * @param {number} x - Rotating-frame x
 * @param {number} y - Rotating-frame y
 * @param {number} mu - Mass parameter
 * @returns {{x: number, y: number}} dOmega/dx and dOmega/dy
 */
export function potentialGradient(x, y, mu) {
  const dx1 = x + mu;
  const dx2 = x - (1 - mu);
  const r1 = Math.hypot(dx1, y);
  const r2 = Math.hypot(dx2, y);
  const a = (1 - mu) / (r1 * r1 * r1);
  const b = mu / (r2 * r2 * r2);
  return {
    x: x - a * dx1 - b * dx2,
    y: y - a * y - b * y,
  };
}

/**
 * The Jacobi constant of a tracer.
 *
 * @param {{x: number, y: number, vx: number, vy: number}} state - Rotating frame
 * @param {number} mu - Mass parameter
 * @returns {?number} C, or null if the state is unusable
 */
export function jacobiConstant(state, mu) {
  if (!state) return null;
  const { x, y, vx = 0, vy = 0 } = state;
  if (![x, y, vx, vy, mu].every(Number.isFinite)) return null;
  const omega = effectivePotential(x, y, mu);
  if (!Number.isFinite(omega)) return null;
  return 2 * omega - (vx * vx + vy * vy);
}

/**
 * The speed a tracer of Jacobi constant C would have at a point.
 *
 * Null where the point is forbidden: there is no real speed there, which is
 * the whole content of a zero-velocity curve.
 *
 * @param {number} x - Rotating-frame x
 * @param {number} y - Rotating-frame y
 * @param {number} mu - Mass parameter
 * @param {number} C - Jacobi constant
 * @returns {?number} Speed in the rotating frame, or null if forbidden
 */
export function speedAt(x, y, mu, C) {
  const v2 = 2 * effectivePotential(x, y, mu) - C;
  return v2 >= 0 ? Math.sqrt(v2) : null;
}

/**
 * Whether the energy alone permits a tracer to be at a point.
 *
 * Deliberately named for what it means. A point can be accessible and never
 * visited: the zero-velocity curve is a wall, not a map, and it says only
 * where the tracer cannot go.
 *
 * @param {number} x - Rotating-frame x
 * @param {number} y - Rotating-frame y
 * @param {number} mu - Mass parameter
 * @param {number} C - Jacobi constant
 * @returns {boolean} Whether 2*Omega >= C
 */
export const energeticallyAccessible = (x, y, mu, C) =>
  2 * effectivePotential(x, y, mu) >= C;

/**
 * The collinear equilibrium positions, by Newton's method on dOmega/dx.
 *
 * The three roots lie in three disjoint intervals - between the bodies, beyond
 * the secondary, and beyond the primary - so each is bracketed before it is
 * refined and the iteration cannot wander into the wrong one.
 *
 * @param {number} mu - Mass parameter
 * @returns {{L1: number, L2: number, L3: number}} Their x coordinates
 */
export function collinearPoints(mu) {
  const dOmega = x => potentialGradient(x, 0, mu).x;

  // Bisection, then Newton. Bisection alone converges too slowly to reach
  // machine precision in a sensible number of steps; Newton alone can leave
  // the bracket near the singularities at the two bodies.
  const solve = (lo, hi) => {
    let a = lo;
    let b = hi;
    let fa = dOmega(a);
    for (let i = 0; i < 200; i++) {
      const m = (a + b) / 2;
      const fm = dOmega(m);
      if (fm === 0) return m;
      if (fa * fm < 0) b = m;
      else {
        a = m;
        fa = fm;
      }
    }
    return (a + b) / 2;
  };

  // The singularities are at -mu and 1-mu; the brackets stop just short.
  const eps = 1e-12;
  return {
    L1: solve(-mu + eps, 1 - mu - eps),
    L2: solve(1 - mu + eps, 2),
    L3: solve(-2, -mu - eps),
  };
}

/**
 * All five equilibria, with the Jacobi constant at each.
 *
 * L4 and L5 are exact: each forms an equilateral triangle with the two massive
 * bodies, which is a theorem rather than a numerical result, so they are
 * written down rather than solved for.
 *
 * @param {number} mu - Mass parameter
 * @returns {?Array<object>} The five points, or null for an unusable mu
 */
export function lagrangePoints(mu) {
  if (!(mu > 0) || !(mu <= 0.5)) return null;
  const { L1, L2, L3 } = collinearPoints(mu);
  const triangular = Math.sqrt(3) / 2;

  return [
    { name: 'L1', x: L1, y: 0 },
    { name: 'L2', x: L2, y: 0 },
    { name: 'L3', x: L3, y: 0 },
    { name: 'L4', x: 0.5 - mu, y: triangular },
    { name: 'L5', x: 0.5 - mu, y: -triangular },
  ].map(p => ({
    ...p,
    // The Jacobi constant of a tracer sitting still at that point, which is
    // the value at which the zero-velocity curve passes through it.
    C: 2 * effectivePotential(p.x, p.y, mu),
    // L4 and L5 are linearly stable below Routh's ratio; the collinear three
    // never are. Reported as a property of the point rather than inferred from
    // the diagram, because nothing about a zero-velocity curve implies it.
    linearlyStable: (p.name === 'L4' || p.name === 'L5') && mu < ROUTH_MU,
  }));
}

/** What the zero-velocity curves permit at a given Jacobi constant. */
export const REGIME = Object.freeze({
  /** C above C1: the tracer is locked into one body's region, or outside. */
  SEPARATED: 'separated',
  /** Below C1, above C2: the neck at L1 is open between the two bodies. */
  L1_OPEN: 'l1Open',
  /** Below C2, above C3: L2 has opened, so the exterior is reachable. */
  L2_OPEN: 'l2Open',
  /** Below C3, above C4: only two small forbidden islands around L4 and L5. */
  L3_OPEN: 'l3Open',
  /** Below C4: nothing is forbidden anywhere. */
  UNRESTRICTED: 'unrestricted',
});

/**
 * Which necks are open at a given Jacobi constant.
 *
 * Named for the energy question and nothing else. "L1 is open" means the
 * forbidden region no longer separates the two bodies - it does not mean the
 * tracer will cross, and it does not mean anything at all about stability.
 *
 * @param {number} C - Jacobi constant
 * @param {number} mu - Mass parameter
 * @returns {?object} The regime and the thresholds it was decided against
 */
export function regimeFor(C, mu) {
  const points = lagrangePoints(mu);
  if (!points || !Number.isFinite(C)) return null;
  const byName = Object.fromEntries(points.map(p => [p.name, p.C]));

  let regime = REGIME.UNRESTRICTED;
  if (C > byName.L1) regime = REGIME.SEPARATED;
  else if (C > byName.L2) regime = REGIME.L1_OPEN;
  else if (C > byName.L3) regime = REGIME.L2_OPEN;
  else if (C > byName.L4) regime = REGIME.L3_OPEN;

  return {
    regime,
    C,
    thresholds: byName,
    // Each stated separately, because a reader wants to know about one neck.
    l1Open: C <= byName.L1,
    l2Open: C <= byName.L2,
    l3Open: C <= byName.L3,
    // How far the tracer is from opening the next gate, which is the number
    // that says whether a small change would matter.
    toL1: byName.L1 - C,
    toL2: byName.L2 - C,
  };
}

/**
 * Sample 2*Omega over a grid, for drawing the forbidden region.
 *
 * Returns the field rather than a mask, so a caller can redraw at a new Jacobi
 * constant - which changes every frame as the tracer moves - without
 * recomputing the potential, which does not change at all unless mu does. That
 * split is what keeps the overlay off the frame budget: the expensive half is
 * cached against mu and the bounds, and the per-frame half is one comparison
 * per pixel.
 *
 * @param {object} spec - mu, bounds {minX, maxX, minY, maxY}, width, height
 * @returns {?{field: Float64Array, width: number, height: number, bounds: object}}
 */
export function potentialField({ mu, bounds, width, height }) {
  if (!(mu > 0) || !bounds || !(width > 0) || !(height > 0)) return null;
  const { minX, maxX, minY, maxY } = bounds;
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return null;
  if (!(maxX > minX) || !(maxY > minY)) return null;

  const field = new Float64Array(width * height);
  const dx = (maxX - minX) / (width - 1 || 1);
  const dy = (maxY - minY) / (height - 1 || 1);
  for (let j = 0; j < height; j++) {
    const y = minY + j * dy;
    const row = j * width;
    for (let i = 0; i < width; i++) {
      field[row + i] = 2 * effectivePotential(minX + i * dx, y, mu);
    }
  }
  return { field, width, height, bounds: { minX, maxX, minY, maxY }, mu };
}

/** Why the restricted circular assumptions do not hold. */
export const VIOLATION = Object.freeze({
  BODY_COUNT: 'bodyCount',
  ECCENTRIC: 'eccentric',
  TRACER_TOO_HEAVY: 'tracerTooHeavy',
  THIRD_MASS: 'thirdMass',
  NO_TRACER: 'noTracer',
});

/**
 * How eccentric the pair may be before "circular" is a lie.
 *
 * At e = 0.01 the separation varies by two per cent over an orbit, which moves
 * the Lagrange points by about the width of the line they are drawn with. Past
 * that the whole picture is breathing and a static zero-velocity curve is a
 * drawing of a system that does not exist.
 */
export const MAX_ECCENTRICITY = 0.01;

/**
 * How heavy the tracer may be before "restricted" is a lie.
 *
 * The restricted problem assumes the third body pulls on nothing. At 1e-6 of
 * the pair its effect on their orbit is smaller than the eccentricity
 * tolerance above; much heavier and the two massive bodies are being moved by
 * the thing whose motion is being predicted from them.
 */
export const MAX_TRACER_FRACTION = 1e-6;

/**
 * Whether the claims this module makes are true of a given system.
 *
 * The point of this function is that the answer is usually no. A reader who
 * loads the teaching scenario gets a valid picture; a reader who then adds a
 * planet, or drags one of the two bodies, does not - and the overlay has to
 * stop claiming rather than keep drawing a diagram of a different system.
 *
 * @param {object} system - massive[], tracer, eccentricity
 * @returns {{ok: boolean, violations: Array<string>, mu: ?number}} The verdict
 */
export function assumptionsHold({ massive = [], tracer = null, eccentricity }) {
  const violations = [];
  if (massive.length !== 2) violations.push(VIOLATION.BODY_COUNT);
  if (!tracer) violations.push(VIOLATION.NO_TRACER);

  const mu =
    massive.length === 2 ? massRatio(massive[0].mass, massive[1].mass) : null;

  if (Number.isFinite(eccentricity) && eccentricity > MAX_ECCENTRICITY) {
    violations.push(VIOLATION.ECCENTRIC);
  }
  if (massive.length === 2 && tracer) {
    const total = massive[0].mass + massive[1].mass;
    if (total > 0 && (tracer.mass || 0) / total > MAX_TRACER_FRACTION) {
      violations.push(VIOLATION.TRACER_TOO_HEAVY);
    }
  }
  return { ok: violations.length === 0, violations, mu };
}
