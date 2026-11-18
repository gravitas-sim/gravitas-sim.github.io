// =============================================================================
// What pulls on what: the engine's one source rule
// -----------------------------------------------------------------------------
// The step (js/engine/step.js, updateCachedArrays) builds its list of gravity
// sources from `sourceLists` (js/engine/state.js, so the start-up engine needs
// no module of its own for it); the two-body model (js/twoBodyModel.js) and
// the scene statement (js/sceneStatement.js) read it through this file, so the
// three cannot differ. Loaded with those two, never at start-up.
// =============================================================================

import { sourceLists } from './state.js';

/** The engine's body lists and the kind each holds, in the step's order. */
export const LIST_KIND = {
  bh_list: 'BlackHole',
  stars: 'StarObject',
  galaxies: 'Galaxy',
  gas_giants: 'GasGiant',
  neutron_stars: 'NeutronStar',
  white_dwarfs: 'WhiteDwarf',
  planets: 'Planet',
  asteroids: 'Asteroid',
  comets: 'Comet',
  debris: 'Debris',
};

// Holes, stars and galaxies always (a cluster whose members did not attract
// each other would not be a cluster; star-only gravity is aimed at planetary
// systems); giants, neutron stars and white dwarfs unless only stars pull;
// planets and asteroids only with mutual gravity on and star-only gravity
// off; comets and debris never. The step's order is the summation order.
export { sourceLists };

/**
 * Whether bodies of this kind are summed as sources.
 * @param {string} kind - A body's `kind`
 * @param {object} s - Settings, as sourceLists
 * @returns {boolean} True when such a body pulls on others
 */
export function isSourceKind(kind, s) {
  return sourceLists(s).some(list => LIST_KIND[list] === kind);
}

/**
 * Which lists present in a scene pull on others and which only feel gravity.
 * @param {Object<string, number>} counts - Bodies per list name
 * @param {object} s - Settings, as sourceLists
 * @returns {{pulling: Array<{list: string, n: number}>, feeling: Array<{list: string, n: number}>}}
 *   Lists with at least one body, in LIST_KIND order
 */
export function sceneSources(counts, s) {
  const pulls = new Set(sourceLists(s));
  const out = { pulling: [], feeling: [] };
  for (const list of Object.keys(LIST_KIND)) {
    const n = counts?.[list] || 0;
    if (n > 0) (pulls.has(list) ? out.pulling : out.feeling).push({ list, n });
  }
  return out;
}
