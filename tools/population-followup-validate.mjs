// The validator of the follow-up to the population inference gate (Roadmap III, Prompt 264).
//
//   node tools/population-followup-validate.mjs <first|all> <followup-thresholds.json> <thresholds.json>
//     <oracle-results.json> <results.json> <followup-oracle-results.json> <scratch dir> <out.json> [<failed.json>]
//
// first: F1 to F3, the D8b legs and the penalty diagnostic, under the default stopping rule only.
// all:   the same rows again, then PC1 to PC4 under the repaired stopping rule and the outcome.
// It applies the committed bounds of followup-thresholds.json and nothing else.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import {
  populationRates,
  exposureFromSelection,
} from '../js/kernels/statistics/population.js';
import { chi2Quantile } from '../js/kernels/statistics/special.js';
import { selection } from '../js/kernels/statistics/selection.js';
import {
  genObjects,
  sampleText,
  SETS,
  P_EDGES,
  P3_E,
  P3_G,
} from './population-followup-samples.mjs';

const [
  mode,
  fthrPath,
  thrPath,
  pinnedPath,
  partAPath,
  forPath,
  scratch,
  outPath,
  failedPath,
] = process.argv.slice(2);
const sha = b => createHash('sha256').update(b).digest('hex');
const read = p => readFileSync(p);
const fthrBytes = read(fthrPath);
const fthr = JSON.parse(fthrBytes);
const thrBytes = read(thrPath);
const thr = JSON.parse(thrBytes);
const pinnedBytes = read(pinnedPath);
const pinned = JSON.parse(pinnedBytes);
const partA = JSON.parse(read(partAPath));
const forBytes = read(forPath);
const orc = JSON.parse(forBytes);
const TOL = thr.tolerance;
const CONST = thr.constants;
const T95 = chi2Quantile(0.95, 1);
const Z = fthr.ensembles.zeroBins.Z;
const FU = fthr.ensembles.followUp;
const cpu0 = process.cpuUsage();
const cpuNow = () => {
  const c = process.cpuUsage(cpu0);
  return (c.user + c.system) / 1e6;
};
const checks = Object.fromEntries(fthr.checks.map(c => [c.id, c]));
const rows = [];
function leg(id, status, measured) {
  const c = checks[id];
  if (!c) throw new Error(`no committed leg ${id}`);
  rows.push({
    id,
    group: c.group,
    scope: c.scope,
    tier: c.tier,
    status,
    bound: c.bound,
    measured,
  });
}
const partARow = id => partA.rows.find(r => r.id === id).measured;
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const inRange = (v, lo, hi) => v >= lo && v <= hi;
const timing = {};
const timed = (name, fn) => {
  const t = cpuNow();
  const v = fn();
  timing[name] = Number((cpuNow() - t).toFixed(2));
  return v;
};

// ---- the scenario U3 (thresholds.json), by the prototype's own exposure ----------------------
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
const E_U1 = exposureFromSelection({ edges: U1_EDGES, targets: u1Targets() });
const GAMMA_U3 = thr.scenarios.U1.gamma.map(g => g / 6);
const MU_U3 = GAMMA_U3.map((g, j) => E_U1[j] * g);

/** One U3 replicate, exactly as trial() of the Part A validator. */
function u3Fit(seed) {
  const objects = genObjects(seed, U1_EDGES, MU_U3, 0.1, 0.4);
  return populationRates({
    edges: U1_EDGES,
    exposure: E_U1,
    objects,
    levels: [0.95],
    intervals: false,
  });
}

