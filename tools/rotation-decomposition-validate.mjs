#!/usr/bin/env node
// =============================================================================
// The rotation-curve decomposition kernel against its committed thresholds (Prompt 236, Part A)
// -----------------------------------------------------------------------------
//   npm run decomposition:validate                    print the table
//   npm run decomposition:validate -- --json          print it as JSON
//   npm run decomposition:validate -- --write-results rewrite tests/fixtures/rotation-decomposition/results.json,
//                                                    failed-legs.json and ensembles.json
//   npm run decomposition:validate -- --only=A,B      run the rows whose id starts with one of these
//   npm run decomposition:validate -- --write-oracle-inputs   write oracle-inputs.json for the oracle
//
// tests/fixtures/rotation-decomposition/thresholds.json fixed every bound before js/kernels/galactic/
// decomposition.js existed. The oracle (tools/rotation-decomposition-oracle/oracle.py, numpy and scipy, written
// from thresholds.json alone) pinned its output in oracle-results.json. A crossed bound is a failed row, left
// failing in failed-legs.json; a leg whose data was never supplied is NOT RUN and says so; a REPORTED row has
// no bound. The consumers rule of thresholds.json decides whether the panel and the lesson depth may be built.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import '../tests/galacticFetch.js';
import * as D from '../js/kernels/galactic/decomposition.js';
import * as S from '../js/kernels/galactic/decompositionSynthetic.js';
import { adaptive } from '../js/numeric/quadrature.js';
import { stream } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { galacticPack } from './authoring/galacticPacks.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(REPO, 'tests/fixtures/rotation-decomposition');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const maybe = name => (existsSync(path.join(FIX, name)) ? read(name) : null);

const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const only = (argv.find(a => a.startsWith('--only=')) ?? '')
  .slice(7)
  .split(',')
  .filter(Boolean);
const wanted = id => only.length === 0 || only.some(p => id.startsWith(p));

const thr = read('thresholds.json');
const lim = id => thr.checks.find(c => c.id === id).limits;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

const rows = [];
const row = (id, status, measured, note = '') => {
  const c = thr.checks.find(x => x.id === id);
  rows.push({ id, group: c.group, status, measured, note });
};
const judge = (id, pass, measured, note = '') =>
  row(id, pass ? 'pass' : 'fail', measured, note);
const notRun = (id, why) => row(id, 'not-run', null, why);
const reported = (id, measured, note = '') =>
  row(id, 'reported', measured, note);

const TRUTH = S.SYNTHETIC_TRUTH;
const DISK = { luminosity: TRUTH.luminosity, massToLight: TRUTH.massToLight };
const BULGE = { mass: TRUTH.bulgeMass, scale: TRUTH.bulgeScale };
const LOG_TRUTH_MD = Math.log10(TRUTH.diskMass);

// A deterministic list of cases for the analytic rows.
const cases = (label, n, make) => {
  const u = stream('noise', 'rotdec-236', 'cases', label);
  return Array.from({ length: n }, () => make(u));
};
const logUniform = (u, lo, hi) => lo * (hi / lo) ** u();

