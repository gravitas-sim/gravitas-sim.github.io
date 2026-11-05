// =============================================================================
// The SED kernel's public contract (Roadmap III, Prompt 245)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/sed/thresholds.json, run by
// tools/sed-validate.mjs and held in tests/sedResults.test.js. These tests hold the
// contracts a caller relies on: the conventions and their refusals, the band-integrated
// point (which is not the monochromatic point at its pivot), the blackbody fit and the
// places it must say "not constrained", the nonsimultaneity rule, the labelled
// extrapolation, the integrated SED, and that a synthetic SED stays labelled.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as R from '../js/kernels/radiation/index.js';
import * as K from '../js/kernels/sed/index.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';

const bands = new Map(BANDS.map(b => [b.id, R.decodeBand(b)]));
const SUN = { T: 5772, radiusSolar: 1, distancePc: 10 };
const SET = [
  { id: 'B', band: 'B', convention: 'vega-mag', sigma: 0.02 },
  { id: 'V', band: 'V', convention: 'vega-mag', sigma: 0.02 },
  { id: 'R', band: 'R', convention: 'vega-mag', sigma: 0.02 },
  { id: 'I', band: 'I', convention: 'vega-mag', sigma: 0.02 },
  { id: 'J', band: 'J', convention: 'vega-mag', sigma: 0.03 },
  { id: 'H', band: 'H', convention: 'vega-mag', sigma: 0.03 },
  { id: 'Ks', band: 'Ks', convention: 'vega-mag', sigma: 0.03 },
];
const make = (extra = {}, ctx = {}) =>
  K.makeSyntheticSed(
    { star: SUN, points: SET, ...extra },
    { bands, seed: 7, label: 't', ...ctx }
  );

describe('flux-density conventions', () => {
  test('AB zero point and the five-magnitude step', () => {
    expect(K.abMagToJy(0)).toBe(3631);
    expect(K.abMagToJy(5) / K.abMagToJy(0)).toBeCloseTo(0.01, 15);
    expect(K.jyToAbMag(K.abMagToJy(17.3))).toBeCloseTo(17.3, 12);
  });
  test('Vega magnitudes go through the pack offset and refuse a band without one', () => {
    const off = bands.get('V').abMinusVega;
    expect(K.magToJy(12, 'vega-mag', off)).toBeCloseTo(
      K.abMagToJy(12 + off),
      15
    );
    expect(K.magToJy(12, 'vega-mag', null)).toBeNaN();
    expect(
      K.jyToMag(K.magToJy(12, 'vega-mag', off), 'vega-mag', off)
    ).toBeCloseTo(12, 12);
  });
  test('f_nu and f_lambda cross at a wavelength, and nu f_nu equals lambda f_lambda', () => {
    const f = 2.5;
    const lam = 550;
    const fl = K.jyToFlambda(f, lam);
    expect(K.flambdaToJy(fl, lam)).toBeCloseTo(f, 12);
    expect(K.nuFnu(f, lam) / K.lambdaFlambda(fl, lam)).toBeCloseTo(1, 12);
  });
  test('only the listed conventions are conventions', () => {
    for (const c of [
      'ab-mag',
      'vega-mag',
      'Jy',
      'mJy',
      'W/m2/nm',
      'erg/s/cm2/Angstrom',
    ])
      expect(K.isConvention(c)).toBe(true);
    for (const c of ['', undefined, 'STmag', 'mag', 'jy'])
      expect(K.isConvention(c)).toBe(false);
  });
});

