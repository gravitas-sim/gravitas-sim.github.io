// =============================================================================
// The enclosed-mass extension of the lensing kernel (Prompt 251, LENSING_II.md)
// -----------------------------------------------------------------------------
// Unit tests of the pure modules in js/kernels/lensing/enclosed/. The contract's legs against the
// independent oracle and the coverage ensembles are tools/lensing2-validate.mjs, held by
// tests/lensing2Results.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { URL } from 'node:url';
import * as lensing from '../js/kernels/lensing/index.js';
import * as K from '../js/kernels/lensing/enclosed/index.js';
import { C_SI, G_SI } from '../js/constants.js';

const ARCSEC = lensing.ARCSEC;
const cosmology = { H0: 70, Om: 0.3, OL: 0.7 };
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

describe('distances and the critical density', () => {
  test('flat distances: D_ls is not D_s - D_l, and the Einstein-de Sitter limit holds', () => {
    const d = K.lensDistances({ zl: 0.5, zs: 2, cosmology });
    expect(d.status).toBe('ok');
    expect(d.dls).toBeGreaterThan(d.ds - d.dl);
    expect(Math.abs(d.dls - (d.ds - d.dl))).toBeGreaterThan(1e-3 * d.ds);
    // Einstein-de Sitter: D_M = (2c/H0)(1 - 1/sqrt(1+z)), a closed form
    const eds = K.lensDistances({
      zl: 1,
      zs: 3,
      cosmology: { H0: 70, Om: 1, OL: 0 },
    });
    const dm = z => ((2 * 299792.458) / 70) * (1 - 1 / Math.sqrt(1 + z));
    expect(rel(eds.ds / K.MPC_M, dm(3) / 4)).toBeLessThan(1e-9);
    expect(rel(eds.dls / K.MPC_M, (dm(3) - dm(1)) / 4)).toBeLessThan(1e-9);
  });

  test('missing, bad or inverted redshifts and bad cosmologies are named, never defaulted', () => {
    expect(K.lensDistances({ zs: 1, cosmology }).code).toBe('no-lens-redshift');
    expect(K.lensDistances({ zl: 0.3, cosmology }).code).toBe(
      'no-source-redshift'
    );
    expect(K.lensDistances({ zl: 1, zs: 0.5, cosmology }).code).toBe(
      'source-not-behind-lens'
    );
    expect(
      K.lensDistances({
        zl: 0.3,
        zs: 1,
        cosmology: { H0: 70, Om: 0.3, OL: 0.5 },
      }).code
    ).toBe('non-flat-cosmology');
  });

  test('the critical density is c^2 D_s / (4 pi G D_l D_ls)', () => {
    const [dl, ds, dls] = [1e25, 2e25, 1.3e25];
    expect(K.sigmaCritical(dl, ds, dls)).toBeCloseTo(
      (C_SI * C_SI * ds) / (4 * Math.PI * G_SI * dl * dls),
      -5
    );
  });
});

describe('the mass inside the Einstein radius', () => {
  const d = K.lensDistances({ zl: 0.3, zs: 1, cosmology });
  test('equals the point-mass form, scales as theta_E squared, and agrees with the SIS dispersion route', () => {
    const th = 4 * ARCSEC;
    const m = K.enclosedMass(th, d.dl, d.ds, d.dls);
    expect(
      rel(m, lensing.massFromEinstein(th, d.dl, d.ds, d.dls))
    ).toBeLessThan(1e-12);
    expect(rel(K.enclosedMass(2 * th, d.dl, d.ds, d.dls), 4 * m)).toBeLessThan(
      1e-12
    );
    const s = 600e3;
    const fromSigma = K.massFromDispersion({
      sigmaMs: s,
      dl: d.dl,
      ds: d.ds,
      dls: d.dls,
    });
    expect(
      rel(fromSigma.mass, K.enclosedMass(fromSigma.thetaE, d.dl, d.ds, d.dls))
    ).toBeLessThan(1e-12);
    expect(
      rel(K.dispersionFromEinstein(fromSigma.thetaE, d.ds, d.dls), s)
    ).toBeLessThan(1e-12);
  });
});

describe('image positions and their inversions', () => {
  test('the SIS and the point lens round-trip, and the models disagree by the arithmetic over the geometric mean', () => {
    const s = K.sisImagePositions(3, 1).theta;
    const a = K.invertImages(s[1], s[0], 'sis');
    expect(a.thetaE).toBeCloseTo(3, 12);
    expect(a.beta).toBeCloseTo(1, 12);
    const p = K.pointImagePositions(3, 1).theta;
    const b = K.invertImages(p[0], p[1], 'point');
    expect(b.thetaE).toBeCloseTo(3, 12);
    expect(b.beta).toBeCloseTo(1, 12);
    expect(b.other.model).toBe('sis');
    expect(b.disagreement).toBeGreaterThan(1);
    expect(b.other.thetaE / b.thetaE).toBeCloseTo(b.disagreement, 12);
  });

  test('refusals: same side, one image, a zero or non-finite position', () => {
    expect(K.invertImages(2, 1).code).toBe('images-same-side');
    const one = K.invertImages(2);
    expect(one.status).toBe('not-constrained');
    expect(one.thetaE).toBeUndefined();
    expect(one.bound.thetaEAtMost).toBe(2);
    expect(K.invertImages(0, -1).code).toBe('bad-position');
    expect(K.invertImages(1, NaN).code).toBe('bad-position');
  });
});