// ---- F1: inputs -------------------------------------------------------------------------------
const git = cmd => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
const streamSha = {};
for (const name of Object.keys(SETS)) streamSha[name] = sha(sampleText(name));
const oracleSets = {
  ...orc.stage2.sets,
  ...orc.stage2b.sets,
};
const u3cSamplesBytes = read(join(scratch, orc.stage1.D8b.samplesFile));
const u3cStatementsBytes = read(join(scratch, orc.stage1.D8b.statementsFile));
const thetasBytes = read(join(scratch, orc.stage2.thetasFile));
const thetasP4Bytes = read(join(scratch, orc.stage2b.thetasFile));
{
  const items = {
    oracleReadThisFile: orc.followupThresholdsSha256 === sha(fthrBytes),
    oracleStage2ReadThisFile:
      orc.stage2.followupThresholdsSha256 === sha(fthrBytes) &&
      orc.stage2b.followupThresholdsSha256 === sha(fthrBytes),
    oracleReadPartAThresholds: orc.thresholdsSha256 === sha(thrBytes),
    oracleReadPartAOracle: orc.partAOracleResultsSha256 === sha(pinnedBytes),
    partAResultsReadSameThresholds: partA.thresholdsSha256 === sha(thrBytes),
    streamSamplesByteForByte: Object.keys(SETS).every(
      n => oracleSets[n] && oracleSets[n].sha256 === streamSha[n]
    ),
    u3cSamples: sha(u3cSamplesBytes) === orc.stage1.D8b.samplesSha256,
    u3cStatements: sha(u3cStatementsBytes) === orc.stage1.D8b.statementsSha256,
    oracleThetas:
      sha(thetasBytes) === orc.stage2.thetasSha256 &&
      sha(thetasP4Bytes) === orc.stage2b.thetasSha256,
    copiedVerbatim: Object.values(orc.copiedVerbatim).every(Boolean),
  };
  leg('F1.inputs', Object.values(items).every(Boolean) ? 'pass' : 'fail', {
    ...items,
    followupThresholdsSha256: sha(fthrBytes),
    followupOracleSha256: sha(forBytes),
    streamSampleSha256: streamSha,
    prototypeBlobAt48d21711: git(
      'rev-parse 48d21711:js/kernels/statistics/population.js'
    ),
    prototypeBlobAsRun: git('hash-object js/kernels/statistics/population.js'),
    validatorBlobAsRun: git(
      'hash-object tools/population-followup-validate.mjs'
    ),
  });
}

// ---- F2: the oracle reproduces Part A ---------------------------------------------------------
{
  const f = orc.stage1.F2;
  const ok =
    f.maxRelLogLik <= TOL.closedForm &&
    f.maxAbsTheta <= TOL.closedForm &&
    f.maxRelExposureU1 <= TOL.closedForm;
  leg('F2.oracleReproduces', ok ? 'pass' : 'fail', f);
}

// ---- helpers of the penalty diagnostic --------------------------------------------------------
/** The smallest eigenvalue of a symmetric n x n row-major matrix by Jacobi rotations. */
function minEig(Hin, n) {
  const A = Float64Array.from(Hin);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += A[p * n + q] ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const th = (A[q * n + q] - A[p * n + p]) / (2 * apq);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + p];
          const akq = A[k * n + q];
          A[k * n + p] = c * akp - s * akq;
          A[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p * n + k];
          const aqk = A[q * n + k];
          A[p * n + k] = c * apk - s * aqk;
          A[q * n + k] = s * apk + c * aqk;
        }
      }
  }
  let m = Infinity;
  for (let i = 0; i < n; i++) m = Math.min(m, A[i * n + i]);
  return m;
}
const FLOOR_FACTOR = 16 * 2 ** -52;
/** The measurements of measurement.diagnostic for one penalised fit. */
function diagnose(r, oracleTheta, tag) {
  const p = r.penalty;
  const d = p.diagnostic;
  const J = p.theta.length;
  const step = d.solve(Float64Array.from(d.H), Float64Array.from(d.grad), J);
  let decrement = null;
  if (step) {
    decrement = 0;
    for (let j = 0; j < J; j++) decrement += 0.5 * d.grad[j] * step[j];
  }
  const floor = FLOOR_FACTOR * Math.max(1, Math.abs(p.objective));
  const dTheta = Math.max(
    ...p.theta.map((t, j) => Math.abs(t - oracleTheta[j]))
  );
  let cls = 'converged';
  if (!p.converged)
    cls =
      dTheta <= 1e-6
        ? decrement !== null && decrement <= floor
          ? 'rounding floor'
          : 'stalled above the floor'
        : 'not at the optimum';
  return {
    ...tag,
    listings: r.n,
    converged: p.converged,
    iterations: d.iterations,
    ended: d.reason,
    damping: d.lambda,
    gmax: d.gmax,
    gmaxPerListing: d.gmax / Math.max(r.n, 1),
    decrement,
    floor,
    minEig: minEig(d.H, J),
    dTheta,
    class: cls,
  };
}
const classCounts = list => {
  const out = {};
  for (const d of list) out[d.class] = (out[d.class] ?? 0) + 1;
  return out;
};
const endedCounts = list => {
  const out = {};
  for (const d of list) out[d.ended] = (out[d.ended] ?? 0) + 1;
  return out;
};
const summary = list => ({
  fits: list.length,
  maxGmax: Math.max(...list.map(d => d.gmax)),
  maxGmaxPerListing: Math.max(...list.map(d => d.gmaxPerListing)),
  maxDTheta: Math.max(...list.map(d => d.dTheta)),
  maxIterations: Math.max(...list.map(d => d.iterations)),
  minMinEig: Math.min(...list.map(d => d.minEig)),
  maxDecrementOverFloor: Math.max(...list.map(d => d.decrement / d.floor)),
});
const thetas = JSON.parse(thetasBytes);
const thetasP4 = JSON.parse(thetasP4Bytes);
const refSpec = (id, penalty) => {
  const d = pinned.designs[id];
  return {
    edges: d.edges,
    exposure: d.exposure,
    reliability: d.reliability,
    objects: d.objects.x.map((x, i) => ({ x, sigma: d.objects.sigma[i] })),
    penalty,
    intervals: false,
  };
};
const stream = name =>
  JSON.parse(sampleText(name)).replicates.map(s =>
    s.x.map((x, i) => ({ x, sigma: s.sigma[i] }))
  );
