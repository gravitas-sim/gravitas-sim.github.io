#!/usr/bin/env node
// =============================================================================
// The Gaia parallax workflow kernel against its committed thresholds (Prompt 233)
// -----------------------------------------------------------------------------
//   npm run gaia:validate                    print the table
//   npm run gaia:validate -- --json          print it as JSON
//   npm run gaia:validate -- --write-results rewrite tests/fixtures/gaia-workflows/results.json
//   npm run gaia:validate -- --write-failed  rewrite tests/fixtures/gaia-workflows/failed-legs.json
//   npm run gaia:validate -- --write-ensembles rewrite the truth manifests
//   --only=C1,C2                             run the legs whose id starts with these
//
// tests/fixtures/gaia-workflows/thresholds.json fixed every bound before
// js/kernels/galactic/astrometry.js existed (GAIA_WORKFLOWS.md, "Validation
// contract"). This reads the bounds from that file, not from copies, and judges
// the production modules against them. The oracle rows read the results of
// tools/gaia-oracle/oracle.py pinned in oracle-results.json (numpy and scipy,
// run offline, never by a test). The synthetic data carries its truth manifest
// (ensembles.json). Bands and counts are judged; nothing stored passes through a
// trigonometric function. A leg whose file was never supplied is NOT RUN and
// says why.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as Base from '../js/kernels/galactic/index.js';
import * as Gaia from '../js/kernels/galactic/gaia.js';
const K = { ...Base, ...Gaia };
import * as astrometryModule from '../js/kernels/galactic/astrometry.js';
import { stream, gaussian } from '../js/random/streams.js';
import { adaptive, gaussLegendre } from '../js/numeric/quadrature.js';
import { brent } from '../js/numeric/roots.js';
import { normalCdf, normalQuantile } from '../js/kernels/statistics/special.js';
import { selection } from '../js/kernels/statistics/selection.js';
import { tableOf } from '../js/tableObservation.js';
import { PACK as NGC_PACK } from '../js/data/observations/gaiaNgc2420.js';
import { PACK as SOLAR_PACK } from '../js/data/observations/gaiaSolarNeighbourhood.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/gaia-workflows';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEED = THRESHOLDS.seeds.synthetic;

const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const reported = (id, measured, note = '') =>
  rows.push({ id, status: 'reported', measured, note });
const notRun = (id, note) =>
  rows.push({ id, status: 'not-run', measured: null, note });
const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const only = (args.find(a => a.startsWith('--only=')) ?? '')
  .slice(7)
  .split(',')
  .filter(Boolean);
const wanted = id => !only.length || only.some(p => id.startsWith(p));
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);

const manifests = {};
/** A seeded normal stream and a uniform one, recorded in the truth manifest. */
const streams = (seed, label) => {
  const u = stream('noise', seed, label);
  return { u, z: gaussian(u) };
};
const record = (label, seed, what, truths) => {
  let sum = 0;
  for (const t of truths) sum += t;
  manifests[label] = {
    seed,
    stream: `noise:${seed}:${label}`,
    what,
    n: truths.length,
    truthMean: sig(sum / truths.length, 8),
    firstTruths: Array.from(truths.slice(0, 5), v => sig(v, 8)),
  };
};

const LEVEL1 = 0.6826894921370859; // exactly one sigma
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const median = a => {
  const s = Float64Array.from(a).sort();
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
};
const sd = a => {
  const m = mean(a);
  return Math.sqrt(
    a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)
  );
};

// ---- leg a: analytic ---------------------------------------------------------------

if (wanted('A1.')) {
  const L = lim('A1.inversionBias');
  const out = [];
  let ok = true;
  for (const level of L.levels) {
    const { z } = streams(SEED[0], `A1:${level}`);
    const ratios = [];
    for (let i = 0; i < L.draws; i++) {
      const p = level + z();
      if (p >= L.cutSigma) ratios.push(level / p);
    }
    const m = mean(ratios);
    const se = sd(ratios) / Math.sqrt(ratios.length);
    const phi = x => Math.exp(-0.5 * (x - level) ** 2);
    const num = adaptive(
      x => (level / x) * phi(x),
      L.cutSigma,
      level + 14
    ).value;
    const den = adaptive(phi, L.cutSigma, level + 14).value;
    const exact = num / den;
    const sigmas = Math.abs(m - exact) / se;
    if (!(sigmas <= L.maxSigmasFromQuadrature)) ok = false;
    const entry = {
      level,
      mc: sig(m, 6),
      quadrature: sig(exact, 8),
      sigmas: sig(sigmas, 3),
      kept: ratios.length,
    };
    if (level === L.seriesLevel) {
      const series = 1 + 1 / level ** 2 + 3 / level ** 4;
      entry.series = sig(series, 8);
      entry.relFromSeries = sig(rel(m, series), 3);
      if (!(rel(m, series) <= L.maxRelFromSeries)) ok = false;
    }
    out.push(entry);
  }
  row('A1.inversionBias', ok, out);
}

if (wanted('A1b')) {
  const L = lim('A1b.inversionMedian');
  const { z } = streams(SEED[0], 'A1b');
  const r = [];
  for (let i = 0; i < L.draws; i++) r.push(L.level / (L.level + z()));
  const m = median(r);
  const se = (1.2533 * sd(r)) / Math.sqrt(r.length);
  const sigmas = Math.abs(m - 1) / se;
  row('A1b.inversionMedian', sigmas <= L.maxSigmas, {
    median: sig(m, 6),
    sigmas: sig(sigmas, 3),
  });
}

