// SPIKE (Roadmap III, Prompt 264 Part A): the gate stream. Never merged.
//   node tools/population-validate.mjs <thresholds.json> <oracle-results.json> <out.json> <failed-legs.json>
// Every leg of the committed thresholds file, measured on the prototype
// js/kernels/statistics/population.js against the pinned oracle and Prompt 229's engine. The bound of
// each leg is the committed one; the status is computed here from the measured numbers and the bound.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  populationRates,
  exposureFromSelection,
} from '../js/kernels/statistics/population.js';
import { poissonInterval } from '../js/kernels/statistics/intervals.js';
import { chi2Quantile } from '../js/kernels/statistics/special.js';
import { selection } from '../js/kernels/statistics/selection.js';
import { stream, gaussian } from '../js/random/streams.js';
import { makeStars } from '../js/kernels/occurrence/survey.js';
import {
  truthRates,
  simulatePopulation,
  poisson,
} from '../js/kernels/occurrence/population.js';
import { occurrenceGrid, rateOf } from '../js/kernels/occurrence/rates.js';
import { SURVEY } from '../js/data/occurrenceSurvey.js';

const [thrPath, oraclePath, outPath, failedPath] = process.argv.slice(2);
const thrBytes = readFileSync(thrPath);
const thr = JSON.parse(thrBytes);
const oracleBytes = readFileSync(oraclePath);
const oracle = JSON.parse(oracleBytes);
const sha = b => createHash('sha256').update(b).digest('hex');
const TOL = thr.tolerance;
const CONST = thr.constants;
const SC = thr.scenarios;
const T95 = chi2Quantile(0.95, 1);
const T68 = chi2Quantile(0.6827, 1);
const cpu0 = process.cpuUsage();
const cpuNow = () => {
  const u = process.cpuUsage(cpu0);
  return (u.user + u.system) / 1e6;
};

const results = [];
const checks = Object.fromEntries(thr.checks.map(c => [c.id, c]));
function leg(id, status, measured) {
  const c = checks[id];
  results.push({
    id,
    group: c.group,
    scope: c.scope,
    tier: c.tier,
    status,
    bound: c.bound,
    measured,
  });
}
const inRange = (v, lo, hi) => v >= lo && v <= hi;
const relDiff = (a, b) =>
  a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const timing = {};
const timed = (name, fn) => {
  const t = cpuNow();
  const v = fn();
  timing[name] = Number((cpuNow() - t).toFixed(2));
  return v;
};

// ----------------------------------------------------------------------------
// random helpers
// ----------------------------------------------------------------------------
function genObjects(seed, edges, mu, sigLo, sigHi) {
  const draw = stream('noise', seed, 'objects');
  const gauss = gaussian(draw);
  const objects = [];
  for (let j = 0; j < mu.length; j++) {
    const w = edges[j + 1] - edges[j];
    const n = poisson(draw, mu[j]);
    for (let i = 0; i < n; i++) {
      const u = edges[j] + w * draw();
      const sigma =
        w *
        Math.exp(
          Math.log(sigLo) + (Math.log(sigHi) - Math.log(sigLo)) * draw()
        );
      objects.push({ x: u + sigma * gauss(), sigma });
    }
  }
  return objects;
}

// ----------------------------------------------------------------------------
// the scenarios' exposures, by the prototype (the selection object of Prompt 154)
// ----------------------------------------------------------------------------
const U1_EDGES = Array.from({ length: 9 }, (_, i) => i);
const u1Targets = () =>
  Array.from({ length: 500 }, (_, t) => {
    const m = 0.5 + (0.8 * (t + 0.5)) / 500;
    return {
      weight: 1,
      selection: selection({
        observable: 'value',
        probability: u => 1 / (1 + Math.exp((m - u) / 0.35)),
      }),
    };
  });
const E_U1 = timed('exposureU1', () =>
  exposureFromSelection({ edges: U1_EDGES, targets: u1Targets() })
);
const M_EDGES = Array.from(
  { length: 11 },
  (_, i) => Math.round((-0.5 + 0.2 * i) * 1e10) / 1e10
);
const mTargets = () =>
  Array.from({ length: 40 }, (_, k) => {
    const lo = 5 * k;
    const hi = lo + 5;
    const dm = 0.5 * (lo + hi);
    const uLim = (-1 + 2 * Math.log10(dm)) / 3.5;
    return {
      weight: ((4 * Math.PI) / 3) * (hi ** 3 - lo ** 3),
      selection: selection({
        observable: 'value',
        probability: u => 1 / (1 + Math.exp(-(u - uLim) / 0.1)),
      }),
    };
  });
const E_M = timed('exposureM', () =>
  exposureFromSelection({ edges: M_EDGES, targets: mTargets() })
);
const GAMMA_U1 = SC.U1.gamma;
const GAMMA_U3 = GAMMA_U1.map(g => g / 6);
const GAMMA_M = oracle.exposure.M.gamma; // mu*_j / E_j with the oracle's pinned E_j

// ----------------------------------------------------------------------------
// integrity
// ----------------------------------------------------------------------------
leg('I1.inputs', oracle.thresholdsSha256 === sha(thrBytes) ? 'pass' : 'fail', {
  thresholdsSha256: sha(thrBytes),
  oracleRecorded: oracle.thresholdsSha256,
  oracleSha256: sha(oracleBytes),
});

// ----------------------------------------------------------------------------
// the oracle's own legs (read from its pinned output)
// ----------------------------------------------------------------------------
const oc = oracle.checks;
leg(
  'O1.twoAlgorithms',
  oc.O1maxLogLikDiff <= TOL.oracleLogLik ? 'pass' : 'fail',
  { maxAbs: oc.O1maxLogLikDiff }
);
{
  const h = oracle.hand.A2;
  const ok =
    Math.abs(h.total - 1) <= 1e-9 &&
    Math.abs(h.logLik - h.expectedLogLik) <= 1e-12 &&
    relDiff(h.profileHi, h.gstarClosed) <= 1e-9 &&
    h.profileLo === 0;
  leg('O2.hand', ok ? 'pass' : 'fail', {
    totalErr: Math.abs(h.total - 1),
    logLikErr: Math.abs(h.logLik - h.expectedLogLik),
    gstarRel: relDiff(h.profileHi, h.gstarClosed),
  });
}
leg('O3.garwood', oc.O3maxRel <= 1e-12 ? 'pass' : 'fail', {
  maxRel: oc.O3maxRel,
});
leg('O4.profileEnds', oc.O4maxDevErr <= 1e-6 ? 'pass' : 'fail', {
  maxAbs: oc.O4maxDevErr,
});

