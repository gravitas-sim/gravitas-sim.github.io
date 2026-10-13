// =============================================================================
// The cases slice 5 of the declarative geometry is held to
// -----------------------------------------------------------------------------
// Five scenarios placed bodies inside applyPlacement, before its momentum
// balance: a binary black hole (twice: again at the end of buildWorld, after
// a fresh draw of every phase), the slingshot's two holes, three holes in a
// triangle, two neutron stars (named late, whatever the layout) and two white
// dwarfs. tests/fixtures/scenarioGeometrySlice5Golden.json holds the worlds the
// hand-built blocks made at seven seeds, and
// tests/fixtures/scenarioGeometrySlice5EdgeGolden.json under every case below;
// both were captured from the code before it was changed, by the same digest.
//
// A case is a scenario and the settings a share link (or the Settings panel's
// Apply) lays over it. The layout matters most here: the placed pair is
// balanced into the momentum before the end of the build, so a layout the
// scenario does not ship with (Empty skips both) and a compact object it did
// not count on (the balance takes a share from it) are the cases that would
// show a declaration run at the wrong point.
// =============================================================================

export { worldKey } from './scenarioSlice4Cases.js';

export const SLICE5_SCENARIOS = [
  'binary-bh',
  'slingshot',
  'triple-bh-system',
  'neutron-star-collision',
  'white-dwarf-binary',
];

export const SLICE5_SEEDS = [
  1, 42, 1554098974, 123456789, 4000000000, 7, 99991,
];

export const SLICE5_COUNTS = [
  'num_stars',
  'num_planets',
  'num_gas_giants',
  'num_asteroids',
  'num_comets',
  'num_black_holes',
  'num_neutron_stars',
  'num_white_dwarfs',
  'num_micro_stars',
];

export const SLICE5_PLACEMENTS = [
  'Circular',
  'Multi-Ring',
  'Random',
  'Grid',
  'Empty',
];

/** Settings a link may change, by scenario: what the placed bodies read. */
const SETTING_CASES = {
  'binary-bh': [
    { gravitational_constant: 2 },
    { bh_masses: [30, 5] },
    { use_individual_bh_masses: false, bh_mass: 50 },
    { num_black_holes: 3 },
    { num_black_holes: 1 },
    { num_black_holes: 2, num_planets: 0, num_gas_giants: 0 },
    { enable_asteroids: false, num_asteroids: 30 },
    { num_asteroids: 30, num_planets: 25, num_gas_giants: 6 },
    { num_stars: 3, num_neutron_stars: 2, num_white_dwarfs: 2 },
    { placement: 'Empty', num_asteroids: 10 },
    { placement: 'Random', num_stars: 2, num_comets: 3 },
    { placement: 'Grid', num_black_holes: 4, num_neutron_stars: 1 },
    { placement: 'Multi-Ring', num_planets: 30, num_white_dwarfs: 3 },
    { num_micro_stars: 40 },
    { test_star_slingshot: true, num_stars: 2 },
  ],
  slingshot: [
    { gravitational_constant: 3 },
    { bh_masses: [10, 10] },
    { use_individual_bh_masses: false, bh_mass: 40 },
    { num_black_holes: 5 },
    { num_black_holes: 1 },
    { num_stars: 3, num_neutron_stars: 2 },
    { num_asteroids: 3, num_planets: 3, num_gas_giants: 3, num_comets: 2 },
    { enable_asteroids: false },
    { placement: 'Empty' },
    { placement: 'Circular', num_white_dwarfs: 2 },
    { placement: 'Grid', num_stars: 2 },
    { test_star_slingshot: true, num_stars: 2 },
    { num_micro_stars: 40 },
  ],
  'triple-bh-system': [
    { gravitational_constant: 3 },
    { bh_masses: [10, 10, 10] },
    { use_individual_bh_masses: false, bh_mass: 40 },
    { num_black_holes: 2 },
    { num_black_holes: 4 },
    { num_black_holes: 1 },
    { num_stars: 3, num_neutron_stars: 2 },
    { enable_asteroids: false },
    { placement: 'Empty' },
    { placement: 'Random', num_white_dwarfs: 2 },
    { placement: 'Grid', num_stars: 2, num_black_holes: 5 },
    { init_velocity: 60 },
    { num_micro_stars: 40 },
  ],
  'neutron-star-collision': [
    { gravitational_constant: 3 },
    { ns_masses: [1.4, 2.1] },
    { use_individual_ns_masses: false },
    { num_neutron_stars: 1 },
    { num_neutron_stars: 3 },
    { num_neutron_stars: 2, num_black_holes: 2 },
    { num_stars: 3, num_white_dwarfs: 2 },
    { enable_asteroids: false },
    { placement: 'Empty' },
    { placement: 'Empty', num_neutron_stars: 1 },
    { placement: 'Random', num_neutron_stars: 4 },
    { placement: 'Grid', num_black_holes: 3 },
    { num_micro_stars: 40 },
  ],
  'white-dwarf-binary': [
    { gravitational_constant: 3 },
    { num_white_dwarfs: 1 },
    { num_white_dwarfs: 3 },
    { num_white_dwarfs: 2, num_neutron_stars: 2, num_black_holes: 2 },
    { num_stars: 3, num_planets: 3 },
    { enable_asteroids: false },
    { placement: 'Empty' },
    { placement: 'Empty', num_white_dwarfs: 1 },
    { placement: 'Random', num_white_dwarfs: 4 },
    { placement: 'Grid', num_neutron_stars: 2 },
    { init_velocity: 60 },
    { num_micro_stars: 40 },
  ],
};

/** Every case: id is `${scenario}@${json of the settings the link carries}`. */
export const SLICE5_EDGE_IDS = (() => {
  const ids = [];
  for (const key of SLICE5_SCENARIOS) {
    for (const s of SETTING_CASES[key]) ids.push(`${key}@${JSON.stringify(s)}`);
    for (const p of SLICE5_COUNTS)
      for (const n of [0, 3]) ids.push(`${key}@${JSON.stringify({ [p]: n })}`);
    for (const placement of SLICE5_PLACEMENTS)
      ids.push(`${key}@${JSON.stringify({ placement })}`);
  }
  return [...new Set(ids)];
})();
