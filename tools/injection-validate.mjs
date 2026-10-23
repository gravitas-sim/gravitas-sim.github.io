#!/usr/bin/env node
// =============================================================================
// Completeness by injection against its committed thresholds (Prompt 184)
// -----------------------------------------------------------------------------
//   npm run injection:validate               print the table
//   npm run injection:validate -- --json     print it as JSON
//
// tests/fixtures/injection/thresholds.json fixed every bound before
// js/measure/inject.js had been run (INJECTION.md, "The validation contract").
// This runs the checks against the production module and judges them against
// those bounds, read from the file and not copied. tests/injection.test.js runs
// it in plain Node (Jest's VM makes Math and Float64Array reads about ten times
// slower, so an ensemble there would time the harness) and asserts every row.
//
// The frames are the detector kernel's (tools/detection-synth.mjs) with their
// truth; the oracle's rows read the frame, the plan and the photutils results
// pinned in tests/fixtures/injection/. Nothing here stores a value that passes
// through exp, log, pow or a trigonometric function: bands, counts and
// tolerances are judged (Node 20, 22 and 24 differ in the last bits). Check
// g1.authentic is reported as not run: it needs Prompt 189's frame.
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { permits } from '../js/dataKinds/contract.js';
import { adapt } from '../js/measure/photometry.js';
import {
  appliesTo,
  binomialInterval,
  checkSpec,
  completenessAt,
  curveOf,
  expectedMap,
  fluxForSnr,
  inject,
  logisticOf,
  magnitudeOf,
  planTrial,
  run,
  runFrame,
  selectionOf,
  shotAdded,
  start,
  step,
} from '../js/measure/inject.js';
import {
  chi2Quantile,
  lnGamma,
  normalCdf,
} from '../js/kernels/statistics/special.js';
import {
  completenessCorrect,
  selection,
} from '../js/kernels/statistics/selection.js';
import { completenessAt as surveyCompleteness } from '../js/survey/model.js';
import { stream } from '../js/random/streams.js';
import { makeFrame, sidecar } from './detection-synth.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/injection');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const C = THRESHOLDS.checks;
const SCENE = THRESHOLDS.scene;
const PREFIX = SCENE.seedPrefix;
const FWHM = SCENE.fwhm;
const EXPOSURE = SCENE.exposure;
const NOISE = Math.sqrt(90 + 8 * 8 + (1.5 * 1.5) / 12);
const fluxOfSnr = (s, fwhm = FWHM) => fluxForSnr(s, fwhm, NOISE);
const magOfSnr = (s, fwhm = FWHM) => magnitudeOf(fluxOfSnr(s, fwhm), EXPOSURE);
/** The signal to noise at which the five-pixel segment rule is met (INJECTION.md a1). */
const sCrit = fwhm => {
  const sg = fwhm / (2 * Math.sqrt(2 * Math.LN2));
  return 4 * Math.exp(5 / (4 * Math.PI * sg * sg));
};

const rows = [];
const add = (id, measured, ok, extra = {}) =>
  rows.push({ id, measured, pass: Boolean(ok), ...extra });
/** A row that is not one of the committed legs: evidence, never a verdict. */
const evidence = (id, measured, note) =>
  rows.push({ id: `x.${id}`, measured, pass: true, evidence: true, note });
const within = (v, [lo, hi]) => v >= lo && v <= hi;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

const blank = (seed, detector = {}) =>
  makeFrame({ seed: `${PREFIX}-${seed}`, stars: [], detector });
const adapted = frame => {
  const a = adapt(frame, permits);
  if (!a.ok) throw new Error(`${frame.id}: ${a.code}`);
  return a;
};
const go = (a, spec, o) => {
  const r = run(a, spec, o);
  if (!r.ok) throw new Error(`${spec.seed}: refused, ${r.code}`);
  return r;
};

// ---- a1: completeness against the closed form -------------------------------------

