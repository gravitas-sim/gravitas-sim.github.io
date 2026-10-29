#!/usr/bin/env node
// =============================================================================
// The detector effects against their committed thresholds (Prompt 211)
// -----------------------------------------------------------------------------
//   npm run detector-effects:validate            print the table
//   npm run detector-effects:validate -- --json  print it as JSON
//   node tools/detector-effects-validate.mjs --write-cr-frame   (re)write the pinned cosmic-ray frame
//
// tests/fixtures/detector-effects/thresholds.json fixed every bound before the
// kernel existed; this runs the checks against js/kernels/detector/effects.js,
// sampling.js and frame.js (and Prompt 180's tools for D1 to D3) and judges them
// against the bounds read from that file. The oracle's rows read the results
// pinned in tests/fixtures/detector-effects/oracle-results.json
// (tools/detector-effects-oracle/oracle.py: numpy and scipy, no Gravitas code).
// A crossed bound is a failed row, left failing in failed-legs.json.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as E from '../js/kernels/detector/effects.js';
import { phaseStats, samplingOf } from '../js/kernels/detector/sampling.js';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import { maskCosmicRays } from '../js/kernels/detector/reduce.js';
import { stream } from '../js/random/streams.js';
import { validateImage, permits } from '../js/dataKinds/contract.js';
import { adapt } from '../js/measure/photometry.js';
import {
  adaptedEffectsFrame,
  detectEffects,
  effectsFrame,
  effectsSidecar,
  measureEffects,
} from '../js/effectsField.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = 'tests/fixtures/detector-effects/';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const THR = read(`${FIX}thresholds.json`);
const ORA = read(`${FIX}oracle-results.json`);
const BASE = read(`${FIX}frame-baseline.json`);
export const THRESHOLDS = THR;
const lim = id => THR.checks.find(c => c.id === id).limits;
const FW = 50000;
const rows = [];
const row = (id, pass, measured, note = '') =>
  rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
const relErr = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1);
const sha = a =>
  createHash('sha256')
    .update(Buffer.from(a.buffer, a.byteOffset, a.byteLength))
    .digest('hex');

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = tag =>
  mulberry32(
    THR.seeds.harness + [...tag].reduce((s, c) => s + c.charCodeAt(0), 0)
  );

/** A clean detector: flat pattern of exactly 1, no dark, no bias pattern, no hot pixels. */
const CLEAN = {
  width: 48,
  height: 48,
  vignette: 0,
  dustCount: 0,
  dustDepth: 0,
  qeScatter: 0,
  darkRate: 0,
  hotFraction: 0,
  biasColumnSigma: 0,
  cosmicRate: 0,
};

// ---- A1, A2: the response curve ---------------------------------------------------------

function a1() {
  const l = lim('A1.response.curve');
  let worst = 0;
  let knee = 0;
  let slope = 0;
  let mono = true;
  let top = 0;
  let inv = 0;
  for (const kf of l.kneeFractions) {
    const o = ORA.response.knees[String(kf)];
    o.e.forEach((e, i) => {
      worst = Math.max(worst, relErr(E.responseCurve(e, FW, kf), o.f[i]));
    });
    const k = kf * FW;
    knee = Math.max(knee, Math.abs(E.responseCurve(k, FW, kf) - k) / FW);
    const h = 1e-6 * FW;
    const left =
      (E.responseCurve(k, FW, kf) - E.responseCurve(k - h, FW, kf)) / h;
    const right =
      (E.responseCurve(k + h, FW, kf) - E.responseCurve(k, FW, kf)) / h;
    slope = Math.max(slope, Math.abs(left - 1), Math.abs(right - 1));
    let prev = -1;
    for (let i = 0; i <= l.points; i++) {
      const v = E.responseCurve((i / l.points) * FW, FW, kf);
      if (!(v > prev)) mono = false;
      prev = v;
    }
    top = Math.max(top, relErr(E.responseCurve(FW, FW, kf), o.atFullWell));
    for (let i = 1; i <= 200; i++) {
      const e = (i / 200) * FW;
      inv = Math.max(
        inv,
        relErr(E.responseInverse(E.responseCurve(e, FW, kf), FW, kf), e)
      );
    }
  }
  row(
    'A1.response.curve',
    worst <= l.relMax &&
      knee <= l.kneeAbsFraction &&
      slope <= l.slopeAbsMax &&
      mono &&
      top <= l.relMax &&
      inv <= l.inverseRelMax,
    {
      worstRel: worst,
      kneeAbs: knee,
      slopeAbs: slope,
      monotone: mono,
      atWellRel: top,
      inverseRel: inv,
    }
  );
}

function a2() {
  const l = lim('A2.response.limit');
  let worst = 0;
  let dev = 0;
  let between = true;
  let nulls = 0;
  for (const kf of lim('A1.response.curve').kneeFractions)
    for (const d of l.deviations) {
      const o = ORA.response.knees[String(kf)].limits[String(d)];
      const v = E.linearLimit(d, FW, kf);
      if (o === null) {
        nulls++;
        if (v !== null) worst = Infinity;
        continue;
      }
      worst = Math.max(worst, relErr(v, o));
      dev = Math.max(dev, Math.abs(1 - E.responseCurve(v, FW, kf) / v - d));
      if (!(v > kf * FW && v <= FW)) between = false;
    }
  row(
    'A2.response.limit',
    worst <= l.relMax && dev <= l.deviationAbsMax && between,
    {
      worstRel: worst,
      deviationAbs: dev,
      nullsAgree: nulls,
    }
  );
}

