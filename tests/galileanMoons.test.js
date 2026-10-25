import { jest } from '@jest/globals';
// The Galilean moons (Roadmap III, Prompt 193, SATELLITE_EPHEMERIS.md): the
// pack against its manifest and Horizons, the geometry, the cadence and its
// alias analysis, the fit and Kepler's law, the contract legs held to the
// record of the ones that fail, the instruments, and every number the lesson
// states recomputed from the functions the instruments draw. No browser and no
// download: the two packs are read from the repository.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as EN from '../js/data/investigations/measurement-sequence.js';
import * as ES from '../js/data/investigations/es/measurement-sequence.js';
import * as DEEP from '../js/data/investigations/depth/measurement-sequence.js';
import * as DEEP_ES from '../js/data/investigations/depth/es/measurement-sequence.js';
import {
  GM_JUPITER,
  MOON_IDS,
  REFERENCE,
  R_JUPITER_KM,
  moonsAt,
  openGalilean,
  viewOf,
} from '../js/satellites/galilean.js';
import {
  aliasAnalysis,
  designEpochs,
  nightlyAliasTable,
} from '../js/satellites/cadence.js';
import {
  FitRefusal,
  combine,
  fitSinusoid,
  kepler,
} from '../js/satellites/weigh.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const near = (got, want, tol) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
const lesson = id => INVESTIGATIONS.find(l => l.id === id);
const step = (id, sid) =>
  withAllDepths(lesson(id)).steps.find(s => s.sid === sid);
const ID = 'weighing-jupiter';

let model;
let W;
let seq;
beforeAll(async () => {
  model = openGalilean(
    read('sky/galilean-moons.json'),
    read('sky/ephemeris.json')
  );
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  W = await import('../js/jovianWidgets.js');
  warn.mockRestore();
  W.provideModel(model);
  seq = W.sequenceOf(model);
}, 120000);

