// =============================================================================
// What that configuration implies
// -----------------------------------------------------------------------------
// The projection, the flow's speeds, the beaming weights and the radial
// brightness: everything derived from an appearance rather than stated in one.
// It is split from js/blackHole/appearance.js because of who needs which half.
// The application always needs the configuration - js/physics.js stamps one on
// every black hole it builds and js/ui.js offers the environments in a control
// - but only the renderer, which is loaded on demand the first time a black
// hole is drawn, needs any of this. Kept together they were one module in the
// initial download; apart, this half is only fetched by a reader who looks at
// a black hole.
//
// The same statements about what is physical hold here as there: the engine is
// Newtonian and two-dimensional and has no disk, no jet and no viewing angle,
// so all of this is display. The two places it takes a shape from the physics
// rather than inventing one - the thin-disk emissivity profile and the
// line-of-sight component of circular motion - say so where they are defined.
// Every function is pure and none reads a clock.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';
import { clamp } from '../utils.js';

/**
 * The disk's inner edge, in units of the gravitational radius GM/c².
 *
 * Six for a non-rotating hole: the innermost stable circular orbit of the
 * Schwarzschild metric, which is 3 Schwarzschild radii. Quoted because the
 * emissivity profile below is anchored to it, and stated as the non-rotating
 * case because a spinning hole's is smaller - down to 1 for a maximal
 * co-rotating disk - and nothing here models spin.
 */
export const ISCO_GRAVITATIONAL_RADII = 6;

/** The outer edge of what is drawn, in the same units. Purely a display bound. */
export const DISK_OUTER_GRAVITATIONAL_RADII = 60;

/**
 * The projected geometry: one answer, which the disk and the jets both use.
 *
 * The disk is a circle in its own plane, seen at `inclinationDeg` and turned on
 * screen by `positionAngleDeg`. Its projection is an ellipse whose minor axis
 * is the major axis times cos i, and the jet axis is the disk's normal, which
 * projects along that same minor axis and foreshortens as sin i. Face-on the
 * disk is a circle and the jets point at the viewer, so they shorten to
 * nothing; edge-on the disk is a line and the jets are at their longest.
 *
 * @param {object} a - An appearance
 * @returns {object} Unit vectors and factors in screen space
 */
export function projection(a) {
  const i = (a.inclinationDeg * Math.PI) / 180;
  const pa = (a.positionAngleDeg * Math.PI) / 180;
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  return {
    cosI,
    sinI,
    /** The disk's major axis on screen: the line of nodes. */
    major: { x: Math.cos(pa), y: Math.sin(pa) },
    /** Perpendicular to it, along which the disk is squashed by cos i. */
    minor: { x: -Math.sin(pa), y: Math.cos(pa) },
    /** How much the disk is squashed. 1 face-on, 0 edge-on. */
    flatten: cosI,
    /**
     * The jet axis on screen, as a direction and a length factor. The
     * direction is the projected disk normal; the factor is how much of the
     * jet's true length survives projection.
     */
    jet: { x: -Math.sin(pa), y: Math.cos(pa) },
    jetForeshortening: sinI,
    /**
     * Which of the two jets is tilted towards the viewer. Positive means the
     * one drawn along +jet is the near one, which is what makes it the
     * brighter of the pair.
     */
    nearJetSign: 1,
  };
}

/**
 * A point on the disk, projected.
 *
 * @param {object} a - An appearance
 * @param {number} radius - Distance from the centre, in screen units
 * @param {number} phi - Azimuth in the disk's own plane, radians
 * @returns {{x: number, y: number, depth: number}} Offset from the centre in
 *   screen units, plus how far towards the viewer the point sits: +1 is the
 *   near edge, -1 the far edge, and it is what depth ordering sorts on.
 */