// ---- A3, A4: uniform frames against exact Poisson expectations -------------------------------

function uniform(level, seed, over = {}, effects = {}, size = 48) {
  return simulateFrame({
    seed,
    kind: 'flat',
    exposure: 0,
    flatLevel: level * FW,
    detector: { ...CLEAN, width: size, height: size, ...over },
    effects,
  });
}

function a3() {
  const l = lim('A3.saturation.frame');
  const N = l.size * l.size;
  const worst = { mean: 0, fraction: 0 };
  const out = [];
  for (const lev of l.levels) {
    const o = ORA.poisson.rows.find(r => r.level === lev);
    const f = uniform(lev, `${THR.seeds.ensemble}:a3:${lev}`);
    const meanCounts = f.values.reduce((s, v) => s + v, 0) / N;
    const expect = ORA.poisson.bias + o.clipMean / ORA.poisson.gain;
    const se =
      Math.sqrt(o.clipVar + ORA.poisson.readNoise ** 2) /
      ORA.poisson.gain /
      Math.sqrt(N);
    const z =
      se > 0
        ? Math.abs(meanCounts - expect) / se
        : Math.abs(meanCounts - expect) > 1
          ? Infinity
          : 0;
    const frac = f.truth.saturated / N;
    const sef = Math.sqrt(Math.max(0, o.tail * (1 - o.tail)) / N);
    const zf =
      sef > 0
        ? Math.abs(frac - o.tail) / sef
        : Math.abs(frac - o.tail) > 1e-9
          ? Infinity
          : 0;
    worst.mean = Math.max(worst.mean, z);
    worst.fraction = Math.max(worst.fraction, zf);
    out.push({ level: lev, z: +z.toFixed(2), zFraction: +zf.toFixed(2) });
  }
  const clip = uniform(1.3, `${THR.seeds.ensemble}:a3:adc`, { gain: 0.5 });
  const clipped = clip.values.every(v => v === 65535);
  row(
    'A3.saturation.frame',
    worst.mean <= l.meanSe && worst.fraction <= l.fractionSe && clipped,
    {
      worstMeanSe: worst.mean,
      worstFractionSe: worst.fraction,
      converterClip: clipped,
      levels: out,
    }
  );
}

function a4() {
  const l = lim('A4.nonlinearity.frame');
  const N = l.size * l.size;
  let worst = 0;
  const out = [];
  for (const lev of l.levels) {
    const o = ORA.poisson.rows.find(r => r.level === lev);
    const f = uniform(
      lev,
      `${THR.seeds.ensemble}:a4:${lev}`,
      {},
      { nonlinearity: true }
    );
    const meanCounts = f.values.reduce((s, v) => s + v, 0) / N;
    const expect = ORA.poisson.bias + o.nlMean / ORA.poisson.gain;
    const se =
      Math.sqrt(o.nlVar + ORA.poisson.readNoise ** 2) /
      ORA.poisson.gain /
      Math.sqrt(N);
    const z = Math.abs(meanCounts - expect) / se;
    worst = Math.max(worst, z);
    out.push({ level: lev, z: +z.toFixed(2) });
  }
  // linear region: the recorded mean equals the mean charge
  const lo = ORA.poisson.rows.find(r => r.level === 0.3);
  const fl = uniform(
    0.3,
    `${THR.seeds.ensemble}:a4:0.3`,
    {},
    { nonlinearity: true }
  );
  const meanE =
    (fl.values.reduce((s, v) => s + v, 0) / N - ORA.poisson.bias) *
    ORA.poisson.gain;
  const zLin =
    Math.abs(meanE - lo.lambda) /
    (Math.sqrt(lo.lambda + ORA.poisson.readNoise ** 2) / Math.sqrt(N));
  // identical to the effect off wherever the collected charge is at or below the knee
  let differ = 0;
  let compared = 0;
  for (const lev of [0.5, 0.85]) {
    const seed = `${THR.seeds.ensemble}:a4:same:${lev}`;
    const on = uniform(lev, seed, {}, { nonlinearity: true });
    const off = uniform(lev, seed, {}, {});
    const col = on.truth.effects.electronsCollected;
    for (let i = 0; i < col.length; i++)
      if (col[i] <= 0.8 * FW) {
        compared++;
        if (on.values[i] !== off.values[i]) differ++;
      }
  }
  row(
    'A4.nonlinearity.frame',
    worst <= l.meanSe && zLin <= l.meanSe && differ === 0 && compared > 1000,
    {
      worstMeanSe: worst,
      linearSe: zLin,
      belowKneeCompared: compared,
      belowKneeDiffer: differ,
      levels: out,
    }
  );
}

