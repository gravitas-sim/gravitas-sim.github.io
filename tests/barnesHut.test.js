// =============================================================================
// The Barnes-Hut tree, at the edges the validation suite cannot reach
// -----------------------------------------------------------------------------
// tools/physics-checks.mjs measures this solver where it is used: a Plummer
// cluster, opening angles between 0.2 and 0.7, thousands of bodies. Mutation
// testing against that suite found two guards in js/barnesHut.js that it cannot
// exercise at all - deleting either one changes not a single bit of the output
// across the whole grid - and both are guards against a body attracting itself,
// which is the one failure a gravity solver must not have.
//
//   the self-index check    unreachable because a target that is also a source
//                           sits exactly on its own leaf's center of mass, so
//                           the zero-distance branch returns first
//   the containment check   unreachable because a point inside a square cell of
//                           side s is at most s*sqrt(2) from any point in it,
//                           so a containing cell never presents an opening
//                           angle below 1/sqrt(2) = 0.7071
//
// Dead code is not the conclusion. Both become live outside that grid - the
// first in a bucket leaf, the second above theta = 0.7071 - and this file is
// where those cases are constructed deliberately, because a guard nothing tests
// is a guard someone eventually deletes.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { accelAt, buildTree, MAX_TREE_DEPTH } from '../js/barnesHut.js';

const G = 1;
const out = new Float64Array(3);

/** Acceleration on target (tx, ty), with selfIdx excluded. */
const at = (root, tx, ty, selfIdx, theta, minDistSq = 0) => {
  accelAt(root, tx, ty, selfIdx, theta, G, minDistSq, out);
  return { ax: out[0], ay: out[1], phi: out[2] };
};

/** Direct sum over the same bodies, skipping `selfIdx`. */
function direct(x, y, m, tx, ty, selfIdx, minDistSq = 0) {
  let ax = 0;
  let ay = 0;
  for (let j = 0; j < x.length; j++) {
    if (j === selfIdx) continue;
    const dx = x[j] - tx;
    const dy = y[j] - ty;
    let d2 = dx * dx + dy * dy;
    if (d2 === 0) continue;
    if (d2 < minDistSq) d2 = minDistSq;
    const inv = 1 / Math.sqrt(d2);
    const g = (G * m[j]) / d2;
    ax += g * dx * inv;
    ay += g * dy * inv;
  }
  return { ax, ay };
}

const build = (x, y, m) =>
  buildTree(
    Float64Array.from(x),
    Float64Array.from(y),
    Float64Array.from(m),
    x.length
  );

describe('a body never attracts itself', () => {
  test('a target coincident with its own source contributes nothing', () => {
    const x = [0, 10];
    const y = [0, 0];
    const m = [1, 1];
    const root = build(x, y, m);
    const a = at(root, 0, 0, 0, 0.4);
    // Only body 1 pulls, from 10 units away along +x.
    expect(a.ax).toBeCloseTo(1 / 100, 12);
    expect(a.ay).toBe(0);
  });

  test('a bucket leaf is where the guard stops working, and cannot be reached', () => {
    // Past MAX_TREE_DEPTH no further subdivision can separate two bodies, so the
    // node becomes a bucket holding both. Its bodyIndex still names only the
    // FIRST occupant, and that breaks the self-exclusion test in both
    // directions:
    //
    //   target is the first occupant   bodyIndex === selfIdx, so the whole
    //                                  bucket is skipped and the other body's
    //                                  pull is lost
    //   target arrived later           bodyIndex !== selfIdx, so the bucket is
    //                                  collapsed with the target's own mass in
    //                                  its center of mass - measured at 8x the
    //                                  true force below
    //
    // This is recorded rather than fixed because fixing it means giving bucket
    // nodes a membership list, which puts an allocation and a branch into the
    // hot traversal for a case the simulation cannot produce. The test is the
    // claim that it cannot: bucketing needs the two bodies inside one cell at
    // depth MAX_TREE_DEPTH, which is a separation of (root size)/2^48. In a
    // cluster one unit across that is four parts in 10^15, and Gravitas
    // scenarios span hundreds to thousands of units.
    const rootSize = 1.2; // extent 1, padded by 20% in buildTree
    const bucketBelow = rootSize / 2 ** MAX_TREE_DEPTH;
    expect(bucketBelow).toBeLessThan(5e-15);

    const separated = build([0, 1e-14, 1], [0, 0, 0], [1, 1, 1]);
    const leafOf = (n, tx, ty) => {
      while (n.children) {
        n =
          n.children[
            (ty >= n.y + n.h / 2 ? 2 : 0) + (tx >= n.x + n.w / 2 ? 1 : 0)
          ];
      }
      return n;
    };
    // An order of magnitude above the threshold, the tree still separates them.
    expect(leafOf(separated, 0, 0).mass).toBe(1);

    // Below it, it cannot, and this is what that costs.
    const x = [0, 1e-15, 1];
    const bucketed = build(x, [0, 0, 0], [1, 1, 1]);
    expect(leafOf(bucketed, 0, 0).mass).toBe(2);

    accelAt(bucketed, x[0], 0, 0, 0.4, G, 0, out);
    expect(out[0]).toBeCloseTo(1, 9); // only the distant body; the neighbour is lost

    accelAt(bucketed, x[1], 0, 1, 0.4, G, 0, out);
    const truth = -1 / 1e-15 ** 2; // the pull of body 0 alone
    expect(out[0] / truth).toBeCloseTo(8, 6); // its own mass, folded in

    // Both answers are finite, which is the property that keeps a simulation
    // running rather than filling with NaN, and is the reason this is a
    // documented limit rather than a live hazard.
    expect(Number.isFinite(out[0])).toBe(true);
  });

  test('coincident bodies terminate instead of subdividing forever', () => {
    const x = [0, 0, 0, 5];
    const y = [0, 0, 0, 0];
    const m = [1, 1, 1, 1];
    const root = build(x, y, m);
    expect(root).not.toBeNull();
    const a = at(root, 5, 0, 3, 0.4);
    // Three unit masses at the origin, five units away.
    expect(a.ax).toBeCloseTo(-3 / 25, 12);
  });
});

