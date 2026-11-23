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
// Two more frames are built on a chosen pair of bodies: the pair's own
// barycenter, and a frame that turns with the pair (origin at that barycenter,
// +x along the line from the heavier body A to the lighter B), the frame the
// restricted three-body problem is posed in (js/cr3bp.js). Their histories
// are recorded per trail tick only while one of them is chosen.
//
// The body a reader follows by id is held here too, beside the frame it
// composes with, so the engine can read it without reaching for the view.
//
// The module holds no DOM and imports nothing but the message lookup, so it
// can be tested directly and used from physics, render and ui without a cycle.
// =============================================================================

import { t } from './i18n/index.js';

/** Positions as the scenario integrates them. No transform. */
export const WORLD = 'world';
/** The mass-weighted center of the whole system. */
export const BARYCENTER = 'barycenter';
/** A single body, named by id. */
export const OBJECT = 'object';
/** The mass-weighted center of two bodies, named by id, heavier first. */
export const PAIR = 'pair';
/** The pair's barycenter, turned so that +x runs from A to B. */
export const ROTATING = 'rotating';

/** Frames a link carries (js/world.js writes the world frame for the rest). */
export const LINKED_MODES = Object.freeze([WORLD, BARYCENTER, OBJECT]);

const DEFAULT_FRAME = { mode: WORLD, objectId: null };

let frame = { ...DEFAULT_FRAME, pair: null };
const listeners = new Set();

// The pair frames' history, one sample per trail tick while a pair frame is
// chosen: its center and the unit vector from A to B. Cleared on every change
// of frame, so a sample always belongs to the pair now chosen.
let pairHistory = [];

// Whether the last drawn frame had to leave out part of a trail because the
// frame's origin was not recorded then. Read by the frame line on the canvas.
let trailGap = false;

// The body followed by id, if any. See followBody().
let followed = null;
const followListeners = new Set();

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
  const out = { mode: frame.mode, objectId: frame.objectId };
  if (frame.pair) out.pair = [...frame.pair];
  return out;
}

/** @returns {?Array<number>} The ids of a pair frame's bodies, A then B */
export function framePair() {
  return frame.pair ? [...frame.pair] : null;
}

/** @returns {boolean} Whether the frame turns (the rotating pair frame) */
export const isRotatingFrame = () => frame.mode === ROTATING;

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
 * The pair frames take two different ids, the heavier body first; anything
 * else falls back to the world frame, as an object frame without a body does.
 * An unknown mode (a link from a later build) is the world frame too.
 *
 * @param {string} mode - WORLD, BARYCENTER, OBJECT, PAIR or ROTATING
 * @param {?number|Array<number>} [objectId] - A body for OBJECT; [A, B] for
 *   PAIR and ROTATING
 * @returns {{mode: string, objectId: ?number}} The frame actually set
 */
export function setFrame(mode, objectId = null) {
  let next = { mode: WORLD, objectId: null, pair: null };
  if (mode === OBJECT && objectId !== null && objectId !== undefined) {
    next = { mode: OBJECT, objectId, pair: null };
  } else if (mode === BARYCENTER) {
    next = { mode: BARYCENTER, objectId: null, pair: null };
  } else if (
    (mode === PAIR || mode === ROTATING) &&
    Array.isArray(objectId) &&
    objectId.length === 2 &&
    objectId.every(id => id !== null && id !== undefined) &&
    objectId[0] !== objectId[1]
  ) {
    next = { mode, objectId: null, pair: [objectId[0], objectId[1]] };
  }

  const samePair =
    String(next.pair) === String(frame.pair) && !next.pair === !frame.pair;
  if (next.mode === frame.mode && next.objectId === frame.objectId && samePair)
    return;
  frame = next;
  pairHistory = [];
  trailGap = false;
  notify();
}

/** Return to the world frame. */
export function resetFrame() {
  setFrame(WORLD);
}

