#!/usr/bin/env node
// =============================================================================
// WCS-lite and registration against their committed thresholds (Prompt 181)
// -----------------------------------------------------------------------------
//   npm run astrometry:validate              print the table
//   npm run astrometry:validate -- --json    print it as JSON
//
// tests/fixtures/astrometry/thresholds.json fixed every bound before
// js/measure/astrometry.js existed (ASTROMETRY.md, "The validation contract").
// This runs the checks against the production module and judges them against
// those bounds, read from the file and not copied. tests/astrometry.test.js
// runs it in plain Node (Jest's VM makes Math reads about ten times slower, so
// an ensemble there would time the harness) and asserts every row.
//
// The scenes are synthetic and carry their truth; the oracle rows read the
// results pinned in tests/fixtures/astrometry/ (astropy and scipy, run offline
// by tools/astrometry-oracle/, never by a test). Nothing here stores a value
// that passes through a trigonometric function: bands, counts and tolerances
// are judged (Node 20, 22 and 24 differ in the last bits). Checks b5 and e1
// need an authentic frame with reference stars (Prompt 189): not run.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as A from '../js/measure/astrometry.js';
import { mulberry32 } from '../js/rng.js';
import { unpackStar } from '../js/kernels/sky/stars.js';
import { unitVector } from '../js/kernels/sky/coords.js';
import { skyOf as pageSkyOf } from '../js/observatory/wcs.js';
import { PACK as TESS } from '../js/data/observations/tessHd209458S56Aperture.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** The authentic header of the repository's TESS aperture image, for the oracle's inputs. */
export const TESS_HEADER = {
  wcs: TESS.image.wcs,
  width: TESS.image.width,
  height: TESS.image.height,
};
const FIX = path.join(HERE, '../tests/fixtures/astrometry');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
export const THRESHOLDS = read('thresholds.json');
const C = THRESHOLDS.checks;
const SC = THRESHOLDS.scenes;
const RAD = Math.PI / 180;
const ARCSEC = RAD / 3600;

// ---- truth, scenes and noise ------------------------------------------------------

/**
 * A truth WCS from what a person says: the scale in arcsec a pixel, the position
 * angle of +y east of north, the parity (-1: east left with north up), an axis
 * ratio (x scale over y scale) and a skew in degrees.
 */
export function truthWcs({
  crval,
  crpix,
  scaleArcsec,
  positionAngleDeg,
  parity,
  axisRatio = 1,
  skewDeg = 0,
}) {
  const s = scaleArcsec / 3600;
  const pa = positionAngleDeg * RAD;
  const uy = [Math.sin(pa), Math.cos(pa)];
  const ux0 = parity < 0 ? [-uy[1], uy[0]] : [uy[1], -uy[0]];
  const k = skewDeg * RAD;
  const ux = [
    ux0[0] * Math.cos(k) - ux0[1] * Math.sin(k),
    ux0[0] * Math.sin(k) + ux0[1] * Math.cos(k),
  ];
  const sx = s * Math.sqrt(axisRatio);
  const sy = s / Math.sqrt(axisRatio);
  return {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: crpix.slice(),
    crval: crval.slice(),
    cd: [
      [ux[0] * sx, uy[0] * sy],
      [ux[1] * sx, uy[1] * sy],
    ],
  };
}

/** A standard normal from a uniform generator (Box-Muller). */
export const gauss = u =>
  Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());

/** The pack's stars by Harvard Revised number, as the pack gives them (J2000.0). */
export function packStars(hrs) {
  const doc = JSON.parse(
    readFileSync(path.join(HERE, '../sky/bright-stars.json'), 'utf8')
  );
  const out = {};
  for (const row of doc.stars)
    if (hrs.includes(row[0])) out[row[0]] = unpackStar(row);
  return out;
}

/** A square grid of n by n pixels from `from` to `to`. */
export const grid = (n, from, to) => {
  const out = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      out.push([
        from + ((to - from) * i) / (n - 1),
        from + ((to - from) * j) / (n - 1),
      ]);
  return out;
};

