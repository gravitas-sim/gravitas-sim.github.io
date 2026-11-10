#!/usr/bin/env node
// =============================================================================
// The Part A addendum of the resonance gate: a ripple-free libration estimator and steps from an error budget (Prompt 273, RESONANCES_II.md section 9)
// -----------------------------------------------------------------------------
// The new legs and their bounds are tests/fixtures/resonances-ii/addendum-thresholds.json (committed first and alone).
// The first gate's legs, results and verdict are not touched: tools/resonances-ii-validate.mjs still reproduces them.
// Reads the addendum oracle's output (oracle_addendum.py), the first oracle's secular rate, the downloaded Horizons
// series the oracle derived, and addendum-sources.json; writes addendum-results.json.
// Usage: node tools/resonances-ii-addendum.mjs run [--data DIR]
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeState, run as stepRun, energy } from '../js/lab3d/kernel.js';
import { fromElements } from '../js/lab3d/elements.js';
import { GALILEAN, PLUTO_NEPTUNE } from '../js/resonance/systems.js';
import { GM_JUPITER } from '../js/satellites/galilean.js';
import {
  measureLibration,
  measureLibrationHarmonic,
  orbitalAngles,
  resonantArgumentSeries,
  secularRate,
  secularRateFirstOrder,
} from '../js/lab3d/libration.js';
import { stepForBudget } from '../js/lab3d/stepBudget.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, '..', 'tests', 'fixtures', 'resonances-ii');
const args = process.argv.slice(2);
if (args[0] !== 'run') {
  console.error('mode: run [--data DIR]');
  process.exit(2);
}
const dataDir = args.includes('--data')
  ? args[args.indexOf('--data') + 1]
  : path.join(here, '..', '..', '..', 'scratch-data', 'resonance273');
const read = f => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
const THR = read('addendum-thresholds.json');
const inputs = read('inputs/inputs.json');
const orc = read('addendum-oracle-results.json');
const firstOrc = read('oracle-results.json');
const first = read('results.json');
const pinned = read('jup365-laplace-argument.json');
const sources = fs.existsSync(path.join(FIX, 'addendum-sources.json'))
  ? read('addendum-sources.json')
  : {};
const series = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'oracle', 'addendum-series.json'), 'utf8')
);

const RAD = Math.PI / 180;
const DAY = 86400;
const WIN = { L: 8284, P: 78680 };
const G_AU_YR = 4 * Math.PI * Math.PI;
const mulberry = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const normal = rng =>
  Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const circDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const maxCirc = (a, b) =>
  a.reduce((m, x, i) => Math.max(m, circDiff(x, b[i])), 0);

// ---- systems (the detuned Laplace model is the first validator's, restated) -----------
const GMJ = GM_JUPITER * DAY * DAY;
const MOONS = GALILEAN.moons.slice(0, 3);
function assemble(m0, relBodies) {
  const tot = relBodies.reduce((s, b) => s + b.m, m0);
  const xc = [0, 0, 0];
  const vc = [0, 0, 0];
  for (const b of relBodies)
    for (let k = 0; k < 3; k++) {
      xc[k] += (b.m * b.x[k]) / tot;
      vc[k] += (b.m * b.v[k]) / tot;
    }
  const sub = (a, c) => a.map((u, k) => u - c[k]);
  return [{ m: m0, x: sub([0, 0, 0], xc), v: sub([0, 0, 0], vc) }].concat(
    relBodies.map(b => ({ m: b.m, x: sub(b.x, xc), v: sub(b.v, vc) }))
  );
}
function detunedLaplace(detune) {
  return assemble(
    GMJ,
    MOONS.map((mo, k) => {
      const gm = mo.massOverJupiter * GMJ;
      const mu = GMJ + gm;
      const n = (2 * Math.PI) / mo.periodDays;
      const a = Math.cbrt(mu / (n * n)) * (k === 1 ? detune : 1);
      const st = fromElements(
        {
          a,
          e: mo.e,
          i: 0,
          Omega: 0,
          omega: mo.varpi0 * RAD,
          M: (mo.lambda0 - mo.varpi0) * RAD,
        },
        mu
      );
      return { m: gm, x: st.x, v: st.v };
    })
  );
}
function twoBody() {
  const st = fromElements(
    { a: 1, e: 0.1, i: 0, Omega: 0, omega: 0, M: 0 },
    1.001
  );
  return assemble(1, [{ m: 0.001, x: st.x, v: st.v }]);
}

