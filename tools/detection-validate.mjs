#!/usr/bin/env node
// =============================================================================
// Detection and the PSF against their committed thresholds (Prompt 183)
// -----------------------------------------------------------------------------
//   npm run detection:validate               print the table
//   npm run detection:validate -- --json     print it as JSON
//
// tests/fixtures/detection/thresholds.json fixed every bound before
// js/measure/detect.js existed (DETECTION.md, "The validation contract"). This
// runs the checks against the production module and judges them against those
// bounds, read from the file and not copied. tests/detection.test.js runs it in
// plain Node (Jest's VM makes Math and Float64Array reads about ten times
// slower, so an ensemble there would time the harness) and asserts every row.
//
// The ensembles are the detector kernel's frames (tools/detection-synth.mjs)
// with their truth; the oracle's rows read the pixels and the photutils results
// pinned in tests/fixtures/detection/. Nothing here stores a value that passes
// through exp, log or a trigonometric function: bands, counts and tolerances
// are judged (Node 20, 22 and 24 differ in the last bits). Check e2.authentic
// is reported as not run: it needs Prompt 189's frame.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { permits } from '../js/dataKinds/contract.js';
import { adapt } from '../js/measure/photometry.js';
import {
  detect,
  fitStar,
  gaussianKernel,
  meshMap,
  measurePsf,
  profileWidth,
  radial,
  selectStars,
  smooth,
  stack,
} from '../js/measure/detect.js';
import {
  FWHM_PER_SIGMA,
  SCENE,
  THRESHOLDS,
  gridStars,
  makeFrame,
  rngOf,
  sidecar,
} from './detection-synth.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, '../tests/fixtures/detection');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const C = THRESHOLDS.checks;
/** Legs that fail as committed, recorded with their cause (failed-legs.json). */
export const RECORDED = read('failed-legs.json').legs;
const W = SCENE.detector.width;
const SIGMA_PSF = SCENE.detector.fwhm / FWHM_PER_SIGMA;
const R_AP = 1.5 * SCENE.detector.fwhm;
/** The encircled energy of a Gaussian at the aperture radius (the analytic reference of a1.flux). */
const EE = 1 - Math.exp(-(R_AP * R_AP) / (2 * SIGMA_PSF * SIGMA_PSF));
const MATCH = SCENE.matchRadius;

const rows = [];
const add = (id, measured, ok, extra = {}) =>
  rows.push({ id, measured, pass: Boolean(ok), ...extra });
/** A row that is not one of the committed legs: evidence added after a first run, never a verdict. */
const evidence = (id, measured, note) =>
  rows.push({ id: `x.${id}`, measured, pass: true, evidence: true, note });
const within = (v, [lo, hi]) => v >= lo && v <= hi;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const rms = a => Math.sqrt(mean(a.map(v => v * v)));
const frac = (n, d) => n / d;

const seedOf = (label, k) => `${SCENE.seedPrefix}-${label}-${k}`;
const stars12 = (label, k, flux, extra = {}) =>
  gridStars(rngOf(label, k)).map(p => ({ ...p, flux, ...extra }));
const nearest = (list, x, y) =>
  list.reduce(
    (b, s) =>
      !b || Math.hypot(s.x - x, s.y - y) < Math.hypot(b.x - x, b.y - y) ? s : b,
    null
  );
const dist = (s, t) => Math.hypot(s.x - t.x, s.y - t.y);
const run = (frame, fwhm = SCENE.detector.fwhm) => {
  const d = detect(frame, permits, { fwhm });
  if (!d.ok) throw new Error(`${frame.id}: refused, ${d.code}`);
  return d;
};

/** Match truth stars to detections within the radius; unmatched detections are false. */
function match(d, truth) {
  const used = new Set();
  const pairs = truth.map(t => {
    const s = nearest(d.sources, t.x, t.y);
    if (s && dist(s, t) <= MATCH) {
      used.add(s.id);
      return { t, s };
    }
    return { t, s: null };
  });
  return { pairs, falses: d.sources.filter(s => !used.has(s.id)).length };
}

// ---- a1: depths, false positives, recovery, position, flux -----------------------

