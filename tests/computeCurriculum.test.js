import { describe, test, expect } from '@jest/globals';
import './computeSetup.js';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { entryOf } from '../js/compute/catalogue.js';
import { checkInput } from '../js/compute/prepare.js';

// =============================================================================
// The computational-astrophysics notebooks (Roadmap II Prompt 102)
// -----------------------------------------------------------------------------
// What these hold that the catalogue's own tests do not:
//
//  - the two new input kinds are checked for the shape the notebooks read, and
//    refuse what they cannot honestly read;
//  - the integrators notebook agrees with Gravitas's own engine. The notebook's
//    symplectic Euler, velocity Verlet and RK4 are the engine's three schemes,
//    so the engine, run here in a fresh process at the notebook's step for the
//    notebook's number of steps, must give the energy drift the notebook gave.
//    The time scales are worked out again here, from the file, not read from
//    the notebook's answer, so a wrong step in the notebook shows. Absolute
//    values, because a ratio would divide out a uniform error;
//  - the population notebook's bound fraction is the share of the experiment's
//    trials that stayed within the cutoff, counted again here.
// =============================================================================

const read = p => readFileSync(p, 'utf8');
const answer = id =>
  JSON.parse(read(`tests/fixtures/compute/${id}.answer.json`));
const quantity = (id, q) =>
  JSON.parse(answer(id).envelope).quantities.find(x => x.id === q);

describe('the two new kinds of input', () => {
  const sys = entryOf('integrators-compared');
  const res = entryOf('population-at-scale');
  const sysText = read(sys.input.example.path);
  const resText = read(res.input.example.path);
  const code = (e, x) =>
    checkInput(e, typeof x === 'string' ? x : JSON.stringify(x)).code;

  test('accept the examples Gravitas wrote', () => {
    expect(checkInput(sys, sysText).ok).toBe(true);
    expect(checkInput(res, resText).ok).toBe(true);
  });

  test('refuse another format, another version and a file that is not JSON', () => {
    const s = JSON.parse(sysText);
    expect(code(sys, '{')).toBe('input-not-json');
    expect(code(sys, resText)).toBe('input-format');
    expect(code(sys, { ...s, version: 2 })).toBe('input-format');
    expect(code(res, sysText)).toBe('input-format');
    expect(code(res, '[]')).toBe('input-format');
  });

  test('a system needs its initial state, whole', () => {
    const s = JSON.parse(sysText);
    const { initial, ...elementsOnly } = s;
    expect(initial.bodies).toHaveLength(3);
    expect(code(sys, elementsOnly)).toBe('input-invalid');
    expect(code(sys, { ...s, initial: { ...initial, G: 0 } })).toBe(
      'input-invalid'
    );
    expect(
      code(sys, {
        ...s,
        initial: { ...initial, bodies: initial.bodies.slice(1) },
      })
    ).toBe('input-invalid');
    const noMass = initial.bodies.map((b, i) => (i ? b : { ...b, mass: 0 }));
    expect(code(sys, { ...s, initial: { ...initial, bodies: noMass } })).toBe(
      'input-invalid'
    );
    const hole = initial.bodies.map((b, i) => (i ? b : { ...b, vx: null }));
    expect(code(sys, { ...s, initial: { ...initial, bodies: hole } })).toBe(
      'input-invalid'
    );
  });

  test('a result needs its manifest and a list of trials', () => {
    const r = JSON.parse(resText);
    expect(r.trials).toHaveLength(20);
    expect(code(res, { ...r, manifest: undefined })).toBe('input-invalid');
    expect(code(res, { ...r, trials: [] })).toBe('input-invalid');
    expect(code(res, { ...r, trials: [{ status: 'ok' }] })).toBe(
      'input-invalid'
    );
    expect(code(res, { ...r, trials: 'x' })).toBe('input-invalid');
  });
});