const penSpec = (objects, E, penalty) => ({
  edges: P_EDGES,
  exposure: E,
  objects,
  penalty,
  intervals: false,
});

// ---- F3: the prototype reproduces Part A (default stopping rule) ------------------------------
const diagRef = [];
const diagP3 = [];
{
  // C3 on Part A's U3 ensemble
  const reps = thr.scenarios.U3.replicates;
  const base = thr.scenarios.U3.baseSeed;
  const cov = new Array(8).fill(0);
  const zero = { n: 0, covered: 0 };
  timed('partAU3', () => {
    for (let r = 0; r < reps; r++) {
      const res = u3Fit(base + r);
      for (let j = 0; j < 8; j++) {
        const b = res.bins[j];
        if (b.status === 'ok') {
          if (res.deviance(j, GAMMA_U3[j]) <= T95) cov[j]++;
        } else if (b.status === 'upper-limit') {
          const lim = b.upperLimit === null ? Infinity : b.upperLimit;
          const c = GAMMA_U3[j] <= lim;
          if (c) cov[j]++;
          zero.n++;
          if (c) zero.covered++;
        }
      }
    }
  });
  const c3 = partARow('C3.coverageU3');
  const perBin = cov.map(c => c / reps);
  const c3ok =
    perBin.every((v, j) => v === c3.perBin[j]) &&
    zero.n === c3.zeroStatements.n &&
    zero.covered === c3.zeroStatements.covered;
  // P2 on the reference samples
  const p2 = partARow('P2.penaltyOracle');
  const per = {};
  let notConv = 0;
  for (const id of ['S1', 'S3'])
    for (const kappa of CONST.kappaGrid) {
      const r = populationRates(refSpec(id, { kappa, diagnostic: true }));
      if (!r.penalty.converged) notConv++;
      const o = pinned.designs[id].penalty[String(kappa)].theta;
      per[`${id}-${kappa}`] = Math.max(
        ...o.map((t, j) => Math.abs(r.penalty.theta[j] - t))
      );
      diagRef.push({
        ...diagnose(r, orc.stage1.referenceFits[`${id}-${kappa}`].thetaNewton, {
          fit: `${id}-${kappa}`,
          kappa,
        }),
        theta: r.penalty.theta,
      });
    }
  const p2ok =
    notConv === p2.notConverged &&
    Object.keys(p2.per).every(k => rel(per[k], p2.per[k]) <= 1e-12);
  // P3 on Part A's ensemble
  const p3 = partARow('P3.penaltyHelps');
  let s0 = 0;
  let s4 = 0;
  let used = 0;
  let dropped = 0;
  timed('partAP3', () => {
    const objs = stream('P3');
    for (let r = 0; r < 400; r++) {
      const a = populationRates(
        penSpec(objs[r], P3_E, { kappa: 4, diagnostic: true })
      );
      if (a.status !== 'refused' && a.penalty)
        diagP3.push({
          ...diagnose(a, thetas.P3[r][0], { replicate: r, kappa: 4 }),
          unpenalisedConverged: a.converged,
          theta: a.penalty.theta,
        });
      if (a.status === 'refused' || !a.converged || !a.penalty.converged) {
        dropped++;
        continue;
      }
      const un = a.bins.map(b => b.rate ?? 0);
      s0 += un.reduce((acc, u, j) => acc + (u / P3_G[j] - 1) ** 2, 0);
      s4 += a.penalty.rates.reduce(
        (acc, u, j) => acc + (u / P3_G[j] - 1) ** 2,
        0
      );
      used++;
    }
  });
  const ratio = s4 / s0;
  const p3ok =
    used === p3.used && dropped === p3.dropped && rel(ratio, p3.ratio) <= 1e-12;
  leg('F3.prototypeReproduces', c3ok && p2ok && p3ok ? 'pass' : 'fail', {
    C3: {
      perBin,
      zeroStatements: zero,
      pinned: { perBin: c3.perBin, zeroStatements: c3.zeroStatements },
      equal: c3ok,
    },
    P2: {
      per,
      notConverged: notConv,
      pinned: { per: p2.per, notConverged: p2.notConverged },
      equal: p2ok,
    },
    P3: {
      used,
      dropped,
      ratio,
      pinned: { used: p3.used, dropped: p3.dropped, ratio: p3.ratio },
      equal: p3ok,
    },
  });
}

