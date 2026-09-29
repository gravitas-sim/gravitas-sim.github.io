// =============================================================================
// The 3-D curriculum: its rules, its words, its key and its physics
// -----------------------------------------------------------------------------
// js/lab3d/guides/curriculum.js is data, run by js/lab3d/view/guidePanel.js.
// These check that every step is well formed and has its words in both
// languages; that the committed answer key is what a reference run gives
// (run in Node, since Jest's VM makes a long integration slow); that the
// key's numbers are the physics they claim, worked by hand; how the checks
// and the report behave; and that the instructor documents render.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { TextDecoder } from 'node:util';
import {
  ANSWERS,
  CORRECT,
  GUIDES,
  KOZAI_CRITICAL,
  PLANET_RADIUS,
  STAR_RADIUS,
  TARGETS,
  evaluateCheck,
} from '../js/lab3d/guides/curriculum.js';
import { reportOf, REPORT_FORMAT } from '../js/lab3d/view/guidePanel.js';
import { stepsOn } from '../js/observatory/guides/core.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { EN_LAB3DGUIDES } from '../js/i18n/en.lab3dGuides.js';
import { ES_LAB3DGUIDES } from '../js/i18n/es.lab3dGuides.js';
import { LAB3D_KEY } from '../js/data/lab3dAnswerKey.js';
import { lab3dAnswerKey, lab3dInstructorGuide } from '../js/lab3dGuideDocs.js';

const DEG = Math.PI / 180;
const KINDS = ['read', 'do', 'answer', 'choose'];
const CHECKS = [
  'opened',
  'look',
  'frame',
  'size',
  'tool',
  'played',
  'recorded',
];
const key = (guide, step) =>
  LAB3D_KEY.find(
    r => r.guide === guide && r.path === 'advanced' && r.step === step
  );

describe('the guides are well formed', () => {
  test.each(GUIDES.map(g => [g.id, g]))('%s', (_, g) => {
    const ids = g.steps.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(g.minutes.intro).toBeLessThan(g.minutes.advanced);
    // The advanced path only adds: every introductory step is on it.
    const adv = stepsOn(g, 'advanced').map(s => s.id);
    for (const s of stepsOn(g, 'intro')) expect(adv).toContain(s.id);
    // Each ends by saying what a flat model keeps and where the model stops.
    expect(ids.slice(-2)).toEqual(['flat', 'limits']);
    for (const [n, s] of g.steps.entries()) {
      expect(KINDS).toContain(s.kind);
      expect(['both', 'advanced']).toContain(s.path);
      if (s.go?.open) expect(TARGETS[s.go.open]).toBeDefined();
      if (s.kind === 'do') {
        expect(CHECKS).toContain(s.check.kind);
        if (s.check.target) expect(TARGETS[s.check.target]).toBeDefined();
        if (s.record) expect(s.check.kind).toBe('recorded');
      }
      if (s.kind === 'answer') {
        expect(typeof ANSWERS[s.expect.answer]).toBe('function');
        expect(s.expect.tolerance).toBeGreaterThan(0);
      }
      if (s.kind === 'choose') {
        expect(s.options.length).toBeGreaterThanOrEqual(2);
        if (typeof s.correct === 'string')
          expect(s.options).toContain(s.correct);
        else if (s.correct)
          expect(typeof CORRECT[s.correct.answer]).toBe('function');
        // A step that answers a prediction comes after it, with the same options.
        if (s.answers) {
          const p = g.steps.findIndex(q => q.id === s.answers);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(n);
          expect(g.steps[p].correct).toBeNull();
          expect(g.steps[p].options).toEqual(s.options);
        }
      }
    }
    // Every guide asks for a prediction, has the reader change something,
    // and measures.
    expect(g.steps.some(s => s.kind === 'choose' && s.correct === null)).toBe(
      true
    );
    expect(g.steps.some(s => s.kind === 'do')).toBe(true);
    expect(g.steps.some(s => s.kind === 'answer')).toBe(true);
  });
});

describe('every step has its words in both languages', () => {
  const need = [];
  for (const g of GUIDES) {
    need.push(`gd.${g.id}.title`, `gd.${g.id}.summary`);
    for (const s of g.steps) {
      const b = `gd.${g.id}.${s.id}`;
      need.push(`${b}.title`, `${b}.text`);
      if (s.kind === 'do') need.push(`${b}.ok`);
      if (s.kind === 'answer') need.push(`${b}.ok`, `${b}.no`);
      if (s.kind === 'choose') {
        for (const o of s.options) need.push(`${b}.opt.${o}`);
        if (s.correct !== null) need.push(`${b}.ok`, `${b}.no`);
      }
    }
  }
  for (const t of Object.keys(TARGETS)) need.push(`gd.target.${t}`);

  test('English', () => {
    expect(need.filter(k => !EN_LAB3DGUIDES[k])).toEqual([]);
  });
  test('Spanish, with no id of its own', () => {
    expect(need.filter(k => !ES_LAB3DGUIDES[k])).toEqual([]);
    expect(
      Object.keys(ES_LAB3DGUIDES).filter(k => !(k in EN_LAB3DGUIDES))
    ).toEqual([]);
    expect(
      Object.keys(EN_LAB3DGUIDES).filter(k => !(k in ES_LAB3DGUIDES))
    ).toEqual([]);
  });
  test('the runner says {value} only where it fills it', () => {
    for (const [k, v] of Object.entries(EN_LAB3DGUIDES))
      if (/\{value\}/.test(v)) expect(k).toBe('g3.revealed');
  });
});

