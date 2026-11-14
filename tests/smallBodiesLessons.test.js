/**
 * @jest-environment jsdom
 */
// =============================================================================
// The small-body investigations and instruments (Roadmap III, Prompt 198 part 3)
// -----------------------------------------------------------------------------
// Every number a step of "The Gaps in the Belt" and "How Fast Does It Spin?"
// states is recomputed here from the kernel (js/kernels/smallbodies/) and the
// committed pack (js/data/smallbodies/numbered-h13.json, whose SHA-256 of the
// retrieved response and row count this checks): each validator accepts the
// kernel's value and refuses a wrong one, the predictions point at their answer,
// the catalog says what it is (what was found, not what is there), the light
// curve says it is synthetic and keeps its truth withheld until asked, and the
// instruments read out through the same words in English and Spanish. The failed
// legs of the validation are held by tests/smallBodies.test.js.
// =============================================================================

/* global document */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as K from '../js/kernels/smallbodies/index.js';
import { EN_SMALLBODIES } from '../js/i18n/en.smallbodies.js';
import { ES_SMALLBODIES } from '../js/i18n/es.smallbodies.js';
import ES_LESSONS from '../js/data/investigations/es/satellite-sequence.js';
import ES_DEEP from '../js/data/investigations/depth/es/satellite-sequence.js';
import { LAZY_FAMILIES } from '../js/widgets.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACK = JSON.parse(
  readFileSync(path.join(ROOT, 'js/data/smallbodies/numbered-h13.json'), 'utf8')
);
const IDS = ['the-gaps-in-the-belt', 'how-fast-does-it-spin'];
const lesson = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);

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
let view;
let spin;
beforeAll(async () => {
  W = await import('../js/smallBodiesWidgets.js');
  W.provideBelt(PACK);
  view = v => W.beltView(v);
  spin = v => W.spinView(v);
});

describe('the catalog is the committed one', () => {
  test('8,886 numbered objects, the response it came from, and what the cut is', () => {
    expect(PACK.n).toBe(8886);
    expect(PACK.retrievedRows).toBe(8886);
    expect(PACK.retrievedSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(PACK.selection).toMatch(/discovered/);
    expect(PACK.selection).toMatch(/not the number of bodies there are/);
    expect(PACK.credit).toMatch(/not endorsed/);
    expect(PACK.retrieved).toBe('2026-10-27');
  });

  test('5,871 rows lie between 2.0 and 3.5 AU, and 2,537 have H below 11', () => {
    const cat = K.catalogFromPack(PACK);
    let inRange = 0;
    let bright = 0;
    for (let i = 0; i < cat.n; i++) {
      if (cat.a[i] >= 2 && cat.a[i] < 3.5) inRange++;
      if (cat.H[i] < 11) bright++;
    }
    expect(inRange).toBe(5871);
    expect(bright).toBe(2537);
  });
});

describe('the lessons are registered whole', () => {
  test('both exist with three depths, and Spanish in step', () => {
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
      for (const [i, s] of l.steps.entries()) {
        const es = ES_LESSONS[id].steps[i];
        expect((es.options ?? []).length).toBe((s.options ?? []).length);
        expect((es.fields ?? []).length).toBe((s.fields ?? []).length);
      }
      const deeper = full.steps.filter(s => s.depth);
      for (const [i, s] of deeper.entries()) {
        const es = ES_DEEP[id].steps[i];
        expect((es.options ?? []).length).toBe((s.options ?? []).length);
        expect((es.fields ?? []).length).toBe((s.fields ?? []).length);
      }
    }
  });

  test('the step and graded counts the manifest states', () => {
    const counts = id => {
      const l = INVESTIGATIONS.find(x => x.id === id);
      return [
        l.steps.length,
        l.steps.filter(s => s.type !== 'read').length,
        l.objectives.length,
      ];
    };
    expect(counts('the-gaps-in-the-belt')).toEqual([8, 6, 4]);
    expect(counts('how-fast-does-it-spin')).toEqual([6, 4, 4]);
  });

  test('every step names a tool the small-body family owns', () => {
    const owned = LAZY_FAMILIES.smallBodies.ids;
    expect(owned).toEqual(['belt-gaps', 'spin-curve']);
    for (const id of IDS)
      for (const s of lesson(id).steps) expect(owned).toContain(s.tool.id);
    for (const s of lesson('the-gaps-in-the-belt').steps)
      expect(s.tool.id).toBe('belt-gaps');
    for (const s of lesson('how-fast-does-it-spin').steps)
      expect(s.tool.id).toBe('spin-curve');
  });

  test('every prediction reveals a step that exists in the lesson, and unique sids', () => {
    for (const id of IDS) {
      const sids = lesson(id).steps.map(x => x.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const s of lesson(id).steps.filter(x => x.reveal))
        expect(sids).toContain(s.reveal);
    }
  });

  test('the first step says what the catalog is; the light curve says it is synthetic', () => {
    const b = step('the-gaps-in-the-belt', 'a-catalog-of-whats-found').body;
    expect(b).toMatch(/found<\/em>, not of what is there/);
    expect(b).toMatch(/JPL/);
    expect(b).toMatch(/not endorsed/);
    const s = step('how-fast-does-it-spin', 'a-flickering-point').body;
    expect(s).toMatch(/synthetic/);
    expect(s).toMatch(/not a real/);
    for (const x of lesson('how-fast-does-it-spin').steps)
      expect(x.body ?? '').not.toMatch(/authentic|measured light curve of/);
  });
});

