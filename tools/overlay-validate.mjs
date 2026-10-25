#!/usr/bin/env node
// =============================================================================
// Catalogue overlays, blink and compare against their committed thresholds (Prompt 182)
// -----------------------------------------------------------------------------
//   npm run overlay:validate              print the table
//   npm run overlay:validate -- --json    print it as JSON
//
// tests/fixtures/overlay/thresholds.json fixed every bound before
// js/measure/overlay.js existed (OVERLAYS.md, "The validation contract"). This
// runs the checks against the production module and judges them against those
// bounds, read from the file and not copied. tests/overlay.test.js runs it in
// plain Node (Jest's VM makes Math reads about ten times slower, so a
// 3,000-trial ensemble there would time the harness) and asserts every row.
//
// The scenes are synthetic and carry their truth; the oracle rows read the
// results pinned in tests/fixtures/overlay/ (astropy and scipy, run offline by
// tools/overlay-oracle/, never by a test). Nothing here stores a value that
// passes through a trigonometric function: bands, counts and tolerances are
// judged (Node 20, 22 and 24 differ in the last bits). Checks b5 and e1 need an
// authentic frame with catalogue stars (Prompt 189): not run.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as O from '../js/measure/overlay.js';
import * as A from '../js/measure/astrometry.js';
import { mulberry32 } from '../js/rng.js';
import { permits } from '../js/dataKinds/contract.js';
import { LIMITS, residentFrames } from '../js/dataKinds/limits.js';
import {
  geocentricEquatorial,
  planetProvenance,
} from '../js/kernels/sky/planets.js';
import { tdbMinusTt } from '../js/kernels/sky/time.js';
import {
  gauss,
  grid,
  registrationScene,
  truthWcs,
} from './astrometry-validate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/overlay');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const C = THRESHOLDS.checks;
const SC = THRESHOLDS.scenes;
const RAD = Math.PI / 180;
const DAY = 86400;

// ---- scenes -------------------------------------------------------------------------

/** The bright-star pack's rows, as the sidecar has them. */
export const packRows = () =>
  JSON.parse(readFileSync(path.join(HERE, '../sky/bright-stars.json'), 'utf8'))
    .stars;
export const packStars = () => packRows().map(O.starOfRow);
export const orionTruth = () => truthWcs(SC.orion.truth);
export const orionSize = () => ({
  width: SC.orion.width,
  height: SC.orion.height,
});

/** A synthetic star of the fields the overlay reads. */
export const synth = (hr, raDeg, decDeg, v = 1, pmRa = 0, pmDec = 0) => ({
  hr,
  raDeg,
  decDeg,
  v,
  pmRaArcsecYr: pmRa,
  pmDecArcsecYr: pmDec,
  desig: '',
  name: '',
});

/** A complete quantitative sidecar (a gravitas.image), the fields `permits` needs. */
export function sidecarOf(over = {}, pixels = {}) {
  const { width = 96, height = 72, ...rest } = over;
  return {
    format: 'gravitas.image',
    formatVersion: 1,
    id: 'overlay-182-synthetic',
    use: 'quantitative',
    width,
    height,
    planes: { data: { encoding: 'float64-le' } },
    pixels: {
      unit: 'adu',
      linearity: { status: 'linear', limit: 50000, source: 'synthetic' },
      saturation: { level: 60000, source: 'synthetic' },
      gain: { value: 1.5, unit: 'electron/adu', source: 'header' },
      readNoise: { value: 8, unit: 'electron', source: 'header' },
      ...pixels,
    },
    time: {
      value: '2026-01-01T00:00:00',
      scale: 'UTC',
      format: 'iso',
      reference: 'mid',
    },
    exposure: { seconds: 30, kind: 'effective' },
    calibration: { state: 'bias-subtracted' },
    history: [],
    source: {
      kind: 'synthetic',
      model: { name: 'overlay validation', parameters: {} },
    },
    ...rest,
  };
}
const frameOf = (over, pixels) => {
  const sidecar = sidecarOf(over, pixels);
  return { width: sidecar.width, height: sidecar.height, sidecar };
};

/** The resample scene: a seeded second frame and the registration that carries it onto the first grid. */
export function resampleScene() {
  const S = SC.resample;
  const u = mulberry32(S.seed);
  const data = new Float64Array(S.width * S.height).map(() => u() * 1000);
  const th = S.rotationDeg * RAD;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const reg = {
    theta: th,
    t: [
      S.about[0] + S.shift[0] - (c * S.about[0] - s * S.about[1]),
      S.about[1] + S.shift[1] - (s * S.about[0] + c * S.about[1]),
    ],
  };
  return {
    data,
    reg,
    width: S.width,
    height: S.height,
    about: S.about,
    shift: S.shift,
    rotationDeg: S.rotationDeg,
  };
}

// ---- rows ---------------------------------------------------------------------------

const rows = [];
const row = (id, pass, measured, bound, note) =>
  rows.push({
    id,
    pass: Boolean(pass),
    measured,
    bound,
    ...(note ? { note } : {}),
  });