// --- A: analytic -------------------------------------------------------------------------------
function legA() {
  const G = D.G_KPC;
  if (wanted('A1')) {
    let worst = 0;
    const cs = cases('A1', 12, u => ({
      r: logUniform(u, 0.05, 100),
      M: logUniform(u, 1e8, 1e11),
      a: logUniform(u, 0.1, 3),
    }));
    for (const c of cs)
      worst = Math.max(
        worst,
        rel(
          D.bulgeSpeed(c.r, c.M, c.a),
          Math.sqrt((G * c.M * c.r) / ((c.r + c.a) * (c.r + c.a)))
        )
      );
    judge('A1', worst <= lim('A1').relative, {
      worstRelative: worst,
      cases: 12,
    });
  }
  if (wanted('A2')) {
    const v = D.bulgeSpeed(5, 1e10, 1e-9);
    const e = rel(v, Math.sqrt((G * 1e10) / 5));
    judge('A2', e <= lim('A2').relative, { relative: e });
  }
  if (wanted('A3')) {
    // The committed reference writes m(x) as ln(1 + x) - x / (1 + x). Evaluated as written it loses
    // digits at small x (the two terms agree to x^2/2); the amendment AM1 evaluates the same function
    // with log1p. Both are measured; the committed form's verdict binds (thresholds.json, rule).
    let worst = 0;
    let worstMass = 0;
    let worstAmended = 0;
    let worstMassAmended = 0;
    const cs = cases('A3', 12, u => ({
      r: logUniform(u, 0.05, 200),
      vs: logUniform(u, 50, 600),
      rs: logUniform(u, 2, 60),
    }));
    for (const c of cs) {
      const x = c.r / c.rs;
      const Ms = (c.vs * c.vs * c.rs) / G;
      const speed = D.nfwSpeed(c.r, c.vs, c.rs);
      const mass = D.enclosedMass(c.r, speed);
      const naive = Math.log(1 + x) - x / (1 + x);
      const exact = Math.log1p(x) - x / (1 + x);
      worst = Math.max(worst, rel(speed, c.vs * Math.sqrt(naive / x)));
      worstMass = Math.max(worstMass, rel(mass, Ms * naive));
      worstAmended = Math.max(
        worstAmended,
        rel(speed, c.vs * Math.sqrt(exact / x))
      );
      worstMassAmended = Math.max(worstMassAmended, rel(mass, Ms * exact));
    }
    judge('A3', Math.max(worst, worstMass) <= lim('A3').relative, {
      worstSpeedRelative: worst,
      worstMassRelative: worstMass,
      amendedAM1: {
        worstSpeedRelative: worstAmended,
        worstMassRelative: worstMassAmended,
      },
    });
  }
  if (wanted('A4')) {
    // The root of x^2/(1+x)^2 = ln(1+x) - x/(1+x) by bisection here, not by the kernel.
    const f = x =>
      (x * x) / ((1 + x) * (1 + x)) - (Math.log(1 + x) - x / (1 + x));
    let lo = 0.5;
    let hi = 10;
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (f(lo) * f(mid) <= 0) hi = mid;
      else lo = mid;
    }
    const root = 0.5 * (lo + hi);
    // The kernel's maximum by golden section over r with r_s = 1, v_s = 1.
    const phi = (Math.sqrt(5) - 1) / 2;
    let a = 0.5;
    let b = 10;
    for (let i = 0; i < 200; i++) {
      const c = b - phi * (b - a);
      const d = a + phi * (b - a);
      if (D.nfwSpeed(c, 1, 1) > D.nfwSpeed(d, 1, 1)) b = d;
      else a = c;
    }
    const xs = 0.5 * (a + b);
    const vmax = Math.sqrt((Math.log(1 + root) - root / (1 + root)) / root);
    const ex = rel(xs, root);
    const ev = rel(D.nfwSpeed(root, 1, 1), vmax);
    const ek = rel(D.nfwPeakRatio(), root);
    judge(
      'A4',
      ex <= lim('A4').xRelative && ev <= lim('A4').vmaxRelative && ek <= 1e-12,
      {
        xRelative: ex,
        vmaxRelative: ev,
        kernelPeakRatioRelative: ek,
        peakRatio: root,
      }
    );
  }
  if (wanted('A5')) {
    const x = 1e-3;
    const ratio = D.nfwSpeed(x, 1, 1) ** 2 / (x / 2);
    const e = Math.abs(ratio - 1);
    // Diagnostic after the result, not a leg: m(x) / x = x/2 - 2x^2/3 + 3x^3/4 - ..., so the ratio is
    // 1 - 4x/3 + 3x^2/2 - ..., and the kernel agrees with that series.
    const series = 1 - (4 * x) / 3 + (3 * x * x) / 2;
    judge('A5', e <= lim('A5').relative, {
      relative: e,
      expectedFirstCorrection: (4 * x) / 3,
      kernelAgainstThreeTermSeries: Math.abs(ratio / series - 1),
    });
  }
  if (wanted('A6')) {
    let worst = 0;
    for (const c of cases('A6', 12, u => ({
      r: logUniform(u, 0.05, 200),
      v: logUniform(u, 50, 400),
      rc: logUniform(u, 0.5, 40),
    }))) {
      const x = c.r / c.rc;
      worst = Math.max(
        worst,
        rel(
          D.isothermalSpeed(c.r, c.v, c.rc),
          c.v * Math.sqrt(1 - Math.atan(x) / x)
        )
      );
    }
    judge('A6', worst <= lim('A6').relative, { worstRelative: worst });
  }
  if (wanted('A7')) {
    const x = 1000;
    const series = 1 - Math.PI / (2 * x) + 1 / (x * x) - 1 / (3 * x ** 4);
    const e = rel(D.isothermalSpeed(x, 1, 1) ** 2, series);
    judge('A7', e <= lim('A7').relative, { relative: e });
  }
  if (wanted('A8')) {
    let worst = 0;
    const per = {};
    const ms = 1e10;
    const a = 0.7;
    const vs = 300;
    const rs = 12;
    const vi = 200;
    const rc = 5;
    const rhoS = (vs * vs) / (4 * Math.PI * G * rs * rs);
    const rho0 = (vi * vi) / (4 * Math.PI * G * rc * rc);
    const dens = {
      hernquist: [
        r => (ms * a) / (2 * Math.PI * r * (r + a) ** 3),
        r => D.bulgeSpeed(r, ms, a),
      ],
      nfw: [
        r => rhoS / ((r / rs) * (1 + r / rs) ** 2),
        r => D.nfwSpeed(r, vs, rs),
      ],
      isothermal: [
        r => rho0 / (1 + (r / rc) ** 2),
        r => D.isothermalSpeed(r, vi, rc),
      ],
    };
    for (const [name, [rho, speed]] of Object.entries(dens))
      for (const R of [0.5, 3, 12, 60]) {
        const q = adaptive(r => 4 * Math.PI * r * r * rho(r), 0, R, {
          absTol: 1e-3,
          relTol: 1e-13,
          maxDepth: 40,
        });
        const e = rel(D.enclosedMass(R, speed(R)), q.value);
        per[`${name}@${R}`] = e;
        worst = Math.max(worst, e);
      }
    judge('A8', worst <= lim('A8').relative, { worstRelative: worst, per });
  }
  if (wanted('A9')) {
    const Rd = 2.6;
    const M = 4e10;
    const r = 100 * Rd;
    const e = Math.abs((D.diskSpeed(r, M, Rd) ** 2 * r) / (G * M) - 1);
    judge('A9', e <= lim('A9').relative, {
      relative: e,
      expectedFirstOrder: 4.5 / 1e4,
    });
  }
  if (wanted('A10')) {
    let worst = 0;
    for (const c of cases('A10', 6, u => ({
      bulgeMass: logUniform(u, 1e9, 3e10),
      bulgeScale: logUniform(u, 0.3, 1.5),
      diskMass: logUniform(u, 5e9, 8e10),
      diskScale: logUniform(u, 1.5, 4),
      haloSpeed: logUniform(u, 100, 500),
      haloScale: logUniform(u, 5, 40),
      halo: 'nfw',
    }))) {
      for (let i = 0; i < 30; i++) {
        const r = 0.2 * 1000 ** (i / 29);
        const k = D.componentSpeeds(r, c);
        worst = Math.max(
          worst,
          rel(k.total ** 2, k.bulge ** 2 + k.disk ** 2 + k.halo ** 2)
        );
      }
      const r = 7;
      const one = D.componentSpeeds(r, c);
      const two = D.componentSpeeds(r, {
        ...c,
        bulgeMass: 2 * c.bulgeMass,
        diskMass: 2 * c.diskMass,
        haloSpeed: 2 * c.haloSpeed,
      });
      worst = Math.max(
        worst,
        rel(two.bulge ** 2, 2 * one.bulge ** 2),
        rel(two.disk ** 2, 2 * one.disk ** 2),
        rel(two.halo, 2 * one.halo)
      );
    }
    judge('A10', worst <= lim('A10').relative, { worstRelative: worst });
  }
}

