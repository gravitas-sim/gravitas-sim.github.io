#!/usr/bin/env node
// =============================================================================
// npm run validate:inference - what the inference core recovers, and how often
// its uncertainty is honest
// -----------------------------------------------------------------------------
// Injects known signals into seeded white noise, fits each, and measures:
//
//   bias       the median of fitted - true
//   rms        the scatter of fitted - true
//   pull       (fitted - true) / stated sigma: mean near 0 and spread near 1
//              when the uncertainty is right
//   cover68    the fraction of seeds whose truth is inside +-1 stated sigma,
//              against the 68.3% it should be
//   cover95    inside +-1.96 sigma, against 95%
//   profile68  inside the Delta chi^2 = 1 profile interval, on a subset
//   failed     not converged, or no signal detected
//
// for each case in ./inference-cases.mjs, then fits the TESS HD 209458 b
// light curve and sets it beside the published parameters. The cases are
// chosen to find where recovery breaks, not to show where it works: a shallow
// transit, a grazing one, a noisy one, a period long enough that the window
// holds one or two transits, and three radial-velocity setups.
//
//   node tools/inference-validate.mjs [--seeds 100] [--profiles 20]
//     [--cases hd209458,rv-circular] [--no-real] [--json out.json]
//
// Deterministic: the same seeds give the same table on every machine.
// INFERENCE_CORE.md has the last run.
// =============================================================================

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fitOnce, profileTask } from '../js/inference/infer.js';
import { CASES, EXPOSURE } from './inference-cases.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, fallback) =>
  argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback;
const SEEDS = Number(opt('--seeds', 100));
const PROFILES = Number(opt('--profiles', 20));
const median = v => {
  const s = [...v].sort((a, b) => a - b);
  return s.length
    ? s.length % 2
      ? s[s.length >> 1]
      : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
    : NaN;
};
const mean = v => v.reduce((a, b) => a + b, 0) / (v.length || 1);
const sd = v => {
  const m = mean(v);
  return Math.sqrt(
    v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1)
  );
};

/** Phase differences of an epoch, taken to the nearest cycle. */
const wrapEpoch = (fit, truth, P) => {
  const c = (fit - truth) / P;
  return (c - Math.round(c)) * P;
};

function runCase(c) {
  const rows = {};
  for (const name of c.check)
    rows[name] = { errors: [], pulls: [], profileHits: 0, profileTried: 0 };
  let failed = 0;
  let degenerate = 0;
  const warnings = {};
  let ms = 0;
  for (let s = 0; s < SEEDS; s++) {
    const data = c.data(s);
    const t0 = performance.now();
    let fit;
    try {
      fit = fitOnce(c.request, data);
    } catch {
      failed++;
      continue;
    }
    ms += performance.now() - t0;
    const codes = new Set(fit.warnings.map(w => w.code));
    for (const code of codes) warnings[code] = (warnings[code] || 0) + 1;
    if (!fit.converged || codes.has('notDetected')) {
      failed++;
      continue;
    }
    if (codes.has('degenerate')) degenerate++;
    const got = Object.fromEntries(fit.parameters.map(p => [p.name, p]));
    for (const name of c.check) {
      const p = got[name];
      let err = p.value - c.truth[name];
      if (name === 't0' || name === 'tc')
        err = wrapEpoch(p.value, c.truth[name], c.truth.P);
      const sigma = p.sigmaRed ?? p.sigmaScaled ?? p.sigma;
      rows[name].errors.push(err);
      if (Number.isFinite(sigma) && sigma > 0)
        rows[name].pulls.push(err / sigma);
    }
    if (s < PROFILES) {
      for (const name of c.profiled) {
        const pr = profileTask(c.request, data, fit, name);
        const [lo, hi] = pr.interval;
        rows[name].profileTried++;
        if (
          (lo === null || lo <= c.truth[name]) &&
          (hi === null || hi >= c.truth[name])
        )
          rows[name].profileHits++;
      }
    }
  }
  const table = Object.entries(rows).map(([name, r]) => ({
    parameter: name,
    truth: c.truth[name],
    fits: r.errors.length,
    bias: median(r.errors),
    rms: Math.sqrt(mean(r.errors.map(e => e * e))),
    pullMean: mean(r.pulls),
    pullSd: sd(r.pulls),
    cover68:
      r.pulls.filter(p => Math.abs(p) < 1).length / (r.pulls.length || 1),
    cover95:
      r.pulls.filter(p => Math.abs(p) < 1.96).length / (r.pulls.length || 1),
    profile68: r.profileTried ? r.profileHits / r.profileTried : null,
    profileSeeds: r.profileTried,
  }));
  return {
    name: c.name,
    what: c.what,
    kind: c.kind,
    seeds: SEEDS,
    failed,
    degenerate,
    warnings,
    msPerFit: ms / Math.max(1, SEEDS - failed),
    table,
  };
}

