// =============================================================================
// Planet or Not?, in two languages (Roadmap III, Prompt 228)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panel the lesson draws
// (js/vettingWidgets.js over js/vettingField.js and js/kernels/vetting/), read in the
// form the validator takes and fed to the step's own validator; a wrong reading is
// refused; no step grades "planet" as the answer; the Spanish carries the same step
// structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/vetting/index.js';
import { runOf, verdictsOf, truthOf, PRESETS } from '../js/vettingField.js';
import { VETTING_WIDGETS } from '../js/vettingWidgets.js';
import {
  PLANET_OR_NOT as LESSON,
  PLANET_OR_NOT_ES as LESSON_ES,
  PLANET_OR_NOT_DEEPER as DEEP,
  PLANET_OR_NOT_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/vetting-sequence.js';

const all = [...LESSON.steps, ...DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const T = i => runOf(i).summary.tests;

describe('the panel: what each candidate says', () => {
  test('the verdicts of the eight candidates, A to H', () => {
    const by = i => verdictsOf(i);
    expect(by(0)).toEqual({
      oddEven: 'pass',
      secondary: 'pass',
      centroid: 'pass',
      overall: 'survives',
    });
    expect(by(1)).toEqual({
      oddEven: 'fail',
      secondary: 'pass',
      centroid: 'fail',
      overall: 'rejected',
    });
    expect(by(2)).toEqual({
      oddEven: 'pass',
      secondary: 'fail',
      centroid: 'pass',
      overall: 'rejected',
    });
    expect(by(3)).toEqual({
      oddEven: 'pass',
      secondary: 'pass',
      centroid: 'not-run',
      overall: 'survives',
    });
    expect(by(4)).toEqual({
      oddEven: 'pass',
      secondary: 'pass',
      centroid: 'fail',
      overall: 'rejected',
    });
    expect(by(5)).toEqual({
      oddEven: 'inconclusive',
      secondary: 'inconclusive',
      centroid: 'inconclusive',
      overall: 'undecided',
    });
    expect(by(6)).toEqual({
      oddEven: 'pass',
      secondary: 'pass',
      centroid: 'pass',
      overall: 'survives',
    });
    expect(by(7)).toEqual({
      oddEven: 'pass',
      secondary: 'inconclusive',
      centroid: 'pass',
      overall: 'undecided',
    });
  });

  test('the numbers the steps quote', () => {
    // B: the frames place the dip 1.5 pixels from the target; odd and even differ by far more than their sigma
    const b = T(1);
    expect(Math.hypot(b.centroid.offset.dx, b.centroid.offset.dy)).toBeCloseTo(
      1.52,
      1
    );
    expect(b.oddEven.z).toBeGreaterThan(50);
    // C: the second eclipse is about half as deep as the primary
    expect(T(2).secondary.ratio).toBeGreaterThan(0.45);
    expect(T(2).secondary.ratio).toBeLessThan(0.5);
    // E: 1.8 pixels, 15 sigma
    const e = T(4).centroid;
    expect(Math.hypot(e.offset.dx, e.offset.dy)).toBeCloseTo(1.81, 1);
    expect(e.r).toBeGreaterThan(14);
    expect(e.r).toBeLessThan(16);
    // G: 0.17 pixels, 2 sigma, exclusion radius 0.30
    const g = T(6).centroid;
    expect(Math.hypot(g.offset.dx, g.offset.dy)).toBeCloseTo(0.17, 2);
    expect(g.r).toBeGreaterThan(1.5);
    expect(g.r).toBeLessThan(2.5);
    expect(g.exclusionRadius).toBeCloseTo(0.3, 2);
    expect(truthOf(6).separation).toBe(0.15);
    // H: the odd-even test could have seen 37 percent of the depth, the truth is 20 percent
    const h = T(7).oddEven;
    expect((100 * h.minDetectableDifference) / h.meanDepth).toBeCloseTo(
      36.9,
      0
    );
    expect(truthOf(7).eps * 2).toBeCloseTo(0.2, 12);
  });

  test('every readout row is text, "planet" is never a verdict, and the truth is behind a control', () => {
    const panel = VETTING_WIDGETS[0];
    expect(panel.id).toBe('vetting-checklist');
    for (let i = 0; i < PRESETS.length; i++) {
      const rows = panel.readout({ candidate: i });
      for (const r of rows) {
        expect(typeof r.value).toBe('string');
        expect(r.value).not.toMatch(/undefined|NaN/);
      }
      const labels = rows.map(r => r.label);
      expect(labels.length).toBeGreaterThanOrEqual(8);
      const overall = rows.find(r => /Overall/.test(r.label)).value;
      expect(overall).not.toMatch(/\bis a planet\b/);
      expect(panel.readout({ candidate: i, truth: 1 }).length).toBe(
        rows.length + 1
      );
    }
  });
});

describe('the steps', () => {
  test('the validators accept the readings the panel gives and refuse others', () => {
    const h = T(7).oddEven;
    ok('read-the-power', {
      a: (100 * h.minDetectableDifference) / h.meanDepth,
    });
    bad('read-the-power', { a: 20 });
    bad('read-the-power', { a: 1.4 });
    const g = T(6).centroid;
    ok('the-exclusion-radius', {
      a: Math.hypot(g.offset.dx, g.offset.dy),
      b: g.exclusionRadius,
    });
    bad('the-exclusion-radius', { a: 0, b: 1 });
    bad('the-exclusion-radius', { a: g.exclusionRadius, b: 0.17 });
  });

  test('no step grades "planet" as the answer, and every choice has a real answer', () => {
    for (const s of all) {
      if (s.type === 'question' && s.kind === 'choice') {
        expect(Number.isInteger(s.answer)).toBe(true);
        expect(s.options[s.answer]).toBeTruthy();
        expect(s.options[s.answer]).not.toMatch(/^(It is a planet|A planet)/);
        expect(s.options[s.answer]).not.toMatch(/validated planet/i);
        for (const m of s.misconceptions ?? [])
          expect(m.option).not.toBe(s.answer);
      }
    }
    // The answers are spread over the positions.
    const positions = new Set(
      all
        .filter(s => s.kind === 'choice' || s.type === 'predict')
        .map(s => s.answer)
    );
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  test('the short answers carry a rubric of the four kinds the key prints', () => {
    const kinds = new Set();
    for (const sid of ['justify-the-set', 'what-a-pass-leaves']) {
      const s = step(sid);
      expect(s.kind).toBe('short');
      for (const c of s.rubricCriteria) {
        kinds.add(c.kind);
        expect(c.levels.length).toBeGreaterThanOrEqual(2);
      }
    }
    expect([...kinds].sort()).toEqual([
      'completion',
      'correctness',
      'reasoning',
      'uncertainty',
    ]);
  });

  test('the deeper steps hang on core steps and the lesson closes on a core step', () => {
    const core = new Set(LESSON.steps.map(s => s.sid));
    const sids = new Set(core);
    for (const s of DEEP.steps) {
      expect(core.has(s.after) || sids.has(s.after)).toBe(true);
      sids.add(s.sid);
    }
    expect(LESSON.steps.at(-1).sid).toBe('what-the-checklist-says');
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
  });
});

describe('the Spanish', () => {
  test('carries the same step structure as the English', () => {
    expect(LESSON_ES.steps.length).toBe(LESSON.steps.length);
    expect(DEEP_ES.steps.length).toBe(DEEP.steps.length);
    for (const [en, es] of [
      ...LESSON.steps.map((s, i) => [s, LESSON_ES.steps[i]]),
      ...DEEP.steps.map((s, i) => [s, DEEP_ES.steps[i]]),
    ]) {
      expect(es.title).toBeTruthy();
      expect(es.body).toBeTruthy();
      if (en.options) expect(es.options.length).toBe(en.options.length);
      if (en.hints) expect(es.hints.length).toBe(en.hints.length);
      if (en.misconceptions)
        expect(es.misconceptions.length).toBe(en.misconceptions.length);
      if (en.fields) expect(es.fields.length).toBe(en.fields.length);
      if (en.rubricCriteria) {
        expect(es.rubricCriteria.length).toBe(en.rubricCriteria.length);
        en.rubricCriteria.forEach((c, i) =>
          expect(es.rubricCriteria[i].levels.length).toBe(c.levels.length)
        );
      }
    }
    expect(LESSON_ES.objectives.length).toBe(LESSON.objectives.length);
  });

  test('the Spanish answer for a choice is the same position as the English', () => {
    // The shadows carry no answers: a position can only drift if the options were reordered.
    // The correct option is the one that names the same thing, checked by its first words.
    const pairs = {
      'read-the-checklist': ['No está rechazado', 'It is not rejected'],
      'a-dip-on-the-target': ['Rechazado', 'Rejected'],
      'inconclusive-is-an-answer': [
        'Nada sobre su naturaleza',
        'Nothing about its nature',
      ],
      'decide-e': ['Rechazado', 'Rejected'],
    };
    for (const [sid, [es, en]] of Object.entries(pairs)) {
      const i = [...LESSON.steps, ...DEEP.steps].findIndex(s => s.sid === sid);
      const stepEn = step(sid);
      const stepEs = sid.startsWith('decide')
        ? DEEP_ES.steps[DEEP.steps.findIndex(s => s.sid === sid)]
        : LESSON_ES.steps[LESSON.steps.findIndex(s => s.sid === sid)];
      expect(stepEn.options[stepEn.answer].startsWith(en)).toBe(true);
      expect(stepEs.options[stepEn.answer].startsWith(es)).toBe(true);
      void i;
    }
  });
});

describe('the instructor content', () => {
  test('a guide, a flow, expectations and time bands for the lesson, none of it for a step that is not core', () => {
    const c = INSTRUCTOR.content['planet-or-not'];
    expect(c.teachingNotes.length).toBeGreaterThan(0);
    expect(c.discussion.length).toBeGreaterThan(0);
    expect(c.extensions.length).toBeGreaterThan(0);
    const core = new Set(LESSON.steps.map(s => s.sid));
    for (const sid of Object.keys(INSTRUCTOR.expectations['planet-or-not']))
      expect(core.has(sid)).toBe(true);
    for (const f of INSTRUCTOR.flow['planet-or-not']) {
      expect(core.has(f.from)).toBe(true);
      expect(core.has(f.to)).toBe(true);
    }
    expect(INSTRUCTOR.bands['planet-or-not'].advanced).toBe('medium');
  });
});
