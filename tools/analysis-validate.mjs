#!/usr/bin/env node
// =============================================================================
// The analysis laboratory's recovery, coverage and error-rate tables
// -----------------------------------------------------------------------------
//   npm run analysis:validate                  print every table as Markdown
//   npm run analysis:validate -- --json out    and write them
//   npm run analysis:validate -- --quick       a tenth of the trials
//
// What ANALYSIS_LAB.md quotes. Every seed is fixed, so any machine prints the
// same numbers (the step table's last digits follow the engine's Math.cos,
// which V8 fixes). Five groups:
//
//   intervals    how often each interval holds the truth, for normal and for
//                skewed (lognormal) samples of 3 to 20: the Student t
//                interval of a mean, the percentile bootstrap of a median
//   tests        the permutation test's size (how often it cries wolf at
//                5%) and power, and the rank-correlation interval's
//   slopes       local slopes against a known line: the pulls, (estimate -
//                truth) / stated error, should have mean 0 and spread 1
//   models       circular against eccentric orbits on synthetic radial
//                velocities: the likelihood-ratio test's size and power, how
//                often AIC and BIC pick the truth, and what an understated
//                uncertainty does to all of them (a failure case, recorded)
//   step         the real engine, the Binary Planet Lab at three integration
//                steps: how much each value moves when the step halves
// =============================================================================

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import('../js/analysis/stats.js');
const A = await import('../js/analysis/sweepAnalysis.js');
const C = await import('../js/analysis/modelCompare.js');
const { fitOnce } = await import('../js/inference/infer.js');
const { syntheticRv, gaussian } = await import('../js/inference/synthetic.js');
const { MODELS } = await import('../js/inference/models.js');

const arg = name => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const quick = process.argv.includes('--quick');
const N = k => (quick ? Math.max(20, Math.round(k / 10)) : k);
const pct = x => `${(100 * x).toFixed(1)}%`;
const f3 = x => (x === null || !Number.isFinite(x) ? '—' : x.toFixed(3));
const meanSd = xs => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return [
    m,
    Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)),
  ];
};
const tables = {};

// --- Intervals ---------------------------------------------------------------------
{
  const rows = [];
  const draws = {
    normal: g => g(),
    lognormal: g => Math.exp(g()),
  };
  // The truths: a normal's mean and median are 0; a lognormal(0, 1)'s mean is
  // e^(1/2) and its median 1.
  const truth = {
    normal: { mean: 0, median: 0 },
    lognormal: { mean: Math.exp(0.5), median: 1 },
  };
  for (const [shape, draw] of Object.entries(draws))
    for (const n of [3, 5, 10, 20]) {
      const trials = N(2000);
      let tHold = 0;
      let bHold = 0;
      let bTrials = 0;
      const g = gaussian(`intervals-${shape}-${n}`);
      const next = S.stream(`boot-${shape}-${n}`);
      for (let k = 0; k < trials; k++) {
        const xs = Array.from({ length: n }, () => draw(g));
        const ci = S.meanInterval(S.describe(xs));
        if (ci.lo <= truth[shape].mean && truth[shape].mean <= ci.hi) tHold++;
        if (n >= 5 && k < N(1000)) {
          const b = S.bootstrap(xs, S.median, { resamples: 1000, next });
          bTrials++;
          if (b.lo <= truth[shape].median && truth[shape].median <= b.hi)
            bHold++;
        }
      }
      rows.push({
        shape,
        n,
        trials,
        tCoverage: tHold / trials,
        bootTrials: bTrials,
        bootCoverage: bTrials ? bHold / bTrials : null,
      });
    }
  tables.intervals = rows;
}

// --- Tests ------------------------------------------------------------------------
{
  const rows = [];
  for (const [label, effect] of [
    ['no effect (size)', 0],
    ['slope 0.1 sd a step (power)', 0.1],
    ['slope 0.3 sd a step (power)', 0.3],
  ]) {
    const trials = N(1000);
    let rejected = 0;
    const g = gaussian(`perm-${effect}`);
    const next = S.stream(`perm-${effect}`);
    for (let k = 0; k < trials; k++) {
      const groups = Array.from({ length: 8 }, (_, j) =>
        Array.from({ length: 4 }, () => effect * j + g())
      );
      if (S.permutationTest(groups, { permutations: 199, next }).p <= 0.05)
        rejected++;
    }
    rows.push({
      test: 'permutation, 8 settings x 4 seeds',
      case: label,
      trials,
      rate: rejected / trials,
    });
  }
  // The rank correlation's bootstrap interval under no trend: how often it
  // excludes zero, which is the "noTrend" warning's false silence.
  {
    const trials = N(500);
    let excluded = 0;
    const g = gaussian('rho-null');
    for (let k = 0; k < trials; k++) {
      const values = Array.from({ length: 30 }, (_, i) => i / 29);
      const result = {
        format: 'gravitas.experiment-result',
        manifest: {
          vary: [
            {
              parameter: 'p',
              distribution: {
                kind: 'uniform',
                samples: 30,
                min: 0,
                max: 1,
                seed: 'v',
              },
            },
          ],
          observables: { metrics: ['m'] },
        },
        trials: values.map((p, i) => ({
          index: i,
          params: { p },
          seed: 's',
          status: 'ok',
          results: { m: g() },
        })),
      };
      const a = await A.analyzeSweep(result, {
        seed: `rho-${k}`,
        resamples: 400,
        now: () => 0,
      });
      if (!a.warnings.some(w => w.code === 'noTrend')) excluded++;
    }
    rows.push({
      test: 'rank-correlation interval, 30 sampled settings',
      case: 'no trend (excludes zero)',
      trials,
      rate: excluded / trials,
    });
  }
  tables.tests = rows;
}

