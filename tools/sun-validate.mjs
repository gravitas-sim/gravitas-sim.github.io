#!/usr/bin/env node
// =============================================================================
// The solar kernel against its committed thresholds (Prompt 194)
// -----------------------------------------------------------------------------
//   npm run sun:validate               print the table
//   npm run sun:validate -- --json     print it as JSON
//
// tests/fixtures/sun/thresholds.json fixed every bound before js/kernels/sun/ had
// been run (SUN_KERNEL.md, "The validation contract"). This runs the checks against
// the production modules and judges them against those bounds, read from the file
// and not copied. tests/sun.test.js runs it in plain Node (Jest's VM makes Math
// reads about ten times slower, so an ensemble there would time the harness) and
// asserts every row.
//
// The oracle's rows read the results pinned in tests/fixtures/sun/ (numpy ray
// tracing, pyerfa vectors, scipy constants: no Gravitas code). Tier b4 (a cited
// solar-coordinates package) is reported NOT RUN; tier e (the authentic frames and the
// measured irradiance series) runs on frames/sun-2024-05.json (Prompt 194 part 2). The ensembles draw from named streams
// of js/random/streams.js; nothing stores a value that passes through a
// trigonometric function.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  CARRINGTON_SIDEREAL_DEG_PER_DAY,
  LAWS,
  PRIMARY_LAW,
  compareToLaw,
  diskToHeliographic,
  earthOrbitalRate,
  earthRateInSolarEquator,
  fitRotationLaw,
  fluxFromLuminosity,
  heliographicToDisk,
  lawRate,
  luminosityFromFlux,
  periodDays,
  positionSigma,
  siderealFromSynodic,
  subEarth,
  summariseFluxSeries,
  summariseIrradiance,
  groupIds,
  groupPositions,
  measuredIrradiance,
  trackGroup,
  synodicFromSidereal,
  temperatureFromLuminosity,
  trackRotation,
  tracerSpread,
} from '../js/kernels/sun/index.js';
import { apparentSun, julianDate } from '../js/kernels/sky/index.js';
import { stream, gaussian } from '../js/random/streams.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/sun');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
export const THRESHOLDS_2 = read('thresholds-2.json');
const T2 = THRESHOLDS_2.checks;
const C = THRESHOLDS.checks;
const R = THRESHOLDS.rules;
const ORACLE = read('oracle-results.json');
const INPUTS = JSON.parse(
  readFileSync(path.join(HERE, 'sun-oracle/oracle-inputs.json'), 'utf8')
);
const SEED = 'sun-194';
const TRIALS = R.ensembleTrials;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

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
const rel = (a, b) => Math.abs(a - b) / (Math.abs(b) || 1);
const wrap180 = d => ((((d + 180) % 360) + 360) % 360) - 180;

const rng = (...labels) => stream('noise', SEED, ...labels);
const STD = R.standardDisk;
const disk = (pDeg, b0Deg, l0Deg = 100, distanceAu) => ({
  ...STD,
  pDeg,
  b0Deg,
  l0Deg,
  ...(distanceAu === undefined ? {} : { distanceAu }),
});

// ---- (a) analytic -----------------------------------------------------------------

function geometryRoundTrip() {
  const b = C['a1.roundtrip.geometry'].bounds;
  const configs = [
    disk(0, 0),
    disk(-20, 6.5, 33, 1.0167),
    disk(24, -7, 250, 0.9833),
    disk(12.5, 3.2, 10),
  ];
  let worstDeg = 0;
  let worstPx = 0;
  let n = 0;
  configs.forEach((d, ci) => {
    const u = rng('a1', ci);
    for (let k = 0; k < 1000; k++) {
      const lat = (2 * u() - 1) * 75;
      const lon = (2 * u() - 1) * 85;
      const px = heliographicToDisk(lat, lon, d);
      if (px.status === 'refused' || px.mu < 0.05) continue;
      const back = diskToHeliographic(px.x, px.y, d);
      worstDeg = Math.max(
        worstDeg,
        Math.abs(back.latDeg - lat),
        Math.abs(wrap180(back.lonStonyDeg - lon))
      );
      n++;
      const X = (2 * u() - 1) * 0.7;
      const Y = (2 * u() - 1) * 0.7;
      if (Math.hypot(X, Y) < 0.999) {
        const x = d.cx + X * d.radiusPx;
        const y = d.cy - Y * d.radiusPx;
        const h = diskToHeliographic(x, y, d);
        const p2 = heliographicToDisk(h.latDeg, h.lonStonyDeg, d);
        worstPx = Math.max(worstPx, Math.hypot(p2.x - x, p2.y - y));
      }
    }
  });
  within('a1.degrees', worstDeg, b.degrees, `${n} positions`);
  within('a1.pixels', worstPx, b.pixels);
}