// --- the oracle's inputs and the B rows ---------------------------------------------------------
const B1_SETS = [
  {
    bulgeMass: 1e10,
    bulgeScale: 0.7,
    diskMass: 4e10,
    diskScale: 2.6,
    nfwSpeed: 420,
    nfwScale: 20,
    isoSpeed: 200,
    isoScale: 5,
  },
  {
    bulgeMass: 2e9,
    bulgeScale: 0.3,
    diskMass: 8e10,
    diskScale: 4.5,
    nfwSpeed: 150,
    nfwScale: 4,
    isoSpeed: 90,
    isoScale: 1,
  },
  {
    bulgeMass: 3e10,
    bulgeScale: 1.5,
    diskMass: 5e9,
    diskScale: 1.5,
    nfwSpeed: 700,
    nfwScale: 60,
    isoSpeed: 350,
    isoScale: 30,
  },
  {
    bulgeMass: 1e8,
    bulgeScale: 0.1,
    diskMass: 1e11,
    diskScale: 6,
    nfwSpeed: 60,
    nfwScale: 2,
    isoSpeed: 40,
    isoScale: 0.5,
  },
  {
    bulgeMass: 5e10,
    bulgeScale: 3,
    diskMass: 2e10,
    diskScale: 3.3,
    nfwSpeed: 300,
    nfwScale: 10,
    isoSpeed: 150,
    isoScale: 12,
  },
];
const B1_RADII = Array.from({ length: 20 }, (_, i) => 0.1 * 2000 ** (i / 19));
const FIT_LO = [Math.log10(1.5e10), 1, 1, 0];
const FIT_HI = [Math.log10(7.5e10), 6, 1000, 2.7];

