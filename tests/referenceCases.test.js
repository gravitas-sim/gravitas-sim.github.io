// The sandbox's reference cases: the references the runner judges against, the
// record it writes, and the record as the engine reproduces it now. The bounds
// are in tests/fixtures/reference-cases/thresholds.json, committed before the
// runner existed; the failing rows below are a result, not an error, and a
// change that fixes one flips that row in the record in its own change.
/* global URL, process */
import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  elements,
  keplerState,
  timeToPeriapsis,
  maxEnergyShadow,
  phi,
  nbodyEnergy,
  nbodyState,
  rk4Advance,
} from '../tools/reference-physics.mjs';
import {
  SCHEMA,
  problems,
  worldCentre,
  loadAll,
  convertSidecars,
} from '../tools/scene-record.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = f => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const THRESHOLDS = read('tests/fixtures/reference-cases/thresholds.json');
const RECORD = read('tests/fixtures/reference-cases/record.json');

describe('the references are exact where they claim to be', () => {
  test('a circular orbit returns after one period and is a quarter turn along after a quarter', () => {
    const mu = 1000;
    const r0 = { x: 100, y: 0 };
    const v0 = { x: 0, y: Math.sqrt(mu / 100) };
    const el = elements(r0, v0, mu);
    expect(el.a).toBeCloseTo(100, 10);
    // e is a square root of round-off here, about 1e-8.
    expect(el.e).toBeLessThan(1e-6);
    expect(el.period).toBeCloseTo(2 * Math.PI * Math.sqrt(1e6 / mu), 10);
    const q = keplerState(el, r0, v0, mu, el.period / 4);
    expect(q.x).toBeCloseTo(0, 8);
    expect(q.y).toBeCloseTo(100, 8);
    const full = keplerState(el, r0, v0, mu, 100 * el.period);
    expect(full.x).toBeCloseTo(100, 6);
    expect(Math.abs(full.y)).toBeLessThan(1e-5);
  });

  test('an eccentric orbit agrees with a small-step integration of the same field', () => {
    const mu = 4e6;
    const r0 = { x: 405, y: 0 };
    const v0 = { x: -82.6205, y: 71.1575 };
    const el = elements(r0, v0, mu);
    expect(el.e).toBeGreaterThan(0.7);
    // Independent: velocity-Verlet at a step 1e-4 of an orbital period fraction.
    const h = 1e-5;
    let x = r0.x;
    let y = r0.y;
    let vx = v0.x;
    let vy = v0.y;
    const acc = (px, py) => {
      const r3 = Math.hypot(px, py) ** 3;
      return [(-mu * px) / r3, (-mu * py) / r3];
    };
    let [ax, ay] = acc(x, y);
    const T = 3.0;
    for (let t = 0; t < T - 1e-12; t += h) {
      vx += 0.5 * h * ax;
      vy += 0.5 * h * ay;
      x += h * vx;
      y += h * vy;
      [ax, ay] = acc(x, y);
      vx += 0.5 * h * ax;
      vy += 0.5 * h * ay;
    }
    const k = keplerState(el, r0, v0, mu, T);
    expect(Math.hypot(k.x - x, k.y - y) / el.rp).toBeLessThan(1e-6);
    expect(Math.hypot(k.vx - vx, k.vy - vy) / el.vp).toBeLessThan(1e-6);
  });

  test('periapsis is reached at the time the orbit says, from either side of it', () => {
    const mu = 1000;
    // Start at apoapsis of an e = 0.5 orbit about a = 100: periapsis is half a period away.
    const a = 100;
    const e = 0.5;
    const ra = a * (1 + e);
    const va = Math.sqrt((mu * (1 - e)) / (a * (1 + e)));
    const r0 = { x: ra, y: 0 };
    const v0 = { x: 0, y: va };
    const el = elements(r0, v0, mu);
    expect(timeToPeriapsis(el)).toBeCloseTo(el.period / 2, 8);
    const r = keplerState(el, r0, v0, mu, timeToPeriapsis(el));
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(a * (1 - e), 8);
    // Just past periapsis (outbound) the next one is a period less a little away.
    const past = keplerState(el, r0, v0, mu, el.period / 2 + 1);
    const el2 = elements(
      { x: past.x, y: past.y },
      { x: past.vx, y: past.vy },
      mu
    );
    expect(timeToPeriapsis(el2)).toBeCloseTo(el.period - 1, 6);
  });

  test('the energy shadow of an eccentric orbit vanishes as the orbit goes circular', () => {
    const mu = 1000;
    const circ = elements(
      { x: 100, y: 0 },
      { x: 0, y: Math.sqrt(mu / 100) },
      mu
    );
    expect(maxEnergyShadow(circ, mu)).toBeLessThan(1e-8);
    const ecc = elements(
      { x: 50, y: 0 },
      { x: 0, y: Math.sqrt((mu * 1.65) / 50) },
      mu
    );
    expect(maxEnergyShadow(ecc, mu)).toBeGreaterThan(1e-3);
  });

  test('the softened potential is continuous at the floor and its gradient is the clamped force', () => {
    const rmin = 5;
    expect(phi(rmin - 1e-9, rmin)).toBeCloseTo(phi(rmin + 1e-9, rmin), 8);
    // Inside the floor the pull is G m r / rmin^3: the derivative of phi.
    const r = 3;
    const d = 1e-6;
    const grad = (phi(r + d, rmin) - phi(r - d, rmin)) / (2 * d);
    expect(grad).toBeCloseTo(r / rmin ** 3, 8);
  });

  test('the RK4 reference conserves the energy it is judged with, through a close pass', () => {
    const G = 2;
    const rmin = 5;
    const bodies = [
      { mass: 6000, pos: { x: 50, y: 0 }, vel: { x: 0, y: 11.7713 } },
      {
        mass: 6000,
        pos: { x: -24, y: 43.301 },
        vel: { x: -10.1943, y: -5.8857 },
      },
      {
        mass: 6000,
        pos: { x: -25, y: -43.301 },
        vel: { x: 10.1943, y: -5.8857 },
      },
    ];
    const e0 = nbodyEnergy(bodies, G, rmin);
    const st = nbodyState(bodies);
    rk4Advance(st, 20, 1e-3, G, rmin);
    const after = bodies.map((b, i) => ({
      mass: b.mass,
      pos: { x: st.x[i], y: st.y[i] },
      vel: { x: st.vx[i], y: st.vy[i] },
    }));
    expect(Math.abs((nbodyEnergy(after, G, rmin) - e0) / e0)).toBeLessThan(
      1e-7
    );
  });
});

