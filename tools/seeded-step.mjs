#!/usr/bin/env node
// =============================================================================
// A preset world stepped under a seed, every body kept at full precision
// -----------------------------------------------------------------------------
// Development and test (tests/effectsRealm.test.js). Builds a scenario under a
// seed, then steps it with Math.random replaced by a stream seeded from the
// same number, and prints every own data property of every body (numbers at
// full precision), the debris count and the next draw. Run with and without
// --effects (which imports js/bodyEffects.js first): the two must print the
// same thing, because the collisions draw from the stream the explosions'
// builders draw from. Also runs in a checkout from before the effects module
// (the flag then does nothing), so a build of v2 can be compared.
//
//   node tools/seeded-step.mjs stellar-graveyard 9 [300] [--effects]
// =============================================================================

import * as physics from '../js/physics.js';
import { applyPreset } from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';

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
const noop = () => {};

function canon(v, depth, seen) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'function') return undefined;
  if (v === null || typeof v !== 'object')
    return v === undefined ? 'undefined' : v;
  if (seen.has(v)) return '[cycle]';
  if (depth > 5) return '[deep]';
  seen.add(v);
  let out;
  if (Array.isArray(v)) out = v.map(x => canon(x, depth + 1, seen) ?? null);
  else {
    out = {};
    for (const k of Object.keys(v).sort()) {
      const c = canon(v[k], depth + 1, seen);
      if (c !== undefined) out[k] = c;
    }
  }
  seen.delete(v);
  return out;
}

/**
 * @param {string} key - A scenario's public id
 * @param {number} seed
 * @param {number} frames - Steps of 0.01
 * @returns {{rows: string[], counts: object, next: number}}
 */
export function run(key, seed, frames) {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  physics.setStateReference(state);
  // creationTime and the ripples read the clocks: pin them.
  let tick = 0;
  Date.now = () => 1.7e12 + tick++;
  performance.now = () => 5000 + tick++;
  let next;
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
    next = Math.random();
  });
  const rows = [];
  const counts = {};
  for (const l of LISTS) {
    counts[l] = physics[l].length;
    physics[l].forEach((b, i) =>
      rows.push(`${l}|${i}|${b.kind}|${JSON.stringify(canon(b, 0, new Set()))}`)
    );
  }
  return { rows, counts, next: String(next) };
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  const [key, seed, frames = '300'] = process.argv
    .slice(2)
    .filter(a => !a.startsWith('--'));
  if (process.argv.includes('--effects'))
    await import('../js/bodyEffects.js').catch(e => {
      if (!/Cannot find|not found|ENOENT/i.test(String(e?.message))) throw e;
    });
  process.stdout.write(JSON.stringify(run(key, Number(seed), Number(frames))));
}