/**
 * Move an object frame from a body that no longer exists onto what replaced it.
 *
 * A reader watching a binary from one of its black holes is watching a place,
 * not an id. When the two merge, that black hole stops existing and
 * resolveFrameOrigin() correctly answers "there is no origin" - at which point
 * the view snaps back to the world origin, tens of thousands of units away in a
 * scenario like Binary BH. That snap is the one visible symptom of a merger for
 * anyone in an object frame, and it happens at exactly the moment they were
 * watching for.
 *
 * The merger product is the honest continuation of both progenitors: it carries
 * their combined mass and sits at their combined position. Following it keeps
 * the camera where the reader put it.
 *
 * A no-op for anyone in the world or barycenter frame, which is the majority
 * and which must not be disturbed by a merger somewhere in the scene.
 *
 * @param {Array<number>} fromIds - The ids that have gone
 * @param {?number} toId - What replaced them, if anything
 * @returns {boolean} True if the frame was moved
 */
export function transferFrame(fromIds, toId) {
  if (!Array.isArray(fromIds)) return false;
  if (toId === null || toId === undefined) return false;
  if (frame.pair) {
    // A pair whose member merged. Into the other member: the pair is one body
    // now, and the honest continuation is a frame centered on it. Into a new
    // body beside a member that is still there: the new body takes its place.
    const [a, b] = frame.pair;
    const goneA = fromIds.includes(a);
    const goneB = fromIds.includes(b);
    if (!goneA && !goneB) return false;
    if ((goneA && goneB) || toId === a || toId === b) {
      setFrame(OBJECT, toId);
    } else {
      setFrame(frame.mode, goneA ? [toId, b] : [a, toId]);
    }
    return true;
  }
  if (frame.mode !== OBJECT) return false;
  if (!fromIds.includes(frame.objectId)) return false;
  setFrame(OBJECT, toId);
  return true;
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
  const keep = Math.max(1, Math.floor(budget) || 1);
  // The pair frames' history, only while one is chosen: nothing is recorded,
  // and nothing costs, for anyone else.
  if (frame.pair) {
    const pose = pairPose(findPair(bodies));
    if (pose) {
      pairHistory.push({ tick, x: pose.x, y: pose.y, c: pose.c, s: pose.s });
      if (pairHistory.length > keep)
        pairHistory.splice(0, pairHistory.length - keep);
    }
  }
  const center = systemBarycenter(bodies);
  if (!center) return;
  barycenterHistory.push({ tick, x: center.x, y: center.y });
  if (barycenterHistory.length > keep) {
    barycenterHistory.splice(0, barycenterHistory.length - keep);
  }
}

/** Drop the recorded frame histories. Called when the world is rebuilt. */
export function clearFrameHistory() {
  barycenterHistory = [];
  pairHistory = [];
  trailGap = false;
  // Ids restart with a new world, so a follow by id would pick up a stranger.
  followBody(null, 'reset');
}

/** @returns {Array<object>} The pair frames' samples, oldest first */
export const pairSamples = () => pairHistory;

/**
 * The chosen pair's two bodies, A then B, both alive and with mass.
 * @param {Array} bodies - Bodies to look in
 * @returns {?Array<object>} [A, B], or null when either has gone
 */
function findPair(bodies) {
  if (!frame.pair) return null;
  let a = null;
  let b = null;
  for (const body of bodies) {
    if (!body || body.alive === false) continue;
    if (body.id === frame.pair[0]) a = body;
    else if (body.id === frame.pair[1]) b = body;
  }
  return a && b && a.mass > 0 && b.mass > 0 ? [a, b] : null;
}

/**
 * Where a pair's frame sits and which way it faces.
 *
 * @param {?Array<object>} pair - [A, B]
 * @returns {?{x: number, y: number, c: number, s: number}} The mass-weighted
 *   center, and the unit vector from A to B (1, 0 when they coincide)
 */