function closedForm() {
  const T = C['a1.completeness'];
  const a = adapted(blank('base'));
  const sc = sCrit(FWHM);
  const ps = [];
  let unplaced = 0;
  for (const s of T.levels) {
    const m = magOfSnr(s);
    const r = go(a, {
      seed: `${PREFIX}-a1-${s}`,
      count: T.perTrial,
      trials: T.trials,
      fwhm: FWHM,
      magnitude: { min: m, max: m },
      binWidth: 0.1,
    });
    const b = r.curve.bins[0];
    unplaced += r.curve.unplaced;
    ps.push(b.p);
    const expect = normalCdf(s - sc);
    add(
      `a1.completeness.s${s}`,
      b.p,
      Math.abs(b.p - expect) <= T.bounds.pointwise,
      {
        bound: T.bounds.pointwise,
        note: `closed form Phi(s - ${sc.toFixed(2)}) = ${expect.toFixed(3)}, n = ${b.n}`,
      }
    );
  }
  let s50 = null;
  for (let i = 0; i + 1 < ps.length && s50 === null; i++)
    if (ps[i] < 0.5 && ps[i + 1] >= 0.5)
      s50 =
        T.levels[i] +
        ((0.5 - ps[i]) / (ps[i + 1] - ps[i])) * (T.levels[i + 1] - T.levels[i]);
  add(
    'a1.halfPoint',
    s50,
    s50 !== null && Math.abs(s50 - sc) <= T.bounds.halfPointWithin,
    {
      bound: T.bounds.halfPointWithin,
      note: `closed form s_c = ${sc.toFixed(2)}`,
    }
  );
  add('a1.atTen', ps[ps.length - 1], ps[ps.length - 1] >= T.bounds.atTen, {
    bound: T.bounds.atTen,
  });
  add('a1.atThree', ps[0], ps[0] <= T.bounds.atThreeAtMost, {
    bound: T.bounds.atThreeAtMost,
  });
  const mono = ps.every(
    (p, i) => i === 0 || p >= ps[i - 1] - T.bounds.monotoneSlack
  );
  add('a1.monotone', mono ? 1 : 0, mono, { bound: 1 });
  evidence(
    'a1.unplaced',
    unplaced,
    'sources the placement rule could not place'
  );
}

// ---- a2: the counting against a detector whose answer is known --------------------

function bookkeeping() {
  const T = C['a2.bookkeeping'];
  const W = 512;
  const a = adapted(blank('a2', { width: W, height: W }));
  const M50 = -2.0;
  const WIDTH = 0.1;
  const decisions = new Map();
  const standIn = (_a, params, ctx) => {
    if (ctx.baseline) return { ok: true, sources: [], params, mesh: null };
    const rng = stream('experiments', `${PREFIX}-a2-standin`, ctx.trial);
    const found = [];
    const rec = [];
    for (const s of ctx.sources) {
      const yes = rng() < 1 / (1 + Math.exp((s.m - M50) / WIDTH));
      const jx = (rng() * 2 - 1) * 0.35;
      const jy = (rng() * 2 - 1) * 0.35;
      rec.push(yes);
      if (yes) found.push({ x: s.x + jx, y: s.y + jy });
    }
    const wanted = (rng() < 0.4 ? 1 : 0) + (rng() < 0.2 ? 1 : 0);
    let extra = 0;
    for (let j = 0; j < wanted; j++)
      for (let t = 0; t < 100; t++) {
        const x = 20 + rng() * (W - 40);
        const y = 20 + rng() * (W - 40);
        if (ctx.sources.every(s => Math.hypot(s.x - x, s.y - y) >= 6)) {
          found.push({ x, y });
          extra++;
          break;
        }
      }
    decisions.set(ctx.trial, { rec, extra });
    return { ok: true, sources: found, params, mesh: null };
  };
  const r = go(
    a,
    {
      seed: `${PREFIX}-a2`,
      count: 100,
      trials: 60,
      fwhm: FWHM,
      magnitude: { min: -2.8, max: -1.2 },
      binWidth: 0.1,
    },
    { detector: standIn }
  );
  let sameRec = true;
  let sameExtra = true;
  let sources = 0;
  for (const t of r.trials) {
    const d = decisions.get(t.trial);
    if (t.extra !== d.extra) sameExtra = false;
    t.sources.forEach((s, j) => {
      sources++;
      if (s.recovered !== d.rec[j]) sameRec = false;
    });
  }
  add('a2.recovered', sameRec ? sources : 0, sameRec, {
    bound: T.bounds.recoveredEqualsStandIn,
    note: `${sources} sources, each recovered flag equal to the stand-in's decision`,
  });
  add('a2.extra', sameExtra ? 1 : 0, sameExtra, {
    bound: T.bounds.extraEqualsStandIn,
    note: 'extra detections per trial equal to the stand-in false sources',
  });
  // the binned curve against the logistic, bin by bin, with the exact Poisson-binomial variance
  let worst = 0;
  let used = 0;
  r.curve.bins.forEach((b, i) => {
    if (b.n < T.bounds.minBinCount) return;
    const ps = r.trials.flatMap(t =>
      t.sources
        .filter(
          s =>
            Math.min(
              r.curve.bins.length - 1,
              Math.floor((s.m - r.curve.bins[0].lo) / 0.1 + 1e-12)
            ) === i
        )
        .map(s => 1 / (1 + Math.exp((s.m - M50) / WIDTH)))
    );
    const mu = ps.reduce((t, p) => t + p, 0);
    const sd = Math.sqrt(ps.reduce((t, p) => t + p * (1 - p), 0));
    used++;
    worst = Math.max(worst, sd > 0 ? Math.abs(b.k - mu) / sd : 0);
  });
  add('a2.binZ', worst, worst <= T.bounds.binZ, {
    bound: T.bounds.binZ,
    note: `${used} bins of at least ${T.bounds.minBinCount} sources`,
  });
  const dm = Math.abs(r.curve.m50.m - M50);
  add('a2.m50', dm, dm <= T.bounds.m50Within, { bound: T.bounds.m50Within });
}

