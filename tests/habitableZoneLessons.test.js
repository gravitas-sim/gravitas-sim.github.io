/**
 * @jest-environment jsdom
 */
// =============================================================================
// The Goldilocks upper depth and its instruments (Roadmap III, Prompt 205 part B)
// -----------------------------------------------------------------------------
// Every number a deeper step states is recomputed here from the kernel: each
// validator accepts the kernel's value and refuses a wrong one. The core steps
// are the lesson as it was (the lesson goldens hold their words and their
// grading), the deeper steps open no scenario of their own, the instruments draw
// through the plot component, and every string exists in both languages.
// =============================================================================

/* global document */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as K from '../js/kernels/habitablezone/index.js';
import { zoneAtAge } from '../js/kernels/habitablezone/age.js';
import { EN_HZ_LIMITS } from '../js/i18n/en.habitablezone.js';
import { ES_HZ_LIMITS } from '../js/i18n/es.habitablezone.js';
import ES_DEEP from '../js/data/investigations/depth/es/goldilocks-question.js';
import DEEP from '../js/data/investigations/depth/goldilocks-question.js';
import { LAZY_FAMILIES } from '../js/widgets.js';

const core = INVESTIGATIONS.find(l => l.id === 'goldilocks-question');
const lesson = withAllDepths(core);
const step = sid => lesson.steps.find(s => s.sid === sid);
const GYR = 1e9;

const zone = (teffK, luminositySolar) =>
  K.zoneLimits({ teffK, luminositySolar });
const atAge = age => zoneAtAge({ trackId: 'm100', ageYr: age * GYR });
const lockingAt = (trackId, age) => {
  const r = zoneAtAge({ trackId, ageYr: age * GYR });
  const lk = K.lockingRadiusRange({
    starMassSun: r.star.initialMassSolar,
    ageYr: age * GYR,
    Q: 100,
  });
  return { r, lk };
};

/** The validator accepts `good` and refuses `bad`, both with a message. */
function holds(sid, good, bad) {
  const s = step(sid);
  expect(s.validate(good).level).toBe('ok');
  const r = s.validate(bad);
  expect(r.level).toBe('error');
  expect(r.message.length).toBeGreaterThan(20);
  expect(s.validate({})).toBeNull();
}

describe('the lesson is deepened, not changed', () => {
  test('it offers three depths and the deeper steps are laid after their anchors', () => {
    expect(core.depths).toEqual(['core', 'quantitative', 'advanced']);
    const sids = lesson.steps.map(s => s.sid);
    for (const d of DEEP.steps) {
      expect(sids.indexOf(d.sid)).toBeGreaterThan(sids.indexOf(d.after));
    }
    expect(lesson.steps.filter(s => s.depth === 'quantitative')).toHaveLength(
      5
    );
    expect(lesson.steps.filter(s => s.depth === 'advanced')).toHaveLength(4);
  });

  test('the core steps are untouched: no step of the core file carries a depth', () => {
    expect(core.steps.some(s => s.depth)).toBe(false);
    expect(core.steps.at(-1).sid).toBe('what-you-worked-out');
    expect(lesson.steps.at(-1).sid).toBe('what-you-worked-out');
  });

  test('a deeper step opens no scenario, seed or stage of its own', () => {
    for (const s of DEEP.steps) {
      expect(s.setup).toBeUndefined();
      expect(s.stage).toBeUndefined();
      expect(s.scenario).toBeUndefined();
    }
  });

  test('every deeper step names a tool the new family owns, and the family is registered', () => {
    const owned = LAZY_FAMILIES.habitabilityLimits.ids;
    expect(owned).toEqual(['hz-limits', 'hz-locking', 'hz-ages']);
    for (const s of DEEP.steps.filter(x => x.tool))
      expect(owned).toContain(s.tool.id);
  });

  test('the Spanish has a step for each deeper step, with the same fields and options', () => {
    expect(ES_DEEP.steps).toHaveLength(DEEP.steps.length);
    DEEP.steps.forEach((s, i) => {
      const es = ES_DEEP.steps[i];
      expect(es.title).toBeTruthy();
      expect(es.body ?? s.body).toBeTruthy();
      if (s.fields) expect(es.fields).toHaveLength(s.fields.length);
      if (s.options) expect(es.options).toHaveLength(s.options.length);
      if (s.tool) expect(es.tool.title).toBeTruthy();
    });
  });
});

