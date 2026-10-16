// =============================================================================
// The 3-D lab's tick
// -----------------------------------------------------------------------------
// One rule for the page (js/lab3dLab.js) and for anything that must play a
// system the way the page does: the guides' reference run
// (tools/lab3d-guides-key.mjs).
// =============================================================================

import { gravityOf } from '../state.js';
import { elementsAbout, hierarchy, relative } from './instruments.js';

/**
 * The lab's tick: a 400th of the shortest bound orbit at the start, or a
 * hundredth of the closest pair's crossing time when nothing is bound.
 */
export function chooseInterval(system) {
  const n = system.bodies.length;
  const f = {
    m: Float64Array.from(system.bodies.map(b => b.m)),
    x: Float64Array.from(system.bodies.flatMap(b => b.x)),
    v: Float64Array.from(system.bodies.flatMap(b => b.v)),
    alive: new Uint8Array(n).fill(1),
  };
  const g = gravityOf(system);
  const h = hierarchy(f);
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const p = h.primary[i];
    if (p < 0) continue;
    const el = elementsAbout(f, i, p, g);
    if (el?.bound) best = Math.min(best, el.period / 400);
    else {
      const r = relative(f, p, i);
      if (r.speed > 0) best = Math.min(best, r.distance / r.speed / 100);
    }
  }
  return Number.isFinite(best) && best > 0 ? best : 0.01;
}