function depths() {
  const T = {
    fp: C['a1.falsePositives'],
    rec: C['a1.recovery'],
    pos: C['a1.position'],
    flux: C['a1.flux'],
  };
  const fpRate = (id, n, frames, note) =>
    add(`a1.falsePositives.${id}`, n / frames, n / frames <= T.fp.bound, {
      bound: T.fp.bound,
      note: `${n} in ${frames} frames${note ?? ''}`,
    });
  // sky and noise only
  let n = 0;
  for (let k = 0; k < T.fp.frames.blank; k++)
    n += run(makeFrame({ seed: seedOf('blank', k) })).sources.length;
  fpRate('blank', n, T.fp.frames.blank);
  // a strong gradient and no stars (d1)
  n = 0;
  const g = T.fp.gradient;
  for (let k = 0; k < T.fp.frames.gradient; k++)
    n += run(
      makeFrame({
        seed: seedOf('gradient', k),
        plane: { x: g.slopeAduX, y: g.slopeAduY },
      })
    ).sources.length;
  fpRate(
    'gradient',
    n,
    T.fp.frames.gradient,
    '; d1: a plane of 15 and 11 sigma'
  );
  // twelve stars a frame at each depth
  for (const [name, flux] of Object.entries(SCENE.depths)) {
    let falses = 0;
    let found = 0;
    let stars = 0;
    const err = [];
    const z = [];
    let nulls = 0;
    for (let k = 0; k < T.fp.frames.depth; k++) {
      const truth = stars12(`depth-${name}`, k, flux);
      const d = run(
        makeFrame({ seed: seedOf(`depth-${name}`, k), stars: truth })
      );
      const m = match(d, truth);
      falses += m.falses;
      for (const { t, s } of m.pairs) {
        stars++;
        if (!s) continue;
        found++;
        err.push(dist(s, t));
        if (s.flux === null) nulls++;
        else z.push((s.flux - flux * EE) / s.fluxSigma);
      }
    }
    fpRate(
      name,
      falses,
      T.fp.frames.depth,
      `; ${stars} stars of ${flux} electrons`
    );
    add(`a1.recovery.${name}`, found / stars, found / stars >= T.rec.bound, {
      bound: T.rec.bound,
      note: `${found} of ${stars}`,
    });
    add(`a1.position.${name}`, rms(err), rms(err) <= T.pos.bounds[name], {
      bound: T.pos.bounds[name],
    });
    add(
      `a1.flux.mean.${name}`,
      mean(z),
      Math.abs(mean(z)) <= T.flux.meanBound,
      {
        bound: T.flux.meanBound,
        note: `${nulls} without a flux`,
      }
    );
    add(`a1.flux.rms.${name}`, rms(z), within(rms(z), T.flux.rmsBounds), {
      bound: T.flux.rmsBounds,
    });
  }
}

// ---- a2: shape moments -----------------------------------------------------------

const angleDiff = (a, b) => {
  const d = Math.abs(a - b) % 180;
  return d > 90 ? 180 - d : d;
};

function shapes() {
  const T = C['a2.shape'];
  const thetas = [-75, -30, 15, 45, 80];
  const trueE = 1 - 1.2 / 2.2;
  const de = [];
  const dth = [];
  for (let k = 0; k < T.frames; k++) {
    const truth = stars12('ellipse', k, 30000).map((s, i) => ({
      ...s,
      psf: {
        kind: 'ellipse',
        sigmaA: 2.2,
        sigmaB: 1.2,
        thetaDeg: thetas[(k * 12 + i) % 5],
      },
    }));
    const d = run(makeFrame({ seed: seedOf('ellipse', k), stars: truth }));
    for (const { t, s } of match(d, truth).pairs)
      if (s?.shape) {
        de.push(s.ellipticity - trueE);
        dth.push(angleDiff(s.orientation, t.psf.thetaDeg));
      }
  }
  add(
    'a2.shape.ellipticity',
    mean(de),
    Math.abs(mean(de)) <= T.ellipticityMeanBound,
    {
      bound: T.ellipticityMeanBound,
      note: `${de.length} stars of ellipticity ${trueE.toFixed(4)}`,
    }
  );
  add(
    'a2.shape.orientation',
    mean(dth),
    mean(dth) <= T.orientationMeanBoundDegrees,
    {
      bound: T.orientationMeanBoundDegrees,
      note: 'mean absolute error, degrees',
    }
  );
  let round = 0;
  let all = 0;
  for (let k = 0; k < T.roundFraction.frames; k++) {
    const truth = stars12('round', k, 30000).map(s => ({
      ...s,
      psf: { kind: 'ellipse', sigmaA: SIGMA_PSF, sigmaB: SIGMA_PSF },
    }));
    const d = run(makeFrame({ seed: seedOf('round', k), stars: truth }));
    for (const { s } of match(d, truth).pairs) {
      all++;
      if (s?.shape && s.ellipticity <= T.roundFraction.ellipticityMax) round++;
    }
  }
  add(
    'a2.shape.round',
    round / all,
    round / all >= T.roundFraction.fractionMin,
    {
      bound: T.roundFraction.fractionMin,
      note: `${round} of ${all} circular stars with ellipticity at most ${T.roundFraction.ellipticityMax}`,
    }
  );
}