/** The orion scene: real stars at the pixels a truth WCS gives them, with or without noise. */
export function orionScene({ noise = false } = {}) {
  const S = SC.orion;
  const truth = truthWcs({
    ...S.truth,
    positionAngleDeg: S.truth.positionAngleDeg,
  });
  const hrs = Object.values(S.stars);
  const cat = packStars(hrs);
  const u = mulberry32(S.noise.seed);
  const stars = Object.entries(S.stars).map(([name, hr]) => {
    const s = cat[hr];
    const p = A.pixelOf(truth, s.raDeg, s.decDeg);
    const nx = noise ? gauss(u) * S.noise.sigmaPix : 0;
    const ny = noise ? gauss(u) * S.noise.sigmaPix : 0;
    return {
      id: name,
      hr,
      x: p.x + nx,
      y: p.y + ny,
      truthX: p.x,
      truthY: p.y,
      ra: s.raDeg,
      dec: s.decDeg,
      sigma: S.noise.sigmaPix,
    };
  });
  return { truth, stars };
}

/** The field scene: five synthetic stars on a small field, no noise. */
export function fieldScene() {
  const S = SC.field;
  const truth = truthWcs(S.truth);
  const stars = S.pixels.map(([x, y], i) => ({
    id: `f${i + 1}`,
    x,
    y,
    ...A.skyOf(truth, x, y),
    sigma: 0.1,
  }));
  return { truth, stars };
}

/** The registration scene: twelve sources, their true map, and each frame's centroids. */
export function registrationScene({ noise = true, seed } = {}) {
  const S = SC.registration;
  const u = mulberry32(seed ?? S.noise.seed);
  const th = S.rotationDeg * RAD;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const map = (x, y) => {
    const dx = x - S.about[0];
    const dy = y - S.about[1];
    return [
      c * dx - s * dy + S.about[0] + S.shift[0],
      s * dx + c * dy + S.about[1] + S.shift[1],
    ];
  };
  const pairs = [];
  for (let i = 0; i < S.sources; i++) {
    const a = [50 + u() * 924, 50 + u() * 924];
    pairs.push({ id: `r${i + 1}`, a, truthB: map(...a) });
  }
  for (const p of pairs) {
    const na = noise
      ? [gauss(u) * S.noise.sigmaPix, gauss(u) * S.noise.sigmaPix]
      : [0, 0];
    const nb = noise
      ? [gauss(u) * S.noise.sigmaPix, gauss(u) * S.noise.sigmaPix]
      : [0, 0];
    p.a = [p.a[0] + na[0], p.a[1] + na[1]];
    p.b = [p.truthB[0] + nb[0], p.truthB[1] + nb[1]];
    p.sigmaA = S.noise.sigmaPix;
    p.sigmaB = S.noise.sigmaPix;
  }
  return { map, theta: th, pairs, sigma: S.noise.sigmaPix };
}

/** One random trial of the ensemble: a truth WCS and its stars, noisy as the thresholds say. */
export function trial(i, { similarity = false, catalogNoise = false } = {}) {
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
  const stars = pix.map(([x, y], k) => {
    const sky = A.skyOf(truth, x, y);
    let { ra: r, dec: d } = sky;
    if (catalogNoise) {
      const s = A.tangentOf(truth.crval, r, d);
      const q = A.untangent(
        truth.crval,
        s.xi + gauss(u) * E.catalogSigmaArcsec * ARCSEC,
        s.eta + gauss(u) * E.catalogSigmaArcsec * ARCSEC
      );
      r = q.ra;
      d = q.dec;
    }
    return {
      id: `t${k + 1}`,
      x: x + gauss(u) * E.sigmaPix,
      y: y + gauss(u) * E.sigmaPix,
      ra: r,
      dec: d,
      sigma: E.sigmaPix,
      ...(catalogNoise ? { catalogSigma: E.catalogSigmaArcsec } : {}),
    };
  });
  return { truth, stars, parity };
}

/** Standard-coordinate difference of two WCS of one reference position at a pixel, arcsec (east, north). */
export function offsetDiff(a, b, x, y) {
  const f = w => [
    (w.cd[0][0] * (x - w.crpix[0]) + w.cd[0][1] * (y - w.crpix[1])) * 3600,
    (w.cd[1][0] * (x - w.crpix[0]) + w.cd[1][1] * (y - w.crpix[1])) * 3600,
  ];
  const p = f(a);
  const q = f(b);
  return [p[0] - q[0], p[1] - q[1]];
}

