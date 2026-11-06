// =============================================================================
// The AGN kernel's public contract (Roadmap III, Prompt 252)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/agn/thresholds.json, run by tools/agn-validate.mjs and held in
// tests/agnResults.test.js. These tests hold what a caller relies on: the constants and their provenance, the
// luminosity and bolometric terms and their refusals, the Eddington bound and its label, the time scale and the
// size bound, the BPT classes, probabilities and limits, the quasar redshift wrapper, and the generators' labels,
// truth manifests and determinism.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import * as A from '../js/kernels/agn/index.js';
import * as G from '../js/kernels/galaxy/index.js';
import { LINES } from '../js/data/radiation/lines.js';
import { createCosmology } from '../js/kernels/cosmology/index.js';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const CONSTANTS = read('tests/fixtures/agn/constants-source.json');
const cosmology = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
const band = (z, value = 1e-13, sigma = 0) =>
  A.bandLuminosity({
    observedNm: 550 * (1 + z),
    nuFnu: { value, sigma },
    z,
    cosmology,
  });

describe('the constants and their provenance', () => {
  test('GM_sun, the proton mass and the Thomson cross section are the pinned reading of astropy, not typed', () => {
    expect(A.GM_SUN).toBe(CONSTANTS.GM_sun.value);
    expect(A.M_PROTON_KG).toBe(CONSTANTS.m_p.value);
    expect(A.SIGMA_THOMSON_M2).toBe(CONSTANTS.sigma_T.value);
    expect(A.EDDINGTON_CONSTANTS.status).toMatch(/constants-source\.json/);
    expect(CONSTANTS.GM_sun.unit).toBe('m3 / s2');
  });
  test('the Eddington luminosity per solar mass is derived and has the textbook order of magnitude', () => {
    expect(A.L_EDD_PER_MSUN_W).toBeGreaterThan(1.2e31);
    expect(A.L_EDD_PER_MSUN_W).toBeLessThan(1.3e31);
  });
  test('the committed design constants are the thresholds file’s', () => {
    expect(A.QSO_HIGH_PASS_WINDOW).toBe(401);
    expect(G.HIGH_PASS_WINDOW).toBe(101);
    expect(A.N_SIGMA).toBe(5);
    expect(A.K_GUARD).toBe(3);
    expect(A.MIN_EPOCHS).toBe(5);
    expect(A.BPT_MIN_SNR).toBe(3);
    expect(A.BPT_DRAWS).toBe(2000);
    expect(A.BPT_P_MIN).toBe(0.9);
    expect(A.BLEND_FWHM).toBe(1.5);
    expect(A.WINDOW_SHARE).toBe(0.4);
    expect(A.ONE_SIDED_95).toBeCloseTo(1.6449, 4);
  });
  test('the kernel holds no dividing curve, bolometric factor or forbidden-line wavelength by default', () => {
    for (const name of Object.keys(A))
      expect(name).not.toMatch(/DEFAULT_(CURVES|BC|DEFINITION|LINES)/i);
    expect(A.INVENTED_BPT_CURVES.source).toMatch(/INVENTED/);
    expect(A.INVENTED_BC.source).toMatch(/INVENTED/);
  });
});

