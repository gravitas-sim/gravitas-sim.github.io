// =============================================================================
// What pulls on what: the engine's one source rule
// -----------------------------------------------------------------------------
// The step (js/engine/step.js, updateCachedArrays) builds its list of gravity
// sources from `sourceLists` (js/engine/state.js, so the start-up engine needs
// no module of its own for it); the two-body model (js/twoBodyModel.js) and
// the scene statement (js/sceneStatement.js) read it through this file, so the
// three cannot differ. Loaded with those two, never at start-up.
// =============================================================================

import { sourceLists, gravityRoles, canMoveNow, oneWayPairs } from './state.js';

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
export { sourceLists, gravityRoles, canMoveNow, oneWayPairs };

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

/**
 * What pulls on what in a scene, from the relation and nothing else: the
 * lists that pull and that only feel, every one-way pair present (where total
 * momentum is not conserved, by the model), and the two hole rules.
 * @param {Object<string, number>} counts - Bodies per list name
 * @param {object} s - Settings (mutual_gravity, star_only_gravity, bh_behavior)
 * @returns {{pulling: Array, feeling: Array, oneWay: Array<[string, string]>,
 *   holesFeelOnlyHoles: boolean, staticHoles: boolean}} Lists by name; a
 *   one-way pair is [source list, target list]
 */
export function sceneRoles(counts, s) {
  const { pulls, staticHoles } = gravityRoles(s);
  const present = Object.keys(LIST_KIND).filter(l => (counts?.[l] || 0) > 0);
  const oneWay = [];
  for (const a of present)
    for (const b of present)
      if (
        pulls(LIST_KIND[a], LIST_KIND[b]) &&
        !pulls(LIST_KIND[b], LIST_KIND[a])
      )
        oneWay.push([a, b]);
  const holes = present.includes('bh_list');
  return {
    ...sceneSources(counts, s),
    oneWay,
    holesFeelOnlyHoles: holes && present.length > 1,
    staticHoles: holes && staticHoles,
  };
}

/**
 * For one body: the lists present that pull it and that it pulls, and whether
 * it moves at all now (a fixed hole, a model-owned body).
 * @param {object} body - A body with `kind`
 * @param {Object<string, number>} counts - Bodies per list name, body included
 * @param {object} s - Settings
 * @returns {{pulledBy: string[], pulls: string[], moves: boolean}} List names
 */
export function bodyRoles(body, counts, s) {
  const { pulls } = gravityRoles(s);
  const own = Object.keys(LIST_KIND).find(l => LIST_KIND[l] === body?.kind);
  // Another body of the body's own kind, or any body of another kind.
  const others = l => (counts?.[l] || 0) - (l === own ? 1 : 0) > 0;
  const lists = Object.keys(LIST_KIND).filter(others);
  const moves = canMoveNow(body, s);
  return {
    pulledBy: moves ? lists.filter(l => pulls(LIST_KIND[l], body.kind)) : [],
    pulls: lists.filter(l => pulls(body.kind, LIST_KIND[l])),
    moves,
  };
}
