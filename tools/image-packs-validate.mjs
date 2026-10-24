#!/usr/bin/env node
// =============================================================================
// The authentic-frame legs of Prompts 180 and 183, and the pack's own check
// -----------------------------------------------------------------------------
//   npm run imagepacks:validate              print the table
//   npm run imagepacks:validate -- --json    print it as JSON
//
// tests/fixtures/imagePacks/analysis-contract.json fixed the analysis of one
// authentic frame, the TESS cadence of the pack tess-hd209458-s56-frame, before
// any leg was run. This runs the legs against the production modules and judges
// them against the bounds that file names: a bound is read from the earlier
// prompt's committed thresholds file, never restated here, except the three the
// contract states anew with their derivations.
//
// What is compared is Gravitas against an independent oracle (photutils,
// astropy, scipy; tools/image-packs-oracle/) run offline on the SAME pixels,
// its results pinned in tests/fixtures/imagePacks/oracle-results.json. The
// injection leg (Prompt 184, g1) is in tools/image-packs-validate-injection.mjs.
// Nothing here stores a value that passes through exp, log or a trigonometric
// function: bands and tolerances are judged.
// =============================================================================

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { permits } from '../js/dataKinds/contract.js';
import { framesOf } from '../js/observatory/imageMarks.js';
import { imagePackObservation } from '../js/observatory/imagePacks.js';
import {
  adapt,
  apertureFor,
  centroid,
  measure,
} from '../js/measure/photometry.js';
import { detectIn, fitStar, meshMap } from '../js/measure/detect.js';
import { start } from '../js/measure/inject.js';
import { planRasterRead } from '../js/dataKinds/rasterJob.js';
import { BOUNDS, REFUSAL_CODES } from './image-import-cases.mjs';
import { variants } from './image-packs-hostile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const FIX = path.join(ROOT, 'tests/fixtures/imagePacks');
const json = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const CONTRACT = json(
  'tests/fixtures/imagePacks/analysis-contract.json'
);
// Legs that fail as committed, recorded with their cause (failed-legs.json).
const RECORDED = json('tests/fixtures/imagePacks/failed-legs.json').legs;
const PHOT = json('tests/fixtures/photometry/thresholds.json').checks;
const DET = json('tests/fixtures/detection/thresholds.json').checks;

export const PACK_ID = CONTRACT.frame.pack;
export const FRAME_FWHM =
  CONTRACT.legs['photometry.e2'].contract.detection.fwhm;
export const DETECTION = CONTRACT.legs['detection.e2'].contract.parameters;
/** The SAP_FLUX of the same cadence in the pinned light-curve file (the contract's pack.integrity). */
export const SAP_FLUX = 214537.7;

/** The pack as the Observatory opens it, from the committed files. */
export async function openFrame() {
  const mod = await import('../js/data/observations/tessHd209458S56Frame.js');
  const bytes = readFileSync(path.join(ROOT, mod.SIDECAR.file));
  const o = await imagePackObservation(mod, {
    bytes: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ),
  });
  const [frame] = framesOf(o);
  return { mod, o, frame, a: adapt(frame, permits) };
}

const nearest = (list, x, y) =>
  list.reduce(
    (b, s) =>
      !b || Math.hypot(s.x - x, s.y - y) < Math.hypot(b.x - x, b.y - y) ? s : b,
    null
  );
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
const angleDiff = (a, b) => {
  const d = Math.abs(a - b) % 180;
  return d > 90 ? 180 - d : d;
};

/**
 * What Gravitas decides from the frame under the contract, which the oracle is
 * then given: the detections, the brightest source, the aperture and the
 * recentred position.
 */
export function plan(a) {
  const det = detectIn(a, DETECTION);
  if (!det.ok) return { det, refused: det.code };
  const brightest = det.sources.reduce(
    (b, s) => (!b || s.segmentFlux > b.segmentFlux ? s : b),
    null
  );
  const ap = apertureFor(FRAME_FWHM);
  const m = measure(a, {
    x: brightest.x,
    y: brightest.y,
    r: ap.r,
    rIn: ap.rIn,
    rOut: ap.rOut,
    recentre: { half: ap.half },
  });
  return { det, brightest, ap, m };
}