// ---- D8b ----------------------------------------------------------------------------------------
const d8b = timed('u3c', () => {
  const reps = FU.U3c.prototypeReplicates;
  const base = FU.U3c.baseSeed;
  const per = Object.fromEntries(
    Z.map(j => [
      j,
      { statements: 0, covered: 0, zeroStatements: 0, zeroCovered: 0 },
    ])
  );
  let outside = 0;
  let refused = 0;
  let notConverged = 0;
  let fits = 0;
  let bad = 0;
  for (let r = 0; r < reps; r++) {
    const res = u3Fit(base + r);
    if (res.status === 'refused') {
      refused++;
      for (const j of Z) per[j].statements++;
      continue;
    }
    if (!res.converged) notConverged++;
    for (let j = 0; j < 8; j++)
      if (!Z.includes(j) && res.bins[j].status === 'upper-limit') outside++;
    for (const j of Z) {
      const b = res.bins[j];
      const p = per[j];
      p.statements++;
      let c = false;
      if (b.status === 'ok') c = res.deviance(j, GAMMA_U3[j]) <= T95;
      else if (b.status === 'upper-limit') {
        const lim = b.upperLimit === null ? Infinity : b.upperLimit;
        c = GAMMA_U3[j] <= lim;
        p.zeroStatements++;
        if (c && res.converged) p.zeroCovered++;
      }
      // AM1 (2): a fit that did not converge does not cover
      if (c && res.converged) p.covered++;
    }
    fits += res.stats.fits;
    bad += res.stats.bad;
  }
  return { reps, base, per, outside, refused, notConverged, fits, bad };
});
{
  const P = Object.values(d8b.per);
  const statements = P.reduce((a, p) => a + p.statements, 0);
  const covered = P.reduce((a, p) => a + p.covered, 0);
  const zs = P.reduce((a, p) => a + p.zeroStatements, 0);
  const zc = P.reduce((a, p) => a + p.zeroCovered, 0);
  const pooled = covered / statements;
  const perBin = Object.fromEntries(
    Z.map(j => [
      j,
      {
        ...d8b.per[j],
        coverage: d8b.per[j].covered / d8b.per[j].statements,
        muTrue: MU_U3[j],
      },
    ])
  );
  const lowest = Math.min(...Z.map(j => perBin[j].coverage));
  const o = orc.stage1.D8b;
  leg('D8b.premise', zs >= 1 && o.zeroStatements >= 1 ? 'pass' : 'fail', {
    prototypeZeroStatements: zs,
    oracleZeroStatements: o.zeroStatements,
  });
  leg('D8b.unconditionalU3', inRange(pooled, 0.9, 0.99) ? 'pass' : 'fail', {
    replicates: d8b.reps,
    baseSeed: d8b.base,
    Z,
    statements,
    covered,
    pooled,
    perBin,
    refused: d8b.refused,
    unpenalisedFitsNotConverged: d8b.notConverged,
    fits: d8b.fits,
    fitsNotConverged: d8b.bad,
  });
  leg('D8b.perBin', lowest >= 0.9 ? 'pass' : 'fail', {
    lowest,
    bin: Z.find(j => perBin[j].coverage === lowest),
  });
  leg('D8b.oracle', inRange(o.pooled, 0.9, 0.99) ? 'pass' : 'fail', {
    replicates: o.replicates,
    baseSeed: o.baseSeed,
    statements: o.statements,
    covered: o.covered,
    pooled: o.pooled,
    perBin: o.perBin,
    fitsNotSuccessful: o.fitsNotSuccessful,
  });
  leg('D8b.r1.conditional', 'reported', {
    prototype: {
      zeroStatements: zs,
      zeroCovered: zc,
      conditionalShare: zs ? zc / zs : null,
      perBin: Object.fromEntries(
        Z.map(j => [
          j,
          {
            zeroStatements: d8b.per[j].zeroStatements,
            zeroCovered: d8b.per[j].zeroCovered,
          },
        ])
      ),
      zeroStatementsOutsideZ: d8b.outside,
    },
    oracle: {
      zeroStatements: o.zeroStatements,
      zeroCovered: o.zeroCovered,
      conditionalShare: o.conditionalShare,
      zeroStatementsOutsideZ: o.zeroStatementsOutsideZ,
    },
    pooledUnconditional: { prototype: pooled, oracle: o.pooled },
    reachesD8Figure094: { prototype: pooled >= 0.94, oracle: o.pooled >= 0.94 },
    lowestBinReaches094: lowest >= 0.94,
  });
}
// D8b.r2: the prototype on the oracle's numpy samples
timed('crossFeed', () => {
  const smp = JSON.parse(u3cSamplesBytes);
  const st = JSON.parse(u3cStatementsBytes);
  let statusDiff = 0;
  let flagDiff = 0;
  let exempt = 0;
  let compared = 0;
  let maxDevDiff = 0;
  let maxLimitRel = 0;
  let devAbove1e6 = 0;
  let devAbove1e3 = 0;
  let maxDevAt = null;
  const differing = [];
  smp.replicates.forEach((s, q) => {
    const res = populationRates({
      edges: smp.edges,
      exposure: smp.exposure,
      objects: s.x.map((x, i) => ({ x, sigma: s.sigma[i] })),
      levels: [0.95],
      intervals: false,
    });
    st.Z.forEach((j, k) => {
      compared++;
      const b = res.bins[j];
      const os = st.status[q][k];
      const ov = st.value[q][k];
      const ps = b.status === 'ok' ? 0 : b.status === 'upper-limit' ? 1 : 2;
      let c = false;
      let pv = null;
      if (ps === 0) {
        pv = res.deviance(j, smp.gamma[j]);
        c = pv <= T95;
      } else if (ps === 1) {
        pv = b.upperLimit;
        c = pv === null || smp.gamma[j] <= pv;
      }
      if (ps !== os) {
        statusDiff++;
        differing.push({
          replicate: q,
          bin: j,
          prototype: ps,
          oracle: os,
          muHatOracle: st.muHat[q][k],
          prototypeValue: pv,
          oracleValue: ov,
          prototypeCovers: c,
          oracleCovers: st.covered[q][k] === 1,
        });
        return;
      }
      if (ps === 0) {
        const dd = Math.abs(pv - ov);
        if (dd > 1e-6) devAbove1e6++;
        if (dd > 1e-3) devAbove1e3++;
        if (dd > maxDevDiff) {
          maxDevDiff = dd;
          maxDevAt = {
            replicate: q,
            bin: j,
            prototype: pv,
            oracle: ov,
            muHatOracle: st.muHat[q][k],
          };
        }
      }
      if (ps === 1 && pv !== null && ov >= 0)
        maxLimitRel = Math.max(maxLimitRel, rel(pv, ov));
      const isExempt =
        (os === 0 && Math.abs(ov - T95) <= 1e-6) ||
        (os === 1 &&
          ov >= 0 &&
          Math.abs(ov - smp.gamma[j]) / smp.gamma[j] <= 1e-9);
      if (isExempt) {
        exempt++;
        return;
      }
      if ((c ? 1 : 0) !== st.covered[q][k]) {
        flagDiff++;
        differing.push({
          replicate: q,
          bin: j,
          status: ps,
          prototypeValue: pv,
          oracleValue: ov,
          prototypeCovers: c,
          oracleCovers: st.covered[q][k] === 1,
        });
      }
    });
  });
  leg('D8b.r2.crossFeed', 'reported', {
    statements: compared,
    statusDiffers: statusDiff,
    flagDiffers: flagDiff,
    exempt,
    maxDevianceDifference: maxDevDiff,
    maxDevianceDifferenceAt: maxDevAt,
    devianceDifferencesAbove1e6: devAbove1e6,
    devianceDifferencesAbove1e3: devAbove1e3,
    maxLimitRelativeDifference: maxLimitRel,
    differing: differing.slice(0, 40),
  });
});
// D8b.r3: the exact coverage of 229's rule on the counts path
{
  const exact = mu => {
    let p = Math.exp(-mu);
    let tot = 0;
    let first = null;
    let last = null;
    for (let n = 0; n < 400; n++) {
      if (n > 0) p *= mu / n;
      const b = populationRates({
        edges: [0, 1],
        exposure: [100],
        counts: [n],
        levels: [0.95],
      }).bins[0];
      const g = mu / 100;
      const c =
        b.status === 'ok'
          ? b.lo <= g && g <= b.hi
          : b.status === 'upper-limit'
            ? g <= b.upperLimit
            : false;
      if (c) {
        tot += p;
        if (n > 0) {
          first ??= n;
          last = n;
        }
      }
    }
    return { muTrue: mu, coverage: tot, coveringCounts: [first, last] };
  };
  const mine = Object.fromEntries(
    Z.map(j => [j, exact(orc.stage1.exposureU1[j] * GAMMA_U3[j])])
  );
  const at5 = exact(5);
  leg('D8b.r3.countsExact', 'reported', {
    prototype: { perBin: mine, at5 },
    scipy: { perBin: orc.stage1.countsExact, at5: orc.stage1.countsExactAt5 },
    maxDifference: Math.max(
      Math.abs(at5.coverage - orc.stage1.countsExactAt5.coverage),
      ...Z.map(j =>
        Math.abs(mine[j].coverage - orc.stage1.countsExact[j].coverage)
      )
    ),
  });
}