// ---- a3, a4: the PSF against the truth ---------------------------------------------

/** Measure the PSF of a frame from the detections the selection keeps. */
function psfOf(frame, fwhm, o = {}) {
  const d = run(frame, fwhm);
  const a = adapt(frame, permits);
  const stars = selectStars(d).map(s => ({
    id: s.id,
    x: s.x,
    y: s.y,
    flux: s.flux,
    fwhm: s.fwhm,
  }));
  return { d, a, psf: measurePsf(a, d, stars, o), stars };
}

function psfTruth() {
  const T = C['a3.psfGaussian'];
  const rows3 = {};
  for (const w of T.fwhm) {
    const err = [];
    const frameErr = [];
    const keep = [];
    for (let k = 0; k < T.frames; k++) {
      const truth = stars12(`psf-${w}`, k, T.flux);
      const frame = makeFrame({
        seed: seedOf(`psf-${w}`, k),
        stars: truth,
        detector: { fwhm: w },
      });
      const { d, a, psf } = psfOf(frame, w);
      if (!psf.ok) {
        frameErr.push(Infinity);
        continue;
      }
      for (const f of psf.stars) err.push((f.fwhm - w) / w);
      frameErr.push(Math.abs(psf.fwhm.mean - w) / w);
      if (w === 3) keep.push({ frame, d, a, psf, truth });
    }
    const bias = mean(err);
    add(`a3.psfGaussian.bias.${w}`, bias, Math.abs(bias) <= T.biasBound, {
      bound: T.biasBound,
      note: `${err.length} stars of ${T.flux} electrons, FWHM ${w}`,
    });
    const worst = Math.max(...frameErr);
    add(`a3.psfGaussian.frame.${w}`, worst, worst <= T.frameBound, {
      bound: T.frameBound,
    });
    rows3[w] = keep;
  }
  profiles(rows3[3]);
  moffat();
}

function profiles(kept) {
  const T = C['a4.profile'];
  let zMax = 0;
  let wMax = 0;
  const zs = [];
  for (const { frame, psf, truth } of kept) {
    const ids = psf.stars;
    const profs = ids.map(f => {
      const t = nearest(truth, f.x, f.y);
      return radial(
        {
          image: { width: W, values: frame.truth.signal },
          mask: null,
        },
        { half: f.half, x: t.x, y: t.y, flux: t.flux },
        p => frame.truth.signal[p]
      );
    });
    const want = stack(profs);
    for (let b = 0; b < T.bins; b++) {
      const z =
        Math.abs(psf.profile[b].value - want[b].value) / psf.profile[b].sem;
      zMax = Math.max(zMax, z);
      zs.push((psf.profile[b].value - want[b].value) / psf.profile[b].sem);
    }
    const w1 = profileWidth(psf.profile);
    const w0 = profileWidth(want);
    wMax = Math.max(wMax, Math.abs(w1 - w0) / w0);
  }
  add('a4.profile.z', zMax, zMax <= T.zBound, {
    bound: T.zBound,
    note: `largest of the first ${T.bins} bins over ${kept.length} frames`,
  });
  evidence(
    'a4.profile.zRms',
    rms(zs),
    `added after the first run: the root mean square of the signed z over the ${zs.length} values (mean ${mean(zs).toFixed(3)}); the innermost bin holds one to six pixels, so its standard error is estimated from two to five stars and z there is a heavy-tailed Student t`
  );
  add('a4.profile.width', wMax, wMax <= T.widthBound, { bound: T.widthBound });
}

function moffat() {
  const T = C['a3.psfMoffat'];
  const err = [];
  for (let k = 0; k < T.frames; k++) {
    const truth = stars12('moffat', k, T.flux, {
      psf: { kind: 'moffat', fwhm: T.fwhm, beta: T.beta },
    });
    const { psf } = psfOf(
      makeFrame({ seed: seedOf('moffat', k), stars: truth }),
      T.fwhm,
      { model: 'moffat' }
    );
    if (psf.ok) for (const f of psf.stars) err.push((f.fwhm - T.fwhm) / T.fwhm);
  }
  add('a3.psfMoffat.bias', mean(err), Math.abs(mean(err)) <= T.biasBound, {
    bound: T.biasBound,
    note: `${err.length} stars, FWHM ${T.fwhm}, beta ${T.beta}`,
  });
}

