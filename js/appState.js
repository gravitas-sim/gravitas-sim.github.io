// =============================================================================
// Application state
// -----------------------------------------------------------------------------
// The three objects the whole application shares: the view state, the live
// settings, and the name of the scenario currently loaded.
//
// They used to live in js/ui.js, and that single fact was the shape of the
// dependency graph. Eleven modules imported js/ui.js, and four of them -
// controls, lightCurve, timeline, exportDialog - wanted nothing from it except
// these objects. Because js/ui.js also imports those modules back, every one
// of those imports closed a cycle, and the import graph said the renderer
// depended on the settings panel when what it actually depended on was a
// settings object.
//
// So the state moved down here, below everything, and js/ui.js re-exports it
// unchanged. Nothing about the objects themselves is different: `state` is the
// same mutable object it always was and `SETTINGS` is still reassigned
// wholesale when a save is loaded. What changed is who has to be imported to
// reach them.
//
// Why setters for two of the three
// -----------------------------------------------------------------------------
// `state` is a const object that is mutated in place, so an importer's binding
// is always current. `SETTINGS` and `current_scenario_name` are reassigned -
// loading a save replaces the settings object outright - and an ES module
// cannot assign to a binding it imported. The reassignments therefore go
// through setSettings() and setScenarioName(). Importers still read the plain
// bindings, which are live and follow the reassignment.
// =============================================================================

export const DEFAULT_SETTINGS = {
  preset_scenario: 'Binary BH',
  gravitational_constant: 2.0,
  follow_mode: 'None',
  num_planets: 15,
  num_gas_giants: 2,
  num_neutron_stars: 0,
  num_white_dwarfs: 0,
  num_stars: 0,
  init_velocity: 20,
  velocity_stddev: 5,
  bh_mass: 10,
  num_black_holes: 1,
  bh_behavior: 'Static',
  use_individual_bh_masses: false,
  bh_masses: [],
  orbit_decay_rate: 0.005,
  // 0 = integrate at whatever step the frame gives. A scenario that needs its
  // orbits to hold their shape sets a cap; see the substep loop in render.js.
  max_timestep: 0,
  // 0 = use the physics default. A compact scenario lowers it; see physics.js.
  min_interaction_distance: 0,
  placement: 'Random',
  mutual_gravity: false,
  show_trails: true,
  sim_speed: 1.0,
  show_velocity_vectors: false,
  // The acceleration overlay and the potential underlay are the two halves of
  // the "velocity is not force" demonstration. Off by default, like the
  // velocity arrows: they are an instrument a student switches on, and a
  // scenario that opened covered in arrows would be teaching before it was
  // asked to.
  show_acceleration_vectors: false,
  show_potential_well: false,
  // The always-on canvas instrumentation. On by default, because a picture of
  // a simulation with no scale and no clock on it cannot be cited, and these
  // are the two facts a screenshot most often has to carry.
  show_scale_bar: true,
  show_elapsed_time: true,
  // The conservation readout. On, and quiet: three short lines in the corner.
  show_conservation_diagnostics: true,
  // The numerical scheme. Symplectic Euler is the default and must stay it:
  // every scenario in the catalog was laid out and timed against its error.
  integrator: 'Symplectic Euler',
  interactive_add: true,
  trail_length: 15,
  trail_style: 'Glow',
  sim_size: 'Large',
  star_density: 10000,
  input_object_type: 'Star',
  show_bh_glow: true,
  show_accretion_disk: true,
  realistic_disk_physics: true,
  show_bh_jets: false,
  show_dynamic_overlays: true,
  enable_asteroids: true,
  num_asteroids: 10,
  num_comets: 0,
  dynamic_object_properties: true,
  record_simulation: false,
  show_ambient_lighting: true,
  planet_base_color: '#6495ed',
  star_base_color: '#ffff00',
  enable_star_merging: true,
  max_star_mass_before_bh: 20.0,
  show_gravitational_waves: true, // Enable GW visualization by default
  // Visual fidelity
  show_object_lensing: true,
  lensing_quality: 'medium',
  trail_colour_mode: 'type',
  disk_doppler: true,
  // Dark matter. These have to be here, not only in physicsSettings:
  // applyPreset rebuilds SETTINGS from these defaults on every scenario load,
  // so a key that is missing from this object is a key no scenario can reset.
  // Without them the halo stayed switched on after Milky Way Rotation and
  // quietly changed the force law in every scenario loaded afterwards,
  // including the Solar System, whose rotation curve is the one measurement the
  // dark-matter lesson opens by trusting.
  // Which law governs a galaxy's outskirts: 'newtonian', 'halo' or 'mond'.
  // One setting rather than two flags, so that the halo and MOND - competing
  // explanations for the same observation - cannot both be switched on. The
  // older `dark_matter_halo` boolean is still accepted on the way in, so
  // shared links and saved games from before this existed still load; see
  // normaliseGalaxyGravity in js/physics.js.
  galaxy_gravity: 'newtonian',
  halo_v_flat: 6.0,
  halo_core_radius: 300,
  // What one simulation unit represents, for the galaxy scale models. Zero
  // everywhere else, which is what refuses MOND outside them.
  galaxy_kpc_per_unit: 0,
  galaxy_msun_per_unit: 0,
  // Scenario-only keys. Each of these is written by one scenario (preset_zoom
  // by all of them) and read nowhere else, so before they were listed here
  // there was no value for applyPreset to reset them to: whatever the last
  // scenario set survived into the next one, exactly as the halo did.
  // The values are what the app should use when no scenario asks for anything.
  preset_zoom: 1.5,
  // 1.0 selects the conservative habitable zone; see
  // habitableZoneModelFromSettings() in render.js, which switches at 1.3.
  habitable_zone_optimism: 1.0,
  // Per-neutron-star masses, the same shape as bh_masses above.
  use_individual_ns_masses: false,
  ns_masses: [],
  // Kessler Cascade's swarm of 0.1 Msun stars. None by default; the mass is
  // the per-star value, so it stays physical rather than zero when unused.
  num_micro_stars: 0,
  micro_star_mass: 0.1,
  micro_star_high_velocity: false,
  // Alien Dyson Swarm Collapse draws its stars as satellites.
  // Geometry applied after the bodies exist, by applyPresetLayout() in
  // scenarios.js. null means the scenario asked for no special layout.
  bh_layout: null,
  // Slingshot Gauntlet fires a single test star past the black holes.
  test_star_slingshot: false,
  // Performance/architecture toggles
  use_barnes_hut: false,
  barnes_hut_theta: 0.4,
  adaptive_detail: true,
  // Which quality tier to render at. 'auto' lets js/quality.js choose from the
  // measured frame rate; 'full' and 'low' overrule it. Never chosen from a
  // user-agent string - the same Chromebook is fast on one scenario and slow on
  // another, and the label on the box does not say which.
  quality_tier: 'auto',
  target_fps: 60,
  chart_update_hz: 8,
  star_only_gravity: false,
  // Sticky-orbit and preview defaults
  sticky_dir_only_angle_deg: 15,
  snap_min_speed: 2.0,
  preview_gravity_boost: 4.0,
};