const notRun = (id, why) =>
  rows.push({ id, pass: null, measured: 'not run', bound: why });
const coverage = zs => ({
  n: zs.length,
  one: zs.filter(z => Math.abs(z) < 1).length / zs.length,
  two: zs.filter(z => Math.abs(z) < 1.96).length / zs.length,
});
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;

/** A plain WCS about a reference position, one arcsecond a pixel, east left. */
const plainWcs = (crval, crpix, arcsec = 1) => ({
  ctype: ['RA---TAN', 'DEC--TAN'],
  crpix,
  crval,
  cd: [
    [-arcsec / 3600, 0],
    [0, arcsec / 3600],
  ],
});

// ---- (a) analytic ---------------------------------------------------------------------

function a1() {
  const w = plainWcs([210.5, 33.25], [50.5, 40.5]);
  const size = { width: 100, height: 80 };
  const at = O.starsIn([synth(1, 210.5, 33.25)], w, size).entries[0];
  const t1 = C['a1.tangentPoint'];
  const e1 = Math.max(Math.abs(at.x - 50.5), Math.abs(at.y - 40.5));
  row('a1.tangentPoint', e1 <= t1.boundPix, e1, t1.boundPix);
  const truth = orionTruth();
  const g = grid(21, 1, 1024);
  const stars = g.map(([x, y], i) => {
    const s = A.skyOf(truth, x, y);
    return synth(i + 1, s.ra, s.dec);
  });
  const found = O.starsIn(stars, truth, orionSize(), { limit: 1000 });
  let worst = 0;
  for (const e of found.entries) {
    const [x, y] = g[e.hr - 1];
    worst = Math.max(worst, Math.abs(e.x - x), Math.abs(e.y - y));
  }
  const t2 = C['a1.roundTrip'];
  row(
    'a1.roundTrip',
    found.entries.length === g.length && worst <= t2.boundPix,
    { listed: found.entries.length, of: g.length, worstPix: worst },
    t2.boundPix
  );
}

function a2() {
  const t = C['a2.properMotion'];
  const jd = 2451545.0 + 3652.5;
  let sepErr = 0;
  let bearErr = 0;
  for (const dec of [0, 30, 60, 80]) {
    const s = synth(1, 100, dec, 1, 1.0, 0);
    const m = O.moveStar(s, jd);
    const sep = A.separation({ ra: 100, dec }, m) * 3600;
    sepErr = Math.max(sepErr, Math.abs(sep - 10));
    const d1 = dec * RAD;
    const d2 = m.dec * RAD;
    const dra = (m.ra - 100) * RAD;
    const bearing =
      Math.atan2(
        Math.sin(dra) * Math.cos(d2),
        Math.cos(d1) * Math.sin(d2) -
          Math.sin(d1) * Math.cos(d2) * Math.cos(dra)
      ) / RAD;
    bearErr = Math.max(bearErr, Math.abs(bearing - 90));
  }
  const still = O.moveStar(synth(2, 123.456, -45.678), jd);
  const stat = Math.max(
    Math.abs(still.ra - 123.456),
    Math.abs(still.dec + 45.678)
  );
  row(
    'a2.properMotion',
    sepErr <= t.boundArcsec &&
      bearErr <= t.boundBearingDeg &&
      stat <= t.boundStaticDeg,
    {
      separationErrorArcsec: sepErr,
      bearingErrorDeg: bearErr,
      staticDeg: stat,
    },
    {
      boundArcsec: t.boundArcsec,
      boundBearingDeg: t.boundBearingDeg,
      boundStaticDeg: t.boundStaticDeg,
    }
  );
}

