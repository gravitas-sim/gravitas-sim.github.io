// The three detector instruments: their readouts carry the numbers the kernel
// gives, in both languages' keys, and their controls are what the family says.
import { describe, test, expect } from '@jest/globals';
import {
  DETECTOR_WIDGETS,
  frameStory,
  snrView,
  seriesView,
} from '../js/detectorInstruments.js';
import { EN_DETECTOR } from '../js/i18n/en.detector.js';
import { ES_DETECTOR } from '../js/i18n/es.detector.js';

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);

describe('the detector family', () => {
  test('is the three instruments (unregistered until a lesson docks them, D-CALIB-02)', () => {
    const ids = DETECTOR_WIDGETS.map(w => w.id);
    expect(ids).toEqual(['ccd-frames', 'ccd-snr', 'diff-photometry']);
  });
  test('English and Spanish carry the same keys', () => {
    expect(Object.keys(ES_DETECTOR).sort()).toEqual(
      Object.keys(EN_DETECTOR).sort()
    );
  });
  test('every readout has rows and the first says the data are synthetic or calculated', () => {
    for (const w of DETECTOR_WIDGETS) {
      const v = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
      const rows = w.readout(v);
      expect(rows.length).toBeGreaterThan(6);
      expect(rows[0].value).toMatch(/Synthetic|Calculated/);
      for (const c of w.controls)
        expect(typeof c.format(c.value)).toBe('string');
    }
  });
});

describe('the numbers behind the readouts', () => {
  test('frames: calibration recovers the truth and the stars are measured against it', () => {
    const s = frameStory(1, 60);
    near(s.bias.node.quantities[0].value, 500, 1.5);
    near(s.pair.readNoise, 8, 0.7);
    near(s.pair.gain, 1.5, 0.1);
    expect(s.flagged).toBe(s.cosmicInjected);
    for (const star of s.stars.slice(0, 3))
      near(star.stages[3].net / star.truth, 1, 0.03);
    // The raw light of a corner star is low and of a central star high.
    expect(s.stars[1].stages[0].net / s.stars[1].truth).toBeLessThan(0.92);
    expect(s.stars[0].stages[0].net / s.stars[0].truth).toBeGreaterThan(1.08);
    expect(s.saturated).toBeGreaterThan(5);
  });
  test('snr: more exposure gives more signal-to-noise, a brighter sky needs more time', () => {
    const base = { mag: 15, exposure: 60, radius: 5, sky: 0, target: 100 };
    const a = snrView(base);
    near(a.terms.snr, 152.5, 0.5);
    expect(
      snrView({ ...base, exposure: 240 }).terms.snr / a.terms.snr
    ).toBeGreaterThan(1.9);
    expect(snrView({ ...base, sky: 2 }).needed).toBeGreaterThan(2 * a.needed);
    expect(a.dominant).toBe('source');
  });
  test('series: differential photometry removes the cloud and fits the truth', () => {
    const s = seriesView({ draw: 1, reduction: 3 });
    expect(s.red.targetScatterRaw).toBeGreaterThan(5 * s.red.checkScatter);
    near(s.fit.amplitude, 0.04, 4.5 * s.fit.sigmaAmplitude);
    near(s.meanDm, s.truthMeanDm, 0.01);
    expect(
      Math.abs(seriesView({ draw: 1, reduction: 0 }).meanDm - s.truthMeanDm)
    ).toBeGreaterThan(0.02);
  });
});
