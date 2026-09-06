// =============================================================================
// One recording, one observing session
// -----------------------------------------------------------------------------
// A radial-velocity series and an astrometric path are each a record of *one
// star* watched from *one direction* over *advancing time*. Change any of those
// three and the samples already taken stop belonging with the ones about to be
// taken - and a curve made of both is not a measurement of anything.
//
// The panels each got this partly right and partly wrong:
//
//   the target      neither panel checked it while sampling. Selecting the
//                   other star of a binary moved the instrument and appended
//                   the new star's velocities to the old star's curve.
//   the geometry    both cleared on an observer change, but only while open:
//                   the subscription is released when the panel closes, so a
//                   change made with the panel shut was never noticed and the
//                   old samples were kept.
//   the clock       both guarded on `state.paused`, which is not the same
//                   question. Scrubbing the timeline rewinds the simulation
//                   clock without pausing, so resuming from an earlier frame
//                   appended new samples *behind* existing ones and left the
//                   series carrying a future that no longer happens.
//
// This module is the shared answer: a session descriptor the panels compare,
// and the rules for what to do when it changes. Pure - no DOM, no imports from
// either panel - so both can use it and it can be tested without a browser.
// =============================================================================

/**
 * Build a descriptor of the conditions a recording was made under.
 *
 * @param {object} params
 * @param {?number|string} params.starId - Stable id of the observed star
 * @param {?object} params.geometry - From observerGeometry()
 * @returns {{starId: ?(number|string), positionAngleDeg: ?number,
 *   inclinationDeg: ?number}} The descriptor
 */
export function sessionKey({
  starId = null,
  geometry = null,
  worldGeneration = null,
  interventionEpoch = null,
  velocityScale = null,
  config = null,
} = {}) {
  return {
    starId: starId ?? null,
    // Which world this star belongs to. Body ids restart from a counter, so a
    // rebuilt scenario hands the same id to a different star; without this, a
    // recording of one could be silently continued against its replacement.
    worldGeneration: Number.isFinite(worldGeneration) ? worldGeneration : null,
    // A body whose velocity was changed by hand - a manoeuvre burn, a bench
    // perturbation - is on a different orbit from the one the samples so far
    // describe, and no other field here can tell: same star, same geometry,
    // same units, same world. Without this a recording would continue across
    // the burn and be plotted as one curve of two different systems.
    interventionEpoch: Number.isFinite(interventionEpoch)
      ? interventionEpoch
      : null,
    // Metres per second in one simulation velocity unit. Samples are converted
    // as they are taken, so a change here - the gravitational constant slider
    // moves it - means the numbers already recorded were made with a different
    // ruler and cannot be plotted beside the next one.
    velocityScale: Number.isFinite(velocityScale)
      ? Math.round(velocityScale * 1e9) / 1e9
      : null,
    // Whatever the instrument's own settings are, as a comparable string. The
    // radial-velocity panel puts its observing schedule here.
    config: config === null || config === undefined ? null : String(config),
    // Rounded to a thousandth of a degree. The geometry comes from sliders and
    // is compared for equality; a float that differs in its last bit is not a
    // different observing direction and must not throw away a recording.
    positionAngleDeg:
      geometry && Number.isFinite(geometry.positionAngleDeg)
        ? Math.round(geometry.positionAngleDeg * 1000) / 1000
        : null,
    inclinationDeg:
      geometry && Number.isFinite(geometry.inclinationDeg)
        ? Math.round(geometry.inclinationDeg * 1000) / 1000
        : null,
  };
}

/**
 * Whether two descriptors describe the same observing session.
 *
 * @param {?object} a - A descriptor
 * @param {?object} b - Another
 * @returns {boolean} True when a recording may continue across the two
 */
export function sameSession(a, b) {
  if (!a || !b) return false;
  return (
    a.starId === b.starId &&
    a.positionAngleDeg === b.positionAngleDeg &&
    a.inclinationDeg === b.inclinationDeg
  );
}

/**
 * What changed between two sessions, as a reason a recording was restarted.
 *
 * Returns the target first when both moved: it is the larger change, and
 * saying "a different star" is more use than "a different star and direction".
 *
 * @param {?object} before - The session the samples were taken under
 * @param {?object} after - The session now in force
 * @returns {?('world'|'maneuver'|'target'|'geometry')} What changed, or null
 */
