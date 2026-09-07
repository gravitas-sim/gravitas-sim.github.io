// =============================================================================
// Pause at event
// -----------------------------------------------------------------------------
// "Stop when the comet reaches perihelion" is a thing a student asks for
// constantly and could not previously do: they watched the readout, guessed,
// and hit pause somewhere near the right moment. This arms a watch for one
// named event and stops the simulation when it happens.
//
// Three decisions shape everything here.
//
// It runs on simulation steps, not on frames. A scenario that substeps takes
// several integration steps per rendered frame, and the frame rate varies with
// the machine; an event found by looking at frames is found to a precision
// nobody can state and that changes when the tab is backgrounded. The watcher
// subscribes to js/physics.js's step hook, so it sees exactly the states the
// integrator produced and can report the interval it localised the event to.
//
// It never rewinds. Landing exactly on an event would mean winding the clock
// back to it, and the clock is not the only thing that would have to move: the
// radial-velocity and astrometry recordings, the light curve, the timeline's
// ring buffer and the stopwatch all hold state indexed by that clock. Rewinding
// some of them and not others is how a panel ends up describing a moment that
// never existed. So the simulation stops at the first step *after* the event,
// and the readout says both when the event was and how far past it the pause
// is. An honest overshoot beats a silent desynchronisation.
//
// It costs nothing when nobody is watching. The physics hook is subscribed on
// arm and released on disarm, and this module is imported on demand.
// =============================================================================

import { orbitalElements } from './orbital.js';

/** The events a watch can be armed for. */
export const EVENT_KINDS = Object.freeze({
  PERIAPSIS: 'periapsis',
  APOAPSIS: 'apoapsis',
  SEPARATION_INWARD: 'separationInward',
  SEPARATION_OUTWARD: 'separationOutward',
  TRANSIT: 'transit',
});

/**
 * Below this eccentricity a periapsis is not a place.
 *
 * On a circular orbit the radial rate is zero everywhere, so its sign is
 * decided by integration error and the watch would fire on the first step and
 * every step after it. The threshold is generous - 1e-3 is a hundredth of the
 * roundest orbit in the catalogue - because the failure it prevents is a
 * confident answer to a question with no answer, and the honest alternative is
 * to say so.
 */
export const MIN_ECCENTRICITY = 1e-3;

/**
 * The signed quantity whose zero crossing is the event, and which way it must
 * be going.
 *
 * Periapsis and apoapsis are the turning points of the separation, so both are
 * crossings of the radial rate; they differ only in direction. A separation
 * crossing is the same idea one derivative down. Writing them as one shape lets
 * a single bracket-and-refine handle all four, which matters because the
 * refinement is the part that has to be right.
 *
 * @param {string} kind - From EVENT_KINDS
 * @param {{r: number, rdot: number}} state - Separation and its rate
 * @param {number} [separation] - The radius a crossing watch is waiting for
 * @returns {?{value: number, rising: boolean}} The scalar, or null if not applicable
 */
export function eventSignal(kind, state, separation = null) {
  if (!state || !Number.isFinite(state.r)) return null;
  switch (kind) {
    // r is at a minimum when its rate passes from negative to positive.
    case EVENT_KINDS.PERIAPSIS:
      return { value: state.rdot, rising: true };
    case EVENT_KINDS.APOAPSIS:
      return { value: state.rdot, rising: false };
    case EVENT_KINDS.SEPARATION_INWARD:
      return Number.isFinite(separation)
        ? { value: state.r - separation, rising: false }
        : null;
    case EVENT_KINDS.SEPARATION_OUTWARD:
      return Number.isFinite(separation)
        ? { value: state.r - separation, rising: true }
        : null;
    default:
      return null;
  }
}

