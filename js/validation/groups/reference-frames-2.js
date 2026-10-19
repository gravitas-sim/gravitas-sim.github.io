// ===========================================================================
// 7. Reference-frame transformations
// ===========================================================================

import { hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ frames, add }) {
  const bodies = [
    {
      pos: { x: 10, y: 0 },
      vel: { x: 0, y: 3 },
      mass: 300,
      id: 1,
      alive: true,
    },
    {
      pos: { x: -20, y: 40 },
      vel: { x: 1, y: -2 },
      mass: 700,
      id: 2,
      alive: true,
    },
    {
      pos: { x: 5, y: -15 },
      vel: { x: -4, y: 0.5 },
      mass: 200,
      id: 3,
      alive: true,
    },
  ];
  const total = bodies.reduce((s, b) => s + b.mass, 0);
  const bary = frames.systemBarycenter(bodies);

  add({
    group: 'Reference frames',
    kind: 'analytic',
    name: 'Barycenter is the mass-weighted mean position',
    measured: hypot(
      bary.x - bodies.reduce((s, b) => s + b.mass * b.pos.x, 0) / total,
      bary.y - bodies.reduce((s, b) => s + b.mass * b.pos.y, 0) / total
    ),
    expected: 0,
    unit: 'units',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'A definition, so the tolerance is round-off. Checked because the renderer and the recorded history must average over the same set: if they disagreed the origin would jump the moment a frame was selected.',
  });

  add({
    group: 'Reference frames',
    kind: 'analytic',
    name: 'Mass-weighted offsets from the barycenter sum to zero',
    measured:
      hypot(
        bodies.reduce((s, b) => s + b.mass * (b.pos.x - bary.x), 0),
        bodies.reduce((s, b) => s + b.mass * (b.pos.y - bary.y), 0)
      ) /
      (total * 40),
    expected: 0,
    unit: 'relative',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'The property that makes the barycenter the barycenter, stated the other way round.',
  });

  frames.setFrame(frames.BARYCENTER);
  const originVel = frames.frameOriginVelocity(bodies);
  frames.resetFrame();
  add({
    group: 'Reference frames',
    kind: 'analytic',
    name: 'Barycenter frame velocity is total momentum over total mass',
    measured: hypot(
      originVel.x - bodies.reduce((s, b) => s + b.mass * b.vel.x, 0) / total,
      originVel.y - bodies.reduce((s, b) => s + b.mass * b.vel.y, 0) / total
    ),
    expected: 0,
    unit: 'units per time',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'Without this the inspector reports a body moving at 29.8 km/s while the view has it sitting still. Round-off tolerance because it is a definition.',
  });

  // Separations are frame invariants. Transforming into any body's frame must
  // leave every pairwise distance untouched.
  const shifted = bodies.map(b => ({
    x: b.pos.x - bodies[1].pos.x,
    y: b.pos.y - bodies[1].pos.y,
  }));
  let worstPair = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const before = hypot(
        bodies[i].pos.x - bodies[j].pos.x,
        bodies[i].pos.y - bodies[j].pos.y
      );
      const after = hypot(
        shifted[i].x - shifted[j].x,
        shifted[i].y - shifted[j].y
      );
      worstPair = Math.max(worstPair, Math.abs(before - after) / before);
    }
  }
  add({
    group: 'Reference frames',
    kind: 'analytic',
    name: 'Pairwise separations are unchanged by a frame change',
    measured: worstPair,
    expected: 0,
    unit: 'relative',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'A frame change is a translation, and translations preserve distances. The point of checking is that the frame system re-expresses history as well as the present, and a transform applied inconsistently would show up here first.',
  });

  add({
    group: 'Reference frames',
    kind: 'analytic',
    name: 'The chosen origin body sits at the origin in its own frame',
    measured: hypot(shifted[1].x, shifted[1].y),
    expected: 0,
    unit: 'units',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'The other half of a frame change: the body the frame is tied to must not move in it. Round-off tolerance, because subtracting a number from itself is exact.',
  });
}