const wrapDeg = d => ((d + 540) % 360) - 180;

// ---- rows -------------------------------------------------------------------------

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

/** The coverage of z values: the fractions inside 1 and 1.96. */
function coverage(zs) {
  const n = zs.length;
  const a = zs.filter(z => Math.abs(z) < 1).length / n;
  const b = zs.filter(z => Math.abs(z) < 1.96).length / n;
  return { n, one: a, two: b };
}
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;

function a1() {
  const t = C['a1.recoverNoiseless'];
  const { truth, stars } = orionScene();
  const f = A.fitWcs(stars, { tangent: truth.crval });
  const g = grid(SC.orion.grid.n, SC.orion.grid.from, SC.orion.grid.to);
  const err = Math.max(
    ...g.map(([x, y]) => {
      const d = offsetDiff(f.wcs, truth, x, y);
      return Math.hypot(d[0], d[1]);
    })
  );
  const dt = A.describeWcs(truth);
  const scaleRel = Math.abs(f.derived.scale - dt.scale) / dt.scale;
  const pa = Math.abs(wrapDeg(f.derived.positionAngle - dt.positionAngle));
  const cr = Math.max(
    Math.abs(f.wcs.crpix[0] - truth.crpix[0]),
    Math.abs(f.wcs.crpix[1] - truth.crpix[1])
  );
  row(
    'a1.recoverNoiseless',
    f.ok &&
      err <= t.boundArcsec &&
      scaleRel <= t.also.scaleRelative &&
      pa <= t.also.positionAngleDeg &&
      cr <= t.also.crpixPix,
    {
      arcsec: err,
      scaleRelative: scaleRel,
      positionAngleDeg: pa,
      crpixPix: cr,
    },
    { ...t.also, boundArcsec: t.boundArcsec }
  );
  const t2 = C['a1.recoverFiveStars'];
  const noisy = orionScene({ noise: true });
  const f2 = A.fitWcs(noisy.stars, { tangent: noisy.truth.crval });
  let worst = 0;
  for (const [x, y] of g) {
    const d = offsetDiff(f2.wcs, noisy.truth, x, y);
    const u = A.uncertaintyAt(f2, x, y);
    worst = Math.max(worst, Math.abs(d[0] / u.east), Math.abs(d[1] / u.north));
  }
  row(
    'a1.recoverFiveStars',
    f2.ok && f2.consistent && worst <= t2.boundSigma,
    {
      worstSigma: worst,
      verdict: f2.verdict,
      chi2: f2.stats.chi2,
      dof: f2.stats.dof,
    },
    t2.boundSigma
  );
}

function a2() {
  const t = C['a2.defaultTangent'];
  const { truth, stars } = fieldScene();
  const f = A.fitWcs(stars);
  const g = grid(21, 1, 1024);
  const err = Math.max(
    ...g.map(([x, y]) => {
      const s = A.skyOf(truth, x, y);
      const p = A.pixelOf(f.wcs, s.ra, s.dec);
      return Math.hypot(p.x - x, p.y - y);
    })
  );
  row('a2.defaultTangent', f.ok && err <= t.boundPix, { pix: err }, t.boundPix);
}

function a3() {
  const t = C['a3.registrationNoiseless'];
  const sc = registrationScene({ noise: false });
  const r = A.register(sc.pairs);
  const worst = Math.max(
    ...sc.pairs.map(p => {
      const m = A.applyRegistration(r, p.a[0], p.a[1]);
      return Math.hypot(m[0] - p.truthB[0], m[1] - p.truthB[1]);
    })
  );
  const rot = Math.abs(r.thetaDeg - SC.registration.rotationDeg);
  row(
    'a3.registrationNoiseless',
    r.ok && worst <= t.boundPix && rot <= t.boundRotationDeg,
    { pix: worst, rotationDeg: rot },
    { pix: t.boundPix, rotationDeg: t.boundRotationDeg }
  );
  const t2 = C['a3.registrationShift'];
  const sn = registrationScene();
  const rn = A.register(sn.pairs);
  const probe = [...sn.pairs.map(p => p.a), SC.registration.about];
  const w2 = Math.max(
    ...probe.map(a => {
      const m = A.applyRegistration(rn, a[0], a[1]);
      const tr = sn.map(a[0], a[1]);
      return Math.hypot(m[0] - tr[0], m[1] - tr[1]);
    })
  );
  row(
    'a3.registrationShift',
    rn.ok && w2 <= t2.boundPix,
    { pix: w2, verdict: rn.verdict },
    t2.boundPix
  );
}

