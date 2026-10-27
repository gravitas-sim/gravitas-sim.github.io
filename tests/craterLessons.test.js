/**
 * @jest-environment jsdom
 */
// =============================================================================
// The crater investigations and instruments (Roadmap III, Prompt 195, part 3)
// -----------------------------------------------------------------------------
// Every number a step of "Which Surface Is Older?", "Craters by Size" and "What a
// Crater Diameter Is Worth" states is recomputed here from the kernel
// (js/measure/craters.js) and the four committed regions: each validator accepts
// the kernel's value and refuses a wrong one, the predictions point at their
// answer, the instruments read out the kernel's own numbers with the same words
// in English and Spanish, and every committed crater falls inside its picture.
// The circles are a catalog's: nothing here is a count anyone made on a picture.
// =============================================================================

/* global document */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test, expect, beforeAll } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { cumulative, powerLaw, relativeAge } from '../js/measure/craters.js';
import { EN_CRATERS } from '../js/i18n/en.craters.js';
import { ES_CRATERS } from '../js/i18n/es.craters.js';
import ES_LESSONS from '../js/data/investigations/es/measurement-sequence.js';
import ES_DEEP from '../js/data/investigations/depth/es/measurement-sequence.js';
import { LAZY_FAMILIES } from '../js/widgets.js';

const REGIONS = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../frames/craters-regions.json')
  )
).regions;

const IDS = [
  'which-surface-is-older',
  'craters-by-size',
  'what-a-crater-diameter-is-worth',
];
const lesson = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);

const diameters = id => REGIONS[id].craters.map(c => c[0]);
const side = id => ({
  craters: diameters(id),
  area: { km2: REGIONS[id].areaKm2, relSigma: REGIONS[id].areaRelSigma },
  completeFrom: REGIONS[id].completeFromKm,
});
const ratio = (pair, dMin) =>
  relativeAge(side(pair[0]), side(pair[1]), { dMin });
const MOON = ['moon-highland', 'moon-mare'];
const MARS = ['mars-highland', 'mars-plains'];
const density = (id, dMin) =>
  cumulative(diameters(id), { area: side(id).area, thresholds: [dMin] })
    .rows[0];
const fit = (id, dMin, list = diameters(id)) => powerLaw(list, { dMin });

/** The validator accepts `good` and refuses `bad`, both with a message. */
function holds(id, sid, good, bad) {
  const s = step(id, sid);
  expect(s.validate(good).level).toBe('ok');
  const r = s.validate(bad);
  expect(r.level).toBe('error');
  expect(r.message.length).toBeGreaterThan(20);
  expect(s.validate({})).toBeNull();
}

let W;
beforeAll(async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ regions: REGIONS }),
  });
  W = await import('../js/craterWidgets.js');
  await W.craterReady;
});

describe('the lessons are registered whole', () => {
  test('all three exist with three depths, a step count the manifest states, and Spanish in step', () => {
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
      // The Spanish shadow carries a misconception for each the English has, in step.
      l.steps.forEach((s, i) => {
        expect(ES_LESSONS[id].steps[i].misconceptions?.length ?? 0).toBe(
          s.misconceptions?.length ?? 0
        );
        expect((ES_LESSONS[id].steps[i].fields ?? []).length).toBe(
          (s.fields ?? []).length
        );
      });
    }
  });

  test('the three are survey, majors and upper, and the second and third follow the first', () => {
    const levels = IDS.map(
      id => INVESTIGATIONS.find(l => l.id === id).courseLevel
    );
    expect(levels).toEqual(['survey', 'majors', 'upper']);
    expect(INVESTIGATIONS.find(l => l.id === IDS[1]).prerequisites).toEqual([
      IDS[0],
    ]);
  });

  test('every step that names a tool names one the crater family owns, and a prediction hides nothing it reveals', () => {
    const owned = LAZY_FAMILIES.crater.ids;
    for (const id of IDS)
      for (const s of lesson(id).steps) {
        if (s.tool) expect(owned).toContain(s.tool.id);
        // The readout would give the answer away: a prediction shows no instrument.
        if (s.type === 'predict') expect(s.tool).toBeUndefined();
      }
  });

  test('every prediction reveals a step that exists in the lesson and carries no misconception', () => {
    for (const id of IDS)
      for (const s of lesson(id).steps.filter(x => x.reveal)) {
        expect(lesson(id).steps.map(x => x.sid)).toContain(s.reveal);
        expect(s.misconceptions).toBeUndefined();
      }
  });

  test('no step says an age in years was computed', () => {
    for (const id of IDS) {
      const text = JSON.stringify(lesson(id).steps);
      expect(text).not.toMatch(/million years|billion years|Ga\b|Gyr/);
    }
  });
});

