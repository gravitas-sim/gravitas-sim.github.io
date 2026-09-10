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
  // The conservation check. OFF by default, and this is a presentation choice
  // rather than a retreat from the numbers.
  //
  // The three lines it printed - the integrator's name, an energy drift and an
  // angular-momentum drift - are a statement about a numerical method, and
  // they were in the corner of every first visit with nothing to say what they
  // meant or what to do about them. A reader who has not been told otherwise
  // reads "-0.03% energy drift" as a fault, and in a scenario with a static
  // black hole or imposed orbital decay reads a large one as a fault too, when
  // it is the model doing exactly what it was built to do.
  //
  // Nothing is calculated less often. conservationDrift() is unchanged, the
  // validation suite, the reliability check, the investigations and the
  // evidence exports all read it exactly as before, and Settings >
  // Numerical accuracy turns the display back on. Five scenarios that are
  // *about* the integration set it themselves, and a saved state or share
  // link that carries it keeps it.
  show_conservation_diagnostics: false,
  // The numerical scheme. Symplectic Euler is the default and must stay it:
  // every scenario in the catalog was laid out and timed against its error.
  integrator: 'Symplectic Euler',

  // --- The binary planet laboratory -----------------------------------------
  // The controlled system behind the two Binary Planet Lab scenarios and the
  // "Planets in Binary Stars" investigation. Every one of these is stated
  // rather than sampled, which is the entire difference between this and the
  // randomized Binary Star System next to it in the catalog: two runs of a
  // scenario built from a generator are two different experiments.
  //
  // The defaults are the ones the investigation is written against, and they
  // were chosen by running the configurations rather than by taste. With
  // mu = m2/(m1+m2) = 1/3 and e = 0.4 the published critical radii land at
  // 0.177 separations for a planet around one star and 3.61 for a planet
  // around both, which puts a clear survivor and a clear disruption within a
  // few binary periods of each other and inside a run a student will sit
  // through. See js/binaryStability.js for the fits and their source.
  binary_lab_m1: 1.0, // solar masses, the star a circumstellar planet orbits
  binary_lab_m2: 0.5, // solar masses, the companion
  binary_lab_separation: 10, // AU, semi-major axis of the stars' relative orbit
  binary_lab_eccentricity: 0.4,
  binary_lab_binary_phase: 0, // degrees of true anomaly from periapsis at t=0
  // The planet's starting semi-major axis, in units of the binary separation.
  // Expressed as a ratio because that is the variable the stability boundary
  // is a function of: 0.15 means the same thing whether the stars are 10 AU
  // apart or 100, and a student changing the separation is then changing one
  // thing rather than two.
  binary_lab_planet_a: 0.15,
  binary_lab_planet_phase: 0, // degrees from +x, independent of the binary's
  // How many binary periods to integrate before stopping and reporting. Not a
  // claim about stability at any length: see the outcome wording.
  binary_lab_periods: 20,

  // --- The Lagrange point laboratory ------------------------------------------
  // Two massive bodies on an exactly circular orbit and a tracer light enough
  // to be ignored by both. That is the circular restricted three-body problem,
  // and every claim the teaching overlay makes - Lagrange points, zero-velocity
  // curves, the Jacobi constant - is true only of that arrangement.
  lagrange_primary_mass: 1, // solar masses
  // 0.03 rather than something rounder: it puts the mass ratio at 0.0291,
  // comfortably below Routh's 0.0385, so L4 and L5 are linearly stable and the
  // lesson can show a stable equilibrium beside three unstable ones.
  lagrange_secondary_mass: 0.03,
  lagrange_separation: 8, // AU between the two massive bodies
  // The tracer, as a fraction of the pair. A billionth: far below the
  // threshold at which it would perturb the orbit it is being predicted
  // against, and not zero, because a massless body drops out of the
  // barycentre and out of the conservation diagnostics.
  lagrange_tracer_fraction: 1e-9,
  // Where the tracer starts, in units of the separation, measured in the
  // rotating frame from the barycentre. The default puts it just inside L1.
  lagrange_tracer_x: 0.6,
  lagrange_tracer_y: 0,
  // Its velocity in the rotating frame, which is what sets the Jacobi constant
  // and therefore which gates are open to it.
  lagrange_tracer_vx: 0,
  lagrange_tracer_vy: 0,

  // --- The orbital transfer laboratory ----------------------------------------
  // One heavy star, a spacecraft on a circular orbit, and a target on an outer
  // circular coplanar orbit. Nothing else, and nothing eccentric: a Hohmann
  // transfer has a closed-form answer only between circular coplanar orbits,
  // and a lesson that asks a student to check their measurement against that
  // answer has to be run somewhere the answer is actually right.
  transfer_star_mass: 1, // solar masses
  transfer_inner_au: 1, // spacecraft's starting circular radius
  transfer_outer_au: 2.5, // the target's circular radius
  // The spacecraft's mass, as a fraction of the star's. Not zero: a massless
  // body drops out of the barycentre and out of the energy bookkeeping the
  // conservation diagnostics use. Small enough that the two-body formulae,
  // which assume it, are right to well past the precision anybody reads.
  transfer_probe_mass_ratio: 1e-9,
  // Where the target starts, in degrees ahead of the spacecraft. The phase
  // that makes the transfer actually arrive somewhere useful is a result the
  // lesson derives rather than a number it hands over, so this is deliberately
  // not that value.
  transfer_target_phase_deg: 0,

  // --- The gravity assist laboratory ------------------------------------------
  // A moving planet and a very light spacecraft, and nothing else in the
  // isolated case. Same reasoning as the binary lab: the two shipped Slingshot
  // scenarios are randomised fields of dozens of bodies under mutual gravity,
  // which is fine to watch and impossible to interpret - there is no isolated
  // encounter in them, no defined before and after, and no controlled impact
  // parameter.
  //
  // The defaults were measured rather than chosen. At five Jupiter masses with
  // the probe crossing at 0.461 units, an impact parameter of 40 turns it by
  // 60.9 degrees and takes its inertial speed from 0.35 to 0.63; the same
  // encounter on the other side takes it to 0.18. Closest approach is 23 units
  // against a planet drawn at 2, so the pass is distant and well resolved.
  assist_planet_mass: 5, // Jupiter masses
  // How fast the planet moves through the inertial frame. Only used when there
  // is no star; with one, the planet's speed is whatever its orbit gives it.
  assist_planet_speed: 0.3,
  // Radius of the planet's circular orbit about a star, or 0 for no star at
  // all. Zero is the honest case for teaching the frame change: with no star
  // the planet's frame is exactly inertial, so "the speed relative to the
  // planet is unchanged" is exact rather than approximate.
  assist_orbit_radius: 0,
  // SIGNED, and the sign is the lesson: positive passes behind the planet and
  // gains speed, negative passes in front and loses it.
  assist_impact_parameter: 40,
  assist_v_infinity: 0.461, // speed relative to the planet, far away
  assist_approach_deg: 130.6, // direction of the incoming asymptote
  // Where "before" and "after" are read, planet-to-spacecraft. The same
  // distance on both legs, so the vis-viva correction is the same size on both
  // and the two numbers being compared mean the same thing.
  assist_gate: 4000,
  // The spacecraft's mass as a fraction of the planet's. A real probe is 1e-25
  // of a planet, which makes the recoil true and unreadable; at 1e-6 the
  // planet's velocity change is 5e-7 - ten orders of magnitude above float
  // noise, and still small enough that the test-particle scattering formula
  // holds to far better than anything here is measured to.
  assist_probe_mass_ratio: 1e-6,
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
  // Follow mode's bookkeeping. `followOffset` is how far the reader has moved
  // the camera away from the followed body and wants to stay; `followPan` is
  // the pan the follow step last wrote, so anything that differs next step was
  // somebody else's input; `followTarget` is what is being followed, so a
  // change of target starts a fresh camera. See js/followCamera.js. None of
  // these is a setting and none travels in a share link.
  followOffset: { x: 0.0, y: 0.0 },
  followPan: null,
  followTarget: null,
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