const rows = [];
const add = (id, measured, pass, extra = {}) =>
  rows.push({ id, measured, pass, ...extra });

// ---- pack.integrity -------------------------------------------------------------

function integrity({ mod, o, frame }) {
  const B = CONTRACT.legs['pack.integrity'].bounds;
  const idx = mod.PACK.image.optimalAperture;
  let sum = 0;
  for (const i of idx) sum += frame.data[i];
  const r = Math.abs(sum / SAP_FLUX - 1);
  add('pack.integrity.sap', r, r <= B.sapRelative, {
    bound: B.sapRelative,
    note: `sum of FLUX over the ${idx.length} pixels of the SPOC optimal aperture is ${sum.toFixed(1)} electron/s; SAP_FLUX of the same cadence is ${SAP_FLUX}`,
  });
  const side = mod.PACK.image.sidecar;
  const peak = frame.data.reduce((p, v) => Math.max(p, v), -Infinity);
  add(
    'pack.integrity.peakBelowSaturation',
    peak,
    peak < side.pixels.saturation.level,
    {
      bound: side.pixels.saturation.level,
      note: 'peak pixel, electron/s, against the contract’s saturation level',
    }
  );
  const ph = permits(side, 'photometry');
  const as = permits(side, 'astrometry');
  add('pack.integrity.permits', 0, ph.ok === true && as.ok === true, {
    note: `permits(photometry) ${ph.ok}, permits(astrometry) ${as.ok}`,
  });
  add(
    'pack.integrity.bytes',
    frame.data.length,
    frame.data.length === 143 && o.image.variance === 'variance',
    {
      note: '143 pixels and a variance plane, the checksum of the frames file verified on the way in',
    }
  );
}

// ---- photometry.e2 --------------------------------------------------------------