describe('Which Surface Is Older?: every stated number from the kernel', () => {
  const L = 'which-surface-is-older';
  test('the Moon above 30 km: 40 and 7 craters, 131.2 and 20.5 per million km2', () => {
    const a = density('moon-highland', 30);
    const b = density('moon-mare', 30);
    holds(
      L,
      'count-the-moon',
      { highland: a.n, mare: b.n },
      { highland: 7, mare: 40 }
    );
    expect([a.n, b.n]).toEqual([40, 7]);
    holds(
      L,
      'per-area',
      { highland: a.density * 1e6, mare: b.density * 1e6 },
      { highland: 40, mare: 7 }
    );
    expect(a.density * 1e6).toBeCloseTo(131.2, 1);
    expect(b.density * 1e6).toBeCloseTo(20.5, 1);
    // the intervals the step states
    expect(a.lo * 1e6).toBeCloseTo(93.7, 1);
    expect(a.hi * 1e6).toBeCloseTo(178.6, 1);
    expect(b.lo * 1e6).toBeCloseTo(8.3, 1);
    expect(b.hi * 1e6).toBeCloseTo(42.3, 1);
  });
  test('the ratio 6.39 with a lower end 2.83 and an upper end 16.9, the highland older', () => {
    const r = ratio(MOON, 30);
    holds(L, 'ratio-moon', { ratio: r.ratio, lo: r.lo }, { ratio: 6, lo: 1 });
    expect(r.verdict).toBe('a older');
    expect(r.hi).toBeCloseTo(16.9, 1);
    expect(step(L, 'which-is-older-predict').answer).toBe(1);
    expect(step(L, 'reading-the-interval').answer).toBe(0);
  });
  test('Mars above 20 km: 6.50 from 91 and 14, lower end 3.68, upper 12.4', () => {
    const r = ratio(MARS, 20);
    holds(L, 'mars-pair', { ratio: r.ratio, lo: r.lo }, { ratio: 3, lo: 1 });
    expect([r.na, r.nb]).toEqual([91, 14]);
    expect(r.hi).toBeCloseTo(12.4, 1);
  });
  test('Mars at 60 km: no significant difference, from 12 and 4 craters, 16 against 105', () => {
    const r = ratio(MARS, 60);
    expect(r.verdict).toBe('no significant difference');
    expect([r.na, r.nb]).toEqual([12, 4]);
    expect(r.ratio).toBeCloseTo(3.0, 2);
    expect(r.lo).toBeCloseTo(0.91, 2);
    expect(r.hi).toBeCloseTo(12.8, 1);
    expect(ratio(MARS, 20).na + ratio(MARS, 20).nb).toBe(105);
    expect(step(L, 'fewer-craters').answer).toBe(1);
    holds(L, 'the-flip', { ratio: r.ratio, lo: r.lo }, { ratio: 6, lo: 2 });
    // the verdict changes between 55 and 60 km
    expect(ratio(MARS, 55).verdict).toBe('a older');
    expect(ratio(MARS, 55).lo).toBeGreaterThan(1);
    expect(ratio(MARS, 55).lo).toBeLessThan(1.1);
  });
  test('secondaries make a surface look older: the answer is the first option', () => {
    expect(step(L, 'what-can-go-wrong').answer).toBe(0);
  });
  test('the Moon at 50 km: 2 craters in the mare and an upper end of 84.8', () => {
    const r = ratio(MOON, 50);
    holds(L, 'harder-craters', { mare: r.nb, hi: r.hi }, { mare: 7, hi: 20 });
    expect(r.ratio).toBeCloseTo(9.5, 1);
    expect(r.lo).toBeCloseTo(2.26, 2);
  });
  test('the Moon at 25 km is refused as below the completeness limit; so is 100 km with no mare craters a floor only', () => {
    const r = ratio(MOON, 25);
    expect(r.status).toBe('refused');
    expect(r.code).toBe('below-completeness');
    expect(step(L, 'below-the-limit').answer).toBe(1);
    const z = ratio(MOON, 100);
    expect(z.status).toBe('ok');
    expect(z.ratio).toBeNull();
    expect(z.hi).toBeNull();
    holds(
      L,
      'no-craters-at-all',
      { highland: z.na, lo: z.lo },
      { highland: 0, lo: 5 }
    );
    expect(z.lo).toBeCloseTo(1.02, 2);
  });
});

