// Barnes-Hut tree gravity: the tree and the accelerations it gives (Prompt 137)
// -----------------------------------------------------------------------------
// Moved out of js/physicsWorker.js verbatim, so the Worker and the validation
// suite (js/validation/groups/barnes-hut-gravity.js) run one implementation. The
// Worker keeps the message handling and the buffer transfer; this module is the
// arithmetic. It imports nothing and touches no global.

// Workerized Barnes–Hut acceleration compute

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

// Coincident (or near-coincident) bodies would otherwise subdivide forever,
// since no amount of splitting can separate them. Past this depth a node
// becomes a bucket that simply accumulates whatever lands in it.
const MAX_TREE_DEPTH = 48;

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

// selfIdx is the target's own index in the source array, or -1 when the target
// is not itself a gravity source. A body must not pull on itself: at a leaf we
// skip it outright, and we never collapse a cell that still contains it into a
// single center-of-mass term (which would fold its own mass into the result).
function computeAccelFromTree(node, tx, ty, theta, G, selfIdx, minDistSq) {
  if (!node || node.mass === 0) return [0, 0, 0];

  if (!node.children && node.bodyIndex >= 0 && node.bodyIndex === selfIdx) {
    return [0, 0, 0];
  }

  const dx = node.comx - tx;
  const dy = node.comy - ty;
  let distSq = dx * dx + dy * dy;
  if (distSq === 0) return [0, 0, 0];
  if (distSq < minDistSq) distSq = minDistSq;
  const dist = Math.sqrt(distSq);
  const size = Math.max(node.w, node.h);

  const holdsSelf = selfIdx >= 0 && containsPoint(node, tx, ty);

  // Leaf or Far Enough -> Approximation
  if (!node.children || (size / dist < theta && !holdsSelf)) {
    const inv = 1 / dist;
    const amag = (G * node.mass) / distSq;
    const phi = -(G * node.mass) / dist; // Potential per unit mass
    return [amag * dx * inv, amag * dy * inv, phi];
  }

  // Recurse
  let ax = 0,
    ay = 0,
    phi = 0;
  for (let i = 0; i < 4; i++) {
    const c = node.children[i];
    if (c && c.mass > 0) {
      const a = computeAccelFromTree(c, tx, ty, theta, G, selfIdx, minDistSq);
      ax += a[0];
      ay += a[1];
      phi += a[2];
    }
  }
  return [ax, ay, phi];
}

/**
 * The accelerations and potentials a set of sources gives a set of targets, by
 * the Barnes-Hut tree (the body of the Worker's message handler, moved here
 * verbatim so the validation suite can run the same code the Worker runs).
 *
 * @param {Float32Array} sx - Source x
 * @param {Float32Array} sy - Source y
 * @param {Float32Array} sm - Source masses
 * @param {Float32Array} tx - Target x
 * @param {Float32Array} ty - Target y
 * @param {?Int32Array} selfIndex - Each target's own index in the sources, or -1
 * @param {number} theta - Opening angle
 * @param {number} G - Gravitational constant
 * @param {number} minDistSq - Softening floor, squared
 * @returns {{ax: Float32Array, ay: Float32Array, phi: Float32Array}} Per target
 */
export function barnesHutAccel(
  sx,
  sy,
  sm,
  tx,
  ty,
  selfIndex,
  theta,
  G,
  minDistSq
) {
  const nSrc = sx.length;
  const nTar = tx.length;

  // Bounds
  let minX = sx[0],
    maxX = sx[0],
    minY = sy[0],
    maxY = sy[0];
  for (let i = 1; i < nSrc; i++) {
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
  for (let i = 0; i < nSrc; i++) quadInsert(root, sx, sy, sm, i);
  accumulateMass(root);

  const ax = new Float32Array(nTar);
  const ay = new Float32Array(nTar);
  const phi = new Float32Array(nTar);

  for (let i = 0; i < nTar; i++) {
    const a = computeAccelFromTree(
      root,
      tx[i],
      ty[i],
      theta,
      G,
      selfIndex ? selfIndex[i] : -1,
      minDistSq
    );
    ax[i] = a[0];
    ay[i] = a[1];
    phi[i] = a[2];
  }

  return { ax, ay, phi };
}