// ---- running the kernel ------------------------------------------------------------------
const anglesOf = (s, i) => {
  const x = [0, 1, 2].map(c => s.x[3 * i + c] - s.x[c]);
  const v = [0, 1, 2].map(c => s.v[3 * i + c] - s.v[c]);
  return orbitalAngles(x, v, s.G * (s.m[0] + s.m[i]));
};
function integrate(bodies, G, h, stepsPerSample, nSamples) {
  const s = makeState(bodies, { G });
  const n = bodies.length;
  const lam = Array.from({ length: n - 1 }, () => []);
  const vp = Array.from({ length: n - 1 }, () => []);
  const times = [];
  const E0 = energy(s);
  let maxDE = 0;
  for (let k = 0; k < nSamples; k++) {
    if (k > 0) stepRun(s, 'yoshida4', h, stepsPerSample);
    times.push(k * stepsPerSample * h);
    for (let i = 1; i < n; i++) {
      const ang = anglesOf(s, i);
      lam[i - 1].push(ang.lambda);
      vp[i - 1].push(ang.varpi);
    }
    if (k % 50 === 0 || k === nSamples - 1)
      maxDE = Math.max(maxDE, Math.abs((energy(s) - E0) / E0));
  }
  return { times, lam, vp, dE: maxDE };
}
const laplaceSeries = r =>
  resonantArgumentSeries([
    { lambda: r.lam[0], coefficient: 1 },
    { lambda: r.lam[1], coefficient: -3 },
    { lambda: r.lam[2], coefficient: 2 },
  ]);
const plutoSeries = r =>
  resonantArgumentSeries([
    { lambda: r.lam[1], varpi: r.vp[1], coefficient: 3, varpiCoefficient: -1 },
    { lambda: r.lam[0], coefficient: -2 },
  ]);
const LAP = { ref: 3.5249, floor: 0.002, sampling: 1 };
const PLU = { ref: 491.5, floor: 0.5, sampling: 20 };
const lapTurning = (times, phi) =>
  measureLibration({
    times,
    phi,
    referencePeriod: LAP.ref,
    floorDeg: LAP.floor,
    stationaryDeg: LAP.floor,
    samplingFloor: LAP.sampling,
  });
const lapHarmonic = (times, phi) =>
  measureLibrationHarmonic({
    times,
    phi,
    referencePeriod: LAP.ref,
    samplingFloor: LAP.sampling,
  });
const brief = m => ({
  state: m.state,
  reason: m.reason,
  period: m.period,
  periodSigma: m.periodSigma,
  amplitude: m.amplitude,
  amplitudeSigma: m.amplitudeSigma ?? null,
  center: m.center,
  periodsObserved: m.periodsObserved,
  significance: m.significance ?? null,
  subWindows: m.subWindows ?? null,
});
const briefStep = b => ({
  state: b.state,
  h: b.h,
  stepsPerSample: b.stepsPerSample,
  stepsPerInnerPeriod: b.stepsPerInnerPeriod,
  predicted: b.predicted ?? null,
  pilot: b.pilot,
});

const legs = [];
const leg = (id, status, values, note = '') =>
  legs.push({ id, status, values, note });
const t0 = Date.now();

// ---- O1: the oracle's self-check ----------------------------------------------------------
{
  const s = orc.selfcheck;
  leg(
    'O1',
    s.worstPeriodRel <= 0.02 && s.worstAmplitudeAbs <= 0.1 ? 'PASS' : 'FAIL',
    s
  );
}

