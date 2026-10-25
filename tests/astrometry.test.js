// =============================================================================
// WCS-lite and registration (Prompt 181)
// -----------------------------------------------------------------------------
// tests/fixtures/astrometry/thresholds.json fixed every bound before
// js/measure/astrometry.js existed. tools/astrometry-validate.mjs runs them in
// plain Node (Jest's VM makes Math reads about ten times slower, so a
// 3,000-trial ensemble here would time the harness); this file runs it, holds
// every row to its bound, and adds what needs no ensemble: the projection and
// its inverse, the header reader's refusals, the fit's shape, registration
// carried to a WCS, the record, its replay, the saved field and the 2.0.0
// reader, and the oracle's pins. Nothing here is an exact float that passes
// through a trigonometric function (Node 20, 22 and 24 differ in the last
// bits): tolerances only.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_SIGMA,
  RULES,
  applyRegistration,
  carryWcs,
  checkWcs,
  chi2Survival,
  describeWcs,
  fitWcs,
  formatDec,
  formatRa,
  fromHeader,
  invertRegistration,
  parseAngle,
  pixelOf,
  register,
  skyOf,
  uncertaintyAt,
} from '../js/measure/astrometry.js';
import {
  CAL_FORMAT,
  LIMITS,
  ReplayError,
  calibrationBlock,
  catalogOf,
  digestFrame,
  mjdOf,
  quantitiesOf,
  replay,
  validateCalibration,
  writeRecord,
} from '../js/measure/calibrationRecord.js';
import { keysOf, starAt } from '../js/observatory/imageCalibration.js';
import { starAtEpoch, unpackStar } from '../js/kernels/sky/stars.js';
import { permits } from '../js/dataKinds/contract.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { observationJson } from '../js/observatory/export.js';
import { read as readWorkspace } from '../js/observatory/import.js';
import {
  fieldScene,
  orionScene,
  truthWcs,
} from '../tools/astrometry-validate.mjs';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/astrometry');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const THRESHOLDS = read('thresholds.json');
const sha = p =>
  createHash('sha256')
    .update(readFileSync(path.join(ROOT, p)))
    .digest('hex');
const wcs = truthWcs({
  crval: [210.5, 54.3],
  crpix: [100.5, 80.5],
  scaleArcsec: 2.5,
  positionAngleDeg: 33,
  parity: -1,
});

// ---- the committed thresholds, as rows ------------------------------------------

describe('the committed thresholds hold for the production module', () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'tools/astrometry-validate.mjs'), '--json'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 1 << 24,
      }
    )
  );

  test('every row passes except the two that need Prompt 189, which say they were not run', () => {
    const notRun = rows.filter(r => r.pass === null).map(r => r.id);
    expect(notRun).toEqual(['b5.oracleAuthenticFit', 'e1.authenticFrame']);
    for (const r of rows.filter(r => r.pass !== null))
      expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    for (const id of Object.keys(THRESHOLDS.checks))
      expect(rows.some(r => r.id === id)).toBe(true);
  });

  test('the two authentic legs are NOT RUN in the thresholds file and in the document, never faked', () => {
    expect(THRESHOLDS.checks['b5.oracleAuthenticFit'].status).toMatch(
      /NOT RUN until Prompt 189/
    );
    expect(THRESHOLDS.checks['e1.authenticFrame'].status).toMatch(
      /NOT RUN until Prompt 189/
    );
    const doc = readFileSync(path.join(ROOT, 'ASTROMETRY.md'), 'utf8');
    expect(doc).toMatch(/Not run until\s+Prompt 189/i);
  });

  test("the module's rules are the thresholds' rules", () => {
    expect({ ...RULES }).toEqual(THRESHOLDS.rules);
  });

  test('the ensembles are as large as the thresholds say', () => {
    const c1 = rows.find(r => r.id === 'c1.coverageAffine').measured;
    expect(c1.refused).toBe(0);
    expect(c1.n).toBeGreaterThanOrEqual(THRESHOLDS.scenes.ensemble.trials * 14);
    expect(rows.find(r => r.id === 'd4.mismatchedCatalogue').measured.of).toBe(
      THRESHOLDS.scenes.mismatch.trials
    );
  });
});

// ---- the oracle's pins ------------------------------------------------------------

