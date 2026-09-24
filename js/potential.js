// =============================================================================
// The gravitational potential, once
// -----------------------------------------------------------------------------
// Gravitas drew the potential twice and the two disagreed.
//
// js/vectorOverlay.js evaluated the real Newtonian sum with the engine's own
// softening floor, deliberately, so that the well it painted was the well the
// bodies were moving in. js/view3d.js - the view labelled "spacetime" - invented
// one: per-type WELL_STRENGTH and WELL_FALLOFF tables, log10(1 + mass) for the
// amplitude, a Gaussian for the falloff, and a separate power-law branch for
// black holes. Under that scheme a one-solar-mass star and a one-solar-mass
// black hole produced different wells, which is not a simplification of gravity,
// it is a different claim about it. The Gaussian in particular has no tail: the
// invented well went to nothing at a few hundred units where the real one falls
// as 1/r forever.
//
// It was also slower. Measured over the 20,400-vertex sheet on a 14-body scene,
// in the browser: 18.0 ms for the invented well against 8.3 ms for the real one,
// because exp(), log10() and pow(d/6, 3.5) cost more than one hypot and one
// divide. The approximation was not buying anything.
//
// This module is the single field both views read. It is in the domain layer -
// values in, values out, no DOM and no application state - so the tests and the
// validation suite can evaluate it directly, and so neither view can quietly
// grow its own copy again. tests/onePotential.test.js fails if one does.
// =============================================================================

/**
 * Only the heaviest sources contribute.
 *
 * The field is dominated by them by construction - potential falls as 1/r and
 * scales with mass - and a scenario with six hundred asteroids would otherwise
 * cost six hundred terms per sample for a contribution below the width of one
 * color step, or one pixel of sheet depth.
 */
export const POTENTIAL_SOURCE_CAP = 24;

/**
 * The floor under the softening floor.
 *
 * The engine's own floor is 5 length units by default - js/physics.js sets
 * min_interaction_distance to 0 in DEFAULT_SETTINGS, and zero there means "no
 * scenario has an opinion, use MIN_INTERACTION_DISTANCE", not "no floor". So in
 * normal use the drawn well flattens where the force law flattens, which is the
 * point of drawing it from the real potential at all.
 *
 * This is the floor under that: a scenario may set a smaller one, and the
 * drawing still cannot evaluate 1/r at a body's own position. Far below any
 * scale a scenario uses, so it binds only at the singular point itself.
 */
export const DRAW_SOFTENING_FLOOR = 1e-6;

/**
 * The Newtonian potential at a point, from a set of point masses.
 *
 * Phi(x) = -sum G m_i / max(r_i, softening). The softening is the same floor
 * the force law uses, so the well drawn here is the well the bodies are
 * actually moving in rather than an idealization of it: a body that never
 * feels a singular force should not be drawn sitting in one.
 *
 * @param {{x: number, y: number}} at - Where to evaluate
 * @param {number} G - The gravitational constant in force
 * @param {number} softening - The softening floor, world units
 * @param {Array<{mass: number, pos: object}>} sources - The masses
 * @returns {number} The potential, simulation units, always negative
 */
export function potentialAt(at, G, softening, sources) {
  const soft = Math.max(softening, DRAW_SOFTENING_FLOOR);
  let phi = 0;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s || !Number.isFinite(s.mass)) continue;
    const r = Math.max(soft, Math.hypot(at.x - s.pos.x, at.y - s.pos.y));
    phi -= (G * s.mass) / r;
  }
  return phi;
}

/**
 * The sources a drawn field is built from: the heaviest few, alive, positive.
 * @param {Array} sources - Every candidate
 * @returns {Array} At most POTENTIAL_SOURCE_CAP of them, heaviest first
 */
export function potentialSources(sources) {
  return sources
    .filter(
      s => s && s.alive !== false && Number.isFinite(s.mass) && s.mass > 0
    )
    .sort((a, b) => b.mass - a.mass)
    .slice(0, POTENTIAL_SOURCE_CAP);
}

/**
 * How many decades deeper than a reference a given potential is.
 *
 * Both views render the field logarithmically, and for the same reason: the
 * potential spans many decades between a black hole's rim and the far edge of
 * a scene, so anything linear in phi is a black disc surrounded by nothing at
 * all. Counting decades makes the whole field visible at once.
 *
 * This is a display choice rather than physics and both views say so on their
 * own surface. What matters is that it is a monotone function of phi and only
 * of phi: two bodies of the same mass produce the same depth, which is exactly
 * what the per-type tables this replaced did not do.
 *
 * @param {number} phi - The potential here
 * @param {number} reference - The potential to measure against, the shallowest
 * @returns {number} Decades below the reference, 0 or more
 */
export function decadesBelow(phi, reference) {
  const here = Math.abs(phi);
  const ref = Math.abs(reference) || DRAW_SOFTENING_FLOOR;
  if (!(here > 0) || !Number.isFinite(here)) return 0;
  const d = Math.log10(here / ref);
  return d > 0 ? d : 0;
}

/**
 * The height of the 3-D sheet at one point.
 *
 * Negative, because a well goes down. Clamped, because the potential need not
 * be: the engine's 5-unit softening keeps phi finite in normal use, but a
 * scenario may soften less, and the drawing has to return a number either way.
 * With the default softening the clamp does not bite at all - the well bottoms
 * out at the softening radius, one to two decades down, long before the clamp's
 * six and a half. The clamp is a stated depth rather than a tuned one.
 *
 * @param {number} phi - The potential here
 * @param {number} reference - The shallowest potential on the sheet
 * @param {number} perDecade - World units of depth per decade
 * @param {number} maxDepth - The floor, in world units
 * @returns {number} Sheet height, at or below zero
 */
export function sheetDepth(phi, reference, perDecade, maxDepth) {
  const depth = decadesBelow(phi, reference) * perDecade;
  return -(depth < maxDepth ? depth : maxDepth);
}