// ---- A5 to A7: cosmic-ray tracks ----------------------------------------------------------------

function a5() {
  const l = lim('A5.cosmic.track');
  const { width: W, height: H, tracks } = ORA.tracks;
  let worst = 0;
  let sumWorst = 0;
  tracks.forEach(tr => {
    const mine = new Map(E.trackDeposit(tr, W, H));
    const theirs = new Map(tr.deposits.map(([i, j, e]) => [j * W + i, e]));
    const keys = new Set([...mine.keys(), ...theirs.keys()]);
    for (const k of keys) {
      const a = mine.get(k) ?? 0;
      const b = theirs.get(k) ?? 0;
      worst = Math.max(worst, Math.abs(a - b));
    }
    const s = [...mine.values()].reduce((x, y) => x + y, 0);
    sumWorst = Math.max(sumWorst, relErr(s, tr.sum));
    // inside the frame entirely and uncapped: the closed form
    if (relErr(tr.sum, tr.full) < 1e-9 && Math.tan(tr.theta) <= 40)
      sumWorst = Math.max(sumWorst, relErr(s, 1200 / Math.cos(tr.theta)));
  });
  row(
    'A5.cosmic.track',
    worst <= l.absMax && sumWorst <= l.sumRelMax && tracks.length === l.tracks,
    {
      worstAbsElectrons: worst,
      sumRel: sumWorst,
      tracks: tracks.length,
    }
  );
}

function a6() {
  const l = lim('A6.cosmic.rate');
  const counts = [];
  for (let k = 0; k < l.frames; k++) {
    const f = simulateFrame({
      seed: `${THR.seeds.ensemble}:a6`,
      label: `f${k}`,
      kind: 'science',
      exposure: l.exposureS,
      detector: { ...CLEAN, width: 32, height: 32 },
      scene: { sky: 1, sources: [] },
      effects: { cosmic: { rate: l.rate } },
    });
    counts.push(f.truth.effects.cosmicTracks.length);
  }
  const mean = counts.reduce((s, v) => s + v, 0) / counts.length;
  const v =
    counts.reduce((s, c) => s + (c - mean) ** 2, 0) / (counts.length - 1);
  const lam = l.rate * l.exposureS;
  const z = Math.abs(mean - lam) / Math.sqrt(lam / l.frames);
  row(
    'A6.cosmic.rate',
    z <= l.meanSe &&
      v / mean >= l.dispersionRange[0] &&
      v / mean <= l.dispersionRange[1],
    {
      mean,
      meanSe: z,
      dispersion: v / mean,
    }
  );
}

function a7() {
  const l = lim('A7.cosmic.morphology');
  const rng = stream('noise', THR.seeds.ensemble, 'a7');
  const ev = Array.from({ length: l.events }, () => E.drawTrack(rng, 64, 64));
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  const mt = med(ev.map(e => e.total));
  const ml = med(ev.map(e => e.length));
  const c2 = ev.reduce((s, e) => s + Math.cos(2 * e.phi), 0) / ev.length;
  const s2 = ev.reduce((s, e) => s + Math.sin(2 * e.phi), 0) / ev.length;
  const capOk = ev.every(e => e.length <= E.DEFAULT_COSMIC.maxLengthPx);
  const rt = Math.abs(mt / (Math.SQRT2 * 1200) - 1);
  const rl = Math.abs(ml / 1 - 1);
  row(
    'A7.cosmic.morphology',
    rt <= l.medianRelMax &&
      rl <= l.medianRelMax &&
      Math.abs(c2) <= l.azimuthAbsMax &&
      Math.abs(s2) <= l.azimuthAbsMax &&
      capOk,
    {
      medianTotalRel: rt,
      medianLengthRel: rl,
      cos2phi: c2,
      sin2phi: s2,
      capHeld: capOk,
    }
  );
}

// ---- A8 to A10: bleeding ------------------------------------------------------------------------------

function a8() {
  const l = lim('A8.bleed.conservation');
  const rng = rngFor('a8');
  let worst = 0;
  let over = 0;
  let changed = 0;
  for (let k = 0; k < l.columns; k++) {
    const q = new Float64Array(l.height);
    const sky = 20 + rng() * 2980;
    for (let i = 0; i < q.length; i++)
      q[i] = Math.floor(sky + (rng() - 0.5) * 2 * Math.sqrt(sky));
    for (let s = 1 + Math.floor(rng() * 3); s > 0; s--) {
      const c = 6 + Math.floor(rng() * (l.height - 12));
      q[c] = FW + 100 + rng() * 80000;
    }
    const cap = [4, 10, 64][k % 3];
    const before = Float64Array.from(q);
    const { after, lost, touched } = E.bleedColumn(before, FW, cap);
    const sum = a => a.reduce((s, v) => s + v, 0);
    worst = Math.max(
      worst,
      Math.abs(sum(before) - sum(after) - lost) / sum(before)
    );
    if (after.some(v => v > FW)) over++;
    const t = new Set(touched);
    for (let i = 0; i < q.length; i++)
      if (!t.has(i) && before[i] <= FW && after[i] !== before[i]) changed++;
  }
  let oracleWorst = 0;
  for (const c of ORA.bleed.cases) {
    const mine = E.bleedColumn(c.before, FW, c.cap);
    c.after.forEach(
      (v, i) => (oracleWorst = Math.max(oracleWorst, relErr(mine.after[i], v)))
    );
    oracleWorst = Math.max(oracleWorst, relErr(mine.lost, c.lost));
    if (JSON.stringify(mine.touched) !== JSON.stringify(c.touched))
      oracleWorst = Infinity;
  }
  row(
    'A8.bleed.conservation',
    worst <= l.relMax && over === 0 && changed === 0 && oracleWorst <= l.relMax,
    {
      worstConservationRel: worst,
      pixelsAboveWell: over,
      untouchedChanged: changed,
      oracleColumns: ORA.bleed.cases.length,
      oracleWorstRel: oracleWorst,
    }
  );
}

