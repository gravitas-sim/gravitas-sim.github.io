// =============================================================================
// Source detection and the PSF (Prompt 183)
// -----------------------------------------------------------------------------
// tests/fixtures/detection/thresholds.json fixed every bound before
// js/measure/detect.js existed. tools/detection-validate.mjs runs them in plain
// Node (Jest's VM makes Math and Float64Array reads about ten times slower, so
// an ensemble here would time the harness); this file runs it and holds every
// row to its bound, holds the legs that failed as committed to the record of
// what failed (nothing is hidden and no bound moved), and adds what needs no
// ensemble: the numerical pieces, the segmentation rules, the flags, the
// refusals, the record and its replay, the CSV and the oracle's pins. Nothing
// here is an exact float that passes through exp, log or a trigonometric
// function (Node 20, 22 and 24 differ in the last bits).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { makeFrame, SCENE } from '../tools/detection-synth.mjs';
import {
  DEFAULTS,
  STEP,
  backgroundMesh,
  combine,
  csvRows,
  detect,
  detectIn,
  erfc,
  fitStar,
  gaussianKernel,
  measurePsf,
  meshAt,
  meshMap,
  modelPixels,
  moffatFwhm,
  moments,
  psfRecord,
  reductionOf,
  replay,
  segment,
  selectStars,
  smooth,
} from '../js/measure/detect.js';
import { adapt } from '../js/measure/photometry.js';
import { permits } from '../js/dataKinds/contract.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';
import { sha256Hex } from '../js/hash.js';
import { num } from '../js/csv.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/detection');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const THRESHOLDS = read('thresholds.json');

// ---- the committed thresholds, as rows ------------------------------------------

describe('the committed thresholds hold for the production module', () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'tools/detection-validate.mjs'), '--json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
    )
  );
  const failed = read('failed-legs.json');

  test('every row passes except the legs recorded as failed, and each of those still fails', () => {
    for (const r of rows) {
      if (r.id === 'e2.authentic' || r.evidence) continue;
      if (failed.legs[r.id])
        expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: false });
      else expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    }
    for (const id of Object.keys(failed.legs))
      expect(rows.some(r => r.id === id)).toBe(true);
  });

  test('every committed check has at least one row, and the authentic leg is not run', () => {
    for (const id of Object.keys(THRESHOLDS.checks)) {
      if (id === 'e2.authentic') continue;
      expect(rows.filter(r => r.id.startsWith(id)).length).toBeGreaterThan(0);
    }
    const e2 = rows.find(r => r.id === 'e2.authentic');
    expect(e2.pass).toBeNull();
    expect(e2.note).toMatch(/NOT RUN until Prompt 189/);
  });

  test('the ensembles are the committed size and depth', () => {
    expect(Object.keys(SCENE.depths)).toEqual(['deep', 'moderate', 'shallow']);
    for (const depth of Object.keys(SCENE.depths))
      expect(rows.some(r => r.id === `a1.recovery.${depth}`)).toBe(true);
    const c = THRESHOLDS.checks['c1.coverage68'];
    expect(c.stars).toBe(800);
    expect(Object.keys(c.levels)).toEqual(['faint', 'mid', 'bright']);
  });

  test('the failed legs are recorded with their measured numbers and their cause', () => {
    for (const [id, leg] of Object.entries(failed.legs)) {
      const r = rows.find(x => x.id === id);
      expect(leg.cause.length).toBeGreaterThan(80);
      // Recorded on Node 24; another engine moves the last digits, not the verdict.
      expect(Math.abs(r.measured - leg.measured)).toBeLessThan(
        0.2 * Math.abs(leg.measured)
      );
    }
  });

  test('the evidence rows are labelled as added after the first run', () => {
    const extra = rows.filter(r => r.evidence);
    expect(extra.map(r => r.id).sort()).toEqual([
      'x.a4.profile.zRms',
      'x.b3.fwhmGaussianTight',
    ]);
    for (const r of extra) expect(r.note).toMatch(/added after the first run/);
    // fit_fwhm's convergence is the whole of b3: the tight fit agrees with this kernel.
    expect(
      rows.find(r => r.id === 'x.b3.fwhmGaussianTight').measured
    ).toBeLessThan(1e-6);
  });
});

// ---- the numbers the kernel is made of ------------------------------------------------

