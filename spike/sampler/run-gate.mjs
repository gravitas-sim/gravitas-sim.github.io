// Prototype (spike): runs THRESHOLDS.md's accuracy, profile, diagnostics and
// refusal criteria in Node and writes results/*.json. Timing on the low-end
// profile is bench.mjs's.
//   node spike/sampler/run-gate.mjs G|B|P|T|refusal [replicates]
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRun } from './ensemble.js';
import { report, pooled, LIMITS } from './diagnostics.js';
import {
  problemG,
  problemB,
  problemP,
  problemT,
  gridPosterior,
  normalInv,
} from './problems.js';
import { profileTask } from '../../js/inference/infer.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'results');
const REF = path.join(HERE, 'reference');
mkdirSync(OUT, { recursive: true });
mkdirSync(REF, { recursive: true });

const stats = x => {
  const n = x.length;
  let m = 0;
  for (let i = 0; i < n; i++) m += x[i];
  m /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (x[i] - m) ** 2;
  const s = Float64Array.from(x).sort();
  const q = p => {
    const t = (n - 1) * p;
    const i = Math.floor(t);
    return s[i] + (s[Math.min(n - 1, i + 1)] - s[i]) * (t - i);
  };
  return {
    mean: m,
    sd: Math.sqrt(v / (n - 1)),
    quantiles: [q(0.16), q(0.5), q(0.84)],
  };
};

/** THRESHOLDS.md section 1, for one replicate's pooled draws. */
export function accuracy(draws, truth, { sdTol = 0.1, qTol = 0.15 } = {}) {
  const rows = [];
  const d = draws.length;
  const got = draws.map(stats);
  for (let k = 0; k < d; k++) {
    const t = {
      mean: truth.mean[k],
      sd: truth.sd[k],
      quantiles: truth.quantiles[k],
    };
    const dm = Math.abs(got[k].mean - t.mean) / t.sd;
    const ratio = got[k].sd / t.sd;
    const dq = got[k].quantiles.map(
      (v, i) => Math.abs(v - t.quantiles[i]) / t.sd
    );
    rows.push({
      parameter: k,
      meanErrorSd: dm,
      sdRatio: ratio,
      quantileErrorSd: dq,
      pass:
        dm <= 0.1 &&
        Math.abs(ratio - 1) <= sdTol + 1e-12 &&
        dq.every(v => v <= qTol),
    });
  }
  const extra = [];
  if (truth.corr) {
    let worst = 0;
    for (let i = 0; i < d; i++)
      for (let j = i + 1; j < d; j++) {
        let s = 0;
        const n = draws[i].length;
        for (let t = 0; t < n; t++)
          s += (draws[i][t] - got[i].mean) * (draws[j][t] - got[j].mean);
        const r = s / (n - 1) / (got[i].sd * got[j].sd);
        worst = Math.max(worst, Math.abs(r - truth.corr[i][j]));
      }
    extra.push({ criterion: 'correlation', worst, pass: worst <= 0.1 });
  }
  if (truth.slope !== undefined) {
    const x = draws[0];
    const y = draws[1];
    const n = x.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let t = 0; t < n; t++) {
      const u = x[t] * x[t];
      sx += u;
      sy += y[t];
      sxx += u * u;
      sxy += u * y[t];
    }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    extra.push({
      criterion: 'slope',
      value: slope,
      pass: slope >= -0.036 && slope <= -0.024,
    });
  }
  return {
    rows,
    extra,
    pass: rows.every(r => r.pass) && extra.every(e => e.pass),
  };
}

function diagSummary(r) {
  const p = r.diagnostics.parameters;
  return {
    status: r.status,
    reasons: r.reasons,
    maxRhatEnsembles: Math.max(...p.map(x => x.rhatEnsembles)),
    maxRhatWalkers: Math.max(...p.map(x => x.rhatWalkers)),
    minEss: Math.min(...p.map(x => x.ess)),
    maxTau: Math.max(...p.map(x => x.tau)),
    minStepsPerTau: Math.min(...p.map(x => x.stepsPerTau)),
    acceptance: r.diagnostics.acceptance,
  };
}

const FACTOR = Number(process.env.STEPS_FACTOR || 1);
const SUFFIX = FACTOR === 1 ? '' : `-x${FACTOR}`;

