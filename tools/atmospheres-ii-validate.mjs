#!/usr/bin/env node
// =============================================================================
// The eclipse and phase kernel against its committed thresholds (Prompt 202)
// -----------------------------------------------------------------------------
//   npm run atmospheres-ii:validate            print the table
//   npm run atmospheres-ii:validate -- --json  print it as JSON
//
// tests/fixtures/atmospheres-ii/thresholds.json fixed every bound before the
// kernel was promoted from the Prompt 201 spike; the bounds carried from the gate
// are verbatim copies (a test compares them field by field). This runs the checks
// against the production module and judges them against the bounds read from that
// file. The oracle's rows read the results pinned in tests/fixtures/atmospheres-ii/
// (numpy, scipy and astropy constants; tools/atmospheres-ii-oracle/oracle.py; no
// Gravitas code). P1 (the plots, jsdom) and the bytes are measured by
// tests/atmospheresII.test.js; A1 (authentic data) is not measured and says so.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/atmospheres/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read('tests/fixtures/atmospheres-ii/thresholds.json');
const O = read('tests/fixtures/atmospheres-ii/oracle-results.json');
const lim = id => THR.checks.find(c => c.id === id).limits;
const rel = (a, b) => Math.abs(a / b - 1);
const MICRON = 1e-6;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = tag => {
  const u = mulberry32(
    THR.seeds.harness + [...tag].reduce((s, c) => s + c.charCodeAt(0), 0)
  );
  return {
    u,
    n: () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u()),
  };
};
const KERNEL_FILES = [
  'quadrature.js',
  'emission.js',
  'phase.js',
  'synthetic.js',
];

function u1() {
  const src = KERNEL_FILES.map(f =>
    readFileSync(path.join(ROOT, 'js/kernels/atmospheres', f), 'utf8')
  ).join('\n');
  const copies = [
    /1\.380649/,
    /6\.62607015/,
    /299792458/,
    /1\.66053/,
    /5\.67037/,
    /1\.495978/,
    /6\.957e8/i,
    /7\.1492e7/i,
  ]
    .filter(r => r.test(src))
    .map(String);
  const c = O.constants;
  const worstRel = Math.max(
    rel(K.K_BOLTZMANN, c.k),
    rel(K.H_PLANCK, c.h),
    rel(K.C_LIGHT, c.c),
    rel(K.ATOMIC_MASS, c.mu),
    rel(K.SIGMA_SB, c.sigma)
  );
  row(
    'U1.constants',
    !copies.length && worstRel <= lim('U1.constants').relMax,
    {
      copies,
      worstRel,
    }
  );
}

function e1() {
  const l = lim('E1.planck');
  const P = O.E1.points;
  let worst = 0;
  P.T.forEach(
    (T, i) =>
      (worst = Math.max(
        worst,
        rel(K.bandRadiance(P.l1[i], P.l2[i], T), P.B[i])
      ))
  );
  const F = O.E1.fullBand;
  let full = 0;
  F.T.forEach(
    (T, i) =>
      (full = Math.max(
        full,
        rel(K.bandRadiance(F.l1[i], F.l2[i], T), F.expected[i])
      ))
  );
  let rj = 0;
  for (const Tk of [300, 1000, 3000]) {
    const lam = (1e7 / Tk) * MICRON;
    const exact = K.bandRadiance(lam * 0.995, lam * 1.005, Tk);
    rj = Math.max(
      rj,
      rel(exact, (2 * K.C_LIGHT * K.K_BOLTZMANN * Tk) / lam ** 4)
    );
  }
  let monotone = true;
  for (const [a, b] of [
    [0.5, 0.6],
    [1, 2],
    [4, 5],
    [10, 20],
    [25, 30],
  ]) {
    let prev = 0;
    for (let Tk = 200; Tk <= 10000; Tk *= 1.2) {
      const v = K.bandRadiance(a * MICRON, b * MICRON, Tk);
      if (!(v > prev)) monotone = false;
      prev = v;
    }
  }
  row(
    'E1.planck',
    worst <= l.relErrMax &&
      full <= l.fullBandRelMax &&
      rj <= l.rayleighJeansRelMax &&
      monotone &&
      P.T.length >= l.points,
    {
      relErrMax: worst,
      points: P.T.length,
      fullBandRelMax: full,
      rayleighJeansRel: rj,
      monotone,
    }
  );
}

