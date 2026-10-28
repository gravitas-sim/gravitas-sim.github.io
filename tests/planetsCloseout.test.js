import { jest } from '@jest/globals';
// The planetary closeout (Roadmap III, Prompt 206): the three connecting
// investigations of js/data/investigations/planets-sequence.js, every number
// their steps state recomputed from the instruments and kernels they point at,
// the Spanish held to the English step for step, and the sequence that orders
// them. No browser and no download: the packs are read from the repository.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { SEQUENCES } from '../js/data/investigations/sequences.js';
import PLANETS, {
  INSTRUCTOR,
  SHADOWS,
} from '../js/data/investigations/planets-sequence.js';
import { openGalilean } from '../js/satellites/galilean.js';
import {
  equilibriumTemperature,
  fluxAt,
} from '../js/kernels/atmospheres/equilibrium.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const lesson = id => PLANETS.find(l => l.id === id);
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);
const IDS = [
  'the-scale-of-the-solar-system',
  'moons-of-the-giants',
  'comets-and-the-sun',
];

describe('the three investigations', () => {
  test('are in the catalog, once each, with a guide, a flow, expectations and a band', () => {
    expect(PLANETS.map(l => l.id)).toEqual(IDS);
    for (const id of IDS) {
      expect(INVESTIGATIONS.filter(i => i.id === id)).toHaveLength(1);
      for (const k of ['content', 'flow', 'expectations', 'bands'])
        expect(INSTRUCTOR[k][id]).toBeTruthy();
    }
  });

  test('every sid is unique and every guide expectation names a step', () => {
    for (const l of PLANETS) {
      const sids = l.steps.map(s => s.sid);
      expect(new Set(sids).size).toBe(sids.length);
      for (const sid of Object.keys(INSTRUCTOR.expectations[l.id]))
        expect(sids).toContain(sid);
      for (const b of INSTRUCTOR.flow[l.id]) {
        expect(sids).toContain(b.from);
        expect(sids).toContain(b.to);
      }
    }
  });

  test('the Spanish has a step, a field and an option for each of the English', () => {
    for (const l of PLANETS) {
      const es = SHADOWS[l.id];
      expect(es.title).toBeTruthy();
      expect(es.objectives).toHaveLength(l.objectives.length);
      expect(es.steps).toHaveLength(l.steps.length);
      l.steps.forEach((s, i) => {
        const t = es.steps[i];
        expect(t.title).toBeTruthy();
        expect(t.body || s.body === undefined).toBeTruthy();
        if (s.fields) expect(t.fields).toHaveLength(s.fields.length);
        if (s.options) expect(t.options).toHaveLength(s.options.length);
        if (s.misconceptions)
          expect(t.misconceptions).toHaveLength(s.misconceptions.length);
        if (s.checklist) expect(t.checklist).toHaveLength(s.checklist.length);
      });
    }
  });

  test('sit in the Planets and the Sun sequence, after Gravity and orbits', () => {
    const seq = SEQUENCES.find(s => s.id === 'planets-and-the-sun');
    expect(seq.after).toEqual(['gravity-and-orbits']);
    const ids = seq.lessons.map(l => l.id);
    for (const id of IDS) expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    const chapters = Object.fromEntries(
      PLANETS.map(l => [l.id, l.textbook.chapter])
    );
    expect(chapters).toEqual({
      'the-scale-of-the-solar-system': 7,
      'moons-of-the-giants': 12,
      'comets-and-the-sun': 13,
    });
  });

  test('the two small-body investigations are in chapter 13, the comets and asteroids chapter', () => {
    for (const id of ['the-gaps-in-the-belt', 'how-fast-does-it-spin'])
      expect(INVESTIGATIONS.find(i => i.id === id).textbook.chapter).toBe(13);
  });
});

