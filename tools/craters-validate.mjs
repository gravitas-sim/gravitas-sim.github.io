#!/usr/bin/env node
// =============================================================================
// Crater counting against its committed thresholds (Prompt 195)
// -----------------------------------------------------------------------------
//   npm run craters:validate               print the table
//   npm run craters:validate -- --json     print it as JSON
//
// tests/fixtures/craters/thresholds.json fixed every bound before
// js/measure/craters.js had been run (CRATER_COUNTING.md, "The validation
// contract"). This runs the checks against the production module and judges them
// against those bounds, read from the file and not copied. tests/craters.test.js
// runs it in plain Node (Jest's VM makes Math reads about ten times slower, so an
// ensemble there would time the harness) and asserts every row.
//
// The oracle's rows read the list and results pinned in tests/fixtures/craters/
// (scipy, numpy: no Gravitas code). Tier b4 (a crater-statistics tool's curve) and
// tier e (the reference regions' published counts) are reported NOT RUN. The
// ensembles draw from named streams of js/random/streams.js; nothing stores a
// value that passes through a trigonometric function.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  clopperPearson,
  cumulative,
  diameterOf,
  powerLaw,
  regionArea,
  relativeAge,
  stretch,
} from '../js/measure/craters.js';
import { chi2Quantile } from '../js/kernels/statistics/special.js';
import { stream, gaussian } from '../js/random/streams.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/craters');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const C = THRESHOLDS.checks;
const R = THRESHOLDS.rules;
const ORACLE = read('oracle-results.json');
const SEED = 'craters-195';
const TRIALS = R.ensembleTrials;

const rows = [];
const row = (id, measured, bound, pass, note = '') =>
  rows.push({ id, measured, bound, pass, note });
const notRun = (id, note) =>
  rows.push({ id, measured: null, pass: null, note });
const within = (id, measured, bound, note) =>
  row(id, measured, bound, Math.abs(measured) <= bound, note);
const inBand = (id, measured, [lo, hi], note) =>
  row(id, measured, [lo, hi], measured >= lo && measured <= hi, note);
const atLeast = (id, measured, bound, note) =>
  row(id, measured, bound, measured >= bound, note);
const atMost = (id, measured, bound, note) =>
  row(id, measured, bound, measured <= bound, note);
const rel = (a, b) => Math.abs(a - b) / (Math.abs(b) || 1);
const relOrAbs = (a, b) => (b === 0 ? Math.abs(a) : rel(a, b));

/** A draw from the check's own stream. */
const rng = (...labels) => stream('noise', SEED, ...labels);
/** A Poisson count of mean m by inversion of the cumulative sum. */
function poisson(m, u) {
  let k = 0;
  let p = Math.exp(-m);
  let c = p;
  while (u > c && k < 10000) {
    k++;
    p *= m / k;
    c += p;
  }
  return k;
}
/** n copies of a diameter, plus one below dMin so the list is never empty. */
const listOf = (n, D = 2) => [...new Array(n).fill(D), 0.5];

// ---- (a) analytic ---------------------------------------------------------------

const logChoose = (n, k) => {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i);
  return s;
};
const poissonCdf = (k, lam) => {
  let s = 0;
  let term = Math.exp(-lam);
  for (let i = 0; i <= k; i++) {
    s += term;
    term *= lam / (i + 1);
  }
  return s;
};
const binomPmf = (n, k, p) =>
  Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
const binomLe = (n, k, p) => {
  let s = 0;
  for (let i = 0; i <= k; i++) s += binomPmf(n, i, p);
  return s;
};