describe('Craters by Size: every stated number from the kernel', () => {
  const L = 'craters-by-size';
  test('the lunar highland above 30 km: 1.71 from 1.22 to 2.28, 40 craters, doubling leaves 30 percent', () => {
    const p = fit('moon-highland', 30);
    holds(
      L,
      'highland-slope',
      { b: p.index, lo: p.lo, hi: p.hi },
      { b: 3, lo: 1, hi: 2 }
    );
    expect(p.n).toBe(40);
    expect(2 ** -p.index).toBeCloseTo(0.306, 2);
    expect(p.hi - p.lo).toBeCloseTo(1.06, 2);
  });
  test('the Martian highland above 20 km: 1.39 to 2.09, an interval 0.70 wide, narrower than the Moon’s', () => {
    const p = fit('mars-highland', 20);
    holds(L, 'mars-slope', { lo: p.lo, hi: p.hi }, { lo: 1, hi: 3 });
    expect(p.hi - p.lo).toBeCloseTo(0.7, 1);
    expect(p.hi - p.lo).toBeLessThan(
      fit('moon-highland', 30).hi - fit('moon-highland', 30).lo
    );
    expect(step(L, 'narrower-predict').answer).toBe(1);
    expect(p.index).toBeCloseTo(1.72, 2);
  });
  test('the mare from seven craters: 3.47 from 1.39 to 6.47, an interval holding the highland’s 1.71', () => {
    const p = fit('moon-mare', 30);
    holds(L, 'thin-mare', { b: p.index, hi: p.hi }, { b: 1.7, hi: 2 });
    expect(p.n).toBe(7);
    expect(p.lo).toBeCloseTo(1.39, 2);
    expect(p.lo).toBeLessThan(fit('moon-highland', 30).index);
    expect(p.hi).toBeGreaterThan(fit('moon-highland', 30).index);
    expect(step(L, 'does-mare-differ').answer).toBe(1);
  });
  test('a count that stops short: leaving out the 32 craters under 30 km gives 1.01 and a flag at z 2.77', () => {
    const below = diameters('moon-highland').filter(d => d < 30);
    expect(below).toHaveLength(32);
    const { list, gone } = W.stoppedShort(diameters('moon-highland'), 30, 1);
    expect(gone).toBe(32);
    const p = fit('moon-highland', 20, list);
    holds(L, 'roll-off', { b: p.index, z: p.constancy.z }, { b: 1.56, z: 0 });
    expect(p.constancy.flag).toBe('slope-not-constant');
    expect(step(L, 'what-the-flag-says').answer).toBe(1);
    // the complete list is not flagged and gives 1.56
    const whole = fit('moon-highland', 20);
    expect(whole.constancy.flag).toBeNull();
    expect(whole.index).toBeCloseTo(1.56, 2);
    expect(p.constancy.b2).toBeCloseTo(1.96, 2);
  });
  test('the perturbation is deterministic, keeps the largest, and is the identity at 0 percent', () => {
    const all = diameters('moon-highland');
    expect(W.stoppedShort(all, 30, 0).list).toHaveLength(all.length);
    const half = W.stoppedShort(all, 30, 0.5);
    expect(half.gone).toBe(16);
    expect(Math.max(...half.list)).toBe(Math.max(...all));
    expect(W.stoppedShort(all, 30, 0.5).list).toEqual(half.list);
    // Mars has nothing below its limit: the control does nothing there
    expect(W.stoppedShort(diameters('mars-highland'), 20, 1).list).toHaveLength(
      91
    );
  });
  test('fitting only the largest: 14 craters above 60 km, 2.24 from 1.23 to 3.56', () => {
    const p = fit('moon-highland', 60);
    holds(L, 'raise-the-floor', { n: p.n, hi: p.hi }, { n: 40, hi: 2 });
    expect(p.index).toBeCloseTo(2.24, 2);
    expect(p.lo).toBeCloseTo(1.23, 2);
    expect(p.hi - p.lo).toBeGreaterThan(
      2 * (fit('moon-highland', 30).hi - fit('moon-highland', 30).lo)
    );
  });
  test('the unbiased index of the mare is 6/7 of the maximum-likelihood one, 2.97', () => {
    const p = fit('moon-mare', 30);
    holds(L, 'unbiased-form', { unbiased: p.unbiased }, { unbiased: 3.47 });
    expect(p.unbiased / p.index).toBeCloseTo(6 / 7, 12);
    const big = fit('mars-highland', 20);
    expect(big.unbiased / big.index).toBeCloseTo(90 / 91, 12);
  });
  test('the two advanced questions point at their answers; the Moon’s limit is 15 pixels across', () => {
    expect(step(L, 'why-not-a-line').answer).toBe(1);
    expect(step(L, 'the-limit-is-the-picture').answer).toBe(1);
    expect(REGIONS['moon-highland'].completeFromKm / 2.0214).toBeCloseTo(
      14.8,
      1
    );
  });
});

