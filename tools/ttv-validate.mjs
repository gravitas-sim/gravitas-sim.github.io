#!/usr/bin/env node
// =============================================================================
// The TTV kernel against its committed thresholds (Prompt 226)
// -----------------------------------------------------------------------------
//   npm run ttv:validate                     print the table
//   npm run ttv:validate -- --json           print it as JSON
//   npm run ttv:validate -- --write-failed   rewrite tests/fixtures/ttv/failed-legs.json
//   npm run ttv:validate -- --write-results  rewrite tests/fixtures/ttv/results.json
//   npm run ttv:validate -- --only=A,B       run the legs whose id starts with one of these
//
// tests/fixtures/ttv/thresholds.json fixed every bound before any of the kernel existed;
// the oracle (tools/ttv-oracle/oracle.py: numpy and scipy, no Gravitas code) pinned its
// transit times in oracle-results.json. This runs the engine (js/physics.js, headless)
// and the kernel and judges them against the bounds read from that file. A crossed bound
// is a failed leg, left failing in failed-legs.json; a leg whose data was never supplied
// is NOT RUN and says so.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { installDomShim } from '../js/validation/domShim.js';
import { makeLab } from '../js/validation/harness.js';
import {
  analyseTransitTimes,
  engineTransitTimes,
  fgCoefficients,
  fitSinusoidAt,
  linearEphemeris,
  measureTransitTime,
  nearestFirstOrder,
  relationDomain,
  superPeriod,
  transitWindow,
  ttvAmplitudes,
} from '../js/kernels/ttv/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/ttv';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read(`${DIR}/thresholds.json`);
const ORA = read(`${DIR}/oracle-results.json`);
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const LC = THR.lightCurve;
const SIGMA = LC.sigma_ppm * 1e-6;
const TEMPLATE = { k: LC.k, aRs: LC.aRs, b: LC.b, q1: LC.q1, q2: LC.q2 };

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const only = (args.find(a => a.startsWith('--only=')) ?? '')
  .slice(7)
  .split(',')
  .filter(Boolean);
const wanted = id => !only.length || only.some(p => id.startsWith(p));
const epochsOf = n => Array.from({ length: n }, (_, i) => i);
const drop0 = a => a.filter(t => t > 1e-3);

installDomShim();
const physics = await import('../js/physics.js');
const lab = makeLab(physics);
const runEngine = id => {
  const s = THR.systems[id];
  return engineTransitTimes({ physics, lab, system: s, baseline: s.baseline_d })
    .times;
};

/** Mean periods, the cited relation and the measured amplitude of one pair's noise-free times. */
function pairAnalysis(id, times) {
  const s = THR.systems[id];
  const e1 = linearEphemeris(epochsOf(times[0].length), times[0]);
  const e2 = linearEphemeris(epochsOf(times[1].length), times[1]);
  const ps = superPeriod(e1.P, e2.P, s.j);
  const rel = ttvAmplitudes({
    P1: e1.P,
    P2: e2.P,
    mu1: s.mu1,
    mu2: s.mu2,
    j: s.j,
  });
  const planets = [0, 1].map(k => {
    const ep = epochsOf(times[k].length);
    const an = analyseTransitTimes({
      epochs: ep,
      times: times[k],
      expectedPeriod: ps,
    });
    const at = fitSinusoidAt(ep, times[k], null, ps);
    return {
      analysis: an,
      measuredAmplitude: Math.hypot(at.A, at.B),
      eph: k ? e2 : e1,
    };
  });
  return { e1, e2, ps, rel, planets };
}

const engine = {};
for (const id of ['S1', 'S2', 'S3']) engine[id] = runEngine(id);
const pa = {
  S1: pairAnalysis('S1', engine.S1),
  S2: pairAnalysis('S2', engine.S2),
};

