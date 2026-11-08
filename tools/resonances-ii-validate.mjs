#!/usr/bin/env node
// =============================================================================
// The validation of the resonance kernel: libration, secular rate, integrator error (Prompt 273, RESONANCES_II.md)
// -----------------------------------------------------------------------------
// The legs and their bounds are tests/fixtures/resonances-ii/thresholds.json (committed first).
// Modes: `inputs` writes inputs.json for the Python oracle; `run` reads the oracle's output and the
// downloaded Horizons files and writes results.json. Usage: node tools/resonances-ii-validate.mjs inputs|run [--data DIR]
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeState, run as stepRun, energy } from '../js/lab3d/kernel.js';
import { fromElements } from '../js/lab3d/elements.js';
import { GALILEAN, PLUTO_NEPTUNE } from '../js/resonance/systems.js';
import { GM_JUPITER, POLE_J2000 } from '../js/satellites/galilean.js';
import { resonantArgument } from '../js/resonance/elements.js';
import {
  OBLIQUITY_J2000_DEG,
  equatorialRotation,
  measureLibration,
  orbitalAngles,
  resonantArgumentSeries,
  rotate,
  secularRate,
  secularRateFirstOrder,
} from '../js/lab3d/libration.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, '..', 'tests', 'fixtures', 'resonances-ii');
const args = process.argv.slice(2);
const mode = args[0];
const dataDir = args.includes('--data')
  ? args[args.indexOf('--data') + 1]
  : path.join(here, '..', '..', '..', 'scratch-data', 'resonance273');
const RAD = Math.PI / 180;
const DAY = 86400;
const WIN = { L: 8284, P: 78680 };
const THR = JSON.parse(
  fs.readFileSync(path.join(FIX, 'thresholds.json'), 'utf8')
);
const mulberry = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const normal = rng =>
  Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

// ---- systems -----------------------------------------------------------------
const GMJ = GM_JUPITER * DAY * DAY; // km^3 / day^2
const MOONS = GALILEAN.moons.slice(0, 3);
const gmMoon = k => MOONS[k].massOverJupiter * GMJ;
const G_AU_YR = 4 * Math.PI * Math.PI;

/** Barycentric bodies from states relative to the primary at the origin. */
function assemble(m0, rel) {
  const tot = rel.reduce((s, b) => s + b.m, m0);
  const xc = [0, 0, 0];
  const vc = [0, 0, 0];
  for (const b of rel)
    for (let k = 0; k < 3; k++) {
      xc[k] += (b.m * b.x[k]) / tot;
      vc[k] += (b.m * b.v[k]) / tot;
    }
  const sub = (a, c) => a.map((u, k) => u - c[k]);
  return [{ m: m0, x: sub([0, 0, 0], xc), v: sub([0, 0, 0], vc) }].concat(
    rel.map(b => ({ m: b.m, x: sub(b.x, xc), v: sub(b.v, vc) }))
  );
}
function laplaceModel({ detune = 1, dLam3 = 0, eFactor = 1 } = {}) {
  const rel = MOONS.map((mo, k) => {
    const mu = GMJ + gmMoon(k);
    const n = (2 * Math.PI) / mo.periodDays;
    let a = Math.cbrt(mu / (n * n));
    if (k === 1) a *= detune;
    const lam0 = mo.lambda0 + (k === 2 ? dLam3 : 0);
    const e = mo.e * (k === 1 ? eFactor : 1);
    const st = fromElements(
      {
        a,
        e,
        i: 0,
        Omega: 0,
        omega: mo.varpi0 * RAD,
        M: (lam0 - mo.varpi0) * RAD,
      },
      mu
    );
    return { m: gmMoon(k), x: st.x, v: st.v };
  });
  return assemble(GMJ, rel);
}
function plutoModel() {
  const S = PLUTO_NEPTUNE;
  const mN = 1 / S.neptune.sunOverMass;
  const mP = S.pluto.massSolar;
  const aN = S.neptune.aAU;
  const aP = aN * Math.pow(1.5, 2 / 3);
  const lamP = (S.argument0 * RAD) / 3; // 3 lamP - 2 lamN - varpiP = argument0, lamN = varpiP = 0
  const sN = fromElements(
    { a: aN, e: S.neptune.e, i: 0, Omega: 0, omega: 0, M: 0 },
    G_AU_YR * (1 + mN)
  );
  const sP = fromElements(
    {
      a: aP,
      e: S.pluto.e,
      i: S.pluto.inclinationDeg * RAD,
      Omega: 0,
      omega: 0,
      M: lamP,
    },
    G_AU_YR * (1 + mP)
  );
  return assemble(1, [
    { m: mN, x: sN.x, v: sN.v },
    { m: mP, x: sP.x, v: sP.v },
  ]);
}
const SEC = { massRatio: 0.005, aJ: 5.2, a: 1.9, e: 0.05 };
function secularModel() {
  const sJ = fromElements(
    { a: SEC.aJ, e: 0, i: 0, Omega: 0, omega: 0, M: 0 },
    G_AU_YR * (1 + SEC.massRatio)
  );
  const sp = fromElements(
    { a: SEC.a, e: SEC.e, i: 0, Omega: 0, omega: 0, M: 0 },
    G_AU_YR
  );
  return assemble(1, [
    { m: SEC.massRatio, x: sJ.x, v: sJ.v },
    { m: 0, x: sp.x, v: sp.v },
  ]);
}

