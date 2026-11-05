// =============================================================================
// The ISM kernel's public contract (Roadmap III, Prompt 247, Part A)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/ism/thresholds.json, run by tools/ism-validate.mjs and
// held in tests/ismResults.test.js. These tests hold the contracts a caller relies on: the derived
// electron radius, the continuum and the equivalent width on a hand-built spectrum, the medium rule,
// the linear-regime tests and their refusals, the decrement and its inputs, the classification, the
// detector and identifier, and the generator's label, truth manifest and determinism.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as K from '../js/kernels/ism/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { LAW } from '../js/data/radiation/extinction.js';

const CONSTANTS = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/ism/constants-source.json', import.meta.url),
    'utf8'
  )
);
const vac = id => LINES.find(l => l.id === id).vacuum;

describe('the electron radius and the column constant', () => {
  test('r_e is derived from alpha and m_e copied from the pinned reading, not typed', () => {
    expect(K.ALPHA_FS).toBe(CONSTANTS.alpha.value);
    expect(K.M_ELECTRON_KG).toBe(CONSTANTS.m_e.value);
    const re =
      ((CONSTANTS.alpha.value * CONSTANTS.h.value) /
        (2 * Math.PI * CONSTANTS.m_e.value * CONSTANTS.c.value)) *
      100;
    expect(K.ELECTRON_RADIUS_CM / re).toBeCloseTo(1, 14);
    expect(K.COLUMN_CONSTANT.status).toMatch(/constants-source\.json/);
    expect(K.COLUMN_CONSTANT.status).toMatch(/not verified by a fetch/);
    expect(Object.isFrozen(K.COLUMN_CONSTANT)).toBe(true);
  });
  test('the pinned reading names the library and was not fetched', () => {
    expect(CONSTANTS.reader).toMatch(/offline/);
    expect(CONSTANTS.alpha.reference).toMatch(/CODATA/);
  });
  test('the column density scales as W / (f lambda^2) and peak depth and column invert', () => {
    const a = K.columnFromWidth(0.01, 589, 0.5);
    expect(K.columnFromWidth(0.02, 589, 0.5) / a).toBeCloseTo(2, 13);
    expect(K.columnFromWidth(0.01, 589, 1) / a).toBeCloseTo(0.5, 13);
    expect(K.columnFromWidth(0.01, 2 * 589, 0.5) / a).toBeCloseTo(0.25, 13);
    const tau = K.peakOpticalDepth(1e12, 0.5, 589, 3);
    expect(K.columnFromPeakDepth(tau, 0.5, 589, 3) / 1e12).toBeCloseTo(1, 12);
  });
  test('the linear-regime ratio is 1 at no depth and falls as 1 - tau0 / (2 sqrt 2)', () => {
    expect(K.linearRegimeRatio(0)).toBe(1);
    expect(K.linearRegimeRatio(1e-3)).toBeCloseTo(1 - 1e-3 / (2 * Math.SQRT2), 6);
    expect(K.linearRegimeRatio(5)).toBeLessThan(0.5);
  });
});