describe('What a Crater Diameter Is Worth: every stated number from the kernel', () => {
  const L = 'what-a-crater-diameter-is-worth';
  test('the starting circle: 112.0 +/- 5.9 km, 5.3 percent, the rim 5.0 and the view 0.06', () => {
    const f = W.budgetView({});
    const d = f.diameter;
    holds(
      L,
      'read-the-diameter',
      { D: d.diameter, sigma: d.sigma },
      { D: 101, sigma: 1 }
    );
    expect(d.relative * 100).toBeCloseTo(5.26, 2);
    holds(
      L,
      'the-budget',
      { fit: d.budget.fit * 100, rim: d.budget.recognition * 100 },
      { fit: 5, rim: 1.6 }
    );
    expect(d.budget.scale * 100).toBeCloseTo(0.06, 2);
    expect(d.budget.foreshortening * 100).toBeCloseTo(0.06, 2);
    expect(step(L, 'largest-term-predict').answer).toBe(2);
    // the largest term is the rim's
    const biggest = Object.entries(d.budget).sort((a, b) => b[1] - a[1])[0][0];
    expect(biggest).toBe('recognition');
  });
  test('the view: 1.108 times the radius, 112.0 against 101.1 km, 9.8 percent, a 0.06 percent uncertainty', () => {
    const on = W.budgetView({});
    const off = W.budgetView({ correct: 0 });
    const pct =
      (100 * (on.diameter.diameter - off.diameter.diameter)) /
      on.diameter.diameter;
    holds(
      L,
      'the-correction',
      { D: off.diameter.diameter, pct },
      { D: 112, pct: 0 }
    );
    expect(on.diameter.factor).toBeCloseTo(1.108, 3);
    expect(off.diameter.factor).toBe(1);
    expect(on.view.cosE).toBeCloseTo(0.902, 3);
    expect(step(L, 'big-correction-small-uncertainty').answer).toBe(1);
    // the correction is nearly two sigma of the circle's own
    expect(
      (on.diameter.diameter - off.diameter.diameter) / on.diameter.sigma
    ).toBeGreaterThan(1.8);
  });
  test('the rim point in the tangential direction needs no correction: the stretch is 1', () => {
    expect(W.budgetView({ angle: 5 }).diameter.factor).toBeCloseTo(1, 2);
    expect(W.budgetView({ angle: 275 }).diameter.factor).toBeCloseTo(
      W.budgetView({ angle: 95 }).diameter.factor,
      6
    );
  });
  test('the age is not reported: the question points at the third reason', () => {
    expect(step(L, 'why-no-age').answer).toBe(1);
  });
  test('a circle of 5 pixels: 22.4 km with 8.2 percent from placing it, and no warning above 8 pixels across', () => {
    const f = W.budgetView({ r: 5 });
    holds(
      L,
      'a-small-circle',
      { D: f.diameter.diameter, fit: f.diameter.budget.fit * 100 },
      { D: 112, fit: 1 }
    );
    expect(f.pixelsAcross).toBe(10);
    const rows = W.CRATER_WIDGETS[2].readout({ r: 3 });
    expect(rows.some(r => /too small to place/.test(String(r.value)))).toBe(
      true
    );
    const ok = W.CRATER_WIDGETS[2].readout({ r: 5 });
    expect(ok.some(r => /too small to place/.test(String(r.value)))).toBe(
      false
    );
  });
  test('a threshold at 110 km: 63 percent, a third of a sigma away', () => {
    const f = W.budgetView({ dmin: 110 });
    holds(L, 'coin-toss', { p: 100 * f.chance }, { p: 98 });
    expect((f.diameter.diameter - 110) / f.diameter.sigma).toBeCloseTo(0.34, 2);
  });
  test('the catalog’s crater under the start is 112.2 km, within one sigma of the circle', () => {
    const f = W.budgetView({ catalogue: 1 });
    holds(L, 'against-the-catalog', { D: f.nearest.D }, { D: 90 });
    expect(Math.abs(f.nearest.D - f.diameter.diameter)).toBeLessThan(
      f.diameter.sigma
    );
    expect(step(L, 'which-improvement').answer).toBe(2);
  });
});

