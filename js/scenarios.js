// =============================================================================
// Scenario presets
// -----------------------------------------------------------------------------
// Every built-in scenario, as a pure transformation of the settings object.
// Extracted from ui.js: this was 778 lines of a 8,900-line module, and it has
// no dependency on the UI beyond the objects handed to it, so it takes them as
// parameters rather than importing ui.js and closing a cycle.
// =============================================================================

/**
 * Apply the named preset scenario to the settings object, in place.
 * @param {Object} SETTINGS - Live settings object, mutated
 * @param {Object} DEFAULT_SETTINGS - Baseline the preset builds on
 * @param {Object} state - View state (a few presets set an initial zoom)
 */
const applyPreset = (SETTINGS, DEFAULT_SETTINGS, state) => {
  const ps = SETTINGS.preset_scenario;
  if (ps === 'None') return;
  const fresh_defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(SETTINGS, fresh_defaults, { preset_scenario: ps });

  if (ps === 'Binary BH') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [15, 10],
      num_planets: 10,
      num_gas_giants: 2,
      init_velocity: 15,
      velocity_stddev: 5,
      placement: 'Circular',
      mutual_gravity: false,
      orbit_decay_rate: 0.002, // Gravitational wave inspiral rate
      show_trails: true,
      sim_speed: 1.0,
      show_velocity_vectors: false,
      interactive_add: true,
      trail_length: 15,
      trail_style: 'Glow',
      sim_size: 'Large',
      star_density: 10000,
      input_object_type: 'Star',
      show_bh_glow: true,
      show_accretion_disk: true,
      show_bh_jets: true,
      show_dynamic_overlays: true,
      enable_asteroids: true,
      num_asteroids: 30,
      dynamic_object_properties: true,
      record_simulation: false,
      show_ambient_lighting: true,
      planet_base_color: '#6495ed',
      star_base_color: '#ffff00',
      enable_star_merging: true,
      max_star_mass_before_bh: 20.0,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Neutron Star Collision') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_neutron_stars: 2,
      use_individual_ns_masses: true,
      ns_masses: [1.4, 1.4], // Both neutron stars are 1.4 M☉ as per GW170817
      bh_behavior: 'Orbiting',
      num_planets: 5,
      num_gas_giants: 1,
      num_asteroids: 20,
      placement: 'Circular',
      init_velocity: 30,
      mutual_gravity: true,
      show_trails: true,
      trail_length: 50,
      gravitational_constant: 1.5,
      sim_speed: 0.8,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Pulsar System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_neutron_stars: 1,
      num_planets: 3,
      num_gas_giants: 0,
      num_asteroids: 15,
      placement: 'Circular',
      init_velocity: 40,
      mutual_gravity: true,
      gravitational_constant: 1.3,
      sim_speed: 0.7,
      show_trails: true,
      trail_length: 30,
      preset_zoom: 1.5,
    });
  } else if (ps === 'White Dwarf Binary') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_white_dwarfs: 2,
      num_planets: 0,
      num_gas_giants: 0,
      num_asteroids: 80, // Increased for debris disk effect
      placement: 'Circular',
      init_velocity: 25,
      mutual_gravity: true,
      gravitational_constant: 1.4,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 40,
      show_accretion_disk: true, // Show accretion between white dwarfs
      preset_zoom: 1.5,
    });
  } else if (ps === 'Stellar Graveyard') {
    Object.assign(SETTINGS, {
      num_black_holes: 3,
      num_neutron_stars: 5,
      num_white_dwarfs: 8,
      num_planets: 10, // Some planets survived their stars' death
      num_gas_giants: 3,
      num_asteroids: 200, // Lots of debris
      placement: 'Random',
      init_velocity: 25,
      velocity_stddev: 12,
      mutual_gravity: true,
      gravitational_constant: 1.6,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.8,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Galactic Center') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 4000,
      bh_behavior: 'Static',
      num_neutron_stars: 8,
      num_white_dwarfs: 15,
      num_planets: 30,
      num_gas_giants: 8,
      num_asteroids: 100,
      placement: 'Multi-Ring',
      init_velocity: 70,
      velocity_stddev: 25,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      gravitational_constant: 1.8,
      sim_speed: 0.6,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Supernova Remnant') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_neutron_stars: 1,
      num_white_dwarfs: 0,
      num_planets: 5, // Planets that survived the supernova
      num_gas_giants: 2,
      num_asteroids: 200, // Lots of debris from the explosion
      placement: 'Random',
      init_velocity: 50, // High-velocity debris
      velocity_stddev: 25,
      mutual_gravity: true,
      gravitational_constant: 1.8,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 60,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Compact Object Zoo') {
    Object.assign(SETTINGS, {
      num_black_holes: 3,
      num_neutron_stars: 4,
      num_white_dwarfs: 6,
      num_planets: 10,
      num_gas_giants: 3,
      num_asteroids: 40,
      placement: 'Random',
      init_velocity: 20,
      mutual_gravity: true,
      gravitational_constant: 1.5,
      sim_speed: 0.7,
      enable_star_merging: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Millisecond Pulsar') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_neutron_stars: 1,
      num_white_dwarfs: 1,
      num_planets: 2,
      num_gas_giants: 0,
      num_asteroids: 25,
      placement: 'Circular',
      init_velocity: 45,
      mutual_gravity: true,
      gravitational_constant: 1.4,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 35,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Tidal Disruption Event') {
    // Tidal disruption is only ever applied to stars, and this scenario had
    // num_stars: 0. Its planets and asteroids were left at the origin, inside
    // the hole, and absorbed on the first frame: the title promised a star
    // being pulled apart and the scene delivered a merger. It now opens with a
    // star on a plunging orbit whose closest approach falls inside the tidal
    // radius, so the existing mass-loss code has something to act on.
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 2000,
      num_stars: 1,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      num_planets: 0,
      num_gas_giants: 0,
      num_asteroids: 0,
      placement: 'Empty',
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      sim_speed: 0.5,
      gravitational_constant: 2.0,
      show_trails: true,
      trail_length: 320,
      enable_star_merging: false,
      preset_zoom: 0.7,
    });
  } else if (ps === 'Intermediate Mass BH') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 400,
      num_neutron_stars: 2,
      num_white_dwarfs: 8,
      num_planets: 30,
      num_gas_giants: 5,
      num_asteroids: 60,
      placement: 'Multi-Ring',
      init_velocity: 40,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.7,
      sim_speed: 0.6,
      mutual_gravity: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Galactic Collision') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      bh_mass: 900,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [1200, 1000], // Milky Way vs Andromeda-like masses
      num_planets: 300, // Represent billions of stars
      num_gas_giants: 30,
      num_asteroids: 600, // Lots of small objects
      num_neutron_stars: 15,
      num_white_dwarfs: 25,
      placement: 'Multi-Ring',
      init_velocity: 40,
      velocity_stddev: 20,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      orbit_decay_rate: 0.005,
      sim_speed: 0.4, // Slower to see the collision develop
      gravitational_constant: 1.9,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Micro BH Swarm') {
    Object.assign(SETTINGS, {
      num_black_holes: 12,
      bh_mass: 1.2,
      bh_behavior: 'Orbiting', // Make them dynamic!
      use_individual_bh_masses: true,
      bh_masses: [0.8, 1.1, 0.9, 1.4, 1.6, 1.2, 0.7, 1.3, 1.0, 1.5, 0.6, 1.8],
      num_planets: 50,
      num_gas_giants: 8,
      num_asteroids: 150,
      placement: 'Random',
      init_velocity: 20,
      velocity_stddev: 8,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.5,
      sim_speed: 0.7,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Exoplanet Lab') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_planets: 120, // Diverse exoplanet collection
      num_gas_giants: 25, // Including hot Jupiters, mini-Neptunes
      num_asteroids: 300,
      num_neutron_stars: 1, // Pulsar planets are a thing!
      num_white_dwarfs: 2, // White dwarf planets discovered
      placement: 'Multi-Ring',
      init_velocity: 18,
      velocity_stddev: 8,
      mutual_gravity: true, // Planetary systems can interact
      show_accretion_disk: false,
      show_bh_glow: false,
      gravitational_constant: 1.3,
      sim_speed: 0.6,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Triple BH System') {
    Object.assign(SETTINGS, {
      num_black_holes: 3,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [20, 15, 10],
      num_planets: 20,
      num_asteroids: 40,
      placement: 'Circular',
      init_velocity: 10,
      orbit_decay_rate: 0.001,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.6,
      sim_speed: 0.8,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Supermassive BH') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 80,
      num_planets: 50,
      num_gas_giants: 5,
      num_asteroids: 100,
      init_velocity: 25,
      show_accretion_disk: true,
      show_bh_glow: true,
      gravitational_constant: 1.7,
      sim_speed: 0.7,
      mutual_gravity: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Star Cluster') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_planets: 80, // These represent main-sequence stars
      num_gas_giants: 15, // These represent evolved stars
      num_asteroids: 150,
      num_neutron_stars: 2,
      num_white_dwarfs: 8,
      placement: 'Random',
      init_velocity: 12,
      velocity_stddev: 6,
      mutual_gravity: true, // Stars in clusters DO interact gravitationally
      gravitational_constant: 1.2,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      trail_length: 25,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Kuiper Belt') {
    Object.assign(SETTINGS, {
      // Was 'Empty', which: with no custom placement code for this scenario: // left all 300 belt objects stacked at the origin. Multi-Ring gives the
      // nested rings a Kuiper Belt actually wants, on circular orbits around
      // the central star.
      placement: 'Multi-Ring',
      mutual_gravity: true,
      num_black_holes: 0,
      num_stars: 1, // Central star for Kuiper Belt objects
      num_planets: 8,
      num_gas_giants: 4,
      enable_asteroids: true,
      num_asteroids: 300,
      init_velocity: 15,
      velocity_stddev: 5,
      gravitational_constant: 1.1,
      sim_speed: 0.9,
      show_trails: true,
      trail_length: 20,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Sagittarius A*') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 4000, // Reduced from 4 million to 4000 for better gameplay
      bh_behavior: 'Static',
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      num_planets: 100, // These represent S-stars near Sgr A*
      num_gas_giants: 5,
      num_asteroids: 200,
      num_neutron_stars: 10,
      num_white_dwarfs: 20,
      placement: 'Multi-Ring',
      init_velocity: 70, // Reduced from 300 for better visibility
      velocity_stddev: 25, // Reduced from 100
      mutual_gravity: true,
      sim_speed: 0.5, // Slower to see the extreme dynamics
      gravitational_constant: 2.0,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Binary Star System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 2, // Add 2 stars for binary system
      mutual_gravity: true,
      placement: 'Empty',
      num_planets: 5,
      num_gas_giants: 2,
      num_asteroids: 20,
      init_velocity: 20,
      velocity_stddev: 8,
      gravitational_constant: 1.2,
      sim_speed: 0.8,
      enable_star_merging: true,
      show_trails: true,
      // Trail length is a frame count, so 30 held about half a second of
      // motion: a stub the width of the star itself. This is roughly a
      // quarter of the binary's period, which is enough to read as an orbit.
      trail_length: 240,
      preset_zoom: 1.5,
      // A 120-unit binary needs a bounded step or the integration loses energy
      // and the pair spirals together: at six times speed the separation fell
      // from 120 to 85 in twenty seconds and the stars merged. Binary Pair
      // carries the same guard for the same reason.
      max_timestep: 0.15,
    });
  } else if (ps === 'Solar System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1, // One sun-like star
      // Use central-star gravity but disable planet-planet mutual gravity
      mutual_gravity: false,
      star_only_gravity: true,
      placement: 'Empty',
      num_planets: 8, // 8 planets like our solar system
      num_gas_giants: 0, // Gas giants are included in planets
      num_asteroids: 50, // Asteroid belt
      num_comets: 10, // Comets
      init_velocity: 15,
      velocity_stddev: 3,
      gravitational_constant: 1.0,
      sim_speed: 1.0, // Start at 1x for Solar System
      enable_star_merging: true,
      show_trails: true,
      trail_length: 20,
      sim_size: 'Large', // Neptune sits 30 AU out at true scale
      // At 100 units per AU, Neptune is 3007 units from the Sun and no zoom
      // shows it alongside a legible inner system. This frames Mercury out to
      // Saturn, where the planets are clearly separated; scroll out for the ice
      // giants.
      preset_zoom: 0.25,
    });
  } else if (ps === 'Earth-Moon System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 0, // No central star, just Earth-Moon
      num_planets: 1, // Earth
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      placement: 'Empty', // Special placement handled in initialization
      init_velocity: 10,
      velocity_stddev: 2,
      gravitational_constant: 1.0,
      sim_speed: 0.3, // Very slow for detailed observation
      enable_star_merging: false,
      show_trails: true,
      trail_length: 30,
      sim_size: 'Small', // Focused view
      preset_zoom: 1.5,
    });
  } else if (ps === 'Slingshot') {
    Object.assign(SETTINGS, {
      placement: 'Random',
      num_black_holes: 2,
      use_individual_bh_masses: true,
      bh_masses: [60, 3], // Larger mass ratio for dramatic effect
      bh_behavior: 'Orbiting',
      num_planets: 25,
      num_gas_giants: 5,
      num_asteroids: 40,
      init_velocity: 30,
      velocity_stddev: 10,
      mutual_gravity: true,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.8,
      gravitational_constant: 1.6,
      enable_star_merging: false, // Disable merging to prevent immediate black hole merger
      preset_zoom: 1.5,
    });
  } else if (ps === 'Rogue Encounter') {
    Object.assign(SETTINGS, {
      placement: 'Empty',
      num_black_holes: 1,
      num_stars: 1, // Central star system
      bh_mass: 30,
      bh_behavior: 'Orbiting',
      mutual_gravity: true,
      num_planets: 12,
      num_gas_giants: 4,
      num_asteroids: 80,
      init_velocity: 40,
      velocity_stddev: 15,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.7,
      gravitational_constant: 1.5,
      enable_star_merging: true,
      preset_zoom: 1.5,
    });
  } else if (ps === 'Quasar Cannon') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 1e9,
      num_stars: 50,
      placement: 'Random',
      sim_size: 'Huge',
      init_velocity: 120,
      velocity_stddev: 40,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: true,
      star_density: 10000,
      sim_speed: 0.7,
      show_trails: true,
      trail_length: 60,
      enable_star_merging: true,
      // Visual: high accretion rate (handled in rendering)
      preset_zoom: 0.05,
    });
  } else if (ps === 'The Pinwheel Galaxy Core') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      use_individual_bh_masses: true,
      bh_masses: [1e5, 1e5],
      num_stars: 200,
      placement: 'Circular',
      sim_size: 'Huge',
      init_velocity: 90,
      velocity_stddev: 10,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 80,
      enable_star_merging: true,
      // Visual: all stars co-rotating (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Star Frisbee') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 10,
      num_stars: 30,
      placement: 'Circular',
      sim_size: 'Large',
      init_velocity: 8,
      velocity_stddev: 2,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 1.0,
      show_trails: true,
      trail_length: 30,
      enable_star_merging: true,
      // Special: BH moves at 500 km/s (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Kessler Cascade') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 5,
      num_stars: 0,
      num_planets: 0,
      num_gas_giants: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      num_asteroids: 0,
      num_comets: 0,
      sim_size: 'Large',
      placement: 'Random',
      sim_speed: 1.2,
      show_trails: true,
      trail_length: 20,
      enable_star_merging: true,
      // 300 micro-stars as 0.1 Msun stars (handled in initialization)
      preset_zoom: 1.5,
    });
    SETTINGS.num_micro_stars = 300;
    SETTINGS.micro_star_mass = 0.1;
    SETTINGS.micro_star_high_velocity = true;
  } else if (ps === 'Alien Dyson Swarm Collapse') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 1,
      num_stars: 100,
      placement: 'Circular',
      sim_size: 'Medium',
      init_velocity: 30,
      velocity_stddev: 2,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 0.9,
      show_trails: true,
      trail_length: 18,
      enable_star_merging: false,
      // Visual: satellites, slight orbital decay (handled in initialization)
      preset_zoom: 1.5,
    });
    SETTINGS.satellites_are_dyson = true;
  } else if (ps === 'Tidal Arm Tango') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      use_individual_bh_masses: true,
      bh_masses: [1e6, 1e6],
      num_stars: 300,
      placement: 'Multi-Ring',
      sim_size: 'Huge',
      init_velocity: 100,
      velocity_stddev: 30,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.7,
      show_trails: true,
      trail_length: 100,
      enable_star_merging: true,
      preset_zoom: 0.3,
    });
    // Presets run before the simulation is populated, so the flyby geometry is
    // recorded here and applied by applyPresetLayout() once the holes exist.
    // Setting positions inline (as this did) touched the *previous*
    // scenario's black holes, which were cleared moments later.
    SETTINGS.bh_layout = 'parabolic-flyby';
    state.zoom = 0.3;
  } else if (ps === 'Hungry Hungry Holes') {
    Object.assign(SETTINGS, {
      num_black_holes: 4,
      use_individual_bh_masses: true,
      bh_masses: [50, 50, 50, 50],
      num_stars: 50,
      placement: 'Random',
      sim_size: 'Large',
      init_velocity: 20,
      velocity_stddev: 10,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 40,
      enable_star_merging: true,
      // Special: BHs at square corners, stars in center (handled in initialization)
      preset_zoom: 1.5,
    });
  } else if (ps === 'Slingshot Gauntlet') {
    Object.assign(SETTINGS, {
      num_black_holes: 5,
      use_individual_bh_masses: true,
      bh_masses: [30, 30, 30, 30, 30],
      num_stars: 1,
      placement: 'Grid',
      sim_size: 'Large',
      init_velocity: 0,
      velocity_stddev: 0,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 1.1,
      show_trails: true,
      trail_length: 25,
      enable_star_merging: false,
      // Special: test star shot at 1000 km/s (handled in initialization)
      preset_zoom: 1.5,
    });
    SETTINGS.test_star_slingshot = true;
  } else if (ps === 'Black Hole Billiards') {
    // The central hole used to be a million solar masses, which gives it a
    // drawn radius of 505 units inside a region 300 units across: the camera
    // started inside its own horizon and the thumbnail was a black rectangle.
    // Two thousand solar masses puts the radius at 78, small enough to see
    // around and still four times the radius of the three that orbit it.
    Object.assign(SETTINGS, {
      num_black_holes: 4,
      use_individual_bh_masses: true,
      bh_masses: [2000, 25, 25, 25],
      num_stars: 14,
      placement: 'Random',
      sim_size: 'Large',
      init_velocity: 30,
      velocity_stddev: 10,
      show_accretion_disk: true,
      show_bh_glow: true,
      sim_speed: 0.9,
      show_trails: true,
      trail_length: 240,
      enable_star_merging: true,
      // The three light holes are put on explicit orbits in build_simulation;
      // the comment that used to sit here claimed that already happened.
      preset_zoom: 0.85,
    });
  } else if (ps === 'Stellar Nursery') {
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 1,
      num_stars: 100,
      placement: 'Random',
      sim_size: 'Medium',
      init_velocity: 10,
      velocity_stddev: 5,
      show_accretion_disk: false,
      show_bh_glow: true,
      sim_speed: 0.8,
      show_trails: true,
      trail_length: 20,
      enable_star_merging: true,
      // Special: BH grows in mass over time (handled in simulation loop)
      preset_zoom: 1.5,
    });
  } else if (ps === "Kepler's 2nd Law") {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1,
      mutual_gravity: false,
      star_only_gravity: true,
      placement: 'Empty',
      num_planets: 2,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      gravitational_constant: 1.0,
      sim_speed: 5.0,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 40,
      sim_size: 'Small',
      // The outer body now sits at 320 units, so the view has to reach further.
      preset_zoom: 0.9,
      // This scenario exists to show that an orbit keeps its shape, so it
      // cannot be allowed to drift. At sim_speed 5 a frame is a step of about
      // 0.42, which symplectic Euler turns into a visible creep in
      // eccentricity over a minute or two. Capping the step makes the frame
      // take several smaller ones instead, at the same apparent speed.
      max_timestep: 0.05,
    });
  } else if (ps === 'Binary Pair') {
    // Two stars of two solar masses each, four AU apart, going round their
    // common center once every four years. The numbers are chosen so that the
    // lesson's own arithmetic lands on whole numbers: 4 cubed over 4 squared is
    // 4, which is the total mass.
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 2,
      mutual_gravity: false,
      star_only_gravity: true,
      placement: 'Empty',
      num_planets: 0,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      gravitational_constant: 1.0,
      // One lap takes about forty seconds, which is long enough to watch both
      // stars move and short enough to see the loop close.
      sim_speed: 4.0,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 300,
      sim_size: 'Medium',
      preset_zoom: 1.5,
      max_timestep: 0.15,
      min_interaction_distance: 1.0,
    });
  } else if (ps === 'Black Hole Lab') {
    // One black hole and four bodies on stable circular orbits around it. The
    // orbits are the point: the commonest thing a student believes about black
    // holes is that they pull everything in, and nothing argues with that as
    // well as watching four objects go round one for a minute without falling.
    //
    // The mass is left as a setting so a lesson step can change it, and the
    // orbit radii are worked out from the black hole's drawn size rather than
    // fixed, so the picture holds together at any mass.
    Object.assign(SETTINGS, {
      num_black_holes: 1,
      bh_mass: 10,
      bh_behavior: 'Static',
      num_stars: 0,
      num_planets: 4,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      placement: 'Empty',
      mutual_gravity: false,
      star_only_gravity: false,
      gravitational_constant: 1.0,
      show_accretion_disk: true,
      show_bh_glow: true,
      show_bh_jets: false,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 260,
      sim_speed: 1.6,
      sim_size: 'Medium',
      preset_zoom: 1.5,
      max_timestep: 0.05,
      min_interaction_distance: 1.0,
    });
  } else if (ps === 'Habitable Zone Lab') {
    // The inner Solar System with the habitable-zone ring switched on. Venus,
    // Earth and Mars are the three worlds the lesson argues about, and having
    // them on screen against a correctly placed zone is the whole point: two of
    // the three sit outside the conservative band, and the one inside it is the
    // only one with liquid water on its surface.
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1,
      num_planets: 4,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      placement: 'Empty',
      mutual_gravity: false,
      star_only_gravity: true,
      gravitational_constant: 1.0,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 220,
      sim_speed: 3.0,
      sim_size: 'Medium',
      preset_zoom: 1.9,
      max_timestep: 0.05,
      min_interaction_distance: 1.0,
      // Conservative by default; the lesson switches it to compare.
      habitable_zone_optimism: 1.0,
    });
  } else if (ps === 'Interstellar Visitor') {
    // 1I/'Oumuamua on its real hyperbolic orbit, with Earth in for scale. The
    // point of the scenario is a single reading: the total energy is positive,
    // so it is not bound to the Sun and this pass is the only one there will
    // ever be.
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1,
      mutual_gravity: false,
      star_only_gravity: true,
      placement: 'Empty',
      num_planets: 2,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      gravitational_constant: 1.0,
      // About three quarters of a minute from four AU out, through perihelion
      // and back out again: long enough to watch it happen, short enough to sit
      // through twice.
      sim_speed: 0.8,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 400,
      sim_size: 'Large',
      preset_zoom: 1.1,
      // Perihelion is inside Mercury's orbit and the visitor is moving at
      // 88 km/s when it gets there, so the step has to be small enough to keep
      // the turn sharp rather than rounding it off.
      max_timestep: 0.01,
      min_interaction_distance: 1.0,
    });
  } else if (ps === 'Transit Lab' || ps === 'Blended Binary') {
    // HD 209458: the first planet ever caught transiting, in 1999, and still
    // the best-studied. Everything here is at true relative scale, which is
    // what makes it usable as a measuring instrument: the star is drawn at
    // 1.155 solar radii and the planet at 1.38 Jupiter radii, so the silhouette
    // on screen, the depth of the dip and the radius ratio a student works out
    // from it are all the same number. The view has to zoom a long way in for
    // that to be visible, which is the honest price of not exaggerating.
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: ps === 'Blended Binary' ? 2 : 1,
      mutual_gravity: false,
      star_only_gravity: true,
      placement: 'Empty',
      num_planets: 1,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      gravitational_constant: 1.0,
      // One orbit takes about 13 seconds of wall clock, so a student waiting to
      // time successive transits waits seconds rather than minutes. The transit
      // itself goes past in half a second, which is far too quick to catch by
      // hand: the light curve panel finds it in the recording instead, and
      // sampling every frame still puts about thirty points inside it.
      sim_speed: 0.03,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 60,
      sim_size: 'Small',
      // The orbit is 9.5 units across at 100 units per AU. This fills the view
      // with it without clipping the trail.
      preset_zoom: 60.0,
      // About 4700 integration steps per orbit, which holds the orbit fixed
      // over the many circuits a student watching for repeat transits needs.
      max_timestep: 0.0004,
      // The default floor of 5 units is larger than the whole orbit.
      min_interaction_distance: 0.1,
    });
  } else if (ps === 'TRAPPIST-1 System') {
    Object.assign(SETTINGS, {
      num_black_holes: 0,
      num_stars: 1,
      // Seven Earth-mass planets one or two units apart pulled each other into
      // crossing orbits within seconds. The real system's planets do perturb
      // each other measurably, which is how their masses were weighed, but at
      // this scale and timestep it is just a collision cascade.
      mutual_gravity: false,
      star_only_gravity: true,
      placement: 'Empty',
      num_planets: 7,
      num_gas_giants: 0,
      num_asteroids: 0,
      num_comets: 0,
      init_velocity: 7,
      velocity_stddev: 0.5,
      gravitational_constant: 1.0,
      // TRAPPIST-1b's year is a day and a half and its whole orbit is 63px
      // across on screen, so it crosses the view very fast for any given speed
      // setting. At 0.05 it was still moving too quickly to click. This gives it
      // roughly half a minute per orbit, which is slow enough to select a
      // planet and read its numbers.
      sim_speed: 0.01,
      enable_star_merging: false,
      show_trails: true,
      trail_length: 25,
      sim_size: 'Small',
      // The whole system is 0.062 AU across, which at the project's 100 units
      // per AU is 6.2 units. Everything else is drawn at this scale, so the
      // view has to zoom a long way in rather than the scenario inventing its
      // own units.
      preset_zoom: 55.0,
      // About 1400 integration steps per orbit of the innermost planet, which
      // holds every orbit's shape over thousands of circuits.
      max_timestep: 0.0006,
      // The default softening floor of 5 units is larger than six of the seven
      // orbits here, which starved them of gravity. Well below the innermost
      // orbit at 1.15 units, and still far from zero.
      min_interaction_distance: 0.2,
    });
  } else if (ps === 'GW150914') {
    Object.assign(SETTINGS, {
      num_black_holes: 2,
      bh_behavior: 'Orbiting',
      use_individual_bh_masses: true,
      bh_masses: [36, 29],
      num_planets: 0,
      num_gas_giants: 0,
      num_stars: 0,
      num_asteroids: 0,
      num_comets: 0,
      num_neutron_stars: 0,
      num_white_dwarfs: 0,
      placement: 'Circular',
      mutual_gravity: false,
      orbit_decay_rate: 0.0025, // Strong inspiral for dramatic GW effect
      show_trails: true,
      sim_speed: 1.0,
      show_velocity_vectors: false,
      interactive_add: true,
      trail_length: 20,
      trail_style: 'Glow',
      sim_size: 'Large',
      star_density: 10000,
      input_object_type: 'BlackHole',
      show_bh_glow: true,
      show_accretion_disk: false,
      show_bh_jets: false,
      show_dynamic_overlays: true,
      enable_asteroids: false,
      dynamic_object_properties: true,
      record_simulation: false,
      show_ambient_lighting: true,
      planet_base_color: '#6495ed',
      star_base_color: '#ffff00',
      enable_star_merging: false,
      max_star_mass_before_bh: 20.0,
      preset_zoom: 1.7,
    });
  }

  SETTINGS.preset_scenario = 'None';
};

export { applyPreset };

/**
 * Apply geometry that can only be set once the objects exist.
 * Called by initialize_simulation after the scenario has been populated.
 * @param {Object} SETTINGS - Live settings object
 * @param {Array} bh_list - The simulation's black holes
 */
export function applyPresetLayout(SETTINGS, bh_list) {
  if (SETTINGS.bh_layout !== 'parabolic-flyby') return;
  if (bh_list.length < 2) return;

  const sep = 700;
  const v = 120;
  bh_list[0].pos.x = -sep;
  bh_list[0].pos.y = 0;
  bh_list[1].pos.x = sep;
  bh_list[1].pos.y = 0;
  bh_list[0].vel.x = 0;
  bh_list[0].vel.y = v;
  bh_list[1].vel.x = 0;
  bh_list[1].vel.y = -v;
  // Jets point along the orbital axis: one up, one down
  bh_list[0].jet_orientation = Math.PI / 2;
  bh_list[1].jet_orientation = -Math.PI / 2;
}