describe('the continuum and the direct equivalent width', () => {
  const lambda = Float64Array.from({ length: 400 }, (_, i) => 500 + i * 0.01);
  const flat = (depthFn = () => 0, slope = 0) => ({
    lambdaNm: lambda,
    flux: Float64Array.from(lambda, l => (1 + slope * (l - 502)) * (1 - depthFn(l))),
    sigma: Float64Array.from(lambda, () => 0.01),
    medium: 'vacuum',
    resolvingPower: 2000,
  });
  const windows = {
    continuumWindows: [
      [500.2, 500.8],
      [503.2, 503.8],
    ],
    lineWindow: [501.0, 503.0],
  };
  test('a flat spectrum with a box dip gives the dip’s area, positive for absorption', () => {
    const s = flat(l => (l >= 501.995 && l < 502.205 ? 0.5 : 0));
    const e = K.equivalentWidth(s, windows);
    expect(e.status).toBe('ok');
    expect(e.widthNm).toBeCloseTo(0.5 * 0.21, 3);
    expect(e.kind).toBe('absorption');
    expect(e.convention).toMatch(/absorption/);
  });
  test('an emission bump gives a negative width and says so', () => {
    const s = flat(l => (l >= 502 && l < 502.1 ? -1 : 0));
    const e = K.equivalentWidth(s, windows);
    expect(e.widthNm).toBeLessThan(0);
    expect(e.kind).toBe('emission');
  });
  test('the continuum choice is recorded and the constant-continuum result is beside it', () => {
    const e = K.equivalentWidth(flat(() => 0, 0.05), windows);
    expect(e.continuum.choice).toMatch(/linear/);
    expect(e.continuum.windows).toEqual(windows.continuumWindows);
    expect(Math.abs(e.widthNm)).toBeLessThan(1e-12);
    expect(e.constantContinuumSystematicNm).toBeUndefined();
    expect(e.continuumSystematicNm).toBeGreaterThanOrEqual(0);
    expect(e.constantContinuum.widthNm).toBeDefined();
  });
  test('errors from scatter are marked when the spectrum has no sigma', () => {
    const s = { ...flat(), sigma: null };
    s.flux = Float64Array.from(s.flux, (v, i) => v + (i % 2 ? 0.01 : -0.01));
    const c = K.fitContinuum(s, windows.continuumWindows);
    expect(c.errorsFromScatter).toBe(true);
    expect(c.pixelSigma).toBeGreaterThan(0.005);
  });
  test('refusals carry codes', () => {
    const s = flat();
    expect(K.equivalentWidth({ ...s, medium: undefined }, windows).code).toBe('medium-missing');
    expect(K.fitContinuum(s, [[500.2, 500.21], [503.2, 503.21]]).code).toBe('too-few-continuum-samples');
    expect(K.fitContinuum(s, [[500.2, 500.8]]).code).toBe('bad-windows');
    expect(K.equivalentWidth(s, { ...windows, lineWindow: [600, 601] }).code).toBe('empty-window');
    expect(K.checkSpectrum({ ...s, lambdaNm: lambda.slice(0, 5), flux: s.flux.slice(0, 5), sigma: null }).code).toBe('too-few-samples');
  });
});

describe('lines, velocities and the medium', () => {
  const w = (o = {}) =>
    K.generateNebula({ lines: LINES, law: LAW, hbetaPeak: 2, noise: false, ...o });
  test('a noise-free velocity is recovered to a few hundredths of a km/s', () => {
    const r = K.lineVelocity(w({ velocityKmS: 123 }), { restNm: vac('h-alpha'), restMedium: 'vacuum' });
    expect(r.status).toBe('ok');
    expect(Math.abs(r.velocityKmS - 123)).toBeLessThan(0.05);
    expect(r.interval.status).toBe('ok');
    expect(r.medium).toBe('vacuum');
    expect(r.form).toBe('relativistic');
  });
  test('the medium is required and never converted', () => {
    const air = w({ medium: 'air' });
    expect(K.lineVelocity(air, { restNm: vac('h-alpha'), restMedium: 'vacuum' }).code).toBe('medium-mismatch');
    expect(K.lineVelocity(air, { restNm: vac('h-alpha') }).code).toBe('medium-missing');
    expect(K.restOf({ id: 'x', vacuum: 500 }, 'air').code).toBe('no-rest-wavelength');
    const rest = K.restOf(LINES[0], 'air');
    expect(rest.restMedium).toBe('air');
    expect(K.lineVelocity(air, rest).status).toBe('ok');
  });
  test('a line on a binned grid is not fitted (severely undersampled)', () => {
    const binned = w({ log10Step: 3e-4, samples: 1280 });
    const r = K.fitGaussianLine(binned, { guessNm: vac('h-alpha') });
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('severely-undersampled');
  });
  test('the pair rule flags unresolved lines by the dip', () => {
    expect(K.pairResolved(0.5, 1).resolved).toBe(false);
    expect(K.pairResolved(3, 1).resolved).toBe(true);
    expect(K.DIP_CUT).toBe(0.1);
  });
});

