// =============================================================================
// The cases slice 6 of the declarative geometry is held to
// -----------------------------------------------------------------------------
// The Solar System was the last scenario whose bodies were made by hand in
// js/world/build.js: eight planets and giants from a published table, up to
// sixteen named asteroids and twelve named comets, each carrying engine state
// (Saturn's rings sized from the radius the constructor derived, asteroid
// masses re-synchronized with their reported counts, comets' orbital elements).
// tests/fixtures/scenarioGeometrySlice6Golden.json holds the world the
// hand-built block made at seven seeds, and
// tests/fixtures/scenarioGeometrySlice6EdgeGolden.json under every case below;
// both were captured from the code before it was changed, by the same digest.
//
// A case is a scenario and the settings a share link (or the Settings panel's
// Apply) lays over it: every population count at 0 and 3, counts either side of
// the tables' lengths (16 asteroids, 12 comets), the asteroid switch, the
// gravitational constant, every layout, and the low quality tier's caps (a case
// id with the prefix `low:` runs under that tier).
// =============================================================================

export { worldKey } from './scenarioSlice4Cases.js';

export const SLICE6_SCENARIOS = ['solar-system'];

export const SLICE6_SEEDS = [
  1, 42, 1554098974, 123456789, 4000000000, 7, 99991,
];

export const SLICE6_COUNTS = [
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

export const SLICE6_PLACEMENTS = [
  'Circular',
  'Multi-Ring',
  'Random',
  'Grid',
  'Empty',
];

const SETTING_CASES = [
  { num_asteroids: 1 },
  { num_asteroids: 16 },
  { num_asteroids: 17 },
  { num_asteroids: 50 },
  { num_comets: 1 },
  { num_comets: 12 },
  { num_comets: 13 },
  { num_comets: 40 },
  { enable_asteroids: false },
  { enable_asteroids: false, num_comets: 0 },
  { gravitational_constant: 2 },
  { gravitational_constant: 3, num_asteroids: 5, num_comets: 5 },
  { num_planets: 0, num_gas_giants: 4 },
  { num_planets: 12, num_gas_giants: 3 },
  { num_stars: 0 },
  { num_stars: 3, num_black_holes: 1 },
  { num_neutron_stars: 2, num_white_dwarfs: 2, num_black_holes: 2 },
  { num_micro_stars: 40 },
  { placement: 'Random', num_stars: 2, num_asteroids: 8 },
  { placement: 'Circular', num_planets: 5, num_comets: 3 },
  { placement: 'Grid', num_black_holes: 2, num_neutron_stars: 1 },
  { placement: 'Multi-Ring', num_asteroids: 20, num_comets: 14 },
  { init_velocity: 60 },
  { mutual_gravity: true },
  { sim_size: 'Small' },
  { test_star_slingshot: true },
];

/** Every case: id is `${scenario}@${json of the settings the link carries}`. */
export const SLICE6_EDGE_IDS = (() => {
  const ids = [];
  for (const key of SLICE6_SCENARIOS) {
    for (const s of SETTING_CASES) ids.push(`${key}@${JSON.stringify(s)}`);
    for (const p of SLICE6_COUNTS)
      for (const n of [0, 3]) ids.push(`${key}@${JSON.stringify({ [p]: n })}`);
    for (const placement of SLICE6_PLACEMENTS)
      ids.push(`${key}@${JSON.stringify({ placement })}`);
    // The low tier caps the generic populations unless the layout is Empty.
    for (const s of [
      { placement: 'Random', num_asteroids: 50, num_comets: 12 },
      { placement: 'Circular', num_asteroids: 16, num_comets: 12 },
      { num_asteroids: 50, num_comets: 12 },
    ])
      ids.push(`low:${key}@${JSON.stringify(s)}`);
  }
  return [...new Set(ids)];
})();