function oracleInputs() {
  const { points } = S.syntheticCurve({
    radii: S.geometricRadii(1.5, 40, 24),
    error: 4,
    seed: 'rotdec-236:oracle',
  });
  return {
    note: 'inputs of tools/rotation-decomposition-oracle/oracle.py, written by tools/rotation-decomposition-validate.mjs --write-oracle-inputs',
    B1: B1_SETS.map(s => ({ ...s, r: B1_RADII })),
    fit: {
      points,
      bulge: { mass: TRUTH.bulgeMass, scale: TRUTH.bulgeScale },
      sigmaRadii: [8, 20],
      lo: FIT_LO,
      hi: FIT_HI,
      truth: { ...S.SYNTHETIC_TRUTH },
    },
  };
}

function legB() {
  const oracle = maybe('oracle-results.json');
  if (!oracle) {
    for (const c of thr.checks.filter(
      c => c.id.startsWith('B') && wanted(c.id)
    ))
      notRun(
        c.id,
        'oracle-results.json is missing: run the oracle (see ROTATION_DECOMPOSITION.md, Reproduction)'
      );
    return;
  }
  if (wanted('B1')) {
    let closed = 0;
    let disk = 0;
    B1_SETS.forEach((s, k) => {
      B1_RADII.forEach((r, i) => {
        closed = Math.max(
          closed,
          rel(
            D.bulgeSpeed(r, s.bulgeMass, s.bulgeScale),
            oracle.B1[k].bulge[i]
          ),
          rel(D.nfwSpeed(r, s.nfwSpeed, s.nfwScale), oracle.B1[k].nfw[i]),
          rel(D.isothermalSpeed(r, s.isoSpeed, s.isoScale), oracle.B1[k].iso[i])
        );
        disk = Math.max(
          disk,
          rel(D.diskSpeed(r, s.diskMass, s.diskScale), oracle.B1[k].disk[i])
        );
      });
    });
    judge(
      'B1',
      closed <= lim('B1').closedFormRelative && disk <= lim('B1').diskRelative,
      {
        closedFormWorstRelative: closed,
        diskWorstRelative: disk,
        sets: 5,
        radiiPerSet: 20,
      }
    );
  }
  if (wanted('B2')) {
    let worst = 0;
    oracle.B2.y.forEach((y, i) => {
      worst = Math.max(worst, rel(D.diskShape(y), oracle.B2.g[i]));
    });
    judge('B2', worst <= lim('B2').relative, {
      worstRelative: worst,
      values: oracle.B2.y.length,
    });
  }
  if (['B3', 'B4', 'B5'].some(wanted)) {
    const inp = oracleInputs().fit;
    const kernel = D.decomposeCurve(inp.points, {
      disk: { massRange: [1.5e10, 7.5e10] },
      bulge: BULGE,
      radius: 8,
    });
    const kernel20 = D.decomposeCurve(inp.points, {
      disk: { massRange: [1.5e10, 7.5e10] },
      bulge: BULGE,
      radius: 20,
    });
    const of = oracle.fit;
    if (wanted('B3')) {
      const e = rel(kernel.chi2, of.chi2);
      judge('B3', e <= lim('B3').relative, {
        kernelChi2: kernel.chi2,
        oracleChi2: of.chi2,
        relative: e,
        kernelTheta: kernel.parameters.map(p => p.value),
        oracleTheta: of.theta,
      });
    }
    if (wanted('B4')) {
      let worst = 0;
      kernel.residuals.forEach((q, i) => {
        worst = Math.max(worst, Math.abs(q.model - of.curve[i]));
      });
      judge('B4', worst <= lim('B4').maxAbsoluteKms, { maxAbsoluteKms: worst });
    }
    if (wanted('B5')) {
      const s8 = kernel.derived.find(d => d.name === 'vTotal').sigma;
      const s20 = kernel20.derived.find(d => d.name === 'vTotal').sigma;
      const e8 = rel(s8, of.sigmaTotal['8']);
      const e20 = rel(s20, of.sigmaTotal['20']);
      judge('B5', Math.max(e8, e20) <= lim('B5').relative, {
        kernel: [s8, s20],
        oracle: [of.sigmaTotal['8'], of.sigmaTotal['20']],
        relative: [e8, e20],
      });
    }
  }
}