describe('the column density and its regime tests', () => {
  const lineOf = (id, f, W, s, fit) => ({ id, lambdaNm: id === 'a' ? 589 : 589.6, f, fSource: 'invented', width: { widthNm: W, sigmaNm: s }, fit });
  test('a doublet at the atomic ratio passes T1 and gives a number with an interval', () => {
    const ratio = (0.45 * 589 ** 2) / (0.2 * 589.6 ** 2);
    const r = K.columnDensity({ lines: [lineOf('a', 0.45, 0.002 * ratio, 1e-4), lineOf('b', 0.2, 0.002, 1e-4)] });
    expect(r.status).toBe('ok');
    expect(r.regime.test).toMatch(/T1/);
    expect(r.regime.passed).toBe(true);
    expect(r.interval.status).toBe('ok');
    expect(r.assumes).toMatch(/oscillator strength/);
  });
  test('a doublet ratio far below the atomic ratio is refused as saturated, with no number', () => {
    const r = K.columnDensity({ lines: [lineOf('a', 0.45, 0.003, 1e-4), lineOf('b', 0.2, 0.0025, 1e-4)] });
    expect(r.status).toBe('refused');
    expect(r.code).toBe('saturated');
    expect(r.columnCm2).toBeUndefined();
    expect(r.regime.ratio).toBeLessThan(r.regime.ratioLinear);
  });
  test('a ratio above the atomic one is refused too', () => {
    const r = K.columnDensity({ lines: [lineOf('a', 0.45, 0.01, 1e-4), lineOf('b', 0.2, 0.002, 1e-4)] });
    expect(r.code).toBe('ratio-above-atomic');
  });
  test('one line without a fit cannot be shown to be linear', () => {
    const r = K.columnDensity({ lines: [lineOf('a', 0.45, 0.002, 1e-4)] });
    expect(r.code).toBe('linear-regime-untested');
  });
  test('inputs without a source, a positive f or a detection are refused by code', () => {
    expect(K.columnDensity({ lines: [{ ...lineOf('a', 0.5, 0.002, 1e-4), fSource: '' }] }).code).toBe('missing-source');
    expect(K.columnDensity({ lines: [lineOf('a', 0, 0.002, 1e-4)] }).code).toBe('bad-oscillator-strength');
    expect(K.columnDensity({ lines: [lineOf('a', 0.5, 0.0001, 1e-3)] }).code).toBe('no-detection');
    expect(K.columnDensity({ lines: [lineOf('a', 0.5, -0.002, 1e-4)] }).code).toBe('no-detection');
    expect(K.columnDensity({ lines: [] }).code).toBe('bad-lines');
  });
  test('a saturated synthetic doublet at high resolution is refused and a linear one is not', () => {
    const f = { 'na1-d1': 0.2, 'na1-d2': 0.45 };
    const col = tau0 => {
      const w = K.generateSodium({ lines: LINES, f, seed: 'unit', tau0, noise: false });
      const lines = w.truth.lines.map(t => {
        const sg = (t.observedNm * Math.hypot(3, 299792.458 / 30000 / 2.3548200450309493)) / 299792.458;
        const e = K.equivalentWidth(w, {
          lineWindow: [t.observedNm - 5 * sg, t.observedNm + 5 * sg],
          continuumWindows: [[t.observedNm - 12 * sg, t.observedNm - 6 * sg], [t.observedNm + 6 * sg, t.observedNm + 12 * sg]],
        });
        return { id: t.id, lambdaNm: t.restNm, f: f[t.id], fSource: 'invented', width: { widthNm: e.widthNm, sigmaNm: 1e-5 } };
      });
      return { column: K.columnDensity({ lines }), truth: w.truth.columnCm2 };
    };
    const lin = col(0.05);
    expect(lin.column.status).toBe('ok');
    expect(Math.abs(lin.column.columnCm2 / lin.truth - 1)).toBeLessThan(0.05);
    expect(col(5).column.code).toBe('saturated');
  });
});

