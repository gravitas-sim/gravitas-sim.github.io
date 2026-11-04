// The rotation-curve decomposition kernel of Prompt 236 (js/kernels/galactic/decomposition.js,
// ROTATION_DECOMPOSITION.md): the components against the oracle's pinned values, the closed forms, the
// fit on the oracle's curve, the refusals, and the properties the consumers rule depends on: the kernel
// shares no code with js/darkMatter.js and the thresholds were not touched after the results. The full
// table is `npm run decomposition:validate`.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as K from '../js/kernels/galactic/decomposition.js';
import * as S from '../js/kernels/galactic/decompositionSynthetic.js';

const here = name => new URL(name, import.meta.url);
const text = name => readFileSync(here(name), 'utf8');
const fixture = name =>
  JSON.parse(text(`./fixtures/rotation-decomposition/${name}.json`));
const oracle = fixture('oracle-results');
const inputs = fixture('oracle-inputs');
const thresholds = fixture('thresholds');
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

describe('the components against the oracle (numpy, scipy, no Gravitas code)', () => {
  test('bulge, NFW, pseudo-isothermal and disk speeds at 20 radii of 5 parameter sets', () => {
    inputs.B1.forEach((s, k) => {
      s.r.forEach((r, i) => {
        expect(
          rel(K.bulgeSpeed(r, s.bulgeMass, s.bulgeScale), oracle.B1[k].bulge[i])
        ).toBeLessThan(1e-11);
        expect(
          rel(K.nfwSpeed(r, s.nfwSpeed, s.nfwScale), oracle.B1[k].nfw[i])
        ).toBeLessThan(1e-11);
        expect(
          rel(K.isothermalSpeed(r, s.isoSpeed, s.isoScale), oracle.B1[k].iso[i])
        ).toBeLessThan(1e-11);
        expect(
          rel(K.diskSpeed(r, s.diskMass, s.diskScale), oracle.B1[k].disk[i])
        ).toBeLessThan(1e-8);
      });
    });
  });
  test("the disk's shape function against scipy's scaled Bessel functions", () => {
    oracle.B2.y.forEach((y, i) =>
      expect(rel(K.diskShape(y), oracle.B2.g[i])).toBeLessThan(1e-9)
    );
  });
  test('G is a consequence of the definitions', () => {
    expect(rel(K.G_KPC, oracle.G)).toBeLessThan(1e-15);
    expect(K.G_KPC).toBeGreaterThan(4.3e-6);
    expect(K.G_KPC).toBeLessThan(4.31e-6);
  });
});

describe('closed forms', () => {
  test('Hernquist: v^2 = G M r / (r + a)^2, and the point-mass limit', () => {
    const v = K.bulgeSpeed(2, 1e10, 0.5);
    expect(v * v).toBeCloseTo((K.G_KPC * 1e10 * 2) / 6.25, 6);
    expect(
      rel(K.bulgeSpeed(5, 1e10, 1e-9), Math.sqrt((K.G_KPC * 1e10) / 5))
    ).toBeLessThan(1e-8);
  });
  test('NFW: the peak sits at the root of its condition, and the inner limit is x/2', () => {
    const x = K.nfwPeakRatio();
    expect(x).toBeGreaterThan(2.16);
    expect(x).toBeLessThan(2.17);
    expect(K.nfwSpeed(x, 1, 1)).toBeGreaterThan(K.nfwSpeed(x * 0.99, 1, 1));
    expect(K.nfwSpeed(x, 1, 1)).toBeGreaterThan(K.nfwSpeed(x * 1.01, 1, 1));
    const small = 1e-5;
    expect(K.nfwSpeed(small, 1, 1) ** 2 / (small / 2)).toBeCloseTo(1, 4);
  });
  test('the disk turns like a point mass far out, and the table, the series and the integrals join', () => {
    const r = 260;
    expect(
      Math.abs((K.diskSpeed(r, 4e10, 2.6) ** 2 * r) / (K.G_KPC * 4e10) - 1)
    ).toBeLessThan(1e-3);
    // The leading small-y form joins the table at 1e-6, the asymptotic series at 1e3.
    expect(
      rel(K.diskShape(1e-6 * 1.0000001), K.diskShape(1e-6 * 0.9999999))
    ).toBeLessThan(1e-6);
    expect(rel(K.diskShape(1000.0001), K.diskShape(999.9999))).toBeLessThan(
      1e-6
    );
    expect(rel(K.diskShape(0.5), K.diskShapeDirect(0.5))).toBeLessThan(1e-9);
  });
  test('the total is the quadrature sum and v_halo scales with v_s', () => {
    const v = {
      bulgeMass: 1e10,
      bulgeScale: 0.7,
      diskMass: 4e10,
      diskScale: 2.6,
      haloSpeed: 300,
      haloScale: 12,
      halo: 'nfw',
    };
    const c = K.componentSpeeds(8, v);
    expect(c.total ** 2).toBeCloseTo(
      c.bulge ** 2 + c.disk ** 2 + c.halo ** 2,
      8
    );
    expect(
      K.componentSpeeds(8, { ...v, haloSpeed: 600 }).halo / c.halo
    ).toBeCloseTo(2, 12);
  });
});