/**
 * Where between two steps the signal crossed zero.
 *
 * Linear in the signal, which is what two samples support. The bracket is
 * returned alongside so the reader is told the precision rather than left to
 * infer it from a number printed to six figures: the estimate sits somewhere
 * inside an interval one integration step wide, and for a smooth signal it is
 * near the middle of it.
 *
 * @param {{t: number, value: number}} before - The step before the crossing
 * @param {{t: number, value: number}} after - The step after it
 * @returns {{time: number, bracket: number}} The estimate and the interval
 */
export function refineCrossing(before, after) {
  const span = after.t - before.t;
  const rise = after.value - before.value;
  // A signal that did not actually move cannot be interpolated; the crossing is
  // somewhere in the bracket and the midpoint is the least wrong guess.
  const f = Math.abs(rise) > 0 ? -before.value / rise : 0.5;
  const clamped = Math.min(1, Math.max(0, f));
  return { time: before.t + span * clamped, bracket: Math.abs(span) };
}

/**
 * Whether a crossing happened between two samples, in the wanted direction.
 *
 * A sample sitting exactly on zero counts as the crossing rather than being
 * missed by both comparisons, which is the case an equality test usually drops.
 *
 * @param {number} before - Signal at the earlier step
 * @param {number} after - Signal at the later step
 * @param {boolean} rising - Whether the wanted crossing goes upward
 * @returns {boolean} Whether it crossed
 */
export function crossedZero(before, after, rising) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return false;
  return rising ? before < 0 && after >= 0 : before > 0 && after <= 0;
}

/**
 * The separation of two bodies and how fast it is changing.
 *
 * rdot is the projection of the relative velocity onto the line joining them,
 * which is the derivative of |r| and is what turns sign at a turning point.
 *
 * @param {object} body - The orbiting object
 * @param {object} primary - What it is orbiting
 * @returns {?{r: number, rdot: number}} The pair, or null if either is gone
 */
export function separationState(body, primary) {
  if (!body?.alive || !primary?.alive || body === primary) return null;
  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const r = Math.hypot(rx, ry);
  if (!Number.isFinite(r) || r <= 0) return null;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;
  return { r, rdot: (rx * vx + ry * vy) / r };
}

/**
 * Whether this watch can be armed at all, and what to say if not.
 *
 * Refusing with a reason is the point. Every one of these is a question with no
 * answer rather than a question this code cannot answer, and firing anyway
 * would hand a student a number that means nothing.
 *
 * @param {object} spec - {kind, separation}
 * @param {object} context - {body, primary, elements}
 * @returns {{ok: boolean, reason?: string, detail?: object}} The verdict
 */
export function canArm(spec, { body, primary, elements } = {}) {
  if (!spec || !EVENT_KINDS[String(spec.kind).toUpperCase()]) {
    if (!Object.values(EVENT_KINDS).includes(spec?.kind)) {
      return { ok: false, reason: 'unknownKind' };
    }
  }
  if (spec.kind === EVENT_KINDS.TRANSIT) return { ok: true };

  if (!body?.alive) return { ok: false, reason: 'noBody' };
  if (!primary?.alive) return { ok: false, reason: 'noPrimary' };
  if (body === primary) return { ok: false, reason: 'samePrimary' };

  if (
    spec.kind === EVENT_KINDS.SEPARATION_INWARD ||
    spec.kind === EVENT_KINDS.SEPARATION_OUTWARD
  ) {
    if (!Number.isFinite(spec.separation) || spec.separation <= 0) {
      return { ok: false, reason: 'badSeparation' };
    }
    // A crossing of a radius the orbit never reaches will never happen, and
    // saying so now is better than a watch that quietly runs for ever.
    if (elements?.bound) {
      const { periapsis, apoapsis } = elements;
      if (spec.separation < periapsis || spec.separation > apoapsis) {
        return {
          ok: false,
          reason: 'outsideOrbit',
          detail: { periapsis, apoapsis },
        };
      }
    }
    return { ok: true };
  }

  // Periapsis and apoapsis.
  if (!elements) return { ok: false, reason: 'noOrbit' };
  if (!elements.bound) return { ok: false, reason: 'unbound' };
  if (!(elements.e >= MIN_ECCENTRICITY)) {
    return { ok: false, reason: 'circular', detail: { e: elements.e } };
  }
  return { ok: true };
}

