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
export function sessionKey({ starId = null, geometry = null } = {}) {
  return {
    starId: starId ?? null,
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
 * @returns {?('target'|'geometry')} What changed, or null
 */
export function sessionChange(before, after) {
  if (!before || !after) return null;
  if (before.starId !== after.starId) return 'target';
  if (
    before.positionAngleDeg !== after.positionAngleDeg ||
    before.inclinationDeg !== after.inclinationDeg
  ) {
    return 'geometry';
  }
  return null;
}

/**
 * What to do with a recording, given the clock and the session.
 *
 * One function so that both panels behave identically. The caller supplies the
 * facts; this decides, and the decision is testable without a simulation.
 *
 * @param {object} params
 * @param {?object} params.recordedSession - Session the samples were taken under
 * @param {object} params.currentSession - Session now in force
 * @param {?number} params.lastSampleTime - Simulation time of the last sample
 * @param {number} params.simTime - Simulation time now
 * @param {boolean} [params.paused] - Whether the simulation is paused
 * @param {boolean} [params.scrubbing] - Whether the view is parked on a
 *   recorded frame
 * @returns {{action: 'append'|'hold'|'restart'|'truncate',
 *   reason: ?string}} What the panel should do
 */
export function decideSampling({
  recordedSession,
  currentSession,
  lastSampleTime,
  simTime,
  paused = false,
  scrubbing = false,
}) {
  // Nothing recorded yet: any sample starts the session.
  if (recordedSession === null || lastSampleTime === null) {
    if (paused || scrubbing) return { action: 'hold', reason: null };
    return { action: 'append', reason: null };
  }

  const changed = sessionChange(recordedSession, currentSession);
  if (changed) return { action: 'restart', reason: changed };

  // Parked on a recorded frame. The displayed state is a replay, not an
  // observation, and sampling it would record the same instant repeatedly.
  if (scrubbing) return { action: 'hold', reason: null };

  // Paused. Preserved rather than cleared, and not appended to: identical
  // points piled on one instant invent a flat stretch of curve that was never
  // observed, and on a bounded buffer they evict real history to do it.
  if (paused) return { action: 'hold', reason: null };

  // The clock has gone backwards: the run was rewound and resumed. Everything
  // recorded at or after the new time describes a future that is not going to
  // happen again, so it is dropped and the rest of the history is kept.
  if (simTime < lastSampleTime) {
    return { action: 'truncate', reason: 'rewound' };
  }

  // Time has not advanced. A frame can render without the clock moving - a
  // paused step, a scrub that landed on the same frame - and a sample then is a
  // duplicate rather than a measurement.
  if (simTime === lastSampleTime) return { action: 'hold', reason: null };

  return { action: 'append', reason: null };
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