describe('the special function and the kernels', () => {
  test('erfc against known values, both branches, and its reflection', () => {
    // erfc(1), erfc(2.5), erfc(4) to 15 digits (Abramowitz and Stegun Table 7.1)
    expect(erfc(0)).toBeCloseTo(1, 14);
    expect(Math.abs(erfc(1) / 0.15729920705028513 - 1)).toBeLessThan(1e-12);
    expect(Math.abs(erfc(2.5) / 4.069520174449589e-4 - 1)).toBeLessThan(1e-11);
    expect(Math.abs(erfc(4) / 1.541725790028002e-8 - 1)).toBeLessThan(1e-11);
    expect(erfc(-1) + erfc(1)).toBeCloseTo(2, 14);
  });

  test('the Gaussian kernel sums to 1, is symmetric and reaches 3 sigma', () => {
    const { radius, k } = gaussianKernel(3);
    expect(radius).toBe(4);
    expect(k.length).toBe(9);
    expect(k.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 14);
    for (let i = 0; i < 4; i++) expect(k[i]).toBeCloseTo(k[8 - i], 15);
    expect(k[4]).toBeGreaterThan(k[3]);
  });

  test('the Gaussian model sums to the flux and its derivatives agree with differences', () => {
    const par = [5000, 10.3, 9.8, 3.1];
    const n = 21;
    const { m, J } = modelPixels('gaussian', par, 0, 0, n);
    expect(m.reduce((s, v) => s + v, 0) / 5000).toBeGreaterThan(0.999);
    for (let p = 0; p < 4; p++) {
      const h = 1e-6 * Math.max(1, Math.abs(par[p]));
      const up = modelPixels(
        'gaussian',
        par.map((v, i) => (i === p ? v + h : v)),
        0,
        0,
        n
      ).m;
      const dn = modelPixels(
        'gaussian',
        par.map((v, i) => (i === p ? v - h : v)),
        0,
        0,
        n
      ).m;
      let worst = 0;
      for (let k = 0; k < n * n; k++)
        worst = Math.max(worst, Math.abs((up[k] - dn[k]) / (2 * h) - J[p][k]));
      expect(worst).toBeLessThan(1e-6 * Math.max(1, Math.abs(par[0])));
    }
  });

  test('the Moffat model has the committed FWHM and its derivatives agree with differences', () => {
    expect(moffatFwhm(2.655, 2.5)).toBeCloseTo(
      2 * 2.655 * Math.sqrt(2 ** 0.4 - 1),
      12
    );
    const par = [8000, 12.2, 11.7, 3.3, 2.7];
    const n = 25;
    const { J } = modelPixels('moffat', par, 0, 0, n);
    for (let p = 0; p < 5; p++) {
      const h = 1e-6 * Math.max(1, Math.abs(par[p]));
      const f = d =>
        modelPixels(
          'moffat',
          par.map((v, i) => (i === p ? v + d : v)),
          0,
          0,
          n
        ).m;
      const up = f(h);
      const dn = f(-h);
      let worst = 0;
      for (let k = 0; k < n * n; k++)
        worst = Math.max(worst, Math.abs((up[k] - dn[k]) / (2 * h) - J[p][k]));
      expect(worst).toBeLessThan(1e-5 * Math.max(1, Math.abs(par[0])));
    }
  });

  test('combine: the inverse-variance mean, and the sigma scaled only when the values disagree', () => {
    const a = combine([3, 3, 3], [0.1, 0.1, 0.1]);
    expect(a.mean).toBeCloseTo(3, 14);
    expect(a.sigma).toBeCloseTo(0.1 / Math.sqrt(3), 14);
    expect(a.scaled).toBe(false);
    const b = combine([2, 4], [0.1, 0.1]);
    expect(b.mean).toBeCloseTo(3, 14);
    expect(b.scaled).toBe(true);
    expect(b.sigma).toBeCloseTo(b.sigmaStat * Math.sqrt(b.chi2red), 12);
    expect(combine([5], [0.2]).chi2red).toBeNull();
  });
});