function e2() {
  const l = lim('E2.eclipse');
  const P = O.E2;
  let worst = 0;
  P.Tp.forEach((Tp, i) => {
    const r = K.eclipseDepth({
      radiusRatio: P.k[i],
      tPlanet: Tp,
      tStar: P.Ts[i],
      band: [P.l1[i], P.l2[i]],
      geometricAlbedo: P.Ag[i],
      semiMajorOverRp: P.aR[i],
    });
    worst = Math.max(worst, rel(r.depth, P.depth[i]));
  });
  const same = K.eclipseDepth({
    radiusRatio: 0.1,
    tPlanet: 5000,
    tStar: 5000,
    band: [3e-6, 4e-6],
  });
  const equalLimit = rel(same.depth, 0.01);
  const base = {
    radiusRatio: 0.1,
    tPlanet: 1500,
    tStar: 5800,
    band: [3e-6, 4e-6],
    semiMajorOverRp: 9,
  };
  const th = K.eclipseDepth({ ...base, geometricAlbedo: 0 });
  const wr = K.eclipseDepth({ ...base, geometricAlbedo: 0.3 });
  const additive = Math.abs(wr.depth - th.depth - 0.3 / 81) / (0.3 / 81);
  let monotone = true;
  let prev = 0;
  for (let Tp = 500; Tp <= 3000; Tp += 50) {
    const d = K.eclipseDepth({ ...base, tPlanet: Tp }).depth;
    if (!(d > prev)) monotone = false;
    prev = d;
  }
  row(
    'E2.eclipse',
    worst <= l.relErrMax &&
      equalLimit <= 1e-12 &&
      additive <= 1e-9 &&
      monotone &&
      P.Tp.length >= l.points,
    {
      relErrMax: worst,
      points: P.Tp.length,
      equalTemperatureLimitRel: equalLimit,
      additiveRel: additive,
      monotone,
    }
  );
}

function e3() {
  const l = lim('E3.slab');
  const P = O.E3;
  let worst = 0;
  P.tau.forEach(
    (tau, i) =>
      (worst = Math.max(worst, rel(K.slabFlux(P.Bd[i], P.Bs[i], tau), P.F[i])))
  );
  const Bd = K.bandRadiance(3e-6, 4e-6, 1500);
  const Bs = K.bandRadiance(3e-6, 4e-6, 1500 / 2 ** 0.25);
  const tauZeroExact = K.slabFlux(Bd, Bs, 0) === Bd;
  const thickRel = rel(K.slabFlux(Bd, Bs, 60), Bs);
  let monotone = true;
  let prev = Infinity;
  for (let t = 1e-3; t < 100; t *= 1.3) {
    const v = K.slabFlux(Bd, Bs, t);
    if (!(v <= prev)) monotone = false;
    prev = v;
  }
  const via = K.eclipseDepth({
    radiusRatio: 0.1,
    tPlanet: 1500,
    tStar: 5800,
    band: [3e-6, 4e-6],
    bandTau: 1e4,
  }).thermal;
  const skinRel = rel(via, (0.01 * Bs) / K.bandRadiance(3e-6, 4e-6, 5800));
  row(
    'E3.slab',
    worst <= l.relErrMax &&
      tauZeroExact &&
      thickRel <= 1e-9 &&
      monotone &&
      skinRel <= 1e-12 &&
      P.tau.length >= l.points,
    {
      relErrMax: worst,
      points: P.tau.length,
      tauZeroExact,
      thickRel,
      monotone,
      skinRel,
    }
  );
}