// ---- b: the oracle -------------------------------------------------------------------

const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));

function oracle() {
  const inputs = read('oracle-inputs.json');
  const results = read('oracle-results.json');
  let meshWorst = 0;
  let mapWorst = 0;
  let smoothWorst = 0;
  let countsOk = 0;
  let shaOk = 0;
  let areasOk = true;
  let propWorst = 0;
  let orientWorst = 0;
  let gaussWorst = 0;
  let tightWorst = 0;
  let betaWorst = 0;
  let moffatWorst = 0;
  let fitsDone = 0;
  let moffatDone = 0;
  const T = C;
  for (const f of inputs.frames) {
    const buf = Buffer.from(f.adu, 'base64');
    const adu = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
    const mask = f.mask.length ? new Uint8Array(f.width * f.height) : null;
    for (const i of f.mask) mask[i] = 1;
    const frame = {
      id: f.id,
      width: f.width,
      height: f.height,
      data: Float64Array.from(adu),
      mask,
      sidecar: sidecar(f.width, f.height, f.id),
    };
    const d = detect(frame, permits, { fwhm: f.fwhm });
    const o = results.frames[f.id];
    const flat = m => m.flat();
    d.mesh.level.forEach((v, i) => {
      meshWorst = Math.max(meshWorst, rel(v, flat(o.levelMesh)[i]));
      meshWorst = Math.max(
        meshWorst,
        rel(d.mesh.noise[i], flat(o.noiseMesh)[i])
      );
    });
    const lvl = meshMap(d.mesh, 'level', f.width, f.height);
    const noi = meshMap(d.mesh, 'noise', f.width, f.height);
    o.sampleIndices.forEach((k, i) => {
      mapWorst = Math.max(
        mapWorst,
        rel(lvl[k], o.level[i]),
        rel(noi[k], o.noise[i])
      );
    });
    // the smoothed image and threshold at the sampled pixels
    smoothWorst = Math.max(smoothWorst, smoothAgreement(d, frame, o, lvl, noi));
    const pix = [];
    d.labels.forEach((l, i) => {
      if (l) pix.push(i);
    });
    const sha = createHash('sha256')
      .update(Buffer.from(Int32Array.from(pix).buffer))
      .digest('hex');
    if (sha === o.segmentPixelsSha256) shaOk++;
    if (d.sources.length === o.sources.length) countsOk++;
    for (const s of d.sources) {
      const q = nearest(o.sources, s.x, s.y);
      if (s.area !== q.area) areasOk = false;
      for (const [x, y] of [
        [s.x, q.x],
        [s.y, q.y],
        [s.semimajor, q.semimajor],
        [s.semiminor, q.semiminor],
        [s.ellipticity, q.ellipticity],
        [s.peak, q.peak],
        [s.segmentFlux, q.flux],
      ])
        propWorst = Math.max(propWorst, rel(x, y));
      orientWorst = Math.max(
        orientWorst,
        angleDiff(s.orientation, q.orientation)
      );
    }
    const a = adapt(frame, permits);
    for (const fit of o.fits) {
      const q = o.sources[fit.source];
      const s = nearest(d.sources, q.x, q.y);
      const mine = fitStar(
        a,
        d,
        { x: s.x, y: s.y, fwhm: s.fwhm },
        { weights: 'none', half: fit.half }
      );
      if (!mine.ok) {
        gaussWorst = Infinity;
        continue;
      }
      fitsDone++;
      gaussWorst = Math.max(gaussWorst, rel(mine.fwhm, fit.fwhm));
      tightWorst = Math.max(tightWorst, rel(mine.fwhm, fit.fwhmTight));
    }
    for (const fit of o.moffatFits) {
      const q = o.sources[fit.source];
      const s = nearest(d.sources, q.x, q.y);
      const mine = fitStar(
        a,
        d,
        { x: s.x, y: s.y, fwhm: s.fwhm },
        { weights: 'none', half: fit.half, model: 'moffat' }
      );
      if (!mine.ok) {
        moffatWorst = Infinity;
        continue;
      }
      moffatDone++;
      moffatWorst = Math.max(moffatWorst, rel(mine.fwhm, fit.fwhm));
      betaWorst = Math.max(betaWorst, rel(mine.beta, fit.beta));
    }
  }
  const n = inputs.frames.length;
  add('b1.mesh', meshWorst, meshWorst <= T['b1.mesh'].bound, {
    bound: T['b1.mesh'].bound,
    note: 'box background and noise, photutils Background2D',
  });
  add('b1.maps', mapWorst, mapWorst <= T['b1.mesh'].bound, {
    bound: T['b1.mesh'].bound,
    note: 'interpolated maps, scipy RegularGridInterpolator',
  });
  add(
    'b2.smoothed',
    smoothWorst,
    smoothWorst <= T['b2.segmentation'].boundSmoothed,
    {
      bound: T['b2.segmentation'].boundSmoothed,
      note: 'smoothed image and threshold at the sampled pixels, astropy convolve',
    }
  );
  add('b2.segmentation.counts', countsOk, countsOk === n, {
    bound: n,
    note: 'frames with the same number of sources',
  });
  add('b2.segmentation.pixels', shaOk, shaOk === n, {
    bound: n,
    note: 'frames whose segmented pixels are the same set (SHA-256)',
  });
  add('b2.segmentation.areas', areasOk ? 1 : 0, areasOk, {
    bound: 1,
    note: 'every segment has the same pixel count',
  });
  add(
    'b2.properties',
    propWorst,
    propWorst <= T['b2.segmentation'].boundProperties,
    {
      bound: T['b2.segmentation'].boundProperties,
      note: 'position, moments, ellipticity, peak, flux against SourceCatalog',
    }
  );
  add(
    'b2.orientation',
    orientWorst,
    orientWorst <= T['b2.segmentation'].boundOrientationDegrees,
    {
      bound: T['b2.segmentation'].boundOrientationDegrees,
      note: 'degrees',
    }
  );
  add(
    'b3.fwhmGaussian',
    gaussWorst,
    fitsDone > 0 && gaussWorst <= T['b3.fwhmGaussian'].bound,
    {
      bound: T['b3.fwhmGaussian'].bound,
      note: `${fitsDone} fits against photutils fit_fwhm`,
    }
  );
  evidence(
    'b3.fwhmGaussianTight',
    tightWorst,
    'added after the first run: the same objective by scipy least_squares over CircularGaussianPRF at tolerances of 1e-15; fit_fwhm exposes no tolerance and agrees with it to 1.3e-4, which is the whole of b3'
  );
  add(
    'b4.fwhmMoffat',
    moffatWorst,
    moffatDone > 0 && moffatWorst <= T['b4.fwhmMoffat'].boundFwhm,
    {
      bound: T['b4.fwhmMoffat'].boundFwhm,
      note: `${moffatDone} fits against scipy least_squares over MoffatPSF`,
    }
  );
  add(
    'b4.betaMoffat',
    betaWorst,
    moffatDone > 0 && betaWorst <= T['b4.fwhmMoffat'].boundBeta,
    {
      bound: T['b4.fwhmMoffat'].boundBeta,
    }
  );
}