export function pairPose(pair) {
  if (!pair) return null;
  const [a, b] = pair;
  const m = a.mass + b.mass;
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const d = Math.hypot(dx, dy);
  return {
    x: (a.pos.x * a.mass + b.pos.x * b.mass) / m,
    y: (a.pos.y * a.mass + b.pos.y * b.mass) / m,
    c: d > 0 ? dx / d : 1,
    s: d > 0 ? dy / d : 0,
  };
}

/**
 * A position in the frame's own coordinates: less the origin, and for the
 * rotating frame turned by minus its angle, so A and B sit on the +x axis.
 *
 * @param {{x: number, y: number}} pos - World position
 * @param {?object} origin - From resolveFrameOrigin
 * @returns {{x: number, y: number}} The position in the frame
 */
export function toFrameCoords(pos, origin) {
  if (!origin) return { x: pos.x, y: pos.y };
  const dx = pos.x - origin.now.x;
  const dy = pos.y - origin.now.y;
  const r = origin.rotation;
  if (!r) return { x: dx, y: dy };
  return { x: r.cos * dx + r.sin * dy, y: -r.sin * dx + r.cos * dy };
}

/**
 * Note whether the last drawn frame left out part of a trail.
 * @param {boolean} cut - True when a trail had points older than the origin
 */
export function noteTrailGap(cut) {
  trailGap = !!cut;
}

