/**
 * @jest-environment jsdom
 */
// =============================================================================
// The atmosphere investigations and instruments (Roadmap III, Prompt 200)
// -----------------------------------------------------------------------------
// Every number a step of "Why Venus Is Hot" and "Two Greenhouse Models" states is
// recomputed here from the kernel and the pack (check p2 of the committed
// thresholds): each validator accepts the kernel's value and refuses a wrong
// one, the predictions point at their answer, and the instruments draw through
// the plot component with the same words in English and Spanish.
// =============================================================================

/* global document */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as K from '../js/kernels/atmospheres/index.js';
import { EN_ATMOSPHERES } from '../js/i18n/en.atmospheres.js';
import { ES_ATMOSPHERES } from '../js/i18n/es.atmospheres.js';
import ES_LESSONS from '../js/data/investigations/es/atmosphere-sequence.js';
import ES_DEEP from '../js/data/investigations/depth/es/atmosphere-sequence.js';
import { LAZY_FAMILIES } from '../js/widgets.js';

const IDS = ['why-venus-is-hot', 'two-greenhouse-models'];
const lesson = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);
const teq = id => K.compareWithMeasured(id).emissionK;
const gap = id => K.compareWithMeasured(id).differenceK;
const need = id => K.greyDepthFor(K.compareWithMeasured(id).ratio).tauSurface;
const layerEps = id =>
  K.oneLayerEmissivityFor(K.compareWithMeasured(id).ratio).emissivity;
const ceiling = id =>
  K.oneLayer({ emissionTemperature: teq(id), emissivity: 1 }).surface;

/** The validator accepts `good` and refuses `bad`, both with a message. */
function holds(id, sid, good, bad) {
  const s = step(id, sid);
  expect(s.validate(good).level).toBe('ok');
  const r = s.validate(bad);
  expect(r.level).toBe('error');
  expect(r.message.length).toBeGreaterThan(20);
  expect(s.validate({})).toBeNull();
}

describe('the lessons are registered whole', () => {
  test('both exist with three depths, a step count the manifest states, and Spanish in step', () => {
    for (const id of IDS) {
      const l = INVESTIGATIONS.find(x => x.id === id);
      expect(l).toBeTruthy();
      expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
      const full = lesson(id);
      expect(full.steps.some(s => s.depth === 'quantitative')).toBe(true);
      expect(full.steps.some(s => s.depth === 'advanced')).toBe(true);
      expect(ES_LESSONS[id].steps).toHaveLength(l.steps.length);
      expect(ES_DEEP[id].steps).toHaveLength(
        full.steps.filter(s => s.depth).length
      );
    }
  });

  test('every step names a tool the atmosphere family owns', () => {
    const owned = LAZY_FAMILIES.atmosphere.ids;
    for (const id of IDS)
      for (const s of lesson(id).steps) expect(owned).toContain(s.tool.id);
  });

  test('every prediction reveals a step that exists in the lesson', () => {
    for (const id of IDS)
      for (const s of lesson(id).steps.filter(x => x.reveal))
        expect(lesson(id).steps.map(x => x.sid)).toContain(s.reveal);
  });
});

describe('Why Venus Is Hot: every stated number from the kernel', () => {
  const V = 'why-venus-is-hot';
  test('Earth: 254 K and a 34 K gap', () => {
    holds(
      V,
      'earth-sunlight-alone',
      { teq: teq('earth'), gap: gap('earth') },
      { teq: 288, gap: 0 }
    );
    expect(teq('earth')).toBeCloseTo(254.0, 1);
    expect(gap('earth')).toBeCloseTo(34.0, 1);
  });
  test('Venus: 229 K, cooler than Earth, and a 508 K gap', () => {
    holds(
      V,
      'venus-sunlight-alone',
      { teq: teq('venus'), gap: gap('venus') },
      { teq: 330, gap: 400 }
    );
    expect(teq('venus')).toBeLessThan(teq('earth'));
    expect(K.BODIES.venus.measuredK).toBe(737);
  });
  test('the Venus prediction: its answer is the cooler one, and a larger albedo with Earth’s would be near 299 K', () => {
    expect(step(V, 'venus-predict').answer).toBe(2);
    expect(
      K.compareWithMeasured('venus', { albedo: 0.306 }).emissionK
    ).toBeCloseTo(299, 0);
  });
  test('Mars 0.2 K, Jupiter 55 K, and no greenhouse reading for the giant', () => {
    holds(
      V,
      'six-bodies',
      { mars: gap('mars'), jupiter: gap('jupiter') },
      { mars: 20, jupiter: 0 }
    );
    expect(K.compareWithMeasured('jupiter').label).toMatch(/no surface/);
  });
  test('one layer: the ceiling 2^(1/4) times 229 K, and no emissivity reaches Venus', () => {
    holds(
      V,
      'one-layer-for-venus',
      { ground: ceiling('venus') },
      { ground: 737 }
    );
    expect(ceiling('venus') / teq('venus')).toBeCloseTo(2 ** 0.25, 12);
    expect(
      K.oneLayerEmissivityFor(K.compareWithMeasured('venus').ratio).refused
    ).toBe(true);
  });
  test('grey: an optical depth near 141.6 reproduces 737 K', () => {
    holds(V, 'grey-depth-for-venus', { tau: need('venus') }, { tau: 1 });
    const g = K.greyGround({
      emissionTemperature: teq('venus'),
      tauSurface: need('venus'),
    });
    expect(g.ground).toBeCloseTo(737, 8);
  });
  test('depths: Earth with albedo 0 is 278.3 K (24.3 K warmer); scale heights 15.9 and 8.4 km', () => {
    const t0 = K.compareWithMeasured('earth', { albedo: 0 }).emissionK;
    holds(
      V,
      'earth-without-clouds',
      { teq: t0, rise: t0 - teq('earth') },
      { teq: 254, rise: 0 }
    );
    const H = id =>
      K.scaleHeight({
        temperature: K.BODIES[id].measuredK,
        meanMolecularWeight: K.BODIES[id].mu,
        gravity: K.BODIES[id].g,
      }).height / 1000;
    holds(
      V,
      'how-thick-is-venus',
      { venus: H('venus'), earth: H('earth') },
      { venus: 8, earth: 8 }
    );
  });
});