function a4() {
  const t = C['a4.projectionVsKernel'];
  const { truth } = orionScene();
  const T = unitVector(truth.crval[0], truth.crval[1]);
  const a0 = truth.crval[0] * RAD;
  const d0 = truth.crval[1] * RAD;
  const e = [-Math.sin(a0), Math.cos(a0), 0];
  const n = [
    -Math.sin(d0) * Math.cos(a0),
    -Math.sin(d0) * Math.sin(a0),
    Math.cos(d0),
  ];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  let worst = 0;
  let trip = 0;
  let page = 0;
  for (const [x, y] of grid(15, 1, 1024)) {
    const sky = A.skyOf(truth, x, y);
    const p = unitVector(sky.ra, sky.dec);
    const xi = dot(p, e) / dot(p, T);
    const eta = dot(p, n) / dot(p, T);
    // What the pixel says, with no kernel in it: CD (pixel - CRPIX), radians.
    const lx =
      (truth.cd[0][0] * (x - truth.crpix[0]) +
        truth.cd[0][1] * (y - truth.crpix[1])) *
      RAD;
    const ly =
      (truth.cd[1][0] * (x - truth.crpix[0]) +
        truth.cd[1][1] * (y - truth.crpix[1])) *
      RAD;
    worst = Math.max(worst, Math.hypot(xi - lx, eta - ly) / RAD);
    const back = A.pixelOf(truth, sky.ra, sky.dec);
    trip = Math.max(trip, Math.hypot(back.x - x, back.y - y));
    const pg = pageSkyOf(truth, x, y);
    page = Math.max(page, A.separation(sky, pg));
    // The forward direction through the kernel's vectors, too.
    const c = A.tangentOf(truth.crval, sky.ra, sky.dec);
    worst = Math.max(worst, Math.hypot(c.xi - xi, c.eta - eta) / RAD);
  }
  row(
    'a4.projectionVsKernel',
    worst <= t.boundDeg && trip <= t.boundRoundTripPix,
    { deg: worst, roundTripPix: trip },
    { deg: t.boundDeg, roundTripPix: t.boundRoundTripPix }
  );
  const t2 = C['a4.projectionVsPage'];
  row('a4.projectionVsPage', page <= t2.boundDeg, { deg: page }, t2.boundDeg);
}

// ---- the oracle's rows --------------------------------------------------------------