describe('the committed thresholds', () => {
  test('state every case, every check, a bound and a reason for each', () => {
    for (const id of ['R1', 'R2', 'R3', 'R4', 'R4x', 'R5', 'R6']) {
      const c = THRESHOLDS.cases[id];
      expect(c).toBeTruthy();
      for (const [name, check] of Object.entries(c.checks)) {
        expect([id, name, check.what, check.reason]).toEqual([
          id,
          name,
          expect.any(String),
          expect.any(String),
        ]);
        expect(check.bound !== undefined).toBe(true);
      }
    }
    expect(THRESHOLDS.conditions.stepStudy.steps).toHaveLength(4);
    // Integer-like keys come out of an object in ascending order.
    expect(Object.keys(THRESHOLDS.conditions.rates).sort()).toEqual([
      '120',
      '30',
      '60',
      'clamp',
    ]);
  });

  test('keep the bounds the case table names', () => {
    const c = THRESHOLDS.cases;
    expect(c.R1.checks.energy.factor).toBe(2);
    expect(c.R1.checks.growth.bound).toBe(1.5);
    expect(c.R1.checks.angularMomentum.bound).toBe(1e-12);
    expect(c.R3.checks.momentum.bound).toBe(1e-12);
    expect(c.R3.checks.barycentre.bound).toBe(1e-9);
    expect(c.R4.checks.energy.bound).toBe(1e-6);
    expect(c.R4.checks.craftDv.bound).toBe(0.01);
    expect(c.R4.checks.momentum.bound).toBe(1e-11);
    expect(c.R4x.checks.energy.bound).toBe(0.02);
    expect(c.R5.checks.position.bound).toBe(0.01);
    expect(c.R5.checks.massSpread.bound).toBe(0.05);
    expect(c.R5.checks.fragmentSpread.bound).toBe(0.2);
    expect(c.R6.checks.deleted.bound).toBe(0);
  });
});

describe('the record', () => {
  const rows = RECORD.rows;
  const byCase = id => rows.filter(r => r.case === id);

  test('holds every case at the four rates, with the step each run took', () => {
    const rates = ['120', '60', '30', 'clamp'];
    const expected = {
      R1: ['energy', 'growth', 'angularMomentum', 'period'],
      R2: ['energy', 'growth', 'angularMomentum', 'apsides', 'period'],
      R3: [
        'energy',
        'growth',
        'angularMomentum',
        'momentum',
        'barycentre',
        'period',
      ],
      R4: ['energy', 'craftDv', 'momentum', 'angularMomentum'],
      R4x: ['energy'],
      R5: ['position'],
    };
    for (const [id, quantities] of Object.entries(expected))
      for (const rate of rates)
        for (const q of quantities)
          expect(rows.find(r => r.id === `${id}.${q}@${rate}`)).toBeTruthy();
    expect(
      byCase('R5')
        .filter(r => r.rate === 'all')
        .map(r => r.quantity)
    ).toEqual(expect.arrayContaining(['massSpread', 'fragmentSpread']));
    for (const id of Object.keys(expected))
      for (const rate of rates) {
        const s = RECORD.steps.find(x => x.case === id && x.rate === rate);
        expect(s.step).toBeGreaterThan(0);
        expect(s.substeps).toBeGreaterThanOrEqual(1);
      }
  });

  test('holds the three tiers for every scenario and the camera at every rate', () => {
    expect(byCase('tiers')).toHaveLength(18);
    expect(byCase('tiers').every(r => r.pass)).toBe(true);
    expect(byCase('R6')).toHaveLength(16);
  });

  test('lists each failing row with its numbers and an empty limit until a change states one', () => {
    const failing = rows.filter(r => !r.pass);
    expect(RECORD.failing.sort()).toEqual(failing.map(r => r.id).sort());
    for (const r of failing) {
      expect(typeof r.limit).toBe('string');
      expect(Number.isFinite(r.value)).toBe(true);
      expect(r.value).toBeGreaterThan(r.bound);
    }
    for (const r of rows.filter(x => x.pass))
      expect(r.value).toBeLessThanOrEqual(r.bound);
  });

  test('holds the step study at four steps for each of the six cases, with the observed order', () => {
    for (const id of ['R1', 'R2', 'R3', 'R4', 'R4x', 'R5']) {
      const s = RECORD.study.filter(x => x.case === id);
      expect(s.map(x => x.label)).toEqual(['1/24', '1/48', '1/96', '1/192']);
      expect(s[0].integrator).toBe(
        id === 'R4' ? 'Velocity Verlet' : 'Symplectic Euler'
      );
      expect(Object.keys(s[0].values).length).toBeGreaterThan(0);
      expect(Object.keys(s[3].order ?? {}).length).toBeGreaterThan(0);
    }
  });
});