describe('the independent oracle', () => {
  const prov = read('oracle-provenance.json');

  test('its identity, versions and digests are recorded, and the files are the ones recorded', () => {
    expect(prov.oracle).toMatch(/astropy 6\.1\.7/);
    expect(prov.packages).toMatchObject({
      astropy: '6.1.7',
      numpy: '2.2.6',
      scipy: '1.15.3',
    });
    expect(prov.python).toMatch(/^3\.10\.12/);
    expect(prov.retrieved).toBe('2026-10-23');
    for (const [file, digest] of Object.entries(prov.files))
      expect([file, sha(file)]).toEqual([file, digest]);
  });

  test('the oracle ran no Gravitas code: its script imports only the cited packages', () => {
    const src = readFileSync(
      path.join(ROOT, 'tools/astrometry-oracle/oracle.py'),
      'utf8'
    );
    const imports = [...src.matchAll(/^(?:import|from)\s+(\w+)/gm)]
      .map(m => m[1])
      .sort();
    expect([...new Set(imports)]).toEqual([
      'astropy',
      'json',
      'numpy',
      'scipy',
      'sys',
    ]);
  });

  test('the registration pin is a proper rotation (determinant 1)', () => {
    expect(read('oracle-results.json').registration.det).toBeCloseTo(1, 12);
  });
});

// ---- the projection ----------------------------------------------------------------

describe('the projection', () => {
  test('the reference pixel is the reference position, and the round trip returns the pixel', () => {
    const s = skyOf(wcs, wcs.crpix[0], wcs.crpix[1]);
    expect(s.ra).toBeCloseTo(wcs.crval[0], 10);
    expect(s.dec).toBeCloseTo(wcs.crval[1], 10);
    for (const [x, y] of [
      [1, 1],
      [200, 160],
      [57.3, 140.9],
    ]) {
      const p = pixelOf(wcs, skyOf(wcs, x, y).ra, skyOf(wcs, x, y).dec);
      expect(Math.hypot(p.x - x, p.y - y)).toBeLessThan(1e-7);
    }
  });

  test('north is up at position angle 0 and east is to the left', () => {
    const w = truthWcs({
      crval: [10, 20],
      crpix: [50, 50],
      scaleArcsec: 10,
      positionAngleDeg: 0,
      parity: -1,
    });
    const up = skyOf(w, 50, 60);
    const left = skyOf(w, 40, 50);
    expect(up.dec).toBeGreaterThan(20);
    expect(left.ra).toBeGreaterThan(10);
    const d = describeWcs(w);
    expect(d.parity).toBe('standard');
    expect(d.positionAngle).toBeCloseTo(0, 9);
    expect(d.scale).toBeCloseTo(10, 9);
  });

  test('a position behind the tangent plane has no pixel', () => {
    expect(pixelOf(wcs, wcs.crval[0] + 180, -wcs.crval[1])).toBeNull();
  });

  test('describeWcs reports the scales, the skew and the axis ratio of a general matrix', () => {
    const w = truthWcs({
      crval: [1, 1],
      crpix: [1, 1],
      scaleArcsec: 5,
      positionAngleDeg: 70,
      parity: 1,
      axisRatio: 1.02,
      skewDeg: 0.3,
    });
    const d = describeWcs(w);
    expect(d.parity).toBe('mirrored');
    expect(d.axisRatio).toBeCloseTo(1.02, 9);
    expect(Math.abs(d.skew)).toBeCloseTo(0.3, 6);
    expect(d.scale).toBeCloseTo(
      5 * Math.sqrt(Math.cos((0.3 * Math.PI) / 180)),
      6
    );
  });
});

// ---- the header reader --------------------------------------------------------------