function oracle() {
  let inputs;
  let results;
  try {
    inputs = read('oracle-inputs.json');
    results = read('oracle-results.json');
  } catch {
    for (const id of [
      'b1.oracleProjection',
      'b2.oracleFit',
      'b3.oracleRegistration',
      'b4.oracleAuthenticHeader',
    ])
      row(
        id,
        false,
        'the pinned fixtures are missing',
        C[id].boundDeg ?? C[id].boundPix
      );
    return;
  }
  // b1: pixel to sky of the synthetic truth.
  const t1 = C['b1.oracleProjection'];
  const tw = inputs.projection.wcs;
  let w1 = 0;
  inputs.projection.pixels.forEach(([x, y], i) => {
    const s = A.skyOf(tw, x, y);
    w1 = Math.max(
      w1,
      A.separation(s, {
        ra: results.projection.world[i][0],
        dec: results.projection.world[i][1],
      })
    );
  });
  row('b1.oracleProjection', w1 <= t1.boundDeg, { deg: w1 }, t1.boundDeg);
  // b2: the noisy orion fit against astropy's.
  const t2 = C['b2.oracleFit'];
  const stars = inputs.fit.stars.map(s => ({ ...s }));
  const f = A.fitWcs(stars, { tangent: inputs.fit.tangent });
  let w2 = Infinity;
  if (f.ok) {
    w2 = 0;
    inputs.fit.sky.forEach(([ra, dec], i) => {
      const p = A.pixelOf(f.wcs, ra, dec);
      const q = results.fit.pixels[i];
      w2 = Math.max(w2, Math.hypot(p.x - q[0], p.y - q[1]));
    });
  }
  row('b2.oracleFit', f.ok && w2 <= t2.boundPix, { pix: w2 }, t2.boundPix);
  // b3: registration against scipy's Procrustes.
  const t3 = C['b3.oracleRegistration'];
  const reg = A.register(inputs.registration.pairs);
  const dr = Math.abs(reg.theta - results.registration.theta);
  const dt = Math.max(
    Math.abs(reg.t[0] - results.registration.t[0]),
    Math.abs(reg.t[1] - results.registration.t[1])
  );
  row(
    'b3.oracleRegistration',
    reg.ok && dr <= t3.boundRotationRad && dt <= t3.boundPix,
    { rad: dr, pix: dt },
    { rad: t3.boundRotationRad, pix: t3.boundPix }
  );
  // b4: the authentic header.
  const t4 = C['b4.oracleAuthenticHeader'];
  const h = A.fromHeader(TESS.image.wcs);
  let w4 = Infinity;
  if (h.ok) {
    w4 = 0;
    inputs.header.pixels.forEach(([x, y], i) => {
      const s = A.skyOf(h.wcs, x, y);
      w4 = Math.max(
        w4,
        A.separation(s, {
          ra: results.header.world[i][0],
          dec: results.header.world[i][1],
        })
      );
    });
  }
  row(
    'b4.oracleAuthenticHeader',
    h.ok && w4 <= t4.boundDeg,
    { deg: w4, pixels: inputs.header.pixels.length },
    t4.boundDeg
  );
  notRun('b5.oracleAuthenticFit', C['b5.oracleAuthenticFit'].status);
}

// ---- ensembles ----------------------------------------------------------------------

/** The z values one fitted trial yields for the committed quantities. */
function zsOf(f, truth, { similarity }) {
  const E = SC.ensemble;
  const out = [];
  for (const [x, y] of E.testPixels) {
    const d = offsetDiff(f.wcs, truth, x, y);
    const u = A.uncertaintyAt(f, x, y);
    out.push(d[0] / u.east, d[1] / u.north);
  }
  const dt = A.describeWcs(truth);
  out.push((f.wcs.crpix[0] - truth.crpix[0]) / f.sigmas.crpix[0]);
  out.push((f.wcs.crpix[1] - truth.crpix[1]) / f.sigmas.crpix[1]);
  out.push((f.derived.scale - dt.scale) / f.sigmas.scale);
  out.push(
    wrapDeg(f.derived.positionAngle - dt.positionAngle) / f.sigmas.positionAngle
  );
  if (!similarity) out.push((f.derived.skew - dt.skew) / f.sigmas.skew);
  return out;
}