function geometrySpecial() {
  const b = C['a2.geometry.special'].bounds;
  const { cx, cy, radiusPx: Rp } = STD;
  const ctr = diskToHeliographic(cx, cy, disk(33, 5.5, 123.4));
  within('a2.centre.lat', ctr.latDeg - 5.5, b.degrees);
  within('a2.centre.lon', ctr.lonStonyDeg, b.degrees);
  within(
    'a2.centre.carrington',
    wrap180(ctr.lonCarringtonDeg - 123.4),
    b.degrees
  );
  within('a2.centre.mu', ctr.mu - 1, b.muRelative);
  const o = disk(0, 0, 0);
  const top = diskToHeliographic(cx, cy - Rp, o);
  within('a2.top.lat', top.latDeg - 90, b.degrees);
  const east = diskToHeliographic(cx - Rp, cy, o);
  within('a2.east.lon', east.lonStonyDeg + 90, b.degrees);
  within('a2.east.lat', east.latDeg, b.degrees);
  const west = diskToHeliographic(cx + Rp, cy, o);
  within('a2.west.lon', west.lonStonyDeg - 90, b.degrees);
  const p90 = diskToHeliographic(cx - Rp, cy, disk(90, 0, 0));
  within('a2.p90.left.lat', p90.latDeg - 90, b.degrees);
  const b0 = 7.25;
  const up = diskToHeliographic(
    cx,
    cy - Rp * Math.cos(b0 * DEG),
    disk(0, b0, 0)
  );
  within('a2.b0.up.lat', up.latDeg - 90, b.degrees);
  within('a2.b0.up.mu', rel(up.mu, Math.sin(b0 * DEG)), b.muRelative);
  let worstMu = 0;
  for (const r of [0, 0.1, 0.3, 0.5, 0.8, 0.95]) {
    const h = diskToHeliographic(cx + r * Rp, cy, o);
    worstMu = Math.max(worstMu, rel(h.mu, Math.sqrt(1 - r * r)));
  }
  within('a2.mu.orthographic', worstMu, b.muRelative);
  const per = diskToHeliographic(cx + Rp, cy, disk(0, 0, 0, 1));
  const thetaSun = Math.asin(6.957e8 / 149597870700);
  within(
    'a2.limb.perspective',
    per.lonStonyDeg - (90 - thetaSun * RAD),
    b.degrees
  );
  let mono = true;
  let last = -1e9;
  for (let i = 0; i <= 40; i++) {
    const h = diskToHeliographic(
      cx + ((i / 40) * 1.999 - 1) * Rp,
      cy,
      disk(0, 0, 0, 1.01)
    );
    if (!(h.lonStonyDeg > last)) mono = false;
    last = h.lonStonyDeg;
  }
  row('a2.monotone', mono ? 1 : 0, 1, mono);
  const off = diskToHeliographic(cx + Rp * 1.001, cy, o);
  row(
    'a2.offdisc',
    off.code === 'off-disc' ? 1 : 0,
    1,
    off.code === 'off-disc'
  );
}

function lawChecks() {
  const b = C['a3.rotation.law'].bounds;
  const k = (86400e-6 * 180) / Math.PI;
  let worst = 0;
  for (const lat of [0, 30, 60]) {
    const s2 = Math.sin(lat * DEG) ** 2;
    const want = (2.894 - 0.428 * s2 - 0.37 * s2 * s2) * k;
    worst = Math.max(worst, rel(lawRate(lat), want));
  }
  within('a3.law.closed', worst, b.lawRelative);
  within(
    'a3.carrington.rate',
    CARRINGTON_SIDEREAL_DEG_PER_DAY - 14.1844,
    b.carringtonDegPerDay
  );
  const earth = 360 / 365.25636;
  within(
    'a3.carrington.synodicPeriod',
    periodDays(CARRINGTON_SIDEREAL_DEG_PER_DAY - earth) - 27.2753,
    b.synodicPeriodDays
  );
  let spread = 0;
  for (const lat of [0, 15, 30, 45, 60])
    spread = Math.max(spread, tracerSpread(lat));
  within('a3.tracerSpread', spread, b.tracerSpreadDegPerDay);
  row(
    'a3.laws.checked',
    Object.values(LAWS).every(l => l.checked === false) ? 1 : 0,
    1,
    Object.values(LAWS).every(l => l.checked === false),
    'both laws say they were not re-read at their source'
  );
}

function siderealChecks() {
  const b = C['a4.sidereal'].bounds;
  const e = 0.016709;
  const k = 360 / 365.25636;
  const peri = (k * (1 + e) ** 2) / (1 - e * e) ** 1.5;
  const aph = (k * (1 - e) ** 2) / (1 - e * e) ** 1.5;
  const jp = julianDate(2024, 1, 3, 0.6333) - 0; // perihelion 00:38 UT
  const ja = julianDate(2024, 7, 5, 5.1);
  within(
    'a4.perihelion',
    earthOrbitalRate(jp - 0.5, jp + 0.5) - peri,
    b.extremaDegPerDay,
    `closed form ${peri.toFixed(4)}`
  );
  within(
    'a4.aphelion',
    earthOrbitalRate(ja - 0.5, ja + 0.5) - aph,
    b.extremaDegPerDay,
    `closed form ${aph.toFixed(4)}`
  );
  const j0 = julianDate(2024, 1, 1, 0);
  within('a4.year', earthOrbitalRate(j0, j0 + 365.25636) - k, b.yearDegPerDay);
  let ident = 0;
  for (const [s, w] of [
    [13.3, 0.9856],
    [14.2, 1.019],
    [-2.5, 0.953],
  ])
    ident = Math.max(
      ident,
      Math.abs(synodicFromSidereal(siderealFromSynodic(s, w), w) - s)
    );
  within('a4.identity', ident, b.identityAbsolute);
}

function sigmaChecks() {
  const b = C['a5.sigma.secant'].bounds;
  const o = disk(0, 0, 0);
  const s = positionSigma(STD.cx, STD.cy, o, 0.3);
  const want = (0.3 / STD.radiusPx) * RAD;
  within('a5.centre.lon', rel(s.sigmaLonDeg, want), b.centreRelative);
  within('a5.centre.lat', rel(s.sigmaLatDeg, want), b.centreRelative);
  let ok = true;
  let last = 0;
  let at98 = 0;
  for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 0.98]) {
    const v = positionSigma(STD.cx + r * STD.radiusPx, STD.cy, o, 0.3);
    if (v.sigmaLonDeg < last * (1 - 1e-12)) ok = false;
    last = v.sigmaLonDeg;
    if (r === 0.98) at98 = v.sigmaLonDeg / s.sigmaLonDeg;
  }
  row('a5.monotone', ok ? 1 : 0, 1, ok);
  atLeast(
    'a5.limbRatio',
    at98,
    b.limbRatioMin,
    'sigma at r 0.98 over the centre value'
  );
}

