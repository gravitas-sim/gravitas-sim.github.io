#!/usr/bin/env node
// =============================================================================
// The vetting kernel against its committed thresholds (Prompt 228)
// -----------------------------------------------------------------------------
//   npm run vetting:validate                    print the table
//   npm run vetting:validate -- --json          print it as JSON
//   npm run vetting:validate -- --write-results rewrite results.json, failed-legs.json and rates.js
//   npm run vetting:validate -- --only A,B      run the rows whose id starts with one of these
//
// tests/fixtures/vetting/thresholds.json fixed every bound before js/kernels/vetting/
// existed; this runs the checks against the kernel and judges them against the bounds
// read from that file. The oracle rows read the data and results pinned in
// oracle-results.json (tools/vetting-oracle/oracle.py: numpy, scipy and batman, no
// Gravitas code). A crossed bound is a failed row, left failing in failed-legs.json.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/vetting/index.js';
import {
  transitFlux,
  halfDuration,
  limbDarkening,
} from '../js/inference/transit.js';
import { ecoswFromPhase } from '../js/inference/binaries.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/vetting';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${FIX}/thresholds.json`);
const ORA = read(`${FIX}/oracle-results.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEED = THRESHOLDS.seeds.ensemble;

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const report = (id, measured, note = '') =>
  rows.push({ id, status: 'report', measured, note });
const notRun = (id, why) =>
  rows.push({ id, status: 'not-run', measured: null, note: why });

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const seeded = (id, i) => `${SEED}:${id}:${i}`;
const lcg = seed => {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
};
const tally = (list, key) => {
  const t = { pass: 0, fail: 0, inconclusive: 0, n: list.length };
  for (const x of list) t[key(x)]++;
  return t;
};
const frac = (t, v) => t[v] / t.n;
const flat = (t, y, dy = 1e-3) => ({
  t,
  y,
  dy: new Float64Array(t.length).fill(dy),
});

const PLANET = () => {
  const { u1, u2 } = limbDarkening(K.SHAPE.q1, K.SHAPE.q2);
  return { ...K.SHAPE, u1, u2 };
};

// ---- a: analytic ------------------------------------------------------------------------