async function realData() {
  const { openFixture } = await import('../js/observatory/fixtures.js');
  const { dataFrom } = await import('../js/inference/infer.js');
  const o = await openFixture('tess-light-curve');
  const data = dataFrom(o);
  const request = {
    model: { id: 'transit-quadratic' },
    parameters: {
      t0: { lo: data.x[0], hi: data.x[0] + 3.65 },
      P: { lo: 3.4, hi: 3.65 },
    },
    settings: { exposure: EXPOSURE, supersample: 5, annuli: 32 },
  };
  const fit = fitOnce(request, data);
  const profiles = {};
  for (const name of ['k', 'aRs', 'b'])
    profiles[name] = profileTask(request, data, fit, name).interval;
  const get = n =>
    fit.parameters.find(p => p.name === n) ||
    fit.derived.find(d => d.name === n);
  // NASA Exoplanet Archive, HD 209458 b: the Stassun et al. 2017 parameter set
  // (Rp/R*, a/R*, i, P) and Knutson et al. 2007 (T14).
  const published = [
    {
      name: 'k',
      value: 0.12086,
      sigma: 0.0001,
      ref: 'Stassun et al. 2017 (NASA Exoplanet Archive)',
    },
    { name: 'aRs', value: 8.76, sigma: 0.04, ref: 'Stassun et al. 2017' },
    {
      name: 'inclination',
      value: 86.71,
      sigma: 0.05,
      ref: 'Stassun et al. 2017',
    },
    {
      name: 'b',
      value: 8.76 * Math.cos((86.71 * Math.PI) / 180),
      sigma: null,
      ref: 'a/R* cos i from the same set',
    },
    {
      name: 'P',
      value: 3.52474859,
      sigma: 0.00000038,
      ref: 'Knutson et al. 2007',
    },
    // 3.072 +- 0.003 hours, in the light curve's days.
    {
      name: 'T14',
      value: 3.072 / 24,
      sigma: 0.003 / 24,
      ref: 'Knutson et al. 2007 (3.072 h)',
    },
  ];
  return {
    chi2: fit.chi2,
    reducedChi2: fit.reducedChi2,
    beta: fit.redNoise?.beta ?? null,
    residualRmsPpm: fit.residualRms * 1e6,
    warnings: fit.warnings.map(w => w.code),
    rows: published.map(p => {
      const g = get(p.name);
      const sigmaStated = g.sigma;
      const sigmaHonest = g.sigmaRed ?? g.sigmaScaled ?? g.sigma;
      return {
        parameter: p.name,
        fitted: g.value,
        sigmaStated,
        sigmaHonest,
        profile: profiles[p.name] ?? null,
        published: p.value,
        publishedSigma: p.sigma,
        ref: p.ref,
        apartInHonestSigma: (g.value - p.value) / sigmaHonest,
      };
    }),
  };
}

const fmt = (v, d = 3) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '-'
    : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0)
      ? v.toExponential(2)
      : v.toFixed(d);

const ONLY = opt('--cases', null)?.split(',');
const report = { seeds: SEEDS, profileSeeds: PROFILES, cases: [], real: null };
for (const c of CASES.filter(c => !ONLY || ONLY.includes(c.name))) {
  const r = runCase(c);
  report.cases.push(r);
  console.error(
    `${c.name}: ${r.seeds} seeds, ${r.failed} failed, ${r.msPerFit.toFixed(0)} ms a fit`
  );
}
report.real = argv.includes('--no-real') ? null : await realData();

const out = opt('--json', null);
if (out)
  writeFileSync(
    path.resolve(REPO, out),
    `${JSON.stringify(report, null, 2)}\n`
  );
for (const r of report.cases) {
  console.log(
    `\n${r.name} - ${r.what}\n  ${r.seeds} seeds; ${r.failed} failed; degeneracy flagged in ${r.degenerate}; ${r.msPerFit.toFixed(0)} ms a fit`
  );
  console.log(
    '  parameter  truth        bias        rms         pull mean  pull sd  cover68  cover95  profile68'
  );
  for (const t of r.table) {
    console.log(
      `  ${t.parameter.padEnd(9)}  ${fmt(t.truth, 4).padEnd(11)}  ${fmt(t.bias, 5).padEnd(10)}  ${fmt(t.rms, 5).padEnd(10)}  ${fmt(t.pullMean, 2).padStart(9)}  ${fmt(t.pullSd, 2).padStart(7)}  ${(t.cover68 * 100).toFixed(0).padStart(6)}%  ${(t.cover95 * 100).toFixed(0).padStart(6)}%  ${t.profile68 === null ? '-' : `${(t.profile68 * 100).toFixed(0)}% of ${t.profileSeeds}`}`
    );
  }
}
const R = report.real;
if (R)
  console.log(
    `\nHD 209458 b, TESS sector 56: reduced chi-square ${R.reducedChi2.toFixed(2)}, beta ${fmt(R.beta, 2)}, residual rms ${R.residualRmsPpm.toFixed(0)} ppm; ${R.warnings.join(', ')}`
  );
for (const r of R?.rows || []) {
  console.log(
    `  ${r.parameter.padEnd(11)} ${fmt(r.fitted, 6)} +- ${fmt(r.sigmaHonest, 4)} (stated ${fmt(r.sigmaStated, 4)})  profile ${r.profile ? r.profile.map(v => fmt(v, 5)).join('..') : '-'}  published ${fmt(r.published, 6)}${r.publishedSigma ? ` +- ${fmt(r.publishedSigma, 4)}` : ''}  apart ${fmt(r.apartInHonestSigma, 2)} sigma  (${r.ref})`
  );
}