describe('the arc-radius measurement', () => {
  const centre = { x: 10, y: -5 };
  test('a noise-free ring is recovered with a fixed and a free centre; the fit needs a declared sigma', () => {
    const a = K.syntheticArc({
      centre,
      radius: 50,
      extentDeg: 360,
      n: 16,
      sigma: 0,
    });
    expect(K.fitArc(a.points, {}).code).toBe('no-sigma');
    const fx = K.fitArc(a.points, { sigma: 1, centre });
    expect(fx.radius).toBeCloseTo(50, 10);
    const fr = K.fitArc(a.points, { sigma: 1 });
    expect(fr.status).toBe('ok');
    expect(fr.radius).toBeCloseTo(50, 7);
    expect(fr.centre.x).toBeCloseTo(10, 6);
    expect(a.synthetic).toBe(true);
    expect(a.label).toMatch(/SYNTHETIC/);
  });

  test('the centre term is first order for a short arc and cancels for a full ring', () => {
    const arc = K.syntheticArc({
      centre,
      radius: 50,
      extentDeg: 60,
      n: 16,
      sigma: 0,
    });
    const ring = K.syntheticArc({
      centre,
      radius: 50,
      extentDeg: 360,
      n: 16,
      sigma: 0,
    });
    const c = { ...centre, sigma: 2 };
    const sa = K.fitArc(arc.points, { sigma: 1, centre: c });
    const sr = K.fitArc(ring.points, { sigma: 1, centre: c });
    expect(sa.terms.centre).toBeGreaterThan(1.5);
    expect(sr.terms.centre).toBeLessThan(1e-9);
    expect(
      K.arcExtent(arc.points, centre.x, centre.y) * (180 / Math.PI)
    ).toBeCloseTo(60 * (15 / 15), 6);
  });

  test('a 15 degree arc with noise cannot fix a free centre and says so', () => {
    const a = K.syntheticArc({
      centre,
      radius: 100,
      extentDeg: 15,
      n: 12,
      sigma: 1.5,
      normal: (() => {
        let k = 0;
        return () => Math.sin(0.7 * ++k) * 1.2;
      })(),
    });
    const f = K.fitArc(a.points, { sigma: 1.5 });
    expect(f.status).toBe('not-constrained');
    expect(f.code).toBe('radius-unconstrained');
    expect(K.fitArc(a.points.slice(0, 4), { sigma: 1 }).code).toBe(
      'too-few-points'
    );
  });
});

describe('the mass from an arc', () => {
  const base = {
    radius: 3.2 * ARCSEC,
    sigmaRadius: 0.1 * ARCSEC,
    zl: 0.3,
    zs: 1,
    cosmology,
  };
  test('a ring gives an asymmetric interval; a single arc gives a bracket and no narrow interval', () => {
    const r = K.massFromArc(base);
    expect(r.status).toBe('ok');
    expect(r.interval.hi - r.mass).toBeGreaterThan(r.mass - r.interval.lo);
    const a = K.massFromArc({ ...base, kind: 'arc', sourceOffsetMax: 0.2 });
    expect(a.mass).toBeNull();
    expect(a.interval).toBeNull();
    expect(a.modelLimited).toBe('offset-bounded');
    expect(a.bracket.lo).toBeLessThan(a.bracket.hi);
    expect(a.statisticalIfOnAxis.mass).toBeCloseTo(r.mass, -10);
    expect(K.massFromArc({ ...base, kind: 'arc' }).modelLimited).toBe(
      'offset-unbounded'
    );
  });

  test('no lens redshift is not constrained; alternative cosmologies are a separate spread', () => {
    const n = K.massFromArc({ ...base, zl: undefined });
    expect(n.status).toBe('not-constrained');
    expect(n.mass).toBeNull();
    expect(n.angular.thetaE).toBe(base.radius);
    const s = K.massFromArc({
      ...base,
      cosmologies: [
        { H0: 60, Om: 0.3, OL: 0.7 },
        { H0: 80, Om: 0.3, OL: 0.7 },
      ],
    });
    expect(s.cosmologySpread.n).toBe(2);
    expect(s.cosmologySpread.hi).toBeGreaterThan(s.cosmologySpread.lo);
    expect(s.interval.lo).toBe(K.massFromArc(base).interval.lo);
  });
});

describe('the synthetic generator', () => {
  test('a world is a function of its seed and index only, and carries its truth', () => {
    const a = K.ensembleWorld({
      seed: 'x',
      index: 3,
      kind: 'partial',
      cosmology,
      extentRangeDeg: [100, 200],
    });
    const b = K.ensembleWorld({
      seed: 'x',
      index: 3,
      kind: 'partial',
      cosmology,
      extentRangeDeg: [100, 200],
    });
    K.ensembleWorld({ seed: 'x', index: 4, kind: 'ring', cosmology });
    expect(a.points).toEqual(b.points);
    expect(a.truth.thetaEArcsec).toBeGreaterThanOrEqual(3);
    expect(a.truth.thetaEArcsec).toBeLessThanOrEqual(30);
    expect(a.synthetic).toBe(true);
    expect(a.truth.sigmaKms).toBeGreaterThan(100);
  });
});

describe('the extension is invisible', () => {
  test('the lensing index does not re-export it and no shipped module imports it', () => {
    expect(Object.keys(lensing)).not.toContain('enclosedMass');
    expect(Object.keys(lensing)).not.toContain('fitArc');
    const index = readFileSync(
      new URL('../js/kernels/lensing/index.js', import.meta.url),
      'utf8'
    );
    expect(index).not.toMatch(/enclosed/);
    const lib = readdirSync(new URL('../js/', import.meta.url), {
      recursive: true,
    }).filter(
      f =>
        /\.js$/.test(f) &&
        !/^(kernels\/lensing\/enclosed|validation\/groups\/lensing2)/.test(f)
    );
    for (const f of lib) {
      const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
      expect([f, /lensing\/enclosed/.test(src)]).toEqual([f, false]);
    }
  });
});
