// Spike: the determinism run (R9) and the kernel's speed, the same code in
// Node and in a browser Worker.
import { makeState, run, stateHash, fromElements, dopri5 } from './kernel.js';

/** A fixed N-body system: a unit star and n - 1 planets on inclined orbits. */
export function system(n) {
  const bodies = [{ m: 1, x: [0, 0, 0], v: [0, 0, 0] }];
  for (let i = 1; i < n; i++) {
    const r = fromElements({ a: 1 + 0.7 * i, e: 0.02 * (i % 5), i: 0.02 * i, Omega: 0.7 * i, omega: 1.3 * i, M: 0.9 * i }, 1);
    bodies.push({ m: 1e-5 * (1 + (i % 3)), x: r.x, v: r.v });
  }
  return makeState(bodies);
}

/**
 * The state after a fixed run, and its hash: the same bytes everywhere, or not.
 * `initial` is the system as numbers, made once (in Node) and read by every
 * engine, since each engine rounds sin and cos its own way and a system made
 * from elements in each would already differ before the first step.
 */
export async function determinism(initial) {
  const s = makeState(initial);
  const out = { initial: await stateHash(s) };
  for (const scheme of ['leapfrog', 'yoshida4', 'yoshida4c', 'rk4']) {
    const t = makeState(initial);
    run(t, scheme, 0.01, 20000);
    out[scheme] = await stateHash(t);
  }
  const d = makeState(initial);
  dopri5(d, 200, { tol: 1e-10 });
  out.dopri5 = await stateHash(d);
  // And the same system made from elements here, to show the difference.
  out.fromElementsHere = await stateHash(system(10));
  return out;
}

/** The system as plain numbers, for determinism(). */
export function systemAsNumbers(n) {
  const s = system(n);
  return Array.from({ length: s.n }, (_, i) => ({
    m: s.m[i],
    x: [...s.x.slice(3 * i, 3 * i + 3)],
    v: [...s.v.slice(3 * i, 3 * i + 3)],
  }));
}

export function speed() {
  const out = {};
  for (const n of [3, 10, 50]) {
    for (const scheme of ['leapfrog', 'yoshida4', 'yoshida4c', 'rk4']) {
      const s = system(n);
      const steps = Math.max(200, Math.round(2e6 / (n * n)));
      const t0 = performance.now();
      run(s, scheme, 0.01, steps);
      const ms = performance.now() - t0;
      out[`${scheme}/${n}`] = Math.round((steps / ms) * 1000);
    }
  }
  return out;
}