// ----------------------------------------------------------------------------
// analytic
// ----------------------------------------------------------------------------
{
  // A1: counts n = [3, 0, 10], E = [10, 8, 20], r = [1, 0.5, 0.8]
  const r = populationRates({
    edges: [0, 1, 2, 3],
    exposure: [10, 8, 20],
    reliability: [1, 0.5, 0.8],
    counts: [3, 0, 10],
  });
  const b = r.bins;
  const ok =
    b[0].status === 'ok' &&
    relDiff(b[0].rate, 0.3) <= 1e-12 &&
    b[1].status === 'upper-limit' &&
    relDiff(b[1].upperLimit, -Math.log(0.05) / 8) <= 1e-12 &&
    b[2].status === 'ok' &&
    relDiff(b[2].rate, 0.4) <= 1e-12;
  leg('A1.handCounts', ok ? 'pass' : 'fail', {
    rates: [b[0].rate, null, b[2].rate],
    limit: b[1].upperLimit,
    statuses: b.map(x => x.status),
  });
}
{
  // A2: one object at x = 1 with sigma 0.5 between two unit bins
  const r = populationRates({
    edges: [0, 1, 2],
    exposure: [1, 1],
    objects: [{ x: 1, sigma: 0.5 }],
    levels: [0.95],
    floor: 0,
  });
  // Phi(2) - 1/2 from the oracle's pinned logLik (the closed form there agrees to 1e-12)
  const expLL = oracle.hand.A2.expectedLogLik;
  const iv = r.bins[0].intervals[0];
  const gstar = oracle.hand.A2.gstarClosed;
  const tot = r.mu[0] + r.mu[1];
  const ok =
    Math.abs(tot - 1) <= 1e-9 &&
    Math.abs(r.logLik - expLL) <= 1e-12 &&
    relDiff(iv.hi, gstar) <= 1e-9 &&
    iv.lo === 0;
  leg('A2.handNonIdentified', ok ? 'pass' : 'fail', {
    totalErr: Math.abs(tot - 1),
    logLikErr: Math.abs(r.logLik - expLL),
    gstarRel: relDiff(iv.hi, gstar),
    lo: iv.lo,
  });
}
{
  // A3: a constant selection p = 0.37 and two targets of weight 1 and 3
  const sel = selection({ observable: 'value', probability: () => 0.37 });
  const E = exposureFromSelection({
    edges: [0, 1, 2, 3],
    targets: [
      { selection: sel, weight: 1 },
      { selection: sel, weight: 3 },
    ],
  });
  const err = Math.max(...E.map(e => relDiff(e, 1.48)));
  leg('A3.exposureConstant', err <= TOL.closedForm ? 'pass' : 'fail', {
    E,
    maxRel: err,
  });
}
{
  const err = Math.max(
    ...E_U1.map((e, j) => relDiff(e, oracle.exposure.U1.E[j]))
  );
  leg('A4.exposureLogistic', err <= TOL.oracleExposure ? 'pass' : 'fail', {
    maxRel: err,
    E: E_U1,
  });
}
{
  const sel = selection({
    observable: 'distance',
    probability: d => (d < 1 ? 1 : 0.5),
  });
  const E = exposureFromSelection({
    edges: [0, 1],
    targets: [
      { selection: sel, weight: 1, row: { distance: 0.5 } },
      { selection: sel, weight: 7, row: { distance: 1.5 } },
    ],
  });
  leg(
    'A5.exposureVolume',
    relDiff(E[0], 4.5) <= TOL.closedForm ? 'pass' : 'fail',
    { E: E[0], rel: relDiff(E[0], 4.5) }
  );
}