// ---- a3: rendering, conservation and shot noise -----------------------------------

function rendering() {
  const T = C['a3.rendering'].bounds;
  const rng = stream('injection', `${PREFIX}-a3`);
  const stars = Array.from({ length: 20 }, () => ({
    x: 14 + 100 * rng(),
    y: 14 + 100 * rng(),
    flux: 5000,
  }));
  const f = makeFrame({ seed: `${PREFIX}-a3`, stars });
  const mine = expectedMap(f.width, f.height, stars, {
    model: 'gaussian',
    fwhm: FWHM,
  }).map;
  let worst = 0;
  let total = 0;
  for (let i = 0; i < mine.length; i++) {
    worst = Math.max(worst, Math.abs(mine[i] - f.truth.signal[i]));
    total += mine[i];
  }
  add(
    'a3.kernelDifference',
    worst / 5000,
    worst / 5000 <= T.kernelDifferenceFraction,
    {
      bound: T.kernelDifferenceFraction,
      note: 'largest pixel difference from the detector kernel, as a fraction of a source',
    }
  );
  const cons = Math.abs(total / (20 * 5000) - 1);
  add('a3.conservation', cons, cons <= T.conservationRelative, {
    bound: T.conservationRelative,
  });
  const z = [];
  for (let i = 0; i < 1000; i++) {
    const s = { x: 40 + 48 * rng(), y: 40 + 48 * rng(), flux: 2000 };
    const e = expectedMap(128, 128, [s], { model: 'gaussian', fwhm: FWHM });
    const added = shotAdded(128, 128, e.map, e.windows, `${PREFIX}-a3-shot`, i);
    let sum = 0;
    for (let p = 0; p < added.length; p++) sum += added[p];
    z.push((sum - s.flux) / Math.sqrt(s.flux));
  }
  const zm = mean(z);
  const zr = Math.sqrt(mean(z.map(v => v * v)));
  add('a3.shotMean', zm, Math.abs(zm) <= T.shotMeanWithin, {
    bound: T.shotMeanWithin,
  });
  add('a3.shotRms', zr, within(zr, T.shotRms), { bound: T.shotRms });
}

// ---- a4: the half point moves with the PSF width ----------------------------------

const half = (a, fwhm, label) =>
  go(a, {
    seed: `${PREFIX}-a4-${label}`,
    count: 10,
    trials: 200,
    fwhm,
    magnitude: { min: -3.2, max: -1.9 },
    binWidth: 0.1,
  }).curve.m50.m;

function psfWidth() {
  const T = C['a4.psfWidth'];
  const a = adapted(blank('base'));
  const m3 = half(a, 3, 'w3');
  const m45 = half(a, 4.5, 'w45');
  const shift = m45 - m3;
  add(
    'a4.psfWidth',
    shift,
    m3 !== null && m45 !== null && Math.abs(shift - T.expectedShift) <= T.bound,
    {
      bound: T.bound,
      note: `closed form ${T.expectedShift}; half points ${m3?.toFixed(3)} and ${m45?.toFixed(3)}`,
    }
  );
}

// ---- a5: the exact interval ---------------------------------------------------------

const pmf = (k, n, p) =>
  Math.exp(
    lnGamma(n + 1) -
      lnGamma(k + 1) -
      lnGamma(n - k + 1) +
      k * Math.log(p) +
      (n - k) * Math.log(1 - p)
  );

function exactInterval() {
  const T = C['a5.interval'].bounds;
  let ends = 0;
  for (const n of [1, 2, 5, 10, 50])
    for (const level of [0.6827, 0.95]) {
      const a = 1 - level;
      const z = binomialInterval(0, n, level);
      const t = binomialInterval(n, n, level);
      ends = Math.max(
        ends,
        Math.abs(z.lo),
        Math.abs(z.hi - (1 - (a / 2) ** (1 / n))),
        Math.abs(t.lo - (a / 2) ** (1 / n)),
        Math.abs(t.hi - 1)
      );
    }
  add('a5.closedEnds', ends, ends <= T.closedEnds, { bound: T.closedEnds });
  const g = binomialInterval(3, 10, 0.95);
  const pub = Math.max(Math.abs(g.lo - 0.0667), Math.abs(g.hi - 0.6525));
  add('a5.published', pub, pub <= T.published, {
    bound: T.published,
    note: 'Clopper and Pearson, 3 of 10 at 95 percent: 0.0667 to 0.6525',
  });
  for (const level of [0.6827, 0.95]) {
    let floor = Infinity;
    const means = [];
    for (const n of [5, 10, 20, 50, 100]) {
      const iv = Array.from({ length: n + 1 }, (_, k) =>
        binomialInterval(k, n, level)
      );
      const cov = [];
      for (let q = 1; q <= 49; q++) {
        const p = q * 0.02;
        let c = 0;
        for (let k = 0; k <= n; k++)
          if (iv[k].lo <= p && p <= iv[k].hi) c += pmf(k, n, p);
        floor = Math.min(floor, c - level);
        cov.push(c);
      }
      means.push(mean(cov) - level);
    }
    add(`a5.coverageFloor.${level}`, floor, floor >= -T.coverageFloor, {
      bound: -T.coverageFloor,
    });
    const bound = level < 0.9 ? T.meanExcess.level68 : T.meanExcess.level95;
    const worst = Math.max(...means);
    add(`a5.meanExcess.${level}`, worst, worst <= bound, {
      bound,
      note: `mean excess over p for n = 5, 10, 20, 50, 100: ${means.map(v => v.toFixed(3)).join(', ')}`,
    });
  }
}