function a3() {
  const t = C['a3.timeScales'];
  const iso = { value: '2026-01-01T00:00:00', scale: 'UTC', format: 'iso' };
  const base = 2461041.5;
  const utc = O.toTt(iso);
  const dUtc = (utc.jdTt - base) * DAY;
  const tai = O.toTt({ ...iso, scale: 'TAI' });
  const tt = O.toTt({ value: 61041, scale: 'TT', format: 'mjd' });
  const tdb = O.toTt({ value: 2461041.5, scale: 'TDB', format: 'jd' });
  const forms = [
    O.toTt(iso),
    O.toTt({ value: 61041, scale: 'UTC', format: 'mjd' }),
    O.toTt({ value: 2461041.5, scale: 'UTC', format: 'jd' }),
  ].map(r => r.jdTt);
  const start = O.toTt(
    { value: 61041, scale: 'TT', format: 'mjd', reference: 'start' },
    100
  );
  const end = O.toTt(
    { value: 61041, scale: 'TT', format: 'mjd', reference: 'end' },
    100
  );
  const errs = {
    utcVsLeapSeconds: Math.abs(dUtc - 69.184),
    tai: Math.abs((tai.jdTt - base) * DAY - 32.184),
    tt: Math.abs((tt.jdTt - base) * DAY),
    tdb: Math.abs((tdb.jdTt - base) * DAY + tdbMinusTt(base)),
    formatsDay: Math.max(...forms) - Math.min(...forms),
    start: Math.abs((start.jdTt - base) * DAY - 50),
    end: Math.abs((end.jdTt - base) * DAY + 50),
  };
  row(
    'a3.timeScales',
    errs.utcVsLeapSeconds <= t.boundUtcSec &&
      errs.tai <= t.boundExactSec &&
      errs.tt <= t.boundExactSec &&
      errs.tdb <= t.boundExactSec &&
      errs.start <= t.boundExactSec &&
      errs.end <= t.boundExactSec &&
      errs.formatsDay <= t.boundFormatsDay,
    errs,
    {
      boundUtcSec: t.boundUtcSec,
      boundExactSec: t.boundExactSec,
      boundFormatsDay: t.boundFormatsDay,
    }
  );
  // Evidence, not a leg (it does not stand in for a3): the same errors against
  // the spacing of the doubles a Julian date is held in, which is above the
  // committed 1e-6 s; "x." rows are never counted as legs.
  const ulpSec = 2 ** (Math.floor(Math.log2(base)) - 52) * DAY;
  const exact = Math.max(errs.tai, errs.tt, errs.tdb, errs.start, errs.end);
  row(
    'x.a3.timeScalesAtResolution',
    exact <= ulpSec,
    { worstExactSec: exact, spacingOfOneJulianDateSec: ulpSec },
    'the errors against one spacing of the doubles that hold a Julian date at this date',
    'evidence only: a3.timeScales above is judged as committed'
  );
}

function a4a5() {
  const w = plainWcs([10, 10], [50.5, 40.5]);
  const size = { width: 100, height: 80 };
  const at = (x, y, hr) => {
    const s = A.skyOf(w, x, y);
    return synth(hr, s.ra, s.dec);
  };
  const probes = [
    [0.5001, 40, 1, true],
    [0.4999, 40, 2, false],
    [50, 0.5001, 3, true],
    [50, 0.4999, 4, false],
    [100.4999, 40, 5, true],
    [100.5001, 40, 6, false],
    [50, 80.4999, 7, true],
    [50, 80.5001, 8, false],
  ];
  const got = new Set(
    O.starsIn(
      probes.map(([x, y, hr]) => at(x, y, hr)),
      w,
      size
    ).entries.map(e => e.hr)
  );
  const edgeOk = probes.every(([, , hr, want]) => got.has(hr) === want);
  const truth = orionTruth();
  const orion = O.starsIn(packStars(), truth, orionSize(), {
    jdTt: 2461041.5,
    limit: 5000,
  });
  const sz = orionSize();
  const outside = orion.entries.filter(
    e =>
      !(
        e.x >= 0.5 &&
        e.x <= sz.width + 0.5 &&
        e.y >= 0.5 &&
        e.y <= sz.height + 0.5
      )
  );
  row(
    'a4.frameEdge',
    edgeOk && outside.length === 0 && orion.entries.length > 0,
    {
      edgeProbesCorrect: edgeOk,
      orionListed: orion.entries.length,
      outside: outside.length,
    },
    true
  );
  const big = Array.from({ length: 800 }, (_, i) => {
    const x = 5 + (i % 40) * 2.2;
    const y = 5 + Math.floor(i / 40) * 3.5;
    return { ...at(x, y, i + 1), v: -1 + i * 0.005 };
  });
  const cap = O.starsIn(big, w, size);
  const sorted = cap.entries.every(
    (e, i, a) => i === 0 || a[i - 1].mag <= e.mag
  );
  const t5 = C['a5.cap'];
  row(
    'a5.cap',
    cap.entries.length === t5.listed &&
      cap.leftOut === t5.leftOut &&
      sorted &&
      cap.entries[0].hr === 1 &&
      cap.entries[499].hr === 500,
    { listed: cap.entries.length, leftOut: cap.leftOut, sorted },
    { listed: t5.listed, leftOut: t5.leftOut }
  );
}

function a6() {
  const t = C['a6.planetOverlay'];
  let worstPix = 0;
  let boundOk = true;
  let n = 0;
  for (const jd of SC.planets.jdTt)
    for (const id of O.RULES.planets) {
      const g = geocentricEquatorial(id, jd);
      const w = plainWcs([g.raDeg, g.decDeg], [60.5, 50.5], 2);
      const res = O.planetsIn(w, { width: 120, height: 100 }, jd);
      const e = res.entries.find(p => p.id === id);
      if (!e) {
        boundOk = false;
        continue;
      }
      const p = A.pixelOf(w, g.raDeg, g.decDeg);
      worstPix = Math.max(worstPix, Math.abs(e.x - p.x), Math.abs(e.y - p.y));
      const bound = planetProvenance(null, id, jd).boundDeg;
      if (
        e.boundDeg !== bound ||
        Math.abs(e.boundPix - bound / (2 / 3600)) > 1e-6
      )
        boundOk = false;
      n++;
    }
  row(
    'a6.planetOverlay',
    worstPix <= t.boundPix && boundOk && n === 25,
    { entries: n, worstPix, boundOk },
    t.boundPix
  );
}

