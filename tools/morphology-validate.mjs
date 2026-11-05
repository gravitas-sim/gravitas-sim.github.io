#!/usr/bin/env node
// =============================================================================
// The galaxy-morphology kernel against its committed thresholds (Prompt 249, Part A)
// -----------------------------------------------------------------------------
//   npm run morphology:validate                     print the table
//   npm run morphology:validate -- --json           print it as JSON
//   npm run morphology:validate -- --write-results  rewrite tests/fixtures/morphology/results.json
//   npm run morphology:validate -- --write-failed   rewrite tests/fixtures/morphology/failed-legs.json
//   --only=A1,B                                     run the legs whose id starts with these
//
// tests/fixtures/morphology/thresholds.json fixed every bound before the kernel existed (GALAXY_MORPHOLOGY.md,
// "Validation contract"); this reads the bounds from that file, not from copies. The B rows and the truth of the
// C rows read tests/fixtures/morphology/oracle-results.json, which tools/morphology-oracle/oracle.py wrote (numpy,
// scipy; no Gravitas code). The E rows (an authentic SDSS image, a cited catalogue's classes) are NOT RUN: nothing
// was fetched. Part B's legs (gate-thresholds.json) are NOT RUN: the fitter does not exist.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as M from '../js/kernels/galaxy/morphology/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/morphology';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
export const GATE = read(`${DIR}/gate-thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);
const INPUTS = read(`${DIR}/oracle-inputs.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const SEEDS = THRESHOLDS.seeds;
const W = M.MORPHOLOGY_WORLD;
const ZP = { mag: W.zeroPoint, source: 'invented synthetic zero point' };

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const paDiff = (a, b) => {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
};
const gen = p => M.generateGalaxyImage(p);
const opt = (extra = {}) => ({ psfFwhm: W.psfFwhm, zeroPoint: ZP, ...extra });
const meas = (g, extra) => M.measureGalaxy(g.image, opt(extra));

const row = (id, status, measured, note = '') => ({
  id,
  status,
  measured,
  note,
});
const verdict = (id, ok, measured, note = '') =>
  row(id, ok ? 'pass' : 'fail', measured, note);

/** Coverage and normalised-error statistics of a list of {value, sigma, truth}. */
function coverage(list) {
  const z = list.map(r => (r.value - r.truth) / r.sigma);
  return {
    n: list.length,
    coverage:
      list.filter(r => Math.abs(r.value - r.truth) <= r.sigma).length /
      list.length,
    meanZ: mean(z),
    sdZ: sd(z),
  };
}

// ---- the A legs ---------------------------------------------------------------------

function a1() {
  const L = lim('A1.gaussianGalaxy');
  const p = {
    kind: 'gaussian',
    sigma: 9,
    q: 0.5,
    paDeg: 25,
    flux: 200000,
    x0: 79.5 + 0.37,
    y0: 79.5 - 0.61,
    psfFwhm: 0,
    noise: false,
  };
  const r = meas(gen(p), { draws: 0 });
  if (r.status !== 'ok')
    return row('A1.gaussianGalaxy', 'fail', { status: r.status, code: r.code });
  const t = M.analyticTruth({ kind: 'gaussian', sigma: 9 });
  const m = {
    absQ: Math.abs(r.geometry.q - 0.5),
    absPa: paDiff(r.geometry.paDeg, 25),
    centre: Math.hypot(r.geometry.x - p.x0, r.geometry.y - p.y0),
    relRp: rel(r.geometry.rPetrosian, t.rPetrosian),
    relR50: rel(r.size.r50, t.r50),
    relR20: rel(r.size.r20, t.r20),
    relR80: rel(r.size.r80, t.r80),
    absMag: Math.abs(
      r.total.magnitude -
        (W.zeroPoint - 2.5 * Math.log10(p.flux * t.totalFraction))
    ),
    absC: Math.abs(r.concentration.value - t.concentration),
  };
  const ok =
    m.absQ <= L.maxAbsQ &&
    m.absPa <= L.maxAbsPaDeg &&
    m.centre <= L.maxAbsCentrePx &&
    Math.max(m.relRp, m.relR50, m.relR20, m.relR80) <= L.maxRelRadius &&
    m.absMag <= L.maxAbsMag &&
    m.absC <= L.maxAbsC;
  return verdict(
    'A1.gaussianGalaxy',
    ok,
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, sig(v)]))
  );
}