// --- A: the relations against the engine ---------------------------------------------
if (wanted('A')) {
  for (const [id, leg] of [
    ['S1', 'A1'],
    ['S2', 'A2'],
  ]) {
    const r = pa[id].planets[0].analysis;
    const rel = Math.abs(r.superPeriod.value - pa[id].ps) / pa[id].ps;
    row(leg, rel <= lim(leg).relativeError, {
      fitted: sig(r.superPeriod.value),
      cited: sig(pa[id].ps),
      relativeError: sig(rel),
      status: r.status,
    });
  }
  {
    const a = pa.S1.planets[0].analysis.superPeriod.value;
    const b = pa.S1.planets[1].analysis.superPeriod.value;
    const rel = Math.abs(a - b) / ((a + b) / 2);
    row('A3', rel <= lim('A3').relativeError, {
      inner: sig(a),
      outer: sig(b),
      relativeError: sig(rel),
    });
  }
  {
    const L = lim('A4');
    const m = {};
    let ok = true;
    for (const id of ['S1', 'S2']) {
      const r = pa[id];
      const ei = Math.abs(
        r.rel.inner.amplitude / r.planets[0].measuredAmplitude - 1
      );
      const eo = Math.abs(
        r.rel.outer.amplitude / r.planets[1].measuredAmplitude - 1
      );
      m[id] = {
        innerFormula_d: sig(r.rel.inner.amplitude),
        innerMeasured_d: sig(r.planets[0].measuredAmplitude),
        innerError: sig(ei),
        outerFormula_d: sig(r.rel.outer.amplitude),
        outerMeasured_d: sig(r.planets[1].measuredAmplitude),
        outerError: sig(eo),
      };
      if (ei > L.inner || eo > L.outer) ok = false;
    }
    row('A4', ok, m);
  }
  {
    const L = lim('A5');
    const m = {};
    let ok = true;
    for (const [key, j] of [
      ['2:1', 2],
      ['3:2', 3],
    ]) {
      const { f, g } = fgCoefficients(j, Math.pow((j - 1) / j, 2 / 3));
      const [vf, vg] = L.values[key];
      const e = Math.max(Math.abs(f / vf - 1), Math.abs(g / vg - 1));
      m[key] = { f: sig(f, 6), g: sig(g, 6), relativeError: sig(e) };
      if (e > L.relativeError) ok = false;
    }
    row('A5', ok, m);
  }
}

// --- B: the engine and the kernel against the oracle ----------------------------------
if (wanted('B')) {
  {
    let worst = 0;
    const m = {};
    for (const id of ['S1', 'S2']) {
      const ot = ORA.systems[id].times.map(drop0);
      for (let k = 0; k < 2; k++) {
        const n = Math.min(ot[k].length, engine[id][k].length);
        if (ot[k].length !== engine[id][k].length)
          m[`${id}.${k}.countMismatch`] = [ot[k].length, engine[id][k].length];
        const ep = epochsOf(n);
        const a = linearEphemeris(ep, engine[id][k].slice(0, n)).oc;
        const b = linearEphemeris(ep, ot[k].slice(0, n)).oc;
        let w = 0;
        for (let i = 0; i < n; i++) w = Math.max(w, Math.abs(a[i] - b[i]));
        m[`${id}.${k ? 'outer' : 'inner'}`] = sig(w);
        worst = Math.max(worst, w);
      }
    }
    row('B1', worst <= lim('B1').maxAbsDiff_d, {
      maxAbsDiff_d: sig(worst),
      perPlanet: m,
    });
  }
  {
    const worst = Math.max(
      ...['S1', 'S2', 'S3'].map(id => ORA.systems[id].selfCheckMaxAbsDiff_d)
    );
    row('B2', worst <= lim('B2').maxAbsDiff_d, { maxAbsDiff_d: sig(worst) });
  }
  {
    let worst = 0;
    const m = {};
    for (const id of ['S1', 'S2']) {
      const s = THR.systems[id];
      const o = ORA.systems[id];
      const ot = o.times.map(drop0);
      // the oracle fitted its list with the instant 0 in it; compare on the same list it saw
      const e1 = linearEphemeris(epochsOf(o.times[0].length), o.times[0]);
      const e2 = linearEphemeris(epochsOf(o.times[1].length), o.times[1]);
      const k = ttvAmplitudes({
        P1: e1.P,
        P2: e2.P,
        mu1: s.mu1,
        mu2: s.mu2,
        j: s.j,
      });
      const rs = Math.abs(
        superPeriod(e1.P, e2.P, s.j) / o.relations.superPeriod - 1
      );
      const ri = Math.abs(k.inner.amplitude / o.relations.amplitudeInner - 1);
      const ro = Math.abs(k.outer.amplitude / o.relations.amplitudeOuter - 1);
      m[id] = { superPeriod: sig(rs), inner: sig(ri), outer: sig(ro) };
      worst = Math.max(worst, rs, ri, ro);
      void ot;
    }
    row('B3', worst <= lim('B3').relativeError, {
      worstRelative: sig(worst),
      perSystem: m,
    });
  }
  {
    let worst = 0;
    for (const id of ['S1', 'S2'])
      for (let k = 0; k < 2; k++) {
        const o = ORA.systems[id];
        const e = linearEphemeris(epochsOf(o.times[k].length), o.times[k]);
        worst = Math.max(
          worst,
          Math.abs(e.T0 - o.planets[k].T0),
          Math.abs(e.P - o.planets[k].P)
        );
      }
    row('B4', worst <= lim('B4').maxAbsDiff_d, { maxAbsDiff: sig(worst) });
  }
}