describe('luminosity and the bolometric correction', () => {
  test('the band luminosity is 4 pi d_L^2 nu F_nu, at the rest wavelength observed / (1 + z), with no K-correction said aloud', () => {
    const b = band(1, 2e-13);
    const dL = cosmology.luminosityDistance(1) * 3.0856775814913673e22;
    expect(b.luminosityW / (4 * Math.PI * dL * dL * 2e-13)).toBeCloseTo(1, 12);
    expect(b.restNm).toBeCloseTo(550, 10);
    expect(b.kCorrection).toBe('none');
    expect(b.statement).toMatch(/no K-correction/);
    expect(b.cosmology).toEqual({ H0: 70, Om: 0.3, OL: 0.7 });
  });
  test('the flux error becomes a logarithmic sigma to first order', () => {
    const b = band(0.5, 1e-13, 1e-14);
    expect(b.sigmaLog10).toBeCloseTo(0.1 / Math.LN10, 12);
  });
  test('inputs are refused by code', () => {
    const o = { observedNm: 550, nuFnu: { value: 1e-13 }, z: 0.1, cosmology };
    expect(A.bandLuminosity({ ...o, observedNm: 0 }).code).toBe('bad-band');
    expect(A.bandLuminosity({ ...o, nuFnu: { value: -1 } }).code).toBe(
      'bad-flux'
    );
    expect(
      A.bandLuminosity({ ...o, nuFnu: { value: 1, sigma: -1 } }).code
    ).toBe('bad-flux-error');
    expect(A.bandLuminosity({ ...o, z: -0.1 }).code).toBe('bad-redshift');
    expect(A.bandLuminosity({ ...o, cosmology: undefined }).code).toBe(
      'no-cosmology'
    );
  });
  test('the bolometric term carries both sigmas, the model-limited flag and the factor’s source', () => {
    const r = A.bolometricLuminosity({
      band: band(0.5, 1e-13, 2e-15),
      bc: A.INVENTED_BC,
    });
    expect(r.status).toBe('ok');
    expect(r.sigmaModel).toBe(0.2);
    expect(r.sigmaTotal).toBeCloseTo(Math.hypot(r.sigmaStat, 0.2), 14);
    expect(r.modelLimited).toBe(true);
    expect(r.bc.source).toMatch(/INVENTED/);
    expect(r.interval.lo).toBeLessThan(r.luminosityW);
    expect(r.interval.hi).toBeGreaterThan(r.luminosityW);
    expect(r.intervalStatOnly.hi - r.intervalStatOnly.lo).toBeLessThan(
      r.interval.hi - r.interval.lo
    );
    expect(r.statement).toMatch(/model-limited/);
    expect(r.lowerLimit95W).toBeLessThan(r.interval.lo);
  });
  test('a band that does not map to the factor’s band is refused, with the rest wavelength', () => {
    const r = A.bolometricLuminosity({
      band: A.bandLuminosity({
        observedNm: 550,
        nuFnu: { value: 1e-13 },
        z: 0.5,
        cosmology,
      }),
      bc: A.INVENTED_BC,
    });
    expect(r.status).toBe('refused');
    expect(r.code).toBe('band-mismatch');
    expect(r.restNm).toBeCloseTo(366.667, 2);
    expect(r.luminosityW).toBeUndefined();
  });
  test('a factor without a source, a positive value, a scatter or a band is refused', () => {
    const b = band(0.2);
    const f = o =>
      A.bolometricLuminosity({ band: b, bc: { ...A.INVENTED_BC, ...o } }).code;
    expect(f({ source: ' ' })).toBe('no-source');
    expect(f({ value: 0 })).toBe('bad-factor');
    expect(f({ scatterDex: -1 })).toBe('bad-scatter');
    expect(f({ restNm: 0 })).toBe('no-band');
    expect(A.bolometricLuminosity({ bc: A.INVENTED_BC }).code).toBe('no-band');
  });
});

describe('the Eddington bound', () => {
  test('the luminosity is linear in the mass and the ratio inverts it', () => {
    const a = A.eddingtonLuminosity(1e6).luminosityW;
    const b = A.eddingtonLuminosity(3e6).luminosityW;
    expect(b / a).toBeCloseTo(3, 14);
    expect(
      A.eddingtonRatio({ luminosityW: b, massSolar: 3e6 }).ratio
    ).toBeCloseTo(1, 14);
    expect(A.eddingtonLuminosity(-1).code).toBe('bad-mass');
  });
  test('the mass bound is a lower bound with its assumptions, from the luminosity’s lower limit', () => {
    const bol = A.bolometricLuminosity({
      band: band(0.5, 1e-13, 5e-15),
      bc: A.INVENTED_BC,
    });
    const m = A.eddingtonMassBound({ bolometric: bol });
    expect(m.kind).toBe('lower-bound');
    expect(m.sign).toBe('M >=');
    expect(m.massBoundLower95Solar).toBeLessThan(m.massBoundSolar);
    expect(m.assumes.join(' ')).toMatch(/electron scattering/);
    expect(m.assumes.join(' ')).toMatch(/spherical/);
    expect(m.statement).toMatch(/not an estimate/);
    expect(
      A.eddingtonMassBound({ bolometric: { status: 'refused' } }).code
    ).toBe('no-luminosity');
  });
  test('a luminosity with no positive lower limit gives no bound; bad inputs are refused', () => {
    expect(A.eddingtonMassBound({ luminosityW: 1e36, sigmaW: 1e36 }).code).toBe(
      'no-lower-limit'
    );
    expect(A.eddingtonMassBound({ luminosityW: 0 }).code).toBe(
      'bad-luminosity'
    );
    expect(A.eddingtonMassBound({ luminosityW: 1, sigmaW: -1 }).code).toBe(
      'bad-error'
    );
  });
});

