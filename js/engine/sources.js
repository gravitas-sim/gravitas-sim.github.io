// =============================================================================
// What pulls on what: the engine's one source rule
// -----------------------------------------------------------------------------
// The step (js/engine/step.js, updateCachedArrays) builds its list of gravity
// sources from this function, the two-body model (js/twoBodyModel.js) asks it
// whether a body is a source, and the scene statement in the readout reads it,
// so the three cannot differ. Pure: it takes the settings and returns names.
// =============================================================================

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

/**
 * The lists whose bodies the integrator sums as sources, in the order the
 * step pushes them (the order is the summation order, so it is kept).
 * Holes, stars and galaxies always (a cluster whose members did not attract
 * each other would not be a cluster; star-only gravity is aimed at planetary
 * systems); giants, neutron stars and white dwarfs unless only stars pull;
 * planets and asteroids only with mutual gravity on and star-only gravity
 * off; comets and debris never.
 *
 * @param {{mutual_gravity?: boolean, star_only_gravity?: boolean}} s - Settings
 * @returns {string[]} List names, keys of LIST_KIND
 */
export function sourceLists(s) {
  const starOnly = s?.star_only_gravity === true;
  const lists = ['bh_list', 'stars', 'galaxies'];
  if (!starOnly) lists.push('gas_giants', 'neutron_stars', 'white_dwarfs');
  if (s?.mutual_gravity && !starOnly) lists.push('planets', 'asteroids');
  return lists;
}

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
