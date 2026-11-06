// =============================================================================
// The galaxy-cluster kernel (Prompt 250, GALAXY_CLUSTERS.md)
// -----------------------------------------------------------------------------
// Unit tests of the pure modules in js/kernels/galaxy/clusters/. The contract's legs against the
// independent oracle and the coverage ensembles are tools/clusters-validate.mjs, held by
// tests/clustersResults.test.js.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as K from '../js/kernels/galaxy/clusters/index.js';
import { normalCdf } from '../js/kernels/statistics/index.js';

const cosmology = { H0: 70, Om: 0.3, OL: 0.7 };
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const factor = (value = 6, sigma = 0.5) => ({
  value,
  sigma,
  source: 'invented for the test',
  radiusKind: 'half-number',
});
const world = (o = {}) =>
  K.clusterWorld({ seed: 'unit', index: 0, cosmology, ...o });
const analyse = (w, extra = {}) =>
  K.analyseCluster({
    ...w,
    cosmology,
    factor: factor(K.kPhys(), 0),
    draws: 20,
    ...extra,
  });

describe('velocities and the clip', () => {
  test('the linear velocity inverts z = z_c + (1 + z_c) v / c and the relativistic form differs by about v/(2c)', () => {
    const zc = 0.05;
    const v = 3000;
    const z = zc + ((1 + zc) * v) / 299792.458;
    expect(rel(K.restVelocity(z, zc), v)).toBeLessThan(1e-12);
    const diff = Math.abs(K.relativisticVelocity(z, zc) - v) / v;
    expect(diff).toBeGreaterThan(0.45 * (v / 299792.458));
    expect(diff).toBeLessThan(0.55 * (v / 299792.458));
  });

  test('the MAD factor is 1 over the normal quartile at 3/4', () => {
    expect(normalCdf(1 / K.MAD_TO_SIGMA)).toBeCloseTo(0.75, 12);
  });

  test('the truncation factor grows with kappa, refuses kappa at or below sqrt(3), and solves its equation', () => {
    const xs = [2, 3, 4, 5].map(k => K.truncationFactor(k));
    expect(xs.every((x, i) => i === 0 || x > xs[i - 1])).toBe(true);
    expect(xs[1]).toBeGreaterThan(0.98);
    expect(xs[1]).toBeLessThan(0.99);
    expect(K.truncationFactor(Math.sqrt(3)).code).toBe('bad-clip-level');
    expect(K.truncationFactor(1.5).status).toBe('refused');
    expect(Math.abs(xs[1] ** 2 - K.truncatedVariance(3 * xs[1]))).toBeLessThan(
      1e-12
    );
  });

  test('the clip keeps a Gaussian core, drops far interlopers, and reports its passes', () => {
    const core = Array.from(
      { length: 60 },
      (_, i) => ((i - 29.5) / 29.5) * 400
    );
    const u = [...core, 5000, -6000, 7000];
    const r = K.sigmaClip(u);
    expect(r.status).toBe('ok');
    expect(r.kept.length).toBe(60);
    expect(r.passes).toBeGreaterThanOrEqual(2);
    expect(r.passes).toBeLessThanOrEqual(K.MAX_PASSES);
    expect(K.sigmaClip(u, { maxPasses: 1 }).code).toBe('clip-not-converged');
    expect(K.sigmaClip(u, { kappa: 1.2 }).code).toBe('bad-clip-level');
  });
});

describe('the dispersion and its diagnostics', () => {
  const v = [-450, -250, -100, 0, 120, 280, 400];

  test('plain dispersion, quadrature error subtraction and the analytic error', () => {
    const off = K.dispersion(v, { kappa: 3, truncationCorrection: false });
    expect(rel(off.kms, Math.sqrt(527800 / 6))).toBeLessThan(1e-12);
    expect(rel(off.sigmaKms, off.kms / Math.sqrt(12))).toBeLessThan(1e-12);
    const withErr = K.dispersion(v, {
      kappa: 3,
      truncationCorrection: false,
      errorsKms: v.map(() => 100),
    });
    expect(rel(withErr.kms, Math.sqrt(527800 / 6 - 1e4))).toBeLessThan(1e-12);
    expect(withErr.sigmaKms).toBeGreaterThan(off.sigmaKms * 0.99);
    expect(
      K.dispersion(v, { kappa: 3, errorsKms: v.map(() => 300) }).code
    ).toBe('errors-exceed-scatter');
  });

  test('the biweight needs its tuning and a source, and refuses velocity errors', () => {
    expect(K.dispersion(v, { method: 'biweight', kappa: 3 }).code).toBe(
      'missing-tuning'
    );
    const tuning = { cLocation: 6, cScale: 9, source: 'the test' };
    expect(
      K.dispersion(v, {
        method: 'biweight',
        kappa: 3,
        biweightTuning: tuning,
        errorsKms: v.map(() => 1),
      }).code
    ).toBe('errors-with-biweight');
    const ok = K.dispersion(v, {
      method: 'biweight',
      kappa: 3,
      biweightTuning: tuning,
      draws: 50,
      seed: 'u',
    });
    expect(ok.status).toBe('ok');
    expect(ok.uncertainty).toBe('bootstrap');
  });

  test('a constant list has no scatter; the excess kurtosis refuses fewer than four values and flags a bimodal sample', () => {
    expect(K.dispersion([5, 5, 5, 5], { kappa: 3 }).code).toBe('zero-scatter');
    expect(K.excessKurtosis([1, 2, 3]).status).toBe('refused');
    const bi = [...Array(50).fill(-3), ...Array(50).fill(3)].map(
      (x, i) => x + 0.01 * (i % 7)
    );
    expect(K.excessKurtosis(bi).flag).toBe(true);
  });

  test('the contamination estimate is unknown without an extent', () => {
    expect(
      K.contamination({
        uKms: [0, 1],
        centre: 0,
        halfWidth: 1,
        extentKms: 0,
        members: 2,
      }).status
    ).toBe('unknown');
    const c = K.contamination({
      uKms: [0, 10, 3000, -4000],
      centre: 0,
      halfWidth: 100,
      extentKms: 8000,
      members: 2,
    });
    expect(c.expectedInside).toBeCloseTo((2 / 15800) * 200, 12);
  });
});