/** The intensity-weighted centroid of a frame about a position. */
const centroid = (data, W, H, [cx, cy], radius) => {
  let s = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 1; y <= H; y++)
    for (let x = 1; x <= W; x++) {
      const v = data[(y - 1) * W + (x - 1)];
      if (!(v === v) || Math.hypot(x - cx, y - cy) > radius) continue;
      s += v;
      sx += v * x;
      sy += v * y;
    }
  return [sx / s, sy / s];
};

function a7a8a9() {
  const t7 = C['a7.resampleIdentity'];
  const sc = resampleScene();
  const frame = { width: sc.width, height: sc.height, data: sc.data };
  const same = O.carry(frame, frame, O.tieOf({ kind: 'identity' }));
  let ident = 0;
  for (let i = 0; i < same.length; i++)
    ident = Math.max(ident, Math.abs(same[i] - sc.data[i]));
  const [dx, dy] = SC.resample.integerShift;
  const sh = O.carry(frame, frame, { toSecond: (x, y) => [x + dx, y + dy] });
  let shiftErr = 0;
  let wrongNaN = 0;
  for (let y = 1; y <= sc.height; y++)
    for (let x = 1; x <= sc.width; x++) {
      const bx = x + dx;
      const by = y + dy;
      const v = sh[(y - 1) * sc.width + (x - 1)];
      const inside = bx >= 1 && bx <= sc.width && by >= 1 && by <= sc.height;
      if (inside)
        shiftErr = Math.max(
          shiftErr,
          Math.abs(v - sc.data[(by - 1) * sc.width + (bx - 1)])
        );
      else if (v === v) wrongNaN++;
    }
  row(
    'a7.resampleIdentity',
    ident <= t7.boundValue && shiftErr <= t7.boundValue && wrongNaN === 0,
    {
      identityMaxDiff: ident,
      integerShiftMaxDiff: shiftErr,
      definedOutside: wrongNaN,
    },
    t7.boundValue
  );
  // a8: a rotated, shifted star keeps its centroid.
  const S = SC.centroid;
  const n = S.size;
  const star = (cx, cy) => {
    const out = new Float64Array(n * n);
    for (let y = 1; y <= n; y++)
      for (let x = 1; x <= n; x++)
        out[(y - 1) * n + (x - 1)] =
          S.amplitude *
          Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * S.sigma ** 2));
    return out;
  };
  const th = S.rotationDeg * RAD;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const [px, py] = S.position;
  const ax = px - S.about[0];
  const ay = py - S.about[1];
  const bpos = [
    c * ax - s * ay + S.about[0] + S.shift[0],
    s * ax + c * ay + S.about[1] + S.shift[1],
  ];
  const reg = {
    theta: th,
    t: [
      S.about[0] + S.shift[0] - (c * S.about[0] - s * S.about[1]),
      S.about[1] + S.shift[1] - (s * S.about[0] + c * S.about[1]),
    ],
  };
  const second = { width: n, height: n, data: star(...bpos) };
  const carried = O.carry(
    second,
    { width: n, height: n },
    O.tieOf({ kind: 'pairs', registration: reg })
  );
  const first = star(px, py);
  const cA = centroid(first, n, n, [px, py], 8);
  const cB = centroid(carried, n, n, [px, py], 8);
  const err = Math.hypot(cA[0] - cB[0], cA[1] - cB[1]);
  row(
    'a8.rotationCentroid',
    err <= C['a8.rotationCentroid'].boundPix,
    {
      centroidDiffPix: err,
      firstCentroidErrPix: Math.hypot(cA[0] - px, cA[1] - py),
    },
    C['a8.rotationCentroid'].boundPix
  );
  // a9: differences.
  const t9 = C['a9.difference'];
  const flat = {
    width: 64,
    height: 48,
    data: new Float64Array(64 * 48).fill(100),
  };
  const id = O.tieOf({ kind: 'identity' });
  const zero = O.subtract(flat.data, O.carry(flat, flat, id));
  const plus = { ...flat, data: flat.data.map(v => v + 3) };
  const three = O.subtract(flat.data, O.carry(plus, flat, id));
  const src = new Float64Array(flat.data);
  src[(18 - 1) * 64 + (23 - 1)] += 500;
  const shifted = O.carry({ ...flat, data: src }, flat, {
    toSecond: (x, y) => [x + 3, y - 2],
  });
  const diff = O.subtract(flat.data, shifted);
  let peak = -Infinity;
  let peakAt = -1;
  let rest = 0;
  diff.forEach((v, i) => {
    if (v === v && v > peak) {
      peak = v;
      peakAt = i;
    }
  });
  diff.forEach((v, i) => {
    if (v === v && i !== peakAt) rest = Math.max(rest, Math.abs(v));
  });
  const zeroErr = Math.max(...zero.map(Math.abs));
  const threeErr = Math.max(...three.map(v => Math.abs(v - 3)));
  row(
    'a9.difference',
    zeroErr <= t9.boundValue &&
      threeErr <= t9.boundValue &&
      Math.abs(peak - 500) <= t9.boundValue &&
      peakAt === (20 - 1) * 64 + (20 - 1) &&
      rest <= t9.boundValue,
    {
      identicalMax: zeroErr,
      plusThreeMaxErr: threeErr,
      peak,
      peakAt,
      elsewhereMax: rest,
    },
    t9.boundValue
  );
}