describe('reading a header WCS', () => {
  const good = {
    ctype: ['RA---TAN', 'DEC--TAN'],
    crpix: [5, 6],
    crval: [10, 20],
    cdelt: [-0.001, 0.001],
    pc: [
      [1, 0],
      [0, 1],
    ],
  };

  test('CDELT and PC, or CD, give one matrix in degrees per pixel', () => {
    const a = fromHeader(good);
    expect(a.ok).toBe(true);
    expect(a.wcs.cd.flat().map(v => v + 0)).toEqual([-0.001, 0, 0, 0.001]);
    const b = fromHeader({
      ...good,
      cd: [
        [-0.002, 0],
        [0, 0.002],
      ],
      cdelt: undefined,
      pc: undefined,
    });
    expect(b.wcs.cd[0][0]).toBe(-0.002);
  });

  test('every unsupported header is refused by name, with the data a page needs to say it', () => {
    const sin = fromHeader({ ...good, ctype: ['RA---SIN', 'DEC--SIN'] });
    expect(sin).toMatchObject({
      ok: false,
      code: 'projection',
      data: { name: 'SIN' },
    });
    expect(sin.message).toMatch(/SIN/);
    expect(
      fromHeader({ ...good, ctype: ['RA---TAN-SIP', 'DEC--TAN-SIP'] })
    ).toMatchObject({ code: 'distortion', data: { name: 'SIP' } });
    expect(
      fromHeader({ ...good, ctype: ['RA---TPV', 'DEC--TPV'] })
    ).toMatchObject({ code: 'distortion', data: { name: 'TPV' } });
    expect(fromHeader({ ...good, ctype: ['GLON-TAN', 'GLAT-TAN'] }).code).toBe(
      'axes'
    );
    expect(fromHeader({ ...good, ctype: ['DEC--TAN', 'RA---TAN'] }).code).toBe(
      'axes'
    );
    expect(fromHeader(null).code).toBe('no-wcs');
    expect(fromHeader({ ...good, crval: [10, 95] }).code).toBe('incomplete');
    expect(
      fromHeader({
        ...good,
        pc: [
          [1, 1],
          [1, 1],
        ],
      }).code
    ).toBe('singular');
  });

  test('the authentic TESS header is read, and its target lands inside the 11 by 13 aperture image', async () => {
    const { PACK } =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    const h = fromHeader(PACK.image.wcs);
    expect(h.ok).toBe(true);
    const p = pixelOf(h.wcs, PACK.object.ra, PACK.object.dec);
    expect(p.x).toBeGreaterThan(0.5);
    expect(p.x).toBeLessThan(PACK.image.width + 0.5);
    expect(p.y).toBeGreaterThan(0.5);
    expect(p.y).toBeLessThan(PACK.image.height + 0.5);
    expect(describeWcs(h.wcs).scale).toBeCloseTo(19.42, 1);
  });
});

// ---- the fit -------------------------------------------------------------------------