function irradianceChecks() {
  const b = C['a6.irradiance'].bounds;
  const lum = luminosityFromFlux({ fluxWm2: 1361, distanceAu: 1 });
  within(
    'a6.luminosity.iau',
    rel(lum.luminosityW, 3.828e26),
    b.luminosityRelativeToIau,
    `${lum.luminosityW.toExponential(5)} W against the nominal 3.828e26`
  );
  const t = temperatureFromLuminosity({ luminosityW: lum.luminosityW });
  within(
    'a6.teff.iau',
    t.teffK - 5772,
    b.teffKelvinToIau,
    `${t.teffK.toFixed(2)} K against the nominal 5772`
  );
  within(
    'a6.identity',
    rel(fluxFromLuminosity(lum.luminosityW, 1), 1361),
    b.identityRelative
  );
  const d = 0.9833;
  const l2 = luminosityFromFlux({ fluxWm2: 1361 / (d * d), distanceAu: d });
  within(
    'a6.distance',
    rel(l2.luminosityW, lum.luminosityW),
    b.identityRelative
  );
  const s = luminosityFromFlux({
    fluxWm2: 1361,
    distanceAu: 1,
    sigmaFlux: 0.5,
    sigmaDistanceAu: 0.0005,
  });
  const relL = Math.sqrt((0.5 / 1361) ** 2 + (2 * 0.0005) ** 2);
  within(
    'a6.sigmaL',
    rel(s.sigmaLuminosityW, lum.luminosityW * relL),
    b.sigmaRelative
  );
  const ts = temperatureFromLuminosity({
    luminosityW: s.luminosityW,
    sigmaLuminosityW: s.sigmaLuminosityW,
  });
  within(
    'a6.sigmaT',
    rel(ts.sigmaTeffK, 0.25 * relL * ts.teffK),
    b.sigmaRelative
  );
  const tr = temperatureFromLuminosity({
    luminosityW: s.luminosityW,
    sigmaLuminosityW: s.sigmaLuminosityW,
    sigmaRadiusM: 6.957e4,
  });
  const relR = 0.25 * Math.sqrt(relL ** 2 + (2 * 1e-4) ** 2);
  within(
    'a6.sigmaT.radius',
    rel(tr.sigmaTeffK, relR * tr.teffK),
    b.sigmaRelative
  );
  const vals = [
    1360.5, 1361.2, 1360.9, 1361.4, 1360.7, 1361.0, 1361.3, 1360.6, 1361.1,
    1360.8, 1361.5, 1360.4, 1361.0, 1360.9,
  ];
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  // the reference sums deviations from a round number, not raw squares (a raw
  // sum of squares of values near 1361 cancels to nine digits)
  const shift = vals.map(v => v - 1361);
  const sh = shift.reduce((a, v) => a + v, 0);
  const ss = shift.reduce((a, v) => a + v * v, 0) - (sh * sh) / vals.length;
  const sem = Math.sqrt(ss / (vals.length - 1)) / Math.sqrt(vals.length);
  const ser = summariseFluxSeries(
    vals.map(v => ({ fluxWm2: v, distanceAu: 1 })),
    { instrument: 'hand-made' }
  );
  within('a6.series.mean', rel(ser.meanFluxAt1Au, mean), b.sigmaRelative);
  within(
    'a6.series.sem',
    rel(ser.standardError, sem),
    b.sigmaRelative,
    'against the shifted sum-of-squares form'
  );
}

// ---- a synthetic spot ------------------------------------------------------------

/** The frames of a daily sequence at 12:00 UT from (y, m, d): disk per frame from the kernel's ephemeris. */
const frames = (y, m, d, n) => framesFromJd(julianDate(y, m, d, 12), n);

/** A spot at `lat` rotating at the law's rate, seen in each frame from `lon0` at the first: pixels with noise. */
function spotTrack(
  fr,
  lat,
  { lon0 = -50, law = PRIMARY_LAW, noise = 0, draw } = {}
) {
  const omega = lawRate(lat, law);
  const lc0 = fr[0].disk.l0Deg + lon0;
  return fr.map(f => {
    const lc =
      lc0 + (omega - CARRINGTON_SIDEREAL_DEG_PER_DAY) * (f.jd - fr[0].jd);
    const lonS = wrap180(lc - f.disk.l0Deg);
    const p = heliographicToDisk(lat, lonS, f.disk);
    return {
      jd: f.jd,
      x: p.x + (noise ? noise * draw() : 0),
      y: p.y + (noise ? noise * draw() : 0),
      sigmaPx: noise || undefined,
      disk: f.disk,
    };
  });
}