/** Positive real roots of r^3 - 2 L r^2 + (L p / s^2) r - L / s^2, the one that maximises the posterior. */
function cubicMode(p, s, Lscale) {
  const f = r =>
    r ** 3 -
    2 * Lscale * r ** 2 +
    ((Lscale * p) / s ** 2) * r -
    Lscale / s ** 2;
  const logp = r =>
    -0.5 * ((p - 1 / r) / s) ** 2 + 2 * Math.log(r) - r / Lscale;
  const xs = [];
  for (let i = 0; i <= 20000; i++)
    xs.push(1e-3 * Math.exp((Math.log(1e5) * i) / 20000));
  const roots = [];
  for (let i = 1; i < xs.length; i++)
    if (f(xs[i - 1]) * f(xs[i]) < 0)
      roots.push(brent(f, xs[i - 1], xs[i], { xTol: 1e-15 }).x);
  return roots.reduce(
    (best, r) => (best === null || logp(r) > logp(best) ? r : best),
    null
  );
}

if (wanted('A2.')) {
  const L = lim('A2.edsdMode');
  const out = L.cases.map(c => {
    const post = K.posterior({
      parallax: c.p,
      error: c.s,
      prior: { name: 'edsd', L: c.L },
    });
    const exact = cubicMode(c.p, c.s, c.L);
    return {
      ...c,
      kernel: sig(post.mode, 10),
      closed: sig(exact, 10),
      rel: rel(post.mode, exact),
    };
  });
  row(
    'A2.edsdMode',
    out.every(o => o.rel <= L.maxRel),
    out.map(o => ({ p: o.p, s: o.s, L: o.L, rel: sig(o.rel, 3) }))
  );
}

if (wanted('A3.')) {
  const L = lim('A3.likelihoodInterval');
  const out = L.cases.map(c => {
    const r = K.distanceFromParallax({
      parallax: c.p,
      error: c.s,
      level: LEVEL1,
    });
    const lo = 1 / (c.p + c.s);
    const hiClosed = c.p - c.s > 1e-12 ? 1 / (c.p - c.s) : null;
    const openOk =
      hiClosed === null
        ? r.interval.hi === null
        : rel(r.interval.hi, hiClosed) <= L.maxRel;
    const ok =
      rel(r.interval.lo, lo) <= L.maxRel &&
      openOk &&
      rel(r.distance, 1 / c.p) <= L.maxRel;
    return {
      p: c.p,
      s: c.s,
      ok,
      lo: sig(r.interval.lo, 8),
      hi: r.interval.hi === null ? null : sig(r.interval.hi, 8),
    };
  });
  row(
    'A3.likelihoodInterval',
    out.every(o => o.ok),
    out
  );
}

if (wanted('A4.')) {
  const L = lim('A4.zeroPointAlgebra');
  const c = K.correctParallax({
    parallax: 0.437,
    error: 0.03,
    zeroPoint: { value: -0.017, sigma: 0.01 },
  });
  let ok =
    rel(c.w, 0.437 + 0.017) <= L.maxRel &&
    rel(c.s, Math.sqrt(0.03 ** 2 + 0.01 ** 2)) <= L.maxRel;
  const clusters = L.clusterN.map(n => {
    const stars = Array.from({ length: n }, (_, i) => ({
      parallax: 0.4 + 0.001 * i,
      error: 0.03,
      zeroPoint: -0.017,
    }));
    const r = K.clusterParallax({ stars, systematic: 0.01 });
    const right = Math.sqrt(0.03 ** 2 / n + 0.01 ** 2);
    const wrong = Math.sqrt(0.03 ** 2 / n + 0.01 ** 2 / n);
    const good =
      rel(r.error, right) <= L.maxRel &&
      (n === 1 || Math.abs(r.error - wrong) > 1e-4);
    if (!good) ok = false;
    return {
      n,
      error: sig(r.error, 8),
      right: sig(right, 8),
      wrongIfDividedByN: sig(wrong, 8),
    };
  });
  row('A4.zeroPointAlgebra', ok, { w: c.w, s: sig(c.s, 10), clusters });
}

if (wanted('A5.')) {
  const L = lim('A5.tangentialVelocityLinear');
  let worst = 0;
  const mu = 7.3;
  for (const prior of ['none', { name: 'edsd', L: 1 }]) {
    const r = K.distanceFromParallax({ parallax: 1.0, error: 0.05, prior });
    const v = K.velocityAtFixedMotion(r, mu);
    const f = K.K_PM * mu;
    for (const [got, want] of [
      [v.value, f * r.distance],
      [v.interval.lo, f * r.interval.lo],
      [v.interval.hi, f * r.interval.hi],
    ])
      worst = Math.max(worst, rel(got, want));
  }
  row('A5.tangentialVelocityLinear', worst <= L.maxRel, { worstRel: worst });
}

/** E[|(a, b)|] for independent normals, by tensor Gauss-Legendre. */
function expectedHypot(ma, mb, sa, sb) {
  const pdf = (x, m, s) =>
    Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  return gaussLegendre(
    x =>
      pdf(x, ma, sa) *
      gaussLegendre(
        y => Math.hypot(x, y) * pdf(y, mb, sb),
        mb - 9 * sb,
        mb + 9 * sb,
        6
      ),
    ma - 9 * sa,
    ma + 9 * sa,
    6
  );
}

