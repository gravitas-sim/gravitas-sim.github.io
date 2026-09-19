// =============================================================================
// Barnes-Hut tree gravity
// -----------------------------------------------------------------------------
// A quadtree, and the traversal that reads a force out of it. Pure functions
// over numbers: no DOM, no application state, no message port. js/physicsWorker.js
// is the thin shim that owns the port and calls in here, which is what lets the
// validation suite run this code in plain node. It could not before, and so the
// solver shipped unvalidated for as long as it has existed - the tree was fine,
// the file it lived in was unreachable.
//
// The approximation
// -----------------------------------------------------------------------------
// A cell whose angular size s/d falls below theta is collapsed to its center of
// mass. The neglected term is the cell's quadrupole moment, which is smaller
// than the monopole by (s/d)^2, so the force error scales as theta^2 and is
// independent of N at fixed theta. Both of those are measured rather than
// assumed: see the "Barnes-Hut tree solver" group in tools/physics-checks.mjs.
//
// Two consequences are worth stating out loud because they are easy to assume
// away. The force is not pairwise-symmetric - body i may open a cell that body
// j collapses - so Newton's third law holds only to the size of the theta
// error, and total momentum is therefore not conserved to round-off the way the
// direct sum conserves it. And the traversal is deterministic but its summation
// order differs from the direct sum's, so even at theta = 0 the two disagree by
// floating-point round-off. That floor is measured separately from the theta
// error, because a validation that reports their sum cannot tell you which one
// it is looking at.
// =============================================================================

/**
 * Coincident (or near-coincident) bodies would otherwise subdivide forever,
 * since no amount of splitting can separate them. Past this depth a node
 * becomes a bucket that simply accumulates whatever lands in it.
 */
export const MAX_TREE_DEPTH = 48;

class QuadNode {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.children = null;
    this.mass = 0;
    this.comx = 0;
    this.comy = 0;
    this.bodyIndex = -1; // index into sources
  }
}

function subdivide(node) {
  const hw = node.w / 2;
  const hh = node.h / 2;
  node.children = [
    new QuadNode(node.x, node.y, hw, hh),
    new QuadNode(node.x + hw, node.y, hw, hh),
    new QuadNode(node.x, node.y + hh, hw, hh),
    new QuadNode(node.x + hw, node.y + hh, hw, hh),
  ];
}

function childFor(node, px, py) {
  const midx = node.x + node.w / 2;
  const midy = node.y + node.h / 2;
  const right = px >= midx;
  const bottom = py >= midy;
  return node.children[(bottom ? 2 : 0) + (right ? 1 : 0)];
}

function addToBucket(node, x, y, m) {
  const total = node.mass + m;
  if (total > 0) {
    node.comx = (node.comx * node.mass + x * m) / total;
    node.comy = (node.comy * node.mass + y * m) / total;
  }
  node.mass = total;
}

function quadInsert(root, sx, sy, sm, i) {
  let node = root;
  let depth = 0;
  while (true) {
    if (!node.children && node.bodyIndex === -1 && node.mass === 0) {
      node.bodyIndex = i;
      node.mass = sm[i];
      node.comx = sx[i];
      node.comy = sy[i];
      return;
    }
    if (!node.children) {
      if (depth >= MAX_TREE_DEPTH) {
        // Bucket node: keep the existing occupant and fold this body in.
        addToBucket(node, sx[i], sy[i], sm[i]);
        return;
      }
      subdivide(node);
      if (node.bodyIndex !== -1) {
        const old = node.bodyIndex;
        node.bodyIndex = -1;
        node.mass = 0;
        node.comx = 0;
        node.comy = 0;
        quadInsert(node, sx, sy, sm, old);
      }
    }
    node = childFor(node, sx[i], sy[i]);
    depth++;
    if (!node) return;
  }
}

function accumulateMass(node) {
  if (!node.children) return;
  let mass = 0;
  let comx = 0;
  let comy = 0;
  for (let i = 0; i < 4; i++) {
    const c = node.children[i];
    accumulateMass(c);
    mass += c.mass;
    comx += c.comx * c.mass;
    comy += c.comy * c.mass;
  }
  if (mass > 0) {
    node.mass = mass;
    node.comx = comx / mass;
    node.comy = comy / mass;
  }
}

function containsPoint(node, px, py) {
  return (
    px >= node.x && px < node.x + node.w && py >= node.y && py < node.y + node.h
  );
}

/**
 * Build the tree over a set of point masses.
 *
 * The root is squared off and padded by 20% so that a body exactly on the
 * bounding box edge still lands inside a child cell; `containsPoint` is a
 * half-open test and a body on the far edge would otherwise fall out of the
 * tree entirely.
 *
 * @param {Float64Array} sx - Source x, length >= n
 * @param {Float64Array} sy - Source y, length >= n
 * @param {Float64Array} sm - Source mass, length >= n
 * @param {number} n - How many sources
 * @returns {object|null} The root node, or null when there are no sources
 */