function trackChecks() {
  const b = C['a7.track.recovery'].bounds;
  const starts = [
    [2024, 3, 6],
    [2024, 6, 9],
    [2024, 9, 10],
    [2024, 12, 7],
  ];
  let worstSyn = 0;
  let worstEq = 0;
  let worstCar = 0;
  let worstZ = 0;
  let worstAbs = 0;
  let cases = 0;
  const g = gaussian(rng('a7'));
  for (const lat of [0, 15, 30])
    for (const s of starts) {
      const fr = frames(...s, 8);
      const truth = lawRate(lat);
      const free = trackRotation(spotTrack(fr, lat));
      if (free.status === 'refused') {
        row(`a7.free.${lat}.${s[1]}`, null, null, false, free.code);
        continue;
      }
      // the committed route: the synodic rate plus the Earth's ecliptic rate
      // (thresholds.json, definition.sidereal); the kernel's own sidereal rate
      // now uses the rate along the solar equator, measured separately below
      worstSyn = Math.max(
        worstSyn,
        Math.abs(
          free.synodic.rate + earthOrbitalRate(free.jd0, free.jd1) - truth
        )
      );
      worstEq = Math.max(worstEq, Math.abs(free.sidereal.rate - truth));
      worstCar = Math.max(
        worstCar,
        Math.abs(free.carringtonRoute.siderealRate - truth)
      );
      const noisy = trackRotation(spotTrack(fr, lat, { noise: 0.5, draw: g }));
      if (noisy.status === 'refused') {
        row(`a7.noisy.${lat}.${s[1]}`, null, null, false, noisy.code);
        continue;
      }
      worstZ = Math.max(
        worstZ,
        Math.abs(noisy.sidereal.rate - truth) / noisy.sidereal.sigma
      );
      worstAbs = Math.max(worstAbs, Math.abs(noisy.sidereal.rate - truth));
      cases++;
    }
  within(
    'a7.noiseFree.synodicRoute',
    worstSyn,
    b.noiseFreeSynodicRouteDegPerDay,
    `${12} cases`
  );
  within(
    'a7.noiseFree.equatorRoute',
    worstEq,
    b.noiseFreeSynodicRouteDegPerDay,
    'ADDED after the committed row above first failed (0.008035): the kernel now corrects with the rate along the solar equator; the same committed bound'
  );
  within(
    'a7.noiseFree.carringtonRoute',
    worstCar,
    b.noiseFreeCarringtonRouteDegPerDay
  );
  within('a7.noisy.sigmas', worstZ, b.noisySigmas, `${cases} cases`);
  within('a7.noisy.absolute', worstAbs, b.noisyAbsoluteDegPerDay);
}

function lawFitChecks() {
  const b = C['a8.fit.law'].bounds;
  const lats = [10, 20, 30];
  const tr = lats.map(l => ({
    latDeg: l,
    rate: lawRate(l) + 0.12,
    sigma: 0.05,
  }));
  const f = fitRotationLaw(tr);
  within(
    'a8.A',
    f.params.A.value - (PRIMARY_LAW.A + 0.12),
    b.parameterAbsolute
  );
  within(
    'a8.sigma',
    rel(f.params.A.sigma, 0.05 / Math.sqrt(3)),
    b.sigmaRelative
  );
  within('a8.chi2', f.chi2, 1e-18 + 1e-12);
  // unequal sigmas, closed form
  const sg = [0.02, 0.05, 0.1];
  const rates = [lawRate(10) + 0.3, lawRate(20) - 0.1, lawRate(30) + 0.05];
  const f2 = fitRotationLaw(
    lats.map((l, i) => ({ latDeg: l, rate: rates[i], sigma: sg[i] }))
  );
  let sw = 0;
  let swy = 0;
  lats.forEach((l, i) => {
    const s2 = Math.sin(l * DEG) ** 2;
    const w = 1 / sg[i] ** 2;
    sw += w;
    swy += w * (rates[i] - PRIMARY_LAW.B * s2 - PRIMARY_LAW.C * s2 * s2);
  });
  within('a8.closed.A', rel(f2.params.A.value, swy / sw), b.sigmaRelative);
  const chi2 = f2.chi2;
  const birge = Math.max(1, chi2 / 2);
  within(
    'a8.closed.sigma',
    rel(f2.params.A.sigma, Math.sqrt(birge / sw)),
    b.sigmaRelative
  );
}

// ---- (b) oracle ----------------------------------------------------------------

function oracle() {
  const b1 = C['b1.pixels'].bounds;
  const d = INPUTS.disk;
  let worstDeg = 0;
  let worstMu = 0;
  for (const o of ORACLE.pixels) {
    const h = diskToHeliographic(o.x, o.y, d);
    worstDeg = Math.max(
      worstDeg,
      Math.abs(h.latDeg - o.latDeg),
      Math.abs(h.lonStonyDeg - o.lonStonyDeg),
      Math.abs(wrap180(h.lonCarringtonDeg - o.lonCarringtonDeg))
    );
    worstMu = Math.max(worstMu, Math.abs(h.mu - o.mu));
  }
  within(
    'b1.degrees',
    worstDeg,
    b1.degrees,
    `${ORACLE.pixels.length} pixels, ray tracing`
  );
  within('b1.mu', worstMu, b1.mu);
  const b2 = C['b2.ephemeris'].bounds;
  let wp = 0;
  let wb = 0;
  let wl = 0;
  for (const o of ORACLE.ephemeris) {
    const k = subEarth(o.jdUt);
    wp = Math.max(wp, Math.abs(wrap180(k.pDeg - o.pDeg)));
    wb = Math.max(wb, Math.abs(k.b0Deg - o.b0Deg));
    wl = Math.max(wl, Math.abs(wrap180(k.l0Deg - o.l0Deg)));
  }
  within('b2.P', wp, b2.pB0L0Degrees, `${ORACLE.ephemeris.length} instants`);
  within('b2.B0', wb, b2.pB0L0Degrees);
  within('b2.L0', wl, b2.pB0L0Degrees);
  let wr = 0;
  for (const o of ORACLE.rates)
    wr = Math.max(wr, Math.abs(earthOrbitalRate(o.jd0, o.jd1) - o.degPerDay));
  within('b2.rate', wr, b2.rateDegPerDay, `${ORACLE.rates.length} windows`);
  let wq = 0;
  for (const o of ORACLE.rates)
    wq = Math.max(
      wq,
      Math.abs(earthRateInSolarEquator(o.jd0, o.jd1) - o.equatorDegPerDay)
    );
  within(
    'b2.rateEquator',
    wq,
    b2.rateDegPerDay,
    'ADDED with the equator-route correction; the oracle sums daily steps of L0 from its vector construction'
  );
  const b3 = C['b3.irradiance'].bounds;
  let w3 = 0;
  for (const o of ORACLE.irradiance) {
    const l = luminosityFromFlux({
      fluxWm2: o.fluxWm2,
      distanceAu: o.distanceAu,
    });
    const t = temperatureFromLuminosity({ luminosityW: l.luminosityW });
    w3 = Math.max(
      w3,
      rel(l.fluxAt1Au, o.fluxAt1Au),
      rel(l.luminosityW, o.luminosityW),
      rel(t.teffK, o.teffK)
    );
  }
  within('b3.relative', w3, b3.relative, `${ORACLE.irradiance.length} pairs`);
  notRun(
    'b4.package',
    'sunpy and SolarSoft are not installed in the oracle environment and nothing may be installed: a cited solar-coordinates package was not run'
  );
}