if (wanted('A6.')) {
  const L = lim('A6.tangentialVelocitySecondMoment');
  const pm = { pmra: 3, pmdec: -4, pmraError: 0.1, pmdecError: 0.1 };
  const out = L.levels.map(level => {
    const s = 0.1;
    const p = level * s;
    const prior = { name: 'edsd', L: 1 };
    const v = K.tangentialVelocity({
      ...pm,
      parallax: p,
      error: s,
      prior,
      draws: L.draws,
      seed: SEED[1],
      label: `A6:${level}`,
    });
    const post = K.posterior({ parallax: p, error: s, prior });
    const Er = K.posteriorMean(post, r => r);
    const Er2 = K.posteriorMean(post, r => r * r);
    const Emu2 = 25 + 0.01 + 0.01;
    const Emu = expectedHypot(3, -4, 0.1, 0.1);
    const k2 = K.K_PM ** 2;
    const second = k2 * Er2 * Emu2;
    const variance = k2 * (Er2 * Emu2 - (Er * Emu) ** 2);
    return {
      level,
      relSecond: rel(v.secondMoment, second),
      relVariance: rel(v.variance, variance),
      sampledVar: sig(v.variance, 6),
      closedVar: sig(variance, 6),
    };
  });
  row(
    'A6.tangentialVelocitySecondMoment',
    out.every(
      o =>
        o.relSecond <= L.maxRelSecondMoment && o.relVariance <= L.maxRelVariance
    ),
    out.map(o => ({
      ...o,
      relSecond: sig(o.relSecond, 3),
      relVariance: sig(o.relVariance, 3),
    }))
  );
}

if (wanted('A7.')) {
  const L = lim('A7.correlationPropagation');
  const s = 0.02;
  const p = L.level * s;
  const out = L.rho.map(rho => {
    const ea = 0.1;
    const ed = 0.12;
    const corr = { parallaxPmra: rho, parallaxPmdec: rho, pmraPmdec: 0.1 };
    const v = K.tangentialVelocity({
      pmra: 3,
      pmdec: -4,
      pmraError: ea,
      pmdecError: ed,
      correlations: corr,
      parallax: p,
      error: s,
      draws: L.draws,
      seed: SEED[1],
      label: `A7:${rho}`,
    });
    const mu = 5;
    const vel = (K.K_PM * mu) / p;
    const g = [-vel / p, (K.K_PM * 3) / mu / p, (K.K_PM * -4) / mu / p];
    const C = [
      [s * s, rho * s * ea, rho * s * ed],
      [rho * s * ea, ea * ea, 0.1 * ea * ed],
      [rho * s * ed, 0.1 * ea * ed, ed * ed],
    ];
    let lin = 0;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) lin += g[i] * C[i][j] * g[j];
    return {
      rho,
      rel: rel(v.variance, lin),
      sampled: sig(v.variance, 6),
      linear: sig(lin, 6),
    };
  });
  row(
    'A7.correlationPropagation',
    out.every(o => o.rel <= L.maxRel),
    out.map(o => ({ ...o, rel: sig(o.rel, 3) }))
  );
}

if (wanted('S1')) {
  const L = lim('S1.euclideanCounts');
  const R = 300;
  const { u } = streams(SEED[2], 'S1');
  const mags = [];
  for (let i = 0; i < L.stars; i++)
    mags.push(5 + 5 * Math.log10((R * Math.cbrt(u())) / 10));
  record(
    'S1',
    SEED[2],
    'identical stars, M_G = 5, uniform in a sphere of radius 300 pc; the magnitude is G = M + 5 log10(r / 10 pc)',
    mags
  );
  const count = g => mags.reduce((n, m) => n + (m <= g ? 1 : 0), 0);
  const xs = [];
  for (let g = 8; g <= 12.0001; g += 0.5) xs.push(g);
  const ys = xs.map(g => Math.log10(count(g)));
  const mx = mean(xs);
  const my = mean(ys);
  const slope =
    xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
    xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const edge = Math.log10(count(13) / count(12));
  const ok =
    Math.abs(slope - L.slope) <= L.tolerance && L.slope - edge >= L.edgeDrop;
  row('S1.euclideanCounts', ok, {
    slope: sig(slope, 5),
    edgeSlope: sig(edge, 4),
    counts: [count(8), count(12), count(13)],
  });
}

if (wanted('S2')) {
  const L = lim('S2.parallaxCutThroughSelection');
  const R = 20;
  const s = 0.05;
  const out = [];
  let ok = true;
  for (const k of L.k) {
    // Analytic: the mean of Phi(1/(r s) - k) over a uniform-density sphere of radius R.
    const exact = adaptive(
      r => ((3 * r * r) / R ** 3) * normalCdf(1 / (r * s) - k),
      1e-6,
      R,
      { relTol: 1e-10 }
    ).value;
    const { u } = streams(SEED[2], `S2:${k}`);
    const trueP = [];
    for (let i = 0; i < L.stars; i++) trueP.push(1 / (R * Math.cbrt(u())));
    const sel = selection({
      name: 'parallax over error',
      observable: 'p',
      probability: p => normalCdf(p / s - k),
    });
    const rowsT = trueP.map(p => ({ p }));
    const drawn = sel.apply(rowsT, () => u());
    const f1 = drawn.included.length / L.stars;
    const expectedFraction = drawn.expected / L.stars;
    const se = Math.sqrt((exact * (1 - exact)) / L.stars);
    // The same cut made on the observed parallaxes, through the kernel's cuts.
    const { z } = streams(SEED[2], `S2obs:${k}`);
    const obs = trueP.map(p => ({ poe: (p + s * z()) / s }));
    const cut = K.applyCuts(obs, K.cutSelections({ parallaxOverError: k }));
    const f2 = cut.kept / L.stars;
    const s1 = Math.abs(f1 - exact) / se;
    const s2 = Math.abs(f2 - exact) / se;
    const s3 = Math.abs(expectedFraction - exact) / se;
    if (!(s1 <= L.maxSigmas && s2 <= L.maxSigmas && s3 <= L.maxSigmas))
      ok = false;
    out.push({
      k,
      exact: sig(exact, 6),
      drawn: sig(f1, 6),
      observedCut: sig(f2, 6),
      sigmas: [sig(s1, 3), sig(s2, 3), sig(s3, 3)],
    });
  }
  row('S2.parallaxCutThroughSelection', ok, out);
}

