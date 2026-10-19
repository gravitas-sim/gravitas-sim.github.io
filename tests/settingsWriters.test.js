// =============================================================================
// One settings truth (Prompt 140)
// -----------------------------------------------------------------------------
// The engine keeps a frozen copy of the settings and takes it from one door.
// The page's writers all go through commitSettings() in js/appState.js, each
// under a name from SETTINGS_WRITERS; a Worker, a tool, a test and the
// validation suite are the named headless context, whose G = 1 fixtures are
// unchanged. This file holds the table equal to the call sites, and checks
// that the engine receives the whole of SETTINGS on every named path.
// =============================================================================

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import * as physics from '../js/physics.js';
import { getEngineContext } from '../js/engine/state.js';
import {
  SETTINGS,
  DEFAULT_SETTINGS,
  SETTINGS_WRITERS,
  commitSettings,
  registerSettingsReceiver,
  setSettings,
  setScenarioName,
} from '../js/appState.js';
import { buildWorld } from '../js/world/build.js';
import { applyPreset } from '../js/scenarios.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const clone = o => JSON.parse(JSON.stringify(o));

const sources = () => {
  const out = {};
  const walk = dir => {
    for (const e of readdirSync(path.join(ROOT, dir), {
      withFileTypes: true,
    })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.m?js$/.test(e.name))
        out[rel] = readFileSync(path.join(ROOT, rel), 'utf8');
    }
  };
  walk('js');
  return out;
};

// js/world.js says who takes the page's settings; this file has no page.
registerSettingsReceiver(physics.updatePhysicsSettings);

beforeEach(() => {
  setSettings(clone(DEFAULT_SETTINGS));
});