// ---- b: the independent oracle ------------------------------------------------------

const decode = (b64, Type) => {
  const buf = Buffer.from(b64, 'base64');
  return new Type(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
  );
};

function oracle() {
  const inputs = read('oracle-inputs.json');
  const results = read('oracle-results.json');
  const plan = decode(inputs.plan.xyF, Float64Array);
  const W = inputs.width;
  // b0: the oracle's own rendering
  const B0 = C['b0.rendering'];
  let worst = 0;
  for (const smp of results.renderSample) {
    const [x, y, F] = plan.slice(smp.source * 3, smp.source * 3 + 3);
    const n = 2 * inputs.renderSample.half + 1;
    const { map } = expectedMap(W, W, [{ x, y, flux: F }], {
      model: 'gaussian',
      fwhm: FWHM,
    });
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++)
        worst = Math.max(
          worst,
          Math.abs(map[(smp.y0 + j) * W + smp.x0 + i] - smp.values[j * n + i]) /
            F
        );
  }
  add('b0.rendering', worst, worst <= B0.bound, { bound: B0.bound });
  // b1: an independent injection run on the same frame and plan
  const B1 = C['b1.curve'];
  const adu = decode(inputs.frame.adu, Int16Array);
  const frame = {
    ...blank('oracle-frame'),
    id: inputs.frame.id,
    width: W,
    height: inputs.height,
    data: Float64Array.from(adu),
    sidecar: sidecar(W, inputs.height, inputs.frame.id),
  };
  const a = adapted(frame);
  const planner = trial => ({
    unplaced: 0,
    sources: Array.from({ length: inputs.plan.perTrial }, (_, j) => {
      const q = (trial * inputs.plan.perTrial + j) * 3;
      return {
        x: plan[q],
        y: plan[q + 1],
        flux: plan[q + 2],
        m: magnitudeOf(plan[q + 2], EXPOSURE),
      };
    }),
  });
  const mag = {
    min: magnitudeOf(
      inputs.plan.fluxPerSignalToNoise * inputs.plan.sHigh,
      EXPOSURE
    ),
    max: magnitudeOf(
      inputs.plan.fluxPerSignalToNoise * inputs.plan.sLow,
      EXPOSURE
    ),
  };
  // 400 trials is more than the tool offers a reader (200): the run is set up
  // once and stepped, as the panel does
  const started = start(
    a,
    {
      seed: `${PREFIX}-b1`,
      count: inputs.plan.perTrial,
      trials: 1,
      fwhm: FWHM,
      magnitude: mag,
      binWidth: 0.1,
    },
    { planner }
  );
  if (!started.ok) throw new Error(`b1: refused, ${started.code}`);
  const gTrials = Array.from({ length: inputs.plan.trials }, (_, t) => {
    const s = step(started, t);
    if (!s.ok) throw new Error(`b1 trial ${t}: ${s.code}`);
    return s;
  });
  const g = {
    spec: started.spec,
    curve: curveOf(gTrials, started.spec),
  };
  const oTrials = results.trials.map((t, ti) => ({
    trial: ti,
    unplaced: 0,
    extra: t.extra,
    sources: planner(ti).sources.map((s, j) => ({
      ...s,
      recovered: t.recovered[j] === '1',
    })),
  }));
  const oc = curveOf(oTrials, { ...g.spec });
  let maxZ = 0;
  let chi2 = 0;
  let used = 0;
  g.curve.bins.forEach((b, i) => {
    const o = oc.bins[i];
    if (b.n < B1.bounds.minBinCount || o.n !== b.n) return;
    const pbar = (b.k + o.k) / (2 * b.n);
    const z =
      pbar > 0 && pbar < 1
        ? (b.p - o.p) / Math.sqrt((pbar * (1 - pbar) * 2) / b.n)
        : 0;
    maxZ = Math.max(maxZ, Math.abs(z));
    chi2 += z * z;
    used++;
  });
  add('b1.binZ', maxZ, maxZ <= B1.bounds.binZ, {
    bound: B1.bounds.binZ,
    note: `${used} bins of at least ${B1.bounds.minBinCount} sources`,
  });
  const lim = chi2Quantile(B1.bounds.chi2Level, used);
  add('b1.chi2', chi2, chi2 <= lim, {
    bound: lim,
    note: `${used} bins; the ${B1.bounds.chi2Level} quantile`,
  });
  const dm = Math.abs(g.curve.m50.m - oc.m50.m);
  add('b1.m50', dm, dm <= B1.bounds.m50Within, {
    bound: B1.bounds.m50Within,
    note: `Gravitas ${g.curve.m50.m.toFixed(3)}, oracle ${oc.m50.m.toFixed(3)}`,
  });
  add(
    'b1.extra',
    Math.max(g.curve.extraPerTrial, oc.extraPerTrial),
    Math.max(g.curve.extraPerTrial, oc.extraPerTrial) <=
      B1.bounds.extraPerTrialAtMost,
    {
      bound: B1.bounds.extraPerTrialAtMost,
      note: `Gravitas ${g.curve.extraPerTrial}, oracle ${oc.extraPerTrial}, per trial; the oracle holds ${results.baselineDetections} sources in the blank frame`,
    }
  );
  evidence(
    'b1.paired',
    g.curve.recovered - oc.recovered,
    `recovered: Gravitas ${g.curve.recovered}, oracle ${oc.recovered}, of ${g.curve.injected}; the oracle's astropy convolution agrees with its matrices to ${results.convolveAgreement.toExponential(1)}`
  );
  // b2: the interval against scipy
  const B2 = C['b2.interval'];
  let w2 = 0;
  for (const [k, n, level, lo, hi] of results.intervals) {
    const iv = binomialInterval(k, n, level);
    w2 = Math.max(w2, Math.abs(iv.lo - lo), Math.abs(iv.hi - hi));
  }
  add('b2.interval', w2, w2 <= B2.bound, {
    bound: B2.bound,
    note: `${results.intervals.length} cases against scipy.stats.beta.ppf`,
  });
}