describe('the point contract', () => {
  const good = {
    id: 'x',
    kind: 'band-integrated',
    band: 'V',
    convention: 'ab-mag',
    value: 12,
    sigma: 0.02,
  };
  test('a band-integrated point sits at the band pivot, not at a typed wavelength', () => {
    const r = K.normalizePoint({ ...good, lambdaNm: 1 }, bands);
    expect(r.ok).toBe(true);
    expect(r.point.lambdaNm).toBe(R.pivotWavelength(bands.get('V')));
    expect(r.point.sigmaLn).toBeCloseTo(0.4 * Math.log(10) * 0.02, 15);
  });
  test('every refusal carries its code', () => {
    const code = p => K.normalizePoint(p, bands).code;
    expect(code({ ...good, convention: undefined })).toBe('convention-unknown');
    expect(code({ ...good, band: 'nope' })).toBe('no-bandpass');
    expect(code({ ...good, kind: 'x' })).toBe('kind');
    expect(code({ ...good, convention: 'W/m2/nm' })).toBe(
      'band-flux-per-wavelength'
    );
    expect(
      code({
        id: 'm',
        kind: 'monochromatic',
        convention: 'Jy',
        value: 1,
        sigma: 0.1,
      })
    ).toBe('wavelength');
    expect(
      code({
        id: 'm',
        kind: 'monochromatic',
        lambdaNm: 500,
        convention: 'vega-mag',
        value: 1,
        sigma: 0.1,
      })
    ).toBe('vega-offset-missing');
    expect(code({ ...good, value: NaN })).toBe('flux');
    expect(code({ ...good, sigma: 0 })).toBe('sigma');
    expect(
      code({
        id: 'm',
        kind: 'monochromatic',
        lambdaNm: 500,
        convention: 'Jy',
        value: 1,
        sigma: 0.6,
      })
    ).toBe('error-too-large');
  });
  test('a duplicate id and a non-list are refused', () => {
    expect(K.normalizePoints([good, good], bands).code).toBe('duplicate-id');
    expect(K.normalizePoints('x', bands).code).toBe('points');
  });
  test('a flux per unit wavelength on a monochromatic point converts at its wavelength', () => {
    const r = K.normalizePoint(
      {
        id: 'm',
        kind: 'monochromatic',
        lambdaNm: 550,
        convention: 'W/m2/nm',
        value: 1e-14,
        sigma: 1e-16,
      },
      bands
    );
    expect(r.point.fnuJy).toBeCloseTo(K.flambdaToJy(1e-14, 550), 18);
    expect(r.point.sigmaLn).toBeCloseTo(0.01, 12);
  });
});

describe('band-integrated versus monochromatic', () => {
  test('the band mean of a blackbody is not its monochromatic value at the pivot', () => {
    const band = bands.get('u');
    const mean = K.bandIntegratedJy(band, 5772);
    const mono = K.monochromaticJy(5772, R.pivotWavelength(band));
    expect(Math.abs(mean / mono - 1)).toBeGreaterThan(1e-3);
  });
  test('the monochromatic model equals the radiation kernel Planck function', () => {
    const lam = 1234;
    expect(
      Math.exp(K.lnMonochromatic(4000, lam)) / K.monochromaticJy(4000, lam)
    ).toBeCloseTo(1, 12);
  });
  test('the log model does not underflow in the Wien tail', () => {
    expect(Number.isFinite(K.lnMonochromatic(800, 100))).toBe(true);
  });
});