describe('Moons of the Giants', () => {
  let W;
  let seq;
  beforeAll(async () => {
    const model = openGalilean(
      read('sky/galilean-moons.json'),
      read('sky/ephemeris.json')
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    W = await import('../js/jovianWidgets.js');
    warn.mockRestore();
    W.provideModel(model);
    seq = W.sequenceOf(model);
  }, 120000);
  const fit = moon => W.fitView({ moon, cadence: 1 }, seq).result.fit;

  test('the fitted periods are 1.7682, 3.5480, 7.1413 and 16.624 days', () => {
    near(fit(1).periodDays, 1.7682, 0.0005);
    near(fit(2).periodDays, 3.548, 0.0005);
    near(fit(3).periodDays, 7.1413, 0.0005);
    near(fit(4).periodDays, 16.624, 0.01);
  });

  test('the ratios are 2.0065 and 2.0128, and Callisto’s is 2.328', () => {
    const p = [1, 2, 3, 4].map(m => fit(m).periodDays);
    near(p[1] / p[0], 2.0065, 0.001);
    near(p[2] / p[1], 2.0128, 0.001);
    near(p[3] / p[2], 2.328, 0.002);
  });

  test('the Laplace combination is 0.015 ± 0.025 degrees a day, consistent with zero, and rounding to three decimals gives 0.05', () => {
    const f = [1, 2, 3].map(fit);
    const n = f.map(x => 360 / x.periodDays);
    const sn = f.map(x => (360 * x.sigmaPeriodDays) / x.periodDays ** 2);
    const c = n[0] - 3 * n[1] + 2 * n[2];
    const sc = Math.hypot(sn[0], 3 * sn[1], 2 * sn[2]);
    near(c, 0.015, 0.003);
    near(sc, 0.025, 0.002);
    expect(Math.abs(c)).toBeLessThan(sc);
    // the lesson's own validator, on the four-decimal values it asks for
    const v = { p1: 1.7682, p2: 3.548, p3: 7.1413 };
    v.laplace = 360 / v.p1 - (3 * 360) / v.p2 + (2 * 360) / v.p3;
    expect(
      step('moons-of-the-giants', 'the-motions-together').validate(v).level
    ).toBe('ok');
    const rounded = { p1: 1.768, p2: 3.548, p3: 7.141 };
    rounded.laplace =
      360 / rounded.p1 - (3 * 360) / rounded.p2 + (2 * 360) / rounded.p3;
    near(rounded.laplace, 0.049, 0.002);
    // a combination that is not small is refused
    expect(
      step('moons-of-the-giants', 'the-motions-together').validate({
        ...v,
        laplace: 0.4,
      }).level
    ).toBe('error');
  });

  test('the period steps accept their hints and refuse a once-a-night period', () => {
    const s = step('moons-of-the-giants', 'three-periods');
    expect(s.validate({ p1: 1.7682, p2: 3.548, p3: 7.1413 }).level).toBe('ok');
    expect(s.validate({ p1: 2.3017, p2: 3.548, p3: 7.1413 }).level).toBe(
      'error'
    );
  });
});

describe('The Scale of the Solar System', () => {
  test('the light time to Neptune is 4.17 hours and the marble model puts the Sun 117 meters out and Neptune 3.5 kilometers', () => {
    const neptune = 30.07;
    near((neptune * 499.005) / 3600, 4.168, 0.002);
    near((499.005 * 1) / 60, 8.317, 0.001);
    near((499.005 * 5.204) / 60, 43.28, 0.05);
    const earthM = (149597870.7 / 12742) * 0.01;
    near(earthM, 117.4, 0.05);
    near((earthM * neptune) / 1000, 3.53, 0.01);
    near(1392700 / 12742, 109.3, 0.05);
    const s = step('the-scale-of-the-solar-system', 'scale-model');
    expect(
      s.validate({
        neptune,
        earth_m: earthM,
        neptune_km: (earthM * neptune) / 1000,
      }).level
    ).toBe('ok');
  });

  test('the distance step is checked against the live world, and falls back to the table', () => {
    const s = step('the-scale-of-the-solar-system', 'three-distances');
    const mk = (r, role) => ({ role, r });
    const ctx = au => ({
      bodies: [1],
      au: x => x * 0.01,
      role: name =>
        name === 'sun'
          ? { pos: { x: 0, y: 0 } }
          : { pos: { x: 100 * au[name], y: 0 } },
    });
    const live = { earth: 1.0, jupiter: 5.2, neptune: 30.07 };
    expect(s.validate({ ...live }, ctx(live)).level).toBe('ok');
    expect(s.validate({ ...live, neptune: 20 }, ctx(live)).level).toBe('error');
    expect(s.validate({ ...live }, { bodies: [] }).level).toBe('ok');
    void mk;
  });
});

describe('Comets and the Sun', () => {
  test('the emission temperature is 275.5 K at 1 AU for an albedo of 0.04, and falls as the inverse square root of the distance', () => {
    const T = r =>
      equilibriumTemperature({ flux: fluxAt(1, r), bondAlbedo: 0.04 })
        .temperature;
    near(T(1), 275.5, 0.1);
    for (const r of [0.586, 3, 5.79, 17.84])
      near(T(r), 275.5 / Math.sqrt(r), 0.1);
    near(T(0.586), 360, 0.5);
    near(T(3), 159, 0.5);
    near(T(5.79), 114.5, 0.3);
    near(T(17.84), 65.2, 0.3);
  });

  test('the real Halley step accepts 0.586 AU and 360 K and refuses another distance', () => {
    const s = step('comets-and-the-sun', 'the-real-halley');
    const t = r => 275.5 / Math.sqrt(r);
    expect(s.validate({ q: 0.586, t_q: t(0.586) }).level).toBe('ok');
    expect(s.validate({ q: 1.0, t_q: t(1.0) }).level).toBe('error');
  });

  test('the orbit steps are graded against the live comet, within four percent, and wait for one', () => {
    const comet = { kind: 'Comet', alive: true, name: 'Halley' };
    const ctx = {
      bodies: [comet],
      elements: () => ({ bound: true, periapsis: 579, apoapsis: 1784 }),
      au: x => x * 0.01,
    };
    const s = step('comets-and-the-sun', 'orbit-ends');
    expect(s.validate({ peri: 5.79, apo: 17.84 }, ctx).level).toBe('ok');
    expect(s.validate({ peri: 8, apo: 17.84 }, ctx).level).toBe('error');
    expect(
      s.validate(
        { peri: 5.79, apo: 17.84 },
        { bodies: [], elements: () => null, au: x => x }
      )
    ).toBeNull();
    const h = step('comets-and-the-sun', 'heat-at-the-ends');
    expect(
      h.validate({ peri: 5.79, apo: 17.84, t_peri: 114.5, t_apo: 65.2 }, ctx)
        .level
    ).toBe('ok');
  });
});