function legA() {
  // A1
  {
    const r = lcg('A1');
    let worst = 0;
    for (let i = 0; i < 20; i++) {
      const k = 0.05 + 0.1 * r();
      const b = 0.6 * r();
      const p = { t0: 0.5, P: 3.2, aRs: 8.6, b, k, ...limbDarkening(0.4, 0.3) };
      const D = 2 * halfDuration(p);
      const t = Float64Array.from(
        { length: Math.floor(12 * 3.2 * 1440) },
        (_, j) => j / 1440
      );
      const y = transitFlux(t, p, { annuli: 96 });
      const d = K.boxDepth(flat(t, y), { P: 3.2, t0: 0.5, duration: D });
      // The mean of the model in the central half, by quadrature.
      const m = 20000;
      const tt = Float64Array.from(
        { length: m },
        (_, j) => 0.5 - D / 4 + ((j + 0.5) / m) * (D / 2)
      );
      const f = transitFlux(tt, p, { annuli: 96 });
      const ref = 1 - f.reduce((a, c) => a + c, 0) / m;
      worst = Math.max(worst, rel(d.depth, ref));
    }
    row('A1.boxDepth', worst <= lim('A1.boxDepth').maxRelativeError, {
      maxRelativeError: worst,
    });
  }
  // A2
  {
    const r = lcg('A2');
    const p = { t0: 0.5, P: 3.2, ...PLANET() };
    const D = 2 * halfDuration(p);
    const t = Float64Array.from(
      { length: Math.floor(12 * 3.2 * 1440) },
      (_, j) => j / 1440
    );
    const y0 = transitFlux(t, p, { annuli: 96 });
    const m = 20000;
    const tt = Float64Array.from(
      { length: m },
      (_, j) => 0.5 - D / 4 + ((j + 0.5) / m) * (D / 2)
    );
    const ref =
      1 - transitFlux(tt, p, { annuli: 96 }).reduce((a, c) => a + c, 0) / m;
    let worst = 0;
    let logic = true;
    const es = [0, ...Array.from({ length: 19 }, () => -0.4 + 0.8 * r())];
    for (const e of es) {
      const y = Float64Array.from(y0, (v, i) => {
        const n = Math.round((t[i] - 0.5) / 3.2);
        return 1 - (1 - v) * (1 + (Math.abs(n) % 2 === 1 ? e : -e));
      });
      const s = flat(t, y);
      const o = K.oddEvenTest(s, { P: 3.2, t0: 0.5, duration: D });
      const expected = 2 * e * ref;
      worst = Math.max(worst, Math.abs(o.difference - expected) / ref);
      if (e === 0 && o.verdict !== 'pass') logic = false;
      if (Math.abs(2 * e) > 0.5 && o.verdict !== 'fail') logic = false;
    }
    row(
      'A2.oddEvenRecovery',
      worst <= lim('A2.oddEvenRecovery').maxAbsErrorInMeanDepths && logic,
      {
        maxAbsErrorInMeanDepths: worst,
        verdictLogic: logic,
      }
    );
  }
  // A3
  {
    const t = Float64Array.from(
      { length: Math.floor(10 * 3.2 * 1440) },
      (_, j) => j / 1440
    );
    const eph = { P: 3.2, t0: 0.5, duration: 0.12 };
    const r = lcg('A3');
    let worst = 0;
    let wrongPhaseOk = true;
    for (let i = 0; i < 12; i++) {
      const ds = 0.0002 + (0.01 - 0.0002) * r();
      const phase = i % 2 ? 0.5 : 0.5 + (2 / Math.PI) * 0.15;
      const centre = 0.5 + phase * 3.2;
      const y = Float64Array.from(t, x => {
        const c = Math.round((x - centre) / 3.2);
        return Math.abs(x - centre - c * 3.2) < 0.06 ? 1 - ds : 1;
      });
      const found = K.boxDepth(flat(t, y), eph, { phase });
      worst = Math.max(worst, rel(found.depth, ds));
      if (phase !== 0.5) {
        const at05 = K.boxDepth(flat(t, y), eph, { phase: 0.5 });
        if (!(at05.depth <= 0)) wrongPhaseOk = false;
      }
    }
    const ec = ecoswFromPhase(0.5 + (2 / Math.PI) * 0.15);
    row(
      'A3.secondaryRecovery',
      worst <= lim('A3.secondaryRecovery').maxRelativeError && wrongPhaseOk,
      {
        maxRelativeError: worst,
        notSeenAtHalfPhase: wrongPhaseOk,
        ecoswRoundTrip: ec,
      }
    );
  }
  // A4
  {
    const r = lcg('A4');
    let worst = 0;
    const times = Float64Array.from(
      { length: 400 },
      (_, j) => 3.4 + (j / 399) * 0.6
    );
    for (let i = 0; i < 20; i++) {
      const J = 0.2 + 0.8 * r();
      const k = 0.4 + 0.6 * r();
      const l3 = 0.9 * r();
      const f0 = K.cleanCandidate('blend-alternating', {
        binary: { J, k },
        thirdLight: 0,
        times,
      }).flux;
      const f3 = K.cleanCandidate('blend-alternating', {
        binary: { J, k },
        thirdLight: l3,
        times,
      }).flux;
      const scale = Math.max(...f0.map(v => Math.abs(v - 1)));
      for (let j = 0; j < times.length; j++)
        worst = Math.max(
          worst,
          Math.abs(f3[j] - 1 - (1 - l3) * (f0[j] - 1)) / scale
        );
    }
    row('A4.dilution', worst <= lim('A4.dilution').maxRelativeError, {
      maxRelativeError: worst,
    });
  }
  // A5 and A6
  {
    const geoms = [{ eclipsed: 'target', separation: 1.6, angleDeg: 0 }];
    for (const sep of [0.8, 1.6, 2.4, 3.2])
      for (const a of [0, 1.1])
        geoms.push({
          eclipsed: 'neighbour',
          separation: sep,
          angleDeg: (a * 180) / Math.PI,
        });
    geoms.push({ eclipsed: 'target', separation: 3.2, angleDeg: 63 });
    let worstPos = 0;
    const per = [];
    for (const [i, g] of geoms.entries()) {
      const fr = K.transitFrames({
        seed: seeded('A5', i),
        rateScale: 1e4,
        ...g,
      });
      const d = K.differenceCentroid(fr, fr.ephemeris, fr.target);
      const at = fr.truth.eclipsedAt;
      const err = Math.hypot(d.dic.x - at.x, d.dic.y - at.y);
      worstPos = Math.max(worstPos, err);
      per.push({ ...g, err });
    }
    row(
      'A5.centroidLocation',
      worstPos <= lim('A5.centroidLocation').maxPositionErrorPx,
      {
        maxPositionErrorPx: worstPos,
        cases: per.length,
      }
    );
    // A6: the first-order shift of the aperture centroid
    let worst = 0;
    const out = [];
    for (const [i, g] of [
      { eclipsed: 'target', separation: 1.6, angleDeg: 40 },
      { eclipsed: 'neighbour', separation: 1.6, angleDeg: 40 },
      { eclipsed: 'target', separation: 2.4, angleDeg: 0 },
      { eclipsed: 'neighbour', separation: 2.4, angleDeg: 0 },
    ].entries()) {
      const fr = K.transitFrames({
        seed: seeded('A6', i),
        rateScale: 1e4,
        ...g,
      });
      const d = K.differenceCentroid(fr, fr.ephemeris, fr.target);
      const { inT } = K.splitFrames(fr.times, fr.ephemeris);
      const m = fr.truth.eclipsedMultiplier;
      const meanM = inT.reduce((a, k) => a + m[k], 0) / inT.length;
      const q = fr.truth.q;
      const share = g.eclipsed === 'target' ? 1 / (1 + q) : q / (1 + q);
      const delta = share * (1 - meanM);
      const mag =
        g.eclipsed === 'target'
          ? delta * (q / (1 + q)) * g.separation
          : -delta * (1 / (1 + q)) * g.separation;
      const ang = (g.angleDeg * Math.PI) / 180;
      const along =
        d.apertureShift.dx * Math.cos(ang) + d.apertureShift.dy * Math.sin(ang);
      const across =
        -d.apertureShift.dx * Math.sin(ang) +
        d.apertureShift.dy * Math.cos(ang);
      const e = Math.max(rel(along, mag), Math.abs(across) / Math.abs(mag));
      worst = Math.max(worst, e);
      out.push({ ...g, predicted: mag, along, across });
    }
    row(
      'A6.centroidShiftAnalytic',
      worst <= lim('A6.centroidShiftAnalytic').maxRelativeError,
      {
        maxRelativeError: worst,
        cases: out,
      }
    );
  }
  // A7
  {
    const V = ['pass', 'fail', 'inconclusive'];
    let bad = 0;
    for (const a of V)
      for (const b of V)
        for (const c of V) {
          const o = K.overallOf([a, b, c]);
          const exp = [a, b, c].includes('fail')
            ? 'rejected'
            : [a, b, c].every(v => v === 'pass')
              ? 'survives'
              : 'undecided';
          if (o !== exp || !K.OVERALL.includes(o)) bad++;
        }
    row('A7.verdictLogic', bad === lim('A7.verdictLogic').mismatches, {
      mismatches: bad,
    });
  }
}

