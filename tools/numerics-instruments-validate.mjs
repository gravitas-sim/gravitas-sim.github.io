// The validator of the numerics instruments (NUMERICS_INSTRUMENTS.md): runs the
// five instruments of js/kernels/numerics/ on the cases committed in
// tests/fixtures/numerics-instruments/thresholds.json, writes the data the
// oracle reads (inputs.json), runs the independent oracle, and judges every
// leg by its committed bound.
//   node tools/numerics-instruments-validate.mjs            run everything, write the fixtures
//   node tools/numerics-instruments-validate.mjs --pinned   judge against the pinned oracle and inputs (no Python, no engine)
// The first complete run is pinned as first-run-results.json and never rewritten.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeState, energy } from '../js/lab3d/kernel.js';
import {
  explicitEuler,
  keplerPair,
  pairAtRest,
  ledger,
  twoStep,
} from '../js/kernels/numerics/ledger.js';
import {
  stepHistory,
  costAtEqualError,
} from '../js/kernels/numerics/stepHistory.js';
import { ensembleRate } from '../js/kernels/numerics/divergenceRate.js';
import { fourierPeriodogram } from '../js/kernels/numerics/dft.js';
import { heldOut } from '../js/kernels/numerics/interpError.js';
import { linear } from '../js/numeric/interp.js';
import { stream, gaussian } from '../js/random/streams.js';
import { searchPeriod } from '../js/measure/periodogram.js';
import { tableOf } from '../js/tableObservation.js';
import * as mist from '../js/data/observations/mistSdssIsochrones.js';
import * as etaAql from '../js/data/observations/tessEtaAqlS81.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = path.join(repo, 'tests/fixtures/numerics-instruments');
const P = 2 * Math.PI;
const file = n => path.join(DIR, n);
const read = n => JSON.parse(readFileSync(file(n), 'utf8'));
const write = (n, o) =>
  writeFileSync(file(n), `${JSON.stringify(o, null, 1)}\n`);