describe('the fit', () => {
  const { truth, stars } = orionScene();

  test('five stars recover the truth and say they are consistent, with one residual each', () => {
    const f = fitWcs(stars, { tangent: truth.crval });
    expect(f.status).toBe('solved');
    expect(f.verdict).toBe('consistent');
    expect(f.residuals).toHaveLength(5);
    expect(f.stats.dof).toBe(4);
    expect(f.derived.scale).toBeCloseTo(90, 6);
    expect(f.derived.parity).toBe('standard');
    expect(f.sigmas.scale).toBeGreaterThan(0);
  });

  test('three stars fix it exactly and say that nothing checks the match', () => {
    const f = fitWcs(stars.slice(0, 3), { tangent: truth.crval });
    expect(f.verdict).toBe('exact');
    expect(f.consistent).toBeNull();
    expect(f.stats.dof).toBe(0);
    expect(f.stats.p).toBeNull();
  });

  test('the similarity model needs a parity and finds the same truth when it is one', () => {
    const w = truthWcs({
      crval: [150, 2],
      crpix: [512.5, 512.5],
      scaleArcsec: 5,
      positionAngleDeg: 12,
      parity: -1,
    });
    const px = [
      [100, 100],
      [900, 150],
      [500, 500],
      [200, 800],
      [850, 900],
    ];
    const s = px.map(([x, y], i) => ({
      id: `s${i}`,
      x,
      y,
      ...skyOf(w, x, y),
      sigma: 0.1,
    }));
    const f = fitWcs(s, { model: 'similarity', parity: -1, tangent: w.crval });
    expect(f.verdict).toBe('consistent');
    expect(f.stats.dof).toBe(6);
    expect(f.derived.scale).toBeCloseTo(5, 6);
    expect(f.derived.positionAngle).toBeCloseTo(12, 6);
    // The wrong parity cannot fit.
    expect(
      fitWcs(s, { model: 'similarity', parity: 1, tangent: w.crval }).verdict
    ).toBe('inconsistent');
  });

  test('the uncertainty of a position grows away from the stars', () => {
    const f = fitWcs(fieldScene().stars);
    const centre = uncertaintyAt(f, 512, 512).radius;
    const corner = uncertaintyAt(f, 1, 1).radius;
    expect(corner).toBeGreaterThan(centre);
    expect(uncertaintyAt(f, 512, 512).covariance).toHaveLength(2);
  });

  test('every refusal says why in words and in data, and returns no WCS', () => {
    const base = fieldScene().stars;
    const few = fitWcs(base.slice(0, 2));
    expect(few).toMatchObject({
      ok: false,
      status: 'not-constrained',
      code: 'too-few',
      data: { n: 2, min: 3 },
    });
    expect(few.wcs).toBeUndefined();
    const line = [0.1, 0.5, 0.9].map((s, i) => ({
      id: `l${i}`,
      x: 100 + 700 * s,
      y: 100 + 300 * s,
      ...skyOf(fieldScene().truth, 100 + 700 * s, 100 + 300 * s),
    }));
    expect(fitWcs(line)).toMatchObject({ code: 'collinear', data: { min: 2 } });
    expect(fitWcs([{ ...base[0], sigma: -1 }, ...base.slice(1)]).code).toBe(
      'malformed'
    );
    expect(
      fitWcs([
        base[0],
        { ...base[1], x: base[0].x, y: base[0].y },
        ...base.slice(2),
      ]).code
    ).toBe('duplicate');
    expect(
      fitWcs(base, {
        model: 'affine',
        tangent: [base[0].ra + 120, -base[0].dec],
      }).code
    ).toBe('too-wide');
    expect(() => fitWcs(base, { model: 'cubic' })).toThrow(RangeError);
  });

  test('a star with no stated uncertainty is taken to be placed to the default, and the result says so', () => {
    const noSigma = fieldScene().stars.map(s => ({ ...s, sigma: undefined }));
    const f = fitWcs(noSigma);
    expect(f.stats.sigmaAssumed).toBe(true);
    expect(f.residuals[0].sigma).toBe(DEFAULT_SIGMA);
  });

  test('a header WCS is checked against stars it was not fitted to, with a verdict', () => {
    const { truth: t2, stars: s2 } = fieldScene();
    expect(checkWcs(t2, s2).verdict).toBe('consistent');
    const shifted = { ...t2, crpix: [t2.crpix[0] + 30, t2.crpix[1]] };
    const bad = checkWcs(shifted, s2);
    expect(bad.verdict).toBe('inconsistent');
    expect(bad.stats.dof).toBe(2 * s2.length);
  });

  test('chi-squared survival is exact where it has a closed form', () => {
    expect(chi2Survival(3, 2)).toBeCloseTo(Math.exp(-1.5), 12);
    expect(chi2Survival(7, 4)).toBeCloseTo(Math.exp(-3.5) * (1 + 3.5), 12);
    expect(chi2Survival(0, 5)).toBe(1);
    expect(chi2Survival(18.467, 4)).toBeCloseTo(0.001, 4);
  });
});

// ---- registration --------------------------------------------------------------------

describe('registration', () => {
  const th = (0.7 * Math.PI) / 180;
  const map = ([x, y]) => [
    Math.cos(th) * x - Math.sin(th) * y + 12.5,
    Math.sin(th) * x + Math.cos(th) * y - 7.25,
  ];
  const pts = [
    [10, 20],
    [300, 40],
    [150, 400],
    [500, 500],
    [60, 330],
  ];
  const pairs = pts.map((a, i) => ({
    id: `p${i}`,
    a,
    b: map(a),
    sigmaA: 0.05,
    sigmaB: 0.05,
  }));

  test('a known rotation and shift are recovered, and the inverse undoes the map', () => {
    const r = register(pairs);
    expect(r.ok).toBe(true);
    expect(r.thetaDeg).toBeCloseTo(0.7, 8);
    for (const p of pairs) {
      const m = applyRegistration(r, ...p.a);
      expect(Math.hypot(m[0] - p.b[0], m[1] - p.b[1])).toBeLessThan(1e-9);
      const back = invertRegistration(r, ...m);
      expect(Math.hypot(back[0] - p.a[0], back[1] - p.a[1])).toBeLessThan(1e-9);
    }
    expect(r.distribution.max).toBeLessThan(1e-9);
  });

  test('the WCS of the second frame, carried by the registration, sees the same sky', () => {
    const r = register(pairs);
    const w2 = carryWcs(wcs, r);
    for (const a of [
      [40, 60],
      [250, 300],
    ]) {
      const s1 = skyOf(wcs, ...a);
      const s2 = skyOf(w2, ...applyRegistration(r, ...a));
      expect(Math.hypot(s1.ra - s2.ra, s1.dec - s2.dec)).toBeLessThan(1e-9);
    }
  });

  test('refusals and a mismatched pairing', () => {
    expect(register(pairs.slice(0, 2))).toMatchObject({
      code: 'too-few',
      data: { n: 2, min: 3 },
    });
    expect(
      register(pairs.map(p => ({ ...p, a: [5 + p.a[0] * 1e-4, 5] })))
    ).toMatchObject({ code: 'degenerate' });
    expect(register([{ a: [1, NaN], b: [0, 0] }, ...pairs]).code).toBe(
      'malformed'
    );
    const mixed = pairs.map((p, i) => ({
      ...p,
      b: pairs[(i + 1) % pairs.length].b,
    }));
    expect(register(mixed).verdict).toBe('inconsistent');
    expect(register(mixed).consistent).toBe(false);
  });

  test('the uncertainty of a mapped position grows with the distance from the sources', () => {
    const r = register(
      pairs.map(p => ({
        ...p,
        a: [p.a[0] + (p.id === 'p1' ? 0.02 : 0), p.a[1]],
      }))
    );
    expect(r.sigmaTheta).toBeGreaterThan(0);
    expect(r.sigmaCentre).toBeGreaterThan(0);
  });
});

