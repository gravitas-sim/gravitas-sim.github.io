// =============================================================================
// The calibration lab's kernel (Roadmap II, Prompt 86), each part held to what
// it must equal
// -----------------------------------------------------------------------------
// The frame forward model recovers each stated parameter from its own frames;
// the reduction nodes recover the truth manifest over many seeds, and the
// uncertainty they report is the one the scatter shows (the CCD equation); the
// calibration algebra is checked on textbook arithmetic; the exposure-time
// calculator is held to the closed forms of its three limits and to a published
// photon flux. Tolerances are fixed by the method (a standard error times 4.5, a
// closed form to rounding), not by the result.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

import {
  simulateFrame,
  calibrationSet,
  detectorPattern,
  fractionIn,
  masterBias,
  masterDark,
  masterFlat,
  gainFromPairs,
  calibrate,
  maskCosmicRays,
  aperturePhotometry,
  aperturePixels,
  differentialMagnitude,
  combineFrames,
  median,
  buildMasters,
  mastersVariance,
  reduceSeries,
  fitLightCurve,
  fitSinusoid,
  KIND,
  noiseTerms,
  exposureForSnr,
  snrAt,
  dominantTerm,
  snrByRadius,
  photonRateVega,
  bandPhotonIntegral,
  collectingArea,
  ZERO_POINT_V,
  AREA_M2,
  TELESCOPE,
  SERIES_FIELD,
  FRAME_FIELD,
  labSeries,
  labCalibration,
  DEFAULT_DETECTOR,
} from '../js/kernels/detector/index.js';
import { KIND as PIPELINE_KIND } from '../js/measure/pipeline.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import { fractionIn as imageFractionIn } from '../js/forward/models/image.js';
import { FORWARD_MODELS, runForward } from '../js/forward/index.js';
import {
  frameFromObservation,
  runCalibrationSet,
} from '../js/forward/models/ccd.js';
import { validateObservation } from '../js/observatory/schema.js';
import { valid } from './jsonSchemaSubset.js';
import { observationJson } from '../js/observatory/export.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const G = DEFAULT_DETECTOR.gain;
const R = DEFAULT_DETECTOR.readNoise;
const SIGMA_PIX = DEFAULT_DETECTOR.fwhm / (2 * Math.sqrt(2 * Math.LN2));
const enclosed = (x, y, r) => {
  let s = 0;
  for (const i of aperturePixels({ width: 48, height: 48 }, x, y, r))
    s +=
      fractionIn((i % 48) - 0.5, (i % 48) + 0.5, x, SIGMA_PIX) *
      fractionIn(
        Math.floor(i / 48) - 0.5,
        Math.floor(i / 48) + 0.5,
        y,
        SIGMA_PIX
      );
  return s;
};

