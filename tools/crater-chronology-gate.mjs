#!/usr/bin/env node
// The crater-chronology gate's spike harness (Prompt 196, part A). NEVER MERGED.
// Reads the committed thresholds, implements the lunar production and chronology
// functions as the contract states them, runs the legs that need no data, and
// writes tests/fixtures/crater-chronology-gate/record.json. R1 to R3, O2 and I1
// are written NOT RUN: their data are not in the repository.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chi2Quantile } from '../js/kernels/statistics/special.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'tests/fixtures/crater-chronology-gate');
const TH = JSON.parse(readFileSync(path.join(FIX, 'thresholds.json'), 'utf8'));
const OR = JSON.parse(readFileSync(path.join(FIX, 'oracle-results.json'), 'utf8'));
const FR = JSON.parse(readFileSync(path.join(ROOT, 'frames/craters-regions.json'), 'utf8'));

const F = TH.functions;
const A = F.lunarProduction.a;
const [DLO, DHI] = F.lunarProduction.domainKm;
const { c1, lambda: LAM, c2 } = F.lunarChronology;
const T_MAX = 4.5;
const T_CAL = F.lunarChronology.calibratedToGa;
const F_SAT = F.saturation.flagFraction;
const D_SEC = F.secondaries.minimumDiameterKm;
const MIN_N = 5;

// ---- the functions ------------------------------------------------------------
export const pf = D => {
  const L = Math.log10(D);
  let s = 0;
  for (let k = A.length - 1; k >= 0; k--) s = s * L + A[k];
  return 10 ** s;
};
export const n1 = T => c1 * Math.expm1(LAM * T) + c2 * T;
/** T with n1(T) = N, by bisection; Infinity above the chronology's value at 4.5 Ga. */
export function ageOf(N) {
  if (N <= 0) return 0;
  if (N > n1(T_MAX)) return Infinity;
  let lo = 0;
  let hi = T_MAX;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (n1(mid) < N) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export function garwood(n, level = 0.95) {
  const al = 1 - level;
  return {
    lo: n === 0 ? 0 : chi2Quantile(al / 2, 2 * n) / 2,
    hi: chi2Quantile(1 - al / 2, 2 * (n + 1)) / 2,
  };
}
const refuse = (code, why) => ({ status: 'refused', code, why });
/** The age of a count: a named status and no number unless every rule passes. */
export function chronologyAge({ n, area, dMin, body = 'moon', level = 0.95 }) {
  if (body !== 'moon') return refuse('mars', 'no returned sample anchors the Martian chronology');
  if (!(Number.isInteger(n) && n >= 0)) return refuse('count', 'the count is not a whole number of at least 0');
  if (!(Number.isFinite(area) && area > 0)) return refuse('area', 'the area is not positive');
  if (!(Number.isFinite(dMin) && dMin >= DLO && dMin <= DHI)) return refuse('diameter', 'the diameter is outside the production function');
  if (dMin < D_SEC) return refuse('secondaries', 'craters under 1 km include secondaries');
  if (n < MIN_N) return refuse('tooFew', 'fewer than five craters');
  const f = pf(1) / pf(dMin);
  const iv = garwood(n, level);
  const N1 = (n / area) * f;
  if (N1 > n1(T_MAX)) return { status: 'refused', code: 'beyondChronology', why: 'older than the chronology function reaches' };
  if (n / area > F_SAT * 1.54 * dMin ** -2) return refuse('saturated', 'at or near equilibrium: a lower limit, not an age');
  const age = ageOf(N1);
  return {
    status: 'ok',
    age,
    lo: ageOf((iv.lo / area) * f),
    hi: ageOf((iv.hi / area) * f),
    flags: age > T_CAL ? ['extrapolated'] : [],
  };
}

// ---- seeded draws -------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function poisson(rng, mean) {
  let n = 0;
  let m = mean;
  while (m > 0) {
    const part = Math.min(m, 400);
    m -= part;
    const L = Math.exp(-part);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L);
    n += k - 1;
  }
  return n;
}