describe('the answer key', () => {
  test('is what a reference run gives', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/lab3d-guides-key.mjs', '--json'],
      {
        encoding: 'utf8',
        timeout: 240_000,
        maxBuffer: 16 * 1024 * 1024,
      }
    );
    expect(JSON.parse(out)).toEqual(LAB3D_KEY);
  }, 300_000);

  test('every checked step passes in it, on both paths', () => {
    for (const g of GUIDES)
      for (const path of ['intro', 'advanced']) {
        const rows = LAB3D_KEY.filter(r => r.guide === g.id && r.path === path);
        expect(rows.map(r => r.step)).toEqual(stepsOn(g, path).map(s => s.id));
        for (const r of rows)
          if (r.kind === 'do' || r.kind === 'answer')
            expect(r.passes).toBe(true);
      }
  });

  test('its orbit is R1’s, as built', () => {
    const ref = REFERENCES.find(r => r.id === 'R1').make().context.el;
    expect(key('l3-planes', 'inclination').expected).toBeCloseTo(
      ref.i / DEG,
      4
    );
    expect(key('l3-planes', 'node').expected).toBeCloseTo(ref.Omega / DEG, 4);
    expect(key('l3-planes', 'periapsis').expected).toBeCloseTo(
      ref.omega / DEG,
      4
    );
  });

  test('its eclipses are geometry: a sin i against the radii', () => {
    const b = i => Math.sin(i * DEG) / STAR_RADIUS;
    expect(key('l3-eclipse', 'impact').expected).toBeCloseTo(b(0.5), 4);
    expect(key('l3-eclipse', 'impact-slight').expected).toBeCloseTo(b(0.2), 4);
    const limit = 1 + PLANET_RADIUS / STAR_RADIUS;
    expect(key('l3-eclipse', 'eclipses').expected).toBe(
      b(0.5) < limit ? 'yes' : 'no'
    );
    expect(key('l3-eclipse', 'eclipses-slight').expected).toBe('yes');
    expect(key('l3-eclipse', 'critical').expected).toBeCloseTo(
      Math.asin(STAR_RADIUS + PLANET_RADIUS) / DEG,
      4
    );
    // And the enlarged drawing overlaps where the true discs do not.
    expect(key('l3-eclipse', 'eclipses').expected).toBe('no');
    expect(key('l3-eclipse', 'appears').expected).toBe('yes');
  });

  test('its mutual inclinations are spherical trigonometry', () => {
    const I = (i1, i2, dO) =>
      Math.acos(
        Math.cos(i1 * DEG) * Math.cos(i2 * DEG) +
          Math.sin(i1 * DEG) * Math.sin(i2 * DEG) * Math.cos(dO * DEG)
      ) / DEG;
    expect(key('l3-mutual', 'mutual').expected).toBeCloseTo(I(10, 10, 90), 3);
    // R3 is built with i = 1.3 and 2.5 degrees and nodes 100 and 113; the
    // light planets barely move it in the moment the key reads.
    expect(key('l3-mutual', 'mutual-r3').expected).toBeCloseTo(
      I(1.3, 2.5, 13),
      2
    );
    expect(key('l3-mutual', 'flat-error').expected).toBeCloseTo(
      1 - Math.cos(key('l3-mutual', 'mutual-r3').expected * DEG),
      8
    );
  });

  test('its Kozai-Lidov cycle is the textbook one', () => {
    const e0 = key('l3-kozai', 'e0').expected;
    const i0 = key('l3-kozai', 'i0').expected;
    expect(e0).toBeCloseTo(0.01, 4);
    expect(i0).toBeCloseTo(65, 4);
    const peak = key('l3-kozai', 'e-peak').expected;
    const predicted = key('l3-kozai', 'predicted').expected;
    expect(predicted).toBeCloseTo(
      Math.sqrt(1 - (5 / 3) * Math.cos(65 * DEG) ** 2),
      5
    );
    // The full three-body problem peaks within a hundredth of the
    // quadrupole formula, at an inclination near the critical angle.
    expect(Math.abs(peak - predicted)).toBeLessThan(0.01);
    expect(
      Math.abs(key('l3-kozai', 'i-peak').expected - KOZAI_CRITICAL)
    ).toBeLessThan(1);
    // And sqrt(1 - e^2) cos i holds to a percent.
    const k0 = key('l3-kozai', 'k-start').expected;
    const k1 = key('l3-kozai', 'k-peak').expected;
    expect(Math.abs(k1 - k0) / k0).toBeLessThan(0.01);
    expect(key('l3-kozai', 'kept').expected).toBe('same');
  });
});