const throws = f => {
  try {
    f();
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
};
const abs = (a, b) => Math.abs(a - b);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
const worst = (a, b) => a.reduce((m, v, i) => Math.max(m, abs(v, b[i])), 0);

// --- the data both sides read ----------------------------------------------------

const noisy = (seed, rate, sigma, tEnd, dt, cap) => {
  const z = gaussian(stream('noise', seed));
  const out = [];
  for (let i = 0; i * dt <= tEnd + 1e-9; i++) {
    const t = i * dt;
    out.push({
      t,
      d: Math.min(cap, 1e-9 * Math.exp(rate * t) * Math.exp(sigma * z())),
    });
  }
  return out;
};

function mistSlice() {
  const t = tableOf(mist);
  const col = id => t.columns.find(c => c.id === id).values;
  const [feh, logAge, phase, mass, r] = [
    'feh',
    'logAge',
    'phase',
    'mass',
    'r',
  ].map(col);
  let best = null;
  for (const f of new Set(feh))
    if (
      best === null ||
      Math.abs(f) < Math.abs(best) ||
      (Math.abs(f) === Math.abs(best) && f < best)
    )
      best = f;
  const ages = new Map();
  for (let i = 0; i < t.n; i++) {
    if (feh[i] !== best || phase[i] !== 0) continue;
    if (!Number.isFinite(mass[i]) || !Number.isFinite(r[i])) continue;
    if (!ages.has(logAge[i]))
      ages.set(logAge[i], { logAge: logAge[i], mass: [], r: [] });
    ages.get(logAge[i]).mass.push(mass[i]);
    ages.get(logAge[i]).r.push(r[i]);
  }
  return {
    pack: mist.PACK.id,
    version: mist.PACK.version,
    feh: best,
    ages: [...ages.values()],
  };
}

function tessSeries() {
  const sidecar = JSON.parse(
    readFileSync(path.join(repo, 'variables/tess-eta-aql-s81.json'), 'utf8')
  );
  const t = tableOf({ PACK: etaAql.PACK, SERIES: sidecar });
  const col = id => t.columns.find(c => c.id === id).values;
  const k = Math.ceil(t.n / 80);
  const out = {
    pack: etaAql.PACK.id,
    version: etaAql.PACK.version,
    rows: t.n,
    every: k,
    t: [],
    y: [],
  };
  for (let i = 0; i < t.n; i += k)
    if (Number.isFinite(col('time')[i]) && Number.isFinite(col('flux')[i])) {
      out.t.push(col('time')[i]);
      out.y.push(col('flux')[i]);
    }
  return out;
}

function unevenSeries() {
  const draw = stream('noise', 270400);
  const t = Array.from({ length: 60 }, () => 30 * draw()).sort((a, b) => a - b);
  const z = gaussian(draw);
  return {
    t,
    y: t.map(v => 1.5 * Math.sin((2 * Math.PI * v) / 2.7 + 0.4) + 0.3 * z()),
  };
}

export function makeInputs(engine) {
  return {
    format: 'gravitas.numerics-instruments-inputs/1',
    i3b: Array.from({ length: 24 }, (_, k) =>
      noisy(270000 + k, 0.5 + 0.02 * k, 0.05, 40, 0.5, 1)
    ),
    i3e: {
      settings: engine.settings,
      series: engine.series,
      pairDrift: engine.pairDrift,
      kindDrift: engine.kindDrift,
    },
    i3e1: engine.positions,
    i4d: unevenSeries(),
    i4f: tessSeries(),
    i5c: mistSlice(),
  };
}

// --- the instruments on the committed cases ------------------------------------------

const sortedUnique = (mass, r) => {
  const idx = mass.map((_, i) => i).sort((a, b) => mass[a] - mass[b] || a - b);
  const m = [];
  const v = [];
  for (const i of idx)
    if (!m.length || mass[i] > m[m.length - 1]) {
      m.push(mass[i]);
      v.push(r[i]);
    }
  return [m, v];
};
const exps = (k, n = 121, dt = 0.25) =>
  Array.from({ length: n }, (_, i) => ({
    t: i * dt,
    d: 1e-8 * (1 + k / 10) * Math.exp(0.7 * i * dt),
  }));
const linears = k =>
  Array.from({ length: 201 }, (_, i) => ({
    t: i * 0.5,
    d:
      1e-6 * (1 + k / 10) * 2 * Math.abs(Math.sin((0.01 * i * 0.5) / 2)) + 1e-9,
  }));
const flat = d => Array.from({ length: 201 }, (_, i) => ({ t: i * 0.5, d }));
const many = (n, f) => Array.from({ length: n }, (_, k) => f(k));
const slim = r => {
  if (!r || typeof r !== 'object') return r;
  const rest = { ...r };
  for (const k of ['grid', 'points', 'steps', 'pairs']) delete rest[k];
  return rest;
};

// The family's own search (the generalized Lomb-Scargle); a refusal of its own is recorded, not thrown.
const gls = async ({ t, y }, minPeriod, maxPeriod) => {
  try {
    return (await searchPeriod({ t, y }, { minPeriod, maxPeriod })).period;
  } catch (e) {
    return { error: String(e?.message ?? e) };
  }
};

export async function runInstruments(inputs) {
  const out = {};
  // I1
  const one = makeState(keplerPair({ e: 0 }));
  const E0 = energy(one);
  explicitEuler(one, 0.01);
  const C = {
    b: [0, 'explicit-euler', 1 / 1024, 1],
    c: [0.5, 'velocity-verlet', P / 200, 2 * P],
    d: [0.5, 'rk4', P / 200, 2 * P],
    e: [0.5, 'symplectic-euler', P / 400, 2 * P],
    f: [0, 'explicit-euler', P / 1000, 3 * P],
  };
  const two = ([e, scheme, h, span]) =>
    twoStep(keplerPair({ e }), scheme, { h, span });
  const k0 = keplerPair({ e: 0 });
  out.I1 = {
    eps1: (energy(one) - E0) / Math.abs(E0),
    cases: Object.fromEntries(Object.entries(C).map(([k, c]) => [k, two(c)])),
    h1: twoStep(k0, 'rk4', { h: 0.001, span: 0.016 }),
    h2: twoStep(keplerPair({ e: 0.9 }), 'explicit-euler', {
      h: P / 20,
      span: 10 * P,
    }),
    h3: {
      few: ['explicit-euler', 'symplectic-euler', 'velocity-verlet', 'rk4'].map(
        s => twoStep(k0, s, { h: 0.01, span: 0.07 }).refused
      ),
      fewLedger: ledger(k0, 'rk4', { h: 0.01, span: 0.07 }).refused,
      zero: throws(() => twoStep(k0, 'rk4', { h: 0, span: 1 })),
      nan: throws(() => twoStep(k0, 'rk4', { h: NaN, span: 1 })),
      span: throws(() => twoStep(k0, 'rk4', { h: 0.01, span: -1 })),
      scheme: throws(() => twoStep(k0, 'heun', { h: 0.01, span: 1 })),
    },
    i: [2 * P, 2.25 * P].map(span =>
      twoStep(keplerPair({ e: 0.5 }), 'velocity-verlet', { h: P / 200, span })
    ),
  };
  // I2
  const ecc = keplerPair({ e: 0.9 });
  const hist = stepHistory(ecc, P, { tol: 1e-9 });
  out.I2 = {
    history: slim(hist),
    cost: costAtEqualError(ecc, P, { tol: 1e-9 }),
    collapse: slim(stepHistory(pairAtRest(), 2, { tol: 1e-9 })),
    h: {
      tol0: throws(() => stepHistory(ecc, P, { tol: 0 })),
      tolNaN: throws(() => stepHistory(ecc, P, { tol: NaN })),
      span0: throws(() => stepHistory(ecc, 0, { tol: 1e-9 })),
      oneBody: throws(() => stepHistory([ecc[0]], P, { tol: 1e-9 })),
    },
  };
  // I3
  let covered = 0;
  let estimates = 0;
  for (let j = 0; j < 200; j++) {
    const r = ensembleRate(
      many(20, k => noisy(271000 + 100 * j + k, 1, 0.05, 25, 0.25, Infinity))
    );
    if (!r.refused) estimates++;
    if (!r.refused && r.lo <= 1 && r.hi >= 1) covered++;
  }
  const full = r => ({ ...slim(r), pairs: r.pairs });
  out.I3 = {
    a: slim(ensembleRate(many(12, k => exps(k)))),
    b: full(ensembleRate(inputs.i3b)),
    c: { ensembles: 200, estimates, covered, fraction: covered / 200 },
    d1: slim(ensembleRate(many(12, linears))),
    d2: [
      ensembleRate(many(12, () => flat(1e-6))),
      ensembleRate(many(12, () => flat(0))),
      ensembleRate(many(9, k => exps(k))),
      ensembleRate([...many(6, k => exps(k)), ...many(14, linears)]),
    ].map(slim),
    e0: { pair: inputs.i3e.pairDrift, kind: inputs.i3e.kindDrift },
    e: full(ensembleRate(inputs.i3e.series)),
    e1: inputs.i3e.series[0].map(p => p.d),
    largestGrowth: Math.max(
      ...inputs.i3e.series.map(s => s[s.length - 1].d / s[0].d)
    ),
  };
  // I4
  const t64 = Array.from({ length: 64 }, (_, i) => i);
  const a = fourierPeriodogram(
    t64,
    t64.map(t => 3 + 2 * Math.cos((2 * Math.PI * t) / 8)),
    { fmin: 1 / 64, fmax: 31 / 64, n: 121 }
  );
  const t256 = Array.from({ length: 256 }, (_, i) => i);
  const t40 = Array.from({ length: 40 }, (_, i) => i);
  const t20 = Array.from({ length: 20 }, (_, i) => i);
  const d = fourierPeriodogram(inputs.i4d.t, inputs.i4d.y, {
    fmin: 0.1,
    fmax: 1,
    n: 541,
  });
  const f = fourierPeriodogram(inputs.i4f.t, inputs.i4f.y, {
    fmin: 1 / 15,
    fmax: 1 / 2,
    n: 521,
  });
  const withPower = r => ({ ...slim(r), power: Array.from(r.grid.power) });
  out.I4 = {
    a: {
      ...slim(a),
      gridMaximum:
        a.grid.freqs[a.grid.power.indexOf(Math.max(...a.grid.power))],
      fourier: Array.from({ length: 31 }, (_, k) => a.grid.power[4 * k]),
    },
    c: slim(
      fourierPeriodogram(
        t256,
        t256.map(t => Math.cos((2 * Math.PI * t) / 4)),
        { fmin: 0.2, fmax: 0.3, n: 1639 }
      )
    ),
    d: withPower(d),
    dGls: await gls(inputs.i4d, 1, 10),
    f: withPower(f),
    fGls: await gls(inputs.i4f, 2, 15),
    g: slim(
      fourierPeriodogram(
        t40,
        t40.map(t => Math.cos(2 * Math.PI * 0.3 * t)),
        { fmin: 0.05, fmax: 0.95, n: 901 }
      )
    ),
    h: {
      few: fourierPeriodogram(
        t20.slice(0, 7),
        t20.slice(0, 7).map(t => Math.sin(t)),
        { fmin: 0.1, fmax: 0.4, n: 20 }
      ).refused,
      constant: fourierPeriodogram(
        t20,
        t20.map(() => 4),
        { fmin: 0.1, fmax: 0.4, n: 20 }
      ).refused,
      nan: throws(() =>
        fourierPeriodogram(
          t20,
          t20.map((t, i) => (i === 3 ? NaN : t)),
          { fmin: 0.1, fmax: 0.4, n: 20 }
        )
      ),
      band: throws(() =>
        fourierPeriodogram(
          t20,
          t20.map(t => Math.sin(t)),
          { fmin: 0.2, fmax: 0.2, n: 20 }
        )
      ),
      work: throws(() =>
        fourierPeriodogram(t20.slice(0, 3), [1, 2, 3], {
          fmin: 0.1,
          fmax: 0.4,
          n: 666667,
        })
      ),
    },
  };
  // I5
  const lin = [0, 0.3, 1, 1.1, 2, 4.5, 5];
  const sq = Array.from({ length: 17 }, (_, i) => i * 0.5);
  const even = (a0, b0, n) =>
    Array.from({ length: n }, (_, i) => a0 + ((b0 - a0) * i) / (n - 1));
  const xe = [0, 0.1, 0.25, 0.5, 0.9, 1.4, 2, 3];
  const coarse = [0, 1, 2, 3, 4].map(k => k * Math.PI);
  const ages = inputs.i5c.ages.slice().sort((p, q) => p.logAge - q.logAge);
  const mid = ages[Math.floor(ages.length / 2)];
  const [mm, rr] = sortedUnique(mid.mass, mid.r);
  const age = {};
  for (const mass of [0.6, 0.8, 1.0]) {
    const xs = [];
    const ys = [];
    for (const g of ages) {
      const [m, v] = sortedUnique(g.mass, g.r);
      if (m[0] <= mass && mass <= m[m.length - 1]) {
        xs.push(g.logAge);
        ys.push(linear(m, v, mass));
      }
    }
    age[mass] = { ages: xs.length, ...heldOut(xs, ys) };
  }
  out.I5 = {
    line: heldOut(
      lin,
      lin.map(x => 2 * x + 1)
    ),
    square: heldOut(
      sq,
      sq.map(x => x * x)
    ),
    sin: heldOut(even(0, Math.PI, 9), even(0, Math.PI, 9).map(Math.sin)),
    runge: heldOut(
      even(-1, 1, 11),
      even(-1, 1, 11).map(x => 1 / (1 + 25 * x * x))
    ),
    exp: heldOut(xe, xe.map(Math.exp)),
    mass: { logAge: mid.logAge, ...heldOut(mm, rr) },
    age,
    d: {
      coarse: slim(heldOut(coarse, coarse.map(Math.cos), { limit: 0.05 })),
      few: heldOut([0, 1, 2, 3], [0, 1, 4, 9]).refused,
      order: throws(() => heldOut([0, 1, 1, 2, 3], [0, 1, 2, 3, 4])),
      nan: throws(() => heldOut([0, 1, 2, 3, 4], [0, 1, NaN, 3, 4])),
      limit: throws(() =>
        heldOut([0, 1, 2, 3, 4], [0, 1, 2, 3, 4], { limit: 0 })
      ),
    },
  };
  return out;
}

// --- the legs --------------------------------------------------------------------------

export function judge(js, or, firstRun = null) {
  const rows = [];
  const leg = (id, cls, pass, measured) =>
    rows.push({
      id,
      class: cls,
      pass: cls === 'reported' ? null : Boolean(pass),
      measured,
    });
  const near = (a, b, absTol, relTol) =>
    abs(a, b) <= absTol &&
    (relTol === undefined || a === b || rel(a, b) <= relTol);

  // I1
  const { I1 } = js;
  const closed = 2 + 0.01 ** 2 - 2 / Math.sqrt(1 + 0.01 ** 2);
  leg('I1.a', 'analytic', abs(I1.eps1, closed) <= 1e-12, {
    eps1: I1.eps1,
    closed,
    diff: abs(I1.eps1, closed),
  });
  const c = I1.cases;
  leg(
    'I1.b',
    'analytic',
    c.b.kind === 'secular' && abs(c.b.orderEnd, 1) <= 0.02,
    {
      kind: c.b.kind,
      orderEnd: c.b.orderEnd,
      end: c.b.coarse?.end,
      endHalf: c.b.fine?.end,
    }
  );
  leg(
    'I1.c',
    'analytic',
    c.c.kind === 'oscillating' &&
      c.c.orderEnd === null &&
      abs(c.c.orderMax, 2) <= 0.1,
    {
      kind: c.c.kind,
      orderMax: c.c.orderMax,
      orderEnd: c.c.orderEnd,
      maxAbs: c.c.coarse?.maxAbs,
      maxAbsHalf: c.c.fine?.maxAbs,
    }
  );
  leg(
    'I1.d',
    'analytic',
    c.d.kind === 'secular' && c.d.orderEnd >= 3.5 && c.d.orderEnd <= 5.5,
    {
      kind: c.d.kind,
      orderEnd: c.d.orderEnd,
      end: c.d.coarse?.end,
      endHalf: c.d.fine?.end,
    }
  );
  leg(
    'I1.e',
    'analytic',
    c.e.kind === 'oscillating' && abs(c.e.orderMax, 1) <= 0.1,
    {
      kind: c.e.kind,
      orderMax: c.e.orderMax,
      maxAbs: c.e.coarse?.maxAbs,
      maxAbsHalf: c.e.fine?.maxAbs,
    }
  );
  const out = r =>
    r && !r.refused && r.end > 0 && r.separation.end / r.separation.start > 1;
  leg('I1.f', 'analytic', !c.f.refused && out(c.f.coarse) && out(c.f.fine), {
    refused: c.f.refused ?? null,
    end: c.f.coarse?.end,
    endHalf: c.f.fine?.end,
    growth:
      c.f.coarse?.separation &&
      c.f.coarse.separation.end / c.f.coarse.separation.start,
    growthHalf:
      c.f.fine?.separation &&
      c.f.fine.separation.end / c.f.fine.separation.start,
  });
  let g = true;
  const gWorst = { endAbs: 0, endRel: 0, sepRel: 0, ratioRel: 0, order: 0 };
  for (const k of [...Object.keys(c), 'i2']) {
    const j = k === 'i2' ? I1.i[1] : c[k];
    const o = or.I1[k];
    if (j.refused) {
      g = false;
      continue;
    }
    for (const [run, orun] of [
      [j.coarse, o.coarse],
      [j.fine, o.fine],
    ]) {
      for (const q of ['end', 'maxAbs', 'maxAbsHalf']) {
        gWorst.endAbs = Math.max(gWorst.endAbs, abs(run[q], orun[q]));
        gWorst.endRel = Math.max(gWorst.endRel, rel(run[q], orun[q]));
        g &&= near(run[q], orun[q], 1e-9, 1e-6);
      }
      const sr = run.separation.end / run.separation.start;
      gWorst.sepRel = Math.max(gWorst.sepRel, rel(sr, orun.sepRatio));
      g &&= rel(sr, orun.sepRatio) <= 1e-9 && run.steps === orun.steps;
    }
    for (const q of ['ratioEnd', 'ratioMax']) {
      gWorst.ratioRel = Math.max(gWorst.ratioRel, rel(j[q], o[q]));
      g &&= rel(j[q], o[q]) <= 1e-6;
    }
    gWorst.order = Math.max(gWorst.order, abs(j.orderMax, o.orderMax));
    g &&= abs(j.orderMax, o.orderMax) <= 1e-6 && j.kind === o.kind2;
    if (j.orderEnd !== null) {
      gWorst.order = Math.max(gWorst.order, abs(j.orderEnd, o.orderEnd2));
      g &&= o.orderEnd2 !== null && abs(j.orderEnd, o.orderEnd2) <= 1e-6;
    } else g &&= o.orderEnd2 === null;
  }
  leg('I1.g', 'oracle', g, gWorst);
  const bare = r =>
    r.refused &&
    r.ratioMax === undefined &&
    r.orderMax === undefined &&
    r.orderEnd === undefined;
  leg('I1.h1', 'refusal', I1.h1.refused === 'rounding-floor' && bare(I1.h1), {
    refused: I1.h1.refused ?? null,
    maxAbsHalf: I1.h1.fine?.maxAbs,
  });
  leg('I1.h2', 'refusal', I1.h2.refused === 'unbound' && bare(I1.h2), {
    refused: I1.h2.refused ?? null,
    at: I1.h2.coarse?.at ?? null,
  });
  const h3 = I1.h3;
  leg(
    'I1.h3',
    'refusal',
    h3.few.every(r => r === 'too-few-steps') &&
      h3.fewLedger === 'too-few-steps' &&
      h3.zero &&
      h3.nan &&
      h3.span &&
      h3.scheme,
    h3
  );
  leg(
    'I1.i',
    'refusal',
    I1.i.every(
      r =>
        r.kind === 'oscillating' &&
        r.orderEnd === null &&
        r.reason === 'end-phase' &&
        abs(r.orderMax, 2) <= 0.1
    ),
    I1.i.map(r => ({
      kind: r.kind,
      orderEnd: r.orderEnd,
      reason: r.reason,
      orderMax: r.orderMax,
      end: r.coarse?.end,
      endHalf: r.fine?.end,
    }))
  );

  // I2
  const h = js.I2.history;
  const o2 = or.I2;
  const ok2 = !h.refused;
  const back =
    ok2 &&
    Math.hypot(
      h.final[3] - h.final[0] - 0.1,
      h.final[4] - h.final[1],
      h.final[5] - h.final[2]
    );
  leg('I2.a', 'analytic', ok2 && back <= 1e-4, {
    refused: h.refused ?? null,
    distance: back,
  });
  const tMin = ok2 && Math.min(h.hMin.t, P - h.hMin.t) / P;
  const tMax = ok2 && Math.abs(h.hMax.t - P / 2) / P;
  leg(
    'I2.b',
    'analytic',
    ok2 && tMin <= 0.02 && tMax <= 0.1 && h.hMax.h / h.hMin.h >= 10,
    {
      hMinPhase: tMin,
      hMaxPhase: tMax,
      hMin: h.hMin?.h,
      hMax: h.hMax?.h,
      ratio: ok2 && h.hMax.h / h.hMin.h,
    }
  );
  leg('I2.c', 'analytic', ok2 && h.slope >= 1.2 && h.slope <= 1.9, {
    slope: h.slope,
  });
  leg(
    'I2.d',
    'oracle',
    ok2 &&
      abs(h.accepted, o2.accepted) <= 2 &&
      abs(h.rejected, o2.rejected) <= 2 &&
      rel(h.hMin.h, o2.v2.hMin) <= 1e-3 &&
      rel(h.hMax.h, o2.v2.hMax) <= 1e-3 &&
      abs(h.slope, o2.v2.slope) <= 0.01 &&
      worst(h.final, o2.final) <= 1e-7,
    {
      accepted: [h.accepted, o2.accepted],
      rejected: [h.rejected, o2.rejected],
      hMinRel: ok2 && rel(h.hMin.h, o2.v2.hMin),
      hMaxRel: ok2 && rel(h.hMax.h, o2.v2.hMax),
      slope: [h.slope, o2.v2.slope],
      finalAbs: ok2 && worst(h.final, o2.final),
    }
  );
  leg('I2.e', 'oracle', ok2 && worst(h.final, o2.dop853) <= 1e-5, {
    finalAbs: ok2 && worst(h.final, o2.dop853),
  });
  const cost = js.I2.cost;
  leg(
    'I2.f',
    'oracle',
    !cost.refused &&
      cost.fixedSteps === o2.cost.fixedSteps &&
      rel(cost.errAdaptive, o2.cost.errAdaptive) <= 0.01 &&
      abs(cost.adaptiveEvaluations, o2.cost.adaptiveEvaluations) <= 12,
    { instrument: cost, oracle: o2.cost }
  );
  const col = js.I2.collapse;
  const tc = 1.1107207345395915;
  leg(
    'I2.g',
    'refusal',
    col.refused === 'step-collapse' && abs(col.at.t, tc) <= 1e-3,
    {
      refused: col.refused ?? null,
      at: col.at ?? null,
      collision: tc,
      accepted: col.accepted,
      rejected: col.rejected,
    }
  );
  leg('I2.h', 'refusal', Object.values(js.I2.h).every(Boolean), js.I2.h);
  leg('I2.r', 'reported', null, {
    instrument: {
      accepted: h.accepted,
      rejected: h.rejected,
      evaluations: h.evaluations,
    },
    scipyRK45: o2.rk45,
  });

  // I3
  const { I3 } = js;
  const o3 = or.I3;
  leg(
    'I3.a',
    'analytic',
    !I3.a.refused &&
      I3.a.counts.exponential === 12 &&
      abs(I3.a.median, 0.7) <= 1e-9 &&
      abs(I3.a.lo, 0.7) <= 1e-9 &&
      abs(I3.a.hi, 0.7) <= 1e-9,
    {
      refused: I3.a.refused ?? null,
      median: I3.a.median,
      lo: I3.a.lo,
      hi: I3.a.hi,
      exponential: I3.a.counts.exponential,
    }
  );
  const same = (j, o) => {
    const w = { behaviours: true, rate: 0, r2: 0, window: true, summary: 0 };
    w.kind =
      (j.refused ?? null) === (o.refused ?? null) &&
      (j.behavior ?? null) === (o.behavior ?? null);
    j.pairs.forEach((p, i) => {
      const q = o.pairs[i];
      if (p.behavior !== q.behavior) w.behaviours = false;
      if (p.behavior === 'exponential' && q.behavior === 'exponential') {
        w.rate = Math.max(w.rate, abs(p.rate, q.rate));
        w.r2 = Math.max(w.r2, abs(p.r2, q.r2));
        if (p.from !== q.from || p.to !== q.to) w.window = false;
      }
    });
    if (!j.refused && !o.refused)
      for (const q of ['median', 'lo', 'hi'])
        w.summary = Math.max(w.summary, abs(j[q], o[q]));
    w.pass =
      w.kind &&
      w.behaviours &&
      w.window &&
      w.rate <= 1e-9 &&
      w.r2 <= 1e-9 &&
      w.summary <= 1e-9;
    return w;
  };
  const sb = same(I3.b, o3.b);
  leg('I3.b', 'oracle', sb.pass, {
    ...sb,
    counts: I3.b.counts,
    median: I3.b.median,
    lo: I3.b.lo,
    hi: I3.b.hi,
  });
  leg('I3.c', 'coverage', I3.c.fraction >= 0.9 && I3.c.estimates === 200, I3.c);
  leg(
    'I3.d1',
    'refusal',
    I3.d1.refused === 'not-exponential' &&
      I3.d1.behavior === 'linear' &&
      I3.d1.median === undefined,
    {
      refused: I3.d1.refused ?? null,
      behavior: I3.d1.behavior ?? null,
      counts: I3.d1.counts,
    }
  );
  const d2 = I3.d2;
  leg(
    'I3.d2',
    'refusal',
    d2[0].refused === 'not-exponential' &&
      d2[0].behavior === 'bounded' &&
      d2[1].refused === 'not-exponential' &&
      d2[1].behavior === 'identical' &&
      d2[2].refused === 'too-few-pairs' &&
      d2[3].refused === 'not-exponential' &&
      d2[3].behavior === 'linear' &&
      d2[3].counts.exponential === 6,
    d2.map(r => ({
      refused: r.refused ?? null,
      behavior: r.behavior ?? null,
      counts: r.counts,
    }))
  );
  const e0 = I3.e0.pair.map((v, i) => abs(v, I3.e0.kind[i]));
  leg('I3.e0', 'analytic', e0.length === 3 && e0.every(v => v <= 1e-12), {
    pair: I3.e0.pair,
    kind: I3.e0.kind,
    diff: e0,
  });
  const se = same(I3.e, o3.e);
  leg('I3.e', 'oracle', se.pass, {
    ...se,
    refused: I3.e.refused ?? null,
    behavior: I3.e.behavior ?? null,
  });
  const dmax = Math.max(...I3.e1);
  const e1 = worst(I3.e1, o3.e1);
  leg('I3.e1', 'oracle', e1 <= 1e-12 * dmax, {
    worst: e1,
    largest: dmax,
    bound: 1e-12 * dmax,
  });
  leg('I3.r', 'reported', null, {
    counts: I3.e.counts,
    largestGrowth: I3.largestGrowth,
    refused: I3.e.refused ?? null,
    behavior: I3.e.behavior ?? null,
    median: I3.e.median ?? null,
    lo: I3.e.lo ?? null,
    hi: I3.e.hi ?? null,
    window: I3.e.window ?? null,
    firstSeparation: I3.e1[0],
    lastSeparation: I3.e1[I3.e1.length - 1],
  });

  // I4
  const { I4 } = js;
  const o4 = or.I4;
  const offBins = I4.a.fourier.reduce(
    (m, v, k) => (k === 7 ? m : Math.max(m, v)),
    0
  );
  leg(
    'I4.a',
    'analytic',
    !I4.a.refused &&
      abs(I4.a.fourier[7], 1) <= 1e-12 &&
      abs(I4.a.peak.amplitude, 2) <= 1e-12 &&
      offBins < 1e-12 &&
      abs(I4.a.peak.frequency, 0.125) <= 1e-9,
    {
      power: I4.a.fourier[7],
      amplitude: I4.a.peak?.amplitude,
      largestOtherBin: offBins,
      frequency: I4.a.peak?.frequency,
    }
  );
  leg('I4.b', 'oracle', worst(I4.a.fourier, o4.fourier) <= 1e-12, {
    worst: worst(I4.a.fourier, o4.fourier),
  });
  leg(
    'I4.c',
    'analytic',
    !I4.c.refused &&
      abs(I4.c.fwhm * 256, 0.8859) <= 0.0177 &&
      abs(I4.c.resolution, 1 / 255) <= 1e-15,
    {
      fwhmTimesN: I4.c.fwhm * 256,
      resolution: I4.c.resolution,
      oracleFwhmTimesN: o4.width.fwhm * 256,
    }
  );
  const cmp = (j, o) => ({
    power: worst(j.power, o.power),
    frequency: j.refused ? null : rel(j.peak.frequency, o.peakFrequency),
    amplitude: j.refused ? null : rel(j.peak.amplitude, o.amplitude),
    fwhm:
      j.fwhm === null || o.fwhm === null
        ? j.fwhm === o.fwhm
          ? 0
          : Infinity
        : rel(j.fwhm, o.fwhm),
    second:
      j.second === null || o.secondFrequency === null
        ? j.second === null && o.secondFrequency === null
          ? 0
          : Infinity
        : rel(j.second.frequency, o.secondFrequency),
  });
  const cd = cmp(I4.d, o4.d);
  leg(
    'I4.d',
    'oracle',
    !I4.d.refused &&
      cd.power <= 1e-9 &&
      cd.frequency <= 1e-9 &&
      cd.amplitude <= 1e-9 &&
      cd.fwhm <= 1e-9 &&
      cd.second <= 1e-9,
    {
      ...cd,
      refused: I4.d.refused ?? null,
      peak: I4.d.peak ?? null,
      aliasRatio: I4.d.aliasRatio,
    }
  );
  const fam = (j, gls) =>
    j.refused ? null : abs(j.peak.frequency, 1 / gls) * j.baseline;
  leg('I4.e', 'family', !I4.d.refused && fam(I4.d, I4.dGls) <= 0.1, {
    frequency: I4.d.peak?.frequency,
    glsFrequency: 1 / I4.dGls,
    differenceTimesT: fam(I4.d, I4.dGls),
    scipyLombScarglePeak: o4.d.scipyLombScarglePeak,
  });
  const cf = cmp(I4.f, o4.f);
  leg(
    'I4.f',
    'authentic',
    !I4.f.refused &&
      fam(I4.f, I4.fGls) <= 0.1 &&
      cf.frequency <= 1e-9 &&
      cf.power <= 1e-9,
    {
      refused: I4.f.refused ?? null,
      points: I4.f.n,
      baseline: I4.f.baseline,
      period: I4.f.peak?.period ?? null,
      glsPeriod: I4.fGls,
      differenceTimesT: fam(I4.f, I4.fGls),
      power: cf.power,
      frequency: cf.frequency,
      aliasRatio: I4.f.aliasRatio,
      candidates: I4.f.candidates ?? null,
    }
  );
  const cand = I4.g.candidates?.map(p => p.frequency).sort((x, y) => x - y);
  leg(
    'I4.g',
    'refusal',
    I4.g.refused === 'alias' &&
      I4.g.peak === undefined &&
      abs(cand[0], 0.3) <= 1e-3 &&
      abs(cand[1], 0.7) <= 1e-3,
    {
      refused: I4.g.refused ?? null,
      candidates: I4.g.candidates ?? null,
      aliasRatio: I4.g.aliasRatio,
    }
  );
  const h4 = I4.h;
  leg(
    'I4.h',
    'refusal',
    h4.few === 'too-few' &&
      h4.constant === 'no-variation' &&
      h4.nan &&
      h4.band &&
      h4.work,
    h4
  );

  // I5
  const { I5 } = js;
  const o5 = or.I5;
  const lineMax = Math.max(I5.line.linear.max, I5.line.spline.max);
  const sqWorst = I5.square.points.reduce(
    (m, p) => Math.max(m, abs(p.errLinear, 0.25)),
    0
  );
  leg(
    'I5.a',
    'analytic',
    lineMax <= 1e-12 && I5.line.closer === 'tie' && sqWorst <= 1e-12,
    {
      lineLargestError: lineMax,
      closer: I5.line.closer,
      squareWorstFromQuarter: sqWorst,
    }
  );
  const table = (j, o) => {
    if (j.refused || o.refused)
      return {
        pass: (j.refused ?? null) === (o.refused ?? null),
        refused: j.refused ?? null,
      };
    const w = {
      points: Math.max(
        worst(
          j.points.map(p => p.errLinear),
          o.errLinear
        ),
        worst(
          j.points.map(p => p.errSpline),
          o.errSpline
        )
      ),
      summary: Math.max(
        abs(j.linear.rms, o.rmsLinear),
        abs(j.spline.rms, o.rmsSpline),
        abs(j.linear.max, o.maxLinear),
        abs(j.spline.max, o.maxSpline)
      ),
      closer: [j.closer ?? null, o.closer],
      rmsLinear: j.linear.rms,
      rmsSpline: j.spline.rms,
      n: j.n,
    };
    w.pass =
      j.points.length === o.errLinear.length &&
      w.points <= 1e-10 &&
      w.summary <= 1e-10 &&
      j.closer === o.closer;
    return w;
  };
  const tb = ['sin', 'runge', 'exp'].map(k => [k, table(I5[k], o5[k])]);
  leg(
    'I5.b',
    'oracle',
    tb.every(([, w]) => w.pass),
    Object.fromEntries(tb)
  );
  const tm = table(I5.mass, o5.mass);
  const ta = Object.keys(I5.age).map(k => [
    k,
    table(I5.age[k], o5.age[Number(k).toFixed(1)] ?? o5.age[k]),
  ]);
  leg(
    'I5.c',
    'authentic',
    !I5.mass.refused && tm.pass && ta.every(([, w]) => w.pass),
    { mass: { logAge: I5.mass.logAge, ...tm }, age: Object.fromEntries(ta) }
  );
  const d5 = I5.d;
  leg(
    'I5.d',
    'refusal',
    d5.coarse.refused === 'too-coarse' &&
      d5.coarse.closer === undefined &&
      d5.few === 'too-few' &&
      d5.order &&
      d5.nan &&
      d5.limit,
    d5
  );
  leg('I5.r', 'reported', null, {
    mass: {
      logAge: I5.mass.logAge,
      n: I5.mass.n,
      closer: I5.mass.closer ?? null,
      rmsLinear: I5.mass.linear?.rms,
      rmsSpline: I5.mass.spline?.rms,
    },
    age: Object.fromEntries(
      Object.entries(I5.age).map(([k, v]) => [
        k,
        {
          ages: v.ages,
          refused: v.refused ?? null,
          closer: v.closer ?? null,
          rmsLinear: v.linear?.rms ?? null,
          rmsSpline: v.spline?.rms ?? null,
        },
      ])
    ),
  });

  // AM2: the successors of the three failed legs' definitions. A superseded leg is
  // carried from the pinned first run (it is not re-judged on changed code); the
  // row computed here on the changed instrument takes the suffix s.
  const sep = h.separationRange;
  const bs = ok2 && {
    atLongest: h.hMax.r / sep.max,
    atShortest: h.hMin.r / sep.min,
    ratio: h.hMax.h / h.hMin.h,
    hMin: h.hMin.h,
    hMax: h.hMax.h,
    oracle: [o2.v2.rAtHMax / o2.v2.rMax, o2.v2.rAtHMin / o2.v2.rMin],
  };
  const extra = {
    'I2.b': {
      id: 'I2.bs',
      class: 'analytic',
      pass: Boolean(
        ok2 && bs.atLongest >= 0.9 && bs.atShortest <= 2 && bs.ratio >= 10
      ),
      measured: bs,
    },
    'I4.a': {
      id: 'I4.as',
      class: 'analytic',
      pass: Boolean(
        !I4.a.refused &&
        abs(I4.a.fourier[7], 1) <= 1e-12 &&
        abs(I4.a.peak.amplitude, 2) <= 1e-12 &&
        offBins < 1e-12 &&
        I4.a.gridMaximum === 0.125 &&
        abs(I4.a.peak.frequency, 0.125) <= 0.1 / 63
      ),
      measured: {
        gridMaximum: I4.a.gridMaximum,
        frequency: I4.a.peak?.frequency,
        differenceOverResolution: abs(I4.a.peak?.frequency, 0.125) * 63,
        power: I4.a.fourier[7],
        amplitude: I4.a.peak?.amplitude,
        largestOtherBin: offBins,
      },
    },
  };
  const all = [];
  for (const r of rows) {
    if (!firstRun || !SUPERSEDED.includes(r.id)) {
      all.push(r);
      continue;
    }
    all.push({
      ...firstRun.rows.find(q => q.id === r.id),
      carried: 'first-run',
      supersededBy: `${r.id}s`,
    });
    all.push(extra[r.id] ?? { ...r, id: `${r.id}s` });
  }
  const tally = keep => {
    const instruments = {};
    for (const r of all.filter(keep)) {
      const k = r.id.split('.')[0];
      instruments[k] ??= {
        pass: true,
        legs: 0,
        passed: 0,
        failed: [],
        reported: 0,
      };
      if (r.pass === null) instruments[k].reported++;
      else {
        instruments[k].legs++;
        if (r.pass) instruments[k].passed++;
        else {
          instruments[k].pass = false;
          instruments[k].failed.push(r.id);
        }
      }
    }
    const passing = Object.values(instruments).filter(v => v.pass).length;
    return {
      verdict: passing === 5 ? 'A' : passing === 0 ? 'C' : 'B',
      instruments,
    };
  };
  // The committed function over the committed legs; then the same function with
  // each superseded leg replaced by its successor (AM2).
  const committed = tally(r => !r.id.endsWith('s'));
  return {
    format: 'gravitas.numerics-instruments-results/1',
    ...committed,
    amended: firstRun ? tally(r => !r.supersededBy) : null,
    rows: all,
  };
}

export const SUPERSEDED = [
  'I1.b',
  'I1.c',
  'I1.d',
  'I1.e',
  'I1.f',
  'I1.g',
  'I1.i',
  'I2.b',
  'I2.c',
  'I2.d',
  'I4.a',
];

async function main() {
  const pinned = process.argv.includes('--pinned');
  let inputs;
  if (pinned) inputs = read('inputs.json');
  else {
    const engine = JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(repo, 'tools/numerics-instruments-engine-child.mjs')],
        { maxBuffer: 1 << 28, encoding: 'utf8' }
      )
    );
    inputs = makeInputs(engine);
    write('inputs.json', inputs);
    execFileSync(
      '/usr/bin/python3',
      [
        '-E',
        path.join(repo, 'tools/numerics-instruments-oracle/oracle.py'),
        file('inputs.json'),
        file('oracle-results.json'),
      ],
      { stdio: 'inherit', timeout: 1800000 }
    );
  }
  const results = judge(
    await runInstruments(inputs),
    read('oracle-results.json'),
    existsSync(file('first-run-results.json'))
      ? read('first-run-results.json')
      : null
  );
  results.node = process.version;
  if (!pinned) {
    write('results.json', results);
    if (!existsSync(file('first-run-results.json')))
      write('first-run-results.json', results);
    write('failed-legs.json', {
      format: 'gravitas.numerics-instruments-failed-legs/1',
      rule: 'left failing; only Carl resets a bound',
      legs: results.rows.filter(r => r.pass === false).map(r => r.id),
    });
  }
  for (const r of results.rows)
    console.log(
      `${r.pass === null ? 'REPORTED' : r.pass ? 'pass' : 'FAIL'}  ${r.id}  (${r.class})`
    );
  if (results.amended)
    console.log(
      `amended (AM2) ${results.amended.verdict}: ${Object.entries(
        results.amended.instruments
      )
        .map(
          ([k, v]) => `${k} ${v.pass ? 'PASS' : 'FAIL'} ${v.passed}/${v.legs}`
        )
        .join(', ')}`
    );
  console.log(
    `verdict ${results.verdict}: ${Object.entries(results.instruments)
      .map(([k, v]) => `${k} ${v.pass ? 'PASS' : 'FAIL'} ${v.passed}/${v.legs}`)
      .join(', ')}`
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
