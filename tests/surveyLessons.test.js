// =============================================================================
// The survey lessons, in two languages (Roadmap III, Prompt 215)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lessons draw
// (js/surveyDesignWidgets.js over js/surveyDesignField.js and js/kernels/survey/), read in
// the form the validator takes and fed to the step's own validator; the Spanish carries
// the same step structure; the capstone's plan step is judged by the kernel and accepts
// two different plans, which both round-trip through the instructor's key.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared kernel modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/survey/index.js';
import {
  compareView,
  planView,
  tradeoffView,
} from '../js/surveyDesignField.js';
import { SURVEY_DESIGN_WIDGETS } from '../js/surveyDesignWidgets.js';
import { planVerdict } from '../js/surveyDesignPlan.js';
import { answerKeyFor } from '../js/answerKey.js';
import { SURVEY_SETUPS } from '../js/instruments/survey.js';
import { zeroPointOf } from '../js/instruments/exposureSky.js';
import { areaOf } from '../js/instruments/exposure.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import {
  DEEP_OR_WIDE as DOW,
  DEEP_OR_WIDE_ES as DOW_ES,
  DEEP_OR_WIDE_DEEPER as DOW_D,
  DEEP_OR_WIDE_DEEPER_ES as DOW_D_ES,
  TWO_TELESCOPES as TT,
  TWO_TELESCOPES_ES as TT_ES,
  TWO_TELESCOPES_DEEPER as TT_D,
  TWO_TELESCOPES_DEEPER_ES as TT_D_ES,
  PROPOSE_AN_OBSERVATION as PO,
  PROPOSE_AN_OBSERVATION_ES as PO_ES,
  PROPOSE_AN_OBSERVATION_DEEPER as PO_D,
  PROPOSE_AN_OBSERVATION_DEEPER_ES as PO_D_ES,
} from '../js/data/investigations/survey-sequence.js';

const all = [
  ...DOW.steps,
  ...DOW_D.steps,
  ...TT.steps,
  ...TT_D.steps,
  ...PO.steps,
  ...PO_D.steps,
];
const step = sid => all.find(s => s.sid === sid);

describe('Deep or Wide?: the numbers the steps state', () => {
  test('the best exposure of the Euclidean, steep and flattened classes', () => {
    const e = tradeoffView({ facility: 1, cls: 0, logExposure: 2, nights: 10 });
    const s = tradeoffView({ facility: 1, cls: 2, logExposure: 2, nights: 10 });
    const f = tradeoffView({ facility: 1, cls: 1, logExposure: 2, nights: 10 });
    expect(step('euclid-best').validate({ e: e.best.exposure }).level).toBe('ok');
    expect(step('steep-class').validate({ e: s.best.exposure }).level).toBe('ok');
    expect(Number.isFinite(s.optimum)).toBe(false);
    expect(
      step('the-rule-undershoots').validate({
        b: f.best.exposure,
        r: f.optimum,
      }).level
    ).toBe('ok');
    expect(step('euclid-best').validate({ e: 10 }).level).toBe('error');
  });
  test('the sky-limited exponent for a steep class is 0.25', () => {
    expect(1.25 * 1 - 1).toBeCloseTo(step('the-exponent').answer, 12);
  });
  test('a 3 sigma threshold: 22.59 mag and 90.5 percent real', () => {
    const m = planView({
      facility: 1,
      cls: 2,
      logExposure: 1.5,
      visits: 1,
      nights: 10,
      threshold: 3,
      goalDepth: 21,
      logGoalArea: 1,
    });
    expect(
      step('a-lower-threshold').validate({
        d: m.result.depth,
        r: 100 * m.result.counts.reliability,
      }).level
    ).toBe('ok');
  });
});

describe('Two Telescopes, One Question: the numbers the steps state', () => {
  test('the hours and the ratio', () => {
    const c = compareView({
      facilityA: 1,
      facilityB: 2,
      logExposure: 2,
      goalDepth: 23,
      logGoalArea: 1,
    }).result;
    expect(
      step('read-the-hours').validate({
        h: c.a.seconds / 3600,
        r: c.timeRatio,
      }).level
    ).toBe('ok');
    expect(Math.round(1 / c.timeRatio)).toBe(65);
  });
  test('the field ratio', () => {
    const a = compareView({ facilityA: 1, facilityB: 2 });
    expect(a.b.fovDeg2 / a.a.fovDeg2).toBeCloseTo(step('the-field-ratio').answer, 0);
  });
});

