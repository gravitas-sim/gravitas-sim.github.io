import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import TURNING from '../js/data/investigations/the-turning-sky.js';
import SEASONS from '../js/data/investigations/the-sun-through-the-year.js';
import PHASES from '../js/data/investigations/phases-and-eclipses.js';
import WANDER from '../js/data/investigations/wanderers-on-the-sky.js';
import PLAN from '../js/data/investigations/plan-a-night.js';
import { DEEPER } from '../js/investigations/depthAll.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';
import { gradeAnswer, checkAnswer } from '../js/answerCheck.js';
import { SKY_MODELS, SKY_DEPTH_VALUES } from '../tools/authoring/skyModels.mjs';
import {
  SKY_WIDGETS,
  turningFacts,
  seasonFacts,
  phaseFacts,
  eclipseList,
  wandererFacts,
  planFacts,
  setSkyStars,
  skyReady,
  REF_JD,
  stamp,
} from '../js/skyWidgets.js';
import { EN_SKY } from '../js/i18n/en.sky.js';
import { ES_SKY } from '../js/i18n/es.sky.js';
import {
  riseTransitSet,
  apparentSun,
  ttFromUt,
} from '../js/kernels/sky/index.js';
import { WIDGET_IDS } from '../js/composer/widgetIds.js';

// =============================================================================
// The sky investigations (Roadmap II, Prompt 89), graded headlessly
// -----------------------------------------------------------------------------
// Every numeric answer is recomputed from the Sky Lab kernel (the table in
// tools/authoring/skyModels.mjs) and the lesson's own checker is run on it: the
// kernel's value is accepted and one past the tolerance is not. The instruments
// are checked against the kernel and against published events (the eclipses of
// 2025, Mars's 2025 opposition, Venus's greatest elongation).
// =============================================================================

const LESSONS = {
  'the-turning-sky': TURNING,
  'the-sun-through-the-year': SEASONS,
  'phases-and-eclipses': PHASES,
  'wanderers-on-the-sky': WANDER,
  'plan-a-night': PLAN,
};
const stepOf = (id, sid) =>
  [...LESSONS[id].steps, ...(DEEPER[id] || [])].find(s => s.sid === sid);

beforeAll(async () => {
  await skyReady.catch(() => {});
  setSkyStars(JSON.parse(readFileSync('sky/bright-stars.json', 'utf8')));
});

describe('the numeric answers are the kernel’s', () => {
  for (const [key, model] of Object.entries({
    ...SKY_MODELS,
    ...SKY_DEPTH_VALUES,
  })) {
    const [id, sid] = key.split('/');
    test(`${key}: the kernel value is accepted, and one past the tolerance is not`, () => {
      const s = stepOf(id, sid);
      const v = model.value();
      expect(Math.abs(v - s.answer)).toBeLessThanOrEqual(s.tolerance);
      expect(gradeAnswer(s, `${v} ${s.unit}`).correct).toBe(true);
      expect(checkAnswer(s, v + 2 * s.tolerance)).toBe(false);
    });
  }
});

