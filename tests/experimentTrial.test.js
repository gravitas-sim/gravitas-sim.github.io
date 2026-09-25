import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calibrate } from '../js/experiments/trialRunner.js';

// =============================================================================
// One trial, in a realm of its own
// -----------------------------------------------------------------------------
// js/experiments/trialRunner.js is what each experiment Worker does. Run here
// in a fresh Node process - no DOM, its own module instances, the property a
// Worker realm has (tests/workerCompatibility.test.js) - so what is tested is
// the realm, not jsdom's copy of it.
//
// The two hazards these hold, both found building the runner: a rebuild in a
// realm that has built before carries the previous world's numerics
// (js/scenarios.js remembers the last preset), and the engine's body cache
// keeps stepping the discarded bodies unless the world generation is bumped.
// Either one produced trials that ran, reported "ok" and measured nothing.
// =============================================================================

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PRELUDE = `
const load = p => import('${REPO}/' + p);
const m = {
  physics: await load('js/physics.js'),
  build: await load('js/world/build.js'),
  scenarios: await load('js/scenarios.js'),
  appState: await load('js/appState.js'),
  rng: await load('js/rng.js'),
  timestep: await load('js/timestep.js'),
  units: await load('js/units.js'),
};
const R = await load('js/experiments/trialRunner.js');
const manifest = {
  model: { scenario: 'Binary Planet Lab' },
  initial: { settings: {} },
  observables: { metrics: ['distance_to_primary', 'orbital_period', 'energy_drift'], roles: { bodies: ['planet'], primary: 'Star A' } },
  stop: { duration: 20000, events: [] },
  numerics: { frameSeconds: 1 / 60, sampleEvery: 2 },
  limits: { maxSamplesPerTrial: 5000 },
};
const trial = (a, index = 0) => ({ index, params: { binary_lab_planet_a: a }, seed: 'x' });
const out = v => console.log(JSON.stringify(v));
`;

