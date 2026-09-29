// =============================================================================
// A scenario pack's world, built without a page
// -----------------------------------------------------------------------------
// What the application does when it opens a pack's link, done in any realm
// that has the engine: the SDK's `test`, and the tests. The settings are the
// defaults plus the pack's delta, as js/ui.js applyShareState makes them for
// a 'None' link; the world is generated under the pack's seed by the same
// buildWorld() the page calls; and a pack that brings its own bodies has them
// restored the way a full link restores them - each made by its own class and
// given its packed state - in place of the generated ones.
//
// The restore mirrors js/ui.js rebuildWorldFromStates() for the six classes a
// pack may hold. It is here rather than imported because js/ui.js is the
// page's coordinator and cannot be loaded without one.
// =============================================================================

import * as physics from './physics.js';
import { buildWorld } from './world/build.js';
import { applyPreset } from './scenarios.js';
import { DEFAULT_SETTINGS, setScenarioName } from './appState.js';
import { withSeed, parseSeed } from './rng.js';
import { compileScenarioPack } from './scenarioPack.js';

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

/** Every body the engine holds, as numbers, for comparing two builds. */
export function worldSnapshot() {
  const out = [];
  for (const list of LISTS) {
    for (const b of physics[list]) {
      out.push([
        list,
        physics.className(b),
        b.pos.x,
        b.pos.y,
        b.vel.x,
        b.vel.y,
        b.mass,
      ]);
    }
  }
  return out;
}

/** One packed body, made by its own class, into its list. */
function restore(s) {
  const P = physics;
  const at = { ...s.pos };
  const v = { ...s.vel };
  let obj = null;
  let list = null;
  if (s.type === 'StarObject') [obj, list] = [new P.StarObject(at, v), P.stars];
  else if (s.type === 'Planet') [obj, list] = [new P.Planet(at, v), P.planets];
  else if (s.type === 'GasGiant')
    [obj, list] = [new P.GasGiant(at, v), P.gas_giants];
  else if (s.type === 'WhiteDwarf')
    [obj, list] = [new P.WhiteDwarf(at, v), P.white_dwarfs];
  else if (s.type === 'NeutronStar')
    [obj, list] = [new P.NeutronStar(at, v, null, null), P.neutron_stars];
  else if (s.type === 'BlackHole')
    [obj, list] = [new P.BlackHole(at, s.mass, v, true), P.bh_list];
  if (!obj) return;
  obj.set_state(s);
  list.push(obj);
}

/**
 * Build the world a pack describes, as opening its link would.
 *
 * @param {object} pack - A valid pack
 * @returns {{settings: object, payload: object, bodies: number}}
 */
export function buildPackWorld(pack) {
  const payload = compileScenarioPack(pack);
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = 'None';
  setScenarioName('None');
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  withSeed(parseSeed(payload.seed), () =>
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => payload.d ?? null,
      setScenarioName,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    })
  );
  if (payload.b) {
    for (const list of LISTS) physics[list].length = 0;
    physics.resetPhysicsObjectCounter();
    for (const s of payload.b) restore(s);
  }
  physics.updatePhysicsSettings(settings);
  physics.bumpWorldGeneration();
  physics.resetSimulationTime();
  physics.resetConservationBaseline();
  return { settings, payload, bodies: worldSnapshot().length };
}

/**
 * Step the world a pack built, and say whether it stayed finite.
 *
 * @param {number} steps - How many steps
 * @param {number} dt - The step
 * @returns {{finite: boolean, bodies: number}}
 */
export function stepPackWorld(steps, dt) {
  for (let i = 0; i < steps; i++) physics.updatePhysics(dt);
  const snap = worldSnapshot();
  return {
    finite: snap.every(row => row.slice(2).every(Number.isFinite)),
    bodies: snap.length,
  };
}