describe('the frame forward model', () => {
  test('a spec is a frame: the same seed gives the same counts, another seed does not', () => {
    const a = simulateFrame({ seed: 's', kind: 'bias' });
    const b = simulateFrame({ seed: 's', kind: 'bias' });
    const c = simulateFrame({ seed: 't', kind: 'bias' });
    expect(Array.from(a.values)).toEqual(Array.from(b.values));
    expect(Array.from(a.values)).not.toEqual(Array.from(c.values));
  });

  test('the Gaussian integral is the image model’s', () => {
    for (const [lo, hi, c, s] of [
      [0.5, 1.5, 1.2, 1.1],
      [-3, 4, 0.3, 2],
    ])
      expect(fractionIn(lo, hi, c, s)).toBe(imageFractionIn(lo, hi, c, s));
  });

  test('the flat field has a mean of exactly 1, structure, and is the same in every frame of a seed', () => {
    const p = detectorPattern('s', {});
    expect(Math.abs(mean(p.flat) - 1)).toBeLessThan(1e-12);
    expect(Math.min(...p.flat)).toBeLessThan(0.9);
    const q = detectorPattern('s', {});
    expect(Array.from(q.flat)).toEqual(Array.from(p.flat));
    expect(Array.from(detectorPattern('t', {}).flat)).not.toEqual(
      Array.from(p.flat)
    );
  });

  test('a calibration set holds what was asked, with the exposures stated', () => {
    const cs = calibrationSet(
      { seed: 's' },
      { nBias: 4, nDark: 3, nFlat: 5, darkExposure: 90 }
    );
    expect([cs.bias.length, cs.dark.length, cs.flat.length]).toEqual([4, 3, 5]);
    expect(cs.bias[0].exposure).toBe(0);
    expect(cs.dark[0].exposure).toBe(90);
    expect(cs.bias[0].kind).toBe('bias');
  });

  test('refuses what is not a detector, in words', () => {
    expect(() => simulateFrame({ seed: 's', detector: { gain: 0 } })).toThrow(
      /gain/
    );
    expect(() => simulateFrame({ seed: 's', kind: 'nope' })).toThrow(
      /no frame kind/
    );
    expect(() =>
      simulateFrame({ seed: 's', detector: { vignette: 1.2 } })
    ).toThrow(/vignette/);
  });

  test('bias frames: the level, and the read noise from a pair, over 40 seeds', () => {
    const level = [];
    const read = [];
    for (let k = 0; k < 40; k++) {
      const cs = calibrationSet(
        { seed: `bias${k}` },
        { nBias: 2, nDark: 1, nFlat: 2 }
      );
      level.push(mean(cs.bias[0].values));
      const d = Float64Array.from(
        cs.bias[0].values,
        (v, i) => v - cs.bias[1].values[i]
      );
      read.push((G * sd(d)) / Math.SQRT2);
    }
    // The column pattern has sigma 2 counts over 48 columns: its mean wanders by 0.29 counts a seed.
    expect(Math.abs(mean(level) - DEFAULT_DETECTOR.biasLevel)).toBeLessThan(
      (4.5 * 0.29) / Math.sqrt(40)
    );
    // Read noise 8 plus a rounding of 1/12 count squared: 8.018. 2 percent covers 4.5 standard errors.
    expect(Math.abs(mean(read) / 8.018 - 1)).toBeLessThan(0.02);
  });

  test('gain and read noise from two bias and two flat frames, over 40 seeds', () => {
    const gain = [];
    const read = [];
    for (let k = 0; k < 40; k++) {
      const cs = calibrationSet(
        { seed: `pair${k}` },
        { nBias: 2, nDark: 1, nFlat: 2 }
      );
      const r = gainFromPairs(cs.bias[0], cs.bias[1], cs.flat[0], cs.flat[1]);
      gain.push(r.gain);
      read.push(r.readNoise);
    }
    expect(Math.abs(mean(gain) / G - 1)).toBeLessThan(0.02);
    expect(Math.abs(mean(read) / 8.018 - 1)).toBeLessThan(0.02);
  });

  test('dark current: the master dark gives the stated rate; hot pixels are a minority', () => {
    const rates = [];
    for (let k = 0; k < 20; k++) {
      const cs = calibrationSet({ seed: `dark${k}` }, { nBias: 10, nDark: 7 });
      const b = masterBias(cs.bias, { gain: G });
      const d = masterDark(cs.dark, b.image, { gain: G });
      rates.push(d.node.quantities.find(q => q.id === 'rate').value);
    }
    expect(Math.abs(mean(rates) / DEFAULT_DETECTOR.darkRate - 1)).toBeLessThan(
      0.05
    );
    const p = detectorPattern('hot', {});
    expect(p.hot.length).toBeGreaterThan(5);
    expect(p.hot.length).toBeLessThan(80);
    for (const i of p.hot)
      expect(p.dark[i]).toBeGreaterThan(DEFAULT_DETECTOR.darkRate + 1.9);
  });

  test('the star’s electrons are conserved: counts above the sky, times the gain, over 30 seeds', () => {
    const det = {
      vignette: 0,
      dustCount: 0,
      qeScatter: 0,
      cosmicRate: 0,
      hotFraction: 0,
      biasColumnSigma: 0,
      darkRate: 0,
    };
    const ratio = [];
    for (let k = 0; k < 30; k++) {
      const f = simulateFrame({
        seed: `cons${k}`,
        detector: det,
        exposure: 60,
        scene: { sky: 3, sources: [{ x: 24, y: 24, rate: 600 }] },
      });
      let total = 0;
      for (const v of f.values) total += (v - DEFAULT_DETECTOR.biasLevel) * G;
      ratio.push((total - 3 * 60 * 48 * 48) / (600 * 60));
    }
    // The star's whole PSF lies inside the 48 x 48 frame; noise on the total is about 0.8 percent a frame.
    expect(Math.abs(mean(ratio) - 1)).toBeLessThan(
      (4.5 * 0.0085) / Math.sqrt(30) + 1e-3
    );
  });

  test('saturation: a full well clips the electrons, the converter clips the counts', () => {
    const det = {
      biasColumnSigma: 0,
      cosmicRate: 0,
      qeScatter: 0,
      vignette: 0,
      dustCount: 0,
      readNoise: 0,
    };
    const f = simulateFrame({
      seed: 'sat',
      detector: det,
      exposure: 60,
      scene: { sky: 0, sources: [{ x: 24, y: 24, rate: 30000 }] },
    });
    expect(f.truth.saturated).toBeGreaterThan(3);
    const top = Math.max(...f.values);
    expect(top).toBe(
      Math.round(DEFAULT_DETECTOR.biasLevel + DEFAULT_DETECTOR.fullWell / G)
    );
    const adc = simulateFrame({
      seed: 'adc',
      kind: 'flat',
      exposure: 5,
      flatLevel: 20000,
      detector: { gain: 0.1, fullWell: 1e6 },
    });
    expect(Math.max(...adc.values)).toBe(65535);
  });

  test('cosmic rays: nearly all that land on the sky are flagged, and a clean frame flags none', () => {
    let landed = 0;
    let found = 0;
    let clean = 0;
    for (let k = 0; k < 40; k++) {
      const det = { cosmicRate: 0.1 };
      const sources = FRAME_FIELD.sources.map(({ x, y, rate }) => ({
        x,
        y,
        rate,
      }));
      const f = simulateFrame({
        seed: `cr${k}`,
        detector: det,
        exposure: 60,
        scene: { sky: 3, sources },
      });
      const e = {
        ...f,
        values: Float64Array.from(f.values, v => (v - 500) * G),
      };
      const m = maskCosmicRays(e, { readNoise: R });
      for (const c of f.truth.cosmic) {
        const nearStar = sources.some(
          s => Math.hypot(s.x - c.x, s.y - c.y) < 7
        );
        if (nearStar || c.electrons < 3000) continue;
        landed++;
        if (m.mask[c.y * 48 + c.x]) found++;
      }
      const q = simulateFrame({
        seed: `cl${k}`,
        detector: { cosmicRate: 0 },
        exposure: 60,
        scene: { sky: 3, sources },
      });
      clean += maskCosmicRays(
        { ...q, values: Float64Array.from(q.values, v => (v - 500) * G) },
        { readNoise: R }
      ).count;
    }
    expect(landed).toBeGreaterThan(100);
    expect(found / landed).toBeGreaterThan(0.95);
    expect(clean).toBe(0);
  });
});

