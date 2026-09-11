// =============================================================================
// What a black hole looks like, as numbers
// -----------------------------------------------------------------------------
// One configuration per object, from which every part of the picture is
// derived: the projected disk, which side is approaching, where the jets
// point, how foreshortened they are. The deriving is next door in
// js/blackHole/geometry.js, which only the renderer needs and which is
// therefore not in the initial download; this half is, because js/physics.js
// stamps a configuration on every black hole it builds. Before this there were three independent answers to
// "which way is this thing facing" - the disk was drawn as a circle, the jets
// used their own stored angle, and the Doppler shading assumed a viewing
// direction of its own - so a jet could point along the disk plane and the
// bright side could sit anywhere.
//
// What is physical and what is not
// -----------------------------------------------------------------------------
// The N-body engine is Newtonian and two-dimensional. It has no disk, no jet
// and no viewing angle, so every quantity in this module is a *display* choice
// with one exception: the emissivity profile's shape and the Doppler weighting
// are taken from standard relations and are marked where they are used. None of
// it feeds back into a trajectory. The functions here are pure and take no
// clock: motion comes from a time handed in, so a paused simulation draws the
// same frame every time.
//
// The simplifications, stated once
// -----------------------------------------------------------------------------
//   - The disk and the jet axis are aligned. Real systems can be misaligned;
//     nothing here models that, and no black hole is given precession.
//   - The hole is treated as non-rotating wherever a radius is quoted. A spin
//     moves the innermost stable orbit and this model does not.
//   - Inclination and position angle are properties of the *drawing*, not of
//     the 2D orbital plane the engine integrates in. A scenario may set them;
//     changing them never moves a body.
// =============================================================================

import { normalizeSeed } from '../rng.js';
import { clamp } from '../utils.js';

/**
 * What a black hole's surroundings are doing.
 *
 * Mass does not decide this. A quiescent supermassive hole is dark and a
 * feeding stellar-mass one is bright, so the environment is a property a
 * scenario sets rather than something inferred from a number.
 */
export const ENVIRONMENT = Object.freeze({
  /**
   * Nothing luminous: a silhouette against the sky, and nothing else. It once
   * carried a drawn outline so that it could be found; it is found now the way
   * every other object is, by hovering or selecting it.
   */
  QUIESCENT: 'quiescent',
  /** A disk. Jets only if the scenario asks for them. */
  ACCRETING: 'accreting',
  /** A disk and a bipolar outflow. */
  JET: 'jet',
});

/** The environments, in the order a control offers them. */
export const ENVIRONMENTS = [
  ENVIRONMENT.QUIESCENT,
  ENVIRONMENT.ACCRETING,
  ENVIRONMENT.JET,
];

/**
 * A black hole's appearance, from a few stated choices.
 *
 * @param {object} [opts] - Options
 * @param {string|number} [opts.seed] - Anything; hashed to a stable seed
 * @param {number} [opts.inclinationDeg] - 0 face-on, 90 edge-on
 * @param {number} [opts.positionAngleDeg] - Rotation of the disk on screen
 * @param {number} [opts.spin] - +1 or -1: which way the flow goes
 * @param {string} [opts.environment] - One of ENVIRONMENT
 * @param {number} [opts.jetStrength] - 0 to 1, how bright the outflow is
 * @returns {object} The configuration everything else reads
 */
export function createAppearance({
  seed = 'black-hole',
  inclinationDeg = 62,
  positionAngleDeg = 0,
  spin = 1,
  environment = ENVIRONMENT.QUIESCENT,
  jetStrength = 0.7,
} = {}) {
  return {
    seed: normalizeSeed(seed),
    inclinationDeg: clamp(inclinationDeg, 0, 90),
    positionAngleDeg: ((positionAngleDeg % 360) + 360) % 360,
    spin: spin >= 0 ? 1 : -1,
    environment: ENVIRONMENTS.includes(environment)
      ? environment
      : ENVIRONMENT.QUIESCENT,
    jetStrength: clamp(jetStrength, 0, 1),
  };
}

/** Whether this configuration draws a luminous disk. */
export const hasDisk = a =>
  a.environment === ENVIRONMENT.ACCRETING || a.environment === ENVIRONMENT.JET;

/** Whether it draws jets. */
export const hasJets = a =>
  a.environment === ENVIRONMENT.JET && a.jetStrength > 0.02;