function analytic() {
  const a1 = C['a1.garwood.closed'].bounds;
  for (const lv of [0.6827, 0.95])
    for (const A of [1, 250]) {
      const alpha = (1 - lv) / 2;
      const tag = `L${lv}.A${A}`;
      const z = cumulative(listOf(0), { area: A, thresholds: [1], level: lv })
        .rows[0];
      within(`a1.zero.hi.${tag}`, rel(z.hi, -Math.log(alpha) / A), a1.relative);
      within(`a1.zero.lo.${tag}`, z.lo, 0);
      const one = cumulative(listOf(1), { area: A, thresholds: [1], level: lv })
        .rows[0];
      within(
        `a1.one.lo.${tag}`,
        rel(one.lo, -Math.log(1 - alpha) / A),
        a1.relative
      );
      for (const N of [1, 2, 5, 20]) {
        const r = cumulative(listOf(N), { area: A, thresholds: [1], level: lv })
          .rows[0];
        within(
          `a1.hi.N${N}.${tag}`,
          Math.abs(poissonCdf(N, r.hi * A) - alpha),
          a1.equationResidualAbsolute
        );
        if (N >= 2)
          within(
            `a1.lo.N${N}.${tag}`,
            Math.abs(1 - poissonCdf(N - 1, r.lo * A) - alpha),
            a1.equationResidualAbsolute
          );
      }
    }

  // a2: the hand-made table
  const a2 = C['a2.cumulative.hand'].bounds;
  const hand = cumulative([30, 20, 20, 15, 10, 10, 10, 8, 5], {
    area: 100,
    thresholds: [5, 10, 15, 20, 30, 31],
  }).rows;
  const want = [9, 7, 4, 3, 1, 0];
  within(
    'a2.counts',
    hand.reduce((s, r, i) => s + Math.abs(r.n - want[i]), 0),
    a2.countsExact
  );
  within(
    'a2.density',
    Math.max(...hand.map((r, i) => rel(r.density, want[i] / 100))),
    a2.densityRelative
  );
  within('a2.beyondLargest.lo', hand[5].lo, 0);

  // a3: the diameter budget
  const a3 = C['a3.diameter.budget'].bounds;
  const mark = {
    kind: 'circle',
    pts: [
      [100, 200],
      [130, 240],
    ],
    sigma: 0.3,
  };
  const d = diameterOf(mark, {
    scale: { value: 0.5, sigma: 0.01, unit: 'km/pix' },
    recognition: 0.05,
  });
  within('a3.diameter', rel(d.diameter, 50), a3.diameterRelative);
  const relWant = Math.sqrt(
    0.02 ** 2 + ((Math.SQRT2 * 0.3) / 50) ** 2 + 0.05 ** 2
  );
  within('a3.sigma', rel(d.relative, relWant), a3.sigmaRelative);
  within('a3.budget.scale', rel(d.budget.scale, 0.02), a3.sigmaRelative);
  within(
    'a3.budget.fit',
    rel(d.budget.fit, (Math.SQRT2 * 0.3) / 50),
    a3.sigmaRelative
  );
  within(
    'a3.budget.recognition',
    rel(d.budget.recognition, 0.05),
    a3.sigmaRelative
  );
  const dm = diameterOf(mark, {
    scale: { value: 500, sigma: 10, unit: 'm/pix' },
    recognition: 0.05,
  });
  within('a3.metres', rel(dm.diameter, 50), a3.diameterRelative);
  const ang = diameterOf(mark, {
    scale: { value: 3, sigma: 0, unit: 'arcsec/pix' },
  });
  row(
    'a3.angularScale',
    ang.code ?? ang.status,
    'scale-unit',
    ang.code === 'scale-unit'
  );

  // a4: foreshortening
  const a4 = C['a4.foreshortening'].bounds;
  const f = (theta, c) => stretch(theta, c);
  within('a4.axis', rel(f(0, 0.5), 2), a4.factorRelative);
  within('a4.perpendicular', rel(f(Math.PI / 2, 0.5), 1), a4.factorRelative);
  within(
    'a4.diagonal',
    rel(f(Math.PI / 4, 0.5), Math.sqrt(2.5)),
    a4.factorRelative
  );
  const ident = Math.max(...[0, 0.3, 1, 2, 3].map(t => rel(f(t, 1), 1)));
  within('a4.identity', ident, a4.factorRelative);
  // through the diameter: a rim point along +x with the compressed axis along x
  const along = diameterOf(
    {
      kind: 'circle',
      pts: [
        [0, 0],
        [50, 0],
      ],
      sigma: 0.3,
    },
    {
      scale: { value: 0.5, sigma: 0, unit: 'km/pix' },
      foreshortening: { cosE: 0.5, axis: 0, sigmaCosE: 0.02 },
    }
  );
  within('a4.diameterAlong', rel(along.diameter, 100), a4.factorRelative);
  // theta = 0: the foreshortening term is sigma_cosE / (cosE^3 f^2) with f = 1/cosE
  within(
    'a4.sigmaTerm',
    rel(along.budget.foreshortening, 0.02 / 0.5),
    a4.sigmaRelative
  );
  const area = regionArea({
    pixels: 400,
    scale: { value: 0.5, sigma: 0.01, unit: 'km/pix' },
    foreshortening: { cosE: 0.5, axis: 0, sigmaCosE: 0.02 },
  });
  within('a4.area', rel(area.km2, 200), a4.areaRelative);
  within(
    'a4.areaSigma',
    rel(area.relSigma, Math.hypot(0.04, 0.04)),
    a4.sigmaRelative
  );
  const codes = [
    [{ cosE: 0 }, 'foreshortening'],
    [{ cosE: 1.2 }, 'foreshortening'],
    [{ cosE: -0.5, axis: 0 }, 'foreshortening'],
    [{ cosE: 0.5 }, 'foreshortening-axis'],
  ];
  for (const [fs, code] of codes) {
    const r = diameterOf(mark, {
      scale: { value: 0.5, sigma: 0, unit: 'km/pix' },
      foreshortening: fs,
    });
    row(
      `a4.refuses.${JSON.stringify(fs)}`,
      r.code ?? r.status,
      code,
      r.code === code
    );
  }

  // a5: the exact ratio
  const a5 = C['a5.ratio.exact'].bounds;
  const pair = (na, nb, Aa = 100, Ab = 100) =>
    relativeAge(
      { craters: listOf(na), area: Aa },
      { craters: listOf(nb), area: Ab },
      { dMin: 1 }
    );
  within('a5.ratio3', rel(pair(30, 10).ratio, 3), a5.ratioRelative);
  within('a5.ratioAreas', rel(pair(30, 10, 2, 1).ratio, 1.5), a5.ratioRelative);
  const none = pair(0, 0);
  row(
    'a5.notConstrained',
    `${none.code} / ${none.verdict}`,
    'not-constrained',
    none.code === 'not-constrained' && none.verdict === 'not constrained'
  );
  const open = pair(10, 0);
  row(
    'a5.openAbove',
    String(open.hi),
    null,
    open.hi === null && open.lo > 1 && open.verdict === 'a older'
  );
  for (const [n, k] of [
    [40, 30],
    [12, 3],
    [100, 50],
  ]) {
    const lv = 0.95;
    const alpha = (1 - lv) / 2;
    const cp = clopperPearson(k, n, lv);
    // P(X >= k | p_lo) = alpha ; P(X <= k | p_hi) = alpha
    const r1 = Math.abs(1 - binomLe(n, k - 1, cp.lo) - alpha);
    const r2 = Math.abs(binomLe(n, k, cp.hi) - alpha);
    within(`a5.cp.lo.${n}.${k}`, r1, a5.equationResidualAbsolute);
    within(`a5.cp.hi.${n}.${k}`, r2, a5.equationResidualAbsolute);
  }

  // a6: the index
  const a6 = C['a6.slope.closed'].bounds;
  const xs = [1.5, 2, 3, 4, 8, 16];
  const S = xs.reduce((s, x) => s + Math.log(x), 0);
  const pl = powerLaw(xs, { dMin: 1 });
  within('a6.index', rel(pl.index, 6 / S), a6.relative);
  within('a6.unbiased', rel(pl.unbiased, 5 / S), a6.relative);
  within('a6.lo', rel(pl.lo, chi2Quantile(0.025, 12) / (2 * S)), a6.relative);
  within('a6.hi', rel(pl.hi, chi2Quantile(0.975, 12) / (2 * S)), a6.relative);
  const few = powerLaw([1.5, 2, 3, 4], { dMin: 1 });
  row('a6.tooFew', few.code ?? few.status, 'too-few', few.code === 'too-few');
}