describe('the background, the smoothing and the segmentation', () => {
  const flat = (W, H, v) => ({
    width: W,
    height: H,
    values: new Float64Array(W * H).fill(v),
  });

  test('a flat frame has its level exactly and a plane is followed by the mesh to the border', () => {
    const m = backgroundMesh(flat(64, 64, 7), { box: 16 });
    expect(Array.from(m.level).every(v => v === 7)).toBe(true);
    expect(m.nx).toBe(4);
    const plane = { width: 64, height: 64, values: new Float64Array(64 * 64) };
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++)
        plane.values[y * 64 + x] =
          100 + 0.5 * x - 0.25 * y + (((x * 7 + y * 13) % 5) - 2) * 0.01;
    const q = backgroundMesh(plane, { box: 16 });
    // the outer intervals are continued linearly, so the corners are right to the scatter
    expect(Math.abs(meshAt(q, 'level', 0, 0) - 100)).toBeLessThan(0.1);
    expect(
      Math.abs(meshAt(q, 'level', 63, 63) - (100 + 31.5 - 15.75))
    ).toBeLessThan(0.1);
    const full = meshMap(q, 'level', 64, 64);
    expect(full[63 * 64 + 63]).toBeCloseTo(meshAt(q, 'level', 63, 63), 12);
  });

  test('saturated, masked and non-finite pixels are left out of a box', () => {
    const f = flat(32, 32, 10);
    f.values[5] = 1e6;
    f.values[6] = NaN;
    const mask = new Uint8Array(32 * 32);
    mask[7] = 1;
    f.values[7] = -1e6;
    const m = backgroundMesh(f, { box: 16, mask, limit: 1e5 });
    expect(m.level[0]).toBe(10);
    expect(m.noise[0]).toBeCloseTo(0, 12);
  });

  test('a box with too few pixels takes its neighbours’ value', () => {
    const f = flat(32, 16, 4);
    const mask = new Uint8Array(32 * 16).fill(1);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) mask[y * 32 + x] = 0;
    const m = backgroundMesh(f, { box: 16, mask });
    expect(m.level[1]).toBe(4);
  });

  test('smoothing keeps a constant, renormalises beside a mask, and its noise follows the weights', () => {
    const W = 24;
    const sub = new Float64Array(W * W).fill(3);
    const noise = new Float64Array(W * W).fill(2);
    const valid = new Uint8Array(W * W).fill(1);
    valid[12 * W + 12] = 0;
    const kernel = gaussianKernel(3);
    const sm = smooth(sub, noise, valid, W, W, kernel);
    expect(Math.max(...sm.value.map(v => Math.abs(v - 3)))).toBeLessThan(1e-12);
    // interior noise: sigma times the root of the sum of squares of the 2-D kernel
    const s2 = kernel.k.reduce((s, v) => s + v * v, 0) ** 2;
    expect(sm.sd[6 * W + 6]).toBeCloseTo(2 * Math.sqrt(s2), 12);
    // the repeated border pixels make the corner noisier than the interior
    expect(sm.sd[0]).toBeGreaterThan(sm.sd[12 * W + 3] * 1.2);
  });

  test('segments are 8-connected, labelled in raster order, and dropped under the minimum area', () => {
    const W = 10;
    const above = new Uint8Array(W * 6);
    const on = (x, y) => (above[y * W + x] = 1);
    [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ].forEach(([x, y]) => on(x, y)); // a diagonal: one 8-connected run of 5
    on(8, 0);
    on(8, 1); // two pixels: too small
    [
      [7, 3],
      [8, 3],
      [7, 4],
      [8, 4],
      [9, 4],
    ].forEach(([x, y]) => on(x, y));
    const { labels, pixels } = segment(above, W, 6, 5);
    expect(pixels.length).toBe(2);
    expect(pixels[0].length).toBe(5);
    expect(labels[1 * W + 1]).toBe(1);
    expect(labels[3 * W + 7]).toBe(2);
    expect(labels[0 * W + 8]).toBe(0);
  });

  test('moments: the centroid, the 1/12 rule and the shape of a known ellipse', () => {
    const W = 40;
    const sub = new Float64Array(W * W);
    const run = [];
    const sa = 3;
    const sb = 1.5;
    const th = Math.PI / 6;
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        const dx = x - 20;
        const dy = y - 20;
        const u = dx * Math.cos(th) + dy * Math.sin(th);
        const v = -dx * Math.sin(th) + dy * Math.cos(th);
        const val = Math.exp(-0.5 * ((u / sa) ** 2 + (v / sb) ** 2));
        if (val > 1e-3) {
          sub[y * W + x] = val;
          run.push(y * W + x);
        }
      }
    const m = moments(run, sub, W);
    expect(m.x).toBeCloseTo(20, 8);
    expect(m.y).toBeCloseTo(20, 8);
    expect(Math.abs(m.shape.semimajor - sa)).toBeLessThan(0.05);
    expect(Math.abs(m.shape.semiminor - sb)).toBeLessThan(0.05);
    expect(Math.abs(m.shape.orientation - 30)).toBeLessThan(0.5);
    // one pixel gets the 1/12 rule: both sigmas are 1/sqrt(12) after one step... det < 1/144 loops
    const one = moments([5 * W + 5], new Float64Array(W * W).fill(1), W);
    expect(one.shape.semimajor).toBeCloseTo(Math.sqrt(1 / 12), 12);
    expect(one.shape.ellipticity).toBeCloseTo(0, 12);
  });
});