function sample(problem, seed, steps = Math.round(problem.steps * FACTOR)) {
  let evals = 0;
  const logProb = x => {
    evals++;
    return problem.logProb(x);
  };
  const t0 = performance.now();
  const run = createRun({
    logProb,
    d: problem.d,
    steps,
    seed: `p103-${problem.id}-${seed}`,
    center: problem.center,
    scale: problem.scale,
    lo: problem.lo,
    hi: problem.hi,
    init: problem.init,
  });
  while (!run.done()) run.advance(250);
  const ms = performance.now() - t0;
  return { run, evals, ms };
}

async function standard(id, reps) {
  const results = [];
  for (let s = 1; s <= reps; s++) {
    const problem =
      id === 'G' ? problemG() : id === 'B' ? problemB() : problemP();
    const { run, evals, ms } = sample(problem, s);
    const rep = report(run, problem.names);
    const row = {
      seed: s,
      evals,
      ms,
      retainedBytes: run.retainedBytes(),
      diag: diagSummary(rep),
    };
    if (rep.status === 'ok') {
      row.accuracy = accuracy(
        pooled(run),
        problem.truth,
        id === 'B' ? { sdTol: 0.15, qTol: 0.2 } : {}
      );
    } else row.accuracy = { pass: false, refused: true };
    // Informational only: the draws' accuracy whether or not the diagnostics
    // let them be reported.
    row.accuracyIgnoringRefusal = accuracy(
      pooled(run),
      problem.truth,
      id === 'B' ? { sdTol: 0.15, qTol: 0.2 } : {}
    ).pass;
    results.push(row);
    console.log(
      id,
      s,
      rep.status,
      row.accuracy.pass,
      row.diag.maxRhatEnsembles.toFixed(3),
      row.diag.minEss.toFixed(0),
      row.diag.maxTau.toFixed(1),
      (ms / 1000).toFixed(1) + 's'
    );
  }
  write(id, results);
}

function write(id, results) {
  const passes = results.filter(r => r.accuracy.pass).length;
  const out = { problem: id, replicates: results.length, passes, results };
  writeFileSync(
    path.join(OUT, `${id}${SUFFIX}.json`),
    JSON.stringify(out, null, 1)
  );
  console.log(`${id}: ${passes}/${results.length} replicates pass accuracy`);
}

/** The gridded log posterior of a 2-D problem, written for the emcee reference. */
function writeGrid(name, problem, g, ax) {
  const n = g.n;
  const buf = new Float32Array(n * n);
  const xs = ax;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      buf[i * n + j] = problem.logProb([xs[0][i], xs[1][j]]);
  writeFileSync(path.join(REF, `${name}.grid.f32`), Buffer.from(buf.buffer));
  writeFileSync(
    path.join(REF, `${name}.grid.json`),
    JSON.stringify({
      n,
      axes: xs.map(a => [a[0], a[a.length - 1]]),
      names: problem.names,
    })
  );
}

