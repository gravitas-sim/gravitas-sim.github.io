import { describe, test, expect } from '@jest/globals';
import COLOR from '../js/data/investigations/color-and-temperature.js';
import DEEPER from '../js/data/investigations/depth/color-and-temperature.js';
import { gradeAnswer, checkAnswer } from '../js/answerCheck.js';
import {
  LIGHT_MODELS,
  LIGHT_DEPTH_VALUES,
  bMinusV,
  gMinusR,
} from '../tools/authoring/lightModels.mjs';
import { wienPeakLambda } from '../js/kernels/radiation/index.js';
import {
  blackbodyChromaticity,
  blackbodyRgb,
  boltzmannRatio21,
} from '../js/light/model.js';
import {
  blackbodyFacts,
  lightReady,
  LIGHT_WIDGETS,
} from '../js/lightWidgets.js';

// =============================================================================
// Color and Temperature (Roadmap II, Prompt 83), graded headlessly
// -----------------------------------------------------------------------------
// Every expected value in the lesson is recomputed from the radiation kernel,
// and the lesson's own checker (gradeAnswer, validate) is run on it: the number
// the kernel gives must be accepted, one outside the tolerance refused.
// =============================================================================

const step = (lesson, sid) => lesson.steps.find(s => s.sid === sid);

describe('the numeric answers are the kernel’s', () => {
  for (const [key, model] of Object.entries(LIGHT_MODELS)) {
    if (!key.startsWith('color-and-temperature/')) continue;
    const [, sid] = key.split('/');
    const s = step(COLOR, sid);
    test(`${sid}: the kernel value is accepted, and a value past the tolerance is not`, () => {
      const v = model.value();
      expect(Math.abs(v - s.answer)).toBeLessThanOrEqual(s.tolerance);
      expect(gradeAnswer(s, `${v} ${s.unit}`).correct).toBe(true);
      expect(checkAnswer(s, v + 2 * s.tolerance)).toBe(false);
      // The Spanish decimal comma reads the same.
      expect(
        gradeAnswer(s, `${String(v).replace('.', ',')} ${s.unit}`, {
          locale: 'es',
        }).correct
      ).toBe(true);
    });
  }

  test('the depth steps', () => {
    const vals = LIGHT_DEPTH_VALUES;
    const L = step(DEEPER, 'power-and-size');
    const R = step(DEEPER, 'size-from-light');
    const C = step(DEEPER, 'color-in-two-bands');
    expect(checkAnswer(L, vals.luminosity())).toBe(true);
    expect(checkAnswer(R, vals.radius())).toBe(true);
    expect(checkAnswer(C, vals.gMinusR4400())).toBe(true);
    // The solar-unit relation agrees with the kernel to the tolerance.
    expect(vals.luminosity()).toBeCloseTo(0.8 ** 2 * (4400 / 5772) ** 4, 2);
  });
});

describe('the measurement steps accept what the instrument shows', () => {
  test('three peaks', () => {
    const s = step(COLOR, 'three-peaks');
    const p = T => wienPeakLambda(T) * 1e9;
    expect(s.validate({ p3: p(3000), p6: p(6000), p12: p(12000) }).level).toBe(
      'ok'
    );
    expect(
      s.validate({ p3: 2 * p(3000), p6: p(6000), p12: p(12000) }).level
    ).toBe('error');
    expect(
      s.fields.find(f => f.id === 'prod').compute({ p6: p(6000) })
    ).toBeCloseTo(2897772, -2);
  });
  test('three colors', () => {
    const s = step(COLOR, 'three-colors');
    const ok = s.validate({
      c3: bMinusV(3000),
      c6: bMinusV(6000),
      c10: bMinusV(10000),
    });
    expect(ok.level).toBe('ok');
    // The g - r numbers are a different quantity and are not accepted.
    const wrong = s.validate({
      c3: gMinusR(3000),
      c6: gMinusR(6000),
      c10: gMinusR(10000),
    });
    expect(wrong.level).toBe('error');
  });
});

describe('the instrument', () => {
  test('its readout is the kernel’s', async () => {
    expect(await lightReady).toBe(true);
    const f = blackbodyFacts(5772, 0);
    expect(f.peakNm).toBeCloseTo(502.04, 1);
    expect(f.color).toBeCloseTo(bMinusV(5772), 12);
    expect(blackbodyFacts(5772, 1).color).toBeCloseTo(gMinusR(5772), 12);
    expect(f.relativeToSun).toBeCloseTo(1, 12);
    const rows = LIGHT_WIDGETS[0].readout({ T: 5772, pair: 0 });
    expect(rows.length).toBeGreaterThan(6);
    expect(rows.every(r => typeof r.value === 'string')).toBe(true);
  });

  test('the peak per unit frequency is not c over the peak wavelength', () => {
    const f = blackbodyFacts(5772, 0);
    const naive = 299792458 / (f.peakNm * 1e-9) / 1e12;
    expect(f.peakTHz / naive).toBeGreaterThan(0.55);
    expect(f.peakTHz / naive).toBeLessThan(0.6);
  });
});

describe('the displayed color', () => {
  // The Planckian locus (CIE 1931, 2 degrees) of Kim et al. 2002, as printed on
  // the Wikipedia "Planckian locus" page: a published cubic fit of the exact
  // locus, good to a few 1e-4. The Wyman-Sloan-Shirley fit of the colour
  // matching functions is good to a percent or two, so 0.005 is the bar.
  const kimX = T =>
    T < 4000
      ? -0.2661239e9 / T ** 3 - 0.234358e6 / T ** 2 + 0.8776956e3 / T + 0.17991
      : -3.0258469e9 / T ** 3 +
        2.1070379e6 / T ** 2 +
        0.2226347e3 / T +
        0.24039;
  test('chromaticity of blackbodies from 3,000 K to 10,000 K', () => {
    for (const T of [3000, 3500, 4000, 5000, 6500, 10000]) {
      expect(Math.abs(blackbodyChromaticity(T).x - kimX(T))).toBeLessThan(
        0.005
      );
    }
  });
  test('hotter is bluer, and the Sun is nearly white', () => {
    const [r1, , b1] = blackbodyRgb(3000);
    const [r2, , b2] = blackbodyRgb(10000);
    expect(r1).toBeGreaterThan(b1);
    expect(b2).toBeGreaterThan(r2);
    const sun = blackbodyRgb(5772);
    expect(Math.min(...sun)).toBeGreaterThan(220);
  });
});

describe('the Boltzmann ratio (a stated model)', () => {
  test('rises steeply with temperature', () => {
    expect(boltzmannRatio21(10000) / boltzmannRatio21(6000)).toBeGreaterThan(
      1000
    );
  });
});