// ---- detection on a frame ---------------------------------------------------------------

const star = (x, y, flux) => ({ x, y, flux });
const frameWith = (id, stars, extra = {}) =>
  makeFrame({ seed: `detection-test-${id}`, stars, ...extra });

describe('detection', () => {
  test('finds the stars of a frame, with positions, shapes, a flux through Prompt 180 and no flags', () => {
    const truth = [
      star(30.3, 40.6, 8000),
      star(80.2, 90.1, 3000),
      star(100.7, 30.4, 1500),
    ];
    const d = detect(frameWith('basic', truth), permits, { fwhm: 3 });
    expect(d.ok).toBe(true);
    expect(d.sources.length).toBe(3);
    for (const t of truth) {
      const s = d.sources.reduce((b, q) =>
        Math.hypot(q.x - t.x, q.y - t.y) < Math.hypot(b.x - t.x, b.y - t.y)
          ? q
          : b
      );
      expect(Math.hypot(s.x - t.x, s.y - t.y)).toBeLessThan(0.5);
      expect(s.flags).toEqual([]);
      expect(Math.abs(s.flux / t.flux - 0.998)).toBeLessThan(0.15);
      expect(s.fluxSigma).toBeGreaterThan(0);
      expect(s.shape).toBe(true);
      expect(s.ellipticity).toBeLessThan(0.3);
    }
    expect(d.route).toBe('ccd');
    expect(d.params).toMatchObject({ fwhm: 3, sigma: 4, minArea: 5, box: 16 });
  });

  test('a frame of sky and noise gives few sources and a strong gradient none that the sky does not explain', () => {
    const blank = detect(frameWith('blank', []), permits, { fwhm: 3 });
    expect(blank.sources.length).toBeLessThanOrEqual(1);
    const slope = detect(
      frameWith('slope', [], { plane: { x: 1.0, y: 0.7 } }),
      permits,
      { fwhm: 3 }
    );
    expect(slope.sources.length).toBeLessThanOrEqual(1);
  });

  test('every flag is raised by its own cause', () => {
    // edge
    let d = detect(frameWith('edge', [star(2.5, 60, 4000)]), permits, {
      fwhm: 3,
    });
    expect(d.sources[0].flags).toContain('edge');
    // saturated
    d = detect(
      frameWith('sat', [star(64, 64, 800000)], {
        detector: { fullWell: 50000 },
      }),
      permits,
      { fwhm: 3 }
    );
    expect(d.sources[0].flags).toContain('saturated');
    // sharp: a single hot pixel
    d = detect(
      frameWith('hot', [], { hot: [{ x: 60, y: 60, adu: 4000 }] }),
      permits,
      { fwhm: 3 }
    );
    expect(d.sources[0].flags).toContain('sharp');
    // crowded
    d = detect(
      frameWith('crowd', [star(40, 64, 6000), star(54, 64, 6000)]),
      permits,
      { fwhm: 3 }
    );
    expect(d.sources.length).toBe(2);
    expect(
      d.sources.every(
        s =>
          s.flags.includes('crowded') &&
          s.flux === null &&
          s.fluxCode === 'crowded'
      )
    ).toBe(true);
    // masked, and no segment pixel on a masked pixel
    const mask = new Uint8Array(128 * 128);
    mask[64 * 128 + 71] = 1;
    d = detect(frameWith('mask', [star(68, 64, 5000)], { mask }), permits, {
      fwhm: 3,
    });
    expect(d.sources[0].flags).toContain('masked');
    expect(d.labels[64 * 128 + 71]).toBe(0);
    // not merged: two stars 5 pixels apart are one source
    d = detect(
      frameWith('pair', [star(60, 64, 6000), star(65, 64, 6000)]),
      permits,
      { fwhm: 3 }
    );
    expect(d.sources.length).toBe(1);
    expect(d.sources[0].ellipticity).toBeGreaterThan(0.3);
  });

  test('a setting out of range is refused by name and the list is capped and says so', () => {
    const f = frameWith('params', [star(64, 64, 5000)]);
    for (const [name, o] of [
      ['fwhm', { fwhm: 0.1 }],
      ['sigma', { sigma: 1 }],
      ['minArea', { minArea: 2.5 }],
      ['box', { box: 2 }],
    ]) {
      const r = detect(f, permits, o);
      expect(r).toMatchObject({ ok: false, code: 'bad-parameter', name });
    }
    const many = detect(
      frameWith('cap', [
        star(30, 30, 4000),
        star(90, 30, 4000),
        star(30, 90, 4000),
      ]),
      permits,
      { fwhm: 3, maxSources: 2 }
    );
    expect(many.sources.length).toBe(2);
    expect(many.truncated).toBe(true);
  });

  test('a frame whose pixels are not light is refused with its own code and no list', () => {
    const f = frameWith('contract', []);
    const base = f.sidecar;
    const cases = {
      'display-only': { ...base, use: 'display-only' },
      'no-contract': undefined,
      'raw-frame': { ...base, calibration: { state: 'raw' } },
    };
    for (const [code, sidecar] of Object.entries(cases)) {
      const r = detect({ ...f, sidecar }, permits);
      expect(r.ok).toBe(false);
      expect(r.code).toBe(code);
      expect(r.sources).toBeUndefined();
    }
  });

  test('a fully masked image has no sky to estimate', () => {
    const f = frameWith('allmask', []);
    const r = detect(
      { ...f, mask: new Uint8Array(128 * 128).fill(1) },
      permits
    );
    expect(r).toMatchObject({ ok: false, code: 'no-background' });
  });
});

