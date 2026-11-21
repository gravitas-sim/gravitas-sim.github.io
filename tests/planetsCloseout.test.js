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
  SHADOWS,
} from '../js/data/investigations/planets-sequence.js';
import { INSTRUCTOR } from '../js/data/investigations/planets-guides.js';
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
    expect(PLANETS.map(l => l.id).sort()).toEqual([...IDS].sort());
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

  test('the Laplace combination from the printed periods is 0.022 ± 0.025 degrees a day (0.015 unrounded), consistent with zero, and rounding to three decimals gives 0.05', () => {
    const f = [1, 2, 3].map(fit);
    const n = f.map(x => 360 / x.periodDays);
    const sn = f.map(x => (360 * x.sigmaPeriodDays) / x.periodDays ** 2);
    const c = n[0] - 3 * n[1] + 2 * n[2];
    const sc = Math.hypot(sn[0], 3 * sn[1], 2 * sn[2]);
    near(c, 0.015, 0.003);
    near(sc, 0.025, 0.002);
    // the four-decimal periods the instrument prints, and its printed uncertainties
    const v = {
      q1: 1.7682,
      q2: 3.548,
      q3: 7.1413,
      e1: 0.0001,
      e2: 0.00025,
      e3: 0.00047,
    };
    const s7 = step('moons-of-the-giants', 'how-sure-is-the-sum');
    const field = id => s7.fields.find(x => x.id === id);
    for (const id of ['n1', 'n2', 'n3', 'laplace', 'sig'])
      v[id] = field(id).compute(v);
    near(v.laplace, 0.022, 0.001);
    near(v.sig, 0.025, 0.002);
    expect(Math.abs(v.laplace)).toBeLessThan(v.sig);
    expect(s7.validate(v).level).toBe('ok');
    const rounded = { p1: 1.768, p2: 3.548, p3: 7.141 };
    const lap =
      360 / rounded.p1 - (3 * 360) / rounded.p2 + (2 * 360) / rounded.p3;
    near(lap, 0.049, 0.002);
    // the readings must be of the three moons, with an uncertainty each
    expect(s7.validate({ ...v, q2: 7.1413 }).level).toBe('error');
    expect(s7.validate({ ...v, e1: 0 }).level).toBe('error');
    expect(s7.validate({ ...v, e1: NaN })).toBeNull();
  });

  test('on one frame a night Io’s period is an alias, 2.30 days, with an uncertainty as small as the true one, and the combination is 47 degrees a day from zero; the step refuses it', () => {
    const night = m => W.fitView({ moon: m, cadence: 0 }, seq).result.fit;
    const f = [1, 2, 3].map(night);
    near(f[0].periodDays, 2.3018, 0.002);
    near(f[1].periodDays, 3.548, 0.001);
    near(f[2].periodDays, 7.1415, 0.001);
    const designed = [1, 2, 3].map(fit);
    // the quoted uncertainty does not flag the alias
    expect(f[0].sigmaPeriodDays).toBeLessThan(0.0005);
    expect(f[0].sigmaPeriodDays / designed[0].sigmaPeriodDays).toBeLessThan(2);
    const n = f.map(x => 360 / x.periodDays);
    near(n[0] - 3 * n[1] + 2 * n[2], -47.18, 0.05);
    const s7 = step('moons-of-the-giants', 'how-sure-is-the-sum');
    const bad = s7.validate({
      q1: 2.3018,
      q2: 3.548,
      q3: 7.1415,
      e1: 0.0002,
      e2: 0.0003,
      e3: 0.00047,
    });
    expect(bad.level).toBe('error');
    expect(bad.message).toMatch(/alias/);
  });

  test('the instrument’s period and uncertainty rows carry the ids the readings are taken from', () => {
    const s = step('moons-of-the-giants', 'how-sure-is-the-sum');
    for (const id of ['q1', 'q2', 'q3'])
      expect(s.fields.find(x => x.id === id).source).toEqual({
        tool: 'period',
      });
    for (const id of ['e1', 'e2', 'e3'])
      expect(s.fields.find(x => x.id === id).source).toEqual({ tool: 'sigma' });
  });

  test('the period steps accept their hints and refuse a once-a-night period', () => {
    const s = step('moons-of-the-giants', 'three-periods');
    expect(s.validate({ p1: 1.7682, p2: 3.548, p3: 7.1413 }).level).toBe('ok');
    expect(s.validate({ p1: 2.3017, p2: 3.548, p3: 7.1413 }).level).toBe(
      'error'
    );
  });

  test('the ratios are divided by the student from the periods of step 3, and Callisto’s ratio uses Ganymede’s period from step 3', () => {
    const r = step('moons-of-the-giants', 'the-ratios');
    const earlier = (sid, id) => ({ p1: 1.7682, p2: 3.548, p3: 7.1413 })[id];
    expect(r.fields.filter(x => !x.compute).map(x => x.id)).toEqual([
      'r12',
      'r23',
    ]);
    const v = { p1: 1.7682, p2: 3.548, p3: 7.1413, r12: 2.007, r23: 2.013 };
    for (const id of ['p1', 'p2', 'p3'])
      expect(r.fields.find(x => x.id === id).compute(v, earlier)).toBe(v[id]);
    expect(r.validate(v).level).toBe('ok');
    expect(r.validate({ ...v, r12: 2 }).level).toBe('error');
    const c = step('moons-of-the-giants', 'callisto-is-not-in-the-chain');
    const r34 = c.fields
      .find(x => x.id === 'r34')
      .compute({ p4: 16.6243 }, earlier);
    near(r34, 2.328, 0.001);
    expect(c.validate({ p4: 16.6243, r34 }).level).toBe('ok');
  });

  test('Kepler’s third law from the orbit sizes puts Callisto at 2.33 times Ganymede’s period, the prediction’s answer', () => {
    const aG = 1070400;
    const aC = 1882700;
    near(aC / aG, 1.76, 0.005);
    near((aC / aG) ** 1.5, 2.33, 0.005);
    near(1.5 ** 1.5, 1.84, 0.005);
    const p = step('moons-of-the-giants', 'callisto-predict');
    expect(p.options[p.answer]).toMatch(/2\.3/);
    expect(p.reveal).toBe('callisto-is-not-in-the-chain');
  });

  test('a revised step is retired with its successor, the prediction names the step that settles it, and the quiet canvas stages nothing', () => {
    const l = lesson('moons-of-the-giants');
    const sids = l.steps.map(x => x.sid);
    expect(l.retired['the-motions-together'].to).toBe('how-sure-is-the-sum');
    expect(sids).not.toContain('the-motions-together');
    expect(sids).toContain('how-sure-is-the-sum');
    expect(l.canvas).toBe('quiet');
    for (const x of l.steps)
      expect(x.stage || x.bind || x.setup).toBeUndefined();
    for (const x of l.steps.filter(y => y.type === 'predict'))
      expect(sids.indexOf(x.reveal)).toBeGreaterThan(sids.indexOf(x.sid));
    const z = step('moons-of-the-giants', 'consistent-with-zero');
    expect(z.evidence.map(e => e.field)).toEqual(['laplace', 'sig']);
    expect(step('moons-of-the-giants', 'the-laplace-combination').reveal).toBe(
      z.sid
    );
    // no answer in the opening: nothing says twice before the prediction
    const before = l.steps.slice(0, sids.indexOf('three-periods-predict') + 1);
    for (const x of before) expect(x.body).not.toMatch(/twice/i);
  });
});