describe('the blackbody fit', () => {
  const clean = make({ noise: false });
  test('recovers the star it was made from, with a distance giving the luminosity', () => {
    const fit = K.fitBlackbody(clean.points, { bands, distance: { pc: 10 } });
    expect(fit.status).toBe('ok');
    expect(fit.T.value).toBeCloseTo(5772, 4);
    expect(fit.theta.value / clean.truth.theta).toBeCloseTo(1, 8);
    expect(fit.luminosity.watts / clean.truth.luminosityW).toBeCloseTo(1, 8);
    expect(fit.label).toMatch(/colour temperature/);
    expect(fit.label).toMatch(/reddening/);
  });
  test('states its range and labels the model outside it', () => {
    const fit = K.fitBlackbody(clean.points, { bands });
    expect(fit.range.lambdaMinNm).toBeLessThan(fit.range.lambdaMaxNm);
    expect(K.evaluateModel(fit.model, 800).extrapolated).toBe(false);
    expect(K.evaluateModel(fit.model, 150).extrapolated).toBe(true);
    expect(K.evaluateModel(fit.model, 30000).extrapolated).toBe(true);
  });
  test('intervals bracket the best fit and widen with the level', () => {
    const noisy = make({}, { realisation: 3 });
    const fit = K.fitBlackbody(noisy.points, { bands });
    const [a, b] = fit.T.intervals;
    expect(a.lo).toBeLessThan(fit.T.value);
    expect(a.hi).toBeGreaterThan(fit.T.value);
    expect(b.lo).toBeLessThan(a.lo);
    expect(b.hi).toBeGreaterThan(a.hi);
    expect(fit.chi2).toBeGreaterThan(0);
  });
  test('two points are not constrained, and no temperature is returned', () => {
    const r = K.fitBlackbody(clean.points.slice(0, 2), { bands });
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('too-few-points');
    expect(r.T).toBeUndefined();
  });
  test('points on the Rayleigh-Jeans side alone cannot fix a temperature', () => {
    const hot = K.makeSyntheticSed(
      {
        star: { T: 30000, radiusSolar: 3, distancePc: 100 },
        points: [12000, 22000, 60000, 100000].map((l, i) => ({
          id: `p${i}`,
          kind: 'monochromatic',
          lambdaNm: l,
          convention: 'Jy',
          sigmaFraction: 0.05,
        })),
      },
      { bands, seed: 1, label: 'rj' }
    );
    const r = K.fitBlackbody(hot.points, { bands });
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('temperature-open');
    expect(r.bestFit.unconstrained).toBe(true);
  });
  test('a bad point refuses the whole SED and names its id', () => {
    const r = K.fitBlackbody(
      [
        ...clean.points,
        {
          id: 'bad',
          kind: 'band-integrated',
          band: 'V',
          convention: 'STmag',
          value: 1,
          sigma: 1,
        },
      ],
      { bands }
    );
    expect(r.status).toBe('refused');
    expect(r.id).toBe('bad');
  });
  test('a basis made for the same points is reused; one for other points is not', () => {
    const a = K.fitBlackbody(clean.points, { bands });
    const b = K.fitBlackbody(clean.points, { bands, basis: a.basis });
    expect(b.basis).toBe(a.basis);
    const c = K.fitBlackbody(clean.points.slice(0, 5), {
      bands,
      basis: a.basis,
    });
    expect(c.basis).not.toBe(a.basis);
  });
  test('a misspecified SED is flagged inadequate', () => {
    const r = K.fitBlackbody(
      make({
        excess: { T: 1200, ratio: 3, ratioAtNm: 12000 },
        points: [
          ...SET,
          {
            id: 'M3',
            kind: 'monochromatic',
            lambdaNm: 12000,
            convention: 'Jy',
            sigmaFraction: 0.03,
          },
          {
            id: 'M4',
            kind: 'monochromatic',
            lambdaNm: 22000,
            convention: 'Jy',
            sigmaFraction: 0.03,
          },
        ],
      }).points,
      { bands }
    );
    expect(r.adequate).toBe(false);
  });
});

describe('nonsimultaneity', () => {
  const ctx = { allowance: 0.1, referenceEpoch: 1000, windowDays: 30 };
  const mk = epoch => ({ id: 'a', epoch, sigmaLn: 0.05 });
  test('the window, the missing epoch and the widening', () => {
    const w = e => K.applyNonsimultaneity([mk(e)], ctx).points[0];
    expect(w(1030).nonsimultaneous).toBe(false);
    expect(w(1030.1).nonsimultaneous).toBe(true);
    expect(w(null).nonsimultaneous).toBe(true);
    expect(w(1100).sigmaLnEff).toBeCloseTo(Math.sqrt(0.05 ** 2 + 0.1 ** 2), 15);
    expect(w(1000).sigmaLnEff).toBe(0.05);
  });
  test('without an allowance nothing is widened and the result says so', () => {
    const r = K.applyNonsimultaneity([mk(null)], {});
    expect(r.widening.assumesSimultaneous).toBe(true);
    expect(r.points[0].sigmaLnEff).toBe(0.05);
  });
  test('an allowance without a reference epoch is refused', () => {
    expect(K.applyNonsimultaneity([mk(1)], { allowance: 0.1 }).code).toBe(
      'reference-epoch'
    );
  });
  test('widening raises the interval of a fit', () => {
    const s = make(
      {
        epochs: {
          reference: 0,
          ids: ['J', 'H', 'Ks'],
          offsetDays: 400,
          trueVariability: 0.1,
        },
      },
      { realisation: 2 }
    );
    const plain = K.fitBlackbody(s.points, { bands });
    const wide = K.fitBlackbody(s.points, {
      bands,
      allowance: 0.1,
      referenceEpoch: 0,
      windowDays: 30,
    });
    expect(wide.T.intervals[0].hi - wide.T.intervals[0].lo).toBeGreaterThan(
      plain.T.intervals[0].hi - plain.T.intervals[0].lo
    );
    expect(wide.widening.widened).toEqual(['J', 'H', 'Ks']);
  });
});