// ---- b: the oracle ----------------------------------------------------------------------

function legB() {
  for (const [id, name] of [
    ['B1.oracleBlendLightCurve', 'blend'],
    ['B2.oracleCleanLightCurve', 'clean'],
  ]) {
    const c = ORA.lightCurves[name];
    const t = Float64Array.from(
      { length: c.y.length },
      (_, i) => i * c.cadence
    );
    const s = {
      t,
      y: Float64Array.from(c.y),
      dy: new Float64Array(c.y.length).fill(c.sigma),
    };
    const eph = c.ephemeris;
    const oe = K.oddEvenTest(s, eph);
    const sc = K.secondaryTest(s, eph);
    let dd = 0;
    let ds = 0;
    const cmp = (a, b) => {
      dd = Math.max(dd, Math.abs(a.depth - b.depth));
      ds = Math.max(ds, rel(a.sigma, b.sigma));
    };
    cmp(oe.odd, c.oddEven.odd);
    cmp(oe.even, c.oddEven.even);
    cmp(sc.secondary, c.secondary.secondary);
    cmp(sc.primary, c.secondary.primary);
    const same =
      oe.verdict === c.oddEven.verdict && sc.verdict === c.secondary.verdict;
    const L = lim(id);
    row(
      id,
      dd <= L.maxAbsDepthDifference &&
        ds <= L.maxRelativeSigmaDifference &&
        same,
      {
        maxAbsDepthDifference: dd,
        maxRelativeSigmaDifference: ds,
        verdicts: {
          kernel: [oe.verdict, sc.verdict],
          oracle: [c.oddEven.verdict, c.secondary.verdict],
        },
      }
    );
  }
  let dp = 0;
  let ds = 0;
  let same = true;
  const per = {};
  for (const [name, f] of Object.entries(ORA.frames)) {
    const fr = {
      width: 17,
      height: 17,
      times: Float64Array.from(f.times),
      images: f.images.map(a => Float64Array.from(a)),
    };
    const d = K.differenceCentroid(fr, f.ephemeris, f.target);
    const o = f.result;
    dp = Math.max(
      dp,
      Math.abs(d.offset.dx - o.offset.dx),
      Math.abs(d.offset.dy - o.offset.dy)
    );
    ds = Math.max(ds, rel(d.sigma.x, o.sigma.x), rel(d.sigma.y, o.sigma.y));
    if (d.verdict !== o.verdict) same = false;
    per[name] = { kernel: d.verdict, oracle: o.verdict, r: [d.r, o.r] };
  }
  const L = lim('B3.oracleFrames');
  row(
    'B3.oracleFrames',
    dp <= L.maxPositionDifferencePx &&
      ds <= L.maxRelativeSigmaDifference &&
      same,
    {
      maxPositionDifferencePx: dp,
      maxRelativeSigmaDifference: ds,
      cases: per,
    }
  );
}