describe('the variability time scale and the size bound', () => {
  test('a noise-free sinusoid’s fastest e-folding time is its closed form to a percent, from above', () => {
    const c = A.generateSinusoidCurve({
      amplitude: 0.5,
      periodDays: 80,
      epochs: 400,
      relativeError: 1e-9,
      noise: false,
    });
    const r = A.fastestTimescale(c);
    expect(r.status).toBe('ok');
    expect(r.tauDays / c.truth.tauMinDays).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(r.tauDays / c.truth.tauMinDays).toBeLessThan(1.01);
    expect(r.tauUpDays).toBeGreaterThanOrEqual(r.tauDays);
  });
  test('a flat noisy curve is not constrained and carries no number', () => {
    const c = A.generateSinusoidCurve({
      amplitude: 0,
      periodDays: 100,
      epochs: 60,
      relativeError: 0.02,
      seed: 'flat',
    });
    const r = A.fastestTimescale(c);
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('no-significant-pair');
    expect(r.tauDays).toBeUndefined();
  });
  test('refusals by code', () => {
    const base = {
      t: [0, 1, 2, 3, 4, 5],
      flux: [1, 1, 1, 1, 1, 1],
      sigma: Array(6).fill(0.1),
    };
    expect(A.fastestTimescale({ ...base, t: [0, 1, 1, 3, 4, 5] }).code).toBe(
      'times-not-increasing'
    );
    expect(
      A.fastestTimescale({ t: [0, 1], flux: [1, 1], sigma: [1, 1] }).code
    ).toBe('too-few-epochs');
    expect(
      A.fastestTimescale({ ...base, sigma: [0.1, 0.1, 0, 0.1, 0.1, 0.1] }).code
    ).toBe('bad-error');
    expect(A.fastestTimescale({ ...base, flux: [1, 1] }).code).toBe(
      'length-mismatch'
    );
    expect(A.fastestTimescale({ ...base, t: [0, NaN, 2, 3, 4, 5] }).code).toBe(
      'not-finite'
    );
  });
  test('the size bound scales as 1 / (1 + z) and as the Doppler factor, and says it is an upper limit', () => {
    const a = A.sizeBound({ tauDays: 1, z: 0 });
    const b = A.sizeBound({ tauDays: 1, z: 1 });
    const c = A.sizeBound({ tauDays: 1, z: 0, delta: 10 });
    expect(b.sizeM / a.sizeM).toBeCloseTo(0.5, 14);
    expect(c.sizeM / a.sizeM).toBeCloseTo(10, 14);
    expect(a.kind).toBe('upper-bound');
    expect(a.sign).toBe('R <=');
    expect(a.assumes.join(' ')).toMatch(/coherent/);
    expect(A.sizeBound({ tauDays: 0, z: 0 }).code).toBe('bad-timescale');
    expect(A.sizeBound({ tauDays: 1, z: -1 }).code).toBe('bad-redshift');
    expect(A.sizeBound({ tauDays: 1, z: 0, delta: 0.5 }).code).toBe(
      'bad-doppler'
    );
  });
});