function photometry(ctx, res) {
  const { a } = ctx;
  const P = res.photometry;
  const L = CONTRACT.legs['photometry.e2'];
  const p = ctx.plan;
  if (!p.m.ok) {
    add('photometry.e2.refusal', 0, true, {
      note: `the kernel refused with '${p.m.code}': that is the result of the leg`,
    });
    return;
  }
  const { x, y, r, rIn, rOut } = p.m;
  if (Math.hypot(P.case.x - x, P.case.y - y) > 1e-9)
    throw new Error(
      'the oracle was run for another position: rerun make-inputs'
    );
  const ap = { x, y, r, rIn, rOut };
  const me = measure(a, { ...ap, weighting: 'exact' });
  if (!me.ok) {
    add('photometry.e2.refusal', 0, true, {
      note: `at the recentred position the kernel refused with '${me.code}'`,
    });
    return;
  }
  const w = {
    sum: rel(me.net + me.area * me.sky, P.sum_exact),
    level: rel(me.sky, P.annulus.level),
    scatter: rel(me.skyScatter, P.annulus.scatter),
    n: Math.abs(me.skyPixels - P.annulus.n),
    variance: rel(me.sourceVariance, P.err_exact ** 2),
  };
  const T = k => PHOT[k].bound ?? PHOT[k].boundRelative;
  add(
    'photometry.e2.apertureSumExact',
    w.sum,
    w.sum <= T('b1.apertureSumExact'),
    {
      bound: T('b1.apertureSumExact'),
      note: `against photutils aperture_photometry(method='exact') at (${x.toFixed(3)}, ${y.toFixed(3)}), r ${r}`,
    }
  );
  add(
    'photometry.e2.backgroundMean.level',
    w.level,
    w.level <= T('b2.backgroundMean'),
    {
      bound: T('b2.backgroundMean'),
    }
  );
  add(
    'photometry.e2.backgroundMean.scatter',
    w.scatter,
    w.scatter <= T('b2.backgroundMean'),
    {
      bound: T('b2.backgroundMean'),
    }
  );
  add('photometry.e2.backgroundMean.pixels', w.n, w.n === 0, {
    bound: 0,
    note: `${me.skyPixels} annulus pixels in the frame`,
  });
  add(
    'photometry.e2.sourceVariance',
    w.variance,
    w.variance <= T('b5.sourceVariance'),
    {
      bound: T('b5.sourceVariance'),
      note: 'sum of w times the variance plane, against photutils error squared',
    }
  );
  // the centroid: flux-weighted, in the half window, on the sky of the annulus
  const C = PHOT['b4.centroid'];
  const q = P.centroid;
  const c = centroid(a.image, {
    x: P.centroid.case.x0,
    y: P.centroid.case.y0,
    half: ap_half(),
    sky: q.background,
    variance: a.variance,
  });
  const d = c.ok ? Math.hypot(c.x - q.flux.x, c.y - q.flux.y) : Infinity;
  add(
    'photometry.e2.centroid',
    d,
    c.ok && d <= C.boundPixelsFlux && Boolean(c.tie) !== q.flux.settled,
    {
      bound: C.boundPixelsFlux,
      note: `pixels, flux-weighted, against photutils centroid_com on the same final window (oracle settled: ${q.flux.settled})`,
    }
  );
  // the stated applicability limit of the contract, not a precision claim
  const sap = me.net / SAP_FLUX - 1;
  const lim = L.bounds.netOverSap.value;
  add('photometry.e2.netOverSap', Math.abs(sap), Math.abs(sap) <= lim, {
    bound: lim,
    note: `net ${me.net.toFixed(1)} electron/s of the circular aperture against SAP_FLUX ${SAP_FLUX} (signed ${sap.toExponential(2)})`,
  });
  rows.push({
    id: 'photometry.e2.reported',
    measured: null,
    pass: null,
    note: `net ${me.net.toFixed(1)} +/- ${me.sigma.toFixed(1)} electron/s, SNR ${me.snr.toFixed(0)}, sky ${me.sky.toFixed(2)} electron/s per pixel over ${me.skyPixels} pixels`,
  });
}
const ap_half = () => apertureFor(FRAME_FWHM).half;

// ---- detection.e2 ---------------------------------------------------------------