function a2() {
  const L = lim('A2.sersicNoiseFree');
  const per = [];
  for (const n of L.n) {
    const p = {
      kind: 'sersic',
      n,
      re: 9,
      q: 0.6,
      paDeg: 70,
      flux: 200000,
      x0: 79.75,
      y0: 79.1,
      psfFwhm: 0,
      noise: false,
    };
    const r = meas(gen(p), { draws: 0 });
    if (r.status !== 'ok') {
      per.push({ n, status: r.status, code: r.code });
      continue;
    }
    const t = M.analyticTruth({ kind: 'sersic', n, re: 9 });
    per.push({
      n,
      absQ: sig(Math.abs(r.geometry.q - 0.6)),
      absPa: sig(paDiff(r.geometry.paDeg, 70)),
      relRp: sig(rel(r.geometry.rPetrosian, t.rPetrosian)),
      relR50: sig(rel(r.size.r50, t.r50)),
      absMag: sig(
        Math.abs(
          r.total.magnitude -
            (W.zeroPoint - 2.5 * Math.log10(p.flux * t.totalFraction))
        )
      ),
      absC: sig(Math.abs(r.concentration.value - t.concentration)),
    });
  }
  const ok = per.every(
    x =>
      x.absQ !== undefined &&
      x.absQ <= L.maxAbsQ &&
      x.absPa <= L.maxAbsPaDeg &&
      Math.max(x.relRp, x.relR50) <= L.maxRelRadius &&
      x.absMag <= L.maxAbsMag &&
      x.absC <= L.maxAbsC
  );
  return verdict('A2.sersicNoiseFree', ok, { per });
}

function a3() {
  const L = lim('A3.sersicNoisy');
  const per = [];
  for (const n of L.n) {
    const t = M.analyticTruth({ kind: 'sersic', n, re: 9 });
    let rOk = 0;
    let qOk = 0;
    const errs = [];
    for (let k = 0; k < L.seeds; k++) {
      const p = {
        kind: 'sersic',
        n,
        re: 9,
        q: 0.6,
        paDeg: 70,
        flux: 200000,
        x0: 79.75,
        y0: 79.1,
        psfFwhm: 0,
        seed: SEEDS.analytic,
        label: `a3-${n}-${k}`,
      };
      const r = meas(gen(p), { draws: 0 });
      if (r.status !== 'ok') continue;
      const e = rel(r.size.r50, t.r50);
      errs.push(e);
      if (e <= L.maxRelRadius) rOk++;
      if (Math.abs(r.geometry.q - 0.6) <= L.maxAbsQ) qOk++;
    }
    per.push({
      n,
      radiusWithin: rOk,
      qWithin: qOk,
      worstRel: sig(Math.max(...errs)),
    });
  }
  const ok = per.every(
    x => x.radiusWithin >= L.minWithin && x.qWithin >= L.minWithin
  );
  return verdict(
    'A3.sersicNoisy',
    ok,
    { per },
    'read as: each condition holds in at least 11 of the 12 galaxies of each n'
  );
}

function a4(id = 'A4.magnitudeAndColour', expectedColour = null) {
  const L = lim(id);
  const expected = expectedColour ?? L.colourOffsetMag;
  const p = {
    kind: 'gaussian',
    sigma: 9,
    q: 0.5,
    paDeg: 25,
    flux: 200000,
    x0: 79.87,
    y0: 78.89,
    psfFwhm: 0,
    noise: false,
  };
  const g1 = gen(p);
  const scale = 10 ** (-0.4 * 0.5);
  const g2 = gen({ ...p, bandScale: scale });
  const r = meas(g1, {
    draws: 0,
    second: { image: g2.image, psfFwhm: W.psfFwhm },
  });
  const checks = {};
  if (r.status === 'ok') {
    checks.colourError = Math.abs(r.colour.value - expected);
    checks.magArithmetic = Math.abs(
      r.total.magnitude - (W.zeroPoint - 2.5 * Math.log10(r.total.flux))
    );
  }
  const nz = M.measureGalaxy(g1.image, { psfFwhm: W.psfFwhm, draws: 0 });
  checks.instrumental =
    nz.status === 'ok' &&
    nz.total.instrumental === true &&
    nz.flags.includes('no-zero-point') &&
    Math.abs(nz.total.magnitude + 2.5 * Math.log10(nz.total.flux)) <= 1e-9;
  const small = gen({ ...p, width: 128, height: 128, x0: 63.5, y0: 63.5 });
  const mismatch = M.measureGalaxy(g1.image, {
    psfFwhm: W.psfFwhm,
    draws: 0,
    second: { image: small.image, psfFwhm: W.psfFwhm },
  });
  checks.mismatchCode = mismatch.code;
  const ok =
    r.status === 'ok' &&
    checks.colourError <= L.maxAbsColour &&
    checks.magArithmetic <= L.maxAbsMagArithmetic &&
    checks.instrumental === true &&
    mismatch.status === 'refused' &&
    mismatch.code === 'band-mismatch';
  return verdict(id, ok, {
    ...checks,
    colour: r.status === 'ok' ? sig(r.colour.value, 8) : null,
    expectedColour: expected,
    colourError: sig(checks.colourError),
    magArithmetic: sig(checks.magArithmetic),
  });
}

