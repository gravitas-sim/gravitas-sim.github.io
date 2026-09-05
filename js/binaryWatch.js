// =============================================================================
// Watching a planet in a binary, and writing down what happened
// -----------------------------------------------------------------------------
// This module does the recording. js/binaryStability.js does the judging, and
// keeping the two apart is what lets the judgement be tested against known
// configurations without a simulation attached.
//
// Everything is measured on integration steps rather than on frames. A run here
// takes about a hundred thousand steps over half a minute, so a frame-sampled
// watcher would see roughly one state in fifty and would miss - specifically -
// the close approaches, which are exactly the moments that decide the outcome
// and are also the fastest. A grazing pass that lasts three steps is invisible
// to a frame sampler and is the entire story of the run.
//
// The other thing that only step sampling can do is report how the run was
// actually integrated. render.js decides the substep size from the frame time,
// so a machine that stutters silently integrates at a coarser step than the
// scenario asked for. Since the whole point of this investigation is telling a
// physical result from a numerical one, that cannot be left unsaid: the watcher
// records the steps it was given and the diagnostics show them.
//
// Cheap on purpose. Three bodies means three pairs, so the energy sum is a
// handful of operations, and the rest is arithmetic on two vectors. Nothing
// here allocates per step.
// =============================================================================

import { EJECTION_RADIUS, ENCOUNTER_RADIUS } from './binaryStability.js';

/** Nothing is watched until a run is started. */
let watch = null;

/**
 * Total energy of the three bodies, in simulation units.
 *
 * Written out rather than looped for three reasons that are all the same
 * reason: it runs on every one of a hundred thousand steps.
 *
 * @param {object} a - First body
 * @param {object} b - Second body
 * @param {object} c - Third body
 * @param {number} G - Gravitational constant
 * @returns {number} Kinetic plus potential
 */
function totalEnergy(a, b, c, G) {
  const ke =
    0.5 * a.mass * (a.vel.x * a.vel.x + a.vel.y * a.vel.y) +
    0.5 * b.mass * (b.vel.x * b.vel.x + b.vel.y * b.vel.y) +
    0.5 * c.mass * (c.vel.x * c.vel.x + c.vel.y * c.vel.y);
  const rab = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
  const rac = Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y);
  const rbc = Math.hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y);
  return (
    ke -
    (G * a.mass * b.mass) / rab -
    (G * a.mass * c.mass) / rac -
    (G * b.mass * c.mass) / rbc
  );
}

/**
 * Whether the planet has enough energy to leave both stars behind.
 *
 * Against both stars individually rather than against a point mass at the
 * barycenter. The difference is not academic for a circumstellar planet: it
 * sits deep inside one star's well and a long way from the pair's center, so
 * the point-mass approximation reports it as unbound while it is quietly
 * orbiting, which turns every survivor into an ejection.
 *
 * @param {object} planet - The planet
 * @param {object} star1 - First star
 * @param {object} star2 - Second star
 * @param {number} G - Gravitational constant
 * @returns {boolean} True if its specific energy is positive
 */
function isUnbound(planet, star1, star2, G) {
  const d1 = Math.hypot(planet.pos.x - star1.pos.x, planet.pos.y - star1.pos.y);
  const d2 = Math.hypot(planet.pos.x - star2.pos.x, planet.pos.y - star2.pos.y);
  const v2 = planet.vel.x * planet.vel.x + planet.vel.y * planet.vel.y;
  return 0.5 * v2 - (G * star1.mass) / d1 - (G * star2.mass) / d2 > 0;
}

/** The run currently being watched, or null. */
export const currentRun = () => (watch ? summarize(watch) : null);

/** Stop watching and forget the run. */
export function stopBinaryWatch() {
  if (watch) {
    watch.unsubscribe();
    watch = null;
  }
}

/**
 * Start recording a run.
 *
 * @param {object} spec - What is being run
 * @param {string} spec.mode - 'circumstellar' or 'circumbinary'
 * @param {number} spec.periods - Binary periods to integrate before stopping
 * @param {number} spec.binaryPeriod - One binary period, in simulation time
 * @param {number} spec.separation - Binary semi-major axis, simulation units
 * @param {number} spec.planetA - Planet semi-major axis, in separations
 * @param {number} spec.mu - Companion mass fraction
 * @param {number} spec.eccentricity - Binary eccentricity
 * @param {object} deps - Wiring, injected so this module is testable
 * @param {Function} deps.onStep - physics.js onPhysicsStep
 * @param {Function} deps.bodies - Returns {star1, star2, planet} or null
 * @param {number} deps.G - Gravitational constant
 * @param {Function} [deps.onFinish] - Called once when the run reaches `periods`
 * @returns {?object} The run summary at t=0, or null if the bodies are missing
 */