describe('the BPT classification', () => {
  const lines = (x, y, rel = 1e-6) => ({
    ha: { flux: 1, sigma: rel },
    hb: { flux: 1, sigma: rel },
    n: { flux: 10 ** x, sigma: rel * 10 ** x },
    o: { flux: 10 ** y, sigma: rel * 10 ** y },
  });
  test('the classes follow the curves, and the right-of-asymptote rules hold', () => {
    const d = A.INVENTED_BPT_CURVES;
    expect(A.bptClass(-1.5, 0.3, d)).toBe('star-forming');
    expect(A.bptClass(-1.5, 0.77, d)).toBe('composite');
    expect(A.bptClass(-1.5, 1.2, d)).toBe('agn');
    expect(A.bptClass(0.2, -0.6, d)).toBe('composite');
    expect(A.bptClass(0.2, 0.5, d)).toBe('agn');
    expect(A.bptClass(0.7, -0.5, d)).toBe('agn');
  });
  test('a class carries its probabilities, the definition’s source and the limits', () => {
    const r = A.classifyBpt({
      lines: lines(-1, 0.1),
      definition: A.INVENTED_BPT_CURVES,
    });
    expect(r.status).toBe('ok');
    expect(r.class).toBe('star-forming');
    expect(r.probability['star-forming']).toBe(1);
    expect(r.definitionSource).toMatch(/INVENTED/);
    expect(r.limits).toBe(A.BPT_LIMITS);
    expect(A.BPT_LIMITS.join(' ')).toMatch(/two line ratios/);
    expect(A.BPT_LIMITS.join(' ')).toMatch(/Seyfert-LINER/);
  });
  test('the classification is deterministic given a seed', () => {
    const l = lines(-0.5, 0.17, 0.1);
    const a = A.classifyBpt({
      lines: l,
      definition: A.INVENTED_BPT_CURVES,
      seed: 's',
    });
    const b = A.classifyBpt({
      lines: l,
      definition: A.INVENTED_BPT_CURVES,
      seed: 's',
    });
    expect(a).toEqual(b);
  });
  test('a point on a curve is class-ambiguous with its probabilities; a missing source or bad curves are refused', () => {
    const d = A.INVENTED_BPT_CURVES;
    const y =
      d.curves.starForming.a / (-1 - d.curves.starForming.b) +
      d.curves.starForming.c;
    const r = A.classifyBpt({ lines: lines(-1, y, 0.16), definition: d });
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('class-ambiguous');
    expect(Object.keys(r.probability).sort()).toEqual([
      'agn',
      'composite',
      'star-forming',
    ]);
    expect(
      A.classifyBpt({ lines: lines(-1, 0), definition: { curves: d.curves } })
        .code
    ).toBe('no-source');
    expect(
      A.classifyBpt({
        lines: lines(-1, 0),
        definition: {
          source: 's',
          curves: {
            starForming: { a: 1, b: 1, c: 1 },
            agn: { a: 1, b: 0, c: 1 },
          },
        },
      }).code
    ).toBe('bad-curves');
    expect(
      A.classifyBpt({ lines: { ha: { flux: 1 } }, definition: d }).code
    ).toBe('bad-line');
  });
  test('an undetected line names itself and gives no class', () => {
    const l = lines(-1, 0);
    l.o = { flux: 0.01, sigma: 0.05 };
    const r = A.classifyBpt({ lines: l, definition: A.INVENTED_BPT_CURVES });
    expect(r.status).toBe('not-constrained');
    expect(r.code).toBe('line-not-detected');
    expect(r.lines).toEqual(['o']);
    expect(r.class).toBeUndefined();
  });
  test('the measured lines of a synthetic world recover the truth ratios inside a few sigma, and the ratios survive the 1 + z stretch', () => {
    const w = A.generateNarrowLines({
      lines: LINES,
      z: 0.1,
      x: -0.6,
      y: 0.1,
      hAlphaFlux: 3,
      snr: 20,
      seed: 'unit',
    });
    const m = A.measureBptLines(w, {
      z: 0.1,
      rest: w.truth.restNm,
      sources: w.truth.sources,
    });
    expect(m.status).toBe('ok');
    const c = A.classifyBpt({
      lines: m.lines,
      definition: A.INVENTED_BPT_CURVES,
    });
    expect(Math.abs(c.x + 0.6)).toBeLessThan(5 * c.sigmaX);
    expect(Math.abs(c.y - 0.1)).toBeLessThan(5 * c.sigmaY);
  });
  test('lines outside the spectrum, a blend and a missing source are refused by code', () => {
    const o = z => A.generateNarrowLines({ lines: LINES, z, seed: 'r' });
    const run = (w, extra = {}) =>
      A.measureBptLines(w, {
        z: w.truth.z,
        rest: w.truth.restNm,
        sources: w.truth.sources,
        ...extra,
      });
    expect(run(o(0.6)).code).toBe('line-outside-coverage');
    const blend = A.generateNarrowLines({
      lines: LINES,
      z: 0.1,
      restSeparationNm: 0.3,
      seed: 'b',
    });
    expect(run(blend).code).toBe('unresolved-blend');
    expect(run(o(0.1), { sources: {} }).code).toBe('no-source');
    expect(run(o(0.1), { rest: { ha: 1 } }).code).toBe('no-rest');
  });
});