// ----------------------------------------------------------------------------
// equivalence with Prompt 229 on its planet case
// ----------------------------------------------------------------------------
const NP = 8;
const NR = 5;
const REL_P = [0.95, 0.95, 0.9, 0.9, 0.85, 0.85, 0.8, 0.8];
const stars = makeStars({ seed: 'occ-229', n: 2000 });
const rates229 = truthRates();
const E_FLAT = SURVEY.E.flat();
const R_FLAT = Array.from(
  { length: NP * NR },
  (_, c) => REL_P[Math.floor(c / NR)]
);
const EDGES40 = Array.from({ length: 41 }, (_, i) => i);
const popCounts = [];
timed('populationsQ', () => {
  for (let r = 0; r < 200; r++) {
    const pop = simulatePopulation({
      stars,
      rates: rates229,
      reliability: REL_P,
      completeness: SURVEY.E,
      seed: `pop264-Q-${r}`,
    });
    popCounts.push(pop.listed);
  }
});
function compareCell(a, b) {
  // a: the general kernel's bin, b: 229's cell
  if (a.status !== b.status) return { bad: 'status' };
  if (a.status === 'ok') {
    if (a.method !== b.method) return { bad: 'method' };
    return {
      d: Math.max(
        relDiff(a.rate, b.rate),
        relDiff(a.lo, b.lo),
        relDiff(a.hi, b.hi)
      ),
    };
  }
  if (a.status === 'upper-limit')
    return { d: relDiff(a.upperLimit, b.upperLimit) };
  return { d: 0 };
}
function equivalence(mode) {
  let maxD = 0;
  let cells = 0;
  let bad = 0;
  const kinds = { ok: 0, 'upper-limit': 0, 'not-constrained': 0 };
  for (const listed of popCounts) {
    const grid = occurrenceGrid({
      counts: listed,
      E: SURVEY.E,
      reliability: REL_P,
    }).flat();
    const counts = listed.flat();
    const spec =
      mode === 'counts'
        ? { counts }
        : {
            objects: counts.flatMap((n, c) =>
              Array.from({ length: n }, () => ({ x: c + 0.5, sigma: 0 }))
            ),
          };
    const g = populationRates({
      edges: EDGES40,
      exposure: E_FLAT,
      reliability: R_FLAT,
      ...spec,
    });
    if (g.status === 'refused') {
      bad++;
      continue;
    }
    g.bins.forEach((b, c) => {
      cells++;
      const cmp = compareCell(b, grid[c]);
      kinds[b.status]++;
      if (cmp.bad) bad++;
      else maxD = Math.max(maxD, cmp.d);
    });
  }
  return { cells, maxRel: maxD, mismatches: bad, kinds };
}
{
  const m = timed('Q1', () => equivalence('counts'));
  leg(
    'Q1.equivalenceCounts',
    m.mismatches === 0 && m.maxRel <= TOL.equivalence ? 'pass' : 'fail',
    m
  );
}
{
  const m = timed('Q2', () => equivalence('objects'));
  leg(
    'Q2.equivalenceObjects',
    m.mismatches === 0 && m.maxRel <= TOL.equivalence ? 'pass' : 'fail',
    m
  );
}
{
  let maxRate = 0;
  let maxEnd = 0;
  let cells = 0;
  let notConverged = 0;
  timed('Q3', () => {
    for (const listed of popCounts.slice(0, 20)) {
      const counts = listed.flat();
      const objects = counts.flatMap((n, c) =>
        Array.from({ length: n }, () => ({ x: c + 0.5, sigma: 1e-4 }))
      );
      const g = populationRates({
        edges: EDGES40,
        exposure: E_FLAT,
        reliability: R_FLAT,
        objects,
      });
      if (g.status === 'refused' || !g.converged) {
        notConverged++;
        continue;
      }
      g.bins.forEach((b, c) => {
        if (counts[c] < 1 || b.status !== 'ok') return;
        cells++;
        maxRate = Math.max(
          maxRate,
          relDiff(b.rate, (counts[c] * R_FLAT[c]) / E_FLAT[c])
        );
        const iv = poissonInterval([counts[c]], {
          exposure: E_FLAT[c] / R_FLAT[c],
          level: 0.6827,
          method: 'profile',
        });
        maxEnd = Math.max(maxEnd, relDiff(b.lo, iv.lo), relDiff(b.hi, iv.hi));
      });
    }
  });
  leg(
    'Q3.continuity',
    maxRate <= 1e-6 && maxEnd <= TOL.continuity ? 'pass' : 'fail',
    { cells, maxRateRel: maxRate, maxEndRel: maxEnd, notConverged }
  );
}

// ----------------------------------------------------------------------------
// reference samples against the oracle
// ----------------------------------------------------------------------------
{
  const designs = oracle.designs;
  const L2 = [0.6827, 0.95];
  let llErr = 0;
  let muErr = 0;
  let endErr = 0;
  let absZero = 0;
  let notConv = 0;
  let statusMismatch = 0;
  let resErr = 0;
  let resFlag = true;
  let zeroStatus = true;
  let zeroLimitErr = 0;
  const per = {};
  timed('reference', () => {
    for (const [id, d] of Object.entries(designs)) {
      if (d.kind !== 'objects') continue;
      const r = populationRates({
        edges: d.edges,
        exposure: d.exposure,
        reliability: d.reliability,
        objects: d.objects.x.map((x, i) => ({ x, sigma: d.objects.sigma[i] })),
        levels: L2,
      });
      if (r.status === 'refused' || !r.converged) {
        notConv++;
        continue;
      }
      const f = d.fit;
      const e1 = Math.abs(r.logLik - f.logLik);
      llErr = Math.max(llErr, e1);
      let e2 = 0;
      let e3 = 0;
      f.bins.forEach((ob, j) => {
        const pb = r.bins[j];
        if (f.mu[j] >= 1) e2 = Math.max(e2, relDiff(r.mu[j], f.mu[j]));
        if (pb.status !== ob.status) {
          statusMismatch++;
          return;
        }
        if (ob.status === 'ok') {
          for (let k = 0; k < L2.length; k++) {
            const lo = ob[`lo_${L2[k]}`];
            const hi = ob[`hi_${L2[k]}`];
            const piv = pb.intervals[k];
            if (lo === 0) absZero = Math.max(absZero, Math.abs(piv.lo));
            else e3 = Math.max(e3, relDiff(piv.lo, lo));
            if (hi === null || piv.hi === null) {
              if ((hi === null) !== (piv.hi === null)) e3 = Infinity;
            } else e3 = Math.max(e3, relDiff(piv.hi, hi));
          }
        } else if (ob.status === 'upper-limit') {
          const dd =
            ob.limit === null || pb.upperLimit === null
              ? ob.limit === pb.upperLimit
                ? 0
                : Infinity
              : relDiff(pb.upperLimit, ob.limit);
          zeroLimitErr = Math.max(zeroLimitErr, dd);
        }
      });
      muErr = Math.max(muErr, e2);
      endErr = Math.max(endErr, e3);
      const rr = Math.max(relDiff(r.resolution.median, f.resolution.median));
      resErr = Math.max(resErr, rr);
      if (r.resolution.ok !== f.resolution.ok) resFlag = false;
      if (id === 'S2' || id === 'S6') {
        const same = f.bins.every((ob, j) => ob.status === r.bins[j].status);
        if (!same) zeroStatus = false;
      }
      per[id] = {
        logLikErr: e1,
        muRel: e2,
        endRel: e3,
        iterations: r.iterations,
      };
    }
  });
  leg('R2.logLik', llErr <= TOL.oracleLogLik ? 'pass' : 'fail', {
    maxAbs: llErr,
    notConverged: notConv,
    per,
  });
  leg('R3.mu', muErr <= TOL.oracleMu ? 'pass' : 'fail', { maxRel: muErr });
  leg(
    'R4.endpoints',
    endErr <= TOL.oracleEndpoint && absZero <= 1e-6 && statusMismatch === 0
      ? 'pass'
      : 'fail',
    {
      maxRel: endErr,
      maxAbsWhereOracleZero: absZero,
      statusMismatches: statusMismatch,
    }
  );
  leg(
    'R5.zeroAndFloor',
    zeroStatus && zeroLimitErr <= TOL.oracleEndpoint ? 'pass' : 'fail',
    { statusesIdentical: zeroStatus, maxLimitRel: zeroLimitErr }
  );
  leg('R6.resolutionFlag', resErr <= 1e-9 && resFlag ? 'pass' : 'fail', {
    maxRel: resErr,
    flagsIdentical: resFlag,
  });
}
{
  const d = oracle.designs.S8;
  const r = populationRates({
    edges: d.edges,
    exposure: d.exposure,
    reliability: d.reliability,
    counts: d.counts,
    levels: [0.6827, 0.95],
  });
  let maxRate = 0;
  let maxEnd = 0;
  let statuses = true;
  d.fit.bins.forEach((ob, j) => {
    const pb = r.bins[j];
    if (pb.status !== ob.status) {
      statuses = false;
      return;
    }
    if (ob.status === 'ok') {
      maxRate = Math.max(maxRate, relDiff(pb.rate, ob.rate));
      [0.6827, 0.95].forEach((L, k) => {
        maxEnd = Math.max(
          maxEnd,
          relDiff(pb.intervals[k].lo, ob[`lo_${L}`]),
          relDiff(pb.intervals[k].hi, ob[`hi_${L}`])
        );
      });
    } else if (ob.status === 'upper-limit')
      maxEnd = Math.max(maxEnd, relDiff(pb.upperLimit, ob.limit));
  });
  leg(
    'R1.countsReference',
    statuses && maxRate <= 1e-12 && maxEnd <= 1e-12 ? 'pass' : 'fail',
    { maxRate, maxEnd, statuses }
  );
}

