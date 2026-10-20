// Workerized Barnes–Hut acceleration compute

import { barnesHutAccel } from './engine/barnesHut.js';

self.onmessage = e => {
  const msg = e.data || {};
  if (msg.type !== 'bh') return;
  const { G, theta, sources, targets, minDist } = msg;
  const minDistSq = (minDist || 0) * (minDist || 0);
  // Maps each target to its own index in the source array (-1 if absent)
  const selfIndex = targets.self ? new Int32Array(targets.self) : null;
  const sx = new Float32Array(sources.x);
  const sy = new Float32Array(sources.y);
  const sm = new Float32Array(sources.m);
  const tx = new Float32Array(targets.x);
  const ty = new Float32Array(targets.y);
  const nSrc = sx.length;
  const nTar = tx.length;

  if (nSrc === 0 || nTar === 0) {
    // Return empty
    self.postMessage(
      {
        type: 'accel',
        ax: new Float32Array(0).buffer,
        ay: new Float32Array(0).buffer,
        phi: new Float32Array(0).buffer,
        sources: { x: sources.x, y: sources.y, m: sources.m },
        targets: { x: targets.x, y: targets.y, self: targets.self },
      },
      [
        sources.x,
        sources.y,
        sources.m,
        targets.x,
        targets.y,
        targets.self,
      ].filter(Boolean)
    );
    return;
  }

  const ax_ay_phi = barnesHutAccel(
    sx,
    sy,
    sm,
    tx,
    ty,
    selfIndex,
    theta,
    G,
    minDistSq
  );
  const { ax, ay, phi } = ax_ay_phi;

  self.postMessage(
    {
      type: 'accel',
      ax: ax.buffer,
      ay: ay.buffer,
      phi: phi.buffer,
      sources: { x: sources.x, y: sources.y, m: sources.m },
      targets: { x: targets.x, y: targets.y, self: targets.self },
    },
    [
      ax.buffer,
      ay.buffer,
      phi.buffer,
      sources.x,
      sources.y,
      sources.m,
      targets.x,
      targets.y,
      targets.self,
    ].filter(Boolean)
  );
};