// ---- (c) coverage ----------------------------------------------------------------

function coverage() {
  const g1 = gaussian(rng('c1'));
  const u1 = rng('c1', 'u');
  let hit = 0;
  let refusedN = 0;
  for (let k = 0; k < TRIALS; k++) {
    const lat = [5, 15, 25][Math.floor(u1() * 3)];
    const jd0 = 2460310.5 + Math.floor(u1() * 365);
    const fr = framesFromJd(jd0, 8);
    const t = trackRotation(
      spotTrack(fr, lat, { noise: R.defaultSigmaPx, draw: g1 })
    );
    if (t.status === 'refused') {
      refusedN++;
      continue;
    }
    const truth = lawRate(lat);
    if (Math.abs(t.sidereal.rate - truth) <= R.z * t.sidereal.sigma) hit++;
  }
  inBand(
    'c1.rate.coverage',
    hit / TRIALS,
    C['c1.rate.coverage'].bounds.coverageBand,
    `${TRIALS} trials, ${refusedN} refused`
  );

  const g2 = gaussian(rng('c2'));
  const u2 = rng('c2', 'u');
  let hit2 = 0;
  for (let k = 0; k < TRIALS; k++) {
    const dA = (2 * u2() - 1) * 0.3;
    const tr = [10, 20, 30].map(l => ({
      latDeg: l,
      rate: lawRate(l) + dA + 0.05 * g2(),
      sigma: 0.05,
    }));
    const f = fitRotationLaw(tr);
    if (
      f.params.A.lo <= PRIMARY_LAW.A + dA &&
      PRIMARY_LAW.A + dA <= f.params.A.hi
    )
      hit2++;
  }
  inBand(
    'c2.law.coverage',
    hit2 / TRIALS,
    C['c2.law.coverage'].bounds.coverageBand,
    `${TRIALS} trials`
  );

  const g3 = gaussian(rng('c3'));
  const dTrue = 0.9833;
  const Ltrue = luminosityFromFlux({
    fluxWm2: 1361,
    distanceAu: 1,
  }).luminosityW;
  let hit3 = 0;
  for (let k = 0; k < TRIALS; k++) {
    const S = 1361 / (dTrue * dTrue) + 0.5 * g3();
    const dm = dTrue + 0.0005 * g3();
    const l = luminosityFromFlux({
      fluxWm2: S,
      distanceAu: dm,
      sigmaFlux: 0.5,
      sigmaDistanceAu: 0.0005,
    });
    if (Math.abs(l.luminosityW - Ltrue) <= R.z * l.sigmaLuminosityW) hit3++;
  }
  inBand(
    'c3.luminosity.coverage',
    hit3 / TRIALS,
    C['c3.luminosity.coverage'].bounds.coverageBand,
    `${TRIALS} trials`
  );
}

function framesFromJd(jd0, n) {
  return Array.from({ length: n }, (_, i) => {
    const jd = jd0 + i;
    const e = subEarth(jd);
    return {
      jd,
      disk: {
        ...STD,
        pDeg: e.pDeg,
        b0Deg: e.b0Deg,
        l0Deg: e.l0Deg,
        distanceAu: apparentSun(jd + 69 / 86400).distanceAu,
      },
    };
  });
}

// ---- (d) widen, refuse, say "not constrained" ----------------------------------

/** Positions at the given Stonyhurst longitudes, one a day, latitude `lat`, on one disc. */
function lonTrack(lons, lat, d, noise = 0, draw) {
  return lons.map((lon, i) => {
    const p = heliographicToDisk(lat, lon, d);
    return {
      jd: 2460441 + i,
      x: p.x + (noise ? noise * draw() : 0),
      y: p.y + (noise ? noise * draw() : 0),
      sigmaPx: 1,
      disk: d,
    };
  });
}