function e4() {
  const l = lim('E4.lambert');
  let worst = 0;
  O.E4.alpha.forEach(
    (a, i) =>
      (worst = Math.max(worst, Math.abs(K.lambertPhase(a) - O.E4.phi[i])))
  );
  const endpointsAbs = Math.max(
    Math.abs(K.lambertPhase(0) - 1),
    Math.abs(K.lambertPhase(Math.PI / 2) - 1 / Math.PI),
    Math.abs(K.lambertPhase(Math.PI))
  );
  const phaseIntegralAbs = Math.abs(
    2 * K.composite(a => K.lambertPhase(a) * Math.sin(a), 0, Math.PI, 0.25) -
      1.5
  );
  const roundTripAbs = Math.abs(
    K.geometricFromBond(K.bondFromGeometric(0.37)) - 0.37
  );
  let monotone = true;
  for (let i = 1; i < 400; i++)
    if (
      !(
        K.lambertPhase((i * Math.PI) / 399) <
        K.lambertPhase(((i - 1) * Math.PI) / 399)
      )
    )
      monotone = false;
  row(
    'E4.lambert',
    worst <= l.absErrMax &&
      endpointsAbs <= 1e-12 &&
      phaseIntegralAbs <= l.phaseIntegralAbsMax &&
      roundTripAbs <= 1e-12 &&
      monotone &&
      O.E4.alpha.length === l.angles,
    {
      absErrMax: worst,
      angles: O.E4.alpha.length,
      endpointsAbs,
      phaseIntegralAbs,
      roundTripAbs,
      monotone,
    }
  );
}

const G = O.phaseGrid;
function e5n1() {
  const l = lim('E5.albedo');
  const r = rngFor('E5');
  let covered = 0;
  let flagged = 0;
  for (let i = 0; i < l.draws; i++) {
    const ag = 0.05 + 0.55 * r.u();
    const aR = 5 + 15 * r.u();
    const k = 1 / aR ** 2;
    const sigma = l.noiseFraction * 0.3 * k;
    const flux = G.lambert.map(p => ag * k * p + sigma * r.n());
    const f = K.fitAlbedo({
      alphas: G.alpha,
      flux,
      sigma,
      semiMajorOverRp: aR,
    });
    if (f.flagged) flagged++;
    else if (f.lo <= ag && ag <= f.hi) covered++;
  }
  const coverage = covered / l.draws;
  row(
    'E5.albedo',
    coverage >= l.coverageRange[0] && coverage <= l.coverageRange[1],
    {
      coverage,
      flaggedFraction: flagged / l.draws,
      draws: l.draws,
    },
    'a flagged fit returns no interval and counts as not covered'
  );

  const n = lim('N1.misfit');
  const rn = rngFor('N1');
  const rate = shape => {
    let f = 0;
    for (let i = 0; i < n.draws; i++) {
      const aR = 5 + 15 * rn.u();
      const k = 1 / aR ** 2;
      const sigma = n.noiseFraction * 0.3 * k;
      const flux = G[shape].map(p => 0.3 * k * p + sigma * rn.n());
      if (
        K.fitAlbedo({ alphas: G.alpha, flux, sigma, semiMajorOverRp: aR })
          .flagged
      )
        f++;
    }
    return f / n.draws;
  };
  const power = Object.fromEntries(n.truths.map(t => [t, rate(t)]));
  const falseFlag = rate('lambert');
  row(
    'N1.misfit',
    Object.values(power).every(p => p >= n.powerMin) &&
      falseFlag <= n.falseFlagMax,
    {
      power,
      falseFlag,
      draws: n.draws,
    }
  );
}

function e6() {
  const l = lim('E6.btemp');
  const r = rngFor('E6');
  const P = O.E6;
  let covered = 0;
  let refused = 0;
  let roundTripRelMax = 0;
  P.Tp.forEach((Tp, i) => {
    const base = {
      radiusRatio: P.k[i],
      tStar: P.Ts[i],
      band: O.E6.band,
      semiMajorOverRp: 1000,
    };
    roundTripRelMax = Math.max(
      roundTripRelMax,
      rel(
        K.brightnessTemperature({ ...base, depth: P.depth[i] }).temperature,
        Tp
      )
    );
    const noisy = P.depth[i] * (1 + l.noiseFraction * r.n());
    const b = K.brightnessTemperature({
      ...base,
      depth: noisy,
      sigma: l.noiseFraction * P.depth[i],
    });
    if (b.refused) refused++;
    else if (b.lo <= Tp && Tp <= b.hi) covered++;
  });
  const coverage = covered / P.Tp.length;
  row(
    'E6.btemp',
    coverage >= l.coverageRange[0] &&
      coverage <= l.coverageRange[1] &&
      roundTripRelMax <= l.roundTripRelMax,
    { coverage, draws: P.Tp.length, refused, roundTripRelMax },
    'a/R_p set to 1000 so the reflected-light rule (N2) does not apply here'
  );
}