function a10() {
  const ok = O.RULES.blinkRatesPerSecond.every(r => {
    const p = O.blinkPlan(r);
    return p.ok && p.mode === 'timer' && p.intervalMs === 1000 / r;
  });
  const bad = O.blinkPlan(3);
  const manual = O.blinkPlan(2, { reducedMotion: true });
  row(
    'a10.blinkPlan',
    ok &&
      !bad.ok &&
      bad.code === 'rate' &&
      manual.ok &&
      manual.mode === 'manual' &&
      !('intervalMs' in manual) &&
      O.RULES.blinkRateDefault === 1,
    {
      intervals: O.RULES.blinkRatesPerSecond.map(r => 1000 / r),
      refused3: bad.code,
      reduced: manual.mode,
    },
    true
  );
}

// ---- (b) the oracle -------------------------------------------------------------------

const cmpStars = (id, ours, theirs, hrs, bound, size, guard) => {
  const want = new Map();
  const edge = [];
  hrs.forEach((hr, i) => {
    const [x, y] = theirs[i];
    if (x === null || y === null) return;
    const dEdge = Math.min(
      Math.abs(x - 0.5),
      Math.abs(x - size.width - 0.5),
      Math.abs(y - 0.5),
      Math.abs(y - size.height - 0.5)
    );
    if (dEdge <= guard) {
      edge.push(hr);
      return;
    }
    if (x >= 0.5 && x <= size.width + 0.5 && y >= 0.5 && y <= size.height + 0.5)
      want.set(hr, [x, y]);
  });
  const got = new Map(
    ours.entries.filter(e => !edge.includes(e.hr)).map(e => [e.hr, [e.x, e.y]])
  );
  let worst = 0;
  let missing = 0;
  for (const [hr, [x, y]] of want) {
    const g = got.get(hr);
    if (!g) {
      missing++;
      continue;
    }
    worst = Math.max(worst, Math.abs(g[0] - x), Math.abs(g[1] - y));
  }
  const extra = [...got.keys()].filter(hr => !want.has(hr)).length;
  row(
    id,
    missing === 0 && extra === 0 && want.size > 0 && worst <= bound,
    {
      inFrame: want.size,
      missing,
      extra,
      worstPix: worst,
      excludedAtEdge: edge.length,
    },
    bound
  );
};

function oracle() {
  const R = read('oracle-results.json');
  const all = packStars();
  const hrs = R.stars.hr;
  const size = orionSize();
  const guard = SC.orion.edgeGuardPix;
  const j0 = O.starsIn(all, orionTruth(), size, { jdTt: null, limit: 5000 });
  cmpStars(
    'b1.oracleStarsJ2000',
    j0,
    R.stars.j2000,
    hrs,
    C['b1.oracleStarsJ2000'].boundPix,
    size,
    guard
  );
  const tt = O.toTt(SC.orion.time);
  const j1 = O.starsIn(all, orionTruth(), size, { jdTt: tt.jdTt, limit: 5000 });
  cmpStars(
    'b1.oracleStarsEpoch',
    j1,
    R.stars.epoch,
    hrs,
    C['b1.oracleStarsEpoch'].boundPix,
    size,
    guard
  );
  const dt = Math.abs(tt.jdTt - R.time.tt_jd) * DAY;
  row(
    'b1.oracleTime',
    dt <= C['b1.oracleTime'].boundSec,
    { seconds: dt },
    C['b1.oracleTime'].boundSec
  );
  // planets
  const bound = C['b2.oraclePlanets'].boundDeg;
  const worst = {};
  let stated = true;
  for (const id of O.RULES.planets) {
    worst[id] = 0;
    SC.planets.jdTt.forEach((jd, k) => {
      const g = geocentricEquatorial(id, jd);
      const [ra, dec] = R.planets[id][k];
      worst[id] = Math.max(
        worst[id],
        A.separation({ ra: g.raDeg, dec: g.decDeg }, { ra, dec })
      );
      if (planetProvenance(null, id, jd).boundDeg !== bound) stated = false;
    });
  }
  row(
    'b2.oraclePlanets',
    stated && Object.values(worst).every(v => v <= bound),
    { worstDeg: worst, statedBoundIsBound: stated },
    bound
  );
  // resample
  const sc = resampleScene();
  const carried = O.carry(
    { width: sc.width, height: sc.height, data: sc.data },
    { width: sc.width, height: sc.height },
    O.tieOf({ kind: 'pairs', registration: sc.reg })
  );
  let diff = 0;
  let patternMismatch = 0;
  let compared = 0;
  carried.forEach((v, i) => {
    const o = R.resample.values[i];
    const bx = R.resample.bx[i];
    const by = R.resample.by[i];
    const nearEdge = [bx - 1, sc.width - bx, by - 1, sc.height - by].some(
      d => Math.abs(d) < 1e-9
    );
    if (nearEdge) return;
    const ours = v === v;
    if (ours !== (o !== null)) patternMismatch++;
    else if (ours) {
      compared++;
      diff = Math.max(diff, Math.abs(v - o));
    }
  });
  row(
    'b3.oracleResample',
    patternMismatch === 0 &&
      compared > 1000 &&
      diff <= C['b3.oracleResample'].boundValue,
    { compared, patternMismatch, maxDiff: diff },
    C['b3.oracleResample'].boundValue
  );
  // sky map
  const S = SC.skyMap;
  const tie = O.tieOf({
    kind: 'sky',
    first: truthWcs(S.first),
    second: truthWcs(S.second),
  });
  const g = grid(S.grid.n, S.grid.from, S.grid.to);
  let err = 0;
  g.forEach(([x, y], i) => {
    const p = tie.toSecond(x, y);
    err = Math.max(
      err,
      Math.abs(p[0] - R.skyMap.second[i][0]),
      Math.abs(p[1] - R.skyMap.second[i][1])
    );
  });
  row(
    'b4.oracleSkyMap',
    err <= C['b4.oracleSkyMap'].boundPix,
    { points: g.length, worstPix: err },
    C['b4.oracleSkyMap'].boundPix
  );
  notRun('b5.oracleAuthentic', C['b5.oracleAuthentic'].status);
}