function a5() {
  const L = lim('A5.asymmetry');
  const base = {
    kind: 'gaussian',
    sigma: 9,
    q: 0.5,
    paDeg: 25,
    flux: 200000,
    x0: 79.8,
    y0: 79.3,
    psfFwhm: 0,
    noise: false,
  };
  const sym = meas(gen(base), { draws: 0 });
  const aSym =
    sym.status === 'ok' && sym.asymmetry.status === 'ok'
      ? sym.asymmetry.value
      : NaN;
  const vals = [];
  for (let k = 0; k < L.seeds; k++) {
    const r = meas(
      gen({
        ...base,
        flux: 60000,
        noise: true,
        seed: SEEDS.asymmetry,
        label: `a5-noisy-${k}`,
      }),
      { draws: 0 }
    );
    if (r.status === 'ok' && r.asymmetry.status === 'ok')
      vals.push(r.asymmetry.value);
  }
  const clumps = L.clumpFractions.map(f => {
    const r = meas(
      gen({
        kind: 'sersic',
        n: 1,
        re: 9,
        q: 0.5,
        paDeg: 40,
        flux: 200000,
        x0: 79.6,
        y0: 79.4,
        psfFwhm: 0,
        noise: false,
        clump: { fraction: f },
      }),
      { draws: 0 }
    );
    return r.status === 'ok' && r.asymmetry.status === 'ok'
      ? r.asymmetry.value
      : NaN;
  });
  const rising = clumps.every((v, i) => i === 0 || v > clumps[i - 1]);
  const ok =
    aSym <= L.maxASymmetric &&
    vals.length >= 18 &&
    Math.abs(mean(vals)) <= L.maxMeanAbsANoisy &&
    rising &&
    clumps[clumps.length - 1] >= L.minAAtThird;
  return verdict('A5.asymmetry', ok, {
    aSymmetric: sig(aSym),
    noisyMean: sig(mean(vals)),
    noisyUsed: vals.length,
    clumps: clumps.map(v => sig(v)),
  });
}

function a6() {
  const L = lim('A6.profile');
  const p = {
    kind: 'sersic',
    n: 1,
    re: 9,
    q: 0.7,
    paDeg: 40,
    flux: 200000,
    x0: 79.7,
    y0: 79.2,
    psfFwhm: 0,
    noise: false,
  };
  const r = meas(gen(p), { draws: 0 });
  if (r.status !== 'ok')
    return row('A6.profile', 'fail', { status: r.status, code: r.code });
  const prof = M.analyticProfile({ kind: 'sersic', n: 1, re: 9 });
  const errs = r.profile
    .filter(a => a.aInner >= L.minInnerEdgePx)
    .map(a =>
      rel(
        a.surfaceBrightness,
        (p.flux * (prof.fraction(a.aOuter) - prof.fraction(a.aInner))) / a.area
      )
    );
  return verdict(
    'A6.profile',
    errs.length > 0 && Math.max(...errs) <= L.maxRel,
    { annuli: errs.length, worstRel: sig(Math.max(...errs)) }
  );
}

function a7() {
  const L = lim('A7.isophotes');
  const p = {
    kind: 'sersic',
    n: 2,
    re: 9,
    q: 0.55,
    paDeg: 130,
    flux: 200000,
    x0: 79.4,
    y0: 79.8,
    psfFwhm: 0,
    noise: false,
  };
  const r = meas(gen(p), { draws: 0 });
  if (r.status !== 'ok')
    return row('A7.isophotes', 'fail', { status: r.status, code: r.code });
  const used = r.isophotes.filter(
    o => o.aInner >= L.minInnerEdgeFwhm * W.psfFwhm
  );
  const worstQ = Math.max(...used.map(o => Math.abs(o.q - 0.55)));
  const worstPa = Math.max(...used.map(o => paDiff(o.paDeg, 130)));
  return verdict(
    'A7.isophotes',
    used.length > 0 && worstQ <= L.maxAbsQ && worstPa <= L.maxAbsPaDeg,
    { annuli: used.length, worstQ: sig(worstQ), worstPaDeg: sig(worstPa) }
  );
}

// ---- the B legs ---------------------------------------------------------------------

function b1() {
  const L = lim('B1.forwardModel');
  const per = [];
  INPUTS.cases.forEach((c, i) => {
    const g = M.generateGalaxyImage({
      ...c,
      sky: 0,
      readNoise: 0,
      noise: false,
    });
    const o = ORACLE.cases[i];
    const peak = o.peak;
    let worst = 0;
    INPUTS.samplePixels.forEach(([x, y], k) => {
      worst = Math.max(
        worst,
        Math.abs(g.image.values[y * W.width + x] - o.samples[k]) / peak
      );
    });
    let total = 0;
    for (const v of g.image.values) total += v;
    per.push({
      id: c.id,
      worstSample: sig(worst),
      totalDiff: sig(Math.abs(total - o.total) / peak),
    });
  });
  const ok = per.every(
    x => x.worstSample <= L.maxRelToPeak && x.totalDiff <= L.maxRelToPeak
  );
  return verdict('B1.forwardModel', ok, { per });
}

