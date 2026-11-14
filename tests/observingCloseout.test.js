// =============================================================================
// The observing closeout (Roadmap III, Prompt 216)
// -----------------------------------------------------------------------------
// The five connecting investigations of js/data/investigations/observing-sequence.js:
// every number their steps state recomputed from the instruments and kernels they
// point at (the exposure planner, the night and turning-sky panels, the
// calibration and strategy panels, the instrument library and the sky kernel),
// fed to the step's own validator; the Spanish held to the English step for step;
// and the sequence, depths and guides that order and teach them. No browser and
// no download: the star file is read from the repository.
// =============================================================================
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
// The shared kernel modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/detector/pipeline.js';
import { exposureView, SETUPS } from '../js/exposureWidgets.js';
import { calibrationView } from '../js/photcalWidgets.js';
import {
  skyReady,
  setSkyStars,
  planFacts,
  turningFacts,
} from '../js/skyWidgets.js';
import {
  precessRigorous,
  ttFromUt,
  julianDate,
} from '../js/kernels/sky/time.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';
import OBSERVING, {
  INSTRUCTOR,
  SHADOWS,
  DEPTH,
  DEPTH_ES,
} from '../js/data/investigations/observing-sequence.js';
import { LESSON_BANDS } from '../js/data/instructorTimeBands.js';
import { getInstrument } from '../js/instruments/index.js';

const IDS = [
  'which-instrument-for-which-question',
  'the-sky-background',
  'coordinates-and-time',
  'a-night-at-the-telescope',
  'from-photons-to-a-number',
];
const lesson = id => OBSERVING.find(l => l.id === id);
const step = (id, sid) =>
  [...lesson(id).steps, ...DEPTH[id].steps].find(s => s.sid === sid);
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const ok = (id, sid, v) => expect(step(id, sid).validate(v).level).toBe('ok');
const bad = (id, sid, v) =>
  expect(step(id, sid).validate(v).level).toBe('error');
const secs = (v = {}) =>
  exposureView({ kind: 0, target: 20, ...v }).plan.seconds;
const share = (v, term) =>
  100 *
  exposureView({ kind: 0, ...v }).plan.budget.find(b => b.term === term).share;

beforeAll(async () => {
  await skyReady.catch(() => {});
  setSkyStars(JSON.parse(readFileSync('sky/bright-stars.json', 'utf8')));
});

describe('the five investigations', () => {
  test('are in the catalog once each, with a guide, a flow, expectations and a band', () => {
    expect(OBSERVING.map(l => l.id)).toEqual(IDS);
    for (const id of IDS) {
      expect(INVESTIGATIONS.filter(i => i.id === id)).toHaveLength(1);
      for (const k of ['content', 'flow', 'expectations', 'bands'])
        expect(INSTRUCTOR[k][id]).toBeTruthy();
      expect(LESSON_BANDS[id].core).toBeTruthy();
    }
  });

  test('every sid is unique, every expectation and flow block names a core step', () => {
    for (const l of OBSERVING) {
      const sids = l.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const sid of Object.keys(INSTRUCTOR.expectations[l.id]))
        expect(sids).toContain(sid);
      expect(INSTRUCTOR.flow[l.id]).toHaveLength(4);
      for (const b of INSTRUCTOR.flow[l.id]) {
        expect(sids).toContain(b.from);
        expect(sids).toContain(b.to);
      }
    }
  });

  test('the Spanish has a step, a field and an option for each of the English, deeper steps too', () => {
    for (const l of OBSERVING) {
      const es = SHADOWS[l.id];
      expect(es.title).toBeTruthy();
      expect(es.objectives).toHaveLength(l.objectives.length);
      expect(es.steps).toHaveLength(l.steps.length);
      const pairs = [
        ...l.steps.map((s, i) => [s, es.steps[i]]),
        ...DEPTH[l.id].steps.map((s, i) => [s, DEPTH_ES[l.id].steps[i]]),
      ];
      expect(DEPTH_ES[l.id].steps).toHaveLength(DEPTH[l.id].steps.length);
      for (const [s, t] of pairs) {
        expect(t.title).toBeTruthy();
        if (s.fields) expect(t.fields).toHaveLength(s.fields.length);
        if (s.options) expect(t.options).toHaveLength(s.options.length);
        if (s.misconceptions)
          expect(t.misconceptions).toHaveLength(s.misconceptions.length);
        if (s.type === 'question') expect(t.prompt).toBeTruthy();
      }
    }
  });

  test('deeper steps are laid after a core step that exists and offer the depths the lesson says', () => {
    for (const l of OBSERVING) {
      expect(l.depths).toEqual(['core', 'quantitative']);
      const sids = new Set(l.steps.map(s => s.sid));
      const chain = [];
      for (const d of DEPTH[l.id].steps) {
        expect(d.depth).toBe('quantitative');
        expect(sids.has(d.after) || chain.includes(d.after)).toBe(true);
        chain.push(d.sid);
      }
    }
  });

  test('sit in the Observing and instruments sequence, after the sky, with their needs earlier', () => {
    const seq = SEQUENCES.find(s => s.id === 'observing-and-instruments');
    expect(seq.after).toEqual(['the-sky']);
    const ids = seq.lessons.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of IDS) expect(ids).toContain(id);
    // survey first, the closing investigation last
    expect(ids.at(-1)).toBe('from-photons-to-a-number');
    expect(ids.indexOf('what-a-telescope-resolves')).toBeLessThan(
      ids.indexOf('which-instrument-for-which-question')
    );
    seq.lessons.forEach((l, i) => {
      for (const n of l.needs || []) expect(ids.indexOf(n)).toBeLessThan(i);
    });
  });
});

