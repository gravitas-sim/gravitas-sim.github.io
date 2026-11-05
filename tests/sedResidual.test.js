// =============================================================================
// The model-residual integration of the SED kernel (Prompt 245, follow-up)
// -----------------------------------------------------------------------------
// bolometricLuminosity({ integration: 'model-residual' }) integrates the exact model between the
// first and last wavelength and adds the trapezoid integral of the data's residuals from it.
// Held here: the default is unchanged, an unknown method and a missing model are refused by code,
// the integral is exact for a noise-free blackbody, it carries the fit's adequacy flag, and the
// chord bias it removes is real (the chords underestimate a curved SED).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as R from '../js/kernels/radiation/index.js';
import * as K from '../js/kernels/sed/index.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';

const bands = new Map(BANDS.map(b => [b.id, R.decodeBand(b)]));
const SUN = { T: 5772, radiusSolar: 1, distancePc: 10 };
const SET = ['B', 'V', 'R', 'I', 'J', 'H', 'Ks'].map(id => ({
  id,
  band: id,
  convention: 'vega-mag',
  sigma: 0.02,
}));
const make = (extra = {}) =>
  K.makeSyntheticSed(
    { star: SUN, points: SET, ...extra },
    { bands, seed: 7, label: 'resid' }
  );
const base = {
  bands,
  distance: { pc: 10 },
  includeModelTails: true,
  draws: 20,
};

describe('the model-residual integration', () => {
  const clean = make({ noise: false });
  test('the default method is the chords, and its numbers do not move', () => {
    const a = K.bolometricLuminosity(clean.points, { ...base, seed: 'a' });
    const b = K.bolometricLuminosity(clean.points, {
      ...base,
      seed: 'a',
      integration: 'chords',
    });
    expect(a.luminosity).toEqual(b.luminosity);
    expect(a.integration).toBe('chords');
  });
  test('a noise-free blackbody is integrated exactly, chords are not', () => {
    const r = K.bolometricLuminosity(clean.points, {
      ...base,
      integration: 'model-residual',
      seed: 'a',
    });
    expect(r.status).toBe('ok');
    expect(
      Math.abs(r.luminosity.watts / clean.truth.luminosityW - 1)
    ).toBeLessThan(1e-8);
    const c = K.bolometricLuminosity(clean.points, { ...base, seed: 'a' });
    expect(c.luminosity.watts / clean.truth.luminosityW).toBeLessThan(0.99);
    expect(r.chordDataFluxWm2).toBeCloseTo(c.dataFluxWm2, 12);
  });
  test('it states the adequacy of the model it leans on', () => {
    const r = K.bolometricLuminosity(clean.points, {
      ...base,
      integration: 'model-residual',
      seed: 'a',
    });
    expect(r.integration).toBe('model-residual');
    expect(r.modelAdequate).toBe(true);
    expect(r.dataFluxNote).toMatch(/fitted blackbody/);
    expect(r.label).toMatch(/EXTRAPOLATED/);
  });
  test('an unknown method and an unconstrained fit are refused by code', () => {
    expect(
      K.bolometricLuminosity(clean.points, { ...base, integration: 'simpson' })
        .code
    ).toBe('integration');
    const two = clean.points.slice(0, 2);
    expect(
      K.bolometricLuminosity(two, { ...base, integration: 'model-residual' })
        .code
    ).toBe('no-model-for-residual');
  });
  test('it is reproducible from a seed', () => {
    const noisy = make();
    const o = { ...base, integration: 'model-residual', seed: 's' };
    expect(K.bolometricLuminosity(noisy.points, o).luminosity).toEqual(
      K.bolometricLuminosity(noisy.points, o).luminosity
    );
  });
  test('an inadequate fit says the data-range flux is model-dependent', () => {
    const pts = make({
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
    }).points;
    const r = K.bolometricLuminosity(pts, {
      ...base,
      integration: 'model-residual',
      seed: 'x',
    });
    expect(r.modelAdequate).toBe(false);
    expect(r.dataFluxNote).toMatch(/model-dependent/);
  });
});
