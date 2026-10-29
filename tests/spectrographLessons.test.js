/**
 * @jest-environment jsdom
 */
// =============================================================================
// Why Two Lines Become One (Roadmap III, Prompt 213)
// -----------------------------------------------------------------------------
// Every number the lesson's steps state is recomputed here from the instruments
// (js/spectrographWidgets.js over js/spectrographField.js and the spectrograph
// kernel), the lesson's own validators accept the values the instruments give and
// refuse a wrong one, the Spanish parallels the English step for step, and the
// claim rule of the committed thresholds holds over every string of both languages.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  WHY_TWO_LINES_BECOME_ONE as EN,
  WHY_TWO_LINES_BECOME_ONE_DEEPER as DEEP,
  WHY_TWO_LINES_BECOME_ONE_ES as ES,
  WHY_TWO_LINES_BECOME_ONE_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/spectrograph-sequence.js';
import { pairOf, arcOf, tradeOf } from '../js/spectrographWidgets.js';

const THR = JSON.parse(
  readFileSync('tests/fixtures/spectrograph/thresholds.json', 'utf8')
);
const step = sid => [...EN.steps, ...DEEP.steps].find(s => s.sid === sid);
const pair = (R, sampling) => pairOf({ R, sep: 0.5, sampling, snr: 0 });
const arc = (marked, degree, medium = 0) =>
  arcOf({ marked, degree, seed: 0, line: 0, medium });
const trade = (R, width = 0) =>
  tradeOf({ R, Rs: 2, seeing: 1, width, vmag: 12, facility: 1, exposure: 2 });
const rms = a =>
  Math.sqrt(
    a.solution.residualsNm.reduce((s, r) => s + r * r, 0) /
      a.solution.residualsNm.length
  );

