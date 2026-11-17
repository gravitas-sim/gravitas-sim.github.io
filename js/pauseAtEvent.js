// Pause at event: arm a watch for one named event and stop the simulation when
// it happens.
//
// Runs on simulation steps, not frames: it subscribes to js/physics.js's step
// hook, so it sees the integrator's own states and can report the interval the
// event was localised to, independent of frame rate.
//
// Never rewinds: the radial-velocity and astrometry recordings, light curve,
// timeline ring buffer and stopwatch are all indexed by the clock, so winding it
// back would desynchronise them. The simulation stops at the first step after
// the event and the readout gives how far past it the pause is.
//
// Free when idle: the hook is subscribed on arm, released on disarm, and this
// module is imported on demand.

import { orbitalElements } from './orbital.js';

/** The events a watch can be armed for. */
export const EVENT_KINDS = Object.freeze({
  PERIAPSIS: 'periapsis',
  APOAPSIS: 'apoapsis',
  SEPARATION_INWARD: 'separationInward',
  SEPARATION_OUTWARD: 'separationOutward',
  TRANSIT: 'transit',
  // Trough and peak of the line-of-sight velocity; where they fall depends on
  // the viewing direction, not just the orbit.
  RV_MINIMUM: 'rvMinimum',
  RV_MAXIMUM: 'rvMaximum',
});

/**
 * Below this eccentricity a periapsis is not a place: on a circular orbit the
 * radial rate is zero everywhere, its sign is integration error, and the watch
 * would fire on every step. 1e-3 is a hundredth of the roundest catalog orbit.
 */
export const MIN_ECCENTRICITY = 1e-3;

/**
 * The signed quantity whose zero crossing is the event, and which way it must
 * be going. One shape lets a single bracket-and-refine handle every kind:
 * periapsis and apoapsis cross the radial rate in opposite directions, a
 * separation crossing is the separation minus the target.
 *
 * @param {string} kind - From EVENT_KINDS
 * @param {{r: number, rdot: number}} state - Separation and its rate
 * @param {number} [separation] - The radius a crossing watch is waiting for
 * @returns {?{value: number, rising: boolean}} The scalar, or null if not applicable
 */
export function eventSignal(kind, state, separation = null) {
  // The signal is the caller's `vlosDot` (rate of change of the line-of-sight
  // velocity): rising at a trough, falling at a peak. Checked before the r
  // guard because it needs no separation.
  if (kind === EVENT_KINDS.RV_MINIMUM || kind === EVENT_KINDS.RV_MAXIMUM) {
    if (!state || !Number.isFinite(state.vlosDot)) return null;
    return {
      value: state.vlosDot,
      rising: kind === EVENT_KINDS.RV_MINIMUM,
    };
  }
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
 * Where between two steps the signal crossed zero, by linear interpolation. The
 * bracket (the interval between the two steps) is returned so the reader is
 * told the precision.
 *
 * @param {{t: number, value: number}} before - The step before the crossing
 * @param {{t: number, value: number}} after - The step after it
 * @returns {{time: number, bracket: number}} The estimate and the interval
 */
export function refineCrossing(before, after) {
  const span = after.t - before.t;
  const rise = after.value - before.value;
  // No movement cannot be interpolated; the midpoint is the least wrong guess.
  const f = Math.abs(rise) > 0 ? -before.value / rise : 0.5;
  const clamped = Math.min(1, Math.max(0, f));
  return { time: before.t + span * clamped, bracket: Math.abs(span) };
}

/**
 * Whether a crossing happened between two samples, in the wanted direction. A
 * sample exactly on zero counts as the crossing.
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
 * The separation of two bodies and its rate: rdot is the relative velocity
 * projected onto the line joining them, the derivative of |r|.
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
 * Whether this watch can be armed at all, and why not. Each refusal is a
 * question with no answer; firing anyway would give a meaningless number.
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
    // A radius the orbit never reaches would never fire; refuse now.
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

// Above: arithmetic, testable without a simulation. Below: the one live watch.

/** The watch, or null when nothing is armed. */
let watch = null;
/** Step-hook release, called on disarm. */
let unsubscribe = null;
/** The last event that fired, for the readout and the timeline marker. */
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
    // Signal at the previous step; null until the first step.
    previous: null,
    // Transits logged at arm time, so only a new one counts.
    transitsAtArm: deps.transitLog ? deps.transitLog().length : 0,
    armedAtDays: deps.clockDays(),
  };

  // The step's arguments are unused; the clock is read in days via deps.clockDays().
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

  // The target was merged, absorbed or removed: disarm and say why.
  if (!state) {
    disarm('targetGone');
    return;
  }

  // The viewing direction comes in through deps.losRate, so this file knows
  // nothing about spectrographs; without it eventSignal returns null (unknownKind).
  if (
    spec.kind === EVENT_KINDS.RV_MINIMUM ||
    spec.kind === EVENT_KINDS.RV_MAXIMUM
  ) {
    state.vlosDot = deps.losRate ? deps.losRate(body, primary) : NaN;
  }

  const signal = eventSignal(spec.kind, state, spec.separation);
  if (!signal) {
    disarm('unknownKind');
    return;
  }

  const sample = { t: nowDays, value: signal.value };
  const before = watch.previous;

  // The clock advances once per frame but this runs per substep, so samples
  // repeat timestamps and would bracket a crossing to zero elapsed time. Keep one
  // sample per distinct clock reading: the bracket is then the frame, and the
  // crossing is reported at the end of that frame, inside the quoted bracket.
  if (before && sample.t === before.t) return;

  watch.previous = sample;
  if (!before) return;

  // A backwards clock means a timeline scrub; the stored sample is stale.
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
 * A transit watch, which reads the photometer's detector. The mid-time is only
 * known once the transit ends, so this fires about half a duration late; that
 * is reported as the overshoot.
 *
 * @param {number} nowDays - The clock now
 */
function stepTransit(nowDays) {
  const log = watch.deps.transitLog ? watch.deps.transitLog() : [];
  if (log.length <= watch.transitsAtArm) return;

  const latest = log[log.length - 1];
  if (!latest || !Number.isFinite(latest.mid)) {
    // No usable mid-time: not an event to stop on.
    watch.transitsAtArm = log.length;
    return;
  }
  fire({
    kind: EVENT_KINDS.TRANSIT,
    timeDays: latest.mid,
    // The transit is localised only to its duration.
    bracketDays: Number.isFinite(latest.duration) ? latest.duration : 0,
    overshootDays: nowDays - latest.mid,
    detail: { depth: latest.depth, duration: latest.duration, seq: latest.seq },
  });
}

/**
 * Record the event, stop the simulation, and tell everyone. Nothing is rewound
 * (see the head of the file).
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
 * Attach a student's note to the event that fired, so exports need not know
 * about the panel.
 *
 * @param {string} text - The note
 */
export function annotateLastEvent(text) {
  if (!fired) return;
  fired.note = String(text ?? '').slice(0, 280);
  announce({ type: 'annotated', event: { ...fired } });
}

/**
 * Drop everything on a world rebuild: a rebuilt world reuses ids for different
 * objects, so a surviving watch would watch the wrong body.
 */
export function resetPauseAtEvent() {
  disarm('worldReset');
  fired = null;
  announce({ type: 'cleared' });
}