// ----------------------------------------------------------------------------
// the ensembles
// ----------------------------------------------------------------------------
function trial(edges, E, gamma, sigRange, seed, opts = {}) {
  const J = gamma.length;
  const muTrue = gamma.map((g, j) => E[j] * g);
  const objects = genObjects(seed, edges, muTrue, sigRange[0], sigRange[1]);
  const declared = opts.sigmaScale
    ? objects.map(o => ({ x: o.x, sigma: o.sigma * opts.sigmaScale }))
    : objects;
  const Eused = opts.exposure ?? E;
  const r = populationRates({
    edges,
    exposure: Eused,
    objects: declared,
    levels: [0.95],
    intervals: opts.intervals ?? false,
  });
  return { r, objects, J, muTrue };
}

function ensemble({
  name,
  edges,
  E,
  gamma,
  sigRange,
  reps,
  baseSeed,
  rich,
  extra,
}) {
  const J = gamma.length;
  const cov95 = new Array(J).fill(0);
  const cov68 = new Array(J).fill(0);
  const ratioSum = new Array(J).fill(0);
  const ratioN = new Array(J).fill(0);
  const zero = { n: 0, covered: 0 };
  const res = { ok: 0, total: 0 };
  let fits = 0;
  let bad = 0;
  let refusedN = 0;
  const widths = [];
  let unboundedBins = 0;
  let intervalBins = 0;
  for (let r = 0; r < reps; r++) {
    const t = trial(edges, E, gamma, sigRange, baseSeed + r, {
      intervals: extra?.intervals,
    });
    if (t.r.status === 'refused') {
      refusedN++;
      fits++;
      bad++;
      continue;
    }
    res.total++;
    if (t.r.resolution?.ok) res.ok++;
    fits += t.r.stats.fits;
    bad += t.r.stats.bad;
    for (let j = 0; j < J; j++) {
      const b = t.r.bins[j];
      if (b.status === 'ok') {
        const dev = t.r.deviance(j, gamma[j]);
        if (dev <= T95) cov95[j]++;
        if (dev <= T68) cov68[j]++;
        if (t.r.converged) {
          ratioSum[j] += b.rate / gamma[j];
          ratioN[j]++;
        }
        if (extra?.intervals && rich[j]) {
          intervalBins++;
          if (b.unbounded) unboundedBins++;
          else if (b.hi !== null) widths.push((b.hi - b.lo) / b.rate);
        }
      } else if (b.status === 'upper-limit') {
        const lim = b.upperLimit === null ? Infinity : b.upperLimit;
        const c = gamma[j] <= lim;
        if (c) {
          cov95[j]++;
          cov68[j]++;
        }
        if (j >= 0) {
          zero.n++;
          if (c) zero.covered++;
        }
      }
    }
  }
  fits += 0;
  return {
    name,
    reps,
    cov95: cov95.map(c => c / reps),
    cov68: cov68.map(c => c / reps),
    bias: ratioSum.map((s, j) => (ratioN[j] ? s / ratioN[j] : null)),
    zero,
    resolutionOkShare: res.total ? res.ok / res.total : null,
    fits,
    notConverged: bad,
    refused: refusedN,
    widths,
    unboundedBins,
    intervalBins,
  };
}
const richOf = (E, gamma) => gamma.map((g, j) => E[j] * g >= CONST.richMu);
const mean = (xs, mask) => {
  const v = xs.filter((_, i) => !mask || mask[i]);
  return v.reduce((a, b) => a + b, 0) / v.length;
};
const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};

const richU1 = richOf(E_U1, GAMMA_U1);
const richU3 = GAMMA_U3.map(() => true);
const richM = richOf(E_M, GAMMA_M);
const U1 = timed('ensembleU1', () =>
  ensemble({
    name: 'U1',
    edges: U1_EDGES,
    E: E_U1,
    gamma: GAMMA_U1,
    sigRange: [0.1, 0.4],
    reps: SC.U1.replicates,
    baseSeed: SC.U1.baseSeed,
    rich: richU1,
  })
);
const U3 = timed('ensembleU3', () =>
  ensemble({
    name: 'U3',
    edges: U1_EDGES,
    E: E_U1,
    gamma: GAMMA_U3,
    sigRange: [0.1, 0.4],
    reps: SC.U3.replicates,
    baseSeed: SC.U3.baseSeed,
    rich: richU3,
  })
);
const Mens = timed('ensembleM', () =>
  ensemble({
    name: 'M',
    edges: M_EDGES,
    E: E_M,
    gamma: GAMMA_M,
    sigRange: [0.2, 0.5],
    reps: SC.M.replicates,
    baseSeed: SC.M.baseSeed,
    rich: richM,
  })
);
const U2 = timed('ensembleU2', () =>
  ensemble({
    name: 'U2',
    edges: U1_EDGES,
    E: E_U1,
    gamma: GAMMA_U1,
    sigRange: [0.6, 1.2],
    reps: SC.U2.replicates,
    baseSeed: SC.U2.baseSeed,
    rich: richU1,
    extra: { intervals: true },
  })
);