// ---- c: ensembles -----------------------------------------------------------------------

export const RATES = {};

function legC() {
  const N = 400;
  const lcRun = (kind, sigma, id, extra = {}) => {
    const out = [];
    for (let i = 0; i < N; i++) {
      const c = K.candidate({ kind, sigma, seed: seeded(id, i), ...extra });
      out.push({
        oe: K.oddEvenTest(c, c.ephemeris),
        sec: K.secondaryTest(c, c.ephemeris),
        c,
      });
    }
    return out;
  };
  const planet = lcRun('planet', K.CANDIDATE.sigmaWell, 'C1');
  const tp = tally(planet, x => x.oe.verdict);
  const L1 = lim('C1.oddEvenFalseRejection');
  row(
    'C1.oddEvenFalseRejection',
    frac(tp, 'fail') <= L1.failMax && frac(tp, 'pass') >= L1.passMin,
    {
      fail: frac(tp, 'fail'),
      pass: frac(tp, 'pass'),
      n: N,
    }
  );
  const blend = lcRun('blend-alternating', K.CANDIDATE.sigmaWell, 'C2');
  const tb = tally(blend, x => x.oe.verdict);
  const L2 = lim('C2.oddEvenFalseAcceptance');
  row(
    'C2.oddEvenFalseAcceptance',
    frac(tb, 'pass') <= L2.passMax && frac(tb, 'fail') >= L2.failMin,
    {
      pass: frac(tb, 'pass'),
      fail: frac(tb, 'fail'),
      n: N,
    }
  );
  const low = lcRun('planet', K.CANDIDATE.sigmaLow, 'C3');
  const tlo = tally(low, x => x.oe.verdict);
  const tls = tally(low, x => x.sec.verdict);
  const L3 = lim('C3.lowPowerNeverPasses');
  row(
    'C3.lowPowerNeverPasses',
    tlo.pass === 0 &&
      tls.pass === 0 &&
      frac(tlo, 'fail') <= L3.failMax &&
      frac(tls, 'fail') <= L3.failMax,
    { oddEven: tlo, secondary: tls }
  );
  const ebs = lcRun('eb-secondary', K.CANDIDATE.sigmaWell, 'C4');
  const tes = tally(ebs, x => x.sec.verdict);
  const tps = tally(planet, x => x.sec.verdict);
  const L4 = lim('C4.secondaryRates');
  row(
    'C4.secondaryRates',
    frac(tes, 'fail') >= L4.ebFailMin &&
      frac(tps, 'fail') <= L4.planetFailMax &&
      frac(tps, 'pass') >= L4.planetPassMin,
    { eb: tes, planet: tps }
  );
  // C5 coverage
  {
    const eps = 0.15;
    const clean = K.cleanCandidate('planet', { eps });
    const od = K.truthDepth(clean, { select: c => Math.abs(c) % 2 === 1 });
    const ev = K.truthDepth(clean, { select: c => Math.abs(c) % 2 === 0 });
    const truth = od.depth - ev.depth;
    let inside = 0;
    for (let i = 0; i < 800; i++) {
      const c = K.candidate({ kind: 'planet', eps, seed: seeded('C5', i) });
      const o = K.oddEvenTest(c, c.ephemeris);
      if (Math.abs(o.difference - truth) < o.sigma) inside++;
    }
    const cov = inside / 800;
    const L = lim('C5.differenceCoverage');
    row('C5.differenceCoverage', cov >= L.coverageMin && cov <= L.coverageMax, {
      coverage: cov,
      truth,
      n: 800,
    });
  }
  // C6 and C7
  {
    const run = (spec, id, n = 60) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const fr = K.transitFrames({ seed: seeded(id, i), ...spec });
        out.push({ fr, d: K.differenceCentroid(fr, fr.ephemeris, fr.target) });
      }
      return out;
    };
    const on = run({ eclipsed: 'target' }, 'C6on');
    const bl = run({ eclipsed: 'neighbour' }, 'C6bl');
    const lo = run({ eclipsed: 'target', rate: 200 }, 'C6lo');
    const ton = tally(on, x => x.d.verdict);
    const tbl = tally(bl, x => x.d.verdict);
    const tlo2 = tally(lo, x => x.d.verdict);
    const L = lim('C6.centroidRates');
    row(
      'C6.centroidRates',
      frac(ton, 'fail') <= L.onTargetFailMax &&
        frac(ton, 'pass') >= L.onTargetPassMin &&
        frac(tbl, 'fail') >= L.blendFailMin &&
        frac(tbl, 'pass') <= L.blendPassMax &&
        tlo2.pass === 0 &&
        frac(tlo2, 'inconclusive') >= L.lowPowerInconclusiveMin,
      { onTarget: ton, blend: tbl, lowPower: tlo2 }
    );
    let inside = 0;
    let total = 0;
    for (const x of [...on, ...bl]) {
      const at = x.fr.truth.eclipsedAt;
      if (!x.d.dic) continue;
      if (Math.abs(x.d.dic.x - at.x) < x.d.sigma.x) inside++;
      if (Math.abs(x.d.dic.y - at.y) < x.d.sigma.y) inside++;
      total += 2;
    }
    const cov = inside / total;
    const L7 = lim('C7.centroidCoverage');
    row('C7.centroidCoverage', cov >= L7.coverageMin && cov <= L7.coverageMax, {
      coverage: cov,
      values: total,
    });
    RATES.frames = { onTarget: ton, blend: tbl, lowPower: tlo2 };
    // C8: reported blind spots
    const close = run({ eclipsed: 'neighbour', separation: 0.15 }, 'C8cl', 60);
    const tcl = tally(close, x => x.d.verdict);
    const twin = lcRun('blend-twin', K.CANDIDATE.sigmaWell, 'C8tw');
    const ttw = tally(twin, x => x.oe.verdict);
    const tts = tally(twin, x => x.sec.verdict);
    const marg = lcRun('planet', K.CANDIDATE.sigmaWell, 'C8m', { eps: 0.1 });
    const tmg = tally(marg, x => x.oe.verdict);
    // an eccentric binary's secondary at phase 0.595, searched at 0.5
    const ecc = [];
    for (let i = 0; i < 200; i++) {
      const c = K.candidate({
        kind: 'eb-secondary',
        seed: seeded('C8e', i),
        binary: { ecosw: 0.15, esinw: 0 },
      });
      ecc.push(K.secondaryTest(c, c.ephemeris));
    }
    const tec = tally(ecc, x => x.verdict);
    // AM1: the twin above keeps the blend's two limb-darkening laws; with one law the two eclipses are equal
    const twinEq = lcRun('blend-twin', K.CANDIDATE.sigmaWell, 'C8te', {
      binary: { ldB: [0.4, 0.22] },
    });
    const tte = tally(twinEq, x => x.oe.verdict);
    const tteS = tally(twinEq, x => x.sec.verdict);
    // The power ladder: the odd-even verdicts of a planet and of a planet whose odd and even depths differ by 20 per cent, by noise per point
    const ladder = [0.0004, 0.002, 0.006, 0.012, 0.032].map(sg => {
      const mk = (eps, id) => {
        const list = [];
        for (let i = 0; i < 200; i++) {
          const c = K.candidate({
            kind: 'planet',
            sigma: sg,
            eps,
            seed: seeded(id, i),
          });
          list.push(K.oddEvenTest(c, c.ephemeris));
        }
        return list;
      };
      const same = tally(mk(0, 'C8la'), x => x.verdict);
      const diff = tally(mk(0.1, 'C8lb'), x => x.verdict);
      const power =
        mk(0, 'C8lc')
          .slice(0, 20)
          .reduce((a, x) => a + x.minDetectableDifference / x.meanDepth, 0) /
        20;
      return {
        sigmaPoint: sg,
        equalDepths: same,
        twentyPercent: diff,
        minDetectableShareOfDepth: power,
      };
    });
    report(
      'C8.blindSpotsReported',
      {
        twinOddEven: ttw,
        twinSecondary: tts,
        differenceTwentyPercentOddEven: tmg,
        centroidBlendClose: tcl,
        eccentricSecondaryAtHalfPhase: tec,
        twinEqualLimbDarkeningOddEven: tte,
        twinEqualLimbDarkeningSecondary: tteS,
        powerLadder: ladder,
      },
      'twins pass by construction; a difference of 20 per cent of the depth is below what the test excludes; a neighbour 0.15 px away is inside the exclusion radius; a secondary away from phase 0.5 is not searched'
    );
    RATES.oddEven = {
      planet: tp,
      blendAlternating: tb,
      lowPower: tlo,
      differenceTwentyPercent: tmg,
      twin: ttw,
      twinEqualLimbDarkening: tte,
      powerLadder: ladder,
    };
    RATES.secondary = {
      planet: tps,
      binary: tes,
      lowPower: tls,
      twin: tts,
      twinEqualLimbDarkening: tteS,
      eccentricAtHalfPhase: tec,
    };
  }
}

