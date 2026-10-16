// =============================================================================
// A recorded drift is measured at the sample it sits in
// -----------------------------------------------------------------------------
// physics.js caches the conserved totals behind conservationDrift() and
// refreshes them at most every 100 ms of wall time, because the on-screen
// readout repaints sixty times a second and the potential is an O(N^2) sum.
// The bench used that cached drift for its samples, beside a total_energy it
// measured fresh every time. At 60 fps that made the drift column a staircase:
// the same value for about six samples, then a jump. Five rows in six had a
// total_energy and an energy_drift that described different instants, and the
// run's "final" drift could be several frames older than the sample it was
// reported from.
//
// So this drives the bench's own recording loop - startRun, the
// requestAnimationFrame sampler, stopRun - on a real world, with the wall
// clock advancing exactly a sixtieth of a second per frame, and asserts the
// value itself: every sample's energy_drift is 100 * (E - E0) / |E0| computed
// from that sample's own total_energy. A ratio between two runs could not see
// this; two runs sampled on the same clock are stale by the same amount.
//
// Measured through the bench in Chromium before the fix, with the same clock:
// Binary Planet Lab repeated its energy drift on 199 of 240 samples, Kepler's
// 2nd Law on 200 of 240, and Kepler's final drift was four samples old.
// =============================================================================

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  jest,
} from '@jest/globals';
import * as physics from '../js/physics.js';
import * as bench from '../js/experiments/bench.js';
import { buildWorld } from '../js/world/build.js';
import { applyPreset, resetPresetMemory } from '../js/scenarios.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { withSeed, normalizeSeed } from '../js/rng.js';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import { METRICS } from '../js/experiments/metrics.js';

const FRAMES = 60;
const FRAME_MS = 1000 / 60;
const noop = () => {};

// The wall clock the drift cache reads, one sixtieth of a second per frame
// however long a frame of this test really takes. A slow machine would
// otherwise let the cache expire between samples and hide the staircase.
let wall = 0;
let queued = [];
let saved;

beforeAll(() => {
  saved = {
    raf: global.requestAnimationFrame,
    caf: global.cancelAnimationFrame,
  };
  jest.spyOn(performance, 'now').mockImplementation(() => wall);
  global.requestAnimationFrame = cb => {
    queued.push(cb);
    return queued.length;
  };
  global.cancelAnimationFrame = () => {
    queued = [];
  };
});

afterAll(() => {
  jest.restoreAllMocks();
  global.requestAnimationFrame = saved.raf;
  global.cancelAnimationFrame = saved.caf;
});

/** Build the scenario the settings name, and finish the reset as ui.js does. */
function build(settings, state) {
  withSeed(normalizeSeed('experiment-drift-sampling'), () =>
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => null,
      setScenarioName: noop,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    })
  );
  physics.bumpWorldGeneration();
  physics.resetSimulationTime();
  physics.resetAbsorptionAccounting();
  physics.resetConservationBaseline();
}

/** One animation frame: the render loop integrates, then the sampler runs. */
function frame(plan) {
  wall += FRAME_MS;
  for (let i = 0; i < plan.substeps; i++) physics.updatePhysics(plan.step);
  const due = queued;
  queued = [];
  for (const cb of due) cb(wall);
}

/** What the drift of a total is, from the baseline the engine holds. */
const percentOf = (total, base) => (100 * (total - base)) / Math.abs(base);