describe('the numbers the lesson states', () => {
  test('the dips at R of 500, 1000 and 2000, and the 7 percent dip at R of 1000', () => {
    const d = [3, 5, 7].map(i => 100 * pair(i, 3).dipModel);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(7.3, 1);
    expect(d[2]).toBeCloseTo(87.5, 1);
    expect(
      step('dip-by-r').validate({ d500: d[0], d1000: d[1], d2000: d[2] }).level
    ).toBe('ok');
    expect(
      step('dip-by-r').validate({ d500: 5, d1000: 7, d2000: 88 }).level
    ).toBe('error');
    // 750 has merged, so 1000 is the smallest of the four offered
    expect([2, 3, 4, 5].map(i => pair(i, 3).dipModel > 0)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(step('smallest-r-predict').answer).toBe(3);
  });
  test('finer pixels cannot separate merged lines and can reveal a real dip', () => {
    const p = [
      pair(3, 6).pixelPeaks,
      pair(5, 2).pixelPeaks,
      pair(5, 6).pixelPeaks,
    ];
    expect(p).toEqual([1, 1, 2]);
    expect(
      step('finer-pixels').validate({ p500: p[0], p1000a: p[1], p1000b: p[2] })
        .level
    ).toBe('ok');
    expect(
      step('finer-pixels').validate({ p500: 2, p1000a: 1, p1000b: 2 }).level
    ).toBe('error');
    for (const s of [0, 1, 2, 3, 4, 5, 6])
      expect(pair(3, s).pixelPeaks).toBe(1);
  });
  test('a blend fitted as one line is about 16 percent too wide and flagged', () => {
    const f = pair(3, 3).fit;
    expect(f.broadened).toBe(true);
    expect(100 * f.widthExcess).toBeGreaterThan(14);
    expect(100 * f.widthExcess).toBeLessThan(18);
    expect(step('a-blend').validate({ w: 100 * f.widthExcess }).level).toBe(
      'ok'
    );
    expect(step('a-blend').validate({ w: 0 }).level).toBe('error');
  });
  test('degrees of freedom, residuals and the velocity of the arc', () => {
    const k = [5, 8, 14].map(n => arc(n, 3).solution.dof);
    expect(k).toEqual([1, 4, 10]);
    expect(
      step('degrees-of-freedom').validate({ k5: k[0], k8: k[1], k14: k[2] })
        .level
    ).toBe('ok');
    expect(
      step('degrees-of-freedom').validate({ k5: 5, k8: 8, k14: 14 }).level
    ).toBe('error');
    const r3 = rms(arc(8, 3));
    const r1 = rms(arc(8, 1));
    expect(r3).toBeCloseTo(0.0005, 4);
    expect(r1).toBeCloseTo(0.0184, 3);
    expect(arc(8, 1).solution.flagged).toBe(true);
    expect(step('the-residuals').validate({ r3, r1 }).level).toBe('ok');
    const v = arc(8, 3).science.measured.velocity;
    expect(v.velocityKmS).toBeCloseTo(115.8, 0);
    expect(v.sigmaKmS).toBeCloseTo(3.2, 1);
    expect(Math.abs(v.velocityKmS - 120) / v.sigmaKmS).toBeLessThan(2);
    expect(
      step('a-velocity').validate({ v: v.velocityKmS, s: v.sigmaKmS }).level
    ).toBe('ok');
    expect(step('a-velocity').validate({ v: 120, s: 30 }).level).toBe('error');
    // two lines and a straight line: determined, with the same stated uncertainty and a wrong value
    const two = arc(2, 1);
    expect(two.solution.status).toBe('exactly-determined');
    expect(two.science.measured.velocity.velocityKmS).toBeCloseTo(91.6, 0);
  });
  test('air against vacuum is refused, and the mix-up is worth 84 km/s', () => {
    const m = arc(8, 3, 1).science.measured;
    expect(m.velocity.status).toBe('refused');
    expect(m.velocity.reason).toBe('medium-mismatch');
    const off = step('the-medium').fields[1].compute({});
    expect(off).toBeCloseTo(83.75, 1);
    expect(m.mediaOffsetKmS).toBeCloseTo(off, 1);
    expect(
      step('the-medium').validate({ wrong: m.ignoringMediaKmS, off }).level
    ).toBe('ok');
    expect(step('the-medium').validate({ wrong: 116, off }).level).toBe(
      'error'
    );
  });
  test('throughput of the slit, and the best resolving power for a line of its own width', () => {
    const t3 = trade(5).point;
    const t10 = trade(7).point;
    expect(100 * t3.throughput).toBeCloseTo(76.1, 1);
    expect(100 * t10.throughput).toBeCloseTo(27.6, 1);
    expect(
      step('slit-and-throughput').validate({
        t3000: 100 * t3.throughput,
        t10000: 100 * t10.throughput,
      }).level
    ).toBe('ok');
    expect(
      step('slit-and-throughput').validate({ t3000: 100, t10000: 100 }).level
    ).toBe('error');
    // an unresolved line barely gains beyond the seeing point: no more than 10 percent between 3000 and 10000
    expect(t10.snr / t3.snr).toBeLessThan(1.1);
    expect(step('does-more-r-always-help').answer).toBe(1);
    const w = trade(5, 2);
    expect(w.optimum.R).toBeCloseTo(2355, -1);
    expect(w.optimum.point.snr).toBeCloseTo(12.64, 1);
    expect(
      step('the-best-r').validate({
        rbest: w.optimum.R,
        snrbest: w.optimum.point.snr,
      }).level
    ).toBe('ok');
    expect(
      step('the-best-r').validate({ rbest: 30000, snrbest: 16 }).level
    ).toBe('error');
  });
});

describe('the lesson’s structure', () => {
  test('every step has a sid, the synthetic spectrum is said, and the deeper steps hang on steps', () => {
    const sids = [...EN.steps, ...DEEP.steps].map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(EN.steps[0].body).toMatch(/synthetic/);
    for (const s of DEEP.steps) expect(sids).toContain(s.after);
    expect(EN.depths).toEqual(['core', 'quantitative', 'advanced']);
  });
  test('the Spanish parallels the English step for step and field for field', () => {
    expect(ES.steps.length).toBe(EN.steps.length);
    expect(DEEP_ES.steps.length).toBe(DEEP.steps.length);
    const pairs = [
      ...EN.steps.map((s, i) => [s, ES.steps[i]]),
      ...DEEP.steps.map((s, i) => [s, DEEP_ES.steps[i]]),
    ];
    for (const [en, es] of pairs) {
      expect(es.title).toBeTruthy();
      expect((es.fields ?? []).length).toBe((en.fields ?? []).length);
      expect((es.options ?? []).length).toBe((en.options ?? []).length);
    }
    expect(
      INSTRUCTOR.content['why-two-lines-become-one'].misconceptions.some(m =>
        /pixels/i.test(m.claim)
      )
    ).toBe(true);
  });
  test('the guide’s flow and expectations name core steps only', () => {
    const core = new Set(EN.steps.map(s => s.sid));
    for (const f of INSTRUCTOR.flow['why-two-lines-become-one']) {
      expect(core.has(f.from)).toBe(true);
      expect(core.has(f.to)).toBe(true);
    }
    for (const sid of Object.keys(
      INSTRUCTOR.expectations['why-two-lines-become-one']
    ))
      expect(core.has(sid)).toBe(true);
  });
});

const strings = o =>
  typeof o === 'string'
    ? [o]
    : o && typeof o === 'object'
      ? Object.values(o).flatMap(strings)
      : [];
describe('the claim rule: finer pixels do not raise the resolving power', () => {
  const rule = THR.claimRule;
  const hit = (text, lang) =>
    rule.forbidden[lang].some(p => new RegExp(p, 'iu').test(text));
  test('the patterns catch the bad controls and pass the permitted ones', () => {
    const lang = b =>
      /[áéíóúñ]/.test(b) || /^(El|La|Una|Los) /.test(b) ? 'es' : 'en';
    for (const b of rule.badControls) expect(hit(b, lang(b))).toBe(true);
    for (const g of rule.permittedControls) expect(hit(g, lang(g))).toBe(false);
  });
  test('no string of the lesson, its Spanish or its guide trips it', () => {
    // a guide's misconception `claim` quotes the wrong idea on purpose, to refute it in the response beside it
    const noClaims = o =>
      Array.isArray(o)
        ? o.map(noClaims)
        : o && typeof o === 'object'
          ? Object.fromEntries(
              Object.entries(o)
                .filter(([k]) => k !== 'claim')
                .map(([k, v]) => [k, noClaims(v)])
            )
          : o;
    const en = [
      ...strings(EN),
      ...strings(DEEP),
      ...strings(noClaims(INSTRUCTOR)),
    ];
    expect(en.filter(s => hit(s, 'en'))).toEqual([]);
    const es = [...strings(ES), ...strings(DEEP_ES)];
    expect(es.filter(s => hit(s, 'es'))).toEqual([]);
  });
});