function n2() {
  const l = lim('N2.reflected');
  const r = rngFor('N2');
  let right = 0;
  let total = 0;
  const base = { radiusRatio: 0.1, tStar: 5800, band: [3.6e-6, 4.5e-6] };
  for (let i = 0; i < l.casesEachSide; i++) {
    const aR = 5 + 15 * r.u();
    const refl = 0.3 / aR ** 2;
    const above = K.brightnessTemperature({
      ...base,
      semiMajorOverRp: aR,
      depth: 10 * refl * (1.02 + 2 * r.u()),
    });
    const below = K.brightnessTemperature({
      ...base,
      semiMajorOverRp: aR,
      depth: i < 5 ? -1e-4 * r.u() : 10 * refl * (0.98 - 0.9 * r.u()),
    });
    total += 2;
    if (!above.refused && above.temperature > 0) right++;
    if (below.refused && below.temperature === undefined) right++;
  }
  row('N2.reflected', right === total, {
    decidedAsTheRuleSays: right,
    of: total,
  });
}

/** Hostile inputs: every numeric field of the slice's functions at 0, NaN, a negative and Infinity, plus the structural cases. */
function hostileCases() {
  const ec = {
    radiusRatio: 0.12,
    tPlanet: 1500,
    tStar: 5800,
    band: [3.6e-6, 4.5e-6],
    geometricAlbedo: 0.2,
    semiMajorOverRp: 9,
  };
  const out = [];
  for (const k of ['radiusRatio', 'tPlanet', 'tStar'])
    for (const v of [0, NaN, -1, Infinity])
      out.push(() => K.eclipseDepth({ ...ec, [k]: v }));
  for (const v of [-0.1, 1.2, NaN])
    out.push(() => K.eclipseDepth({ ...ec, geometricAlbedo: v }));
  for (const v of [1, 0.5, NaN])
    out.push(() => K.eclipseDepth({ ...ec, semiMajorOverRp: v }));
  for (const v of [-1, NaN, Infinity])
    out.push(() => K.eclipseDepth({ ...ec, bandTau: v }));
  for (const b of [[4e-6, 3e-6], [-1, 3e-6], [0, 3e-6], undefined, [3e-6], 'x'])
    out.push(() => K.eclipseDepth({ ...ec, band: b }));
  for (const v of [0, -1e-3, NaN])
    out.push(() => K.brightnessTemperature({ ...ec, depth: v }));
  out.push(() =>
    K.brightnessTemperature({ ...ec, depth: 1e-3, semiMajorOverRp: 0.5 })
  );
  out.push(() => K.brightnessTemperature({ ...ec, depth: 1e-3, tStar: 0 }));
  const pc = { albedo: 0.3, semiMajorOverRp: 9, alphas: [0.1] };
  out.push(
    () => K.phaseCurve({ ...pc, albedo: 1.5 }),
    () => K.phaseCurve({ ...pc, albedo: -0.1 })
  );
  out.push(
    () => K.phaseCurve({ ...pc, alphas: [4] }),
    () => K.phaseCurve({ ...pc, alphas: [-0.1] })
  );
  out.push(() => K.phaseCurve({ ...pc, semiMajorOverRp: 0.9 }));
  const fa = {
    alphas: [0.1, 0.2, 0.3],
    flux: [1, 1, 1],
    sigma: 1,
    semiMajorOverRp: 9,
  };
  out.push(
    () => K.fitAlbedo({ ...fa, sigma: 0 }),
    () => K.fitAlbedo({ ...fa, sigma: NaN })
  );
  out.push(() => K.fitAlbedo({ ...fa, alphas: [0.1, 0.2], flux: [1, 1] }));
  out.push(
    () => K.fitAlbedo({ ...fa, flux: [1, 1] }),
    () => K.fitAlbedo({ ...fa, semiMajorOverRp: 0.5 })
  );
  return out;
}

