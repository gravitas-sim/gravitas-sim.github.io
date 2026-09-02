// =============================================================================
// Reference frames
// -----------------------------------------------------------------------------
// A simulation always integrates in one frame - here, the world frame the
// scenario was built in - but a measurement is only meaningful once you say what
// it is measured against. This module lets the view be re-expressed in the frame
// of the system barycenter or of any single body, and it does so for history as
// well as for the present.
//
// That last part is the whole point, and it is what "Follow Mode" never did.
// Following a body translates the camera: the body sits still on screen while
// every trail behind it stays in world coordinates, so the picture is a moving
// window onto an unchanged drawing. Re-expressing the frame subtracts the
// origin's position *at the time each trail point was recorded*, so the trails
// themselves are redrawn as the paths that frame would have seen.
//
// Put the Solar System into Earth's frame and Mars stops orbiting the Sun and
// starts drawing a loop with a cusp in it. Nothing was added to the physics to
// make that happen; it was always there in the recorded positions, waiting for
// someone to subtract the right thing. It is also, quite literally, the
// observation that cost astronomy fourteen centuries of epicycles.
//
// The module holds no DOM and imports nothing, so it can be tested directly and
// used from physics, render and ui without a cycle.
// =============================================================================

/** Positions as the scenario integrates them. No transform. */
export const WORLD = 'world';
/** The mass-weighted center of the whole system. */
export const BARYCENTER = 'barycenter';
/** A single body, named by id. */
export const OBJECT = 'object';

const DEFAULT_FRAME = { mode: WORLD, objectId: null };

let frame = { ...DEFAULT_FRAME };
const listeners = new Set();

// Recorded barycenter positions, one per trail sample, oldest first. Kept here
// rather than recomputed from the bodies' trails because masses change when
// things merge, and a barycenter computed from today's masses and last week's
// positions is a barycenter of nothing.
let barycenterHistory = [];

/**
 * Tell every listener the frame changed.
 *
 * A listener that throws is reported and skipped, so one broken panel cannot
 * stop the others from redrawing.
 */
function notify() {
  for (const fn of listeners) {
    try {
      fn(frameState());
    } catch (err) {
      console.warn('Reference frame listener failed:', err);
    }
  }
}

/**
 * The current frame, as a copy.
 *
 * @returns {{mode: string, objectId: ?number}} Mode and the body it names
 */
export function frameState() {
  return { ...frame };
}

/** @returns {string} The current mode */
export function frameMode() {
  return frame.mode;
}

/** @returns {?number} The id of the body the frame is tied to, if any */
export function frameObjectId() {
  return frame.objectId;
}

/** @returns {boolean} True when no transform is being applied */
export function isWorldFrame() {
  return frame.mode === WORLD;
}

/**
 * Choose a reference frame.
 *
 * Asking for an object frame without naming a body is a request that cannot be
 * honored, so it falls back to the world frame rather than leaving the view in
 * a state with no origin.
 *
 * @param {string} mode - WORLD, BARYCENTER or OBJECT
 * @param {?number} [objectId] - Required for OBJECT
 * @returns {{mode: string, objectId: ?number}} The frame actually set
 */
export function setFrame(mode, objectId = null) {
  let next;
  if (mode === OBJECT && (objectId === null || objectId === undefined)) {
    next = { mode: WORLD, objectId: null };
  } else if (mode === OBJECT) {
    next = { mode: OBJECT, objectId };
  } else if (mode === BARYCENTER) {
    next = { mode: BARYCENTER, objectId: null };
  } else {
    next = { mode: WORLD, objectId: null };
  }

  if (next.mode === frame.mode && next.objectId === frame.objectId) return;
  frame = next;
  notify();
}

/** Return to the world frame. */
export function resetFrame() {
  setFrame(WORLD);
}

/**
 * Subscribe to frame changes.
 *
 * @param {Function} fn - Called with the new frame state
 * @returns {Function} Unsubscribe
 */
export function onFrameChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The mass-weighted center of a set of bodies.
 *
 * @param {Array<{pos: {x: number, y: number}, mass: number, alive?: boolean}>} bodies - Bodies
 * @returns {?{x: number, y: number}} The barycenter, or null if there is no mass
 */
export function systemBarycenter(bodies) {
  let mx = 0;
  let my = 0;
  let total = 0;
  for (const body of bodies) {
    if (!body || body.alive === false) continue;
    const m = body.mass;
    if (!(m > 0)) continue;
    mx += body.pos.x * m;
    my += body.pos.y * m;
    total += m;
  }
  return total > 0 ? { x: mx / total, y: my / total } : null;
}

/**
 * Record where the barycenter was at one trail sample.
 *
 * Called from the physics step, in the same pass that appends to every body's
 * trail, so the histories stay in lockstep by tick.
 *
 * @param {number} tick - The trail tick this sample belongs to
 * @param {Array} bodies - Bodies to average
 * @param {number} budget - How many samples to keep
 */
