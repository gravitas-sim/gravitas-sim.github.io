// =============================================================================
// The cases slice 3 of the declarative geometry is held to
// -----------------------------------------------------------------------------
// Ten laboratory scenarios place their bodies from settings a student (or a
// share link) changes. tests/fixtures/scenarioGeometryGolden.json holds their
// worlds at seven seeds and their own settings; tests/fixtures/
// scenarioGeometryLabGolden.json holds the world the hand-built blocks made
// when a link changes one of those settings or a population count, one row per
// body hashed. Both were captured from the code before it was deleted.
// =============================================================================

export const LAB_SCENARIOS = [
  'lagrange-point-lab',
  'orbital-transfer-lab',
  'binary-planet-lab',
  'circumbinary-planet-lab',
  'exoplanet-characterization-lab',
  'transit-lab',
  'blended-binary',
  'three-body-sensitivity-lab',
  'gravity-assist-lab',
  'gravity-assist-heliocentric',
];

export const POPULATION_KEYS = [
  'num_stars',
  'num_planets',
  'num_gas_giants',
  'num_asteroids',
  'num_comets',
  'num_black_holes',
  'num_neutron_stars',
  'num_white_dwarfs',
];

/** Settings a link may change, by scenario: the values the labs read. */
const SETTING_CASES = {
  'lagrange-point-lab': [
    { gravitational_constant: 2 },
    {
      lagrange_primary_mass: 2,
      lagrange_secondary_mass: 0.1,
      lagrange_separation: 5,
      lagrange_tracer_x: -0.5,
      lagrange_tracer_y: 0.866,
      lagrange_tracer_vx: 0.01,
      lagrange_tracer_vy: -0.02,
      lagrange_tracer_fraction: 1e-3,
    },
    { lagrange_secondary_mass: 0.5, lagrange_tracer_fraction: 0.2 },
  ],
  'orbital-transfer-lab': [
    { gravitational_constant: 2 },
    {
      transfer_star_mass: 2,
      transfer_inner_au: 0.5,
      transfer_outer_au: 4,
      transfer_probe_mass_ratio: 1e-3,
      transfer_target_phase_deg: 135,
    },
    { transfer_target_phase_deg: 90 },
    { transfer_target_phase_deg: 180 },
    { transfer_target_phase_deg: -45 },
  ],
  'binary-planet-lab': [
    { gravitational_constant: 2 },
    {
      binary_lab_m1: 2,
      binary_lab_m2: 0.5,
      binary_lab_separation: 20,
      binary_lab_eccentricity: 0.3,
      binary_lab_binary_phase: 45,
      binary_lab_planet_a: 0.2,
      binary_lab_planet_phase: 30,
    },
    { binary_lab_eccentricity: 0 },
  ],
  'circumbinary-planet-lab': [
    { gravitational_constant: 2 },
    {
      binary_lab_m1: 1.5,
      binary_lab_m2: 1.5,
      binary_lab_separation: 8,
      binary_lab_eccentricity: 0.2,
      binary_lab_binary_phase: 90,
      binary_lab_planet_a: 3,
      binary_lab_planet_phase: 200,
    },
  ],
  'exoplanet-characterization-lab': [{ gravitational_constant: 2 }],
  'transit-lab': [{ gravitational_constant: 2 }],
  'blended-binary': [{ gravitational_constant: 2 }],
  'three-body-sensitivity-lab': [{ gravitational_constant: 2 }],
  'gravity-assist-lab': [
    { gravitational_constant: 2 },
    {
      assist_planet_mass: 10,
      assist_planet_speed: 1,
      assist_orbit_radius: 300,
      assist_impact_parameter: 25,
      assist_v_infinity: 1.2,
      assist_approach_deg: 90,
      assist_gate: 100,
      assist_probe_mass_ratio: 1e-4,
    },
    { assist_impact_parameter: -40 },
    // No such approach: the gate is closer than periapsis, so no craft is made.
    { assist_gate: 1 },
    { assist_v_infinity: 0 },
  ],
  'gravity-assist-heliocentric': [
    { gravitational_constant: 2 },
    { assist_orbit_radius: 0 },
    { assist_orbit_radius: 200, assist_impact_parameter: -10 },
    { assist_gate: 0.5 },
  ],
};

/** Every case: id is `${scenario}@${json of the settings the link carries}`. */
export const LAB_EDGE_IDS = (() => {
  const ids = [];
  for (const key of LAB_SCENARIOS) {
    for (const s of SETTING_CASES[key]) ids.push(`${key}@${JSON.stringify(s)}`);
    for (const p of POPULATION_KEYS)
      for (const n of [0, 3]) ids.push(`${key}@${JSON.stringify({ [p]: n })}`);
  }
  return ids;
})();