describe('The Gaps in the Belt: every stated number from the kernel', () => {
  const cat = K.catalogFromPack(PACK);
  const survey = (pick = () => true, opts = {}) => {
    const a = Float64Array.from(
      Array.from(cat.a).filter((_, i) => pick(cat.H[i]))
    );
    return K.gapSurvey(a, {
      draws: 400,
      seed: 'small-bodies-198:e1',
      label: 'e1',
      ...opts,
    });
  };
  const full = survey();
  const g = id => full.gaps.find(x => x.id === id);

  test('the 3:1 window: 26 found of 216, 88.0 percent, 82.9 to 92.4, resolved', () => {
    const w = g('3:1');
    expect(w.nObs).toBe(26);
    near(w.nExp, 216.15, 0.05);
    near(100 * w.depletion, 88.0, 0.05);
    near(100 * w.lo, 82.9, 0.05);
    near(100 * w.hi, 92.4, 0.05);
    expect(w.verdict).toBe('resolved');
    holds(
      'the-gaps-in-the-belt',
      'count-the-gap',
      { found: 26, expected: 216 },
      { found: 26, expected: 300 }
    );
    holds(
      'the-gaps-in-the-belt',
      'depletion',
      { dep: 88.0, lo: 82.9, hi: 92.4 },
      { dep: 80, lo: 82.9, hi: 92.4 }
    );
    const v = view({ gap: 1 });
    expect(v.row.nObs).toBe(26);
    expect(v.row.depletion).toBeCloseTo(w.depletion, 12);
  });

  test('the prediction points at one in eight and reveals the depletion step', () => {
    const s = step('the-gaps-in-the-belt', 'depletion-predict');
    expect(s.answer).toBe(0);
    expect(s.options[0]).toMatch(/one in eight/);
    expect(s.reveal).toBe('depletion');
    near(1 - 26 / 216.15, 0.88, 0.001);
    expect(step('the-gaps-in-the-belt', 'what-is-counted').answer).toBe(0);
    expect(step('the-gaps-in-the-belt', 'not-empty').answer).toBe(0);
  });

  test('the 5:2 window: 115 found of 314, 63.3 percent, 56.5 to 70.0', () => {
    const w = g('5:2');
    expect(w.nObs).toBe(115);
    near(w.nExp, 313.7, 0.05);
    near(100 * w.depletion, 63.3, 0.05);
    near(100 * w.lo, 56.5, 0.05);
    near(100 * w.hi, 70.0, 0.05);
    expect(w.verdict).toBe('resolved');
    holds(
      'the-gaps-in-the-belt',
      'the-second-gap',
      { found: 115, dep: 63.3 },
      { found: 115, dep: 88 }
    );
    expect(g('3:1').lo).toBeGreaterThan(w.hi);
  });

  test('twice the width: 170 found, 62.4 percent', () => {
    const wide = survey(() => true, {
      gaps: K.DEFAULT_GAPS.map(x => ({ ...x, halfWidthAu: 2 * x.halfWidthAu })),
    }).gaps.find(x => x.id === '3:1');
    expect(wide.nObs).toBe(170);
    near(100 * wide.depletion, 62.4, 0.05);
    holds(
      'the-gaps-in-the-belt',
      'a-different-window',
      { found: 170, dep: 62.4 },
      { found: 26, dep: 88 }
    );
    expect(view({ gap: 1, width: 2 }).row.nObs).toBe(170);
  });

  test('the brightest 2,537: 7 found of 43, 83.8 percent, 69.4 to 95.2, an interval about three times wider', () => {
    const b = survey(H => H < 11).gaps.find(x => x.id === '3:1');
    expect(b.nObs).toBe(7);
    near(b.nExp, 43.15, 0.05);
    near(100 * b.depletion, 83.8, 0.05);
    near(100 * b.lo, 69.4, 0.05);
    near(100 * b.hi, 95.2, 0.05);
    expect(b.verdict).toBe('resolved');
    const ratio = (b.hi - b.lo) / (g('3:1').hi - g('3:1').lo);
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.2);
    near(100 * ((b.hi - b.lo) / 2), 13, 0.5);
    near(100 * ((g('3:1').hi - g('3:1').lo) / 2), 5, 0.5);
    holds(
      'the-gaps-in-the-belt',
      'a-brighter-cut',
      { found: 7, dep: 83.8, lo: 69.4 },
      { found: 7, dep: 88, lo: 82.9 }
    );
    expect(view({ gap: 1, hlimit: 11 }).row.nObs).toBe(7);
  });

  test('7:3 and 2:1 are not resolved because the flanks are uneven; 4:1 expects too few', () => {
    for (const [id, left, right, dep, exp] of [
      ['7:3', 152, 645, 84, 354],
      ['2:1', 1045, 73, 89, 487],
    ]) {
      const w = g(id);
      expect(w.verdict).toBe('not resolved');
      expect(w.reason).toBe('uneven-flanks');
      expect(w.flanks.left).toBe(left);
      expect(w.flanks.right).toBe(right);
      near(100 * w.depletion, dep, 0.5);
      near(w.nExp, exp, 0.5);
    }
    expect(g('4:1').reason).toBe('too-few-expected');
    expect(step('the-gaps-in-the-belt', 'which-gaps-are-resolved').answer).toBe(
      0
    );
  });

  test('183 Hildas and 1,555 Jupiter Trojans, by a class rule', () => {
    const c = K.countClasses(
      Array.from(cat.a, (a, i) => ({ a, e: cat.e[i], i: cat.i[i] }))
    ).counts;
    expect(c.hilda).toBe(183);
    expect(c.trojan).toBe(1555);
    holds(
      'the-gaps-in-the-belt',
      'hildas-and-trojans',
      { hilda: 183, trojan: 1555 },
      { hilda: 1555, trojan: 183 }
    );
    expect(view({ classes: 1 }).classes.counts.hilda).toBe(183);
  });

  test('a survey finds 2.0 AU 40.0 times as completely as 3.5; a uniform belt shows 2.35 AU', () => {
    near(K.detectedFractionRatio(2.0, 3.5, 0.5), 40.0, 0.05);
    near(K.meanAxisDetected({ range: [2.0, 3.5], alpha: 0.5 }), 2.348, 0.001);
    holds(
      'the-gaps-in-the-belt',
      'what-a-survey-keeps',
      { ratio: 40.0, mean: 2.35 },
      { ratio: 4.0, mean: 2.75 }
    );
  });

  test('the baseline is a choice: 83.7 at degree 3, 88.5 at degree 6, a spread of the interval’s half-width', () => {
    const d3 = survey(() => true, { baselineDegree: 3 }).gaps.find(
      x => x.id === '3:1'
    );
    const d6 = survey(() => true, { baselineDegree: 6 }).gaps.find(
      x => x.id === '3:1'
    );
    near(100 * d3.depletion, 83.7, 0.05);
    near(100 * d6.depletion, 88.5, 0.05);
    const spread = 100 * (d6.depletion - d3.depletion);
    near(spread, 4.8, 0.05);
    near(100 * ((g('3:1').hi - g('3:1').lo) / 2), 4.8, 0.1);
    const f3 = survey(() => true, { baselineDegree: 3 }).gaps.find(
      x => x.id === '5:2'
    );
    const f6 = survey(() => true, { baselineDegree: 6 }).gaps.find(
      x => x.id === '5:2'
    );
    near(100 * f3.depletion, 74.3, 0.05);
    near(100 * f6.depletion, 62.2, 0.05);
    holds(
      'the-gaps-in-the-belt',
      'the-baseline-is-a-choice',
      { d3: 83.7, d6: 88.5 },
      { d3: 88.0, d6: 88.0 }
    );
    expect(view({ gap: 1, degree: 3 }).row.depletion).toBeCloseTo(
      d3.depletion,
      12
    );
  });

  test('the brightest 304: 1 found of 17, 94 percent, 80 to 100, still called resolved', () => {
    const t = survey(H => H < 9).gaps.find(x => x.id === '3:1');
    expect(t.nObs).toBe(1);
    near(t.nExp, 17.4, 0.05);
    near(100 * t.depletion, 94, 0.5);
    near(100 * t.lo, 80, 0.5);
    near(100 * t.hi, 100, 0.01);
    expect(t.verdict).toBe('resolved');
    expect(view({ gap: 1, hlimit: 9 }).survey.n).toBe(304);
    for (const sid of [
      'a-depletion-is-not-a-clearing-fraction',
      'resolved-is-not-precise',
    ])
      expect(step('the-gaps-in-the-belt', sid).answer).toBe(0);
  });

  test('the whole catalog at H below 11 gives the validation record’s 0.838 (e1.selection.H11)', () => {
    const h11 = Float64Array.from(
      Array.from(cat.a).filter((_, i) => cat.H[i] < 11)
    );
    expect(h11).toHaveLength(2537);
    const r = K.gapSurvey(h11, { draws: 0 });
    near(r.gaps.find(x => x.id === '3:1').depletion, 0.8378, 0.0005);
  });
});