export function diskPoint(a, radius, phi) {
  const p = projection(a);
  const cx = Math.cos(phi) * radius;
  const cy = Math.sin(phi) * radius;
  return {
    x: p.major.x * cx + p.minor.x * cy * p.flatten,
    y: p.major.y * cx + p.minor.y * cy * p.flatten,
    // sin(phi) is the out-of-plane direction once the disk is tilted, and
    // sin i is how much of it points at the viewer.
    depth: Math.sin(phi) * p.sinI,
  };
}

/**
 * Orbital speed at a radius, as a fraction of the innermost speed.
 *
 * Keplerian: v goes as one over the square root of the radius. This is the
 * shape of a real disk's rotation curve and it is why the inner flow visibly
 * outruns the outer flow. It is not a claim about the absolute speed of
 * anything - see `dopplerWeight` for what is and is not asserted there.
 *
 * @param {number} radius - Distance from the centre
 * @param {number} inner - The inner edge
 * @returns {number} A relative speed, 1 at the inner edge
 */
export const relativeOrbitalSpeed = (radius, inner) =>
  radius > 0 ? Math.sqrt(inner / radius) : 1;

/**
 * How much brighter the approaching side is drawn.
 *
 * **A bounded qualitative model, not a measured Doppler factor.** A real
 * calculation needs a line-of-sight velocity in units of c, and this engine
 * has no such number: its speeds are in sandbox units chosen so that orbits
 * are watchable. What is honest, and what this does, is take the *shape* of
 * the effect from the physics and bound its size by a display constant:
 *
 *   - The line-of-sight component of the flow is `cos(phi) * sin(i)`, which is
 *     exact for circular motion in a plane inclined by i.
 *   - Beaming makes the approaching side brighter than the receding side by a
 *     factor that grows with speed, so the weighting is scaled by the local
 *     orbital speed, which falls outwards.
 *   - The result is clamped, so no part of the disk can be driven to zero or
 *     blown out however extreme the geometry.
 *
 * Reversing the spin reverses the bright side. A face-on disk has sin i = 0 and
 * so no asymmetry at all. Turning the position angle turns the asymmetry with
 * the disk, because phi is measured in the disk's own frame.
 *
 * @param {object} a - An appearance
 * @param {number} phi - Azimuth in the disk's plane
 * @param {number} speed - Relative orbital speed there, from
 *   relativeOrbitalSpeed
 * @param {number} [strength] - The display constant: how strong the effect is
 *   allowed to get at the inner edge of an edge-on disk
 * @returns {number} A multiplier, bounded to [0.35, 2.2]
 */
export function dopplerWeight(a, phi, speed, strength = 0.55) {
  const along = Math.cos(phi) * a.spin;
  return clamp(1 + along * beamingSpread(a, speed, strength), 0.35, 2.2);
}

/**
 * How far the weighting swings either side of 1, at one radius.
 *
 * The same quantity `dopplerWeight` is built from, named and exported because
 * the renderer needs the two factors apart: the swing depends only on the
 * radius (through the orbital speed) and the inclination, and the azimuth
 * enters only as cos(phi) times the spin. Splitting it that way is what lets
 * the drawing put the radial part in a gradient - which is where the fade to
 * nothing at the outer edge lives - and the azimuthal part in an opacity, so
 * the brightening cannot outlive the light it is brightening.
 *
 * Bounded to 0.6 so that 1 +/- the swing stays inside `dopplerWeight`'s own
 * limits and neither side of the disk can be driven dark or blown out.
 *
 * @param {object} a - An appearance
 * @param {number} speed - Relative orbital speed, from relativeOrbitalSpeed
 * @param {number} [strength] - The display constant
 * @returns {number} 0 to 0.6; zero for a face-on disk, which has no asymmetry
 */
export function beamingSpread(a, speed, strength = 0.55) {
  return clamp(projection(a).sinI * speed * strength, 0, 0.6);
}