describe('the reduction nodes', () => {
  test('the calibration algebra on textbook arithmetic: (raw - bias - dark x t/T) / flat', () => {
    const img = vals => ({
      width: 2,
      height: 2,
      exposure: 0,
      values: Float64Array.from(vals),
    });
    const bias = img([100, 102, 98, 100]);
    const dark = { ...img([20, 40, 0, 10]), exposure: 100 };
    const flat = img([1, 0.5, 2, 1]);
    const star = [1000, 500, 2000, 100];
    // What the detector gives: bias + dark x t/T + flat x signal.
    const raw = {
      ...img(
        star.map(
          (s, i) => bias.values[i] + dark.values[i] * 0.5 + flat.values[i] * s
        )
      ),
      exposure: 50,
    };
    const out = calibrate(raw, { bias, dark, flat });
    for (let i = 0; i < 4; i++)
      expect(out.image.values[i]).toBeCloseTo(star[i], 10);
    expect(out.nodes.map(n => n.tool)).toEqual([
      'biasSubtract',
      'darkSubtract',
      'flatDivide',
    ]);
    expect(out.nodes[1].params.scale).toBe(0.5);
  });

  test('combining: the mean and the median, pixel by pixel, and the median ignores one outlier', () => {
    const f = v => ({
      width: 2,
      height: 1,
      exposure: 0,
      values: Float64Array.from(v),
    });
    const frames = [f([1, 10]), f([2, 10]), f([300, 10])];
    expect(Array.from(combineFrames(frames, 'mean'))).toEqual([101, 10]);
    expect(Array.from(combineFrames(frames, 'median'))).toEqual([2, 10]);
    expect(median(Float64Array.from([5, 1, 3, 2]))).toBe(2.5);
    expect(() => combineFrames([])).toThrow(/no frames/);
  });

  test('the master flat is a ratio: mean 1, and a flat with a known gradient comes back', () => {
    const f = (v, e = 5) => ({
      width: 4,
      height: 1,
      exposure: e,
      values: Float64Array.from(v),
    });
    const bias = f([100, 100, 100, 100], 0);
    const flat = [f([1100, 2100, 3100, 4100]), f([1100, 2100, 3100, 4100])];
    const m = masterFlat(flat, bias);
    expect(Array.from(m.image.values)).toEqual([0.4, 0.8, 1.2, 1.6]);
    expect(m.node.quantities.find(q => q.id === 'level').value).toBe(2500);
  });

  test('the pair method on textbook numbers: flats of 1000 and bias of 100 with known differences', () => {
    const mk = (m, d) => ({
      width: 2,
      height: 2,
      values: Float64Array.from([m + d, m - d, m + d, m - d]),
    });
    const b1 = mk(100, 1);
    const b2 = mk(100, -1);
    const f1 = mk(1100, 10);
    const f2 = mk(1100, -10);
    const r = gainFromPairs(b1, b2, f1, f2);
    // difference variances: bias (2,-2,2,-2): n/(n-1) 4 = 16/3; flats (20,-20,...): 1600 x 4/3.
    const vb = (4 * 4) / 3;
    const vf = (4 * 400) / 3;
    expect(r.gain).toBeCloseTo(2000 / (vf - vb), 10);
    expect(r.readNoise).toBeCloseTo((r.gain * Math.sqrt(vb)) / Math.SQRT2, 10);
  });

  test('every record states its tool, version, parameters and the kind of each quantity', () => {
    expect(KIND).toEqual(PIPELINE_KIND);
    const cs = labCalibration(1);
    const masters = buildMasters(cs, { gain: G });
    const raw = simulateFrame({
      seed: 'lab:1',
      exposure: 60,
      scene: { sky: 3, sources: [{ x: 24, y: 24, rate: 600 }] },
    });
    const nodes = [...masters.nodes, ...calibrate(raw, masters).nodes];
    const p = aperturePhotometry(
      { ...raw, values: Float64Array.from(raw.values, v => v * G) },
      { x: 24, y: 24, r: 5, rIn: 8, rOut: 13, readNoise: R }
    );
    nodes.push(p.node);
    for (const n of nodes) {
      expect(typeof n.tool).toBe('string');
      expect(n.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof n.params).toBe('object');
      expect(n.uncertainty.treatment).toBeTruthy();
      for (const q of n.quantities)
        expect(Object.values(KIND)).toContain(q.kind);
    }
    expect(p.node.quantities[0]).toMatchObject({
      kind: 'measured',
      errorKind: 'derived',
    });
  });

  test('aperture photometry recovers the truth manifest and its CCD-equation error is the scatter, over 120 seeds', () => {
    const pulls = [];
    const sig = [];
    const truth = 600 * 60 * enclosed(24, 24, 5);
    for (let s = 0; s < 120; s++) {
      const det = { cosmicRate: 0 };
      const cs = calibrationSet({ seed: `ph${s}`, detector: det });
      const m = buildMasters(cs, { gain: G });
      const raw = simulateFrame({
        seed: `ph${s}`,
        detector: det,
        exposure: 60,
        scene: {
          sky: 3,
          sources: [
            { x: 24, y: 24, rate: 600 },
            { x: 10, y: 12, rate: 900 },
          ],
        },
      });
      const cal = calibrate(raw, m).image;
      const e = { ...cal, values: Float64Array.from(cal.values, v => v * G) };
      const p = aperturePhotometry(e, {
        x: 24,
        y: 24,
        r: 5,
        rIn: 8,
        rOut: 13,
        readNoise: R,
        darkPerPixel: DEFAULT_DETECTOR.darkRate * 60,
        extraVariance: mastersVariance(m, {
          readNoise: R,
          darkRate: DEFAULT_DETECTOR.darkRate,
          exposure: 60,
        }),
      });
      pulls.push((p.net - truth) / p.sigma);
      sig.push(p.sigma);
    }
    // 4.5 standard errors of the mean (1 / sqrt 120) and of the standard deviation (1 / sqrt 240).
    expect(Math.abs(mean(pulls))).toBeLessThan(4.5 / Math.sqrt(120));
    expect(Math.abs(sd(pulls) - 1)).toBeLessThan(4.5 / Math.sqrt(240));
    expect(mean(sig)).toBeGreaterThan(200);
  });

  test('without the flat the flux is wrong by the flat’s value at the star, with it the flux is right', () => {
    const det = { cosmicRate: 0, vignette: 0.4, dustCount: 0 };
    const cs = calibrationSet(
      { seed: 'flatneed', detector: det },
      { nFlat: 30, nBias: 20, nDark: 9 }
    );
    const m = buildMasters(cs, { gain: G });
    const raw = simulateFrame({
      seed: 'flatneed',
      detector: det,
      exposure: 60,
      scene: { sky: 3, sources: [{ x: 5, y: 5, rate: 3000 }] },
    });
    const truth = 3000 * 60 * enclosed(5, 5, 4);
    const photo = skip => {
      const c = calibrate(raw, {
        bias: m.bias,
        dark: m.dark,
        flat: skip ? null : m.flat,
      }).image;
      return aperturePhotometry(
        { ...c, values: Float64Array.from(c.values, v => v * G) },
        { x: 5, y: 5, r: 4, rIn: 7, rOut: 10, readNoise: R }
      );
    };
    const wrong = photo(true).net / truth;
    const right = photo(false).net / truth;
    const flatHere = detectorPattern('flatneed', det).flat[5 * 48 + 5];
    expect(Math.abs(wrong - flatHere)).toBeLessThan(0.04);
    expect(Math.abs(right - 1)).toBeLessThan(0.03);
    expect(Math.abs(wrong - 1)).toBeGreaterThan(0.08);
  });

  test('differential magnitude: the ratio of fluxes, the errors in quadrature, and a shared factor cancels', () => {
    const a = { net: 1000, sigma: 10 };
    const b = { net: 2000, sigma: 20 };
    const d = differentialMagnitude(a, b);
    expect(d.dm).toBeCloseTo(-2.5 * Math.log10(0.5), 12);
    expect(d.sigma).toBeCloseTo((2.5 / Math.LN10) * Math.hypot(0.01, 0.01), 12);
    const c = differentialMagnitude(
      { net: 700, sigma: 7 },
      { net: 1400, sigma: 14 }
    );
    expect(c.dm).toBeCloseTo(d.dm, 12);
  });
});

