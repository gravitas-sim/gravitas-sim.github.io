// Prototype (spike): writes the likelihood grids the offline emcee reference
// samples (P, and T on hd209458 with noise seed 1), as float32 plus a header.
//   node spike/sampler/reference-export.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemP, problemT, gridPosterior } from './problems.js';

const REF = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'reference'
);
mkdirSync(REF, { recursive: true });

function save(name, problem, lo, hi) {
  const g = gridPosterior(
    problem.logProb,
    problem.center,
    problem.scale,
    lo,
    hi,
    301
  );
  const buf = Float32Array.from(g.logProb);
  writeFileSync(path.join(REF, `${name}.grid.f32`), Buffer.from(buf.buffer));
  writeFileSync(
    path.join(REF, `${name}.grid.json`),
    JSON.stringify({
      n: g.n,
      names: problem.names,
      axes: g.axes.map(a => Array.from(a)).map(a => [a[0], a[a.length - 1]]),
      layout: 'row-major, first axis slow; log posterior (float32)',
      span: g.span,
      edgeMass: g.edgeMass,
    })
  );
  console.log(name, 'written, span', g.span, 'edge mass', g.edgeMass);
}

const P = problemP();
save('P', P, [-100, -100], [100, 100]);
const T = problemT('hd209458', 1);
save('T-hd209458-1', T, T.lo, T.hi);