describe('the Balmer decrement', () => {
  const base = {
    numerator: { lambdaNm: vac('h-alpha'), flux: 9, sigma: 0.1 },
    denominator: { lambdaNm: vac('h-beta'), flux: 3, sigma: 0.1 },
    intrinsic: { ratio: 3, source: 'invented', conditions: 'invented' },
    RV: 3.1,
    law: LAW,
  };
  test('equal ratios give zero; a redder ratio gives a positive excess consistent with k', () => {
    expect(K.balmerDecrement(base).ebv).toBeCloseTo(0, 12);
    const r = K.balmerDecrement({ ...base, numerator: { ...base.numerator, flux: 12 } });
    expect(r.ebv).toBeGreaterThan(0);
    const dk = r.kDenominator - r.kNumerator;
    expect(2.5 * Math.log10(12 / 3 / 3)).toBeCloseTo(r.ebv * dk, 12);
    expect(r.assumes).toMatch(/foreground/);
  });
  test('the intrinsic ratio, its source and R_V are inputs with no default', () => {
    expect(K.balmerDecrement({ ...base, intrinsic: undefined }).code).toBe('missing-intrinsic-ratio');
    expect(K.balmerDecrement({ ...base, intrinsic: { ratio: 3 } }).code).toBe('missing-source');
    expect(K.balmerDecrement({ ...base, RV: undefined }).code).toBe('missing-RV');
    expect(K.balmerDecrement({ ...base, law: undefined }).code).toBe('missing-law');
  });
  test('weak lines, non-positive fluxes, wavelengths outside the law and a wrong order are refused', () => {
    expect(K.balmerDecrement({ ...base, numerator: { ...base.numerator, sigma: 3 } }).code).toBe('low-signal');
    expect(K.balmerDecrement({ ...base, numerator: { ...base.numerator, flux: 0 } }).code).toBe('bad-flux');
    expect(K.balmerDecrement({ ...base, numerator: { ...base.numerator, lambdaNm: 5000 } }).code).toBe('outside-law');
    expect(K.balmerDecrement({ ...base, numerator: base.denominator, denominator: base.numerator }).code).toBe('no-lever-arm');
  });
  test('de-reddening inverts the reddening and carries the uncertainty from E(B-V)', () => {
    const k = 3.1 * 0.9;
    void k;
    const d = K.deredden({ flux: 1, lambdaNm: vac('h-beta'), ebv: 0.5, sigmaEbv: 0.05, RV: 3.1, law: LAW });
    const back = K.deredden({ flux: d.flux, lambdaNm: vac('h-beta'), ebv: -0.5, RV: 3.1, law: LAW });
    expect(back.flux).toBeCloseTo(1, 12);
    expect(d.sigmaFactor).toBeGreaterThan(0);
    expect(K.deredden({ flux: 1, lambdaNm: vac('h-beta'), ebv: 0.5, law: LAW }).code).toBe('missing-RV');
  });
});

