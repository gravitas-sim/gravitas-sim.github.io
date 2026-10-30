#!/usr/bin/env node
// =============================================================================
// The transit model delta against its committed thresholds (Prompt 225)
// -----------------------------------------------------------------------------
//   npm run transit-delta:validate                    print the table
//   npm run transit-delta:validate -- --json          print it as JSON
//   npm run transit-delta:validate -- --write-failed  rewrite tests/fixtures/transit-delta/failed-legs.json
//   npm run transit-delta:validate -- --write-results rewrite tests/fixtures/transit-delta/results.json
//   npm run transit-delta:validate -- --only=A,B0     run the rows whose id starts with one of these
//
// tests/fixtures/transit-delta/thresholds.json fixed every bound before any of the delta
// existed; the oracle (tools/transit-delta-oracle/oracle.py: numpy, scipy and batman, no
// Gravitas code) pinned its results in oracle-results.json before the kernel did. This runs
// the checks against the kernel and the models and judges them against the bounds read from
// that file. A crossed bound is a failed row, left failing in failed-legs.json; a leg whose
// data was never supplied is NOT RUN and says so.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  claretTotalLight,
  claretIntensity,
  eccentricityFactor,
  occultationLaw,
  RHO_SUN,
  stellarDensity,
  transitFlux,
  uniformOccultation,
} from '../js/inference/transit.js';
import { confidenceEllipse } from '../js/inference/transitDelta.js';
import { fitOnce } from '../js/inference/infer.js';
import { syntheticTransit, tessLikeTimes } from '../js/inference/synthetic.js';
import { solveKepler } from '../js/orbital.js';
import { gaussian, stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/transit-delta';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read(`${DIR}/thresholds.json`);
// The oracle as first run, kept as committed (its exposure window was too long by one sample
// in 21, which the first judgement of B1 to B4 did not know; see AM1 in thresholds.json), and
// the oracle as amended, against which B1b to B4b are judged with the same bounds.
const ORA_FIRST = read(`${DIR}/oracle-results-first.json`);
const ORA = read(`${DIR}/oracle-results.json`);
const HD = read(`${DIR}/hd209458-s56.json`);
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const C4 = THR.law.test;
const EXPOSURE = THR.sampling.exposure_d;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const median = a => {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : NaN;
};
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);

const args = process.argv.slice(2);
const flag = f => args.includes(f);
const only = (args.find(a => a.startsWith('--only=')) ?? '')
  .slice(7)
  .split(',')
  .filter(Boolean);
const wanted = id => !only.length || only.some(p => id.startsWith(p));