function r1() {
  const hostile = hostileCases();
  const numberFields = [
    'depth',
    'temperature',
    'albedo',
    'flux',
    'thermal',
    'bond',
  ];
  let refusing = 0;
  const bad = [];
  hostile.forEach((f, i) => {
    let r;
    try {
      r = f();
    } catch (e) {
      bad.push(`${i}: threw ${e.message}`);
      return;
    }
    const clean =
      r.refused === true &&
      typeof r.reason === 'string' &&
      r.reason.length > 5 &&
      numberFields.every(k => r[k] === undefined);
    if (clean) refusing++;
    else bad.push(`${i}: ${JSON.stringify(r).slice(0, 80)}`);
  });
  const ec = {
    radiusRatio: 0.12,
    tPlanet: 1500,
    tStar: 5800,
    band: [3.6e-6, 4.5e-6],
    geometricAlbedo: 0.2,
    semiMajorOverRp: 9,
  };
  const good = {
    ec: K.eclipseDepth(ec),
    bt: K.brightnessTemperature({ ...ec, semiMajorOverRp: 1000, depth: 1e-3 }),
    ph: K.fitAlbedo({
      alphas: G.alpha,
      flux: G.lambert.map(p => (0.3 * p) / 81),
      sigma: 1e-5,
      semiMajorOverRp: 9,
    }),
  };
  const need = {
    ec: ['uniform blackbody', 'one skin'],
    bt: ['uniform blackbody', 'reflected'],
    ph: ['Lambert'],
  };
  const words = {};
  let wordsOk = true;
  for (const k of Object.keys(good)) {
    const txt = (good[k].assumes ?? []).join(' | ');
    words[k] = need[k].map(w => [w, txt.includes(w)]);
    if (!need[k].every(w => txt.includes(w)) || !good[k].model) wordsOk = false;
  }
  row(
    'R1.refusals',
    hostile.length >= lim('R1.refusals').hostileInputs &&
      refusing === hostile.length &&
      wordsOk,
    {
      hostileInputs: hostile.length,
      refusing,
      bad,
      assumesWords: words,
    }
  );
}

/** The claim rule over the strings of the atmosphere family, including this prompt's. */
export const CLAIM_FILES = [
  'js/i18n/en.atmospheres.js',
  'js/i18n/es.atmospheres.js',
  ...['', 'es/', 'depth/', 'depth/es/'].map(
    d => `js/data/investigations/${d}atmosphere-sequence.js`
  ),
  ...['', 'es/', 'depth/', 'depth/es/'].flatMap(d =>
    ['why-venus-is-hot', 'two-greenhouse-models'].map(
      n => `js/data/investigations/${d}${n}.js`
    )
  ),
  'js/atmosphereWidgets.js',
  'js/kernels/atmospheres/synthetic.js',
];
export function claimViolations(files = CLAIM_FILES) {
  const cr = THR.claimRule;
  const rx = [...cr.forbidden.en, ...cr.forbidden.es].map(
    s => new RegExp(s, cr.flags)
  );
  const violations = [];
  const scanned = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(path.join(ROOT, f), 'utf8');
    } catch {
      continue;
    }
    scanned.push(f);
    const flat = text.replace(/'\s*\+?\s*\n\s*'/g, '').replace(/\s+/g, ' ');
    for (const r of rx) {
      const m = flat.match(r);
      if (m) violations.push({ file: f, match: m[0] });
    }
  }
  return { violations, scanned, rx };
}
function c1() {
  const l = lim('C1.claims');
  const cr = THR.claimRule;
  const { violations, scanned, rx } = claimViolations();
  const flagged = s => rx.some(r => r.test(s));
  const badCaught = cr.badControls.filter(flagged).length;
  const permittedPass = cr.permittedControls.filter(s => !flagged(s)).length;
  row(
    'C1.claims',
    badCaught === l.badControls &&
      permittedPass === l.permittedControls &&
      violations.length <= l.violationsMax,
    {
      badCaught,
      of: cr.badControls.length,
      permittedPass,
      permitted: cr.permittedControls.length,
      filesScanned: scanned.length,
      violations,
    }
  );
}