describe('How Fast Does It Spin?: every stated number from the kernel', () => {
  const run = v => {
    const s = spin(v);
    return { s, r: s.rot, truth: s.lc.truth };
  };

  test('target A over five nights: the light repeats every 3.099 h, the rotation is 6.199 ± 0.001', () => {
    const { r, truth, s } = run({ target: 0 });
    expect(s.lc.t).toHaveLength(200);
    expect(truth.synthetic).toBe(true);
    expect(truth.periodHours).toBe(6.2);
    near(r.peakPeriodHours, 3.099, 0.0006);
    near(r.periodHours, 6.199, 0.0006);
    near(r.sigmaHours, 0.001, 0.0006);
    expect(r.verdict).toBe('period');
    holds(
      'how-fast-does-it-spin',
      'rotation-period',
      { peak: 3.099, period: 6.199 },
      { peak: 6.199, period: 3.099 }
    );
    const p = step('how-fast-does-it-spin', 'two-maxima-predict');
    expect(p.answer).toBe(0);
    expect(p.reveal).toBe('rotation-period');
  });

  test('the amplitude 0.333 mag (0.331 to 0.339) and a/b at least 1.36; the truth is 1.5 and 0.335', () => {
    const { r, truth } = run({ target: 0 });
    near(r.amplitudeMag, 0.333, 0.0006);
    near(r.amplitudeInterval.lo, 0.331, 0.0006);
    near(r.amplitudeInterval.hi, 0.339, 0.0006);
    near(r.axisRatioBound.value, 1.36, 0.006);
    near(truth.amplitudeMag, 0.335, 0.0006);
    expect(truth.body.a / truth.body.b).toBe(1.5);
    expect(truth.thetaDeg).toBe(70);
    expect(r.axisRatioBound.value).toBeLessThan(1.5);
    holds(
      'how-fast-does-it-spin',
      'amplitude-and-bound',
      { amp: 0.333, bound: 1.36 },
      { amp: 0.333, bound: 1.5 }
    );
    expect(step('how-fast-does-it-spin', 'ask-for-the-truth').answer).toBe(0);
  });

  test('one night: 6.268 ± 0.036, 1.9 sigmas from the truth, the uncertainty more than thirty times larger', () => {
    const one = run({ target: 0, nights: 1 });
    const five = run({ target: 0 });
    near(one.r.periodHours, 6.268, 0.0006);
    near(one.r.sigmaHours, 0.036, 0.0006);
    near((one.r.periodHours - 6.2) / one.r.sigmaHours, 1.9, 0.1);
    expect(one.r.sigmaHours / five.r.sigmaHours).toBeGreaterThan(30);
    holds(
      'how-fast-does-it-spin',
      'fewer-nights',
      { p: 6.268, s: 0.036 },
      { p: 6.199, s: 0.001 }
    );
  });

  test('target B: 11.388 ± 0.005 against 11.400, more than two sigmas', () => {
    const { r, truth } = run({ target: 1 });
    near(r.periodHours, 11.388, 0.0006);
    near(r.sigmaHours, 0.005, 0.0006);
    expect(truth.periodHours).toBe(11.4);
    expect((truth.periodHours - r.periodHours) / r.sigmaHours).toBeGreaterThan(
      2
    );
    holds(
      'how-fast-does-it-spin',
      'the-error-is-a-floor',
      { p: 11.388, s: 0.005 },
      { p: 11.4, s: 0.05 }
    );
  });

  test('a nearly round body: 0.106 mag, a/b at least 1.10 against a truth of 1.15', () => {
    const { r, truth } = run({ target: 1 });
    near(r.amplitudeMag, 0.106, 0.0006);
    near(r.axisRatioBound.value, 1.1, 0.006);
    expect(truth.body.a / truth.body.b).toBe(1.15);
    holds(
      'how-fast-does-it-spin',
      'a-nearly-round-body',
      { amp: 0.106, bound: 1.1 },
      { amp: 0.3, bound: 1.1 }
    );
  });

  test('one night of target B: the amplitude is withheld for a gap of 0.60, the period 16.6 ± 9.3', () => {
    const { r } = run({ target: 1, nights: 1 });
    expect(r.amplitudeMag).toBeNull();
    expect(r.amplitudeWithheld).toBe('phase-gap');
    near(r.phaseGap, 0.6, 0.005);
    expect(r.phaseGap).toBeGreaterThan(0.35);
    near(r.periodHours, 16.6, 0.1);
    near(r.sigmaHours, 9.3, 0.1);
    expect(
      step('how-fast-does-it-spin', 'one-night-is-not-enough').answer
    ).toBe(0);
  });

  test('one point a night: ambiguous, 5.49 h or 6.20 h, the top one wrong, printed as 5.491 ± 0.000', () => {
    const { r, s } = run({ target: 0, cadence: 1 });
    expect(s.lc.t).toHaveLength(40);
    expect(r.verdict).toBe('ambiguous');
    near(r.candidates[0].periodHours, 5.49, 0.006);
    near(r.candidates[1].periodHours, 6.2, 0.006);
    near(r.periodHours, 5.491, 0.0006);
    expect(r.sigmaHours).toBeLessThan(0.0006);
    holds(
      'how-fast-does-it-spin',
      'once-a-night',
      { p1: 5.49, p2: 6.2 },
      { p1: 6.2, p2: 5.49 }
    );
  });

  test('target C, an 8.0 h rotation, is not periodic at one point a night (false alarm 0.33) and 8.002 h on dense nights', () => {
    const once = run({ target: 2, cadence: 1 });
    expect(once.r.verdict).toBe('not-periodic');
    near(once.r.falseAlarm, 0.33, 0.005);
    expect(once.truth.periodHours).toBe(8);
    expect(24 / once.truth.periodHours).toBe(3);
    const dense = run({ target: 2 });
    near(dense.r.periodHours, 8.002, 0.0006);
    near(dense.truth.amplitudeMag, 0.315, 0.0006);
    expect(
      step('how-fast-does-it-spin', 'not-periodic-is-the-samplings').answer
    ).toBe(0);
  });

  test('target D, a star that does not vary: peak 4.09 h, power 0.06, false alarm 0.26, no period', () => {
    const { r, truth } = run({ target: 3 });
    expect(truth.amplitudeMag).toBe(0);
    expect(r.verdict).toBe('not-periodic');
    near(r.peakPeriodHours, 4.09, 0.006);
    near(r.power, 0.06, 0.005);
    near(r.falseAlarm, 0.26, 0.005);
    expect(step('how-fast-does-it-spin', 'nothing-to-find').answer).toBe(0);
  });

  test('the one-maximum reading is half the rotation period', () => {
    const { r } = run({ target: 0 });
    near(r.alternative.periodHours, 3.1, 0.006);
    expect(step('how-fast-does-it-spin', 'one-maximum').answer).toBe(0);
  });
});

