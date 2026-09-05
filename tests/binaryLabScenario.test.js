import { applyPreset, resetPresetMemory } from '../js/scenarios.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';

// =============================================================================
// The investigation's independent variables have to survive a rebuild.
// -----------------------------------------------------------------------------
// Changing where the planet starts and running it again IS the experiment, and
// a rebuild goes through applyPreset, which re-stamps a scenario's settings
// block. The first version of this shipped without the carry below, and the
// symptom was perfectly quiet: every configuration a student tried produced
// the same run, because the value they typed was overwritten between pressing
// the button and the world being built.
// =============================================================================

const fresh = () => JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
const load = (settings, name) => {
  settings.preset_scenario = name;
  applyPreset(settings, DEFAULT_SETTINGS, { paused: false });
  return settings;
};

beforeEach(resetPresetMemory);

describe('entering a lab', () => {
  test('the circumstellar lab opens at its documented configuration', () => {
    const s = load(fresh(), 'Binary Planet Lab');
    expect(s.binary_lab_planet_a).toBe(0.15);
    expect(s.binary_lab_periods).toBe(20);
    expect(s.max_timestep).toBe(1.0);
    expect(s.integrator).toBe('Velocity Verlet');
    expect(s.num_stars).toBe(2);
    expect(s.num_planets).toBe(1);
    expect(s.enable_star_merging).toBe(false);
  });

  test('the circumbinary lab opens further out and runs longer', () => {
    const s = load(fresh(), 'Circumbinary Planet Lab');
    expect(s.binary_lab_planet_a).toBe(4.0);
    expect(s.binary_lab_periods).toBe(40);
    expect(s.max_timestep).toBe(2.0);
  });

  test('both labs describe the same binary', () => {
    const a = load(fresh(), 'Binary Planet Lab');
    const b = load(fresh(), 'Circumbinary Planet Lab');
    for (const key of [
      'binary_lab_m1',
      'binary_lab_m2',
      'binary_lab_separation',
      'binary_lab_eccentricity',
      'binary_lab_binary_phase',
      'binary_lab_planet_phase',
      'gravitational_constant',
    ]) {
      expect(a[key]).toBe(b[key]);
    }
  });
});

describe('re-running a lab', () => {
  test('a chosen starting radius survives the rebuild', () => {
    const s = load(fresh(), 'Binary Planet Lab');
    s.binary_lab_planet_a = 0.3;
    s.binary_lab_periods = 40;
    s.max_timestep = 0.25;
    load(s, 'Binary Planet Lab');
    expect(s.binary_lab_planet_a).toBe(0.3);
    expect(s.binary_lab_periods).toBe(40);
    expect(s.max_timestep).toBe(0.25);
  });

  test('everything else still resets, so only the variables are variable', () => {
    const s = load(fresh(), 'Binary Planet Lab');
    s.binary_lab_planet_a = 0.3;
    s.show_trails = false;
    s.integrator = 'RK4';
    s.binary_lab_eccentricity = 0.9;
    load(s, 'Binary Planet Lab');
    expect(s.binary_lab_planet_a).toBe(0.3);
    expect(s.show_trails).toBe(true);
    expect(s.integrator).toBe('Velocity Verlet');
    expect(s.binary_lab_eccentricity).toBe(0.4);
  });
});

describe('switching between the labs', () => {
  test('a circumstellar radius is not carried into the circumbinary lab', () => {
    // 0.15 separations is a fine circumstellar orbit and a position inside
    // both stars.
    const s = load(fresh(), 'Binary Planet Lab');
    s.binary_lab_planet_a = 0.15;
    load(s, 'Circumbinary Planet Lab');
    expect(s.binary_lab_planet_a).toBe(4.0);
    expect(s.max_timestep).toBe(2.0);
  });

  test('leaving for another scenario and coming back resets the lab', () => {
    const s = load(fresh(), 'Binary Planet Lab');
    s.binary_lab_planet_a = 0.3;
    load(s, 'Solar System');
    load(s, 'Binary Planet Lab');
    expect(s.binary_lab_planet_a).toBe(0.15);
  });

  test('an unrelated scenario is untouched by any of this', () => {
    const s = load(fresh(), 'Binary Planet Lab');
    s.max_timestep = 0.25;
    load(s, 'Solar System');
    load(s, 'Solar System');
    expect(s.max_timestep).toBe(DEFAULT_SETTINGS.max_timestep);
  });
});
