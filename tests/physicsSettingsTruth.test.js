// =============================================================================
// What the physics side of the settings is, today
// -----------------------------------------------------------------------------
// Prompt 107, step 2c, sub-item (b), audited and left as it is (D-DECOMP-14).
// js/physics.js keeps its own copy of the settings it reads, `physicsSettings`,
// and a world build, the Apply button, a save load and a share link each push
// the interface's SETTINGS into it with updatePhysicsSettings(). Making that
// copy a live view of SETTINGS would change what physics sees: a write made
// after a build misses it today, on purpose (PHYSICS_VALIDATION.md leans on
// it), and the engine may not import the interface's state module.
//
// So this file does not change anything. It writes the present behavior down,
// so a later pass has something to be identical to:
//
//   - the physics-side copy after a world build, for every scenario, with and
//     without the settings a share link carries (a golden of hashes);
//   - a write to SETTINGS after the build does not reach physics until a push;
//   - a push merges over the copy and never replaces it;
//   - the keys the engine starts with that the interface's defaults lack, and
//     the two the interface and the engine disagree on (G is 2 and 1);
//   - a push also hands G to js/units.js.
//
// UPDATE_PHYSICS_SETTINGS_GOLDEN=1 rewrites the golden; do that only from a
// base whose behavior is the reference.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync } from 'node:fs';

import * as physics from '../js/physics.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { SCENARIO_IDS } from '../js/scenarios.js';
import { timeUnitSeconds } from '../js/units.js';
import { digest, fnv, num } from './scenarioDigest.js';

// First thing, before any push: what the engine answers with before a world
// exists (this file has its own module registry, so nothing has run yet).
const BOOTSTRAP = JSON.parse(JSON.stringify(physics.physicsSettings));

const GOLDEN_FILE = 'tests/fixtures/physicsSettingsGolden.json';
const SEED = 7;
const SHARED = {
  gravitational_constant: 3,
  mutual_gravity: true,
  trail_length: 33,
  bh_behavior: 'Orbiting',
};

/** The copy, as a string that compares: sorted keys, 12 significant figures. */
const snapshot = () =>
  Object.keys(physics.physicsSettings)
    .sort()
    .map(k => {
      const v = physics.physicsSettings[k];
      return `${k}=${typeof v === 'number' ? num(v) : JSON.stringify(v)}`;
    })
    .join('\n');

describe('the physics-side copy after a world build', () => {
  // Scenarios build one after another in one module instance, as the page
  // does; the order is the registry's, so each case is reproducible.
  const current = {};
  for (const id of SCENARIO_IDS) {
    digest(id, SEED);
    const base = snapshot();
    digest(id, SEED, SHARED);
    current[id] = { base: fnv(base), shared: fnv(snapshot()) };
  }

  test('every scenario matches the golden, with and without shared settings', () => {
    if (process.env.UPDATE_PHYSICS_SETTINGS_GOLDEN === '1') {
      digest('binary-bh', SEED);
      writeFileSync(
        GOLDEN_FILE,
        JSON.stringify(
          { seed: SEED, shared: SHARED, example: snapshot(), cases: current },
          null,
          2
        ) + '\n'
      );
    }
    const golden = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8'));
    expect(golden.seed).toBe(SEED);
    expect(golden.shared).toEqual(SHARED);
    expect(Object.keys(golden.cases)).toEqual([...SCENARIO_IDS]);
    expect(current).toEqual(golden.cases);
  });

  test('one build in full, so a mismatch above can be read', () => {
    const golden = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8'));
    digest('binary-bh', SEED);
    expect(snapshot()).toBe(golden.example);
  });

  test('the shared settings reached physics where the scenario had none', () => {
    digest('binary-bh', SEED, SHARED);
    expect(physics.physicsSettings.gravitational_constant).toBe(3);
    expect(physics.physicsSettings.mutual_gravity).toBe(true);
    expect(physics.physicsSettings.trail_length).toBe(33);
    expect(physics.physicsSettings.bh_behavior).toBe('Orbiting');
  });
});

describe('a push, and only a push, moves the copy', () => {
  test('a write after the build misses physics until the next push', () => {
    const live = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    physics.updatePhysicsSettings(live);
    const before = snapshot();
    live.mutual_gravity = !live.mutual_gravity;
    live.max_timestep = 0.123;
    expect(snapshot()).toBe(before);
    physics.updatePhysicsSettings(live);
    expect(physics.physicsSettings.mutual_gravity).toBe(live.mutual_gravity);
    expect(physics.physicsSettings.max_timestep).toBe(0.123);
  });

  test('a push merges over the copy and never replaces it', () => {
    physics.updatePhysicsSettings({ ...DEFAULT_SETTINGS });
    physics.updatePhysicsSettings({ trail_length: 5 });
    expect(physics.physicsSettings.trail_length).toBe(5);
    // Everything else the earlier push set is still there.
    expect(physics.physicsSettings.gravitational_constant).toBe(
      DEFAULT_SETTINGS.gravitational_constant
    );
    expect(physics.physicsSettings.integrator).toBe(
      DEFAULT_SETTINGS.integrator
    );
  });

  test('a key the interface never defined survives a push of the interface', () => {
    physics.updatePhysicsSettings({ not_a_setting_here: 41 });
    physics.updatePhysicsSettings({ ...DEFAULT_SETTINGS });
    expect(physics.physicsSettings.not_a_setting_here).toBe(41);
    delete physics.physicsSettings.not_a_setting_here;
  });

  test('a push hands G to the units module', () => {
    physics.updatePhysicsSettings({ gravitational_constant: 1 });
    const t1 = timeUnitSeconds();
    physics.updatePhysicsSettings({ gravitational_constant: 4 });
    const t4 = timeUnitSeconds();
    // The unit of time follows G (as sqrt(G): four times G, twice the unit).
    expect(t4 / t1).toBeCloseTo(2, 12);
    physics.updatePhysicsSettings({
      gravitational_constant: DEFAULT_SETTINGS.gravitational_constant,
    });
  });
});

describe('two sets of defaults', () => {
  test('the engine starts with 27 keys, and a G of 1 where the application has 2', () => {
    expect(Object.keys(BOOTSTRAP).length).toBe(27);
    expect(BOOTSTRAP.gravitational_constant).toBe(1);
    expect(DEFAULT_SETTINGS.gravitational_constant).toBe(2);
  });

  test('the keys where the two disagree are exactly these', () => {
    const disagree = Object.keys(BOOTSTRAP)
      .filter(
        k =>
          Object.hasOwn(DEFAULT_SETTINGS, k) &&
          JSON.stringify(BOOTSTRAP[k]) !== JSON.stringify(DEFAULT_SETTINGS[k])
      )
      .sort();
    expect(disagree).toEqual(['gravitational_constant', 'trail_length']);
  });

  test('the engine key the application has no default for', () => {
    expect(
      Object.keys(BOOTSTRAP)
        .filter(k => !Object.hasOwn(DEFAULT_SETTINGS, k))
        .sort()
    ).toEqual(['dark_matter_halo']);
  });
});