function a9() {
  const l = lim('A9.bleed.trail');
  const rng = rngFor('a9');
  let bad = 0;
  let asym = 0;
  let lostBad = 0;
  for (let k = 0; k < l.cases; k++) {
    const b = 100 + Math.floor(rng() * 4000);
    const head = FW - b;
    const frac =
      l.fractionRange[0] + rng() * (l.fractionRange[1] - l.fractionRange[0]);
    const n = 1 + Math.floor(rng() * 40);
    const half = (n + frac) * head;
    const q = new Float64Array(400).fill(b);
    const w = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < w; i++) q[200 + i] = FW + (2 * half) / w;
    let excess = 0;
    for (let i = 0; i < w; i++) excess += q[200 + i] - FW;
    const { touched, lost } = E.bleedColumn(q, FW, 1000);
    const up = touched.filter(i => i < 200).length;
    const down = touched.filter(i => i > 200 + w - 1).length;
    const want = Math.ceil(excess / 2 / head);
    if (up !== want || down !== want) bad++;
    if (up !== down) asym++;
    if (Math.abs(lost) > 1e-9 * excess) lostBad++;
  }
  // the cap
  let capBad = 0;
  for (let k = 0; k < 10; k++) {
    const b = 100 + Math.floor(rng() * 4000);
    const head = FW - b;
    const q = new Float64Array(400).fill(b);
    const half = (l.capPx + 5 + rng() * 10) * head;
    q[200] = FW + 2 * half;
    const excess = q[200] - FW;
    const { touched, lost } = E.bleedColumn(q, FW, l.capPx);
    const up = touched.filter(i => i < 200).length;
    const down = touched.filter(i => i > 200).length;
    if (up !== l.capPx || down !== l.capPx) capBad++;
    if (relErr(lost, excess - 2 * l.capPx * head) > l.relMax) capBad++;
  }
  row(
    'A9.bleed.trail',
    bad === 0 && asym === 0 && lostBad === 0 && capBad === 0,
    {
      cases: l.cases,
      wrongLength: bad,
      asymmetric: asym,
      lostNonZero: lostBad,
      capFailures: capBad,
    }
  );
}

function a10() {
  const l = lim('A10.bleed.frame');
  const spec = {
    seed: `${THR.seeds.ensemble}:a10`,
    kind: 'science',
    exposure: 60,
    detector: { ...CLEAN, width: 64, height: 64 },
    scene: { sky: 3, sources: [{ x: 31.6, y: 32.2, rate: 2e6 }] },
  };
  const on = simulateFrame({ ...spec, effects: { bleed: true } });
  const off = simulateFrame({ ...spec, effects: {} });
  const fx = on.truth.effects;
  const W = 64;
  const H = 64;
  const satCols = new Set();
  for (let i = 0; i < W * H; i++)
    if (fx.flags[i] & E.FLAG.saturated) satCols.add(i % W);
  let outside = 0;
  let touchedN = 0;
  let mismatch = 0;
  let plateauBad = 0;
  let above = 0;
  let below = 0;
  for (let i = 0; i < W * H; i++) {
    const touched =
      fx.electronsCollected[i] > Math.min(fx.electronsBeforeClip[i], FW);
    const bit = Boolean(fx.flags[i] & E.FLAG.bleed);
    if (touched !== bit) mismatch++;
    if (bit) {
      touchedN++;
      if (!satCols.has(i % W)) outside++;
      const y = Math.floor(i / W);
      if (y < 32) above++;
      else below++;
      if (fx.electronsCollected[i] === FW) {
        const e =
          (on.values[i] - on.truth.detector.biasLevel) * on.truth.detector.gain;
        if (Math.abs(e - FW) > l.readSigma * on.truth.detector.readNoise + 1.5)
          plateauBad++;
      }
    }
  }
  const offTouched = off.truth.effects.flags.some(b => b & E.FLAG.bleed);
  row(
    'A10.bleed.frame',
    outside === 0 &&
      mismatch === 0 &&
      plateauBad === 0 &&
      above > 0 &&
      below > 0 &&
      !offTouched &&
      touchedN > 20,
    {
      touched: touchedN,
      above,
      below,
      outsideStarColumns: outside,
      flagMismatch: mismatch,
      plateauOutliers: plateauBad,
      offTouched,
    }
  );
}