describe('the instruments', () => {
  test('the same keys in English and Spanish, the same placeholders, no computed string in either', () => {
    expect(Object.keys(ES_CRATERS).sort()).toEqual(
      Object.keys(EN_CRATERS).sort()
    );
    for (const k of Object.keys(EN_CRATERS)) {
      const placeholders = s =>
        (s.match(/\{[a-zA-Z0-9]+\}/g) ?? []).sort().join();
      expect(placeholders(ES_CRATERS[k])).toBe(placeholders(EN_CRATERS[k]));
    }
  });

  test('three instruments with the ids the family names', () => {
    expect(W.CRATER_WIDGETS.map(w => w.id)).toEqual(LAZY_FAMILIES.crater.ids);
  });

  test('every readout row is words and finite numbers, in both pairs and every region', () => {
    const [regions, sfd, budget] = W.CRATER_WIDGETS;
    const rowsOf = [
      ...[0, 1].map(pair => regions.readout({ pair })),
      ...[0, 1, 2, 3].map(region => sfd.readout({ region })),
      budget.readout({}),
      budget.readout({ catalogue: 1, correct: 0 }),
    ];
    for (const rows of rowsOf) {
      expect(rows.length).toBeGreaterThan(4);
      for (const r of rows)
        expect(String(r.value)).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  test('the comparison refuses in words below the completeness limit and for too few craters', () => {
    const [regions, sfd] = W.CRATER_WIDGETS;
    const refused = regions.readout({ pair: 0, dmin: 25 });
    expect(refused.some(r => /No comparison/.test(String(r.value)))).toBe(true);
    // a zero in one region gives a floor, with no upper end
    const floor = regions.readout({ pair: 0, dmin: 100 });
    expect(floor.some(r => /undefined/.test(String(r.value)))).toBe(true);
    // fewer than five craters above the fit diameter: no fit
    const few = sfd.readout({ region: 1, dmin: 50 });
    expect(few.some(r => /No fit/.test(String(r.value)))).toBe(true);
  });

  test('the size-frequency plot draws every point with an asymmetric interval and a fit', () => {
    const sfd = W.CRATER_WIDGETS[1];
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const spec = sfd.draw(canvas, { region: 0, dmin: 30 });
    const counted = spec.series.find(s => s.id === 'counted');
    const under = spec.series.find(s => s.id === 'under');
    // thresholds 20 km times 2^(k/2): complete from 30 km, so 40 km on
    expect(counted.x.every(x => 10 ** x >= 30)).toBe(true);
    expect(under.x.every(x => 10 ** x < 30)).toBe(true);
    expect(counted.sigma.every(s => s > 0)).toBe(true);
    expect(counted.sigmaLow.every(s => s > 0)).toBe(true);
    // the interval is asymmetric in the log: the upper bar is shorter than the lower
    counted.x.forEach((_, i) =>
      expect(counted.sigma[i]).toBeLessThan(counted.sigmaLow[i])
    );
    expect(spec.series.find(s => s.id === 'fit')).toBeTruthy();
    expect(canvas.style.display).toBe('none');
  });

  test('the plotted densities are the kernel’s, per million square kilometers', () => {
    const sfd = W.CRATER_WIDGETS[1];
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const spec = sfd.draw(canvas, { region: 2, dmin: 20 });
    const counted = spec.series.find(s => s.id === 'counted');
    const rows = cumulative(diameters('mars-highland'), {
      area: side('mars-highland').area,
      thresholds: [20, 20 * Math.SQRT2],
    }).rows;
    expect(10 ** counted.y[0] / 1).toBeCloseTo(rows[0].density * 1e6, 8);
    expect(10 ** counted.y[1]).toBeCloseTo(rows[1].density * 1e6, 8);
  });
});

describe('the pictures and the catalog agree', () => {
  test('every committed crater centre falls inside the picture of its region', () => {
    for (const id of Object.keys(REGIONS)) {
      const r = REGIONS[id];
      for (const [, lon, lat] of r.craters) {
        const { x, y } = W.pixelOf(r, lon, lat);
        expect(x).toBeGreaterThanOrEqual(-0.5);
        expect(x).toBeLessThanOrEqual(r.frame.width + 0.5);
        expect(y).toBeGreaterThanOrEqual(-0.5);
        expect(y).toBeLessThanOrEqual(r.frame.height + 0.5);
      }
    }
  });

  test('a lunar footprint is the ground circle squeezed along the radial direction by cos E', () => {
    const r = REGIONS['moon-highland'];
    const e = W.footprint(r, 0, -30, 100);
    const rg = 100 / 2 / r.geometry.kmPerPixelAtCentre;
    expect(e.ry).toBeCloseTo(rg, 10);
    // lon 0, lat -30: cos E = cos(30 degrees)
    expect(e.rx / e.ry).toBeCloseTo(Math.cos((30 * Math.PI) / 180), 10);
    // the radial direction there is vertical in the picture
    expect(Math.abs(Math.sin(e.rot))).toBeCloseTo(1, 10);
  });

  test('a Martian footprint is stretched east-west by 1 over cos(latitude)', () => {
    const r = REGIONS['mars-highland'];
    const e = W.footprint(r, 47, 7, 50);
    expect(e.rx / e.ry).toBeCloseTo(1 / Math.cos((7 * Math.PI) / 180), 10);
    expect(e.rot).toBe(0);
  });

  test('the four regions and the pairs are the ones the lessons name', () => {
    expect(W.REGION_IDS).toEqual(Object.keys(REGIONS));
    expect(W.PAIRS.flat().sort()).toEqual([...W.REGION_IDS].sort());
    for (const [a] of W.PAIRS) expect(REGIONS[a].what).toMatch(/highland/i);
  });
});