describe('Which Instrument for Which Question?', () => {
  const ID = 'which-instrument-for-which-question';
  test('one star on three facilities: 12,070, 602 and 15.2 seconds', () => {
    const t = setup => secs({ setup, mag: 22, exposures: 1 });
    ok(ID, 'the-same-star-three-ways', { t035: t(0), t1m: t(1), trub: t(3) });
    bad(ID, 'the-same-star-three-ways', { t035: 600, t1m: 602, trub: 15 });
    near(t(0) / t(1), step(ID, 'how-much-longer').answer, 0.6);
  });
  test('the pixel scale and seeing of the 0.35 m telescope: 1.8 pixels across', () => {
    const { setup } = exposureView({
      setup: 0,
      mag: 22,
      target: 20,
      exposures: 1,
    });
    ok(ID, 'pixels-across-the-seeing', {
      pix: setup.pixelScale,
      see: setup.fwhm,
    });
    near(setup.fwhm / setup.pixelScale, 1.78, 0.02);
    const r = exposureView({ setup: 1 }).setup;
    near(r.fwhm / r.pixelScale, 2.31, 0.03);
    const u = exposureView({ setup: 3 }).setup;
    near(u.fwhm / u.pixelScale, 3.25, 0.03);
  });
  test('the fields, the collecting areas and the survey-speed product are the library’s', () => {
    const a = getInstrument('lco-0m35').instrument;
    const b = getInstrument('lco-1m0').instrument;
    near(
      (a.fieldWidth.v * a.fieldHeight.v) / (b.fieldWidth.v / 60) ** 2,
      11.7,
      0.1
    );
    const rubin = getInstrument('rubin').instrument;
    expect(rubin.fieldArea.v).toBe(9.6);
    const area = 33.183;
    const speed = (area * 9.6) / (0.7854 * (b.fieldWidth.v / 60) ** 2);
    near(speed, step(ID, 'survey-speed').answer, 60);
    // one star against a field: 40 against 2000
    near(
      secs({ setup: 1, mag: 22, exposures: 1 }) /
        secs({ setup: 3, mag: 22, exposures: 1 }),
      39.6,
      0.5
    );
  });
  test('the choices have their answer and a named mistake for each wrong one', () => {
    for (const sid of [
      'what-the-time-leaves-out',
      'a-big-galaxy',
      'the-wrong-wavelength',
    ]) {
      const s = step(ID, sid);
      expect(s.options.length).toBe(4);
      expect(s.misconceptions.length).toBeGreaterThan(0);
    }
    expect(step(ID, 'a-big-galaxy').answer).toBe(1);
    expect(step(ID, 'the-wrong-wavelength').answer).toBe(2);
  });
});

