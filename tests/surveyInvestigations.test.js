// The three selection-effects investigations (Roadmap II, Prompt 93): every
// number a lesson writes is recomputed from the survey model the instruments
// draw, in the unit the step asks for; the real-catalogue numbers are
// recomputed from the Gaia and SDSS packs; both languages carry the same
// instrument words.
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  countsView,
  biasView,
  completenessView,
  SURVEY_WIDGETS,
} from '../js/surveyWidgets.js';
import { EN_SURVEY } from '../js/i18n/en.survey.js';
import { ES_SURVEY } from '../js/i18n/es.survey.js';
import {
  shellMeanAbsolute,
  countsPerMagnitude,
  malmquistFormula,
  limitDistance,
} from '../js/survey/model.js';
import { tableOf } from '../js/tableObservation.js';
import { galacticPack } from '../tools/authoring/galacticPacks.mjs';
import * as sdss from '../js/data/observations/sdssNgc2420Photometry.js';
import WHO from '../js/data/investigations/depth/who-gets-counted.js';
import WHY from '../js/data/investigations/depth/why-the-bright-ones-win.js';
import CURVE from '../js/data/investigations/depth/the-completeness-curve.js';

const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const IDS = [
  'who-gets-counted',
  'why-the-bright-ones-win',
  'the-completeness-curve',
];

describe('the lessons exist and are wired', () => {
  test.each(IDS)(
    '%s is registered with unique step ids and a tool on every instrument step',
    id => {
      const lesson = INVESTIGATIONS.find(l => l.id === id);
      expect(lesson).toBeTruthy();
      const sids = lesson.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const s of lesson.steps) expect(s.tool?.id).toBeTruthy();
    }
  );
});

describe('Who Gets Counted: the core numbers', () => {
  test('limits 14 and 18', () => {
    const a = countsView({ limit: 14 });
    near(a.counted, 167, 8);
    near(100 * a.fraction, 6.3, 0.5);
    near(a.sunPc, 711, 25);
    near(a.dwarfPc, 63, 3);
    near(a.meanAll, 8.32, 0.15);
    near(a.meanCounted, 3.79, 0.2);
    const b = countsView({ limit: 18 });
    near(b.counted, 1289, 40);
    near(100 * b.fraction, 48.7, 1.5);
    expect(b.faintShare).toBe(1);
  });
  test('the depth values', () => {
    near(limitDistance(4.74, 14), 711, 15);
    near(10 ** 0.6, 3.98, 0.1);
    near(0.01 * 0 + 8.797094808573748 - 4.233897339387015, 4.56, 0.1);
  });
});

describe('Why the Bright Ones Win: the core numbers', () => {
  test('shells at limit 16', () => {
    const f = biasView({ limit: 16, lf: 0, snr: 5 });
    near(-f.shells[0].bias, 0.5, 0.15);
    near(-f.shells[3].bias, 3.56, 0.25);
    near(100 * f.shells[3].fraction, 14.5, 1);
  });
  test('standard candles agree with the closed form', () => {
    const f = biasView({ limit: 16, lf: 1, snr: 5 });
    near(f.atLimit.bias, -0.645, 0.12);
    near(f.formula, -0.677, 0.001);
    near(malmquistFormula(1.4), -2.708, 0.01);
  });
  test('the parallax cut', () => {
    const f = biasView({ limit: 18, lf: 0, snr: 3 });
    near(100 * f.plx.meanFractionalError, 18.1, 1.5);
    near(f.plx.meanDeltaM, 0.25, 0.04);
    expect(f.plx.stars).toBe(471);
    const g = biasView({ limit: 18, lf: 0, snr: 10 });
    expect(g.plx.stars).toBe(82);
    near(100 * g.plx.meanFractionalError, 1, 0.1);
    near(100 * (1 - 10 ** -0.1), 20.6, 0.1);
  });
});

describe('The Completeness Curve: the core numbers', () => {
  test('first, second and third presets', () => {
    const a = completenessView({ limit: 20, m50: 20, width: 0.3 });
    near(100 * a.bins[5].raw, 96.2, 2);
    near(100 * a.bins[6].raw, 56.7, 3);
    near(a.bins[6].fixed, 1.002, 0.06);
    near(a.bins[6].catalogue, 1.604, 0.12);
    expect(a.bins[6].detected).toBe(498);
    near(100 / Math.sqrt(498), 4.5, 0.1);
    const b = completenessView({ limit: 20, m50: 17, width: 0.5 });
    near(100 * b.bins[5].raw, 13.3, 2);
    near(b.bins[5].fixed, 0.97, 0.08);
    near(b.bins[5].error, 0.062, 0.01);
    const c = completenessView({ limit: 17, m50: 16, width: 1 });
    near(c.bins[6].detected, 3, 1);
    near(c.bins[6].error, 0.459, 0.06);
    near((1000 / limitDistance(11, 20)) ** 3, 3.98, 0.05);
  });
});

describe('the real catalogues the advanced steps quote', () => {
  test('the Gaia solar-neighbourhood shells drift as the survey predicts', () => {
    const t = tableOf(galacticPack('solar'));
    const c = id => t.columns.find(x => x.id === id).values;
    const rows = shellMeanAbsolute(
      c('g'),
      c('parallax'),
      [0, 100, 250, 500, 1000]
    );
    expect(rows.map(r => r.stars)).toEqual([485, 99, 289, 686]);
    [8.8, 6.68, 5.35, 4.23].forEach((v, i) => near(rows[i].meanM, v, 0.006));
  });
  test('the SDSS NGC 2420 counts fall beyond r = 21', () => {
    const t = tableOf({ PACK: sdss.PACK, SERIES: sdss.SERIES });
    const r = t.columns.find(x => x.id === 'r').values;
    expect(countsPerMagnitude(r, 17, 23).map(x => x.n)).toEqual([
      312, 377, 431, 519, 153, 11,
    ]);
  });
});

describe('words and instruments', () => {
  test('English and Spanish carry the same keys', () => {
    expect(Object.keys(ES_SURVEY).sort()).toEqual(
      Object.keys(EN_SURVEY).sort()
    );
  });
  test('three instruments, each with a title, controls, presets and a readout', () => {
    expect(SURVEY_WIDGETS.map(w => w.id)).toEqual([
      'survey-counts',
      'malmquist',
      'completeness-lf',
    ]);
    for (const w of SURVEY_WIDGETS) {
      const v = Object.fromEntries(w.controls.map(c => [c.id, c.value]));
      const rows = w.readout(v);
      expect(rows.length).toBeGreaterThan(5);
      for (const r of rows) expect(typeof r.value).toBe('string');
      for (const p of w.presets)
        expect(Object.keys(p.values).sort()).toEqual(Object.keys(v).sort());
    }
  });
  test('the depth steps anchor to core steps', () => {
    for (const [id, d] of [
      [IDS[0], WHO],
      [IDS[1], WHY],
      [IDS[2], CURVE],
    ]) {
      const all = new Set(
        INVESTIGATIONS.find(l => l.id === id).steps.map(s => s.sid)
      );
      for (const s of d.steps) {
        all.add(s.sid);
      }
      for (const s of d.steps) expect(all.has(s.after)).toBe(true);
    }
  });
});