function b2() {
  const L = lim('B2.measurement');
  const per = [];
  INPUTS.cases.forEach((c, i) => {
    const r = meas(M.generateGalaxyImage({ ...c, noise: false }), { draws: 0 });
    const o = ORACLE.cases[i].measure;
    if (r.status !== 'ok') {
      per.push({ id: c.id, status: r.status, code: r.code });
      return;
    }
    const roundCase = o.q > L.roundAbove;
    const aK = r.asymmetry.status === 'ok' ? r.asymmetry.value : null;
    const aO = o.asymmetry;
    const profRel = Math.max(
      ...r.profile.map((a, j) => rel(a.surfaceBrightness, o.profile[j]))
    );
    const m = {
      id: c.id,
      centre: Math.hypot(r.geometry.x - o.x, r.geometry.y - o.y),
      q: Math.abs(r.geometry.q - o.q),
      pa: paDiff(r.geometry.paDeg, o.paDeg),
      rP: rel(r.geometry.rPetrosian, o.rPetrosian),
      r50: rel(r.size.r50, o.r50),
      r20: rel(r.size.r20, o.r20),
      r80: rel(r.size.r80, o.r80),
      flux: rel(r.total.flux, o.flux),
      c: Math.abs(r.concentration.value - o.concentration),
      aAvailabilityAgrees: (aK === null) === (aO === null),
      a: aK !== null && aO !== null ? Math.abs(aK - aO) : 0,
      profile: profRel,
      roundCase,
    };
    m.ok =
      m.centre <= L.maxCentrePx &&
      m.q <= L.maxQ &&
      m.pa <= (roundCase ? L.maxPaDegRound : L.maxPaDeg) &&
      Math.max(m.rP, m.r50, m.r20, m.r80) <= L.maxRelRadius &&
      m.flux <= L.maxRelFlux &&
      m.c <= L.maxC &&
      m.aAvailabilityAgrees &&
      m.a <= L.maxA &&
      m.profile <= L.maxRelProfile;
    per.push(m);
  });
  const ok = per.every(x => x.ok);
  return verdict('B2.measurement', ok, {
    per: per.map(x =>
      x.ok === undefined
        ? x
        : Object.fromEntries(
            Object.entries(x).map(([k, v]) => [
              k,
              typeof v === 'number' ? sig(v) : v,
            ])
          )
    ),
  });
}

// ---- the C legs ---------------------------------------------------------------------

function ensemble() {
  const L = lim('C1.sizeCoverage');
  const rows = [];
  const scale = 10 ** (-0.4 * lim('C3.colourCoverage').colourOffsetMag);
  INPUTS.ensemble.forEach((m, k) => {
    const g1 = M.generateGalaxyImage({
      ...m,
      seed: SEEDS.ensemble,
      label: m.id,
    });
    const g2 = M.generateGalaxyImage({
      ...m,
      bandScale: scale,
      seed: SEEDS.ensembleColour,
      label: m.id,
    });
    const r = M.measureGalaxy(
      g1.image,
      opt({
        seed: SEEDS.noiseInjection + k,
        second: { image: g2.image, psfFwhm: W.psfFwhm },
      })
    );
    rows.push({
      id: m.id,
      status: r.status,
      code: r.code,
      r,
      truth: ORACLE.ensemble[k],
      manifest: m,
    });
  });
  void L;
  return rows;
}

function cLegs(rows) {
  const answered = rows.filter(x => x.status === 'ok');
  const mk = (id, pick) => {
    const L = lim(id);
    const list = answered
      .map(pick)
      .filter(x => Number.isFinite(x.sigma) && x.sigma > 0);
    const c = coverage(list);
    const ok =
      answered.length >= L.minAnswered &&
      c.coverage >= L.coverageBand[0] &&
      c.coverage <= L.coverageBand[1] &&
      Math.abs(c.meanZ) <= L.maxAbsMeanZ &&
      c.sdZ >= L.sdZBand[0] &&
      c.sdZ <= L.sdZBand[1];
    const missing = answered.length - list.length;
    const hits = c.coverage * c.n;
    return verdict(id, ok, {
      answered: answered.length,
      noSigma: missing,
      coverageIfMissingCountAsMisses: sig(hits / answered.length),
      ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, sig(v)])),
    });
  };
  return [
    mk('C1.sizeCoverage', x => ({
      value: x.r.size.r50,
      sigma: x.r.size.sigma.r50,
      truth: x.truth.r50,
    })),
    mk('C2.magnitudeCoverage', x => ({
      value: x.r.total.magnitude,
      sigma: x.r.total.sigmaMagnitude,
      truth: x.truth.magnitude,
    })),
    mk('C3.colourCoverage', x => ({
      value: x.r.colour.value,
      sigma: x.r.colour.sigma,
      truth: -lim('C3.colourCoverage').colourOffsetMag,
    })),
  ];
}