// ---- (b) the independent oracle ----------------------------------------------------

function oracle() {
  const b1 = C['b1.curve'].bounds;
  const b2 = C['b2.ratio'].bounds;
  const b3 = C['b3.slope'].bounds;
  const D = ORACLE.diametersKm;
  const ts = ORACLE.curve.map(r => r.D);
  let nMiss = 0;
  let dens = 0;
  const iv = {};
  for (const lv of [0.6827, 0.95]) {
    const r = cumulative(D, {
      area: ORACLE.areaKm2,
      thresholds: ts,
      level: lv,
    }).rows;
    r.forEach((x, i) => {
      const o = ORACLE.curve[i];
      if (x.n !== o.N) nMiss++;
      dens = Math.max(dens, relOrAbs(x.density, o.density));
      const e = o.intervals[String(lv)];
      iv[lv] = Math.max(
        iv[lv] ?? 0,
        relOrAbs(x.lo, e.lo),
        relOrAbs(x.hi, e.hi)
      );
    });
  }
  within('b1.counts', nMiss, b1.countsExact);
  within('b1.density', dens, b1.densityRelative);
  for (const lv of Object.keys(iv))
    within(`b1.interval.L${lv}`, iv[lv], b1.intervalRelative);

  let worst = 0;
  ORACLE.ratios.forEach((o, i) => {
    const n = o.na + o.nb;
    const cp = clopperPearson(o.na, n, o.level);
    const r = relativeAge(
      { craters: listOf(o.na), area: o.areaA },
      { craters: listOf(o.nb), area: o.areaB },
      { dMin: 1, level: o.level }
    );
    const e = Math.max(
      relOrAbs(cp.lo, o.pLo),
      relOrAbs(cp.hi, o.pHi),
      relOrAbs(r.lo, o.rLo),
      o.rHi === null ? (r.hi === null ? 0 : Infinity) : relOrAbs(r.hi, o.rHi)
    );
    worst = Math.max(worst, e);
    within(`b2.ratio.${i}`, e, b2.intervalRelative);
  });
  within('b2.worst', worst, b2.intervalRelative);

  for (const o of ORACLE.slopes)
    for (const lv of Object.keys(o.intervals)) {
      const p = powerLaw(D, { dMin: o.dMin, level: Number(lv) });
      within(
        `b3.index.dMin${o.dMin}.L${lv}`,
        rel(p.index, o.bFit),
        b3.indexRelative
      );
      within(
        `b3.interval.dMin${o.dMin}.L${lv}`,
        Math.max(rel(p.lo, o.intervals[lv].lo), rel(p.hi, o.intervals[lv].hi)),
        b3.intervalRelative
      );
    }
  notRun('b4.crater-tool', THRESHOLDS.notRun['b4.crater-tool']);
}

