// =============================================================================
// The three calibration investigations, in two languages (Roadmap II, P86)
// -----------------------------------------------------------------------------
// Every number a lesson writes is recomputed from the kernel the instrument
// draws, read back in the form the readout prints it, and fed to the step's own
// validator; the two languages carry the same step structure; every depth
// step's expected value is recomputed from the kernel here, and a wrong
// answer is refused.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared kernel modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/detector/pipeline.js';
import {
  DETECTOR_WIDGETS,
  frameStory,
  snrView,
  seriesView,
} from '../js/detectorWidgets.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import CCD_DEEP from '../js/data/investigations/depth/what-a-ccd-records.js';
import SNR_DEEP from '../js/data/investigations/depth/signal-noise-and-exposure.js';
import VAR_DEEP from '../js/data/investigations/depth/a-variable-star-from-frames.js';
import CCD_ES from '../js/data/investigations/es/what-a-ccd-records.js';
import SNR_ES from '../js/data/investigations/es/signal-noise-and-exposure.js';
import VAR_ES from '../js/data/investigations/es/a-variable-star-from-frames.js';
import CCD_DEEP_ES from '../js/data/investigations/depth/es/what-a-ccd-records.js';
import SNR_DEEP_ES from '../js/data/investigations/depth/es/signal-noise-and-exposure.js';
import VAR_DEEP_ES from '../js/data/investigations/depth/es/a-variable-star-from-frames.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const IDS = [
  'what-a-ccd-records',
  'signal-noise-and-exposure',
  'a-variable-star-from-frames',
];
const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);
const grade = (id, sid, v) => step(id, sid).validate(v)?.level;
const widget = id => DETECTOR_WIDGETS.find(w => w.id === id);
const deep = (d, sid) => d.steps.find(s => s.sid === sid);

/** The instrument's readout at a step's tool values, as the rows a student reads. */
const rowsAt = (id, sid) => {
  const tool = step(id, sid).tool;
  const w = widget(tool.id);
  const v = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
  return w.readout({ ...v, ...tool.values });
};
const numbersIn = text =>
  [...String(text).matchAll(/-?\d[\d,]*\.?\d*(?:e-?\d+)?/g)].map(m =>
    Number(m[0].replace(/,/g, ''))
  );
const reading = (rows, match, nth = 0) => {
  const row = rows.find(r => match.test(r.label));
  expect(row).toBeTruthy();
  return numbersIn(row.value)[nth];
};