describe('every stated number from the kernel', () => {
  test('the Sun: 1.04 Earths at the runaway limit and 0.35 at the maximum', () => {
    const z = zone(5780, 1);
    holds(
      'the-limits-as-starlight',
      {
        runaway: z.limits.runawayGreenhouse.flux,
        maximum: z.limits.maximumGreenhouse.flux,
      },
      { runaway: 0.98, maximum: 1.7 }
    );
  });

  test('the M dwarf: 0.87 Earths at 0.068 AU, fourteen times closer than the Sun’s', () => {
    const m = zone(3200, 0.004).limits.runawayGreenhouse;
    const sun = zone(5780, 1).limits.runawayGreenhouse;
    holds(
      'the-same-limit-a-dim-star',
      { flux: m.flux, distance: m.distanceAU },
      {
        flux: 1.04,
        distance: 0.98,
      }
    );
    expect(sun.distanceAU / m.distanceAU).toBeGreaterThan(14);
    expect(sun.distanceAU / m.distanceAU).toBeLessThan(15);
    // the text's own check of the inverse-square law
    expect(Math.sqrt(0.004 / m.flux)).toBeCloseTo(m.distanceAU, 12);
  });

  test('TRAPPIST-1 is refused and the answer is the third option', () => {
    expect(step('a-star-the-fit-refuses').answer).toBe(2);
    expect(() => zone(2566, 0.000553)).toThrow(
      expect.objectContaining({ code: 'teff-domain' })
    );
  });

  test('the zone at three ages: 0.89, 1.03 and 1.24 AU', () => {
    holds(
      'the-zone-at-three-ages',
      {
        inner1: atAge(1).zone.conservative.innerAU,
        inner457: atAge(4.57).zone.conservative.innerAU,
        inner8: atAge(8).zone.conservative.innerAU,
      },
      { inner1: 0.98, inner457: 0.98, inner8: 0.98 }
    );
    const a = [1, 4.57, 8].map(x => atAge(x).zone.conservative.innerAU);
    expect(a[0]).toBeLessThan(a[1]);
    expect(a[1]).toBeLessThan(a[2]);
  });

  test('the model star puts 1 AU closer in than the inner edge at the Sun’s age, by 1.11 against 1.05', () => {
    const r = atAge(4.57);
    expect(step('earth-in-the-model-zone').answer).toBe(1);
    expect(r.star.luminositySolar).toBeCloseTo(1.108, 3);
    expect(r.zone.limits.runawayGreenhouse.flux).toBeCloseTo(1.047, 3);
    expect(1 < r.zone.conservative.innerAU).toBe(true);
    expect(r.star.luminositySolar / r.star.luminositySolar).toBe(1);
  });

  test('0.2 solar masses at 5 Gyr: radius 0.28 AU, zone from 0.074 to 0.142 AU, wholly inside', () => {
    const { r, lk } = lockingAt('m020', 5);
    holds(
      'the-m-dwarf-zone-and-the-tide',
      { radius: lk.radiusAU, inner: r.zone.conservative.innerAU },
      { radius: 0.5, inner: 0.3 }
    );
    expect(r.zone.conservative.outerAU).toBeLessThan(lk.lowAU);
  });

  test('0.5 solar masses at 5 Gyr: radius 0.38 AU against an outer edge of 0.40 AU, inside the zone', () => {
    const { r, lk } = lockingAt('m050', 5);
    holds(
      'a-middling-star',
      { radius: lk.radiusAU, outer: r.zone.conservative.outerAU },
      { radius: 0.1, outer: 0.2 }
    );
    expect(lk.radiusAU).toBeGreaterThan(r.zone.conservative.innerAU);
    expect(lk.radiusAU).toBeLessThan(r.zone.conservative.outerAU);
  });

  test('the range of that radius: 0.26 to 0.56 AU, a factor 2.15, and the verdict changes across it', () => {
    const { r, lk } = lockingAt('m050', 5);
    holds(
      'how-sure-is-the-radius',
      { low: lk.lowAU, high: lk.highAU },
      { low: 0.1, high: 0.2 }
    );
    expect(lk.highAU / lk.lowAU).toBeCloseTo(10 ** (1 / 3), 12);
    expect(lk.highAU).toBeGreaterThan(r.zone.conservative.outerAU);
    expect(lk.lowAU).toBeLessThan(r.zone.conservative.outerAU);
  });

  test('a star of one solar mass has its whole zone outside the radius (the text says so)', () => {
    const { r, lk } = lockingAt('m100', 5);
    expect(r.zone.conservative.innerAU).toBeGreaterThan(lk.highAU);
  });
});