// ---- c1: coverage on a seeded ensemble -------------------------------------------------

function coverage() {
  const T = C['c1.coverage'];
  const a = adapted(blank('base'));
  const mag = { min: magOfSnr(9), max: magOfSnr(3) };
  const runs = [];
  for (let r = 0; r < T.runs; r++) {
    const g = go(a, {
      seed: `${PREFIX}-c1-${r}`,
      count: T.perTrial,
      trials: T.trials,
      fwhm: FWHM,
      magnitude: mag,
      binWidth: 0.2,
    });
    runs.push(g.curve.bins.map(b => [b.n, b.k]));
  }
  const nb = runs[0].length;
  const total = Array.from({ length: nb }, (_, i) => [
    runs.reduce((s, r) => s + r[i][0], 0),
    runs.reduce((s, r) => s + r[i][1], 0),
  ]);
  const hit = { 0.6827: 0, 0.95: 0 };
  let counted = 0;
  for (const r of runs)
    r.forEach(([n, k], i) => {
      if (n < T.bounds.minBinCount) return;
      const truth = (total[i][1] - k) / (total[i][0] - n);
      if (!within(truth, T.bounds.truthBetween)) return;
      counted++;
      for (const level of [0.6827, 0.95]) {
        const iv = binomialInterval(k, n, level);
        if (iv.lo <= truth && truth <= iv.hi) hit[level]++;
      }
    });
  add(
    'c1.coverage68',
    hit[0.6827] / counted,
    within(hit[0.6827] / counted, T.bounds.level68),
    {
      bound: T.bounds.level68,
      note: `${counted} bins of ${T.runs} runs`,
    }
  );
  add(
    'c1.coverage95',
    hit[0.95] / counted,
    within(hit[0.95] / counted, T.bounds.level95),
    {
      bound: T.bounds.level95,
      note: `${counted} bins of ${T.runs} runs`,
    }
  );
}

// ---- d: refusals, applicability, the range ----------------------------------------------