describe('The Scale of the Solar System', () => {
  test('the light time to Neptune is 4.17 hours (8 minutes 19 seconds an AU) and the marble model puts the Sun 117 meters out and Neptune 3.53 kilometers', () => {
    const neptune = 30.07;
    near((neptune * 499.005) / 3600, 4.168, 0.002);
    near(499.005 / 60, 8.317, 0.001);
    near(499.005 - 8 * 60, 19.005, 0.001);
    near((499.005 * 5.204) / 60, 43.28, 0.05);
    near(149597870.7 / 299792.458, 499.005, 0.001);
    const earthM = (149597870.7 / 12742) * 0.01;
    near(earthM, 117.4, 0.05);
    near((earthM * neptune) / 1000, 3.53, 0.01);
    near(1392700 / 12742, 109.3, 0.05);
    near(149597870.7 / 12742, 11740.5, 0.1);
    near((neptune * 149597870.7) / 12742, 353035, 5);
  });

  test('the light-time step multiplies the distance the student took, not one it retypes', () => {
    const s = step('the-scale-of-the-solar-system', 'light-time');
    const earlier = () => 30.07;
    const n = s.fields.find(x => x.id === 'neptune').compute({}, earlier);
    expect(n).toBe(30.07);
    expect(s.fields.find(x => x.id === 'hours').compute).toBeUndefined();
    expect(s.validate({ neptune: n, hours: 4.17 }).level).toBe('ok');
    expect(s.validate({ neptune: n, hours: 8.34 }).level).toBe('error');
    expect(s.validate({ neptune: NaN, hours: 4.17 })).toBeNull();
    // a student whose distance is another planet's gets the light time of that distance
    expect(s.validate({ neptune: 5.2, hours: 0.72 }).level).toBe('ok');
    // the prediction names this step, and the constant waits for it
    const p = step('the-scale-of-the-solar-system', 'light-time-predict');
    expect(p.reveal).toBe('light-time');
    expect(p.body).not.toMatch(/499|8 minutes|seconds/);
    expect(s.body).toMatch(/8 minutes and 19 seconds/);
  });

  test('any marble size with its own distance passes, and kilometers are named for what they are', () => {
    const s = step('the-scale-of-the-solar-system', 'choose-your-marble');
    const au = d => ((149597870.7 / 12742) * d) / 100;
    const f = id => s.fields.find(x => x.id === id);
    const earlier = () => 30.07;
    for (const marble of [0.5, 1, 2.5, 30]) {
      const v = { marble, neptune: f('neptune').compute({}, earlier) };
      v.au_m = f('au_m').compute(v);
      near(v.au_m, au(marble), 1e-6);
      v.nep_m = au(marble) * 30.07;
      expect(s.validate(v).level).toBe('ok');
      expect(s.validate({ ...v, nep_m: v.nep_m / 1000 }).level).toBe('warn');
      expect(s.validate({ ...v, nep_m: v.nep_m * 1.5 }).level).toBe('error');
    }
    // for a one-centimeter marble: 117.4 m to the Sun, 3,530 m to Neptune
    near(au(1) * 30.07, 3530.4, 0.1);
    expect(
      s.validate({ marble: 0, neptune: 30.07, au_m: 0, nep_m: 0 }).level
    ).toBe('error');
    expect(
      step('the-scale-of-the-solar-system', 'earth-as-a-marble').reveal
    ).toBe('choose-your-marble');
    const l = lesson('the-scale-of-the-solar-system');
    expect(l.retired['scale-model'].to).toBe('choose-your-marble');
    expect(l.steps.map(x => x.sid)).not.toContain('scale-model');
  });

  test('the marble prediction’s options carry the same precision, and its correct option is the model’s Sun', () => {
    const p = step('the-scale-of-the-solar-system', 'earth-as-a-marble');
    expect(p.options).toHaveLength(4);
    for (const o of p.options)
      expect(o).toMatch(/^a ball about .*, about .* from /);
    expect(p.options[p.answer]).toMatch(/1 meter wide.*120 meters/);
  });

  test('the distance step takes a reading from the selected planet, is checked against the live world, and falls back to the table', () => {
    const s = step('the-scale-of-the-solar-system', 'three-distances');
    expect(s.fields.map(x => x.source)).toEqual([
      { probe: 'dist' },
      { probe: 'dist' },
      { probe: 'dist' },
    ]);
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
    // the readout row a reading is taken from: the selected body's distance
    const selected = { name: 'Neptune', pos: { x: 3007, y: 0 } };
    const rows = s.probe({ ...ctx(live), selected });
    expect(rows.find(r => r.id === 'dist').value).toBe('30.07 AU');
    expect(
      s.probe({ ...ctx(live), selected: null }).find(r => r.id === 'dist').value
    ).toBe('-');
  });
});