// --- The watch -----------------------------------------------------------------
// Everything above is arithmetic and can be tested without a simulation.
// Everything below holds the one live watch and is what the panel drives.

/** The watch, or null when nothing is armed. */
let watch = null;
/** Released the moment the watch is disarmed, so an idle tool costs nothing. */
let unsubscribe = null;
/** The last event that fired, kept for the readout and the timeline marker. */
let fired = null;
/** Callbacks for the panel and the timeline. */
const listeners = new Set();

/** @returns {?object} The armed watch, or null */
export const armedEvent = () => (watch ? { ...watch.spec } : null);

/** @returns {?object} The last event that fired, or null */
export const lastEvent = () => (fired ? { ...fired } : null);

/**
 * Be told when a watch fires, or is disarmed for a reason.
 * @param {Function} fn - Called with the event, or null when disarmed
 * @returns {Function} Unsubscribe
 */
export function onEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const announce = payload => {
  for (const fn of listeners) {
    try {
      fn(payload);
    } catch (err) {
      console.warn('A pause-at-event listener threw:', err);
    }
  }
};

/**
 * Stop watching.
 *
 * @param {?string} reason - Why, when it was not the reader's doing
 */
export function disarm(reason = null) {
  if (!watch) return;
  watch = null;
  unsubscribe?.();
  unsubscribe = null;
  announce({ type: 'disarmed', reason });
}

/** Forget the last event, so the marker and the readout clear. */
export function clearLastEvent() {
  fired = null;
  announce({ type: 'cleared' });
}

/**
 * Arm a watch.
 *
 * @param {object} spec - {kind, bodyId, primaryId, separation, note}
 * @param {object} deps - {resolveBody, pause, clockDays, transitLog, G}
 * @returns {{ok: boolean, reason?: string, detail?: object}} Whether it armed
 */
export function armEvent(spec, deps) {
  disarm();

  const body = deps.resolveBody(spec.bodyId);
  const primary = deps.resolveBody(spec.primaryId);
  const elements =
    body && primary ? orbitalElements(body, primary, deps.G()) : null;

  const verdict = canArm(spec, { body, primary, elements });
  if (!verdict.ok) return verdict;

  watch = {
    spec: { ...spec },
    deps,
    // The signal at the previous step, so a crossing can be bracketed. Null
    // until the first step, because one sample cannot cross anything.
    previous: null,
    // For a transit watch: how many transits the detector had logged when the
    // watch was armed, so only a *new* one counts.
    transitsAtArm: deps.transitLog ? deps.transitLog().length : 0,
    armedAtDays: deps.clockDays(),
  };

  // The step's own arguments are not used: the watch reads the clock in days
  // through deps.clockDays(), which is the unit every panel and readout speaks.
  unsubscribe = deps.onStep(() => step());
  announce({ type: 'armed', spec: { ...spec } });
  return { ok: true };
}