describe('the checks', () => {
  const ctx = (state, records = {}) => ({
    state: { ids: ['star', 'planet'], t0: 0, tau: 0, ...state },
    G: 1,
    now: () => null,
    recorded: s => records[s] ?? null,
  });
  test('a look, a size or a tool counts only on the system it names', () => {
    const look = { kind: 'look', target: 'R1', preset: 'top' };
    expect(evaluateCheck(look, ctx({ system: 'R1', preset: 'top' }))).toBe(
      true
    );
    expect(evaluateCheck(look, ctx({ system: 'R3', preset: 'top' }))).toBe(
      false
    );
    const tool = {
      kind: 'tool',
      target: 'tilt-0',
      tool: 'sky',
      a: 'star',
      b: 'planet',
    };
    expect(
      evaluateCheck(
        tool,
        ctx({ system: 'tilt-0', tool: 'sky', a: '0', b: '1' })
      )
    ).toBe(true);
    expect(
      evaluateCheck(
        tool,
        ctx({ system: 'tilt-0', tool: 'sky', a: '1', b: '0' })
      )
    ).toBe(false);
  });
  test('a record step needs its moment, of its system', () => {
    const check = { kind: 'recorded', target: 'R6' };
    const step = { id: 'start' };
    expect(evaluateCheck(check, ctx({ system: 'R6' }), step)).toBe(false);
    const kept = { system: 'R6' };
    expect(
      evaluateCheck(check, ctx({ system: 'R6' }, { start: kept }), step)
    ).toBe(true);
    expect(
      evaluateCheck(
        check,
        ctx({ system: 'R6' }, { start: { system: 'R1' } }),
        step
      )
    ).toBe(false);
  });
  test('an answer that cannot be worked out yet is null, not a wrong number', () => {
    const empty = {
      state: { system: null, ids: [] },
      G: 1,
      now: () => null,
      recorded: () => null,
    };
    for (const [name, fn] of Object.entries(ANSWERS))
      expect([name, fn(empty)]).toEqual([name, null]);
  });
});

describe('the report', () => {
  const g = GUIDES.find(q => q.id === 'l3-kozai');
  const progress = {
    answers: {
      open: { passed: true },
      start: { passed: true },
      e0: { typed: '0,01', passed: true, expected: 0.01 },
      i0: { typed: '60', passed: false, expected: 65 },
      predict: { choice: 'stays' },
      'e-peak': { typed: '0.84', shown: true, expected: 0.840267 },
    },
    records: { start: { system: 'R6', t: 0 } },
  };
  test('is plain data in a fixed order, with no clock, the same every time', () => {
    const a = JSON.stringify(
      reportOf(g, 'intro', progress, { name: 'A. Student', locale: 'es' })
    );
    const b = JSON.stringify(
      reportOf(g, 'intro', progress, { name: 'A. Student', locale: 'es' })
    );
    expect(a).toBe(b);
    const r = JSON.parse(a);
    expect(r.format).toBe(REPORT_FORMAT);
    expect(r.steps.map(s => s.step)).toEqual(
      stepsOn(g, 'intro').map(s => s.id)
    );
    expect(a).not.toMatch(/"(date|time|created)"/);
  });
  test('says what was found, shown or predicted, and gives no answer not earned', () => {
    const r = reportOf(g, 'intro', progress);
    const step = id => r.steps.find(s => s.step === id);
    expect(step('e0')).toMatchObject({
      typed: '0,01',
      passed: true,
      expected: 0.01,
    });
    // A wrong answer carries no expected value.
    expect(step('i0')).toEqual({
      step: 'i0',
      kind: 'answer',
      typed: '60',
      passed: false,
      shown: false,
    });
    expect(step('e-peak')).toMatchObject({
      shown: true,
      passed: false,
      expected: 0.840267,
    });
    expect(step('predict')).toMatchObject({
      choice: 'stays',
      prediction: true,
    });
    expect(step('start').recorded).toEqual({ system: 'R6', t: 0 });
  });
});

describe('the instructor documents', () => {
  test('render, with the lab’s route in the assignment sheets', () => {
    const guide = new TextDecoder('latin1').decode(lab3dInstructorGuide());
    const answers = new TextDecoder('latin1').decode(lab3dAnswerKey(LAB3D_KEY));
    expect(guide.startsWith('%PDF')).toBe(true);
    expect(answers.startsWith('%PDF')).toBe(true);
    expect(guide).toContain('/3d/?guide=l3-kozai');
    expect(guide).not.toContain('/observatory/?guide=l3');
  });
});
