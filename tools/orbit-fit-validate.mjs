#!/usr/bin/env node
// =============================================================================
// Orbit fitting and moving-object tracks against their committed thresholds (Prompt 187)
// -----------------------------------------------------------------------------
//   npm run orbit-fit:validate               print the table
//   npm run orbit-fit:validate -- --json     print it as JSON
//
// tests/fixtures/orbit-fit/thresholds.json (Part B) and gate-thresholds.json
// (Part A) fixed every bound before js/measure/orbit-fit.js's production rules,
// js/measure/mover-track.js, the oracle and this tool existed (ASTROMETRY.md,
// "The validation contract for orbit fitting"). This runs the checks against the
// production modules and judges them against those bounds, read from the file and
// not copied. tests/orbitFit.test.js runs it once in plain Node (Jest's VM makes
// Math reads about ten times slower, so an ensemble there would time the harness)
// and asserts every row. The oracle's rows read the series and fits pinned in
// tests/fixtures/orbit-fit/ (scipy, astropy, numpy: no Gravitas code). Nothing here
// stores a value that passes through a trigonometric function: bands, counts and
// tolerances are judged. Check e1 is reported as not run: no authentic arc exists.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CRITERION,
  KEPLER_K,
  RULES,
  elementsFromThieleInnes,
  fitOrbit,
  massSum,
  positionsFromElements,
  positionsViaLayer,
  thieleInnesOf,
} from '../js/measure/orbit-fit.js';
import { TRACK_RULES, findMover } from '../js/measure/mover-track.js';
import { runToEnd } from '../js/lab3d/engine.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { gaussian, stream } from '../js/random/streams.js';
import {
  canonical,
  evenYears,
  jitteredYears,
  makeOrbitSeries,
  randomOrbit,
  truePositions,
} from './orbit-fit-synth.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/orbit-fit');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
export const GATE = read('gate-thresholds.json');
const C = THRESHOLDS.checks;
const ORACLE = read('oracle-results.json');
const SEED = 'orbit-fit-187';
const RAD = Math.PI / 180;
const T = GATE.testSet;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const evidence = (id, measured, note) =>
  rows.push({ id, measured, evidence: true, pass: null, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const inBand = (id, measured, [lo, hi], note) =>
  row(id, measured, [lo, hi], measured >= lo && measured <= hi, note);
const atLeast = (id, measured, bound, note) =>
  row(id, measured, bound, measured >= bound, note);
const atMost = (id, measured, bound, note) =>
  row(id, measured, bound, measured <= bound, note);

const rng = (...labels) => stream('noise', SEED, ...labels);
const angDiff = (a, b, period = 360) => {
  const d = (a - b) % period;
  return Math.abs(
    d > period / 2 ? d - period : d < -period / 2 ? d + period : d
  );
};
const holds = (iv, v) =>
  iv !== null &&
  (iv[0] === null || v >= iv[0]) &&
  (iv[1] === null || v <= iv[1]);

/** The gate-style orbit and series of a cell trial. */
function trial(u, { e, arc, label, k, sigmaScale = 1 }) {
  const truth = randomOrbit(u, {
    e,
    cosI: T.cosI,
    a: T.semiMajorAxisArcsec,
    P: T.periodYears,
  });
  const years = jitteredYears(
    2000,
    arc * truth.P,
    T.epochs,
    u,
    T.jitterFractionOfSpacing
  );
  const series = makeOrbitSeries(truth, years, {
    sigma: T.noiseFractionOfA * truth.a,
    seed: `${label}:${k}`,
    label: SEED,
  });
  if (sigmaScale !== 1) for (const ep of series.epochs) ep.sigma *= sigmaScale;
  return { truth, series };
}

// ---- (a) analytic and synthetic recovery ----------------------------------------------

function analytic() {
  {
    const u = rng('a1');
    let worst = 0;
    for (let k = 0; k < 300; k++) {
      const el = randomOrbit(u, { e: [0, 0.95], cosI: [-1, 1] });
      const ys = Array.from({ length: 12 }, (_, j) => 1990 + j * 1.9 * u());
      const a = truePositions(el, ys);
      const b = positionsFromElements(el, ys);
      a.forEach((p, i) => {
        worst = Math.max(worst, Math.abs(p.x - b[i].x), Math.abs(p.y - b[i].y));
      });
    }
    within(
      'a1.forward',
      worst,
      C['a1.forward'].bound,
      'Thiele-Innes against the 3-D kernel, 300 sets'
    );
  }
  {
    const u = rng('a2');
    let worst = 0;
    for (let k = 0; k < 100; k++) {
      const el = randomOrbit(u, {
        e: [0, 0.95],
        cosI: [-1, 1],
        P: 3 + 20 * u(),
      });
      const ys = Array.from({ length: 12 }, (_, j) => 1990 + j * 1.9 * u());
      const a = positionsFromElements(el, ys);
      const b = positionsViaLayer(el, ys);
      a.forEach((p, i) => {
        worst = Math.max(worst, Math.abs(p.x - b[i].x), Math.abs(p.y - b[i].y));
      });
    }
    within(
      'a2.layer',
      worst,
      C['a2.layer'].bound,
      "Prompt 148's layer, 100 sets"
    );
  }
  {
    const u = rng('a3');
    let worst = 0;
    for (let k = 0; k < 300; k++) {
      const el = randomOrbit(u, {
        e: [0, 0.9],
        cosI: [-1, 1],
        a: 0.3 + 2 * u(),
      });
      const ti = thieleInnesOf(el);
      const back = elementsFromThieleInnes(ti);
      const ti2 = thieleInnesOf({ ...back });
      worst = Math.max(
        worst,
        ...['A', 'B', 'F', 'G'].map(q => Math.abs(ti[q] - ti2[q]) / el.a)
      );
    }
    within(
      'a3.inverse',
      worst,
      C['a3.inverse'].bound,
      'constants to elements and back, 300 sets'
    );
  }
  {
    const b = C['a4.recover'].bounds;
    const u = rng('a4');
    const worst = { P: 0, a: 0, e: 0, iDeg: 0, OmegaDeg: 0, omegaDeg: 0, T: 0 };
    let refused = 0;
    for (let k = 0; k < 50; k++) {
      const truth = randomOrbit(u, {
        e: [0.1, 0.8],
        a: 0.5 + u(),
        P: 6 + 10 * u(),
      });
      const ys = jitteredYears(2000, 1.2 * truth.P, 14, u, 0.3);
      const s = makeOrbitSeries(truth, ys, {
        sigma: 1e-6,
        seed: `a4:${k}`,
        noise: false,
        label: SEED,
      });
      const r = fitOrbit(s, { depth: 'elliptical' });
      if (!r.ok || r.eccentricity?.detected === false) {
        refused++;
        continue;
      }
      const c = canonical(truth);
      const el = r.elements;
      worst.P = Math.max(worst.P, Math.abs(el.P.value - truth.P) / truth.P);
      worst.a = Math.max(worst.a, Math.abs(el.a.value - truth.a) / truth.a);
      worst.e = Math.max(worst.e, Math.abs(el.e.value - truth.e));
      worst.iDeg = Math.max(worst.iDeg, Math.abs(el.i.value - truth.i));
      worst.OmegaDeg = Math.max(
        worst.OmegaDeg,
        angDiff(el.Omega.value, c.Omega, 180)
      );
      worst.omegaDeg = Math.max(
        worst.omegaDeg,
        angDiff(el.omega.value, c.omega)
      );
      worst.T = Math.max(worst.T, angDiff(el.T.value, truth.T, truth.P));
    }
    for (const q of Object.keys(b))
      within(`a4.recover.${q}`, worst[q], b[q], 'noise-free, 50 orbits');
    within(
      'a4.recover.refused',
      refused,
      0,
      'orbits refused or not detected eccentric (none allowed)'
    );
  }
  {
    const b = C['a5.circular'].bounds;
    const u = rng('a5');
    const worst = { P: 0, a: 0, iDeg: 0, OmegaDeg: 0 };
    let refused = 0;
    for (let k = 0; k < 50; k++) {
      const truth = {
        a: 0.5 + u(),
        e: 0,
        i: Math.acos(-0.9 + 1.8 * u()) / RAD,
        Omega: 360 * u(),
        omega: 360 * u(),
        P: 6 + 10 * u(),
        T: 2000,
      };
      const ys = jitteredYears(2000, 1.2 * truth.P, 14, u, 0.3);
      const s = makeOrbitSeries(truth, ys, {
        sigma: 1e-6,
        seed: `a5:${k}`,
        noise: false,
        label: SEED,
      });
      const r = fitOrbit(s, { depth: 'circular' });
      if (!r.ok) {
        refused++;
        continue;
      }
      const c = canonical(truth);
      const el = r.elements;
      worst.P = Math.max(worst.P, Math.abs(el.P.value - truth.P) / truth.P);
      worst.a = Math.max(worst.a, Math.abs(el.a.value - truth.a) / truth.a);
      worst.iDeg = Math.max(worst.iDeg, Math.abs(el.i.value - truth.i));
      worst.OmegaDeg = Math.max(
        worst.OmegaDeg,
        angDiff(el.Omega.value, c.Omega, 180)
      );
    }
    for (const q of Object.keys(b))
      within(
        `a5.circular.${q}`,
        worst[q],
        b[q],
        'noise-free circular, 50 orbits'
      );
    within('a5.circular.refused', refused, 0, 'orbits refused (none allowed)');
  }
  within(
    'a6.kepler',
    Math.abs(KEPLER_K - ORACLE.keplerK) / ORACLE.keplerK,
    C['a6.kepler'].bound,
    "K against astropy's G M_sun, au and the Julian year"
  );
}

// ---- (b) oracles -------------------------------------------------------------------------

function oracles() {
  {
    const b = C['b1.corpus'].bounds;
    const { system, options, context } = REFERENCES[0].make();
    const res = runToEnd(system, {
      ...options,
      span: 1.2 * context.P,
      samples: 1999,
      limits: { maxSamples: 30000, maxEvals: 1e9 },
    });
    const scale = 10 / context.P;
    const epochOf = s => ({
      time: { value: 2000 + s.t * scale, format: 'year' },
      x: s.x[3] - s.x[0],
      y: s.x[4] - s.x[1],
      sigma: 1e-6,
    });
    // 16 of the kernel's 2,000 samples: the ends and fourteen jittered by 0.3 of the spacing
    // (an exactly regular cadence aliases the period and is refused: the evidence row below)
    const u = rng('b1');
    const step = 1999 / 15;
    const picks = Array.from({ length: 16 }, (_, k) =>
      k === 0 || k === 15
        ? Math.round(k * step)
        : Math.round(k * step + step * 0.3 * (2 * u() - 1))
    );
    const epochs = picks.map(i => epochOf(res.samples[i]));
    const regular = fitOrbit(
      {
        epochs: Array.from({ length: 16 }, (_, k) =>
          epochOf(res.samples[Math.round(k * step)])
        ),
      },
      { depth: 'elliptical' }
    );
    evidence(
      'b1.corpus.regular',
      regular.ok ? 'accepted' : regular.code,
      'the corpus orbit at 16 exactly regular epochs'
    );
    const r = fitOrbit({ epochs }, { depth: 'elliptical' });
    if (!r.ok) {
      row('b1.corpus', r.code, 'fit', false, 'the corpus orbit was refused');
    } else {
      const el = r.elements;
      const ref = context.el;
      const d = {
        P: Math.abs(el.P.value - 10) / 10,
        a: Math.abs(el.a.value - ref.a) / ref.a,
        e: Math.abs(el.e.value - ref.e),
        iDeg: Math.abs(el.i.value - ref.i / RAD),
        OmegaDeg: angDiff(el.Omega.value, ref.Omega / RAD, 180),
        omegaDeg: angDiff(el.omega.value, ref.omega / RAD),
      };
      for (const q of Object.keys(b))
        within(
          `b1.corpus.${q}`,
          d[q],
          b[q],
          "R1's elements from the kernel's own integration"
        );
    }
  }
  {
    const b = C['b2.scipy'];
    const b3 = C['b3.sigma'].bound;
    let worstSig = 0;
    let worstChi = 0;
    let worstS = 0;
    let n = 0;
    for (const o of ORACLE.orbits) {
      const epochs = o.epochs.map((year, i) => ({
        time: { value: year, format: 'year' },
        x: o.x[i],
        y: o.y[i],
        sigma: o.sigma,
      }));
      const depth = o.kind === 'circular' ? 'circular' : 'elliptical';
      const r = fitOrbit({ epochs }, { depth });
      n++;
      if (!r.ok || r.depth !== depth) {
        row(
          `b2.scipy.${o.id}`,
          r.ok ? 'not detected' : r.code,
          'fit',
          false,
          'refused'
        );
        continue;
      }
      const f = o.fit;
      const el = r.elements;
      const sP = el.P.sigma;
      const sA = el.a.sigma;
      worstSig = Math.max(
        worstSig,
        Math.abs(el.P.value - f.P) / sP,
        Math.abs(el.a.value - f.a) / sA
      );
      if (depth === 'elliptical')
        worstSig = Math.max(worstSig, Math.abs(el.e.value - f.e) / el.e.sigma);
      worstChi = Math.max(worstChi, Math.abs(r.chi2 - f.chi2) / f.chi2);
      worstS = Math.max(
        worstS,
        Math.abs(sP - f.sigmaP) / f.sigmaP,
        Math.abs(sA - f.sigmaA) / f.sigmaA
      );
    }
    atLeast('b2.scipy.cases', n, 8, 'oracle series fitted');
    within(
      'b2.scipy.sigmas',
      worstSig,
      b.sigmas,
      'worst of P, a, e in formal sigmas'
    );
    within('b2.scipy.chi2', worstChi, b.chi2Relative, 'chi-squared, relative');
    within('b3.sigma', worstS, b3, 'sigma of P and a against (J^T J)^-1');
  }
  {
    const b = C['b4.track'].bounds;
    let worstRate = 0;
    let worstPlane = 0;
    let worstLocal = 0;
    let found = 0;
    for (const o of ORACLE.tracks) {
      const frames = o.frames.map(f => ({
        time: { value: f.jd, format: 'jd', scale: 'tdb' },
        sources: f.ra.map((ra, i) => ({ ra, dec: f.dec[i], sigma: o.sigma })),
      }));
      const r = findMover(frames, { tangent: o.tangent });
      if (!r.ok) {
        row(
          `b4.track.${o.id}`,
          r.code,
          'mover',
          false,
          'the mover was not found'
        );
        continue;
      }
      found++;
      worstRate = Math.max(
        worstRate,
        Math.abs(r.rate.value - o.fit.rate) / o.fit.rate
      );
      worstPlane = Math.max(
        worstPlane,
        angDiff(r.positionAngle.plane, o.fit.paPlane)
      );
      worstLocal = Math.max(
        worstLocal,
        angDiff(r.positionAngle.value, o.fit.paAstropy)
      );
    }
    atLeast('b4.track.found', found, ORACLE.tracks.length, 'movers found');
    within(
      'b4.track.rate',
      worstRate,
      b.rate,
      "rate against scipy's weighted line, relative"
    );
    within(
      'b4.track.angle',
      worstPlane,
      b.angleDeg,
      "tangent-plane angle against scipy's, degrees"
    );
    within(
      'b4.track.local',
      worstLocal,
      b.angleDeg,
      "local position angle against astropy's, degrees"
    );
  }
}

// ---- (c) coverage ---------------------------------------------------------------------------

/** Tally the 0.6827 and 0.95 coverage of P (profile), a and a^3/P^2 over accepted fits. */
function coverageOf(fits) {
  const tally = {
    P: [0, 0],
    a: [0, 0],
    a3: [0, 0],
  };
  for (const { r, truth } of fits) {
    const el = r.elements;
    const lnK = Math.log(el.a.value ** 3 / el.P.value ** 2);
    const lnT = Math.log(truth.a ** 3 / truth.P ** 2);
    const sK = r.gradients.sigmaLnK3;
    const add = (key, a, b) => {
      tally[key][0] += a ? 1 : 0;
      tally[key][1] += b ? 1 : 0;
    };
    add('P', holds(el.P.interval68, truth.P), holds(el.P.interval95, truth.P));
    add(
      'a',
      Math.abs(el.a.value - truth.a) <= el.a.sigma,
      Math.abs(el.a.value - truth.a) <= 1.959963984540054 * el.a.sigma
    );
    add(
      'a3',
      Math.abs(lnK - lnT) <= sK,
      Math.abs(lnK - lnT) <= 1.959963984540054 * sK
    );
  }
  const n = fits.length;
  return Object.fromEntries(
    Object.entries(tally).map(([k, [x, y]]) => [k, { s1: x / n, s95: y / n }])
  );
}

function ensembles() {
  const refusedCodes = {};
  const accepted = [];
  const u = rng('c1');
  const c1 = C['c1.coverage'];
  const cell = [];
  for (let k = 0; k < c1.trials; k++) {
    const { truth, series } = trial(u, {
      e: T.eccentric,
      arc: 1.1,
      label: 'c1',
      k,
    });
    const r = fitOrbit(series, { depth: 'elliptical' });
    cell.push({ r, truth });
    if (r.ok) accepted.push({ r, truth });
    else refusedCodes[r.code] = (refusedCodes[r.code] ?? 0) + 1;
  }
  const cov = coverageOf(accepted);
  for (const [q, v] of Object.entries(cov)) {
    inBand(
      `c1.coverage.${q}.68`,
      v.s1,
      c1.band68,
      `elliptical, ${accepted.length} of ${c1.trials} accepted`
    );
    inBand(`c1.coverage.${q}.95`, v.s95, c1.band95, '');
  }
  evidence(
    'c1.refused',
    JSON.stringify(refusedCodes),
    'refusal codes of the 110 percent cell'
  );
  // d3 false alarm of the ambiguity rule on the jittered cell (the first 200 trials)
  const alarms = cell
    .slice(0, 200)
    .filter(({ r }) => !r.ok && r.code === 'period-ambiguous').length;
  atMost(
    'd3.falseAlarm',
    alarms / 200,
    C['d3.alias'].falseAlarmAtMost,
    'period-ambiguous on the jittered 110 percent cell'
  );
  // d8 nodes
  let okNodes = 0;
  for (const { r } of accepted)
    if (
      r.elements.Omega.value >= 0 &&
      r.elements.Omega.value < 180 &&
      r.nodeAmbiguity === true
    )
      okNodes++;

  const c2 = C['c2.circular'];
  const uc = rng('c2');
  const circ = [];
  const massRows = [];
  const mu = C['c3.mass'];
  const gm = gaussian(rng('c3', 'parallax'));
  for (let k = 0; k < c2.trials; k++) {
    const { truth, series } = trial(uc, {
      e: [0, 0],
      arc: 1.1,
      label: 'c2',
      k,
    });
    const r = fitOrbit(series, { depth: 'circular' });
    if (!r.ok) continue;
    circ.push({ r, truth });
    for (const snr of [10, 4]) {
      const plxTrue = 0.1;
      const sig = plxTrue / snr;
      const obs = plxTrue + sig * gm();
      const m = massSum(r, {
        value: obs * 1000,
        sigma: sig * 1000,
        unit: 'mas',
        frame: 'absolute',
        source: 'validation',
      });
      const trueMass = (KEPLER_K * (truth.a / plxTrue) ** 3) / truth.P ** 2;
      massRows.push({ snr, m, trueMass });
    }
  }
  const ccov = coverageOf(circ);
  for (const [q, v] of Object.entries(ccov)) {
    inBand(
      `c2.circular.${q}.68`,
      v.s1,
      c2.band68,
      `circular, ${circ.length} of ${c2.trials} accepted`
    );
    inBand(`c2.circular.${q}.95`, v.s95, c2.band95, '');
  }
  for (const { r } of circ)
    if (
      r.elements.Omega.value >= 0 &&
      r.elements.Omega.value < 180 &&
      r.nodeAmbiguity === true
    )
      okNodes++;
  within(
    'd8.node',
    accepted.length + circ.length - okNodes,
    0,
    `every accepted node in [0, 180) with the ambiguity stated, ${accepted.length + circ.length} fits`
  );
  for (const snr of [10, 4]) {
    const rs = massRows.filter(x => x.snr === snr && x.m.ok);
    const cover = lvl =>
      rs.filter(({ m, trueMass }) => {
        const i = m.intervals[lvl];
        return trueMass >= i.lo && trueMass <= i.hi;
      }).length / rs.length;
    inBand(`c3.mass.snr${snr}.68`, cover(0), mu.band68, `${rs.length} trials`);
    if (snr === 4) {
      const all = massRows.filter(x => x.snr === snr).length;
      evidence(
        'c3.mass.snr4.selection',
        `${rs.length} of ${all} accepted`,
        `the rule refuses an observed S/N below ${RULES.massMinSnr}; among the accepted, the 0.6827 interval is expected to cover 0.6827 / 0.8413 = 0.811`
      );
    }
    inBand(`c3.mass.snr${snr}.95`, cover(1), mu.band95, '');
    if (snr === 4) {
      const ratio =
        rs.reduce(
          (s, { m }) =>
            s + (m.intervals[0].hi - m.value) / (m.value - m.intervals[0].lo),
          0
        ) / rs.length;
      atLeast(
        'c3.mass.asymmetry',
        ratio,
        mu.asymmetry,
        'mean upper arm over lower arm at S/N 4'
      );
    }
  }
  // the mass sum's frame statement is always present
  const nostmt = massRows.filter(x => x.m.ok && !x.m.frameStatement).length;
  within(
    'd7.frameStatement',
    nostmt,
    0,
    'every mass sum carries its frame statement'
  );
}

// ---- (d) refusals -----------------------------------------------------------------------------

function refusals() {
  {
    const d1 = C['d1.short'].refuseAt;
    const u = rng('d1');
    for (const depth of ['circular', 'elliptical'])
      for (const [arc, bound] of Object.entries(d1)) {
        let refused = 0;
        const n = 80;
        for (let k = 0; k < n; k++) {
          const { series } = trial(u, {
            e: depth === 'circular' ? [0, 0] : T.eccentric,
            arc: Number(arc),
            label: `d1:${depth}:${arc}`,
            k,
          });
          if (!fitOrbit(series, { depth }).ok) refused++;
        }
        atLeast(`d1.short.${depth}.${arc}`, refused / n, bound, `${n} trials`);
      }
  }
  {
    const u = rng('d2');
    const { series } = trial(u, {
      e: T.eccentric,
      arc: 1.1,
      label: 'd2',
      k: 0,
    });
    const few = n => ({ epochs: series.epochs.slice(0, n) });
    const codeOf = r => (r.ok ? 'ok' : r.code);
    const ok =
      codeOf(fitOrbit(few(5), { depth: 'elliptical' })) === 'epochs' &&
      codeOf(fitOrbit(few(4), { depth: 'circular' })) === 'epochs';
    const bad = (mut, code) => {
      const e = series.epochs.map(x => ({ ...x, time: { ...x.time } }));
      mut(e);
      return codeOf(fitOrbit({ epochs: e }, { depth: 'elliptical' })) === code;
    };
    const all = [
      ok,
      bad(e => (e[2].time = { value: 'x', format: 'year' }), 'bad-epoch'),
      bad(e => (e[2].x = NaN), 'bad-position'),
      bad(e => (e[2].sigma = 0), 'bad-sigma'),
      bad(
        e => e.forEach(x => (x.time = { value: 2000, format: 'year' })),
        'span'
      ),
      codeOf(fitOrbit({ epochs: [] })) === 'bad-series',
    ];
    row(
      'd2.epochs',
      all.filter(Boolean).length,
      all.length,
      all.every(Boolean),
      'five epochs, four, and malformed rows refused with their codes'
    );
  }
  {
    // an exactly regular cadence aliases the period
    const u = rng('d3');
    let ambiguous = 0;
    const n = 100;
    for (let k = 0; k < n; k++) {
      const truth = randomOrbit(u, {
        e: T.eccentric,
        cosI: T.cosI,
        a: 1,
        P: 10,
      });
      const s = makeOrbitSeries(truth, evenYears(2000, 11, 12), {
        sigma: 0.02,
        seed: `d3:${k}`,
        label: SEED,
      });
      const r = fitOrbit(s, { depth: 'elliptical' });
      if (!r.ok && r.code === 'period-ambiguous') ambiguous++;
    }
    atLeast(
      'd3.alias',
      ambiguous / n,
      C['d3.alias'].refuseAtLeast,
      'a regular one-year cadence over 11 years, P = 10 years'
    );
  }
  {
    const u = rng('d4');
    let refused = 0;
    const n = 80;
    for (let k = 0; k < n; k++) {
      const { series } = trial(u, { e: [0.5, 0.8], arc: 1.1, label: 'd4', k });
      if (!fitOrbit(series, { depth: 'circular' }).ok) refused++;
    }
    atLeast(
      'd4.misfit',
      refused / n,
      C['d4.misfit'].refuseAtLeast,
      'circular model on e 0.5 to 0.8'
    );
  }
  {
    const u = rng('d5');
    let inconsistent = 0;
    const n = 50;
    for (let k = 0; k < n; k++) {
      const { series } = trial(u, {
        e: T.eccentric,
        arc: 1.1,
        label: 'd5',
        k,
        sigmaScale: 0.3,
      });
      const r = fitOrbit(series, { depth: 'elliptical' });
      if (!r.ok && r.code === 'inconsistent') inconsistent++;
    }
    atLeast(
      'd5.small',
      inconsistent / n,
      C['d5.small'].refuseAtLeast,
      'stated uncertainties 0.3 of the noise'
    );
  }
  {
    // polar against Cartesian with the full covariance
    const u = rng('d6');
    const truth = randomOrbit(u, { e: [0.3, 0.6] });
    const ys = jitteredYears(2000, 1.1 * truth.P, 12, u, 0.3);
    const polar = makeOrbitSeries(truth, ys, {
      sigma: 0.02,
      seed: 'd6',
      polar: true,
      label: SEED,
    });
    const cart = {
      epochs: polar.epochs.map(e => {
        const th = e.theta * RAD;
        const vr = e.sigmaRho ** 2;
        const vt = (e.rho * e.sigmaTheta * RAD) ** 2;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const sxx = vr * c * c + vt * s * s;
        const syy = vr * s * s + vt * c * c;
        const sxy = (vr - vt) * c * s;
        return {
          time: e.time,
          x: e.rho * c,
          y: e.rho * s,
          sx: Math.sqrt(sxx),
          sy: Math.sqrt(syy),
          rxy: sxy / Math.sqrt(sxx * syy),
        };
      }),
    };
    const a = fitOrbit(polar, { depth: 'elliptical' });
    const b = fitOrbit(cart, { depth: 'elliptical' });
    if (a.ok && b.ok)
      within(
        'd6.polar',
        Math.max(
          Math.abs(a.elements.P.value - b.elements.P.value) /
            b.elements.P.value,
          Math.abs(a.elements.a.value - b.elements.a.value) / b.elements.a.value
        ),
        C['d6.polar'].bound,
        'separation and angle against offsets with the full covariance'
      );
    else
      row(
        'd6.polar',
        'refused',
        C['d6.polar'].bound,
        false,
        'a fit was refused'
      );
  }
  {
    const u = rng('d7');
    const { series } = trial(u, { e: [0, 0], arc: 1.1, label: 'd7', k: 0 });
    const fit = fitOrbit(series, { depth: 'circular' });
    const code = m => (m.ok ? 'ok' : m.code);
    const good = { value: 100, sigma: 10, frame: 'absolute', source: 'test' };
    const checks = [
      code(massSum(fit, { ...good, value: undefined })) === 'parallax',
      code(
        massSum(fit, { value: 29, sigma: 10, frame: 'absolute', source: 't' })
      ) === 'parallax-weak',
      code(massSum(fit, { value: 100, sigma: 10 })) === 'frame',
      code(massSum(fit, { value: 100, sigma: 10, frame: 'absolute' })) ===
        'frame',
      code(massSum({ ok: false }, good)) === 'no-orbit',
      code(massSum(fit, good)) === 'ok',
    ];
    row(
      'd7.mass',
      checks.filter(Boolean).length,
      checks.length,
      checks.every(Boolean),
      'the mass sum refuses without a parallax, at S/N 2.9, without a frame statement or a source, and without an orbit'
    );
  }
}

// ---- tracks ------------------------------------------------------------------------------------

/** A field of static sources and, when `mover`, one mover, in standard coordinates. */
function field(u, g, { frames, statics, sigma, mover, arcSigmas = 20 }) {
  const stat = Array.from({ length: statics }, () => ({
    x: u() * 100,
    y: u() * 100,
  }));
  const ang = u() * 2 * Math.PI;
  const rate = (arcSigmas * sigma) / ((frames - 1) * 0.5); // arcsec per hour over frames half an hour apart
  const v = { x: rate * Math.sin(ang), y: rate * Math.cos(ang) };
  const m0 = { x: u() * 100, y: u() * 100 };
  const list = Array.from({ length: frames }, (_, f) => {
    const t = f * 0.5;
    const srcs = stat.map(s => ({
      x: s.x + g() * sigma,
      y: s.y + g() * sigma,
      sigma,
    }));
    if (mover)
      srcs.push({
        x: m0.x + v.x * t + g() * sigma,
        y: m0.y + v.y * t + g() * sigma,
        sigma,
      });
    srcs.sort(() => u() - 0.5);
    return {
      time: { value: 2460000.5 + t / 24, format: 'jd', scale: 'tdb' },
      sources: srcs,
    };
  });
  return {
    frames: list,
    truth: {
      rate: Math.hypot(v.x, v.y),
      pa: (((Math.atan2(v.x, v.y) / RAD) % 360) + 360) % 360,
    },
  };
}

function tracks() {
  {
    const u = rng('t', 'c4');
    const g = gaussian(rng('t', 'c4g'));
    const n = 300;
    let c = [0, 0, 0, 0];
    let ok = 0;
    for (let k = 0; k < n; k++) {
      const f = field(u, g, {
        frames: 5,
        statics: 30,
        sigma: 0.05,
        mover: true,
      });
      const r = findMover(f.frames);
      if (!r.ok) continue;
      ok++;
      const zr = Math.abs(r.rate.value - f.truth.rate) / r.rate.sigma;
      const zp =
        angDiff(r.positionAngle.plane, f.truth.pa) / r.positionAngle.sigma;
      c[0] += zr <= 1 ? 1 : 0;
      c[1] += zr <= 1.959963984540054 ? 1 : 0;
      c[2] += zp <= 1 ? 1 : 0;
      c[3] += zp <= 1.959963984540054 ? 1 : 0;
    }
    const b = C['c4.track'];
    inBand('c4.track.rate.68', c[0] / ok, b.band68, `${ok} of ${n} found`);
    inBand('c4.track.rate.95', c[1] / ok, b.band95, '');
    inBand('c4.track.angle.68', c[2] / ok, b.band68, '');
    inBand('c4.track.angle.95', c[3] / ok, b.band95, '');
  }
  {
    const u = rng('t', 'd9');
    const g = gaussian(rng('t', 'd9g'));
    const n = 300;
    let alarms = 0;
    for (let k = 0; k < n; k++) {
      const f = field(u, g, {
        frames: 5,
        statics: 30,
        sigma: 0.05,
        mover: false,
      });
      const r = findMover(f.frames);
      if (!(!r.ok && r.code === 'no-mover')) alarms++;
    }
    atMost(
      'd9.static',
      alarms / n,
      C['d9.static'].falseAlarmAtMost,
      'a static field returns no-mover'
    );
  }
  {
    const u = rng('t', 'd10');
    const g = gaussian(rng('t', 'd10g'));
    const n = 500;
    let found = 0;
    for (let k = 0; k < n; k++) {
      const f = field(u, g, {
        frames: 5,
        statics: 30,
        sigma: 0.05,
        mover: true,
      });
      const r = findMover(f.frames);
      if (r.ok && Math.abs(r.rate.value - f.truth.rate) <= 4 * r.rate.sigma)
        found++;
    }
    atLeast(
      'd10.mover',
      found / n,
      C['d10.mover'].identifyAtLeast,
      'the mover identified among 30 static sources'
    );
  }
  {
    const u = rng('t', 'd11');
    const g = gaussian(rng('t', 'd11g'));
    const code = r => (r.ok ? 'ok' : r.code);
    const two = field(u, g, {
      frames: 5,
      statics: 20,
      sigma: 0.05,
      mover: true,
    });
    const f2 = { frames: two.frames.slice(0, 2) };
    const slow = field(u, g, {
      frames: 5,
      statics: 20,
      sigma: 0.05,
      mover: true,
      arcSigmas: 2,
    });
    const checks = [
      code(findMover(f2.frames)) === 'too-few-frames',
      code(findMover(slow.frames)) === 'no-mover',
      false,
    ];
    // the two-movers case: build it exactly, two lines among static sources
    const stat = Array.from({ length: 20 }, () => ({
      x: u() * 100,
      y: u() * 100,
    }));
    const frames = Array.from({ length: 5 }, (_, f) => ({
      time: { value: 2460000.5 + f / 48, format: 'jd', scale: 'tdb' },
      sources: [
        ...stat.map(s => ({
          x: s.x + g() * 0.05,
          y: s.y + g() * 0.05,
          sigma: 0.05,
        })),
        { x: 10 + 0.5 * f + g() * 0.05, y: 10 + g() * 0.05, sigma: 0.05 },
        { x: 70 + g() * 0.05, y: 80 - 0.5 * f + g() * 0.05, sigma: 0.05 },
      ],
    }));
    const r2 = findMover(frames);
    checks[2] = code(r2) === 'several-movers' && r2.data.movers.length === 2;
    row(
      'd11.track',
      checks.filter(Boolean).length,
      checks.length,
      checks.every(Boolean),
      'two frames, a slow mover (2 sigma over the arc) and two movers'
    );
  }
}

// ---- the rules are the committed ones, and (e) -----------------------------------------------

function rules() {
  const R = THRESHOLDS.rules;
  const G = GATE.criterion;
  const same =
    RULES.ambiguityDeltaChi2 === R.ambiguityDeltaChi2 &&
    RULES.ambiguityMinLogPeriodGap === R.ambiguityMinLogPeriodGap &&
    RULES.ambiguitySigmas === R.ambiguitySigmas &&
    RULES.massMinSnr === R.massMinSnr &&
    RULES.massDraws === R.massDraws &&
    TRACK_RULES.minFrames === R.moverMinFrames &&
    TRACK_RULES.minDetections === R.moverMinDetections &&
    TRACK_RULES.significance === R.moverSignificance &&
    TRACK_RULES.staticSigmas === R.moverStaticSigmas &&
    TRACK_RULES.matchSigmas === R.moverMatchSigmas &&
    TRACK_RULES.consistentPValue === R.moverConsistentPValue &&
    TRACK_RULES.maxFrames === R.maxFrames &&
    TRACK_RULES.maxSourcesPerFrame === R.maxSourcesPerFrame &&
    CRITERION.minEpochs.circular === G.minEpochs.circular &&
    CRITERION.minEpochs.elliptical === G.minEpochs.elliptical &&
    CRITERION.coverageFraction.circular === G.coverageFraction.circular &&
    CRITERION.coverageFraction.elliptical === G.coverageFraction.elliptical &&
    CRITERION.coverageSigmas === G.coverageSigmas &&
    CRITERION.maxConditionNumber === G.maxConditionNumber &&
    CRITERION.periodLow === G.periodSearch.spanFractionLow &&
    CRITERION.periodHigh === G.periodSearch.spanMultipleHigh &&
    CRITERION.consistentPValue === G.consistentPValue &&
    CRITERION.eccentricityDeltaChi2 === G.eccentricityDeltaChi2 &&
    CRITERION.profileDeltaChi2 === G.profileDeltaChi2;
  row(
    'rules.committed',
    same ? 1 : 0,
    1,
    same,
    "the modules' rules equal the committed thresholds"
  );
  evidence('e1.authentic', 'NOT RUN', C['e1.authentic'].status);
}

export function validate() {
  rows.length = 0;
  analytic();
  oracles();
  ensembles();
  refusals();
  tracks();
  rules();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = validate();
  const failed = out.filter(r => r.pass === false);
  if (process.argv.includes('--json'))
    console.log(
      JSON.stringify({ rows: out, seconds: (Date.now() - t0) / 1000 }, null, 2)
    );
  else {
    const f = v =>
      typeof v === 'number'
        ? Math.abs(v) < 1e-3 && v !== 0
          ? v.toExponential(2)
          : String(Number(v.toPrecision(4)))
        : Array.isArray(v)
          ? `[${v.join(', ')}]`
          : String(v);
    for (const r of out)
      console.log(
        `${r.evidence ? 'info' : r.pass ? 'pass' : 'FAIL'}  ${r.id.padEnd(34)} ${f(r.measured).padEnd(14)} ${r.bound !== undefined ? f(r.bound).padEnd(14) : ''.padEnd(14)} ${r.note}`
      );
    console.log(
      `\n${out.filter(r => r.pass === true).length} passed, ${failed.length} failed, ${out.filter(r => r.evidence).length} evidence rows (${((Date.now() - t0) / 1000).toFixed(0)} s)`
    );
  }
  process.exitCode = failed.length ? 1 : 0;
}