// ---- A11, A12: sampling ----------------------------------------------------------------------------------

function a11() {
  const l = lim('A11.sampling.phase');
  let worst = 0;
  for (const o of ORA.sampling.rows) {
    const k = phaseStats(o.fwhm);
    for (const key of ['peakMin', 'peakMax', 'apMean', 'apRelStd'])
      worst = Math.max(worst, Math.abs(k[key] - o[key]));
  }
  row('A11.sampling.phase', worst <= l.absMax, { worstAbs: worst });
}

function a12() {
  const l = lim('A12.sampling.trend');
  const s = Object.fromEntries(
    lim('A11.sampling.phase').fwhms.map(f => [f, phaseStats(f)])
  );
  const fw = lim('A11.sampling.phase').fwhms;
  const monoPeak = fw
    .slice(1)
    .every((f, i) => s[f].peakRatio < s[fw[i]].peakRatio);
  const monoAp = fw.slice(1).every((f, i) => s[f].apRelStd < s[fw[i]].apRelStd);
  const regimes = l.regimeProbes.map(f => samplingOf(f).regime);
  const ratio = s[1.2].apRelStd / s[2.8].apRelStd;
  row(
    'A12.sampling.trend',
    s[1.2].peakRatio >= l.peakRatioAt1_2Min &&
      s[2.8].peakRatio <= l.peakRatioAt2_8Max &&
      ratio >= l.scatterRatioMin &&
      monoPeak &&
      monoAp &&
      regimes.join() === 'under,adequate,adequate,over',
    {
      peakRatio1_2: s[1.2].peakRatio,
      peakRatio2_8: s[2.8].peakRatio,
      scatterRatio: ratio,
      monoPeak,
      monoAp,
      regimes,
    }
  );
}

// ---- A13: the flag plane ------------------------------------------------------------------------------------

function a13() {
  const l = lim('A13.flags');
  let mismatches = 0;
  let cosmicSeen = 0;
  let bleedSeen = 0;
  let nlSeen = 0;
  for (let k = 0; k < l.seeds; k++) {
    const f = simulateFrame({
      seed: `${THR.seeds.ensemble}:a13:${k}`,
      kind: 'science',
      exposure: 120,
      detector: { ...CLEAN, width: 64, height: 64, cosmicRate: 0 },
      scene: {
        sky: 3,
        sources: [
          { x: 20.3, y: 24.1, rate: 3e5 },
          { x: 40.2, y: 40.7, rate: 8000 },
          { x: 50.6, y: 12.2, rate: 2000 },
        ],
      },
      effects: { nonlinearity: true, cosmic: { rate: 0.3 }, bleed: true },
    });
    const fx = f.truth.effects;
    const limit = E.linearLimit(0.01, FW, 0.8);
    const cos = new Set(f.truth.cosmic.map(c => c.y * 64 + c.x));
    for (let i = 0; i < 64 * 64; i++) {
      const want =
        (fx.electronsBeforeClip[i] >= FW ? 1 : 0) |
        (fx.electronsCollected[i] > Math.min(fx.electronsBeforeClip[i], FW)
          ? 2
          : 0) |
        (cos.has(i) ? 4 : 0) |
        (fx.electronsCollected[i] > limit ? 8 : 0);
      if (fx.flags[i] !== want) mismatches++;
      cosmicSeen += want & 4 ? 1 : 0;
      bleedSeen += want & 2 ? 1 : 0;
      nlSeen += want & 8 ? 1 : 0;
    }
    // with the effects off the bits are never set
    const off = simulateFrame({
      seed: `${THR.seeds.ensemble}:a13:${k}`,
      kind: 'science',
      exposure: 120,
      detector: { ...CLEAN, width: 64, height: 64 },
      scene: { sky: 3, sources: [{ x: 20.3, y: 24.1, rate: 3e5 }] },
      effects: { cosmic: false },
    });
    for (const b of off.truth.effects.flags) if (b & 14) mismatches++;
  }
  row(
    'A13.flags',
    mismatches <= l.mismatchesMax &&
      cosmicSeen > 0 &&
      bleedSeen > 0 &&
      nlSeen > 0,
    {
      mismatches,
      cosmicPixels: cosmicSeen,
      bleedPixels: bleedSeen,
      nonlinearPixels: nlSeen,
    }
  );
}

// ---- B1 to B3: the cosmic-ray masks --------------------------------------------------------------------------

export const CR_SPEC = {
  seed: 'detector-effects-211-mask',
  kind: 'science',
  exposure: 60,
  detector: { ...CLEAN, width: 96, height: 96, darkRate: 0.1 },
  scene: {
    sky: 3,
    sources: [
      { x: 20.3, y: 70.2, rate: 150 },
      { x: 70.4, y: 22.7, rate: 300 },
      { x: 45.6, y: 45.1, rate: 600 },
      { x: 80.2, y: 80.7, rate: 1200 },
    ],
  },
  effects: { cosmic: { rate: 0.5 } },
};