// ---- the point-spread function ----------------------------------------------------------

describe('the point-spread function', () => {
  const stars = Array.from({ length: 6 }, (_, i) =>
    star(20 + 17 * i + 0.37 * i, 30 + 11 * ((i * 5) % 7), 20000)
  );
  const frame = frameWith('psf', stars);
  const a = adapt(frame, permits);
  const det = detectIn(a, { fwhm: 3 });
  const pick = () =>
    selectStars(det).map(s => ({
      id: s.id,
      x: s.x,
      y: s.y,
      flux: s.flux,
      fwhm: s.fwhm,
    }));

  test('the selection keeps the bright, round, unflagged stars and the FWHM is the kernel’s', () => {
    const chosen = pick();
    expect(chosen.length).toBe(6);
    const r = measurePsf(a, det, chosen, {});
    expect(r.ok).toBe(true);
    expect(Math.abs(r.fwhm.mean - 3) / 3).toBeLessThan(0.02);
    expect(r.fwhm.sigma).toBeGreaterThan(0);
    expect(r.profile.length).toBeGreaterThan(10);
    expect(r.profile[0].value).toBeGreaterThan(r.profile[5].value);
    expect(r.profileFwhm).toBeGreaterThan(2.5);
    expect(r.profileFwhm).toBeLessThan(3.8);
    expect(r.modelLimited).toBe(false);
  });

  test('a fit refuses near the border, on a saturated pixel and on a masked square, with no number', () => {
    expect(fitStar(a, det, { x: 3, y: 60 })).toEqual({
      ok: false,
      code: 'edge',
    });
    const hot = adapt(
      frameWith('psfsat', [star(64, 64, 800000)], {
        detector: { fullWell: 50000 },
      }),
      permits
    );
    const hd = detectIn(hot, { fwhm: 3 });
    expect(fitStar(hot, hd, { x: 64, y: 64 })).toEqual({
      ok: false,
      code: 'saturated',
    });
    const mask = new Uint8Array(128 * 128);
    for (let y = 50; y < 80; y++)
      for (let x = 50; x < 80; x++) mask[y * 128 + x] = 1;
    const m = adapt(
      { ...frameWith('psfmask', [star(64, 64, 20000)]), mask },
      permits
    );
    const md = detectIn(m, { fwhm: 3 });
    const r = fitStar(m, md, { x: 64, y: 64 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('masked');
    expect(measurePsf(m, md, [{ id: 'a', x: 64, y: 64 }], {})).toMatchObject({
      ok: false,
      code: 'no-stars',
    });
  });

  test('the weights change the answer little on clean stars, the Moffat fit finds a Gaussian’s FWHM, and the covariance is the inverse of the normal equations', () => {
    const s = pick()[0];
    const poisson = fitStar(a, det, s, { weights: 'poisson' });
    const equal = fitStar(a, det, s, { weights: 'none' });
    expect(Math.abs(poisson.fwhm - equal.fwhm)).toBeLessThan(0.1);
    expect(equal.chi2).toBeNull();
    expect(equal.modelLimited).toBe(false);
    const moffat = fitStar(a, det, s, { model: 'moffat' });
    expect(moffat.ok).toBe(true);
    expect(moffat.beta).toBeGreaterThan(5); // a Gaussian is the large-beta limit
    expect(poisson.covariance.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(poisson.covariance[i][i]).toBeGreaterThan(0);
      expect(poisson.sigma.fwhm).toBeCloseTo(
        Math.sqrt(poisson.covariance[3][3]),
        14
      );
    }
    expect(poisson.dof).toBe(poisson.pixels - 4);
  });

  test('the record is an envelope with a fit-result record, labels a bad profile model-limited and replays', async () => {
    const r = measurePsf(a, det, pick(), {});
    const { quantities, fit } = psfRecord(r);
    const env = artifact({
      id: 'psf-test',
      source: { kind: 'observation', id: 'frame', digest: 'abcdef0123456789' },
      quantities,
      fit,
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(quantities[0]).toMatchObject({
      id: 'psf.fwhm',
      unit: 'pix',
      origin: 'fitted',
    });
    expect(quantities[0].uncertainty.kind).toBe('sigma');
    const limited = psfRecord({ ...r, modelLimited: true, chi2red: 2 });
    expect(limited.quantities[0].uncertainty.kind).toBe('model-limited');
    expect(limited.quantities[0].uncertainty.floor).toBeGreaterThan(
      limited.quantities[0].uncertainty.sigma
    );
    expect(
      validateArtifact(
        artifact({
          id: 'x',
          source: { kind: 'observation', id: 'f' },
          quantities: limited.quantities,
          fit: limited.fit,
        })
      )
    ).toEqual([]);
    // run again
    const digest = f =>
      sha256Hex(
        new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
      );
    const d = await digest(frame);
    const red = reductionOf(frame, d, det, r);
    expect(red.step).toBe(STEP);
    const same = await replay(red, frame, { check: permits, digest });
    expect(same).toMatchObject({ ok: true, agrees: true });
    const other = {
      ...frame,
      data: Float64Array.from(frame.data, (v, i) => (i === 5 ? v + 1 : v)),
    };
    expect(await replay(red, other, { check: permits, digest })).toMatchObject({
      ok: false,
      code: 'image-changed',
    });
  });
});

// ---- the list as CSV, the defaults, the oracle's pins ----------------------------------

describe('the CSV, the defaults and the oracle', () => {
  test('the CSV has a header and a row a source, with the flags in one cell', () => {
    const d = detect(
      frameWith('csv', [star(64, 64, 5000), star(64.0, 3, 4000)]),
      permits,
      { fwhm: 3 }
    );
    const rows = csvRows(d, ['id', 'x'], num);
    expect(rows.length).toBe(d.sources.length + 1);
    expect(rows[1][0]).toBe('s1');
    expect(rows.some(r => String(r[r.length - 1]).includes('edge'))).toBe(true);
  });

  test('the defaults are the committed ones', () => {
    const c = THRESHOLDS.algorithm.detection;
    expect(DEFAULTS).toMatchObject({
      fwhm: c.defaultFwhm,
      sigma: c.sigma,
      minArea: c.minArea,
      box: THRESHOLDS.algorithm.background.box,
    });
  });

  const prov = read('oracle-provenance.json');
  test('the fixtures are the bytes the provenance hashed', () => {
    for (const [file, sha] of Object.entries(prov.files))
      expect(
        createHash('sha256')
          .update(readFileSync(path.join(ROOT, file)))
          .digest('hex')
      ).toBe(sha);
  });

  test('the oracle is named with its versions, its index and its retrieval date, and nothing was added to the venv', () => {
    expect(prov.packages).toMatchObject({
      photutils: '2.0.2',
      astropy: '6.1.7',
      numpy: '2.2.6',
      scipy: '1.15.3',
    });
    expect(prov.retrieved).toBe('2026-10-23');
    expect(prov.index).toMatch(/pypi\.org/);
    expect(prov.python).toMatch(/^3\.10\./);
    expect(prov.identity).toMatch(/no Gravitas code ran/);
    expect(
      read('oracle-results.json').frames.moderate.convolveAgreement
    ).toBeLessThan(1e-9);
  });

  test('the oracle read the thresholds file’s algorithm and every frame has a result', () => {
    const inputs = read('oracle-inputs.json');
    const results = read('oracle-results.json');
    expect(inputs.algorithm).toEqual(THRESHOLDS.algorithm);
    for (const f of inputs.frames)
      expect(results.frames[f.id].sources.length).toBeGreaterThan(0);
  });
});