describe('the table of writers', () => {
  const js = sources();
  const used = new Set();
  for (const text of Object.values(js))
    for (const m of text.matchAll(/commitSettings\(\s*'([\w-]+)'/g))
      used.add(m[1]);

  test('every named writer is called from somewhere, and every call is named', () => {
    expect([...used].sort()).toEqual([...SETTINGS_WRITERS].sort());
  });

  test('no file pushes settings to the engine around the door', () => {
    // A direct push is headless: the validation suite and the pack world name
    // their own settings. Nothing outside the engine's state module may claim
    // to be the application.
    const files = [];
    for (const [file, text] of Object.entries(js)) {
      if (file === 'js/engine/state.js' || file === 'js/physics.js') continue;
      const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      for (const m of code.matchAll(/\bupdatePhysicsSettings\(([^;]*?)\);/gs)) {
        files.push(file);
        expect(m[1]).not.toMatch(/application/);
      }
    }
    expect([...new Set(files)].sort()).toEqual([
      'js/scenarioPackWorld.js',
      'js/validation/physicsChecks.js',
    ]);
    // The world build takes the page's door from its caller.
    expect(js['js/world/build.js']).toMatch(/ctx\.pushSettings/);
    expect(js['js/world.js']).toMatch(
      /pushSettings: \(\) => commitSettings\('world-build'\)/
    );
  });
});

describe('the engine receives the whole of SETTINGS on every writer', () => {
  for (const id of SETTINGS_WRITERS) {
    test(`${id}: a frozen copy, in the application context, with the application's G`, () => {
      // An engine left at the headless fixture's G of 1 by an earlier push.
      physics.updatePhysicsSettings({ gravitational_constant: 1 });
      expect(getEngineContext()).toBe('headless');
      SETTINGS.mutual_gravity = !DEFAULT_SETTINGS.mutual_gravity;
      SETTINGS.max_timestep = 0.25;
      const engine = commitSettings(id);
      expect(engine).toBe(physics.physicsSettings);
      expect(Object.isFrozen(engine)).toBe(true);
      expect(getEngineContext()).toBe('application');
      expect(engine.gravitational_constant).toBe(
        DEFAULT_SETTINGS.gravitational_constant
      );
      expect(engine.mutual_gravity).toBe(SETTINGS.mutual_gravity);
      expect(engine.max_timestep).toBe(0.25);
    });
  }

  test('a frozen copy, not the live object: a later write misses until a commit', () => {
    commitSettings('apply-panel');
    SETTINGS.trail_length = 77;
    expect(physics.physicsSettings.trail_length).not.toBe(77);
    commitSettings('apply-panel');
    expect(physics.physicsSettings.trail_length).toBe(77);
    expect(() => {
      SETTINGS.bh_masses.push(1);
      commitSettings('apply-panel');
      physics.physicsSettings.bh_masses.push(2);
    }).toThrow(TypeError);
  });

  test('a world build in the application context pushes through the door', () => {
    setSettings(clone(DEFAULT_SETTINGS));
    SETTINGS.preset_scenario = 'binary-bh';
    const state = {
      zoom: 1,
      pan: { x: 0, y: 0 },
      paused: true,
      frame_count: 0,
    };
    const noop = () => {};
    physics.updatePhysicsSettings({ gravitational_constant: 1 });
    buildWorld({
      settings: SETTINGS,
      pushSettings: () => commitSettings('world-build'),
      state,
      applyPreset: () => applyPreset(SETTINGS, DEFAULT_SETTINGS, state),
      takePendingSettings: () => null,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    });
    expect(getEngineContext()).toBe('application');
    expect(physics.physicsSettings.gravitational_constant).toBe(
      SETTINGS.gravitational_constant
    );
  });
});

describe('the two contexts', () => {
  test('a headless push keeps its fixtures, G = 1 included', () => {
    physics.updatePhysicsSettings(
      { gravitational_constant: 1 },
      { engineContext: 'headless' }
    );
    expect(getEngineContext()).toBe('headless');
    expect(physics.physicsSettings.gravitational_constant).toBe(1);
    expect(DEFAULT_SETTINGS.gravitational_constant).toBe(2);
  });

  test('an application push without G is refused, never defaulted', () => {
    expect(() =>
      physics.updatePhysicsSettings(
        { trail_length: 5 },
        { engineContext: 'application' }
      )
    ).toThrow(/gravitational_constant/);
  });

  test('an unknown context is refused', () => {
    expect(() =>
      physics.updatePhysicsSettings({}, { engineContext: 'page' })
    ).toThrow(/unknown engine context/);
  });

  test('an unnamed writer is refused', () => {
    expect(() => commitSettings('somewhere')).toThrow(/somewhere/);
  });
});

describe('a patch', () => {
  test('is written to SETTINGS first, so the page and the engine agree', () => {
    commitSettings('rotation-curve', { halo_v_flat: 9 });
    expect(SETTINGS.halo_v_flat).toBe(9);
    expect(physics.physicsSettings.halo_v_flat).toBe(9);
  });

  test('names the mode and carries the halo boolean with it', () => {
    SETTINGS.dark_matter_halo = true;
    SETTINGS.galaxy_gravity = 'halo';
    SETTINGS.galaxy_kpc_per_unit = 1;
    SETTINGS.galaxy_msun_per_unit = 1;
    commitSettings('rotation-curve', { galaxy_gravity: 'mond' });
    expect(physics.physicsSettings.galaxy_gravity).toBe('mond');
    expect(SETTINGS.dark_matter_halo).toBe(false);
  });

  test('MOND with no scale falls back, and SETTINGS is told the answer', () => {
    commitSettings('rotation-curve', { galaxy_gravity: 'mond' });
    expect(physics.physicsSettings.galaxy_gravity).toBe('newtonian');
    expect(SETTINGS.galaxy_gravity).toBe('newtonian');
  });

  test('a key that is not a setting, or the wrong kind of value, is refused with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    commitSettings('rotation-curve', {
      not_a_setting: 1,
      halo_v_flat: 'fast',
      halo_core_radius: NaN,
    });
    expect(warn).toHaveBeenCalledTimes(3);
    expect(SETTINGS).not.toHaveProperty('not_a_setting');
    expect(SETTINGS.halo_v_flat).toBe(DEFAULT_SETTINGS.halo_v_flat);
    warn.mockRestore();
  });
});