// recovery
function recovery(edges, E, gamma, seed) {
  const E100 = E.map(e => e * 100);
  const muTrue = gamma.map((g, j) => E100[j] * g);
  const objects = genObjects(
    seed,
    edges,
    muTrue,
    edges === M_EDGES ? 0.2 : 0.1,
    edges === M_EDGES ? 0.5 : 0.4
  );
  const r = populationRates({
    edges,
    exposure: E100,
    objects,
    intervals: false,
  });
  const errs = r.bins.map((b, j) => Math.abs(b.rate / gamma[j] - 1));
  return {
    n: objects.length,
    converged: r.converged,
    iterations: r.iterations,
    maxErr: Math.max(...errs),
    errs,
  };
}
{
  const v1 = timed('recoveryU1', () =>
    recovery(U1_EDGES, E_U1, GAMMA_U1, 264900)
  );
  leg('V1.recoveryU1', v1.maxErr <= 0.05 ? 'pass' : 'fail', v1);
  const v2 = timed('recoveryM', () => recovery(M_EDGES, E_M, GAMMA_M, 264901));
  leg('V2.recoveryM', v2.maxErr <= 0.08 ? 'pass' : 'fail', v2);
}

{
  const c1 = mean(U1.cov95, richU1);
  const c1min = Math.min(...U1.cov95.filter((_, j) => richU1[j]));
  leg('C1.coverageU1', inRange(c1, 0.93, 0.97) ? 'pass' : 'fail', {
    mean: c1,
    perBin: U1.cov95,
    richBins: richU1.map((v, j) => (v ? j : -1)).filter(j => j >= 0),
    refused: U1.refused,
  });
  leg('C1b.coverageU1PerBin', c1min >= 0.91 ? 'pass' : 'fail', { min: c1min });
  const c2 = mean(U1.cov68, richU1);
  leg('C2.coverageU1sigma', inRange(c2, 0.65, 0.72) ? 'pass' : 'fail', {
    mean: c2,
    perBin: U1.cov68,
  });
  const c3 = mean(U3.cov95, richU3);
  leg('C3.coverageU3', inRange(c3, 0.9, 0.99) ? 'pass' : 'fail', {
    mean: c3,
    perBin: U3.cov95,
    zeroStatements: U3.zero,
  });
  const c4 = mean(Mens.cov95, richM);
  const c4min = Math.min(...Mens.cov95.filter((_, j) => richM[j]));
  leg('C4.coverageM', inRange(c4, 0.93, 0.97) ? 'pass' : 'fail', {
    mean: c4,
    perBin: Mens.cov95,
    richBins: richM.map((v, j) => (v ? j : -1)).filter(j => j >= 0),
  });
  leg('C4b.coverageMPerBin', c4min >= 0.9 ? 'pass' : 'fail', { min: c4min });
  const biasErr = Math.max(
    ...U1.bias.map((b, j) => (richU1[j] ? Math.abs(b - 1) : 0))
  );
  leg('C5.bias', biasErr <= 0.03 ? 'pass' : 'fail', {
    maxAbsBiasMinusOne: biasErr,
    perBin: U1.bias,
  });
  const fits = U1.fits + U3.fits + Mens.fits;
  const bad = U1.notConverged + U3.notConverged + Mens.notConverged;
  leg('C6.converged', bad / fits <= 0.005 ? 'pass' : 'fail', {
    fits,
    notConverged: bad,
    share: bad / fits,
  });
}

// the oracle's own ensemble
{
  const e = oracle.ensembleU1;
  leg('C7.coverageOracle', inRange(e.pooled, 0.92, 0.98) ? 'pass' : 'fail', {
    pooled: e.pooled,
    perBin: e.coveragePerBin,
    replicates: e.replicates,
  });
}

// ----------------------------------------------------------------------------
// misspecified and negative
// ----------------------------------------------------------------------------
// D1: declared sigma doubled against the true sigma (the first 400 U1 replicates): interval widths
const widthRun = (name, scale) =>
  timed(name, () => {
    const w = [];
    let n = 0;
    for (let r = 0; r < 400; r++) {
      const t = trial(
        U1_EDGES,
        E_U1,
        GAMMA_U1,
        [0.1, 0.4],
        SC.U1.baseSeed + r,
        {
          sigmaScale: scale,
          intervals: true,
        }
      );
      if (t.r.status === 'refused') continue;
      n++;
      t.r.bins.forEach((b, j) => {
        if (richU1[j] && b.status === 'ok' && b.hi !== null)
          w.push((b.hi - b.lo) / b.rate);
      });
    }
    return { n, w };
  });
const wTrue = widthRun('widthTrue', undefined);
const wDouble = widthRun('widthDouble', 2);
{
  const ratio = median(wDouble.w) / median(wTrue.w);
  leg('D1.widthWithSigma', ratio >= 1.05 ? 'pass' : 'fail', {
    ratio,
    medianTrue: median(wTrue.w),
    medianDoubled: median(wDouble.w),
    pairs: [wTrue.w.length, wDouble.w.length],
  });
}
leg(
  'D2.resolutionFlag',
  U1.resolutionOkShare === 1 &&
    U2.resolutionOkShare !== null &&
    1 - U2.resolutionOkShare >= 0.99
    ? 'pass'
    : 'fail',
  { U1okShare: U1.resolutionOkShare, U2notOkShare: 1 - U2.resolutionOkShare }
);