/** The smoothed image and the threshold at the oracle's sampled pixels, from the kernel's own pieces. */
function smoothAgreement(d, frame, o, lvl, noi) {
  const { width: Wd, height: Ht } = frame;
  const valid = new Uint8Array(Wd * Ht);
  const sub = new Float64Array(Wd * Ht);
  const a = adapt(frame, permits);
  for (let i = 0; i < Wd * Ht; i++)
    if (!frame.mask?.[i]) {
      valid[i] = 1;
      sub[i] = a.image.values[i] - lvl[i];
    }
  const sm = smooth(sub, noi, valid, Wd, Ht, gaussianKernel(d.params.fwhm));
  let worst = 0;
  o.sampleIndices.forEach((k, i) => {
    if (frame.mask?.[k]) return;
    worst = Math.max(
      worst,
      rel(sm.value[k], o.smoothed[i]),
      rel(d.params.sigma * sm.sd[k], o.threshold[i])
    );
  });
  return worst;
}

// ---- c: coverage -----------------------------------------------------------------------

/** Fit every unflagged detection of a frame (positions from the detections), one star each. */
function fitFrame(frame) {
  const d = run(frame);
  const a = adapt(frame, permits);
  const fits = d.sources
    .filter(s => !s.flags.length && s.shape)
    .map(s =>
      fitStar(a, d, { x: s.x, y: s.y, flux: s.flux ?? undefined, fwhm: s.fwhm })
    );
  return fits;
}