if (wanted('S3')) {
  const { u } = streams(SEED[2], 'S3');
  const data = Array.from({ length: 5000 }, () => ({
    g: 8 + 10 * u(),
    poe: 40 * u() * u(),
  }));
  const A = K.cutSelections({ magnitude: 15 });
  const B = K.cutSelections({ parallaxOverError: 5 });
  const ab = K.applyCuts(data, [...A, ...B]);
  const ba = K.applyCuts(data, [...B, ...A]);
  const outside = ab.total - ab.kept;
  const ok =
    ab.alone[0].removed + ab.steps[1].removed === outside &&
    ba.alone[0].removed + ba.steps[1].removed === outside &&
    ab.steps[0].removed + ab.steps[1].removed === outside &&
    ba.steps[0].removed + ba.steps[1].removed === outside &&
    ab.kept === ba.kept;
  row('S3.removedBookkeeping', ok, {
    outside,
    kept: ab.kept,
    aloneMagnitude: ab.alone[0].removed,
    aloneParallax: ab.alone[1].removed,
  });
}

// ---- leg b: the oracle -------------------------------------------------------------

if (wanted('B1')) {
  const L = lim('B1.oracleTenStars');
  const ORA = read(`${DIR}/oracle-results.json`);
  const out = L.cases.map(c => {
    const o = ORA.cases.find(x => x.id === c.id);
    const prior =
      c.prior === 'none'
        ? 'none'
        : c.prior.edsd
          ? { name: 'edsd', L: c.prior.edsd.L }
          : { name: 'uniform-density', rMax: c.prior.uniformDensity.rMax };
    const r = K.distanceFromParallax({
      parallax: c.p,
      error: c.s,
      zeroPoint: { value: c.z, sigma: c.sz },
      prior,
      level: ORA.level,
    });
    const d = {};
    if (c.prior === 'none') {
      d.point = rel(r.distance, o.point);
      d.lo = rel(r.interval.lo, o.intervalLo);
      d.hi =
        o.intervalHi === null
          ? r.interval.hi === null
            ? 0
            : 1
          : rel(r.interval.hi, o.intervalHi);
      d.ok =
        d.point <= L.maxRelMode &&
        d.lo <= L.maxRelQuantile &&
        d.hi <= L.maxRelQuantile;
    } else {
      const po = r.posterior;
      d.mode = rel(po.mode, o.mode);
      d.q16 = rel(po.interval.lo, o.q16);
      d.q50 = rel(po.median, o.q50);
      d.q84 = rel(po.interval.hi, o.q84);
      d.ok =
        d.mode <= L.maxRelMode &&
        d.q16 <= L.maxRelQuantile &&
        d.q50 <= L.maxRelQuantile &&
        d.q84 <= L.maxRelQuantile;
    }
    return {
      id: c.id,
      ...Object.fromEntries(
        Object.entries(d).map(([k, v]) => [
          k,
          typeof v === 'number' ? sig(v, 3) : v,
        ])
      ),
    };
  });
  row(
    'B1.oracleTenStars',
    out.every(o => o.ok),
    out
  );
}
/** A pack as its decoded table and an id-keyed accessor. */
const loadTable = (PACK, sidecar) =>
  tableOf({
    PACK,
    SERIES: JSON.parse(readFileSync(path.join(ROOT, sidecar), 'utf8')),
  });
const PACKS = {
  'gaia-dr3-ngc2420': () => loadTable(NGC_PACK, 'gaia/ngc2420.json'),
  'gaia-dr3-solar-neighbourhood': () =>
    loadTable(SOLAR_PACK, 'gaia/solar-neighbourhood.json'),
};
const colOf = (t, id) => t.columns.find(c => c.id === id).values;
const nan0 = v => (Number.isNaN(v) ? null : v);

/** Every star of a pack table through the kernel's zero point (null where it is refused). */
function packZeroPoints(t) {
  const [g, nu, pc, el, pr] = [
    'g',
    'nu_eff',
    'pseudocolour',
    'ecl_lat',
    'params',
  ].map(i => colOf(t, i));
  return Array.from({ length: t.n }, (_, i) =>
    K.parallaxZeroPoint({
      g: g[i],
      nuEff: nu[i],
      pseudocolour: pc[i],
      eclLat: el[i],
      params: pr[i],
    })
  );
}

if (wanted('B2')) {
  const L = lim('B2.zeroPointOracle');
  const ORA = read(`${DIR}/zero-point-oracle.json`);
  const PKG = read(`${DIR}/zero-point-package.json`);
  const out = {};
  let ok = true;
  for (const [id, load] of Object.entries(PACKS)) {
    const zp = packZeroPoints(load());
    const rounded = ORA[id].rounded;
    const raw = ORA[id].raw;
    let worst = 0;
    let rawWorst = 0;
    let outOfRange = 0;
    zp.forEach((z, i) => {
      worst = Math.max(worst, Math.abs(z.value - rounded[i]));
      rawWorst = Math.max(rawWorst, Math.abs(z.value - raw[i]));
      if (!z.inRange) outOfRange++;
    });
    out[id] = {
      secondImplementationMaxAbsMas: sig(worst, 3),
      secondImplementationOnRawInputsMaxAbsMas: sig(rawWorst, 3),
      stars: zp.length,
      outOfRange,
    };
    if (id === 'gaia-dr3-ngc2420') {
      // The committed leg: the authors' package, pinned on the NGC 2420 stars.
      let pk = 0;
      let sum = 0;
      zp.forEach((z, i) => {
        const d = Math.abs(z.value - PKG.zpt[i]);
        pk = Math.max(pk, d);
        sum += z.value - PKG.zpt[i];
      });
      out[id].package = {
        version: PKG.package.version,
        stars: PKG.zpt.length,
        maxAbsMas: sig(pk, 4),
        meanDifferenceMas: sig(sum / zp.length, 3),
        bound: L.maxAbsMas,
      };
      if (!(pk <= L.maxAbsMas && PKG.zpt.length === zp.length)) ok = false;
    }
    if (!(worst <= L.maxAbsMas && zp.length === rounded.length)) ok = false;
  }
  row(
    'B2.zeroPointOracle',
    ok,
    out,
    "the committed bound against the output of the authors' gaiadr3_zeropoint 0.0.5 on the 993 NGC 2420 stars (run by the coordinator with Carl's permission, pinned in zero-point-package.json); the kernel reads the pack's rounded columns, the package the archive's unrounded ones. The neighbourhood pack has no package output: it is compared with the second implementation only"
  );
}