describe.each(['Binary Planet Lab', "Kepler's 2nd Law"])('%s', scenario => {
  let settings;
  let plan;

  beforeAll(() => {
    resetPresetMemory();
    settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    settings.preset_scenario = scenario;
    const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
    build(settings, state);
    plan = substepPlan(
      frameAdvance(1 / 60, settings.sim_speed, physics.DT),
      settings.max_timestep
    );
    // Enough of a host for a recorded run: the captured start carries the
    // live clock, so startRun has nothing to restore.
    const payload = () => ({
      s: scenario,
      seed: 'experiment-drift-sampling',
      x: { clock: physics.getSimulationTime() },
    });
    bench.initBench({
      captureShareState: payload,
      applyShareState: noop,
      getSettings: () => settings,
      getScenario: () => scenario,
      getState: () => state,
      getDefaults: () => DEFAULT_SETTINGS,
      setFixedStep: noop,
    });
  });

  test('the cache the bench no longer reads is a staircase at 60 fps', () => {
    // The control for everything below: under this clock the cached drift
    // really does hold one value across several frames, so a bench that read
    // it would fail the tests that follow.
    const cached = [];
    for (let f = 0; f < FRAMES; f++) {
      frame(plan);
      cached.push(physics.conservationDrift().energyDrift);
    }
    const repeats = cached.filter((v, i) => i > 0 && v === cached[i - 1]);
    expect(repeats.length).toBeGreaterThanOrEqual(FRAMES / 2);
  });

  test("every sample's drift is its own total's, to the last bit", () => {
    const exp = bench.captureExperiment('fresh drift');
    exp.metrics = [
      METRICS.TOTAL_ENERGY,
      METRICS.ANGULAR_MOMENTUM,
      METRICS.ENERGY_DRIFT,
      METRICS.ANGULAR_DRIFT,
    ];
    expect(bench.startRun('A')).toBe(true);
    for (let f = 0; f < FRAMES; f++) frame(plan);
    const run = bench.stopRun();
    const samples = run.samples;
    expect(samples).toHaveLength(FRAMES);

    const now = physics.conservationDrift(true);
    const e0 = now.baselineEnergy;
    const l0 = now.baselineAngular;
    expect(now.energyConditioned).toBe(true);
    expect(now.angularConditioned).toBe(true);

    // The indices of samples whose drift was measured at some other instant,
    // so a failure says how many and where rather than only "not equal".
    const staleEnergy = [];
    const staleAngular = [];
    samples.forEach((s, i) => {
      if (s[METRICS.ENERGY_DRIFT] !== percentOf(s[METRICS.TOTAL_ENERGY], e0)) {
        staleEnergy.push(i);
      }
      if (
        s[METRICS.ANGULAR_DRIFT] !== percentOf(s[METRICS.ANGULAR_MOMENTUM], l0)
      ) {
        staleAngular.push(i);
      }
    });
    expect(staleEnergy).toEqual([]);
    expect(staleAngular).toEqual([]);

    // And not a staircase: the energy moves every frame, so must its drift.
    const drift = samples.map(s => s[METRICS.ENERGY_DRIFT]);
    const repeats = drift.filter((v, i) => i > 0 && v === drift[i - 1]);
    expect(repeats).toEqual([]);

    // The run's final drift is the last sample's, which is the world as it
    // stands now - nothing has moved since the last frame.
    const last = samples[samples.length - 1];
    expect(last.t).toBe(physics.getSimulationTime());
    expect(run.results[METRICS.ENERGY_DRIFT].value).toBe(now.energyDrift);
    expect(run.results[METRICS.ANGULAR_DRIFT].value).toBe(now.angularDrift);
    expect(run.results[METRICS.TOTAL_ENERGY].value).toBe(now.energy);
  });

  test('a drift alone is measured fresh, and the totals are not recorded', () => {
    const exp = bench.captureExperiment('drift only');
    exp.metrics = [METRICS.ENERGY_DRIFT];
    expect(bench.startRun('A')).toBe(true);
    for (let f = 0; f < FRAMES; f++) frame(plan);
    const run = bench.stopRun();
    const now = physics.conservationDrift(true);
    expect(run.results[METRICS.ENERGY_DRIFT].value).toBe(now.energyDrift);
    for (const s of run.samples) {
      expect(s).not.toHaveProperty(METRICS.TOTAL_ENERGY);
      expect(typeof s[METRICS.ENERGY_DRIFT]).toBe('number');
    }
  });
});