async function transit(caseName, reps) {
  const results = [];
  for (let s = 1; s <= reps; s++) {
    const problem = problemT(caseName, s);
    const gt = performance.now();
    const grid = problem.gridPosterior();
    const gridMs = performance.now() - gt;
    const truth = {
      mean: grid.parameters.map(p => p.mean),
      sd: grid.parameters.map(p => p.sd),
      quantiles: grid.parameters.map(p => p.quantiles),
    };
    if (s === 1 && caseName === 'hd209458') {
      const ax = [0, 1].map(i => {
        // the box the grid used is its first and last axis points
        return null;
      });
      void ax;
    }
    const { run, evals, ms } = sample(problem, s);
    const rep = report(run, problem.names);
    const row = {
      seed: s,
      gridMs,
      gridEdgeMass: grid.edgeMass,
      gridSpan: grid.span,
      evals,
      ms,
      retainedBytes: run.retainedBytes(),
      diag: diagSummary(rep),
      reference: { parameters: grid.parameters, correlation: grid.correlation },
    };
    if (rep.status === 'ok') {
      const draws = pooled(run);
      row.accuracy = accuracy(draws, truth);
      row.posterior = rep.summary;
    } else row.accuracy = { pass: false, refused: true };
    row.accuracyIgnoringRefusal = accuracy(pooled(run), truth).pass;
    // the profile interval, with the same fixed parameters
    const prof = {};
    for (const name of ['k', 'b']) {
      const pr = profileTask(problem.request, problem.data, problem.fit, name);
      prof[name] = pr.interval;
    }
    row.profile = prof;
    row.fit = Object.fromEntries(
      problem.fit.parameters
        .filter(p => p.mode === 'fitted')
        .map(p => [
          p.name,
          { value: p.value, sigma: p.sigma, sigmaScaled: p.sigmaScaled },
        ])
    );
    if (rep.status === 'ok') {
      row.widthRatio = {};
      ['k', 'b'].forEach((name, i) => {
        const [lo, hi] = prof[name];
        const post = rep.summary[i];
        row.widthRatio[name] =
          lo !== null && hi !== null ? (post.q84 - post.q16) / (hi - lo) : null;
      });
      row.profilePass = row.widthRatio.k >= 0.75 && row.widthRatio.k <= 1.25;
    } else row.profilePass = false;
    // Informational only: the same ratios from the draws whether or not the
    // diagnostics let them be reported, and the posterior's own numbers.
    {
      const dr = pooled(run).map(stats);
      row.posteriorIgnoringRefusal = dr;
      row.widthRatioIgnoringRefusal = {};
      ['k', 'b'].forEach((name, i) => {
        const [lo, hi] = prof[name];
        row.widthRatioIgnoringRefusal[name] =
          lo !== null && hi !== null
            ? (dr[i].quantiles[2] - dr[i].quantiles[0]) / (hi - lo)
            : null;
      });
    }
    results.push(row);
    console.log(
      'T',
      caseName,
      s,
      rep.status,
      row.accuracy.pass,
      'ratio k',
      row.widthRatio?.k?.toFixed(3),
      row.diag.maxRhatEnsembles.toFixed(3),
      row.diag.minEss.toFixed(0),
      row.diag.maxTau.toFixed(1),
      (ms / 1000).toFixed(0) + 's'
    );
    if (s === 1) {
      // keep the grid for the offline reference
      const p = problemT(caseName, 1);
      void p;
    }
    writeFileSync(
      path.join(OUT, `T-${caseName}${SUFFIX}.json`),
      JSON.stringify(
        {
          problem: `T-${caseName}`,
          replicates: results.length,
          passes: results.filter(r => r.accuracy.pass).length,
          profilePasses: results.filter(r => r.profilePass).length,
          results,
        },
        null,
        1
      )
    );
  }
}

async function refusal() {
  const out = { short: [], bimodal: [] };
  for (let s = 1; s <= 10; s++) {
    const b = problemB();
    const { run } = sample(b, s, 100);
    const rep = report(run, b.names);
    out.short.push({
      seed: s,
      status: rep.status,
      reasons: rep.reasons.slice(0, 3),
      hasSummary: Boolean(rep.summary),
    });
  }
  for (let s = 1; s <= 10; s++) {
    const logProb = x => {
      const a = -0.5 * (x[0] - 6) ** 2;
      const b = -0.5 * (x[0] + 6) ** 2;
      const m = Math.max(a, b);
      return m + Math.log(Math.exp(a - m) + Math.exp(b - m)) - 0.5 * x[1] ** 2;
    };
    const problem = {
      id: 'bimodal',
      d: 2,
      names: ['x1', 'x2'],
      logProb,
      center: [0, 0],
      scale: [1, 1],
      // two ensembles in each mode, a unit ball around it
      init: (e, rng, normal) => [(e < 2 ? -6 : 6) + normal(), normal()],
    };
    const { run } = sample(problem, s, 4000);
    const rep = report(run, problem.names);
    out.bimodal.push({
      seed: s,
      status: rep.status,
      reasons: rep.reasons.slice(0, 3),
      hasSummary: Boolean(rep.summary),
    });
  }
  out.shortRefused = out.short.filter(
    r => r.status === 'refused' && !r.hasSummary
  ).length;
  out.bimodalRefused = out.bimodal.filter(
    r => r.status === 'refused' && !r.hasSummary
  ).length;
  writeFileSync(path.join(OUT, 'refusal.json'), JSON.stringify(out, null, 1));
  console.log(
    'short refused',
    out.shortRefused,
    '/10; bimodal refused',
    out.bimodalRefused,
    '/10'
  );
}

const [, , what, n] = process.argv;
const reps = Number(n || 10);
if (['G', 'B', 'P'].includes(what)) await standard(what, reps);
else if (what === 'T') await transit(process.argv[4] || 'hd209458', reps);
else if (what === 'refusal') await refusal();
else console.log('usage: run-gate.mjs G|B|P|refusal [n] | T [n] [case]');
void gridPosterior;
void normalInv;
void existsSync;
void readFileSync;
void LIMITS;
