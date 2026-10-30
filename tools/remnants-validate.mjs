#!/usr/bin/env node
// =============================================================================
// The remnants kernel against its committed thresholds (Prompt 222)
// -----------------------------------------------------------------------------
//   npm run remnants:validate                    print the table
//   npm run remnants:validate -- --json          print it as JSON
//   npm run remnants:validate -- --write-results rewrite results.json and failed-legs.json
//   npm run remnants:validate -- --only A1,C1    run the rows whose id starts with one of these
//
// tests/fixtures/remnants/thresholds.json fixed every bound before js/kernels/remnants/
// existed; this runs the checks against the kernel and judges them against the bounds read
// from that file. The oracle rows read the results pinned in oracle-results.json
// (tools/remnants-oracle/oracle.py: numpy and scipy, its own table parser, no Gravitas
// code). A crossed bound is a failed row, left failing in failed-legs.json.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/remnants/index.js';
import { TAU_YR, MODEL_DELTA_LN } from '../js/kernels/remnants/calibration.js';
import {
  whiteDwarf,
  centralXForMass,
  chandrasekharMassSun,
} from '../js/kernels/stellar/whiteDwarf.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';
import {
  L_SUN_W,
  SIGMA_SB,
  SOLAR_RADIUS_M,
} from '../js/kernels/remnants/constants.js';
import { gaussian, stream } from '../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/remnants';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${FIX}/thresholds.json`);
const PIN = read(`${FIX}/cooling-pin.json`);
const ORA = read(`${FIX}/oracle-results.json`);
const CLUSTER = existsSync(path.join(ROOT, FIX, 'cluster-white-dwarfs.json'))
  ? read(`${FIX}/cluster-white-dwarfs.json`)
  : null;
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEED = THRESHOLDS.seeds.ensemble;
const DOMAIN = K.COOLING_DOMAIN;

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const report = (id, measured, note = '') =>
  rows.push({ id, status: 'report', measured, note });
const notRun = (id, why) =>
  rows.push({ id, status: 'not-run', measured: null, note: why });

const draw = (tag, i) => stream('injection', SEED, tag, i);
const normal = (tag, i) => gaussian(stream('noise', SEED, tag, i));
const uni = (r, a, b) => a + (b - a) * r();
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const mass = m => m.toFixed(1);
const PIN_ROWS = m => PIN.masses[mass(m)].rows;
const inDomain = rowsOf =>
  rowsOf.filter(r => r[1] >= DOMAIN.logLSun[0] && r[1] <= DOMAIN.logLSun[1]);

/** Residual statistics pooled over masses: each mass weighted equally, rows by trapezoid width (AM1). */
function pooled(masses, valueOf) {
  const vals = [];
  const wts = [];
  const per = {};
  for (const m of masses) {
    const r = inDomain(PIN_ROWS(m));
    const w = K.trapezoidWeights(r.map(x => x[1]));
    const wsum = w.reduce((a, b) => a + b, 0);
    const v = r.map(x => valueOf(m, x));
    per[mass(m)] = {
      median: K.weightedQuantile(v, w, 0.5),
      max: Math.max(...v),
    };
    v.forEach((x, i) => {
      vals.push(x);
      wts.push(w[i] / wsum / masses.length);
    });
  }
  return {
    median: K.weightedQuantile(vals, wts, 0.5),
    p90: K.weightedQuantile(vals, wts, 0.9),
    max: Math.max(...vals),
    perMass: per,
  };
}

// ---- (a) analytic -----------------------------------------------------------------

function legA() {
  const law = K.coolingAgeLaw;
  // A1: the exponents
  {
    let worst = 0;
    let monotone = true;
    for (let i = 0; i < 200; i++) {
      const r = draw('A1', i);
      const m = uni(r, 0.5, 1);
      const L = 10 ** uni(r, -4, -1.5);
      const A = uni(r, 10, 20);
      worst = Math.max(
        worst,
        rel(law(2 * m, L, A) / law(m, L, A), 2 ** (5 / 7)),
        rel(law(m, 2 * L, A) / law(m, L, A), 2 ** (-5 / 7)),
        rel(law(m, L, 2 * A) / law(m, L, A), 0.5)
      );
    }
    let prev = Infinity;
    for (let i = 0; i < 200; i++) {
      const t = law(0.6, 10 ** (-4 + (2.5 * i) / 199));
      if (!(t < prev)) monotone = false;
      prev = t;
    }
    row('A1.scaling', worst <= lim('A1.scaling').maxRelativeError && monotone, {
      maxRelativeError: worst,
      monotone,
    });
  }
  // A2: the inverse
  {
    let worst = 0;
    for (let i = 0; i < 200; i++) {
      const r = draw('A2', i);
      const m = uni(r, 0.5, 1);
      const L = 10 ** uni(r, -4, -1.5);
      const L1 = L * 0.5;
      const t = law(m, L);
      worst = Math.max(
        worst,
        rel(K.luminosityAtAge(m, t), L),
        rel(law(m, K.luminosityAtAge(m, t * 1.7)), t * 1.7),
        rel(K.coolingTimeBetween(m, L, L1), law(m, L1) - law(m, L))
      );
    }
    row('A2.inverse', worst <= lim('A2.inverse').maxRelativeError, {
      maxRelativeError: worst,
    });
  }
  // A3: Runge-Kutta in ln L
  {
    let worst = 0;
    for (let i = 0; i < 10; i++) {
      const r = draw('A3', i);
      const m = uni(r, 0.5, 1);
      const l0 = uni(r, -2.5, -1.5) * Math.LN10;
      const l1 = uni(r, -4, -3) * Math.LN10;
      const N = 4000;
      const h = (l1 - l0) / N;
      const f = x => -(5 / 7) * law(m, Math.exp(x));
      let sum = 0;
      for (let k = 0; k < N; k++) {
        const x = l0 + k * h;
        const k1 = f(x);
        const k2 = f(x + h / 2);
        const k4 = f(x + h);
        sum += (h / 6) * (k1 + 4 * k2 + k4);
      }
      worst = Math.max(
        worst,
        rel(sum, K.coolingTimeBetween(m, Math.exp(l0), Math.exp(l1)))
      );
    }
    row('A3.ode', worst <= lim('A3.ode').maxRelativeError, {
      maxRelativeError: worst,
    });
  }
  // A4: Stefan-Boltzmann
  {
    let worst = rel(K.luminosityFromRadiusTeff(1, K.TEFF_SUN_K), 1);
    for (let i = 0; i < 200; i++) {
      const r = draw('A4', i);
      const R = uni(r, 0.008, 0.02);
      const T = uni(r, 4000, 40000);
      const L = K.luminosityFromRadiusTeff(R, T);
      const si =
        (4 * Math.PI * (R * SOLAR_RADIUS_M) ** 2 * SIGMA_SB * T ** 4) / L_SUN_W;
      worst = Math.max(
        worst,
        rel(L, si),
        rel(K.teffFromLuminosityRadius(L, R), T)
      );
    }
    row('A4.stefan', worst <= lim('A4.stefan').maxRelativeError, {
      maxRelativeError: worst,
    });
  }
  // A5: the radius is the cold relation
  {
    let worst = 0;
    const rs = [0.5, 0.6, 0.8, 1.0].map(m => {
      const ref = whiteDwarf(centralXForMass(m)).radiusSun;
      worst = Math.max(worst, rel(K.radiusSunOf(m), ref));
      return K.radiusSunOf(m);
    });
    const falls = rs.every((v, i) => i === 0 || v < rs[i - 1]);
    row('A5.radius', worst <= lim('A5.radius').maxRelativeError && falls, {
      maxRelativeError: worst,
      radii: rs,
    });
  }
  // A6: the joins
  {
    const at = (rel_, mi, k) => {
      const ps = K.IFMR.relations[rel_].pieces;
      return Math.abs(
        ps[k].slope * mi +
          ps[k].intercept -
          (ps[k + 1].slope * mi + ps[k + 1].intercept)
      );
    };
    const joins = {
      'mist@2.85': at('mist', 2.85, 0),
      'mist@3.60': at('mist', 3.6, 1),
      'parsec@2.80': at('parsec', 2.8, 0),
      'parsec@3.65': at('parsec', 3.65, 1),
    };
    const worst = Math.max(...Object.values(joins));
    row('A6.ifmrContinuity', worst <= lim('A6.ifmrContinuity').maxAbsError, {
      maxAbsError: worst,
      joins,
    });
  }
  // A7: what the paper prints
  {
    const lo = K.finalMass(0.83);
    const hi = K.finalMass(7.5);
    const err = Math.max(
      Math.abs(lo.lossFraction - 0.33),
      Math.abs(hi.lossFraction - 0.83)
    );
    let ok = true;
    let prev = -Infinity;
    for (let i = 0; i <= 400; i++) {
      const mi = 0.83 + ((7.2 - 0.83) * i) / 400;
      const r = K.finalMass(mi);
      if (!(r.finalMass > prev) || !(r.finalMass < mi)) ok = false;
      prev = r.finalMass;
    }
    row(
      'A7.ifmrPublished',
      err <= lim('A7.ifmrPublished').lossFractionAbsError && ok,
      {
        lossFractionAbsError: err,
        loss083: lo.lossFraction,
        loss75: hi.lossFraction,
        monotoneBelowInitial: ok,
      }
    );
  }
  // A8: the outcome probabilities
  {
    let worst = 0;
    let ok = true;
    let prevWd = 1;
    let prevBh = 0;
    for (let i = 0; i < 500; i++) {
      const m = 0.8 + ((120 - 0.8) * i) / 499;
      const o = K.remnantOutcome(m).probabilities;
      const sum = o.whiteDwarf + o.neutronStar + o.blackHole;
      worst = Math.max(worst, Math.abs(sum - 1));
      for (const v of Object.values(o)) if (v < 0 || v > 1) ok = false;
      if (o.whiteDwarf > prevWd + 1e-15 || o.blackHole < prevBh - 1e-15)
        ok = false;
      prevWd = o.whiteDwarf;
      prevBh = o.blackHole;
    }
    const edge = [
      K.remnantOutcome(7).probabilities.whiteDwarf - 1,
      K.remnantOutcome(9.5).probabilities.whiteDwarf,
      K.remnantOutcome(20).probabilities.blackHole,
      K.remnantOutcome(40).probabilities.blackHole - 1,
    ].map(Math.abs);
    worst = Math.max(worst, ...edge);
    row('A8.outcomeSum', worst <= lim('A8.outcomeSum').maxAbsError && ok, {
      maxAbsError: worst,
      orderAndRange: ok,
    });
  }
  // A9: the neutron-star table
  {
    const ns = K.neutronStarMasses();
    const mch = chandrasekharMassSun();
    const p = K.NEUTRON_STARS.populations;
    const as = [
      ns.masses.length === 14,
      ns.masses.every(m => m < mch && m > 1.1),
      Math.abs(ns.mean - 1.33) <= lim('A9.neutronStars').meanAbsError,
      p.doubleNeutronStars.mean === 1.33 && p.doubleNeutronStars.sigma === 0.09,
      p.recycled.mean === 1.54 && p.recycled.sigma === 0.23,
      p.slowPulsars.mean === 1.49 && p.slowPulsars.sigma === 0.19,
    ];
    row(
      'A9b.neutronStarRange',
      ns.masses.every(m => m > 1.1 && m < 2.1),
      {
        min: ns.min,
        max: ns.max,
      }
    );
    row('A9.neutronStars', as.every(Boolean), {
      n: ns.masses.length,
      mean: ns.mean,
      min: ns.min,
      max: ns.max,
      checks: as,
    });
  }
}

// ---- (b) the table and the oracle ---------------------------------------------------------

function legB() {
  const law = K.coolingAgeLaw;
  // B1: the law against the table (held-out masses), the calibration mass beside it
  const resid = (m, r) => Math.abs(Math.log(law(m, 10 ** r[1]) / r[3]));
  const b1 = pooled([0.5, 0.7, 0.8, 0.9, 1.0], resid);
  const cal = pooled([0.6], resid);
  {
    const l = lim('B1.tableLaw');
    row(
      'B1.tableLaw',
      b1.median <= l.median && b1.p90 <= l.p90 && b1.max <= l.max,
      {
        median: b1.median,
        p90: b1.p90,
        max: b1.max,
        perMass: b1.perMass,
        calibrationMass: { median: cal.median, p90: cal.p90, max: cal.max },
      }
    );
  }
  // B2: the Teff entry's luminosity
  {
    const b2 = pooled([0.5, 0.6, 0.7, 0.8, 0.9, 1.0], (m, r) =>
      Math.abs(
        Math.log(
          K.luminosityFromRadiusTeff(K.radiusSunOf(m), r[0]) / 10 ** r[1]
        )
      )
    );
    const l = lim('B2.teffEntry');
    row('B2.teffEntry', b2.median <= l.median && b2.max <= l.max, {
      median: b2.median,
      max: b2.max,
      perMass: b2.perMass,
    });
  }
  // B3: the oracle's coefficients and ages
  {
    const by = Object.fromEntries(
      Object.entries(PIN.masses).map(([m, v]) => [m, v.rows])
    );
    const c = K.calibrate(by);
    let ageWorst = 0;
    for (const [m, ages] of Object.entries(ORA.ages)) {
      const r = inDomain(PIN_ROWS(Number(m)));
      r.forEach((x, i) => {
        ageWorst = Math.max(
          ageWorst,
          rel(law(Number(m), 10 ** x[1], K.A_REF, ORA.tauPin), ages[i])
        );
      });
    }
    const l = lim('B3.oracleCooling');
    const tauRel = Math.max(rel(c.tau, ORA.tauPin), rel(TAU_YR, ORA.tauPin));
    const deltaRel = Math.max(
      rel(c.delta, ORA.deltaPin),
      rel(MODEL_DELTA_LN, ORA.deltaPin)
    );
    row(
      'B3.oracleCooling',
      tauRel <= l.tauRelative &&
        deltaRel <= l.deltaRelative &&
        ageWorst <= l.ageRelative,
      {
        tau: TAU_YR,
        tauRelative: tauRel,
        delta: MODEL_DELTA_LN,
        deltaRelative: deltaRel,
        ageRelative: ageWorst,
        pinResolution: ORA.rawResolution
          ? {
              tauRawOverPin: ORA.rawResolution.tauRelativeToPin,
              deltaRawOverPin: ORA.rawResolution.deltaRelativeToPin,
            }
          : null,
      }
    );
  }
  // B4: the relations and probabilities
  {
    let worst = 0;
    for (const id of ['mist', 'parsec'])
      ORA.ifmr[id].mi.forEach((mi, i) => {
        const r = K.finalMass(mi, { relation: id });
        worst = Math.max(worst, Math.abs(r.finalMass - ORA.ifmr[id].mf[i]));
      });
    ORA.outcomes.m.forEach((m, i) => {
      const o = K.remnantOutcome(m).probabilities;
      worst = Math.max(
        worst,
        Math.abs(o.whiteDwarf - ORA.outcomes.whiteDwarf[i]),
        Math.abs(o.blackHole - ORA.outcomes.blackHole[i]),
        Math.abs(o.neutronStar - ORA.outcomes.neutronStar[i])
      );
    });
    row('B4.oracleRelations', worst <= lim('B4.oracleRelations').maxAbsError, {
      maxAbsError: worst,
    });
  }
  // B5: report at 1.2
  {
    const b5 = pooled([1.2], resid);
    report(
      'B5.outsideDomain',
      { median: b5.median, max: b5.max },
      'the law at 1.2 solar masses, where the kernel refuses'
    );
  }
}

// ---- (c) coverage -------------------------------------------------------------------------

function interpolatedAge(m, logL) {
  // ln age linear in log L between the pin's rows (ordered from high to low L)
  const r = inDomain(PIN_ROWS(m));
  for (let i = 0; i < r.length - 1; i++)
    if (logL <= r[i][1] && logL >= r[i + 1][1]) {
      const f = (r[i][1] - logL) / (r[i][1] - r[i + 1][1]);
      return Math.exp(Math.log(r[i][3]) * (1 - f) + Math.log(r[i + 1][3]) * f);
    }
  return null;
}

function legC1() {
  const l = lim('C1.coolingCoverage');
  const per = {};
  let hit = 0;
  let hitObs = 0;
  let n = 0;
  let refused = 0;
  for (const m of THRESHOLDS.contract.data.masses.heldOut) {
    let h = 0;
    let c = 0;
    for (let i = 0; i < 400; i++) {
      const r = draw(`C1.${m}`, i);
      const g = normal(`C1.${m}`, i);
      const logL = uni(r, DOMAIN.logLSun[0], DOMAIN.logLSun[1]);
      const truth = interpolatedAge(m, logL);
      if (truth === null) continue;
      const res = K.coolingAge({
        massSun: m + 0.03 * g(),
        logLSun: logL + 0.04 * g(),
        sigmaMass: 0.03,
        sigmaLogL: 0.04,
      });
      if (res.status !== 'ok') {
        refused++;
        continue;
      }
      c++;
      if (truth >= res.interval95.lo && truth <= res.interval95.hi) h++;
      if (truth >= res.observational95.lo && truth <= res.observational95.hi)
        hitObs++;
    }
    per[mass(m)] = { answered: c, coverage: h / c };
    hit += h;
    n += c;
  }
  const cov = hit / n;
  row('C1.coolingCoverage', cov >= l.coverageMin && cov <= l.coverageMax, {
    coverage: cov,
    observationalTermAloneCoverage: hitObs / n,
    answered: n,
    refusedBecauseObservedOutside: refused,
    perMass: per,
  });
}

function legC2() {
  const l = lim('C2.ifmrCoverage');
  const gA = normal('C2', 0);
  const r = draw('C2', 0);
  let hit = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const mi = uni(r, 1, 7);
    const p =
      K.IFMR.relations.mist.pieces.find(q => mi < q.hi) ??
      K.IFMR.relations.mist.pieces[2];
    const truth =
      (p.slope + p.sSlope * gA()) * mi +
      (p.intercept + p.sIntercept * gA()) +
      K.IFMR.scatter * gA();
    const res = K.finalMass(mi);
    if (truth >= res.interval95.lo && truth <= res.interval95.hi) hit++;
  }
  const cov = hit / N;
  row('C2.ifmrCoverage', cov >= l.coverageMin && cov <= l.coverageMax, {
    coverage: cov,
    n: N,
  });
}

function legC3() {
  const l = lim('C3.outcomeFrequencies');
  const th = K.THRESHOLDS;
  let worst = 0;
  const table = [];
  for (const m of [6, 7.5, 8.25, 9, 10, 15, 22, 30, 38, 50]) {
    const r = draw('C3', m);
    const c = { whiteDwarf: 0, neutronStar: 0, blackHole: 0 };
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const t1 = uni(
        r,
        th.whiteDwarfToNeutronStar.lo,
        th.whiteDwarfToNeutronStar.hi
      );
      const t2 = uni(
        r,
        th.neutronStarToBlackHole.lo,
        th.neutronStarToBlackHole.hi
      );
      c[m < t1 ? 'whiteDwarf' : m > t2 ? 'blackHole' : 'neutronStar']++;
    }
    const p = K.remnantOutcome(m).probabilities;
    const d = Math.max(...Object.keys(c).map(k => Math.abs(c[k] / N - p[k])));
    worst = Math.max(worst, d);
    table.push({ m, maxDifference: d });
  }
  row('C3.outcomeFrequencies', worst <= l.maxAbsError, {
    maxAbsError: worst,
    table,
  });
}

// ---- (d) refusals ----------------------------------------------------------------------------

function legD() {
  // D1
  {
    const mch = chandrasekharMassSun();
    const cases = [
      { massSun: 0.6, logLSun: -4.2 },
      { massSun: 0.6, logLSun: -1.2 },
      { massSun: 0.45, logLSun: -3 },
      { massSun: 1.1, logLSun: -3 },
      { massSun: mch, logLSun: -3 },
      { massSun: 0.6, teffK: 3000 },
      { massSun: 0.6, teffK: 60000 },
      { massSun: -1, logLSun: -3 },
      { massSun: 0, logLSun: -3 },
      { massSun: NaN, logLSun: -3 },
      { massSun: Infinity, logLSun: -3 },
      { massSun: 0.6, logLSun: NaN },
      { massSun: 0.6, lumSun: -1 },
      { massSun: 0.6, teffK: -5000 },
      { massSun: 0.6 },
      { massSun: 0.6, logLSun: -3, teffK: 9000 },
    ];
    const got = cases.map(c => K.coolingAge(c));
    const ok = got.filter(
      r => r.status === 'refused' && r.reason && !('ageYr' in r)
    ).length;
    const ifmr = [
      K.finalMass(0.5),
      K.finalMass(9),
      K.finalMass(-1),
      K.remnantOutcome(0.5),
      K.remnantOutcome(130),
      K.remnantOutcome(NaN),
    ];
    const ok2 = ifmr.filter(r => r.status === 'refused' && r.reason).length;
    const f = (ok + ok2) / (cases.length + ifmr.length);
    row('D1.refusals', f >= lim('D1.refusals').fraction, {
      fraction: f,
      reasons: got.map(r => r.reason),
    });
  }
  // D2
  {
    const o825 = K.remnantOutcome(8.25);
    const o30 = K.remnantOutcome(30);
    const checks = [
      o825.probabilities.whiteDwarf >= 0.3 &&
        o825.probabilities.whiteDwarf <= 0.7 &&
        !o825.decisive,
      o30.probabilities.blackHole >= 0.3 &&
        o30.probabilities.blackHole <= 0.7 &&
        !o30.decisive,
      K.remnantOutcome(5).decisive,
      K.remnantOutcome(60).decisive,
      [1, 3, 8.25, 15, 30, 60].every(m => {
        const r = K.remnantOutcome(m);
        return r.mostLikely && r.probabilities && r.verdict;
      }),
    ];
    row('D2.nearThreshold', checks.every(Boolean), {
      fraction: checks.filter(Boolean).length / checks.length,
      at825: o825.probabilities,
      at30: o30.probabilities,
    });
  }
  // D3
  {
    let ok = 0;
    let worst = 0;
    let valid = true;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const r = draw('D3', i);
      const res = K.coolingAge({
        massSun: uni(r, 0.5, 1),
        logLSun: uni(r, -4, -1.5),
        sigmaMass: uni(r, 0, 0.05),
        sigmaLogL: uni(r, 0, 0.1),
      });
      const total = Math.hypot(res.sigmaObsLn, res.sigmaModelLn);
      worst = Math.max(worst, rel(res.sigmaTotalLn, total));
      if (res.status === 'ok' && res.sigmaModelLn > 0) ok++;
      const q = K.coolingQuantity(res);
      const doc = artifact({
        id: `remnants-d3-${i}`,
        source: { kind: 'analysis', id: 'remnants-cooling' },
        quantities: [q],
      });
      if (validateArtifact(doc).length) valid = false;
    }
    const l = lim('D3.modelTermAlwaysThere');
    row(
      'D3.modelTermAlwaysThere',
      ok / N >= l.fraction && worst <= l.maxRelativeError && valid,
      {
        fraction: ok / N,
        maxRelativeError: worst,
        recordsValidate: valid,
      }
    );
  }
  // D4
  {
    const checks = [
      K.finalMass(0.82).status === 'refused',
      K.finalMass(7.6).status === 'refused',
      K.finalMass(7.3).status === 'ok' &&
        K.finalMass(7.3).extrapolated === true,
      K.finalMass(7.2).extrapolated === false,
      K.remnantOutcome(0.79).status === 'refused',
      K.remnantOutcome(120.5).status === 'refused',
      K.remnantOutcome(0.8).status === 'ok',
      K.remnantOutcome(120).status === 'ok',
    ];
    row('D4.ifmrRefusals', checks.every(Boolean), { checks });
  }
}

// ---- (e) authentic -------------------------------------------------------------------------

function legE() {
  if (!CLUSTER)
    return notRun(
      'E1.clusterWhiteDwarfs',
      'the cluster white dwarfs are not pinned'
    );
  const l = lim('E1.clusterWhiteDwarfs');
  const use = CLUSTER.rows.filter(r => !r.outlier);
  let ss = 0;
  let inside = 0;
  for (const r of use) {
    const p = K.finalMass(r.initialMassMist);
    ss += (r.finalMass - p.finalMass) ** 2;
    if (
      Math.abs(r.finalMass - p.finalMass) <=
      1.959963984540054 * p.sigmaPrediction
    )
      inside++;
  }
  const rms = Math.sqrt(ss / use.length);
  const frac = inside / use.length;
  row(
    'E1.clusterWhiteDwarfs',
    rms >= l.rmsMin && rms <= l.rmsMax && frac >= l.insideMin,
    {
      n: use.length,
      rms,
      insideFraction: frac,
      oracle: ORA.clusterWhiteDwarfs,
    },
    'the relation was fitted to these white dwarfs: an applicability check, not an independent validation'
  );
}

// ---- run ----------------------------------------------------------------------------------

const argv = process.argv.slice(2);
const only = argv.includes('--only')
  ? argv[argv.indexOf('--only') + 1].split(',')
  : null;
const want = id => !only || only.some(o => id.startsWith(o));
const legs = [
  ['A', legA],
  ['B', legB],
  ['C1', legC1],
  ['C2', legC2],
  ['C3', legC3],
  ['D', legD],
  ['E', legE],
];
for (const [name, fn] of legs) {
  if (only && !only.some(o => name.startsWith(o) || o.startsWith(name)))
    continue;
  fn();
}
const shown = rows.filter(r => want(r.id));
if (argv.includes('--json')) console.log(JSON.stringify(shown, null, 2));
else
  for (const r of shown)
    console.log(
      `${r.status.padEnd(8)} ${r.id.padEnd(26)} ${JSON.stringify(r.measured).slice(0, 220)}${r.note ? ' ' + r.note : ''}`
    );
const REASONS = {
  'A6.ifmrContinuity':
    "The PARSEC relation's pieces, as printed to three figures, meet at 2.80 solar masses with a gap of 0.00364 (0.7204 against 0.7168); the kernel states the published coefficients and does not smooth them (AM2). The MIST joins close.",
  'A9.neutronStars':
    "Premised that every neutron-star component mass is below the white-dwarf model's Chandrasekhar mass; the limit is a white dwarf's, and the pulsar of J0453+1559 (1.559) is above it (AM2). A9b holds the meaningful half; the mean and the printed populations pass.",
};
if (argv.includes('--write-results')) {
  writeFileSync(
    path.join(ROOT, FIX, 'failed-legs.json'),
    `${JSON.stringify(
      {
        note: 'Legs of tests/fixtures/remnants/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).',
        failed: shown
          .filter(r => r.status === 'fail')
          .map(r => ({ ...r, reason: REASONS[r.id] ?? null })),
        notRun: shown.filter(r => r.status === 'not-run'),
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    path.join(ROOT, FIX, 'results.json'),
    `${JSON.stringify({ format: 'gravitas.remnants-results/1', rows: shown }, null, 2)}\n`
  );
}
process.exitCode = shown.some(r => r.status === 'fail') ? 1 : 0;