// ---- d: refusals ------------------------------------------------------------------------

function legD() {
  // D1
  {
    const c = K.candidate({ kind: 'planet', seed: seeded('D1', 0) });
    const only1 = { ...c, y: c.y };
    // one odd cycle: keep the data of cycles 0, 1, 2, 4, 6, 8 (cycle 1 is the only odd one)
    const keep = [];
    for (let i = 0; i < c.t.length; i++) {
      const n = Math.round((c.t[i] - 0.5) / 3.2);
      if (n % 2 === 0 || n === 1) keep.push(i);
    }
    const s1 = {
      t: keep.map(i => c.t[i]),
      y: keep.map(i => c.y[i]),
      dy: keep.map(i => c.dy[i]),
    };
    const a = K.oddEvenTest(s1, c.ephemeris);
    const keep2 = [];
    for (let i = 0; i < c.t.length; i++) {
      const ph = ((((c.t[i] - 0.5) / 3.2) % 1) + 1) % 1;
      if (Math.abs(ph - 0.5) > 0.12) keep2.push(i);
    }
    const s2 = {
      t: keep2.map(i => c.t[i]),
      y: keep2.map(i => c.y[i]),
      dy: keep2.map(i => c.dy[i]),
    };
    const b = K.secondaryTest(s2, c.ephemeris);
    row(
      'D1.tooFewTransits',
      a.verdict === 'inconclusive' &&
        a.reason === 'too-few-transits' &&
        b.verdict === 'inconclusive' &&
        b.reason === 'no-coverage',
      {
        oddEven: [a.verdict, a.reason],
        secondary: [b.verdict, b.reason],
        unused: only1 === only1,
      }
    );
  }
  // D2
  {
    const t = K.candidateTimes();
    const eph = { P: 3.2, t0: 0.5, duration: 0.12 };
    const rng = lcg('D2');
    const gauss = () =>
      Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
    let pass = 0;
    let fail = 0;
    for (let i = 0; i < 200; i++) {
      const y = Float64Array.from(t, () => 1 + 0.0004 * gauss());
      const o = K.oddEvenTest(
        { t, y, dy: new Float64Array(t.length).fill(0.0004) },
        eph
      );
      if (o.verdict === 'pass') pass++;
      if (o.verdict === 'fail') fail++;
    }
    const L = lim('D2.noSignal');
    row('D2.noSignal', pass <= L.passMax && fail <= L.failMax, {
      pass,
      fail,
      n: 200,
    });
  }
  // D3
  {
    const fewSpec = K.transitFrames({
      seed: seeded('D3', 0),
      eclipsed: 'target',
      times: Float64Array.from([
        0.5, 0.51, 3.7, 3.71, 0.2, 0.25, 0.3, 0.8, 0.85, 0.9, 3.4, 3.45, 3.0,
        3.1, 5.0, 5.1,
      ]),
    });
    const few = K.differenceCentroid(
      fewSpec,
      fewSpec.ephemeris,
      fewSpec.target
    );
    let falseRej = 0;
    let largePass = 0;
    const n = 60;
    for (let i = 0; i < n; i++) {
      // no eclipse: the eclipsed star's light constant (depth 0)
      const fr = K.transitFrames({
        seed: seeded('D3', i + 1),
        eclipsed: 'target',
        depth: 0,
      });
      const d = K.differenceCentroid(fr, fr.ephemeris, fr.target);
      if (d.verdict === 'fail') falseRej++;
      if (
        d.verdict === 'pass' &&
        d.exclusionRadius > d.thresholds.requiredExclusionPx
      )
        largePass++;
    }
    const fr = K.transitFrames({ seed: seeded('D3', 99), eclipsed: 'target' });
    const edge = K.differenceCentroid(fr, fr.ephemeris, { x: 1, y: 1 });
    const L = lim('D3.frameRefusals');
    row(
      'D3.frameRefusals',
      few.verdict === 'inconclusive' &&
        few.reason === 'too-few-frames' &&
        falseRej / n <= L.falseRejectionMax &&
        largePass === L.passWithLargeExclusion &&
        edge.verdict === 'inconclusive',
      {
        few: few.reason,
        falseRejections: falseRej,
        largeExclusionPasses: largePass,
        edge: [edge.verdict, edge.reason],
      }
    );
  }
  // D4
  {
    const c = K.candidate({ kind: 'planet', seed: seeded('D4', 0) });
    const calls = [
      () => K.oddEvenTest(c, { P: 3.2, t0: 0.5, duration: 1.7 }),
      () => K.oddEvenTest(c, { P: -1, t0: 0.5, duration: 0.1 }),
      () => K.oddEvenTest({ y: c.y }, c.ephemeris),
      () =>
        K.secondaryTest(
          { t: c.t.slice(0, 10), y: c.y.slice(0, 11) },
          c.ephemeris
        ),
      () => K.oddEvenTest(c, undefined),
    ];
    let named = 0;
    for (const f of calls) {
      try {
        f();
      } catch (e) {
        if (
          (e instanceof TypeError || e instanceof RangeError) &&
          /the |period|duration|series|ephemeris/i.test(e.message)
        )
          named++;
      }
    }
    row('D4.invalidInputs', named === calls.length, {
      threw: named,
      of: calls.length,
    });
  }
  // D5
  {
    let violations = 0;
    let n = 0;
    const kinds = ['planet', 'blend-alternating', 'blend-twin', 'eb-secondary'];
    for (const kind of kinds)
      for (const sigma of [K.CANDIDATE.sigmaWell, K.CANDIDATE.sigmaLow])
        for (let i = 0; i < 10; i++) {
          const c = K.candidate({ kind, sigma, seed: seeded('D5', i) });
          const fr = K.transitFrames({
            seed: seeded('D5f', i),
            eclipsed: i % 2 ? 'target' : 'neighbour',
            rate: i % 3 ? 3000 : 200,
          });
          for (const s of [
            K.vet({ series: c, ephemeris: c.ephemeris }),
            K.vet({ series: c, ephemeris: c.ephemeris, frames: fr }),
          ]) {
            n++;
            const text = JSON.stringify(K.vettingRecord(s)) + s.overall;
            if (!K.OVERALL.includes(s.overall)) violations++;
            if (s.overall === 'survives' && s.counts.inconclusive > 0)
              violations++;
            if (
              /validated|confirmed/i.test(s.overall) ||
              /"overall":"planet"/.test(text)
            )
              violations++;
          }
        }
    row(
      'D5.summaryNeverPlanet',
      violations === lim('D5.summaryNeverPlanet').violations,
      { violations, summaries: n }
    );
  }
}

