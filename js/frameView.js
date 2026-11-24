// =============================================================================
// The frame the picture is drawn in, resolved once per drawn frame
// -----------------------------------------------------------------------------
// Moved out of js/render.js: the frame's resolution (origin, and for the
// rotating frame its turn) and the trail projection with its pools. Everything
// downstream reads state.frameOffset and state.frameRotation - the canvas
// transform, the shared mapping (worldToScreen in js/utils.js) for labels,
// hit-testing and overlays, the follow camera - so choosing a frame needs no
// second code path anywhere. The world frame resolves to null and writes
// zeroes and no rotation, which is exactly the old behavior.
// =============================================================================

import {
  resolveFrameOrigin,
  frameShifts,
  isWorldFrame,
  resetFrame,
  noteTrailGap,
} from './referenceFrame.js';

/**
 * Resolve the frame for the picture about to be drawn and write it into the
 * view state.
 *
 * @param {object} view - The shared view state (state in js/appState.js)
 * @param {Array} bodies - Every body with mass (barycenterBodies())
 * @returns {?object} The resolved origin (resolveFrameOrigin), or null
 */
export function resolveView(view, bodies) {
  let origin = resolveFrameOrigin(bodies);
  if (!origin && !isWorldFrame()) {
    // The body the frame was tied to has been absorbed, merged or culled. There
    // is no origin any more, so say so and fall back rather than leaving the
    // rail claiming a frame that no longer exists.
    resetFrame();
    origin = null;
  }
  view.frameOffset.x = origin ? origin.now.x : 0;
  view.frameOffset.y = origin ? origin.now.y : 0;
  view.frameRotation = origin?.rotation || null;
  return origin;
}

/**
 * The per-tick corrections for this picture's trails, or null in the world
 * frame. Also forgets the last picture's trail gap; framedTrail notes a new one.
 *
 * @param {?object} origin - From resolveView
 * @param {number} newestTick - The newest trail tick
 * @param {number} span - How many ticks back to cover
 * @returns {?object} From frameShifts
 */
export function trailShifts(origin, newestTick, span) {
  noteTrailGap(false);
  return origin ? frameShifts(origin, newestTick, span) : null;
}

// --- Reference-frame trail projection -----------------------------------------
// Trails are recorded in world coordinates. To draw them in another frame every
// point has to be moved by where that frame's origin was *when the point was
// recorded*, which no single canvas transform can express. These two pools let
// that happen without allocating on the render path: framedTrail refills them
// each time it is called and the caller draws before calling it again.
const framedPointPool = [];
const framedTrailView = [];

/**
 * A trail as the current reference frame would have seen it. Points older than
 * the origin's own history cannot be expressed in that frame and are left out,
 * and the frame line says so (noteTrailGap, read by js/sceneStatement.js).
 *
 * In the rotating frame each point is also turned about the origin now by the
 * angle the pair has turned since it was recorded, so that under the canvas's
 * own turn it lands where the frame saw it then.
 *
 * @param {Array} trail - The body's recorded trail, oldest first
 * @param {?object} shifts - From trailShifts, or null in the world frame
 * @param {number} newestTick - Tick the shifts are indexed against
 * @returns {Array} The trail itself in the world frame, or a reused view
 */
export function framedTrail(trail, shifts, newestTick) {
  if (!shifts) return trail;

  // The unknown region is always a prefix - the origin's history is shorter, not
  // holed - so one scan back from the newest point finds where drawing starts.
  let start = 0;
  for (let i = trail.length - 1; i >= 0; i--) {
    const k = newestTick - trail[i].tick;
    if (k < 0 || k >= shifts.known.length || !shifts.known[k]) {
      start = i + 1;
      break;
    }
  }
  // Two points or more left out of a trail that is drawn: a gap worth saying.
  if (start > 1 && trail.length - start > 1) noteTrailGap(true);

  const turn = shifts.cos;
  const now = shifts.now;
  framedTrailView.length = 0;
  for (let i = start; i < trail.length; i++) {
    const p = trail[i];
    const k = newestTick - p.tick;
    let q = framedPointPool[framedTrailView.length];
    if (!q) {
      q = { x: 0, y: 0, age: 0, velocity: 0 };
      framedPointPool.push(q);
    }
    if (turn) {
      const ux = p.x + shifts.dx[k] - now.x;
      const uy = p.y + shifts.dy[k] - now.y;
      q.x = now.x + turn[k] * ux - shifts.sin[k] * uy;
      q.y = now.y + shifts.sin[k] * ux + turn[k] * uy;
    } else {
      q.x = p.x + shifts.dx[k];
      q.y = p.y + shifts.dy[k];
    }
    q.age = p.age;
    q.velocity = p.velocity;
    framedTrailView.push(q);
  }
  return framedTrailView;
}
