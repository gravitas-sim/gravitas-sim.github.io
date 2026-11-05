// The galaxy-morphology kernel (Prompt 249, GALAXY_MORPHOLOGY.md): the analytic profiles, the generator, the
// measurement and its refusals, the classification function. The full validation table is
// `npm run morphology:validate`; tests/morphologyResults.test.js holds its pinned results.
import { describe, test, expect } from '@jest/globals';
import * as M from '../js/kernels/galaxy/morphology/index.js';
import { gammaP } from '../js/kernels/statistics/special.js';

const ZP = { mag: 25, source: 'invented synthetic zero point' };
const gauss = {
  kind: 'gaussian',
  sigma: 9,
  q: 0.5,
  paDeg: 25,
  flux: 200000,
  x0: 79.87,
  y0: 78.89,
  psfFwhm: 0,
  noise: false,
};
const measure = (p, o = {}) =>
  M.measureGalaxy(M.generateGalaxyImage(p).image, {
    psfFwhm: 3,
    zeroPoint: ZP,
    draws: 0,
    ...o,
  });

describe('the analytic profiles', () => {
  test('b_n solves P(2n, b) = 0.5 and the Gaussian fraction is 1 - exp(-x)', () => {
    for (const n of [0.5, 1, 2, 4, 6])
      expect(gammaP(2 * n, M.sersicB(n))).toBeCloseTo(0.5, 12);
    const g = M.analyticProfile({ kind: 'gaussian', sigma: 2 });
    expect(g.fraction(2)).toBeCloseTo(1 - Math.exp(-0.5), 14);
  });
  test('the analytic Petrosian radius uses the annulus definition and falls at eta 0.2', () => {
    const prof = M.analyticProfile({ kind: 'sersic', n: 1, re: 9 });
    const t = M.analyticTruth({ kind: 'sersic', n: 1, re: 9 });
    expect(M.petrosianRatio(prof, t.rPetrosian)).toBeCloseTo(0.2, 9);
    expect(t.totalFraction).toBeGreaterThan(0.99);
    expect(t.concentration).toBeGreaterThan(2.5);
    const dev = M.analyticTruth({ kind: 'sersic', n: 4, re: 9 });
    expect(dev.totalFraction).toBeLessThan(t.totalFraction);
    expect(dev.concentration).toBeGreaterThan(t.concentration);
  });
});

describe('the synthetic generator', () => {
  test('is labelled, reproducible from a seed, and carries a truth manifest and the true variance', () => {
    const a = M.generateGalaxyImage({
      kind: 'sersic',
      n: 2,
      re: 9,
      q: 0.7,
      paDeg: 30,
      flux: 50000,
      seed: 5,
      label: 'x',
    });
    const b = M.generateGalaxyImage({
      kind: 'sersic',
      n: 2,
      re: 9,
      q: 0.7,
      paDeg: 30,
      flux: 50000,
      seed: 5,
      label: 'x',
    });
    const c = M.generateGalaxyImage({
      kind: 'sersic',
      n: 2,
      re: 9,
      q: 0.7,
      paDeg: 30,
      flux: 50000,
      seed: 6,
      label: 'x',
    });
    expect(a.label).toMatch(/^SYNTHETIC GALAXY IMAGES/);
    expect(a.truth.n).toBe(2);
    expect(Array.from(a.image.values.slice(5000, 5010))).toEqual(
      Array.from(b.image.values.slice(5000, 5010))
    );
    expect(a.image.values[5000]).not.toBe(c.image.values[5000]);
    expect(a.image.variance.every(v => v > 0)).toBe(true);
  });
  test('the noise-free PSF-free model sums to the stated flux', () => {
    const g = M.generateGalaxyImage({ ...gauss, sky: 0, readNoise: 0 });
    let sum = 0;
    for (const v of g.image.values) sum += v;
    expect(sum / gauss.flux).toBeCloseTo(1, 4);
  });
});

