// =============================================================================
// Positions and velocities in the reference frame
// -----------------------------------------------------------------------------
// What the inspector reads beside a body's world position and velocity while a frame is
// active. Kept out of js/referenceFrame.js, which is on the start-up path: only
// the inspector, which loads on the first selection, asks it.
// =============================================================================

import {
  WORLD,
  ROTATING,
  frameMode,
  framePair,
  pairPose,
  frameOriginVelocity,
} from './referenceFrame.js';

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
  const mode = frameMode();
  if (!body?.vel || mode === WORLD) return null;
  const v0 = frameOriginVelocity(bodies);
  if (!v0) return null;
  const vx = body.vel.x - v0.x;
  const vy = body.vel.y - v0.y;
  if (mode !== ROTATING) return { x: vx, y: vy };
  const ids = framePair();
  const a = bodies.find(x => x && x.id === ids[0]);
  const b = bodies.find(x => x && x.id === ids[1]);
  const pose = pairPose([a, b]);
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