function refusals() {
  const calls = { n: 0 };
  const counting = {
    detector: (...args) => {
      calls.n++;
      return { ok: false, code: 'spy', args };
    },
  };
  const f = blank('d1');
  const side = f.sidecar;
  const spec = { seed: 'd1', count: 5, trials: 2, fwhm: FWHM };
  const mag = { min: magOfSnr(8), max: magOfSnr(3) };
  const codes = {};
  const before = Float64Array.from(f.data);
  const frameWith = sc => ({ ...f, sidecar: sc ?? undefined });
  const cases = {
    'display-only': frameWith({ ...side, use: 'display-only' }),
    'no-contract': frameWith(null),
    'raw-frame': frameWith({ ...side, calibration: { state: 'raw' } }),
    'incomplete-contract': frameWith({
      ...side,
      pixels: { ...side.pixels, saturation: undefined, linearity: undefined },
    }),
  };
  for (const [code, fr] of Object.entries(cases))
    codes[code] = runFrame(
      fr,
      permits,
      { ...spec, magnitude: mag },
      counting
    ).code;
  // pixels not in electrons on the variance route
  const fv = {
    ...f,
    variance: new Float64Array(f.data.length).fill(150),
    sidecar: {
      ...side,
      planes: {
        ...side.planes,
        variance: { encoding: 'float64-le', unit: 'adu2', source: 'the test' },
      },
    },
  };
  codes.unit = runFrame(
    fv,
    permits,
    { ...spec, magnitude: mag },
    counting
  ).code;
  // the memory bound: 157's own check admits 2,048 by 2,048 with data and mask planes alone
  const big = {
    id: 'big',
    width: 2048,
    height: 2048,
    data: new Float64Array(1),
    mask: new Uint16Array(1),
    sidecar: {
      ...sidecar(2048, 2048, 'big'),
      planes: {
        data: { encoding: 'float64-le' },
        mask: {
          encoding: 'uint16-le',
          bits: [{ value: 1, meaning: 'bad pixel' }],
          bitsSource: 'the test',
        },
      },
    },
  };
  codes['too-large'] = runFrame(
    big,
    permits,
    { ...spec, magnitude: mag },
    counting
  ).code;
  // a parameter outside its limit
  const a = adapted(f);
  const badParams = {
    count0: { count: 0 },
    count501: { count: 501 },
    trials0: { trials: 0 },
    trials201: { trials: 201 },
    total: { count: 500, trials: 100 },
    reversed: { magnitude: { min: -2, max: -3 } },
    binWidth0: { binWidth: 0 },
    binWidthMany: { binWidth: 0.001, magnitude: mag },
    fwhmLow: { fwhm: 0.4 },
    fwhmHigh: { fwhm: 51 },
    seedObject: { seed: {} },
    seedEmpty: { seed: '' },
  };
  let badOk = 0;
  for (const [name, over] of Object.entries(badParams)) {
    const r = run(a, { ...spec, magnitude: mag, ...over }, counting);
    if (!r.ok && r.code === 'bad-parameter') badOk++;
    else codes[`bad:${name}`] = r.code;
  }
  codes['beyond-linearity'] = run(
    a,
    { ...spec, magnitude: { min: -12, max: -11 } },
    counting
  ).code;
  const allowed = run(
    a,
    { ...spec, magnitude: { min: -12, max: -11 } },
    counting
  ).allowed;
  codes['no-room'] = run(
    a,
    { ...spec, magnitude: mag, margin: 50 },
    counting
  ).code;
  const one = makeFrame({
    seed: `${PREFIX}-d1-star`,
    stars: [{ x: 64, y: 64, flux: 6000 }],
  });
  // a frame whose own sources leave no room needs the detector once, so it is
  // judged beside the list and not counted in it
  codes['no-room.star'] = run(adapted(one), {
    ...spec,
    magnitude: mag,
    separation: 50,
  }).code;
  const want = [
    'display-only',
    'no-contract',
    'raw-frame',
    'incomplete-contract',
    'unit',
    'too-large',
    'beyond-linearity',
    'no-room',
  ];
  const exact =
    want.every(c => codes[c] === c) && codes['no-room.star'] === 'no-room';
  const unchanged = before.every((v, i) => v === f.data[i]);
  add(
    'd1.refusals',
    exact && badOk === Object.keys(badParams).length ? 1 : 0,
    exact &&
      badOk === Object.keys(badParams).length &&
      calls.n === 0 &&
      unchanged &&
      Number.isFinite(allowed),
    {
      bound: 1,
      note: `${want.length + 1} codes ${JSON.stringify(codes)}; ${badOk} of ${Object.keys(badParams).length} parameter cases bad-parameter; detector calls ${calls.n}; frame unchanged ${unchanged}; brightest allowed magnitude ${allowed?.toFixed(2)}`,
    }
  );
  // fewer than requested placed is reported, not refused
  const crowded = run(a, {
    seed: 'd1-crowd',
    count: 100,
    trials: 1,
    fwhm: FWHM,
    magnitude: mag,
  });
  evidence(
    'd1.unplaced',
    crowded.ok ? crowded.curve.unplaced : null,
    'sources not placed of 100 asked for on a 128 by 128 frame at 4 FWHM spacing: reported in the curve, not a refusal'
  );
}