// ---- T1h, T2h: synthetic truth --------------------------------------------------------------
function synthetic(seed, members, planted) {
  const rng = mulberry(seed);
  const W = 4000;
  const times = Array.from({ length: W + 1 }, (_, i) => i);
  const out = [];
  for (let m = 0; m < members; m++) {
    const P0 = W / (3.5 + 2 * rng());
    const ph = 2 * Math.PI * rng();
    const rip = [
      [37.3, 3],
      [91.7, 2],
      [411.3, 3],
    ].map(([cyc, amp]) => ({ cyc, amp, ph: 2 * Math.PI * rng() }));
    const phi = times.map(t => {
      let y = 180 + (planted ? Math.sin((2 * Math.PI * t) / P0 + ph) : 0);
      for (const r of rip)
        y += r.amp * Math.sin((2 * Math.PI * r.cyc * t) / W + r.ph);
      return y + 0.5 * normal(rng);
    });
    out.push({
      P0,
      m: measureLibrationHarmonic({ times, phi, referencePeriod: W / 411.3 }),
    });
  }
  return out;
}
{
  const runs = synthetic(27310, 400, true);
  let worstP = 0;
  let worstA = 0;
  let worstC = 0;
  let refused = 0;
  let covered = 0;
  const reasons = {};
  for (const { P0, m } of runs) {
    if (m.state !== 'libration') {
      refused++;
      reasons[m.reason] = (reasons[m.reason] || 0) + 1;
      continue;
    }
    worstP = Math.max(worstP, rel(m.period, P0));
    worstA = Math.max(worstA, Math.abs(m.amplitude - 1));
    worstC = Math.max(worstC, Math.abs(m.center - 180));
    if (Math.abs(m.period - P0) <= 2 * m.periodSigma) covered++;
  }
  const ok =
    refused === 0 &&
    worstP <= 0.02 &&
    worstA <= 0.1 &&
    worstC <= 0.1 &&
    covered >= 360;
  leg('T1h', ok ? 'PASS' : 'FAIL', {
    members: runs.length,
    refused,
    reasons,
    worstPeriodRel: worstP,
    worstAmplitudeAbs: worstA,
    worstCentreDeg: worstC,
    covered,
  });
  const none = synthetic(27311, 100, false);
  const falsePositives = none.filter(r => r.m.state === 'libration').length;
  const why = {};
  for (const r of none) why[r.m.reason] = (why[r.m.reason] || 0) + 1;
  leg('T2h', falsePositives <= 1 ? 'PASS' : 'FAIL', {
    members: none.length,
    falsePositives,
    reasons: why,
  });
}

// ---- L1h, L1o: the authentic argument ---------------------------------------------------------
{
  const times = pinned.phi.map((_, i) => i);
  const m = lapHarmonic(times, pinned.phi);
  const ok =
    m.state === 'libration' &&
    m.period !== null &&
    rel(m.period, 2071) <= 0.05 &&
    rel(m.amplitude, 0.064) <= 0.5 &&
    Math.abs(m.center - 180) <= 1;
  leg(
    'L1h',
    ok ? 'PASS' : 'FAIL',
    {
      ...brief(m),
      periodRelToCited: m.period === null ? null : rel(m.period, 2071),
      amplitudeRelToCited:
        m.amplitude === null ? null : rel(m.amplitude, 0.064),
    },
    'cited 2071 d, 0.064 deg, 180 deg from js/resonance/systems.js'
  );
  const o = orc.jup365.lsq;
  const oko =
    m.state === 'libration' &&
    rel(m.period, o.period) <= 0.02 &&
    rel(m.amplitude, o.amplitude) <= 0.05;
  leg('L1o', oko ? 'PASS' : 'FAIL', {
    kernel: { period: m.period, amplitude: m.amplitude, center: m.center },
    oracle: orc.jup365,
  });
}

// ---- B0b, B2b: the budget rule on a Kepler orbit --------------------------------------------------
{
  const bodies = twoBody();
  const P = (2 * Math.PI) / Math.sqrt(1.001);
  const common = {
    bodies,
    G: 1,
    innerPeriod: P,
    sampleInterval: P,
    window: 500 * P,
    angles: s => {
      const a = anglesOf(s, 1);
      return [a.lambda, a.varpi];
    },
    angleWeights: [1, 1],
    angleBudgetDeg: 0.01,
  };
  const b = stepForBudget({ ...common, energyBudget: 1e-9 });
  let dE = null;
  let dAng = null;
  if (b.state === 'chosen') {
    const s = makeState(bodies, { G: 1 });
    const E0 = energy(s);
    dE = 0;
    dAng = 0;
    for (let k = 1; k <= 500; k++) {
      // AM8: the energy at every step, the angles at the ends of the periods.
      for (let j = 0; j < b.stepsPerSample; j++) {
        stepRun(s, 'yoshida4', b.h, 1);
        dE = Math.max(dE, Math.abs((energy(s) - E0) / E0));
      }
      const a = anglesOf(s, 1);
      dAng = Math.max(dAng, circDiff(a.lambda, 0) + circDiff(a.varpi, 0));
    }
  }
  leg(
    'B0b',
    b.state === 'chosen' && dE <= 1e-9 && dAng <= 0.01 ? 'PASS' : 'FAIL',
    { step: briefStep(b), dE, angleErrorDeg: dAng }
  );
  const no = stepForBudget({ ...common, energyBudget: 1e-20 });
  leg('B2b', no.state === 'not-attainable' && no.h === null ? 'PASS' : 'FAIL', {
    state: no.state,
    h: no.h,
  });
}