// ---- the penalty diagnostic (default rule) ------------------------------------------------------
const strip = d => {
  const { theta, ...restOf } = d;
  return restOf;
};
{
  const nc = [...diagRef, ...diagP3].filter(d => !d.converged);
  leg('PD1.partANotConverged', 'reported', {
    referenceFits: diagRef.filter(d => !d.converged).length,
    p3Replicates: diagP3.filter(d => !d.converged).length,
    classCounts: classCounts(nc),
    endedCounts: endedCounts(nc),
    summary: summary(nc),
    fits: nc.map(strip),
  });
  const cv = [...diagRef, ...diagP3].filter(d => d.converged);
  leg('PD2.partAConverged', 'reported', {
    summary: summary(cv),
    endedCounts: endedCounts(cv),
  });
}
timed('partAP4', () => {
  const objs = stream('P4');
  const E60 = new Array(10).fill(60);
  const out = {};
  CONST.kappaGrid.forEach((kappa, k) => {
    const list = [];
    let unpenalisedNotConverged = 0;
    for (let r = 0; r < 400; r++) {
      const a = populationRates(
        penSpec(objs[r], E60, { kappa, diagnostic: true })
      );
      if (!a.converged) unpenalisedNotConverged++;
      list.push(diagnose(a, thetasP4.P4[r][k], { replicate: r, kappa }));
    }
    const nc = list.filter(d => !d.converged);
    out[kappa] = {
      fits: list.length,
      notConverged: nc.length,
      unpenalisedNotConverged,
      classCounts: classCounts(nc),
      endedCounts: endedCounts(nc),
      notConvergedSummary: nc.length ? summary(nc) : null,
      convergedSummary:
        list.length > nc.length ? summary(list.filter(d => d.converged)) : null,
    };
  });
  leg('PD3.p4', 'reported', out);
});
{
  const sets = { ...orc.stage2.sets, ...orc.stage2b.sets };
  const refs = Object.values(orc.stage1.referenceFits);
  leg('PD4.uniqueness', 'reported', {
    referenceFits: {
      minEig: Math.min(...refs.map(r => r.minEig)),
      negativeUnpenalisedEig: refs.filter(r => r.minEigUnpenalised < 0).length,
      bfgsNotSuccessful: refs.filter(r => !r.bfgsSuccess).length,
      maxNewtonIterations: Math.max(...refs.map(r => r.newtonIterations)),
    },
    streamSets: Object.fromEntries(
      Object.entries(sets).map(([n, s]) => [
        n,
        {
          fits: s.fits,
          minEig: s.minEig,
          negativeUnpenalisedEig: s.negativeUnpenalisedEig,
          bfgsNotSuccessful: s.bfgsNotSuccessful,
          maxNewtonIterations: s.maxNewtonIterations,
          maxGmaxNewton: s.maxGmaxNewton,
        },
      ])
    ),
  });
  const po1 = Math.max(
    orc.stage1.PO1reference,
    orc.stage2.PO1stream,
    orc.stage2b.PO1stream
  );
  leg('PO1.oracleTwoAlgorithms', po1 <= 1e-6 ? 'pass' : 'fail', {
    maxAbsTheta: po1,
    reference: orc.stage1.PO1reference,
    stream: orc.stage2.PO1stream,
    partAP4: orc.stage2b.PO1stream,
    fits: 6 + Object.values(sets).reduce((a, s) => a + s.fits, 0),
  });
}