function detection(ctx, res) {
  const { a, plan: p } = ctx;
  const D = res.detection;
  const d = p.det;
  const T1 = DET['b1.mesh'].bound;
  const T2 = DET['b2.segmentation'];
  const flat = m => m.flat();
  let mesh = 0;
  d.mesh.level.forEach((v, i) => {
    mesh = Math.max(
      mesh,
      rel(v, flat(D.levelMesh)[i]),
      rel(d.mesh.noise[i], flat(D.noiseMesh)[i])
    );
  });
  add('detection.e2.mesh', mesh, mesh <= T1, {
    bound: T1,
    note: 'one box covering the frame: clipped median and clipped standard deviation against photutils Background2D',
  });
  const { width: W, height: H } = a.image;
  const lvl = meshMap(d.mesh, 'level', W, H);
  const noi = meshMap(d.mesh, 'noise', W, H);
  let maps = 0;
  D.sampleIndices.forEach((k, i) => {
    maps = Math.max(maps, rel(lvl[k], D.level[i]), rel(noi[k], D.noise[i]));
  });
  add('detection.e2.maps', maps, maps <= T1, { bound: T1 });
  const pix = [];
  d.labels.forEach((l, i) => {
    if (l) pix.push(i);
  });
  const sha = createHash('sha256')
    .update(Buffer.from(Int32Array.from(pix).buffer))
    .digest('hex');
  add(
    'detection.e2.segmentation.counts',
    d.sources.length,
    d.sources.length === D.sources.length,
    {
      bound: D.sources.length,
      note: 'Gravitas sources against photutils detect_sources',
    }
  );
  add(
    'detection.e2.segmentation.pixels',
    sha === D.segmentPixelsSha256 ? 1 : 0,
    sha === D.segmentPixelsSha256,
    {
      bound: 1,
      note: 'the segmented pixels are the same set (SHA-256)',
    }
  );
  let areas = true;
  let prop = 0;
  let orient = 0;
  for (const s of d.sources) {
    const q = nearest(D.sources, s.x, s.y);
    if (s.area !== q.area) areas = false;
    for (const [x, y] of [
      [s.x, q.x],
      [s.y, q.y],
      [s.semimajor, q.semimajor],
      [s.semiminor, q.semiminor],
      [s.ellipticity, q.ellipticity],
      [s.peak, q.peak],
      [s.segmentFlux, q.flux],
    ])
      prop = Math.max(prop, rel(x, y));
    orient = Math.max(orient, angleDiff(s.orientation, q.orientation));
  }
  add('detection.e2.segmentation.areas', areas ? 1 : 0, areas, { bound: 1 });
  add('detection.e2.properties', prop, prop <= T2.boundProperties, {
    bound: T2.boundProperties,
    note: 'position, moments, ellipticity, peak and segment flux against SourceCatalog',
  });
  add(
    'detection.e2.orientation',
    orient,
    orient <= T2.boundOrientationDegrees,
    {
      bound: T2.boundOrientationDegrees,
      note: 'degrees',
    }
  );
  // the width of the brightest source, Gaussian, unweighted, the square of the oracle
  const fit = D.fits[0];
  const b = p.brightest;
  const bound = CONTRACT.legs['detection.e2'].bounds.fwhmGaussian.value;
  if (!fit) {
    add('detection.e2.fwhmGaussian', null, false, {
      bound,
      note:
        'the oracle made no fit: ' + (D.fitNote ?? 'see the oracle results'),
    });
  } else {
    const mine = fitStar(
      a,
      d,
      { x: b.x, y: b.y, fwhm: b.fwhm },
      { weights: 'none', half: fit.half }
    );
    const e = mine.ok ? rel(mine.fwhm, fit.fwhm) : Infinity;
    add('detection.e2.fwhmGaussian', e, mine.ok && e <= bound, {
      bound,
      note: mine.ok
        ? `FWHM ${mine.fwhm.toFixed(4)} pixels against fit_fwhm ${fit.fwhm.toFixed(4)} (square of ${2 * fit.half + 1})`
        : `the fit refused with '${mine.code}'`,
    });
  }
  rows.push({
    id: 'detection.e2.reported',
    measured: null,
    pass: null,
    note: `${d.sources.length} sources found (photutils ${D.sources.length}); the brightest has FWHM ${b.fwhm?.toFixed(3)} pixels from its second moments`,
  });
}

// ---- injection.g1 ---------------------------------------------------------------

/**
 * The contract's injection spec on the frame as the panel adapts it. The
 * kernel's refusal, with its stable code, is the result of this leg: a margin
 * of 3 FWHM from the border cannot be placed in an 11 by 13 frame, and the
 * variance route is in electron/s, which the kernel does not inject into.
 */
function injection(ctx) {
  const L = CONTRACT.legs['injection.g1'];
  const spec = { ...L.contract.spec };
  const r = start(ctx.a, spec);
  const codes = [
    'unit',
    'no-room',
    'bad-parameter',
    'too-large',
    'no-range',
    'beyond-linearity',
  ];
  add('injection.g1.refusal', r.ok ? 1 : 0, !r.ok && codes.includes(r.code), {
    note: r.ok
      ? 'the kernel started a run: this leg then needs the oracle (not expected on an 11 by 13 frame)'
      : `the kernel refused with the stable code '${r.code}'${r.unit ? ` (unit ${r.unit})` : ''}${r.reason ? ` (reason ${r.reason})` : ''}: the result of the leg`,
  });
  // For the record, not a bound: the same spec on the CCD route (no variance
  // plane), where the unit is electrons.
  const rest = { ...ctx.frame };
  delete rest.variance;
  const ccd = start(adapt(rest, permits), spec);
  rows.push({
    id: 'injection.g1.reported',
    measured: null,
    pass: null,
    note: ccd.ok
      ? 'on the CCD route the kernel starts a run'
      : `on the CCD route (gain and read noise, no variance plane) the kernel refuses with '${ccd.code}'${ccd.reason ? ` (reason ${ccd.reason})` : ''}`,
  });
}