function s1() {
  const l = lim('S1.synthetic');
  const a = JSON.stringify([
    K.syntheticEclipse(),
    K.syntheticPhase(),
    K.syntheticPhase({ shape: 'lommel-seeliger' }),
  ]);
  const b = JSON.stringify([
    K.syntheticEclipse(),
    K.syntheticPhase(),
    K.syntheticPhase({ shape: 'lommel-seeliger' }),
  ]);
  const identical = a === b;
  const sets = [
    K.syntheticEclipse(),
    K.syntheticEclipse({ absorbingBand: 'B' }),
    K.syntheticPhase(),
    K.syntheticPhase({ shape: 'lommel-seeliger' }),
  ];
  const manifest = sets.every(
    s =>
      l.manifestFields.every(f => f in s) &&
      s.synthetic === true &&
      s.note.includes(l.noteMust)
  );
  // recovery: the Lambert curve is fitted inside its interval over many seeds, the Lommel-Seeliger curve is flagged
  let inside = 0;
  let flagged = 0;
  const N = l.seeds;
  for (let seed = 1; seed <= N; seed++) {
    const lam = K.syntheticPhase({ seed });
    const f = K.fitAlbedo({
      alphas: lam.alphas,
      flux: lam.fluxPpm.map(x => x * 1e-6),
      sigma: lam.sigma * 1e-6,
      semiMajorOverRp: lam.truth.semiMajorOverRp,
    });
    if (!f.flagged && f.lo <= lam.truth.albedo && lam.truth.albedo <= f.hi)
      inside++;
    const ls = K.syntheticPhase({ seed, shape: 'lommel-seeliger' });
    if (
      K.fitAlbedo({
        alphas: ls.alphas,
        flux: ls.fluxPpm.map(x => x * 1e-6),
        sigma: ls.sigma * 1e-6,
        semiMajorOverRp: ls.truth.semiMajorOverRp,
      }).flagged
    )
      flagged++;
  }
  // brightness temperature from the synthetic eclipse depths covers the truth at 95 percent
  let covered = 0;
  let total = 0;
  for (let seed = 1; seed <= N; seed++) {
    const e = K.syntheticEclipse({ seed });
    e.bands.forEach((b, i) => {
      const bt = K.brightnessTemperature({
        radiusRatio: e.truth.radiusRatio,
        tStar: e.truth.tStar,
        band: [b.lo * MICRON, b.hi * MICRON],
        semiMajorOverRp: 1000,
        depth: e.depthsPpm[i] * 1e-6,
        sigma: e.sigma * 1e-6,
      });
      total++;
      if (!bt.refused && bt.lo <= e.truth.tPlanet && e.truth.tPlanet <= bt.hi)
        covered++;
    });
  }
  const lambertInside = inside / N;
  const lsFlagged = flagged / N;
  const btCoverage = covered / total;
  row(
    'S1.synthetic',
    identical === l.identicalRepeats &&
      manifest &&
      lambertInside >= l.lambertCoverageRange[0] &&
      lambertInside <= l.lambertCoverageRange[1] &&
      lsFlagged >= l.lommelSeeligerFlaggedMin &&
      btCoverage >= l.brightnessCoverageRange[0] &&
      btCoverage <= l.brightnessCoverageRange[1],
    {
      identical,
      manifest,
      lambertInside,
      lommelSeeligerFlagged: lsFlagged,
      brightnessCoverage: btCoverage,
      seeds: N,
    },
    'the recovery rates are the kernel on its own synthetic data with its own noise, a consistency check, not an independent one'
  );
}

export function runChecks() {
  rows.length = 0;
  u1();
  e1();
  e2();
  e3();
  e4();
  e5n1();
  e6();
  n2();
  r1();
  c1();
  s1();
  rows.push({
    id: 'A1.authentic',
    status: 'not-measured',
    measured: null,
    note: 'no published table was available (Q4 and Q5 are requests; nothing was downloaded); the investigations carry the words "no published table was compared"',
  });
  return rows.slice();
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = runChecks();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(res, null, 2));
  else {
    for (const r of res)
      console.log(
        `${r.status.padEnd(12)} ${r.id.padEnd(16)} ${JSON.stringify(r.measured).slice(0, 150)}`
      );
    const fails = res.filter(r => r.status === 'fail').length;
    console.log(
      `${res.length} rows, ${res.filter(r => r.status === 'pass').length} pass, ${fails} fail, ${res.filter(r => r.status === 'not-measured').length} not measured`
    );
    process.exitCode = fails ? 1 : 0;
  }
}