describe('the integrated SED and the luminosity', () => {
  const clean = make({ noise: false });
  test('the Planck tails and the middle add up to sigma T^4 theta^2', () => {
    const theta = 2e-9;
    for (const T of [3000, 5772, 20000]) {
      const t = K.modelTails(T, theta, 400, 2200);
      const mid = K.modelFluxBetween(T, theta, 400, 2200);
      expect(
        (t.below + mid + t.above) / (R.SIGMA_SB * T ** 4 * theta * theta)
      ).toBeCloseTo(1, 12);
    }
  });
  test('the Planck fractions are continuous across their two series', () => {
    expect(K.lowerFraction(1 - 1e-12)).toBeCloseTo(
      K.lowerFraction(1 + 1e-12),
      9
    );
    expect(K.lowerFraction(2.5) + K.upperFraction(2.5)).toBeCloseTo(1, 14);
  });
  test('a power law is integrated exactly by its chords', () => {
    const lam = [100, 300, 1000];
    const f = lam.map(l => 7 * (l / 100) ** -2.5);
    const exact = ((7 * 100) / -1.5) * ((1000 / 100) ** -1.5 - 1);
    expect(K.chordFlux(lam, f) / exact).toBeCloseTo(1, 12);
    const f1 = lam.map(l => 5 * (100 / l));
    expect(K.chordFlux(lam, f1) / (5 * 100 * Math.log(10))).toBeCloseTo(1, 12);
  });
  test('data only by default, tails only on request and labelled', () => {
    const fit = K.fitBlackbody(clean.points, { bands });
    const plain = K.integrateSed(clean.points, { bands });
    expect(plain.tails).toBeNull();
    expect(plain.label).toMatch(/nothing outside/);
    const withT = K.integrateSed(clean.points, {
      bands,
      fit,
      includeModelTails: true,
    });
    expect(withT.tails.extrapolated).toBe(true);
    expect(withT.tails.label).toMatch(/EXTRAPOLATED/);
    expect(withT.totalFluxWm2).toBeGreaterThan(withT.dataFluxWm2);
    expect(
      K.integrateSed(clean.points, { bands, includeModelTails: true }).code
    ).toBe('no-model-for-tails');
  });
  test('a luminosity needs a distance, and its interval is reproducible from a seed', () => {
    expect(K.bolometricLuminosity(clean.points, { bands }).code).toBe(
      'distance'
    );
    const opts = {
      bands,
      distance: { pc: 10, sigmaPc: 0.1 },
      includeModelTails: true,
      draws: 40,
      seed: 'a',
    };
    const a = K.bolometricLuminosity(clean.points, opts);
    const b = K.bolometricLuminosity(clean.points, opts);
    expect(a.luminosity).toEqual(b.luminosity);
    expect(a.luminosity.sigmaLn).toBeGreaterThan((2 * 0.1) / 10 - 1e-12);
    expect(a.includesExtrapolation).toBe(true);
    expect(a.label).toMatch(/EXTRAPOLATED/);
    const c = K.bolometricLuminosity(clean.points, { ...opts, seed: 'b' });
    expect(c.luminosity.sigmaLnFlux).not.toBe(a.luminosity.sigmaLnFlux);
  });
});

describe('the synthetic generator', () => {
  test('is labelled, carries its truth, and is reproducible from the seed', () => {
    const a = make({}, { realisation: 1 });
    const b = make({}, { realisation: 1 });
    expect(a.label).toMatch(/^SYNTHETIC SED/);
    expect(a.points).toEqual(b.points);
    expect(a.truth.T).toBe(5772);
    expect(a.truth.noise).toBe(true);
    expect(make({}, { realisation: 2 }).points).not.toEqual(a.points);
  });
  test('the noise-free magnitudes are the kernel model through the bands', () => {
    const s = make({ noise: false });
    const theta = s.truth.theta;
    const v = s.points.find(p => p.id === 'V');
    const ab = K.jyToAbMag(
      theta * theta * K.bandIntegratedJy(bands.get('V'), 5772)
    );
    expect(v.value).toBeCloseTo(ab - bands.get('V').abMinusVega, 10);
  });
});