describe('the fit', () => {
  const disk = { luminosity: 5e10, massToLight: { lo: 0.3, hi: 1.5 } };
  const bulge = { mass: 1e10, scale: 0.7 };

  test("agrees with the oracle's scipy fit on its curve (chi-square, curve, one-sigma of the speed)", () => {
    const of = oracle.fit;
    const a = K.decomposeCurve(inputs.fit.points, {
      disk: { massRange: [1.5e10, 7.5e10] },
      bulge,
      radius: 8,
    });
    const b = K.decomposeCurve(inputs.fit.points, {
      disk: { massRange: [1.5e10, 7.5e10] },
      bulge,
      radius: 20,
    });
    expect(a.status).toBe('ok');
    expect(rel(a.chi2, of.chi2)).toBeLessThan(1e-3);
    a.residuals.forEach((q, i) =>
      expect(Math.abs(q.model - of.curve[i])).toBeLessThan(0.05)
    );
    expect(
      rel(a.derived.find(d => d.name === 'vTotal').sigma, of.sigmaTotal['8'])
    ).toBeLessThan(0.05);
    expect(
      rel(b.derived.find(d => d.name === 'vTotal').sigma, of.sigmaTotal['20'])
    ).toBeLessThan(0.05);
    expect(a.adequate).toBe(true);
    expect(a.halo.status).toBe('constrained');
  });

  test('a noise-free curve is reproduced and the disk-halo coupling is reported', () => {
    const radii = S.geometricRadii(1.5, 40, 24);
    const pts = radii.map(r => ({
      r,
      v: K.componentSpeeds(r, S.SYNTHETIC_TRUTH).total,
      err: 4,
    }));
    const r = K.decomposeCurve(pts, { disk, bulge });
    expect(r.chi2).toBeLessThan(1e-6);
    expect(Math.abs(r.diskHaloCorrelation)).toBeLessThanOrEqual(1);
    expect(r.weakestMode.eigenvalue).toBeLessThan(0.2);
    expect(r.values.diskMass / S.SYNTHETIC_TRUTH.diskMass).toBeCloseTo(1, 2);
    const prof = K.diskHaloProfile(pts, { disk, bulge, diskMassGrid: 3 });
    expect(prof.rows).toHaveLength(3);
    expect(prof.minimumDisk.diskMass).toBeCloseTo(1.5e10, -5);
    expect(prof.maximumDisk.diskMass / 7.5e10).toBeCloseTo(1, 9);
    expect(prof.chi2Range).toBeGreaterThan(0);
    expect(prof.rows[1].chi2).not.toBe(prof.rows[0].chi2);
    expect(prof.rows[0].diskMass / prof.minimumDisk.diskMass).toBe(1);
  });

  test('a curve that stops at 6 kpc leaves the halo not constrained and reports no halo interval', () => {
    const pts = S.geometricRadii(1.5, 6, 10).map(r => ({
      r,
      v: K.componentSpeeds(r, S.SYNTHETIC_TRUTH).total,
      err: 4,
    }));
    const r = K.decomposeCurve(pts, { disk, bulge });
    expect(r.halo.constrained).toBe(false);
    expect(r.halo.why).toMatch(/do not fix the halo/);
    for (const p of r.parameters.filter(
      q => q.name === 'haloSpeed' || q.name === 'logHaloScale'
    ))
      if (!p.constrained) {
        expect(p.profileInterval).toBeNull();
        expect(p.covarianceInterval).toBeNull();
      }
    expect(r.derived.find(d => d.name === 'haloMass50').value).toBeNull();
  });

  test('the stars-alone fit of a halo-dominated curve says it does not describe the points', () => {
    const pts = S.geometricRadii(1.5, 40, 24).map(r => ({
      r,
      v: K.componentSpeeds(r, S.SYNTHETIC_TRUTH).total,
      err: 1,
    }));
    const r = K.decomposeCurve(pts, { disk, bulge, halo: 'none' });
    expect(r.halo.status).toBe('no halo');
    expect(r.adequate).toBe(false);
    expect(r.reduced).toBeGreaterThan(10);
    expect(r.scaledForMisfit).toBeGreaterThan(3);
  });

  test('the pseudo-isothermal form is a second halo, with its own citation', () => {
    const v = {
      diskMass: 4e10,
      diskScale: 2.6,
      haloSpeed: 200,
      haloScale: 5,
      halo: 'pseudo-isothermal',
    };
    const pts = S.geometricRadii(1.5, 40, 20).map(r => ({
      r,
      v: K.componentSpeeds(r, v).total,
      err: 3,
    }));
    const r = K.decomposeCurve(pts, { disk, halo: 'pseudo-isothermal' });
    expect(r.model.haloCite).toMatch(/darkMatter/);
    expect(r.chi2).toBeLessThan(1e-4);
  });

  test('the inputs are refused, each with its own code', () => {
    const good = S.syntheticCurve({
      radii: S.geometricRadii(1.5, 40, 24),
      error: 4,
      seed: 't',
      labels: ['x'],
    }).points;
    const code = (pts, o) => K.decomposeCurve(pts, o).code;
    expect(code(good.slice(0, 5), { disk, bulge })).toBe('points');
    expect(
      code(
        good.map((p, i) => (i === 3 ? { ...p, err: 0 } : p)),
        { disk, bulge }
      )
    ).toBe('error');
    expect(
      code(
        good.map((p, i) => (i === 3 ? { ...p, r: -1 } : p)),
        { disk, bulge }
      )
    ).toBe('radius');
    expect(code(good, { bulge })).toBe('disk-mass-range');
    expect(code(good, { disk: { luminosity: 5e10 }, bulge })).toBe(
      'disk-mass-range'
    );
    expect(code(good, { disk, bulge, halo: 'burkert' })).toBe('halo-form');
    expect(
      K.diskMassRange({ luminosity: 1, massToLight: { lo: 2, hi: 1 } }).code
    ).toBe('mass-to-light');
  });

  test('the same input gives the same answer to the last digit', () => {
    const pts = S.syntheticCurve({
      radii: S.geometricRadii(1.5, 40, 24),
      error: 4,
      seed: 'rotdec-236',
      labels: ['E1', 7],
    }).points;
    const a = K.decomposeCurve(pts, { disk, bulge });
    const b = K.decomposeCurve(pts, { disk, bulge });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('what the consumers rule depends on', () => {
  test('the kernel shares no code with the engine copy of the model (js/darkMatter.js)', () => {
    for (const f of ['decomposition.js', 'decompositionSynthetic.js'])
      expect(text(`../js/kernels/galactic/${f}`)).not.toMatch(
        /^import[^;]*(darkMatter|physics)\.js/m
      );
  });
  test('the synthetic galaxy is the one thresholds.json committed', () => {
    const t = thresholds.truth;
    expect(S.SYNTHETIC_TRUTH.diskMass).toBe(t.disk.mass);
    expect(S.SYNTHETIC_TRUTH.diskScale).toBe(t.disk.scale);
    expect(S.SYNTHETIC_TRUTH.haloSpeed).toBe(t.halo.vs);
    expect(S.SYNTHETIC_TRUTH.haloScale).toBe(t.halo.rs);
    expect(S.SYNTHETIC_TRUTH.bulgeMass).toBe(t.bulge.mass);
    expect(S.SYNTHETIC_TRUTH.massToLight).toEqual({
      lo: t.disk.massToLightRange[0],
      hi: t.disk.massToLightRange[1],
    });
  });
  test('the recorded run matches the failed-legs list and the consumers rule', () => {
    const results = fixture('results');
    const failed = fixture('failed-legs').failed;
    const notPass = results.rows
      .filter(r => r.status === 'fail' || r.status === 'not-run')
      .map(r => r.id)
      .sort();
    expect(failed.map(f => f.id).sort()).toEqual(notPass);
    expect(results.consumers.blocking.sort()).toEqual(
      results.rows
        .filter(
          r =>
            ['analytic', 'oracle', 'coverage', 'refusal'].includes(r.group) &&
            r.status !== 'pass'
        )
        .map(r => r.id)
        .sort()
    );
    expect(results.rows.map(r => r.id).sort()).toEqual(
      thresholds.checks.map(c => c.id).sort()
    );
  });
});