describe('the instruments', () => {
  test('the same keys in English and Spanish, with the same placeholders', () => {
    expect(Object.keys(ES_SMALLBODIES).sort()).toEqual(
      Object.keys(EN_SMALLBODIES).sort()
    );
    for (const k of Object.keys(EN_SMALLBODIES)) {
      const placeholders = s =>
        (s.match(/\{[a-zA-Z0-9]+\}/g) ?? []).sort().join();
      expect(placeholders(ES_SMALLBODIES[k])).toBe(
        placeholders(EN_SMALLBODIES[k])
      );
    }
  });

  test('two instruments with the ids the family names', () => {
    expect(W.SMALL_BODIES_WIDGETS.map(w => w.id)).toEqual([
      'belt-gaps',
      'spin-curve',
    ]);
  });

  test('the belt instrument reads out the window, the verdict and what the cut is', () => {
    const w = W.SMALL_BODIES_WIDGETS[0];
    const out = w.readout({ gap: 1 });
    expect(out.find(r => /What this is/.test(r.label)).value).toMatch(
      /real catalog: 8886 numbered/
    );
    expect(out.find(r => /What the cut is/.test(r.label)).value).toMatch(
      /not the objects there are/
    );
    expect(
      out.find(r => /^Depletion against the baseline$/.test(r.label)).value
    ).toMatch(/^88\.0 percent, 95 percent interval 82\.9 to 92\.4/);
    expect(out.find(r => /Verdict/.test(r.label)).value).toMatch(/^resolved/);
    const not = w.readout({ gap: 4 });
    expect(not.find(r => /Verdict/.test(r.label)).value).toMatch(
      /^not resolved: the two sides/
    );
    expect(not.find(r => /Warnings/.test(r.label)).value).toMatch(
      /flanks are uneven/
    );
    const more = w.readout({ gap: 1, classes: 1, survey: 1 });
    expect(more.find(r => /Orbit classes/.test(r.label)).value).toMatch(
      /Hildas 183; Jupiter Trojans 1555/
    );
    expect(more.find(r => /A magnitude-limited/.test(r.label)).value).toMatch(
      /40\.0 times/
    );
    expect(more.find(r => /mean of what/.test(r.label)).value).toMatch(
      /2\.35 AU.*2\.75 AU/
    );
    for (const row of more)
      expect(String(row.value)).not.toMatch(/NaN|undefined/);
    expect(more.find(r => /What is left out/.test(r.label)).value).toMatch(
      /sampling error only/
    );
  });

  test('the spin instrument says it is synthetic, withholds the truth, and shows it on request', () => {
    const w = W.SMALL_BODIES_WIDGETS[1];
    const out = w.readout({ target: 0 });
    expect(out[0].value).toMatch(/^Synthetic:/);
    expect(out[0].value).toMatch(/Not the light of a real asteroid/);
    expect(out.some(r => /truth/i.test(r.label))).toBe(false);
    expect(out.find(r => /^Rotation period/.test(r.label)).value).toMatch(
      /^6\.199 h ± 0\.001 h/
    );
    expect(out.find(r => /Strongest peak/.test(r.label)).value).toMatch(
      /^a light period of 3\.099 h/
    );
    const shown = w.readout({ target: 0, truth: 1 });
    expect(shown.find(r => /truth/i.test(r.label)).value).toMatch(
      /rotation period 6\.20 h, a\/b = 1\.50/
    );
    const nope = w.readout({ target: 3 });
    expect(nope.find(r => /Verdict/.test(r.label)).value).toMatch(
      /^not periodic/
    );
    const held = w.readout({ target: 1, nights: 1 });
    expect(held.find(r => /Amplitude/.test(r.label)).value).toMatch(
      /^withheld: a gap of 0\.60/
    );
    const amb = w.readout({ target: 0, cadence: 1 });
    expect(amb.find(r => /competing/.test(r.label)).value).toBe(
      '5.49 h or 6.20 h'
    );
    for (const row of [...out, ...shown, ...amb])
      expect(String(row.value)).not.toMatch(/NaN|undefined/);
  });

  test('both instruments draw on a canvas without error, in each state', () => {
    const fake = () =>
      new Proxy(
        {},
        {
          get: (t, k) => (k in t ? t[k] : () => ({ width: 10 })),
          set: (t, k, v) => {
            t[k] = v;
            return true;
          },
        }
      );
    for (const w of W.SMALL_BODIES_WIDGETS)
      for (const v of [
        {},
        { gap: 4 },
        { target: 3 },
        { target: 1, nights: 1 },
      ]) {
        const canvas = document.createElement('canvas');
        canvas.getContext = fake;
        document.body.append(canvas);
        expect(() => w.draw(canvas, v)).not.toThrow();
      }
  });

  test('the controls: ranges, defaults inside them, and formats that name what they set', () => {
    for (const w of W.SMALL_BODIES_WIDGETS)
      for (const c of w.controls) {
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
        expect(String(c.format(c.value))).not.toMatch(/NaN|undefined/);
        expect(c.label.length).toBeGreaterThan(3);
      }
    for (const p of W.SMALL_BODIES_WIDGETS.flatMap(w => w.presets))
      expect(p.label.length).toBeGreaterThan(3);
  });

  test('before the catalog arrives the belt instrument says so, never a number', () => {
    W.provideBelt(null);
    const out = W.SMALL_BODIES_WIDGETS[0].readout({});
    expect(out).toHaveLength(1);
    expect(out[0].value).toMatch(/loading|could not be loaded/);
    W.provideBelt(PACK);
  });
});