// ---- import.hostilePng ----------------------------------------------------------

/**
 * Each variant through the page's own structural reader (planRasterRead), in
 * Node: the verdict, its code, the time. A variant judged at the header stage
 * must be refused (or read, where the contract says so) with a stable code; one
 * judged at the pixel stage is only held to the time and to no throw but the
 * reader's own error here, and its refusal is e2e/imagePacks.spec.js's.
 */
function hostile() {
  const L = CONTRACT.legs['import.hostilePng'].bounds;
  const bound = BOUNDS.refusalMsNode;
  for (const [name, expect, stage, build] of variants()) {
    const bytes = new Uint8Array(build());
    const t0 = performance.now();
    let verdict;
    let threw = null;
    try {
      verdict = planRasterRead(bytes);
    } catch (e) {
      threw = e;
    }
    const ms = performance.now() - t0;
    const id = `import.hostilePng.${name.replace(/[^A-Za-z0-9]+/g, '-').replace(/-$/, '')}`;
    const got = threw
      ? 'threw'
      : verdict.ok
        ? 'read'
        : `refused ${verdict.code}`;
    const stable =
      !threw && (verdict.ok || REFUSAL_CODES.includes(verdict.code));
    const fast = ms <= bound;
    const asExpected =
      stage === 'pixels'
        ? true
        : expect === 'read'
          ? !threw && verdict.ok
          : !threw && !verdict.ok;
    add(id, ms, stable && fast && asExpected, {
      bound,
      note: `${stage} stage, the contract expects '${expect}', the page's reader: ${got}${stage === 'pixels' && !threw && verdict.ok ? ' (the decoder judges it, in the page)' : ''}`,
    });
  }
  void L;
}

// ---- the rest of the contract's legs --------------------------------------------

function notRun() {
  for (const [id, leg] of Object.entries(CONTRACT.legs))
    if (leg.status)
      rows.push({ id, measured: null, pass: null, note: leg.status });
}

/** Every row, as the tests and the command line read them. */
export async function runValidation() {
  rows.length = 0;
  const ctx = await openFrame();
  integrity(ctx);
  const res = JSON.parse(
    readFileSync(path.join(FIX, 'oracle-results.json'), 'utf8')
  );
  ctx.plan = plan(ctx.a);
  if (ctx.plan.refused) {
    add('detection.e2.refusal', 0, true, {
      note: `detection refused with '${ctx.plan.refused}': that is the result of the leg`,
    });
  } else {
    photometry(ctx, res);
    detection(ctx, res);
    injection(ctx);
    hostile();
  }
  notRun();
  return rows.slice();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = await runValidation();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(out, null, 1));
  else {
    for (const r of out) {
      const v = r.measured === null ? '' : Number(r.measured).toPrecision(4);
      const b = r.bound === undefined ? '' : JSON.stringify(r.bound);
      const tag =
        r.pass === null
          ? r.id.endsWith('.reported')
            ? 'REPORTED'
            : 'NOT RUN'
          : r.pass
            ? 'pass'
            : RECORDED[r.id]
              ? 'FAIL*'
              : 'FAIL';
      console.log(
        `${tag.padEnd(10)}${r.id.padEnd(44)}${v.padEnd(12)}${b} ${r.note ?? ''}`
      );
    }
    console.log(`${out.filter(r => r.pass === false).length} failing`);
  }
  process.exit(out.some(r => r.pass === false && !RECORDED[r.id]) ? 1 : 0);
}