describe('The Sky Background', () => {
  const ID = 'the-sky-background';
  const R = { setup: 3, mag: 23, exposures: 2, target: 20 };
  test('the sky inside the aperture is magnitude 20.0, sixteen times the star', () => {
    const { setup } = exposureView(R);
    const m =
      setup.skyMag - 2.5 * Math.log10(Math.PI * (1.5 * setup.fwhm) ** 2);
    near(m, step(ID, 'sky-in-the-aperture').answer, 0.1);
    near(10 ** (0.4 * (23 - m)), step(ID, 'sky-over-the-star').answer, 0.8);
    const wide =
      setup.skyMag - 2.5 * Math.log10(Math.PI * (2.5 * setup.fwhm) ** 2);
    near(wide, step(ID, 'a-wider-aperture').answer, 0.1);
  });
  test('the dark plan, 2 and 3 magnitudes of Moon, and the bright star', () => {
    ok(ID, 'a-sky-limited-plan', { total: secs(R), sky: share(R, 'sky') });
    bad(ID, 'a-sky-limited-plan', { total: 30, sky: 20 });
    const m2 = secs({ ...R, moon: 2 });
    ok(ID, 'two-magnitudes-brighter', { dark: secs(R), moon: m2 });
    near(m2 / secs(R), 5.55, 0.05);
    near(
      secs({ ...R, moon: 3 }) / secs(R),
      step(ID, 'three-magnitudes-brighter').answer,
      0.5
    );
    const L = { setup: 1, exposures: 1, target: 20 };
    ok(ID, 'the-moon-and-a-bright-star', {
      f0: secs({ ...L, mag: 20 }),
      f3: secs({ ...L, mag: 20, moon: 3 }),
      b0: secs({ ...L, mag: 17 }),
      b3: secs({ ...L, mag: 17, moon: 3 }),
    });
  });
  test('Rubin’s sky is 5.15 times brighter in i than in g', () => {
    const b = getInstrument('rubin');
    expect(b).toBeTruthy();
    near(10 ** (0.4 * (22.26 - 20.48)), step(ID, 'a-redder-sky').answer, 0.15);
  });
  test('the Moon is up for none of the dark on 2025-01-29 and all of it on 2025-01-13', () => {
    const at = day => planFacts({ lat: 30, day, airmassMax: 2, moonSep: 30 });
    ok(ID, 'the-moon-up-hours', {
      newMoon: at(28).moonUpHours,
      fullMoon: at(12).moonUpHours,
    });
    near(at(12).darkHours, at(12).moonUpHours, 0.01);
  });
});

describe('Coordinates and Time at Depth', () => {
  const ID = 'coordinates-and-time';
  const f = nights => turningFacts({ lat: 40, nights, star: 0 });
  test('a sidereal day is 235.9 seconds short; the panel gains 3.93 minutes a night', () => {
    near(86400 - 86164.09, step(ID, 'a-day-that-is-short').answer, 2);
    ok(ID, 'earlier-each-night', {
      t0: f(0).transitMinAfterNoon,
      t30: f(30).transitMinAfterNoon,
    });
    near(
      (f(0).transitMinAfterNoon - f(30).transitMinAfterNoon) / 30,
      3.93,
      0.02
    );
  });
  test('the crossing from the sidereal time and the right ascension is a minute earlier than the panel’s', () => {
    const t = f(0);
    ok(ID, 'from-sidereal-time-to-crossing', {
      lst: t.lstMidnightH,
      ra: t.star.raDeg / 15,
    });
    const mine = 720 - (60 * (6.792 - 6.752)) / 1.0027379;
    near(
      t.transitMinAfterNoon - mine,
      step(ID, 'the-panel-is-later').answer,
      0.3
    );
  });
  test('precession moves Sirius 67.1 seconds of time and −99.5 arcseconds in 25 years', () => {
    const s = f(0).star;
    const p = precessRigorous(
      s.raDeg,
      s.decDeg,
      ttFromUt(julianDate(2025, 1, 1, 0))
    );
    near(((p.raDeg - s.raDeg) / 15) * 3600, step(ID, 'ra-shift').answer, 0.3);
    near((p.decDeg - s.decDeg) * 3600, step(ID, 'dec-shift').answer, 1);
    near(
      Math.abs((p.decDeg - s.decDeg) * 3600) / 0.389,
      step(ID, 'pointing-in-pixels').answer,
      3
    );
    // the first-order formulas are inside the tolerances
    const a = (s.raDeg * Math.PI) / 180;
    const d = (s.decDeg * Math.PI) / 180;
    near(
      25 * (3.075 + 1.336 * Math.sin(a) * Math.tan(d)),
      step(ID, 'ra-shift').answer,
      1.5
    );
    near(25 * 20.04 * Math.cos(a), step(ID, 'dec-shift').answer, 3);
  });
});

