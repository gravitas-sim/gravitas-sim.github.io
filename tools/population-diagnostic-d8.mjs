// SPIKE (Roadmap III, Prompt 264 Part A): a DIAGNOSTIC written after the first validator run, not a leg.
//   node tools/population-diagnostic-d8.mjs <thresholds.json> <oracle-results.json> <out.json>
// Leg D8 (coverage of the upper limit among the statements whose estimate is zero) failed in the
// gate stream at 0.62 against a bound of 0.94. This asks what the same measurement gives for the
// counts path, where the rule is Prompt 229's and is exact, and for the object path split into the
// statements that are conditioned on a zero estimate and all statements of the same bins.
// It moves no bound, adds no leg and is labelled a post-hoc diagnostic wherever it is quoted.
import { readFileSync, writeFileSync } from 'node:fs';
import {
  populationRates,
  exposureFromSelection,
} from '../js/kernels/statistics/population.js';
import { chi2Quantile } from '../js/kernels/statistics/special.js';
import { selection } from '../js/kernels/statistics/selection.js';
import { stream, gaussian } from '../js/random/streams.js';
import { poisson } from '../js/kernels/occurrence/population.js';

const [thrPath, , outPath] = process.argv.slice(2);
const thr = JSON.parse(readFileSync(thrPath));
const SC = thr.scenarios;
const T95 = chi2Quantile(0.95, 1);

// ---- the counts path (Prompt 229's rule), one bin of exposure 500 and truth mu = 5
const counts = (() => {
  const draw = stream('noise', 264999, 'diag-counts');
  let zero = 0;
  let zeroCovered = 0;
  let all = 0;
  let allCovered = 0;
  const E = 500;
  const gamma = 5 / E;
  const N = 200000;
  for (let i = 0; i < N; i++) {
    const n = poisson(draw, 5);
    const r = populationRates({
      edges: [0, 1],
      exposure: [E],
      counts: [n],
      levels: [0.95],
    });
    const b = r.bins[0];
    const cov =
      b.status === 'upper-limit'
        ? gamma <= b.upperLimit
        : b.intervals[0].lo <= gamma && gamma <= b.intervals[0].hi;
    all++;
    if (cov) allCovered++;
    if (n === 0) {
      zero++;
      if (cov) zeroCovered++;
    }
  }
  return {
    draws: N,
    truthMu: 5,
    zeroStatements: zero,
    zeroCovered,
    conditionalCoverage: zero ? zeroCovered / zero : null,
    unconditionalCoverage: allCovered / all,
  };
})();

// ---- the object path on U3 (the scenario of D8), by bin
const U1_EDGES = Array.from({ length: 9 }, (_, i) => i);
const targets = Array.from({ length: 500 }, (_, t) => {
  const m = 0.5 + (0.8 * (t + 0.5)) / 500;
  return {
    weight: 1,
    selection: selection({
      observable: 'value',
      probability: u => 1 / (1 + Math.exp((m - u) / 0.35)),
    }),
  };
});
const E = exposureFromSelection({ edges: U1_EDGES, targets });
const gamma = SC.U1.gamma.map(g => g / 6);
const per = gamma.map(() => ({
  zeroStatements: 0,
  zeroCovered: 0,
  statements: 0,
  covered: 0,
}));
for (let r = 0; r < SC.U3.replicates; r++) {
  const draw = stream('noise', SC.U3.baseSeed + r, 'objects');
  const gauss = gaussian(draw);
  const objects = [];
  for (let j = 0; j < 8; j++) {
    const n = poisson(draw, E[j] * gamma[j]);
    for (let i = 0; i < n; i++) {
      const u = j + draw();
      const sigma = Math.exp(
        Math.log(0.1) + (Math.log(0.4) - Math.log(0.1)) * draw()
      );
      objects.push({ x: u + sigma * gauss(), sigma });
    }
  }
  const res = populationRates({
    edges: U1_EDGES,
    exposure: E,
    objects,
    levels: [0.95],
    intervals: false,
  });
  res.bins.forEach((b, j) => {
    let cov = false;
    if (b.status === 'ok') cov = res.deviance(j, gamma[j]) <= T95;
    else if (b.status === 'upper-limit')
      cov = gamma[j] <= (b.upperLimit ?? Infinity);
    per[j].statements++;
    if (cov) per[j].covered++;
    if (b.status === 'upper-limit') {
      per[j].zeroStatements++;
      if (cov) per[j].zeroCovered++;
    }
  });
}
const total = per.reduce(
  (a, p) => ({
    zeroStatements: a.zeroStatements + p.zeroStatements,
    zeroCovered: a.zeroCovered + p.zeroCovered,
    statements: a.statements + p.statements,
    covered: a.covered + p.covered,
  }),
  { zeroStatements: 0, zeroCovered: 0, statements: 0, covered: 0 }
);
const out = {
  format: 'gravitas.population-inference-diagnostic-d8/1',
  note: 'A post-hoc diagnostic written after the first validator run; it is not a leg, moves no bound and changes no status.',
  countsPath: counts,
  objectPathU3: {
    perBin: per,
    total,
    conditionalCoverage: total.zeroCovered / total.zeroStatements,
    unconditionalCoverage: total.covered / total.statements,
  },
};
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
console.log(
  JSON.stringify({
    counts,
    conditional: out.objectPathU3.conditionalCoverage,
    unconditional: out.objectPathU3.unconditionalCoverage,
  })
);