// ---- the repaired stopping rule (mode all) ------------------------------------------------------
if (mode === 'all') {
  const { penaltyLegs } = await import('./population-followup-penalty.mjs');
  penaltyLegs({
    leg,
    timed,
    fthr,
    thr,
    pinned,
    orc,
    thetas,
    diagRef,
    diagP3,
    refSpec,
    stream,
    penSpec,
    TOL,
    CONST,
  });
}

// ---- the output -----------------------------------------------------------------------------------
timing.total = Number(cpuNow().toFixed(2));
const count = s => rows.filter(r => r.status === s).length;
const out = {
  format: 'gravitas.population-inference-gate-followup-results/1',
  mode,
  followupThresholdsSha256: sha(fthrBytes),
  thresholdsSha256: sha(thrBytes),
  followupOracleSha256: sha(forBytes),
  node: process.version,
  rows,
  counts: {
    pass: count('pass'),
    fail: count('fail'),
    reported: count('reported'),
    notRun: count('not-run'),
  },
  cpuSeconds: timing,
};
if (mode === 'all') {
  const st = id => rows.find(r => r.id === id)?.status;
  const all = ids => ids.every(id => st(id) === 'pass');
  const integrity = all([
    'F1.inputs',
    'F2.oracleReproduces',
    'F3.prototypeReproduces',
  ]);
  const d8bPasses =
    integrity &&
    all(['D8b.premise', 'D8b.unconditionalU3', 'D8b.perBin', 'D8b.oracle']);
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
  const judgedA = partA.rows.filter(r => letterGroups.has(r.group));
  const baseA = judgedA
    .filter(r => r.scope === 'base' || r.scope === 'all')
    .every(r => r.status === 'pass');
  const uncButD8 = judgedA
    .filter(
      r => (r.scope === 'unc' || r.scope === 'all') && r.id !== 'D8.noZeroRule'
    )
    .every(r => r.status === 'pass');
  out.outcome = {
    d8bPasses,
    partABase: baseA,
    partAUncOtherThanD8: uncButD8,
    letter: d8bPasses && baseA && uncButD8 ? 'A through D8b' : 'B stands',
    partALetter: partA.verdict.letter ?? partA.verdict,
    penaltyConvergencePasses:
      integrity &&
      all([
        'PO1.oracleTwoAlgorithms',
        'PC1.share',
        'PC2.oracle',
        'PC3.helps',
        'PC4.sameEstimate',
      ]),
    carried: fthr.carried,
  };
}
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
if (failedPath)
  writeFileSync(
    failedPath,
    JSON.stringify(
      {
        format: 'gravitas.population-inference-gate-followup-failed-legs/1',
        note: 'Every failing row of followup-results.json and nothing else; left failing.',
        legs: rows.filter(r => r.status === 'fail'),
      },
      null,
      1
    ) + '\n'
  );
console.log(
  JSON.stringify(out.counts),
  out.outcome ? JSON.stringify(out.outcome) : '',
  `cpu ${timing.total}s`
);
for (const r of rows) if (r.status === 'fail') console.log('FAIL', r.id);