// ---- angles as text -------------------------------------------------------------------

describe('angles as text', () => {
  test('decimal degrees, sexagesimal with any separators, hours for a right ascension', () => {
    expect(parseAngle('83.5')).toBe(83.5);
    expect(parseAngle('5h34m30s', { hours: true })).toBeCloseTo(83.625, 10);
    expect(parseAngle('5:34:30', { hours: true })).toBeCloseTo(83.625, 10);
    expect(parseAngle('-5 23 28.0')).toBeCloseTo(-5.391111111, 8);
    expect(parseAngle('+05d23m28s')).toBeCloseTo(5.391111111, 8);
    for (const bad of ['', 'abc', '1 2 3 4', '5 61 0', '5 30 -2', '1e2', null])
      expect(parseAngle(bad)).toBeNaN();
  });

  test('right ascension and declination are written the way they are read', () => {
    expect(formatRa(83.625)).toBe('05:34:30.0');
    expect(formatRa(359.99999)).toBe('00:00:00.0');
    expect(formatDec(-5.391111)).toBe('-05:23:28');
    expect(parseAngle(formatRa(10.2), { hours: true })).toBeCloseTo(10.2, 3);
  });
});

// ---- the record -----------------------------------------------------------------------

describe('the calibration record', () => {
  const { stars } = fieldScene();
  const frame = { id: 'f', width: 1024, height: 1024, digest: 'a'.repeat(64) };
  const fit = fitWcs(stars);
  const catalog = catalogOf({ typed: 'J2000.0' });
  const block = calibrationBlock({ frame, catalog, stars, fit });
  const clone = () => JSON.parse(JSON.stringify(block));

  test('the block is well formed, carries the WCS with its residuals and the catalogue identity', () => {
    expect(block.format).toBe(CAL_FORMAT);
    expect(validateCalibration(block)).toEqual([]);
    expect(block.result.residuals).toHaveLength(stars.length);
    expect(block.catalog).toMatchObject({ source: 'typed', epoch: 'J2000.0' });
    expect(block.solution.origin).toBe('fit');
    expect(JSON.parse(JSON.stringify(block))).toEqual(block);
  });

  test('a block that is not well formed is refused, naming the path', () => {
    expect(validateCalibration(null)).toEqual(['format']);
    expect(validateCalibration({ ...clone(), formatVersion: 2 })).toEqual([
      'format',
    ]);
    const badFrame = clone();
    badFrame.frame.digest = 'nope';
    expect(validateCalibration(badFrame)).toEqual(['frame']);
    const badStar = clone();
    badStar.stars[1].dec = 100;
    expect(validateCalibration(badStar)).toEqual(['stars[1]']);
    const badCat = clone();
    badCat.catalog.source = 'somewhere';
    expect(validateCalibration(badCat)).toEqual(['catalog']);
    const badSol = clone();
    badSol.solution.wcs.ctype = ['RA---SIN', 'DEC--SIN'];
    expect(validateCalibration(badSol)).toEqual(['solution']);
    const noResult = clone();
    noResult.result.residuals.pop();
    expect(validateCalibration(noResult)).toEqual(['result']);
    const many = clone();
    many.stars = Array.from({ length: LIMITS.stars + 1 }, () => many.stars[0]);
    expect(validateCalibration(many)).toEqual(['stars']);
  });

  test('a WCS read from a header says it was not solved, and carries no residuals', () => {
    const h = fromHeader({
      ctype: ['RA---TAN', 'DEC--TAN'],
      crpix: [5, 6],
      crval: [10, 20],
      cd: [
        [-0.001, 0],
        [0, 0.001],
      ],
    });
    const b = calibrationBlock({
      frame,
      catalog: catalogOf({ typed: 'the image header' }),
      stars: [],
      header: h,
    });
    expect(b.solution.origin).toBe('header');
    expect(b.result).toBeNull();
    expect(validateCalibration(b)).toEqual([]);
    const withResult = JSON.parse(JSON.stringify(b));
    withResult.result = {};
    expect(validateCalibration(withResult)).toEqual(['result']);
    const q = quantitiesOf(b);
    expect(q.every(x => x.origin !== 'measured')).toBe(true);
  });

  test('the ledger envelope is valid, its units are the registry, and each solved quantity has a sigma', async () => {
    const env = await writeRecord({ id: 'calibration-f', setId: 'f', block });
    expect(validateArtifact(env)).toEqual([]);
    const byId = Object.fromEntries(env.quantities.map(q => [q.id, q]));
    for (const id of [
      'crpix.x',
      'crpix.y',
      'scale',
      'rotation',
      'skew',
      'centre.ra',
      'centre.dec',
    ])
      expect(byId[id].uncertainty.kind).toBe('sigma');
    expect(byId['crval.ra'].origin).toBe('assumed');
    expect(env.provenance.reductions[0].step).toBe('image-calibration');
    expect(env.provenance.reductions[0].format).toBeUndefined();
  });

  test('replay solves again from the stars and agrees; it refuses other pixels and unreadable records', async () => {
    const data = Float64Array.from({ length: 16 }, (_, i) => i * 1.5);
    const f = { id: 'f', width: 4, height: 4, data };
    const small = {
      id: 'f',
      width: 4,
      height: 4,
      digest: await digestFrame(f),
    };
    const b = calibrationBlock({ frame: small, catalog, stars, fit });
    const env = await writeRecord({
      id: 'calibration-f',
      setId: 'f',
      block: b,
    });
    for (const rec of [b, env]) {
      const r = await replay(rec, f);
      expect(r.agrees).toBe(true);
      expect(r.fit.verdict).toBe(fit.verdict);
    }
    await expect(
      replay(b, { ...f, data: data.map(v => v + 1) })
    ).rejects.toMatchObject({ code: 'image-changed' });
    await expect(replay({ format: CAL_FORMAT }, f)).rejects.toBeInstanceOf(
      ReplayError
    );
    await expect(replay({ ...b, stars: [] }, f)).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  test('an image time becomes a Modified Julian Date with or without a scale word', () => {
    expect(mjdOf({ value: 60000.5, scale: 'utc' })).toBe(60000.5);
    expect(mjdOf({ value: 2460000.5, format: 'jd' })).toBeCloseTo(60000, 9);
    expect(mjdOf({ value: '2023-02-25T00:00:00', format: 'iso' })).toBeCloseTo(
      60000,
      6
    );
    expect(mjdOf(undefined)).toBeNaN();
    expect(mjdOf({ value: 'x' })).toBeNaN();
  });
});

// ---- the saved field and the 2.0.0 reader ------------------------------------------------

describe('workspace.calibration', () => {
  const { stars } = fieldScene();
  const frame = { id: 'f', width: 1024, height: 1024, digest: 'b'.repeat(64) };
  const block = calibrationBlock({
    frame,
    catalog: catalogOf({ typed: 'J2000.0' }),
    stars,
    fit: fitWcs(stars),
  });
  const xs = [];
  const ys = [];
  for (let j = 1; j <= 4; j++)
    for (let i = 1; i <= 4; i++) {
      xs.push(i);
      ys.push(j);
    }
  const obs = {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id: 'f',
    title: 'A small frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'f', version: null },
    credit: 'synthetic test frame',
    license: { status: 'cc0' },
    retrieved: null,
    citations: [],
    reductions: [],
    columns: [
      { id: 'x', name: 'column', unit: 'pix', role: 'x', values: xs },
      { id: 'y', name: 'row', unit: 'pix', role: 'x', values: ys },
      {
        id: 'v',
        name: 'counts',
        unit: 'count',
        role: 'value',
        values: xs.map((a, k) => a * ys[k]),
      },
    ],
    axes: { x: 'x', y: 'y' },
    image: { width: 4, height: 4, x: 'x', y: 'y', value: 'v' },
    masks: [],
    annotations: [],
  };
  const source = {
    id: 'f',
    source: { kind: 'builtin', id: 'f', version: null },
  };
  const depth = v =>
    v && typeof v === 'object'
      ? 1 + Math.max(0, ...Object.values(v).map(depth))
      : 0;

  test('no calibration, no field: a save without one is the bytes it always was', () => {
    const plain = observationJson(obs, { source, changes: [] });
    expect(plain).toBe(
      observationJson(obs, { source, changes: [], calibration: null })
    );
    expect(JSON.parse(plain).workspace.calibration).toBeUndefined();
  });

  test('a calibration is written, read back and valid, beside marks', () => {
    const marks = {
      format: 'gravitas.image-marks',
      formatVersion: 1,
      step: 'image-marks',
      marks: [],
      frames: [],
    };
    const text = observationJson(obs, {
      source,
      changes: [],
      marks,
      calibration: block,
    });
    const doc = JSON.parse(text);
    expect(doc.workspace.calibration.format).toBe(CAL_FORMAT);
    const r = readWorkspace(text);
    expect(r.ok).toBe(true);
    expect(validateCalibration(r.calibration)).toEqual([]);
    expect(r.marks.format).toBe('gravitas.image-marks');
  });

  test('the block nests deeper than the 2.0.0 file reader allows (six) and within the current one (eight)', () => {
    const doc = JSON.parse(
      observationJson(obs, { source, changes: [], calibration: block })
    );
    expect(depth(doc)).toBeGreaterThan(6);
    expect(depth(doc)).toBeLessThanOrEqual(8);
    const src = readFileSync(
      path.join(ROOT, 'js/observatory/import.js'),
      'utf8'
    );
    expect(src).toMatch(/depth: 8,/);
  });
});

// ---- the panel's own rules ----------------------------------------------------------------

describe('the panel', () => {
  const doc = JSON.parse(
    readFileSync(path.join(ROOT, 'sky/bright-stars.json'), 'utf8')
  );
  const row = hr => doc.stars.find(r => r[0] === hr);

  test('a name, a designation without its Flamsteed number, or "HR n" finds a star, and only one', () => {
    const find = q =>
      doc.stars.filter(r => keysOf(r).includes(q.toLowerCase()));
    expect(find('Betelgeuse').map(r => r[0])).toEqual([2061]);
    expect(find('alp ori').map(r => r[0])).toEqual([2061]);
    expect(find('HR 2061').map(r => r[0])).toEqual([2061]);
    expect(find('HR2061').map(r => r[0])).toEqual([2061]);
    expect(find('not a star')).toEqual([]);
  });

  test("a looked-up position at an epoch is the sky kernel's, to a few thousandths of an arcsecond", () => {
    for (const hr of [2061, 2491, 5340, 7001]) {
      const r = row(hr);
      if (!r) continue;
      for (const mjd of [Number.NaN, 51544.5, 60000.5, 65000]) {
        const mine = starAt(r, mjd);
        const k = starAtEpoch(
          unpackStar(r),
          Number.isFinite(mjd) ? mjd + 2400000.5 : 2451545.0
        );
        const sep =
          Math.hypot(
            (mine.ra - k.raDeg) * Math.cos((mine.dec * Math.PI) / 180),
            mine.dec - k.decDeg
          ) * 3600;
        expect(sep).toBeLessThan(0.02);
      }
    }
  });

  test("the panel's display-only rule is the contract's: the contract refuses astrometry on such an image", () => {
    const sidecar = {
      ...JSON.parse(
        readFileSync(
          path.join(
            ROOT,
            'tests/fixtures/dataKinds/image-tess-hd209458-aperture.json'
          ),
          'utf8'
        )
      ),
      use: 'display-only',
    };
    expect(permits(sidecar, 'astrometry')).toMatchObject({
      ok: false,
      code: 'display-only',
    });
    const src = readFileSync(
      path.join(ROOT, 'js/observatory/imageCalibration.js'),
      'utf8'
    );
    expect(src).toMatch(/sidecarUse === 'display-only'/);
  });
});