export function buildTree(sx, sy, sm, n) {
  if (!n) return null;

  let minX = sx[0];
  let maxX = sx[0];
  let minY = sy[0];
  let maxY = sy[0];
  for (let i = 1; i < n; i++) {
    const x = sx[i];
    const y = sy[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const size = Math.max(w, h) * 1.2;
  const originX = (minX + maxX) / 2 - size / 2;
  const originY = (minY + maxY) / 2 - size / 2;

  const root = new QuadNode(originX, originY, size, size);
  for (let i = 0; i < n; i++) quadInsert(root, sx, sy, sm, i);
  accumulateMass(root);
  return root;
}

// The traversal keeps its running totals in function-local variables and walks
// the tree with an explicit stack, rather than recursing and returning a triple.
//
// It used to return a fresh [ax, ay, phi] on every node visit, including the
// three early returns, so the allocation count was the node-visit count: tens
// of millions of three-element arrays per force evaluation on a large cluster,
// every one of them dead before the next visit.
//
// The obvious repair - recurse, and accumulate into variables at module scope -
// is worse, and measurably so. A module-level binding lives in a context slot,
// which holds a tagged value, so every `acc += ...` that produces a double has
// to box it as a fresh HeapNumber: three allocations per visit in place of one.
// That version ran 1822 scavenges through a force evaluation the version below
// runs in two. Only a local can stay in a register, and a local cannot survive
// a recursive call without being returned - which is the allocation we are
// trying to remove. So the recursion becomes a stack.
//
// The stack is preallocated and reused. Depth-first with at most four children
// pushed per pop bounds it at 1 + 3*depth entries, and insertion stops
// subdividing at MAX_TREE_DEPTH, so nodes exist no deeper than one level below
// that. The capacity below is comfortably over the bound. It holds object
// references, and storing a pointer into an array that is already the right
// length allocates nothing.
//
// One consequence of module scope: accelAt is not reentrant. It is called from
// one loop on one thread, and a worker has no other.
const stack = new Array(4 * (MAX_TREE_DEPTH + 4));

/**
 * Acceleration and potential at one point, from the tree.
 *
 * Allocates nothing. `out` is supplied by the caller and reused across a whole
 * batch of targets.
 *
 * selfIdx is the target's own index in the source array, or -1 when the target
 * is not itself a gravity source. A body must not pull on itself: at a leaf we
 * skip it outright, and we never collapse a cell that still contains it into a
 * single center-of-mass term, which would fold its own mass into the result.
 *
 * Children are pushed in reverse so that they pop in index order, which makes
 * the sequence of visits identical to the recursion this replaced. The terms
 * are then added in one flat left-to-right sum rather than subtree by subtree,
 * so the result differs from the recursive version in the last bits. That
 * difference is round-off, and its size is measured rather than asserted: see
 * the float-precision floor check in the Barnes-Hut group of
 * tools/physics-checks.mjs.
 *
 * @param {object|null} root - From buildTree
 * @param {number} tx - Target x
 * @param {number} ty - Target y
 * @param {number} selfIdx - The target's own source index, or -1
 * @param {number} theta - Opening angle
 * @param {number} G - Gravitational constant
 * @param {number} minDistSq - Softening floor on the squared separation
 * @param {Float64Array|number[]} out - Length >= 3, receives [ax, ay, phi]
 * @returns {Float64Array|number[]} `out`
 */
export function accelAt(root, tx, ty, selfIdx, theta, G, minDistSq, out) {
  let ax = 0;
  let ay = 0;
  let phi = 0;
  let top = 0;
  if (root) stack[top++] = root;

  while (top > 0) {
    const node = stack[--top];
    if (node.mass === 0) continue;

    const children = node.children;
    if (!children && node.bodyIndex >= 0 && node.bodyIndex === selfIdx)
      continue;

    const dx = node.comx - tx;
    const dy = node.comy - ty;
    let distSq = dx * dx + dy * dy;
    if (distSq === 0) continue;
    if (distSq < minDistSq) distSq = minDistSq;
    const dist = Math.sqrt(distSq);
    const size = node.w > node.h ? node.w : node.h;

    // Leaf, or far enough away to collapse to its center of mass.
    // containsPoint is evaluated only once the angle test has passed, which is
    // the only place its answer is used.
    if (
      !children ||
      (size / dist < theta && !(selfIdx >= 0 && containsPoint(node, tx, ty)))
    ) {
      const inv = 1 / dist;
      const amag = (G * node.mass) / distSq;
      ax += amag * dx * inv;
      ay += amag * dy * inv;
      phi -= (G * node.mass) / dist; // potential per unit mass
      continue;
    }

    for (let i = 3; i >= 0; i--) {
      const c = children[i];
      if (c.mass > 0) stack[top++] = c;
    }
  }

  out[0] = ax;
  out[1] = ay;
  out[2] = phi;
  return out;
}
