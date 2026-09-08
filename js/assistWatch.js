// =============================================================================
// Recording a flyby
// -----------------------------------------------------------------------------
// A gravity assist is a before-and-after measurement, and the hard part is
// deciding when "before" and "after" are. Too close in and the spacecraft is
// still deep in the planet's potential, so the speed being read is not the
// speed the encounter left it with; too far out and the run takes all afternoon.
//
// This takes the middle course honestly: it reads the state at a stated
// distance on the way in and again at the same distance on the way out, and
// converts both to speeds at infinity with the vis-viva correction from
// js/gravityAssist.js. Same distance both sides, so the correction is the same
// size both sides, and the comparison is between two numbers that mean the same
// thing.
//
// Sampled on integration steps rather than frames, for the usual reason and one
// extra. The usual one: closest approach is the fastest part of the encounter
// and a frame sampler walks straight past it. The extra one: the whole claim
// under test is that the speed relative to the planet is unchanged, to a part
// in ten million, and a measurement taken half a frame late is not accurate
// enough to make that claim with.
// =============================================================================

import {
  asymptoticSpeed,
  measuredDeflection,
  passSide,
} from './gravityAssist.js';

/** Nothing is recorded until a flyby is armed. */
let watch = null;

/** Phases a recorded encounter goes through, in order. */
export const PHASE = Object.freeze({
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  DONE: 'done',
});

/**
 * Start recording an encounter.
 *
 * @param {object} spec - The encounter
 * @param {number} spec.gate - Distance at which before and after are read
 * @param {number} spec.mu - G times the planet's mass
 * @param {number} spec.impactParameter - Signed, for reporting
 * @param {object} deps - Wiring, injected so this is testable without physics
 * @param {Function} deps.onStep - physics.js onPhysicsStep
 * @param {Function} deps.bodies - Returns {planet, probe} or null
 * @param {Function} [deps.onFinish] - Called once when the encounter completes
 * @returns {?object} The record at t=0, or null if the bodies are missing
 */
export function startAssistWatch(spec, deps) {
  stopAssistWatch();

  const parts = deps.bodies();
  if (!parts?.planet || !parts?.probe) return null;

  const w = {
    spec: { ...spec },
    bodies: deps.bodies,
    onFinish: deps.onFinish,
    planet: parts.planet,
    probe: parts.probe,
    phase: PHASE.INBOUND,
    elapsed: 0,
    steps: 0,
    // The planet's velocity when the encounter began, so its recoil can be
    // reported as a change rather than as an absolute nobody can interpret.
    planetVel0: { ...parts.planet.vel },
    planetMass0: parts.planet.mass,
    before: null,
    after: null,
    closest: Infinity,
    closestAt: null,
    lost: false,
  };

  // If the probe is already inside the gate there is no inbound leg to record,
  // and a "before" taken from partway through the encounter would be a
  // measurement of nothing. Say so rather than recording it.
  //
  // Strictly inside, with a tolerance, and the difference is not pedantic. The
  // world builder places the spacecraft at exactly the gate distance, because
  // that is where the reading is defined; comparing with <= made that the
  // "already inside" case, so whether a run recorded a before at all came down
  // to which side of 4000.0000000 the placement rounded to. Half the
  // encounters silently had no before and reported null instead of a speed.
  const r0 = separation(w);
  w.startedInside = r0 < spec.gate * (1 - 1e-9);
  if (!w.startedInside) w.before = sample(w);

  w.unsubscribe = deps.onStep(dt => step(w, dt));
  watch = w;
  return summarize(w);
}

/** Distance between the two bodies. @param {object} w - The watch @returns {number} units */
function separation(w) {
  return Math.hypot(
    w.probe.pos.x - w.planet.pos.x,
    w.probe.pos.y - w.planet.pos.y
  );
}

/**
 * The spacecraft's state relative to the planet, right now.
 *
 * @param {object} w - The watch
 * @returns {object} Relative velocity, distance, and the speed at infinity
 */
function sample(w) {
  const rel = {
    x: w.probe.vel.x - w.planet.vel.x,
    y: w.probe.vel.y - w.planet.vel.y,
  };
  const r = separation(w);
  const speed = Math.hypot(rel.x, rel.y);
  return {
    rel,
    distance: r,
    relativeSpeed: speed,
    // The comparison the lesson turns on has to be between two speeds at
    // infinity, not two speeds partway down a hill.
    vInf: asymptoticSpeed(speed, r, w.spec.mu),
    inertial: { ...w.probe.vel },
    inertialSpeed: Math.hypot(w.probe.vel.x, w.probe.vel.y),
    planetVel: { ...w.planet.vel },
    time: w.elapsed,
  };
}

/**
 * One integration step of bookkeeping.
 *
 * @param {object} w - The watch
 * @param {number} dt - The step just taken
 * @returns {void}
 */
function step(w, dt) {
  if (w.phase === PHASE.DONE || w.lost) return;

  const parts = w.bodies();
  if (!parts?.planet || !parts?.probe || parts.probe !== w.probe) {
    w.lost = true;
    finish(w);
    return;
  }
  if (w.probe.alive === false || w.planet.alive === false) {
    w.lost = true;
    finish(w);
    return;
  }

  w.elapsed += dt;
  w.steps++;

  const r = separation(w);
  if (r < w.closest) {
    w.closest = r;
    w.closestAt = w.elapsed;
    // The offset at closest approach is what decides which side it went past,
    // and it is only unambiguous here: far out on either leg the spacecraft is
    // nearly on the planet's own line of travel.
    w.closestOffset = {
      x: w.probe.pos.x - w.planet.pos.x,
      y: w.probe.pos.y - w.planet.pos.y,
    };
  }

  if (w.phase === PHASE.INBOUND) {
    // Past closest approach and heading out again. Tested on the radial
    // velocity rather than on the distance increasing, because near periapsis
    // the distance can tick upward for a step on a coarse timestep without the
    // encounter being over.
    const outward =
      (w.probe.pos.x - w.planet.pos.x) * (w.probe.vel.x - w.planet.vel.x) +
      (w.probe.pos.y - w.planet.pos.y) * (w.probe.vel.y - w.planet.vel.y);
    if (outward > 0 && r > w.closest) w.phase = PHASE.OUTBOUND;
    return;
  }

  if (r >= w.spec.gate) {
    w.after = sample(w);
    finish(w);
  }
}