describe('the differential light curve of a night', () => {
  test('over 8 nights: clouds cancel, the check star shows the precision, and the fit recovers the truth', () => {
    const amp = [];
    const pullAmp = [];
    const per = [];
    const chi = [];
    const ratioCheck = [];
    const ratioRaw = [];
    const stars = SERIES_FIELD.sources.map(s => ({ id: s.id, x: s.x, y: s.y }));
    for (let draw = 1; draw <= 8; draw++) {
      const m = buildMasters(labCalibration(draw), { gain: G });
      const ser = labSeries(draw);
      const red = reduceSeries(ser, m, {
        gain: G,
        readNoise: R,
        darkRate: DEFAULT_DETECTOR.darkRate,
        stars,
        comparison: 'C1',
        check: 'C2',
      });
      const fit = fitLightCurve(red, { minPeriod: 0.05, maxPeriod: 0.3 });
      amp.push(fit.amplitude);
      pullAmp.push(
        (fit.amplitude - SERIES_FIELD.series.amplitude) / fit.sigmaAmplitude
      );
      per.push(fit.period / SERIES_FIELD.series.period - 1);
      chi.push(fit.chi2 / fit.dof);
      ratioCheck.push(red.checkScatter / mean(Array.from(red.checkSigma)));
      ratioRaw.push(red.targetScatterRaw / red.checkScatter);
    }
    // A pull is within 4.5 sigma in every night; the amplitude's mean pull within 4.5 / sqrt(8).
    for (const p of pullAmp) expect(Math.abs(p)).toBeLessThan(4.5);
    expect(Math.abs(mean(pullAmp))).toBeLessThan(4.5 / Math.sqrt(8));
    // The period, from 2.6 cycles, is good to 5 percent in every night.
    for (const p of per) expect(Math.abs(p)).toBeLessThan(0.05);
    expect(mean(chi)).toBeGreaterThan(0.7);
    expect(mean(chi)).toBeLessThan(1.3);
    // The check star's scatter is what the CCD equation says, to 15 percent.
    expect(Math.abs(mean(ratioCheck) - 1)).toBeLessThan(0.15);
    // The cloud (10 percent) makes the star alone at least five times as noisy as its differential.
    for (const r of ratioRaw) expect(r).toBeGreaterThan(5);
  });

  test('the sinusoid fit is exact on a noise-free sine', () => {
    const t = Float64Array.from({ length: 50 }, (_, i) => i * 0.01);
    const y = Float64Array.from(
      t,
      x => 0.2 + 0.05 * Math.sin((2 * Math.PI * x) / 0.17 + 0.4)
    );
    const s = new Float64Array(50).fill(0.001);
    const f = fitSinusoid(t, y, s, 0.17);
    expect(f.amplitude).toBeCloseTo(0.05, 10);
    expect(f.c).toBeCloseTo(0.2, 10);
    expect(f.chi2).toBeLessThan(1e-12);
  });
});

