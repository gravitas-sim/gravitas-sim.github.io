// Prototype (spike): the pinned emcee reference against the truth, and the
// sampler's first replicate against the reference (THRESHOLDS.md section 1).
//   node spike/sampler/compare-reference.mjs [steps factor]
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun } from './ensemble.js';
import { report, pooled } from './diagnostics.js';
import { problemG, problemB, problemP, problemT } from './problems.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(HERE, 'reference');
const factor = Number(process.argv[2] || 1);

const q = (sorted, p) => {
  const t = (sorted.length - 1) * p;
  const i = Math.floor(t);
  return (
    sorted[i] +
    (sorted[Math.min(sorted.length - 1, i + 1)] - sorted[i]) * (t - i)
  );
};
const quantiles = x => {
  const s = Float64Array.from(x).sort();
  return [q(s, 0.16), q(s, 0.5), q(s, 0.84)];
};
const column = (rows, k) => rows.map(r => r[k]);

const out = {};
const cases = [
  ['G', problemG(), 0.15],
  ['B', problemB(), 0.2],
  ['P', problemP(), 0.15],
  ['T-hd209458-1', problemT('hd209458', 1), 0.15],
];
for (const [id, problem, tol] of cases) {
  const file = path.join(REF, `${id}.emcee.json`);
  const raw = readFileSync(file);
  const ref = JSON.parse(raw);
  const truth =
    problem.truth ??
    (() => {
      const g = problem.gridPosterior();
      return {
        sd: g.parameters.map(p => p.sd),
        quantiles: g.parameters.map(p => p.quantiles),
      };
    })();
  const emceeVsTruth = ref.quantiles.map((qs, k) =>
    Math.max(
      ...qs.map((v, i) => Math.abs(v - truth.quantiles[k][i]) / truth.sd[k])
    )
  );
  const run = createRun({
    logProb: problem.logProb,
    d: problem.d,
    steps: Math.round(problem.steps * factor),
    seed: `p103-${problem.id}-1`,
    center: problem.center,
    scale: problem.scale,
    lo: problem.lo,
    hi: problem.hi,
  });
  while (!run.done()) run.advance(250);
  const rep = report(run, problem.names);
  const draws = pooled(run);
  const samplerVsEmcee = draws.map((x, k) =>
    Math.max(
      ...quantiles(x).map(
        (v, i) => Math.abs(v - ref.quantiles[k][i]) / truth.sd[k]
      )
    )
  );
  out[id] = {
    sha256: createHash('sha256').update(raw).digest('hex'),
    emceeTau: ref.tau,
    emceeStepsOverTau: ref.stepsOverTau,
    emceeVsTruthMaxQuantileErrorSd: emceeVsTruth,
    referenceValid:
      emceeVsTruth.every(v => v <= 0.1) && ref.stepsOverTau.every(v => v > 50),
    samplerStatus: rep.status,
    samplerVsEmceeMaxQuantileErrorSd: samplerVsEmcee,
    tolerance: tol,
    samplerWithinTolerance: samplerVsEmcee.every(v => v <= tol),
  };
  void column;
  console.log(id, JSON.stringify(out[id]));
}
writeFileSync(
  path.join(
    HERE,
    'results',
    `reference-check${factor === 1 ? '' : `-x${factor}`}.json`
  ),
  JSON.stringify(out, null, 1)
);