function coverage() {
  const T = C['c1.coverage68'];
  const T95 = C['c1.coverage95'];
  const truth = SCENE.detector.fwhm;
  let midLimited = 0;
  let midCount = 0;
  for (const [name, flux] of Object.entries(T.levels)) {
    const z = [];
    let attempted = 0;
    let k = 0;
    while (attempted < T.stars) {
      const frame = makeFrame({
        seed: seedOf(`cover-${name}`, k),
        stars: stars12(`cover-${name}`, k, flux),
      });
      for (const f of fitFrame(frame)) {
        if (attempted >= T.stars) break;
        attempted++;
        z.push(f.ok ? (f.fwhm - truth) / f.sigma.fwhm : Infinity);
        if (name === 'mid' && f.ok) {
          midCount++;
          if (f.modelLimited) midLimited++;
        }
      }
      k++;
    }
    const p68 = frac(z.filter(v => Math.abs(v) <= 1).length, z.length);
    const p95 = frac(z.filter(v => Math.abs(v) <= 1.96).length, z.length);
    add(`c1.coverage68.${name}`, p68, within(p68, T.bounds), {
      bound: T.bounds,
      note: `${z.length} stars of ${flux} electrons`,
    });
    add(`c1.coverage95.${name}`, p95, within(p95, T95.bounds), {
      bound: T95.bounds,
    });
  }
  // the combination over a frame's stars
  const T2 = C['c2.combinedCoverage'];
  let in68 = 0;
  let in95 = 0;
  for (let k = 0; k < T2.frames; k++) {
    const frame = makeFrame({
      seed: seedOf('combined', k),
      stars: stars12('combined', k, T2.flux),
    });
    const { psf } = psfOf(frame, SCENE.detector.fwhm);
    const z = psf.ok
      ? Math.abs(psf.fwhm.mean - truth) / psf.fwhm.sigma
      : Infinity;
    if (z <= 1) in68++;
    if (z <= 1.96) in95++;
  }
  add(
    'c2.combinedCoverage.68',
    in68 / T2.frames,
    within(in68 / T2.frames, T2.bounds68),
    { bound: T2.bounds68 }
  );
  add(
    'c2.combinedCoverage.95',
    in95 / T2.frames,
    within(in95 / T2.frames, T2.bounds95),
    { bound: T2.bounds95 }
  );
  return { midLimited, midCount };
}

// ---- d: refusals and negative cases ---------------------------------------------------

function negatives(mid) {
  const rng = rngOf('negatives');
  // d2: a saturated star
  const T2 = C['d2.saturated'];
  let flagged = 0;
  let left = 0;
  let refused = 0;
  for (let k = 0; k < T2.trials; k++) {
    const x = 40 + 48 * rng();
    const y = 40 + 48 * rng();
    const frame = makeFrame({
      seed: seedOf('saturated', k),
      stars: [{ x, y, flux: T2.flux }],
      detector: { fullWell: T2.fullWell },
    });
    const d = run(frame);
    const s = nearest(d.sources, x, y);
    if (s && dist(s, { x, y }) <= MATCH) {
      if (s.flags.includes('saturated')) flagged++;
      if (!selectStars(d).some(q => q.id === s.id)) left++;
      const f = fitStar(adapt(frame, permits), d, { x: s.x, y: s.y });
      if (!f.ok && f.code === 'saturated' && f.fwhm === undefined) refused++;
    }
  }
  add(
    'd2.saturated.flagged',
    flagged / T2.trials,
    flagged / T2.trials >= T2.flaggedMin,
    { bound: T2.flaggedMin }
  );
  add('d2.saturated.selection', left, left === T2.trials, {
    bound: T2.trials,
    note: 'left out of the selection',
  });
  add('d2.saturated.fit', refused, refused === T2.trials, {
    bound: T2.trials,
    note: 'refused with the code saturated and no FWHM',
  });
  // d3: single-pixel events and stars
  const T3 = C['d3.sharp'];
  let hit = 0;
  for (let k = 0; k < T3.events / 4; k++) {
    const hot = [0, 1, 2, 3].map(i => ({
      x: 12 + 32 * i + Math.floor(8 * rng()),
      y: 20 + Math.floor(80 * rng()),
      adu: T3.eventElectrons / SCENE.detector.gain,
    }));
    const d = run(makeFrame({ seed: seedOf('events', k), hot }));
    for (const h of hot) {
      const s = nearest(d.sources, h.x, h.y);
      if (s && dist(s, h) <= MATCH && s.flags.includes('sharp')) hit++;
    }
  }
  add('d3.sharp.events', hit / T3.events, hit / T3.events >= T3.flaggedMin, {
    bound: T3.flaggedMin,
    note: `${hit} of ${T3.events}`,
  });
  let sharp = 0;
  let stars = 0;
  for (const w of [3, 2]) {
    for (let k = 0; k < 25; k++) {
      const truth = stars12(`sharp-${w}`, k, 6000);
      const d = run(
        makeFrame({
          seed: seedOf(`sharp-${w}`, k),
          stars: truth,
          detector: { fwhm: w },
        }),
        w
      );
      for (const { s } of match(d, truth).pairs) {
        stars++;
        if (s?.flags.includes('sharp')) sharp++;
      }
    }
  }
  add('d3.sharp.stars', sharp / stars, sharp / stars <= T3.starFlaggedMax, {
    bound: T3.starFlaggedMax,
    note: `${sharp} of ${stars} stars at FWHM 3 and 2`,
  });
  masks(rng);
  contracts();
  edges(rng);
  pairs();
  modelLimited(mid);
}