// ---- the Laplace model at the budget step ------------------------------------------------------------
const nWin = WIN.L + 1;
const stepL = stepForBudget({
  bodies: inputs.laplace.bodies,
  G: 1,
  innerPeriod: MOONS[0].periodDays,
  sampleInterval: 1,
  window: WIN.L,
  energyBudget: 1e-8,
  angles: s => [1, 2, 3].map(i => anglesOf(s, i).lambda),
  angleWeights: [1, 3, 2],
  angleBudgetDeg: 1,
});
if (stepL.state === 'chosen') {
  const Lm = integrate(
    inputs.laplace.bodies,
    1,
    stepL.h,
    stepL.stepsPerSample,
    nWin
  );
  const phi = laplaceSeries(Lm);
  const mh = lapHarmonic(Lm.times, phi);
  const mt = lapTurning(Lm.times, phi);
  const o = orc.laplace;
  leg(
    'L3h',
    mh.state === 'libration' &&
      rel(mh.period, o.lsq.period) <= 0.02 &&
      rel(mh.amplitude, o.lsq.amplitude) <= 0.05
      ? 'PASS'
      : 'FAIL',
    { kernel: brief(mh), oracle: { lsq: o.lsq, fft: o.fft } }
  );
  leg(
    'L3ch',
    mh.state === 'libration' && rel(mh.period, 2071) <= 0.1 ? 'PASS' : 'FAIL',
    brief(mh),
    'cited 2071 d'
  );
  leg(
    'L3a',
    mt.state === o.turning.state &&
      mt.period !== null &&
      o.turning.period !== null &&
      rel(mt.period, o.turning.period) <= 0.02 &&
      rel(mt.amplitude, o.turning.amplitude) <= 0.05
      ? 'PASS'
      : 'FAIL',
    { kernel: brief(mt), oracle: o.turning },
    'AM6: the amended oracle turning-point estimator'
  );
  const div = maxCirc(phi, series.laplace.phi);
  leg(
    'L4b',
    Lm.dE <= 1e-8 &&
      o.turning.amplitude !== null &&
      div <= 0.05 * o.turning.amplitude
      ? 'PASS'
      : 'FAIL',
    {
      step: briefStep(stepL),
      dE: Lm.dE,
      maxDivergenceDeg: div,
      oracleAmplitude: o.turning.amplitude,
    }
  );
  // C1h, C1a
  let insideH = 0;
  let insideT = 0;
  const rows = inputs.ensemble.map((mb, k) => {
    const r = integrate(mb.bodies, 1, stepL.h, stepL.stepsPerSample, nWin);
    const ph = laplaceSeries(r);
    const h = lapHarmonic(r.times, ph);
    const t = lapTurning(r.times, ph);
    const oh = orc.ensemble[k].lsq.period;
    const ot = orc.ensemble[k].turning.period;
    const hitH =
      h.state === 'libration' && Math.abs(h.period - oh) <= 2 * h.periodSigma;
    const hitT =
      t.state === 'libration' &&
      t.period !== null &&
      ot !== null &&
      Math.abs(t.period - ot) <= 2 * t.periodSigma;
    if (hitH) insideH++;
    if (hitT) insideT++;
    return {
      id: mb.id,
      harmonic: {
        period: h.period,
        sigma: h.periodSigma,
        oracle: oh,
        hit: hitH,
      },
      turning: {
        period: t.period,
        sigma: t.periodSigma,
        oracle: ot,
        hit: hitT,
      },
    };
  });
  leg('C1h', insideH >= 9 ? 'PASS' : 'FAIL', {
    inside: insideH,
    of: rows.length,
    rows: rows.map(r => ({ id: r.id, ...r.harmonic })),
  });
  leg(
    'C1a',
    insideT >= 9 ? 'PASS' : 'FAIL',
    {
      inside: insideT,
      of: rows.length,
      rows: rows.map(r => ({ id: r.id, ...r.turning })),
    },
    'AM6: the amended oracle turning-point estimator'
  );
  // D1h, D2h
  const short = [0.5, 1, 2].map(f => {
    const n = Math.round(f * 2071) + 1;
    return {
      periods: f,
      ...brief(lapHarmonic(Lm.times.slice(0, n), phi.slice(0, n))),
    };
  });
  leg(
    'D1h',
    short.every(
      o2 =>
        o2.state === 'not-constrained' &&
        o2.period === null &&
        o2.amplitude === null
    )
      ? 'PASS'
      : 'FAIL',
    { windows: short }
  );
  const det = integrate(
    detunedLaplace(1.01),
    1,
    stepL.h,
    stepL.stepsPerSample,
    nWin
  );
  const md = lapHarmonic(det.times, laplaceSeries(det));
  leg('D2h', md.state !== 'libration' ? 'PASS' : 'FAIL', brief(md));
} else {
  for (const id of ['L3h', 'L3ch', 'L3a', 'L4b', 'C1h', 'C1a', 'D1h', 'D2h'])
    leg(id, 'FAIL', { step: briefStep(stepL) }, 'no step was returned');
}