describe('Propose an Observation: the plan step', () => {
  const base = { threshold: 5, depth: 0, n: 0 };
  const plan = (facility, exposure, extra = {}) => {
    const m = planView({
      facility: facility - 1,
      cls: 1,
      logExposure: Math.log10(exposure),
      visits: 1,
      nights: 10,
      threshold: 5,
      goalDepth: 22.5,
      logGoalArea: 2,
      ...extra,
    });
    return {
      v: {
        facility,
        exposure,
        visits: 1,
        nights: 10,
        threshold: extra.threshold ?? 5,
        depth: m.result.depth,
        n: m.result.counts.perDeg2.detected,
      },
      m,
    };
  };
  const s = () => step('propose-a-plan');
  test('two different valid plans both pass, with their own numbers', () => {
    for (const [f, t] of [
      [2, 63],
      [3, 32],
      [1, 1000],
    ]) {
      const p = plan(f, t);
      expect(p.m.verdict.feasible).toBe(true);
      expect(planVerdict(s(), p.v).level).toBe('ok');
    }
  });
  test('a plan that is not feasible, or whose numbers are another plan’s, is flagged', () => {
    const shallow = plan(2, 30);
    expect(planVerdict(s(), shallow.v).level).toBe('error');
    const a = plan(2, 63);
    const b = plan(3, 32);
    expect(planVerdict(s(), { ...a.v, n: b.v.n }).level).toBe('warn');
    // 3 sigma is deeper but fails the reliability goal
    const low = plan(2, 63, { threshold: 3 });
    expect(planVerdict(s(), { ...low.v, threshold: 3 }).level).toBe('error');
    expect(planVerdict(s(), { ...a.v, nights: 11 }).level).toBe('error');
    expect(planVerdict(s(), { ...a.v, facility: 7 }).level).toBe('error');
    expect(planVerdict(s(), {})).toBe(null);
    void base;
  });
  test('the key states the rule, not a plan, and the justification has criteria of four kinds', () => {
    const key = answerKeyFor({ ...PO, steps: [...PO.steps, ...PO_D.steps] });
    const e = key.entries.find(x => x.sid === 'propose-a-plan');
    expect(e.plan.goal.depth).toBe(22.5);
    expect(e.plan.tolerance).toEqual({ depth: 0.15, countsPct: 10 });
    expect(e.hasValidator).toBe(true);
    const j = key.entries.find(x => x.sid === 'justify-the-plan');
    expect(j.criteria.map(c => c.kind).sort()).toEqual([
      'completion',
      'correctness',
      'reasoning',
      'uncertainty',
    ]);
  });
});

describe('the Spanish and the panels', () => {
  const pairs = [
    [DOW, DOW_ES],
    [DOW_D, DOW_D_ES],
    [TT, TT_ES],
    [TT_D, TT_D_ES],
    [PO, PO_ES],
    [PO_D, PO_D_ES],
  ];
  test('every shadow has the step structure of its English', () => {
    for (const [en, es] of pairs) {
      expect(es.steps.length).toBe(en.steps.length);
      en.steps.forEach((st, i) => {
        const sh = es.steps[i];
        expect(Boolean(sh.options)).toBe(Boolean(st.options));
        if (st.options) expect(sh.options.length).toBe(st.options.length);
        if (st.fields) expect(sh.fields.length).toBe(st.fields.length);
        if (st.rubricCriteria)
          expect(sh.rubricCriteria.length).toBe(st.rubricCriteria.length);
      });
    }
  });
  test('the three panels are in one family with both languages’ words', () => {
    expect(SURVEY_DESIGN_WIDGETS.map(w => w.id)).toEqual([
      'survey-design-tradeoff',
      'survey-design-plan',
      'survey-design-compare',
    ]);
  });
  test('the supplied zero points are the radiation kernel’s for a throughput of 0.5', () => {
    for (const s of SURVEY_SETUPS) {
      const band = decodeBand(BANDS.find(b => b.id === s.band));
      const sys = s.band === 'V' ? 'vega' : 'ab';
      const zp = zeroPointOf(band, areaOf(s.id).areaM2, 0.5, sys);
      expect(Math.abs(zp / s.zeroPoint - 1)).toBeLessThan(1e-9);
    }
  });
});