/** A fitOnce() data frame. */
function frame(x, y, sigma) {
  return {
    x: Float64Array.from(x),
    y: Float64Array.from(y),
    sigma:
      sigma === null
        ? null
        : Float64Array.from({ length: x.length }, (_, i) => sigma[i] ?? sigma),
    groups: null,
    rows: Array.from(x, (_, i) => i),
    counts: {
      total: x.length,
      used: x.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'flux', sigma: 'flux-error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}
const constantSigma = (n, s) => new Float64Array(n).fill(s);

// --- A: analytic --------------------------------------------------------------------

function groupA() {
  if (wanted('A1')) {
    const L = lim('A1');
    let worst = 0;
    for (const k of [0.01, 0.05, 0.12, 0.3])
      for (let z = 0; z <= 1 + k; z += 0.0173)
        worst = Math.max(
          worst,
          Math.abs(
            occultationLaw(z, k, { c: [0, 0, 0, 0] }, 64) -
              uniformOccultation(z, k)
          ) /
            (k * k)
        );
    row('A1', worst <= L.maxAbsOverK2, sig(worst), 'max |difference| / k^2');
  }
  if (wanted('A2')) {
    const L = lim('A2');
    let worst = 0;
    for (const k of [0.12, 0.3])
      for (let z = 0; z <= 1 + k; z += 0.0071)
        worst = Math.max(
          worst,
          Math.abs(
            occultationLaw(z, k, { c: [0, L.u, 0, 0] }, 64) -
              occultationLaw(z, k, { u1: L.u, u2: 0 }, 64)
          )
        );
    row('A2', worst <= L.maxAbsFlux, sig(worst), 'max |difference|');
  }
  if (wanted('A3')) {
    const L = lim('A3');
    // 2 pi integral of I(mu) mu dmu with mu = s^4: I(s^4) 4 s^7, a polynomial in s.
    const N = 4_000_000;
    let acc = 0;
    const f = s => claretIntensity(s ** 4, C4) * 4 * s ** 7;
    for (let i = 0; i <= N; i++)
      acc += (i === 0 || i === N ? 1 : i % 2 ? 4 : 2) * f(i / N);
    const numeric = (2 * Math.PI * acc) / (3 * N);
    const r1 = Math.abs(claretTotalLight(C4) / numeric - 1);
    // The light within r = 0.3 at the centre of the disk: occultation at z = 0.
    const k = 0.3;
    const M = 200000;
    let inner = 0;
    const g = r => claretIntensity(Math.sqrt(1 - r * r), C4) * 2 * Math.PI * r;
    for (let i = 0; i <= M; i++)
      inner += (i === 0 || i === M ? 1 : i % 2 ? 4 : 2) * g((k * i) / M);
    inner *= k / (3 * M);
    const depth = occultationLaw(0, k, { c: C4 }, 64);
    const r2 = Math.abs(depth / (inner / claretTotalLight(C4)) - 1);
    row(
      'A3',
      Math.max(r1, r2) <= L.relative,
      { total: sig(r1), innerLight: sig(r2) },
      'relative; total light, and the light within r = 0.3'
    );
  }
  if (wanted('A4')) {
    const L = lim('A4');
    const k = 0.01;
    const b = 0.5;
    const muC = Math.sqrt(1 - b * b);
    const mean = claretTotalLight(C4) / Math.PI;
    const expected = (k * k * claretIntensity(muC, C4)) / mean;
    const got = occultationLaw(b, k, { c: C4 }, 64);
    const r = Math.abs(got / expected - 1);
    row('A4', r <= L.relative, sig(r), 'relative to k^2 I(mu_c) / <I>');
  }
  if (wanted('A5')) {
    const L = lim('A5');
    const aRs = 149597870.7 / 695700;
    const rho = stellarDensity(aRs, 365.256363) / 1000;
    const r = Math.abs(rho / 1.4098 - 1);
    row(
      'A5',
      r <= L.relative,
      { rho: sig(rho, 5), RHO_SUN: sig(RHO_SUN / 1000, 5) },
      'g/cm^3 against 1.4098'
    );
  }
  if (wanted('A6')) {
    const L = lim('A6');
    let worst = 0;
    for (const e of [0, 0.1, 0.3, 0.5])
      for (const wd of [0, 60, 90, 200]) {
        const w = (wd * Math.PI) / 180;
        // The sky coordinate perpendicular to the line of sight, a = 1, n = 1.
        const s = M => {
          const E = solveKepler(M, e);
          const X = Math.cos(E) - e;
          const Y = Math.sqrt(1 - e * e) * Math.sin(E);
          return X * Math.cos(w) - Y * Math.sin(w);
        };
        const f = Math.PI / 2 - w;
        const E0 =
          2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(f / 2));
        const M0 = E0 - e * Math.sin(E0);
        const d = 1e-5;
        const speed = Math.abs((s(M0 + d) - s(M0 - d)) / (2 * d));
        const psi = (1 + e * Math.sin(w)) / Math.sqrt(1 - e * e);
        worst = Math.max(worst, Math.abs(speed / psi - 1));
      }
    const cubed = eccentricityFactor(0.3, 90);
    const expected = (1.3 / Math.sqrt(1 - 0.09)) ** 3;
    worst = Math.max(worst, Math.abs(cubed / expected - 1));
    row(
      'A6',
      worst <= L.relative,
      sig(worst),
      'relative, worst of 16 orbits and the cube'
    );
  }
  if (wanted('A7')) {
    const L = lim('A7');
    const level = 0.6827;
    const s = Math.sqrt(-2 * Math.log(1 - level));
    const a = confidenceEllipse(
      [
        [4, 0],
        [0, 1],
      ],
      level
    );
    const th = Math.PI / 6;
    const c = Math.cos(th);
    const sn = Math.sin(th);
    const cov = [
      [4 * c * c + sn * sn, (4 - 1) * c * sn],
      [(4 - 1) * c * sn, 4 * sn * sn + c * c],
    ];
    const b = confidenceEllipse(cov, level);
    const axes = Math.max(
      Math.abs(a.semiMajor / (2 * s) - 1),
      Math.abs(a.semiMinor / s - 1),
      Math.abs(b.semiMajor / (2 * s) - 1),
      Math.abs(b.semiMinor / s - 1),
      Math.abs(b.angle - th)
    );
    const draw = gaussian(stream('noise', 'transit-delta-ellipse'));
    let inside = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const u = 2 * draw();
      const v = draw();
      if ((u * u) / 4 + v * v <= s * s) inside++;
    }
    const share = inside / N;
    row(
      'A7',
      axes <= L.relativeAxes && Math.abs(share - level) <= L.inside,
      { axes: sig(axes), inside: share },
      'semi-axes and angle; the seeded draw'
    );
  }
  if (wanted('A8'))
    notRun(
      'A8',
      'the Claret (2017) TESS table was not supplied (VizieR unreachable from the machine); the lookup code is tested on a labelled miniature grid in tests/transitDelta.test.js, which is not this leg'
    );
}

// --- B: the independent oracle -------------------------------------------------------

function groupB0() {
  const L = lim('B0');
  const fw = THR.forwardCases;
  let worst = 0;
  const per = {};
  for (const [name, c] of Object.entries(fw.cases)) {
    const t = Array.from(
      { length: fw.points },
      (_, i) => c.t0 + (-fw.window_d + (2 * fw.window_d * i) / (fw.points - 1))
    );
    const p = { t0: c.t0, P: c.P, k: c.k, aRs: c.aRs, b: c.b };
    const flux = transitFlux(
      t,
      c.law === 'quadratic'
        ? { ...p, u1: c.u[0], u2: c.u[1] }
        : { ...p, c: C4 },
      { annuli: THR.sampling.annuli }
    );
    let m = 0;
    for (let i = 0; i < t.length; i++)
      m = Math.max(m, Math.abs(flux[i] - ORA.forward[name].flux[i]));
    per[name] = sig(m);
    worst = Math.max(worst, m);
  }
  row(
    'B0',
    worst <= L.maxAbsFlux,
    { worst: sig(worst), per },
    'max |flux difference|'
  );
}

const BOUNDS = (c, data) => ({
  t0: { lo: data.x[0], hi: data.x[0] + c.P + 0.5 },
  P: { lo: c.P - 0.05, hi: c.P + 0.05 },
});

function gravitasFit(c, data) {
  const quad = c.law === 'quadratic';
  return fitOnce(
    {
      model: { id: quad ? 'transit-quadratic' : 'transit-claret4' },
      parameters: BOUNDS(c, data),
      settings: {
        exposure: EXPOSURE,
        supersample: THR.sampling.fitSupersample,
        annuli: THR.sampling.annuli,
        ...(quad ? {} : { claret: C4 }),
      },
    },
    data
  );
}

function compareFits(gfit, ofit, names) {
  const out = {};
  let worst = 0;
  for (const n of names) {
    const g = gfit.parameters.find(p => p.name === n);
    const sg = ofit.sigma[n];
    const diff = Math.abs(g.value - ofit.values[n]) / sg;
    const ratio = g.sigma / sg;
    out[n] = { sigmas: sig(diff), sigmaRatio: sig(ratio) };
    worst = Math.max(worst, diff);
    out.__ratio = out.__ratio ?? [];
    out.__ratio.push(ratio);
  }
  return { out, worst };
}

function groupB(ORA, sfx) {
  const B1 = lim('B1');
  const B2 = lim('B2');
  const B3 = lim('B3');
  const syn = {};
  if (wanted('B1' + sfx) || wanted('B3' + sfx)) {
    for (const name of ['S1', 'S2', 'S3']) {
      const s = ORA.synthetic[name];
      const c = THR.syntheticCases[name];
      const data = frame(s.time, s.flux, constantSigma(s.time.length, s.sigma));
      const g = gravitasFit(c, data);
      const names =
        c.law === 'quadratic'
          ? ['t0', 'P', 'k', 'aRs', 'b', 'q1', 'q2']
          : ['t0', 'P', 'k', 'aRs', 'b'];
      const cmp = compareFits(g, s.fit, names);
      const ratios = cmp.out.__ratio;
      delete cmp.out.__ratio;
      syn[name] = {
        worst: cmp.worst,
        chi2: Math.abs(g.chi2 - s.fit.chi2),
        ratios,
        detail: cmp.out,
        fit: g,
      };
    }
  }
  if (wanted('B1' + sfx)) {
    const ok = Object.values(syn).every(
      v =>
        v.worst <= B1.paramSigmas &&
        v.chi2 <= B1.chi2 &&
        v.ratios.every(r => r >= B1.sigmaRatio[0] && r <= B1.sigmaRatio[1])
    );
    row(
      'B1' + sfx,
      ok,
      Object.fromEntries(
        Object.entries(syn).map(([k, v]) => [
          k,
          {
            worstSigmas: sig(v.worst),
            dChi2: sig(v.chi2),
            sigmaRatio: v.ratios.map(r => sig(r, 3)),
            detail: v.detail,
          },
        ])
      ),
      'gravitas against batman + scipy, in oracle sigmas'
    );
  }
  const hd = ORA.hd209458;
  let hdData;
  if (wanted('B2' + sfx) || wanted('B3' + sfx)) {
    hdData = frame(HD.time, HD.flux, Float64Array.from(HD.error));
  }
  if (wanted('B2' + sfx)) {
    const bounds = {
      t0: { lo: hdData.x[0], hi: hdData.x[0] + 3.65 },
      P: { lo: 3.4, hi: 3.65 },
    };
    const g = fitOnce(
      {
        model: { id: 'transit-quadratic' },
        parameters: bounds,
        settings: {
          exposure: EXPOSURE,
          supersample: THR.sampling.fitSupersample,
          annuli: THR.sampling.annuli,
        },
      },
      hdData
    );
    const names = ['t0', 'P', 'k', 'aRs', 'b', 'q1', 'q2'];
    const cmp = compareFits(g, hd.quadratic, names);
    const ratios = cmp.out.__ratio;
    delete cmp.out.__ratio;
    const dChi2 = Math.abs(g.chi2 - hd.quadratic.chi2);
    row(
      'B2' + sfx,
      cmp.worst <= B2.paramSigmas &&
        dChi2 <= B2.chi2 &&
        ratios.every(r => r >= B2.sigmaRatio[0] && r <= B2.sigmaRatio[1]),
      {
        worstSigmas: sig(cmp.worst),
        dChi2: sig(dChi2),
        sigmaRatio: ratios.map(r => sig(r, 3)),
        detail: cmp.out,
        reducedChi2: sig(g.reducedChi2),
      },
      'the shipped HD 209458 rows; gravitas against batman + scipy'
    );
  }
  if (wanted('B3' + sfx)) {
    const bounds = {
      t0: { lo: hdData.x[0], hi: hdData.x[0] + 3.65 },
      P: { lo: 3.4, hi: 3.65 },
      b: { mode: 'fixed', value: 0.43 },
    };
    const g = fitOnce(
      {
        model: { id: 'transit-claret4' },
        parameters: bounds,
        settings: {
          exposure: EXPOSURE,
          supersample: THR.sampling.fitSupersample,
          annuli: THR.sampling.annuli,
          claret: C4,
        },
      },
      hdData
    );
    const cmp = compareFits(g, hd.claret4FixedB, ['t0', 'P', 'k', 'aRs']);
    delete cmp.out.__ratio;
    row(
      'B3' + sfx,
      cmp.worst <= B3.paramSigmas,
      {
        worstSigmas: sig(cmp.worst),
        detail: cmp.out,
        dChi2: sig(Math.abs(g.chi2 - hd.claret4FixedB.chi2)),
      },
      'transit-claret4 on HD 209458 with the labelled test law and b fixed at 0.43, against batman + scipy'
    );
  }
  if (wanted('B4' + sfx)) {
    const L = lim('B4');
    const s = ORA.synthetic.S4;
    const c = THR.syntheticCases.S4;
    const data = frame(s.time, s.flux, constantSigma(s.time.length, s.sigma));
    const g = fitOnce(
      {
        model: { id: 'transit-claret4' },
        parameters: BOUNDS(c, data),
        settings: {
          exposure: EXPOSURE,
          supersample: THR.sampling.fitSupersample,
          annuli: THR.sampling.annuli,
          claret: C4,
          eccentricity: { e: c.ecc, omega: c.w },
        },
      },
      data
    );
    const d = n => g.derived.find(q => q.name === n).value;
    const corrected = Math.abs(d('rhoStarEcc') / s.rhoTrue_gcm3 - 1);
    row(
      'B4' + sfx,
      corrected <= L.relative,
      {
        rhoTrue: sig(s.rhoTrue_gcm3),
        rhoCirc: sig(d('rhoStar')),
        rhoCorrected: sig(d('rhoStarEcc')),
        errorUncorrected: sig(Math.abs(d('rhoStar') / s.rhoTrue_gcm3 - 1)),
        errorCorrected: sig(corrected),
      },
      'relative error of the corrected density; the uncorrected one beside it'
    );
  }
}

// --- C and D: the ensembles ---------------------------------------------------------

const TIMES = tessLikeTimes();
const SIGMA = THR.sampling.sigmaEnsemble;
const Q = { q1: 0.36, q2: 0.3 };

function ensembleFit(c, seed, over = {}) {
  const quad = c.law === 'quadratic';
  const truth = {
    t0: c.t0,
    P: c.P,
    k: c.k,
    aRs: c.aRs,
    b: c.b,
    ...(quad ? Q : { c: C4 }),
  };
  const bumps = c.bump
    ? [
        {
          // the third transit's mid time plus the offset
          t: c.t0 + (c.bump.transit - 1) * c.P + c.bump.offset_d,
          amplitude: c.bump.amplitude,
          sigma: c.bump.sigma_d,
        },
      ]
    : [];
  const data = syntheticTransit({
    seed,
    times: TIMES,
    sigma: SIGMA,
    truth,
    exposure: EXPOSURE,
    bumps,
    ...over,
  });
  const x0 = TIMES[0];
  return fitOnce(
    {
      model: { id: quad ? 'transit-quadratic' : 'transit-claret4' },
      parameters: { t0: { lo: x0, hi: x0 + 3.8 }, P: { lo: 3.4, hi: 3.8 } },
      settings: {
        exposure: EXPOSURE,
        supersample: 5,
        annuli: 32,
        ...(quad ? {} : { claret: C4 }),
      },
    },
    data
  );
}

function pullsOf(fit, truth) {
  const get = n =>
    fit.parameters.find(p => p.name === n) ??
    fit.derived.find(d => d.name === n);
  const out = {};
  for (const [name, value] of Object.entries(truth)) {
    const g = get(name);
    out[name] = Math.abs(g.value - value) / g.sigma;
  }
  return out;
}

const rhoOf = c => stellarDensity(c.aRs, c.P) / 1000;

function runEnsemble(name, c, N, seedPrefix) {
  const out = [];
  let failures = 0;
  for (let i = 0; i < N; i++) {
    try {
      out.push(ensembleFit(c, `${THR.seeds.ensemble}-${seedPrefix}-${i}`));
    } catch {
      failures++;
    }
  }
  return { out, failures, name };
}

function coverage(ens, c, names, N) {
  const truth = { k: c.k, aRs: c.aRs, b: c.b, rhoStar: rhoOf(c) };
  const result = {};
  for (const n of names) {
    let in1 = 0;
    let in2 = 0;
    for (const f of ens.out) {
      const p = pullsOf(f, { [n]: truth[n] })[n];
      if (p < 1) in1++;
      if (p < 1.96) in2++;
    }
    result[n] = { within1: in1 / N, within196: in2 / N };
  }
  return result;
}

function groupC() {
  const N = THR.ensembles.N;
  const cache = {};
  const ens = key => {
    if (!cache[key]) {
      const c = THR.ensembles[key];
      cache[key] = { ...runEnsemble(key, c, N, key), c };
    }
    return cache[key];
  };
  const names = ['k', 'aRs', 'b', 'rhoStar'];
  const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
  if (wanted('C1') || wanted('C2')) {
    const R = THR.ensembles.recovery;
    const pulls = {};
    const rel = {};
    let worstPull = 0;
    let rhoOk = true;
    const L1 = lim('C1');
    const L2 = lim('C2');
    for (const law of R.laws)
      for (const b of R.impactParameters) {
        const c = {
          law,
          k: R.k,
          aRs: R.aRs,
          P: R.P,
          b,
          t0: TIMES[0] + R.t0offset,
        };
        const fits = [];
        for (let i = 0; i < R.perCell; i++) {
          try {
            fits.push(
              ensembleFit(c, `${THR.seeds.ensemble}-rec-${law}-${b}-${i}`)
            );
          } catch {
            // a failure shows in the share below
          }
        }
        const cell = `${law} b=${b}`;
        const pk = ['k', 'aRs', 'b'].map(n =>
          median(fits.map(f => pullsOf(f, { [n]: c[n] })[n]))
        );
        pulls[cell] = {
          k: sig(pk[0]),
          aRs: sig(pk[1]),
          b: sig(pk[2]),
          fits: fits.length,
        };
        worstPull = Math.max(worstPull, ...pk);
        const r = median(
          fits.map(f =>
            Math.abs(
              f.derived.find(d => d.name === 'rhoStar').value / rhoOf(c) - 1
            )
          )
        );
        rel[cell] = sig(r);
        const bound =
          b <= 0.6 ? L2['medianRelative_bLE0.6'] : L2['medianRelative_b0.8'];
        if (!(r <= bound)) rhoOk = false;
      }
    if (wanted('C1'))
      row(
        'C1',
        worstPull <= L1.medianAbsPull,
        { worst: sig(worstPull), cells: pulls },
        'median |pull| per cell, worst cell'
      );
    if (wanted('C2'))
      row(
        'C2',
        rhoOk,
        rel,
        'median relative error of the circular density per cell'
      );
  }
  for (const [id, key] of [
    ['C3', 'E1'],
    ['C4', 'E2'],
  ]) {
    if (!wanted(id)) continue;
    const L = lim(id);
    const e = ens(key);
    const cov = coverage(e, e.c, names, N);
    const ok = names.every(
      n =>
        inBand(cov[n].within1, L.within1sigma) &&
        inBand(cov[n].within196, L['within1.96sigma'])
    );
    row(id, ok, { failures: e.failures, coverage: cov }, `${N} seeds`);
  }
  if (wanted('C5') || wanted('D1')) {
    const e = ens('E3');
    if (wanted('C5')) {
      const L = lim('C5');
      const cov = coverage(e, e.c, ['k', 'rhoStar'], N);
      row(
        'C5',
        ['k', 'rhoStar'].every(n =>
          inBand(cov[n].within196, L['within1.96sigma'])
        ),
        { failures: e.failures, coverage: cov },
        `${N} seeds, grazing`
      );
    }
    if (wanted('D1')) {
      const L = lim('D1');
      const share =
        e.out.filter(f => f.transit.kb.status === 'not-constrained').length / N;
      row(
        'D1',
        share >= L.min,
        { share, failures: e.failures },
        'share of grazing seeds flagged'
      );
    }
  }
  if (wanted('D2') || wanted('D4')) {
    const e = ens('E1');
    if (wanted('D2')) {
      const share =
        e.out.filter(f => f.transit.kb.status === 'not-constrained').length / N;
      row(
        'D2',
        share <= lim('D2').max,
        { share },
        'share of clean seeds wrongly flagged'
      );
    }
    if (wanted('D4')) {
      const share = e.out.filter(f => f.transit.residual?.fails).length / N;
      row(
        'D4',
        share <= lim('D4').max,
        { share },
        'share of clean seeds failing the residual test'
      );
    }
  }
  if (wanted('D3')) {
    const e = ens('E5');
    const share = e.out.filter(f => f.transit.residual?.fails).length / N;
    row(
      'D3',
      share >= lim('D3').min,
      { share, failures: e.failures },
      'share of spot-crossing seeds failing the residual test'
    );
  }
}

function groupE() {
  if (wanted('E1'))
    notRun(
      'E1',
      'no published TESS solution was supplied under a recorded rights decision. The NASA Exoplanet Archive parameter sets for HD 209458 b were fetched (public archive, credited, terms page not read; 23 sets, SHA-256 b3afd5a0...), and none cites TESS data or carries uncertainties for Rp/R*, a/R* or b, so no TESS-era comparison with a published sigma can be made; the existing literature comparison in INFERENCE_CORE.md (Stassun 2017, Knutson 2007) is not this leg'
    );
}

groupA();
if (wanted('B0')) groupB0();
if (wanted('B')) {
  groupB(ORA_FIRST, '');
  groupB(ORA, 'b');
}
if (wanted('C') || wanted('D')) groupC();
groupE();

rows.sort((a, b) => a.id.localeCompare(b.id));
if (flag('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  for (const r of rows)
    console.log(
      `${r.id.padEnd(4)} ${r.status.toUpperCase().padEnd(7)} ${JSON.stringify(r.measured)}  ${r.note}`
    );
}
const failed = rows.filter(r => r.status === 'fail');
if (flag('--write-failed'))
  writeFileSync(
    path.join(ROOT, DIR, 'failed-legs.json'),
    `${JSON.stringify(
      {
        note: 'Legs of tests/fixtures/transit-delta/thresholds.json that crossed their bound, kept failing. Only Carl resets a bound.',
        failed: failed.map(r => ({
          id: r.id,
          measured: r.measured,
          note: r.note,
        })),
      },
      null,
      2
    )}\n`
  );
if (flag('--write-results'))
  writeFileSync(
    path.join(ROOT, DIR, 'results.json'),
    `${JSON.stringify(
      {
        note: 'The validation table of tools/transit-delta-validate.mjs as last measured (Node 22.23.4).',
        rows,
      },
      null,
      2
    )}\n`
  );
console.error(
  `${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'not-run').length} not run`
);
process.exit(0);