function limbChecks() {
  const b1 = C['d1.limb.widened'].bounds;
  const d = disk(-12, 3, 100);
  const gA = gaussian(rng('d1'));
  const nx = Array.from({ length: 6 }, () => gA());
  let i = 0;
  const same = () => nx[i++ % 6];
  const limb = trackRotation(lonTrack([56, 69.4, 82.8], 10, d, 1, same));
  i = 0;
  const disc = trackRotation(lonTrack([-13.4, 0, 13.4], 10, d, 1, same));
  const ok = limb.status !== 'refused' && disc.status !== 'refused';
  row('d1.returned', ok ? 1 : 0, 1, ok, ok ? '' : `${limb.code} ${disc.code}`);
  if (!ok) return;
  row(
    'd1.limb.warning',
    limb.warnings.some(w => w.code === 'foreshortening') ? 1 : 0,
    1,
    limb.warnings.some(w => w.code === 'foreshortening')
  );
  row('d1.limb.precise', limb.precise ? 1 : 0, 0, limb.precise === false);
  row(
    'd1.disc.clean',
    disc.warnings.length === 0 && disc.precise ? 1 : 0,
    1,
    disc.warnings.length === 0 && disc.precise
  );
  atLeast(
    'd1.sigmaRatio',
    limb.synodic.sigma / disc.synodic.sigma,
    b1.sigmaRatioMin,
    `limb ${limb.synodic.sigma.toFixed(3)}, disc ${disc.synodic.sigma.toFixed(3)} degrees/day`
  );

  const g = gaussian(rng('d2'));
  let hit = 0;
  let redrawn = 0;
  let refusedN = 0;
  let n = 0;
  while (n < TRIALS) {
    const pts = lonTrack([56, 69.4, 82.8], 10, d, 1, g);
    if (pts.some(p => Math.hypot(p.x - d.cx, p.y - d.cy) > d.radiusPx)) {
      redrawn++;
      continue;
    }
    n++;
    const t = trackRotation(pts);
    if (t.status === 'refused') {
      refusedN++;
      continue;
    }
    if (Math.abs(t.synodic.rate - 13.4) <= R.z * t.synodic.sigma) hit++;
  }
  const returned = n - refusedN;
  atLeast(
    'd2.limb.coverage',
    hit / returned,
    C['d2.limb.coverage'].bounds.coverageMin,
    `${returned} returned of ${n}, ${refusedN} refused, ${redrawn} redrawn`
  );
}

function refusalChecks() {
  const d = disk(-12, 3, 100);
  const good = lonTrack([-13.4, 0, 13.4], 10, d);
  const cases = [
    ['two points', 'too-few', () => trackRotation(good.slice(0, 2))],
    [
      'off the disc',
      'off-disc',
      () =>
        trackRotation([
          { ...good[0], x: d.cx + d.radiusPx * 1.2 },
          good[1],
          good[2],
        ]),
    ],
    [
      'mu below 0.1',
      'limb',
      () => {
        const e = lonTrack([0, 10, 87], 10, d);
        const last = diskToHeliographic(e[2].x, e[2].y, d);
        return last.mu < 0.1 ? trackRotation(e) : { status: 'x' };
      },
    ],
    [
      'zero radius',
      'bad-disk',
      () =>
        trackRotation(good.map(p => ({ ...p, disk: { ...d, radiusPx: 0 } }))),
    ],
    [
      'non-finite centre',
      'bad-disk',
      () => trackRotation(good.map(p => ({ ...p, disk: { ...d, cx: NaN } }))),
    ],
    [
      'P above 360',
      'bad-disk',
      () => trackRotation(good.map(p => ({ ...p, disk: { ...d, pDeg: 400 } }))),
    ],
    [
      'equal times',
      'bad-time',
      () => trackRotation(good.map(p => ({ ...p, jd: 2460441 }))),
    ],
    [
      'sigma zero',
      'bad-sigma',
      () => trackRotation(good.map(p => ({ ...p, sigmaPx: 0 }))),
    ],
    [
      'sigma negative',
      'bad-sigma',
      () => trackRotation(good.map(p => ({ ...p, sigmaPx: -1 }))),
    ],
    [
      'rate not constrained',
      'not-constrained',
      () => trackRotation(lonTrack([0, 0.1, 0.2], 10, d)),
    ],
    ['flux zero', 'flux', () => luminosityFromFlux({ fluxWm2: 0 })],
    ['flux negative', 'flux', () => luminosityFromFlux({ fluxWm2: -1361 })],
    ['flux NaN', 'flux', () => luminosityFromFlux({ fluxWm2: NaN })],
    [
      'distance zero',
      'distance',
      () => luminosityFromFlux({ fluxWm2: 1361, distanceAu: 0 }),
    ],
    [
      'distance negative',
      'distance',
      () => luminosityFromFlux({ fluxWm2: 1361, distanceAu: -1 }),
    ],
    ['empty series', 'empty', () => summariseFluxSeries([])],
    [
      'law without C',
      'bad-law',
      () =>
        fitRotationLaw([{ latDeg: 10, rate: 14, sigma: 0.1 }], {
          law: { A: 14, B: -2 },
        }),
    ],
    ['far side', 'off-disc', () => heliographicToDisk(0, 120, d)],
    [
      'compare, sigma NaN',
      'bad-sigma',
      () => compareToLaw({ latDeg: 10, rate: 14, sigma: NaN }),
    ],
  ];
  let bad = 0;
  const notes = [];
  for (const [name, code, f] of cases) {
    let r;
    try {
      r = f();
    } catch (e) {
      bad++;
      notes.push(`${name}: threw ${e.message}`);
      continue;
    }
    if (!(
      r &&
      r.status === 'refused' &&
      r.code === code &&
      R.refusalCodes.includes(r.code)
    )) {
      bad++;
      notes.push(`${name}: ${r && r.status} ${r && r.code}`);
    }
  }
  row(
    'd3.refusals',
    bad,
    0,
    bad === 0,
    `${cases.length} hostile inputs${notes.length ? `; ${notes.join('; ')}` : ''}`
  );

  // d4
  let bad4 = 0;
  const n4 = [];
  const tr2 = [10, 30].map(l => ({ latDeg: l, rate: lawRate(l), sigma: 0.1 }));
  const a = fitRotationLaw(tr2, { free: ['A', 'B', 'C'] });
  if (!(
    a.status === 'refused' &&
    a.code === 'under-determined' &&
    /2 distinct/.test(a.why) &&
    /3 coefficients/.test(a.why)
  )) {
    bad4++;
    n4.push('three free, two latitudes');
  }
  const b = fitRotationLaw(tr2, { free: ['A', 'B'] });
  if (!(b.status !== 'refused' && b.zeroDof === true && b.chi2 === null)) {
    bad4++;
    n4.push('two free, two latitudes');
  }
  const c = fitRotationLaw(
    [{ latDeg: 15, rate: lawRate(15) + 0.2, sigma: 0.1 }],
    { free: ['A'] }
  );
  if (!(c.status !== 'refused' && c.params.A.value > 0)) {
    bad4++;
    n4.push('A only, one latitude');
  }
  const e = fitRotationLaw(tr2, { free: ['A', 'X'] });
  if (!(e.status === 'refused' && e.code === 'bad-free')) {
    bad4++;
    n4.push('bad free');
  }
  const f = fitRotationLaw(
    [
      { latDeg: 20, rate: 13.9, sigma: 0.1 },
      { latDeg: 20, rate: 14.1, sigma: 0.1 },
    ],
    { free: ['A', 'B'] }
  );
  if (!(f.status === 'refused' && f.code === 'under-determined')) {
    bad4++;
    n4.push('same latitude twice');
  }
  row('d4.underdetermined', bad4, 0, bad4 === 0, n4.join('; '));
}