/** The view state: zoom, pan, selection, interaction. Mutated in place. */
export const state = {
  zoom: 1.0,
  pan: { x: 0.0, y: 0.0 },
  // Where the reference frame's origin currently is, in world units. Every
  // world-to-screen conversion subtracts it, so choosing a frame moves the
  // picture without touching the user's own pan. Zero is the world frame.
  frameOffset: { x: 0.0, y: 0.0 },
  paused: false,
  mouse: { x: -1000, y: -1000, down: false }, // Initialize mouse off-screen to prevent accidental object detection
  // Hold-to-add state
  isHolding: false,
  holdStart: null, // {x,y} in world coords
  holdCurrent: null, // {x,y} in world coords
  adding_mass: false,
  add_start_screen: { x: 0, y: 0 },
  add_start_world: { x: 0, y: 0 },
  inspector_open: false,
  touch_active: false,
  touch_id: null,
  last_time: 0,
  frame_count: 0,
  user_has_interacted: false, // Track if user has actually interacted with the page
  // Orbit helper state
  orbit_helper: {
    enabled: true,
    preview: null, // { center:{x,y}, radius:number, points:[{x,y}], vel:{x,y} }
  },
  // New drag preview state
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  dragCurrent: { x: 0, y: 0 },
  // Sticky orbit snapping state for preview and spawn
  stickyOrbit: {
    active: false,
    centralId: null,
    snappedVel: null,
  },
  // Overlay for showing stable orbit when inspector is open
  inspectorOrbitOverlay: {
    active: false,
    points: [],
  },
  // Kepler's 2nd Law area sweep overlay
  areaSweepOverlay: {
    active: false,
    parentId: null,
    objectId: null,
    wedges: [],
    orbitPoints: [],
    parent: null,
  },
};

/** The live settings. Reassigned wholesale when a save is loaded. */
export let SETTINGS = { ...DEFAULT_SETTINGS };

/**
 * Replace the settings object.
 *
 * @param {object} next - The new settings
 * @returns {object} The settings now in force
 */
export function setSettings(next) {
  SETTINGS = next;
  return SETTINGS;
}

/** The scenario currently loaded, or null for a hand-built world. */
export let current_scenario_name = null;

/**
 * Record which scenario is loaded.
 *
 * @param {?string} name - Scenario name, or null
 */
export function setScenarioName(name) {
  current_scenario_name = name;
}