function conditions() {
  const a = adapted(blank('base'));
  const mag = { min: magOfSnr(8), max: magOfSnr(3) };
  const base = { count: 5, trials: 3, magnitude: mag, binWidth: 0.25 };
  const c1 = go(a, { ...base, seed: 'd2-a', fwhm: 3 }).conditions;
  const wide = go(a, { ...base, seed: 'd2-b', fwhm: 4.5 }).conditions;
  const noisy = go(adapted(blank('noisy', { readNoise: 17 })), {
    ...base,
    seed: 'd2-c',
    fwhm: 3,
  }).conditions;
  const hard = go(a, {
    ...base,
    seed: 'd2-d',
    fwhm: 3,
    detection: { sigma: 5 },
  }).conditions;
  const same = go(a, { ...base, seed: 'd2-e', fwhm: 3 }).conditions;
  const r = {
    psf: appliesTo(c1, wide),
    noise: appliesTo(c1, noisy),
    detection: appliesTo(c1, hard),
  };
  const refused =
    !r.psf.ok &&
    r.psf.differs.includes('psf') &&
    !r.noise.ok &&
    JSON.stringify(r.noise.differs) === '["noise"]' &&
    !r.detection.ok &&
    JSON.stringify(r.detection.differs) === '["detection"]';
  const accepted = appliesTo(c1, same).ok;
  add(
    'd2.conditions',
    (refused ? 3 : 0) + (accepted ? 1 : 0),
    refused && accepted,
    {
      bound: '3 refused, 1 accepted',
      note: `FWHM 4.5 differs in ${r.psf.differs}; noise ${noisy.noise.toFixed(1)} against ${c1.noise.toFixed(1)} differs in ${r.noise.differs}; sigma 5 differs in ${r.detection.differs}`,
    }
  );
}

function outsideRange() {
  const a = adapted(blank('base'));
  const g = go(a, {
    seed: 'd3',
    count: 12,
    trials: 20,
    fwhm: FWHM,
    magnitude: { min: magOfSnr(10), max: magOfSnr(3) },
    binWidth: 0.2,
  });
  const sel = selectionOf(g.curve, g.conditions);
  let refused = 0;
  for (const m of [
    g.spec.magnitude.min - 0.001,
    g.spec.magnitude.max + 0.001,
    g.spec.magnitude.min - 5,
  ])
    try {
      sel.inclusion({ m });
    } catch (e) {
      if (e.code === 'out-of-range') refused++;
    }
  const live = g.curve.bins.filter(b => b.n);
  let worst = 0;
  for (let q = 0; q <= 40; q++) {
    const m =
      g.spec.magnitude.min +
      (q / 40) * (g.spec.magnitude.max - g.spec.magnitude.min);
    let want;
    if (m <= live[0].center) want = live[0].p;
    else if (m >= live[live.length - 1].center) want = live[live.length - 1].p;
    else {
      let i = 0;
      while (live[i + 1].center < m) i++;
      want =
        live[i].p +
        ((m - live[i].center) / (live[i + 1].center - live[i].center)) *
          (live[i + 1].p - live[i].p);
    }
    worst = Math.max(worst, Math.abs(sel.inclusion({ m }) - want));
  }
  add('d3.outsideRange', refused, refused === 3 && worst <= 1e-12, {
    bound: '3 refused, interpolation to 1e-12',
    note: `largest difference from the interpolation ${worst.toExponential(1)}`,
  });
}

// ---- e1: reproducibility ------------------------------------------------------------------

/** The first five sources of seed `pin`, trial 0, on a 128 by 128 frame (INJECTION.md): raw draws and arithmetic only. */
export const PINNED = [
  [26.897591109154746, 10.04591209650971],
  [15.852792036253959, 98.90664829034358],
  [57.94765623519197, 91.42504982976243],
  [53.15670598158613, 17.72503592260182],
  [107.07620778609999, 25.686424541985616],
];

function reproducible() {
  const a = adapted(blank('base'));
  const spec = {
    count: 10,
    trials: 6,
    fwhm: FWHM,
    magnitude: { min: magOfSnr(10), max: magOfSnr(3) },
    binWidth: 0.25,
  };
  const r1 = go(a, { ...spec, seed: 'e1' });
  const r2 = go(a, { ...spec, seed: 'e1' });
  const r3 = go(a, { ...spec, seed: 'e1-other' });
  const sig = r => JSON.stringify([r.trials, r.curve]);
  const plan1 = planTrial({
    seed: 'e1',
    trial: 2,
    count: 10,
    width: 128,
    height: 128,
    exposure: EXPOSURE,
    magnitude: spec.magnitude,
    fwhm: FWHM,
  });
  const i1 = inject(a, plan1.sources, r1.psf, { seed: 'e1', trial: 2 }).image
    .values;
  const i2 = inject(a, plan1.sources, r1.psf, { seed: 'e1', trial: 2 }).image
    .values;
  const pixels = i1.every((v, i) => Object.is(v, i2[i]));
  const long = go(a, { ...spec, trials: 12, seed: 'e1' });
  const prefix =
    JSON.stringify(long.trials.slice(0, 6)) === JSON.stringify(r1.trials);
  const identities =
    (sig(r1) === sig(r2) ? 1 : 0) + (pixels ? 1 : 0) + (prefix ? 1 : 0);
  const differs = sig(r1) !== sig(r3);
  const pin = planTrial({
    seed: 'pin',
    trial: 0,
    count: 5,
    width: 128,
    height: 128,
    exposure: EXPOSURE,
    magnitude: { min: -3, max: -2 },
    fwhm: FWHM,
  }).sources;
  const pinned =
    pin.length === 5 &&
    pin.every((s, i) => s.x === PINNED[i][0] && s.y === PINNED[i][1]);
  add('e1.reproducible', identities, identities === 3 && differs && pinned, {
    bound: '3 identities, 1 difference, 5 pinned positions',
    note: `same seed twice ${sig(r1) === sig(r2)}, injected pixels ${pixels}, a longer run holds the shorter ${prefix}, another seed differs ${differs}, pinned ${pinned}`,
  });
}