function masks(rng) {
  const T = C['d4.masks'];
  let clean = 0;
  let beside = 0;
  let hotNone = 0;
  for (let k = 0; k < T.frames; k++) {
    const stars = stars12('masked', k, 3000);
    const mask = new Uint8Array(W * W);
    const cx = Math.round(stars[0].x);
    const cy = Math.round(stars[0].y);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
    ])
      mask[(cy + dy) * W + cx + dx] = 1;
    // between the grid's cells, where no star is: x in 28 to 36, y in 40 to 50
    const hx = 28 + Math.floor(8 * rng());
    const hy = 40 + Math.floor(10 * rng());
    mask[hy * W + hx] = 1;
    const d = run(
      makeFrame({
        seed: seedOf('masked', k),
        stars,
        mask,
        hot: [{ x: hx, y: hy, adu: 66667 }],
      })
    );
    if (d.labels.every((l, i) => !(l && mask[i]))) clean++;
    const s = nearest(d.sources, stars[0].x, stars[0].y);
    if (s && dist(s, stars[0]) <= MATCH && s.flags.includes('masked')) beside++;
    if (!d.sources.some(q => Math.hypot(q.x - hx, q.y - hy) <= MATCH))
      hotNone++;
  }
  add(
    'd4.masks.segments',
    clean / T.frames,
    clean / T.frames >= T.noSegmentOnMaskMin,
    { bound: T.noSegmentOnMaskMin }
  );
  add(
    'd4.masks.flag',
    beside / T.frames,
    beside / T.frames >= T.maskedFlagMin,
    { bound: T.maskedFlagMin }
  );
  add(
    'd4.masks.hot',
    hotNone / T.frames,
    hotNone / T.frames >= T.hotMaskedNoSourceMin,
    { bound: T.hotMaskedNoSourceMin }
  );
}

function contracts() {
  const f = makeFrame({ seed: seedOf('contract', 0) });
  const base = f.sidecar;
  const cases = {
    'display-only': { ...base, use: 'display-only' },
    'no-contract': null,
    'not-flux': { ...base, pixels: { ...base.pixels, unit: 'unknown' } },
    'incomplete-contract': {
      ...base,
      pixels: { ...base.pixels, saturation: undefined, linearity: undefined },
    },
    'raw-frame': { ...base, calibration: { state: 'raw' } },
    'lossy-history': {
      ...base,
      history: [{ step: 'stretch', tool: 'viewer', version: '1', lossy: true }],
    },
  };
  let all = true;
  const got = {};
  for (const code of C['d5.contract'].codes) {
    const r = detect({ ...f, sidecar: cases[code] ?? undefined }, permits);
    got[code] = r.code;
    if (!(r.ok === false && r.code === code && r.sources === undefined))
      all = false;
  }
  add('d5.contract', all ? C['d5.contract'].codes.length : 0, all, {
    bound: C['d5.contract'].codes.length,
    note: JSON.stringify(got),
  });
}