describe('the lessons exist and are wired', () => {
  test.each(IDS)('%s has unique step ids and a tool on every step', id => {
    const l = lesson(id);
    expect(l).toBeTruthy();
    const sids = l.steps.map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    for (const s of l.steps) expect(s.tool?.id).toBeTruthy();
  });
  test('every tool value names a control of its instrument', () => {
    const controls = Object.fromEntries(
      DETECTOR_WIDGETS.map(w => [w.id, w.controls.map(c => c.id)])
    );
    for (const id of IDS)
      for (const s of lesson(id).steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
    for (const d of [CCD_DEEP, SNR_DEEP, VAR_DEEP])
      for (const s of d.steps)
        for (const k of Object.keys(s.tool.values))
          expect(controls[s.tool.id]).toContain(k);
  });
  test('each lesson is in the observing sequence, after its prerequisites', () => {
    const seq = SEQUENCES.find(s => s.id === 'observing-and-measuring');
    const ids = seq.lessons.map(l => l.id);
    for (const id of IDS) expect(ids).toContain(id);
    expect(ids.indexOf('what-a-ccd-records')).toBeLessThan(
      ids.indexOf('signal-noise-and-exposure')
    );
  });
});

describe('What a CCD Records', () => {
  const id = IDS[0];
  const story = frameStory(1, 60);
  test('the steps accept the calibration set’s own numbers', () => {
    const rows = rowsAt(id, 'the-bias');
    const level = reading(rows, /Master bias level/);
    const read = reading(rows, /Read noise/);
    near(level, 500, 1.5);
    near(read, 8, 0.7);
    expect(grade(id, 'the-bias', { level, read })).toBe('ok');
    expect(grade(id, 'the-bias', { level: 0, read: 8 })).toBe('error');
    const d = rowsAt(id, 'the-dark');
    const rate = reading(d, /Dark current/);
    near(rate, 0.1, 0.002);
    expect(grade(id, 'the-dark', { rate, total: rate * 120 })).toBe('ok');
    const f = rowsAt(id, 'the-flat');
    const corner = reading(f, /corner as a share/);
    const gain = reading(f, /Gain/);
    near(corner, 76.2, 0.1);
    near(gain, 1.516, 0.01);
    expect(grade(id, 'the-flat', { corner, gain })).toBe('ok');
    expect(grade(id, 'the-flat', { corner: 100, gain: 1 })).toBe('error');
  });
  test('the flat raises star B and lowers star A, as the lesson says', () => {
    const rows = rowsAt(id, 'what-the-flat-does');
    const calibrated = reading(rows, /Star B/);
    const raw = story.stars[1].stages[0].net;
    expect(
      grade(id, 'what-the-flat-does', { raw: Math.round(raw), cal: calibrated })
    ).toBe('ok');
    near(story.stars[1].truth, 54000, 50);
    near(raw / story.stars[1].truth, 0.876, 0.005);
    near(story.stars[0].stages[0].net / story.stars[0].truth, 1.124, 0.005);
    expect(grade(id, 'what-the-flat-does', { raw: 54000, cal: 54000 })).toBe(
      'error'
    );
  });
  test('cosmic rays and the saturated star', () => {
    const rows = rowsAt(id, 'cosmic-rays');
    const flagged = reading(rows, /Cosmic-ray pixels flagged/);
    const saturated = reading(rows, /Saturated pixels/);
    expect(flagged).toBe(story.cosmicInjected);
    expect(grade(id, 'cosmic-rays', { flagged, saturated })).toBe('ok');
    expect(grade(id, 'cosmic-rays', { flagged: 3, saturated })).toBe('error');
    const d = story.stars[3];
    near(1 - d.stages[3].net / d.truth, 0.39, 0.005);
  });
  test('the depth steps’ expected values are recomputed', () => {
    const gain = story.pair.gain;
    const bias = story.bias.node.quantities[0].value;
    near(bias * gain, deep(CCD_DEEP, 'the-bias-in-electrons').answer, 10);
    const read = story.pair.readNoise;
    const dark = story.dark.node.quantities[3].value;
    near(read ** 2 / dark, deep(CCD_DEEP, 'dark-matches-read').answer, 12);
    const b = story.stars[1];
    near(
      b.stages[3].net / b.stages[0].net,
      deep(CCD_DEEP, 'the-flats-correction').answer,
      0.02
    );
    const D = story.stars[3];
    near(
      100 * (1 - D.stages[3].net / D.truth),
      deep(CCD_DEEP, 'the-lost-share').answer,
      1
    );
    near(
      (D.truth - D.stages[3].net) / D.stages[3].sigma,
      deep(CCD_DEEP, 'the-bars-that-do-not-see').answer,
      12
    );
  });
});

describe('Signal, Noise and Exposure', () => {
  const id = IDS[1];
  const base = { mag: 15, exposure: 60, radius: 5, sky: 0, target: 100 };
  test('the steps accept the CCD equation’s own numbers', () => {
    const rows = rowsAt(id, 'one-star-one-minute');
    const signal = reading(rows, /Star’s electrons in the aperture/);
    const noise = reading(rows, /^Total noise$/);
    const snr = reading(rows, /^Signal-to-noise$/);
    expect(grade(id, 'one-star-one-minute', { signal, noise, snr })).toBe('ok');
    expect(grade(id, 'one-star-one-minute', { signal, noise: 100, snr })).toBe(
      'error'
    );
    const a = snrView(base);
    near(a.terms.snr, snr, 0.1);
    const b = snrView({ ...base, exposure: 240 });
    expect(
      grade(id, 'four-times-longer', {
        snr: b.terms.snr,
        ratio: b.terms.snr / a.terms.snr,
      })
    ).toBe('ok');
    const s10 = snrView({ ...base, mag: 19, exposure: 10, radius: 3 });
    const s40 = snrView({ ...base, mag: 19, exposure: 40, radius: 3 });
    expect(
      grade(id, 'a-faint-star', { short: s10.terms.snr, long: s40.terms.snr })
    ).toBe('ok');
    const sub = snrView({ ...base, sky: 1 });
    const moon = snrView({ ...base, sky: 2 });
    expect(
      grade(id, 'exposure-for-the-target', {
        suburb: sub.needed,
        moon: moon.needed,
      })
    ).toBe('ok');
    expect(
      grade(id, 'faintest-star', {
        limit: a.limit,
        gain: b.limit - a.limit,
      })
    ).toBe('ok');
    expect(grade(id, 'faintest-star', { limit: 19, gain: 2 })).toBe('error');
  });
  test('the lesson’s claims about the terms hold', () => {
    const a = snrView(base);
    expect(a.dominant).toBe('source');
    const t = a.terms;
    near(100 * (t.read / t.variance), 12.8, 0.1);
    expect(
      snrView({ ...base, mag: 19, exposure: 10, radius: 3 }).dominant
    ).toBe('read');
    expect(snrView({ ...base, sky: 2 }).dominant).toBe('sky');
  });
  test('the depth steps’ expected values are recomputed', () => {
    const a = snrView(base);
    near(
      Math.sqrt(a.terms.source),
      deep(SNR_DEEP, 'only-the-stars-photons').answer,
      2
    );
    near(
      100 * (a.terms.read / a.terms.variance),
      deep(SNR_DEEP, 'the-read-noise-share-bright').answer,
      0.5
    );
    const f = snrView({ ...base, mag: 19, exposure: 10, radius: 3 });
    near(
      100 * (f.terms.read / f.terms.variance),
      deep(SNR_DEEP, 'the-read-noise-share-faint').answer,
      2
    );
    near(
      snrView({ ...base, sky: 2 }).needed / a.needed,
      deep(SNR_DEEP, 'what-the-moon-costs').answer,
      0.1
    );
    near(
      2.5 * Math.log10(2),
      deep(SNR_DEEP, 'the-square-root-promise').answer,
      0.02
    );
  });
});

describe('A Variable Star From Frames', () => {
  const id = IDS[2];
  const s = seriesView({ draw: 1, reduction: 3 });
  test('the steps accept the series’ own numbers', () => {
    const raw = reading(
      rowsAt(id, 'the-star-alone'),
      /Scatter of the variable star alone/
    );
    expect(grade(id, 'the-star-alone', { raw })).toBe('ok');
    const rows = rowsAt(id, 'against-the-comparison');
    const check = reading(rows, /Scatter of the check star/);
    expect(
      grade(id, 'against-the-comparison', { check, factor: raw / check })
    ).toBe('ok');
    const sine = rowsAt(id, 'the-sine');
    const period = reading(sine, /Period of the best sine/);
    const amp = reading(sine, /Amplitude of the best sine/);
    expect(grade(id, 'the-sine', { period, amp })).toBe('ok');
    near(s.fit.amplitude, 0.04, 4.5 * s.fit.sigmaAmplitude);
    near(s.fit.period, 0.12, 0.004);
    expect(grade(id, 'the-sine', { period: 0.3, amp })).toBe('error');
  });
  test('the cloud is common: the star and the comparison move together, the check star does not', () => {
    const corr = (a, b) => {
      const n = a.length;
      const ma = a.reduce((x, y) => x + y) / n;
      const mb = b.reduce((x, y) => x + y) / n;
      let sab = 0;
      let sa = 0;
      let sb = 0;
      for (let i = 0; i < n; i++) {
        sab += (a[i] - ma) * (b[i] - mb);
        sa += (a[i] - ma) ** 2;
        sb += (b[i] - mb) ** 2;
      }
      return sab / Math.sqrt(sa * sb);
    };
    expect(corr([...s.instrumental.V], [...s.instrumental.C1])).toBeGreaterThan(
      0.9
    );
    expect(s.red.targetScatterRaw).toBeGreaterThan(5 * s.red.checkScatter);
    near(s.red.targetScatterRaw / s.red.checkScatter, 8, 0.8);
  });
  test('the depth steps’ expected values are recomputed', () => {
    near(
      100 * s.red.checkScatter * Math.log(10) * 0.4,
      deep(VAR_DEEP, 'magnitudes-to-percent').answer,
      0.03
    );
    near(s.fit.period * 24, deep(VAR_DEEP, 'the-period-in-hours').answer, 0.1);
    near(
      s.fit.amplitude / s.fit.sigmaAmplitude,
      deep(VAR_DEEP, 'how-many-errors').answer,
      1.3
    );
    const raw = seriesView({ draw: 1, reduction: 0 });
    near(
      s.truthMeanDm - raw.meanDm,
      deep(VAR_DEEP, 'the-uncalibrated-night').answer,
      0.004
    );
    near(s.meanDm, s.truthMeanDm, 0.001);
  });
});

describe('the two languages agree', () => {
  const ES = { 0: CCD_ES, 1: SNR_ES, 2: VAR_ES };
  const ESD = { 0: CCD_DEEP_ES, 1: SNR_DEEP_ES, 2: VAR_DEEP_ES };
  const EN_DEEP = { 0: CCD_DEEP, 1: SNR_DEEP, 2: VAR_DEEP };
  test.each(IDS.map((id, i) => [id, i]))(
    '%s: the Spanish shadow follows the English step by step',
    (id, i) => {
      const en = lesson(id);
      const es = ES[i];
      expect(es.steps).toHaveLength(en.steps.length);
      expect(es.objectives).toHaveLength(en.objectives.length);
      en.steps.forEach((s, k) => {
        const e = es.steps[k];
        expect(e.title?.length).toBeGreaterThan(0);
        expect(e.body?.length).toBeGreaterThan(0);
        if (s.options) expect(e.options).toHaveLength(s.options.length);
        if (s.fields) expect(e.fields).toHaveLength(s.fields.length);
        if (s.hints) expect(e.hints).toHaveLength(s.hints.length);
        if (s.misconceptions)
          expect(e.misconceptions).toHaveLength(s.misconceptions.length);
      });
      expect(ESD[i].steps).toHaveLength(EN_DEEP[i].steps.length);
      ESD[i].steps.forEach(s => expect(s.worked?.length).toBeGreaterThan(0));
    }
  );
  test('depth steps do not give the answer away in their feedback', () => {
    for (const d of [CCD_DEEP, SNR_DEEP, VAR_DEEP])
      for (const s of d.steps)
        for (const msg of Object.values(s.feedback))
          expect(msg).not.toMatch(
            new RegExp(
              `(^|[^0-9.])${String(s.answer).replace('.', '\\.')}([^0-9]|$)`
            )
          );
  });
});