describe('the measurement', () => {
  test('recovers an elliptical Gaussian galaxy: shape, centre, size, magnitude', () => {
    const r = measure(gauss);
    const t = M.analyticTruth({ kind: 'gaussian', sigma: 9 });
    expect(r.status).toBe('ok');
    expect(r.geometry.q).toBeCloseTo(0.5, 2);
    expect(r.geometry.paDeg).toBeCloseTo(25, 0);
    expect(
      Math.hypot(r.geometry.x - gauss.x0, r.geometry.y - gauss.y0)
    ).toBeLessThan(0.02);
    expect(r.size.r50 / t.r50).toBeCloseTo(1, 2);
    expect(r.total.magnitude).toBeCloseTo(
      25 - 2.5 * Math.log10(gauss.flux * t.totalFraction),
      2
    );
    expect(r.label).toMatch(/PSF included/);
  });
  test('the profile and isophotes come back with sigmas and a labelled interval', () => {
    const r = measure(
      { ...gauss, noise: true, seed: 3, label: 'prof' },
      { draws: 12, seed: 7 }
    );
    expect(r.profile).toHaveLength(14);
    expect(r.profile[0].interval.method).toBe('covariance');
    expect(r.isophotes).toHaveLength(8);
    expect(r.uncertainty).toMatchObject({
      method: 'noise-injection',
      draws: 12,
    });
  });
  test('a frame given no zero point returns the instrumental magnitude and says so', () => {
    const r = M.measureGalaxy(M.generateGalaxyImage(gauss).image, {
      psfFwhm: 3,
      draws: 0,
    });
    expect(r.total.instrumental).toBe(true);
    expect(r.flags).toContain('no-zero-point');
    expect(r.total.magnitude).toBeCloseTo(-2.5 * Math.log10(r.total.flux), 9);
  });
  test('the colour of a second band is the magnitude difference at the first band’s aperture', () => {
    const g1 = M.generateGalaxyImage(gauss);
    const g2 = M.generateGalaxyImage({
      ...gauss,
      bandScale: 10 ** (-0.4 * 0.5),
    });
    const r = M.measureGalaxy(g1.image, {
      psfFwhm: 3,
      zeroPoint: ZP,
      draws: 0,
      second: { image: g2.image, psfFwhm: 3 },
    });
    expect(r.colour.value).toBeCloseTo(-0.5, 6);
    const odd = M.measureGalaxy(g1.image, {
      psfFwhm: 3,
      zeroPoint: ZP,
      draws: 0,
      second: { image: g2.image, psfFwhm: 5 },
    });
    expect(odd.colour.flags).toContain('psf-mismatch');
  });
  test('the same seed gives the same sigmas', () => {
    const g = M.generateGalaxyImage({
      ...gauss,
      noise: true,
      seed: 2,
      label: 'rep',
    });
    const a = M.measureGalaxy(g.image, {
      psfFwhm: 3,
      zeroPoint: ZP,
      draws: 8,
      seed: 11,
    });
    const b = M.measureGalaxy(g.image, {
      psfFwhm: 3,
      zeroPoint: ZP,
      draws: 8,
      seed: 11,
    });
    expect(a.size.sigma.r50).toBe(b.size.sigma.r50);
  });
  test('asymmetry rises with an off-centre clump', () => {
    const f = frac =>
      measure({
        kind: 'sersic',
        n: 1,
        re: 9,
        q: 0.5,
        paDeg: 40,
        flux: 200000,
        x0: 79.6,
        y0: 79.4,
        psfFwhm: 0,
        noise: false,
        clump: { fraction: frac },
      }).asymmetry.value;
    expect(f(0.1)).toBeGreaterThan(f(0));
    expect(f(0.3)).toBeGreaterThan(f(0.1));
  });
});