export function sessionChange(before, after) {
  if (!before || !after) return null;
  // Ordered by how fundamental the change is, so the message a reader sees
  // names the biggest thing that moved rather than an incidental consequence
  // of it: a rebuilt world usually changes the target too.
  if (
    before.worldGeneration !== null &&
    after.worldGeneration !== null &&
    before.worldGeneration !== after.worldGeneration
  ) {
    return 'world';
  }
  if (before.interventionEpoch !== after.interventionEpoch) return 'maneuver';
  if (before.starId !== after.starId) return 'target';
  if (
    before.positionAngleDeg !== after.positionAngleDeg ||
    before.inclinationDeg !== after.inclinationDeg
  ) {
    return 'geometry';
  }
  if (
    before.velocityScale !== null &&
    after.velocityScale !== null &&
    before.velocityScale !== after.velocityScale
  ) {
    return 'units';
  }
  if (before.config !== after.config) return 'config';
  return null;
}

/**
 * Two separate questions about this frame, answered separately.
 *
 *   invalidate  does what is already recorded still describe what is on screen?
 *   sample      may a new measurement be taken right now?
 *
 * They used to be one `action`, and collapsing them was a bug. A target change
 * returned `restart` before the paused and scrubbing checks were ever reached,
 * so the caller cleared the recording and then fell straight through to append
 * a point - while the clock was stopped. Selecting a different star on a paused
 * simulation therefore produced a one-sample "recording" of an instant nobody
 * observed, and the same happened while scrubbing.
 *
 * Invalidation is about the *past*: the conditions under which the existing
 * samples were taken no longer hold, so they are not part of what happens next.
 * That is true whether or not the clock is running, so pausing must not
 * suppress it - a reader who switches stars while paused should not come back
 * to the old star's curve.
 *
 * Permission is about the *present*: a measurement needs the clock to have
 * moved since the last one. Nothing about invalidation grants it. The advancing
 * time requirement is absolute, which is what the old ordering violated.
 *
 * @param {object} args - The state of things
 * @param {?object} args.recordedSession - Conditions the samples were taken under
 * @param {object} args.currentSession - Conditions now
 * @param {?number} args.lastSampleTime - Simulation clock at the last sample
 * @param {number} args.simTime - Simulation clock now
 * @param {boolean} [args.paused] - Whether the simulation is stopped
 * @param {boolean} [args.scrubbing] - Whether the timeline is being replayed
 * @returns {{invalidate: ?string, sample: boolean, reason: ?string}} The two answers
 */
export function decideSampling({
  recordedSession,
  currentSession,
  lastSampleTime,
  simTime,
  paused = false,
  scrubbing = false,
}) {
  const started = recordedSession !== null && lastSampleTime !== null;

  // --- Does the past still stand? ---------------------------------------------
  let invalidate = null;
  if (started) {
    invalidate = sessionChange(recordedSession, currentSession);
    // The clock has gone backwards: the run was rewound and resumed. Everything
    // recorded at or after the new time describes a future that is not going to
    // happen again. Reported only when the conditions are otherwise unchanged,
    // because a restart discards those samples anyway.
    if (!invalidate && simTime < lastSampleTime) invalidate = 'rewound';
  }

  // --- May a measurement be taken now? ----------------------------------------
  // Parked on a recorded frame: the displayed state is a replay, not an
  // observation, and sampling it would record one instant repeatedly.
  //
  // Paused: identical points piled on one instant invent a flat stretch of
  // curve that was never observed, and on a bounded buffer they evict real
  // history to do it.
  let sample = !paused && !scrubbing;

  if (sample && started && invalidate === null) {
    // Time has not advanced. A frame can render without the clock moving - a
    // paused step, a scrub that landed on the same frame - and a sample then is
    // a duplicate rather than a measurement.
    if (simTime <= lastSampleTime) sample = false;
  }
  // After an invalidation there is no previous sample to be too close to: the
  // caller is about to discard the ones there were. The clock still has to be
  // running, which the check above already decided.

  return { invalidate, sample, reason: invalidate };
}

/**
 * Drop samples that a rewind has invalidated.
 *
 * Keeps everything strictly before the new clock reading. Samples at exactly
 * that time go too: the next appended sample will carry that timestamp, and two
 * points at one instant is the duplicate this whole mechanism exists to avoid.
 *
 * @param {Array<object>} samples - Recorded samples, in time order
 * @param {number} simTime - The clock after the rewind
 * @param {Function} timeOf - Reads the timestamp from a sample
 * @returns {Array<object>} The samples still valid
 */
export function dropInvalidatedSamples(samples, simTime, timeOf) {
  if (!Array.isArray(samples)) return [];
  return samples.filter(s => {
    const t = timeOf(s);
    return Number.isFinite(t) && t < simTime;
  });
}
