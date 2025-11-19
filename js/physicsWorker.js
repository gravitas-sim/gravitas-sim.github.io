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

function quadInsert(root, sx, sy, sm, i) {
  let node = root;
  while (true) {
    if (!node.children && node.bodyIndex === -1 && node.mass === 0) {
      node.bodyIndex = i;
      node.mass = sm[i];
      node.comx = sx[i];
      node.comy = sy[i];
      return;
    }
    if (!node.children) {
      subdivide(node);
      if (node.bodyIndex !== -1) {
        const old = node.bodyIndex;
        node.bodyIndex = -1;
        quadInsert(childFor(node, sx[old], sy[old]), sx, sy, sm, old);
      }
    }
    node = childFor(node, sx[i], sy[i]);
    // update mass and com on unwind later; here we loop continue
    if (!node) break;
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

function computeAccelFromTree(node, tx, ty, theta, G) {
  if (!node || node.mass === 0) return [0, 0, 0];
  const dx = node.comx - tx;
  const dy = node.comy - ty;
  let distSq = dx * dx + dy * dy;
  if (distSq === 0) return [0, 0, 0];
  const dist = Math.sqrt(distSq);
  const size = Math.max(node.w, node.h);
  
  // Leaf or Far Enough -> Approximation
  if (!node.children || size / dist < theta) {
    const inv = 1 / dist;
    const amag = (G * node.mass) / distSq;
    const phi = - (G * node.mass) / dist; // Potential Energy per unit mass (Potential)
    return [amag * dx * inv, amag * dy * inv, phi];
  }

  // Recurse
  let ax = 0, ay = 0, phi = 0;
  for (let i = 0; i < 4; i++) {
    const c = node.children[i];
    if (c && c.mass > 0) {
      const a = computeAccelFromTree(c, tx, ty, theta, G);
      ax += a[0];
      ay += a[1];
      phi += a[2];
    }
  }
  return [ax, ay, phi];
}

self.onmessage = e => {
  const msg = e.data || {};
  if (msg.type !== 'bh') return;
  const { G, theta, sources, targets } = msg;
  const sx = new Float32Array(sources.x);
  const sy = new Float32Array(sources.y);
  const sm = new Float32Array(sources.m);
  const tx = new Float32Array(targets.x);
  const ty = new Float32Array(targets.y);
  const nSrc = sx.length;
  const nTar = tx.length;
  
  if (nSrc === 0 || nTar === 0) {
    // Return empty
    self.postMessage({ 
        type: 'accel', 
        ax: new Float32Array(0).buffer, 
        ay: new Float32Array(0).buffer,
        phi: new Float32Array(0).buffer,
        sources: { x: sources.x, y: sources.y, m: sources.m },
        targets: { x: targets.x, y: targets.y }
    }, [
      sources.x, sources.y, sources.m, 
      targets.x, targets.y
    ]);
    return;
  }

  // Bounds
  let minX = sx[0], maxX = sx[0], minY = sy[0], maxY = sy[0];
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
    const a = computeAccelFromTree(root, tx[i], ty[i], theta, G);
    ax[i] = a[0];
    ay[i] = a[1];
    phi[i] = a[2];
  }
  
  self.postMessage({ 
    type: 'accel', 
    ax: ax.buffer, 
    ay: ay.buffer,
    phi: phi.buffer,
    sources: { x: sources.x, y: sources.y, m: sources.m },
    targets: { x: targets.x, y: targets.y }
  }, [
    ax.buffer, ay.buffer, phi.buffer,
    sources.x, sources.y, sources.m,
    targets.x, targets.y
  ]);
};