// --- the ensembles -------------------------------------------------------------------------------
const ENSEMBLES = {
  E1: {
    radii: S.geometricRadii(1.5, 40, 24),
    error: 4,
    n: thr.seeds.ensembles.E1,
  },
  E2: {
    radii: S.geometricRadii(1.5, 12, 12),
    error: 5,
    n: thr.seeds.ensembles.E2,
  },
  D1: {
    radii: S.geometricRadii(1.5, 6, 10),
    error: 4,
    n: thr.seeds.ensembles.D1,
  },
  D5: {
    radii: S.geometricRadii(1.5, 40, 24),
    error: 4,
    n: thr.seeds.ensembles.D5,
    bump: { amplitude: 15, at: 9, width: 1.2 },
  },
};

function runEnsemble(name, opts = {}) {
  const spec = ENSEMBLES[name];
  const out = [];
  for (let k = 0; k < spec.n; k++) {
    const { points } = S.syntheticCurve({
      radii: spec.radii,
      error: spec.error,
      seed: 'rotdec-236',
      labels: [name, k],
      bump: spec.bump ?? null,
    });
    out.push(D.decomposeCurve(points, { disk: DISK, bulge: BULGE, ...opts }));
  }
  return out;
}

const covers = (iv, truth) =>
  Boolean(iv && iv.status === 'ok' && truth >= iv.lo && truth <= iv.hi);
const profileCovers = (pi, truth) =>
  Boolean(
    pi &&
    pi.status === 'ok' &&
    (pi.lo === null || truth >= pi.lo) &&
    (pi.hi === null || truth <= pi.hi)
  );
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};
const par = (r, name) => r.parameters.find(p => p.name === name);