// ---- f1: the selection-effects suite reads the curve --------------------------------------

function selectionSuite() {
  const T = C['f1.selection'].bounds;
  const a = adapted(blank('base'));
  const g = go(a, {
    seed: 'f1',
    count: 24,
    trials: 50,
    fwhm: FWHM,
    magnitude: { min: magOfSnr(10), max: magOfSnr(3) },
    binWidth: 0.1,
  });
  const sel = selectionOf(g.curve, g.conditions);
  const { min, max } = sel.range;
  const draw = stream('injection', `${PREFIX}-f1`, 'population');
  const N = 4000;
  const pop = Array.from({ length: N }, () => ({
    m: min + draw() * (max - min),
  }));
  const res = sel.apply(pop, i =>
    stream('injection', `${PREFIX}-f1`, 'draw', i)()
  );
  const sd = Math.sqrt(
    Array.from(res.probabilities).reduce((s, p) => s + p * (1 - p), 0)
  );
  const z = (res.included.length - res.expected) / sd;
  add('f1.apply', z, Math.abs(z) <= T.sigmas, {
    bound: T.sigmas,
    note: `${res.included.length} included of ${N}, expected ${res.expected.toFixed(1)}`,
  });
  // counts in ten magnitude bins, corrected by the bin's mean completeness
  const edges = Array.from(
    { length: 11 },
    (_, i) => min + ((max - min) * i) / 10
  );
  const observed = [];
  const comp = [];
  const truth = [];
  for (let b = 0; b < 10; b++) {
    const idx = pop
      .map((p, i) => i)
      .filter(
        i => pop[i].m >= edges[b] && (pop[i].m < edges[b + 1] || b === 9)
      );
    truth.push(idx.length);
    observed.push(idx.filter(i => res.flags[i]).length);
    comp.push(mean(idx.map(i => res.probabilities[i])));
  }
  const cc = completenessCorrect({
    observed,
    completeness: comp,
    population: 'fixed',
  });
  const ok = cc.bins.filter(b => b.status === 'ok');
  const correctedTotal = ok.reduce((s, b) => s + b.corrected, 0);
  const trueTotal = cc.bins.reduce(
    (s, b, i) => s + (b.status === 'ok' ? truth[i] : 0),
    0
  );
  const sigma = Math.sqrt(ok.reduce((s, b) => s + b.sigma * b.sigma, 0));
  const zc = (correctedTotal - trueTotal) / sigma;
  add('f1.correct', zc, Math.abs(zc) <= T.sigmas, {
    bound: T.sigmas,
    note: `${ok.length} of 10 bins usable; corrected ${correctedTotal.toFixed(1)} against ${trueTotal}`,
  });
  // a logistic of the survey suite through the curve
  const lg = logisticOf(g.curve);
  const dm = lg ? Math.abs(lg.m50 - g.curve.m50.m) : Infinity;
  add('f1.logisticM50', dm, dm <= T.logisticM50, {
    bound: T.logisticM50,
    note: lg
      ? `logistic m50 ${lg.m50.toFixed(3)} width ${lg.width.toFixed(3)}`
      : 'no logistic',
  });
  const sumLogistic = lg
    ? pop.reduce((s, p) => s + surveyCompleteness(lg, p.m), 0)
    : NaN;
  const rel = Math.abs(sumLogistic / res.expected - 1);
  add('f1.logisticSum', rel, rel <= T.logisticSum, {
    bound: T.logisticSum,
    note: `${sumLogistic.toFixed(1)} against ${res.expected.toFixed(1)}`,
  });
  // the curve must agree with its own selection function at a bin centre
  evidence(
    'f1.centre',
    completenessAt(g.curve, g.curve.bins.filter(b => b.n)[3].center) -
      g.curve.bins.filter(b => b.n)[3].p,
    'the selection function at a bin centre equals the bin'
  );
  void selection;
  void checkSpec;
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  closedForm();
  bookkeeping();
  rendering();
  psfWidth();
  exactInterval();
  oracle();
  coverage();
  refusals();
  conditions();
  outsideRange();
  reproducible();
  selectionSuite();
  rows.push({
    id: 'g1.authentic',
    measured: null,
    pass: null,
    note: C['g1.authentic'].bound,
  });
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
      const tag = r.evidence
        ? 'evidence'
        : r.pass === null
          ? 'NOT RUN'
          : r.pass
            ? 'pass'
            : 'FAIL';
      process.stdout.write(
        `${tag.padEnd(9)}${r.id.padEnd(34)}${v.padEnd(12)}${b} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