// ---- leg c: coverage ---------------------------------------------------------------

const binomialBand = (nominal, n, k) =>
  k * Math.sqrt((nominal * (1 - nominal)) / n);

if (wanted('C1') || wanted('C2')) {
  for (const [id, key] of [
    ['C1.coverageLikelihood68', 'C1.coverageLikelihood68'],
    ['C2.coverageLikelihood95', 'C2.coverageLikelihood95'],
  ]) {
    if (!wanted(id.slice(0, 2))) continue;
    const L = lim(key);
    const out = L.levels.map(poe => {
      const s = 1 / poe;
      const { z } = streams(SEED[3], `${id.slice(0, 2)}:${poe}`);
      let covered = 0;
      let none = 0;
      let open = 0;
      const truths = [];
      for (let i = 0; i < L.stars; i++) {
        const r = K.distanceFromParallax({
          parallax: 1 + s * z(),
          error: s,
          level: L.nominal,
        });
        truths.push(1);
        if (r.interval === null) {
          none++;
          covered++;
        } else {
          if (r.interval.hi === null) open++;
          if (
            1 >= r.interval.lo &&
            (r.interval.hi === null || 1 <= r.interval.hi)
          )
            covered++;
        }
      }
      record(
        `${id.slice(0, 2)}:${poe}`,
        SEED[3],
        `fixed true distance 1 kpc (parallax 1 mas), error ${sig(s, 4)} mas; no prior`,
        truths
      );
      const cov = covered / L.stars;
      const band = binomialBand(L.nominal, L.stars, L.maxSigmas);
      return {
        poe,
        coverage: sig(cov, 4),
        band: [sig(L.nominal - band, 4), sig(L.nominal + band, 4)],
        openShare: sig(open / L.stars, 3),
        noDistanceShare: sig(none / L.stars, 3),
        ok: Math.abs(cov - L.nominal) <= band,
      };
    });
    row(
      id,
      out.every(o => o.ok),
      out
    );
  }
}

/** Gamma(3, scale) draws as the sum of three exponentials. */
const gamma3 = (u, scale) =>
  -scale * Math.log((1 - u()) * (1 - u()) * (1 - u()));

function priorCoverage({
  truthScale,
  priorL,
  sigma,
  stars,
  levels,
  seed,
  label,
}) {
  const { u, z } = streams(seed, label);
  const hits = levels.map(() => 0);
  const truths = [];
  for (let i = 0; i < stars; i++) {
    const r = gamma3(u, truthScale);
    truths.push(r);
    const post = K.posterior({
      parallax: 1 / r + sigma * z(),
      error: sigma,
      prior: { name: 'edsd', L: priorL },
      n: 1500,
    });
    levels.forEach((lv, j) => {
      const lo = post.quantile((1 - lv) / 2);
      const hi = post.quantile((1 + lv) / 2);
      if (r >= lo && r <= hi) hits[j]++;
    });
  }
  return { coverage: hits.map(h => h / stars), truths };
}

if (wanted('C3')) {
  const L = lim('C3.coveragePriorMatched');
  const out = L.sigmas.map(sigma => {
    const { coverage, truths } = priorCoverage({
      truthScale: L.L,
      priorL: L.L,
      sigma,
      stars: L.stars,
      levels: L.levels,
      seed: SEED[3],
      label: `C3:${sigma}`,
    });
    record(
      `C3:${sigma}`,
      SEED[3],
      `true distances from the prior (gamma, shape 3, scale ${L.L} kpc), error ${sigma} mas`,
      truths
    );
    const ok = coverage.every(
      (c, j) =>
        Math.abs(c - L.levels[j]) <=
        binomialBand(L.levels[j], L.stars, L.maxSigmas)
    );
    return { sigma, coverage: coverage.map(c => sig(c, 4)), ok };
  });
  row(
    'C3.coveragePriorMatched',
    out.every(o => o.ok),
    out
  );
}

if (wanted('C4')) {
  const L = lim('C4.coveragePriorWrong');
  const out = [];
  for (const scale of L.truthScales)
    for (const sigma of [0.3, 0.1, 0.03]) {
      const { coverage } = priorCoverage({
        truthScale: scale,
        priorL: L.priorL,
        sigma,
        stars: 2000,
        levels: [0.6827, 0.9545],
        seed: SEED[3],
        label: `C4:${scale}:${sigma}`,
      });
      out.push({
        truthScale: scale,
        priorL: L.priorL,
        sigma,
        coverage68: sig(coverage[0], 4),
        coverage95: sig(coverage[1], 4),
      });
    }
  reported(
    'C4.coveragePriorWrong',
    out,
    'the prior says L = 1 kpc; stars drawn at the scales shown; 2000 stars per row'
  );
}