// refusals
const code = spec => populationRates(spec).code ?? populationRates(spec).status;
const okCall = spec => populationRates(spec).status;
{
  const base = { edges: [0, 1, 2], exposure: [10, 10], counts: [3, 4] };
  const cases = [
    [
      'edges',
      [
        { ...base, edges: [1] },
        { ...base, edges: [0, 1, 1] },
        { ...base, edges: [0, NaN, 2] },
      ],
    ],
    [
      'exposure',
      [
        { ...base, exposure: [10] },
        { ...base, exposure: [10, -1] },
        { ...base, exposure: [10, NaN] },
      ],
    ],
    [
      'reliability',
      [
        { ...base, reliability: 0 },
        { ...base, reliability: 1.2 },
        { ...base, reliability: NaN },
      ],
    ],
    [
      'count',
      [
        { ...base, counts: [1.5, 2] },
        { ...base, counts: [-1, 2] },
      ],
    ],
    ['counts', [{ ...base, counts: [1, 2, 3] }]],
    [
      'sample',
      [
        { edges: [0, 1, 2], exposure: [10, 10] },
        { ...base, objects: [] },
      ],
    ],
    [
      'level',
      [
        { ...base, levels: [1.2] },
        { ...base, levels: [0] },
      ],
    ],
    [
      'penalty',
      [
        { ...base, penalty: { kappa: -1 } },
        { ...base, penalty: { kappa: NaN } },
      ],
    ],
  ];
  const seen = {};
  let allOk = true;
  for (const [c, specs] of cases) {
    seen[c] = specs.map(code);
    if (!seen[c].every(v => v === c)) allOk = false;
  }
  const neighbours = [
    okCall(base),
    okCall({ ...base, reliability: 1 }),
    okCall({ ...base, levels: [0.9] }),
    okCall({ ...base, penalty: { kappa: 1 } }),
  ];
  const neighbourOk = neighbours.every(s => s === 'ok');
  leg('D3.refusalsCounts', allOk && neighbourOk ? 'pass' : 'fail', {
    seen,
    neighbours,
  });
}
{
  const base = { edges: [0, 1, 2], exposure: [10, 10] };
  const obj = (x, sigma) => ({ ...base, objects: [{ x, sigma }] });
  const seen = {
    sigma: [code(obj(0.5, -1)), code(obj(0.5, NaN))],
    object: [code(obj(NaN, 0.1)), code(obj(Infinity, 0.1))],
    outside: [code(obj(5, 0)), code(obj(-1, 0))],
    unplaceable: [code(obj(1e6, 1e-3))],
    'penalty-gap': [
      code({
        edges: [0, 1, 2, 3],
        exposure: [10, 0, 10],
        objects: [{ x: 0.5, sigma: 0.1 }],
        penalty: { kappa: 1 },
      }),
      code({
        edges: [0, 1, 2, 3],
        exposure: [10, 0, 10],
        counts: [1, 0, 1],
        penalty: { kappa: 1 },
      }),
    ],
  };
  const allOk = Object.entries(seen).every(([c, v]) => v.every(x => x === c));
  const neighbours = [
    okCall(obj(0.5, 0.1)),
    okCall(obj(0.5, 0)),
    okCall({ ...base, objects: [{ x: 2, sigma: 0 }] }),
  ];
  leg(
    'D4.refusalsObjects',
    allOk && neighbours.every(s => s === 'ok') ? 'pass' : 'fail',
    { seen, neighbours }
  );
}
{
  const r = populationRates({
    edges: [0, 1, 2, 3],
    exposure: [4.9, 5, 40],
    counts: [2, 3, 9],
  });
  const r0 = populationRates({
    edges: [0, 1, 2, 3],
    exposure: [4.9, 5, 40],
    counts: [0, 3, 9],
  });
  const all = populationRates({
    edges: [0, 1, 2, 3],
    exposure: [1, 2, 3],
    counts: [2, 3, 9],
  });
  const ok =
    r.bins[0].status === 'not-constrained' &&
    r.bins[0].rate === undefined &&
    r.bins[1].status === 'ok' &&
    r.bins[2].status === 'ok' &&
    r0.bins[0].status === 'not-constrained' &&
    r0.bins[0].upperLimit === undefined &&
    all.status === 'not-constrained' &&
    all.bins.every(b => b.status === 'not-constrained');
  leg('D5.floorCounts', ok ? 'pass' : 'fail', {
    statuses: r.bins.map(b => b.status),
    whole: all.status,
  });
}
{
  const objects = [
    { x: 0.5, sigma: 0.1 },
    { x: 0.6, sigma: 0.1 },
    ...Array.from({ length: 30 }, (_, i) => ({
      x: 1.2 + 0.02 * i,
      sigma: 0.1,
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      x: 2.2 + 0.02 * i,
      sigma: 0.1,
    })),
  ];
  const r = populationRates({
    edges: [0, 1, 2, 3],
    exposure: [3, 100, 100],
    objects,
  });
  const ok =
    r.bins[0].status === 'not-constrained' &&
    r.bins[0].rate === undefined &&
    r.bins[1].status === 'ok' &&
    Number.isFinite(r.bins[1].rate) &&
    r.bins[2].status === 'ok' &&
    Number.isFinite(r.bins[2].rate);
  leg('D6.floorObjects', ok ? 'pass' : 'fail', {
    statuses: r.bins.map(b => b.status),
  });
}
{
  const E = [10, 20, 50];
  const r = populationRates({ edges: [0, 1, 2, 3], exposure: E, objects: [] });
  const err = Math.max(
    ...r.bins.map((b, j) =>
      b.status === 'upper-limit'
        ? relDiff(b.upperLimit, -Math.log(0.05) / E[j])
        : Infinity
    )
  );
  leg('D7.emptySample', err <= 1e-9 ? 'pass' : 'fail', { maxRel: err });
}
{
  const n = U3.zero.n;
  const share = n ? U3.zero.covered / n : null;
  leg('D8.noZeroRule', share !== null && share >= 0.94 ? 'pass' : 'fail', {
    zeroStatements: n,
    covered: U3.zero.covered,
    share,
  });
}