export function startBinaryWatch(spec, deps) {
  stopBinaryWatch();

  const parts = deps.bodies();
  if (!parts || !parts.star1 || !parts.star2 || !parts.planet) return null;
  const { star1, star2, planet } = parts;

  const w = {
    spec: { ...spec },
    G: deps.G,
    bodies: deps.bodies,
    onFinish: deps.onFinish,
    star1,
    star2,
    planet,
    elapsed: 0,
    steps: 0,
    // The step size the run was actually integrated at, which is not
    // necessarily the one the scenario asked for.
    dtMin: Infinity,
    dtMax: 0,
    dtSum: 0,
    energy0: totalEnergy(star1, star2, planet, deps.G),
    energyDrift: 0,
    maxDistance: 0,
    closestApproach: Infinity,
    encounters: 0,
    inEncounter: false,
    unbound: false,
    merged: false,
    lost: false,
    finished: false,
  };
  // A run whose initial energy is zero has nothing to measure drift against.
  // It cannot happen for a bound binary, and dividing by it silently would be
  // worse than saying so.
  w.energyScale = Math.abs(w.energy0) || 1;

  w.unsubscribe = deps.onStep(dt => step(w, dt));
  watch = w;
  return summarize(w);
}

/**
 * One integration step's worth of bookkeeping.
 *
 * @param {object} w - The watch
 * @param {number} dt - The step just taken, in simulation time
 * @returns {void}
 */
function step(w, dt) {
  if (w.finished || w.lost) return;

  const { star1, star2, planet, G } = w;

  // The planet leaving the array is not the same event as the planet being
  // absorbed, and the difference decides whether the run means anything. An
  // absorption sets alive = false and leaves the body in place, which is a
  // physical outcome. Disappearing from the array is the engine's housekeeping
  // - a cull, a reset, a scenario change under the run - and there is no
  // physical claim to make about it.
  const parts = w.bodies();
  if (!parts || !parts.planet) {
    w.lost = true;
    finish(w);
    return;
  }
  if (!planet.alive) {
    w.merged = true;
    finish(w);
    return;
  }

  w.elapsed += dt;
  w.steps++;
  if (dt < w.dtMin) w.dtMin = dt;
  if (dt > w.dtMax) w.dtMax = dt;
  w.dtSum += dt;

  const drift = Math.abs(
    (totalEnergy(star1, star2, planet, G) - w.energy0) / w.energyScale
  );
  if (drift > w.energyDrift) w.energyDrift = drift;

  const d = Math.hypot(planet.pos.x, planet.pos.y);
  if (d > w.maxDistance) w.maxDistance = d;

  // "Encounter" means a close pass with a star the planet is not orbiting.
  // For a circumstellar planet, being near its own star is not an encounter -
  // it is Tuesday - and counting it would report several hundred a run.
  const d1 = Math.hypot(planet.pos.x - star1.pos.x, planet.pos.y - star1.pos.y);
  const d2 = Math.hypot(planet.pos.x - star2.pos.x, planet.pos.y - star2.pos.y);
  const perturber = w.spec.mode === 'circumbinary' ? Math.min(d1, d2) : d2;
  if (perturber < w.closestApproach) w.closestApproach = perturber;

  const near = perturber < ENCOUNTER_RADIUS * w.spec.separation;
  if (near && !w.inEncounter) w.encounters++;
  w.inEncounter = near;

  w.unbound = isUnbound(planet, star1, star2, G);

  // Stop early once the planet is unambiguously gone. Integrating a hyperbolic
  // escape for another twenty binary periods adds nothing and costs the
  // student half a minute of watching a dot recede.
  if (w.unbound && d >= EJECTION_RADIUS * w.spec.separation) {
    finish(w);
    return;
  }

  if (w.elapsed >= w.spec.periods * w.spec.binaryPeriod) finish(w);
}

/**
 * Close the run and tell whoever asked.
 * @param {object} w - The watch
 * @returns {void}
 */
function finish(w) {
  if (w.finished) return;
  w.finished = true;
  try {
    w.onFinish?.(summarize(w));
  } catch (err) {
    console.warn('A binary-run finish handler threw:', err);
  }
}

/**
 * The run as a plain record, in the shape classifyRun() expects plus the
 * diagnostics a reader needs to decide whether to believe it.
 *
 * Distances come out in units of the binary separation. That is the natural
 * unit for every quantity here and the one the published boundary is written
 * in, so a reader never has to divide anything by hand to compare.
 *
 * @param {object} w - The watch
 * @returns {object} The record
 */
function summarize(w) {
  const sep = w.spec.separation || 1;
  return {
    mode: w.spec.mode,
    planetA: w.spec.planetA,
    mu: w.spec.mu,
    eccentricity: w.spec.eccentricity,
    // For classifyRun.
    alive: !w.lost,
    merged: w.merged,
    maxDistance: w.maxDistance / sep,
    unbound: w.unbound,
    energyDrift: w.energyDrift,
    periodsDone: w.elapsed / w.spec.binaryPeriod,
    periodsAsked: w.spec.periods,
    // Diagnostics.
    finished: w.finished,
    steps: w.steps,
    elapsed: w.elapsed,
    closestApproach: Number.isFinite(w.closestApproach)
      ? w.closestApproach / sep
      : null,
    encounters: w.encounters,
    dtMin: Number.isFinite(w.dtMin) ? w.dtMin : null,
    dtMax: w.dtMax || null,
    dtMean: w.steps ? w.dtSum / w.steps : null,
  };
}

/** Forget everything. Used by the scenario loader and by tests. */
export function resetBinaryWatch() {
  stopBinaryWatch();
}