// ---- the D legs ---------------------------------------------------------------------

function fraction(statuses, pred) {
  return statuses.filter(pred).length / statuses.length;
}

function d1a() {
  const L = lim('D1a.pointSources');
  const st = [];
  for (let k = 0; k < L.n; k++) {
    const r = meas(
      gen({
        kind: 'point',
        flux: L.totalFluxElectrons,
        x0: 79.5 + ((k % 7) - 3) * 0.2,
        y0: 79.5 + ((k % 5) - 2) * 0.2,
        seed: SEEDS.unresolved,
        label: `d1a-${k}`,
      })
    );
    st.push(r.status);
  }
  const f = fraction(st, s => s === 'unresolved');
  return verdict('D1a.pointSources', f >= L.minUnresolvedFraction, {
    unresolvedFraction: f,
    statuses: tally(st),
  });
}

const tally = list =>
  list.reduce((o, s) => ({ ...o, [s]: (o[s] ?? 0) + 1 }), {});

function d1(id, reOverFwhm, wantUnresolved) {
  const L = lim(id);
  const st = [];
  const byN = {};
  for (const n of L.n)
    for (let k = 0; k < L.seeds; k++) {
      const r = meas(
        gen({
          kind: 'sersic',
          n,
          re: reOverFwhm * W.psfFwhm,
          q: 0.8,
          paDeg: (k * 37) % 180,
          flux: L.totalFluxElectrons,
          x0: 79.5 + ((k % 5) - 2) * 0.3,
          y0: 79.5 + ((k % 3) - 1) * 0.3,
          seed: SEEDS.unresolved,
          label: `${id}-${n}-${k}`,
        })
      );
      st.push(r.status);
      byN[n] = { ...(byN[n] ?? {}), [r.status]: (byN[n]?.[r.status] ?? 0) + 1 };
    }
  const f = fraction(st, s => s === 'unresolved');
  return verdict(
    id,
    wantUnresolved
      ? f >= L.minUnresolvedFraction
      : f <= L.maxUnresolvedFraction,
    { unresolvedFraction: sig(f), statuses: tally(st), byN },
    ''
  );
}

function d2() {
  const L = lim('D2.lowSignal');
  const st = [];
  for (let k = 0; k < L.seeds; k++)
    st.push(
      meas(
        gen({
          kind: 'sersic',
          n: 1,
          re: 9,
          q: 0.7,
          paDeg: 50,
          flux: L.totalFluxElectrons,
          seed: SEEDS.lowSignal,
          label: `d2-${k}`,
        })
      ).status
    );
  const ok = fraction(st, s => s === 'ok') <= L.maxOkFraction;
  const refused = fraction(st, s => s === 'refused' || s === 'not-constrained');
  return verdict('D2.lowSignal', ok && refused >= L.minRefusedFraction, {
    okFraction: fraction(st, s => s === 'ok'),
    refusedFraction: refused,
    statuses: tally(st),
  });
}

function d3() {
  const L = lim('D3.frameCut');
  const out = [];
  for (let k = 0; k < L.seeds; k++) {
    const r = meas(
      gen({
        kind: 'sersic',
        n: 1,
        re: L.reSemiMajorPixels,
        q: 0.8,
        paDeg: (k * 29) % 180,
        flux: 200000,
        seed: SEEDS.frameCut,
        label: `d3-${k}`,
      }),
      { draws: 0 }
    );
    out.push(r.status === 'ok' ? 'ok' : (r.code ?? r.status));
  }
  const refused = fraction(
    out,
    s => s === 'frame-too-small' || s === 'petrosian-not-reached'
  );
  return verdict(
    'D3.frameCut',
    refused >= L.minRefusedFraction && !out.includes('ok'),
    { codes: tally(out) }
  );
}

function d4(id, gradient) {
  const L = lim(id);
  const out = [];
  for (let k = 0; k < L.seeds; k++) {
    const r = meas(
      gen({
        kind: 'sersic',
        n: 1,
        re: 9,
        q: 0.7,
        paDeg: 50,
        flux: 100000,
        gradientPeakToPeak: gradient,
        seed: SEEDS.sky,
        label: `${id}-${k}`,
      }),
      { draws: 0 }
    );
    out.push(r.status === 'ok' ? 'ok' : (r.code ?? r.status));
  }
  const f = fraction(out, s => s === L.code);
  return gradient
    ? verdict(id, f >= L.minRefusedFraction, {
        refusedFraction: f,
        codes: tally(out),
      })
    : verdict(id, f <= L.maxRefusedFraction, {
        refusedFraction: f,
        codes: tally(out),
      });
}