/** @returns {boolean} Whether a trail is shown shorter than it is recorded */
export const hasTrailGap = () => trailGap;

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
      label: t('frame.barycenter'),
    };
  }

  if (frame.pair) {
    const pair = findPair(bodies);
    const pose = pairPose(pair);
    if (!pose) return null;
    const rotating = frame.mode === ROTATING;
    return {
      now: { x: pose.x, y: pose.y },
      at: tick => sampleAtTick(pairHistory, tick),
      ...(rotating && { rotation: { cos: pose.c, sin: pose.s } }),
      label: `${pair[0].name || ''} / ${pair[1].name || ''}`,
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

  if (frame.pair) {
    const pair = findPair(bodies);
    if (!pair || !pair[0].vel || !pair[1].vel) return null;
    const [a, b] = pair;
    const m = a.mass + b.mass;
    return {
      x: (a.vel.x * a.mass + b.vel.x * b.mass) / m,
      y: (a.vel.y * a.mass + b.vel.y * b.mass) / m,
    };
  }

  const body = bodies.find(b => b && b.id === frame.objectId);
  if (!body || body.alive === false || !body.vel) return null;
  return { x: body.vel.x, y: body.vel.y };
}

/**
 * A body's velocity as the frame measures it, in the frame's own axes.
 *
 * For a translating frame that is the velocity less the origin's. The
 * rotating frame also takes away the frame's own turning, omega x r, with
 * omega the pair's angular rate (r x v of B about A, over r squared), and
 * turns the result into the frame's axes: a tracer resting at L4 reads zero.
 *
 * @param {{pos: object, vel: object}} body - The body
 * @param {Array} bodies - Every body with mass
 * @returns {?{x: number, y: number}} The velocity, or null in the world frame
 *   or when the frame's origin has gone
 */
export function velocityInFrame(body, bodies) {
  if (!body?.vel || frame.mode === WORLD) return null;
  const v0 = frameOriginVelocity(bodies);
  if (!v0) return null;
  const vx = body.vel.x - v0.x;
  const vy = body.vel.y - v0.y;
  if (frame.mode !== ROTATING) return { x: vx, y: vy };
  const pair = findPair(bodies);
  const pose = pairPose(pair);
  const [a, b] = pair;
  const rx = b.pos.x - a.pos.x;
  const ry = b.pos.y - a.pos.y;
  const r2 = rx * rx + ry * ry;
  const omega =
    r2 > 0 ? (rx * (b.vel.y - a.vel.y) - ry * (b.vel.x - a.vel.x)) / r2 : 0;
  const px = body.pos.x - pose.x;
  const py = body.pos.y - pose.y;
  const wx = vx + omega * py;
  const wy = vy - omega * px;
  return { x: pose.c * wx + pose.s * wy, y: -pose.s * wx + pose.c * wy };
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
 * The rotating frame adds the turn each point needs: a point recorded when
 * the pair faced angle th_k is drawn turned by th_now - th_k about the origin
 * now, so that under the canvas's own turn by -th_now it lands where the
 * frame saw it then (cos and sin of that difference, from the recorded unit
 * vectors).
 *
 * @param {object} origin - From resolveFrameOrigin
 * @param {number} newestTick - The tick of the most recent sample
 * @param {number} span - How many ticks back to cover
 * @returns {{dx: Float64Array, dy: Float64Array, known: Uint8Array,
 *   now: object, cos?: Float64Array, sin?: Float64Array}} Indexed by
 *   ticks-ago, with known[k] = 0 where the origin has no sample for that tick
 */
export function frameShifts(origin, newestTick, span) {
  const n = Math.max(1, span);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const known = new Uint8Array(n);
  const r = origin.rotation;
  const cos = r ? new Float64Array(n) : null;
  const sin = r ? new Float64Array(n) : null;
  for (let k = 0; k < n; k++) {
    const sample = origin.at(newestTick - k);
    if (!sample) continue;
    dx[k] = origin.now.x - sample.x;
    dy[k] = origin.now.y - sample.y;
    known[k] = 1;
    if (r) {
      cos[k] = r.cos * sample.c + r.sin * sample.s;
      sin[k] = r.sin * sample.c - r.cos * sample.s;
    }
  }
  return r
    ? { dx, dy, known, now: origin.now, cos, sin }
    : { dx, dy, known, now: origin.now };
}

// --- Following a body by id --------------------------------------------------
// Follow Mode chooses a body by its type; this names one. The two are
// exclusive (whoever sets one clears the other: js/inspectorView.js here, the
// engine there), and both use the same camera (js/followCamera.js).

/** @returns {?number} The id of the body followed by id, if any */
export const followedBodyId = () => followed;

/**
 * Follow a body, or stop (null). Listeners hear why: 'set', 'stop', 'merged'
 * (moved to a merger's product) or 'lost' (the body has gone).
 *
 * @param {?number} id - The body's id
 * @param {string} [why] - Why it changed
 * @param {object} [detail] - Passed on to listeners (a lost body's name)
 */
export function followBody(id, why = id === null ? 'stop' : 'set', detail) {
  const next = id === null || id === undefined ? null : id;
  if (next === followed) return;
  followed = next;
  for (const fn of followListeners) {
    try {
      fn({ id: followed, why, ...detail });
    } catch (err) {
      console.warn('Follow listener failed:', err);
    }
  }
}

/**
 * Move a follow from a merged body to the product, as transferFrame does.
 * @param {Array<number>} fromIds - The ids that have gone
 * @param {?number} toId - What replaced them
 * @returns {boolean} True if the follow moved
 */
export function transferFollow(fromIds, toId) {
  if (followed === null || toId === null || toId === undefined) return false;
  if (!Array.isArray(fromIds) || !fromIds.includes(followed)) return false;
  followBody(toId, 'merged');
  return true;
}

/**
 * Subscribe to the follow changing.
 * @param {Function} fn - Called with {id, why}
 * @returns {Function} Unsubscribe
 */
export function onFollowChange(fn) {
  followListeners.add(fn);
  return () => followListeners.delete(fn);
}

/** Reset frame and history. For tests and for a fresh world. */
export function resetFrameModule() {
  frame = { ...DEFAULT_FRAME, pair: null };
  barycenterHistory = [];
  pairHistory = [];
  trailGap = false;
  followed = null;
  listeners.clear();
  followListeners.clear();
}
