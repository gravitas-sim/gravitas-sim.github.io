// Rings and tides (Prompt 204 part 2): the settings of the two scale-model scenarios.
// G carries the distance exaggeration, as in Earth-Moon System; the bodies are declared
// in js/world/build.js (ENGINE_GEOMETRY) and the bounds they were judged against are in
// tests/fixtures/tides/display-thresholds.json.
const EMPTY = {
  num_black_holes: 0,
  num_stars: 0,
  num_planets: 0,
  num_gas_giants: 0,
  num_asteroids: 0,
  num_comets: 0,
  num_neutron_stars: 0,
  num_white_dwarfs: 0,
  enable_asteroids: false,
  placement: 'Empty',
  mutual_gravity: true,
  star_only_gravity: false,
  enable_star_merging: false,
  dynamic_object_properties: false,
  integrator: 'Velocity Verlet',
  show_scale_bar: false,
  show_elapsed_time: false,
};

export const RING_TIDE_PRESETS = {
  'ring-gap': {
    ...EMPTY,
    gravitational_constant: 10000,
    min_interaction_distance: 0.05,
    max_timestep: 0.1,
    sim_speed: 4,
    show_trails: false,
    preset_zoom: 3.8,
  },
  'roche-pass': {
    ...EMPTY,
    gravitational_constant: 3000,
    min_interaction_distance: 0.4,
    max_timestep: 0.02,
    sim_speed: 0.4,
    show_trails: true,
    trail_length: 40,
    preset_zoom: 2.6,
  },
};