/** Run a snippet after the prelude in a clean realm, and parse what it printed. */
const inRealm = body =>
  JSON.parse(
    execFileSync(
      process.execPath,
      ['--input-type=module', '-e', PRELUDE + body],
      {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
      .trim()
      .split('\n')
      .at(-1)
  );

const strip = r => ({ ...r, wallMs: 0, timing: null });

describe('a trial', () => {
  test('integrates the scenario at its own numerics and measures a real orbit', () => {
    // Sampled every frame: an orbit of about eight frames sampled every other
    // frame aliases, and its period comes out near double (EXPERIMENTS.md).
    const r = inRealm(
      `out(R.runTrial(m, { ...manifest, numerics: { frameSeconds: 1 / 60, sampleEvery: 1 } }, trial(0.1)));`
    );
    expect(r.status).toBe('ok');
    // The scenario caps its step at 1 unit and a frame covers 62.5: 63 substeps.
    expect(r.numerics).toMatchObject({ frameAdvance: 62.5, substeps: 63 });
    expect(r.steps).toBe(r.frames * 63);
    // A planet at 0.1 separations of a 10 AU binary orbits Star A at about 1 AU,
    // in about a year, and conserves energy to better than a thousandth of a
    // per cent: absolute values, so a uniform error cannot divide out.
    expect(r.results.distance_to_primary).toBeGreaterThan(0.9);
    expect(r.results.distance_to_primary).toBeLessThan(1.1);
    expect(r.results.orbital_period).toBeGreaterThan(300);
    expect(r.results.orbital_period).toBeLessThan(420);
    expect(Math.abs(r.results.energy_drift)).toBeLessThan(1e-3);
  });

  test('is the same in a realm that built other worlds first', () => {
    const [fresh, after] = inRealm(`
      const a = R.runTrial(m, manifest, trial(0.2));
      R.engineFingerprint(m);
      R.runTrial(m, manifest, trial(0.35, 1));
      const b = R.runTrial(m, manifest, trial(0.2));
      out([a, b]);
    `);
    expect(strip(after)).toEqual(strip(fresh));
  });

  test('is the same in two realms', () => {
    const body = `out(R.runTrial(m, manifest, trial(0.25)));`;
    expect(strip(inRealm(body))).toEqual(strip(inRealm(body)));
  });

  test('sees the binary shed its planet past the stability boundary', () => {
    const [inside, outside] = inRealm(
      `out([R.runTrial(m, manifest, trial(0.15)), R.runTrial(m, manifest, trial(0.4, 1))]);`
    );
    expect(inside.results.distance_to_primary).toBeLessThan(2);
    expect(outside.results.distance_to_primary).toBeGreaterThan(20);
  });

  test('refuses a setting that does not survive the rebuild, rather than running the wrong world', () => {
    // sim_speed is the scenario's own, stamped by its preset on every build:
    // asked for 10, it comes back 750. (A key the engine does not know would
    // survive untouched and mean nothing; the manifest validator refuses
    // those before a realm ever sees them.)
    const r = inRealm(
      `out(R.runTrial(m, manifest, { index: 0, params: { sim_speed: 10 }, seed: 'x' }));`
    );
    expect(r.status).toBe('buildFailed');
    expect(r.error).toMatch(/did not survive the rebuild/);
  });

  test('stops at an event, and at the sample limit, and says which', () => {
    const [event, capped] = inRealm(`
      const e = R.runTrial(m, { ...manifest, stop: { duration: 20000, events: [{ kind: 'separation-above', au: 5 }] } }, trial(0.4));
      const c = R.runTrial(m, { ...manifest, limits: { maxSamplesPerTrial: 20 } }, trial(0.1));
      out([e, c]);
    `);
    expect(event.stoppedBy).toBe('separation-above');
    expect(event.frames).toBeLessThan(320);
    expect(capped).toMatchObject({
      status: 'capped',
      stoppedBy: 'sample-cap',
      samples: 20,
    });
  });

  test('the engine fingerprint is stable, and changes when the engine does', () => {
    const [a, b, tweaked] = inRealm(`
      const a = R.engineFingerprint(m);
      const b = R.engineFingerprint(m);
      // Nudge the integrator: any change to the arithmetic must show. A proxy
      // over the live module rather than a copy, because the engine reassigns
      // its body lists on a rebuild and a copy would read the old ones.
      const step = m.physics.updatePhysics;
      const physics = new Proxy(m.physics, { get: (t, k) => (k === 'updatePhysics' ? dt => step(dt * 1.000001) : t[k]) });
      const shim = { ...m, physics };
      out([a, b, R.engineFingerprint(shim)]);
    `);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(b).toBe(a);
    expect(tweaked).not.toBe(a);
  });
});

describe('timing a planned world on this device', () => {
  // A stand-in engine and a clock that is slow for the first frames, as a
  // realm is before its engine is compiled.
  const engine = () => {
    const calls = { steps: 0, samples: 0 };
    return {
      calls,
      m: {
        physics: {
          updatePhysics: () => calls.steps++,
          conservedQuantities: () => calls.samples++,
        },
      },
    };
  };
  const plan = { frames: 1000, substeps: 10, step: 1, steps: 10000 };
  const clock = () => {
    let t = 0;
    let calls = 0;
    // The first call is the start; each later one ends a frame.
    return () => (calls++ === 0 ? t : (t += calls <= 6 ? 2 : 1));
  };

  test('takes the rate once warm, and counts the cold start as warm-up', () => {
    const { m, calls } = engine();
    const c = calibrate(m, plan, 2, { now: clock(), budgetMs: 20 });
    // Five frames at 2 ms reach the half; ten at 1 ms reach the budget.
    expect(c.steps).toBe(150);
    expect(c.ms).toBe(20);
    expect(c.stepsPerMs).toBe(10);
    // The cold half took 10 ms for what the warm rate does in 5.
    expect(c.warmupMs).toBe(5);
    expect(c.complete).toBe(false);
    // It stepped the world it was given, and sampled it as the trial will.
    expect(calls.steps).toBe(150);
    expect(calls.samples).toBe(7);
  });

  test('a trial short enough to finish is simply timed', () => {
    const { m } = engine();
    const short = { ...plan, frames: 3, steps: 30 };
    const c = calibrate(m, short, 1, { now: clock(), budgetMs: 20 });
    expect(c).toEqual({
      steps: 30,
      ms: 6,
      stepsPerMs: 5,
      warmupMs: 0,
      complete: true,
    });
  });

  test('a clock too coarse to see the burst times nothing', () => {
    const { m } = engine();
    const c = calibrate(m, { ...plan, frames: 5, steps: 50 }, 1, {
      now: () => 0,
    });
    expect(c.stepsPerMs).toBe(null);
  });

  test('in a realm, the real engine is timed at a believable rate', () => {
    const c = inRealm(`
      const plan = R.planTrial(m, manifest, trial(0.1));
      out(R.calibrate(m, plan, 2, { now: () => performance.now(), budgetMs: 80 }));
    `);
    // Tens of thousands of steps a second at the very least, on any machine
    // that runs the suite; far fewer would mean it timed something else.
    expect(c.stepsPerMs).toBeGreaterThan(5);
    expect(c.steps).toBeGreaterThan(0);
    expect(c.warmupMs).toBeGreaterThanOrEqual(0);
    expect(c.ms).toBeGreaterThanOrEqual(80);
  });
});