describe('the measurement steps accept what the instrument shows', () => {
  const ok = (id, sid, values) => stepOf(id, sid).validate(values).level;
  test('rise shift: the rising times on night 0 and 30', () => {
    const r0 = turningFacts({ lat: 40, nights: 0, star: 1 }).riseMinAfterNoon;
    const r30 = turningFacts({ lat: 40, nights: 30, star: 1 }).riseMinAfterNoon;
    expect(ok('the-turning-sky', 'rise-shift', { r0, r30 })).toBe('ok');
    expect(ok('the-turning-sky', 'rise-shift', { r0, r30: r0 + 50 })).toBe(
      'error'
    );
    expect((r0 - r30) / 30).toBeCloseTo(3.93, 1);
  });
  test('sidereal clock', () => {
    const a = turningFacts({ lat: 40, nights: 0, star: 0 }).lstMidnightH;
    const b = turningFacts({ lat: 40, nights: 30, star: 0 }).lstMidnightH;
    expect(ok('the-turning-sky', 'sidereal-clock', { lst0: a, lst30: b })).toBe(
      'ok'
    );
  });
  test('three noons and three day lengths', () => {
    const alt = day => seasonFacts({ lat: 40, day, tilt: 23.44 }).noonAltDeg;
    expect(
      ok('the-sun-through-the-year', 'three-noons', {
        eq: alt(78),
        jun: alt(171),
        dec: alt(354),
      })
    ).toBe('ok');
    const len = lat => seasonFacts({ lat, day: 171, tilt: 23.44 }).dayLengthH;
    expect(
      ok('the-sun-through-the-year', 'three-day-lengths', {
        h0: len(0),
        h40: len(40),
        h65: len(65),
      })
    ).toBe('ok');
  });
  test('the instrument’s day length is the kernel’s rise-to-set within 3 minutes', () => {
    for (const [lat, day] of [
      [40, 171],
      [40, 354],
      [0, 78],
      [60, 100],
    ]) {
      const f = seasonFacts({ lat, day, tilt: 23.44 });
      const r = riseTransitSet({ type: 'sun' }, REF_JD + day, {
        latDeg: lat,
        lonDeg: 0,
      });
      expect(Math.abs(f.dayLengthH - (r.setJd - r.riseJd) * 24)).toBeLessThan(
        0.05
      );
    }
    const kernelDec = apparentSun(ttFromUt(REF_JD + 171.5)).decDeg;
    expect(seasonFacts({ lat: 40, day: 171, tilt: 23.44 }).decDeg).toBeCloseTo(
      kernelDec,
      1
    );
  });
  test('four phases: the lit fraction follows (1 - cos E)/2', () => {
    const lit = [3.7, 7.4, 11.1, 14.8].map(day => phaseFacts({ day }));
    expect(
      ok('phases-and-eclipses', 'four-phases', {
        l1: lit[0].illuminated,
        l2: lit[1].illuminated,
        l3: lit[2].illuminated,
        l4: lit[3].illuminated,
      })
    ).toBe('ok');
    for (const f of lit) {
      const E = (f.elongationDeg * Math.PI) / 180;
      expect(f.illuminated).toBeCloseTo((1 - Math.cos(E)) / 2, 2);
    }
  });
  test('Mars: retrograde from day 68 to 146, direct on 147; Jupiter 9 to 126', () => {
    const rate = (planet, day) => wandererFacts({ planet, day }).retrograde;
    expect([67, 68, 146, 147].map(d => rate(2, d))).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect([8, 9, 126, 127].map(d => rate(3, d))).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(
      ok('wanderers-on-the-sky', 'retrograde-window', { start: 68, end: 147 })
    ).toBe('ok');
    expect(
      ok('wanderers-on-the-sky', 'jupiter-loop', { jstart: 9, jend: 127 })
    ).toBe('ok');
  });
  test('Venus peaks at 47.2 degrees on day 101', () => {
    let best = [0, 0];
    for (let d = 60; d <= 140; d += 0.5) {
      const e = wandererFacts({ planet: 1, day: d }).elongationDeg;
      if (e > best[1]) best = [d, e];
    }
    expect(best[1]).toBeCloseTo(47.2, 0);
    expect(
      ok('wanderers-on-the-sky', 'venus-elongation', {
        vmax: best[1],
        vday: Math.round(best[0]),
      })
    ).toBe('ok');
  });
  test('dark hours and the Moon', () => {
    const dark = day =>
      planFacts({ lat: 30, day, airmassMax: 2, moonSep: 30 }).darkHours;
    expect(
      ok('plan-a-night', 'dark-hours', { jan: dark(28), jun: dark(171) })
    ).toBe('ok');
    const reg = day =>
      planFacts({ lat: 30, day, airmassMax: 2, moonSep: 30 }).targets.find(
        t => t.name === 'Regulus'
      ).usableHours;
    expect(
      ok('plan-a-night', 'what-the-moon-costs', {
        newm: reg(28),
        fullm: reg(43),
      })
    ).toBe('ok');
  });
});

describe('the instruments', () => {
  test('the known eclipses of 2025 and 2026 are the ones flagged', () => {
    const flagged = m =>
      eclipseList({ month: m })
        .events.filter(e => e.possible)
        .map(e => stamp(e.jd).slice(0, 10));
    expect(flagged(0)).toEqual(['2025-03-14', '2025-03-29']);
    expect(flagged(6)).toEqual(['2025-09-07', '2025-09-21']);
    expect(flagged(12)).toEqual(['2026-02-17', '2026-03-03']);
  });
  test('Mars is at opposition near 2025-01-16 and moves west at about 0.4 degrees a day', () => {
    const f = wandererFacts({ planet: 2, day: 107 });
    expect(stamp(f.jd).slice(0, 10)).toBe('2025-01-16');
    expect(f.elongationDeg).toBeGreaterThan(175);
    expect(f.rateDegPerDay).toBeLessThan(-0.39);
  });
  test('every instrument has a title, controls with defaults inside their range, and a readout', () => {
    expect(SKY_WIDGETS.map(w => w.id)).toEqual([
      'sky-turning',
      'sky-seasons',
      'sky-phases',
      'sky-eclipses',
      'sky-wanderers',
      'sky-plan',
    ]);
    for (const w of SKY_WIDGETS) {
      expect(WIDGET_IDS).toContain(w.id);
      const v = {};
      for (const c of w.controls) {
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
        v[c.id] = c.value;
      }
      const rows = w.readout(v);
      expect(rows.length).toBeGreaterThan(3);
      for (const r of rows)
        expect(String(r.value)).not.toMatch(/undefined|NaN/);
    }
  });
  test('English and Spanish catalogs have the same ids and every placeholder', () => {
    expect(Object.keys(ES_SKY).sort()).toEqual(Object.keys(EN_SKY).sort());
    for (const k of Object.keys(EN_SKY)) {
      const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
      expect(ph(ES_SKY[k])).toBe(ph(EN_SKY[k]));
    }
  });
});

describe('the sky sequence', () => {
  test('is the first sequence and lists the five lessons in order', () => {
    expect(SEQUENCES[0].id).toBe('the-sky');
    expect(SEQUENCES[0].lessons.map(l => l.id)).toEqual(Object.keys(LESSONS));
  });
});