/**
 * The disk's radial brightness, as a fraction of its peak.
 *
 * Thin-disk-inspired and stated as such. The Shakura-Sunyaev result for a
 * steady thin disk around a non-rotating hole has the dissipation per unit
 * area go as r^-3 times a factor that vanishes at the inner edge, so the
 * emission does *not* peak at the inner boundary and does not diverge at the
 * horizon: it rises from zero just outside the inner edge, peaks a little way
 * out, and falls steeply. That shape is what this reproduces. The absolute
 * scale is a display choice and the colours are illustrative.
 *
 * @param {number} radius - Distance from the centre
 * @param {number} inner - The inner edge
 * @param {number} outer - Where the drawing stops
 * @returns {number} 0 to 1
 */
export function emissivity(radius, inner, outer) {
  if (!(radius > inner) || !(outer > inner)) return 0;
  const x = radius / inner;
  // The bracket is the no-torque inner boundary condition; it is what makes
  // the profile go to zero at the inner edge rather than to infinity.
  const raw = (1 - Math.sqrt(1 / x)) / (x * x * x);
  // Its maximum is at x = (7/6)^2, which is where the peak sits. At that x,
  // sqrt(1/x) is 6/7 exactly - taking a square root of 6/7 here was a second
  // root of a quantity that was already one, which made the normalisation
  // about half what it should be and clamped the whole inner disk flat.
  const peak = (1 - 6 / 7) / (49 / 36) ** 3;
  const shape = clamp(raw / peak, 0, 1);
  // A tapered outer edge, so the disk fades out rather than being cut off.
  const t = clamp((outer - radius) / (outer * 0.35), 0, 1);
  return shape * (t * t * (3 - 2 * t));
}

/**
 * How bright each of the two jets is drawn.
 *
 * **A bounded illustration of relativistic beaming, not a computed one.** The
 * physical statement is real: an outflow moving towards the viewer is brighter
 * than the one moving away, and the asymmetry grows as the jet aligns with the
 * line of sight. What is not real is any speed - nothing here knows the jet's
 * Lorentz factor, so the contrast is a display constant bounded by the values
 * below. The two jets are deliberately not equal at every inclination.
 *
 * Face-on, one jet points at the viewer and the other away, so the contrast is
 * at its greatest. Edge-on, both lie in the plane of the sky and they match.
 *
 * @param {object} a - An appearance
 * @returns {{near: number, far: number}} Multipliers, each bounded to [0.15, 1]
 */
export function jetBeaming(a) {
  const p = projection(a);
  // cos i is how much of the jet axis points at the viewer.
  const alongLineOfSight = p.cosI;
  const near = clamp(0.55 + 0.45 * alongLineOfSight, 0.15, 1);
  const far = clamp(0.55 - 0.45 * alongLineOfSight, 0.15, 1);
  return { near, far };
}

/**
 * A deterministic generator for this object's decorative variation.
 *
 * Keyed on the appearance's seed and a channel name, so the streaks on the
 * disk are in the same places on every run and on every machine, and asking
 * for the jet's knots does not shift the disk's streaks. Nothing here touches
 * the global generator, which is what the simulation's own reproducibility
 * depends on.
 *
 * @param {object} a - An appearance
 * @param {string} channel - What the numbers are for
 * @returns {Function} A generator
 */
export const variation = (a, channel) =>
  mulberry32(normalizeSeed(`${a.seed}:${channel}`));

/**
 * Where a feature sits after `time` seconds of rotation.
 *
 * Time is handed in - the lab clock or the simulation clock - so a paused
 * simulation redraws the same frame, and two machines at the same time draw
 * the same picture. Nothing in this module reads a wall clock.
 *
 * @param {object} a - An appearance
 * @param {number} phi0 - Where it started
 * @param {number} radius - Its radius
 * @param {number} inner - The disk's inner edge
 * @param {number} time - Seconds
 * @param {number} [rate] - Radians per second at the inner edge
 * @returns {number} An azimuth
 */
export const advanceAzimuth = (a, phi0, radius, inner, time, rate = 0.9) =>
  phi0 + a.spin * rate * relativeOrbitalSpeed(radius, inner) * time;