/** One integration step. */
function step() {
  if (!watch) return;
  const { spec, deps } = watch;
  const nowDays = deps.clockDays();

  if (spec.kind === EVENT_KINDS.TRANSIT) return stepTransit(nowDays);

  const body = deps.resolveBody(spec.bodyId);
  const primary = deps.resolveBody(spec.primaryId);
  const state = separationState(body, primary);

  // The target went away: merged, absorbed, or removed. A watch for an event
  // that can no longer happen is disarmed and says why, rather than waiting
  // for ever on a body that is not there.
  if (!state) {
    disarm('targetGone');
    return;
  }

  const signal = eventSignal(spec.kind, state, spec.separation);
  if (!signal) {
    disarm('unknownKind');
    return;
  }

  const sample = { t: nowDays, value: signal.value };
  const before = watch.previous;

  // The clock advances once per rendered frame, and this runs once per
  // integration substep, so several samples in a row carry the same timestamp.
  // Pairing two of those brackets the crossing to zero elapsed time - a
  // resolution the clock does not have - and interpolates across a span of
  // zero. So one sample per distinct clock reading: the bracket is then the
  // frame the crossing happened in, which is the real resolution and is never
  // zero. The cost is that a crossing is reported at the end of its frame
  // rather than at the substep that produced it, which is inside the bracket
  // the readout already quotes.
  if (before && sample.t === before.t) return;

  watch.previous = sample;
  if (!before) return;

  // A clock that went backwards means the timeline was scrubbed. The previous
  // sample is from a future that is being replayed away; drop it and start the
  // bracket again rather than reading a crossing out of two unrelated states.
  if (sample.t < before.t) return;

  if (!crossedZero(before.value, sample.value, signal.rising)) return;

  const { time, bracket } = refineCrossing(before, sample);
  fire({
    kind: spec.kind,
    timeDays: time,
    bracketDays: bracket,
    overshootDays: nowDays - time,
    detail: { separation: state.r, radialRate: state.rdot },
  });
}

/**
 * A transit watch, which reads the photometer's own detector rather than
 * finding a crossing of its own.
 *
 * The mid-time of a transit is only known once it has finished - it is the
 * midpoint of the ingress and egress the detector measured - so this fires
 * after the event by about half a transit duration. That is reported as the
 * overshoot like any other, and is why the readout shows it: a reader who
 * expects the simulation to stop mid-transit should be told why it did not.
 *
 * @param {number} nowDays - The clock now
 */
function stepTransit(nowDays) {
  const log = watch.deps.transitLog ? watch.deps.transitLog() : [];
  if (log.length <= watch.transitsAtArm) return;

  const latest = log[log.length - 1];
  if (!latest || !Number.isFinite(latest.mid)) {
    // A logged transit with no usable mid-time is not an event to stop on.
    watch.transitsAtArm = log.length;
    return;
  }
  fire({
    kind: EVENT_KINDS.TRANSIT,
    timeDays: latest.mid,
    // The detector's own resolution: the transit was localised to its duration.
    bracketDays: Number.isFinite(latest.duration) ? latest.duration : 0,
    overshootDays: nowDays - latest.mid,
    detail: { depth: latest.depth, duration: latest.duration, seq: latest.seq },
  });
}

/**
 * Record the event, stop the simulation, and tell everyone.
 *
 * Nothing is rewound. See the note at the top of the file: the clock is not the
 * only thing indexed by the clock, and moving some of those back and not others
 * is how a panel comes to describe a moment that never happened.
 *
 * @param {object} event - The event
 */
function fire(event) {
  const { spec, deps } = watch;
  fired = {
    ...event,
    bodyId: spec.bodyId ?? null,
    primaryId: spec.primaryId ?? null,
    note: spec.note || '',
    at: new Date().toISOString(),
  };
  disarm();
  deps.pause();
  announce({ type: 'fired', event: { ...fired } });
}

/**
 * Attach a student's note to the event that fired.
 *
 * Kept with the event rather than anywhere else so that whatever exports the
 * moment - a screenshot, a lab report - can pick it up without knowing about
 * the panel that collected it.
 *
 * @param {string} text - The note
 */
export function annotateLastEvent(text) {
  if (!fired) return;
  fired.note = String(text ?? '').slice(0, 280);
  announce({ type: 'annotated', event: { ...fired } });
}

/**
 * Drop everything. Called when the world is rebuilt.
 *
 * A watch names bodies by id, and a rebuilt world reuses ids for different
 * objects, so a watch that survived a reset would be watching something else
 * entirely under the same name.
 */
export function resetPauseAtEvent() {
  disarm('worldReset');
  fired = null;
  announce({ type: 'cleared' });
}