function crTruth(f) {
  const W = f.width;
  const H = f.height;
  const dep = new Float64Array(W * H);
  for (const c of f.truth.cosmic) dep[c.y * W + c.x] += c.electrons;
  const d = f.truth.detector;
  const sigma = new Float64Array(W * H);
  for (let i = 0; i < sigma.length; i++)
    sigma[i] = Math.sqrt(
      3 * f.exposure +
        d.darkRate * f.exposure +
        f.truth.starElectrons[i] +
        d.readNoise ** 2
    );
  return { dep, sigma, W, H };
}

const near8 = (mask, W, H) => {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (mask[y * W + x])
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && xx < W && yy >= 0 && yy < H) out[yy * W + xx] = 1;
          }
  return out;
};

function judgeMask(mask, f, sigmaK) {
  const { dep, sigma, W, H } = crTruth(f);
  const truthPix = dep.map(v => (v > 0 ? 1 : 0));
  const detectable = dep.map((v, i) => (v >= sigmaK * sigma[i] ? 1 : 0));
  const zone = near8(truthPix, W, H);
  let hit = 0;
  let n = 0;
  let fp = 0;
  for (let i = 0; i < mask.length; i++) {
    if (detectable[i]) {
      n++;
      if (mask[i]) hit++;
    }
    if (mask[i] && !zone[i]) fp++;
  }
  return { recall: n ? hit / n : NaN, detectable: n, falsePositives: fp };
}

const jaccard = (a, b, region) => {
  let i = 0;
  let u = 0;
  for (let k = 0; k < a.length; k++)
    if (region[k]) {
      if (a[k] && b[k]) i++;
      if (a[k] || b[k]) u++;
    }
  return u ? i / u : 1;
};

function crFrame() {
  const fixture = read(`${FIX}cr-frame.json`);
  const f = simulateFrame(CR_SPEC);
  const same = f.values.every((v, i) => v === fixture.counts[i]);
  return { f, fixture, same };
}

function internalMask(f) {
  const d = f.truth.detector;
  const values = Float64Array.from(f.values, v => (v - d.biasLevel) * d.gain);
  return maskCosmicRays(
    { width: f.width, height: f.height, values },
    { readNoise: d.readNoise }
  ).mask;
}

function b123() {
  const l1 = lim('B1.cosmic.internal');
  const l2 = lim('B2.cosmic.oracle');
  const l3 = lim('B3.cosmic.agreement');
  const { f, fixture, same } = crFrame();
  const mine = internalMask(f);
  const j1 = judgeMask(mine, f, l1.detectableSigma);
  const pinned = read(`${FIX}reference-masks.json`);
  const hash = sha(Uint8Array.from(mine));
  row(
    'B1.cosmic.internal',
    same &&
      j1.recall >= l1.recallMin &&
      j1.falsePositives <= l1.falsePositiveMax &&
      hash === pinned.internalSha256,
    {
      frameMatchesFixture: same,
      ...j1,
      maskSha256: hash,
      pinnedSha256: pinned.internalSha256,
    }
  );
  if (!ORA.lacosmic) {
    rows.push({
      id: 'B2.cosmic.oracle',
      status: 'not-measured',
      measured: null,
      note: 'the oracle was not run on the pinned frame',
    });
    rows.push({
      id: 'B3.cosmic.agreement',
      status: 'not-measured',
      measured: null,
      note: 'needs the oracle mask',
    });
    return;
  }
  const theirs = Uint8Array.from(ORA.lacosmic.mask);
  const j2 = judgeMask(theirs, f, l2.detectableSigma);
  row(
    'B2.cosmic.oracle',
    same &&
      j2.recall >= l2.recallMin &&
      j2.falsePositives <= l2.falsePositiveMax,
    {
      ...j2,
      oracleCount: ORA.lacosmic.count,
      note: 'own implementation of L.A.Cosmic, not astroscrappy',
    }
  );
  const { dep, sigma, W, H } = crTruth(f);
  const det = dep.map((v, i) => (v >= l1.detectableSigma * sigma[i] ? 1 : 0));
  const region = near8(det, W, H);
  const jac = jaccard(mine, theirs, region);
  row('B3.cosmic.agreement', jac >= l3.jaccardMin, {
    jaccard: jac,
    regionPixels: region.reduce((s, v) => s + v, 0),
  });
  return fixture;
}

// ---- C1 (not applicable), D1 to D3: what 180 refuses ----------------------------------------------------------------