// ---- Horizons ------------------------------------------------------------------
function parseHorizons(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const body = txt.slice(txt.indexOf('$$SOE') + 5, txt.indexOf('$$EOE'));
  return body
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const c = l.split(',').map(s => s.trim());
      return { jd: +c[0], x: [+c[2], +c[3], +c[4]], v: [+c[5], +c[6], +c[7]] };
    });
}

// ---- running the kernel ----------------------------------------------------------
/** Integrate and sample; angles of bodies 1.. relative to body 0. */
function integrate(
  bodies,
  G,
  h,
  stepsPerSample,
  nSamples,
  rot = null,
  scale = 1
) {
  const s = makeState(bodies, { G });
  const n = bodies.length;
  const lam = Array.from({ length: n - 1 }, () => []);
  const vp = Array.from({ length: n - 1 }, () => []);
  const times = [];
  const E0 = energy(s);
  let maxDE = 0;
  for (let k = 0; k < nSamples; k++) {
    if (k > 0) stepRun(s, 'yoshida4', h, stepsPerSample);
    times.push(k * stepsPerSample * h * scale);
    for (let i = 1; i < n; i++) {
      let x = [0, 1, 2].map(c => s.x[3 * i + c] - s.x[c]);
      let v = [0, 1, 2].map(c => s.v[3 * i + c] - s.v[c]);
      if (rot) {
        x = rotate(rot, x);
        v = rotate(rot, v);
      }
      const ang = orbitalAngles(x, v, G * (s.m[0] + s.m[i]));
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
const circDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const maxCirc = (a, b) =>
  a.reduce((m, x, i) => Math.max(m, circDiff(x, b[i])), 0);
const LAP = { ref: 3.5249, floor: 0.002, sampling: 1 };
const PLU = { ref: 491.5, floor: 0.5, sampling: 20 };
const lapMeasure = (times, phi) =>
  measureLibration({
    times,
    phi,
    referencePeriod: LAP.ref,
    floorDeg: LAP.floor,
    stationaryDeg: LAP.floor,
    samplingFloor: LAP.sampling,
  });
const pluMeasure = (times, phi) =>
  measureLibration({
    times,
    phi,
    referencePeriod: PLU.ref,
    floorDeg: PLU.floor,
    samplingFloor: PLU.sampling,
  });
const brief = m => ({
  state: m.state,
  reason: m.reason,
  period: m.period,
  periodSigma: m.periodSigma,
  amplitude: m.amplitude,
  center: m.center,
  periodsObserved: m.periodsObserved,
});

// ---- mode: inputs ----------------------------------------------------------------
const rotL = equatorialRotation(POLE_J2000.raDeg, POLE_J2000.decDeg);
function ensembleMembers() {
  const rng = mulberry(273);
  return Array.from({ length: 10 }, (_, k) => {
    const dLam3 = 2 * normal(rng);
    const eFactor = 1 + 0.05 * normal(rng);
    return {
      id: `m${k}`,
      dLam3,
      eFactor,
      bodies: laplaceModel({ dLam3, eFactor }),
    };
  });
}
if (mode === 'inputs') {
  const rng = mulberry(2731);
  const r1 = Array.from({ length: 2000 }, () => ({
    lam: Array.from({ length: 3 }, () => 360 * rng()),
    vp: Array.from({ length: 3 }, () => 360 * rng()),
  }));
  const out = {
    format: 'gravitas.resonances-ii-inputs/1',
    constants: {
      GMJ_km3_day2: GMJ,
      GM_jupiter_km3_s2: GM_JUPITER,
      moonMassOverJupiter: MOONS.map(m => m.massOverJupiter),
      pole: { raDeg: POLE_J2000.raDeg, decDeg: POLE_J2000.decDeg },
      obliquityDeg: OBLIQUITY_J2000_DEG,
      G_au_yr: G_AU_YR,
    },
    windows: WIN,
    r1,
    laplace: {
      bodies: laplaceModel(),
      h: 1 / 45,
      perSample: 45,
      n: WIN.L + 1,
      ref: LAP.ref,
      floor: LAP.floor,
      sampling: LAP.sampling,
    },
    pluto: {
      bodies: plutoModel(),
      h: 1,
      perSample: 20,
      n: Math.round(WIN.P / 20) + 1,
      ref: PLU.ref,
      floor: PLU.floor,
      sampling: PLU.sampling,
    },
    secular: {
      bodies: secularModel(),
      h: 0.1,
      perSample: 50,
      G: G_AU_YR,
      massRatio: SEC.massRatio,
      a: SEC.a,
      aJ: SEC.aJ,
    },
    ensemble: ensembleMembers().map(m => ({
      id: m.id,
      dLam3: m.dLam3,
      eFactor: m.eFactor,
      bodies: m.bodies,
    })),
  };
  fs.mkdirSync(path.join(FIX, 'inputs'), { recursive: true });
  fs.writeFileSync(
    path.join(FIX, 'inputs', 'inputs.json'),
    JSON.stringify(out)
  );
  console.log('inputs written');
  process.exit(0);
}

// ---- mode: run -------------------------------------------------------------------
if (mode !== 'run') {
  console.error('mode: inputs|run');
  process.exit(2);
}
const inputs = JSON.parse(
  fs.readFileSync(path.join(FIX, 'inputs', 'inputs.json'), 'utf8')
);
const orc = JSON.parse(
  fs.readFileSync(path.join(FIX, 'oracle-results.json'), 'utf8')
);
const series = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'oracle', 'series.json'), 'utf8')
);
const legs = [];
const leg = (id, status, values, note = '') =>
  legs.push({ id, status, values, note });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const t0 = Date.now();