describe('geometry, mass, light and morphology', () => {
  test('the great-circle separation is symmetric, the destination inverts it, and a radius kind must be named', () => {
    expect(K.separation(10, 20, 11, 21)).toBe(K.separation(11, 21, 10, 20));
    const p = K.destination(100, -30, 1.1, 0.01);
    expect(rel(K.separation(100, -30, p.ra, p.dec), 0.01)).toBeLessThan(1e-12);
    expect(
      K.projectedRadius({
        sky: [
          { ra: 0, dec: 0 },
          { ra: 1, dec: 1 },
        ],
        centre: { ra: 0, dec: 0 },
        daMpc: 100,
        kind: 'odd',
      }).code
    ).toBe('bad-radius-kind');
  });

  test('the cosmology must be flat with a positive H0', () => {
    expect(K.cosmologyOf({ H0: 70, Om: 0.3, OL: 0.8 }).code).toBe(
      'bad-cosmology'
    );
    expect(K.cosmologyOf({ H0: 0, Om: 0.3, OL: 0.7 }).code).toBe(
      'bad-cosmology'
    );
    expect(
      K.cosmologyOf(cosmology).angularDiameterDistance(0.1)
    ).toBeGreaterThan(300);
  });

  test('the virial mass carries three terms, reports the interval without the factor, and never defaults K', () => {
    const m = K.virialMass({
      sigmaKms: 800,
      sigmaSigmaKms: 40,
      radiusMpc: 1,
      sigmaRadiusMpc: 0.1,
      factor: factor(6, 0.6),
    });
    expect(m.terms.factor).toBeCloseTo(0.1, 12);
    expect(m.relSigma).toBeGreaterThan(m.statisticalRelSigma);
    expect(m.intervalsWithoutFactor[0].hi).toBeLessThan(m.intervals[0].hi);
    expect(K.checkFactor(undefined, 'half-number').code).toBe('missing-factor');
    expect(
      K.checkFactor({ ...factor(), radiusKind: 'harmonic' }, 'half-number').code
    ).toBe('factor-radius-mismatch');
    expect(
      K.checkFactor({ ...factor(), source: ' ' }, 'half-number').code
    ).toBe('missing-factor-source');
  });

  test('light is a lower bound without a missing-light share and M/L an upper bound', () => {
    const solar = { value: 4.5, source: 'invented for the test' };
    const mem = [{ mag: 15 }, { mag: 16 }, { mag: 19 }];
    const a = K.clusterLight({
      members: mem,
      dm: 37,
      solarAbsMag: solar,
      limitMag: 17,
    });
    expect(a.lowerBound).toBe(true);
    expect(a.used).toBe(2);
    expect(
      K.massToLight({ massKg: 1e45, massRelSigma: 0.2, light: a }).upperBound
    ).toBe(true);
    const b = K.clusterLight({
      members: mem,
      dm: 37,
      solarAbsMag: solar,
      limitMag: 17,
      missing: { fraction: 0.5, sigma: 0.1, source: 'invented' },
    });
    expect(b.solar).toBeCloseTo(2 * b.sumSolar, 9);
    expect(b.lowerBound).toBe(false);
    expect(
      K.clusterLight({
        members: mem,
        dm: 37,
        solarAbsMag: { value: 4.5, source: '' },
        limitMag: 17,
      }).code
    ).toBe('missing-solar-source');
  });

  test('Clopper-Pearson: closed forms at the ends and a refused neighbour count', () => {
    const ci = K.clopperPearson(0, 8, 0.9);
    expect(ci.lo).toBe(0);
    expect(ci.hi).toBeCloseTo(1 - 0.05 ** (1 / 8), 12);
    expect(K.clopperPearson(8, 8, 0.9).hi).toBe(1);
    expect(K.localDensities([[0]], 0).code).toBe('bad-neighbours');
    expect(
      K.morphologyDensity({ density: [1], isClass: [true], edgesLog10: [0] })
        .code
    ).toBe('bad-edges');
  });
});

