// =============================================================================
// The cases slice 4 of the declarative geometry is held to
// -----------------------------------------------------------------------------
// Nine scenarios built their bodies by hand in js/world/build.js: the two
// galaxy discs and the cluster, three systems of generated bodies placed on
// circular orbits about a hand-placed center, the Kuiper belt, a tidal
// disruption and a black hole inspiral. tests/fixtures/
// scenarioGeometryGolden.json holds their worlds at seven seeds;
// tests/fixtures/scenarioGeometrySlice4Golden.json holds the world the
// hand-built blocks made under each of the cases below, one row per body
// hashed. Both were captured from the code before it was deleted.
//
// A case is a scenario and the settings a share link (or the Settings panel's
// Apply) lays over it: every population count at 0 and 3, a count far above
// the scenario's own, the settings the arithmetic reads, and every layout.
// =============================================================================

import { fnv } from './scenarioDigest.js';

/**
 * A digest with each body list reduced to its count and one hash of its rows,
 * which keeps the fixture small and still moves if any field of any body does.
 */
export const worldKey = d => {
  const lists = {};
  for (const row of d.rows) (lists[row.split('|')[0]] ??= []).push(row);
  return {
    ...d,
    rows: Object.fromEntries(
      Object.entries(lists).map(([l, rs]) => [
        l,
        `${rs.length}:${fnv(rs.join('\n'))}`,
      ])
    ),
  };
};

export const SLICE4_SCENARIOS = [
  'spiral-galaxy',
  'milky-way-rotation',
  'coma-cluster',
  'binary-star-system',
  'rogue-encounter',
  'kuiper-belt',
  'tidal-disruption-event',
  'black-hole-billiards',
  'gw150914',
];

export const SLICE4_COUNTS = [
  'num_stars',
  'num_planets',
  'num_gas_giants',
  'num_asteroids',
  'num_comets',
  'num_black_holes',
  'num_neutron_stars',
  'num_white_dwarfs',
];

export const SLICE4_PLACEMENTS = [
  'Circular',
  'Multi-Ring',
  'Random',
  'Grid',
  'Empty',
];

/** Settings a link may change, by scenario: what the arithmetic reads. */
const SETTING_CASES = {
  'spiral-galaxy': [
    { gravitational_constant: 2 },
    { galaxy_gravity: 'halo', halo_v_flat: 20, halo_core_radius: 80 },
  ],
  'milky-way-rotation': [
    { gravitational_constant: 2 },
    { halo_v_flat: 20, halo_core_radius: 80 },
  ],
  'coma-cluster': [
    { gravitational_constant: 2 },
    { halo_v_flat: 40, halo_core_radius: 600 },
    { halo_v_flat: 0 },
  ],
  'binary-star-system': [
    { gravitational_constant: 2 },
    { enable_asteroids: false },
    { num_planets: 40, num_gas_giants: 12, num_asteroids: 120 },
    { mutual_gravity: false },
  ],
  'rogue-encounter': [
    { gravitational_constant: 2 },
    { enable_asteroids: false },
    { num_planets: 40, num_gas_giants: 12, num_asteroids: 160 },
    { num_black_holes: 3, bh_mass: 500 },
  ],
  'kuiper-belt': [
    { gravitational_constant: 2 },
    { enable_asteroids: false },
    { num_asteroids: 5 },
    { num_asteroids: 12 },
    { num_asteroids: 13 },
    { num_asteroids: 600 },
    { num_stars: 3 },
    { num_black_holes: 1 },
  ],
  'tidal-disruption-event': [
    { gravitational_constant: 3 },
    { bh_mass: 5000 },
    { bh_mass: 20 },
    { num_stars: 3, num_planets: 3, num_asteroids: 3 },
    { num_black_holes: 3 },
    { num_neutron_stars: 2, num_white_dwarfs: 2 },
    // The layout changed in Settings: the generic placement runs for this
    // scenario (and, in the code, positioned a hole and a planet first, which
    // moves what the momentum balance after it takes from the compact objects).
    { placement: 'Circular', num_planets: 2, num_white_dwarfs: 3 },
    { placement: 'Random', num_planets: 5, num_neutron_stars: 1 },
  ],
  'black-hole-billiards': [
    { gravitational_constant: 2 },
    { bh_masses: [100, 30, 30, 30, 30, 30] },
    { use_individual_bh_masses: false, bh_mass: 50 },
    { num_black_holes: 8 },
    { num_black_holes: 2 },
    { num_black_holes: 1, num_stars: 3 },
  ],
  gw150914: [
    { gravitational_constant: 2 },
    { bh_masses: [10, 10] },
    { num_black_holes: 3 },
    { num_black_holes: 2, num_stars: 3, num_planets: 3 },
  ],
};

/** Every case: id is `${scenario}@${json of the settings the link carries}`. */
export const SLICE4_EDGE_IDS = (() => {
  const ids = [];
  for (const key of SLICE4_SCENARIOS) {
    for (const s of SETTING_CASES[key]) ids.push(`${key}@${JSON.stringify(s)}`);
    for (const p of SLICE4_COUNTS)
      for (const n of [0, 3]) ids.push(`${key}@${JSON.stringify({ [p]: n })}`);
    for (const placement of SLICE4_PLACEMENTS)
      ids.push(`${key}@${JSON.stringify({ placement })}`);
  }
  return [...new Set(ids)];
})();