if (wanted('C5')) {
  const L = lim('C5.zeroPointUnmodelled');
  const out = L.levels.map(poe => {
    const s = 1 / poe;
    const { z } = streams(SEED[3], `C5:${poe}`);
    const d = [];
    let cov = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const r = K.distanceFromParallax({
        parallax: 1 + L.offsetMas + s * z(),
        error: s,
        level: 0.6827,
      });
      if (r.distance !== null) d.push(r.distance);
      if (
        r.interval === null ||
        (1 >= r.interval.lo && (r.interval.hi === null || 1 <= r.interval.hi))
      )
        cov++;
    }
    return {
      poe,
      medianBiasPercent: sig(100 * (median(d) - 1), 4),
      coverage68: sig(cov / n, 4),
    };
  });
  reported(
    'C5.zeroPointUnmodelled',
    out,
    'offset -0.02 mas added to every observed parallax, no correction applied; true distance 1 kpc'
  );
}

// ---- leg d: refusal, widening, "not constrained" ---------------------------------

if (wanted('D1')) {
  const L = lim('D1.negativeParallax');
  const out = L.cases.map(c => {
    const a = K.distanceFromParallax({ parallax: c.p, error: c.s, curve: 100 });
    const b = K.distanceFromParallax({
      parallax: c.p,
      error: c.s,
      prior: { name: 'edsd', L: 1 },
    });
    const finite =
      Array.from(a.curve.relative).every(Number.isFinite) &&
      a.curve.relative.length === 100;
    const v = K.tangentialVelocity({
      pmra: 1,
      pmdec: 1,
      pmraError: 0.1,
      pmdecError: 0.1,
      parallax: c.p,
      error: c.s,
      draws: 200,
      seed: 1,
    });
    const ok =
      a.status === 'likelihood-only' &&
      a.distance === null &&
      a.interval === null &&
      finite &&
      b.distance === null &&
      b.posterior.status === 'prior-dominated' &&
      v.value === null;
    return { p: c.p, status: a.status, withPrior: b.posterior.status, ok };
  });
  row(
    'D1.negativeParallax',
    out.every(o => o.ok),
    out
  );
}

if (wanted('D2')) {
  const L = lim('D2.statusLadder');
  const want = [
    'ok',
    'ok',
    'low-signal',
    'low-signal',
    'likelihood-only',
    'likelihood-only',
  ];
  const got = L.cases.map(
    x => K.distanceFromParallax({ parallax: x * 0.1, error: 0.1 }).status
  );
  const pointOk = L.cases.map(x => {
    const r = K.distanceFromParallax({ parallax: x * 0.1, error: 0.1 });
    return x > 0 ? r.distance !== null : r.distance === null;
  });
  row(
    'D2.statusLadder',
    got.every((g, i) => g === want[i]) &&
      pointOk.every(Boolean) &&
      L.threshold === K.POE_THRESHOLD,
    { got }
  );
}

if (wanted('D3')) {
  const L = lim('D3.priorDominated');
  const upper = (x, scale) =>
    K.distanceFromParallax({
      parallax: x * L.s,
      error: L.s,
      prior: { name: 'edsd', L: scale },
    });
  const low = L.lowLevels.map(x => {
    const a = upper(x, 1);
    const b = upper(x, 2);
    return {
      level: x,
      factor: sig(b.posterior.interval.hi / a.posterior.interval.hi, 4),
      status: a.posterior.status,
    };
  });
  const a = upper(L.highLevel, 1);
  const b = upper(L.highLevel, 2);
  const change = rel(b.posterior.interval.hi, a.posterior.interval.hi);
  const ok =
    low.every(o => o.factor >= L.minFactor && o.status === 'prior-dominated') &&
    change <= L.maxRelChange &&
    a.posterior.status === 'ok';
  row('D3.priorDominated', ok, { low, highChange: sig(change, 3) });
}

if (wanted('D4')) {
  const L = lim('D4.refusals');
  const bad = [
    { parallax: 1, error: 0 },
    { parallax: 1, error: -0.1 },
    { parallax: 1, error: NaN },
    { parallax: NaN, error: 0.1 },
    { parallax: 1, error: 0.1, prior: 'flat' },
    { parallax: 1, error: 0.1, prior: { name: 'edsd', L: -1 } },
    { parallax: 1, error: 0.1, zeroPoint: { value: -0.02, sigma: -0.01 } },
  ];
  const got = bad.map(a => K.distanceFromParallax(a));
  row(
    'D4.refusals',
    got.length >= L.refusals &&
      got.every(
        g => g.status === 'refused' && g.code && g.distance === undefined
      ),
    { refused: got.map(g => g.code) },
    'the list holds seven inputs; the committed count is a minimum of six'
  );
}

if (wanted('D5')) {
  const L = lim('D5.noBlanketCorrection');
  let worst = 0;
  for (const z of [0, -0.017, 0.01])
    worst = Math.max(
      worst,
      rel(
        K.distanceFromParallax({
          parallax: 0.6,
          error: 0.02,
          zeroPoint: { value: z, sigma: 0 },
        }).distance,
        1 / (0.6 - z)
      )
    );
  const banned = Object.keys(astrometryModule).filter(n =>
    /lutz|kelker|blanket|universal|bias/i.test(n)
  );
  const r = K.distanceFromParallax({
    parallax: 0.6,
    error: 0.05,
    prior: { name: 'edsd', L: 1 },
  });
  const carries =
    r.prior === 'edsd' &&
    r.assumes.length > 0 &&
    typeof r.priorCite === 'string' &&
    r.correction.startsWith('none');
  row(
    'D5.noBlanketCorrection',
    worst <= L.maxRel && !banned.length && carries,
    { worstRel: worst, bannedExports: banned }
  );
}

// ---- leg e: authentic data -----------------------------------------------------------