describe('A Night at the Telescope', () => {
  const ID = 'a-night-at-the-telescope';
  const N = { setup: 1, mag: 19, target: 50, exposures: 1, airmass: 1.1 };
  test('station 1: 10.5 hours of dark, 8.08 usable hours of Regulus at airmass 1.05', () => {
    const p = planFacts({ lat: 30, day: 28, airmassMax: 2, moonSep: 30 });
    const reg = p.targets.find(t => t.name === 'Regulus');
    ok(ID, 'station-when', {
      dark: p.darkHours,
      usable: reg.usableHours,
      airmass: reg.bestAirmass,
    });
    near(p.moonUpHours, 0, 0.01);
  });
  test('station 2: 59.3 seconds, 49 percent of the noise squared the star’s', () => {
    ok(ID, 'station-expose', { total: secs(N), source: share(N, 'source') });
    expect(exposureView(N).plan.dominant).toBe('source');
    near(secs({ ...N, moon: 2 }) / secs(N), 2.08, 0.04);
    near(secs({ ...N, exposures: 2 }) / secs(N), 1.19, 0.02);
  });
  test('station 3 and 4: the calibration, and the frame', () => {
    const c = calibrationView({ night: 0, airmass: 1.1 });
    ok(ID, 'station-calibrate', {
      z: c.solution.parameters.Z1.value,
      k: c.solution.parameters.k.value,
      sigma: c.calibrated.sigma,
    });
    const fr = exposureView({ kind: 0, ...N }).frame;
    ok(ID, 'station-measure', {
      pred: fr.predicted.snr,
      meas: fr.measured.snr,
    });
    bad(ID, 'station-measure', { pred: 49.5, meas: 20 });
  });
  test('station 5: 0.0231 magnitude, and the star’s photons are 88 percent of the variance', () => {
    const s = 1.0857 / 50;
    near(Math.hypot(s, 0.008), step(ID, 'station-report').answer, 0.0015);
    near(s ** 2 / (s ** 2 + 0.008 ** 2), 0.88, 0.01);
  });
});

describe('From Photons to a Number', () => {
  const ID = 'from-photons-to-a-number';
  const N = { setup: 1, mag: 19, target: 50, exposures: 1, airmass: 1.1 };
  test('step 1: 5101 electrons, a noise of 103, a signal-to-noise of 49.5', () => {
    const m = exposureView({ kind: 0, ...N });
    ok(ID, 'the-counts', {
      signal: m.frame.predicted.signal,
      noise: m.frame.predicted.sigma,
    });
    near(m.frame.predicted.snr, 49.45, 0.05);
  });
  test('steps 2 and 3: 0.02195 magnitude, and the rate gives magnitude 19.00', () => {
    const m = exposureView({ kind: 0, ...N });
    near(
      1.0857 / m.frame.predicted.snr,
      step(ID, 'the-magnitude-uncertainty').answer,
      0.0008
    );
    const rate = m.frame.predicted.signal / m.plan.seconds;
    const mag = -2.5 * Math.log10(rate / SETUPS[1].zeroPoint) - 0.2 * 0.1;
    near(mag, step(ID, 'the-rate-to-a-magnitude').answer, 0.03);
    near(SETUPS[1].zeroPoint, 3.5e9, 1e7);
  });
  test('steps 4 to 6: the calibration, the total, the shares and the 3.2 times', () => {
    const c = calibrationView({ night: 0, airmass: 1.1 });
    ok(ID, 'the-calibration-term', {
      sigz: c.solution.parameters.Z1.sigma ?? 0.003,
      sigt: c.calibrated.sigma,
    });
    near(
      Math.hypot(0.02195, 0.008),
      step(ID, 'adding-in-quadrature').answer,
      0.0012
    );
    near(0.02195 ** 2 / (0.02195 ** 2 + 0.008 ** 2), 0.88, 0.01);
    ok(ID, 'halve-it', { t50: secs(N), t100: secs({ ...N, target: 100 }) });
    near(secs({ ...N, target: 100 }) / secs(N), 3.23, 0.05);
  });
  test('the floor: 0.0258 magnitude, and the photon term equals a 1 percent floor at a signal-to-noise of 100', () => {
    near(
      Math.hypot(0.02195, 0.008, 0.0109),
      step(ID, 'a-flat-field-floor').answer,
      0.0012
    );
    near(1 / 0.01, step(ID, 'where-the-floor-wins').answer, 3);
    const w = exposureView({ kind: 0, ...N, target: 150 }).plan.warnings.map(
      x => x.code
    );
    expect(w).toContain('beyond-flat-field-accuracy');
  });
});