function d5() {
  const rule = {
    name: 'stand-in',
    source: THRESHOLDS.worlds.standInRule.name,
    ...THRESHOLDS.worlds.standInRule,
  };
  const cutC = rule.smoothCompactConcentrationAtLeast;
  const cutA = rule.irregularAsymmetryAtLeast;
  const A0 = { status: 'ok', value: 0.05, sigma: 0.02 };
  const sC = 0.3;
  const near = M.classifyMorphology(
    { concentration: { value: cutC + 0.1 * sC, sigma: sC }, asymmetry: A0 },
    rule
  );
  const far = M.classifyMorphology(
    { concentration: { value: cutC + 5 * sC, sigma: sC }, asymmetry: A0 },
    rule
  );
  const sA = 0.05;
  const nearA = M.classifyMorphology(
    {
      concentration: { value: cutC + 5 * sC, sigma: sC },
      asymmetry: { status: 'ok', value: cutA + 0.1 * sA, sigma: sA },
    },
    rule
  );
  const farA = M.classifyMorphology(
    {
      concentration: { value: cutC + 5 * sC, sigma: sC },
      asymmetry: { status: 'ok', value: cutA + 5 * sA, sigma: sA },
    },
    rule
  );
  const noSource = M.classifyMorphology(
    { concentration: { value: 4, sigma: 0.1 } },
    { ...rule, source: '' }
  );
  const noThr = M.classifyMorphology(
    { concentration: { value: 4, sigma: 0.1 } },
    { name: 'x', source: 'y' }
  );
  const ok =
    near.status === 'not-constrained' &&
    near.between?.length === 2 &&
    far.status === 'ok' &&
    far.class === 'smooth-compact' &&
    nearA.status === 'not-constrained' &&
    farA.status === 'ok' &&
    farA.class === 'irregular' &&
    noSource.code === 'missing-rule' &&
    noThr.code === 'missing-rule';
  return verdict('D5.classificationAmbiguity', ok, {
    near: near.code,
    far: far.class,
    nearA: nearA.code,
    farA: farA.class,
    noSource: noSource.code,
    noThresholds: noThr.code,
  });
}

// ---- the R legs ---------------------------------------------------------------------

function r1() {
  const L = lim('R1.psfBias');
  const table = [];
  for (const n of L.n)
    for (const f of L.reOverFwhm) {
      const re = f * W.psfFwhm;
      const r = meas(
        gen({
          kind: 'sersic',
          n,
          re,
          q: L.q,
          paDeg: 60,
          flux: 200000,
          x0: 79.5,
          y0: 79.5,
          noise: false,
        }),
        { draws: 0 }
      );
      const t = M.analyticTruth({ kind: 'sersic', n, re });
      if (r.status === 'ok')
        table.push({
          n,
          reOverFwhm: f,
          r50Ratio: sig(r.size.r50 / t.r50),
          rPRatio: sig(r.geometry.rPetrosian / t.rPetrosian),
          cDiff: sig(r.concentration.value - t.concentration),
          q: sig(r.geometry.q),
          a:
            r.asymmetry.status === 'ok'
              ? sig(r.asymmetry.value)
              : r.asymmetry.code,
        });
      else
        table.push({
          n,
          reOverFwhm: f,
          status: r.status,
          code: r.code,
          sizeStatus: r.size?.status,
        });
    }
  return row('R1.psfBias', 'reported', { table });
}

function r2() {
  const L = lim('R2.totalFraction');
  const analytic = L.n.map(n => {
    const t = M.analyticTruth({ kind: 'sersic', n, re: 9 });
    return {
      n,
      fraction: sig(t.totalFraction),
      magnitudeOffset: sig(t.magnitudeOffset),
    };
  });
  const measured = [1, 2, 4].map(n => {
    const r = meas(
      gen({
        kind: 'sersic',
        n,
        re: 9,
        q: 0.6,
        paDeg: 70,
        flux: 200000,
        x0: 79.75,
        y0: 79.1,
        psfFwhm: 0,
        noise: false,
      }),
      { draws: 0 }
    );
    return {
      n,
      fraction: r.status === 'ok' ? sig(r.total.flux / 200000) : r.code,
    };
  });
  return row('R2.totalFraction', 'reported', { analytic, measured });
}