describe('the CCD equation and the exposure-time calculator', () => {
  const base = { npix: 80, nBackground: 300, readNoise: 8 };

  test('the textbook limits: source, sky and read noise alone', () => {
    const src = noiseTerms({ ...base, signal: 40000, sky: 0, readNoise: 0 });
    expect(src.snr).toBeCloseTo(Math.sqrt(40000), 10);
    const k = 1 + 80 / 300;
    const sky = noiseTerms({ ...base, signal: 100, sky: 5000, readNoise: 0 });
    expect(sky.noise).toBeCloseTo(Math.sqrt(100 + 80 * k * 5000), 10);
    const read = noiseTerms({ ...base, signal: 100, sky: 0 });
    expect(read.noise).toBeCloseTo(Math.sqrt(100 + 80 * k * 64), 10);
    const perfect = noiseTerms({
      signal: 100,
      npix: 80,
      sky: 10,
      readNoise: 8,
    });
    expect(perfect.variance).toBeCloseTo(100 + 80 * (10 + 64), 10);
  });

  test('the exposure for a target is the inverse of the signal-to-noise, and the closed forms of its limits', () => {
    const p = { ...base, rate: 200, skyRate: 4, darkRate: 0.1 };
    for (const snr of [5, 50, 300]) {
      const t = exposureForSnr({ ...p, snr });
      expect(snrAt(p, t)).toBeCloseTo(snr, 8);
    }
    // Source-limited: t = snr^2 / r.
    const s = exposureForSnr({
      rate: 200,
      skyRate: 0,
      darkRate: 0,
      readNoise: 0,
      npix: 80,
      snr: 50,
    });
    expect(s).toBeCloseTo(2500 / 200, 10);
    // Sky-limited (r t << sky): t = snr^2 npix k B / r^2 to the source term's share.
    const k = 1 + 80 / 300;
    const f = {
      rate: 1,
      skyRate: 100,
      darkRate: 0,
      readNoise: 0,
      npix: 80,
      nBackground: 300,
      snr: 5,
    };
    const tSky = exposureForSnr(f);
    expect(tSky).toBeCloseTo((25 * 80 * k * 100) / 1 + 25 / 1, 6);
    // Read-limited (S << npix k R^2): t = snr sqrt(npix k) R / r, to the source term's share.
    const rd = exposureForSnr({
      rate: 1,
      skyRate: 0,
      darkRate: 0,
      readNoise: 8,
      npix: 80,
      nBackground: 300,
      snr: 0.1,
    });
    expect(Math.abs(rd / (0.1 * Math.sqrt(80 * k) * 8) - 1)).toBeLessThan(0.01);
    // And the quadratic's exact root with no sky or dark: a t^2 - r t - Q = 0.
    const a = 1 / 25;
    const Q = 80 * k * 64;
    const exact = (1 + Math.sqrt(1 + 4 * a * Q)) / (2 * a);
    expect(
      exposureForSnr({
        rate: 1,
        skyRate: 0,
        darkRate: 0,
        readNoise: 8,
        npix: 80,
        nBackground: 300,
        snr: 5,
      })
    ).toBeCloseTo(exact, 8);
  });

  test('the dominant term follows the exposure: read noise short, source long', () => {
    const p = { ...base, rate: 50, skyRate: 0.05, darkRate: 0.01 };
    expect(dominantTerm(p, 1)).toBe('read');
    expect(dominantTerm(p, 3600)).toBe('source');
    const q = { ...p, skyRate: 50 };
    expect(dominantTerm(q, 600)).toBe('sky');
  });

  test('the best aperture is near one FWHM for a star in a background-limited case', () => {
    const rows = snrByRadius(
      { rate: 600, skyRate: 5, darkRate: 0.1, readNoise: 8, nBackground: 300 },
      60,
      [1, 1.5, 2, 2.5, 3, 4, 5, 7, 9],
      2.8
    );
    const best = rows.reduce((a, b) => (b.snr > a.snr ? b : a));
    expect(best.r).toBeGreaterThanOrEqual(1.5);
    expect(best.r).toBeLessThanOrEqual(3);
  });

  test('the photon flux of V = 0 against the published 1005 photons per second per cm2 per angstrom', () => {
    const V = decodeBand(BANDS.find(b => b.id === 'V'));
    const perCm2 = photonRateVega(V, 0, 1e-4, 1);
    let width = 0;
    for (let i = 1; i < V.lambdaNm.length; i++)
      width +=
        0.5 * (V.s[i] + V.s[i - 1]) * (V.lambdaNm[i] - V.lambdaNm[i - 1]) * 10;
    // Vega's flux at 5500 angstroms, 3.63e-9 erg/s/cm2/A (Bessell 1979; Bessell, Castelli
    // and Plez 1998), is 3.63e-9 x 5.5e-5 cm / (h c) = 1005 photons/s/cm2/A. The band's
    // response and a Vega that is not flat leave a few percent.
    expect(Math.abs(perCm2 / width / 1005 - 1)).toBeLessThan(0.03);
  });

  test('the lab’s zero point is the radiation kernel’s V band through the stated telescope', () => {
    const V = decodeBand(BANDS.find(b => b.id === 'V'));
    expect(AREA_M2).toBeCloseTo(collectingArea(0.4, 0.3), 12);
    const zp = photonRateVega(V, 0, AREA_M2, TELESCOPE.throughputV);
    expect(Math.abs(ZERO_POINT_V / zp - 1)).toBeLessThan(1e-3);
    expect(bandPhotonIntegral(V)).toBeGreaterThan(0.15);
    expect(bandPhotonIntegral(V)).toBeLessThan(0.17);
  });
});