export function recordBarycenter(tick, bodies, budget) {
  const center = systemBarycenter(bodies);
  if (!center) return;
  barycenterHistory.push({ tick, x: center.x, y: center.y });
  const keep = Math.max(1, Math.floor(budget) || 1);
  if (barycenterHistory.length > keep) {
    barycenterHistory.splice(0, barycenterHistory.length - keep);
  }
}

/** Drop the recorded barycenter history. Called when the world is rebuilt. */
export function clearFrameHistory() {
  barycenterHistory = [];
}

/**
 * The recorded barycenter samples, oldest first.
 *
 * @returns {Array<{tick: number, x: number, y: number}>} The history
 */
export function barycenterSamples() {
  return barycenterHistory;
}

/**
 * Find the sample taken at a given tick.
 *
 * Samples are appended one per tick, so the tick doubles as an index offset and
 * the usual case is a single subtraction. The result is verified rather than
 * trusted: a body that was not alive for part of the window leaves a gap, and
 * returning a neighboring sample there would draw a trail in a frame that never
 * existed. A miss falls back to a binary search, and only then gives up.
 *
 * @param {Array<{tick: number}>} samples - Ascending by tick
 * @param {number} tick - The tick wanted
 * @returns {?object} The sample, or null when that tick was not recorded
 */
export function sampleAtTick(samples, tick) {
  if (!samples || samples.length === 0) return null;
  const guess = tick - samples[0].tick;
  if (guess >= 0 && guess < samples.length && samples[guess].tick === tick) {
    return samples[guess];
  }
  let lo = 0;
  let hi = samples.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = samples[mid].tick;
    if (t === tick) return samples[mid];
    if (t < tick) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

/**
 * Resolve the frame into something the renderer can subtract.
 *
 * Returns null for the world frame, which is the signal to draw exactly as
 * before: no transform, no allocation, no per-point work.
 *
 * @param {Array} bodies - Every live body, for the barycenter and the id lookup
 * @returns {?{now: {x: number, y: number}, at: Function, label: string}}
 *   Where the origin is now, where it was at a given tick, and what to call it
 */
export function resolveFrameOrigin(bodies) {
  if (frame.mode === WORLD) return null;

  if (frame.mode === BARYCENTER) {
    const now = systemBarycenter(bodies);
    if (!now) return null;
    return {
      now,
      at: tick => sampleAtTick(barycenterHistory, tick),
      label: 'Barycenter',
    };
  }

  const body = bodies.find(b => b && b.id === frame.objectId);
  // The body can be absorbed or culled while its frame is selected. Falling
  // back to the world frame is the only honest answer: there is no origin.
  if (!body || body.alive === false) return null;
  return {
    now: { x: body.pos.x, y: body.pos.y },
    at: tick => sampleAtTick(body.trail, tick),
    label: body.name || 'Selected object',
  };
}

/**
 * The velocity of the frame's origin.
 *
 * A frame that re-expresses positions and says nothing about velocities leaves
 * the inspector reporting that Earth moves at 29.8 km/s while the view has Earth
 * sitting perfectly still. This is the number that resolves that.
 *
 * @param {Array} bodies - Every body with mass, for the barycenter and the lookup
 * @returns {?{x: number, y: number}} The origin's velocity, or null in the world
 *   frame or when the origin has gone
 */
export function frameOriginVelocity(bodies) {
  if (frame.mode === WORLD) return null;

  if (frame.mode === BARYCENTER) {
    let mx = 0;
    let my = 0;
    let total = 0;
    for (const b of bodies) {
      if (!b || b.alive === false || !(b.mass > 0) || !b.vel) continue;
      mx += b.vel.x * b.mass;
      my += b.vel.y * b.mass;
      total += b.mass;
    }
    return total > 0 ? { x: mx / total, y: my / total } : null;
  }

  const body = bodies.find(b => b && b.id === frame.objectId);
  if (!body || body.alive === false || !body.vel) return null;
  return { x: body.vel.x, y: body.vel.y };
}

/**
 * Per-tick offsets to add to trail points so they land in the frame.
 *
 * A trail point recorded at tick t should be drawn where it was relative to the
 * origin *then*, but the canvas has already been translated by where the origin
 * is *now*. The difference between those two is the correction, and it depends
 * only on the tick, so it is the same for every body and worth computing once
 * per rendered frame instead of once per point.
 *
 * @param {object} origin - From resolveFrameOrigin
 * @param {number} newestTick - The tick of the most recent sample
 * @param {number} span - How many ticks back to cover
 * @returns {{dx: Float64Array, dy: Float64Array, known: Uint8Array}} Indexed by
 *   ticks-ago, with known[k] = 0 where the origin has no sample for that tick
 */
export function frameShifts(origin, newestTick, span) {
  const n = Math.max(1, span);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const known = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const sample = origin.at(newestTick - k);
    if (!sample) continue;
    dx[k] = origin.now.x - sample.x;
    dy[k] = origin.now.y - sample.y;
    known[k] = 1;
  }
  return { dx, dy, known };
}

/** Reset frame and history. For tests and for a fresh world. */
export function resetFrameModule() {
  frame = { ...DEFAULT_FRAME };
  barycenterHistory = [];
  listeners.clear();
}