// --- C and D: measured times --------------------------------------------------------
/** Measure every transit of one planet in one noise realisation. */
function measureAll(times, planetIndex, systemId, rep, sigmaTrue, sigmaStated) {
  const s = THR.systems[systemId];
  const P = planetIndex ? s.P2 : s.P1;
  const ep = epochsOf(times.length);
  const eph = linearEphemeris(ep, times);
  const out = [];
  for (let i = 0; i < times.length; i++) {
    const w = transitWindow({
      trueTime: times[i],
      center: eph.T0 + i * eph.P,
      template: { P, ...TEMPLATE },
      sigma: sigmaTrue,
      cadence: LC.cadence_d,
      halfWidth: LC.window_halfwidth_d,
      seed: `${THR.seeds.ensemble}:${systemId}`,
      labels: [planetIndex, rep, i],
    });
    const m = measureTransitTime({
      t: w.t,
      flux: w.flux,
      sigma: sigmaStated,
      template: { P, ...TEMPLATE },
      guess: eph.T0 + i * eph.P,
    });
    out.push({ ...m, truth: times[i] });
  }
  return out;
}
const needC = wanted('C') || wanted('D') || wanted('R');
if (needC) {
  const REPS = 40;
  const t0 = Date.now();
  const AM1 = THR.amendments.find(a => a.id === 'AM1');
  const amended = AM1.added.find(a => a.id === 'C1b').sigma_ppm * 1e-6;
  const ensemble = ppm => {
    const sg = ppm * 1e-6;
    const s1 = [];
    const s3 = [];
    for (let r = 0; r < REPS; r++) {
      s1.push([0, 1].map(k => measureAll(engine.S1[k], k, 'S1', r, sg, sg)));
      s3.push([0, 1].map(k => measureAll(engine.S3[k], k, 'S3', r, sg, sg)));
    }
    return { s1, s3 };
  };
  const levels = [
    { suffix: '', sigma: SIGMA, ens: ensemble(SIGMA * 1e6) },
    { suffix: 'b', sigma: amended, ens: ensemble(amended * 1e6) },
  ];
  const elapsed = (Date.now() - t0) / 1000;
  const verdictOf = sets => {
    let signals = 0;
    let total = 0;
    for (const rep of sets)
      for (let k = 0; k < 2; k++) {
        const ok = rep[k].filter(m => m.status === 'ok');
        const an = analyseTransitTimes({
          epochs: epochsOf(ok.length),
          times: ok.map(m => m.time),
          sigmas: ok.map(m => m.sigma),
        });
        total++;
        if (an.signal.verdict === 'signal') signals++;
      }
    return { signals, total };
  };
  for (const { suffix, ens } of levels) {
    const { s1, s3 } = ens;
    if (wanted('C')) {
      const z = [];
      for (let r = 0; r < 20; r++)
        for (let k = 0; k < 2; k++)
          for (const m of s1[r][k])
            if (m.status === 'ok') z.push((m.time - m.truth) / m.sigma);
      const n = z.length;
      const within = c => z.filter(v => Math.abs(v) <= c).length / n;
      const mean = z.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(
        z.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)
      );
      const L1 = lim('C1');
      const L2 = lim('C2');
      const L3 = lim('C3');
      row(`C1${suffix}`, Math.abs(within(1) - L1.level) <= L1.tolerance, {
        n,
        coverage1: sig(within(1)),
      });
      row(`C2${suffix}`, Math.abs(within(2) - L2.level) <= L2.tolerance, {
        n,
        coverage2: sig(within(2)),
      });
      row(
        `C3${suffix}`,
        Math.abs(mean) <= L3.meanAbs && sd >= L3.sdLo && sd <= L3.sdHi,
        { mean: sig(mean), sd: sig(sd) }
      );
    }
    if (wanted('D')) {
      const v3 = verdictOf(s3);
      const v1 = verdictOf(s1);
      row(`D1${suffix}`, 1 - v3.signals / v3.total >= lim('D1').fraction, {
        noSignal: v3.total - v3.signals,
        of: v3.total,
      });
      row(`D2${suffix}`, v1.signals / v1.total >= lim('D2').fraction, {
        signal: v1.signals,
        of: v1.total,
      });
    }
    if (wanted('R')) {
      const all = s1.flat(2).filter(m => m.status === 'ok');
      const low = all.filter(m => m.regime === 'low-snr').length / all.length;
      const R = AM1.added.find(a => a.id === 'R1').limits;
      row(
        `R1${suffix}`,
        suffix ? 1 - low >= R.reliableFraction100 : low >= R.lowSnrFraction400,
        { n: all.length, lowSnrFraction: sig(low) }
      );
    }
  }
  if (wanted('D')) {
    // understated sigma: the data carry SIGMA, the fit is told half of it
    const flagged = measureAll(
      engine.S1[0].slice(0, 100),
      0,
      'S1',
      'understated',
      SIGMA,
      SIGMA / 2
    ).filter(m => m.status === 'ok');
    const fr = flagged.filter(m => m.flagged).length / flagged.length;
    row('D3', fr >= lim('D3').fraction, {
      flaggedFraction: sig(fr),
      n: flagged.length,
    });
    {
      const times = engine.S1.map(a =>
        a.filter(t => t <= THR.systems.S4.baseline_d)
      );
      const e1 = linearEphemeris(epochsOf(times[0].length), times[0]);
      const e2 = linearEphemeris(epochsOf(times[1].length), times[1]);
      const ps = superPeriod(e1.P, e2.P, THR.systems.S4.j);
      const an = analyseTransitTimes({
        epochs: epochsOf(times[0].length),
        times: times[0],
        sigmas: times[0].map(() => 0.0005),
        expectedPeriod: ps,
      });
      row('D4', an.status === lim('D4').status && !an.superPeriod, {
        status: an.status,
        cycles: sig(an.cycles),
        baseline_d: sig(an.baseline),
      });
    }
    {
      const s = THR.systems.S3;
      const e1 = linearEphemeris(epochsOf(engine.S3[0].length), engine.S3[0]);
      const e2 = linearEphemeris(epochsOf(engine.S3[1].length), engine.S3[1]);
      const r = ttvAmplitudes({ P1: e1.P, P2: e2.P, mu1: s.mu1, mu2: s.mu2 });
      const near = nearestFirstOrder(e1.P, e2.P);
      row(
        'D5',
        r.status === 'refused' &&
          r.reason === 'far-from-resonance' &&
          Math.abs(near.delta) > lim('D5').deltaMax,
        { status: r.status, reason: r.reason, delta: sig(near.delta) }
      );
    }
    {
      const mu = 3e-5;
      const r = relationDomain({ P1: 10, P2: 20.01, mu1: mu, mu2: mu, j: 2 });
      row('D6', !r.ok && r.reason === 'inside-resonance-width', {
        reason: r.reason,
        delta: sig(r.delta),
        width: sig(r.width),
      });
    }
  }
  console.error(`ensembles measured in ${elapsed.toFixed(0)} s`);
}
if (wanted('E'))
  notRun(
    'E1',
    'Kepler-9 transit times (Holczer et al. 2016, VizieR J/ApJS/225/9) were requested of the coordinator, whose fetch failed (VizieR hosts unreachable); no published times were supplied, so no published system was compared. Nothing was simulated in its place.'
  );

rows.sort((a, b) => a.id.localeCompare(b.id));
const failed = rows.filter(r => r.status === 'fail');
if (flag('--json')) console.log(JSON.stringify(rows, null, 2));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${r.id.padEnd(4)} ${JSON.stringify(r.measured)} ${r.note}`
    );
  console.log(
    `\n${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'not-run').length} not run`
  );
}
if (flag('--write-results'))
  writeFileSync(
    path.join(ROOT, DIR, 'results.json'),
    JSON.stringify({ format: 'gravitas.ttv-results/1', rows }, null, 2) + '\n'
  );
if (flag('--write-failed'))
  writeFileSync(
    path.join(ROOT, DIR, 'failed-legs.json'),
    JSON.stringify(
      {
        format: 'gravitas.ttv-failed-legs/1',
        label:
          'These legs crossed a committed bound and stay failing; only Carl resets one.',
        legs: failed.map(r => ({ id: r.id, measured: r.measured })),
      },
      null,
      2
    ) + '\n'
  );
process.exitCode = 0;