describe('the engine, run again in processes of its own', () => {
  const tool = args =>
    execFileSync(process.execPath, ['tools/reference-cases.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });

  test('every judged row comes out as recorded', () => {
    const out = tool(['--jobs', '2']);
    expect(out).toMatch(/# 0 differences from the record/);
    expect(out).not.toMatch(/^DIFF/m);
  }, 300000);

  test('the step study of the cheap cases comes out as recorded', () => {
    const out = tool(['--only', 'R4,R4x,R5', '--study', '--jobs', '2']);
    expect(out).toMatch(/# 0 differences from the record/);
  }, 300000);
});

describe('scene records', () => {
  const all = loadAll();

  test('the sixteen converted sandbox captures are valid records', () => {
    expect(all).toHaveLength(16);
    expect(new Set(all.map(a => a.record.scenario))).toEqual(
      new Set([
        'solar-system',
        'circumbinary-planet-lab',
        'galilean-resonance',
        'star-cluster',
        'black-hole-lab',
      ])
    );
    for (const { file, record } of all) {
      expect([file, problems(record)]).toEqual([file, []]);
      expect(record.format).toBe(SCHEMA);
      expect(record.qualityTier).toBe('full');
      expect(record.paused).toBe(true);
    }
  });

  test('pin the camera in world coordinates: the point at the canvas centre', () => {
    const z = all.find(
      a => a.record.id === 'galilean-resonance-zoomed-midnight-1366'
    ).record;
    expect(z.camera.zoom).toBe(28);
    expect(z.camera.worldCentre.x).toBeCloseTo(-z.camera.pan.x / 28, 12);
    expect(z.camera.worldCentre.y).toBeCloseTo(z.camera.pan.y / 28, 12);
    expect(
      worldCentre({
        zoom: 2,
        pan: { x: 10, y: 4 },
        frameOffset: { x: 1, y: 1 },
      })
    ).toEqual({ x: -4, y: 3 });
  });

  test('the converter reads a sidecar and leaves the lesson captures out', () => {
    const sidecar = {
      file: 'a-solar-system-1366-canvas.png',
      scenarioId: 'solar-system',
      seedGiven: 'r4-before',
      targetSimTime: 10,
      viewport: '1366x800',
      deviceScaleFactor: 1,
      simTime: 10.1665,
      zoom: 0.25,
      pan: { x: 0, y: 0 },
      frameOffset: { x: 0, y: 0 },
      theme: 'midnight',
      tierInForce: 'full',
      seed: 1036648069,
      flags: Object.fromEntries([
        ['follow_mode', 'None'],
        ['show_trails', true],
        ['trail_length', 20],
        ['trail_style', 'Glow'],
        ['trail_color_mode', 'type'],
        ['show_velocity_vectors', false],
        ['show_acceleration_vectors', false],
        ['show_potential_well', false],
        ['show_scale_bar', true],
        ['show_elapsed_time', true],
        ['show_conservation_diagnostics', false],
        ['show_bh_glow', true],
        ['show_accretion_disk', true],
        ['show_bh_jets', false],
        ['show_dynamic_overlays', true],
        ['show_ambient_lighting', true],
        ['show_gravitational_waves', true],
        ['show_object_lensing', true],
        ['integrator', 'Symplectic Euler'],
        ['sim_speed', 1],
        ['max_timestep', 0],
      ]),
      paused: true,
      infoBoxVisible: true,
      commit: 'f9277ff8 (tag v3.0)',
    };
    const lesson = { file: 'lesson-keplers-laws-step1-1366.png', zoom: 1.5 };
    const out = convertSidecars([sidecar, lesson]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('solar-system-midnight-1366');
    expect(out[0].clock.targetSimTime).toBe(10);
    expect(problems(out[0])).toEqual([]);
  });
});