const CACHE = path.join(ROOT, '.packs-cache');
const RAW = {
  'gaia-dr3-ngc2420': 'gaia-dr3-ngc2420-astrometry.csv',
  'gaia-dr3-solar-neighbourhood': 'gaia-dr3-solar-neighbourhood-astrometry.csv',
};
const CSV_COLS = {
  ra: 'ra',
  dec: 'dec',
  parallax: 'parallax',
  parallax_err: 'parallax_error',
  pmra: 'pmra',
  pmra_err: 'pmra_error',
  pmdec: 'pmdec',
  pmdec_err: 'pmdec_error',
  rv: 'radial_velocity',
  rv_err: 'radial_velocity_error',
  g: 'phot_g_mean_mag',
  bp_rp: 'bp_rp',
  plx_pmra_corr: 'parallax_pmra_corr',
  plx_pmdec_corr: 'parallax_pmdec_corr',
  pm_corr: 'pmra_pmdec_corr',
  ruwe: 'ruwe',
  params: 'astrometric_params_solved',
  nu_eff: 'nu_eff_used_in_astrometry',
  pseudocolour: 'pseudocolour',
  ecl_lat: 'ecl_lat',
};
const readCsvRows = file => {
  const lines = readFileSync(file, 'utf8')
    .split('\n')
    .filter(l => l.trim());
  const head = lines[0].split(',');
  return lines.slice(1).map(l => {
    const c = l.split(',');
    return Object.fromEntries(
      head.map((h, i) => [h, c[i] === '' ? null : Number(c[i])])
    );
  });
};

if (wanted('E2')) {
  const L = lim('E2.packAlignment');
  const ALIGN = read(`${DIR}/alignment.json`);
  const out = {};
  let ok = true;
  for (const [id, load] of Object.entries(PACKS)) {
    const t = load();
    const sidecar = JSON.parse(
      readFileSync(
        path.join(
          ROOT,
          id === 'gaia-dr3-ngc2420'
            ? 'gaia/ngc2420.json'
            : 'gaia/solar-neighbourhood.json'
        ),
        'utf8'
      )
    );
    const ref = ALIGN.packs[id];
    // 1. The earlier columns are, byte for byte, the earlier pack's.
    let same = t.n === L.rows[id] && ref.rows === t.n;
    for (const c of ref.columns) {
      const k = PACKS[id] && t.columns.findIndex(x => x.id === c.id);
      const enc = sidecar.columns[k];
      const sha = createHash('sha256').update(enc.data).digest('hex');
      if (!(
        sha === c.dataSha256 &&
        enc.type === c.type &&
        enc.step === c.step &&
        enc.offset === c.offset
      ))
        same = false;
    }
    // 2. With the re-queried product at hand: every column is within half its step of the product's value, row by row.
    let rowsDiffering = null;
    const file = path.join(CACHE, RAW[id]);
    if (existsSync(file)) {
      const csv = readCsvRows(file);
      rowsDiffering = csv.length === t.n ? 0 : Math.abs(csv.length - t.n);
      if (csv.length === t.n) {
        const bad = new Set();
        for (const c of t.columns)
          csv.forEach((r, i) => {
            const v = r[CSV_COLS[c.id]];
            const step = sidecar.columns[t.columns.indexOf(c)].step;
            // Within half a step of the product's value (a value exactly between two steps may go either way).
            const got = nan0(c.values[i]);
            if (
              (v === null) !== (got === null) ||
              (v !== null &&
                Math.abs(got - v) > step / 2 + 1e-9 * Math.max(1, Math.abs(v)))
            )
              bad.add(i);
          });
        rowsDiffering = bad.size;
      }
    }
    if (rowsDiffering !== null && rowsDiffering > L.maxRowsDiffering)
      ok = false;
    if (!same) ok = false;
    out[id] = {
      rows: t.n,
      earlierColumnsIdentical: same,
      rowsDiffering:
        rowsDiffering ??
        'the re-queried CSV is not in .packs-cache here: only the column checksums were judged',
    };
  }
  row('E2.packAlignment', ok, out);
}

if (wanted('E3')) {
  const file = path.join(CACHE, RAW['gaia-dr3-solar-neighbourhood']);
  if (!existsSync(file))
    notRun(
      'E3.neighbourhoodRounding',
      'the re-queried CSV is not in .packs-cache (it is never committed); the pinned figure is in results.json'
    );
  else {
    const csv = readCsvRows(file);
    const t = PACKS['gaia-dr3-solar-neighbourhood']();
    const p = colOf(t, 'parallax');
    let worst = 0;
    let over = 0;
    csv.forEach((r, i) => {
      const d = Math.abs(p[i] - r.parallax);
      worst = Math.max(worst, d);
      if (d > 0.1 * r.parallax_error) over++;
    });
    reported(
      'E3.neighbourhoodRounding',
      {
        stars: csv.length,
        largestRoundingMas: sig(worst, 4),
        shareOverTenthOfError: sig(over / csv.length, 3),
        halfStepMas: lim('E3.neighbourhoodRounding').halfStepMas,
      },
      'the pack parallax against the unrounded product; the reason no distance is taken from this pack'
    );
  }
}