describe('the integrators notebook against the engine', () => {
  const e = entryOf('integrators-compared');
  const file = JSON.parse(read(e.input.example.path));

  // The time scales, again, from the file alone (the notebook's notebook-side
  // definitions, restated: the tightest pair's circular period over `steps`
  // for the step, and `orbits` of the widest orbit about the barycenter).
  const { G, bodies } = file.initial;
  const M = bodies.reduce((s, b) => s + b.mass, 0);
  let best = null;
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(
        bodies[i].x - bodies[j].x,
        bodies[i].y - bodies[j].y
      );
      if (!best || d < best.d) best = { i, j, d };
    }
  const mu = G * (bodies[best.i].mass + bodies[best.j].mass);
  const tShort = 2 * Math.PI * Math.sqrt(best.d ** 3 / mu);
  const cx = bodies.reduce((s, b) => s + b.mass * b.x, 0) / M;
  const cy = bodies.reduce((s, b) => s + b.mass * b.y, 0) / M;
  const rFar = Math.max(...bodies.map(b => Math.hypot(b.x - cx, b.y - cy)));
  const tLong = 2 * Math.PI * Math.sqrt(rFar ** 3 / (G * M));
  const dt = tShort / 500;
  const steps = Math.ceil((3 * tLong) / dt);

  test('takes the steps this restatement takes', () => {
    expect(steps).toBe(quantity('integrators-compared', 'steps').value);
    expect(steps).toBe(10722);
  });

  test('symplectic Euler, velocity Verlet and RK4 drift exactly as the engine says', () => {
    const script = `
      const R = '${process.cwd()}/';
      const P = await import(R + 'js/physics.js');
      const spec = await import(R + 'js/systemSpec.js');
      const app = await import(R + 'js/appState.js');
      const fs = await import('node:fs');
      const file = JSON.parse(fs.readFileSync(R + '${e.input.example.path}', 'utf8'));
      const verdict = spec.validateSystem({ bodies: file.bodies });
      const built = spec.buildSystem(verdict.bodies, { G: app.DEFAULT_SETTINGS.gravitational_constant });
      const classes = { Star: P.StarObject, Planet: P.Planet, GasGiant: P.GasGiant };
      // Read each time: physics.js reassigns its body arrays when it rebuilds.
      const list = type => ({ Star: P.stars, Planet: P.planets, GasGiant: P.gas_giants })[type];
      const out = {};
      for (const [key, integrator] of [['symplectic', 'Symplectic Euler'], ['verlet', 'Velocity Verlet'], ['rk4', 'RK4']]) {
        for (const l of [P.stars, P.planets, P.gas_giants, P.bh_list]) l.length = 0;
        P.updatePhysicsSettings({ ...app.DEFAULT_SETTINGS, integrator });
        for (const b of built.bodies)
          list(b.type).push(new classes[b.type]({ ...b.pos }, { ...b.vel }, b.constructorMass));
        P.bumpWorldGeneration();
        P.resetConservationBaseline();
        for (let i = 0; i < ${steps}; i++) P.updatePhysics(${dt});
        out[key] = P.conservationDrift(true).energyDrift;
      }
      console.log(JSON.stringify(out));
    `;
    const engine = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .trim()
        .split('\n')
        .at(-1)
    );
    for (const key of ['symplectic', 'verlet', 'rk4']) {
      const notebook = quantity('integrators-compared', `drift.${key}`).value;
      // Absolute, and tight: the two codes do the same arithmetic.
      expect(Math.abs(engine[key] - notebook)).toBeLessThan(
        Math.max(1e-6 * Math.abs(notebook), 1e-12)
      );
    }
    // The values themselves, so two agreeing wrong answers would still fail:
    // second order and bounded for the two symplectic-family schemes, and RK4
    // four orders better.
    expect(Math.abs(engine.symplectic)).toBeLessThan(0.01);
    expect(Math.abs(engine.verlet)).toBeLessThan(0.01);
    expect(Math.abs(engine.rk4)).toBeLessThan(1e-6);
  });

  test('explicit Euler gains energy where the others do not', () => {
    expect(
      quantity('integrators-compared', 'drift.euler').value
    ).toBeGreaterThan(10);
  });
});

describe('the population notebook against the trials', () => {
  test('its bound fraction is the share of trials within three starting distances', () => {
    const r = JSON.parse(
      read(entryOf('population-at-scale').input.example.path)
    );
    const key = r.manifest.vary[0].parameter;
    const sorted = [...r.trials].sort((a, b) => a.params[key] - b.params[key]);
    const few = sorted.slice(0, 4);
    const ratios = few.map(t => t.results.distance_to_primary / t.params[key]);
    ratios.sort((a, b) => a - b);
    const scale = (ratios[1] + ratios[2]) / 2;
    const bound = sorted.filter(
      t =>
        t.status === 'ok' &&
        t.results.distance_to_primary <= 3 * scale * t.params[key]
    ).length;
    expect(bound).toBe(12);
    expect(quantity('population-at-scale', 'bound.sample').value).toBeCloseTo(
      bound / sorted.length,
      12
    );
    // The edge the fit finds is past the last planet that stayed (planets
    // just inside it were thrown out and others stayed, so the data are not
    // a clean step) and before the first of the unbroken run that left.
    const isBound = t =>
      t.status === 'ok' &&
      t.results.distance_to_primary <= 3 * scale * t.params[key];
    const lastBound = Math.max(
      ...sorted.filter(isBound).map(t => t.params[key])
    );
    const firstGone = Math.min(
      ...sorted
        .filter(t => !isBound(t) && t.params[key] > lastBound)
        .map(t => t.params[key])
    );
    const crit = quantity('population-at-scale', 'a.crit').value;
    expect(crit).toBeGreaterThan(lastBound);
    expect(crit).toBeLessThan(firstGone);
  });

  test('every number it returns carries an uncertainty or says it has none', () => {
    const env = JSON.parse(answer('population-at-scale').envelope);
    for (const q of env.quantities)
      expect(['sigma', 'none']).toContain(q.uncertainty.kind);
    const extended = env.quantities.find(q => q.id === 'bound.extended');
    expect(extended.uncertainty.sigma).toBeGreaterThan(0.02);
    expect(extended.uncertainty.sigma).toBeLessThan(0.2);
  });
});