const rows = [];
const add = (id, measured, bound, pass, extra = {}) => rows.push({ id, measured, bound, pass, ...extra });
const rel = (x, y) => Math.abs(x - y) / Math.abs(y);

// F1
{
  const b = TH.legs;
  add('F1.a0', rel(10 ** A[0], c2), b['F1.a0'].bounds.relativeDifference, rel(10 ** A[0], c2) <= b['F1.a0'].bounds.relativeDifference);
  let worst = 0;
  for (const T of OR.T) worst = Math.max(worst, rel(ageOf(n1(T)), T));
  add('F1.inverse', worst, b['F1.inverse'].bounds.relative, worst <= b['F1.inverse'].bounds.relative);
  let v = 0;
  let prev = Infinity;
  for (let i = 0; i < 400; i++) {
    const D = DLO * (DHI / DLO) ** (i / 399);
    const y = pf(D);
    if (!(y < prev)) v++;
    prev = y;
  }
  prev = -Infinity;
  for (let i = 0; i < 400; i++) {
    const y = n1(0.01 + (T_MAX - 0.01) * (i / 399));
    if (!(y > prev)) v++;
    prev = y;
  }
  add('F1.monotone', v, b['F1.monotone'].bounds.violations, v === 0);
  // against the independent implementation
  let mx = 0;
  const upd = (x, y) => {
    if (Number.isFinite(y) || Number.isFinite(x)) mx = Math.max(mx, y === 0 ? Math.abs(x) : rel(x, y));
  };
  OR.D.forEach((D, i) => upd(pf(D), OR.pf[i]));
  OR.T.forEach((T, i) => {
    upd(n1(T), OR.n1[i]);
    upd(ageOf(n1(T)), OR.inverse[i]);
  });
  for (const dm of ['1.0', '3.0']) {
    const blk = OR.intervals[dm];
    const f = pf(1) / pf(Number(dm));
    upd(f, blk.factor);
    for (const r of blk.rows) {
      const g = garwood(r.n);
      upd(g.lo, r.lo || 0);
      upd(g.hi, r.hi);
      const lo = ageOf((g.lo / OR.area) * f);
      const hi = ageOf((g.hi / OR.area) * f);
      const pt = ageOf((r.n / OR.area) * f);
      if (Number.isFinite(r.ageHi) || Number.isFinite(hi)) upd(hi, r.ageHi);
      upd(lo, r.ageLo);
      upd(pt, r.agePoint);
    }
  }
  add('F1.oracle', mx, b['F1.oracle'].bounds.maxRelative, mx <= b['F1.oracle'].bounds.maxRelative);
}

// F2
{
  const cells = [];
  let cell = 0;
  for (const T0 of [0.5, 1, 2, 3, 3.5, 3.9])
    for (const area of [2e4, 2e5])
      for (const dMin of [1, 3]) {
        const rng = mulberry32(196 * 1000 + cell++);
        const f = pf(1) / pf(dMin);
        const mean = (area * n1(T0)) / f;
        let cov = 0;
        const trials = 4000;
        for (let t = 0; t < trials; t++) {
          const n = poisson(rng, mean);
          const g = garwood(n);
          const lo = ageOf((g.lo / area) * f);
          const hi = ageOf((g.hi / area) * f);
          if (lo <= T0 && T0 <= hi) cov++;
        }
        cells.push({ T0, area, dMin, mean, coverage: cov / trials });
      }
  const min = Math.min(...cells.map(c => c.coverage));
  add('F2.coverage', min, TH.legs['F2.coverage'].bounds.perCellMinimum, min >= TH.legs['F2.coverage'].bounds.perCellMinimum, { cells });
}