function d1() {
  const l = lim('D1.refusals');
  const at = (rows, id) => rows.find(r => r.id === id);
  // saturated and nonlinear, no bleed
  const sat = measureEffects({ nonlinearity: true });
  const s1 = at(sat.rows, 'S');
  const satRefused = s1.code === 'saturated';
  const clean = ['N1', 'N2', 'C'].map(id => at(sat.rows, id));
  const cleanOk = clean.every(
    r => r.net !== undefined && Math.abs(r.pull) <= l.sigmaOk
  );
  const l5 = at(sat.rows, 'L5');
  // the linear-limit gate when the effect is off: plateau at the full well still refused
  const linOff = measureEffects({});
  const offRefused = at(linOff.rows, 'S').code === 'saturated';
  // bleeding with the mask plane
  const bl = measureEffects({ bleed: true, nonlinearity: true });
  const trail = ['N1', 'N2'].map(id => at(bl.rows, id));
  const trailMasked = trail.every(r => r.code === 'masked');
  const ctrl = at(bl.rows, 'C');
  const ctrlOk = ctrl.net !== undefined && Math.abs(ctrl.pull) <= l.sigmaOk;
  // Prompt 183's detector flags the saturated source
  const det = detectEffects(sat.result);
  const flagged =
    det.ok && det.sources.some(s => s.flags.includes('saturated'));
  // the same trail with the mask plane withheld
  const nm = measureEffects(
    { bleed: true, nonlinearity: true },
    { withMask: false }
  );
  const unflagged = ['N1', 'N2'].map(id => at(nm.rows, id));
  const notRefused = unflagged.every(r => r.net !== undefined);
  const spoiled = unflagged.every(
    r => r.net !== undefined && Math.abs(r.pull) > l.sigmaSpoiled
  );
  // a frame with neither a limit nor a saturation level is refused by the contract's own gate
  const r0 = effectsFrame({});
  const { frame } = adaptedEffectsFrame(r0);
  const bare = {
    ...frame,
    sidecar: {
      ...frame.sidecar,
      pixels: {
        ...frame.sidecar.pixels,
        linearity: undefined,
        saturation: undefined,
      },
    },
  };
  const gate = adapt(bare, permits);
  const gateRefused = gate.ok === false;
  row(
    'D1.refusals',
    satRefused &&
      cleanOk &&
      offRefused &&
      trailMasked &&
      ctrlOk &&
      flagged &&
      notRefused &&
      spoiled &&
      gateRefused,
    {
      saturatedStar: s1.code,
      saturatedStarNoEffects: at(linOff.rows, 'S').code,
      cleanStarsWithin3Sigma: cleanOk,
      trailStarsWithMask: trail.map(r => r.code),
      controlWithBleed: { code: ctrl.code ?? 'measured', pull: ctrl.pull },
      detectorFlagsSaturated: flagged,
      trailStarsUnflagged: unflagged.map(r => ({
        id: r.id,
        code: r.code ?? 'measured',
        pull: r.pull,
      })),
      trailUnflaggedNotRefused: notRefused,
      trailUnflaggedSpoiled: spoiled,
      contractGate: gate.ok === false ? gate.code : 'accepted',
      ladderL5: l5.code ?? 'measured',
    },
    'clause: the unflagged trail star'
  );
}

function d3() {
  const l = lim('D3.cosmic.unflagged');
  let found = null;
  for (let k = 0; k < l.maxFrames && !found; k++) {
    const cfg = {
      brightMag: 15,
      cosmic: true,
      seed: `${THR.seeds.ensemble}:d3:${k}`,
    };
    const withMask = measureEffects(cfg);
    const r = withMask.result;
    const without = measureEffects(cfg, { withMask: false });
    const cand = withMask.rows
      .filter(x => x.role === 'control' || x.role === 'trail')
      .find(x => {
        const w = without.rows.find(y => y.id === x.id);
        return (
          x.code === 'masked' &&
          w.net !== undefined &&
          Math.abs(w.pull) > l.sigmaSpoiled
        );
      });
    if (cand)
      found = {
        seed: cfg.seed,
        id: cand.id,
        pullUnflagged: without.rows.find(y => y.id === cand.id).pull,
        frames: k + 1,
        tracks: r.frame.truth.effects.cosmicTracks.length,
      };
  }
  row(
    'D3.cosmic.unflagged',
    Boolean(found),
    found ?? { searched: l.maxFrames }
  );
}

function d2() {
  const r = effectsFrame({ nonlinearity: true, cosmic: true, bleed: true });
  const doc = effectsSidecar(r);
  const v = validateImage(doc);
  const bits = doc.planes.mask.bits.map(b => b.value).join();
  const p = doc.source.model.parameters;
  const display = permits(
    { ...doc, pixels: { ...doc.pixels, unit: 'display' } },
    'photometry'
  );
  const ok =
    v.ok === true &&
    bits === '1,2,4,8' &&
    doc.pixels.linearity.limit > 0 &&
    doc.pixels.saturation.level > doc.pixels.linearity.limit &&
    typeof p.effects === 'string' &&
    p.effects.includes('bleeding') &&
    ['under', 'adequate', 'over'].includes(p.sampling) &&
    doc.source.kind === 'synthetic' &&
    display.ok === false;
  row('D2.sidecar', ok, {
    valid: v.ok,
    errors: v.ok ? [] : v.problems?.slice(0, 3),
    bits,
    limit: doc.pixels.linearity.limit,
    level: doc.pixels.saturation.level,
    displayPermitted: display.ok,
  });
}

// ---- F1, P1 ---------------------------------------------------------------------------------------------------------------