function edges(rng) {
  const T = C['d6.edge'];
  let flagged = 0;
  let refused = 0;
  for (let k = 0; k < T.trials; k++) {
    const y = 30 + 70 * rng();
    const x = 3;
    const frame = makeFrame({
      seed: seedOf('edge', k),
      stars: [{ x, y, flux: 6000 }],
    });
    const d = run(frame);
    const s = nearest(d.sources, x, y);
    if (s && dist(s, { x, y }) <= 4 && s.flags.includes('edge')) flagged++;
    const f = fitStar(adapt(frame, permits), d, { x, y });
    if (!f.ok && f.code === 'edge' && f.fwhm === undefined) refused++;
  }
  add('d6.edge.flag', flagged / T.trials, flagged / T.trials >= T.flaggedMin, {
    bound: T.flaggedMin,
  });
  add('d6.edge.fit', refused / T.trials, refused / T.trials >= T.flaggedMin, {
    bound: T.flaggedMin,
    note: 'a fit near the border is refused with edge and no number',
  });
}

function pairs() {
  const T = C['d7.noDeblending'];
  let merged = 0;
  let excluded = 0;
  let crowdedBoth = 0;
  for (let k = 0; k < T.trials; k++) {
    const y = 40 + 48 * (k / T.trials);
    const near = [
      { x: 40, y, flux: 6000 },
      { x: 40 + T.mergedSeparation, y, flux: 6000 },
    ];
    const d = run(makeFrame({ seed: seedOf('merged', k), stars: near }));
    const here = d.sources.filter(s => Math.hypot(s.x - 42.5, s.y - y) <= 8);
    if (here.length === 1) {
      merged++;
      if (!selectStars(d).some(q => q.id === here[0].id)) excluded++;
    }
    const apart = [
      { x: 40, y, flux: 6000 },
      { x: 40 + T.crowdedSeparation, y, flux: 6000 },
    ];
    const e = run(makeFrame({ seed: seedOf('crowded', k), stars: apart }));
    // the sources about the pair: a false source elsewhere in the frame is not this check's
    const pair = e.sources.filter(
      s => Math.hypot(s.x - (40 + T.crowdedSeparation / 2), s.y - y) <= 12
    );
    if (pair.length === 2 && pair.every(s => s.flags.includes('crowded')))
      crowdedBoth++;
  }
  add('d7.noDeblending.merged', merged, merged === T.trials, {
    bound: T.trials,
    note: 'one source for two stars 5 pixels apart',
  });
  add(
    'd7.noDeblending.excluded',
    excluded / T.trials,
    excluded / T.trials >= T.excludedMin,
    { bound: T.excludedMin }
  );
  add('d7.noDeblending.crowded', crowdedBoth, crowdedBoth === T.trials, {
    bound: T.trials,
    note: 'two sources 14 pixels apart, both crowded',
  });
}

function modelLimited(mid) {
  const T = C['d8.modelLimited'];
  let hit = 0;
  let n = 0;
  let k = 0;
  while (n < T.moffatStars) {
    const truth = stars12('misfit', k, T.flux, {
      psf: { kind: 'moffat', fwhm: 3, beta: T.betaMoffat },
    });
    const frame = makeFrame({ seed: seedOf('misfit', k), stars: truth });
    for (const f of fitFrame(frame)) {
      if (n >= T.moffatStars) break;
      n++;
      if (f.ok && f.modelLimited) hit++;
    }
    k++;
  }
  add('d8.modelLimited.moffat', hit / n, hit / n >= T.flaggedMin, {
    bound: T.flaggedMin,
    note: `${hit} of ${n} Moffat stars fitted by a Gaussian`,
  });
  const wrong = mid.midLimited / mid.midCount;
  add('d8.modelLimited.gaussian', wrong, wrong <= T.falseFlagMax, {
    bound: T.falseFlagMax,
    note: `${mid.midLimited} of ${mid.midCount} Gaussian stars`,
  });
}

/** Every row, as the tests and the command line read them. */
export function runValidation() {
  rows.length = 0;
  depths();
  shapes();
  psfTruth();
  oracle();
  const mid = coverage();
  negatives(mid);
  rows.push({
    id: 'e2.authentic',
    measured: null,
    pass: null,
    note: C['e2.authentic'].status,
  });
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const out = runValidation();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 1));
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
            : RECORDED[r.id]
              ? 'FAIL*'
              : 'FAIL';
      console.log(
        `${tag.padEnd(9)}${r.id.padEnd(40)}${v.padEnd(12)}${b} ${r.note ?? ''}`
      );
    }
    console.log(
      `${out.filter(r => r.pass === false).length} failing as committed, ${Date.now() - t0} ms`
    );
  }
  process.exit(out.some(r => r.pass === false && !RECORDED[r.id]) ? 1 : 0);
}