// R1
{
  let worst = 0;
  let refusedOk = true;
  inputs.r1.forEach((s, k) => {
    const L = resonantArgument([
      { coefficient: 1, lambda: s.lam[0] },
      { coefficient: -3, lambda: s.lam[1] },
      { coefficient: 2, lambda: s.lam[2] },
    ]);
    const P = resonantArgument([
      {
        coefficient: 3,
        varpiCoefficient: -1,
        lambda: s.lam[0],
        varpi: s.vp[0],
      },
      { coefficient: -2, lambda: s.lam[1] },
    ]);
    const Gn = resonantArgument([
      {
        coefficient: 5,
        varpiCoefficient: -1,
        lambda: s.lam[0],
        varpi: s.vp[0],
      },
      {
        coefficient: -3,
        varpiCoefficient: -1,
        lambda: s.lam[1],
        varpi: s.vp[1],
      },
    ]);
    worst = Math.max(
      worst,
      circDiff(L, orc.r1.laplace[k]),
      circDiff(P, orc.r1.pluto[k]),
      circDiff(Gn, orc.r1.generic[k])
    );
  });
  refusedOk =
    resonantArgument([
      { coefficient: 1, lambda: 10 },
      { coefficient: -2, lambda: 20 },
    ]) === null;
  leg('R1', worst <= 1e-9 && refusedOk ? 'PASS' : 'FAIL', {
    maxDiffDeg: worst,
    refusesUnbalanced: refusedOk,
  });
}
// R2, R3, L1 from the raw Horizons files
const raw = [501, 502, 503].map(c =>
  parseHorizons(path.join(dataDir, 'raw', `horizons_${c}.txt`))
);
const nWin = WIN.L + 1;
const lamK = [];
const vpK = [];
raw.forEach((rows, k) => {
  const mu = GM_JUPITER * (1 + MOONS[k].massOverJupiter);
  lamK.push([]);
  vpK.push([]);
  for (let i = 0; i < nWin; i++) {
    const a = orbitalAngles(
      rotate(rotL, rows[i].x),
      rotate(rotL, rows[i].v),
      mu
    );
    lamK[k].push(a.lambda);
    vpK[k].push(a.varpi);
  }
});
const phiRef = laplaceSeries({ lam: lamK });
{
  const dl = Math.max(
    ...[0, 1, 2].map(k => maxCirc(lamK[k], series.jup365.lam[k]))
  );
  const dv = Math.max(
    ...[0, 1, 2].map(k => maxCirc(vpK[k], series.jup365.vp[k]))
  );
  const da = maxCirc(phiRef, series.jup365.phi);
  leg('R2', dl <= 1e-6 && dv <= 1e-6 && da <= 1e-6 ? 'PASS' : 'FAIL', {
    maxLambdaDeg: dl,
    maxVarpiDeg: dv,
    maxArgumentDeg: da,
  });
}
const pinned = JSON.parse(
  fs.readFileSync(path.join(FIX, 'jup365-laplace-argument.json'), 'utf8')
);
{
  const d = maxCirc(phiRef, pinned.phi);
  leg('R3', d <= 2e-5 ? 'PASS' : 'FAIL', {
    maxDiffDeg: d,
    digestsMatch:
      JSON.stringify(pinned.sha256) === JSON.stringify(THR.data.sha256),
  });
}
{
  const m = lapMeasure(
    pinned.phi.map((_, i) => i),
    pinned.phi
  );
  const ok =
    m.state === 'libration' &&
    m.period !== null &&
    rel(m.period, 2071) <= 0.05 &&
    rel(m.amplitude, 0.064) <= 0.5 &&
    Math.abs(m.center - 180) <= 1;
  leg(
    'L1',
    ok ? 'PASS' : 'FAIL',
    brief(m),
    'cited 2071 d, 0.064 deg, 180 deg from js/resonance/systems.js'
  );
}
{
  const m = measureLibration({
    times: pinned.phi.map((_, i) => i),
    phi: pinned.phi,
    referencePeriod: LAP.ref,
    floorDeg: LAP.floor,
    stationaryDeg: LAP.floor,
    samplingFloor: LAP.sampling,
    smoothSpan: 1000,
  });
  const ok =
    m.state === 'libration' &&
    m.period !== null &&
    rel(m.period, 2071) <= 0.05 &&
    rel(m.amplitudeCorrected, 0.064) <= 0.5 &&
    Math.abs(m.center - 180) <= 1;
  leg(
    'L1s',
    ok ? 'PASS' : 'FAIL',
    {
      ...brief(m),
      amplitudeCorrected: m.amplitudeCorrected,
      smoothingGain: m.smoothingGain,
      oracle: orc.jup365s,
    },
    'AM3: 1,000 d smoothing, amplitude corrected for the boxcar gain'
  );
}
// L2 point-mass N-body from the JUP365 osculating states
{
  const rows = raw.map(r => r[0]);
  const relb = rows.map((r, k) => ({
    m: gmMoon(k),
    x: rotate(rotL, r.x).map(u => u),
    v: rotate(
      rotL,
      r.v.map(u => u * DAY)
    ),
  }));
  const bodies = assemble(
    GMJ,
    relb.map(b => ({ m: b.m, x: b.x, v: b.v }))
  );
  const r = integrate(bodies, 1, 1 / 45, 45, nWin);
  const phi = laplaceSeries(r);
  const m = lapMeasure(r.times, phi);
  const ok =
    m.state === 'libration' && m.period !== null && rel(m.period, 2071) <= 0.1;
  leg(
    'L2',
    ok ? 'PASS' : 'FAIL',
    {
      ...brief(m),
      phiMin: Math.min(...phi),
      phiMax: Math.max(...phi),
      dE: r.dE,
    },
    'point masses, no oblateness'
  );
}
function follow(sfx, nl, np, ns) {
  // L3, L3c, L4
  const Lm = integrate(inputs.laplace.bodies, 1, 1 / nl, nl, nWin);
  const phiLm = laplaceSeries(Lm);
  const mLm = lapMeasure(Lm.times, phiLm);
  {
    const o = orc.laplace;
    const ok =
      mLm.state === o.state &&
      mLm.period !== null &&
      o.period !== null &&
      rel(mLm.period, o.period) <= 0.02 &&
      rel(mLm.amplitude, o.amplitude) <= 0.05;
    leg('L3' + sfx, ok ? 'PASS' : 'FAIL', { kernel: brief(mLm), oracle: o });
    const okc =
      mLm.state === 'libration' &&
      mLm.period !== null &&
      rel(mLm.period, 2071) <= 0.1;
    leg('L3c' + sfx, okc ? 'PASS' : 'FAIL', brief(mLm), 'cited 2071 d');
    const div = maxCirc(phiLm, series.laplace.phi);
    const ok4 =
      Lm.dE <= 1e-8 && o.amplitude !== null && div <= 0.05 * o.amplitude;
    leg('L4' + sfx, ok4 ? 'PASS' : 'FAIL', {
      dE: Lm.dE,
      maxDivergenceDeg: div,
      oracleAmplitude: o.amplitude,
    });
  }
  // P1, P2, P3
  const nP = inputs.pluto.n;
  const Pm = integrate(inputs.pluto.bodies, G_AU_YR, 20 / np, np, nP);
  const phiPm = plutoSeries(Pm);
  const mPm = pluMeasure(Pm.times, phiPm);
  {
    const o = orc.pluto;
    const ok =
      mPm.state === o.state &&
      mPm.period !== null &&
      o.period !== null &&
      rel(mPm.period, o.period) <= 0.02 &&
      rel(mPm.amplitude, o.amplitude) <= 0.05;
    leg('P1' + sfx, ok ? 'PASS' : 'FAIL', { kernel: brief(mPm), oracle: o });
    const okc =
      mPm.state === 'libration' &&
      mPm.period !== null &&
      rel(mPm.period, 19670) <= 0.15 &&
      rel(mPm.amplitude, 82) <= 0.25 &&
      Math.abs(mPm.center - 180) <= 10;
    leg(
      'P2' + sfx,
      okc ? 'PASS' : 'FAIL',
      brief(mPm),
      'cited 19,670 yr, 82 deg, 180 deg from js/resonance/systems.js'
    );
    const div = maxCirc(phiPm, series.pluto.phi);
    const ok3 =
      Pm.dE <= 1e-8 && o.amplitude !== null && div <= 0.05 * o.amplitude;
    leg('P3' + sfx, ok3 ? 'PASS' : 'FAIL', {
      dE: Pm.dE,
      maxDivergenceDeg: div,
      oracleAmplitude: o.amplitude,
    });
  }
  // S1, S2, D3
  {
    const sc = inputs.secular;
    const n = Math.sqrt(sc.G / (sc.a * sc.a * sc.a));
    const A = secularRateFirstOrder({
      n,
      massRatio: sc.massRatio,
      alpha: sc.a / sc.aJ,
    });
    const periodTheory = (2 * Math.PI) / A; // yr
    const nS = Math.round((4 * periodTheory) / 5) + 1;
    const S = integrate(sc.bodies, sc.G, 5 / ns, ns, nS);
    const r = secularRate({ times: S.times, angleDeg: S.vp[1] });
    const rateRad = r.rate === null ? null : r.rate * RAD;
    const okS1 = r.rate !== null && rel(rateRad, A) <= 0.05;
    leg(
      'S1' + sfx,
      okS1 ? 'PASS' : 'FAIL',
      {
        theoryRadPerYr: A,
        kernelRadPerYr: rateRad,
        rateSigmaRad: r.rateSigma === null ? null : r.rateSigma * RAD,
        turns: r.turns,
        window: S.times[S.times.length - 1],
        theoryPeriodYr: periodTheory,
      },
      "first order in e, e', i; limits in thresholds.systems"
    );
    const o = orc.secular;
    leg(
      'S2' + sfx,
      r.rate !== null && rel(rateRad, o.rateRadPerYr) <= 0.005
        ? 'PASS'
        : 'FAIL',
      {
        kernelRadPerYr: rateRad,
        oracleRadPerYr: o.rateRadPerYr,
        oracleTheoryRadPerYr: o.theoryRadPerYr,
        theoryAgreesWithOracleTheory: rel(A, o.theoryRadPerYr),
      }
    );
    const half = Math.round(nS / 2);
    const rs = secularRate({
      times: S.times.slice(0, half),
      angleDeg: S.vp[1].slice(0, half),
    });
    leg(
      'D3' + sfx,
      rs.state === 'not-constrained' && rs.rate === null ? 'PASS' : 'FAIL',
      { state: rs.state, turns: rs.turns, rate: rs.rate }
    );
  }
  // C1 ensemble
  {
    let inside = 0;
    const rows = inputs.ensemble.map((mb, k) => {
      const r = integrate(mb.bodies, 1, 1 / nl, nl, nWin);
      const m = lapMeasure(r.times, laplaceSeries(r));
      const truth = orc.ensemble[k].period;
      const hit =
        m.state === 'libration' &&
        m.period !== null &&
        truth !== null &&
        Math.abs(m.period - truth) <= 2 * m.periodSigma;
      if (hit) inside++;
      return {
        id: mb.id,
        kernelPeriod: m.period,
        sigma: m.periodSigma,
        oraclePeriod: truth,
        hit,
      };
    });
    leg('C1' + sfx, inside >= 9 ? 'PASS' : 'FAIL', {
      inside,
      of: rows.length,
      rows,
    });
  }
  // D1, D2
  {
    const out = [0.5, 1, 2].map(f => {
      const n = Math.round(f * 2071) + 1;
      const m = lapMeasure(Lm.times.slice(0, n), phiLm.slice(0, n));
      return { periods: f, ...brief(m) };
    });
    leg(
      'D1' + sfx,
      out.every(
        o =>
          o.state === 'not-constrained' &&
          o.period === null &&
          o.amplitude === null
      )
        ? 'PASS'
        : 'FAIL',
      { windows: out }
    );
    const det = inputs.ensemble.length
      ? integrate(laplaceModel({ detune: 1.01 }), 1, 1 / nl, nl, nWin)
      : null;
    const m = lapMeasure(det.times, laplaceSeries(det));
    leg('D2' + sfx, m.state !== 'libration' ? 'PASS' : 'FAIL', brief(m));
  }
}
follow('', 45, 20, 50);
follow('f', 180, 80, 250);
// AM5: the g legs
{
  const nl = 180;
  const L = integrate(inputs.laplace.bodies, 1, 1 / nl, nl, nWin);
  const m = lapMeasure(L.times, laplaceSeries(L));
  const o = orc.laplace_c;
  const ok =
    m.state === o.state &&
    m.period !== null &&
    o.period !== null &&
    rel(m.period, o.period) <= 0.02 &&
    rel(m.amplitude, o.amplitude) <= 0.05;
  leg(
    'L3g',
    ok ? 'PASS' : 'FAIL',
    { kernel: brief(m), oracle: o },
    'AM5: the corrected oracle estimator'
  );
  let inside = 0;
  const rows = inputs.ensemble.map((mb, k) => {
    const r = integrate(mb.bodies, 1, 1 / nl, nl, nWin);
    const mm = lapMeasure(r.times, laplaceSeries(r));
    const truth = orc.ensemble_c[k].period;
    const hit =
      mm.state === 'libration' &&
      mm.period !== null &&
      truth !== null &&
      Math.abs(mm.period - truth) <= 2 * mm.periodSigma;
    if (hit) inside++;
    return {
      id: mb.id,
      kernelPeriod: mm.period,
      sigma: mm.periodSigma,
      oraclePeriod: truth,
      hit,
    };
  });
  leg(
    'C1g',
    inside >= 9 ? 'PASS' : 'FAIL',
    { inside, of: rows.length, rows },
    'AM5: the corrected oracle estimator'
  );
  const sc = inputs.secular;
  const n = Math.sqrt(sc.G / (sc.a * sc.a * sc.a));
  const A = secularRateFirstOrder({
    n,
    massRatio: sc.massRatio,
    alpha: sc.a / sc.aJ,
  });
  const nS = Math.round((4 * ((2 * Math.PI) / A)) / 5) + 1;
  const S = integrate(sc.bodies, sc.G, 5 / 1000, 1000, nS);
  const r = secularRate({ times: S.times, angleDeg: S.vp[1] });
  const rateRad = r.rate === null ? null : r.rate * RAD;
  leg('S1g', r.rate !== null && rel(rateRad, A) <= 0.05 ? 'PASS' : 'FAIL', {
    theoryRadPerYr: A,
    kernelRadPerYr: rateRad,
    rateSigmaRad: r.rateSigma === null ? null : r.rateSigma * RAD,
    turns: r.turns,
  });
  leg(
    'S2g',
    r.rate !== null && rel(rateRad, orc.secular.rateRadPerYr) <= 0.005
      ? 'PASS'
      : 'FAIL',
    { kernelRadPerYr: rateRad, oracleRadPerYr: orc.secular.rateRadPerYr }
  );
  const half = Math.round(nS / 2);
  const rs = secularRate({
    times: S.times.slice(0, half),
    angleDeg: S.vp[1].slice(0, half),
  });
  leg(
    'D3g',
    rs.state === 'not-constrained' && rs.rate === null ? 'PASS' : 'FAIL',
    { state: rs.state, turns: rs.turns, rate: rs.rate }
  );
}
leg('N1', 'REPORTED', { note: THR.legs.find(l => l.id === 'N1').what });
leg('K1', 'NOT RUN', { request: THR.legs.find(l => l.id === 'K1').bound });