describe('the refusals', () => {
  const frame = (w, h, v = 100) => ({
    width: w,
    height: h,
    values: new Float64Array(w * h).fill(v),
    variance: new Float64Array(w * h).fill(125),
  });
  test('not a frame: too small, no variance, no PSF width', () => {
    expect(M.measureGalaxy(frame(32, 32), { psfFwhm: 3 }).code).toBe(
      'not-a-frame'
    );
    expect(
      M.measureGalaxy(
        { width: 64, height: 64, values: new Float64Array(4096) },
        { psfFwhm: 3 }
      ).code
    ).toBe('not-a-frame');
    expect(M.measureGalaxy(frame(64, 64), {}).code).toBe('not-a-frame');
  });
  test('a blank frame has no source', () => {
    expect(M.measureGalaxy(frame(96, 96), { psfFwhm: 3, draws: 0 }).code).toBe(
      'no-source'
    );
  });
  test('a gradient across the rim is not a flat sky', () => {
    const r = measure({
      kind: 'sersic',
      n: 1,
      re: 9,
      q: 0.7,
      paDeg: 50,
      flux: 100000,
      gradientPeakToPeak: 3,
      seed: 1,
      label: 'grad',
    });
    expect(r.code).toBe('sky-not-flat');
  });
  test('a galaxy too faint, or too large for the frame, is refused', () => {
    expect(
      measure({
        kind: 'sersic',
        n: 1,
        re: 9,
        q: 0.7,
        paDeg: 50,
        flux: 1000,
        seed: 1,
        label: 'faint',
      }).status
    ).toBe('refused');
    const big = measure({
      kind: 'sersic',
      n: 1,
      re: 25,
      q: 0.8,
      paDeg: 30,
      flux: 200000,
      seed: 1,
      label: 'big',
    });
    expect(['frame-too-small', 'petrosian-not-reached']).toContain(big.code);
  });
  test('a point source is unresolved and carries an upper limit only', () => {
    const r = measure({ kind: 'point', flux: 100000, seed: 1, label: 'star' });
    expect(r.status).toBe('unresolved');
    expect(r.size.status).toBe('unresolved');
    expect(r.size.upperLimit).toBeGreaterThan(0);
    expect(r.size.r50).toBeUndefined();
  });
});

describe('the classification function', () => {
  const rule = {
    name: 'invented',
    source: 'a test rule',
    irregularAsymmetryAtLeast: 0.3,
    smoothCompactConcentrationAtLeast: 3.6,
  };
  const A = { status: 'ok', value: 0.05, sigma: 0.02 };
  test('refuses without a rule and a source', () => {
    expect(
      M.classifyMorphology({ concentration: { value: 4, sigma: 0.1 } }, null)
        .code
    ).toBe('missing-rule');
    expect(
      M.classifyMorphology(
        { concentration: { value: 4, sigma: 0.1 } },
        { ...rule, source: ' ' }
      ).code
    ).toBe('missing-rule');
    expect(
      M.classifyMorphology(
        { concentration: { value: 4, sigma: 0.1 } },
        { name: 'x', source: 'y' }
      ).code
    ).toBe('missing-rule');
  });
  test('classes by asymmetry first, then concentration; a measure inside its sigma of a boundary is not constrained', () => {
    expect(
      M.classifyMorphology(
        { concentration: { value: 4.5, sigma: 0.1 }, asymmetry: A },
        rule
      ).class
    ).toBe('smooth-compact');
    expect(
      M.classifyMorphology(
        { concentration: { value: 2.8, sigma: 0.1 }, asymmetry: A },
        rule
      ).class
    ).toBe('disk-like');
    expect(
      M.classifyMorphology(
        {
          concentration: { value: 4.5, sigma: 0.1 },
          asymmetry: { status: 'ok', value: 0.5, sigma: 0.02 },
        },
        rule
      ).class
    ).toBe('irregular');
    const edge = M.classifyMorphology(
      { concentration: { value: 3.62, sigma: 0.2 }, asymmetry: A },
      rule
    );
    expect(edge.status).toBe('not-constrained');
    expect(edge.between).toHaveLength(2);
  });
  test('without an asymmetry the concentration decides alone and the result says so', () => {
    const r = M.classifyMorphology(
      {
        concentration: { value: 4.5, sigma: 0.1 },
        asymmetry: { status: 'not-constrained' },
      },
      rule
    );
    expect(r.class).toBe('smooth-compact');
    expect(r.asymmetryUsed).toBe(false);
  });
});
