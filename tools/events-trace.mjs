#!/usr/bin/env node
// =============================================================================
// The engine's events, in the order they fire, with their payloads
// -----------------------------------------------------------------------------
// Development and test (tests/engineEvents.test.js). Builds a preset under a
// seed with a stand-in `window` that records every CustomEvent dispatched to
// it, subscribes a step listener, steps the world, and prints the sequence:
// each window event (name and payload at full precision), each tenth step
// listener call (dt and the simulation clock), both with the simulation clock
// and the length of every body list at that moment, the listener count and the
// engine's own merge log. The clocks are pinned, so the merge event's
// wall-clock `time` is the same on every run. The output depends only on the
// engine, so it can be compared across checkouts: run it on the commit before
// a move and on the commit after.
//
//   node tools/events-trace.mjs stellar-graveyard 5 [300]
// =============================================================================

import * as physics from '../js/physics.js';
import { applyPreset } from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';

const noop = () => {};

const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'debris',
];
// Where the engine is when something fires: the clock and every list's length,
// so the golden pins an event's timing relative to the physics step.
const where = () => ({
  simTime: String(physics.getSimulationTime()),
  lengths: LISTS.map(l => physics[l].length),
});

function canon(v, depth = 0) {
  if (typeof v === 'number') return String(v);
  if (v === null || typeof v !== 'object') return v ?? null;
  if (depth > 6) return '[deep]';
  if (Array.isArray(v)) return v.map(x => canon(x, depth + 1));
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = canon(v[k], depth + 1);
  return out;
}

/**
 * @param {string} key - A scenario's public id
 * @param {number} seed
 * @param {number} frames - Steps of 0.01
 * @returns {{events: object[], listenerCalls: number, merges: object[]}}
 */
export function trace(key, seed, frames) {
  const events = [];
  globalThis.window = {
    CustomEvent: class {
      constructor(name, init) {
        this.type = name;
        this.detail = init?.detail;
      }
    },
    dispatchEvent(e) {
      events.push({
        at: 'window',
        name: e.type,
        detail: canon(e.detail),
        ...where(),
      });
      return true;
    },
  };
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  physics.setStateReference(state);
  let tick = 0;
  Date.now = () => 1.7e12 + tick++;
  performance.now = () => 5000 + tick++;
  let calls = 0;
  const off = physics.onPhysicsStep((dt, t) => {
    if (calls++ % 10 === 0)
      events.push({
        at: 'step',
        name: 'listener',
        detail: [dt, String(t)],
        ...where(),
      });
  });
  withSeed(seed, () => {
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => null,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    });
    for (let i = 0; i < frames; i++) physics.updatePhysics(0.01);
  });
  off();
  physics.updatePhysics(0.01);
  return {
    events,
    listenerCalls: calls,
    merges: physics.simulation.getLatestEvents(1000).map(m => canon(m)),
  };
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  const [key, seed, frames = '300'] = process.argv.slice(2);
  process.stdout.write(
    JSON.stringify(trace(key, Number(seed), Number(frames)))
  );
}