// verdict by the committed function
const st = id => legs.find(l => l.id === id).status;
const all = ids => ids.every(i => st(i) === 'PASS');
const A = all([
  'R1',
  'R2',
  'R3',
  'L1',
  'L2',
  'L3',
  'L3c',
  'L4',
  'P1',
  'P2',
  'P3',
  'S1',
  'S2',
  'C1',
  'D1',
  'D2',
  'D3',
]);
const B = all(['R1', 'R2', 'R3', 'L4', 'P3', 'D1', 'D2', 'D3']);
const verdict = A ? 'A' : B ? 'B' : 'C';
const prior = fs.existsSync(path.join(FIX, 'results.json'))
  ? JSON.parse(fs.readFileSync(path.join(FIX, 'results.json'), 'utf8'))
  : null;
const result = {
  format: 'gravitas.resonances-ii-results/1',
  node: process.version,
  ran: new Date().toISOString().slice(0, 10),
  seconds: Math.round((Date.now() - t0) / 1000),
  verdict,
  counts: legs.reduce(
    (c, l) => ((c[l.status] = (c[l.status] || 0) + 1), c),
    {}
  ),
  legs,
};
if (prior && prior.history) result.history = prior.history;
fs.writeFileSync(
  path.join(FIX, 'results.json'),
  JSON.stringify(result, null, 2) + '\n'
);
console.log(
  JSON.stringify({ verdict, counts: result.counts, seconds: result.seconds })
);
for (const l of legs) console.log(l.id, l.status);
