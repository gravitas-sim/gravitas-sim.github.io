// SPIKE (Roadmap III, Prompt 262 follow-up, C2c): the Gravitas-stream truncated samples. Never merged.
// rngFor and truncatedRows are those of tools/censoring-validate.mjs (Part A), unchanged. This
// module imports the named random streams and nothing of the prototype: it holds no estimator.
import { createHash } from 'node:crypto';
import { stream, gaussian } from '../js/random/streams.js';

function rngFor(seed, label) {
  const draw = stream('noise', seed, label);
  const u01 = () => {
    let a;
    do a = draw();
    while (a <= 0);
    return a;
  };
  return { draw, u01, gauss: gaussian(draw) };
}

export function truncatedRows(seed, label, N) {
  const { draw, gauss } = rngFor(seed, label);
  const rows = [];
  while (rows.length < N) {
    const x = gauss();
    let d = Math.cbrt(draw());
    if (d <= 0) d = 1e-300;
    const u = 0.5 + 2 * Math.log10(d);
    if (x >= u) rows.push({ x, u });
  }
  return rows;
}

/** The four ensembles of the committed follow-up thresholds, in a fixed order. */
export function designs(thr) {
  const out = [];
  for (const group of ['orig', 'c2c'])
    for (const name of ['T1', 'T2'])
      out.push({ key: `${group}-${name}`, ...thr.ensembles[group][name] });
  return out;
}

/** One replicate as bytes: the N values of x, then the N values of u, little-endian float64. */
export function replicateBytes(rows) {
  const N = rows.length;
  const buf = Buffer.alloc(16 * N);
  for (let i = 0; i < N; i++) {
    buf.writeDoubleLE(rows[i].x, 8 * i);
    buf.writeDoubleLE(rows[i].u, 8 * (N + i));
  }
  return buf;
}

export const sha256 = () => createHash('sha256');