// ---- (e) authentic data: the 14-day sequence and the irradiance series (part 2) -----
// Bounds: thresholds.json e1.authentic and e2.irradiance as committed, and the new
// legs of thresholds-2.json (committed before any rate was computed).

const REPO = path.join(HERE, '..');
const SIDE = JSON.parse(
  readFileSync(path.join(REPO, 'frames/sun-2024-05.json'), 'utf8')
);

function authentic() {
  const side = SIDE;
  // e0.pack.integrity
  const b0i = T2['e0.pack.integrity'].bounds;
  let shaBad = 0;
  for (const d of side.days) {
    const bytes = readFileSync(path.join(REPO, d.file));
    if (createHash('sha256').update(bytes).digest('hex') !== d.sha256) shaBad++;
  }
  const valid = measuredIrradiance(side).length;
  const fills = side.irradiance.filter(r => r.fill).length;
  const dateBad = side.days.filter(
    d => d.file.slice(-12, -4) !== d.date.replaceAll('-', '')
  ).length;
  const ok =
    side.days.length === b0i.frames &&
    shaBad === 0 &&
    dateBad === 0 &&
    valid === b0i.validIrradianceDays &&
    fills === b0i.fillDays;
  row(
    'e0.pack.integrity',
    shaBad + dateBad,
    b0i,
    ok,
    `${side.days.length} frames, ${valid} measured and ${fills} fill irradiance rows`
  );
  // e0.scale
  const b0s = T2['e0.scale'].bounds;
  const prod = side.days.map(d => d.disc.radiusPx * d.distanceAu);
  const mean = prod.reduce((a, b) => a + b, 0) / prod.length;
  within(
    'e0.scale.radiusTimesDistance',
    Math.max(...prod.map(p => Math.abs(p - mean))),
    b0s.radiusTimesDistancePx,
    `radius times distance ${mean.toFixed(3)} px AU`
  );
  within(
    'e0.scale.centre',
    Math.max(
      ...side.days.map(d =>
        Math.max(
          Math.abs(d.disc.centrePx[0] - 511.5),
          Math.abs(d.disc.centrePx[1] - 511.5)
        )
      )
    ),
    b0s.centrePx,
    'against the middle of the picture'
  );
  // the tracks
  const b1 = T2['e1.tracks'].bounds;
  const b0o = T2['e0.orientation'].bounds;
  const tracks = {};
  for (const id of groupIds(side)) {
    const t = trackGroup(side, id);
    tracks[id] = t;
    row(
      `e1.tracks.${id}`,
      t.status === 'refused' ? 0 : t.nUsed,
      b1,
      t.status !== 'refused' && t.nUsed >= b1.minUsable,
      t.status === 'refused' ? t.code : `${t.nUsed} usable positions`
    );
    if (t.status === 'refused') continue;
    within(
      `e0.orientation.${id}`,
      t.latitude.sdDeg,
      b0o.latitudeSdDegMax,
      `mean latitude ${t.latitude.deg.toFixed(2)} degrees`
    );
    // e1.authentic: the committed row, as it stands
    row(
      `e1.authentic.${id}`,
      Math.abs(t.law.z),
      C['e1.authentic'].bounds.sigmas,
      Math.abs(t.law.difference) <=
        C['e1.authentic'].bounds.sigmas * t.law.sigmaTotal,
      `sidereal ${t.sidereal.rate.toFixed(3)} +/- ${t.sidereal.sigma.toFixed(3)} against the law's ${t.law.predicted.toFixed(3)} degrees a day at ${t.latitude.deg.toFixed(1)} degrees`
    );
    within(
      `e1.carrington.${id}`,
      t.carringtonRoute.differenceFromSynodicRoute,
      T2['e1.carrington'].bounds.degPerDay,
      'the Carrington route against the synodic route'
    );
  }
  // the wrong choice of P, to show the leg can tell
  const wrong = groupPositions(side, 'G3')
    .filter(p => p.mu >= 0.35)
    .map(p => {
      const d = {
        ...diskOfDaySide(side, p.day),
        pDeg: side.days[p.day].pSkyDeg,
      };
      return diskToHeliographic(p.x, p.y, d).latDeg;
    });
  const wm = wrong.reduce((a, b) => a + b, 0) / wrong.length;
  const wsd = Math.sqrt(
    wrong.reduce((a, b) => a + (b - wm) ** 2, 0) / (wrong.length - 1)
  );
  atLeast(
    'e0.orientation.wrongP.G3',
    wsd,
    b0o.wrongPLatitudeSdDegMin,
    "the latitude's scatter with Horizons' NP.ang used as the picture's P"
  );
  if (tracks.G1.status !== 'refused' && tracks.G3.status !== 'refused')
    row(
      'e1.order',
      tracks.G1.sidereal.rate - tracks.G3.sidereal.rate,
      'G1 faster than G3',
      tracks.G1.latitude.deg < Math.abs(tracks.G3.latitude.deg)
        ? tracks.G1.sidereal.rate > tracks.G3.sidereal.rate
        : tracks.G1.sidereal.rate < tracks.G3.sidereal.rate,
      `|latitude| ${Math.abs(tracks.G1.latitude.deg).toFixed(1)} and ${Math.abs(tracks.G3.latitude.deg).toFixed(1)}`
    );
  // e1.limb
  const wide = trackGroup(side, 'G1', { minMu: 0.25 });
  const b1l = T2['e1.limb'].bounds;
  if (wide.status === 'refused' || tracks.G1.status === 'refused')
    row('e1.limb', 0, b1l, false, 'refused');
  else
    row(
      'e1.limb',
      wide.sidereal.sigma / tracks.G1.sidereal.sigma,
      b1l,
      wide.precise === false &&
        wide.warnings.some(w => w.code === 'foreshortening') &&
        wide.sidereal.sigma >= b1l.sigmaRatioMin * tracks.G1.sidereal.sigma,
      `${wide.nUsed} positions, precise ${wide.precise}`
    );
  // ADDED after e1.limb failed (its bound assumed that a limb point widens the
  // rate's sigma; the weighted fit trusts it by its own, larger, sigma): what a
  // limb point does do, with a bound written after that was seen.
  if (wide.status !== 'refused') {
    const lone = wide.points.filter(p => p.mu < 0.35);
    const disc = wide.points
      .filter(p => p.mu >= 0.35)
      .map(p => p.sigmaLonDeg)
      .sort((a, b) => a - b);
    const median = disc[Math.floor(disc.length / 2)];
    const ratio = Math.max(...lone.map(p => p.sigmaLonDeg)) / median;
    atLeast(
      'e1.limb.pointSigma',
      ratio,
      2,
      'ADDED after e1.limb failed: the limb point carries at least twice the longitude sigma of the median disc point'
    );
    row(
      'e1.limb.warning',
      lone.length,
      'foreshortening warned, precise false',
      lone.length > 0 &&
        wide.precise === false &&
        wide.warnings.some(w => w.code === 'foreshortening'),
      'ADDED after e1.limb failed'
    );
  }
  // b5.ephemeris
  const b5 = T2['b5.ephemeris'].bounds;
  let wb = 0;
  let wp = 0;
  let wl = 0;
  for (const d of side.days) {
    const k = subEarth(d.jd);
    wb = Math.max(wb, Math.abs(k.b0Deg - d.b0Deg));
    wp = Math.max(wp, Math.abs(wrap180(k.pDeg - d.pSkyDeg)));
    wl = Math.max(wl, Math.abs(wrap180(k.l0Deg - d.l0Deg)));
  }
  within(
    'b5.ephemeris.b0',
    wb,
    b5.b0Deg,
    'the kernel against Horizons, 14 instants'
  );
  within('b5.ephemeris.p', wp, b5.pDeg, "against Horizons' NP.ang");
  within(
    'b5.ephemeris.l0',
    wl,
    b5.l0Deg,
    "Horizons' L0 is apparent and IAU; the kernel's is geometric and Carrington's"
  );
  // e2
  const s = summariseIrradiance(side);
  const b2 = C['e2.irradiance'].bounds;
  row(
    'e2.irradiance.luminosity',
    rel(s.luminosityW, 3.828e26),
    b2.luminosityRelative,
    rel(s.luminosityW, 3.828e26) <= b2.luminosityRelative,
    `${s.n} measured days (not 14): ${s.luminosityW.toExponential(5)} W against the nominal 3.828e26`
  );
  row(
    'e2.irradiance.teff',
    Math.abs(s.teffK - 5772),
    b2.teffKelvin,
    Math.abs(s.teffK - 5772) <= b2.teffKelvin,
    `${s.teffK.toFixed(2)} K against 5772`
  );
  const rows2 = measuredIrradiance(side);
  within(
    'e2.au',
    Math.max(
      ...rows2.map(r => Math.abs(r.fluxEarth * r.distanceAu ** 2 - r.flux1Au))
    ),
    T2['e2.au'].bounds.wattsPerSquareMetre,
    "LASP's true-Earth column times Horizons' distance squared against LASP's 1 AU column"
  );
  const quoted =
    rows2.reduce((a, r) => a + r.sigma, 0) /
    rows2.length /
    Math.sqrt(rows2.length);
  row(
    'e2.interval',
    s.standardError,
    `not below ${quoted.toFixed(3)}`,
    s.standardError >= quoted,
    `standard error ${s.standardError.toFixed(3)} W/m2 from the scatter against the quoted sigma over root n; it excludes the instrument's absolute accuracy and the Sun's real change over the days`
  );
}

function diskOfDaySide(side, i) {
  const d = side.days[i];
  return {
    cx: d.disc.centrePx[0],
    cy: d.disc.centrePx[1],
    radiusPx: d.disc.radiusPx,
    pDeg: 0,
    b0Deg: d.b0Deg,
    l0Deg: d.l0Deg,
    distanceAu: d.distanceAu,
  };
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  geometryRoundTrip();
  geometrySpecial();
  lawChecks();
  siderealChecks();
  sigmaChecks();
  irradianceChecks();
  trackChecks();
  lawFitChecks();
  oracle();
  coverage();
  limbChecks();
  refusalChecks();
  authentic();
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
        `${tag.padEnd(9)}${r.id.padEnd(34)}${v.padEnd(12)}${b} ${r.note ?? ''}\n`
      );
    }
    process.stdout.write(
      `${out.filter(r => r.pass === false).length} failing, ${Date.now() - t0} ms\n`
    );
  }
  process.exit(out.some(r => r.pass === false) ? 1 : 0);
}
