// =============================================================================
// How far, and how sure? and What Gaia does not see, in two languages
// (Roadmap III, Prompt 233 Part B)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lessons draw
// (js/gaiaWidgets.js over js/gaiaField.js and js/kernels/galactic/gaia.js) or held to
// tests/fixtures/gaia-workflows/results.json and the pack; the step validators accept
// the panel's own readings and refuse others; no number the lessons quote about NGC 2420
// is typed from memory; and the Spanish carries the same step structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/galactic/gaia.js';
import { PACK } from '../js/data/observations/gaiaNgc2420.js';
import {
  distanceView,
  sampleView,
  prepareCluster,
  POE_THRESHOLD,
} from '../js/gaiaField.js';
import { GAIA_WIDGETS, provideGaiaData } from '../js/gaiaWidgets.js';
import {
  HOW_FAR_AND_HOW_SURE as FAR,
  HOW_FAR_AND_HOW_SURE_ES as FAR_ES,
  HOW_FAR_AND_HOW_SURE_DEEPER as FAR_DEEP,
  HOW_FAR_AND_HOW_SURE_DEEPER_ES as FAR_DEEP_ES,
  WHAT_GAIA_DOES_NOT_SEE as SEE,
  WHAT_GAIA_DOES_NOT_SEE_ES as SEE_ES,
  WHAT_GAIA_DOES_NOT_SEE_DEEPER as SEE_DEEP,
  WHAT_GAIA_DOES_NOT_SEE_DEEPER_ES as SEE_DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/gaia-sequence.js';

const RESULTS = JSON.parse(
  readFileSync(
    new URL('./fixtures/gaia-workflows/results.json', import.meta.url),
    'utf8'
  )
);
const row = id => RESULTS.rows.find(r => r.id.startsWith(id));
const E1 = row('E1').measured;
const data = prepareCluster({
  PACK,
  SERIES: JSON.parse(
    readFileSync(new URL('../gaia/ngc2420.json', import.meta.url), 'utf8')
  ),
});
provideGaiaData(data);

const all = [...FAR.steps, ...FAR_DEEP.steps, ...SEE.steps, ...SEE_DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const D = v => distanceView(v);
const S = v => sampleView(data, v);
const r1 = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const text = JSON.stringify([
  FAR,
  FAR_DEEP,
  SEE,
  SEE_DEEP,
  INSTRUCTOR.content,
  INSTRUCTOR.expectations,
]);

describe('the panels reproduce the validation record', () => {
  test('NGC 2420 with no cut is leg E1’s measurement, to the figure the record prints', () => {
    const v = S({});
    expect(v.members.length).toBe(E1.measured.members);
    expect(v.cluster.n).toBe(E1.measured.kept);
    expect(r1(v.cluster.mean, 5)).toBeCloseTo(E1.measured.meanParallaxMas, 5);
    expect(r1(v.cluster.meanZeroPoint, 4)).toBeCloseTo(
      E1.measured.meanZeroPointMas,
      4
    );
    expect(r1(v.record.distance, 4)).toBeCloseTo(E1.measured.distanceKpc, 4);
    expect(r1(v.record.interval.lo, 3)).toBeCloseTo(
      E1.measured.intervalKpc[0],
      3
    );
    expect(r1(v.record.interval.hi, 3)).toBeCloseTo(
      E1.measured.intervalKpc[1],
      3
    );
    const without = S({ zp: 0 });
    expect(r1(without.record.distance, 4)).toBeCloseTo(
      E1.variants.noZeroPoint.distanceKpc,
      4
    );
  });

  test('the pack says what the lessons say about it', () => {
    expect(data.n).toBe(993);
    expect(data.dropped).toBe(55);
    expect(PACK.version).toBe('1.1.0');
  });

  test('the inversion’s bias and coverage the lessons quote are the record’s', () => {
    const a1 = row('A1.').measured;
    expect(a1.map(x => r1(x.mc, 3))).toEqual([1.043, 1.01, 1.003]);
    expect(row('A1b').measured.median).toBeCloseTo(1.00007, 5);
    const c4 = row('C4').measured;
    const wrong = c4.filter(x => x.truthScale === 3).map(x => x.coverage68);
    expect(Math.round(100 * Math.min(...wrong))).toBe(22);
    expect(Math.round(100 * Math.max(...wrong))).toBe(42);
    expect(row('D3').measured.low.map(x => x.factor)[0]).toBeCloseTo(1.56, 2);
    const e3 = row('E3').measured;
    expect(e3.stars).toBe(1570);
    expect(e3.shareOverTenthOfError).toBeCloseTo(0.802, 3);
    expect(e3.largestRoundingMas).toBeCloseTo(0.00999, 5);
    expect(row('S1').measured.slope).toBeCloseTo(0.6, 2);
    expect(row('E1').status).toBe('not-run');
  });
});

describe('How far, and how sure?: the distance panel', () => {
  test('0.40 mas with an error of 0.05 mas', () => {
    const d = D({ plx: 0.4, err: 0.05 }).record;
    expect(d.distance).toBeCloseTo(2.5, 6);
    expect(d.interval.lo).toBeCloseTo(2.2222, 3);
    expect(d.interval.hi).toBeCloseTo(2.8572, 3);
    expect(d.poe).toBeCloseTo(8, 9);
    // the steps' 0.28 and 0.36
    expect(r1(d.distance - d.interval.lo, 2)).toBe(0.28);
    expect(r1(d.interval.hi - d.distance, 2)).toBe(0.36);
  });

  test('the threshold of five falls between 0.08 and 0.09 mas of error at 0.40 mas', () => {
    expect(POE_THRESHOLD).toBe(5);
    expect(D({ plx: 0.4, err: 0.08 }).record.status).toBe('ok');
    const t = D({ plx: 0.4, err: 0.09 }).record;
    expect(t.status).toBe('low-signal');
    expect(t.poe).toBeCloseTo(4.4444, 3);
  });

  test('a parallax as large as its error has no far end; a negative one has no distance', () => {
    const low = D({ plx: 0.1, err: 0.1 }).record;
    expect(low.status).toBe('low-signal');
    expect(low.interval.hi).toBeNull();
    expect(low.interval.lo).toBeCloseTo(5, 2);
    const mid = D({ plx: 0.15, err: 0.1 }).record;
    expect(mid.interval.lo).toBeCloseTo(4, 3);
    expect(mid.interval.hi).toBeCloseTo(20, 2);
    const neg = D({ plx: -0.1, err: 0.05 }).record;
    expect(neg.status).toBe('likelihood-only');
    expect(neg.distance).toBeNull();
    expect(D({ plx: -0.1, err: 0.05, mu: 5 }).velocity.value).toBeNull();
  });

  test('a speed is the distance’s interval times 4.74 and the proper motion', () => {
    const v = D({ plx: 0.4, err: 0.05, mu: 5 }).velocity;
    expect(v.value).toBeCloseTo(59.2559, 3);
    expect(v.interval.lo).toBeCloseTo(52.6718, 3);
    expect(v.interval.hi).toBeCloseTo(67.7212, 3);
  });

  test('a prior closes the weak interval, moves with its scale, and barely moves a strong one', () => {
    const a = D({ plx: 0.1, err: 0.1, prior: 1, L: 1 }).record;
    expect(a.status).toBe('prior-dominated');
    expect(a.posterior.median).toBeCloseTo(5.1132, 2);
    expect(a.posterior.interval.lo).toBeCloseTo(3.8516, 2);
    expect(a.posterior.interval.hi).toBeCloseTo(6.9309, 2);
    const b = D({ plx: 0.1, err: 0.1, prior: 1, L: 2 }).record;
    expect(b.posterior.interval.hi).toBeCloseTo(10.8119, 2);
    expect(b.posterior.interval.hi / a.posterior.interval.hi).toBeCloseTo(
      row('D3').measured.low[0].factor,
      2
    );
    const s1 = D({ plx: 0.4, err: 0.02, prior: 1, L: 1 }).record;
    const s2 = D({ plx: 0.4, err: 0.02, prior: 1, L: 2 }).record;
    expect(s1.posterior.median).toBeCloseTo(2.5093, 3);
    expect(s2.posterior.median).toBeCloseTo(2.5174, 3);
  });

  test('a zero point of -0.040 mas moves 0.40 mas to 2.27 kpc, outside the interval for an error of 0.02 mas', () => {
    const d = D({ plx: 0.4, err: 0.02, zp: -0.04 }).record;
    expect(d.distance).toBeCloseTo(2.2727, 3);
    const none = D({ plx: 0.4, err: 0.02 }).record;
    expect(none.interval.lo).toBeCloseTo(2.3809, 3);
    expect(none.interval.hi).toBeCloseTo(2.6316, 3);
    expect(d.distance).toBeLessThan(none.interval.lo);
  });

  test('the curves are drawn, with the prior and posterior only when the prior is on', () => {
    const off = D({}).curve;
    expect(off.likelihood.length).toBe(off.r.length);
    expect(off.prior).toBeUndefined();
    const on = D({ prior: 1 }).curve;
    expect(Math.max(...on.posterior)).toBeCloseTo(1, 6);
    expect(Math.max(...on.prior)).toBeCloseTo(1, 2);
    expect(Math.max(...on.likelihood)).toBeCloseTo(1, 6);
  });
});

describe('What Gaia does not see: the sample panel', () => {
  test('what the cuts remove, the counts the steps state', () => {
    expect(S({ mag: 16 }).cuts.alone[0].removed).toBe(526);
    const m15 = S({ mag: 15 });
    expect(m15.cuts.alone[0].removed).toBe(755);
    expect(m15.kept).toBe(238);
    expect(755 + 238).toBe(data.n);
    const p10 = S({ poe: 10 });
    expect(p10.cuts.alone[0].removed).toBe(513);
    expect(p10.kept).toBe(480);
    const three = S({ mag: 16, poe: 5, ruwe: 1.1 });
    const alone = Object.fromEntries(
      three.cuts.alone.map(a => [a.id, a.removed])
    );
    expect(alone.parallaxOverError).toBe(189);
    expect(three.cuts.steps.map(s => s.removed)).toEqual([526, 5, 100]);
    expect(S({ ruwe: 1.1 }).cuts.alone[0].removed).toBe(168);
    expect(S({ ruwe: 1.1 }).record.distance).toBeCloseTo(2.3249, 3);
  });

  test('parallax over error removes mostly faint stars (means 16.7 and 14.9)', () => {
    const v = S({ poe: 10 });
    const mean = ids => ids.reduce((s, i) => s + data.g[i], 0) / ids.length;
    expect(r1(mean(v.removed))).toBe(16.7);
    expect(r1(mean([...v.members, ...v.others]))).toBe(14.9);
  });

  test('the cut moves the distance outside the first interval, as the steps say', () => {
    const none = S({});
    const cut = S({ poe: 10 });
    expect(r1(cut.record.distance, 3)).toBe(2.299);
    expect(r1(cut.record.interval.lo, 3)).toBe(2.291);
    expect(r1(cut.record.interval.hi, 3)).toBe(2.308);
    expect(cut.record.interval.hi).toBeLessThan(none.record.interval.lo);
    const half = (none.record.interval.hi - none.record.interval.lo) / 2;
    expect((none.record.distance - cut.record.distance) / half).toBeGreaterThan(
      3
    );
    expect(r1(cut.cluster.mean, 4)).toBe(0.4349);
    expect(r1(none.cluster.mean, 4)).toBe(0.4303);
  });

  test('the zero point follows the stars kept, and the velocities have a scatter', () => {
    expect(r1(S({}).cluster.meanZeroPoint, 4)).toBe(-0.0368);
    expect(r1(S({ poe: 10 }).cluster.meanZeroPoint, 4)).toBe(-0.0417);
    const v = S({}).velocity;
    expect(r1(v.scatterRa, 2)).toBe(1.04);
    expect(r1(v.scatterDec, 2)).toBe(0.97);
  });

  test('every readout row of both panels is text and nothing is undefined', () => {
    const [dist, samp] = GAIA_WIDGETS;
    expect(dist.id).toBe('gaia-distance');
    expect(samp.id).toBe('gaia-sample');
    const cases = [
      [dist, {}],
      [dist, { plx: 0.1, err: 0.1, prior: 1, mu: 5 }],
      [dist, { plx: -0.1, err: 0.05, mu: 5 }],
      [dist, { plx: 0.4, err: 0.02, zp: -0.04 }],
      [samp, {}],
      [samp, { mag: 15, poe: 10, ruwe: 1.1, view: 1 }],
      [samp, { zp: 0 }],
      [samp, { mag: 12 }],
    ];
    for (const [panel, v] of cases) {
      const base = Object.fromEntries(panel.controls.map(c => [c.id, c.value]));
      const rows = panel.readout({ ...base, ...v });
      expect(rows.length).toBeGreaterThanOrEqual(4);
      for (const r of rows) {
        expect(typeof r.value).toBe('string');
        expect(r.value).not.toMatch(/undefined|NaN|\{[a-z]+\}/);
      }
    }
  });
});

describe('the steps', () => {
  test('the validators accept the readings the panels give and refuse others', () => {
    const d = D({ plx: 0.4, err: 0.05 }).record;
    ok('read-the-distance', {
      distance: d.distance,
      lo: d.interval.lo,
      hi: d.interval.hi,
    });
    bad('read-the-distance', { distance: 2.5, lo: 2.5, hi: 2.5 });
    bad('read-the-distance', { distance: 0.4, lo: 0.35, hi: 0.45 });
    ok('the-relative-error', { relative: 12.5 });
    bad('the-relative-error', { relative: 8 });
    ok('an-interval-with-no-far-end', { lo: 5, hi: 20 });
    bad('an-interval-with-no-far-end', { lo: 10, hi: 20 });
    const v = D({ plx: 0.4, err: 0.05, mu: 5 }).velocity;
    ok('from-parallax-to-speed', {
      speed: v.value,
      lo: v.interval.lo,
      hi: v.interval.hi,
    });
    bad('from-parallax-to-speed', { speed: 11.9, lo: 10, hi: 13 });
    const p = D({ plx: 0.1, err: 0.1, prior: 1, L: 1 }).record.posterior;
    ok('add-a-prior', {
      median: p.median,
      lo: p.interval.lo,
      hi: p.interval.hi,
    });
    bad('add-a-prior', { median: 10, lo: 5, hi: 20 });
    ok('the-zero-point', {
      distance: D({ plx: 0.4, err: 0.02, zp: -0.04 }).record.distance,
    });
    bad('the-zero-point', { distance: 2.5 });
    ok('the-cluster-and-the-zero-point', {
      with: S({}).record.distance,
      without: S({ zp: 0 }).record.distance,
    });
    bad('the-cluster-and-the-zero-point', { with: 2.555, without: 2.324 });
    ok('read-what-is-left', { removed: 755, left: 238 });
    bad('read-what-is-left', { removed: 238, left: 755 });
    ok('cuts-overlap', { alone: 189, after: 5 });
    bad('cuts-overlap', { alone: 189, after: 189 });
    ok('the-zero-point-under-cuts', {
      zp: S({ poe: 10 }).cluster.meanZeroPoint,
    });
    bad('the-zero-point-under-cuts', { zp: -0.0368 });
    ok('the-velocity-scatter', { scatter: S({}).velocity.scatterRa });
    bad('the-velocity-scatter', { scatter: 10 });
  });

  test('every choice has a real answer, the answers spread over the positions, and no distractor is the answer', () => {
    for (const s of all) {
      if (s.type === 'question' && s.kind === 'choice') {
        expect(Number.isInteger(s.answer)).toBe(true);
        expect(s.options[s.answer]).toBeTruthy();
        for (const m of s.misconceptions ?? [])
          expect(m.option).not.toBe(s.answer);
      }
    }
    const positions = new Set(
      all
        .filter(s => s.kind === 'choice' || s.type === 'predict')
        .map(s => s.answer)
    );
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  test('the short answers carry a rubric of the four kinds the key prints', () => {
    for (const sid of [
      'justify-a-report',
      'what-the-interval-leaves-out',
      'answer-a-colleague',
      'say-what-the-sample-is',
    ]) {
      const s = step(sid);
      expect(s.kind).toBe('short');
      expect(new Set(s.rubricCriteria.map(c => c.kind))).toEqual(
        new Set(['completion', 'correctness', 'reasoning', 'uncertainty'])
      );
    }
  });

  test('deeper steps hang before the closing step, which is core, in both lessons', () => {
    for (const [core, deep] of [
      [FAR, FAR_DEEP],
      [SEE, SEE_DEEP],
    ]) {
      const sids = new Set(core.steps.map(s => s.sid));
      for (const s of deep.steps) {
        expect(sids.has(s.after)).toBe(true);
        sids.add(s.sid);
      }
      expect(core.steps.at(-1).sid).toBe('what-you-worked-out');
    }
    expect(new Set(all.map(s => s.sid)).size).toBe(
      FAR.steps.length +
        FAR_DEEP.steps.length +
        SEE.steps.length +
        SEE_DEEP.steps.length -
        1 // what-you-worked-out is the closing step of both lessons
    );
  });
});

describe('the published numbers come from a file', () => {
  test('the cluster’s distance is stated with its labels and the unconfirmed value is gone', () => {
    expect(text).toContain('2.324');
    expect(text).toContain('2.316 to 2.332');
    expect(text).toMatch(/no systematic floor/);
    expect(text).toMatch(/NOT RUN|was not run/);
    expect(text).toMatch(/not validated|has not been validated/);
    expect(text).not.toMatch(/about 2\.6 kpc|2\.6 kpc/);
    // the figures are the record's, to the digits printed
    expect(E1.measured.distanceKpc.toFixed(3)).toBe('2.324');
    expect(E1.measured.intervalKpc.map(x => x.toFixed(3))).toEqual([
      '2.316',
      '2.332',
    ]);
    expect(E1.variants.noZeroPoint.distanceKpc.toFixed(3)).toBe('2.555');
    expect(E1.measured.meanZeroPointMas.toFixed(4)).toBe('-0.0368');
    expect(E1.sources.P1.distanceKpc.toFixed(2)).toBe('2.48');
    expect(E1.sources.P4.distanceKpc.toFixed(2)).toBe('2.59');
    expect(E1.sources.P3.distanceKpc.toFixed(2)).toBe('2.78');
    expect(E1.sources.P3.intervalKpc[0].toFixed(2)).toBe('2.38');
    expect(E1.measured.distanceKpc).toBeLessThan(E1.sources.P3.intervalKpc[0]);
  });

  test('no step grades a universal correction or a distance from the rounded pack', () => {
    expect(text).not.toMatch(/Lutz.{0,3}Kelker correction (is|was) applied/);
    expect(text).not.toMatch(
      /distance from the (rounded )?neighbourhood pack/i
    );
  });
});

describe('the Spanish', () => {
  test('carries the same step structure as the English', () => {
    expect(FAR_ES.steps.length).toBe(FAR.steps.length);
    expect(FAR_DEEP_ES.steps.length).toBe(FAR_DEEP.steps.length);
    expect(SEE_ES.steps.length).toBe(SEE.steps.length);
    expect(SEE_DEEP_ES.steps.length).toBe(SEE_DEEP.steps.length);
    const pairs = [
      ...FAR.steps.map((s, i) => [s, FAR_ES.steps[i]]),
      ...FAR_DEEP.steps.map((s, i) => [s, FAR_DEEP_ES.steps[i]]),
      ...SEE.steps.map((s, i) => [s, SEE_ES.steps[i]]),
      ...SEE_DEEP.steps.map((s, i) => [s, SEE_DEEP_ES.steps[i]]),
    ];
    for (const [en, es] of pairs) {
      expect(es.title).toBeTruthy();
      expect(es.body).toBeTruthy();
      if (en.options) expect(es.options.length).toBe(en.options.length);
      if (en.hints) expect(es.hints.length).toBe(en.hints.length);
      if (en.misconceptions)
        expect(es.misconceptions.length).toBe(en.misconceptions.length);
      if (en.fields) expect(es.fields.length).toBe(en.fields.length);
      if (en.checklist) expect(es.checklist.length).toBe(en.checklist.length);
      if (en.rubricCriteria) {
        expect(es.rubricCriteria.length).toBe(en.rubricCriteria.length);
        en.rubricCriteria.forEach((c, i) =>
          expect(es.rubricCriteria[i].levels.length).toBe(c.levels.length)
        );
      }
    }
    expect(FAR_ES.objectives.length).toBe(FAR.objectives.length);
    expect(SEE_ES.objectives.length).toBe(SEE.objectives.length);
  });

  test('the Spanish carries the labels of the cluster’s distance too', () => {
    const es = JSON.stringify([FAR_ES, FAR_DEEP_ES, SEE_ES, SEE_DEEP_ES]);
    expect(es).toContain('2,324');
    expect(es).toContain('2,316 a 2,332');
    expect(es).toMatch(/suelo sistemático/);
    expect(es).toMatch(/NO SE EJECUTÓ|no se ejecutó/);
    expect(es).not.toMatch(/2,6 kpc/);
  });
});

describe('the instructor content', () => {
  test('a guide, a flow, expectations and time bands for each lesson, none of it for a step that is not core', () => {
    for (const [id, core] of [
      ['how-far-and-how-sure', FAR],
      ['what-gaia-does-not-see', SEE],
    ]) {
      const c = INSTRUCTOR.content[id];
      expect(c.teachingNotes.length).toBeGreaterThan(0);
      expect(c.discussion.length).toBeGreaterThan(0);
      expect(c.extensions.length).toBeGreaterThan(0);
      const sids = new Set(core.steps.map(s => s.sid));
      for (const sid of Object.keys(INSTRUCTOR.expectations[id]))
        expect(sids.has(sid)).toBe(true);
      for (const f of INSTRUCTOR.flow[id]) {
        expect(sids.has(f.from)).toBe(true);
        expect(sids.has(f.to)).toBe(true);
      }
      // The documented rule of tests/timeBands.test.js: extra steps at twice the core's minutes a step.
      expect(INSTRUCTOR.bands[id].advanced).toBe(
        id === 'how-far-and-how-sure' ? 'long' : 'medium'
      );
    }
  });
});