// ---- (c) coverage ---------------------------------------------------------------------

/** One random trial: a truth WCS, its fit stars (noisy) and the test pixels' exact sky positions. */
export function trial(i, similarity) {
  const E = SC.ensemble;
  const u = mulberry32(E.seedPrefix + i);
  const ra = u() * 360;
  const dec = -60 + u() * 120;
  const scale = 0.5 * Math.exp(u() * Math.log(60 / 0.5));
  const pa = u() * 360;
  const parity = u() < 0.5 ? -1 : 1;
  const eps = similarity ? 0 : (u() * 2 - 1) * 0.005;
  const kappa = similarity ? 0 : (u() * 2 - 1) * 0.2;
  if (similarity) {
    u();
    u();
  }
  const truth = truthWcs({
    crval: [ra, dec],
    crpix: [512.5, 512.5],
    scaleArcsec: scale,
    positionAngleDeg: pa,
    parity,
    axisRatio: 1 + eps,
    skewDeg: kappa,
  });
  const n = E.stars[0] + Math.floor(u() * (E.stars[1] - E.stars[0] + 1));
  const pix = [];
  while (pix.length < n) {
    const p = [50 + u() * 924, 50 + u() * 924];
    if (pix.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) >= 100))
      pix.push(p);
  }
  const stars = pix.map(([x, y], k) => ({
    id: `t${k + 1}`,
    x: x + gauss(u) * E.sigmaPix,
    y: y + gauss(u) * E.sigmaPix,
    ...A.skyOf(truth, x, y),
    sigma: E.sigmaPix,
  }));
  return { truth, stars, parity };
}

function ensembles() {
  const E = SC.ensemble;
  const run = (similarity, id) => {
    const zs = [];
    let refused = 0;
    for (let i = 0; i < E.trials; i++) {
      const tr = trial(i, similarity);
      const f = A.fitWcs(tr.stars, {
        tangent: tr.truth.crval,
        model: similarity ? 'similarity' : 'affine',
        parity: tr.parity,
      });
      if (!f.ok) {
        refused++;
        continue;
      }
      for (const [x, y] of E.testPixels) {
        const sky = A.skyOf(tr.truth, x, y);
        const p = A.pixelOf(f.wcs, sky.ra, sky.dec);
        const sg = O.predictionSigma(f, sky.ra, sky.dec);
        zs.push((p.x - x) / sg.sx, (p.y - y) / sg.sy);
      }
    }
    const cv = coverage(zs);
    const t = C[id];
    row(
      id,
      refused === 0 && inBand(cv.one, t.oneSigma) && inBand(cv.two, t.twoSigma),
      { ...cv, refused },
      { oneSigma: t.oneSigma, twoSigma: t.twoSigma }
    );
  };
  run(false, 'c1.coveragePredictionAffine');
  run(true, 'c2.coveragePredictionSimilarity');
}

// ---- (d) refusals ---------------------------------------------------------------------