function f1() {
  const h = f => sha(f.values);
  const legacy = h(simulateFrame(BASE.spec));
  const empty = h(simulateFrame({ ...BASE.spec, effects: {} }));
  const identical = legacy === BASE.sha256 && empty === BASE.sha256;
  // independence of the streams
  const spec = {
    seed: `${THR.seeds.ensemble}:f1`,
    kind: 'science',
    exposure: 120,
    detector: { ...CLEAN, width: 64, height: 64 },
    scene: {
      sky: 3,
      sources: [
        { x: 20.3, y: 24.1, rate: 3e5 },
        { x: 40.7, y: 40.2, rate: 9000 },
      ],
    },
  };
  const A = simulateFrame({ ...spec, effects: { cosmic: { rate: 0.2 } } });
  const B = simulateFrame({
    ...spec,
    effects: { cosmic: { rate: 0.2 }, nonlinearity: true },
  });
  const C = simulateFrame({
    ...spec,
    effects: { cosmic: { rate: 0.2 }, bleed: true },
  });
  const tracksSame =
    JSON.stringify(A.truth.effects.cosmicTracks) ===
      JSON.stringify(B.truth.effects.cosmicTracks) &&
    JSON.stringify(A.truth.effects.cosmicTracks) ===
      JSON.stringify(C.truth.effects.cosmicTracks);
  let moved = 0;
  const fa = A.truth.effects;
  for (let i = 0; i < A.values.length; i++) {
    if (fa.electronsCollected[i] <= 0.8 * FW && A.values[i] !== B.values[i])
      moved++;
    const fc = C.truth.effects.flags[i];
    if (
      !(fc & (E.FLAG.bleed | E.FLAG.saturated)) &&
      A.values[i] !== C.values[i]
    )
      moved++;
  }
  row('F1.frame.identity', identical && tracksSame && moved === 0, {
    legacySha: legacy === BASE.sha256,
    emptyEffectsSha: empty === BASE.sha256,
    tracksIndependent: tracksSame,
    pixelsMovedByAnotherToggle: moved,
  });
}

function p1() {
  const l = lim('P1.speed');
  const spec = {
    seed: `${THR.seeds.ensemble}:p1`,
    kind: 'science',
    exposure: 120,
    detector: { ...CLEAN, width: 128, height: 128 },
    scene: {
      sky: 3,
      sources: [
        { x: 40.3, y: 60.1, rate: 3e5 },
        { x: 90.2, y: 30.7, rate: 9000 },
      ],
    },
    effects: { nonlinearity: true, cosmic: { rate: 0.5 }, bleed: true },
  };
  const ts = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    simulateFrame({ ...spec, label: `p${i}` });
    ts.push(performance.now() - t0);
  }
  ts.sort((a, b) => a - b);
  row('P1.speed', ts[2] <= l.maxMs, { medianMs: Math.round(ts[2]) });
}

export function runChecks() {
  rows.length = 0;
  a1();
  a2();
  a3();
  a4();
  a5();
  a6();
  a7();
  a8();
  a9();
  a10();
  a11();
  a12();
  a13();
  b123();
  rows.push({
    id: 'C1.coverage',
    status: 'not-applicable',
    measured: null,
    note: 'not applicable, stated: the effects are deterministic models and seeded draws with exact expectations',
  });
  d1();
  d3();
  d2();
  f1();
  p1();
  rows.push({
    id: 'E1.authentic',
    status: 'not-measured',
    measured: null,
    note: 'no authentic saturated-star frame was retrieved (a download needs Carl’s say) and none is typed from memory; the request is in DETECTOR_EFFECTS.md',
  });
  const order = THR.checks.map(c => c.id);
  return rows.slice().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--write-cr-frame')) {
  const f = simulateFrame(CR_SPEC);
  const d = f.truth.detector;
  writeFileSync(
    path.join(ROOT, FIX, 'cr-frame.json'),
    JSON.stringify({
      note: 'rendered by js/kernels/detector/frame.js from spec (tools/detector-effects-validate.mjs CR_SPEC); the oracle reads counts, bias, gain and readNoise',
      width: f.width,
      height: f.height,
      bias: d.biasLevel,
      gain: d.gain,
      readNoise: d.readNoise,
      counts: Array.from(f.values),
    })
  );
  const mask = internalMask(f);
  writeFileSync(
    path.join(ROOT, FIX, 'reference-masks.json'),
    JSON.stringify(
      {
        note: 'the internal reference of check B1: js/kernels/detector/reduce.js maskCosmicRays (k 5.5, sharpness 0.8) on the pinned frame; the SHA-256 is of the 0/1 bytes',
        internalSha256: sha(Uint8Array.from(mask)),
        internalCount: mask.reduce((s, v) => s + v, 0),
      },
      null,
      2
    ) + '\n'
  );
  console.log('written');
} else if (isMain) {
  const res = runChecks();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(res, null, 2));
  else {
    for (const r of res)
      console.log(
        `${r.status.padEnd(14)} ${r.id.padEnd(24)} ${JSON.stringify(r.measured).slice(0, 220)}`
      );
    const fails = res.filter(r => r.status === 'fail').length;
    console.log(
      `${res.length} rows, ${res.filter(r => r.status === 'pass').length} pass, ${fails} fail, ${res.filter(r => r.status === 'not-measured').length} not measured`
    );
    process.exitCode = fails ? 1 : 0;
  }
}