describe('the pack', () => {
  test('is the manifest’s: pinned, checksummed and within its stated bounds', () => {
    const out = execFileSync(
      'node',
      ['tools/build-ephemeris.mjs', '--check', '--only', 'galilean'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    expect(out).toMatch(/galilean-2025-11 1\.0\.0 is current/);
  });

  test('records the query, the theory, the date and the terms as served', () => {
    const m = read('ephemeris-packs/galilean-2025-11.json');
    expect(m.request.center).toBe('500@599');
    expect(m.source.ephemeris).toBe('jup365_merged');
    expect(m.retrieved).toBe('2026-10-25');
    expect(m.termsAsServed.reading).toMatch(/Nothing found forbids/);
    for (const b of m.bodies) {
      expect(b.raw.daily.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(b.raw.daily.rows).toBe(961);
      expect(b.raw.noon.rows).toBe(960);
    }
  });

  test('is never precached', async () => {
    const { NEVER_PRECACHED } = await import('../tools/build-service-worker.mjs');
    for (const f of [
      'sky/galilean-moons.json',
      'js/jovianWidgets.js',
      'js/satellites/cadence.js',
      'js/data/investigations/weighing-jupiter.js',
    ])
      expect(NEVER_PRECACHED.some(re => re.test(f))).toBe(true);
  });
});

describe('the geometry', () => {
  test('the moons reach their orbit radii in Jupiter radii', () => {
    for (const id of MOON_IDS) {
      let max = 0;
      for (let jd = 2461000; jd < 2461039; jd += 0.1)
        max = Math.max(max, Math.abs(moonsAt(model, jd).moons[id].x));
      near(max, REFERENCE[id].aKm / R_JUPITER_KM, 0.015 * (REFERENCE[id].aKm / R_JUPITER_KM));
    }
  });

  test('Jupiter is 4.2 to 4.6 au away, its light time is that distance over c, seen 1.37 degrees above its equator', () => {
    for (const jd of [2461000.5, 2461015.5, 2461038.5]) {
      const v = viewOf(model, jd);
      const au = v.distanceKm / 149597870.7;
      expect(au).toBeGreaterThan(4.2);
      expect(au).toBeLessThan(4.6);
      near(v.lightTimeS, v.distanceKm / 299792.458, 0.5);
      near(v.subEarthLatDeg, 1.37, 0.05);
    }
  });
});

describe('the cadence', () => {
  test('is 21 hourly frames on three nights and 30 once-a-night frames', () => {
    const e = designEpochs(model);
    expect(e.length).toBe(51);
    expect(e.filter(x => x.kind === 'hourly').length).toBe(21);
    expect(e.filter(x => x.kind === 'nightly').length).toBe(30);
    expect(new Set(e.filter(x => x.kind === 'hourly').map(x => x.night)).size).toBe(3);
  });

  test('once-nightly sampling is exactly a day apart, and Io is the only moon aliased', () => {
    const nights = designEpochs(model).filter(x => x.kind === 'nightly');
    for (let i = 1; i < nights.length; i++) {
      const d = nights[i].jdUt - nights[i - 1].jdUt;
      near(d, Math.round(d), 1e-9);
    }
    const table = nightlyAliasTable(1);
    expect(table.io.aliased).toBe(true);
    const alias = table.io.aliases.find(a => a.belowNyquist);
    near(alias.periodDays, 2.3002, 5e-4);
    expect(alias.periodDays).toBeGreaterThan(table.io.nyquistPeriodDays);
    for (const id of ['europa', 'ganymede', 'callisto'])
      expect(table[id].aliased).toBe(false);
  });

  test('the alias formula is 1 / (1 - 1/P) for P below the Nyquist period', () => {
    const a = aliasAnalysis(1.769, 1);
    near(a.aliases.find(x => x.belowNyquist).periodDays, 1 / (1 - 1 / 1.769), 1e-9);
  });
});

describe('the fit and Kepler’s law', () => {
  const t = Float64Array.from({ length: 40 }, (_, i) => i * 0.97);
  const exact = (P, A, c = 0.3) =>
    Float64Array.from(t, v => A * Math.sin((2 * Math.PI * v) / P + 0.7) + c);

  test('recovers an exact sinusoid’s period and amplitude', () => {
    // 0.97 days apart: the Nyquist period is 1.94 days, so the search starts above it.
    const f = fitSinusoid(t, exact(7.3, 14.9), 0.03, {
      minPeriodDays: 2,
      maxPeriodDays: 20,
    });
    near(f.periodDays, 7.3, 1e-6);
    near(f.amplitude, 14.9, 1e-6);
    near(f.offset, 0.3, 1e-6);
  });

  test('refuses too few marks and a span shorter than the period, in words', () => {
    expect(() => fitSinusoid(t.slice(0, 5), exact(7.3, 14.9).slice(0, 5), 0.03)).toThrow(FitRefusal);
    try {
      fitSinusoid(t.slice(0, 5), exact(7.3, 14.9).slice(0, 5), 0.03);
    } catch (e) {
      expect(e.message).toMatch(/at least 8/);
    }
    expect(() =>
      fitSinusoid(t.slice(0, 12), exact(16.7, 26.3).slice(0, 12), 0.03, {
        minPeriodDays: 4,
        maxPeriodDays: 40,
      })
    ).toThrow(/less than one cycle/);
  });

  test('Kepler’s law is 4 pi^2 a^3 / P^2 and propagates the cube and the square', () => {
    const k = kepler({
      periodDays: 7.1413,
      sigmaPeriodDays: 0.0005,
      amplitude: 14.972,
      sigmaAmplitude: 0.007,
    });
    const a = 14.972 * R_JUPITER_KM;
    const P = 7.1413 * 86400;
    near(k.gm, (4 * Math.PI ** 2 * a ** 3) / P ** 2, 1);
    near(k.relative, Math.hypot((3 * 0.007) / 14.972, (2 * 0.0005) / 7.1413), 1e-12);
    near(k.massKg, (k.gm * 1e9) / 6.6743e-11, 1e18);
  });

  test('the four-moon combination flags values that disagree', () => {
    const ok = combine([
      { gm: 100, sigmaGm: 1 },
      { gm: 101, sigmaGm: 1 },
      { gm: 99.5, sigmaGm: 1 },
    ]);
    expect(ok.consistent).toBe(true);
    const bad = combine([
      { gm: 100, sigmaGm: 0.1 },
      { gm: 103, sigmaGm: 0.1 },
      { gm: 97, sigmaGm: 0.1 },
    ]);
    expect(bad.consistent).toBe(false);
  });
});

describe('the contract’s legs, against the record of the ones that fail', () => {
  test('every leg passes but the recorded ones, which fail as recorded', async () => {
    const { runLegs } = await import('../tools/galilean-validate.mjs');
    const legs = runLegs(model, { seeds: 30 });
    const failed = read('tests/fixtures/galilean/failed-legs.json').legs;
    const byId = Object.fromEntries(legs.map(l => [l.id, l]));
    for (const l of legs) {
      if (l.diagnostic) continue;
      if (l.id === 'd1.coverage') continue; // 30 seeds: held to the record below
      if (failed[l.id]) expect([l.id, l.pass]).toEqual([l.id, false]);
      else expect([l.id, l.pass]).toEqual([l.id, true]);
    }
    // The causes the record names.
    expect(byId['x1.syncheck'].pass).toBe(true);
    const c1 = byId['c1.periodAmplitude'].measured.rows;
    expect(c1.callisto.apparentRelative).toBeGreaterThan(0.0025);
    for (const id of ['io', 'europa', 'ganymede'])
      expect(c1[id].apparentRelative).toBeLessThanOrEqual(0.0025);
    for (const id of MOON_IDS) expect(c1[id].correctedRelative).toBeLessThanOrEqual(0.0005);
    expect(byId['c2.mass'].measured.rows.callisto.uncorrectedRelative).toBeGreaterThan(0.01);
    // The ensemble: Callisto's interval over-covers, as the record says.
    expect(byId['d1.coverage'].measured.period.callisto).toBeGreaterThan(0.85);
    expect(byId['b1.aliasNightly'].measured.io.deltaChi2).toBeLessThan(1);
    expect(byId['b2.aliasDesigned'].measured.io.nearestRivalDeltaChi2).toBeGreaterThan(100);
  }, 240000);

  test('the contract was committed before its legs ran, and the amendment is on record', () => {
    const c = read('tests/fixtures/galilean/contract.json');
    expect(c.committedFirst).toBe(true);
    expect(c.window.amendment).toMatch(/before any candidate output was inspected/);
    expect(Object.keys(c.legs).length).toBe(12);
  });
});

describe('the lesson and the instruments', () => {
  test('is wired: one lesson, three depths, an instrument on every step', () => {
    const l = lesson(ID);
    expect(l).toBeTruthy();
    const sids = withAllDepths(l).steps.map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(sids.length).toBe(16);
    for (const s of withAllDepths(l).steps)
      expect(['moon-frames', 'moon-fit', 'jupiter-weigh']).toContain(s.tool.id);
    expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
  });

  test('a lesson, its Spanish and its deeper steps come from the shared files', async () => {
    const dir = '../js/data/investigations';
    expect((await import(`${dir}/${ID}.js`)).default).toBe(EN.WEIGHING_JUPITER);
    expect((await import(`${dir}/es/${ID}.js`)).default).toBe(ES.WEIGHING_JUPITER);
    expect((await import(`${dir}/depth/${ID}.js`)).default).toBe(DEEP.WEIGHING_JUPITER_DEEPER);
    expect((await import(`${dir}/depth/es/${ID}.js`)).default).toBe(DEEP_ES.WEIGHING_JUPITER_DEEPER);
  });

  test('the Spanish shadow has the English steps, index for index', () => {
    expect(ES.WEIGHING_JUPITER.steps.length).toBe(EN.WEIGHING_JUPITER.steps.length);
    expect(DEEP_ES.WEIGHING_JUPITER_DEEPER.steps.length).toBe(
      DEEP.WEIGHING_JUPITER_DEEPER.steps.length
    );
  });

  test('the instrument words have the same keys in both languages', async () => {
    const { EN_JOVIAN } = await import('../js/i18n/en.jovian.js');
    const { ES_JOVIAN } = await import('../js/i18n/es.jovian.js');
    expect(Object.keys(ES_JOVIAN).sort()).toEqual(Object.keys(EN_JOVIAN).sort());
  });

  test('moon-frames: frame 13 puts Callisto farthest, 26.3 radii east, and the overlay agrees', () => {
    const v = W.framesView({ frame: 13, overlay: 1 }, seq);
    const x = id => v.meas.moons[id].x;
    near(x('callisto'), 26.3, 0.15);
    for (const id of ['io', 'europa', 'ganymede'])
      expect(Math.abs(x(id))).toBeLessThan(Math.abs(x('callisto')));
    for (const id of MOON_IDS) near(x(id), v.predicted[id], 0.12);
  });

  test('moon-frames: Ganymede is 9.66 radii from Jupiter in frame 14 and 0.89 closer in frame 16', () => {
    const g = n => Math.abs(W.framesView({ frame: n }, seq).meas.moons.ganymede.x);
    near(g(14), 9.66, 0.1);
    near(g(14) - g(16), 0.89, 0.12);
  });

  test('moon-fit: Io 1.768 days and 5.89 radii designed, 2.30 days from once a night', () => {
    const d = W.fitView({ moon: 1, cadence: 1 }, seq).result.fit;
    near(d.periodDays, 1.768, 0.002);
    near(d.amplitude, 5.89, 0.03);
    const n = W.fitView({ moon: 1, cadence: 0 }, seq).result.fit;
    near(n.periodDays, 2.3017, 0.003);
    expect(Math.abs(n.periodDays - 1.769) / 1.769).toBeGreaterThan(0.25);
  });

  test('jupiter-weigh: Ganymede 127.2 million, 1.905e27 kg; the four disagree until corrected', () => {
    const g = W.weighView({ moon: 3, correct: 0 }, seq).rows.ganymede;
    near(g.gm / 1e6, 127.17, 0.3);
    near(g.massKg / 1e27, 1.905, 0.005);
    near((g.gm - GM_JUPITER) / g.sigmaGm, 2.9, 0.6);
    const raw = W.weighView({ moon: 0, correct: 0 }, seq).combined;
    const fixed = W.weighView({ moon: 0, correct: 1 }, seq).combined;
    near(raw.chi2, 21.3, 2);
    expect(raw.consistent).toBe(false);
    near(fixed.gm / 1e6, 126.85, 0.15);
    near(fixed.chi2, 6.12, 0.8);
    expect(fixed.consistent).toBe(true);
  });

  test('every readout is text and never throws, in every setting', () => {
    for (const w of W.JOVIAN_WIDGETS) {
      const settings = [{}, { frame: 20, overlay: 1 }, { moon: 2, cadence: 0 }, { moon: 0, correct: 1 }];
      for (const v of settings) {
        const rows = w.readout(v);
        expect(rows.length).toBeGreaterThan(1);
        for (const r of rows) expect(typeof r.value).toBe('string');
      }
    }
  });

  test('the lesson’s validators accept what the instruments read and refuse a wrong value', () => {
    const val = (sid, v) => step(ID, sid).validate(v);
    const d14 = Math.abs(W.framesView({ frame: 14 }, seq).meas.moons.ganymede.x);
    const d16 = Math.abs(W.framesView({ frame: 16 }, seq).meas.moons.ganymede.x);
    expect(val('how-fast-does-ganymede-move', { d14, move: d14 - d16 }).level).toBe('ok');
    expect(val('how-fast-does-ganymede-move', { d14: 5, move: 0.1 }).level).toBe('error');
    const io = W.fitView({ moon: 1, cadence: 1 }, seq).result.fit;
    expect(val('io-period-and-radius', { period: io.periodDays, radius: io.amplitude }).level).toBe('ok');
    expect(val('io-period-and-radius', { period: 2.3, radius: io.amplitude }).level).toBe('error');
    const ion = W.fitView({ moon: 1, cadence: 0 }, seq).result.fit;
    expect(val('try-once-a-night', { period: ion.periodDays }).level).toBe('ok');
    expect(val('try-once-a-night', { period: 1.77 }).level).toBe('error');
    const ga = W.fitView({ moon: 3, cadence: 1 }, seq).result.fit;
    expect(val('ganymede-period-and-radius', { period: ga.periodDays, radius: ga.amplitude }).level).toBe('ok');
    const c = W.weighView({ moon: 0, correct: 1 }, seq).combined;
    expect(val('weigh-again-corrected', { gm: c.gm / 1e6, chi2: c.chi2 }).level).toBe('ok');
    expect(val('weigh-again-corrected', { gm: 127.4, chi2: 21.3 }).level).toBe('error');
  });

  test('the numeric answers are what the physics gives', () => {
    // Kepler's law on Ganymede, to the lesson's tolerance.
    near(step(ID, 'keplers-third-law').answer, 127.2, 0.01);
    const a = 14.97 * R_JUPITER_KM;
    const P = 7.141 * 86400;
    near((4 * Math.PI ** 2 * a ** 3) / P ** 2 / 1e6, step(ID, 'keplers-third-law').answer, step(ID, 'keplers-third-law').tolerance / 2);
    near(((4 * Math.PI ** 2 * a ** 3) / P ** 2 * 1e9) / 6.6743e-11 / 1e27, step(ID, 'jupiters-mass').answer, 0.01);
    // The frame effect on Callisto, 0.083 degrees a day over 360 / 16.689.
    near((0.0826 / (360 / REFERENCE.callisto.periodDays)) * 100, step(ID, 'the-sky-frame-turns').answer, 0.02);
    // The north-south offset at 1.37 degrees.
    near(26.4 * Math.sin((1.37 * Math.PI) / 180), step(ID, 'projection-and-light-time').answer, 0.01);
    // The alias, by hand.
    near(1 / (1 - 1 / REFERENCE.io.periodDays), step(ID, 'the-alias-exercise').answer, 0.005);
  });
});