const manifests = {};
function legCD() {
  const need = id => wanted(id);
  if (['C1', 'C2', 'C3', 'C4', 'D2', 'D5'].some(need)) {
    const e1 = runEnsemble('E1', { profile: ['logDiskMass'], radius: 20 });
    const vHaloTruth = D.componentSpeeds(20, TRUTH).halo;
    const truths = {
      logDiskMass: LOG_TRUTH_MD,
      diskScale: TRUTH.diskScale,
      vHalo20: vHaloTruth,
    };
    const cover = lvl => {
      const key = lvl === 68 ? 'covarianceInterval' : 'covarianceInterval95';
      const dkey = lvl === 68 ? 'interval' : 'interval95';
      const hit = { logDiskMass: 0, diskScale: 0, vHalo20: 0 };
      for (const r of e1) {
        if (r.status !== 'ok' || !r.converged) continue;
        if (covers(par(r, 'logDiskMass')[key], truths.logDiskMass))
          hit.logDiskMass++;
        if (covers(par(r, 'diskScale')[key], truths.diskScale)) hit.diskScale++;
        if (
          covers(r.derived.find(d => d.name === 'vHalo')[dkey], truths.vHalo20)
        )
          hit.vHalo20++;
      }
      return Object.fromEntries(
        Object.entries(hit).map(([k, v]) => [k, v / e1.length])
      );
    };
    const c68 = cover(68);
    const c95 = cover(95);
    const profile68 =
      e1.filter(
        r =>
          r.status === 'ok' &&
          r.converged &&
          profileCovers(par(r, 'logDiskMass').profileInterval, LOG_TRUTH_MD)
      ).length / e1.length;
    const diffs = e1
      .filter(r => par(r, 'logDiskMass').sigma !== null)
      .map(r => par(r, 'logDiskMass').value - LOG_TRUTH_MD);
    const bias =
      Math.abs(diffs.reduce((s, v) => s + v, 0) / diffs.length) /
      median(e1.map(r => par(r, 'logDiskMass').sigma).filter(v => v !== null));
    const haloConstrained =
      e1.filter(r => r.halo.constrained === true).length / e1.length;
    const falseAlarm = e1.filter(r => !r.adequate).length / e1.length;
    const converged = e1.filter(r => r.converged).length;
    manifests.E1 = {
      n: e1.length,
      converged,
      truth: { ...truths, label: TRUTH.label, ...TRUTH },
      coverage68: c68,
      coverage95: c95,
      profile68,
      bias,
      haloConstrained,
      falseAlarm,
    };
    const inBand = (v, a, b) => v >= a && v <= b;
    if (wanted('C1'))
      judge(
        'C1',
        Object.values(c68).every(v => inBand(v, lim('C1').min, lim('C1').max)),
        { coverage: c68, converged }
      );
    if (wanted('C2'))
      judge(
        'C2',
        Object.values(c95).every(v => v >= lim('C2').min),
        { coverage: c95 }
      );
    if (wanted('C3'))
      judge('C3', inBand(profile68, lim('C3').min, lim('C3').max), {
        coverage: profile68,
      });
    if (wanted('C4')) judge('C4', bias <= lim('C4').max, { bias });
    if (wanted('D2'))
      judge('D2', haloConstrained >= lim('D2').min, { haloConstrained });
    if (wanted('D5')) judge('D5', falseAlarm <= lim('D5').max, { falseAlarm });
  }
  if (['C5', 'C6'].some(need)) {
    const e2 = runEnsemble('E2', { profile: ['logDiskMass'] });
    const prof =
      e2.filter(
        r =>
          r.status === 'ok' &&
          r.converged &&
          profileCovers(par(r, 'logDiskMass').profileInterval, LOG_TRUTH_MD)
      ).length / e2.length;
    const cov =
      e2.filter(
        r =>
          r.status === 'ok' &&
          r.converged &&
          covers(par(r, 'logDiskMass').covarianceInterval, LOG_TRUTH_MD)
      ).length / e2.length;
    const open =
      e2.filter(r => {
        const pi = par(r, 'logDiskMass').profileInterval;
        return !pi || pi.open[0] || pi.open[1];
      }).length / e2.length;
    const widths = e2
      .map(r => par(r, 'logDiskMass').profileInterval)
      .filter(pi => pi && !pi.open[0] && !pi.open[1])
      .map(pi => pi.hi - pi.lo);
    const corr = median(
      e2.map(r => r.diskHaloCorrelation).filter(v => v !== null)
    );
    manifests.E2 = {
      n: e2.length,
      profile68: prof,
      covariance68: cov,
      openFraction: open,
      medianClosedWidthDex: median(widths),
      medianDiskHaloCorrelation: corr,
      haloConstrained:
        e2.filter(r => r.halo.constrained === true).length / e2.length,
    };
    if (wanted('C5')) judge('C5', prof >= lim('C5').min, { coverage: prof });
    if (wanted('C6'))
      reported('C6', {
        covarianceCoverage: cov,
        profileOpenFraction: open,
        medianClosedProfileWidthDex: median(widths),
        medianDiskHaloCorrelation: corr,
      });
  }
  if (need('D1')) {
    const d1 = runEnsemble('D1');
    const notConstrained =
      d1.filter(r => r.halo.constrained === false).length / d1.length;
    const leaked = d1.some(
      r =>
        r.halo.constrained === false &&
        r.parameters.some(
          p =>
            (p.name === 'haloSpeed' || p.name === 'logHaloScale') &&
            !p.constrained &&
            (p.profileInterval || p.covarianceInterval)
        )
    );
    manifests.D1 = { n: d1.length, notConstrained, intervalsLeaked: leaked };
    judge('D1', notConstrained >= lim('D1').min && !leaked, {
      notConstrained,
      intervalsLeaked: leaked,
    });
  }
  if (need('D4')) {
    const d5 = runEnsemble('D5');
    const flagged = d5.filter(r => !r.adequate).length / d5.length;
    manifests.D5 = { n: d5.length, flagged };
    judge('D4', flagged >= lim('D4').min, { flagged });
  }
  if (need('D3')) {
    const good = S.syntheticCurve({
      radii: ENSEMBLES.E1.radii,
      error: 4,
      seed: 'rotdec-236',
      labels: ['D3'],
    }).points;
    const tries = {
      points: () =>
        D.decomposeCurve(good.slice(0, 5), { disk: DISK, bulge: BULGE }),
      error: () =>
        D.decomposeCurve(
          good.map((p, i) => (i === 3 ? { ...p, err: 0 } : p)),
          { disk: DISK, bulge: BULGE }
        ),
      radius: () =>
        D.decomposeCurve(
          good.map((p, i) => (i === 3 ? { ...p, r: -1 } : p)),
          { disk: DISK, bulge: BULGE }
        ),
      'disk-mass-range': () => D.decomposeCurve(good, { bulge: BULGE }),
      'halo-form': () =>
        D.decomposeCurve(good, { disk: DISK, bulge: BULGE, halo: 'burkert' }),
    };
    const got = Object.fromEntries(
      Object.entries(tries).map(([code, f]) => {
        const r = f();
        return [code, r.status === 'refused' ? r.code : r.status];
      })
    );
    judge(
      'D3',
      Object.entries(got).every(([code, g]) => g === code),
      got
    );
  }
}

// --- E: the Milky Way pack ---------------------------------------------------------------------------
const SETS = [
  [8.3, 244],
  [8, 200],
  [8.5, 220],
];
const CONTRACT = {
  C1: {
    rMin: 3,
    rMax: 25,
    label: 'region 1 (r below 25 kpc), r at least 3 kpc',
  },
  C2: { rMin: 3, rMax: Infinity, label: 'every point with r at least 3 kpc' },
};
const PACK_BULGE = { mass: 1e10, scale: 0.7 };
const PACK_DISK = { massRange: [1e9, 2e11] };

