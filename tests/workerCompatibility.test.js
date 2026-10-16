// =============================================================================
// The engine loads and builds a world with no DOM
// -----------------------------------------------------------------------------
// The regression test for the two guards that make the Worker route possible.
// See MULTI_WORLD_DECISION.md for why that route was chosen over refactoring
// the engine into explicit instances.
//
// Why a child process rather than `@jest-environment node`
// -----------------------------------------------------------------------------
// tests/setup.js runs for every suite and assigns `global.document`
// unconditionally. A node-environment suite would therefore be handed a
// document by the harness, and would pass whether or not the guards existed -
// which is the one thing this file must not do. A child `node` with no setup
// file is a realm where `document` and `window` genuinely do not exist, which
// is the property a Worker shares and the property under test.
//
// Both guards are one line each, and both are easy to undo by accident: in a
// browser tab nothing goes wrong when you do. The failure appears only in a
// Worker, which no other test in this suite enters.
//
//   js/physics.js      a bare `document.getElementById` at module scope
//   js/world/build.js  a bare `window.dispatchEvent` inside buildWorld()
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run a module snippet in a fresh Node process with no jest setup and no DOM.
 *
 * @param {string} source - ES module source
 * @returns {string} Whatever it printed
 */
const inCleanRealm = source =>
  execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: REPO,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

describe('a realm with no DOM', () => {
  test('the child realm really has no document or window', () => {
    // Guard against the guard. If this ever printed "have them", every
    // assertion below would pass without testing anything.
    expect(
      inCleanRealm(
        `console.log(typeof document === 'undefined' && typeof window === 'undefined' ? 'neither' : 'have them');`
      )
    ).toBe('neither');
  });

  test('js/physics.js evaluates and exports its live body arrays', () => {
    const out = inCleanRealm(`
      const p = await import('./js/physics.js');
      console.log([
        typeof p.updatePhysics,
        Array.isArray(p.stars),
        Array.isArray(p.bh_list),
      ].join(','));
    `);
    expect(out).toBe('function,true,true');
  });

  test('js/world/build.js evaluates', () => {
    const out = inCleanRealm(`
      const b = await import('./js/world/build.js');
      console.log(typeof b.buildWorld);
    `);
    expect(out).toBe('function');
  });

  test('buildWorld constructs a real scenario and it integrates', () => {
    // The same injected context a Worker supplies: plain settings, plain
    // state, and no-op callbacks where the interface would be.
    const out = inCleanRealm(`
      const p = await import('./js/physics.js');
      const { buildWorld } = await import('./js/world/build.js');
      const { applyPreset } = await import('./js/scenarios.js');
      const { DEFAULT_SETTINGS } = await import('./js/appState.js');
      const { withSeed, normalizeSeed } = await import('./js/rng.js');

      const SETTINGS = { ...DEFAULT_SETTINGS, preset_scenario: 'Solar System' };
      const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
      const noop = () => {};

      withSeed(normalizeSeed('characterization'), () =>
        buildWorld({
          settings: SETTINGS,
          state,
          applyPreset: () => applyPreset(SETTINGS, DEFAULT_SETTINGS, state),
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

      const before = p.getSimulationTime();
      p.updatePhysics(0.002);
      console.log([
        p.stars.length > 0,
        p.planets.length > 0,
        p.getSimulationTime() > before,
      ].join(','));
    `);
    expect(out).toBe('true,true,true');
  });
});

describe('ordinary browser behaviour is unchanged', () => {
  test('buildWorld still announces the reset when there is a window', async () => {
    // The guard in js/world/build.js must not have turned a real dispatch into
    // a permanent no-op. jsdom has a window, so the event must fire.
    const { buildWorld } = await import('../js/world/build.js');
    const { applyPreset } = await import('../js/scenarios.js');
    const { DEFAULT_SETTINGS } = await import('../js/appState.js');

    const seen = jest.fn();
    window.addEventListener('gravitasSimulationReset', seen);

    const SETTINGS = { ...DEFAULT_SETTINGS, preset_scenario: 'Solar System' };
    const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
    const noop = () => {};
    try {
      buildWorld({
        settings: SETTINGS,
        state,
        applyPreset: () => applyPreset(SETTINGS, DEFAULT_SETTINGS, state),
        takePendingSettings: () => null,
        setScenarioName: noop,
        hideObjectInspector: noop,
        showScenarioInfo: noop,
        updateObjectTypeButton: noop,
        computeAreaSweep: noop,
        isAreaSweepSuppressed: () => true,
        regenerateStarfield: noop,
      });
    } finally {
      window.removeEventListener('gravitasSimulationReset', seen);
    }

    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0][0].type).toBe('gravitasSimulationReset');
  });
});