function ensembles() {
  const E = SC.ensemble;
  const run = (opts, id) => {
    const zs = [];
    let refused = 0;
    let inconsistent = 0;
    for (let i = 0; i < E.trials; i++) {
      const tr = trial(i, opts);
      const f = A.fitWcs(tr.stars, {
        tangent: tr.truth.crval,
        model: opts.similarity ? 'similarity' : 'affine',
        parity: tr.parity,
      });
      if (!f.ok) {
        refused++;
        continue;
      }
      if (!f.consistent) inconsistent++;
      zs.push(...zsOf(f, tr.truth, opts));
    }
    const cv = coverage(zs);
    const t = C[id];
    row(
      id,
      refused === 0 && inBand(cv.one, t.oneSigma) && inBand(cv.two, t.twoSigma),
      { ...cv, refused },
      { oneSigma: t.oneSigma, twoSigma: t.twoSigma }
    );
    return { inconsistent };
  };
  const c1 = run({}, 'c1.coverageAffine');
  run({ similarity: true }, 'c2.coverageSimilarity');
  run({ catalogNoise: true }, 'c3.coverageCatalogue');
  const t4 = C['c4.falseAlarm'];
  row(
    'c4.falseAlarm',
    c1.inconsistent / E.trials <= t4.boundMax,
    { fraction: c1.inconsistent / E.trials, trials: E.trials },
    t4.boundMax
  );
  // c5: registration.
  const R = SC.registration;
  const zs = [];
  for (let i = 0; i < E.trials; i++) {
    const u = mulberry32(R.noise.seed + 1000 + i);
    const th = (u() * 2 - 1) * 2 * RAD;
    const shift = [(u() * 2 - 1) * 20, (u() * 2 - 1) * 20];
    const about = R.about;
    const map = (x, y) => [
      Math.cos(th) * (x - about[0]) -
        Math.sin(th) * (y - about[1]) +
        about[0] +
        shift[0],
      Math.sin(th) * (x - about[0]) +
        Math.cos(th) * (y - about[1]) +
        about[1] +
        shift[1],
    ];
    const pairs = [];
    for (let k = 0; k < R.sources; k++) {
      const a = [50 + u() * 924, 50 + u() * 924];
      const b = map(...a);
      pairs.push({
        a: [
          a[0] + gauss(u) * R.noise.sigmaPix,
          a[1] + gauss(u) * R.noise.sigmaPix,
        ],
        b: [
          b[0] + gauss(u) * R.noise.sigmaPix,
          b[1] + gauss(u) * R.noise.sigmaPix,
        ],
        sigmaA: R.noise.sigmaPix,
        sigmaB: R.noise.sigmaPix,
        trueA: a,
      });
    }
    const r = A.register(pairs);
    zs.push(wrapDeg((r.theta - th) / RAD) / (r.sigmaTheta / RAD));
    for (const [x, y] of E.testPixels) {
      const m = A.applyRegistration(r, x, y);
      const tr = map(x, y);
      const u2 = A.registrationUncertaintyAt(r, x, y);
      zs.push((m[0] - tr[0]) / u2.sx, (m[1] - tr[1]) / u2.sy);
    }
  }
  const cv = coverage(zs);
  const t5 = C['c5.coverageRegistration'];
  row(
    'c5.coverageRegistration',
    inBand(cv.one, t5.oneSigma) && inBand(cv.two, t5.twoSigma),
    cv,
    { oneSigma: t5.oneSigma, twoSigma: t5.twoSigma }
  );
}

// ---- refusals ------------------------------------------------------------------------