function packPoints(set, c) {
  const t = tableOf(galacticPack('rotation'));
  const col = id => t.columns.find(x => x.id === id).values;
  const out = [];
  for (let i = 0; i < t.n; i++)
    if (
      col('r0')[i] === set[0] &&
      col('v0')[i] === set[1] &&
      col('r')[i] >= c.rMin &&
      col('r')[i] < c.rMax
    )
      out.push({ r: col('r')[i], v: col('vc')[i], err: col('vc_err')[i] });
  return out;
}

function fitPack(set, cname) {
  const pts = packPoints(set, CONTRACT[cname]);
  const fit = D.decomposeCurve(pts, {
    disk: PACK_DISK,
    bulge: PACK_BULGE,
    profile: ['logDiskMass', 'diskScale'],
    radius: set[0],
  });
  const ends = D.diskHaloProfile(pts, {
    disk: PACK_DISK,
    bulge: PACK_BULGE,
    diskMassGrid: 2,
  });
  return { set, contract: cname, points: pts.length, fit, ends };
}

const summary = ({ set, contract, points, fit, ends }) => ({
  set: { R0: set[0], V0: set[1] },
  contract,
  points,
  converged: fit.converged,
  chi2: fit.chi2,
  dof: fit.dof,
  reduced: fit.reduced,
  adequate: fit.adequate,
  halo: fit.halo.status,
  diskHaloCorrelation: fit.diskHaloCorrelation,
  parameters: fit.parameters.map(p => ({
    name: p.name,
    value: p.value,
    onBound: p.onBound,
    sigma: p.sigma,
    profileInterval:
      p.profileInterval && p.profileInterval.status === 'ok'
        ? {
            lo: p.profileInterval.lo,
            hi: p.profileInterval.hi,
            open: p.profileInterval.open,
          }
        : null,
    constrained: p.constrained,
  })),
  derived: fit.derived.map(d => ({
    name: d.name,
    value: d.value,
    sigma: d.sigma,
  })),
  minimumDisk: {
    diskMass: ends.minimumDisk.diskMass,
    chi2: ends.minimumDisk.chi2,
    haloSpeed: ends.minimumDisk.haloSpeed,
    haloScale: ends.minimumDisk.haloScale,
  },
  maximumDisk: {
    diskMass: ends.maximumDisk.diskMass,
    chi2: ends.maximumDisk.chi2,
    haloSpeed: ends.maximumDisk.haloSpeed,
    haloScale: ends.maximumDisk.haloScale,
  },
});

function legE() {
  const results = [];
  if (wanted('E1') || wanted('E2'))
    for (const set of SETS)
      for (const c of Object.keys(CONTRACT)) results.push(fitPack(set, c));
  if (wanted('E1')) {
    manifests.pack = results.map(summary);
    reported(
      'E1',
      manifests.pack.map(s => ({
        set: `${s.set.R0}/${s.set.V0}`,
        contract: s.contract,
        points: s.points,
        reduced: s.reduced,
        adequate: s.adequate,
        halo: s.halo,
      }))
    );
  }
  if (wanted('E2')) {
    const published = maybe('published-ranges.json');
    if (!published) {
      notRun(
        'E2',
        'the published ranges were not supplied (tests/fixtures/rotation-decomposition/published-ranges.json); only Carl can fetch them (thresholds.json, supply.E2)'
      );
      return;
    }
    const verdicts = [];
    for (const q of published.quantities) {
      const r0 = q.r0;
      const set = SETS.reduce((b, s) =>
        Math.abs(s[0] - r0) < Math.abs(b[0] - r0) ? s : b
      );
      const fit = results.find(x => x.set === set && x.contract === 'C2').fit;
      let value = null;
      let sigma = null;
      if (q.id === 'diskMass') {
        const p = fit.parameters.find(x => x.name === 'logDiskMass');
        value = 10 ** p.value;
        sigma = p.sigma === null ? null : value * Math.LN10 * p.sigma;
      } else if (q.id === 'diskScale') {
        const p = fit.parameters.find(x => x.name === 'diskScale');
        value = p.value;
        sigma = p.sigma;
      } else {
        const d = fit.derived.find(x => x.name === q.id);
        if (d) {
          value = d.value;
          sigma = d.sigma;
        }
      }
      const ok =
        value !== null &&
        sigma !== null &&
        value >= q.range[0] - sigma &&
        value <= q.range[1] + sigma;
      verdicts.push({
        id: q.id,
        set: set.join('/'),
        value,
        sigma,
        range: q.range,
        ok,
      });
    }
    judge('E2', verdicts.length > 0 && verdicts.every(v => v.ok), {
      quantities: verdicts,
    });
  }
}