// ----------------------------------------------------------------------------
// the penalty
// ----------------------------------------------------------------------------
{
  let maxRel = 0;
  const per = {};
  for (const [id, d] of Object.entries(oracle.designs)) {
    if (d.kind !== 'objects' || id === 'S2' || id === 'S6') continue; // S2, S6 have zero bins: no log rate
    const r = populationRates({
      edges: d.edges,
      exposure: d.exposure,
      reliability: d.reliability,
      objects: d.objects.x.map((x, i) => ({ x, sigma: d.objects.sigma[i] })),
      penalty: { kappa: 0 },
      intervals: false,
    });
    const un = r.bins.map(b => b.rate);
    const pen = r.penalty.rates;
    const e = Math.max(...un.map((u, j) => relDiff(pen[j], u)));
    per[id] = e;
    maxRel = Math.max(maxRel, e);
  }
  leg('P1.zeroKappa', maxRel <= 1e-9 ? 'pass' : 'fail', {
    maxRel,
    per,
    note: 'S2 and S6 hold bins whose maximum is zero; their log rate does not exist and they are not compared',
  });
}
{
  let maxAbs = 0;
  const per = {};
  let notConv = 0;
  for (const id of ['S1', 'S3']) {
    const d = oracle.designs[id];
    for (const kappa of CONST.kappaGrid) {
      const r = populationRates({
        edges: d.edges,
        exposure: d.exposure,
        reliability: d.reliability,
        objects: d.objects.x.map((x, i) => ({ x, sigma: d.objects.sigma[i] })),
        penalty: { kappa },
        intervals: false,
      });
      if (!r.penalty.converged) notConv++;
      const o = d.penalty[String(kappa)].theta;
      const e = Math.max(...o.map((t, j) => Math.abs(r.penalty.theta[j] - t)));
      per[`${id}-${kappa}`] = e;
      maxAbs = Math.max(maxAbs, e);
    }
  }
  leg('P2.penaltyOracle', maxAbs <= TOL.penaltyOracle ? 'pass' : 'fail', {
    maxAbs,
    per,
    notConverged: notConv,
  });
}
const P3EDGES = Array.from({ length: 11 }, (_, i) => i);
const P3E = new Array(10).fill(12);
const P3G = Array.from({ length: 10 }, (_, j) => 0.4 * Math.exp(-0.15 * j));
{
  let s0 = 0;
  let s4 = 0;
  let used = 0;
  let dropped = 0;
  timed('P3', () => {
    for (let r = 0; r < 400; r++) {
      const objects = genObjects(
        264800 + r,
        P3EDGES,
        P3G.map((g, j) => g * P3E[j]),
        0.2,
        0.2
      );
      const a = populationRates({
        edges: P3EDGES,
        exposure: P3E,
        objects,
        penalty: { kappa: 4 },
        intervals: false,
      });
      if (a.status === 'refused' || !a.converged || !a.penalty.converged) {
        dropped++;
        continue;
      }
      const un = a.bins.map(b => b.rate ?? 0);
      s0 += un.reduce((acc, u, j) => acc + (u / P3G[j] - 1) ** 2, 0);
      s4 += a.penalty.rates.reduce(
        (acc, u, j) => acc + (u / P3G[j] - 1) ** 2,
        0
      );
      used++;
    }
  });
  const ratio = s4 / s0;
  leg('P3.penaltyHelps', ratio <= 0.9 ? 'pass' : 'fail', {
    ratio,
    used,
    dropped,
    meanSumUnpenalised: s0 / used,
    meanSumPenalised: s4 / used,
  });
}
{
  const banned = /prior|posterior|credible|bayes/i;
  let ok = true;
  const detail = {};
  for (const id of ['S1', 'S3']) {
    const d = oracle.designs[id];
    const r = populationRates({
      edges: d.edges,
      exposure: d.exposure,
      reliability: d.reliability,
      objects: d.objects.x.map((x, i) => ({ x, sigma: d.objects.sigma[i] })),
      penalty: { kappa: 4 },
      intervals: false,
    });
    const p = r.penalty;
    const text = JSON.stringify({
      ...r,
      deviance: undefined,
      stats: undefined,
    });
    const items = {
      statistic: p.statistic === 'penalised maximum likelihood',
      kappa: p.kappa === 4,
      kind: p.kind === 'roughness',
      noInterval: p.interval === null,
      unpenalisedBeside: Array.isArray(p.unpenalised) && r.bins.length > 0,
      noBannedWords: !banned.test(text),
    };
    detail[id] = items;
    if (!Object.values(items).every(Boolean)) ok = false;
  }
  leg('P4.penaltyNamed', ok ? 'pass' : 'fail', detail);
}
{
  const a = code({
    edges: [0, 1, 2],
    exposure: [10, 10],
    counts: [1, 2],
    penalty: { kappa: -1 },
  });
  const b = code({
    edges: [0, 1, 2, 3],
    exposure: [10, 0, 10],
    objects: [{ x: 0.5, sigma: 0.1 }],
    penalty: { kappa: 1 },
  });
  leg(
    'P5.penaltyGap',
    a === 'penalty' && b === 'penalty-gap' ? 'pass' : 'fail',
    { negative: a, gap: b }
  );
}