function refusals() {
  const E = SC.ensemble;
  // d1: collinear.
  const u = mulberry32(181300);
  let refused = 0;
  for (let i = 0; i < 200; i++) {
    const { truth } = trial(i);
    const a = [50 + u() * 900, 50 + u() * 900];
    const b = [50 + u() * 900, 50 + u() * 900];
    const stars = [0.1, 0.55, 0.9].map((s, k) => {
      const x = a[0] + (b[0] - a[0]) * s;
      const y = a[1] + (b[1] - a[1]) * s;
      const jitter = i % 2 ? 1e-12 * (k + 1) : 0;
      return { x: x + jitter, y, ...A.skyOf(truth, x, y), sigma: 0.15 };
    });
    const f = A.fitWcs(stars);
    if (
      !f.ok &&
      f.status === 'not-constrained' &&
      f.code === 'collinear' &&
      !f.wcs
    )
      refused++;
  }
  row(
    'd1.collinear',
    refused / 200 >= C['d1.collinear'].refused,
    { refused, of: 200 },
    C['d1.collinear'].refused
  );
  // d2: too few.
  const { truth: t2, stars: s2 } = fieldScene();
  const few = [0, 1, 2].map(k => A.fitWcs(s2.slice(0, k)));
  row(
    'd2.tooFew',
    few.every(f => !f.ok && f.code === 'too-few' && !f.wcs),
    few.map(f => f.code),
    1
  );
  // d3: near-collinear: a rectangle of half sides 1 and r in the tangent plane.
  const rect = r => {
    const h = 0.05 * RAD;
    return [
      [-1, -r],
      [-1, r],
      [1, -r],
      [1, r],
    ].map(([a, b], k) => {
      const s = A.untangent(t2.crval, a * h, b * h);
      const p = A.pixelOf(t2, s.ra, s.dec);
      return { id: `q${k}`, x: p.x, y: p.y, ra: s.ra, dec: s.dec, sigma: 0.1 };
    });
  };
  const fa = A.fitWcs(rect(C['d3.nearCollinear'].refusedAt));
  const fb = A.fitWcs(rect(C['d3.nearCollinear'].acceptedAt));
  row(
    'd3.nearCollinear',
    !fa.ok && fa.code === 'collinear' && fb.ok,
    { at001: fa.code ?? 'solved', at005: fb.ok ? 'solved' : fb.code },
    {
      refusedAt: C['d3.nearCollinear'].refusedAt,
      acceptedAt: C['d3.nearCollinear'].acceptedAt,
    }
  );
  // d4: a mismatched catalogue.
  let detected = 0;
  const M = SC.mismatch;
  for (let i = 0; i < M.trials; i++) {
    const tr = trial(i);
    const u4 = mulberry32(M.seed + i);
    const n = tr.stars.length;
    const a = Math.floor(u4() * n);
    let b = Math.floor(u4() * (n - 1));
    if (b >= a) b++;
    const stars = tr.stars.map(s => ({ ...s }));
    [stars[a].ra, stars[b].ra] = [stars[b].ra, stars[a].ra];
    [stars[a].dec, stars[b].dec] = [stars[b].dec, stars[a].dec];
    const f = A.fitWcs(stars, { tangent: tr.truth.crval });
    if (f.ok && f.consistent === false && f.verdict === 'inconsistent')
      detected++;
  }
  row(
    'd4.mismatchedCatalogue',
    detected / M.trials >= C['d4.mismatchedCatalogue'].detectedMin,
    { detected, of: M.trials },
    C['d4.mismatchedCatalogue'].detectedMin
  );
  // d5: unsupported projections, by name.
  const good = TESS.image.wcs;
  const cases = [
    [{ ctype: ['RA---SIN', 'DEC--SIN'] }, 'projection', 'SIN'],
    [{ ctype: ['RA---ARC', 'DEC--ARC'] }, 'projection', 'ARC'],
    [{ ctype: ['RA---ZPN', 'DEC--ZPN'] }, 'projection', 'ZPN'],
    [{ ctype: ['RA---AIT', 'DEC--AIT'] }, 'projection', 'AIT'],
    [{ ctype: ['RA---CAR', 'DEC--CAR'] }, 'projection', 'CAR'],
    [{ ctype: ['RA---TAN-SIP', 'DEC--TAN-SIP'] }, 'distortion', 'SIP'],
    [{ ctype: ['RA---TPV', 'DEC--TPV'] }, 'distortion', 'TPV'],
    [{ ctype: ['GLON-TAN', 'GLAT-TAN'] }, 'axes', 'GLON'],
    [{ ctype: ['RA---TAN', 'DEC--TAN', 'FREQ'] }, 'axes', '3'],
    [{ cdelt: undefined, pc: undefined }, 'incomplete', 'CD'],
    [
      {
        cdelt: [1e-3, 1e-3],
        pc: [
          [1, 2],
          [0.5, 1],
        ],
      },
      'singular',
      'singular',
    ],
  ];
  const outcomes = cases.map(([patch, code, name]) => {
    const r = A.fromHeader({ ...good, ...patch });
    return {
      code,
      got: r.ok ? 'read' : r.code,
      named: !r.ok && r.message.includes(name),
    };
  });
  row(
    'd5.unsupportedProjections',
    outcomes.every(o => o.got === o.code && o.named),
    outcomes.filter(o => o.got !== o.code || !o.named),
    1
  );
  // d6: too wide.
  const wide = [0, 40, 80, 120, 160].map((ra, k) => ({
    id: `w${k}`,
    x: 100 + k * 150,
    y: 200 + (k % 2) * 400,
    ra,
    dec: k % 2 ? 10 : -10,
    sigma: 0.1,
  }));
  const fw = A.fitWcs(wide);
  const fw2 = A.fitWcs(wide, { tangent: [0, 0] });
  row(
    'd6.tooWide',
    !fw.ok && fw.code === 'too-wide' && !fw2.ok && fw2.code === 'too-wide',
    { default: fw.code, given: fw2.code },
    1
  );
  // d7: malformed.
  const base = fieldScene().stars;
  const bads = [
    { ...base[0], x: NaN },
    { ...base[0], ra: Infinity },
    { ...base[0], sigma: 0 },
    { ...base[0], dec: 91 },
  ].map(s => A.fitWcs([s, ...base.slice(1)]));
  // Two stars at one pixel: the second moved onto the first.
  bads.push(
    A.fitWcs([
      base[0],
      { ...base[1], x: base[0].x, y: base[0].y },
      ...base.slice(2),
    ])
  );
  row(
    'd7.malformed',
    bads.every(
      f => !f.ok && !f.wcs && ['malformed', 'duplicate'].includes(f.code)
    ),
    bads.map(f => f.code),
    1
  );
  // d8: registration refusals.
  const sc = registrationScene();
  const r2 = A.register(sc.pairs.slice(0, 2));
  const rd = A.register(
    sc.pairs.map(p => ({
      ...p,
      a: [100 + (p.a[0] % 0.2), 100 + (p.a[1] % 0.2)],
    }))
  );
  let flagged = 0;
  for (let i = 0; i < 500; i++) {
    const u8 = mulberry32(181400 + i);
    const s8 = registrationScene({ seed: 181400 + i });
    const idx = s8.pairs.map((_, k) => k);
    for (let k = idx.length - 1; k > 0; k--) {
      const j = Math.floor(u8() * (k + 1));
      [idx[k], idx[j]] = [idx[j], idx[k]];
    }
    const mis = s8.pairs.map((p, k) => ({ ...p, b: s8.pairs[idx[k]].b }));
    const r = A.register(mis);
    if (r.ok && r.consistent === false) flagged++;
  }
  row(
    'd8.registrationRefusals',
    !r2.ok &&
      r2.code === 'too-few' &&
      !rd.ok &&
      rd.code === 'degenerate' &&
      flagged / 500 >= C['d8.registrationRefusals'].detectedMin,
    { tooFew: r2.code, degenerate: rd.code, flagged, of: 500 },
    C['d8.registrationRefusals'].detectedMin
  );
  // d9: residuals always.
  const ok = A.fitWcs(base, { tangent: SC.field.truth.crval });
  const exact = A.fitWcs(base.slice(0, 3), { tangent: SC.field.truth.crval });
  row(
    'd9.residualsAlways',
    ok.residuals.length === base.length &&
      ok.residuals.every(
        r => Number.isFinite(r.pix) && Number.isFinite(r.arcsec)
      ) &&
      Number.isInteger(ok.stats.dof) &&
      typeof ok.verdict === 'string' &&
      exact.residuals.length === 3 &&
      exact.stats.dof === 0 &&
      exact.verdict === 'exact' &&
      exact.consistent === null,
    { dof: ok.stats.dof, exact: exact.verdict },
    true
  );
  notRun('e1.authenticFrame', C['e1.authenticFrame'].status);
  void E;
}

/** Run every check; the table. */
export function validate() {
  rows.length = 0;
  a1();
  a2();
  a3();
  a4();
  oracle();
  ensembles();
  refusals();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const table = validate();
  if (process.argv.includes('--json'))
    process.stdout.write(`${JSON.stringify(table, null, 2)}\n`);
  else {
    for (const r of table)
      process.stdout.write(
        `${r.pass === null ? 'NOT RUN' : r.pass ? 'pass   ' : 'FAIL   '} ${r.id.padEnd(28)} ${JSON.stringify(r.measured)}  (bound ${JSON.stringify(r.bound)})\n`
      );
    const failed = table.filter(r => r.pass === false).length;
    process.stdout.write(`${table.length} rows, ${failed} failed\n`);
    process.exitCode = failed ? 1 : 0;
  }
}