// --- run ------------------------------------------------------------------------------------------------
if (flag('--write-oracle-inputs')) {
  writeFileSync(
    path.join(FIX, 'oracle-inputs.json'),
    `${JSON.stringify(oracleInputs())}\n`
  );
  console.log('wrote oracle-inputs.json');
  process.exit(0);
}
legA();
legB();
legCD();
legE();

const FAIL_NOTES = {
  A3: 'the committed reference writes m(x) as ln(1 + x) - x / (1 + x); evaluated as written it loses digits at small x (its two terms agree to x^2 / 2; the smallest x of the cases is 8e-4), and the mass round trip crosses 1e-12 by 14 percent; the kernel uses log1p, and against the same function evaluated with log1p the worst relative is 4e-16 (amendment AM1, measured beside the committed form). The committed form binds; judging on the log1p form is a question for Carl',
  A5: 'the committed bound 1e-3 was miscalibrated: the inner limit v^2 / (v_s^2 x / 2) = 1 - 4x/3 + 3x^2/2 - ..., so its first correction is 1.33e-3 at x = 1e-3, above the bound; the kernel agrees with the three-term series to 2e-9. Left failing; the alternative (a bound of 2e-3, or x = 1e-4) is a question for Carl, not a change made here',
  C3: 'the profile interval of log10 disk mass covered 117 of 200 realizations, 3 short of the lower edge of the band (binomial sigma 0.035 at 0.68); the covariance interval covered 0.605. Left failing',
  D4: 'the adequacy test (chi-square survival probability below 0.001) flagged 8 percent of the curves that carry a 15 km/s bump of 1.2 kpc width: with four free parameters the fit absorbs part of a localized feature and 24 points dilute the rest, so the test has little power against it. The bound is left as committed; a residual diagnostic with power against a localized feature (the runs test of the statistics kernel on the normalised residuals) is a question for Carl, not a change made here',
};
const complete = only.length === 0;
const gateGroups = ['analytic', 'oracle', 'coverage', 'refusal'];
const consumers = complete
  ? {
      rule: 'panel, lesson depth and model-page section only if every row of the groups analytic, oracle, coverage and refusal passes',
      allPass: rows
        .filter(r => gateGroups.includes(r.group))
        .every(r => r.status === 'pass'),
      blocking: rows
        .filter(r => gateGroups.includes(r.group) && r.status !== 'pass')
        .map(r => r.id),
    }
  : null;
const out = {
  format: 'gravitas.rotation-decomposition-results/1',
  node: process.version,
  consumers,
  rows,
};

if (flag('--write-results')) {
  if (!complete) {
    console.error('--write-results needs every row: do not pass --only');
    process.exit(2);
  }
  writeFileSync(
    path.join(FIX, 'results.json'),
    `${JSON.stringify(out, null, 2)}\n`
  );
  writeFileSync(
    path.join(FIX, 'ensembles.json'),
    `${JSON.stringify({ note: 'Truth manifests and summaries of the seeded ensembles and the pack decompositions of results.json. Synthetic data is labelled; the truth is the parameter set that made each curve.', ensembles: manifests }, null, 2)}\n`
  );
  const failed = rows
    .filter(r => r.status === 'fail' || r.status === 'not-run')
    .map(r => ({
      id: r.id,
      status: r.status,
      measured: r.measured,
      note:
        r.note ||
        FAIL_NOTES[r.id] ||
        'crossed the bound committed in thresholds.json; left failing',
    }));
  writeFileSync(
    path.join(FIX, 'failed-legs.json'),
    `${JSON.stringify({ note: 'Legs of tests/fixtures/rotation-decomposition/thresholds.json that crossed their bound or were not run, kept as measured. Only Carl resets a bound.', failed }, null, 2)}\n`
  );
}
if (flag('--json')) console.log(JSON.stringify(out, null, 2));
else {
  for (const r of rows)
    console.log(
      `${r.id.padEnd(4)} ${r.status.toUpperCase().padEnd(9)} ${r.note || JSON.stringify(r.measured).slice(0, 170)}`
    );
  if (consumers)
    console.log(
      `consumers: allPass=${consumers.allPass} blocking=[${consumers.blocking}]`
    );
}
process.exit(rows.some(r => r.status === 'fail') ? 1 : 0);