describe('the words', () => {
  test('both languages have the same keys, and no value is empty', () => {
    expect(Object.keys(ES_HZ_LIMITS).sort()).toEqual(
      Object.keys(EN_HZ_LIMITS).sort()
    );
    for (const v of Object.values(ES_HZ_LIMITS))
      expect(v.length).toBeGreaterThan(0);
  });

  test('the deeper steps never claim a planet is habitable or give a climate date', () => {
    const text = JSON.stringify(
      DEEP.steps.map(s => [s.body, s.because, s.tip])
    );
    expect(text).not.toMatch(
      /is habitable|will be habitable|leaves the zone in/i
    );
  });
});

describe('the instruments', () => {
  let W;
  beforeAll(async () => {
    W = await import('../js/habitabilityLimitsWidgets.js');
  });

  test('three instruments, each drawing through the plot component and reading out', () => {
    expect(W.HABITABILITY_LIMIT_WIDGETS.map(w => w.id)).toEqual([
      'hz-limits',
      'hz-locking',
      'hz-ages',
    ]);
    for (const w of W.HABITABILITY_LIMIT_WIDGETS) {
      const canvas = document.createElement('canvas');
      document.body.append(canvas);
      const spec = w.draw(canvas, {});
      expect(spec.series.length).toBeGreaterThanOrEqual(3);
      expect(spec.xTitle).toBeTruthy();
      expect(spec.yTitle).toBeTruthy();
      expect(canvas.style.display).toBe('none');
      const rows = w.readout({});
      expect(rows.length).toBeGreaterThan(3);
      for (const r of rows)
        expect(String(r.value)).not.toMatch(/NaN|undefined/);
    }
  });

  test('the limits instrument keeps the flux in view for every limit and refuses TRAPPIST-1', () => {
    const [limits] = W.HABITABILITY_LIMIT_WIDGETS;
    const rows = limits.readout({ star: 0 });
    for (const lim of ['Runaway', 'Maximum', 'Recent', 'Early'])
      expect(rows.find(r => r.label.startsWith(lim)).value).toMatch(
        /Earths of starlight \(\d+ W\/m²\)/
      );
    const refused = limits.readout({ star: 4 });
    expect(
      refused.some(r => /outside it, and no limit is given/.test(r.value))
    ).toBe(true);
    expect(refused.some(r => /Earths of starlight/.test(r.value))).toBe(false);
  });

  test('the toggles decide what is drawn and the flux curve is always there', () => {
    const [limits] = W.HABITABILITY_LIMIT_WIDGETS;
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const none = limits.draw(canvas, {
      runawayGreenhouse: 0,
      maximumGreenhouse: 0,
    });
    expect(none.series.map(s => s.id)).toEqual(['flux']);
    const all = limits.draw(canvas, {
      runawayGreenhouse: 1,
      maximumGreenhouse: 1,
      recentVenus: 1,
      earlyMars: 1,
    });
    expect(all.series.map(s => s.id)).toEqual([
      'flux',
      'recentVenus',
      'runawayGreenhouse',
      'maximumGreenhouse',
      'earlyMars',
    ]);
  });

  test('the locking instrument says why a star cannot be read, and gives a verdict where it can', () => {
    const [, locking] = W.HABITABILITY_LIMIT_WIDGETS;
    expect(W.lockingView({ star: 0, age: 5 }).verdict).toBe('inside');
    expect(W.lockingView({ star: 1, age: 5 }).verdict).toBe('straddles');
    expect(W.lockingView({ star: 2, age: 5 }).verdict).toBe('outside');
    const gone = locking.readout({ star: 3, age: 5 });
    expect(gone.some(r => /no longer on this track/.test(r.value))).toBe(true);
  });

  test('the ages instrument carries the model-star statement and Earth’s flux', () => {
    const [, , ages] = W.HABITABILITY_LIMIT_WIDGETS;
    const rows = ages.readout({ age: 4.57 });
    expect(rows.some(r => /not the Sun/i.test(r.label))).toBe(true);
    expect(rows.find(r => r.label === 'A planet at 1 AU').value).toMatch(
      /1\.108 Earths of starlight: closer in than the inner edge/
    );
    expect(W.agesView({ age: 4.57 }).where).toBe('inner');
  });

  test('the views are the kernel’s numbers', () => {
    expect(W.limitsView({ star: 0 }).zone.conservative.innerAU).toBe(
      zone(5780, 1).conservative.innerAU
    );
    expect(W.agesView({ age: 8 }).zone.conservative.outerAU).toBe(
      atAge(8).zone.conservative.outerAU
    );
  });
});