function refusals() {
  // d1: no time, an unmovable scale, a time that does not parse.
  const none = O.toTt(null);
  const noScale = O.toTt({ value: 5 });
  const tcb = O.toTt({
    value: '2026-01-01T00:00:00',
    scale: 'TCB',
    format: 'iso',
  });
  const local = O.toTt({ value: 61041, scale: 'local', format: 'mjd' });
  const junk = O.toTt({ value: 'garbage', scale: 'UTC', format: 'iso' });
  const stars = O.starsIn(packStars(), orionTruth(), orionSize(), {
    jdTt: null,
    limit: 5000,
  });
  const j2000 = O.starsIn(packStars(), orionTruth(), orionSize(), {
    jdTt: 2451545.0,
    limit: 5000,
  });
  row(
    'd1.noTimeNoScale',
    [none, noScale].every(r => !r.ok && r.code === 'no-time') &&
      [tcb, local].every(r => !r.ok && r.code === 'time-scale') &&
      !junk.ok &&
      junk.code === 'time' &&
      stars.moved === false &&
      j2000.moved === true &&
      stars.entries.length === j2000.entries.length,
    {
      none: none.code,
      noScale: noScale.code,
      tcb: tcb.code,
      local: local.code,
      junk: junk.code,
      notMoved: stars.moved,
    },
    1
  );
  // d2: no sky.
  const header = { ...orionTruth() };
  const disp = O.skyFor({
    sidecar: { ...sidecarOf(), use: 'display-only', wcs: header },
    header,
    solved: null,
    permits,
  });
  const none2 = O.skyFor({
    sidecar: undefined,
    header: undefined,
    solved: null,
    permits,
  });
  const sin = O.skyFor({
    header: { ...header, ctype: ['RA---SIN', 'DEC--SIN'] },
    solved: null,
    permits,
  });
  const sip = O.skyFor({
    header: { ...header, ctype: ['RA---TAN-SIP', 'DEC--TAN-SIP'] },
    solved: null,
    permits,
  });
  const okHeader = O.skyFor({
    sidecar: { ...sidecarOf(), wcs: header },
    header,
    solved: null,
    permits,
  });
  const okSolved = O.skyFor({
    sidecar: { ...sidecarOf(), wcs: header },
    header: undefined,
    solved: header,
    permits,
  });
  const moved = O.skyFor({
    sidecar: {
      ...sidecarOf(),
      wcs: header,
      history: [
        {
          step: 'crop',
          tool: 'x',
          version: '1',
          lossy: false,
          wcsUpdated: false,
        },
      ],
    },
    header,
    solved: null,
    permits,
  });
  row(
    'd2.noSky',
    !disp.ok &&
      disp.code === 'display-only' &&
      /display-only/.test(disp.message) &&
      !none2.ok &&
      none2.code === 'no-wcs' &&
      !sin.ok &&
      sin.code === 'projection' &&
      /SIN/.test(sin.message) &&
      !sip.ok &&
      sip.code === 'distortion' &&
      okHeader.ok &&
      okHeader.source === 'header' &&
      okSolved.ok &&
      okSolved.source === 'calibration' &&
      !moved.ok &&
      moved.code === 'geometry-unrecorded',
    {
      display: disp.code,
      none: none2.code,
      sin: sin.code,
      sip: sip.code,
      header: okHeader.source,
      solved: okSolved.source,
      moved: moved.code,
    },
    1
  );
  // d3: the nine refusals and the two accepted.
  const id = O.tieOf({ kind: 'identity' });
  const A0 = frameOf({});
  const cases = {
    'display-only': [frameOf({ use: 'display-only' }), A0, id],
    'incomplete-contract': [
      frameOf({}, { linearity: { status: 'unknown', source: 'none' } }),
      A0,
      id,
    ],
    'not-flux': [frameOf({}, { unit: 'display' }), A0, id],
    'calibration-state': [
      A0,
      frameOf({ calibration: { state: 'calibrated' } }),
      id,
    ],
    unit: [A0, frameOf({}, { unit: 'electron' }), id],
    exposure: [
      A0,
      frameOf({ exposure: { seconds: 60, kind: 'effective' } }),
      id,
    ],
    shape: [A0, frameOf({ width: 64, height: 48 }), id],
    'too-large': [
      frameOf({ width: 2048, height: 2048 }),
      frameOf({ width: 2048, height: 2048 }),
      id,
    ],
    registration: [
      A0,
      A0,
      { kind: 'pairs', registration: { verdict: 'inconsistent' } },
    ],
  };
  const got = {};
  for (const [code, [a, b, tie]] of Object.entries(cases)) {
    const v = O.differenceVerdict(a, b, { permits, tie });
    got[code] = v.ok ? 'accepted' : v.code;
    if (!v.ok && (typeof v.message !== 'string' || v.message.length < 20))
      got[code] = 'no reason';
  }
  const accepted = O.differenceVerdict(A0, A0, { permits, tie: id });
  const rate = O.differenceVerdict(
    frameOf({}, { unit: 'adu/s' }),
    frameOf(
      { exposure: { seconds: 60, kind: 'effective' } },
      { unit: 'adu/s' }
    ),
    { permits, tie: id }
  );
  row(
    'd3.differenceRefusals',
    Object.entries(got).every(([code, g]) => g === code) &&
      Object.keys(got).length === O.DIFFERENCE_REFUSALS.length &&
      O.DIFFERENCE_REFUSALS.every(c => c in got) &&
      accepted.ok &&
      rate.ok,
    { ...got, acceptedPair: accepted.ok, ratePerSecond: rate.ok },
    1
  );
  // d4: swapped pairs.
  const M = SC.mismatch;
  let refused = 0;
  for (let i = 0; i < M.trials; i++) {
    const s = registrationScene({ seed: M.seedPrefix + i });
    const mis = s.pairs.map((p, k) =>
      k === 0
        ? { ...p, b: s.pairs[1].b }
        : k === 1
          ? { ...p, b: s.pairs[0].b }
          : p
    );
    const reg = A.register(mis);
    const tie = O.tieOf({ kind: 'pairs', registration: reg });
    const v = O.differenceVerdict(A0, A0, { permits, tie });
    if (
      reg.ok &&
      reg.verdict === 'inconsistent' &&
      !v.ok &&
      v.code === 'registration'
    )
      refused++;
  }
  row(
    'd4.mismatchedPairs',
    refused / M.trials >= C['d4.mismatchedPairs'].detectedMin,
    { refused, of: M.trials },
    C['d4.mismatchedPairs'].detectedMin
  );
  // d5: decoded memory.
  const small = O.differenceVerdict(
    frameOf({ width: 1024, height: 1024 }),
    frameOf({ width: 1024, height: 1024 }),
    { permits, tie: id }
  );
  const bigOne = O.differenceVerdict(
    frameOf({ width: 2048, height: 2048 }),
    frameOf({ width: 2048, height: 2048 }),
    { permits, tie: id }
  );
  row(
    'd5.decodedMemory',
    O.RESIDENT.maxBytes === LIMITS.maxDecodedBytes &&
      O.RESIDENT.bytesPerPixel === LIMITS.bytesPerPixel.data &&
      O.RULES.differenceNeedsResidentFrames === 4 &&
      small.ok &&
      !bigOne.ok &&
      bigOne.code === 'too-large' &&
      residentFrames(1024, 1024) >= 4 &&
      residentFrames(2048, 2048) < 4,
    {
      c1024: small.ok,
      c2048: bigOne.code,
      resident1024: residentFrames(1024, 1024),
      resident2048: residentFrames(2048, 2048),
    },
    true
  );
  // d6: inherited registration refusals.
  const sc = registrationScene();
  const two = A.register(sc.pairs.slice(0, 2));
  const deg = A.register(
    sc.pairs.map(p => ({
      ...p,
      a: [100 + (p.a[0] % 0.2), 100 + (p.a[1] % 0.2)],
    }))
  );
  row(
    'd6.registrationInherited',
    !two.ok && two.code === 'too-few' && !deg.ok && deg.code === 'degenerate',
    { two: two.code, degenerate: deg.code },
    1
  );
  notRun('e1.authenticFrame', C['e1.authenticFrame'].status);
}