describe('a cell holding the target is never collapsed', () => {
  // Below 1/sqrt(2) the guard cannot fire. Above it, it is the only thing
  // keeping a body out of its own force, so the test runs above it.
  const wide = 1.2;

  test('the force is still the direct sum at theta above 1/sqrt(2)', () => {
    expect(wide).toBeGreaterThan(Math.SQRT1_2);
    // A tight knot off to one side, and the target in the middle of the box, so
    // the root and several of its descendants contain the target while their
    // centers of mass sit close to it.
    const x = [0, 0.02, -0.03, 0.01, 0.9, -0.85];
    const y = [0, -0.01, 0.02, 0.03, 0.8, -0.9];
    const m = [1, 1, 1, 1, 1, 1];
    const root = build(x, y, m);
    for (let i = 0; i < x.length; i++) {
      const a = at(root, x[i], y[i], i, wide);
      const want = direct(x, y, m, x[i], y[i], i);
      // Self-attraction would show up as a force pointing the wrong way or one
      // wildly larger than the truth, not as a rounding difference.
      const mag = Math.hypot(want.ax, want.ay);
      const err = Math.hypot(a.ax - want.ax, a.ay - want.ay) / mag;
      expect(err).toBeLessThan(1);
    }
  });

  test('the total force on an isolated symmetric pair stays antisymmetric', () => {
    // Two equal masses: whatever the tree does, a_0 must be exactly -a_1, and a
    // body folded into its own cell's center of mass would break that first.
    const x = [-3, 3];
    const y = [0, 0];
    const m = [2, 2];
    const root = build(x, y, m);
    const a0 = at(root, -3, 0, 0, wide);
    const a1 = at(root, 3, 0, 1, wide);
    expect(a0.ax).toBeCloseTo(-a1.ax, 15);
    expect(a0.ay).toBeCloseTo(-a1.ay, 15);
  });
});

describe('degenerate inputs', () => {
  test('an empty source list builds no tree and exerts no force', () => {
    expect(
      buildTree(
        new Float64Array(0),
        new Float64Array(0),
        new Float64Array(0),
        0
      )
    ).toBeNull();
    const a = at(null, 1, 2, -1, 0.4);
    expect(a).toEqual({ ax: 0, ay: 0, phi: 0 });
  });

  test('a single source is exact, because a leaf is never an approximation', () => {
    const root = build([0], [0], [4]);
    const a = at(root, 3, 4, -1, 0.7);
    // |r| = 5, a = G m / r^2 = 4/25 toward the origin.
    expect(Math.hypot(a.ax, a.ay)).toBeCloseTo(4 / 25, 12);
    expect(a.phi).toBeCloseTo(-4 / 5, 12);
  });

  test('zero-mass sources are skipped rather than dividing by zero', () => {
    const root = build([0, 10, 20], [0, 0, 0], [0, 1, 0]);
    const a = at(root, 0, 0, -1, 0.4);
    expect(a.ax).toBeCloseTo(1 / 100, 12);
    expect(Number.isFinite(a.phi)).toBe(true);
  });

  test('the softening floor clamps the separation, not the direction', () => {
    // The engine clamps distSq and then normalises by the clamped distance, so
    // inside the floor the direction vector is not a unit vector. That is the
    // shipped behaviour and the direct-sum reference in the validation suite
    // matches it deliberately; if it ever changes, this is where it shows.
    const root = build([0], [0], [1]);
    const near = at(root, 0.5, 0, -1, 0.4, 4); // floor at distance 2
    expect(near.ax).toBeCloseTo((1 / 4) * (-0.5 / 2), 12);
  });
});

describe('the preallocated traversal stack is deep enough', () => {
  test('a tree forced to its maximum depth still sums every body', () => {
    // The stack holds 4 * (MAX_TREE_DEPTH + 4) entries, from the bound that a
    // depth-first walk pushing at most four children per pop never holds more
    // than 1 + 3 * depth. If that bound were wrong the array would silently
    // extend itself - an allocation in a traversal advertised as having none,
    // and a sign the depth reasoning was off. Rather than measure the heap,
    // which is noisy under a test runner, this drives the tree to the deepest
    // structure insertion can build and checks the answer is still right.
    const n = 24;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    const m = new Float64Array(n);
    // Bodies at 1, 1/2, 1/4, ... each one forcing another level of subdivision.
    for (let i = 0; i < n; i++) {
      x[i] = 2 ** -i;
      y[i] = 0;
      m[i] = 1;
    }
    const root = buildTree(x, y, m, n);
    const deepest = node =>
      node.children ? 1 + Math.max(...node.children.map(deepest)) : 0;
    expect(deepest(root)).toBeGreaterThan(20);

    for (let i = 0; i < n; i++) {
      accelAt(root, x[i], y[i], i, 0, G, 0, out); // theta 0: every cell opens
      const want = direct(x, y, m, x[i], y[i], i);
      expect(out[0]).toBeCloseTo(
        want.ax,
        Math.max(0, 12 - Math.ceil(Math.log10(Math.abs(want.ax) + 1)))
      );
    }
  });
});