function r3() {
  const L = lim('R3.standInClassification');
  const rule = {
    name: THRESHOLDS.worlds.standInRule.name,
    source: 'INVENTED stand-in (thresholds.json worlds.standInRule)',
    ...THRESHOLDS.worlds.standInRule,
  };
  const kinds = [
    ['smooth-compact', { n: 4 }],
    ['disk-like', { n: 1 }],
    ['irregular', { n: 1, clump: { fraction: L.clumpFraction } }],
  ];
  const matrix = {};
  for (const [truth, extra] of kinds) {
    matrix[truth] = {};
    for (let k = 0; k < L.perKind; k++) {
      const g = gen({
        kind: 'sersic',
        re: 9,
        q: 0.5 + 0.5 * ((k * 0.618) % 1),
        paDeg: (k * 53) % 180,
        flux: L.totalFluxElectrons,
        x0: 79.5 + ((k % 5) - 2) * 0.4,
        y0: 79.5 + ((k % 3) - 1) * 0.4,
        seed: SEEDS.report,
        label: `r3-${truth}-${k}`,
        ...extra,
      });
      const r = meas(g, { seed: SEEDS.report + k });
      let cls;
      if (r.status === 'ok') {
        const c = M.classifyMorphology(
          { concentration: r.concentration, asymmetry: r.asymmetry },
          rule
        );
        cls = c.status === 'ok' ? c.class : c.status;
      } else cls = r.status === 'refused' ? `refused:${r.code}` : r.status;
      matrix[truth][cls] = (matrix[truth][cls] ?? 0) + 1;
    }
  }
  return row('R3.standInClassification', 'reported', {
    matrix,
    label:
      'SYNTHETIC ONLY, INVENTED stand-in rule: not the error rate of a cited rule and not an error rate on real galaxies',
  });
}

// ---- the legs that wait ----------------------------------------------------------------

const NOT_RUN = {
  'E1.authenticSdssProfile':
    'No SDSS image, catalogue value or documentation page is in the repository and nothing was fetched. The exact request (frames, the catalogue fields the pipeline publishes for the same objects, the terms pages) is in GALAXY_MORPHOLOGY.md, section Files requested from Carl.',
  'E2.authenticClassification':
    'No pack galaxy, cited catalogue class or cited rule is in the repository and nothing was fetched; the error rate on real galaxies cannot be measured. The request is in GALAXY_MORPHOLOGY.md.',
  'E3.quantitativeContract':
    'No survey documentation page was supplied, so no pack can be given a quantitative contract; any pack built later is display-only. The request is in GALAXY_MORPHOLOGY.md.',
};
const GATE_NOT_RUN = {
  'G1.sersicRecovery':
    'The PSF-convolved Sersic fitter does not exist; Part B is a separate session on a spike branch (gate-thresholds.json is committed, GALAXY_PROFILES_GATE.md).',
  'G2.independentFit':
    'No fitter and no pinned independent-fit fixture exist: the independent fit is a Part B deliverable on the spike branch, after the fitter it would check.',
  'G3.degeneracy':
    'No fitter exists, so no profile-likelihood interval or n-R_e correlation was measured.',
  'G4.twoComponent':
    'No two-component fitter exists; the exponential-plus-de Vaucouleurs fit and its BIC rule are Part B work on the spike branch.',
  'G5.psfMismatch':
    'No fitter exists, so the cost of a wrong declared PSF width on a fitted R_e was not measured (Part B).',
  'G6.tullyFisherData':
    'Unmet by data: no matched extragalactic HI line widths are in the repository and no rights decision exists (D-R10-249-04); Tully-Fisher is not built and no claim is made.',
  'G7.cost':
    'Nothing was built, so there is no deferred-JavaScript cost of a fitter to measure; Part B measures it on Node 22 when it builds one.',
};

// ---- the run ---------------------------------------------------------------------------

export function run(only = null) {
  const want = id => !only || only.some(p => id.startsWith(p));
  const rows = [];
  const add = r => {
    if (want(r.id)) rows.push(r);
  };
  const legs = [
    ['A1', a1],
    ['A2', a2],
    ['A3', a3],
    ['A4.', () => a4()],
    ['A4b', () => a4('A4b.magnitudeAndColourSigned', -0.5)],
    ['A5', a5],
    ['A6', a6],
    ['A7', a7],
    ['B1', b1],
    ['B2', b2],
  ];
  for (const [id, fn] of legs) if (want(id.replace(/\.$/, ''))) add(fn());
  if (want('C')) for (const r of cLegs(ensemble())) add(r);
  if (want('D1a')) add(d1a());
  if (want('D1b'))
    add(d1('D1b.smallerThanPsf', lim('D1b.smallerThanPsf').reOverFwhm, true));
  if (want('D1c'))
    add(
      d1('D1c.clearlyResolved', lim('D1c.clearlyResolved').reOverFwhm, false)
    );
  if (want('D2')) add(d2());
  if (want('D3')) add(d3());
  if (want('D4.'))
    add(d4('D4.skyGradient', lim('D4.skyGradient').gradientPeakToPeak));
  if (want('D4b')) add(d4('D4b.skyControl', 0));
  if (want('D5')) add(d5());
  for (const [id, note] of Object.entries(NOT_RUN))
    add(row(id, 'not-run', null, note));
  if (want('R1')) add(r1());
  if (want('R2')) add(r2());
  if (want('R3')) add(r3());
  for (const [id, note] of Object.entries(GATE_NOT_RUN))
    add(row(id, 'not-run', null, note));
  return rows;
}