describe('the quasar redshift', () => {
  const tpl = A.quasarTemplate({ lines: LINES });
  const zr = { min: 0, max: 2.6 };
  test('a noise-free world is recovered where its lines are not aliased, with the limits attached', () => {
    const w = A.generateQuasar({
      lines: LINES,
      z: 0.1234,
      noise: false,
      snr: 20,
    });
    const r = A.quasarRedshift(w, tpl, { zRange: zr });
    expect(r.status).toBe('ok');
    expect(Math.abs(r.z - 0.1234)).toBeLessThan(1e-5);
    expect(r.limits.join(' ')).toMatch(/noise only/);
    expect(r.modelTerm.kind).toBe('grid-floor');
    expect(r.sigmaZTotal).toBeGreaterThan(r.sigmaZ);
  });
  test('a caller’s velocity systematic enters as a separate model-limited term', () => {
    const w = A.generateQuasar({ lines: LINES, z: 0.3, snr: 15, seed: 'sys' });
    const r = A.quasarRedshift(w, tpl, { zRange: zr, systematicKmS: 300 });
    expect(r.modelSigmaZ).toBeCloseTo((1.3 * 300) / 299792.458, 5);
    expect(r.sigmaZTotal).toBeGreaterThan(r.sigmaZ);
  });
  test('the galaxy kernel’s default window is unchanged and the wider window is an opt-in', () => {
    const w = A.generateQuasar({ lines: LINES, z: 0.5, seed: 'win', snr: 15 });
    const a = G.crossCorrelate(w, tpl, { zRange: zr });
    const b = G.crossCorrelate(w, tpl, { zRange: zr, highPassWindow: 101 });
    expect(a.z).toBe(b.z);
    expect(a.q).toBe(b.q);
  });
  test('a template without a source is refused, never defaulted', () => {
    const w = A.generateQuasar({ lines: LINES, z: 0.2, seed: 'ns' });
    const r = A.quasarRedshift(
      w,
      { ...tpl, source: undefined },
      { zRange: zr }
    );
    expect(r.status).toBe('refused');
  });
});

describe('the generators', () => {
  test('every generated object carries its label and a truth manifest, and a seed fixes it', () => {
    const q1 = A.generateQuasar({ lines: LINES, z: 1, seed: 'x' });
    const q2 = A.generateQuasar({ lines: LINES, z: 1, seed: 'x' });
    const q3 = A.generateQuasar({ lines: LINES, z: 1, seed: 'y' });
    expect(q1.label).toBe(A.QUASAR_SYNTHETIC_LABEL);
    expect(q1.label).toMatch(/SYNTHETIC/);
    expect(q1.truth.z).toBe(1);
    expect(q1.truth.lines.length).toBe(6);
    expect(q1.truth.lines.filter(l => l.invented)).toHaveLength(3);
    expect(Array.from(q1.flux)).toEqual(Array.from(q2.flux));
    expect(Array.from(q1.flux)).not.toEqual(Array.from(q3.flux));
    const n = A.generateNarrowLines({ lines: LINES });
    expect(n.label).toBe(A.NARROW_SYNTHETIC_LABEL);
    expect(n.truth.sources.n).toMatch(/INVENTED/);
    expect(A.quasarTemplate({ lines: LINES }).label).toBe(
      A.QUASAR_TEMPLATE_LABEL
    );
    expect(A.quasarTemplate({ lines: LINES }).source).toMatch(/synthetic/);
    expect(
      A.generateSinusoidCurve({
        amplitude: 0.5,
        periodDays: 10,
        epochs: 6,
        relativeError: 0.01,
      }).label
    ).toMatch(/SYNTHETIC/);
  });
  test('the invented lines are factors of H-alpha and equal no pack line', () => {
    const ha = LINES.find(l => l.id === 'h-alpha').vacuum;
    const list = A.quasarLineList({ lines: LINES });
    for (const [id, f] of Object.entries(A.QUASAR_WORLD.inventedFactors))
      expect(list.find(l => l.id === id).restNm).toBeCloseTo(f * ha, 10);
    for (const l of list.filter(x => x.invented))
      for (const p of LINES)
        expect(Math.abs(l.restNm - p.vacuum)).toBeGreaterThan(1e-3);
  });
  test('the continuum is the stated power law at 550 nm, the unit of the noise', () => {
    const w = A.generateQuasar({
      lines: LINES,
      z: 0,
      noise: false,
      featureless: true,
    });
    let i550 = 0;
    for (let i = 0; i < w.lambdaNm.length; i++)
      if (Math.abs(w.lambdaNm[i] - 550) < Math.abs(w.lambdaNm[i550] - 550))
        i550 = i;
    expect(w.flux[i550]).toBeCloseTo((w.lambdaNm[i550] / 550) ** -1.5, 6);
    expect(w.truth.sigmaPixel).toBeCloseTo(0.1, 12);
  });
});