// ---- (c) coverage and (d) misspecified cases -------------------------------------------

/** Memoises a pure function of two counts. */
const memo2 = f => {
  const m = new Map();
  return (a, b) => {
    const k = `${a},${b}`;
    if (!m.has(k)) m.set(k, f(a, b));
    return m.get(k);
  };
};
const verdictOf = memo2((na, nb) =>
  relativeAge(
    { craters: listOf(na), area: 100 },
    { craters: listOf(nb), area: 100 },
    { dMin: 1 }
  )
);

function coverage() {
  const c1 = C['c1.poisson.coverage'].bounds;
  for (const E of [3, 10, 30, 100]) {
    const u = rng('c1', E);
    let hit = 0;
    for (let i = 0; i < TRIALS; i++) {
      const N = poisson(E, u());
      const r = cumulative(listOf(N), { area: 100, thresholds: [1] }).rows[0];
      if (r.lo <= E / 100 && E / 100 <= r.hi) hit++;
    }
    atLeast(`c1.poisson.E${E}`, hit / TRIALS, c1.coverageMin);
  }

  const c2 = C['c2.ratio.coverage'].bounds;
  for (const ratio of [1, 2, 5])
    for (const T of [10, 40, 150]) {
      // areas 100 and 200, true densities ratio : 1
      const k = T / (ratio * 100 + 200);
      const u = rng('c2', ratio, T);
      let hit = 0;
      const ra = (na, nb) =>
        relativeAge(
          { craters: listOf(na), area: 100 },
          { craters: listOf(nb), area: 200 },
          { dMin: 1 }
        );
      const cache = memo2(ra);
      for (let i = 0; i < TRIALS; i++) {
        const na = poisson(k * ratio * 100, u());
        const nb = poisson(k * 200, u());
        if (na + nb === 0) {
          hit++; // an unconstrained pair covers by saying nothing
          continue;
        }
        const r = cache(na, nb);
        if (r.lo <= ratio && (r.hi === null || ratio <= r.hi)) hit++;
      }
      atLeast(`c2.ratio.R${ratio}.T${T}`, hit / TRIALS, c2.coverageMin);
    }

  const c3 = C['c3.slope.coverage'].bounds;
  for (const n of [10, 30, 100]) {
    const u = rng('c3', n);
    let hit = 0;
    for (let i = 0; i < TRIALS; i++) {
      const x = Array.from({ length: n }, () => (1 - u()) ** (-1 / 2));
      const p = powerLaw(x, { dMin: 1 });
      if (p.lo <= 2 && 2 <= p.hi) hit++;
    }
    inBand(`c3.slope.n${n}`, hit / TRIALS, c3.coverageBand);
  }

  const c4 = C['c4.diameter.coverage'].bounds;
  {
    const g = gaussian(rng('c4'));
    let hit = 0;
    for (let i = 0; i < TRIALS; i++) {
      const rHat = 40 + Math.SQRT2 * 0.3 * g();
      const sHat = 0.5 * (1 + 0.02 * g());
      const d = diameterOf(
        {
          kind: 'circle',
          pts: [
            [200, 200],
            [200 + rHat, 200],
          ],
          sigma: 0.3,
        },
        {
          scale: { value: sHat, sigma: 0.01, unit: 'km/pix' },
          recognition: 0.03,
        }
      );
      const measured = d.diameter * (1 + 0.03 * g());
      if (Math.abs(measured - 40) <= d.sigma) hit++;
    }
    inBand('c4.diameter.oneSigma', hit / TRIALS, c4.coverageBand);
  }
}