describe('labelled synthetic clusters and the whole analysis', () => {
  test('worlds are labelled, deterministic and independent of the order they were drawn in', () => {
    const a = world({ index: 3 });
    world({ index: 4 });
    const b = world({ index: 3 });
    expect(a.synthetic).toBe(true);
    expect(a.label).toMatch(/^SYNTHETIC/);
    expect(a.galaxies).toEqual(b.galaxies);
    expect(world({ index: 5 }).truth.sigma).not.toBe(a.truth.sigma);
  });

  test('the toy truth: x_half solves its equation and K_phys is 2 / x_half', () => {
    const x = K.xHalf();
    expect(Math.abs(K.projectedFraction(x) - 0.5)).toBeLessThan(1e-14);
    expect(K.kPhys()).toBeCloseTo(2 / x, 14);
  });

  test('a toy cluster is recovered and the answer says what it assumes', () => {
    const w = world({ index: 1, N: 200, sigma: 800, zc: 0.05, rt: 1.5 });
    const r = analyse(w);
    expect(r.status).toBe('ok');
    expect(Math.abs(r.dispersion.kms - 800)).toBeLessThan(
      4 * r.dispersion.sigmaKms
    );
    expect(r.members.converged).toBe(true);
    expect(r.mass.assumes).toMatch(/equilibrium/);
    expect(r.claimable).toBe(true);
  });

  test('too few members is not constrained and carries no mass', () => {
    const r = analyse(world({ index: 2, N: 12, interloperFraction: 0 }));
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('too-few-members');
    expect(r.mass).toBeUndefined();
  });

  test('a bimodal sample is flagged and the numbers are not changed by the flag', () => {
    const r = analyse(world({ index: 3, kind: 'bimodal', N: 300, rt: 1.5 }));
    expect(r.status).toBe('ok');
    expect(r.flags).toContain('non-gaussian');
    expect(r.claimable).toBe(false);
  });

  test('bad redshifts are dropped and counted, never used', () => {
    const w = world({ index: 4, N: 100 });
    const junk = [
      { ra: 1, dec: 1, z: NaN },
      { ra: 1, dec: 1, z: -2 },
    ];
    const r = analyse({ ...w, galaxies: [...w.galaxies, ...junk] });
    expect(r.members.dropped).toBe(2);
  });

  test('light, morphology and baryons ride on the same members when asked', () => {
    const w = world({
      index: 5,
      N: 120,
      sigma: 700,
      zc: 0.04,
      rt: 1.2,
      light: true,
    });
    const gal = w.galaxies.map((g, i) => ({
      ...g,
      morph: i % 3 ? 'late' : 'early',
    }));
    const r = analyse(
      { ...w, galaxies: gal },
      {
        light: w.light,
        morphology: {
          neighbours: 4,
          classes: ['early'],
          edgesLog10: [-2, 0, 2, 4],
        },
        gas: {
          value: 1e13,
          sigma: 2e12,
          source: 'invented',
          aperture: 'invented',
        },
      }
    );
    expect(r.light.status).toBe('ok');
    expect(r.massToLight.upperBound).toBe(true);
    expect(r.morphology.bins.reduce((s, b) => s + b.n, 0)).toBeGreaterThan(0);
    expect(r.baryons.gasFraction.value).toBeGreaterThan(0);
  });
});

describe('where the kernel lives', () => {
  test('no shipped module imports it (the panel, the lessons and the packs wait)', () => {
    const root = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'js'
    );
    const hits = [];
    const walk = dir => {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) {
          if (p.endsWith(path.join('kernels', 'galaxy', 'clusters'))) continue;
          walk(p);
        } else if (
          p.endsWith('.js') &&
          /galaxy\/clusters/.test(readFileSync(p, 'utf8'))
        )
          hits.push(path.relative(root, p));
      }
    };
    walk(root);
    expect(hits).toEqual(['validation/groups/galaxyclusters.js']);
  });

  test('the kernel types no projection factor, solar magnitude or tuning constant', () => {
    const dir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'js',
      'kernels',
      'galaxy',
      'clusters'
    );
    const src = readdirSync(dir)
      .filter(f => f.endsWith('.js') && f !== 'synthetic.js')
      .map(f => readFileSync(path.join(dir, f), 'utf8'))
      .join('\n');
    expect(src).not.toMatch(/(factor|K)\s*=\s*\d/);
    expect(src).not.toMatch(/solarAbsMag\s*=\s*\{?\s*value:\s*\d/);
    expect(src).not.toMatch(/cScale\s*=\s*\d|cLocation\s*=\s*\d/);
  });
});
