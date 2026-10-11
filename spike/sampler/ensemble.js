// Prototype (spike): an affine-invariant ensemble sampler, Goodman and Weare
// (2010), the stretch move with a = 2, in the parallel form that updates one
// half of the walkers from the other (Foreman-Mackey et al. 2013). Pure: no
// DOM, no globals but Math and typed arrays; a seeded stream; the likelihood
// comes in as a function. Not production code and not imported by js/.

import { mulberry32, normalizeSeed } from '../../js/rng.js';

const { Math, Float64Array } = globalThis;

/** A seeded standard normal stream. */
function normals(rand) {
  let spare = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let a;
    do a = rand();
    while (a <= 1e-12);
    const b = rand();
    const r = Math.sqrt(-2 * Math.log(a));
    spare = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  };
}

/**
 * M independent ensembles of W walkers each, advanced together.
 *
 * @param {object} o
 * @param {(theta: Float64Array) => number} o.logProb - log posterior; -Infinity
 *   outside the prior's support
 * @param {number} o.d - Parameters
 * @param {number} o.steps - Steps per ensemble; the first half is burn-in
 * @param {number} [o.ensembles] - M, default 4
 * @param {number} [o.walkers] - W, default 8 d
 * @param {string|number} o.seed
 * @param {number[]} o.center - Start center (nominal)
 * @param {number[]} o.scale - Nominal scales; starts are 3 scales away
 * @param {number[]} [o.lo] - Prior support, to clip starts
 * @param {number[]} [o.hi]
 * @param {(e: number, rng: Function, normal: Function) => Float64Array[]} [o.init]
 *   Replaces the default start for ensemble e
 * @param {number} [o.a] - Stretch scale, default 2
 */
export function createRun(o) {
  const d = o.d;
  const M = o.ensembles ?? 4;
  const W = o.walkers ?? 8 * d;
  const a = o.a ?? 2;
  const S = o.steps;
  const burn = Math.floor(S / 2);
  const post = S - burn;
  const half = W >> 1;
  const rng = mulberry32(normalizeSeed(String(o.seed)));
  const normal = normals(rng);
  const lo = o.lo ?? Array(d).fill(-Infinity);
  const hi = o.hi ?? Array(d).fill(Infinity);
  const ens = [];
  for (let e = 0; e < M; e++) {
    const pos = Array.from({ length: W }, () => new Float64Array(d));
    const lp = new Float64Array(W);
    for (let i = 0; i < W; i++) {
      if (o.init) {
        pos[i] = Float64Array.from(o.init(e, rng, normal, i));
        lp[i] = o.logProb(pos[i]);
        if (!Number.isFinite(lp[i]))
          throw new Error(`start ${i} of ensemble ${e} is outside the prior`);
        continue;
      }
      let tries = 0;
      do {
        for (let j = 0; j < d; j++) {
          const v = o.center[j] + 3 * o.scale[j] * normal();
          pos[i][j] = Math.min(hi[j], Math.max(lo[j], v));
        }
        lp[i] = o.logProb(pos[i]);
        if (++tries > 2000) throw new Error('no start inside the prior');
      } while (!Number.isFinite(lp[i]));
    }
    ens.push({
      pos,
      lp,
      chain: new Float64Array(post * W * d),
      mean: new Float64Array(S * d),
      accepted: 0,
      tried: 0,
    });
  }
  let t = 0;
  const trial = new Float64Array(d);
  const advance = n => {
    const end = Math.min(S, t + n);
    for (; t < end; t++) {
      for (const E of ens) {
        for (let h = 0; h < 2; h++) {
          const lo0 = h === 0 ? 0 : half;
          const hi0 = h === 0 ? half : W;
          const olo = h === 0 ? half : 0;
          const ohi = h === 0 ? W : half;
          for (let i = lo0; i < hi0; i++) {
            const j = olo + Math.floor(rng() * (ohi - olo));
            const z = ((a - 1) * rng() + 1) ** 2 / a;
            const xi = E.pos[i];
            const xj = E.pos[j];
            for (let k = 0; k < d; k++) trial[k] = xj[k] + z * (xi[k] - xj[k]);
            const lpn = o.logProb(trial);
            E.tried++;
            if (
              Number.isFinite(lpn) &&
              Math.log(rng()) < (d - 1) * Math.log(z) + lpn - E.lp[i]
            ) {
              xi.set(trial);
              E.lp[i] = lpn;
              E.accepted++;
            }
          }
        }
        const base = t * d;
        for (let i = 0; i < W; i++)
          for (let k = 0; k < d; k++) E.mean[base + k] += E.pos[i][k] / W;
        if (t >= burn) {
          const off = (t - burn) * W * d;
          for (let i = 0; i < W; i++) E.chain.set(E.pos[i], off + i * d);
        }
      }
    }
    return t;
  };
  return {
    d,
    M,
    W,
    steps: S,
    burn,
    post,
    advance,
    done: () => t >= S,
    step: () => t,
    ensembles: ens,
    retainedBytes: () =>
      ens.reduce((s, E) => s + E.chain.byteLength + E.mean.byteLength, 0),
  };
}

/** Run to the end, synchronously. */
export function runAll(o) {
  const run = createRun(o);
  while (!run.done()) run.advance(500);
  return run;
}