/** Close the encounter and tell whoever asked. @param {object} w - The watch @returns {void} */
function finish(w) {
  if (w.phase === PHASE.DONE) return;
  w.phase = PHASE.DONE;
  try {
    w.onFinish?.(summarize(w));
  } catch (err) {
    console.warn('An assist finish handler threw:', err);
  }
}

/**
 * The encounter as a plain record.
 *
 * @param {object} w - The watch
 * @returns {object} Everything a reader or a test needs
 */
function summarize(w) {
  const before = w.before;
  const after = w.after;
  const planet = w.planet;

  // The planet's recoil. Equal and opposite to the spacecraft's momentum
  // change, and that is the point of showing it: the assist is not free, it is
  // paid for out of the planet's orbit by an amount too small to matter to the
  // planet and large enough to matter to the spacecraft.
  const planetDeltaV = {
    x: planet.vel.x - w.planetVel0.x,
    y: planet.vel.y - w.planetVel0.y,
  };
  const planetDeltaP = {
    x: w.planetMass0 * planetDeltaV.x,
    y: w.planetMass0 * planetDeltaV.y,
  };

  let deflection = null;
  let probeDeltaP = null;
  let deltaV = null;
  if (before && after) {
    deflection = measuredDeflection(before.rel, after.rel);
    const m = w.probe.mass;
    // The change in the spacecraft's velocity, which is the same vector in
    // every inertial frame. Computed here rather than by each reader, because
    // it is the one quantity the two frames and the two passes have to agree
    // about, and three definitions of it would be three chances to disagree.
    deltaV = {
      x: after.inertial.x - before.inertial.x,
      y: after.inertial.y - before.inertial.y,
    };
    probeDeltaP = { x: m * deltaV.x, y: m * deltaV.y };
  }

  // The momentum ledger, as a fraction. The panel used to compute this inline
  // and the experiments would have had to compute it again; one encounter has
  // one answer, so it is computed once, here, beside the numbers it is about.
  let ledgerMismatch = null;
  if (probeDeltaP) {
    const probeP = Math.hypot(probeDeltaP.x, probeDeltaP.y);
    const planetP = Math.hypot(planetDeltaP.x, planetDeltaP.y);
    ledgerMismatch = probeP > 0 ? Math.abs(planetP - probeP) / probeP : null;
  }

  return {
    phase: w.phase,
    steps: w.steps,
    elapsed: w.elapsed,
    lost: w.lost,
    startedInside: Boolean(w.startedInside),
    impactParameter: w.spec.impactParameter,
    gate: w.spec.gate,
    before,
    after,
    closest: Number.isFinite(w.closest) ? w.closest : null,
    closestAt: w.closestAt,
    side: w.closestOffset ? passSide(w.planetVel0, w.closestOffset) : null,
    deflection,
    // The two numbers the lesson compares. Null until the encounter is over,
    // because half an encounter has no "after".
    vInfBefore: before?.vInf ?? null,
    vInfAfter: after?.vInf ?? null,
    inertialBefore: before?.inertialSpeed ?? null,
    inertialAfter: after?.inertialSpeed ?? null,
    speedChange:
      before && after ? after.inertialSpeed - before.inertialSpeed : null,
    // Frame-independent, unlike the speed change above it. Every inertial
    // observer measures this same vector, which is why the gaining pass and
    // the losing one agree about it and disagree about everything else.
    deltaV,
    deltaVMagnitude: deltaV ? Math.hypot(deltaV.x, deltaV.y) : null,
    // The claim the isolated lab exists to support, as a number: how much the
    // speed relative to the planet changed, as a fraction of what it was.
    relativeResidual:
      before?.vInf && after?.vInf
        ? (after.vInf - before.vInf) / before.vInf
        : null,
    ledgerMismatch,
    massRatio: w.planetMass0 > 0 ? w.probe.mass / w.planetMass0 : null,
    // Whether there is a whole encounter here: an inbound reading, an outbound
    // one, and a spacecraft that survived to give them. Anything less is not a
    // measurement of a flyby, and every reader of this record needs to be able
    // to say so without reassembling the test.
    complete: Boolean(before && after && !w.lost),
    planetDeltaV,
    planetDeltaVMagnitude: Math.hypot(planetDeltaV.x, planetDeltaV.y),
    planetDeltaP,
    probeDeltaP,
    planetSpeed: Math.hypot(planet.vel.x, planet.vel.y),
    probeMass: w.probe.mass,
    planetMass: w.planetMass0,
  };
}

/** @returns {?object} The encounter being recorded, or null */
export const currentAssist = () => (watch ? summarize(watch) : null);

/** Stop recording and forget it. @returns {void} */
export function stopAssistWatch() {
  if (watch) {
    watch.unsubscribe?.();
    watch = null;
  }
}

/** Forget everything. Used by the scenario loader and by tests. */
export const resetAssistWatch = stopAssistWatch;