if (wanted('E1')) {
  const t = PACKS['gaia-dr3-ngc2420']();
  const c = id => colOf(t, id);
  const [pmra, pmdec, pa, pd, plx, pe] = [
    'pmra',
    'pmdec',
    'pmra_err',
    'pmdec_err',
    'parallax',
    'parallax_err',
  ].map(c);
  const zps = packZeroPoints(t);
  const analyse = ({ threshold, clip, useZeroPoint }) => {
    // Membership from proper motion alone (the position is the pack's own circle), as the pack's own check starts it.
    const stars = Array.from({ length: t.n }, (_, i) => ({
      x: [pmra[i], pmdec[i]],
      e: [pa[i], pd[i]],
    }));
    const fit = K.fitMembership(stars, {
      cluster: [-1.2, -2.1],
      clusterSigma: [0.3, 0.3],
      field: [0, -1],
      fieldSigma: [3, 3],
      fraction: 0.3,
    });
    const members = [];
    for (let i = 0; i < t.n; i++)
      if (fit.p[i] >= threshold && zps[i].status !== 'refused') members.push(i);
    const cl = K.clusterParallax({
      stars: members.map(i => ({
        parallax: plx[i],
        error: pe[i],
        zeroPoint: useZeroPoint ? zps[i].value : 0,
      })),
      systematic: 0,
      clipSigma: clip,
    });
    const d = K.distanceFromParallax({ parallax: cl.mean, error: cl.error });
    return {
      members: members.length,
      kept: cl.n,
      meanParallaxMas: sig(cl.mean, 5),
      statErrorMas: sig(cl.statError, 3),
      meanZeroPointMas: sig(cl.meanZeroPoint, 3),
      distanceKpc: sig(d.distance, 5),
      intervalKpc: [
        sig(d.interval.lo, 5),
        d.interval.hi === null ? null : sig(d.interval.hi, 5),
      ],
      converged: fit.converged,
    };
  };
  const base = analyse({ threshold: 0.9, clip: 3, useZeroPoint: true });
  const variants = {
    noZeroPoint: analyse({ threshold: 0.9, clip: 3, useZeroPoint: false }),
    noClip: analyse({ threshold: 0.9, clip: null, useZeroPoint: true }),
    threshold05: analyse({ threshold: 0.5, clip: 3, useZeroPoint: true }),
    threshold099: analyse({ threshold: 0.99, clip: 3, useZeroPoint: true }),
  };
  // The sources that exist, as supplied (no DR3 catalogue distance and no non-Gaia, non-photometric source).
  const pub = read(`${DIR}/published-ngc2420.json`);
  const RV = 3.1;
  const trueModulus = (apparent, ebv) => apparent - RV * ebv;
  const pcOfModulus = m => 10 ** (m / 5 + 1);
  const m1 = trueModulus(pub.entries[0].value, 0.04);
  const m2 = trueModulus(pub.entries[1].value, 0.04);
  const sources = {
    P1: {
      what: 'Richer et al. 2000, (m-M)V 12.10 with E(B-V) 0.04, R_V 3.1',
      modulus0: sig(m1, 5),
      distanceKpc: sig(pcOfModulus(m1) / 1000, 5),
    },
    P2: {
      what: 'Anthony-Twarog et al. 2006, apparent 12.15; E(B-V) 0.04 ASSUMED from P1 (the line read does not restate it)',
      modulus0: sig(m2, 5),
      distanceKpc: sig(pcOfModulus(m2) / 1000, 5),
    },
    P3: {
      what: 'DR3 mean parallax 0.36 +- 0.06 mas as printed (no zero-point correction stated): 1/p',
      distanceKpc: sig(1 / 0.36, 4),
      intervalKpc: [sig(1 / 0.42, 4), sig(1 / 0.3, 4)],
    },
    P4: {
      what: 'Cantat-Gaudin et al. 2020 through the 2404.12523 Table 1, Gaia DR2',
      distanceKpc: 2.587,
    },
    P5: { what: 'about 3 kpc (rounded, no method read)', distanceKpc: 3 },
  };
  notRun(
    'E1.ngc2420',
    'NOT RUN against the committed contract: it needs a published range with at least one DR3-based and one non-Gaia source, and no DR3-catalogue distance was obtained (Hunt and Reffert 2023 is a CDS-only table, CDS unreachable). Not judged. The measured corrected distance is reported beside the sources that exist, and the zero point has no systematic floor (its paper was not in the material supplied). Whether to re-gate against a different source is a question for Carl (register).'
  );
  rows.find(r => r.id === 'E1.ngc2420').measured = {
    measured: base,
    variants,
    sources,
  };
}

if (wanted('P1')) {
  const L = lim('P1.speed');
  const t0 = process.cpuUsage();
  for (let i = 0; i < L.stars; i++)
    K.distanceFromParallax({
      parallax: 0.2 + 0.0005 * i,
      error: 0.05,
      prior: { name: 'edsd', L: 1.35 },
    });
  const cpu = process.cpuUsage(t0);
  const secs = (cpu.user + cpu.system) / 1e6;
  row(
    'P1.speed',
    secs <= L.maxCpuSeconds,
    { cpuSeconds: sig(secs, 3) },
    'recorded, not a physics bound'
  );
}

rows.sort((a, b) => a.id.localeCompare(b.id));
const failed = rows.filter(r => r.status === 'fail');
if (flag('--json')) console.log(JSON.stringify(rows, null, 2));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(34)} ${JSON.stringify(r.measured)} ${r.note}`
    );
  console.log(
    `\n${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'reported').length} reported, ${rows.filter(r => r.status === 'not-run').length} not run`
  );
}
if (flag('--write-results'))
  writeFileSync(
    path.join(ROOT, DIR, 'results.json'),
    JSON.stringify(
      { format: 'gravitas.gaia-workflows-results/1', rows },
      null,
      2
    ) + '\n'
  );
if (flag('--write-failed'))
  writeFileSync(
    path.join(ROOT, DIR, 'failed-legs.json'),
    JSON.stringify(
      {
        format: 'gravitas.gaia-workflows-failed-legs/1',
        label:
          'These legs crossed a committed bound and stay failing; only Carl resets one.',
        legs: failed.map(r => ({ id: r.id, measured: r.measured })),
      },
      null,
      2
    ) + '\n'
  );
if (flag('--write-ensembles'))
  writeFileSync(
    path.join(ROOT, DIR, 'ensembles.json'),
    JSON.stringify(
      {
        format: 'gravitas.gaia-workflows-ensembles/1',
        label: 'Synthetic data, with its truth manifest.',
        ensembles: manifests,
      },
      null,
      2
    ) + '\n'
  );
process.exitCode = 0;
// Unused export kept for the oracle comparison's callers.
export { normalQuantile };