// ---- e: authentic -----------------------------------------------------------------------

async function legE() {
  let obs;
  try {
    const { openTargets } = await import('./exoplanet-reference.mjs');
    const { SUITE } = await import('../js/observatory/guides/exoplanet.js');
    const { seriesOf } = await import('../js/observatory/guides/core.js');
    const { bestEpoch } = await import('../js/observatory/guides/science.js');
    obs = { openTargets, SUITE, seriesOf, bestEpoch };
  } catch (e) {
    notRun(
      'E1.authenticHd209458',
      `the Observatory's loaders did not import: ${e.message}`
    );
    notRun('E2.authenticKepler13', 'same');
    return;
  }
  const targets = await obs.openTargets(obs.SUITE.TARGETS);
  for (const [id, target, P, T14h, tag] of [
    [
      'E1.authenticHd209458',
      'hd209458',
      3.52474859,
      3.1,
      'HD 209458, TESS sector 56',
    ],
    [
      'E2.authenticKepler13',
      'kepler13-sap',
      1.763588,
      3.3,
      'Kepler-13, TESS sector 14, SAP',
    ],
  ]) {
    const s = obs.seriesOf(targets[target]);
    const epoch = obs.bestEpoch(s, { period: P, duration: 0.14 });
    const eph = { P, t0: epoch, duration: T14h / 24 };
    // The flux is normalised by its median so the baseline is 1.
    const med = [...s.y].sort((a, b) => a - b)[s.y.length >> 1];
    const ser = {
      t: s.t,
      y: s.y.map(v => v / med),
      dy: s.dy ? s.dy.map(v => v / med) : null,
    };
    if (!ser.dy) delete ser.dy;
    const oe = K.oddEvenTest(ser, eph);
    const sec = K.secondaryTest(ser, eph);
    const fails = [oe, sec].filter(x => x.verdict === 'fail').length;
    row(id, fails <= lim(id).failMax, {
      data: tag,
      ephemeris: eph,
      oddEven: {
        verdict: oe.verdict,
        reason: oe.reason,
        difference: oe.difference,
        sigma: oe.sigma,
        z: oe.z,
        power: oe.minDetectableDifference,
        depth: oe.meanDepth,
      },
      secondary: {
        verdict: sec.verdict,
        reason: sec.reason,
        depth: sec.depth,
        sigma: sec.sigma,
        ratio: sec.ratio,
      },
    });
  }
}

