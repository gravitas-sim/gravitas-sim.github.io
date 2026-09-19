// Workerized Barnes-Hut acceleration compute.
//
// The port and nothing else. The tree itself lives in js/barnesHut.js so that
// the validation suite can import it in plain node; this file is what makes it
// a worker, and is deliberately too small to hide anything.
//
// Buffers are Float64. They were Float32, and the measured cost of that is
// recorded in the Barnes-Hut group of tools/physics-checks.mjs: a relative
// error of 4.5e-5 at the 99th percentile and 3.8e-3 at worst, on a 20000-body
// cluster, with no tree involved - the direct sum against itself, once in
// double precision and once with its inputs and outputs rounded to single.
//
// That is well under the theta error at every opening angle this application
// offers, so single precision was not making the simulation visibly wrong. It
// was still the wrong choice. The main thread holds every position as a double,
// so the worker was answering for a body about 6e-8 away from where the body
// actually was, and no amount of tightening theta could recover that; and the
// floor it put under the answer was three orders above the theta error's own
// arithmetic floor, which is what a calibration has to see past.

import { accelAt, buildTree } from './barnesHut.js';

self.onmessage = e => {
  const msg = e.data || {};
  if (msg.type !== 'bh') return;
  const { G, theta, sources, targets, minDist } = msg;
  const minDistSq = (minDist || 0) * (minDist || 0);
  // Maps each target to its own index in the source array (-1 if absent)
  const selfIndex = targets.self ? new Int32Array(targets.self) : null;
  const sx = new Float64Array(sources.x);
  const sy = new Float64Array(sources.y);
  const sm = new Float64Array(sources.m);
  const tx = new Float64Array(targets.x);
  const ty = new Float64Array(targets.y);
  const nSrc = sx.length;
  const nTar = tx.length;

  const reply = (ax, ay, phi) => {
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

  if (nSrc === 0 || nTar === 0) {
    reply(new Float64Array(0), new Float64Array(0), new Float64Array(0));
    return;
  }

  const root = buildTree(sx, sy, sm, nSrc);

  const ax = new Float64Array(nTar);
  const ay = new Float64Array(nTar);
  const phi = new Float64Array(nTar);

  // One triple for the whole batch. The traversal writes into it and allocates
  // nothing of its own, so a job of any size costs three arrays plus the tree.
  const out = new Float64Array(3);

  for (let i = 0; i < nTar; i++) {
    accelAt(
      root,
      tx[i],
      ty[i],
      selfIndex ? selfIndex[i] : -1,
      theta,
      G,
      minDistSq,
      out
    );
    ax[i] = out[0];
    ay[i] = out[1];
    phi[i] = out[2];
  }

  reply(ax, ay, phi);
};