describe('Two Greenhouse Models: every stated number from the kernel', () => {
  const T = 'two-greenhouse-models';
  test('Earth: emissivity 0.79 against optical depth 0.87, different quantities', () => {
    holds(T, 'earth-one-layer', { eps: layerEps('earth') }, { eps: 0.87 });
    holds(T, 'earth-grey', { tau: need('earth') }, { tau: 0.79 });
    expect(layerEps('earth')).toBeCloseTo(0.79, 2);
    expect(need('earth')).toBeCloseTo(0.87, 2);
  });
  test('Venus: the one-layer ceiling and a grey depth near 141.6; the prediction points at the grey model', () => {
    holds(
      T,
      'venus-both-try',
      { ceiling: ceiling('venus'), tau: need('venus') },
      { ceiling: 737, tau: 1 }
    );
    expect(step(T, 'venus-both').answer).toBe(1);
  });
  test('Mars needs almost nothing in either model', () => {
    holds(
      T,
      'mars-barely-a-greenhouse',
      { eps: layerEps('mars'), tau: need('mars') },
      { eps: 0.5, tau: 1 }
    );
  });
  test('one unit in each model: 292.2 K (grey) and 302.1 K (one layer) for Earth', () => {
    const g = K.greyGround({
      emissionTemperature: teq('earth'),
      tauSurface: 1,
    }).ground;
    const l = K.oneLayer({
      emissionTemperature: teq('earth'),
      emissivity: 1,
    }).surface;
    holds(
      T,
      'one-unit-two-models',
      { grey: g, layer: l },
      { grey: 302.1, layer: 292.2 }
    );
    expect(g).toBeCloseTo(292.2, 1);
    expect(l).toBeCloseTo(302.1, 1);
  });
  test('the Eddington top is 3.7 percent warm against the exact grey curve', () => {
    const top = K.greyTemperature({
      emissionTemperature: 1,
      tau: 0,
    }).temperature;
    const exact = K.greyTemperatureExact({
      emissionTemperature: 1,
      tau: 0,
    }).temperature;
    const pct = (100 * (top - exact)) / exact;
    holds(T, 'limits-of-grey', { gap: pct }, { gap: 0 });
    expect(pct).toBeCloseTo(3.66, 1);
  });
});

describe('the instruments', () => {
  let W;
  beforeAll(async () => {
    W = await import('../js/atmosphereWidgets.js');
  });

  test('the same keys in English and Spanish, no computed string in either', () => {
    expect(Object.keys(ES_ATMOSPHERES).sort()).toEqual(
      Object.keys(EN_ATMOSPHERES).sort()
    );
    for (const k of Object.keys(EN_ATMOSPHERES)) {
      const placeholders = s => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join();
      expect(placeholders(ES_ATMOSPHERES[k])).toBe(
        placeholders(EN_ATMOSPHERES[k])
      );
    }
  });

  test('three instruments, each drawing through the plot component and reading out', () => {
    expect(W.ATMOSPHERE_WIDGETS.map(w => w.id)).toEqual([
      'atmosphere-balance',
      'atmosphere-greenhouse',
      'atmosphere-scale',
    ]);
    for (const w of W.ATMOSPHERE_WIDGETS) {
      const canvas = document.createElement('canvas');
      document.body.append(canvas);
      const spec = w.draw(canvas, {});
      expect(spec.series.length).toBeGreaterThanOrEqual(3);
      expect(spec.xTitle).toBeTruthy();
      expect(spec.yTitle).toBeTruthy();
      expect(canvas.style.display).toBe('none');
      expect(canvas.nextSibling).toBeTruthy();
      const rows = w.readout({});
      expect(rows.length).toBeGreaterThan(4);
      for (const r of rows)
        expect(String(r.value)).not.toMatch(/NaN|undefined/);
    }
  });

  test('the balance instrument says "no solution" for Venus and states the label for a giant', () => {
    const rows = W.ATMOSPHERE_WIDGETS[0].readout({ body: 0 });
    expect(rows.some(r => /No solution/.test(r.value))).toBe(true);
    const giant = W.ATMOSPHERE_WIDGETS[0].readout({ body: 3 });
    expect(giant.some(r => /no surface/.test(String(r.value)))).toBe(true);
  });

  test('the views are the kernel’s numbers', () => {
    expect(W.balanceView({ body: 1 }).cmp.emissionK).toBe(teq('earth'));
    expect(
      W.greenhouseView({ body: 0, tau: 141.6 }).needGrey.tauSurface
    ).toBeCloseTo(need('venus'), 12);
    expect(W.scaleView({ body: 0 }).km).toBeCloseTo(15.9, 1);
  });
});