// --- Slopes ------------------------------------------------------------------------
{
  const rows = [];
  for (const [label, seeds, noise] of [
    ['8 settings, 3 seeds, noise 0.3', 3, 0.3],
    ['8 settings, 6 seeds, noise 0.3', 6, 0.3],
    ['8 settings, 6 seeds, noise 1', 6, 1],
  ]) {
    const trials = N(400);
    const localPulls = [];
    const trendPulls = [];
    const g = gaussian(`slopes-${seeds}-${noise}`);
    for (let k = 0; k < trials; k++) {
      const tr = [];
      for (let x = 1; x <= 8; x++)
        for (let s = 0; s < seeds; s++)
          tr.push({
            index: tr.length,
            params: { p: x },
            seed: `s${s}`,
            status: 'ok',
            results: { m: 2 + 0.5 * x + noise * g() },
          });
      const a = await A.analyzeSweep(
        {
          format: 'gravitas.experiment-result',
          manifest: {
            vary: [{ parameter: 'p', from: 1, to: 8, count: 8 }],
            observables: { metrics: ['m'] },
          },
          trials: tr,
        },
        { seed: `s-${k}`, resamples: 200, permutations: 199, now: () => 0 }
      );
      for (const s of a.sensitivity.local)
        if (s.se > 0) localPulls.push((s.slope - 0.5) / s.se);
      const t = a.sensitivity.trend;
      trendPulls.push((t.slope - 0.5) / t.se);
    }
    const [lm, ls] = meanSd(localPulls);
    const [tm, ts] = meanSd(trendPulls);
    rows.push({
      case: label,
      trials,
      localPullMean: lm,
      localPullSd: ls,
      trendPullMean: tm,
      trendPullSd: ts,
    });
  }
  tables.slopes = rows;
}

// --- Models ------------------------------------------------------------------------
{
  const rows = [];
  const times = Array.from(
    { length: 40 },
    (_, i) => 100 + i * 0.61 + 0.2 * Math.sin(i * 7.1)
  );
  const base = {
    P: { lo: 4.1, hi: 4.4 },
    tc: { lo: 99.5, hi: 101.5 },
    jitter: { mode: 'fixed', value: 0 },
  };
  const circular = {
    model: { id: 'rv-keplerian' },
    parameters: {
      ...base,
      sqrtEcosw: { mode: 'fixed', value: 0 },
      sqrtEsinw: { mode: 'fixed', value: 0 },
    },
  };
  const eccentric = { model: { id: 'rv-keplerian' }, parameters: { ...base } };
  const truthOf = e => ({
    P: 4.2308,
    tc: 100.3,
    K: 25,
    sqrtEcosw: Math.sqrt(e) * Math.cos(1),
    sqrtEsinw: Math.sqrt(e) * Math.sin(1),
  });
  for (const [label, e, stated, period] of [
    ['circular truth (size)', 0, 1],
    ['eccentric truth, e = 0.1', 0.1, 1],
    ['eccentric truth, e = 0.3', 0.3, 1],
    ['circular truth, uncertainty understated by 1.5x', 0, 1 / 1.5],
    // The period range a reader typed, too narrow to hold the truth (4.2308).
    ['circular truth, period range 4.1 to 4.2 d', 0, 1, { lo: 4.1, hi: 4.2 }],
  ]) {
    const trials = N(300);
    let lr = 0;
    let aicTrue = 0;
    let bicTrue = 0;
    let atBound = 0;
    const bounded = req =>
      period ? { ...req, parameters: { ...req.parameters, P: period } } : req;
    const circ = bounded(circular);
    const ecc = bounded(eccentric);
    for (let k = 0; k < trials; k++) {
      const d0 = syntheticRv({
        seed: `models-${e}-${stated}-${k}`,
        times,
        sigma: 5,
        gamma: 3,
        truth: truthOf(e),
      });
      const d = { ...d0, sigma: d0.sigma.map(v => v * stated) };
      const c = C.compareModels(
        [
          { label: 'circular', fit: fitOnce(circ, d), request: circ, data: d },
          { label: 'eccentric', fit: fitOnce(ecc, d), request: ecc, data: d },
        ],
        { models: MODELS, constant: false }
      );
      const truth = e === 0 ? 'circular' : 'eccentric';
      if (c.nested[0]?.p <= 0.05) lr++;
      if (c.preferred.byAic === truth) aicTrue++;
      if (c.preferred.byBic === truth) bicTrue++;
      if (c.warnings.some(w => w.code === 'atBound')) atBound++;
    }
    rows.push({
      case: label,
      trials,
      lrRejects: lr / trials,
      aicPicksTruth: aicTrue / trials,
      bicPicksTruth: bicTrue / trials,
      atBound: atBound / trials,
    });
  }
  tables.models = rows;
}