function refusals() {
  const d1 = C['d1.nodifference'].bounds;
  const d2 = C['d2.detects'].bounds;
  {
    const u = rng('d1');
    let none = 0;
    for (let i = 0; i < TRIALS; i++) {
      const r = verdictOf(poisson(40, u()), poisson(40, u()));
      if (r.verdict === 'no significant difference') none++;
    }
    atLeast('d1.noDifference', none / TRIALS, d1.fractionMin);
  }
  {
    const u = rng('d2');
    let right = 0;
    let wrong = 0;
    for (let i = 0; i < TRIALS; i++) {
      const r = verdictOf(poisson(45, u()), poisson(15, u()));
      if (r.verdict === 'a older') right++;
      if (r.verdict === 'b older') wrong++;
    }
    atLeast('d2.right', right / TRIALS, d2.rightMin);
    atMost('d2.wrong', wrong / TRIALS, d2.wrongMax);
  }

  // d3: every refusal code, and no numeric result in a refusal
  const sc = { value: 0.5, sigma: 0, unit: 'km/pix' };
  const ok = { craters: [5, 6, 7, 8, 9, 10], area: 100 };
  const cases = [
    ['counts', () => cumulative([], { area: 100 })],
    ['diameter', () => cumulative([5, -1], { area: 100 })],
    ['diameter', () => cumulative([5, NaN], { area: 100 })],
    ['area', () => cumulative([5, 6], { area: 0 })],
    ['area', () => cumulative([5, 6], { area: -3 })],
    ['level', () => cumulative([5, 6], { area: 100, level: 1 })],
    ['level', () => relativeAge(ok, ok, { dMin: 1, level: 0 })],
    [
      'below-completeness',
      () => relativeAge({ ...ok, completeFrom: 5 }, ok, { dMin: 2 }),
    ],
    [
      'below-resolution',
      () => relativeAge({ ...ok, scale: 0.5 }, ok, { dMin: 3 }),
    ],
    ['dMin', () => relativeAge(ok, ok, {})],
    ['dMin', () => powerLaw([5, 6, 7, 8, 9, 10], { dMin: -2 })],
    ['too-few', () => powerLaw([5, 6, 7], { dMin: 1 })],
    ['not-constrained', () => relativeAge(ok, ok, { dMin: 50 })],
    [
      'scale',
      () =>
        diameterOf(
          {
            kind: 'circle',
            pts: [
              [0, 0],
              [5, 0],
            ],
          },
          {}
        ),
    ],
    [
      'scale-unit',
      () =>
        diameterOf(
          {
            kind: 'circle',
            pts: [
              [0, 0],
              [5, 0],
            ],
          },
          { scale: { value: 3, unit: 'arcsec/pix' } }
        ),
    ],
    [
      'foreshortening-axis',
      () =>
        diameterOf(
          {
            kind: 'circle',
            pts: [
              [0, 0],
              [5, 0],
            ],
          },
          { scale: sc, foreshortening: { cosE: 0.7 } }
        ),
    ],
    [
      'diameter',
      () => diameterOf({ kind: 'point', pts: [[0, 0]] }, { scale: sc }),
    ],
  ];
  const resultKeys = [
    'ratio',
    'lo',
    'hi',
    'index',
    'unbiased',
    'se',
    'diameter',
    'sigma',
    'rows',
  ];
  let miss = 0;
  let leaked = 0;
  for (const [code, run] of cases) {
    const r = run();
    if (r.status !== 'refused' || r.code !== code) miss++;
    if (resultKeys.some(k => k in r)) leaked++;
  }
  within('d3.refusals.wrongCode', miss, 0, `${cases.length} refusal cases`);
  within('d3.refusals.numericResult', leaked, 0);
  // a successful result carries no age
  const good = [
    cumulative([5, 6, 7], { area: 100 }),
    relativeAge(ok, ok, { dMin: 1 }),
    powerLaw([1.5, 2, 3, 4, 8, 16], { dMin: 1 }),
    diameterOf(
      {
        kind: 'circle',
        pts: [
          [0, 0],
          [5, 0],
        ],
        sigma: 0.3,
      },
      { scale: sc }
    ),
  ];
  const names = /^(age|ageGa|ageMa|absolute)$/i;
  const walk = (o, hits = []) => {
    if (o && typeof o === 'object')
      for (const [k, v] of Object.entries(o)) {
        if (names.test(k)) hits.push(k);
        walk(v, hits);
      }
    return hits;
  };
  within('d3.noAbsoluteAge', good.flatMap(g => walk(g)).length, 0);

  // d4: a roll-off the index fit does not know about
  const d4 = C['d4.rolloff'].bounds;
  const trials = 500;
  const flagged = (label, keep) => {
    const u = rng('d4', label);
    let n = 0;
    for (let i = 0; i < trials; i++) {
      const x = [];
      for (let j = 0; j < 600; j++) {
        const D = (1 - u()) ** (-1 / 2);
        if (keep(D, u())) x.push(D);
      }
      if (powerLaw(x, { dMin: 1 }).constancy.flag === 'slope-not-constant') n++;
    }
    return n / trials;
  };
  atLeast(
    'd4.rolloff.flagged',
    flagged('roll', (D, v) => D >= 3 || v < (D / 3) ** 2),
    d4.flaggedRolloffMin
  );
  atMost(
    'd4.control.flagged',
    flagged('control', () => true),
    d4.flaggedControlMax
  );
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  analytic();
  oracle();
  coverage();
  refusals();
  notRun('e1.authentic', THRESHOLDS.notRun['e1.authentic']);
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = runValidation();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(out, null, 1)}\n`);
  else {
    for (const r of out) {
      const v = r.measured === null ? '' : Number(r.measured).toPrecision(4);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag = r.pass === null ? 'NOT RUN' : r.pass ? 'pass' : 'FAIL';
      process.stdout.write(
        `${tag.padEnd(9)}${r.id.padEnd(46)}${v.padEnd(12)}${b} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