describe('the classification, detection and identification', () => {
  test('a narrow offset line is an interstellar candidate and a broad one at the star’s velocity is stellar', () => {
    const w = K.generateStar({ lines: LINES, seed: 'unit', stellarVelocityKmS: 20, ismVelocityKmS: 120 });
    const sv = K.stellarVelocity(w, { lines: ['h-gamma', 'h-delta'].map(id => ({ restNm: vac(id), restMedium: 'vacuum' })), broadSigmaKmS: 500 });
    expect(sv.status).toBe('ok');
    const ca = K.lineVelocity(w, { restNm: vac('ca2-k'), restMedium: 'vacuum' });
    expect(K.classifyAbsorption(w, ca, sv).class).toBe('interstellar-candidate');
    const hb = K.lineVelocity(w, { restNm: vac('h-beta'), restMedium: 'vacuum', halfWidthPx: Math.ceil((5 * 500) / (299792.458 * Math.LN10 * 1e-4)) });
    expect(K.classifyAbsorption(w, hb, sv).class).toBe('stellar');
    expect(K.classifyAbsorption(w, hb, sv).note).toMatch(/never a proof/);
  });
  test('an emission line is not classified', () => {
    const w = K.generateNebula({ lines: LINES, law: LAW, noise: false, hbetaPeak: 2 });
    const r = K.lineVelocity(w, { restNm: vac('h-alpha'), restMedium: 'vacuum' });
    expect(K.classifyAbsorption(w, r, { velocityKmS: 0, sigmaKmS: 1 }).code).toBe('not-absorption');
  });
  test('the detector finds the lines of a noise-free nebula and the identifier names them', () => {
    const w = K.generateNebula({ lines: LINES, law: LAW, noise: false, hbetaPeak: 3, velocityKmS: 300, ebv: 0.3 });
    const det = K.detectFeatures(w);
    expect(det.features.length).toBe(3);
    const id = K.identifyFeatures(det.features, LINES, { medium: 'vacuum', z: 300 / 299792.458, pixelNm: 0.1 });
    expect(id.features.map(f => f.line?.id).sort()).toEqual(['h-alpha', 'h-beta', 'h-gamma']);
    expect(K.identifyFeatures(det.features, LINES, {}).code).toBe('medium-missing');
    const z = K.solveRedshift(det.features, LINES, { medium: 'vacuum', zRange: { min: -0.005, max: 0.005, step: 2e-5 }, pixelNm: 0.1 });
    expect(z.status).toBe('ok');
    expect(Math.abs(z.z - 300 / 299792.458)).toBeLessThan(2e-5);
  });
});

describe('the generators', () => {
  test('every world carries the label and a truth manifest and is deterministic for a seed', () => {
    const f = { 'na1-d1': 0.2, 'na1-d2': 0.45 };
    const worlds = [
      K.generateNebula({ lines: LINES, law: LAW, seed: 's' }),
      K.generateStar({ lines: LINES, seed: 's' }),
      K.generateSodium({ lines: LINES, f, seed: 's', tau0: 0.05 }),
    ];
    for (const w of worlds) {
      expect(w.label).toBe(K.ISM_SYNTHETIC_LABEL);
      expect(w.label.startsWith('SYNTHETIC ISM SPECTRUM')).toBe(true);
      expect(w.truth.seed).toBe('s');
      expect(w.truth.lines.length).toBeGreaterThan(0);
      expect(w.sigma.every(v => v === w.truth.sigmaPixel)).toBe(true);
    }
    const again = K.generateNebula({ lines: LINES, law: LAW, seed: 's' });
    expect(Array.from(again.flux)).toEqual(Array.from(worlds[0].flux));
    const other = K.generateNebula({ lines: LINES, law: LAW, seed: 't' });
    expect(Array.from(other.flux)).not.toEqual(Array.from(worlds[0].flux));
    expect(worlds[2].truth.lines.every(l => l.fInvented)).toBe(true);
  });
  test('the noise-free nebula’s truth line fluxes follow the ratios and the reddening', () => {
    const w = K.generateNebula({ lines: LINES, law: LAW, ebv: 0.5, noise: false });
    const a = w.truth.lines.find(l => l.id === 'h-alpha');
    expect(a.fluxIntrinsic / w.truth.lines.find(l => l.id === 'h-beta').fluxIntrinsic).toBeCloseTo(3, 12);
    expect(a.fluxObserved).toBeLessThan(a.fluxIntrinsic);
  });
});