// --- The integration step, in the real engine ------------------------------------------
{
  const values = [0.05, 0.1, 0.2, 0.3];
  const steps = [30, 60, 120];
  const byStep = {};
  for (const hz of steps) {
    const body = `
const load = p => import('${REPO}/' + p);
const m = {
  physics: await load('js/physics.js'),
  build: await load('js/world/build.js'),
  scenarios: await load('js/scenarios.js'),
  appState: await load('js/appState.js'),
  rng: await load('js/rng.js'),
  timestep: await load('js/timestep.js'),
  units: await load('js/units.js'),
};
const R = await load('js/experiments/trialRunner.js');
const manifest = {
  model: { scenario: 'binary-planet-lab' },
  initial: { settings: {} },
  observables: { metrics: ['distance_to_primary', 'energy_drift'], roles: { bodies: ['planet'], primary: 'Star A' } },
  stop: { duration: 10000, events: [] },
  numerics: { frameSeconds: 1 / ${hz}, sampleEvery: 1 },
  limits: { maxSamplesPerTrial: 50000 },
};
const out = ${JSON.stringify(values)}.map((a, i) => R.runTrial(m, manifest, { index: i, params: { binary_lab_planet_a: a }, seed: 'x' }).results);
console.log(JSON.stringify(out));`;
    byStep[hz] = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', body], {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .trim()
        .split('\n')
        .at(-1)
    );
  }
  tables.step = values.map((a, i) => {
    const v = hz => byStep[hz][i].distance_to_primary;
    const d1 = v(30) - v(60);
    const d2 = v(60) - v(120);
    return {
      a,
      at30: v(30),
      at60: v(60),
      at120: v(120),
      rel30to60: Math.abs(d1 / v(60)),
      rel60to120: Math.abs(d2 / v(120)),
      drift60: byStep[60][i].energy_drift,
    };
  });
}

// --- Print --------------------------------------------------------------------------
const md = [];
md.push(
  '### Intervals: how often the truth is inside',
  '',
  '| Sample | n | Student t, mean | trials | Bootstrap, median | trials |',
  '|---|---:|---:|---:|---:|---:|'
);
for (const r of tables.intervals)
  md.push(
    `| ${r.shape} | ${r.n} | ${pct(r.tCoverage)} | ${r.trials} | ${r.bootCoverage === null ? '—' : pct(r.bootCoverage)} | ${r.bootTrials || '—'} |`
  );
md.push(
  '',
  'Nominal: 95.0%.',
  '',
  '### Tests: how often they reject, at 5%',
  '',
  '| Test | Case | Rate | trials |',
  '|---|---|---:|---:|'
);
for (const r of tables.tests)
  md.push(`| ${r.test} | ${r.case} | ${pct(r.rate)} | ${r.trials} |`);
md.push(
  '',
  '### Slopes: pulls against a known line (mean 0, spread 1 when the errors are right)',
  '',
  '| Case | trials | Local pull mean | Local pull spread | Trend pull mean | Trend pull spread |',
  '|---|---:|---:|---:|---:|---:|'
);
for (const r of tables.slopes)
  md.push(
    `| ${r.case} | ${r.trials} | ${f3(r.localPullMean)} | ${f3(r.localPullSd)} | ${f3(r.trendPullMean)} | ${f3(r.trendPullSd)} |`
  );
md.push(
  '',
  '### Models: circular against eccentric orbits, 40 epochs, K = 25 m/s, sigma = 5 m/s',
  '',
  '| Case | trials | Likelihood ratio rejects circular at 5% | AIC picks the truth | BIC picks the truth | A fit ends at a bound |',
  '|---|---:|---:|---:|---:|---:|'
);
for (const r of tables.models)
  md.push(
    `| ${r.case} | ${r.trials} | ${pct(r.lrRejects)} | ${pct(r.aicPicksTruth)} | ${pct(r.bicPicksTruth)} | ${pct(r.atBound)} |`
  );
const sci = x => x.toExponential(1);
md.push(
  '',
  '### The integration step: Binary Planet Lab, mean distance to the primary (AU), 10,000 time units',
  '',
  '| Planet orbit (separations) | 1/30 s | 1/60 s | 1/120 s | 1/30 to 1/60 | 1/60 to 1/120 | Energy drift at 1/60 s |',
  '|---:|---:|---:|---:|---:|---:|---:|'
);
for (const r of tables.step)
  md.push(
    `| ${r.a} | ${r.at30.toPrecision(6)} | ${r.at60.toPrecision(6)} | ${r.at120.toPrecision(6)} | ${sci(r.rel30to60)} | ${sci(r.rel60to120)} | ${r.drift60 === null ? '—' : `${r.drift60.toPrecision(3)}%`} |`
  );
console.log(md.join('\n'));
const out = arg('--json');
if (out) writeFileSync(out, `${JSON.stringify(tables, null, 2)}\n`);