// ---- timing ---------------------------------------------------------------------------

function timing() {
  const all = packStars();
  const t0 = performance.now();
  O.starsIn(all, orionTruth(), orionSize(), { jdTt: 2461041.5, limit: 5000 });
  const ms1 = performance.now() - t0;
  row(
    'f1.timePack',
    ms1 <= C['f1.timePack'].boundMs,
    { ms: ms1 },
    C['f1.timePack'].boundMs
  );
  const S = SC.timing;
  const u = mulberry32(182005);
  const a = new Float64Array(S.width * S.height).map(() => u() * 1000);
  const b = new Float64Array(S.width * S.height).map(() => u() * 1000);
  const th = 0.5 * RAD;
  const reg = { theta: th, t: [3.5, -2.5] };
  const t1 = performance.now();
  const carried = O.carry(
    { width: S.width, height: S.height, data: b },
    S,
    O.tieOf({ kind: 'pairs', registration: reg })
  );
  O.subtract(a, carried);
  const ms2 = performance.now() - t1;
  row(
    'f2.timeResample',
    ms2 <= C['f2.timeResample'].boundMs,
    { ms: ms2 },
    C['f2.timeResample'].boundMs
  );
}

/** Run every check; the table. */
export function validate() {
  rows.length = 0;
  a1();
  a2();
  a3();
  a4a5();
  a6();
  a7a8a9();
  a10();
  oracle();
  ensembles();
  refusals();
  timing();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const table = validate();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(table, null, 2)}\n`);
  else {
    for (const r of table)
      process.stdout.write(
        `${r.pass === null ? 'NOT RUN' : r.pass ? 'pass   ' : 'FAIL   '} ${r.id.padEnd(32)} ${JSON.stringify(r.measured)}  (bound ${JSON.stringify(r.bound)})\n`
      );
    const failed = table.filter(r => r.pass === false).length;
    process.stdout.write(`${table.length} rows, ${failed} failed\n`);
    process.exitCode = failed ? 1 : 0;
  }
}