// ---- the Pluto model at the budget step ---------------------------------------------------------------
{
  const S = PLUTO_NEPTUNE;
  const mN = 1 / S.neptune.sunOverMass;
  const innerPeriod =
    2 * Math.PI * Math.sqrt(S.neptune.aAU ** 3 / (G_AU_YR * (1 + mN)));
  const stepP = stepForBudget({
    bodies: inputs.pluto.bodies,
    G: G_AU_YR,
    innerPeriod,
    sampleInterval: 20,
    window: WIN.P,
    energyBudget: 1e-8,
    angles: s => {
      const p = anglesOf(s, 2);
      return [p.lambda, anglesOf(s, 1).lambda, p.varpi];
    },
    angleWeights: [3, 2, 1],
    angleBudgetDeg: 1,
  });
  if (stepP.state === 'chosen') {
    const Pm = integrate(
      inputs.pluto.bodies,
      G_AU_YR,
      stepP.h,
      stepP.stepsPerSample,
      inputs.pluto.n
    );
    const phi = plutoSeries(Pm);
    const m = measureLibrationHarmonic({
      times: Pm.times,
      phi,
      referencePeriod: PLU.ref,
      samplingFloor: PLU.sampling,
    });
    const o = orc.pluto;
    leg(
      'P1h',
      m.state === 'libration' &&
        rel(m.period, o.lsq.period) <= 0.02 &&
        rel(m.amplitude, o.lsq.amplitude) <= 0.05
        ? 'PASS'
        : 'FAIL',
      { kernel: brief(m), oracle: { lsq: o.lsq, fft: o.fft } }
    );
    leg(
      'P2h',
      m.state === 'libration' &&
        rel(m.period, 19670) <= 0.15 &&
        rel(m.amplitude, 82) <= 0.25 &&
        Math.abs(m.center - 180) <= 10
        ? 'PASS'
        : 'FAIL',
      brief(m),
      'cited 19,670 yr, 82 deg, 180 deg from js/resonance/systems.js'
    );
    const div = maxCirc(phi, series.pluto.phi);
    leg(
      'P3b',
      Pm.dE <= 1e-8 &&
        o.turning.amplitude !== null &&
        div <= 0.05 * o.turning.amplitude
        ? 'PASS'
        : 'FAIL',
      {
        step: briefStep(stepP),
        dE: Pm.dE,
        maxDivergenceDeg: div,
        oracleAmplitude: o.turning.amplitude,
      }
    );
  } else {
    for (const id of ['P1h', 'P2h', 'P3b'])
      leg(id, 'FAIL', { step: briefStep(stepP) }, 'no step was returned');
  }
}

