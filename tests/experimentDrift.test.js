// =============================================================================
// The bench's drift metrics, measured on a real run
// -----------------------------------------------------------------------------
// From the day the bench shipped until this test was written, its energy drift
// and angular-momentum drift were not drifts. sampleFrame() read `energy` and
// `angular` from physics.js:conservationDrift() as fractions of the baseline,
// but those two fields are the engine's current totals, so every recorded
// "drift" was the total energy or angular momentum times a hundred. On the run
// below that is -25001.44 "%" for a true drift of 0.00017%.
//
// Nothing caught it, because nothing asked how big the number was. The
// reliability check compared the coarse run's "drift" with the fine run's, and
// two totals agree beautifully: a ratio divides out an error that is the same
// in both. So this runs the real engine and asserts the value itself.
//
// Binary Planet Lab with the planet at 0.2 separations, stepped 3,150 frames
// of the scenario's own step, is the run the bug was found on.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import * as physics from '../js/physics.js';
import { buildWorld } from '../js/world/build.js';
import { applyPreset, resetPresetMemory } from '../js/scenarios.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { withSeed, normalizeSeed } from '../js/rng.js';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import { timeUnitSeconds } from '../js/units.js';
import { METRICS, sampleFrame } from '../js/experiments/metrics.js';

const FRAMES = 3150;
const noop = () => {};

/** Build the scenario the settings name, and finish the reset as ui.js does. */
function build(settings, state) {
  withSeed(normalizeSeed('experiment-drift'), () =>
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
  // buildWorld leaves these to js/ui.js:initialize_simulation. Without the
  // baseline reset the drift would be measured from the previous world.
  physics.bumpWorldGeneration();
  physics.resetSimulationTime();
  physics.resetAbsorptionAccounting();
  physics.resetConservationBaseline();
}

let run;

beforeAll(() => {
  resetPresetMemory();
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
  settings.preset_scenario = 'Binary Planet Lab';
  build(settings, state);
  // A lab carries its own variables across a rebuild of itself, which is how
  // the planet is moved: set, then rebuild the same scenario.
  settings.preset_scenario = 'Binary Planet Lab';
  settings.binary_lab_planet_a = 0.2;
  build(settings, state);

  const plan = substepPlan(
    frameAdvance(1 / 60, settings.sim_speed, physics.DT),
    settings.max_timestep
  );
  const start = physics.conservedQuantities();
  for (let f = 0; f < FRAMES; f++) {
    for (let i = 0; i < plan.substeps; i++) physics.updatePhysics(plan.step);
  }
  const end = physics.conservedQuantities();

  // Exactly what the bench hands sampleFrame: the engine's drift object,
  // passed through whole.
  const sample = sampleFrame({
    t: physics.getSimulationTime(),
    bodies: [],
    conserved: end,
    drift: physics.conservationDrift(true),
    secondsPerUnit: timeUnitSeconds(),
    metrics: [
      METRICS.TOTAL_ENERGY,
      METRICS.ANGULAR_MOMENTUM,
      METRICS.ENERGY_DRIFT,
      METRICS.ANGULAR_DRIFT,
    ],
  });
  run = { settings, plan, start, end, sample };
}, 60_000);

describe('the drift a bench run records', () => {
  test('comes from the run the numbers below are about', () => {
    expect(run.settings.binary_lab_planet_a).toBe(0.2);
    expect(run.settings.integrator).toBe('Velocity Verlet');
    expect(run.plan.step).toBeCloseTo(0.992, 3);
    expect(physics.stars.length + physics.planets.length).toBe(3);
  });

  test('is small in absolute terms, not only in comparison', () => {
    // Velocity Verlet over this run loses 0.00017% of the energy and keeps
    // angular momentum to rounding. The bug recorded -25001.44 and 37416573.9.
    expect(Math.abs(run.sample[METRICS.ENERGY_DRIFT])).toBeLessThan(1e-2);
    expect(Math.abs(run.sample[METRICS.ANGULAR_DRIFT])).toBeLessThan(1e-2);
  });

  test('is the change in the total as a percentage of where it started', () => {
    const energy =
      (100 * (run.end.energy - run.start.energy)) / Math.abs(run.start.energy);
    const angular =
      (100 * (run.end.angular - run.start.angular)) /
      Math.abs(run.start.angular);
    // Big enough that a fraction, a hundred times smaller, cannot pass for it.
    expect(Math.abs(energy)).toBeGreaterThan(1e-5);
    expect(run.sample[METRICS.ENERGY_DRIFT]).toBeCloseTo(energy, 12);
    expect(run.sample[METRICS.ANGULAR_DRIFT]).toBeCloseTo(angular, 12);
  });

  test('sits beside the totals it was computed from, not in their place', () => {
    expect(run.sample[METRICS.TOTAL_ENERGY]).toBe(run.end.energy);
    expect(run.sample[METRICS.ANGULAR_MOMENTUM]).toBe(run.end.angular);
    expect(run.end.energy).toBeLessThan(-100);
  });
});