// ---- run ----------------------------------------------------------------------------------

const args = process.argv.slice(2);
const only = (
  args.find(a => a.startsWith('--only='))?.slice(7) ??
  (args.includes('--only') ? args[args.indexOf('--only') + 1] : null)
)?.split(',');
const wants = leg =>
  !only || only.some(p => leg.startsWith(p) || p.startsWith(leg));
const t0 = Date.now();
if (wants('A')) legA();
if (wants('B')) legB();
if (wants('C')) legC();
if (wants('D')) legD();
if (wants('E')) await legE();

const failed = rows.filter(r => r.status === 'fail');
if (args.includes('--json')) console.log(JSON.stringify(rows, null, 1));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${r.id.padEnd(30)} ${JSON.stringify(r.measured).slice(0, 220)}`
    );
  console.log(
    `${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'report').length} report, ${rows.filter(r => r.status === 'not-run').length} not run (${Math.round((Date.now() - t0) / 1000)} s)`
  );
}
if (args.includes('--write-results')) {
  const w = (f, o) =>
    writeFileSync(path.join(ROOT, FIX, f), JSON.stringify(o, null, 2) + '\n');
  w('results.json', { rows });
  w('failed-legs.json', {
    note: 'Legs of tests/fixtures/vetting/thresholds.json that crossed their bound, kept failing and labelled (only Carl resets a bound).',
    failed: failed.map(r => ({
      id: r.id,
      status: 'fail',
      measured: r.measured,
      note: r.note,
      reason: '',
    })),
    notRun: rows
      .filter(r => r.status === 'not-run')
      .map(r => ({ id: r.id, why: r.note })),
  });
  if (RATES.oddEven) {
    const prettier = await import('prettier');
    const source = `// GENERATED by tools/vetting-validate.mjs --write-results from the ensembles of
// tests/fixtures/vetting/thresholds.json (C1 to C6, C8); do not edit. The rates the
// student is shown: what the committed thresholds do on a seeded ensemble of each
// kind of candidate (VETTING.md). Counts, not rates: n is the ensemble size.
export const RATES = ${JSON.stringify(RATES, null, 2)};
`;
    const config = (await prettier.resolveConfig(path.join(ROOT, 'js/kernels/vetting/rates.js'))) ?? {};
    writeFileSync(
      path.join(ROOT, 'js/kernels/vetting/rates.js'),
      await prettier.format(source, { ...config, parser: 'babel' })
    );
  }
}
process.exit(failed.length ? 1 : 0);