// ---- the secular test at the budget step ---------------------------------------------------------------
{
  const sc = inputs.secular;
  const n = Math.sqrt(sc.G / sc.a ** 3);
  const A = secularRateFirstOrder({
    n,
    massRatio: sc.massRatio,
    alpha: sc.a / sc.aJ,
  });
  const nS = Math.round((4 * ((2 * Math.PI) / A)) / 5) + 1;
  const stepS = stepForBudget({
    bodies: sc.bodies,
    G: sc.G,
    innerPeriod: (2 * Math.PI) / n,
    sampleInterval: 5,
    window: (nS - 1) * 5,
    energyBudget: 1e-8,
    angles: s => [anglesOf(s, 2).varpi],
    angleWeights: [1],
    angleBudgetDeg: 7.2,
  });
  if (stepS.state === 'chosen') {
    const S = integrate(sc.bodies, sc.G, stepS.h, stepS.stepsPerSample, nS);
    const r = secularRate({ times: S.times, angleDeg: S.vp[1] });
    const rateRad = r.rate === null ? null : r.rate * RAD;
    leg(
      'S1b',
      r.rate !== null && rel(rateRad, A) <= 0.05 ? 'PASS' : 'FAIL',
      {
        step: briefStep(stepS),
        theoryRadPerYr: A,
        kernelRadPerYr: rateRad,
        rateSigmaRad: r.rateSigma === null ? null : r.rateSigma * RAD,
        turns: r.turns,
      },
      "first order in e, e', i; limits in thresholds.json systems"
    );
    const o = firstOrc.secular;
    leg(
      'S2b',
      r.rate !== null && rel(rateRad, o.rateRadPerYr) <= 0.005
        ? 'PASS'
        : 'FAIL',
      {
        kernelRadPerYr: rateRad,
        oracleRadPerYr: o.rateRadPerYr,
        relative: r.rate === null ? null : rel(rateRad, o.rateRadPerYr),
      },
      "the first oracle's DOP853 rate, which stands"
    );
    const half = Math.round(nS / 2);
    const rs = secularRate({
      times: S.times.slice(0, half),
      angleDeg: S.vp[1].slice(0, half),
    });
    leg(
      'D3b',
      rs.state === 'not-constrained' && rs.rate === null ? 'PASS' : 'FAIL',
      { state: rs.state, turns: rs.turns, rate: rs.rate }
    );
  } else {
    for (const id of ['S1b', 'S2b', 'D3b'])
      leg(id, 'FAIL', { step: briefStep(stepS) }, 'no step was returned');
  }
}

// ---- the source checks and the legs that are reported -------------------------------------------------
for (const id of ['X1L', 'X1P']) {
  const s = sources[id];
  leg(
    id,
    s ? s.status : 'NOT RUN',
    s ?? { request: 'no addendum-sources.json' }
  );
}
leg('N1h', 'REPORTED', { note: THR.legs.find(l => l.id === 'N1h').what });
leg(
  'K1',
  'NOT RUN',
  sources.K1 ?? { request: THR.legs.find(l => l.id === 'K1').bound }
);

// ---- the addendum verdict, by the committed function ---------------------------------------------------
const st = id => legs.find(l => l.id === id).status;
const all = ids => ids.every(i => st(i) === 'PASS');
const standing = ['R1', 'R2', 'R3'].every(
  id => first.legs.find(l => l.id === id).status === 'PASS'
);
const A_LEGS = [
  'O1',
  'T1h',
  'T2h',
  'L1h',
  'L1o',
  'L3h',
  'L3ch',
  'C1h',
  'P1h',
  'P2h',
  'D1h',
  'D2h',
  'L3a',
  'C1a',
  'B0b',
  'B2b',
  'L4b',
  'P3b',
  'S1b',
  'S2b',
  'D3b',
];
const B_LEGS = ['B0b', 'B2b', 'L4b', 'P3b', 'D1h', 'D2h', 'D3b'];
const isA =
  standing && all(A_LEGS) && st('X1L') !== 'FAIL' && st('X1P') !== 'FAIL';
const isB = standing && all(B_LEGS);
const verdict = isA ? 'A' : isB ? 'B' : 'C';
const file = path.join(FIX, 'addendum-results.json');
const prior = fs.existsSync(file) ? read('addendum-results.json') : null;
const result = {
  format: 'gravitas.resonances-ii-addendum-results/1',
  node: process.version,
  ran: new Date().toISOString().slice(0, 10),
  seconds: Math.round((Date.now() - t0) / 1000),
  firstVerdict: first.verdict,
  standingLegs: { R1: 'PASS', R2: 'PASS', R3: 'PASS', verified: standing },
  verdict,
  counts: legs.reduce(
    (c, l) => ((c[l.status] = (c[l.status] || 0) + 1), c),
    {}
  ),
  legs,
  history: prior ? [...(prior.history ?? [])] : [],
};
if (prior) {
  const before = Object.fromEntries(prior.legs.map(l => [l.id, l.status]));
  const now = Object.fromEntries(legs.map(l => [l.id, l.status]));
  if (
    JSON.stringify(before) !== JSON.stringify(now) ||
    prior.verdict !== verdict
  )
    result.history.push({
      ran: prior.ran,
      verdict: prior.verdict,
      counts: prior.counts,
      legs: prior.legs,
    });
}
fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({ verdict, counts: result.counts, seconds: result.seconds })
);
for (const l of legs) console.log(l.id, l.status);