describe('the ccd forward model', () => {
  const setup = (over = {}) => ({
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'ccd-test',
    instrument: {
      kind: 'imager',
      width: 48,
      height: 48,
      pixelScale: 1,
      psfFwhm: 2.8,
      ...over,
    },
  });
  const state = {
    exposure: 60,
    scene: { sky: 3, sources: [{ x: 25, y: 25, rate: 600 }] },
  };

  test('is registered, and an observation of kind image with a truth manifest that names the detector', () => {
    expect(Object.keys(FORWARD_MODELS)).toContain('ccd');
    const o = runForward('ccd', state, setup());
    expect(validateObservation(o)).toEqual([]);
    expect(o.kind).toBe('image');
    expect(o.origin).toBe('synthetic');
    const ids = o.synthetic.truth.parameters.map(p => p.id);
    for (const id of [
      'exposure',
      'gain',
      'readNoise',
      'biasLevel',
      'darkRate',
      'sky',
      'src0.rate',
      'src0.x',
    ])
      expect(ids).toContain(id);
    expect(
      o.synthetic.truth.parameters.find(p => p.id === 'src0.x').value
    ).toBe(25);
    expect(o.synthetic.truth.injected.frameKind).toBe('science');
    expect(Object.keys(o.synthetic.truth.columns)).toEqual(['flat', 'dark']);
  });

  test('is the kernel’s frame, pixel for pixel (FITS counts from 1, the kernel from 0)', () => {
    const o = runForward('ccd', state, setup());
    const k = simulateFrame({
      seed: 'ccd-test',
      detector: { width: 48, height: 48, fwhm: 2.8 },
      kind: 'science',
      exposure: 60,
      scene: { sky: 3, sources: [{ x: 24, y: 24, rate: 600 }] },
    });
    expect(Array.from(frameFromObservation(o).values)).toEqual(
      Array.from(k.values)
    );
    expect(frameFromObservation(o).exposure).toBe(60);
  });

  test('the observation passes the schema as the workspace writes it', () => {
    const o = runForward('ccd', state, setup());
    const schema = JSON.parse(
      readFileSync('sdk/schemas/observation-1.schema.json', 'utf8')
    );
    expect(
      valid(schema, JSON.parse(observationJson(o, { source: o, changes: [] })))
    ).toBe(true);
  });

  test('a calibration set comes as observations of the same detector, in kinds', () => {
    const cs = runCalibrationSet(state, setup(), {
      nBias: 3,
      nDark: 2,
      nFlat: 3,
    });
    expect(cs.bias.length).toBe(3);
    expect(cs.dark.map(o => o.synthetic.truth.injected.frameKind)).toEqual([
      'dark',
      'dark',
    ]);
    expect(frameFromObservation(cs.dark[0]).exposure).toBe(120);
    expect(
      new Set([...cs.bias, ...cs.dark, ...cs.flat].map(o => o.id)).size
    ).toBe(8);
  });

  test('refuses what is not an imager with a scale, in words', () => {
    expect(() =>
      runForward('ccd', state, setup({ pixelScale: undefined }))
    ).toThrow(/pixelScale/);
    expect(() =>
      runForward('ccd', state, {
        ...setup(),
        instrument: { kind: 'catalogue' },
      })
    ).toThrow(/imager/);
  });
});