// ----------------------------------------------------------------------------
// reported
// ----------------------------------------------------------------------------
{
  // N1: the naive method on the U1 samples
  const covNaive = new Array(8).fill(0);
  let n = 0;
  timed('naiveU1', () => {
    for (let r = 0; r < SC.U1.replicates; r++) {
      const muTrue = GAMMA_U1.map((g, j) => E_U1[j] * g);
      const objects = genObjects(
        SC.U1.baseSeed + r,
        U1_EDGES,
        muTrue,
        0.1,
        0.4
      );
      const counts = new Array(8).fill(0);
      for (const o of objects) {
        const j = Math.floor(o.x);
        if (j >= 0 && j < 8) counts[j]++;
      }
      n++;
      for (let j = 0; j < 8; j++) {
        const c = rateOf({
          n: counts[j],
          completeness: E_U1[j],
          reliability: 1,
          level: 0.95,
        });
        const g = GAMMA_U1[j];
        const cov =
          c.status === 'ok'
            ? c.lo <= g && g <= c.hi
            : c.status === 'upper-limit'
              ? g <= c.upperLimit
              : false;
        if (cov) covNaive[j]++;
      }
    }
  });
  const per = covNaive.map(c => c / n);
  leg('N1.naiveCoverage', 'reported', {
    mean: per.reduce((a, b) => a + b, 0) / 8,
    perBin: per,
    bin5: per[5],
  });
}
{
  // N2 and N3: a wrong exposure and a wrong sigma (first 400 U1 replicates)
  const E07 = E_U1.map((e, j) => (j >= 4 ? 0.7 * e : e));
  const ratio = new Array(8).fill(0);
  const cov = new Array(8).fill(0);
  let n = 0;
  timed('wrongExposure', () => {
    for (let r = 0; r < 400; r++) {
      const muTrue = GAMMA_U1.map((g, j) => E_U1[j] * g);
      const objects = genObjects(
        SC.U1.baseSeed + r,
        U1_EDGES,
        muTrue,
        0.1,
        0.4
      );
      const res = populationRates({
        edges: U1_EDGES,
        exposure: E07,
        objects,
        intervals: false,
      });
      if (res.status === 'refused') continue;
      n++;
      for (let j = 4; j < 8; j++) {
        const b = res.bins[j];
        if (b.status === 'ok') {
          ratio[j] += b.rate / GAMMA_U1[j];
          if (res.deviance(j, GAMMA_U1[j]) <= T95) cov[j]++;
        }
      }
    }
  });
  leg('N2.wrongExposure', 'reported', {
    meanRatioBins4to7: [4, 5, 6, 7].map(j => ratio[j] / n),
    coverageBins4to7: [4, 5, 6, 7].map(j => cov[j] / n),
  });
  const cov2 = new Array(8).fill(0);
  let n2 = 0;
  timed('wrongSigma', () => {
    for (let r = 0; r < 400; r++) {
      const t = trial(
        U1_EDGES,
        E_U1,
        GAMMA_U1,
        [0.1, 0.4],
        SC.U1.baseSeed + r,
        { sigmaScale: 0.5 }
      );
      if (t.r.status === 'refused') continue;
      n2++;
      for (let j = 0; j < 8; j++)
        if (t.r.bins[j].status === 'ok' && t.r.deviance(j, GAMMA_U1[j]) <= T95)
          cov2[j]++;
    }
  });
  const perB = cov2.map(c => c / n2);
  leg('N3.wrongSigma', 'reported', {
    perBin: perB,
    meanRich: mean(perB, richU1),
  });
}
{
  // N4: U2
  const medU2 = U2.widths.length ? median(U2.widths) : null;
  leg('N4.outsideDomain', 'reported', {
    unboundedShare: U2.intervalBins ? U2.unboundedBins / U2.intervalBins : null,
    intervalBins: U2.intervalBins,
    medianWidthU2: medU2,
    medianWidthU1: median(wTrue.w),
    widthRatio: medU2 === null ? null : medU2 / median(wTrue.w),
    coverage95Mean: mean(U2.cov95, richU1),
    perBin: U2.cov95,
  });
}
{
  // N5: the sharp feature
  const E60 = new Array(10).fill(60);
  const G = Array.from({ length: 10 }, (_, j) => (j === 4 ? 0.6 : 0.1));
  const out = {};
  for (const kappa of CONST.kappaGrid) {
    let f = 0;
    let nb = 0;
    let n = 0;
    for (let r = 0; r < 400; r++) {
      const objects = genObjects(
        264850 + r,
        P3EDGES,
        G.map((g, j) => g * E60[j]),
        0.2,
        0.2
      );
      const a = populationRates({
        edges: P3EDGES,
        exposure: E60,
        objects,
        penalty: { kappa },
        intervals: false,
      });
      if (a.status === 'refused' || !a.converged || !a.penalty.converged)
        continue;
      n++;
      f += a.penalty.rates[4] / G[4];
      nb += 0.5 * (a.penalty.rates[3] / G[3] + a.penalty.rates[5] / G[5]);
    }
    out[kappa] = { featureRatio: f / n, neighbourRatio: nb / n, replicates: n };
  }
  leg('N5.penaltyFeature', 'reported', out);
}

leg('X1.occurrenceAuthentic', 'not-run', { request: 'R1' });
leg('X2.massFunctionAuthentic', 'not-run', { request: 'R2 (and R3)' });
leg('X3.citedImplementation', 'not-run', { request: 'R4' });
timing.total = Number(cpuNow().toFixed(2));
leg('N6.cpuTime', 'reported', timing);

// ----------------------------------------------------------------------------
// the verdict by the committed function
// ----------------------------------------------------------------------------
const letterGroups = new Set([
  'integrity',
  'oracle',
  'analytic',
  'equivalence',
  'reference',
  'recovery',
  'coverage',
  'misspecified',
  'refusals',
]);
const judged = results.filter(r => letterGroups.has(r.group));
const base = judged.filter(r => r.scope === 'base' || r.scope === 'all');
const unc = judged.filter(r => r.scope === 'unc' || r.scope === 'all');
const basePasses = base.every(r => r.status === 'pass');
const uncPasses = unc.every(r => r.status === 'pass');
const penaltyAdmitted = results
  .filter(r => r.group === 'penalty')
  .every(r => r.status === 'pass');
const letter = basePasses && uncPasses ? 'A' : basePasses ? 'B' : 'C';
const count = s => results.filter(r => r.status === s).length;
const out = {
  format: 'gravitas.population-inference-gate-results/1',
  thresholdsSha256: sha(thrBytes),
  oracleSha256: sha(oracleBytes),
  node: process.version,
  rows: results,
  counts: {
    total: results.length,
    pass: count('pass'),
    fail: count('fail'),
    reported: count('reported'),
    notRun: count('not-run'),
  },
  verdict: {
    letter,
    basePasses,
    uncPasses,
    penaltyAdmitted,
    failing: results.filter(r => r.status === 'fail').map(r => r.id),
  },
};
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
writeFileSync(
  failedPath,
  JSON.stringify(
    {
      format: 'gravitas.population-inference-failed-legs/1',
      note: 'Every failing row of results.json and nothing else; left failing.',
      legs: results.filter(r => r.status === 'fail'),
    },
    null,
    1
  ) + '\n'
);
console.log(JSON.stringify({ counts: out.counts, verdict: out.verdict }));