// F3
{
  const cases = [
    ['secondaries', { n: 100, area: 2e5, dMin: 0.5 }],
    ['tooFew', { n: 3, area: 2e5, dMin: 1 }],
    ['saturated', { n: 6, area: 100, dMin: 2 }],
    ['beyondChronology', { n: 0, area: 3.8e7, dMin: 100 }],
    ['count', { n: 2.5, area: 2e5, dMin: 1 }],
    ['count', { n: -1, area: 2e5, dMin: 1 }],
    ['diameter', { n: 20, area: 2e5, dMin: 500 }],
    ['diameter', { n: 20, area: 2e5, dMin: 0.005 }],
    ['mars', { n: 100, area: 5e5, dMin: 20, body: 'mars' }],
  ];
  // the beyond case needs a count that puts N1 above n1(4.5) without being refused first
  const D = 100;
  const nBeyond = Math.ceil((2 * n1(T_MAX) * 3.8e7 * pf(D)) / pf(1));
  cases[3][1].n = nBeyond;
  let aged = 0;
  const detail = cases.map(([want, o]) => {
    const r = chronologyAge(o);
    if (r.status === 'ok' || r.age !== undefined) aged++;
    return { want, got: r.code ?? r.status, ok: r.code === want && r.age === undefined, n: o.n, dMin: o.dMin };
  });
  const wrongName = detail.filter(d => !d.ok).length;
  add('F3.refusals.cases', aged + wrongName, 0, aged + wrongName === 0, { detail, nBeyond });
  const rng = mulberry32(196 * 7);
  let flagged = 0;
  const N = 500;
  for (let i = 0; i < N; i++) {
    const T0 = [0.5, 1, 2, 3, 3.5][i % 5];
    const f = pf(1) / pf(1);
    const n = poisson(rng, 2e5 * n1(T0) * f);
    const r = chronologyAge({ n, area: 2e5, dMin: 1 });
    if (r.status !== 'ok' || r.flags.length) flagged++;
  }
  add('F3.refusals.control', flagged / N, TH.legs['F3.refusals'].bounds.controlRefusalRateMaximum, flagged / N <= TH.legs['F3.refusals'].bounds.controlRefusalRateMaximum);
}

// O1
{
  const bound = TH.legs['O1.feasible'].bounds.expectedCountMinimumAt3_5Ga;
  for (const [k, r] of Object.entries(FR.regions)) {
    if (r.body !== 'moon') continue;
    const dMin = Math.max(8 * r.geometry.kmPerPixelAtCentre, 1);
    const exp = (r.areaKm2 * pf(dMin) * n1(3.5)) / pf(1);
    const o = OR.o1[k];
    add(`O1.${k}`, exp, bound, exp >= bound, { dMin, area: r.areaKm2, oracle: o.expectedAt3_5, relDiffOracle: rel(exp, o.expectedAt3_5) });
  }
}

// not run
const notRun = {
  'R1.sites': 'the sample ages and published counts at the returned-sample sites are not in the repository (data requests R0 to R2); nothing was downloaded and no value was typed from memory',
  'R2.coverage': 'needs the same sample ages and published counts as R1, and the RMS misfit R1 measures (data requests R0 to R2)',
  'R3.recount': 'needs a published recount made after 2001 at two or more sample sites; none is in hand (data request R2)',
  'O2.own': 'no person has marked craters on the committed frames (R5); nothing is simulated',
  'I1.completeness': 'needs a recognition function measured on crater-like injections and a person or detector to recover them (R5, R2)',
};
const out = {
  format: 'gravitas.crater-chronology-gate-record/1',
  prompt: 196,
  node: process.version,
  corrections: [
    'F3 case 3 (saturated) was first written n = 50, area 100 km^2, dMin 2 km; it returned beyondChronology, because that surface is also older than the chronology reaches, so the case did not isolate its rule. Replaced by n = 6, area 100 km^2, dMin 2 km (N1 below the chronology at 4.5 Ga, density above 3 percent of geometric saturation). The first run is the only one with the old case; no bound moved.',
  ],
  rows,
  notRun,
};
writeFileSync(path.join(FIX, 'record.json'), JSON.stringify(out, null, 1) + '\n');
for (const r of rows) console.log(r.pass ? 'pass' : 'FAIL', r.id, r.measured, 'bound', JSON.stringify(r.bound));