describe('Comets and the Sun', () => {
  const T = r =>
    equilibriumTemperature({ flux: fluxAt(1, r), bondAlbedo: 0.04 })
      .temperature;
  test('the emission temperature is 275.5 K at 1 AU for an albedo of 0.04, and falls as the inverse square root of the distance', () => {
    near(T(1), 275.5, 0.1);
    for (const r of [0.586, 3, 5.79, 17.84])
      near(T(r), 275.5 / Math.sqrt(r), 0.1);
    near(T(0.586), 360, 0.5);
    near(T(3), 159, 0.5);
    near(T(5.79), 114.5, 0.3);
    near(T(17.84), 65.2, 0.3);
  });

  test('a bare nucleus is at 160 K at 2.96 AU, where the sandbox starts to draw tails (a ninth of the Earth’s sunlight, 3 AU)', () => {
    near((275.5 / 160) ** 2, 2.96, 0.01);
    near(1 / 9 ** 0.5, 1 / 3, 1e-12);
    near(T(3), 159, 0.5);
    // the model comets: Halley never reaches 160 K, Wild 2 and Hartley 2 do
    expect(T(5.79)).toBeLessThan(160);
    expect(T(1.12)).toBeGreaterThan(160);
    near(T(1.12), 260, 1);
    expect(T(2.1)).toBeGreaterThan(160);
  });

  test('the real Halley is predicted, then worked out by the student, and 0.586 AU gives 360 K', () => {
    const p = step('comets-and-the-sun', 'halley-heat-predict');
    expect(p.reveal).toBe('the-real-halley');
    expect(p.options[p.answer]).toBe('360 K');
    expect(p.because).not.toMatch(/275/);
    const s = step('comets-and-the-sun', 'the-real-halley');
    const t = r => 275.5 / Math.sqrt(r);
    expect(s.validate({ q: 0.586, t_q: t(0.586) }).level).toBe('ok');
    expect(s.validate({ q: 0.586, t_q: t(1.0) }).level).toBe('error');
    expect(s.validate({ q: 0.586, t_q: NaN })).toBeNull();
  });

  test('the orbit steps take the chosen comet’s distances, graded against its live orbit within four percent', () => {
    const at = { pos: { x: 579, y: 0 }, vel: { x: 0, y: 1 } };
    const comet = { kind: 'Comet', alive: true, name: 'Halley', ...at };
    const other = { kind: 'Comet', alive: true, name: 'Wild 2', ...at };
    const ctx = (selected, bodies = [comet, other]) => ({
      selected,
      bodies,
      elements: b =>
        b === comet
          ? { bound: true, periapsis: 579, apoapsis: 1784 }
          : { bound: true, periapsis: 112, apoapsis: 530 },
      au: x => x * 0.01,
      role: () => ({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } }),
    });
    const s = step('comets-and-the-sun', 'orbit-ends');
    expect(s.fields.map(x => x.source)).toEqual([
      { probe: 'peri' },
      { probe: 'apo' },
    ]);
    expect(s.validate({ peri: 5.79, apo: 17.84 }, ctx(comet)).level).toBe('ok');
    expect(s.validate({ peri: 8, apo: 17.84 }, ctx(comet)).level).toBe('error');
    // another comet, graded as the comet the reading came from
    expect(s.validate({ peri: 1.12, apo: 5.3 }, ctx(other)).level).toBe('ok');
    expect(
      s.validate({ peri: 1.12, apo: 5.3 }, ctx(comet), {
        peri: { b: 'Wild 2' },
      }).level
    ).toBe('ok');
    expect(s.validate({ peri: 5.79, apo: 17.84 }, ctx(null, []))).toBeNull();
    // the readout rows
    const row = id => s.probe(ctx(comet)).find(r => r.id === id).value;
    expect(row('peri')).toBe('5.79 AU');
    expect(row('apo')).toBe('17.84 AU');
    expect(s.probe(ctx(null)).find(r => r.id === 'peri').value).toBe('-');
    const tail = c =>
      step('comets-and-the-sun', 'watch-the-tails')
        .probe(ctx(c))
        .find(r => r.label === 'Tail').value;
    const near3 = {
      ...ctx(other),
      selected: { ...other, pos: { x: 150, y: 0 }, vel: { x: 0, y: 1 } },
    };
    expect(
      step('comets-and-the-sun', 'watch-the-tails')
        .probe(near3)
        .find(r => r.label === 'Tail').value
    ).toMatch(/^drawn/);
    expect(tail(comet)).toBeDefined();
  });

  test('the temperature step works from the two distances the student took, and says whether this comet is above 160 K', () => {
    const h = step('comets-and-the-sun', 'heat-at-the-ends');
    const earlier = (sid, id) => ({ peri: 5.79, apo: 17.84 })[id];
    for (const id of ['peri', 'apo'])
      expect(h.fields.find(x => x.id === id).compute({}, earlier)).toBe(
        earlier('', id)
      );
    expect(h.fields.filter(x => !x.compute).map(x => x.id)).toEqual([
      't_peri',
      't_apo',
    ]);
    const ok = h.validate({
      peri: 5.79,
      apo: 17.84,
      t_peri: 114.5,
      t_apo: 65.2,
    });
    expect(ok.level).toBe('ok');
    expect(ok.message).toMatch(/below it/);
    const hot = h.validate({
      peri: 1.12,
      apo: 5.3,
      t_peri: 260.3,
      t_apo: 119.7,
    });
    expect(hot.level).toBe('ok');
    expect(hot.message).toMatch(/above it/);
    expect(
      h.validate({ peri: 5.79, apo: 17.84, t_peri: 65, t_apo: 114 }).level
    ).toBe('error');
    expect(
      h.validate({ peri: NaN, apo: 17.84, t_peri: 1, t_apo: 1 })
    ).toBeNull();
  });

  test('the Halley step cites no number the tail statements contradict', () => {
    const l = lesson('comets-and-the-sun');
    const text = l.steps
      .map(x => [x.body, x.because, ...(x.hints || [])].join(' '))
      .join(' ');
    expect(text).not.toMatch(/never gets there|never reaches/);
    expect(
      step('comets-and-the-sun', 'why-a-tail-near-the-sun').hints.join(' ')
    ).not.toMatch(/360/);
  });
});

describe('the Spanish of the three lessons', () => {
  test('keeps the readings’ words, the field misconceptions and the new steps text for text', () => {
    for (const l of PLANETS) {
      const es = SHADOWS[l.id];
      l.steps.forEach((x, i) => {
        (x.fields || []).forEach((f, k) => {
          expect(es.steps[i].fields[k]).toBeDefined();
          if (f.misconceptions)
            expect(es.steps[i].fields[k].misconceptions).toHaveLength(
              f.misconceptions.length
            );
        });
      });
    }
    const m = SHADOWS['moons-of-the-giants'];
    expect(m.steps.map(x => x.title)).toContain(
      '¿Qué seguridad tiene la suma?'
    );
    expect(m.steps.map(x => x.title)).toContain('¿Pertenece Calisto?');
    expect(
      SHADOWS['the-scale-of-the-solar-system'].steps.map(x => x.title)
    ).toContain('Elige tu canica');
    expect(
      JSON.stringify(SHADOWS['the-scale-of-the-solar-system'])
    ).not.toMatch(/8 minutos y 20/);
  });
});