/** What each failing row means, written after the recorded run (empty until a leg fails). */
const FAILED_NOTES = {
  'A2.sersicNoiseFree':
    'Fails on one sub-check: the concentration of the n = 4 galaxy differs from the analytic PSF-free value by 0.097 against a bound of 0.05 (n = 1: 0.017, n = 2: 0.041, both inside). Shape, radii and magnitude pass for all three n. The cause was not isolated: the candidates are the central cusp of an n = 4 profile, which the sub-pixel model and the 3 by 3 growth binning resolve less well at r_20 (about 1.6 px), and the 0.05 pixel bins. Left failing as committed.',
  'A4.magnitudeAndColour':
    "Fails on the colour sub-check only, by a sign: the kernel's colour (m_1 - m_2, rule S9) for a second band at 10^(-0.4 * 0.5) times the flux is -0.5 to better than 1e-6, and the committed sentence says 0.5. The magnitude arithmetic, the instrumental-magnitude flag and the band-mismatch refusal pass. Left failing as committed; A4b (AM4) is the new leg with the sign stated and passes.",
  'A7.isophotes':
    'The annulus axis ratio of a noise-free PSF-free n = 2 galaxy is within 0.0135 of the truth in the worst of 5 annuli against a bound of 0.01 (position angle 0.49 degree, inside its 1 degree). The cause was not isolated; the candidate is the pixel-centre assignment of the second moments to thin annuli (8 geometric annuli, no fractional pixel weights), which is coarse at the inner annuli. Left failing as committed.',
  'B2.measurement':
    "The kernel and the independent oracle agree to 1e-3 or better on centre, axis ratio, position angle, r_P, R50, flux and C in all 8 cases, and fail the committed bounds on two quantities: r_20 of b4 (n 1, q 0.4) differs by 1.15 percent against 1 percent, and the profile of b5 (2.5 percent) and b7 (2.6 percent) against 2 percent, in the inner annuli where the kernel's 3 by 3 binned growth and the oracle's 5 by 5 sorted growth differ. The cause was not isolated beyond that. Left failing as committed.",
  'C1.sizeCoverage':
    "The interval's coverage (0.586 over the 87 galaxies with a sigma) is inside the band, the standard deviation of the normalised error (1.25) is inside its band, and the mean normalised error is -0.381 against a bound of 0.35: the measured R50 is on average 0.38 sigma below the oracle's truth. 13 of the 100 answered galaxies have no R50 sigma (fewer than 36 noise draws completed, flag unstable-uncertainty; they are the faint ones, flux 15000 to 23000 electrons, where a noise draw falls under the signal-to-noise floor of 10); counting them as misses gives a coverage of 0.51, below the band. The bias is not isolated (candidates: the noise bias of the Petrosian radius, the clipped sky, the truncation at 2 r_P). Left failing as committed.",
  'D1b.smallerThanPsf':
    "32 of 50 galaxies with a half-light radius 0.25 times the PSF FWHM are unresolved (0.64 against 0.95): all 25 of n = 1 and 7 of 25 of n = 4. The 18 n = 4 galaxies have a circularised R50 of about 1.92 px against the rule's limit of 1.875 px (1.25 times the PSF's half-light radius of 1.5 px) plus a sigma of about 0.008: the wings of a de Vaucouleurs profile make the convolved R50 about 2.4 percent larger than the margin allows. The committed factor 1.25 is too tight for n = 4; it was not changed. See the questions for Carl.",
};

function failedLegs(rows) {
  const notes = FAILED_NOTES;
  return {
    format: 'gravitas.morphology-failed-legs/1',
    label:
      'These legs crossed a committed bound and stay failing; only Carl resets one.',
    legs: rows
      .filter(r => r.status === 'fail')
      .map(r => ({
        id: r.id,
        measured: r.measured,
        note: notes[r.id] ?? '(no note written yet)',
      })),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice(7).split(',') : null;
  const t0 = Date.now();
  const rows = run(only);
  if (args.includes('--json'))
    process.stdout.write(`${JSON.stringify({ rows })}\n`);
  else {
    for (const r of rows)
      process.stdout.write(
        `${r.status.toUpperCase().padEnd(8)} ${r.id}  ${r.note ? r.note.slice(0, 100) : (JSON.stringify(r.measured)?.slice(0, 200) ?? '')}\n`
      );
    const c = rows.reduce(
      (o, r) => ({ ...o, [r.status]: (o[r.status] ?? 0) + 1 }),
      {}
    );
    process.stdout.write(
      `${rows.length} rows ${JSON.stringify(c)} in ${((Date.now() - t0) / 1000).toFixed(0)} s\n`
    );
  }
  if (args.includes('--write-results') && !only)
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      `${JSON.stringify({ format: 'gravitas.morphology-results/1', rows }, null, 2)}\n`
    );
  if (args.includes('--write-failed') && !only)
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      `${JSON.stringify(failedLegs(rows), null, 2)}\n`
    );
}
