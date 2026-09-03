// UI and event handling functions

import {
  computeDockPosition,
  renderDetails,
  patchDetails,
  renderEnergy,
  renderPinnedCard,
  splitIdentity,
} from './objectInspector.js';
import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  EARTH_MASSES_PER_JUPITER_MASS,
} from './constants.js';
import { HD209458 } from './data/exoplanetSystems.js';
import { formatNumber, withUnit } from './format.js';
import {
  screen_to_world,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  particles,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  galaxies,
  accretion_disk_particles,
  resetPhysicsObjectCounter,
  resetTrailTick,
  barycenterBodies,
  bumpWorldGeneration,
  setPhysicsObjectCounter,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  CERES_MASS_UNIT,
  HALLEY_MASS_UNIT,
  syncReportedMass,
  INTEGRATORS,
  getSimulationTime,
  resetSimulationTime,
  setSimulationTime,
  resetAbsorptionAccounting,
  resetConservationBaseline,
  JUPITER_MASS_UNIT,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  StarObject,
  BlackHole,
  Debris,
  NeutronStar,
  WhiteDwarf,
  Galaxy,
  updatePhysicsSettings,
  setStateReference,
  particlePool,
  findObjectAtPosition,
  // Energy calculation functions
  getObjectEnergyHistory,
  clearObjectEnergyHistory,
  clearAllEnergyHistory,
  getObjectEnergyStats,
  // Orbit preview helpers
  getMostMassiveBody,
  gravitational_acceleration,
} from './physics.js';

import {
  worldToScreen,
  debugLog,
  solarHTML,
  earthHTML,
  jupiterHTML,
} from './utils.js';
import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  resetFrame,
  frameOriginVelocity,
  resolveFrameOrigin,
  frameState,
  onFrameChange,
} from './referenceFrame.js';
import {
  getPositionAngle,
  getInclination,
  setPositionAngle,
  setInclination,
} from './observerGeometry.js';
import { withExtras, readExtras } from './experiments/canonicalState.js';
import { SPACE_OBJECT_NAMES } from './data/objectNames.js';
import { haloEnclosedMass } from './darkMatter.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { SCENARIO_TAGS } from './data/scenarioTags.js';
import { TRAPPIST1_STAR, TRAPPIST1_PLANETS } from './data/trappist1.js';
import { applyPreset, applyPresetLayout } from './scenarios.js';
import { t, hasMessage, onLocaleChange } from './i18n/index.js';
import { EN } from './i18n/en.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';
import { resetPotentialCache } from './vectorOverlay.js';
import { toast } from './controls.js';
import {
  toggleTool,
  isToolActive,
  toolsPointerDown,
  toolsPointerMove,
  toolsPointerUp,
  latchStopwatchTo,
  stopwatch,
  stopwatchTarget,
  setCaptureMode,
} from './sandboxTools.js';
import {
  canRecord,
  isRecording,
  startRecording,
  stopRecording,
  recordingStatus,
  extensionFor,
} from './capture.js';
import { withSeed, getWorldSeed, setWorldSeed, randomSeed } from './rng.js';
import { orbitalElements, dominantPrimary } from './orbital.js';
import {
  timeUnitSeconds,
  SIM_UNITS_PER_AU,
  formatSpeed,
  formatDistance,
} from './units.js';
import { blackHoleFacts, yearsLabel } from './blackHolePhysics.js';
import {
  buildPayload,
  packBody,
  payloadSeed,
  chooseKind,
} from './shareState.js';

/**
 * Apply the selected preset scenario to the live settings.
 * Thin wrapper: the preset table itself lives in scenarios.js.
 */
const apply_preset = () => {
  // bh_layout used to be deleted here, because it had no entry in
  // DEFAULT_SETTINGS and so was the one leaked key anything noticed. It has an
  // entry now, along with the rest of the scenario-only keys, so the reset
  // inside applyPreset clears it the same way it clears everything else.
  applyPreset(SETTINGS, DEFAULT_SETTINGS, state);
};
import { generateStarfield } from './render.js';
import { toggleSonification, getSonificationState } from './audio.js';
import {
  initChart,
  updateChart,
  clearChart,
  exportChart,
  resizeChart,
} from './energyChartNew.js';

const canvas = document.getElementById('simulationCanvas');
const starfieldCanvas = document.getElementById('starfieldCanvas');

// Global state object
const state = {
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
// No global annotation helpers in clean state
// Return attractors sorted by gravitational influence m/r^2
function getDominantAttractors(startPos, limit = 1) {
  const candidates = [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs];
  const G = SETTINGS.gravitational_constant;
  const scored = candidates
    .filter(b => b && b.alive)
    .map(b => {
      const dx = b.pos.x - startPos.x;
      const dy = b.pos.y - startPos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      return { body: b, influence: (G * b.mass) / r2 };
    })
    .sort((a, b) => b.influence - a.influence);
  return scored.slice(0, Math.max(1, limit)).map(s => s.body);
}

// How many equal-time slices the area-sweep overlay is cut into. Exposed so a
// lesson can let a student change it and watch the areas stay equal.
let areaSweepWedges = 8;

/**
 * Set the number of equal-area wedges and rebuild the overlay.
 * @param {number} n - Wedge count
 */
const setAreaSweepWedges = n => {
  areaSweepWedges = Math.max(2, Math.min(24, Math.round(n)));
  const ov = state.areaSweepOverlay;
  if (!ov.active || !ov.objectId) return;
  const body = [...planets, ...asteroids, ...comets, ...gas_giants].find(
    o => o.id === ov.objectId
  );
  if (!body) return;
  const data = computeAreaSweep(body, areaSweepWedges);
  if (data) Object.assign(state.areaSweepOverlay, data, { active: true });
};

/** @returns {number} Current wedge count */
const getAreaSweepWedges = () => areaSweepWedges;

// How far the orbit may drift before the drawn wedges stop describing it.
// Generous enough to survive ordinary integrator wobble, tight enough that a
// collision, a mass change or a slingshot retires the overlay immediately.
const SWEEP_STALE_FRACTION = 0.06;

/**
 * Retire the equal-area overlay once it no longer matches the real orbit.
 *
 * The overlay is a snapshot of one particular ellipse. If the body is absorbed,
 * flung onto a different orbit, or has its mass changed, the wedges become a
 * picture of an orbit nothing is on, which is worse than showing nothing.
 *
 * @returns {boolean} True if the overlay is still valid
 */
const checkAreaSweepValidity = () => {
  const ov = state.areaSweepOverlay;
  if (!ov.active) return false;

  const body = [...planets, ...asteroids, ...comets, ...gas_giants].find(
    o => o.id === ov.objectId
  );
  const parent = ov.parent;
  if (!body || body.alive === false || !parent || parent.alive === false) {
    ov.active = false;
    return false;
  }
  if (ov.a === undefined) return true; // built before this data was recorded

  const el = orbitalElements(body, parent, SETTINGS.gravitational_constant);
  if (!el || !el.bound) {
    ov.active = false;
    return false;
  }
  const dA = Math.abs(el.a - ov.a) / Math.max(ov.a, 1e-9);
  const dE = Math.abs(el.e - ov.e);
  if (dA > SWEEP_STALE_FRACTION || dE > SWEEP_STALE_FRACTION) {
    ov.active = false;
    ov.wedges = [];
    ov.orbitPoints = [];
    return false;
  }
  return true;
};

/**
 * Draw the equal-area wedges for a given body.
 *
 * Normally this is reached through the inspector's toggle, which a lesson
 * hides. A lesson that asks a student to click planets and compare their
 * orbits needs the overlay to follow the selection instead.
 *
 * @param {Object} obj - Body to draw the sweep for
 * @returns {boolean} True if an overlay was produced
 */
const showAreaSweepFor = obj => {
  if (!obj || areaSweepSuppressed) return false;
  const data = computeAreaSweep(obj, areaSweepWedges);
  if (!data) return false;
  Object.assign(state.areaSweepOverlay, data, { active: true });
  return true;
};

// The Kepler's 2nd Law scenario switches the wedges on when it builds, a fifth
// of a second after the rest of it. That is right for the lesson that scenario
// was made for and wrong for any other lesson borrowing the same star and
// planets, so a caller can refuse them outright rather than racing that timer
// to switch them off again.
let areaSweepSuppressed = false;

/**
 * Refuse or allow the equal-area wedges.
 * @param {boolean} on - True to keep them off the screen
 */
const setAreaSweepSuppressed = on => {
  areaSweepSuppressed = Boolean(on);
  if (areaSweepSuppressed) state.areaSweepOverlay.active = false;
};

/** @returns {boolean} True while the wedges are being refused */
const isAreaSweepSuppressed = () => areaSweepSuppressed;

/**
 * Solve Kepler's equation M = E - e sin(E) for the eccentric anomaly.
 *
 * Newton's method, which converges in a handful of iterations for every
 * eccentricity a bound orbit can have.
 *
 * @param {number} M - Mean anomaly, radians
 * @param {number} e - Eccentricity
 * @returns {number} Eccentric anomaly, radians
 */
function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 40; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-13) break;
  }
  return E;
}

/**
 * Build the equal-area wedges for a body's orbit.
 *
 * The orbit is constructed analytically from the orbital elements rather than
 * by integrating. Integrating stepped for exactly one analytic period, but
 * symplectic Euler's own period differs from the analytic one by a fraction of
 * a percent, so the path never quite closed: the wedges spanned 359.3 degrees
 * and left a thin unfilled remainder at periapsis, where the angular rate is
 * highest and the gap is most visible. Solving Kepler's equation instead closes
 * the ellipse exactly and divides it into intervals of exactly equal time,
 * which by conservation of angular momentum are intervals of exactly equal
 * area.
 *
 * @param {Object} obj - The orbiting body
 * @param {number} [wedgeCount] - How many equal-time segments to cut
 * @returns {Object|null} Overlay data, or null if the orbit is not bound
 */
function computeAreaSweep(obj, wedgeCount = areaSweepWedges) {
  const G = SETTINGS.gravitational_constant;
  const candidates = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
  ];
  let parent = null;
  let maxInfluence = -Infinity;
  for (const b of candidates) {
    if (!b || !b.alive || b === obj) continue;
    const dx = obj.pos.x - b.pos.x;
    const dy = obj.pos.y - b.pos.y;
    const r2 = Math.max(1e-6, dx * dx + dy * dy);
    const influence = (G * b.mass) / r2;
    if (influence > maxInfluence) {
      maxInfluence = influence;
      parent = b;
    }
  }
  if (!parent) return null;

  const rx = obj.pos.x - parent.pos.x;
  const ry = obj.pos.y - parent.pos.y;
  const vx = obj.vel.x - parent.vel.x;
  const vy = obj.vel.y - parent.vel.y;

  const r = Math.hypot(rx, ry);
  if (!(r > 0)) return null;
  const mu = G * (parent.mass + (obj.mass || 0));
  const energy = (vx * vx + vy * vy) / 2 - mu / r;
  if (!(energy < 0)) return null; // unbound: no closed orbit to divide

  const a = -mu / (2 * energy);
  const h = rx * vy - ry * vx;
  // Eccentricity vector, which points from the focus toward periapsis.
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.min(0.999, Math.hypot(ex, ey));
  const omega = Math.atan2(ey, ex);
  // Sign of the angular momentum sets the direction of travel.
  const dir = h >= 0 ? 1 : -1;

  // Where the body is now, as a mean anomaly, so the wedges start from it.
  const cosNu = (ex * rx + ey * ry) / (Math.max(e, 1e-9) * r);
  const nu0 =
    Math.sign(rx * ey - ry * ex) === 0
      ? Math.acos(Math.max(-1, Math.min(1, cosNu)))
      : -Math.sign(rx * ey - ry * ex) *
        Math.acos(Math.max(-1, Math.min(1, cosNu)));
  const E0 =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu0 / 2),
      Math.sqrt(1 + e) * Math.cos(nu0 / 2)
    );
  const M0 = E0 - e * Math.sin(E0);

  const N = Math.max(2, Math.min(24, Math.round(wedgeCount)));
  const PER_WEDGE = 90;
  const b = a * Math.sqrt(1 - e * e);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const at = M => {
    const E = solveKepler(M, e);
    // Perifocal coordinates, then rotated into the simulation frame.
    const xp = a * (Math.cos(E) - e);
    const yp = b * Math.sin(E) * dir;
    return { x: xp * cosW - yp * sinW, y: xp * sinW + yp * cosW };
  };

  const wedges = [];
  const orbitPoints = [];
  for (let w = 0; w < N; w++) {
    const wedge = [];
    for (let k = 0; k <= PER_WEDGE; k++) {
      const M = M0 + 2 * Math.PI * ((w + k / PER_WEDGE) / N);
      const pt = at(M);
      wedge.push(pt);
      if (k < PER_WEDGE || w === N - 1) orbitPoints.push(pt);
    }
    wedges.push(wedge);
  }
  // Close the outline exactly on the point it started from.
  orbitPoints.push({ ...orbitPoints[0] });

  const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);
  return {
    parentId: parent.id,
    parent,
    objectId: obj.id,
    wedges,
    orbitPoints,
    wedgeCount: N,
    period,
    wedgeTime: period / N,
    a,
    e,
  };
}

function computeCircularVelocity(startPos, body) {
  const G = SETTINGS.gravitational_constant;
  const dx = startPos.x - body.pos.x;
  const dy = startPos.y - body.pos.y;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  const v = Math.sqrt((G * body.mass) / dist);
  const angle = Math.atan2(startPos.y - body.pos.y, startPos.x - body.pos.x);
  const tangent = angle + Math.PI / 2;
  return { x: v * Math.cos(tangent), y: v * Math.sin(tangent) };
}

// Integrate a short trajectory preview under dominant attractors
function computeTrajectoryPreview(
  startPos,
  initialVel,
  useCircularSnap = false
) {
  const bodies = getDominantAttractors(startPos, 1);
  if (bodies.length === 0) return null;
  let vel = { x: initialVel.x, y: initialVel.y };
  // If snapping, replace initial velocity with circular around most influential body
  if (useCircularSnap && bodies[0]) {
    vel = computeCircularVelocity(startPos, bodies[0]);
  }
  const points = [];
  let p = { x: startPos.x, y: startPos.y };
  const dt = 0.12; // preview integration step in sim seconds
  // Adaptive number of steps: fewer when moving slowly, more when fast
  const vPreviewMag = Math.hypot(vel.x, vel.y);
  const stepsBase = 120;
  const stepsK = 0.8; // sensitivity; tune if needed
  const steps = Math.max(
    80,
    Math.min(300, Math.floor(stepsBase + stepsK * vPreviewMag))
  );
  const softening2 = 1e-3;
  const G = SETTINGS.gravitational_constant;
  for (let i = 0; i < steps; i++) {
    const b = bodies[0];
    const dx = b.pos.x - p.x;
    const dy = b.pos.y - p.y;
    const r2 = dx * dx + dy * dy + softening2;
    const invR = 1 / Math.sqrt(r2);
    const aMag = (G * b.mass) / r2;
    const ax = aMag * dx * invR;
    const ay = aMag * dy * invR;
    vel.x += ax * dt;
    vel.y += ay * dt;
    p.x += vel.x * dt;
    p.y += vel.y * dt;
    points.push({ x: p.x, y: p.y });
    // Early stop if far off-screen to save work
    if (Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6) break;
  }
  return { points, velSuggested: vel, attractor: bodies[0] };
}

// Update orbit helper preview during drag (reflects trajectory if released now)
function updateOrbitHelper(shiftSnap) {
  if (!state.adding_mass || !state.orbit_helper.enabled) {
    state.orbit_helper.preview = null;
    return;
  }
  // Compute initial velocity from current drag vector (same scaling as placement)
  const current = screen_to_world(state.mouse);
  const initialVel = {
    x: (current.x - state.add_start_world.x) * 3,
    y: (current.y - state.add_start_world.y) * 3,
  };
  state.orbit_helper.preview = computeTrajectoryPreview(
    state.add_start_world,
    initialVel,
    !!shiftSnap
  );
}

// Immediately hide object inspector when module loads
if (typeof document !== 'undefined') {
  const objectInspector = document.getElementById('objectInspector');
  if (objectInspector) {
    objectInspector.classList.remove('visible');
    objectInspector.classList.remove('showUI');
    objectInspector.style.display = 'none';
    objectInspector.style.opacity = '0';
    objectInspector.style.visibility = 'hidden';
    objectInspector.style.pointerEvents = 'none';
  }
}

// Global variables
const SAVE_KEY = 'gravitas_simulation_save';
// Hold this long on empty canvas to arm object placement on touch devices.
const LONG_PRESS_MS = 380;

const DEFAULT_SETTINGS = {
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
  dark_matter_halo: false,
  halo_v_flat: 6.0,
  halo_core_radius: 300,
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
  satellites_are_dyson: false,
  // Geometry applied after the bodies exist, by applyPresetLayout() in
  // scenarios.js. null means the scenario asked for no special layout.
  bh_layout: null,
  // Slingshot Gauntlet fires a single test star past the black holes.
  test_star_slingshot: false,
  // Performance/architecture toggles
  use_barnes_hut: false,
  barnes_hut_theta: 0.4,
  adaptive_detail: true,
  target_fps: 60,
  chart_update_hz: 8,
  star_only_gravity: false,
  // Sticky-orbit and preview defaults
  sticky_dir_only_angle_deg: 15,
  snap_min_speed: 2.0,
  preview_gravity_boost: 4.0,
};

let SETTINGS = { ...DEFAULT_SETTINGS };
let localSettings = {};

let current_scenario_name = null;

// Space Object Name Database
if (typeof window !== 'undefined') {
  window.SPACE_OBJECT_NAMES = SPACE_OBJECT_NAMES;
}

// Expanded scenario information

// Object inspection functions - copied from working original file
const PLANET_RADIUS = 5; // From physics.js
const GAS_GIANT_RADIUS = 8; // From physics.js
const STAR_OBJ_RADIUS = 20; // From physics.js
const NEUTRON_STAR_RADIUS = 3; // From physics.js
const WHITE_DWARF_RADIUS = 8; // From physics.js
const ASTEROID_RADIUS = 2; // From physics.js

const getBlackHoleInfo = bh => {
  const massInSuns = bh.mass / SOLAR_MASS_UNIT;
  // Every derived number comes from blackHolePhysics.js, which is also what the
  // "Black Holes by the Numbers" investigation reads. The lesson asks students
  // to discover the trends in exactly these quantities, so the two have to
  // agree to the last digit.
  const f = blackHoleFacts(massInSuns);
  const bhType = f.category;

  return {
    icon: '\u26ab',
    title: bh.name || 'Black Hole',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${solarHTML(formatNumber(massInSuns))} (${withUnit(f.massKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.schwarzschildRadius'),
        value: `${withUnit(f.rsKm, 'km')} (${withUnit(f.rsAU, 'AU')})`,
      },
      {
        label: t('inspector.stat.escapeVelocityAtRs'),
        value: '100.0% of light speed',
      },
      {
        label: t('inspector.stat.averageDensity'),
        value: withUnit(f.density, 'kg/m\u00b3'),
      },
      {
        label: t('inspector.stat.hawkingTemperature'),
        value: withUnit(f.temperature, 'K'),
      },
      {
        // toFixed() gives up above 1e21 and returns the raw float, so this row
        // used to read "2.0973585980140657e+61 billion years".
        label: t('inspector.stat.hawkingLifetime'),
        value: yearsLabel(f.lifetimeYears),
      },
      {
        // A stellar-mass hole's innermost stable orbit takes milliseconds, and
        // rounding that to "0.0 hours" hid the most striking thing about it.
        label: t('inspector.stat.iscoPeriod'),
        value:
          f.iscoPeriodSeconds < 60
            ? withUnit(f.iscoPeriodSeconds, 's')
            : withUnit(f.iscoPeriodHours, 'hours'),
      },
      { label: t('inspector.stat.type'), value: bhType },
      {
        label: t('inspector.stat.position'),
        value: `(${bh.pos.x.toFixed(1)}, ${bh.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(bh.vel.x, bh.vel.y)),
      },
    ],
    description: `A ${bhType.toLowerCase()} black hole with ${massInSuns > 1e6 ? 'enormous' : massInSuns > 100 ? 'substantial' : massInSuns > 3 ? 'moderate' : 'minimal'} mass. The event horizon has a radius of ${f.rsKm.toFixed(1)} km. ${f.temperature > 1 ? 'This black hole emits Hawking radiation.' : 'This black hole is too massive to emit significant Hawking radiation.'} ${massInSuns > 1e6 ? 'Supermassive black holes like this power active galactic nuclei and quasars.' : massInSuns > 100 ? 'Intermediate black holes are rare and may form from merging stellar-mass black holes.' : massInSuns > 3 ? 'Stellar-mass black holes form from the collapse of massive stars.' : 'Primordial black holes may have formed in the early universe.'}`,
  };
};

/**
 * Orbital period of a body about whatever it is actually orbiting, in days.
 *
 * Replaces four copies of a calculation that assumed a 1000-unit primary
 * sitting at the origin and measured distance from the origin rather than from
 * the primary, on a length scale that matched neither the simulation nor
 * units.js. In the Kepler scenario it reported 3.1 days for an orbit whose real
 * period is about 1.7 years, which is the sort of number a student is asked to
 * write down in an investigation.
 *
 * @param {Object} body - The orbiting object
 * @returns {number|null} Period in days, or null if unbound or with no primary
 */
const realOrbitalPeriodDays = body => {
  if (!body?.pos) return null;
  const primary = dominantPrimary(
    body,
    [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs].filter(
      p => p !== body
    )
  );
  if (!primary) return null;
  const el = orbitalElements(body, primary, SETTINGS.gravitational_constant);
  if (!el || !el.bound || !isFinite(el.period)) return null;
  return (el.period * timeUnitSeconds()) / 86400;
};

/**
 * Format an orbital period for the inspector.
 * @param {number|null} days - Period in days
 * @returns {string} Display text
 */
const formatOrbitalPeriod = days => {
  if (days === null) return 'unbound';
  if (days > 365) return withUnit(days / 365, 'years');
  if (days < 1) return withUnit(days * 24, 'hours');
  return withUnit(days, 'days');
};

const getStarInfo = star => {
  const massInSuns = star.massInSuns || star.mass / SOLAR_MASS_UNIT;
  const radiusInSuns = star.radius / STAR_OBJ_RADIUS;
  const radiusInKm = radiusInSuns * 696340; // Solar radius in km
  const massInKg = massInSuns * 1.989e30; // Solar mass in kg

  // Real surface temperature estimate based on mass
  const surfaceTemperature = 3000 + (massInSuns - 0.2) * 4000; // K

  // Real luminosity in solar units
  const luminosity = Math.pow(massInSuns, 3.5); // Solar luminosity units

  // Real surface gravity (m/s²)
  const G = 6.6743e-11;
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  // Real escape velocity (m/s)
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real orbital period at 1 AU (if applicable)
  const orbitalPeriodDays = realOrbitalPeriodDays(star);

  // Calculate stellar age based on mass and main sequence lifetime
  // More massive stars have shorter lifetimes
  // Use a deterministic calculation based on mass for consistent age
  const mainSequenceLifetime = Math.pow(massInSuns, -2.5) * 10; // Billion years, rough approximation
  const age = mainSequenceLifetime * 0.3; // Assume star is 30% through its main sequence lifetime

  let spectralType = 'M';
  if (massInSuns > 2.1) spectralType = 'O';
  else if (massInSuns > 1.4) spectralType = 'B';
  else if (massInSuns > 1.04) spectralType = 'A';
  else if (massInSuns > 0.8) spectralType = 'F';
  else if (massInSuns > 0.45) spectralType = 'G';
  else if (massInSuns > 0.08) spectralType = 'K';

  return {
    icon: '⭐',
    title: star.name || 'Star',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${solarHTML(formatNumber(massInSuns))} (${withUnit(massInKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.radius'),
        value: `${solarHTML(formatNumber(radiusInSuns), 'R')} (${withUnit(radiusInKm, 'km')})`,
      },
      {
        label: t('inspector.stat.surfaceTemperature'),
        value: withUnit(surfaceTemperature, 'K'),
      },
      {
        label: t('inspector.stat.luminosity'),
        value: solarHTML(formatNumber(luminosity), 'L'),
      },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      { label: t('inspector.stat.spectralType'), value: spectralType },
      {
        label: t('inspector.stat.lifespan'),
        value: withUnit(age, 'billion years'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      {
        label: t('inspector.stat.position'),
        value: `(${star.pos.x.toFixed(1)}, ${star.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(star.vel.x, star.vel.y)),
      },
    ],
    description: `A ${spectralType}-type star with ${massInSuns > 3 ? 'high' : massInSuns > 0.8 ? 'moderate' : 'low'} mass. ${massInSuns > 20 ? 'This massive star will likely end its life as a black hole.' : massInSuns > 8 ? 'This star will become a neutron star or black hole.' : 'This star will become a white dwarf.'}`,
  };
};

const getPlanetInfo = planet => {
  // The fallback divides by the Earth unit, not by 1. Dividing by 1 reports the
  // raw simulation mass as though it were a number of Earth masses, which is
  // wrong by a factor of 333 and is the same failure MASS_UNITS.md documents.
  const massInEarths = planet.massInEarths ?? planet.mass / EARTH_MASS_UNIT;
  const radiusInEarths = planet.radius / PLANET_RADIUS;
  const radiusInKm = radiusInEarths * 6371; // Earth radius in km
  const massInKg = massInEarths * 5.972e24; // Earth mass in kg

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInKm * 1000, 3); // Convert km to m
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11; // Gravitational constant
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real orbital period (if orbiting a central mass)
  const orbitalPeriodDays = realOrbitalPeriodDays(planet);

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  let planetType = 'Terrestrial';
  if (massInEarths > 10) planetType = 'Ice Giant';
  else if (massInEarths > 5) planetType = 'Gas Giant';
  else if (massInEarths > 0.5) planetType = 'Super-Earth';
  else planetType = 'Dwarf Planet';

  // Use the planet's actual density type if available
  const densityType = planet.density || 'rocky';
  let densityDescription = '';
  switch (densityType) {
    case 'gaseous':
      densityDescription =
        'Gaseous composition with hydrogen and helium atmosphere';
      break;
    case 'icy':
      densityDescription = 'Icy composition with frozen volatiles';
      break;
    case 'rocky':
    default:
      densityDescription = 'Rocky composition with solid surface';
      break;
  }

  return {
    icon: '🪐',
    title: planet.name || 'Planet',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${earthHTML(formatNumber(massInEarths))} (${withUnit(massInKg, 'kg')})`,
      },
      {
        label: t('inspector.stat.radius'),
        value: `${withUnit(radiusInEarths, 'R⊕')} (${withUnit(radiusInKm, 'km')})`,
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: planetType },
      {
        label: t('inspector.stat.position'),
        value: `(${planet.pos.x.toFixed(1)}, ${planet.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(planet.vel.x, planet.vel.y)),
      },
    ],
    description: `A ${planetType.toLowerCase()} with ${massInEarths > 10 ? 'substantial' : massInEarths > 1 ? 'moderate' : 'low'} mass. ${densityDescription}. ${planetType === 'Terrestrial' ? 'This rocky world could potentially support life.' : planetType === 'Gas Giant' ? 'This gaseous planet has no solid surface.' : planetType === 'Ice Giant' ? 'This icy world is composed mainly of frozen volatiles.' : 'This small world may be a captured asteroid or dwarf planet.'}`,
  };
};

const getGasGiantInfo = gasGiant => {
  const massInJupiters =
    gasGiant.massInJupiters || gasGiant.mass / JUPITER_MASS_UNIT;
  const massInEarths = massInJupiters * EARTH_MASSES_PER_JUPITER_MASS;
  const radiusInJupiters = gasGiant.radius / GAS_GIANT_RADIUS;
  const radiusInEarths = radiusInJupiters * 11.2; // Convert Jupiter radius to Earth radius (1 Jupiter = 11.2 Earth radii)
  const radiusInKm = radiusInEarths * 6371; // Earth radius in km
  const massInKg = massInEarths * 5.972e24; // Earth mass in kg

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInKm * 1000, 3);
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11;
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / (radiusInKm * 1000));

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInKm * 1000, 2);

  // Real orbital period
  const orbitalPeriodDays = realOrbitalPeriodDays(gasGiant);

  // Use the actual giant type from the object, or determine from mass
  let giantType = gasGiant.giantType || 'Gas Giant';
  if (!gasGiant.giantType) {
    if (massInJupiters > 13) giantType = 'Brown Dwarf';
    else if (massInJupiters > 5) giantType = 'Super-Jupiter';
    else if (massInJupiters > 1) giantType = 'Jupiter-like';
    else if (massInJupiters > 0.5) giantType = 'Neptune-like';
    else giantType = 'Mini-Neptune';
  }

  // Convert giant type to display format
  const displayType = giantType
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    icon: '🪐',
    title: gasGiant.name || 'Gas Giant',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${jupiterHTML(formatNumber(massInJupiters))} · ${earthHTML(formatNumber(massInEarths))}`,
      },
      {
        label: t('inspector.stat.radius'),
        value: `${withUnit(radiusInEarths, 'R⊕')} (${withUnit(radiusInKm, 'km')})`,
      },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: displayType },
      {
        label: t('inspector.stat.position'),
        value: `(${gasGiant.pos.x.toFixed(1)}, ${gasGiant.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(gasGiant.vel.x, gasGiant.vel.y)),
      },
    ],
    description: `A ${displayType.toLowerCase()} with ${massInEarths > 3000 ? 'enormous' : massInEarths > 1000 ? 'substantial' : 'moderate'} mass. ${giantType === 'brown_dwarf' ? 'This object is massive enough to fuse deuterium but not hydrogen, making it a failed star.' : giantType === 'super_jupiter' ? 'This massive gas giant has extreme atmospheric pressures and may have formed directly from a protoplanetary disk.' : giantType === 'jupiter_like' ? 'This Jupiter-like planet has a thick hydrogen-helium atmosphere with distinctive banding patterns.' : giantType === 'neptune_like' ? 'This Neptune-like ice giant has a composition rich in water, ammonia, and methane ices.' : 'This mini-Neptune has a substantial atmosphere but is smaller than typical gas giants.'}`,
  };
};
const getAsteroidInfo = asteroid => {
  // Divided by the Earth unit rather than by a literal 1: this row is what the
  // inspector shows next to a mass slider that works in Earth masses, and the
  // two have to be the same number.
  const massInEarths = asteroid.mass / EARTH_MASS_UNIT;
  const massInKg = massInEarths * 5.972e24;
  const radiusInKm = asteroid.radius * 1000; // Rough conversion
  const radiusInM = radiusInKm * 1000;

  // Real density calculation (kg/m³)
  const volume = (4 / 3) * Math.PI * Math.pow(radiusInM, 3);
  const density = massInKg / volume;

  // Real escape velocity (m/s)
  const G = 6.6743e-11;
  const escapeVelocity = Math.sqrt((2 * G * massInKg) / radiusInM);

  // Real surface gravity (m/s²)
  const surfaceGravity = (G * massInKg) / Math.pow(radiusInM, 2);

  // Real orbital period
  const orbitalPeriodDays = realOrbitalPeriodDays(asteroid);

  let asteroidType = 'Asteroid';
  if (asteroid.radius > 5) asteroidType = 'Dwarf Planet';
  else if (asteroid.radius > 2) asteroidType = 'Large Asteroid';
  else asteroidType = 'Small Asteroid';

  return {
    icon: '☄️',
    title: asteroid.name || 'Asteroid',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: `${earthHTML(formatNumber(massInEarths, { sig: 4 }))} (${withUnit(massInKg, 'kg')})`,
      },
      { label: t('inspector.stat.radius'), value: withUnit(radiusInKm, 'km') },
      { label: t('inspector.stat.density'), value: withUnit(density, 'kg/m³') },
      {
        label: t('inspector.stat.surfaceGravity'),
        value: withUnit(surfaceGravity, 'm/s²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: withUnit(escapeVelocity / 1000, 'km/s'),
      },
      {
        label: t('inspector.stat.orbitalPeriod'),
        value: formatOrbitalPeriod(orbitalPeriodDays),
      },
      { label: t('inspector.stat.type'), value: asteroidType },
      {
        label: t('inspector.stat.position'),
        value: `(${asteroid.pos.x.toFixed(1)}, ${asteroid.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(asteroid.vel.x, asteroid.vel.y)),
      },
    ],
    description: `A ${asteroidType.toLowerCase()} with ${asteroid.radius > 5 ? 'significant' : asteroid.radius > 2 ? 'moderate' : 'minimal'} mass. ${asteroidType === 'Dwarf Planet' ? 'This object is large enough to be rounded by its own gravity.' : 'This rocky body orbits in the system, potentially as part of a belt or as a rogue object.'}`,
  };
};

const getNeutronStarInfo = neutronStar => {
  const massInSuns =
    neutronStar.massInSuns || neutronStar.mass / SOLAR_MASS_UNIT;
  const radiusInKm = neutronStar.radius * 1000; // Rough conversion to km
  const density =
    neutronStar.mass / (Math.PI * neutronStar.radius * neutronStar.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * neutronStar.mass) /
      neutronStar.radius
  );
  const schwarzschildRadius =
    (2 * SETTINGS.gravitational_constant * neutronStar.mass) / (3e8 * 3e8); // Simplified

  const starType = neutronStar.starType || 'Neutron Star';
  const isPulsar = neutronStar.pulsar || false;

  return {
    icon: isPulsar ? '⚡' : '⭐',
    title: neutronStar.name || starType,
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      { label: t('inspector.stat.radius'), value: withUnit(radiusInKm, 'km') },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.schwarzschildRadius'),
        value: formatDistance(schwarzschildRadius),
      },
      { label: t('inspector.stat.type'), value: starType },
      { label: t('inspector.stat.pulsar'), value: isPulsar ? 'Yes' : 'No' },
      {
        label: t('inspector.stat.position'),
        value: `(${neutronStar.pos.x.toFixed(1)}, ${neutronStar.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(neutronStar.vel.x, neutronStar.vel.y)),
      },
    ],
    description: `A ${starType.toLowerCase()} with ${massInSuns > 2.0 ? 'extreme' : 'high'} density. ${isPulsar ? 'This pulsar emits regular beams of radiation as it rotates.' : 'This neutron star is the collapsed core of a massive star.'} ${starType === 'Magnetar' ? 'This magnetar has an extremely strong magnetic field, making it one of the most powerful objects in the universe.' : starType === 'Pulsar' ? 'This pulsar rotates rapidly, emitting beams of radiation that sweep across space.' : 'This neutron star is composed almost entirely of neutrons, making it incredibly dense.'}`,
  };
};

const getWhiteDwarfInfo = whiteDwarf => {
  const massInSuns = whiteDwarf.massInSuns || whiteDwarf.mass / SOLAR_MASS_UNIT;
  const radiusInEarths = whiteDwarf.radius / PLANET_RADIUS; // Compare to Earth radius
  const density =
    whiteDwarf.mass / (Math.PI * whiteDwarf.radius * whiteDwarf.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * whiteDwarf.mass) / whiteDwarf.radius
  );
  const chandrasekharLimit = 1.4; // Solar masses

  const dwarfType = whiteDwarf.dwarfType || 'Carbon-Oxygen';

  return {
    icon: '⭐',
    title: whiteDwarf.name || 'White Dwarf',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      {
        label: t('inspector.stat.radius'),
        value: withUnit(radiusInEarths, 'R⊕'),
      },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.chandrasekharLimit'),
        value: solarHTML(chandrasekharLimit),
      },
      { label: t('inspector.stat.type'), value: dwarfType },
      {
        label: t('inspector.stat.position'),
        value: `(${whiteDwarf.pos.x.toFixed(1)}, ${whiteDwarf.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(whiteDwarf.vel.x, whiteDwarf.vel.y)),
      },
    ],
    description: `A ${dwarfType.toLowerCase()} white dwarf with ${massInSuns > 1.2 ? 'high' : massInSuns > 0.6 ? 'moderate' : 'low'} mass. ${dwarfType === 'Oxygen-Neon' ? 'This massive white dwarf is near the Chandrasekhar limit and may become a neutron star.' : dwarfType === 'Carbon-Oxygen' ? 'This is the most common type of white dwarf, composed of carbon and oxygen.' : 'This low-mass white dwarf is composed primarily of helium.'} ${massInSuns > chandrasekharLimit ? 'This white dwarf exceeds the Chandrasekhar limit and may collapse into a neutron star.' : 'This white dwarf is stable and will slowly cool over billions of years.'}`,
  };
};

/**
 * Inspector contents for a galaxy.
 *
 * The mass is reported in solar masses like everything else in the app, and the
 * scenarios that contain galaxies say plainly that they are scale models. A
 * real cluster member is around 10^11 solar masses and a real cluster is
 * megaparsecs across; running those numbers would need the whole unit system
 * rebuilt for no gain, because what the lesson measures is a ratio of two
 * masses and a ratio does not care what the units were.
 *
 * @param {Object} galaxy - Galaxy object
 * @returns {Object} Info for the inspector
 */
const getGalaxyInfo = galaxy => {
  const massInSuns = galaxy.mass / SOLAR_MASS_UNIT;
  const speed = Math.hypot(galaxy.vel.x, galaxy.vel.y);
  const type = galaxy.galaxyType === 'elliptical' ? 'Elliptical' : 'Spiral';

  return {
    icon: '🌌',
    title: galaxy.name || 'Galaxy',
    stats: [
      {
        label: t('inspector.stat.mass'),
        value: solarHTML(formatNumber(massInSuns)),
      },
      { label: t('inspector.stat.type'), value: type },
      { label: t('inspector.stat.speed'), value: formatSpeed(speed) },
      {
        label: t('inspector.stat.position'),
        value: `(${galaxy.pos.x.toFixed(1)}, ${galaxy.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: `(${formatSpeed(galaxy.vel.x)}, ${formatSpeed(galaxy.vel.y)})`,
      },
    ],
    description:
      type === 'Spiral'
        ? 'A disc of stars, gas and dust with spiral arms, seen here at an angle. Inside it the stars orbit the center; from outside, in a cluster, the whole thing counts as a single moving mass.'
        : 'A rounded swarm of old stars with little gas left to form new ones. The largest galaxies in a cluster are usually of this kind, sitting near its center.',
  };
};

const getCometInfo = comet => {
  // Halley masses. The 0.1 that was here was a third copy of the constant the
  // Comet constructor had wrong.
  const massInComets = comet.massInComets ?? comet.mass / HALLEY_MASS_UNIT;
  const radiusInKm = comet.radius * 1000; // Rough conversion to km
  const density = comet.mass / (Math.PI * comet.radius * comet.radius);
  const escapeVelocity = Math.sqrt(
    (2 * SETTINGS.gravitational_constant * comet.mass) / comet.radius
  );
  const tailLength = comet.tailLength || 35;

  const cometType = comet.cometType || 'short_period';
  const displayType = cometType
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    icon: '☄️',
    title: comet.name || 'Comet',
    stats: [
      { label: t('inspector.stat.mass'), value: withUnit(massInComets, 'C') },
      { label: t('inspector.stat.radius'), value: withUnit(radiusInKm, 'km') },
      {
        label: t('inspector.stat.density'),
        value: withUnit(density, 'mass/unit²'),
      },
      {
        label: t('inspector.stat.escapeVelocity'),
        value: formatSpeed(escapeVelocity),
      },
      {
        label: t('inspector.stat.tailLength'),
        value: formatDistance(tailLength),
      },
      { label: t('inspector.stat.type'), value: displayType },
      {
        label: t('inspector.stat.position'),
        value: `(${comet.pos.x.toFixed(1)}, ${comet.pos.y.toFixed(1)})`,
      },
      {
        label: t('inspector.stat.velocity'),
        value: formatSpeed(Math.hypot(comet.vel.x, comet.vel.y)),
      },
    ],
    description: `A ${displayType.toLowerCase()} comet with ${massInComets > 0.1 ? 'substantial' : massInComets > 0.01 ? 'moderate' : 'small'} mass. ${cometType === 'periodic' ? "This periodic comet returns to the inner solar system regularly, like Halley's Comet." : cometType === 'long_period' ? 'This long-period comet has an orbital period of more than 200 years.' : 'This short-period comet completes its orbit in less than 200 years.'} The comet's tail is ${tailLength > 50 ? 'very long' : tailLength > 30 ? 'moderate' : 'short'} and points away from the sun due to solar radiation pressure.`,
  };
};

/**
 * Check whether an object is still part of the running simulation.
 * Objects leave via absorption, merging or off-screen culling, any of which
 * can happen while a panel still holds a reference to them.
 * @param {Object} object - Physics object to test
 * @returns {boolean} True if the object is still simulated
 */
const isObjectStillInSimulation = object => {
  if (!object) return false;
  if (object.alive === false) return false;
  return (
    bh_list.includes(object) ||
    planets.includes(object) ||
    stars.includes(object) ||
    gas_giants.includes(object) ||
    asteroids.includes(object) ||
    comets.includes(object) ||
    neutron_stars.includes(object) ||
    white_dwarfs.includes(object)
  );
};

/**
 * Show the object inspector modal with detailed information about a physics object
 * @param {Object} object - Physics object to inspect
 * @param {string} type - Type of object (BlackHole, Star, Planet, etc.)
 */
const showObjectInspector = (object, type) => {
  // Check if splash screen is still active using both the global flag and our state variable
  if (!window.splashScreenEnded || window.isSplashActive) {
    debugLog(
      'Splash screen still active, completely ignoring showObjectInspector call'
    );
    return;
  }

  // Check if inspector element exists
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) {
    console.error('objectInspector element not found!');
    return;
  }

  // Check if we're already showing the same object
  if (
    state.inspector_open &&
    state.selectedObject &&
    state.selectedObject.object &&
    state.selectedObject.object.id === object.id &&
    state.selectedObject.type === type
  ) {
    debugLog('Inspector already open for this object, skipping');
    return;
  }

  // Store the current object for auto-updating
  state.selectedObject = { object, type };

  // If object appears in a near-circular, bound orbit around the dominant body, enable blue orbit overlay
  try {
    const centerCandidates = [
      ...bh_list,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...gas_giants,
    ];
    const G = SETTINGS.gravitational_constant;
    const obj = object;
    let primary = null;
    let maxInfluence = -Infinity;
    for (const b of centerCandidates) {
      if (!b || !b.alive || b === obj) continue;
      const dx = obj.pos.x - b.pos.x;
      const dy = obj.pos.y - b.pos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      const influence = (G * b.mass) / r2;
      if (influence > maxInfluence) {
        maxInfluence = influence;
        primary = b;
      }
    }
    if (primary) {
      const rx = obj.pos.x - primary.pos.x;
      const ry = obj.pos.y - primary.pos.y;
      const r = Math.max(1e-6, Math.hypot(rx, ry));
      const vCirc = Math.sqrt((G * primary.mass) / r);
      const vMag = Math.hypot(obj.vel.x, obj.vel.y);
      const dirTan = Math.atan2(ry, rx) + Math.PI / 2;
      const vIdeal = {
        x: vCirc * Math.cos(dirTan),
        y: vCirc * Math.sin(dirTan),
      };
      const dot = obj.vel.x * vIdeal.x + obj.vel.y * vIdeal.y;
      const denom = Math.max(1e-6, vMag * vCirc);
      const cosTheta = Math.max(-1, Math.min(1, dot / denom));
      const angErr = Math.acos(cosTheta);
      const speedRatio = vMag / vCirc;
      const angleTol =
        ((SETTINGS.sticky_dir_only_angle_deg || 15) * Math.PI) / 180;
      const speedTol = 0.2; // allow ~20% speed deviation
      const isBound = 0.5 * vMag * vMag - (G * primary.mass) / r < 0;
      if (
        isBound &&
        angErr <= angleTol &&
        speedRatio > 1 - speedTol &&
        speedRatio < 1 + speedTol
      ) {
        // Build one-loop circular path for overlay
        const samples = 240;
        const theta0 = Math.atan2(ry, rx);
        const loop = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const th = theta0 + 2 * Math.PI * t;
          loop.push({
            x: primary.pos.x + r * Math.cos(th),
            y: primary.pos.y + r * Math.sin(th),
          });
        }
        state.inspectorOrbitOverlay.active = true;
        state.inspectorOrbitOverlay.points = loop;
      } else {
        state.inspectorOrbitOverlay.active = false;
        state.inspectorOrbitOverlay.points = [];
      }
    } else {
      state.inspectorOrbitOverlay.active = false;
      state.inspectorOrbitOverlay.points = [];
    }
  } catch {
    state.inspectorOrbitOverlay.active = false;
    state.inspectorOrbitOverlay.points = [];
  }

  // A guided lesson does its own reporting in its own panel, and the inspector
  // is a large floating card that lands squarely over the orbit the student has
  // just been asked to watch. Selection and the orbit overlay above still
  // happen - only the panel is withheld.
  if (inspectorSuppressed) return;

  const updateInspector = () => {
    if (!state.inspector_open || !state.selectedObject) return;

    // The selected object can be absorbed, merged away or culled while the
    // inspector is open. Without this the panel keeps polling a detached
    // object and shows a frozen ghost, and the mass slider still acts on it.
    if (!isObjectStillInSimulation(state.selectedObject.object)) {
      hideObjectInspector();
      return;
    }

    // Skip updates if slider is being dragged
    if (state.sliderDragging) {
      return;
    }

    const info = objectInfoFor(
      state.selectedObject.object,
      state.selectedObject.type
    );
    if (!info) {
      console.error('Unknown object type:', state.selectedObject.type);
      return;
    }

    const inspectorTitle = document.getElementById('inspectorTitle');
    const detailsTabContent = document.getElementById('detailsTab');

    if (!inspectorTitle || !detailsTabContent) {
      // Silently return instead of logging error - elements may not exist during initialization
      return;
    }

    inspectorTitle.innerHTML = `<span class="object-icon">${info.icon}</span>${info.title}`;

    // Check if this is a new object selection or just a real-time update
    const existingMassSlider = document.getElementById('massSlider');
    const currentObjectId =
      state.selectedObject && state.selectedObject.object
        ? String(state.selectedObject.object.id ?? 'unknown')
        : 'unknown';
    const sliderObjectId = existingMassSlider?.dataset?.objectId ?? 'unknown';
    const isNewObject =
      !existingMassSlider || sliderObjectId !== currentObjectId;

    // Don't recreate inspector if it's just a mass update (to preserve energy chart)
    // TODO: REMOVE - Energy chart preservation logic to be replaced
    const isMassUpdate =
      existingMassSlider &&
      state.selectedObject &&
      state.selectedObject.object &&
      sliderObjectId === currentObjectId &&
      Math.abs(
        parseFloat(existingMassSlider.value) - state.selectedObject.object.mass
      ) < 0.1;

    if (isNewObject && !isMassUpdate) {
      // Reset energy log when switching to a new object
      state.energyLog = [];
      const view = buildInspectorView(
        state.selectedObject.object,
        state.selectedObject.type,
        info
      );
      if (!view) return;
      paintInspectorHeader(view);
      detailsTabContent.innerHTML = renderDetails(view);

      // Set up mass slider event listeners
      setupMassSliderListeners();

      wireInspectorOverlayToggles();

      // Store object ID for future reference
      const newMassSlider = document.getElementById('massSlider');
      if (newMassSlider && state.selectedObject.object) {
        newMassSlider.dataset.objectId = currentObjectId;
      }
    } else if (isNewObject && isMassUpdate) {
      // Just update the mass slider value without recreating the inspector
      const existingMassSlider = document.getElementById('massSlider');
      if (existingMassSlider) {
        existingMassSlider.value = state.selectedObject.object.mass;
      }
    } else {
      // Ten times a second. Nothing is rebuilt: patchDetails walks the value
      // cells and writes only the ones whose text actually changed, so an open
      // "About this object", a focused control and a slider mid-drag all
      // survive. The old path replaced every row's innerHTML on every tick.
      const view = buildInspectorView(
        state.selectedObject.object,
        state.selectedObject.type,
        info
      );
      if (view) {
        paintInspectorHeader(view);
        if (!patchDetails(detailsTabContent, view)) {
          // The property list changed shape, which means the object became
          // something else. Rebuild rather than mismatch labels to values.
          detailsTabContent.innerHTML = renderDetails(view);
          setupMassSliderListeners();
          wireInspectorOverlayToggles();
        }
      }
    }

    // Update energy chart if energy tab is active
    const energyTab = document.querySelector(
      '.inspector-tab[data-tab="energy"]'
    );
    if (energyTab && energyTab.classList.contains('active')) {
      updateEnergyChart();
      updateCurrentEnergyValues();
    }
  };

  // Clear any existing update interval
  if (state.inspectorUpdateInterval) {
    clearInterval(state.inspectorUpdateInterval);
    state.inspectorUpdateInterval = null;
  }

  // Initial update
  updateInspector();

  // Update current energy values immediately (even if energy tab isn't active)
  updateCurrentEnergyValues();

  // Set up auto-update interval
  state.inspectorUpdateInterval = setInterval(updateInspector, 100); // Update 10 times per second

  // Remove inline hide styles so CSS takes over
  [
    'display',
    'opacity',
    'visibility',
    'pointerEvents',
    'position',
    'left',
    'top',
    'zIndex',
  ].forEach(prop => {
    objectInspector.style[prop] = '';
  });

  // Show the inspector
  objectInspector.classList.add('visible');

  // Ensure the showUI class is also present (added after splash screen ends)
  if (!objectInspector.classList.contains('showUI')) {
    objectInspector.classList.add('showUI');
  }

  state.inspector_open = true;

  // Clear anything a previous drag left behind, then dock. No transform is
  // applied at all - the old translate(-50%, -50%) centering is what the drag
  // code then had to undo on every mousedown.
  objectInspector.style.left = '';
  objectInspector.style.top = '';
  objectInspector.style.transform = '';
  dockInspector(objectInspector);
  layoutPinnedCards();

  // Set up mobile-friendly backdrop click to close
  setupInspectorBackdropClick();

  // Set up dragging functionality with a small delay to ensure proper positioning
  setTimeout(() => {
    setupInspectorDragging();
  }, 50);

  // Set up energy tab functionality
  setupEnergyTab();

  // Initialize energy chart immediately for new object selection
  // This ensures the chart is ready even if the energy tab isn't active
  setTimeout(() => {
    ensureChartReady();
    updateEnergyChart();
    updateCurrentEnergyValues();
  }, 100); // Small delay to ensure DOM elements are ready

  // Set up overlay minimize functionality
  setupOverlayMinimize();

  // The rail's "Selected object" option names the current selection, so it
  // changes whenever the selection does.
  paintFrameControls();
};

const hideObjectInspector = () => {
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) {
    console.error('objectInspector element not found when trying to hide!');
    return;
  }
  objectInspector.classList.remove('visible');
  objectInspector.classList.remove('dragging');
  state.inspector_open = false;
  // turn off orbit overlay when inspector closes
  state.inspectorOrbitOverlay.active = false;
  state.inspectorOrbitOverlay.points = [];
  // The equal-area overlay deliberately survives: it is a thing the user turned
  // on to look at, and closing the panel that switched it on is not a request
  // to stop looking. It clears itself instead when the orbit it describes stops
  // being the orbit the body is on. See checkAreaSweepValidity.

  // Re-apply hide styles to ensure inspector stays hidden
  objectInspector.style.display = 'none';
  objectInspector.style.opacity = '0';
  objectInspector.style.visibility = 'hidden';
  objectInspector.style.pointerEvents = 'none';
  objectInspector.style.position = 'absolute';
  objectInspector.style.left = '-9999px';
  objectInspector.style.top = '-9999px';
  objectInspector.style.zIndex = '-9999';

  // Clear auto-update interval
  if (state.inspectorUpdateInterval) {
    clearInterval(state.inspectorUpdateInterval);
    state.inspectorUpdateInterval = null;
  }

  // Stop auto-refresh
  stopAutoRefresh();

  // Reset chart state
  chartInitialized = false;
  currentObjectId = null;

  state.selectedObject = null;
  paintFrameControls();
};

// Add mobile-friendly backdrop click to close functionality
const setupInspectorBackdropClick = () => {
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) return;

  // Remove existing event listeners to prevent duplicates
  objectInspector.removeEventListener('click', handleInspectorBackdropClick);

  // Add backdrop click handler
  objectInspector.addEventListener('click', handleInspectorBackdropClick);
};

const handleInspectorBackdropClick = e => {
  // Only close if clicking on the inspector backdrop (not on content)
  if (e.target.id === 'objectInspector') {
    hideObjectInspector();
  }
};

// Dragging functionality for object inspector
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialLeft = 0;
let initialTop = 0;

const setupInspectorDragging = () => {
  const objectInspector = document.getElementById('objectInspector');
  const inspectorHeader = objectInspector?.querySelector('.inspector-header');

  if (!objectInspector || !inspectorHeader) return;

  // Remove existing listeners to prevent duplicates
  inspectorHeader.removeEventListener('mousedown', startDrag);
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', endDrag);

  // Add drag listeners
  inspectorHeader.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);

  // Touch support for mobile
  inspectorHeader.removeEventListener('touchstart', startDragTouch);
  document.removeEventListener('touchmove', dragTouch);
  document.removeEventListener('touchend', endDrag);

  inspectorHeader.addEventListener('touchstart', startDragTouch, {
    passive: false,
  }); // passive: false is required because startDragTouch calls preventDefault
  document.addEventListener('touchmove', dragTouch);
  document.addEventListener('touchend', endDrag);
};

// REMOVED: Energy tab setup function

// REMOVED: Energy chart readiness function

// REMOVED: Energy tab event listeners function

// REMOVED: Energy chart update function

// REMOVED: Energy statistics update function

// REMOVED: Energy chart export function

// REMOVED: Energy chart clear function

// ===== ENERGY TAB FUNCTIONALITY =====

// Chart state tracking
let chartInitialized = false;
let currentObjectId = null;
let autoRefreshInterval = null;
let autoRefreshEnabled = true;
const AUTO_REFRESH_INTERVAL = 2000; // 2 seconds

/**
 * Set up the energy tab with chart and controls
 */
const setupEnergyTab = () => {
  const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
  const detailsTab = document.querySelector(
    '.inspector-tab[data-tab="details"]'
  );
  const energyTabContent = document.getElementById('energyTab');
  const detailsTabContent = document.getElementById('detailsTab');

  if (!energyTab || !detailsTab || !energyTabContent || !detailsTabContent) {
    // Silently return instead of logging error - elements may not exist during initialization
    return;
  }

  debugLog('Setting up energy tab system');

  // Build energy tab HTML structure
  energyTabContent.innerHTML = renderEnergy();

  // Set up tab switching
  energyTab.addEventListener('click', () => {
    // The chart was built while this tab was hidden, so it measured a
    // zero-height parent. Now that it is visible, let it size itself.
    requestAnimationFrame(() => resizeChart());
    debugLog('Energy tab clicked');
    energyTab.classList.add('active');
    detailsTab.classList.remove('active');
    energyTabContent.classList.add('active');
    detailsTabContent.classList.remove('active');

    // Initialize chart if needed
    ensureChartReady();

    // Update current energy values immediately
    updateCurrentEnergyValues();

    // Update chart with current object data
    updateEnergyChart();

    // Start auto-refresh for this tab
    startAutoRefresh();

    // Force a chart update to ensure it's visible
    setTimeout(() => {
      if (state.selectedObject) {
        debugLog('Forcing chart update after tab activation');
        updateEnergyChart();
        updateCurrentEnergyValues();
      }
    }, 50);
  });

  detailsTab.addEventListener('click', () => {
    detailsTab.classList.add('active');
    energyTab.classList.remove('active');
    detailsTabContent.classList.add('active');
    energyTabContent.classList.remove('active');

    // Stop auto-refresh when switching away from energy tab
    stopAutoRefresh();
  });

  // Set up export button
  const exportButton = document.getElementById('exportEnergyChart');
  if (exportButton) {
    exportButton.addEventListener('click', handleExportChart);
  }

  // Set up refresh button
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    refreshButton.addEventListener('click', handleRefreshChart);
    debugLog('Refresh button event listener attached');
  } else {
    console.warn('Refresh button not found during setup');
  }

  debugLog('Energy tab setup complete');

  // Add a global click handler as a fallback for the refresh button
  // This ensures the refresh button works even if the event listener wasn't properly attached
  document.addEventListener('click', event => {
    if (event.target && event.target.id === 'refreshEnergyChart') {
      debugLog('Refresh button clicked via global handler');
      handleRefreshChart();
    }
  });
};

/**
 * Ensure chart is initialized and ready
 */
const ensureChartReady = async () => {
  const canvas = document.getElementById('energyChart');
  if (!canvas || chartInitialized) return;

  // Chart.js is fetched the first time a chart is actually wanted rather than
  // on every page load. initChart() reads the global, so it has to wait for it.
  const { ensureChartJs } = await import('./chartjs.js');
  if (!(await ensureChartJs())) return;
  if (chartInitialized) return;

  debugLog('Initializing energy chart');
  if (initChart(canvas)) {
    chartInitialized = true;
    debugLog('Energy chart initialized successfully');
  } else {
    console.error('Failed to initialize energy chart');
  }
};

/**
 * Update the current energy values display
 */
const updateCurrentEnergyValues = () => {
  if (!state.selectedObject) {
    // Clear all energy value displays
    const elements = [
      'currentKineticEnergy',
      'currentPotentialEnergy',
      'currentTotalEnergy',
      'currentDataPoints',
    ];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = id === 'currentDataPoints' ? '0' : '0 J';
      }
    });
    return;
  }

  const objectId = state.selectedObject.object.id;
  const energyStats = getObjectEnergyStats(objectId);

  // Format energy values for display
  const formatEnergyValue = value => {
    if (value === 0) return '0 J';

    const absValue = Math.abs(value);
    if (absValue >= 1e6 || absValue < 1e-3) {
      return withUnit(value, 'J');
    } else if (absValue >= 1000) {
      return withUnit(value, 'J');
    } else if (absValue >= 1) {
      return withUnit(value, 'J');
    } else {
      return withUnit(value, 'J');
    }
  };

  // Update kinetic energy
  const kineticElement = document.getElementById('currentKineticEnergy');
  if (kineticElement && energyStats.latest) {
    kineticElement.textContent = formatEnergyValue(energyStats.latest.ke);
  }

  // Update potential energy
  const potentialElement = document.getElementById('currentPotentialEnergy');
  if (potentialElement && energyStats.latest) {
    potentialElement.textContent = formatEnergyValue(energyStats.latest.pe);
  }

  // Update total energy
  const totalElement = document.getElementById('currentTotalEnergy');
  if (totalElement && energyStats.latest) {
    totalElement.textContent = formatEnergyValue(energyStats.latest.total);
  }

  // Update data points count
  const dataPointsElement = document.getElementById('currentDataPoints');
  if (dataPointsElement) {
    dataPointsElement.textContent = energyStats.dataPoints.toString();
  }
};

/**
 * Update the energy chart with current object data
 */
const updateEnergyChart = () => {
  debugLog('updateEnergyChart called');

  if (!state.selectedObject) {
    debugLog('No selected object, skipping chart update');
    return;
  }

  const objectId = state.selectedObject.object.id;
  debugLog('Updating chart for object ID:', objectId);

  // Clear chart if switching to a different object
  if (currentObjectId !== null && currentObjectId !== objectId) {
    debugLog('Switching objects, clearing chart');
    clearChart();
  }

  currentObjectId = objectId;

  // Get energy history for the selected object
  const energyHistory = getObjectEnergyHistory(objectId);
  debugLog('Energy history length:', energyHistory.length);

  if (energyHistory.length === 0) {
    debugLog('No energy data available for object:', objectId);
    // Clear chart and show collecting message
    clearChart();
    showCollectingMessage();
    // Start auto-refresh to check for new data
    startAutoRefresh();
    return;
  }

  debugLog(
    'Updating chart with',
    energyHistory.length,
    'data points for object:',
    objectId
  );

  // Ensure chart is ready before updating
  ensureChartReady();

  // Worker-decimated update
  try {
    if (!window._chartWorker) {
      const workerUrl = new URL('./chartWorker.js', import.meta.url);
      window._chartWorker = new Worker(workerUrl, { type: 'module' });
      const desiredHz = SETTINGS.chart_update_hz || 8;
      window._chartWorker.postMessage({
        type: 'config',
        desiredHz,
        maxPoints: 200,
      });
      window._chartWorker.onmessage = evt => {
        if (evt.data && evt.data.type === 'update') {
          const payload = evt.data.data;
          // Schedule non-critical chart update in idle time to avoid jank
          const run = () => updateChart(payload, SETTINGS.chart_update_hz);
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => run());
          } else {
            setTimeout(run, 0);
          }
        }
      };
    }
    window._chartWorker.postMessage({ type: 'data', data: energyHistory });
  } catch {
    // Fallback: direct update if worker fails
    const run = () => updateChart(energyHistory, SETTINGS.chart_update_hz);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => run());
    } else {
      setTimeout(run, 0);
    }
  }
  hideCollectingMessage();

  // Stop auto-refresh since we have data
  stopAutoRefresh();
};

/**
 * Show collecting data message in energy tab
 */
const showCollectingMessage = () => {
  const energyTabContent = document.getElementById('energyTab');
  if (!energyTabContent) return;

  // Find or create the collecting message element
  let collectingMessage = energyTabContent.querySelector('.collecting-message');
  if (!collectingMessage) {
    collectingMessage = document.createElement('div');
    collectingMessage.className = 'collecting-message';
    collectingMessage.innerHTML = `
            <div class="collecting-content">
                <div class="collecting-spinner"></div>
                <div class="collecting-text">Collecting data...</div>
            </div>
        `;

    // Insert after the chart container
    const chartContainer = energyTabContent.querySelector(
      '.energy-chart-container'
    );
    if (chartContainer) {
      chartContainer.parentNode.insertBefore(
        collectingMessage,
        chartContainer.nextSibling
      );
    } else {
      energyTabContent.appendChild(collectingMessage);
    }
  }

  collectingMessage.style.display = 'block';
};

/**
 * Hide collecting data message in energy tab
 */
const hideCollectingMessage = () => {
  const energyTabContent = document.getElementById('energyTab');
  if (!energyTabContent) return;

  const collectingMessage = energyTabContent.querySelector(
    '.collecting-message'
  );
  if (collectingMessage) {
    collectingMessage.style.display = 'none';
  }
};

/**
 * Start auto-refresh for energy chart
 */
const startAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    if (autoRefreshEnabled && state.selectedObject) {
      const energyTab = document.querySelector(
        '.inspector-tab[data-tab="energy"]'
      );
      if (energyTab && energyTab.classList.contains('active')) {
        updateEnergyChart();
        updateCurrentEnergyValues();
      }
    }
  }, AUTO_REFRESH_INTERVAL);

  // Update refresh button to show auto-refresh is active
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    refreshButton.title = t('chart.autoRefresh');
    refreshButton.classList.add('auto-refresh-active');
  }

  debugLog('Auto-refresh started for energy chart');
};

/**
 * Stop auto-refresh for energy chart
 */
const stopAutoRefresh = () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;

    // Update refresh button to show auto-refresh is inactive
    const refreshButton = document.getElementById('refreshEnergyChart');
    if (refreshButton) {
      refreshButton.title = t('chart.refresh');
      refreshButton.classList.remove('auto-refresh-active');
    }

    debugLog('Auto-refresh stopped for energy chart');
  }
};

/**
 * Handle chart refresh
 */
const handleRefreshChart = () => {
  debugLog('Manual chart refresh requested');

  // Ensure chart is ready before updating
  ensureChartReady();

  // Update the chart
  updateEnergyChart();

  // Update current energy values
  updateCurrentEnergyValues();

  // Provide visual feedback
  const refreshButton = document.getElementById('refreshEnergyChart');
  if (refreshButton) {
    // Add a brief visual feedback
    refreshButton.style.transform = 'scale(0.95)';
    setTimeout(() => {
      refreshButton.style.transform = '';
    }, 150);
  }
};

/**
 * Handle chart export
 */
const handleExportChart = () => {
  const dataUrl = exportChart();
  if (!dataUrl) {
    alert('Chart is not ready yet.');
    return;
  }

  try {
    const link = document.createElement('a');
    const objectId = state.selectedObject
      ? state.selectedObject.object.id
      : 'unknown';
    link.download = `energy-chart-${objectId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    debugLog('Energy chart exported successfully');
  } catch (error) {
    console.error('Failed to export energy chart:', error);
    alert('Failed to export chart. Please try again.');
  }
};

// The inspector once had a minimize button. Nothing has referenced
// .inspector-minimize in the markup, the script or the stylesheet for some
// time, so the class checks that used to guard against dragging a collapsed
// panel guarded against a state that can no longer occur. The cursor is a
// stylesheet concern now.
//
// Note this is only the inspector's dead copy: setOverlayMinimized below still
// collapses the HUD readout, and that one is reachable.

const startDrag = e => {
  e.preventDefault();

  const objectInspector = document.getElementById('objectInspector');

  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  // Get the current visual position (after any transforms)
  const rect = objectInspector.getBoundingClientRect();

  // The inspector starts centered with transform: translate(-50%, -50%)
  // When we start dragging, we need to set the absolute position to match the current visual position
  // The rect.left and rect.top give us the actual visual position on screen
  initialLeft = rect.left;
  initialTop = rect.top;

  objectInspector.classList.add('dragging');

  // Pin the panel to where it already is before switching to left/top control.
  // There is no transform to cancel any more, but the right/bottom anchors from
  // the stylesheet have to give way or the panel fights the drag.
  objectInspector.style.left = initialLeft + 'px';
  objectInspector.style.top = initialTop + 'px';
  objectInspector.style.right = 'auto';
  objectInspector.style.bottom = 'auto';
};

const startDragTouch = e => {
  // A touch that landed on one of the header's own buttons is not a drag, and
  // treating it as one broke every control up there on a phone. Calling
  // preventDefault() on touchstart cancels the click the browser would have
  // synthesised, so the close, pin and delete buttons received the tap and did
  // nothing at all - on desktop the same handler is harmless, because
  // preventDefault() on mousedown does not cancel a click, which is why this
  // went unnoticed.
  if (e.target?.closest?.('button, a, input, select, textarea')) return;

  e.preventDefault();
  isDragging = true;
  const touch = e.touches[0];
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;

  const objectInspector = document.getElementById('objectInspector');
  // Get the current visual position (after any transforms)
  const rect = objectInspector.getBoundingClientRect();

  // The inspector starts centered with transform: translate(-50%, -50%)
  // When we start dragging, we need to set the absolute position to match the current visual position
  // The rect.left and rect.top give us the actual visual position on screen
  initialLeft = rect.left;
  initialTop = rect.top;

  objectInspector.classList.add('dragging');

  // Pin the panel to where it already is before switching to left/top control.
  // There is no transform to cancel any more, but the right/bottom anchors from
  // the stylesheet have to give way or the panel fights the drag.
  objectInspector.style.left = initialLeft + 'px';
  objectInspector.style.top = initialTop + 'px';
  objectInspector.style.right = 'auto';
  objectInspector.style.bottom = 'auto';
};

const drag = e => {
  if (!isDragging) return;
  e.preventDefault();

  const objectInspector = document.getElementById('objectInspector');
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;

  // Small threshold to prevent accidental drags
  if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

  const newLeft = initialLeft + deltaX;
  const newTop = initialTop + deltaY;

  // Keep inspector within viewport bounds
  const rect = objectInspector.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
  const clampedTop = Math.max(0, Math.min(newTop, maxTop));

  // Set position and remove transform immediately to prevent jumping
  objectInspector.style.left = clampedLeft + 'px';
  objectInspector.style.top = clampedTop + 'px';
  objectInspector.style.transform = 'none';
};

const dragTouch = e => {
  if (!isDragging) return;
  e.preventDefault();

  const touch = e.touches[0];
  const objectInspector = document.getElementById('objectInspector');
  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  // Small threshold to prevent accidental drags
  if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

  const newLeft = initialLeft + deltaX;
  const newTop = initialTop + deltaY;

  // Keep inspector within viewport bounds
  const rect = objectInspector.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
  const clampedTop = Math.max(0, Math.min(newTop, maxTop));

  // Set position and remove transform immediately to prevent jumping
  objectInspector.style.left = clampedLeft + 'px';
  objectInspector.style.top = clampedTop + 'px';
  objectInspector.style.transform = 'none';
};

const endDrag = () => {
  isDragging = false;
  const objectInspector = document.getElementById('objectInspector');
  if (objectInspector) {
    objectInspector.classList.remove('dragging');
  }
};

// Overlay minimize/maximize functionality
const setupOverlayMinimize = () => {
  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  // Remove existing listeners to prevent duplicates
  minimizeBtn.removeEventListener('click', toggleOverlayMinimize);

  // Add minimize/maximize handler
  minimizeBtn.addEventListener('click', toggleOverlayMinimize);

  // The whole collapsed panel is the target for re-opening, not just the chip
  overlay.addEventListener('click', e => {
    if (!overlay.classList.contains('minimized')) return;
    if (minimizeBtn.contains(e.target)) return;
    setOverlayMinimized(overlay, minimizeBtn, false);
  });

  setOverlayMinimized(
    overlay,
    minimizeBtn,
    overlay.classList.contains('minimized')
  );
};

const toggleOverlayMinimize = e => {
  e.preventDefault();
  e.stopPropagation();

  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  const isMinimized = overlay.classList.contains('minimized');

  setOverlayMinimized(overlay, minimizeBtn, !isMinimized);
};

/**
 * Apply the minimised/expanded state to the readout panel and its control.
 * The button carries a word as well as a glyph - a bare "−" gave no clue that
 * the panel could be collapsed, and the collapsed state was an unlabeled box.
 * @param {HTMLElement} overlay - The overlay panel
 * @param {HTMLElement} btn - The minimise/expand button
 * @param {boolean} minimized - Target state
 */
const setOverlayMinimized = (overlay, btn, minimized) => {
  overlay.classList.toggle('minimized', minimized);
  const glyph = minimized ? '▸' : '▾';
  const label = minimized ? t('readout.toggle.show') : t('readout.toggle.hide');
  btn.innerHTML =
    `<span aria-hidden="true">${glyph}</span>` +
    `<span class="overlay-toggle-label">${label}</span>`;
  btn.title = minimized
    ? t('readout.toggle.show.hint')
    : t('readout.toggle.hide.hint');
  btn.setAttribute('aria-expanded', String(!minimized));
  btn.setAttribute(
    'aria-label',
    minimized ? t('readout.toggle.show.label') : t('readout.toggle.hide.hint')
  );
};
/**
 * Create a mass adjustment slider for the object inspector
 * @param {Object} object - The physics object
 * @param {string} type - The type of object
 * @returns {string} HTML string for the mass slider
 */
/**
 * Measure what is on screen and move the inspector out of its way.
 *
 * The decision itself lives in computeDockPosition; this half only gathers the
 * rectangles. The bottom-sheet layout under 620px is left alone: there the
 * panel is meant to cover things.
 *
 * @param {HTMLElement} panel - The inspector element
 */
const dockInspector = panel => {
  if (window.innerWidth <= 620) return;

  const visible = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };

  const { left, top, maxHeight } = computeDockPosition({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panelWidth: panel.offsetWidth,
    panelHeight: panel.offsetHeight,
    hud: visible('#overlay'),
    rail: visible('#mainControls'),
  });

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  // Never taller than the stylesheet allows; only shorter, when the position
  // it was given leaves less room than that.
  panel.style.maxHeight = `min(72vh, 640px, ${maxHeight}px)`;
};

// --- Reference-frame switcher -------------------------------------------------
// The rail control and the inspector row are two doors into the same state, so
// both are driven from one subscription rather than each trying to keep the
// other in step.

/**
 * The name to show for a frame, and what choosing it does.
 *
 * @param {{mode: string, objectId: ?number}} frame - The frame
 * @returns {{value: string, note: string, active: boolean}} What the rail shows
 */
const describeFrame = frame => {
  if (frame.mode === BARYCENTER) {
    return {
      value: BARYCENTER,
      note: 'Positions relative to the system\u2019s center of mass. It does not sit inside the largest body.',
      active: true,
    };
  }
  if (frame.mode === OBJECT) {
    const body = barycenterBodies().find(b => b.id === frame.objectId);
    const name = body?.name || 'the selected object';
    return {
      value: OBJECT,
      note: `Positions and trails as seen from ${name}, which now sits still.`,
      active: true,
    };
  }
  return {
    value: WORLD,
    note: 'Positions as the scenario defines them.',
    active: false,
  };
};

/** Bring the rail control and the inspector row in line with the frame. */
const paintFrameControls = () => {
  const frame = frameState();
  const shown = describeFrame(frame);

  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    const objectOption = select.querySelector('option[value="object"]');
    if (objectOption) {
      // "Selected object" is only a choice when there is one. Offering it with
      // nothing selected would set a frame with no origin.
      const sel = state.selectedObject?.object;
      objectOption.disabled = !sel;
      objectOption.textContent = sel
        ? `Selected: ${sel.name || 'object'}`
        : 'Selected object';
    }
    select.value = shown.value;
  }

  const note = document.getElementById('referenceFrameNote');
  if (note) {
    // Only shown while a frame is active. It is a reminder that every number on
    // screen is now measured against something other than the scenario's own
    // coordinates, and in the world frame there is nothing to remind anyone of.
    note.textContent = shown.note;
    note.hidden = !shown.active;
  }

  const btn = document.getElementById('frameToggleBtn');
  if (btn) {
    const sel = state.selectedObject?.object;
    const on = !!sel && frame.mode === OBJECT && frame.objectId === sel.id;
    btn.setAttribute('data-state', on ? 'on' : 'off');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.textContent = on ? 'On' : 'Off';
  }
};

/** Wire the rail's frame selector. */
const setupReferenceFrameControl = () => {
  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    select.addEventListener('change', () => {
      const value = select.value;
      if (value === OBJECT) {
        const sel = state.selectedObject?.object;
        setFrame(sel ? OBJECT : WORLD, sel ? sel.id : null);
      } else {
        setFrame(value === BARYCENTER ? BARYCENTER : WORLD);
      }
    });
  }
  onFrameChange(paintFrameControls);
  paintFrameControls();
};

// --- Pinned comparison cards ------------------------------------------------
// One inspector answers "what is this?". Two answer "how do these differ?",
// which is the question a student actually has when they are looking at two
// planets. Pinning takes a copy of the current object's numbers and leaves it
// on screen while the main inspector moves on to whatever is selected next.
//
// The cards are read-only by design: see renderPinnedCard for why a second mass
// slider would collide with the first.
const pinnedInspectors = [];
let pinnedUpdateInterval = null;

/**
 * Lay the pinned cards out beside the inspector.
 *
 * Beside rather than below, because that is the arrangement the comparison
 * needs: two sets of numbers at the same height, read across. Stacking them
 * under the panel put the first card's bottom edge 200px past the bottom of
 * the window.
 *
 * Cards fill a column downward from the panel's top edge and start a new column
 * further left when the next one would not fit, so pinning a fourth card never
 * pushes anything off screen.
 */
const layoutPinnedCards = () => {
  const host = document.getElementById('pinnedInspectors');
  const main = document.getElementById('objectInspector');
  if (!host) return;

  const GAP = 10;
  const CARD_W = 300;
  const open = main && getComputedStyle(main).display !== 'none';

  // Under 620px the inspector is a bottom sheet, so there is no "beside" to
  // work with: the cards take the top of the screen and the sheet keeps the
  // bottom. Anchoring to the sheet would stack them straight onto it.
  if (window.innerWidth <= 620) {
    let y = GAP;
    for (const pin of pinnedInspectors) {
      if (pin.placed) continue;
      pin.el.style.left = `${GAP}px`;
      pin.el.style.top = `${Math.round(y)}px`;
      y += pin.el.offsetHeight + GAP;
    }
    return;
  }

  const anchor = open ? main.getBoundingClientRect() : null;

  // With the panel open the cards start to its left; with it closed they take
  // the space the panel would have occupied.
  let right = anchor ? anchor.left - GAP : window.innerWidth - GAP;
  const topStart = anchor ? anchor.top : 96;
  let top = topStart;

  for (const pin of pinnedInspectors) {
    if (pin.placed) continue;
    const h = pin.el.offsetHeight;
    if (top !== topStart && top + h > window.innerHeight - GAP) {
      // This column is full: start another one to the left.
      right -= CARD_W + GAP;
      top = topStart;
    }
    pin.el.style.left = `${Math.round(Math.max(GAP, right - CARD_W))}px`;
    pin.el.style.top = `${Math.round(
      Math.max(GAP, Math.min(top, window.innerHeight - h - GAP))
    )}px`;
    top += h + GAP;
  }
};

/** Remove a pinned card. @param {object} pin - The pin record */
const unpinInspector = pin => {
  const i = pinnedInspectors.indexOf(pin);
  if (i >= 0) pinnedInspectors.splice(i, 1);
  pin.el.remove();
  if (!pinnedInspectors.length && pinnedUpdateInterval) {
    clearInterval(pinnedUpdateInterval);
    pinnedUpdateInterval = null;
  }
  layoutPinnedCards();
};

/** Pin the object the inspector is currently showing. */
const pinCurrentObject = () => {
  const sel = state.selectedObject;
  if (!sel?.object) return;
  // Pinning the same body twice would just stack two identical cards.
  if (pinnedInspectors.some(p => p.object === sel.object)) return;

  const info = objectInfoFor(sel.object, sel.type);
  const view = buildInspectorView(sel.object, sel.type, info);
  if (!view) return;

  const el = document.createElement('div');
  el.className = 'insp-pin';
  el.innerHTML = renderPinnedCard(view);
  document.getElementById('pinnedInspectors')?.appendChild(el);

  const pin = { el, object: sel.object, type: sel.type };
  pinnedInspectors.push(pin);
  el.querySelector('[data-pin-close]')?.addEventListener('click', () =>
    unpinInspector(pin)
  );
  makePinDraggable(pin);
  // The main inspector's ticker stops when it closes. A pinned card has to
  // outlive that, so the cards run their own.
  if (!pinnedUpdateInterval) {
    pinnedUpdateInterval = setInterval(updatePinnedInspectors, 100);
  }
  layoutPinnedCards();
};

/**
 * Let a pinned card be dragged by its header.
 *
 * Once dragged it stops taking part in the automatic column layout: the user
 * has said where they want it, and having it jump back the next time another
 * card is pinned would undo that.
 *
 * @param {object} pin - The pin record
 */
const makePinDraggable = pin => {
  const header = pin.el.querySelector('.insp-pin-header');
  if (!header) return;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const rect = pin.el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    pin.placed = true;
    const move = ev => {
      pin.el.style.left = `${Math.round(
        Math.min(
          Math.max(4, ev.clientX - offsetX),
          window.innerWidth - rect.width - 4
        )
      )}px`;
      pin.el.style.top = `${Math.round(
        Math.min(Math.max(4, ev.clientY - offsetY), window.innerHeight - 40)
      )}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  });
};

/**
 * Refresh every pinned card, and drop any whose object has left the world.
 *
 * Called from the same tick as the main inspector, so a pinned card is as live
 * as the panel it was copied from.
 */
const updatePinnedInspectors = () => {
  if (!pinnedInspectors.length) return;
  for (const pin of [...pinnedInspectors]) {
    if (!isObjectStillInSimulation(pin.object)) {
      unpinInspector(pin);
      continue;
    }
    const info = objectInfoFor(pin.object, pin.type);
    const view = buildInspectorView(pin.object, pin.type, info);
    if (!view) continue;
    if (!patchDetails(pin.el, view)) {
      pin.el.innerHTML = renderPinnedCard(view);
      pin.el
        .querySelector('[data-pin-close]')
        ?.addEventListener('click', () => unpinInspector(pin));
    }
  }
};

/**
 * The per-type info function, in one place.
 *
 * Three separate switch statements used to spell this mapping out character for
 * character: the live tick, the transformation path and the mass-change path.
 * Adding a ninth object type meant remembering all three.
 *
 * @param {object} object - The body
 * @param {string} type - Its type name
 * @returns {object|null} Info for the inspector
 */
const objectInfoFor = (object, type) => {
  switch (type) {
    case 'BlackHole':
      return getBlackHoleInfo(object);
    case 'Star':
      return getStarInfo(object);
    case 'NeutronStar':
      return getNeutronStarInfo(object);
    case 'WhiteDwarf':
      return getWhiteDwarfInfo(object);
    case 'Planet':
      return getPlanetInfo(object);
    case 'GasGiant':
      return getGasGiantInfo(object);
    case 'Comet':
      return getCometInfo(object);
    case 'Asteroid':
      return getAsteroidInfo(object);
    case 'Galaxy':
      return getGalaxyInfo(object);
    default:
      return null;
  }
};

/**
 * Attach the overlay toggles after a rebuild.
 *
 * Both toggles used to be wired twice over, once in the selection path and
 * once in the transformation path, each with its own copy of the handler and
 * an extra click target on a header row that no longer exists. One button, one
 * handler, one place.
 */
const wireInspectorOverlayToggles = () => {
  const hzBtn = document.getElementById('hzToggleBtn');
  if (hzBtn) {
    hzBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const next = !obj.showHabitableZone;
      obj.showHabitableZone = next;
      hzBtn.setAttribute('data-state', next ? 'on' : 'off');
      hzBtn.setAttribute('aria-checked', next ? 'true' : 'false');
      hzBtn.textContent = next ? 'On' : 'Off';
    };
  }

  const frameBtn = document.getElementById('frameToggleBtn');
  if (frameBtn) {
    frameBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const current = frameState();
      const isOn = current.mode === OBJECT && current.objectId === obj.id;
      setFrame(isOn ? WORLD : OBJECT, isOn ? null : obj.id);
    };
  }

  const sweepBtn = document.getElementById('sweepToggleBtn');
  if (sweepBtn) {
    sweepBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const isOn =
        state.areaSweepOverlay.active &&
        state.areaSweepOverlay.objectId === obj.id;
      const set = on => {
        sweepBtn.setAttribute('data-state', on ? 'on' : 'off');
        sweepBtn.setAttribute('aria-checked', on ? 'true' : 'false');
        sweepBtn.textContent = on ? 'On' : 'Off';
      };
      if (isOn) {
        state.areaSweepOverlay.active = false;
        state.areaSweepOverlay.wedges = [];
        state.areaSweepOverlay.orbitPoints = [];
        set(false);
        return;
      }
      const data = computeAreaSweep(obj);
      if (!data) return;
      state.areaSweepOverlay.active = true;
      state.areaSweepOverlay.parentId = data.parentId;
      state.areaSweepOverlay.parent = data.parent;
      state.areaSweepOverlay.objectId = data.objectId;
      state.areaSweepOverlay.wedges = data.wedges;
      state.areaSweepOverlay.orbitPoints = data.orbitPoints;
      set(true);
    };
  }
};

/**
 * Resolve everything the inspector needs to draw, for one object.
 *
 * The panel used to be built twice from two near-identical blobs of string
 * concatenation: once when a new object was selected, and again when a mass
 * change transformed one object type into another. The two had already drifted
 * apart. This is the one place that decides what the inspector shows.
 *
 * @param {object} object - The selected body
 * @param {string} type - Its type name
 * @param {object} info - Output of the per-type info function
 * @returns {object|null} A view model for js/objectInspector.js
 */
const buildInspectorView = (object, type, info) => {
  if (!info) return null;
  const identity = splitIdentity(info.icon, info.title);

  // Ordinary objects get one ungrouped table; a section heading for four rows
  // costs more vertical space than it saves. Bodies with a lot to say - black
  // holes especially - get their extras grouped so the list stays scannable.
  const rows = info.stats.map((stat, i) => ({
    key: `s${i}`,
    label: String(stat.label).replace(/:\s*$/, ''),
    value: stat.value,
    tooltip: getStatTooltip(stat.label, type),
  }));

  // While a frame is active, the world-frame speed above is true but not what
  // the picture is showing: the view has the origin sitting still. Rather than
  // silently changing what "Velocity" means, add the relative one beside it and
  // say in the label what it is relative to.
  const originVel = frameOriginVelocity(barycenterBodies());
  const frameOrigin = resolveFrameOrigin(barycenterBodies());
  const frameLabel = () => {
    const frame = frameState();
    return frame.mode === BARYCENTER
      ? 'barycenter'
      : barycenterBodies().find(b => b.id === frame.objectId)?.name ||
          'the frame';
  };

  // Where the body is in the frame, not in the scenario's coordinates. Without
  // these two rows the frame is something you can only look at: the picture
  // shows Mars looping and the numbers beside it still describe a circle round
  // the Sun. A direction and a distance are also what an observer on the origin
  // body would actually record, which is what makes them the measurable ones.
  if (frameOrigin && object !== null && object.pos) {
    const dx = object.pos.x - frameOrigin.now.x;
    const dy = object.pos.y - frameOrigin.now.y;
    const sep = Math.hypot(dx, dy);
    if (sep > 0) {
      const against = frameLabel();
      let bearing = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (bearing < 0) bearing += 360;
      rows.push({
        key: 'frameSeparation',
        label: `Distance from ${against}`,
        value: formatDistance(sep),
        tooltip:
          'How far this body is from the reference frame\u2019s origin right now.',
      });
      rows.push({
        key: 'frameBearing',
        label: `Direction from ${against}`,
        value: `${bearing.toFixed(1)}\u00b0`,
        tooltip:
          'Which way this body lies as seen from the frame\u2019s origin, measured anticlockwise from the positive x axis. Watch this number rather than the picture to catch the moment a body reverses direction.',
      });
    }
  }

  if (originVel && object.vel) {
    const against = frameLabel();
    const relative = Math.hypot(
      object.vel.x - originVel.x,
      object.vel.y - originVel.y
    );
    rows.push({
      key: 'frameRelativeSpeed',
      label: `Speed vs ${against}`,
      value: formatSpeed(relative),
      tooltip:
        'How fast this body is moving in the reference frame the view is currently in. The velocity above is measured in the scenario\u2019s own coordinates and does not change when the frame does.',
    });
  }

  const groups =
    rows.length > 9
      ? [{ rows: rows.slice(0, 6) }, { title: 'More', rows: rows.slice(6) }]
      : [{ rows }];

  const overlays = [];
  if (type === 'Star') {
    overlays.push({
      id: 'hzToggleBtn',
      label: t('overlay.habitableZone'),
      on: !!object.showHabitableZone,
      help: 'The range of orbital distances where a rocky planet with a suitable atmosphere could hold liquid water. Inside it is where to look, not a measurement that a world is habitable. Edges follow Kopparapu et al. (2013) from this star\u2019s luminosity and temperature.',
    });
  }
  // Every body can host a frame, so this row is unconditional. It is the one
  // control that changes what all the other numbers on screen mean, which is
  // why it says so in its own help text rather than only in the rail.
  overlays.push({
    id: 'frameToggleBtn',
    label: t('overlay.referenceFrame'),
    on: frameState().mode === OBJECT && frameState().objectId === object.id,
    help: 'Re-express every position, and every trail, as this body would see them. Unlike Follow Mode, which only moves the camera, this redraws the recorded paths: put the Solar System into Earth\u2019s frame and Mars traces a loop that doubles back on itself.',
  });

  const sweepScenarios = [
    'Solar System',
    'Earth-Moon System',
    "Kepler's 2nd Law",
  ];
  const orbitingTypes = ['Planet', 'GasGiant', 'Asteroid', 'Comet'];
  if (
    orbitingTypes.includes(type) &&
    sweepScenarios.includes(current_scenario_name)
  ) {
    overlays.push({
      id: 'sweepToggleBtn',
      label: t('overlay.equalAreaSweep'),
      on:
        state.areaSweepOverlay.active &&
        state.areaSweepOverlay.objectId === object.id,
      help: 'Kepler\u2019s second law, drawn. Each wedge covers the same amount of time: thin and long near the star where the object moves fast, wide and short far away where it moves slowly. The areas are equal.',
    });
  }

  return {
    icon: identity.icon,
    name: identity.name,
    kind: String(type || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toUpperCase(),
    mass: massControlModel(object, type),
    groups,
    overlays,
    about: info.description || '',
  };
};

/**
 * Write the identity into the header.
 *
 * @param {object} view - The view model
 */
const paintInspectorHeader = view => {
  const icon = document.getElementById('inspectorIcon');
  const title = document.getElementById('inspectorTitle');
  const kind = document.getElementById('inspectorKind');
  if (icon && icon.textContent !== view.icon) icon.textContent = view.icon;
  if (title && title.textContent !== view.name) {
    title.textContent = view.name;
    title.title = view.name;
  }
  if (kind && kind.textContent !== view.kind) kind.textContent = view.kind;
};

const massControlModel = (object, type) => {
  debugLog('Creating mass slider for:', type, object);
  let currentMass, minMass, maxMass, massUnit, massLabel;

  switch (type) {
    case 'BlackHole':
      currentMass = object.mass / SOLAR_MASS_UNIT;
      minMass = 0.1;
      maxMass = 1000;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Star':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 0.08; // Lower minimum to allow very low mass stars
      maxMass = 100;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'NeutronStar':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 1.0;
      maxMass = 3.0;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'WhiteDwarf':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 0.1;
      maxMass = 1.4;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Planet':
      currentMass = object.massInEarths || object.mass / EARTH_MASS_UNIT;
      minMass = 0.01;
      maxMass = 10;
      massUnit = 'M<sub class="solar-sub">\u2295</sub>';
      massLabel = 'Object Mass';
      break;
    case 'GasGiant':
      currentMass = object.massInJupiters || object.mass / JUPITER_MASS_UNIT;
      minMass = 0.1;
      maxMass = 100; // Extended to allow transformation to star (threshold is 80 M♃)
      massUnit = 'M<sub class="solar-sub">\u2643</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Asteroid':
      currentMass = object.mass / EARTH_MASS_UNIT;
      minMass = 0.0001;
      maxMass = 0.1;
      massUnit = 'M<sub class="solar-sub">\u2295</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Comet':
      currentMass = object.massInComets ?? object.mass / HALLEY_MASS_UNIT;
      minMass = 0.001;
      maxMass = 1.0;
      massUnit = 'C';
      massLabel = 'Object Mass';
      break;
    default:
      return null;
  }

  // Returns a view model rather than markup: js/objectInspector.js owns the
  // HTML now, and the ranges and units are the part that belongs here, next to
  // the object types they describe. massLabel is no longer rendered - the
  // control is labelled "Mass" in one compact row - but the switch above still
  // sets it, so it is read here to keep the linter honest about the branch.
  void massLabel;
  return {
    objectId: object.id ?? 'unknown',
    min: minMass,
    max: maxMass,
    step: (maxMass - minMass) / 100,
    value: currentMass,
    display: `${formatNumber(currentMass, { sig: 3 })} ${massUnit}`,
  };
};

/**
 * Set up event listeners for the mass slider
 */
const setupMassSliderListeners = () => {
  const massSlider = document.getElementById('massSlider');
  const massValueDisplay = document.getElementById('massValueDisplay');

  if (!massSlider || !massValueDisplay) {
    return;
  }

  // Flag to track if slider is being dragged
  let isDragging = false;

  const updateMass = () => {
    const newMass = parseFloat(massSlider.value);
    if (!isFinite(newMass) || newMass <= 0) return;
    const object = state.selectedObject.object;
    const type = state.selectedObject.type;
    // Editing a mass by hand puts the world beyond what its seed rebuilds.
    markWorldTouched();

    // Skip mass update if we're in the middle of a transformation
    if (state.isTransforming) {
      return;
    }

    // Update the object's mass and check for transformation
    const newType = updateObjectMass(object, type, newMass);

    // Clear the energy chart since mass change invalidates energy history
    // This ensures the chart shows fresh data with the new mass
    if (chartInitialized) {
      debugLog('Clearing energy chart due to mass change');
      clearChart();
      showCollectingMessage();
    }

    // If object type changed, refresh the entire inspector and stop processing
    if (newType && newType !== type) {
      debugLog(`Object transformed from ${type} to ${newType}!`);

      // Set transformation flag to prevent mass updates during the process
      state.isTransforming = true;

      // Update the selected object type
      state.selectedObject.type = newType;

      // Reset the slider value to prevent immediate further transformation
      // For gas giant to star transformation, set slider to the star's actual mass
      if (type === 'GasGiant' && newType === 'Star') {
        // Use the new star object, not the old gas giant object
        const starObject = state.selectedObject.object;
        const massInSolarMasses =
          starObject.massInSuns || starObject.mass / SOLAR_MASS_UNIT;
        // Temporarily set the slider value to the correct star mass
        setTimeout(() => {
          const newSlider = document.getElementById('massSlider');
          if (newSlider) {
            newSlider.value = massInSolarMasses;
            const massValueDisplay =
              document.getElementById('massValueDisplay');
            if (massValueDisplay) {
              massValueDisplay.innerHTML = solarHTML(
                massInSolarMasses.toFixed(3)
              );
            }
          }
        }, 100);
      }

      // Refresh the inspector with new object type
      const inspectorContent = document.getElementById('inspectorContent');
      if (inspectorContent) {
        // A mass change turned this object into something else. Same builder,
        // same renderer as a fresh selection: this path used to carry its own
        // copy of the markup and the two had already drifted apart.
        const info = objectInfoFor(state.selectedObject.object, newType);
        if (!info) return;

        const view = buildInspectorView(
          state.selectedObject.object,
          newType,
          info
        );
        const detailsTabContent = document.getElementById('detailsTab');
        if (view && detailsTabContent) {
          paintInspectorHeader(view);
          detailsTabContent.innerHTML = renderDetails(view);
          setupMassSliderListeners();
          wireInspectorOverlayToggles();
        }

        // Energy tab should still be intact since we only updated details tab
        // Just ensure chart is ready for the new object
        if (chartInitialized) {
          debugLog('Ensuring chart is ready for transformed object');
          ensureChartReady();
          updateEnergyChart();
        }

        // Show transformation notification
        showTransformationNotification(type, newType);

        // Clear transformation flag after everything is set up
        setTimeout(() => {
          state.isTransforming = false;
        }, 200);
      }
      return; // Stop processing after transformation
    } else {
      // No transformation, just update the display
      let massUnit;
      switch (type) {
        case 'BlackHole':
        case 'Star':
        case 'NeutronStar':
        case 'WhiteDwarf':
          massUnit = 'M<sub class="solar-sub">\u2609</sub>';
          break;
        case 'Planet':
        case 'Asteroid':
          massUnit = 'M<sub class="solar-sub">\u2295</sub>';
          break;
        case 'GasGiant':
          massUnit = 'M<sub class="solar-sub">\u2643</sub>';
          break;
        case 'Comet':
          massUnit = 'C';
          break;
      }

      // massUnit carries <sub> markup, so this must be innerHTML - textContent
      // escaped it and rendered the tags literally.
      massValueDisplay.innerHTML = `${newMass.toFixed(3)} ${massUnit}`;

      // Update the stats display to reflect the new mass
      const inspectorContent = document.getElementById('inspectorContent');
      if (inspectorContent && state.selectedObject) {
        const info = objectInfoFor(
          state.selectedObject.object,
          state.selectedObject.type
        );
        if (!info) return;

        // Values only, through the same patcher the live tick uses. This block
        // used to write the old .stat-row markup by hand, which stopped
        // matching the DOM the moment the panel was redesigned.
        const view = buildInspectorView(
          state.selectedObject.object,
          state.selectedObject.type,
          info
        );
        const detailsTabContent = document.getElementById('detailsTab');
        if (view && detailsTabContent) {
          paintInspectorHeader(view);
          if (!patchDetails(detailsTabContent, view)) {
            detailsTabContent.innerHTML = renderDetails(view);
            setupMassSliderListeners();
            wireInspectorOverlayToggles();
          }
        }
      }
    }
  };

  // Update on slider change
  massSlider.addEventListener('input', updateMass);
  massSlider.addEventListener('change', updateMass);

  // Prevent inspector updates while dragging
  massSlider.addEventListener('mousedown', () => {
    isDragging = true;
    state.sliderDragging = true; // Global flag for inspector updates
  });

  massSlider.addEventListener('mouseup', () => {
    isDragging = false;
    state.sliderDragging = false;
  });

  massSlider.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      state.sliderDragging = false;
    }
  });
};

/**
 * Update an object's mass and recalculate related properties
 * @param {Object} object - The physics object to update
 * @param {string} type - The type of object
 * @param {number} newMass - The new mass value
 * @returns {string|null} The new object type if transformation occurred, null otherwise
 */
const updateObjectMass = (object, type, newMass) => {
  let newType = null;

  // Clear energy history when mass changes to prevent invalid data
  // Energy calculations depend on mass, so old energy data becomes invalid
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for object ${object.id} due to mass change`
    );
    clearObjectEnergyHistory(object.id);
  }

  switch (type) {
    case 'BlackHole':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.updateRadius(); // Update Schwarzschild radius
      break;
    case 'Star':
      debugLog(`DEBUG: Star mass update: newMass = ${newMass} solar masses`);
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      debugLog(
        `DEBUG: Star mass updated: mass = ${object.mass} units, massInSuns = ${object.massInSuns}`
      );
      // Recalculate star properties based on mass
      object.radius = Math.pow(newMass, 0.8) * STAR_OBJ_RADIUS;
      object.temperature = 3000 + (newMass - 0.2) * 4000;
      object.luminosity = Math.pow(newMass, 3.5);

      // Check if star should become a black hole (mass > 20 M☉)
      if (newMass > 20.0) {
        debugLog(
          `DEBUG: Star mass ${newMass} exceeds black hole threshold 20.0 - transforming to black hole`
        );
        newType = 'BlackHole';
        // Transform star to black hole
        transformStarToBlackHole(object);
      }
      break;
    case 'NeutronStar':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      // Neutron stars have relatively constant radius
      object.radius = NEUTRON_STAR_RADIUS;

      // Check if neutron star should become a black hole (mass > 3 M☉)
      if (newMass > 3.0) {
        newType = 'BlackHole';
        // Transform neutron star to black hole
        transformNeutronStarToBlackHole(object);
      }
      break;
    case 'WhiteDwarf':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      // White dwarf radius decreases with mass (inverse relationship)
      object.radius = Math.max(
        WHITE_DWARF_RADIUS * Math.pow(newMass, -0.33),
        2
      );

      // Check if white dwarf should become a neutron star (mass > 1.4 M☉ - Chandrasekhar limit)
      if (newMass > 1.4) {
        newType = 'NeutronStar';
        // Transform white dwarf to neutron star
        transformWhiteDwarfToNeutronStar(object);
      }
      break;
    case 'Planet':
      object.mass = newMass * EARTH_MASS_UNIT;
      object.massInEarths = newMass;
      // Recalculate planet radius based on mass
      object.radius = Math.pow(newMass, 0.3) * PLANET_RADIUS;
      object.calculateDensity();

      // Check if planet should become a gas giant (mass > 10 M⊕)
      if (newMass > 10.0) {
        newType = 'GasGiant';
        // Transform planet to gas giant
        transformPlanetToGasGiant(object);
      }
      break;
    case 'GasGiant':
      object.mass = newMass * JUPITER_MASS_UNIT;
      object.massInJupiters = newMass;
      object.massInEarths = newMass * EARTH_MASSES_PER_JUPITER_MASS;
      // Recalculate gas giant radius and type
      object.radius = Math.pow(newMass, 0.2) * GAS_GIANT_RADIUS;
      object.calculateGiantType();

      // Check if gas giant should become a star (mass > 80 M♃)
      if (newMass > 80.0) {
        newType = 'Star';
        // Transform gas giant to star
        transformGasGiantToStar(object);
      }
      break;
    case 'Asteroid':
      object.mass = newMass * EARTH_MASS_UNIT;
      // The slider works in Earth masses, so the Ceres count the class carries
      // has to be recomputed from it. Leaving it behind is how a body ends up
      // gravitating as one thing and being labelled as another.
      object.massInCeres = object.mass / CERES_MASS_UNIT;
      // Asteroid radius scales with mass
      object.radius = Math.pow(newMass * 1000, 0.33) * ASTEROID_RADIUS;

      // Check if asteroid should become a planet (mass > 0.1 M⊕)
      if (newMass > 0.1) {
        newType = 'Planet';
        // Transform asteroid to planet
        transformAsteroidToPlanet(object);
      }
      break;
    case 'Comet':
      // Halley masses to simulation units. This was a second hardcoded copy of
      // the same wrong 0.1 the Comet constructor carried.
      object.mass = newMass * HALLEY_MASS_UNIT;
      object.massInComets = newMass;
      // Comet radius scales with mass
      object.radius = Math.pow(newMass * 10, 0.33) * 2;

      // Check if comet should become an asteroid (mass > 1.0 C)
      if (newMass > 1.0) {
        newType = 'Asteroid';
        // Transform comet to asteroid
        transformCometToAsteroid(object);
      }
      break;
  }

  return newType;
};

/**
 * Transform a star into a black hole
 * @param {Object} object - The star object to transform
 */
const transformStarToBlackHole = object => {
  debugLog('Star transforming into black hole!');
  // Preserve position and velocity
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming star ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Create new black hole
  const blackHole = new BlackHole(pos, mass, vel);
  blackHole.name = object.name || 'Transformed Black Hole';

  // Replace the star in the stars array
  const starIndex = stars.indexOf(object);
  if (starIndex !== -1) {
    stars.splice(starIndex, 1);
    bh_list.push(blackHole);

    // Update the selected object reference
    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = blackHole;
      state.selectedObject.type = 'BlackHole';
    }
  }
};

/**
 * Transform a neutron star into a black hole
 * @param {Object} object - The neutron star object to transform
 */
const transformNeutronStarToBlackHole = object => {
  debugLog('Neutron star transforming into black hole!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for transforming neutron star ${object.id}`
    );
    clearObjectEnergyHistory(object.id);
  }

  const blackHole = new BlackHole(pos, mass, vel);
  blackHole.name = object.name || 'Transformed Black Hole';

  const nsIndex = neutron_stars.indexOf(object);
  if (nsIndex !== -1) {
    neutron_stars.splice(nsIndex, 1);
    bh_list.push(blackHole);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = blackHole;
      state.selectedObject.type = 'BlackHole';
    }
  }
};

/**
 * Transform a white dwarf into a neutron star
 * @param {Object} object - The white dwarf object to transform
 */
const transformWhiteDwarfToNeutronStar = object => {
  debugLog('White dwarf transforming into neutron star!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for transforming white dwarf ${object.id}`
    );
    clearObjectEnergyHistory(object.id);
  }

  const neutronStar = new NeutronStar(pos, vel, mass / SOLAR_MASS_UNIT);
  neutronStar.name = object.name || 'Transformed Neutron Star';

  const wdIndex = white_dwarfs.indexOf(object);
  if (wdIndex !== -1) {
    white_dwarfs.splice(wdIndex, 1);
    neutron_stars.push(neutronStar);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = neutronStar;
      state.selectedObject.type = 'NeutronStar';
    }
  }
};

/**
 * Transform a planet into a gas giant
 * @param {Object} object - The planet object to transform
 */
const transformPlanetToGasGiant = object => {
  debugLog('Planet transforming into gas giant!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass / JUPITER_MASS_UNIT; // Convert to Jupiter masses

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming planet ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  const gasGiant = new GasGiant(pos, vel, mass);
  gasGiant.name = object.name || 'Transformed Gas Giant';

  const planetIndex = planets.indexOf(object);
  if (planetIndex !== -1) {
    planets.splice(planetIndex, 1);
    gas_giants.push(gasGiant);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = gasGiant;
      state.selectedObject.type = 'GasGiant';
    }
  }
};

/**
 * Transform a gas giant into a star
 * @param {Object} object - The gas giant object to transform
 */
const transformGasGiantToStar = object => {
  debugLog('Gas giant transforming into star!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming gas giant ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Jupiter masses to solar masses. Both conversions run off the shared
  // constants, so the transformation conserves gravitational mass exactly;
  // with the old 50-units-per-Jupiter figure it silently shed 98% of it.
  const massInJupiters =
    object.massInJupiters || object.mass / JUPITER_MASS_UNIT;
  const massInSolarMasses = massInJupiters / JUPITER_MASSES_PER_SOLAR_MASS;

  // Create star with the converted mass in simulation units
  const star = new StarObject(pos, vel, massInSolarMasses);
  star.name = object.name || 'Transformed Star';

  // Ensure the star has the correct mass properties
  star.massInSuns = massInSolarMasses;
  star.mass = massInSolarMasses * SOLAR_MASS_UNIT;

  const ggIndex = gas_giants.indexOf(object);
  if (ggIndex !== -1) {
    gas_giants.splice(ggIndex, 1);
    stars.push(star);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = star;
      state.selectedObject.type = 'Star';
    }
  }
};

/**
 * Transform an asteroid into a planet
 * @param {Object} object - The asteroid object to transform
 */
const transformAsteroidToPlanet = object => {
  debugLog('Asteroid transforming into planet!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass / EARTH_MASS_UNIT;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming asteroid ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  const planet = new Planet(pos, vel, mass);
  planet.name = object.name || 'Transformed Planet';

  const asteroidIndex = asteroids.indexOf(object);
  if (asteroidIndex !== -1) {
    asteroids.splice(asteroidIndex, 1);
    planets.push(planet);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = planet;
      state.selectedObject.type = 'Planet';
    }
  }
};

/**
 * Transform a comet into an asteroid
 * @param {Object} object - The comet object to transform
 */
const transformCometToAsteroid = object => {
  debugLog('Comet transforming into asteroid!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming comet ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Built at the mass it already had, in the unit the class counts in, rather
  // than built at the default and then overwritten: assigning .mass afterwards
  // left massInCeres describing a different object from the one gravity saw.
  const asteroid = new Asteroid(pos, vel, object.mass / CERES_MASS_UNIT);
  asteroid.name = object.name || 'Transformed Asteroid';

  const cometIndex = comets.indexOf(object);
  if (cometIndex !== -1) {
    comets.splice(cometIndex, 1);
    asteroids.push(asteroid);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = asteroid;
      state.selectedObject.type = 'Asteroid';
    }
  }
};
/**
 * Show a notification when an object transforms
 * @param {string} oldType - The previous object type
 * @param {string} newType - The new object type
 */
const showTransformationNotification = (oldType, newType) => {
  // Clear energy chart when object transforms
  if (chartInitialized) {
    debugLog('Clearing energy chart due to object transformation');
    clearChart();
    showCollectingMessage();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'transformation-notification';
  notification.innerHTML = `
        <div class="transformation-content">
            <span class="transformation-icon">✨</span>
            <span class="transformation-text">${oldType} → ${newType}</span>
        </div>
    `;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add('visible');
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('visible');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
};
/**
 * Show scenario information banner with title and description
 * Displays information about the current simulation scenario for 6 seconds
 */
const show_scenario_info = () => {
  // Prevent automatic display on page load - only show if user has interacted
  // Also add a frame count check to prevent early display
  if (!state.user_has_interacted || state.frame_count < 300) {
    return;
  }

  const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
  if (current_scenario_name && SCENARIO_INFO[current_scenario_name]) {
    const mergingNote =
      SETTINGS.enable_star_merging === false
        ? `<p style="color:#f5a623;font-size:12px;margin-top:4px;">⚠ ${t('scenarioCard.notice.mergingDisabled')}</p>`
        : '';
    scenarioInfoDiv.innerHTML = `<h4>${scenarioTitle(current_scenario_name)}</h4><p>${scenarioSummary(current_scenario_name)}</p>${mergingNote}`;
    scenarioInfoDiv.classList.add('visible');
    setTimeout(() => scenarioInfoDiv.classList.remove('visible'), 6000);
  } else {
    scenarioInfoDiv.classList.remove('visible');
  }
};

// Enhanced scenario info box function
const show_enhanced_scenario_info = scenarioName => {
  if (!scenarioName || !SCENARIO_INFO[scenarioName]) {
    return;
  }

  // A lesson loads a scenario every time a step asks for one, and this card is
  // 720px wide and lands on top of the instrument panel. During an
  // investigation the step's own text is the introduction to the scenario, so
  // the card is redundant as well as in the way.
  if (document.body.classList.contains('investigation-open')) return;

  const infoBox = document.getElementById('scenarioInfoBox');
  const title = document.getElementById('scenarioInfoTitle');
  const summary = document.getElementById('scenarioInfoSummary');
  const features = document.getElementById('scenarioInfoFeatures');

  // The info card is optional chrome; a missing node must not abort
  // initialize_simulation and leave the app half-built.
  if (!infoBox || !title || !summary || !features) return;

  // Set the title and summary. The key is kept on the element because the card
  // outlives the call that wrote it: a language arriving late has to be able to
  // ask which scenario is on screen.
  infoBox.dataset.scenarioKey = scenarioName;
  title.textContent = scenarioTitle(scenarioName);
  summary.textContent = scenarioSummary(scenarioName);

  // Populate features with relevant notices
  features.innerHTML = '';
  if (SETTINGS.enable_star_merging === false) {
    const li = document.createElement('li');
    li.className = 'merging-disabled-notice';
    li.textContent = t('scenarioCard.notice.mergingDisabledLong');
    features.appendChild(li);
  }

  // Whether anything is currently covering the simulation. The card is shown
  // for eighteen seconds and then hides itself, so raising it under a
  // full-screen layer would burn the whole eighteen seconds where nobody can
  // read it: a first-time visitor would enter the sandbox to find the card that
  // names their scenario already gone. Both start-up layers are checked, and
  // the welcome screen through a body class rather than an import, because
  // welcome.js imports this module to load scenarios.
  const onboardingLayerUp = () => {
    const splash = document.getElementById('splash');
    const splashUp =
      splash &&
      !splash.classList.contains('hidden') &&
      splash.style.display !== 'none';
    return (
      Boolean(splashUp) || document.body.classList.contains('welcome-open')
    );
  };

  const raise = () => {
    infoBox.classList.add('showUI');
    setTimeout(() => infoBox.classList.remove('showUI'), 18000);
  };

  if (onboardingLayerUp()) {
    const waitForClearScreen = () => {
      if (onboardingLayerUp()) {
        setTimeout(waitForClearScreen, 100);
        return;
      }
      raise();
    };
    waitForClearScreen();
  } else {
    raise();
  }
};

// The sound control is an icon button in the readout's header rather than the
// panel-with-a-paragraph it used to be. The paragraph explained a feature that
// is off by default and stays off for almost everybody, and it was the first
// third of the one panel that shows live numbers. The explanation now lives in
// the button's tooltip, where an explanation of a control belongs.
const refreshSonificationToggle = () => {
  const toggle = document.getElementById('sonificationToggle');
  if (!toggle) {
    return;
  }
  const glyph = toggle.querySelector('.readout-icon-glyph') || toggle;

  const { muted, supported } = getSonificationState();
  if (!supported) {
    glyph.textContent = '🔇';
    toggle.disabled = true;
    toggle.dataset.state = 'disabled';
    toggle.title = t('readout.sonification.unavailable');
    toggle.setAttribute('aria-label', t('readout.sonification.unavailable'));
    toggle.setAttribute('aria-pressed', 'false');
    return;
  }

  toggle.disabled = false;
  glyph.textContent = muted ? '🔇' : '🔊';
  toggle.dataset.state = muted ? 'muted' : 'active';
  toggle.title = muted
    ? t('readout.sonification.off.hint')
    : t('readout.sonification.on.hint');
  toggle.setAttribute(
    'aria-label',
    muted ? t('readout.sonification.off') : t('readout.sonification.on')
  );
  toggle.setAttribute('aria-pressed', (!muted).toString());
};

const sonificationToggleBtn = document.getElementById('sonificationToggle');
if (sonificationToggleBtn) {
  refreshSonificationToggle();
  sonificationToggleBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    toggleSonification();
    refreshSonificationToggle();
  });
} else {
  console.warn('Sonification toggle button not found');
}

/**
 * Apply preset scenario settings to the simulation
 * @param {Object} settings_dict - Settings object to modify with preset values
 */

const apply_placement = () => {
  const placement = SETTINGS.placement;
  const sim_size = SETTINGS.sim_size;

  // Get simulation bounds based on sim_size - reduced for better visibility
  let bounds;
  switch (sim_size) {
    case 'Small':
      bounds = 100;
      break; // was 200
    case 'Medium':
      bounds = 200;
      break; // was 400
    case 'Large':
      bounds = 300;
      break; // was 800
    case 'Huge':
      bounds = 500;
      break; // was 1200
    default:
      bounds = 300;
  }

  // The body everything else orbits is decided once, here, and then held out
  // of the placement loop. That fixes two separate faults in one move.
  //
  // Stars were missing from this list entirely. Any scenario that asked for a
  // stellar population and did not position it by hand got every one of its
  // stars at the origin with zero velocity, stacked on top of each other and
  // usually on top of a black hole: 20 in Black Hole Billiards, 50 in Quasar
  // Cannon, 100 in Stellar Nursery, 200 in The Pinwheel Galaxy Core, 300 in
  // Tidal Arm Tango. All of them merged or were swallowed within a few
  // seconds, which is why those scenarios looked alike - there was nothing
  // left in them to tell apart.
  //
  // The central body was also being placed like everything else and then given
  // a velocity for a circular orbit around itself. The separation is zero, so
  // the speed came out of a divide by 1e-6: The Pinwheel Galaxy Core opened
  // with a center-of-mass velocity of 811 units per time unit.
  const gravitating = [...stars, ...bh_list, ...neutron_stars, ...white_dwarfs];
  const central =
    gravitating.find(obj => obj.isCentralBody) ||
    (gravitating.length > 0 ? getMostMassiveBody(gravitating) : null);

  const all_objects = [
    ...bh_list,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...comets,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
  ].filter(obj => obj !== central);

  // Skip placement for Empty preset
  if (placement === 'Empty') return;

  // Whatever everything else is drawn to stays at the origin, at rest.
  if (central) {
    central.pos.x = 0;
    central.pos.y = 0;
    central.vel.x = 0;
    central.vel.y = 0;
  }

  // Nothing is placed inside the central body. A black hole's drawn radius
  // grows as the cube root of its mass and takes no notice of the simulation
  // bounds, so a heavy enough one swallows the entire placement volume before
  // the first frame: Black Hole Billiards put a radius-505 hole at the center
  // of a region 300 units across and ate all twenty of its stars at once.
  const keepOut = central ? (central.radius || 0) * 2.5 : 0;
  // "Dominant" means the rest of the system is a test population around it, so
  // circular orbits about it are the sensible default. Below that it is a
  // self-gravitating cluster, where an isotropic spread of random velocities is
  // the honest starting condition and a disc would be a fiction.
  //
  // Three is taken from the catalogue rather than picked out of the air: of the
  // scenarios that place randomly, the ones this helps sit at mass ratios of
  // 12, 20, 110, 1900 and upwards, and the cluster-like ones sit at 0.35 and
  // below. Nothing in the library falls in between, so the boundary is not
  // delicate.
  const CENTRAL_DOMINANCE = 3;
  const otherMass = all_objects.reduce((sum, o) => sum + (o.mass || 0), 0);
  const centralDominates =
    Boolean(central) && (central.mass || 0) > otherMass * CENTRAL_DOMINANCE;
  const spread = Math.max(bounds, keepOut * 1.6);
  const atLeastKeepOut = r => (keepOut > 0 ? Math.max(r, keepOut) : r);

  switch (placement) {
    case 'Random':
      all_objects.forEach(obj => {
        // Random position within bounds
        const angle = Math.random() * 2 * Math.PI;
        const radius = atLeastKeepOut(keepOut + Math.random() * spread);
        obj.pos.x = Math.cos(angle) * radius;
        obj.pos.y = Math.sin(angle) * radius;

        // A random velocity is the right answer for a loose cloud of
        // comparable bodies, and the wrong one when a single mass dominates:
        // nothing given a few tens of units per time unit a thousand units
        // from a supermassive black hole is doing anything except falling in.
        // Where there is a dominant central mass, orbit it and let the random
        // component perturb that orbit instead of replacing it.
        const vel_angle = Math.random() * 2 * Math.PI;
        const vel_mag =
          (Math.random() - 0.5) * SETTINGS.init_velocity +
          (Math.random() - 0.5) * SETTINGS.velocity_stddev;
        if (centralDominates) {
          const r = Math.max(1e-6, Math.hypot(obj.pos.x, obj.pos.y));
          const vCirc = Math.sqrt(
            (SETTINGS.gravitational_constant * central.mass) / r
          );
          obj.vel.x =
            (-obj.pos.y / r) * vCirc + Math.cos(vel_angle) * vel_mag * 0.3;
          obj.vel.y =
            (obj.pos.x / r) * vCirc + Math.sin(vel_angle) * vel_mag * 0.3;
        } else {
          obj.vel.x = Math.cos(vel_angle) * vel_mag;
          obj.vel.y = Math.sin(vel_angle) * vel_mag;
        }
      });
      break;

    case 'Circular': {
      // Choose a central mass (prefer a star; else the most massive gravitating body)
      const G = SETTINGS.gravitational_constant;
      // Every object used to go on one ring at exactly 0.7 of the bounds. For
      // a handful that reads as a ring; for the 200 stars of The Pinwheel
      // Galaxy Core it put neighbours about nine units apart, closer than the
      // stars are wide, and the whole population merged into a couple of black
      // holes within seconds. A golden-angle spiral fills an annulus evenly at
      // any count, which is also what a galaxy core and a nursery should look
      // like.
      const GOLDEN = Math.PI * (3 - Math.sqrt(5));
      const n = Math.max(1, all_objects.length);
      all_objects.forEach((obj, i) => {
        const angle = n > 24 ? i * GOLDEN : (i / n) * 2 * Math.PI;
        const radius =
          n > 24
            ? atLeastKeepOut(spread * (0.35 + 0.65 * Math.sqrt((i + 0.5) / n)))
            : atLeastKeepOut(spread * 0.7);
        obj.pos.x = Math.cos(angle) * radius;
        obj.pos.y = Math.sin(angle) * radius;

        if (central && central.pos && typeof central.mass === 'number') {
          const dx = obj.pos.x - central.pos.x;
          const dy = obj.pos.y - central.pos.y;
          const r = Math.max(1e-6, Math.hypot(dx, dy));
          const vCirc = Math.sqrt((G * central.mass) / r);
          // Tangential (default CCW)
          obj.vel.x = (-dy / r) * vCirc;
          obj.vel.y = (dx / r) * vCirc;
        } else {
          // Fallback to legacy
          const vel_mag = SETTINGS.init_velocity;
          obj.vel.x = -Math.sin(angle) * vel_mag;
          obj.vel.y = Math.cos(angle) * vel_mag;
        }
      });
      break;
    }

    case 'Multi-Ring': {
      const G = SETTINGS.gravitational_constant;
      all_objects.forEach((obj, i) => {
        const ring = Math.floor(i / 20); // 20 objects per ring
        const angle = ((i % 20) / 20) * 2 * Math.PI;
        const radius = atLeastKeepOut(spread * (0.3 + ring * 0.2));
        obj.pos.x = Math.cos(angle) * radius;
        obj.pos.y = Math.sin(angle) * radius;

        if (central && central.pos && typeof central.mass === 'number') {
          const dx = obj.pos.x - central.pos.x;
          const dy = obj.pos.y - central.pos.y;
          const r = Math.max(1e-6, Math.hypot(dx, dy));
          const vCirc = Math.sqrt((G * central.mass) / r);
          obj.vel.x = (-dy / r) * vCirc;
          obj.vel.y = (dx / r) * vCirc;
        } else {
          // Fallback to legacy scaled by ring
          const vel_mag = SETTINGS.init_velocity * (1 - ring * 0.1);
          obj.vel.x = -Math.sin(angle) * vel_mag;
          obj.vel.y = Math.cos(angle) * vel_mag;
        }
      });
      break;
    }

    case 'Grid': {
      const grid_size = Math.ceil(Math.sqrt(all_objects.length));
      const spacing = (spread * 2) / grid_size;
      all_objects.forEach((obj, i) => {
        const row = Math.floor(i / grid_size);
        const col = i % grid_size;
        obj.pos.x = (col - grid_size / 2) * spacing;
        obj.pos.y = (row - grid_size / 2) * spacing;

        // Small random velocity
        const vel_mag = SETTINGS.init_velocity * 0.3;
        obj.vel.x = (Math.random() - 0.5) * vel_mag;
        obj.vel.y = (Math.random() - 0.5) * vel_mag;
      });
      break;
    }
  }

  // Special positioning for various scenarios
  if (
    current_scenario_name === 'Neutron Star Collision' &&
    neutron_stars.length >= 2
  ) {
    neutron_stars[0].pos.x = -50;
    neutron_stars[0].pos.y = 0;
    neutron_stars[0].vel.x = 0;
    neutron_stars[0].vel.y = 15;

    neutron_stars[1].pos.x = 50;
    neutron_stars[1].pos.y = 0;
    neutron_stars[1].vel.x = 0;
    neutron_stars[1].vel.y = -15;
  }

  if (
    current_scenario_name === 'White Dwarf Binary' &&
    white_dwarfs.length >= 2
  ) {
    white_dwarfs[0].pos.x = -80;
    white_dwarfs[0].pos.y = 0;
    white_dwarfs[0].vel.x = 0;
    white_dwarfs[0].vel.y = 20;

    white_dwarfs[1].pos.x = 80;
    white_dwarfs[1].pos.y = 0;
    white_dwarfs[1].vel.x = 0;
    white_dwarfs[1].vel.y = -20;
  }

  if (
    current_scenario_name === 'Tidal Disruption Event' &&
    bh_list.length >= 1 &&
    planets.length >= 1
  ) {
    bh_list[0].pos.x = 0;
    bh_list[0].pos.y = 0;
    bh_list[0].vel.x = 0;
    bh_list[0].vel.y = 0;

    planets[0].pos.x = 150;
    planets[0].pos.y = 0;
    planets[0].vel.x = 0;
    planets[0].vel.y = 80;
  }

  // Special positioning for black holes in specific scenarios
  if (bh_list.length > 1) {
    switch (current_scenario_name) {
      case 'Slingshot':
        if (bh_list.length >= 2) {
          // Create a binary black hole system with proper orbital parameters
          const separation = 100; // Initial separation distance
          const m1 = bh_list[0].mass; // Mass of first black hole (60 M☉)
          const m2 = bh_list[1].mass; // Mass of second black hole (3 M☉)
          const totalMass = m1 + m2;

          // Calculate center of mass positions
          const r1 = separation * (m2 / totalMass); // Distance from BH1 to center of mass
          const r2 = separation * (m1 / totalMass); // Distance from BH2 to center of mass

          // Position black holes around center of mass
          bh_list[0].pos.x = -r1;
          bh_list[0].pos.y = 0;
          bh_list[1].pos.x = r2;
          bh_list[1].pos.y = 0;

          // Calculate orbital velocity for circular orbit
          const G = SETTINGS.gravitational_constant;
          const orbitalSpeed = Math.sqrt((G * totalMass) / separation);

          // Apply velocities for circular orbit (perpendicular to separation)
          bh_list[0].vel.x = 0;
          bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass); // Reduced velocity based on mass ratio
          bh_list[1].vel.x = 0;
          bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass); // Opposite direction

          // Add slight perturbation to make it more interesting
          const perturbation = 0.9; // Reduce velocity slightly to create more dynamic orbits
          bh_list[0].vel.y *= perturbation;
          bh_list[1].vel.y *= perturbation;
        }
        break;

      case 'Binary BH':
        if (bh_list.length >= 2) {
          // Calculate proper orbital parameters for binary black holes
          const separation = 120; // Initial separation distance
          const m1 = bh_list[0].mass; // Mass of first black hole
          const m2 = bh_list[1].mass; // Mass of second black hole
          const totalMass = m1 + m2;

          // Calculate center of mass positions
          const r1 = separation * (m2 / totalMass); // Distance from BH1 to center of mass
          const r2 = separation * (m1 / totalMass); // Distance from BH2 to center of mass

          // Position black holes around center of mass
          bh_list[0].pos.x = -r1;
          bh_list[0].pos.y = 0;
          bh_list[1].pos.x = r2;
          bh_list[1].pos.y = 0;

          // Calculate orbital velocity for circular orbit
          // v = sqrt(G * M_total / separation) for reduced mass system
          const G = SETTINGS.gravitational_constant;
          const orbitalSpeed = Math.sqrt((G * totalMass) / separation);

          // Apply velocities for circular orbit (perpendicular to separation)
          bh_list[0].vel.x = 0;
          bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass); // Reduced velocity based on mass ratio
          bh_list[1].vel.x = 0;
          bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass); // Opposite direction

          // Add slight perturbation to start gravitational wave inspiral
          const perturbation = 0.95; // Slightly reduce velocity to start inspiral
          bh_list[0].vel.y *= perturbation;
          bh_list[1].vel.y *= perturbation;
        }
        break;

      case 'Triple BH System':
        if (bh_list.length >= 3) {
          // Triangle formation
          const radius = 150;
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * 2 * Math.PI;
            bh_list[i].pos.x = Math.cos(angle) * radius;
            bh_list[i].pos.y = Math.sin(angle) * radius;

            // Orbital velocity
            const vel_mag = 15;
            bh_list[i].vel.x = -Math.sin(angle) * vel_mag;
            bh_list[i].vel.y = Math.cos(angle) * vel_mag;
          }
        }
        break;

      // Duplicate 'Slingshot' case removed (handled earlier)
    }
  }

  zeroNetMomentum();
};

/**
 * Move the whole system into its own center-of-mass frame.
 *
 * Placement assigns each body a velocity for its own orbit and never checks
 * what they sum to, so a scenario could open already coasting: Binary Star
 * System left at 2.4 units per time unit and walked out of frame, and The
 * Pinwheel Galaxy Core left at 811. Subtracting the mass-weighted mean makes
 * the barycenter stationary, which is what a viewer expects of a system
 * presented as self-contained, and costs nothing physically - it is a change
 * of reference frame, not of the dynamics.
 *
 * Scenarios that mean to show something arriving from outside - Rogue
 * Encounter, Interstellar Visitor - place their objects by hand and return
 * before this point, so their net motion is left alone.
 */
const zeroNetMomentum = () => {
  const bodies = [
    ...bh_list,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...comets,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
  ];
  let total = 0;
  let px = 0;
  let py = 0;
  for (const b of bodies) {
    const m = b.mass || 0;
    if (!Number.isFinite(m) || m <= 0) continue;
    if (!Number.isFinite(b.vel?.x) || !Number.isFinite(b.vel?.y)) continue;
    total += m;
    px += m * b.vel.x;
    py += m * b.vel.y;
  }
  if (total <= 0) return;
  const vx = px / total;
  const vy = py / total;
  if (Math.abs(vx) < 1e-9 && Math.abs(vy) < 1e-9) return;
  for (const b of bodies) {
    if (!Number.isFinite(b.vel?.x) || !Number.isFinite(b.vel?.y)) continue;
    b.vel.x -= vx;
    b.vel.y -= vy;
  }
};
/**
 * Initialize the physics simulation with current settings
 * Creates all physics objects and applies initial conditions
 */
/**
 * Build the world, then hand it a fresh identity.
 *
 * World generation draws on Math.random in roughly 180 places, so on its own
 * it produces a different system every time - which is fine for a sandbox and
 * useless for a shared link. Running it inside withSeed() makes the whole
 * build a function of one number, so the same seed rebuilds the same universe
 * and a link only has to carry the seed.
 *
 * @param {Object} [options]
 * @param {string|number} [options.seed] - Reuse this seed instead of a new one
 * @param {boolean} [options.keepSeed] - Rebuild with the seed already in use
 * @returns {number} The seed the world was built from
 */
// The Kuiper Belt scenario's schematic radial ladder: eight named objects,
// evenly spaced, ordered by real semi-major axis. See the scenario block below
// for why the spacing is not linear in AU.
const KUIPER_LADDER_INNER = 200;
const KUIPER_LADDER_STEP = 20;

const initialize_simulation = (options = {}) => {
  if (options.seed !== undefined) {
    setWorldSeed(options.seed);
  } else if (!options.keepSeed) {
    // A plain rebuild - a new scenario, or Refresh - is meant to give
    // something new to look at, so it gets a new seed.
    setWorldSeed(randomSeed());
  }
  // applyPreset signs off by setting preset_scenario to the 'None' sentinel,
  // so a second build reads no scenario: it skips the preset, keeps the old
  // settings and records the scenario name as 'None'. Callers compensate by
  // reassigning the name first - the Refresh and Reset buttons each do it by
  // hand - which is a precondition easy to forget and silent when missed.
  // Restoring it here makes every rebuild idempotent instead.
  if (SETTINGS.preset_scenario === 'None' && current_scenario_name) {
    SETTINGS.preset_scenario = current_scenario_name;
  }

  const seed = getWorldSeed();
  withSeed(seed, () => build_simulation());
  // The object lists have just been repopulated; the physics caches hold the
  // previous set and must not be reused.
  bumpWorldGeneration();
  // The clock and the conservation baseline belong to the world that was just
  // torn down, not to this one. The baseline is taken after the caches are
  // bumped, so it is measured over the bodies that now exist rather than over
  // whatever the previous scenario left in the cached lists.
  resetSimulationTime();
  // The absorption ledger counts spin banked and momentum discarded since the
  // world was built, so it starts over with the world.
  resetAbsorptionAccounting();
  resetConservationBaseline();
  resetPotentialCache();
  worldTouched = false;
  // A preset sets its own speed, so the readout is stale until it is told.
  updateSpeedDisplay();
  // Kept so a shared link can rebuild under the settings that actually
  // produced this world, then apply anything changed since. Some scenarios
  // read settings while generating - Kepler's 2nd Law derives its launch
  // velocities from the gravitational constant - so applying a later value
  // during the rebuild would quietly hand over a different experiment.
  generationSettings = JSON.parse(JSON.stringify(SETTINGS));
  return seed;
};

// Settings as they stood when the current world was built.
let generationSettings = null;

// Set when the author changes the world by hand. A seeded link stops being a
// truthful description of the simulation at that moment, because re-running
// generation would not produce what is now on screen.
let worldTouched = false;

/** Mark the world as hand-edited, so sharing switches to full state. */
const markWorldTouched = () => {
  worldTouched = true;
};

// Settings from a shared link, waiting for the next build to apply them.
let pendingSettingsOverride = null;

// Set while a guided investigation is running; see showObjectInspector.
let inspectorSuppressed = false;

/**
 * Hide the object inspector without disabling selection.
 * @param {boolean} value - True to withhold the panel on click
 */
const setInspectorSuppressed = value => {
  inspectorSuppressed = !!value;
  // Deliberately not hideObjectInspector(): that also clears the orbit overlay
  // and the equal-areas wedges, which are exactly what a lesson wants left on
  // screen. Only the panel itself is put away.
  if (inspectorSuppressed) {
    const el = document.getElementById('objectInspector');
    if (el) {
      el.classList.remove('visible');
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
    }
    state.inspector_open = false;
    if (state.inspectorUpdateInterval) {
      clearInterval(state.inspectorUpdateInterval);
      state.inspectorUpdateInterval = null;
    }
  } else {
    const el = document.getElementById('objectInspector');
    if (el) el.style.display = '';
  }
};

// Placing anything by hand puts the world beyond what its seed rebuilds, so
// from here on a link has to carry the bodies themselves.
window.addEventListener('gravitasObjectPlaced', markWorldTouched);

const build_simulation = () => {
  // Set the state reference in physics.js to ensure single source of truth
  setStateReference(state);

  const starting_preset = SETTINGS.preset_scenario;
  apply_preset();

  // Settings carried in a shared link land here rather than before the call,
  // because apply_preset() has just reset everything to the scenario's own
  // defaults and would have wiped them.
  if (pendingSettingsOverride) {
    Object.assign(SETTINGS, pendingSettingsOverride);
    pendingSettingsOverride = null;
  }

  current_scenario_name = starting_preset;

  // Reset insertion object type to scenario default (or 'Star') and update button
  SETTINGS.input_object_type = SETTINGS.input_object_type || 'Star';
  updateObjectTypeButton();

  // Ensure inspector is hidden during initialization
  hideObjectInspector();

  // Update physics settings
  updatePhysicsSettings(SETTINGS);

  state.zoom = SETTINGS.preset_zoom || 1.5; // Use preset zoom or default to 1.5
  state.pan = { x: 0.0, y: 0.0 };
  // Clear all arrays instead of reassigning them
  bh_list.length = 0;
  planets.length = 0;
  stars.length = 0;
  gas_giants.length = 0;
  asteroids.length = 0;
  comets.length = 0;
  neutron_stars.length = 0;
  white_dwarfs.length = 0;
  galaxies.length = 0;
  debris.length = 0;
  particles.length = 0;
  gravity_ripples.length = 0;
  accretion_disk_particles.length = 0;
  particlePool.clear(); // Clear particle pool
  resetPhysicsObjectCounter();
  // Ids restart, so a frame pinned to id 7 would silently follow a different
  // body in the new world. The trail clock restarts with them.
  resetFrame();
  resetTrailTick();

  // Clear all energy history when simulation resets
  clearAllEnergyHistory();

  // Recorded history and the undo stack belong to the old simulation.
  window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));

  // Add central stars for specific presets
  if (
    ['Kuiper Belt', 'Rogue Encounter', 'Solar System'].includes(starting_preset)
  ) {
    const central = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    // Named as the anchor rather than inferred from mass: num_stars can add a
    // randomly generated star of up to about 6 solar masses, which would
    // otherwise win the comparison and drag the whole system around it.
    central.isCentralBody = true;
    stars.push(central);
  }

  // Add stars based on num_stars setting
  // Counting from what is already there matters for the presets above, which
  // have just added their central star and also ask for num_stars: 1 meaning
  // that same star. They used to get two - one anchored at the center and one
  // randomly generated - and the spare was dropped into the belt it was
  // supposed to be lighting.
  if (SETTINGS.num_stars) {
    for (let i = stars.length; i < SETTINGS.num_stars; i++) {
      stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Add black holes
  if (SETTINGS.use_individual_bh_masses && SETTINGS.bh_masses.length > 0) {
    for (let i = 0; i < SETTINGS.num_black_holes; i++) {
      const mass = SETTINGS.bh_masses[i] || SETTINGS.bh_mass;
      bh_list.push(new BlackHole({ x: 0, y: 0 }, mass * SOLAR_MASS_UNIT));
    }
  } else {
    for (let i = 0; i < SETTINGS.num_black_holes; i++) {
      bh_list.push(
        new BlackHole({ x: 0, y: 0 }, SETTINGS.bh_mass * SOLAR_MASS_UNIT)
      );
    }
  }

  // Add neutron stars
  if (
    SETTINGS.use_individual_ns_masses &&
    SETTINGS.ns_masses &&
    SETTINGS.ns_masses.length > 0
  ) {
    for (let i = 0; i < SETTINGS.num_neutron_stars; i++) {
      const mass = SETTINGS.ns_masses[i] || 1.4; // Default to 1.4 M☉ if not specified
      neutron_stars.push(
        new NeutronStar(
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          mass * SOLAR_MASS_UNIT,
          null
        )
      );
    }
  } else {
    for (let i = 0; i < (SETTINGS.num_neutron_stars || 0); i++) {
      neutron_stars.push(
        new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, null, null)
      );
    }
  }

  // Add white dwarfs
  for (let i = 0; i < (SETTINGS.num_white_dwarfs || 0); i++) {
    white_dwarfs.push(new WhiteDwarf({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add planets
  for (let i = 0; i < SETTINGS.num_planets; i++) {
    planets.push(new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add gas giants
  for (let i = 0; i < SETTINGS.num_gas_giants; i++) {
    gas_giants.push(new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add asteroids
  if (SETTINGS.enable_asteroids) {
    for (let i = 0; i < SETTINGS.num_asteroids; i++) {
      asteroids.push(new Asteroid({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Add comets
  if (SETTINGS.num_comets) {
    for (let i = 0; i < SETTINGS.num_comets; i++) {
      comets.push(new Comet({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Apply placement patterns to position objects
  apply_placement();

  // --- Fix for GW150914 scenario: two black holes in close inspiral ---
  if (starting_preset === 'GW150914' && bh_list.length >= 2) {
    const separation = 90; // Slightly closer for faster merger
    const m1 = bh_list[0].mass;
    const m2 = bh_list[1].mass;
    const totalMass = m1 + m2;
    // Center of mass positions
    const r1 = separation * (m2 / totalMass);
    const r2 = separation * (m1 / totalMass);
    bh_list[0].pos.x = -r1;
    bh_list[0].pos.y = 0;
    bh_list[1].pos.x = r2;
    bh_list[1].pos.y = 0;
    // Orbital velocities
    const G = SETTINGS.gravitational_constant;
    const orbitalSpeed = Math.sqrt((G * totalMass) / separation);
    bh_list[0].vel.x = 0;
    bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass);
    bh_list[1].vel.x = 0;
    bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass);
    // Add stronger perturbation to ensure inspiral
    const perturbation = 0.92;
    bh_list[0].vel.y *= perturbation;
    bh_list[1].vel.y *= perturbation;
  }

  // Show enhanced scenario info box
  show_enhanced_scenario_info(starting_preset);

  // Special scenario setups
  if (starting_preset === 'Binary Star System') {
    // Clear any existing stars and create binary system
    stars.length = 0;

    // Two stars of unequal mass were given equal and opposite speeds, which
    // is not the same as equal and opposite momentum: 1.2 x 12 against
    // 0.8 x 12 left the pair coasting at 2.4 units per time unit and the whole
    // system walked out of frame within twenty seconds. Splitting a circular
    // relative velocity by the mass ratio makes the barycenter stationary.
    const SEP = 120;
    const M1 = 1.2 * SOLAR_MASS_UNIT;
    const M2 = 0.8 * SOLAR_MASS_UNIT;
    const MTOT = M1 + M2;
    const vRel = Math.sqrt((SETTINGS.gravitational_constant * MTOT) / SEP);
    const star1 = new StarObject(
      { x: (-SEP * M2) / MTOT, y: 0 },
      { x: 0, y: (vRel * M2) / MTOT },
      1.2
    );
    const star2 = new StarObject(
      { x: (SEP * M1) / MTOT, y: 0 },
      { x: 0, y: (-vRel * M1) / MTOT },
      0.8
    );
    stars.push(star1, star2);

    // Add planets orbiting the binary system
    const centralMass = star1.mass + star2.mass;
    for (let i = 0; i < SETTINGS.num_planets; i++) {
      const r = 150 + i * 30; // Orbital radius around binary center
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      planets[i].pos = pos;
      planets[i].vel = vel;
    }

    // Add gas giants
    for (let i = 0; i < SETTINGS.num_gas_giants; i++) {
      const r = 300 + i * 50;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      gas_giants[i].pos = pos;
      gas_giants[i].vel = vel;
    }

    // Add asteroids
    if (SETTINGS.enable_asteroids) {
      for (let i = 0; i < SETTINGS.num_asteroids; i++) {
        const r = 400 + Math.random() * 100;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt(
          (SETTINGS.gravitational_constant * centralMass) / r
        );
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        asteroids[i].pos = pos;
        asteroids[i].vel = vel;
      }
    }

    // The stars are balanced against each other by construction, but the
    // planets, giants and asteroids all circulate the same way and their
    // momentum does not cancel on its own.
    zeroNetMomentum();
  } else if (starting_preset === 'Tidal Disruption Event') {
    // One star, falling in on a long ellipse whose closest approach is inside
    // the hole's tidal radius but outside the radius at which it would simply
    // be absorbed. StarObject.tidal_mass_loss strips it there and sheds the
    // debris that gives the scenario its name.
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    debris.length = 0;

    const hole = bh_list[0];
    if (hole) {
      hole.pos.x = 0;
      hole.pos.y = 0;
      hole.vel.x = 0;
      hole.vel.y = 0;

      const G = SETTINGS.gravitational_constant;
      const GM = G * hole.mass;
      // Tidal disruption begins at three times the drawn radius, and the hole
      // swallows anything within its radius plus six. Periapsis at 1.5 radii
      // sits well inside the first and comfortably outside the second, so the
      // star is stripped over repeated passes instead of being eaten on the
      // first one.
      const apo = Math.max(900, hole.radius * 11);
      const peri = hole.radius * 1.5;
      const a = (apo + peri) / 2;

      // Started partway down the infall rather than at apoapsis, so the first
      // passage happens within a few seconds of opening the scenario instead
      // of after most of a period spent as a dot at the edge of the frame.
      const r0 = Math.min(apo, Math.max(peri * 2.5, apo * 0.45));
      const vPeri = Math.sqrt(GM * (2 / peri - 1 / a));
      const angularMomentum = peri * vPeri;
      const speed = Math.sqrt(GM * (2 / r0 - 1 / a));
      const vTangential = angularMomentum / r0;
      // Inbound: the radial component points back towards the hole.
      const vRadial = -Math.sqrt(
        Math.max(0, speed * speed - vTangential * vTangential)
      );

      const star = new StarObject(
        { x: r0, y: 0 },
        { x: vRadial, y: vTangential },
        1.0
      );
      star.name = 'Doomed star';
      stars.push(star);
    }
  } else if (starting_preset === 'Black Hole Billiards') {
    // Three light holes on staggered circular orbits around the heavy one, so
    // the scene opens as something recognisably in motion rather than four
    // holes scattered at random that have merged by the time anyone looks.
    const heavy = bh_list[0];
    if (heavy && bh_list.length >= 2) {
      heavy.pos.x = 0;
      heavy.pos.y = 0;
      heavy.vel.x = 0;
      heavy.vel.y = 0;
      const G = SETTINGS.gravitational_constant;
      for (let i = 1; i < bh_list.length; i++) {
        const r = heavy.radius * (3.2 + (i - 1) * 1.9);
        const angle = ((i - 1) / (bh_list.length - 1)) * 2 * Math.PI;
        const v = Math.sqrt((G * heavy.mass) / r);
        bh_list[i].pos.x = Math.cos(angle) * r;
        bh_list[i].pos.y = Math.sin(angle) * r;
        bh_list[i].vel.x = -Math.sin(angle) * v;
        bh_list[i].vel.y = Math.cos(angle) * v;
      }
    }
  } else if (starting_preset === 'Solar System') {
    // Clear any existing objects
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;

    // Create the Sun as a proper G-type main sequence star with accurate properties
    const sun = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    sun.name = 'Sol'; // Real name of our sun
    sun.mass = SOLAR_MASS_UNIT; // 1 solar mass = 1000 units
    sun.massInSuns = 1.0; // Exactly 1 solar mass
    sun.baseColor = '#FFFF00'; // G-type star color (yellow, like our Sun)
    sun.radius = 15; // Make sun larger for visibility
    sun.temperature = 5778; // Kelvin (real solar effective temperature)
    sun.spectralType = 'G2V'; // Real spectral classification
    sun.age = 4.6; // Billion years (middle-aged G-type star)
    sun.luminosity = 1.0; // Solar luminosity (3.828×10²⁶ W)
    sun.solarRadius = 1.0; // 1.0 solar radii (696,340 km)
    sun.metallicity = 0.02; // Solar metallicity (Z = 0.02)
    sun.rotationPeriod = 25.4; // Days (solar rotation period at equator)
    sun.surfaceGravity = 274; // m/s² (solar surface gravity)
    sun.density = 1408; // kg/m³ (solar density)
    sun.isSolarSystemSun = true; // Flag for Solar System sun
    // Measured, so the habitable-zone model uses it rather than a fallback.
    sun.massInSuns = 1.0;
    sun.luminosityInSuns = 1.0;
    sun.radiusInSuns = 1.0;
    sun.temperature = 5772; // K, effective temperature
    stars.push(sun);

    // Real Solar System data with accurate properties
    // Distances in AU (scaled down for simulation), masses in Earth masses, diameters in km
    const solarSystemData = [
      {
        name: 'Mercury',
        mass: 0.055, // 0.055 Earth masses
        distance: 38.7, // 0.387 AU at 100 units per AU
        phase_deg: 0,
        diameter: 4879, // km
        orbital_period: 88, // days
        type: 'terrestrial',
        color: '#9E9E9E', // Mercury grey/rocky
        density: 'rocky',
        temperature: 440, // Kelvin (daytime surface temperature)
        gravity: 3.7, // m/s²
        rotation_period: 58.6, // days (slow rotation)
        atmosphere: 'none',
        density_kg_m3: 5427, // kg/m³
        escape_velocity: 4.25, // km/s
        surface_pressure: 0, // Pa (no atmosphere)
      },
      {
        name: 'Venus',
        mass: 0.815, // 0.815 Earth masses
        distance: 72.3, // 0.723 AU at 100 units per AU
        phase_deg: 45,
        diameter: 12104, // km
        orbital_period: 225, // days
        type: 'terrestrial',
        color: '#E6BE8A', // Venus's actual color (creamy yellow-brown)
        density: 'rocky',
        temperature: 737, // Kelvin (surface temperature)
        gravity: 8.87, // m/s²
        rotation_period: -243, // days (retrograde rotation)
        atmosphere: 'CO2',
        density_kg_m3: 5243, // kg/m³
        escape_velocity: 10.36, // km/s
        surface_pressure: 9200000, // Pa (92 bar)
      },
      {
        name: 'Earth',
        mass: 1.0, // 1 Earth mass
        distance: 100.0, // 1.000 AU at 100 units per AU
        phase_deg: 90,
        diameter: 12742, // km
        orbital_period: 365, // days
        type: 'terrestrial',
        color: '#3FA7D6', // Earth blue-greenish
        density: 'rocky',
        temperature: 288, // Kelvin (average surface temperature)
        gravity: 9.81, // m/s²
        rotation_period: 1.0, // days
        atmosphere: 'N2/O2',
        density_kg_m3: 5514, // kg/m³
        escape_velocity: 11.19, // km/s
        surface_pressure: 101325, // Pa (1 bar)
      },
      {
        name: 'Mars',
        mass: 0.107, // 0.107 Earth masses
        distance: 152.4, // 1.524 AU at 100 units per AU
        phase_deg: 135,
        diameter: 6779, // km
        orbital_period: 687, // days
        type: 'terrestrial',
        color: '#C1440E', // Mars's actual color (reddish-orange)
        density: 'rocky',
        temperature: 210, // Kelvin (average surface temperature)
        gravity: 3.71, // m/s²
        rotation_period: 1.03, // days
        atmosphere: 'CO2',
        density_kg_m3: 3933, // kg/m³
        escape_velocity: 5.03, // km/s
        surface_pressure: 636, // Pa (0.006 bar)
      },
      {
        name: 'Jupiter',
        mass: 317.8, // 317.8 Earth masses
        distance: 520.4, // 5.204 AU at 100 units per AU
        phase_deg: 210,
        diameter: 139822, // km
        orbital_period: 4333, // days
        type: 'gas_giant',
        color: '#D2B48C', // Jupiter tan/beige with bands
        giantType: 'jupiter_like',
        temperature: 165, // Kelvin (cloud top temperature)
        gravity: 24.79, // m/s²
        rotation_period: 0.41, // days (fast rotation)
        atmosphere: 'H2/He',
        density_kg_m3: 1326, // kg/m³
        escape_velocity: 59.5, // km/s
        surface_pressure: 100000, // Pa (1 bar at cloud tops)
      },
      {
        name: 'Saturn',
        mass: 95.2, // 95.2 Earth masses
        distance: 958.3, // 9.583 AU at 100 units per AU
        phase_deg: 260,
        diameter: 116464, // km
        orbital_period: 10759, // days
        type: 'gas_giant',
        color: '#F5DE8A', // Saturn pale yellow
        giantType: 'jupiter_like',
        temperature: 134, // Kelvin (cloud top temperature)
        gravity: 10.44, // m/s²
        rotation_period: 0.45, // days (fast rotation)
        atmosphere: 'H2/He',
        density_kg_m3: 687, // kg/m³
        escape_velocity: 35.5, // km/s
        surface_pressure: 100000, // Pa (1 bar at cloud tops)
      },
      {
        name: 'Uranus',
        mass: 14.5, // 14.5 Earth masses
        distance: 1919.1, // 19.191 AU at 100 units per AU
        phase_deg: 310,
        diameter: 50724, // km
        orbital_period: 30687, // days
        type: 'ice_giant',
        color: '#A7E3F1', // Uranus cyan
        giantType: 'neptune_like',
        temperature: 76, // Kelvin (cloud top temperature)
        gravity: 8.69, // m/s²
        rotation_period: -0.72, // days (retrograde rotation)
        atmosphere: 'H2/He/CH4',
        density_kg_m3: 1271, // kg/m³
        escape_velocity: 21.3, // km/s
        surface_pressure: 100000, // Pa (1 bar at cloud tops)
      },
      {
        name: 'Neptune',
        mass: 17.1, // 17.1 Earth masses
        distance: 3007.0, // 30.070 AU at 100 units per AU
        phase_deg: 350,
        diameter: 49244, // km
        orbital_period: 60190, // days
        type: 'ice_giant',
        color: '#4B70DD', // Neptune deep blue
        giantType: 'neptune_like',
        temperature: 72, // Kelvin (cloud top temperature)
        gravity: 11.15, // m/s²
        rotation_period: 0.67, // days
        atmosphere: 'H2/He/CH4',
        density_kg_m3: 1638, // kg/m³
        escape_velocity: 23.5, // km/s
        surface_pressure: 100000, // Pa (1 bar at cloud tops)
      },
      // Dwarf planet beyond Neptune
    ];

    // Create planets with realistic properties
    const DEG2RAD = Math.PI / 180;

    for (let i = 0; i < solarSystemData.length; i++) {
      const planetData = solarSystemData[i];
      const r = planetData.distance;
      const theta =
        typeof planetData.phase_deg === 'number'
          ? planetData.phase_deg * DEG2RAD
          : (i * 45 * DEG2RAD) % (2 * Math.PI);
      // Calculate orbital velocity based on real orbital periods
      const orbitalVelocity = Math.sqrt(
        (SETTINGS.gravitational_constant * sun.mass) / r
      );
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = {
        x: -orbitalVelocity * Math.sin(theta),
        y: orbitalVelocity * Math.cos(theta),
      };

      if (planetData.type === 'gas_giant' || planetData.type === 'ice_giant') {
        // Create new gas giant objects
        // planetData.mass is in Earth masses, so the conversion to the
        // constructor's Jupiter masses goes through the Earth/Jupiter ratio.
        // Dividing by 50 here made Jupiter report 6.4 M_J in the inspector.
        const gasGiant = new GasGiant(
          pos,
          vel,
          planetData.mass / EARTH_MASSES_PER_JUPITER_MASS
        );
        gasGiant.name = planetData.name;
        gasGiant.diameter = planetData.diameter;
        gasGiant.orbital_period = planetData.orbital_period;
        gasGiant.baseColor = planetData.color;
        gasGiant.giantType = planetData.giantType;
        // Add accurate physical properties
        gasGiant.temperature = planetData.temperature;
        gasGiant.gravity = planetData.gravity;
        gasGiant.rotation_period = planetData.rotation_period;
        gasGiant.atmosphere = planetData.atmosphere;
        gasGiant.density_kg_m3 = planetData.density_kg_m3;
        gasGiant.escape_velocity = planetData.escape_velocity;
        gasGiant.surface_pressure = planetData.surface_pressure;
        gasGiant.isSolarSystemPlanet = true; // Flag for Solar System planets
        // Jupiter lands at 0.955 units against a 1000-unit Sun, which is the
        // real ratio. The floor is here only for the smallest bodies.
        gasGiant.mass = Math.max(planetData.mass * EARTH_MASS_UNIT, 1e-7);
        // Ensure Saturn has visible rings; other giants do not
        if (gasGiant.name === 'Saturn') {
          gasGiant.hasRings = true;
          // Set consistent, prominent ring parameters
          gasGiant.ringInnerRadius = gasGiant.radius * 1.3;
          gasGiant.ringOuterRadius = gasGiant.radius * 2.2;
          gasGiant.ringAngle = 0.25; // slight tilt
          gasGiant.ringOpacity = 0.65;
        } else {
          gasGiant.hasRings = false;
        }
        gas_giants.push(gasGiant);
      } else {
        // Create new terrestrial planet objects
        const planet = new Planet(pos, vel, planetData.mass);
        planet.name = planetData.name;
        planet.massInEarths = planetData.mass;
        planet.diameter = planetData.diameter;
        planet.orbital_period = planetData.orbital_period;
        planet.baseColor = planetData.color;
        planet.density = planetData.density;
        // Add accurate physical properties
        planet.temperature = planetData.temperature;
        planet.gravity = planetData.gravity;
        planet.rotation_period = planetData.rotation_period;
        planet.atmosphere = planetData.atmosphere;
        planet.density_kg_m3 = planetData.density_kg_m3;
        planet.escape_velocity = planetData.escape_velocity;
        planet.surface_pressure = planetData.surface_pressure;
        planet.isSolarSystemPlanet = true; // Flag for Solar System planets
        planet.mass = Math.max(planetData.mass * EARTH_MASS_UNIT, 1e-7);
        planets.push(planet);
      }
    }

    // Add asteroid belt between Mars and Jupiter with real asteroids
    if (SETTINGS.enable_asteroids) {
      const realAsteroids = [
        { name: 'Ceres', diameter: 939, distance: 277, mass: 0.00016 }, // Dwarf planet - between Mars and Jupiter
        { name: 'Vesta', diameter: 525, distance: 236, mass: 0.00004 },
        { name: 'Pallas', diameter: 512, distance: 277, mass: 0.00003 },
        { name: 'Hygiea', diameter: 434, distance: 314, mass: 0.00002 },
        { name: 'Interamnia', diameter: 350, distance: 306, mass: 0.00001 },
        { name: 'Europa', diameter: 315, distance: 310, mass: 0.000008 },
        { name: 'Davida', diameter: 289, distance: 316, mass: 0.000006 },
        { name: 'Sylvia', diameter: 286, distance: 321, mass: 0.000006 },
        { name: 'Hektor', diameter: 225, distance: 524, mass: 0.000003 },
        { name: 'Juno', diameter: 257, distance: 267, mass: 0.000004 },
        { name: 'Iris', diameter: 200, distance: 239, mass: 0.000002 },
        { name: 'Eunomia', diameter: 255, distance: 335, mass: 0.000004 },
        { name: 'Psyche', diameter: 226, distance: 340, mass: 0.000003 },
        { name: 'Themis', diameter: 198, distance: 345, mass: 0.000002 },
        { name: 'Bamberga', diameter: 229, distance: 350, mass: 0.000003 },
        { name: 'Patientia', diameter: 225, distance: 355, mass: 0.000003 },
      ];

      for (
        let i = 0;
        i < Math.min(SETTINGS.num_asteroids, realAsteroids.length);
        i++
      ) {
        const asteroidData = realAsteroids[i];
        const r = asteroidData.distance + (Math.random() - 0.5) * 20; // Add some variation for wider spacing
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((SETTINGS.gravitational_constant * sun.mass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };

        // Create new asteroid object
        const asteroid = new Asteroid(pos, vel);
        asteroid.name = asteroidData.name;
        asteroid.diameter = asteroidData.diameter;
        // Same unit the planets use, so relative masses stay true to life
        asteroid.mass = Math.max(asteroidData.mass * EARTH_MASS_UNIT, 1e-12);
        // These are real asteroids with real, individual masses, so the Ceres
        // count the class carries has to follow the mass rather than keep the
        // constructor's default of one. Vesta is a quarter of a Ceres and the
        // inspector has to say so.
        syncReportedMass(asteroid);
        asteroids.push(asteroid);
      }
    }

    // Add famous comets in distant orbits with real properties
    if (SETTINGS.num_comets) {
      const famousComets = [
        {
          name: 'Halley',
          period: 76,
          perihelion: 0.586,
          aphelion: 35.1,
          diameter: 11,
        },
        {
          name: 'Hale-Bopp',
          period: 2533,
          perihelion: 0.914,
          aphelion: 370.8,
          diameter: 60,
        },
        {
          name: 'Hyakutake',
          period: 113783,
          perihelion: 0.23,
          aphelion: 4698.77,
          diameter: 4.2,
        },
        {
          name: 'Shoemaker-Levy 9',
          period: 11.3,
          perihelion: 5.4,
          aphelion: 7.8,
          diameter: 1.8,
        },
        {
          name: 'Comet ISON',
          period: 400000,
          perihelion: 0.012,
          aphelion: 73000,
          diameter: 2,
        },
        {
          name: 'Lovejoy',
          period: 314,
          perihelion: 0.005,
          aphelion: 157,
          diameter: 0.5,
        },
        {
          name: 'McNaught',
          period: 92,
          perihelion: 0.17,
          aphelion: 67,
          diameter: 19,
        },
        {
          name: 'Pan-STARRS',
          period: 110000,
          perihelion: 0.3,
          aphelion: 16000,
          diameter: 1,
        },
        {
          name: 'Swift-Tuttle',
          period: 133,
          perihelion: 0.96,
          aphelion: 51.2,
          diameter: 26,
        },
        {
          name: 'Tempel-Tuttle',
          period: 33,
          perihelion: 0.98,
          aphelion: 19.7,
          diameter: 3.6,
        },
        {
          name: 'Wild 2',
          period: 6.4,
          perihelion: 1.59,
          aphelion: 5.3,
          diameter: 5.5,
        },
        {
          name: 'Hartley 2',
          period: 6.46,
          perihelion: 1.05,
          aphelion: 5.87,
          diameter: 1.2,
        },
      ];

      for (
        let i = 0;
        i < Math.min(SETTINGS.num_comets, famousComets.length);
        i++
      ) {
        const cometData = famousComets[i];
        // Use semi-major axis for distance (average of perihelion and aphelion)
        const semiMajorAxis = (cometData.perihelion + cometData.aphelion) / 2;
        const r = semiMajorAxis * 100; // 100 units per AU, as everywhere else
        const theta = Math.random() * 2 * Math.PI;
        const v =
          Math.sqrt((SETTINGS.gravitational_constant * sun.mass) / r) * 0.7; // Comets are slower
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };

        // Create new comet object with real properties
        const comet = new Comet(pos, vel);
        comet.name = cometData.name;
        comet.period = cometData.period;
        comet.perihelion = cometData.perihelion;
        comet.aphelion = cometData.aphelion;
        comet.diameter = cometData.diameter;
        comets.push(comet);
      }
    }
  } else if (starting_preset === 'Rogue Encounter') {
    // Set up central star system first
    const centralStar = stars[0];
    const centralMass = centralStar.mass;

    // Position planets around the central star
    for (let i = 0; i < SETTINGS.num_planets; i++) {
      const r = 50 + i * 25;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      planets[i].pos = pos;
      planets[i].vel = vel;
    }

    // Position gas giants
    for (let i = 0; i < SETTINGS.num_gas_giants; i++) {
      const r = 200 + i * 50;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      gas_giants[i].pos = pos;
      gas_giants[i].vel = vel;
    }

    // Position asteroids
    if (SETTINGS.enable_asteroids) {
      for (let i = 0; i < SETTINGS.num_asteroids; i++) {
        const r = 350 + Math.random() * 100;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt(
          (SETTINGS.gravitational_constant * centralMass) / r
        );
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        asteroids[i].pos = pos;
        asteroids[i].vel = vel;
      }
    }

    // Position rogue black hole to approach the system
    if (bh_list.length > 0) {
      bh_list[0].pos = { x: -800, y: 200 }; // Start far away
      bh_list[0].vel = { x: 20, y: -5 }; // Approach velocity
    }
  } else if (starting_preset === 'Kuiper Belt') {
    // Set up central star system (our Sun)
    const centralStar = stars[0];
    centralStar.name = 'Sol';
    const centralMass = centralStar.mass;

    // The named trans-Neptunian objects.
    //
    // These used to be written onto the first entry of `planets` (or of
    // `gas_giants`) and then spliced straight back out of it, so all eight were
    // configured and then deleted before the first frame: the scenario named
    // after them ran without any of them in it. They are built here instead,
    // the same way the Solar System scenario builds its planets - constructed
    // with their own mass and pushed - so nothing downstream has to keep a
    // pool index in step with them.
    //
    // Classification: every one of these is an icy solid body, so every one of
    // them is a Planet. Quaoar, Sedna, Orcus and Varuna were previously built
    // as GasGiants purely because that array had spare entries, which put four
    // gas giants in a Kuiper Belt and made the inspector say so.
    //
    // Masses are published values in Earth masses (M_E = 5.972e24 kg). Sedna's
    // is an estimate; it has no satellite and therefore no measured mass.
    //
    // Radial scale is SCHEMATIC, not linear in AU. The real belt runs from
    // 39 AU to Sedna's 507 AU, a factor of thirteen that cannot be drawn on
    // one screen and still show the classical objects apart from each other.
    // The eight are laid out on an evenly spaced ladder instead, ordered by
    // real semi-major axis, so the ordering a student reads off the screen is
    // the true one even though the spacing is not. `semi_major_axis_au` on
    // each body carries the real value for anything that wants it.
    const kuiperBeltObjects = [
      { name: 'Orcus', mass: 0.000106, semiMajorAxisAu: 39.17 },
      { name: 'Pluto', mass: 0.00218, semiMajorAxisAu: 39.48 },
      { name: 'Varuna', mass: 0.0000619, semiMajorAxisAu: 42.92 },
      { name: 'Haumea', mass: 0.000671, semiMajorAxisAu: 43.13 },
      { name: 'Quaoar', mass: 0.000201, semiMajorAxisAu: 43.69 },
      { name: 'Makemake', mass: 0.000519, semiMajorAxisAu: 45.43 },
      { name: 'Eris', mass: 0.00276, semiMajorAxisAu: 67.78 },
      { name: 'Sedna', mass: 0.00017, semiMajorAxisAu: 506.8 },
    ];

    // The pool `apply_placement` just laid out is replaced wholesale: these
    // eight are the scenario's planets, and a random ninth would be a body
    // with no name in a scenario whose whole subject is named ones.
    planets.length = 0;
    gas_giants.length = 0;

    kuiperBeltObjects.forEach((kboData, i) => {
      const r = KUIPER_LADDER_INNER + i * KUIPER_LADDER_STEP;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };

      const kbo = new Planet(pos, vel, kboData.mass);
      kbo.name = kboData.name;
      // The constructor already derived these from the same mass; setting them
      // again is cheap insurance against the two drifting apart if it changes.
      kbo.mass = kboData.mass * EARTH_MASS_UNIT;
      kbo.massInEarths = kboData.mass;
      kbo.semi_major_axis_au = kboData.semiMajorAxisAu;
      kbo.density = 'icy';
      kbo.baseColor = '#CFE6F5';
      kbo.isKuiperBeltObject = true;
      planets.push(kbo);
    });

    // Add smaller Kuiper Belt objects as asteroids
    if (SETTINGS.enable_asteroids) {
      const smallKBOs = [
        'Ixion',
        'Huya',
        '2002 AW197',
        '2002 UX25',
        '2002 TX300',
        '2003 AZ84',
        '2003 VS2',
        '2004 GV9',
        '2005 RN43',
        '2005 UQ513',
        '2006 QH181',
        '2007 OR10',
      ];

      // Inside the same band as the named objects, not beyond it. These are all
      // classical-belt bodies at 39-48 AU, so the previous 500-700 placed every
      // one of them outside Sedna, which is the single most distant object in
      // the scenario by an order of magnitude.
      for (
        let i = 0;
        i < Math.min(SETTINGS.num_asteroids, smallKBOs.length);
        i++
      ) {
        const r =
          KUIPER_LADDER_INNER -
          10 +
          Math.random() * (KUIPER_LADDER_STEP * 5 + 20);
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt(
          (SETTINGS.gravitational_constant * centralMass) / r
        );
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        asteroids[i].pos = pos;
        asteroids[i].vel = vel;
        asteroids[i].name = smallKBOs[i];
      }
    }
  } else if (starting_preset === 'Sagittarius A*') {
    // Set up Sagittarius A* with correct name
    if (bh_list.length > 0) {
      bh_list[0].name = 'Sagittarius A*';
    }

    // Add some real S-stars that orbit Sgr A* (the most famous ones)
    const sStars = [
      'S2',
      'S12',
      'S14',
      'S1',
      'S8',
      'S13',
      'S9',
      'S6',
      'S4',
      'S7',
      'S31',
      'S21',
      'S24',
      'S54',
      'S55',
      'S60',
      'S66',
      'S67',
      'S83',
      'S87',
    ];

    // Name some of the stars with real S-star names
    for (let i = 0; i < Math.min(stars.length, sStars.length); i++) {
      stars[i].name = sStars[i];
    }

    // Name some neutron stars with real names from the galactic center
    const galacticNeutronStars = [
      'SGR J1745-2900',
      'PSR J1745-2900',
      'PSR J1746-2850',
      'PSR J1745-2912',
      'PSR J1746-2849',
      'PSR J1745-2910',
      'PSR J1746-2856',
      'PSR J1745-2909',
    ];

    for (
      let i = 0;
      i < Math.min(neutron_stars.length, galacticNeutronStars.length);
      i++
    ) {
      neutron_stars[i].name = galacticNeutronStars[i];
    }
  } else if (starting_preset === 'Galactic Center') {
    // Name some neutron stars with real binary star names for Galactic Center scenario
    const realBinaryStars = [
      'Alpha Centauri A',
      'Alpha Centauri B',
      'Sirius A',
      'Sirius B',
      'Procyon A',
      'Procyon B',
      'Castor A',
      'Castor B',
      'Algol A',
      'Algol B',
      'Beta Lyrae A',
      'Beta Lyrae B',
      'W Ursae Majoris A',
      'W Ursae Majoris B',
      'RS Canum Venaticorum A',
      'RS Canum Venaticorum B',
    ];

    // Name the binary stars
    for (let i = 0; i < Math.min(stars.length, 2); i++) {
      stars[i].name = realBinaryStars[i];
    }

    // Name planets with real exoplanet names from binary systems
    const binaryExoplanets = [
      'Kepler-16b',
      'Kepler-34b',
      'Kepler-35b',
      'Kepler-38b',
      'Kepler-47b',
      'Kepler-47c',
      'Kepler-64b',
      'Kepler-413b',
      'Kepler-453b',
      'Kepler-1647b',
    ];

    for (
      let i = 0;
      i < Math.min(planets.length, binaryExoplanets.length);
      i++
    ) {
      planets[i].name = binaryExoplanets[i];
    }
  } else if (starting_preset === 'Pulsar System') {
    // Set up pulsar system with real pulsar and planet names
    if (neutron_stars.length > 0) {
      neutron_stars[0].name = 'PSR B1257+12'; // The real pulsar with the first confirmed exoplanets
    }

    // Name planets with the real planets discovered around PSR B1257+12
    const pulsarPlanets = [
      'PSR B1257+12 b',
      'PSR B1257+12 c',
      'PSR B1257+12 d',
    ];

    for (let i = 0; i < Math.min(planets.length, pulsarPlanets.length); i++) {
      planets[i].name = pulsarPlanets[i];
    }
  } else if (starting_preset === 'Neutron Star Collision') {
    // Set up neutron star collision based on GW170817
    if (neutron_stars.length >= 2) {
      neutron_stars[0].name = 'GW170817-A';
      neutron_stars[1].name = 'GW170817-B';
    }
  } else if (starting_preset === 'Earth-Moon System') {
    // Clear any existing objects and create Earth-Moon system
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0; // Clear any black holes
    neutron_stars.length = 0; // Clear any neutron stars
    white_dwarfs.length = 0; // Clear any white dwarfs
    debris.length = 0; // Clear any debris

    // Create Earth at the center (we'll treat it as the primary body)
    const earth = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    earth.name = 'Earth';
    earth.mass = 1.0 * EARTH_MASS_UNIT; // 1 Earth mass
    earth.diameter = 12742; // km
    earth.orbital_period = 365; // days (Earth's orbital period around Sun)
    earth.baseColor = '#4B7BE5'; // More accurate Earth blue color
    earth.radius = 12; // Make Earth larger for visibility
    earth.density = 'rocky';
    earth.isEarth = true; // Flag for custom Earth rendering
    // Accurate Earth properties
    earth.temperature = 288; // Kelvin (average surface temperature)
    earth.gravity = 9.81; // m/s²
    earth.rotation_period = 1.0; // days
    earth.atmosphere = 'N2/O2';
    earth.density_kg_m3 = 5514; // kg/m³
    earth.escape_velocity = 11.19; // km/s
    earth.surface_pressure = 101325; // Pa (1 bar)
    earth.magnetic_field = 25; // μT (microtesla)
    earth.albedo = 0.306; // Bond albedo
    planets.push(earth);

    // Create Moon orbiting Earth
    const moonDistance = 35; // Distance from Earth (scaled for better visibility)
    const moonMass = 0.0123 * EARTH_MASS_UNIT;
    // The relative circular speed uses both masses. Using the Earth's alone
    // understates it by the Moon's 1.2% share, which starts the orbit at an
    // eccentricity of 0.012 rather than zero.
    const relativeSpeed = Math.sqrt(
      (SETTINGS.gravitational_constant * (earth.mass + moonMass)) / moonDistance
    );
    const moonTheta = Math.random() * 2 * Math.PI;
    const totalMass = earth.mass + moonMass;
    // Barycentric, and this matters more here than anywhere else in the app:
    // the Earth-Moon barycenter is the standard example of a barycenter inside
    // the larger body, and the reference-frame panel exists to show it. Given
    // the Moon all of the momentum, the pair would circle its barycenter and
    // drift off the screen at the same time. Split between them, the barycenter
    // stays put and the Earth visibly wobbles about it.
    const moonPos = {
      x: ((moonDistance * earth.mass) / totalMass) * Math.cos(moonTheta),
      y: ((moonDistance * earth.mass) / totalMass) * Math.sin(moonTheta),
    };
    const moonSpeed = (relativeSpeed * earth.mass) / totalMass;
    const moonVel = {
      x: -moonSpeed * Math.sin(moonTheta),
      y: moonSpeed * Math.cos(moonTheta),
    };
    // Earth takes the balancing share, so the total momentum is zero.
    earth.pos.x =
      ((-moonDistance * moonMass) / totalMass) * Math.cos(moonTheta);
    earth.pos.y =
      ((-moonDistance * moonMass) / totalMass) * Math.sin(moonTheta);
    const earthSpeed = (relativeSpeed * moonMass) / totalMass;
    earth.vel.x = earthSpeed * Math.sin(moonTheta);
    earth.vel.y = -earthSpeed * Math.cos(moonTheta);

    const moon = new Planet(moonPos, moonVel, 0.0123); // Moon is 0.0123 Earth masses
    moon.name = 'Luna';
    moon.mass = 0.0123 * EARTH_MASS_UNIT; // Moon mass
    moon.diameter = 3474; // km
    moon.orbital_period = 27.3; // days (Moon's orbital period around Earth)
    moon.baseColor = '#8B8B8B'; // More accurate Moon gray color
    moon.radius = 3; // Moon is smaller than Earth but visible
    moon.density = 'rocky';
    moon.isMoon = true; // Flag for custom Moon rendering
    // Accurate Moon properties
    moon.temperature = 250; // Kelvin (average surface temperature)
    moon.gravity = 1.62; // m/s²
    moon.rotation_period = 27.3; // days (tidally locked)
    moon.atmosphere = 'none';
    moon.density_kg_m3 = 3344; // kg/m³
    moon.escape_velocity = 2.38; // km/s
    moon.surface_pressure = 0; // Pa (no atmosphere)
    moon.magnetic_field = 0; // μT (no significant magnetic field)
    moon.albedo = 0.136; // Bond albedo
    planets.push(moon);

    // Set up zoom and pan to focus on the Earth-Moon system
    // This will be handled by the camera system to show both objects clearly
    SETTINGS.sim_size = 'Small'; // Use small simulation size for better zoom
  }
  // --- Fix for Binary BH scenario: two black holes in mutual orbit, planets orbiting center of mass ---
  else if (starting_preset === 'Binary BH') {
    if (bh_list.length >= 2) {
      const separation = 120;
      const m1 = bh_list[0].mass;
      const m2 = bh_list[1].mass;
      const totalMass = m1 + m2;
      // Center of mass positions
      const r1 = separation * (m2 / totalMass);
      const r2 = separation * (m1 / totalMass);
      bh_list[0].pos.x = -r1;
      bh_list[0].pos.y = 0;
      bh_list[1].pos.x = r2;
      bh_list[1].pos.y = 0;
      // Orbital velocities
      const G = SETTINGS.gravitational_constant;
      const orbitalSpeed = Math.sqrt((G * totalMass) / separation);
      bh_list[0].vel.x = 0;
      bh_list[0].vel.y = orbitalSpeed * (m2 / totalMass);
      bh_list[1].vel.x = 0;
      bh_list[1].vel.y = -orbitalSpeed * (m1 / totalMass);
      // Add slight perturbation to start inspiral
      const perturbation = 0.95;
      bh_list[0].vel.y *= perturbation;
      bh_list[1].vel.y *= perturbation;
      // Place planets in orbits around the binary's center of mass
      for (let i = 0; i < planets.length; i++) {
        const r = 180 + i * 30;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((G * totalMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        planets[i].pos = pos;
        planets[i].vel = vel;
      }
      // Place gas giants
      for (let i = 0; i < gas_giants.length; i++) {
        const r = 350 + i * 50;
        const theta = Math.random() * 2 * Math.PI;
        const v = Math.sqrt((G * totalMass) / r);
        const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        gas_giants[i].pos = pos;
        gas_giants[i].vel = vel;
      }
      // Place asteroids
      if (SETTINGS.enable_asteroids) {
        for (let i = 0; i < asteroids.length; i++) {
          const r = 500 + Math.random() * 100;
          const theta = Math.random() * 2 * Math.PI;
          const v = Math.sqrt((G * totalMass) / r);
          const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
          const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
          asteroids[i].pos = pos;
          asteroids[i].vel = vel;
        }
      }
    }
  } else if (starting_preset === 'TRAPPIST-1 System') {
    // Clear planets array
    planets.length = 0;
    // Every number here comes from js/data/trappist1.js, which the habitable
    // zone instruments read too, so the scenario and the lesson cannot end up
    // describing two different systems.
    if (stars.length > 0) {
      const star = stars[0];
      star.name = TRAPPIST1_STAR.name;
      star.mass = TRAPPIST1_STAR.massInSuns * SOLAR_MASS_UNIT;
      star.baseColor = TRAPPIST1_STAR.baseColor;
      // TRAPPIST-1 is barely larger than Jupiter. At 100 units per AU its true
      // radius is 0.054 units; 0.4 keeps it comfortably inside the innermost
      // orbit at 1.15 units, where the old value of 7 swallowed three planets.
      star.radius = 0.4;
      // The true radius and luminosity, so the light curve reports the real
      // transit depths even though the star is drawn seven times oversized to
      // keep the planets clickable.
      star.radiusInSuns = TRAPPIST1_STAR.radiusInSuns;
      star.luminosityInSuns = TRAPPIST1_STAR.luminosityInSuns;
      star.massInSuns = TRAPPIST1_STAR.massInSuns;
      star.temperature = TRAPPIST1_STAR.temperatureK;
      star.spectralType = TRAPPIST1_STAR.spectralType;
      // The one scenario in the app where the habitable zone lands in the
      // middle of the planets rather than off past the edge of the view, so
      // the ring is on by default here.
      star.showHabitableZone = true;
    }

    // 100 units per AU, the scale units.js fixes and every other scenario now
    // uses. The old 400 put the displayed semi-major axes at four times the
    // real values, so the periods came out eight times too long.
    const AU = SIM_UNITS_PER_AU;
    const starMass = TRAPPIST1_STAR.massInSuns * SOLAR_MASS_UNIT;
    if (stars.length > 0) stars[0].mass = starMass;

    // Adjacent orbits here are as little as 0.0043 AU apart, which is 0.43
    // units. Bodies have to be small enough that neighbors cannot touch: the
    // largest sum of radii below is 0.26, leaving a clear margin on the
    // tightest pair. The screen-space draw floor keeps them visible anyway.
    const RADIUS_UNITS_PER_EARTH = 0.115;

    for (let i = 0; i < TRAPPIST1_PLANETS.length; i++) {
      const p = TRAPPIST1_PLANETS[i];
      const r = p.a * AU;
      // Evenly spaced in phase so no two start near each other.
      const theta = (i / TRAPPIST1_PLANETS.length) * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * starMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      const planet = new Planet(pos, vel, p.mass);
      planet.name = `TRAPPIST-1${p.name}`;
      // Gravitationally negligible against an 0.0898 solar-mass star, so the
      // two-body period of each planet is set by the star alone and every
      // planet returns the same a^3/P^2.
      planet.mass = Math.max(p.mass * EARTH_MASS_UNIT, 1e-7);
      planet.massInEarths = p.mass;
      planet.baseColor = '#6ec6ff';
      planet.radius = p.radius * RADIUS_UNITS_PER_EARTH;
      // Drawn oversized, measured true: the transit depth comes from this.
      planet.radiusInEarths = p.radius;
      planet.isTrappist = true;
      planets.push(planet);
    }
  }

  // --- Binary Pair: two equal stars round their common center ---
  if (starting_preset === 'Binary Pair') {
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const AU = 100;
    const SEP = 4 * AU;
    const M = 2 * SOLAR_MASS_UNIT;
    const total = 2 * M;
    // Barycentric, so the pair genuinely circles a fixed point rather than
    // drifting across the view: the fixed point is the thing being taught.
    const vRel = Math.sqrt((G * total) / SEP);
    const v1 = vRel * (M / total);

    for (const [i, star] of [stars[0], stars[1]].entries()) {
      if (!star) continue;
      const side = i === 0 ? -1 : 1;
      star.name = i === 0 ? 'Star A' : 'Star B';
      star.pos = { x: (side * SEP) / 2, y: 0 };
      star.vel = { x: 0, y: side * v1 };
      star.mass = M;
      star.massInSuns = 2;
      star.radiusInSuns = 1.6;
      star.luminosityInSuns = 10;
      star.radius = 9;
      star.temperature = 8000;
      star.spectralType = 'A5V';
      star.baseColor = i === 0 ? '#ffd97d' : '#8fd4ff';
      star.persistent = true;
    }
  }

  // --- Black Hole Lab: one hole, four things happily orbiting it ---
  if (starting_preset === 'Black Hole Lab') {
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    stars.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const bh = bh_list[0];
    if (bh) {
      bh.pos = { x: 0, y: 0 };
      bh.vel = { x: 0, y: 0 };
      bh.name = 'Black Hole';
      bh.persistent = true;
      // Radii are set from the hole's own drawn size, so the four orbits stay
      // outside it and stay on screen whatever mass a lesson step asks for.
      const spacing = [4.2, 6.4, 9.2, 12.6];
      const orbiters = [
        { name: 'Inner Orbiter', earths: 1 },
        { name: 'Second Orbiter', earths: 3 },
        { name: 'Third Orbiter', earths: 0.5 },
        { name: 'Outer Orbiter', earths: 8 },
      ];
      for (const [i, planet] of planets.entries()) {
        if (i >= spacing.length) {
          planet.alive = false;
          continue;
        }
        const r = bh.radius * spacing[i];
        const theta = (i * Math.PI) / 2 + 0.3;
        const v = Math.sqrt((G * bh.mass) / r);
        planet.name = orbiters[i].name;
        // Explicit planet-sized masses. The default generator makes these a
        // sizeable fraction of a solar mass, and a label reading "0.3 M☉"
        // beside a planet is a distraction in a lesson about what masses mean.
        planet.mass = orbiters[i].earths * EARTH_MASS_UNIT;
        planet.massInEarths = orbiters[i].earths;
        planet.pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
        planet.vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
        planet.persistent = true;
      }
      planets.length = Math.min(planets.length, spacing.length);
    }
  }

  // --- Habitable Zone Lab: the inner Solar System, with the zone drawn ---
  if (starting_preset === 'Habitable Zone Lab') {
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    bh_list.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const AU = SIM_UNITS_PER_AU;
    const sun = stars[0];
    if (sun) {
      sun.name = 'Sun';
      sun.pos = { x: 0, y: 0 };
      sun.vel = { x: 0, y: 0 };
      sun.mass = SOLAR_MASS_UNIT;
      sun.massInSuns = 1;
      sun.luminosityInSuns = 1;
      sun.radiusInSuns = 1;
      sun.temperature = 5772;
      sun.spectralType = 'G2V';
      sun.radius = 6;
      sun.baseColor = '#ffd27f';
      // On by default: the ring is the instrument this scenario exists for.
      sun.showHabitableZone = true;
      sun.persistent = true;
    }

    // Real semi-major axes. Mercury is left out: it is so far inside the zone
    // that including it compresses everything else against the star.
    const worlds = [
      { name: 'Venus', a: 0.723, color: '#e8c39e', radius: 4.6 },
      { name: 'Earth', a: 1.0, color: '#6ec6ff', radius: 4.8 },
      { name: 'Mars', a: 1.524, color: '#d9744a', radius: 3.6 },
      { name: 'Ceres', a: 2.77, color: '#9aa3b5', radius: 2.4 },
    ];
    for (const [i, planet] of planets.entries()) {
      if (i >= worlds.length) {
        planet.alive = false;
        continue;
      }
      const w = worlds[i];
      const r = w.a * AU;
      // Spread in phase so no two start on top of each other.
      const theta = (i / worlds.length) * 2 * Math.PI + 0.4;
      const v = Math.sqrt((G * SOLAR_MASS_UNIT) / r);
      planet.name = w.name;
      planet.pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      planet.vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      // Small enough not to perturb anything, drawn large enough to click.
      planet.mass = EARTH_MASS_UNIT;
      planet.massInEarths = 1;
      planet.radius = w.radius;
      planet.baseColor = w.color;
      planet.persistent = true;
    }
    planets.length = Math.min(planets.length, worlds.length);
  }

  // --- Interstellar Visitor: 1I/'Oumuamua on its measured hyperbolic orbit ---
  if (starting_preset === 'Interstellar Visitor') {
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const AU = 100;
    const sun = stars[0] || new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    if (!stars.length) stars.push(sun);
    stars.length = 1;
    sun.name = 'Sun';
    sun.pos = { x: 0, y: 0 };
    sun.vel = { x: 0, y: 0 };
    sun.mass = SOLAR_MASS_UNIT;
    sun.massInSuns = 1;
    sun.radiusInSuns = 1;
    sun.luminosityInSuns = 1;
    // Drawn far larger than life: at this zoom the true radius is a third of a
    // pixel, and the scenario is about the shape of a path, not about the Sun.
    sun.radius = 9;
    sun.temperature = 5772;
    sun.spectralType = 'G2V';
    sun.baseColor = '#ffd34d';
    sun.persistent = true;

    // Earth, for scale: one AU, one year.
    const earth = new Planet(
      { x: 0, y: AU },
      { x: -Math.sqrt((G * sun.mass) / AU), y: 0 },
      1.0
    );
    earth.name = 'Earth';
    earth.mass = EARTH_MASS_UNIT;
    earth.massInEarths = 1;
    earth.radiusInEarths = 1;
    earth.radius = 3;
    earth.baseColor = '#4b90e2';
    earth.persistent = true;
    planets.push(earth);

    // 1I/'Oumuamua. Perihelion 0.2559 AU, eccentricity 1.2011: the first
    // object ever seen on an orbit that is not merely eccentric but open. The
    // state below is that orbit evaluated at four AU on the way in, so the
    // simulation reproduces the real 87.7 km/s perihelion speed.
    const visitor = new Planet(
      { x: -286.14, y: -279.48 },
      { x: 2.9436, y: 2.0454 },
      1.0
    );
    visitor.name = "1I/'Oumuamua";
    // Small enough to leave the Sun and Earth entirely undisturbed, which is
    // true of the real thing as well.
    visitor.mass = 1e-9;
    visitor.massInEarths = visitor.mass / EARTH_MASS_UNIT;
    visitor.radius = 2.2;
    visitor.baseColor = '#d96a4a';
    visitor.persistent = true;
    planets.push(visitor);
  }

  // --- Exoplanet Characterization Lab: the same star, now allowed to move ---
  // --- The dark-matter scenarios ------------------------------------------
  //
  // Two discs and a cluster, built by hand because every body's speed has to be
  // exactly right for the point being made.
  //
  // Spiral Galaxy is the prediction: each star is launched at the circular
  // speed the visible mass alone implies, sqrt(G M(<r) / r), so the rotation
  // curve falls as r^-1/2 the way the Solar System's does.
  //
  // Milky Way Rotation is the observation: each star is launched at the same
  // speed regardless of radius, which is what telescopes actually see. Those
  // speeds are far too high for the visible mass to hold, so this scenario
  // starts with the halo switched on. Switch it off and the disc flies apart,
  // which is the whole argument in one gesture.
  if (
    starting_preset === 'Spiral Galaxy' ||
    starting_preset === 'Milky Way Rotation'
  ) {
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    galaxies.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const flat = starting_preset === 'Milky Way Rotation';

    // A compact central bulge carrying most of the visible mass. This is what
    // makes the Keplerian prediction a prediction: outside it, the enclosed
    // visible mass barely grows, so the expected speed has to fall.
    const BULGE = 12 * SOLAR_MASS_UNIT;
    const bulge = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 12);
    bulge.name = 'Galactic bulge';
    bulge.isCentralBody = true;
    bulge.persistent = true;
    bulge.baseColor = '#ffe9b8';
    stars.push(bulge);

    // The disc. Radii are spaced evenly in log so the tracers are spread
    // evenly across the plot's log axis rather than bunched at the outside.
    const N = 90;
    const R_IN = 150;
    const R_OUT = 900;
    const STAR_MASS = 0.03; // solar masses each; 2.7 M_sun of disc in total
    const V_FLAT = 11.0;

    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = R_IN * Math.pow(R_OUT / R_IN, t);
      const theta = Math.random() * 2 * Math.PI;

      // Enclosed visible mass at this radius: the bulge plus whatever share of
      // the disc lies inside. Computed rather than assumed, so the launch speed
      // is the honest circular speed for the mass actually present.
      const inner = BULGE + N * t * STAR_MASS * SOLAR_MASS_UNIT;
      const vKepler = Math.sqrt((G * inner) / r);
      const v = flat ? V_FLAT : vKepler;

      const star = new StarObject(
        { x: r * Math.cos(theta), y: r * Math.sin(theta) },
        { x: -v * Math.sin(theta), y: v * Math.cos(theta) },
        STAR_MASS
      );
      star.name = `Disc star ${i + 1}`;
      star.persistent = true;
      // Uniform color: these are tracers, and a disc that shaded from red to
      // blue with radius would suggest the color meant something.
      star.baseColor = '#cfe0ff';
      stars.push(star);
    }
  }

  // --- Coma Cluster: Zwicky's measurement ---------------------------------
  //
  // A cluster of galaxies in virial equilibrium, built so that the member
  // speeds are what a bound cluster of this total mass would produce. The
  // lesson measures the dispersion, applies the virial theorem, and compares
  // the answer with the mass of the galaxies themselves.
  //
  // The excess is put in by hand, as a halo, because that is what the
  // measurement finds: the members move as though there were far more mass
  // than the members account for.
  if (starting_preset === 'Coma Cluster') {
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    galaxies.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const N = 24;
    const R = 2600;
    const MEMBER = 4 * SOLAR_MASS_UNIT;

    // The speed scale is set from the total mass the cluster actually has,
    // members plus halo, so the cluster is bound and stays a cluster for as
    // long as anyone watches it. A cluster that dispersed while being measured
    // would not be in equilibrium, and the virial theorem would not apply.
    const haloMass = haloEnclosedMass(
      R,
      { vFlat: SETTINGS.halo_v_flat, coreRadius: SETTINGS.halo_core_radius },
      G
    );
    const totalMass = N * MEMBER + haloMass;
    const vScale = Math.sqrt((G * totalMass) / R);

    for (let i = 0; i < N; i++) {
      // Positions drawn from a centrally concentrated distribution rather than
      // uniformly in the disc: real clusters are densest in the middle, and a
      // uniform ring would put every member at the same radius and give the
      // virial radius nothing to be measured from.
      const r = R * Math.pow(Math.random(), 0.55);
      const theta = Math.random() * 2 * Math.PI;

      // Random directions, not circular orbits. A cluster is a swarm on
      // randomly oriented orbits, and its members' speeds are a dispersion
      // rather than a rotation. Drawing them isotropically is what makes the
      // dispersion the thing the virial theorem wants.
      const speed = vScale * (0.55 + Math.random() * 0.5);
      const phi = Math.random() * 2 * Math.PI;

      const g = new Galaxy(
        { x: r * Math.cos(theta), y: r * Math.sin(theta) },
        { x: speed * Math.cos(phi), y: speed * Math.sin(phi) },
        MEMBER,
        i < 6 ? 'elliptical' : 'spiral'
      );
      galaxies.push(g);
    }

    // The cluster as a whole should not be sailing off the screen: any net
    // drift would add itself to every member's speed and inflate the
    // dispersion, which is the one number the lesson turns on.
    zeroNetMomentum();
  }

  if (starting_preset === 'Exoplanet Characterization Lab') {
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    const sys = HD209458;
    const AU = SIM_UNITS_PER_AU;
    const R_SUN = 0.00465047 * AU;
    const R_JUP_IN_SUNS = 0.102763;
    const G = SETTINGS.gravitational_constant;

    const starMass = sys.star.massSolar * SOLAR_MASS_UNIT;
    // Jupiter masses into the simulation's units, through the solar mass so
    // there is no second conversion constant to keep in step.
    const JUP_IN_SUNS = 1 / JUPITER_MASSES_PER_SOLAR_MASS;
    const planetMass = sys.planet.massJupiter * JUP_IN_SUNS * SOLAR_MASS_UNIT;
    const total = starMass + planetMass;
    const a = sys.planet.semiMajorAU * AU;

    // Barycentric split. Each body sits on the far side of the center of mass
    // from the other, at a distance set by the other's share of the mass, and
    // moves at the speed that keeps the pair circling that fixed point. The
    // star's share is 1/1700 of the planet's, which is exactly why the wobble
    // is invisible at true scale and has to be magnified to be taught.
    const vRel = Math.sqrt((G * total) / a);
    const rStar = (a * planetMass) / total;
    const rPlanet = (a * starMass) / total;
    const vStar = (vRel * planetMass) / total;
    const vPlanet = (vRel * starMass) / total;

    const star = new StarObject(
      { x: -rStar, y: 0 },
      { x: 0, y: -vStar },
      sys.star.massSolar
    );
    star.name = sys.name;
    star.radiusInSuns = sys.star.radiusSolar;
    star.radius = sys.star.radiusSolar * R_SUN;
    star.luminosityInSuns = sys.star.luminositySolar;
    star.temperature = sys.star.temperatureK;
    star.spectralType = sys.star.spectralType;
    star.baseColor = '#fff3df';
    star.persistent = true;
    star.distancePc = sys.star.distancePc;
    stars.push(star);

    const planet = new GasGiant({ x: rPlanet, y: 0 }, { x: 0, y: vPlanet });
    planet.name = sys.planetName;
    planet.mass = planetMass;
    planet.massInJupiters = sys.planet.massJupiter;
    planet.radiusInSuns = sys.planet.radiusJupiter * R_JUP_IN_SUNS;
    planet.radius = planet.radiusInSuns * R_SUN;
    planet.baseColor = '#c9a882';
    planet.persistent = true;
    gas_giants.push(planet);

    // The pair was built in the center-of-mass frame, so this should be a
    // no-op; running it anyway means the scenario cannot start drifting if a
    // parameter above is ever edited by hand.
    zeroNetMomentum();
  }

  // --- Transit Lab / Blended Binary: HD 209458 at true relative scale ---
  if (
    starting_preset === 'Transit Lab' ||
    starting_preset === 'Blended Binary'
  ) {
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const AU = 100; // units per AU, the scale units.js fixes
    const R_SUN = 0.00465047 * AU; // one solar radius, in simulation units
    const R_JUP_IN_SUNS = 0.102763; // 71,492 km / 695,700 km

    // HD 209458 (Peter Sallis / "Osiris"), from the transit and radial-velocity
    // literature. The radii are set explicitly rather than inferred from mass,
    // so the light curve, the drawn silhouette and the arithmetic in the lesson
    // all use the same numbers.
    const M_STAR_SUNS = 1.148;
    const R_STAR_SUNS = 1.155;
    const L_STAR_SUNS = 1.77;
    // The published mass and semi-major axis together return the published
    // 3.5247-day period to within a minute, so nothing here has to be quietly
    // adjusted to make Kepler's third law come out.
    const A_PLANET_AU = 0.04747;
    const R_PLANET_JUP = 1.38;
    const M_PLANET_JUP = 0.69;

    const starMass = M_STAR_SUNS * SOLAR_MASS_UNIT;
    const aPlanet = A_PLANET_AU * AU;

    // Companion, only for the blended case. Half a magnitude fainter: a
    // contrast Robo-AO and SOAR both detect routinely, and one that changes the
    // measured planet radius by a quarter.
    const blended = starting_preset === 'Blended Binary';
    const DELTA_MAG = 0.5;
    const COMPANION_SEP_AU = 300;
    const M_COMP_SUNS = 1.0;
    const R_COMP_SUNS = 0.95;

    const compMass = M_COMP_SUNS * SOLAR_MASS_UNIT;
    const sep = COMPANION_SEP_AU * AU;
    const totalMass = starMass + (blended ? compMass : 0);
    // Worked in the primary's rest frame rather than the barycenter's. The
    // relative orbit is the same either way, which is the part that is physics;
    // what changes is that the primary stays where the camera is pointed
    // instead of tracing out its own 300 AU circle and leaving the view. The
    // pull the primary does feel from 300 AU moves it 0.015 units in an hour.
    const vRel = blended ? Math.sqrt((G * totalMass) / sep) : 0;

    const primary =
      stars[0] || new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    if (!stars.length) stars.push(primary);
    stars.length = blended ? Math.min(stars.length, 2) : 1;
    primary.name = 'HD 209458';
    primary.pos = { x: 0, y: 0 };
    primary.vel = { x: 0, y: 0 };
    primary.mass = starMass;
    primary.massInSuns = M_STAR_SUNS;
    primary.radiusInSuns = R_STAR_SUNS;
    primary.luminosityInSuns = L_STAR_SUNS;
    primary.radius = R_STAR_SUNS * R_SUN;
    primary.persistent = true;
    primary.temperature = 6065;
    primary.spectralType = 'G0V';
    primary.baseColor = '#fff3df';

    if (blended) {
      const companion =
        stars[1] || new StarObject({ x: sep, y: 0 }, { x: 0, y: 0 }, 1);
      if (stars.length < 2) stars.push(companion);
      companion.name = 'HD 209458 B (companion)';
      companion.pos = { x: sep, y: 0 };
      companion.vel = { x: 0, y: -vRel };
      companion.mass = compMass;
      companion.massInSuns = M_COMP_SUNS;
      companion.radiusInSuns = R_COMP_SUNS;
      // Fixed rather than derived, so the contrast is exactly half a magnitude
      // and the dilution a student measures is exactly the textbook factor.
      companion.luminosityInSuns = L_STAR_SUNS * Math.pow(10, -0.4 * DELTA_MAG);
      companion.radius = R_COMP_SUNS * R_SUN;
      // Three hundred AU is far outside the cull box at the zoom this scenario
      // needs, and being invisible is the entire point of it.
      companion.persistent = true;
      companion.temperature = 5700;
      companion.spectralType = 'G5V';
      companion.baseColor = '#ffe9c4';
    }

    // Start a quarter of an orbit before the first transit, so the light curve
    // has a flat baseline to establish before anything happens to it.
    const theta = -Math.PI / 2;
    const vOrbit = Math.sqrt((G * starMass) / aPlanet);
    const planet = new Planet(
      {
        x: aPlanet * Math.cos(theta),
        y: aPlanet * Math.sin(theta),
      },
      {
        x: -vOrbit * Math.sin(theta),
        y: vOrbit * Math.cos(theta),
      },
      1.0
    );
    planet.name = 'HD 209458 b';
    planet.mass =
      (M_PLANET_JUP / JUPITER_MASSES_PER_SOLAR_MASS) * SOLAR_MASS_UNIT;
    planet.massInJupiters = M_PLANET_JUP;
    // It is a Planet object carrying a gas giant's mass, so the Earth-mass
    // field it inherited from the constructor is about a different body.
    planet.massInEarths = M_PLANET_JUP * EARTH_MASSES_PER_JUPITER_MASS;
    planet.radiusInJupiters = R_PLANET_JUP;
    planet.radius = R_PLANET_JUP * R_JUP_IN_SUNS * R_SUN;
    planet.persistent = true;
    planet.baseColor = '#b8875a';
    planets.push(planet);
  }

  // --- Retrograde Mars: the Sun, Earth and Mars, and nothing else -----------
  if (starting_preset === 'Retrograde Mars') {
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;
    const AU = SIM_UNITS_PER_AU;

    const sun = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    sun.name = 'Sun';
    sun.mass = SOLAR_MASS_UNIT;
    sun.massInSuns = 1.0;
    sun.baseColor = '#FFD86B';
    sun.radius = 10;
    stars.push(sun);

    // Circular orbits at the true semi-major axes. Earth's real eccentricity is
    // 0.017 and Mars's 0.093, and neither changes the shape of the loop: what
    // draws it is the difference in angular speed, not the shape of either
    // orbit. Circles keep the measurement clean.
    const worlds = [
      { name: 'Earth', aAU: 1.0, earths: 1.0, r: 4, color: '#5B8FF0' },
      { name: 'Mars', aAU: 1.523, earths: 0.107, r: 3, color: '#D06B4A' },
    ];

    // Mars starts 95 degrees ahead of Earth. Earth gains on it at 0.46 degrees
    // a day, so opposition arrives after about 205 days, and that number is
    // chosen against how long the trail takes to fill rather than against
    // anything astronomical: 300 samples cover roughly 150 days here, so an
    // earlier opposition would happen while the trail was still growing and the
    // loop would be half drawn when it passed. Any later and a student waits.
    // The next opposition is a synodic period after this one.
    const startAngle = { Earth: 103, Mars: 198 };

    for (const w of worlds) {
      const r = w.aAU * AU;
      const theta = (startAngle[w.name] * Math.PI) / 180;
      const v = Math.sqrt((G * sun.mass) / r);
      const planet = new Planet(
        { x: r * Math.cos(theta), y: r * Math.sin(theta) },
        { x: -v * Math.sin(theta), y: v * Math.cos(theta) },
        w.earths
      );
      planet.name = w.name;
      planet.radius = w.r;
      planet.baseColor = w.color;
      planet.persistent = true;
      planets.push(planet);
    }
  }

  // --- Kepler's 2nd Law scenario: star + nearly-circular planet + eccentric planet ---
  if (starting_preset === "Kepler's 2nd Law") {
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    const G = SETTINGS.gravitational_constant;

    // Central star - Sun-like, pinned at origin
    const kStar = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.0);
    kStar.name = 'Kepler Star';
    kStar.mass = SOLAR_MASS_UNIT;
    kStar.massInSuns = 1.0;
    kStar.baseColor = '#FFFF00';
    kStar.radius = 14;
    stars.push(kStar);

    // Planet - nearly circular orbit (e ≈ 0.02)
    // Well outside the eccentric body's apoapsis of about 236. These two orbits
    // used to cross: the eccentric orbiter swept from 50 out to 236 while this
    // one sat at 180, so once an orbit they collided. Merging is off for this
    // scenario, so instead of combining they bounced, and each bounce kicked
    // both orbits by several percent in energy and angular momentum. That is
    // what made a scenario built to show a fixed ellipse visibly drift.
    const planetDist = 320;
    const eP = 0.02;
    const aP = planetDist / (1 - eP);
    const vPlanet = Math.sqrt((((G * kStar.mass) / aP) * (1 + eP)) / (1 - eP));
    const kPlanet = new Planet(
      { x: planetDist, y: 0 },
      { x: 0, y: vPlanet },
      1.0
    );
    kPlanet.name = 'Circular Orbiter';
    kPlanet.mass = 1.0 * EARTH_MASS_UNIT;
    kPlanet.baseColor = '#4B90E2';
    kPlanet.radius = 7;
    planets.push(kPlanet);

    // Eccentric body - a Planet (not Comet) for visibility, bright orange,
    // on a tighter eccentric orbit (e ≈ 0.65) that fits within the view
    const eccPeri = 50;
    const eC = 0.65;
    const aC = eccPeri / (1 - eC);
    const vEcc = Math.sqrt((((G * kStar.mass) / aC) * (1 + eC)) / (1 - eC));
    const eccAngle = Math.PI * 0.6;
    const eccPlanet = new Planet(
      { x: eccPeri * Math.cos(eccAngle), y: eccPeri * Math.sin(eccAngle) },
      { x: -vEcc * Math.sin(eccAngle), y: vEcc * Math.cos(eccAngle) },
      0.3
    );
    eccPlanet.name = 'Eccentric Orbiter';
    eccPlanet.mass = 0.3 * EARTH_MASS_UNIT;
    eccPlanet.baseColor = '#FF6B35';
    eccPlanet.radius = 6;
    planets.push(eccPlanet);

    // Auto-enable area sweep for the eccentric orbiter on startup
    setTimeout(() => {
      try {
        const data = computeAreaSweep(eccPlanet);
        if (data && !areaSweepSuppressed) {
          state.areaSweepOverlay.active = true;
          state.areaSweepOverlay.parentId = data.parentId;
          state.areaSweepOverlay.parent = data.parent;
          state.areaSweepOverlay.objectId = data.objectId;
          state.areaSweepOverlay.wedges = data.wedges;
          state.areaSweepOverlay.orbitPoints = data.orbitPoints;
        }
      } catch {
        /* non-fatal */
      }
    }, 200);
  }

  // Geometry that can only be set once the objects exist - e.g. the Pinwheel
  // flyby, which previously ran against the *previous* scenario's black holes
  // and was wiped a few lines later.
  applyPresetLayout(SETTINGS, bh_list);

  // Placement balances the system, and then eight scenarios reposition their
  // own objects afterwards and unbalance it again: Kuiper Belt reassigns every
  // belt object onto a prograde circular orbit, so whether the whole belt
  // coasted came down to which angles the seeded generator happened to draw.
  // Rebalancing here, under the same guard placement uses, catches all of
  // them. Scenarios built entirely by hand keep the 'Empty' placement and are
  // left alone - some of them, like Interstellar Visitor, are about something
  // arriving from outside and are supposed to be moving.
  if (SETTINGS.placement !== 'Empty') {
    zeroNetMomentum();
  }

  generateStarfield();
};

// Settings functions
/**
 * The label an option menu shows for one of its values.
 *
 * The scenario preset list is the exception: its values are scenario keys, and
 * those already have titles in the catalogue under their own ids, so it defers
 * to those rather than carrying a second copy. Everything else looks up
 * `settings.option.<key>.<value>` and falls back to the raw value, which is
 * always English and always readable.
 *
 * @param {string} key - The setting's key
 * @param {string} value - The stored option value
 * @returns {string} A label for a reader
 */
// The settings panel and the inspector both render text into the DOM rather
// than carrying data-i18n attributes, so the sweep in js/i18n/dom.js cannot
// reach them. They are rebuilt instead, from the same functions that built them
// in the first place: a language change is a repaint, never a rebuild of the
// world.
onLocaleChange(() => {
  try {
    if (
      !document.getElementById('settingsPanel')?.classList.contains('hidden')
    ) {
      buildSettingsMenu();
    }
  } catch {
    /* the panel is optional chrome */
  }
  try {
    if (state.inspector_open && state.selectedObject) {
      showObjectInspector(
        state.selectedObject.object,
        state.selectedObject.type
      );
    }
  } catch {
    /* likewise */
  }
  // The scenario card is written once, when the world is built. On a Spanish
  // first load that happens before the Spanish catalogue has arrived - it is a
  // dynamic import - so the card is drawn in English and then never touched
  // again. Rewriting it here is what makes the very first card a reader sees
  // be in their own language.
  try {
    const card = document.getElementById('scenarioInfoBox');
    const title = document.getElementById('scenarioInfoTitle');
    const summary = document.getElementById('scenarioInfoSummary');
    const key = card?.dataset.scenarioKey;
    if (card && title && summary && key && SCENARIO_INFO[key]) {
      title.textContent = scenarioTitle(key);
      summary.textContent = scenarioSummary(key);
    }
  } catch {
    /* the card is optional chrome */
  }
});

const settingOptionLabel = (key, value) => {
  if (key === 'preset_scenario') {
    return value === 'None'
      ? t('settings.option.presetScenario.none')
      : scenarioTitle(value);
  }
  const camel = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const id = `settings.option.${camel}.${slug}`;
  return hasMessage(id) || EN[id] ? t(id) : value;
};

const setting_items = [
  {
    labelId: 'settings.label.presetScenario',
    key: 'preset_scenario',
    type: 'option',
    // Derived, never listed: this used to be a hand-written copy of all
    // forty-three scenario names, which is a second catalog that silently
    // drifts the first time someone adds a scenario and forgets this list.
    options: ['None', ...Object.keys(SCENARIO_INFO)],
  },
  { labelId: 'settings.section.simulation', type: 'separator' },
  {
    labelId: 'settings.label.gravitationalConstant',
    key: 'gravitational_constant',
    type: 'float',
    min: 0.1,
    max: 20.0,
    step: 0.1,
  },
  {
    labelId: 'settings.label.mutualGravity',
    key: 'mutual_gravity',
    type: 'bool',
  },
  {
    labelId: 'settings.label.simSpeed',
    key: 'sim_speed',
    type: 'float',
    min: 0.0,
    max: 5.0,
    step: 0.1,
  },
  {
    labelId: 'settings.label.simSize',
    key: 'sim_size',
    type: 'option',
    options: ['Small', 'Medium', 'Large', 'Huge'],
  },
  {
    labelId: 'settings.label.placement',
    key: 'placement',
    type: 'option',
    options: ['Circular', 'Multi-Ring', 'Random', 'Grid', 'Empty'],
  },
  {
    labelId: 'settings.label.integrator',
    key: 'integrator',
    type: 'option',
    options: INTEGRATORS,
  },
  {
    labelId: 'settings.label.showConservationDiagnostics',
    key: 'show_conservation_diagnostics',
    type: 'bool',
  },
  { labelId: 'settings.section.performance', type: 'separator' },
  {
    labelId: 'settings.label.useBarnesHut',
    key: 'use_barnes_hut',
    type: 'bool',
  },
  {
    labelId: 'settings.label.barnesHutTheta',
    key: 'barnes_hut_theta',
    type: 'float',
    min: 0.2,
    max: 1.2,
    step: 0.05,
  },
  {
    labelId: 'settings.label.adaptiveDetail',
    key: 'adaptive_detail',
    type: 'bool',
  },
  { labelId: 'settings.section.visuals', type: 'separator' },
  {
    labelId: 'settings.label.trailColourMode',
    key: 'trail_colour_mode',
    type: 'option',
    options: ['type', 'speed'],
  },
  {
    labelId: 'settings.label.showObjectLensing',
    key: 'show_object_lensing',
    type: 'bool',
  },
  {
    labelId: 'settings.label.lensingQuality',
    key: 'lensing_quality',
    type: 'option',
    options: ['off', 'low', 'medium', 'high'],
  },
  {
    labelId: 'settings.label.diskDoppler',
    key: 'disk_doppler',
    type: 'bool',
  },
  { labelId: 'settings.section.black-holes', type: 'separator' },
  {
    labelId: 'settings.label.numBlackHoles',
    key: 'num_black_holes',
    type: 'int',
    min: 0,
    max: 10,
    step: 1,
  },
  {
    labelId: 'settings.label.bhMass',
    key: 'bh_mass',
    type: 'float',
    min: 0.1,
    max: 1000,
    step: 0.5,
  },
  {
    labelId: 'settings.label.useIndividualBhMasses',
    key: 'use_individual_bh_masses',
    type: 'bool',
  },
  {
    labelId: 'settings.label.bhBehavior',
    key: 'bh_behavior',
    type: 'option',
    options: ['Static', 'Orbiting'],
  },
  {
    labelId: 'settings.label.orbitDecayRate',
    key: 'orbit_decay_rate',
    type: 'float',
    min: 0.0,
    max: 0.1,
    step: 0.001,
    precision: 3,
  },
  { labelId: 'settings.section.compact-objects', type: 'separator' },
  {
    labelId: 'settings.label.numNeutronStars',
    key: 'num_neutron_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },
  {
    labelId: 'settings.label.numWhiteDwarfs',
    key: 'num_white_dwarfs',
    type: 'int',
    min: 0,
    max: 30,
    step: 1,
  },
  {
    labelId: 'settings.label.numStars',
    key: 'num_stars',
    type: 'int',
    min: 0,
    max: 20,
    step: 1,
  },
  { labelId: 'settings.section.objects', type: 'separator' },
  {
    labelId: 'settings.label.numPlanets',
    key: 'num_planets',
    type: 'int',
    min: 0,
    max: 200,
    step: 1,
  },
  {
    labelId: 'settings.label.numGasGiants',
    key: 'num_gas_giants',
    type: 'int',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    labelId: 'settings.label.enableAsteroids',
    key: 'enable_asteroids',
    type: 'bool',
  },
  {
    labelId: 'settings.label.numAsteroids',
    key: 'num_asteroids',
    type: 'int',
    min: 0,
    max: 500,
    step: 5,
  },
  {
    labelId: 'settings.label.numComets',
    key: 'num_comets',
    type: 'int',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    labelId: 'settings.label.initVelocity',
    key: 'init_velocity',
    type: 'float',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    labelId: 'settings.label.velocityStddev',
    key: 'velocity_stddev',
    type: 'float',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    labelId: 'settings.label.inputObjectType',
    key: 'input_object_type',
    type: 'option',
    options: [
      'Planet',
      'Star',
      'Asteroid',
      'Comet',
      'GasGiant',
      'NeutronStar',
      'WhiteDwarf',
    ],
  },
  { labelId: 'settings.section.visuals', type: 'separator' },
  { labelId: 'settings.label.showTrails', key: 'show_trails', type: 'bool' },
  {
    labelId: 'settings.label.trailStyle',
    key: 'trail_style',
    type: 'option',
    options: ['Cloud', 'Simple', 'Glow'],
  },
  {
    labelId: 'settings.label.trailLength',
    key: 'trail_length',
    type: 'int',
    min: 5,
    max: 300,
    step: 5,
  },
  {
    labelId: 'settings.label.showVelocityVectors',
    key: 'show_velocity_vectors',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showAccelerationVectors',
    key: 'show_acceleration_vectors',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showPotentialWell',
    key: 'show_potential_well',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showScaleBar',
    key: 'show_scale_bar',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showElapsedTime',
    key: 'show_elapsed_time',
    type: 'bool',
  },
  { labelId: 'settings.label.showBhGlow', key: 'show_bh_glow', type: 'bool' },
  {
    labelId: 'settings.label.showAccretionDisk',
    key: 'show_accretion_disk',
    type: 'bool',
  },
  {
    labelId: 'settings.label.realisticDiskPhysics',
    key: 'realistic_disk_physics',
    type: 'bool',
  },
  { labelId: 'settings.label.showBhJets', key: 'show_bh_jets', type: 'bool' },
  {
    labelId: 'settings.label.starDensity',
    key: 'star_density',
    type: 'int',
    min: 0,
    max: 30000,
    step: 100,
  },
  {
    labelId: 'settings.label.showAmbientLighting',
    key: 'show_ambient_lighting',
    type: 'bool',
  },
  {
    labelId: 'settings.label.dynamicObjectProperties',
    key: 'dynamic_object_properties',
    type: 'bool',
  },
  {
    labelId: 'settings.label.planetBaseColor',
    key: 'planet_base_color',
    type: 'color',
  },
  {
    labelId: 'settings.label.starBaseColor',
    key: 'star_base_color',
    type: 'color',
  },
  { labelId: 'settings.section.ui-control', type: 'separator' },
  {
    labelId: 'settings.label.interactiveAdd',
    key: 'interactive_add',
    type: 'bool',
  },
  {
    labelId: 'settings.label.followMode',
    key: 'follow_mode',
    type: 'option',
    options: [
      'None',
      'BlackHole',
      'Planet',
      'GasGiant',
      'Star',
      'Asteroid',
      'Comet',
      'NeutronStar',
      'WhiteDwarf',
    ],
  },
  {
    labelId: 'settings.label.showDynamicOverlays',
    key: 'show_dynamic_overlays',
    type: 'bool',
  },
  {
    labelId: 'settings.label.recordSimulation',
    key: 'record_simulation',
    type: 'bool',
  },
  {
    labelId: 'settings.label.showGravitationalWaves',
    key: 'show_gravitational_waves',
    type: 'bool',
  },
  { labelId: 'settings.section.educational', type: 'separator' },
  {
    labelId: 'settings.label.habitableZoneOptimism',
    key: 'habitable_zone_optimism',
    type: 'float',
    min: 0.5,
    max: 2.0,
    step: 0.1,
  },
];
// ===== Reusable Tooltip System =====
class TooltipManager {
  constructor() {
    this.activeTooltip = null;
    this.tooltipElement = null;
    this.init();
  }

  init() {
    // Create tooltip element
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'tooltip-system';
    this.tooltipElement.style.cssText = `
      position: fixed;
      background: rgba(34, 34, 34, 0.9);
      color: #e0e0e0;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(0, 170, 255, 0.2);
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      max-width: 280px;
      word-wrap: break-word;
      white-space: normal;
      font-family: 'Inter', sans-serif;
    `;

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close';
    closeButton.title = t('tip.dismiss');
    closeButton.setAttribute('aria-label', 'Dismiss this tip');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#e0e0e0';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#888';
      closeButton.style.background = 'none';
    });

    closeButton.addEventListener('click', e => {
      e.stopPropagation();
      this.hide();
    });

    // Add arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    `;

    this.tooltipElement.appendChild(closeButton);
    this.tooltipElement.appendChild(arrow);

    document.body.appendChild(this.tooltipElement);

    // Add event listeners
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  show(tooltipText, triggerElement, options = {}) {
    // Hide any existing tooltip
    this.hide();

    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      padding-right: 30px;
      margin-top: 8px;
    `;
    contentContainer.textContent = tooltipText;

    // Clear existing content and add new content
    this.tooltipElement.innerHTML = '';

    // Re-add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close';
    closeButton.title = t('tip.dismiss');
    closeButton.setAttribute('aria-label', 'Dismiss this tip');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#e0e0e0';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#888';
      closeButton.style.background = 'none';
    });

    closeButton.addEventListener('click', e => {
      e.stopPropagation();
      this.hide();
    });

    // Add arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    `;

    this.tooltipElement.appendChild(closeButton);
    this.tooltipElement.appendChild(contentContainer);
    this.tooltipElement.appendChild(arrow);

    // Position tooltip
    this.positionTooltip(triggerElement, options);

    // Show tooltip
    this.tooltipElement.style.visibility = 'visible';
    this.tooltipElement.style.opacity = '1';
    this.tooltipElement.style.pointerEvents = 'auto';

    // Store reference
    this.activeTooltip = {
      element: triggerElement,
      options,
    };
  }

  hide() {
    if (this.tooltipElement) {
      this.tooltipElement.style.visibility = 'hidden';
      this.tooltipElement.style.opacity = '0';
      this.tooltipElement.style.pointerEvents = 'none';
    }
    this.activeTooltip = null;
  }

  positionTooltip(triggerElement, options = {}) {
    const tooltip = this.tooltipElement;
    const triggerRect = triggerElement.getBoundingClientRect();
    const arrow = tooltip.querySelector('.tooltip-arrow');

    // Default position (below the trigger)
    let position = options.position || 'bottom';
    let x = triggerRect.left + triggerRect.width / 2;
    let y = triggerRect.bottom + 8;

    // Calculate available space
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = tooltip.offsetWidth || 280;
    const tooltipHeight = tooltip.offsetHeight || 100;

    // Auto-position if not enough space
    if (position === 'bottom' && y + tooltipHeight > viewportHeight - 20) {
      position = 'top';
    }
    if (position === 'top' && y - tooltipHeight < 20) {
      position = 'bottom';
    }
    if (position === 'right' && x + tooltipWidth > viewportWidth - 20) {
      position = 'left';
    }
    if (position === 'left' && x - tooltipWidth < 20) {
      position = 'right';
    }

    // Adjust position based on final position
    switch (position) {
      case 'top':
        y = triggerRect.top - tooltipHeight - 8;
        x = triggerRect.left + triggerRect.width / 2;
        arrow.style.bottom = '-12px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderTopColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderBottomColor = 'transparent';
        break;
      case 'bottom':
        y = triggerRect.bottom + 8;
        x = triggerRect.left + triggerRect.width / 2;
        arrow.style.top = '-12px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderBottomColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderTopColor = 'transparent';
        break;
      case 'left':
        x = triggerRect.left - tooltipWidth - 8;
        y = triggerRect.top + triggerRect.height / 2;
        arrow.style.right = '-12px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderLeftColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderRightColor = 'transparent';
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + triggerRect.height / 2;
        arrow.style.left = '-12px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderRightColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderLeftColor = 'transparent';
        break;
    }

    // Ensure tooltip stays within viewport bounds
    x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));

    // Apply position
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  handleOutsideClick(event) {
    if (
      this.activeTooltip &&
      !this.activeTooltip.element.contains(event.target) &&
      !this.tooltipElement.contains(event.target)
    ) {
      this.hide();
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.activeTooltip) {
      this.hide();
    }
  }

  handleResize() {
    if (this.activeTooltip) {
      this.positionTooltip(
        this.activeTooltip.element,
        this.activeTooltip.options
      );
    }
  }

  handleScroll() {
    if (this.activeTooltip) {
      this.positionTooltip(
        this.activeTooltip.element,
        this.activeTooltip.options
      );
    }
  }
}

// Create global tooltip manager instance
const tooltipManager = new TooltipManager();

// Function to get tooltip text for settings
const getSettingTooltip = (key, label) => {
  const tooltips = {
    // Simulation settings
    gravitational_constant:
      'Determines the strength of gravity in the simulation. Higher values exaggerate gravitational effects for visualization.',
    sim_speed:
      'Controls how fast the simulation runs. Higher values make time pass faster.',
    mutual_gravity:
      'When enabled, all objects attract each other. When disabled, only black holes create gravity.',
    enable_star_merging:
      'When enabled, stars and other objects can merge when they get too close to each other.',

    // Object counts
    num_black_holes:
      'Number of black holes in the simulation. Each black hole creates a strong gravitational field.',
    bh_mass:
      'Mass of black holes in solar masses (M☉). Higher mass creates stronger gravity.',
    num_stars:
      'Number of stars in the simulation. Stars are lighter than black holes but still create gravity.',
    num_planets:
      'Number of planets in the simulation. Planets are small objects that orbit around larger bodies.',
    num_gas_giants:
      'Number of gas giant planets. These are larger than regular planets.',
    num_asteroids:
      'Number of asteroids in the simulation. These are small rocky objects.',
    num_comets:
      'Number of comets. These objects have highly elliptical orbits.',
    num_neutron_stars:
      'Number of neutron stars. These are dense stellar remnants.',
    num_white_dwarfs:
      'Number of white dwarfs. These are small, dense stellar remnants.',

    // Behavior settings
    bh_behavior:
      'How black holes behave: Static (stationary), Orbiting (move in orbits), or Rogue (random movement).',
    use_individual_bh_masses:
      'Toggle to assign unique masses to each black hole instead of a shared mass.',

    // Visual settings
    show_trails:
      'When enabled, objects leave trails showing their recent path.',
    trail_length: 'How long object trails persist on screen before fading.',
    trail_style: 'Style of the trails: Simple lines or glowing effects.',
    show_accretion_disk:
      'When enabled, black holes display accretion disk effects.',
    show_bh_glow: 'When enabled, black holes have a glowing effect.',
    star_density: 'Number of background stars in the starfield.',

    // Initial conditions
    placement:
      'How objects are initially positioned: Random, Circular, or Empty.',
    init_velocity: 'Initial velocity given to objects when they are created.',
    velocity_stddev:
      'Standard deviation of initial velocities, creating variation.',
    orbit_decay_rate:
      'How quickly orbits decay due to gravitational radiation.',

    // Scenario settings
    preset_scenario:
      'Choose from predefined scenarios with specific object configurations.',
    sim_size: 'Overall scale of the simulation: Small, Medium, or Large.',

    // Additional settings
    softening_length:
      'Reduces numerical instabilities by softening gravity at very small distances.',
    time_step:
      'Controls simulation speed and precision. Smaller steps = more accuracy but slower performance.',

    // Educational
    habitable_zone_optimism:
      'Which published habitable-zone definition the ring shows. Below 1.3 draws the conservative zone, bounded by the runaway and maximum greenhouse limits. 1.3 and above draws the optimistic zone, bounded by the empirical recent-Venus and early-Mars limits. The edges also depend on the star, not just this setting.',
  };

  return (
    tooltips[key] ||
    t('settings.tooltip.generic', { label: label.toLowerCase() })
  );
};

const buildSettingsMenu = () => {
  const settingsGrid = document.getElementById('settingsGrid');
  settingsGrid.innerHTML = '';
  localSettings = JSON.parse(JSON.stringify(SETTINGS));

  function updatePresetInfo(presetName) {
    const box = document.getElementById('presetInfo');
    const info = SCENARIO_INFO[presetName];
    if (!info || presetName === 'None') {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = `<h4>${scenarioTitle(presetName)}</h4>${scenarioSummary(presetName)}`;
  }

  // Group settings into sections
  const sections = [];
  let currentSection = null;
  let currentSectionItems = [];

  setting_items.forEach(item => {
    if (item.type === 'separator') {
      // Save previous section if it exists
      if (currentSection && currentSectionItems.length > 0) {
        sections.push({
          title: currentSection,
          items: currentSectionItems,
        });
      }
      // Start new section
      currentSection = t(item.labelId);
      currentSectionItems = [];
    } else {
      currentSectionItems.push(item);
    }
  });

  // Add the last section
  if (currentSection && currentSectionItems.length > 0) {
    sections.push({
      title: currentSection,
      items: currentSectionItems,
    });
  }

  // Create collapsible sections
  sections.forEach(section => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'settings-section';

    // Create section header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'settings-section-header';

    const titleDiv = document.createElement('h3');
    titleDiv.className = 'settings-section-title';
    titleDiv.textContent = section.title;

    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'settings-section-toggle';
    toggleDiv.textContent = '▼';

    headerDiv.appendChild(titleDiv);
    headerDiv.appendChild(toggleDiv);

    // Create section content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'settings-section-content';

    // Create grid for this section
    const sectionGrid = document.createElement('div');
    sectionGrid.className = 'settings-grid';
    // The two-column label/control split and the gap are set in CSS rather than
    // here, so a narrow screen can stack them. Inline styles cannot be beaten by
    // a media query, and on a 375px phone a fixed 1fr 1fr grid put the sliders
    // and the value readouts off the right edge of the panel - in English, and
    // further off in Spanish, where the labels are about a fifth longer.
    sectionGrid.style.alignItems = 'center';

    // Add items to this section
    section.items.forEach(item => {
      // Create label container with info icon
      const labelContainer = document.createElement('div');
      labelContainer.className = 'setting-label-container';

      const label = document.createElement('div');
      label.className = 'setting-label';
      label.textContent = t(item.labelId);

      // Create info icon
      const infoIcon = document.createElement('button');
      infoIcon.className = 'setting-info-icon';
      infoIcon.textContent = 'ⓘ';
      infoIcon.setAttribute(
        'aria-label',
        t('settings.info.about', { label: t(item.labelId) })
      );

      // Add click handler for tooltip using the new tooltip system
      infoIcon.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        const tooltipText = getSettingTooltip(item.key, t(item.labelId));
        tooltipManager.show(tooltipText, infoIcon, { position: 'bottom' });
      });

      // Add label and icon to container
      labelContainer.appendChild(label);
      labelContainer.appendChild(infoIcon);

      const controlContainer = document.createElement('div');
      controlContainer.className = 'setting-control';
      const value = localSettings[item.key];

      if (item.type === 'int' || item.type === 'float') {
        // Create a container for label + slider + value
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.flexDirection = 'column';
        sliderContainer.style.width = '100%';
        sliderContainer.style.gap = '4px';

        // Label above slider
        const sliderLabel = document.createElement('label');
        sliderLabel.textContent = t(item.labelId);
        sliderLabel.style.fontWeight = '500';
        sliderLabel.style.marginBottom = '2px';
        sliderLabel.style.fontSize = '15px';
        sliderLabel.style.letterSpacing = '0.01em';
        sliderLabel.style.color = 'rgba(224,224,224,0.95)';
        sliderLabel.style.textShadow = '0 1px 2px rgba(0,0,0,0.18)';
        sliderLabel.htmlFor = `${item.key}-slider`;

        // Slider and value display
        const sliderRow = document.createElement('div');
        sliderRow.style.display = 'flex';
        sliderRow.style.alignItems = 'center';
        sliderRow.style.gap = '12px';
        sliderRow.style.width = '100%';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `${item.key}-slider`;
        slider.min = item.min;
        slider.max = item.max;
        slider.step = item.step;
        slider.value = value;
        slider.style.flex = '1 1 auto';
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = Number(value).toFixed(
          item.precision || (item.type === 'float' ? 1 : 0)
        );
        slider.oninput = () => {
          const val =
            item.type === 'int'
              ? parseInt(slider.value)
              : parseFloat(slider.value);
          localSettings[item.key] = val;
          valueDisplay.textContent = val.toFixed(
            item.precision || (item.type === 'float' ? 1 : 0)
          );
          if (
            item.key === 'num_black_holes' ||
            item.key === 'use_individual_bh_masses'
          )
            updateIndivBHMassButtonVisibility();
        };
        sliderRow.append(slider, valueDisplay);
        sliderContainer.append(sliderLabel, sliderRow);
        controlContainer.append(sliderContainer);
      } else if (item.type === 'bool') {
        const button = document.createElement('button');
        button.className = 'toggle-button';
        button.textContent = value
          ? t('settings.toggle.on')
          : t('settings.toggle.off');
        button.setAttribute('data-state', value ? 'on' : 'off');
        button.onclick = () => {
          localSettings[item.key] = !localSettings[item.key];
          const newState = localSettings[item.key];
          button.textContent = newState ? 'On' : 'Off';
          button.setAttribute('data-state', newState ? 'on' : 'off');
          if (item.key === 'use_individual_bh_masses')
            updateIndivBHMassButtonVisibility();
        };
        controlContainer.appendChild(button);
      } else if (item.type === 'option') {
        const select = document.createElement('select');
        item.options.forEach(opt => {
          const option = document.createElement('option');
          // The value stored is always the English token - it is the key the
          // physics engine, the scenario presets and every saved share link
          // use - and only the label a reader sees is translated. A locale that
          // changed the stored value would produce links that only open in that
          // language.
          option.value = opt;
          option.textContent = settingOptionLabel(item.key, opt);
          if (opt === value) option.selected = true;
          select.appendChild(option);
        });
        select.onchange = e => {
          localSettings[item.key] = e.target.value;
          if (item.key === 'preset_scenario') {
            updatePresetInfo(e.target.value);
            current_scenario_name = e.target.value;
          }
        };
        controlContainer.appendChild(select);
      } else if (item.type === 'color') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;
        colorInput.oninput = () => {
          localSettings[item.key] = colorInput.value;
        };
        controlContainer.appendChild(colorInput);
      }

      sectionGrid.append(labelContainer, controlContainer);

      // Special handling for orbit decay rate button
      if (item.key === 'orbit_decay_rate') {
        const bhMassBtnContainer = document.createElement('div');
        bhMassBtnContainer.style.gridColumn = '1 / -1';
        bhMassBtnContainer.style.textAlign = 'center';
        bhMassBtnContainer.innerHTML = `<button id="indivBHMassBtn" class="ui-button" style="margin-top: 10px;">Set Individual BH Masses</button>`;
        sectionGrid.appendChild(bhMassBtnContainer);
        bhMassBtnContainer.firstElementChild.onclick = showIndivBHMassMenu;
      }
    });

    contentDiv.appendChild(sectionGrid);
    sectionDiv.appendChild(headerDiv);
    sectionDiv.appendChild(contentDiv);
    settingsGrid.appendChild(sectionDiv);

    // Add click handler for collapsible functionality
    headerDiv.addEventListener('click', () => {
      sectionDiv.classList.toggle('collapsed');
    });
  });

  updateIndivBHMassButtonVisibility();
  updatePresetInfo(localSettings.preset_scenario);
};

// BH Masses Modal visibility management - matching original exactly
const updateIndivBHMassButtonVisibility = () => {
  const btn = document.getElementById('indivBHMassBtn');
  if (btn)
    btn.style.display =
      localSettings.use_individual_bh_masses &&
      localSettings.num_black_holes > 1
        ? 'inline-block'
        : 'none';
};

const showIndivBHMassMenu = () => {
  const content = document.getElementById('bhMassesContent');
  content.innerHTML = '';
  const num_bh = localSettings.num_black_holes;
  if (!localSettings.bh_masses || localSettings.bh_masses.length !== num_bh) {
    localSettings.bh_masses = Array(num_bh).fill(localSettings.bh_mass);
  }

  for (let i = 0; i < num_bh; i++) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'bh-mass-item';

    const label = document.createElement('label');
    label.textContent = `Black Hole #${i + 1}:`;

    const controlDiv = document.createElement('div');
    controlDiv.className = 'bh-mass-control';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0.1;
    slider.max = 1000;
    slider.step = 0.1;
    slider.value = localSettings.bh_masses[i];
    slider.dataset.index = i;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'value-display';
    valueDisplay.innerHTML = solarHTML(Number(slider.value).toFixed(1));

    slider.oninput = e => {
      const index = parseInt(e.target.dataset.index, 10);
      const val = parseFloat(e.target.value);
      localSettings.bh_masses[index] = val;
      valueDisplay.innerHTML = solarHTML(val.toFixed(1));
    };

    controlDiv.append(slider, valueDisplay);
    itemDiv.append(label, controlDiv);
    content.appendChild(itemDiv);
  }
  document.getElementById('bhMassesModal').classList.remove('hidden');
};

// Legacy function for backward compatibility
const showBHMassesModal = () => {
  showIndivBHMassMenu();
};

const hideBHMassesModal = () => {
  document.getElementById('bhMassesModal').classList.add('hidden');
};
// Save/Load functions

/** Every body currently in the simulation, in a stable order. */
const allBodies = () => [
  ...bh_list,
  ...planets,
  ...stars,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
  ...debris,
];

/** Empty every object list, pool and derived cache. */
const clearWorld = () => {
  bh_list.length = 0;
  planets.length = 0;
  stars.length = 0;
  gas_giants.length = 0;
  asteroids.length = 0;
  comets.length = 0;
  neutron_stars.length = 0;
  white_dwarfs.length = 0;
  debris.length = 0;
  particles.length = 0;
  gravity_ripples.length = 0;
  accretion_disk_particles.length = 0;
  particlePool.clear();
  // Restored bodies reuse their saved ids, so any surviving history from the
  // previous run would be silently attributed to them.
  clearAllEnergyHistory();
  resetPhysicsObjectCounter();
  resetFrame();
  resetTrailTick();
};

/**
 * Rebuild the object lists from an array of saved states.
 *
 * Shared by the localStorage load and the shared-link load: both need exactly
 * this, and when it existed only inside load_simulation_state the two would
 * have drifted the first time a new body type was added.
 *
 * @param {Array<Object>} objectStates - Results of get_state(), in any order
 * @returns {number} How many bodies were restored
 */
const rebuildWorldFromStates = objectStates => {
  clearWorld();
  let maxId = 0;
  let restored = 0;

  for (const obj_state of objectStates || []) {
    if (!obj_state || typeof obj_state !== 'object') continue;
    const { type, pos, vel, mass } = obj_state;
    // A link can be edited by hand, so nothing here may assume well-formed
    // input; a body without a position would otherwise throw on first draw.
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
    const v = vel && Number.isFinite(vel.x) ? vel : { x: 0, y: 0 };

    let new_obj = null;
    if (type === 'Planet') new_obj = new Planet(pos, v);
    else if (type === 'GasGiant') new_obj = new GasGiant(pos, v);
    else if (type === 'Asteroid') new_obj = new Asteroid(pos, v);
    else if (type === 'Comet') new_obj = new Comet(pos, v);
    else if (type === 'StarObject') new_obj = new StarObject(pos, v);
    else if (type === 'NeutronStar')
      new_obj = new NeutronStar(pos, v, null, null);
    else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(pos, v);
    else if (type === 'Debris') new_obj = new Debris(pos, v);
    else if (type === 'BlackHole') new_obj = new BlackHole(pos, mass, v, true);
    if (!new_obj) continue;

    new_obj.set_state(obj_state);
    if (new_obj instanceof Planet) planets.push(new_obj);
    else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
    else if (new_obj instanceof Comet) comets.push(new_obj);
    else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
    else if (new_obj instanceof StarObject) stars.push(new_obj);
    else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
    else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    else if (new_obj instanceof Debris) debris.push(new_obj);
    else if (new_obj instanceof BlackHole) bh_list.push(new_obj);
    maxId = Math.max(maxId, new_obj.id ?? 0);
    restored++;
  }

  setPhysicsObjectCounter(maxId + 1);
  bumpWorldGeneration();
  return restored;
};

/**
 * Save the current simulation state to localStorage
 * Includes all settings, object states, and view parameters
 */
const save_simulation_state = () => {
  try {
    const savedState = {
      settings: SETTINGS,
      view: { zoom: state.zoom, pan: state.pan },
      objects: allBodies().map(o => o.get_state()),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(savedState));
    alert('Simulation state saved!');
  } catch (e) {
    console.error('Error saving state:', e);
    alert('Failed to save simulation state.');
  }
};

/**
 * Load a previously saved simulation state from localStorage
 * Restores all settings, objects, and view parameters
 */
const load_simulation_state = () => {
  const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
  scenarioInfoDiv.classList.remove('visible');

  const savedJSON = localStorage.getItem(SAVE_KEY);
  if (!savedJSON) {
    alert('No saved state found.');
    return;
  }
  try {
    const loadedState = JSON.parse(savedJSON);
    SETTINGS = loadedState.settings || { ...DEFAULT_SETTINGS };
    const view = loadedState.view || { zoom: 1.5, pan: { x: 0, y: 0 } };
    state.zoom = view.zoom;
    state.pan = view.pan;
    updatePhysicsSettings(SETTINGS);
    rebuildWorldFromStates(loadedState.objects);
    // A restored save is a hand-made world by definition: no seed regenerates
    // it, so sharing it has to carry the bodies themselves.
    markWorldTouched();
    window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));
    alert('Simulation state loaded!');
    state.paused = false;
    updateSpeedDisplay();
  } catch (e) {
    console.error('Error loading state:', e);
    alert('Failed to load state.');
  }
};

// --- Shared links -------------------------------------------------------------

/**
 * Describe the current simulation as a payload fit for a URL.
 *
 * Takes the elapsed simulation clock as an argument rather than importing
 * timeline.js: timeline.js already imports this module, and the cycle is
 * avoidable by letting the caller - which imports both - supply the number.
 *
 * @param {Object} [opts]
 * @param {'seeded'|'full'|'auto'} [opts.kind] - Payload kind; 'auto' decides
 * @param {boolean} [opts.includeCamera] - Carry zoom and pan
 * @param {number} [opts.elapsed] - Simulated seconds run since the world built
 * @returns {Object} Payload for encodePayload()
 */
const captureShareState = ({
  kind = 'auto',
  includeCamera = true,
  elapsed = 0,
  // The A/B bench asks for these. A share link does not need them and pays for
  // every character, so they are opt-in rather than always carried.
  forExperiment = false,
  experiment = null,
} = {}) => {
  const resolved =
    kind === 'auto' ? chooseKind({ touched: worldTouched, elapsed }) : kind;

  const extras = forExperiment
    ? withExtras(
        {},
        {
          clock: getSimulationTime(),
          frame: frameState(),
          observer: {
            positionAngle: getPositionAngle(),
            inclination: getInclination(),
          },
          tools: activeToolIds(),
        }
      ).x
    : null;

  return buildPayload({
    // current_scenario_name, not SETTINGS.preset_scenario: applyPreset leaves
    // the latter set to the 'None' sentinel, so reading it would stamp every
    // link with a scenario that loads nothing.
    scenario: current_scenario_name,
    seed: getWorldSeed(),
    settings: SETTINGS,
    generationSettings,
    DEFAULT_SETTINGS,
    camera: includeCamera ? { zoom: state.zoom, pan: state.pan } : null,
    bodies:
      resolved === 'full'
        ? allBodies()
            .filter(o => o && o.alive !== false)
            .map(o => packBody(o.get_state(), { withId: forExperiment }))
        : null,
    paused: state.paused,
    extras,
    experiment,
  });
};

/**
 * Which measurement tools are out, for an experiment's initial state.
 *
 * Only the fact that a tool is active, not where its handles are: restoring a
 * ruler to the pixel is not what makes two runs comparable, and the handles are
 * stored in world coordinates that a rebuilt world may not have.
 *
 * @returns {Array<string>} Active tool ids
 */
const activeToolIds = () =>
  ['ruler', 'protractor', 'stopwatch'].filter(id => {
    try {
      return isToolActive(id);
    } catch {
      return false;
    }
  });

/**
 * Rebuild the simulation described by a decoded payload.
 *
 * @param {Object} payload - From decodePayload()
 * @returns {{scenario:string, kind:string, bodies:number}} What was restored
 */
const applyShareState = payload => {
  const scenario = payload.s;
  SETTINGS.preset_scenario = scenario;

  // Held for build_simulation() to apply. Settings cannot simply be assigned
  // here: apply_preset() runs first inside the build and resets everything to
  // the scenario's own defaults, which would discard them.
  pendingSettingsOverride = payload.d ? { ...payload.d } : null;

  const seed = payloadSeed(payload);

  if (Array.isArray(payload.b) && payload.b.length) {
    // A full payload describes a world no seed reproduces. Build the scenario
    // first so settings, starfield and preset geometry are right, then replace
    // the bodies with the ones the link actually carries.
    initialize_simulation({ seed });
    rebuildWorldFromStates(payload.b);
    updatePhysicsSettings(SETTINGS);
    markWorldTouched();
  } else {
    initialize_simulation({ seed });
  }

  // Settings the author changed after the world was built are applied now, in
  // the same order they happened, so live-applied values like gravity land on
  // an already-generated system rather than shaping the generation itself.
  if (payload.a) {
    Object.assign(SETTINGS, payload.a);
    updatePhysicsSettings(SETTINGS);
  }

  if (Array.isArray(payload.c) && payload.c.length === 3) {
    const [zoom, panX, panY] = payload.c;
    if (Number.isFinite(zoom) && zoom > 0) state.zoom = zoom;
    if (Number.isFinite(panX) && Number.isFinite(panY)) {
      state.pan = { x: panX, y: panY };
    }
  }

  state.paused = payload.p === 1;
  current_scenario_name = scenario;

  // Everything an experiment needs restored that a link never carried. A
  // payload without an `x` block yields the defaults - clock at zero, world
  // frame, edge-on observer - which is exactly what an ordinary share link
  // means, so this path is safe for every link ever made.
  const extras = readExtras(payload);
  setSimulationTime(extras.clock);
  try {
    if (extras.frame.mode && extras.frame.mode !== 'world') {
      setFrame(extras.frame.mode, extras.frame.objectId);
    } else {
      resetFrame();
    }
  } catch (err) {
    // A frame naming a body that this world does not contain is a bad link,
    // not a reason to fail the whole restore.
    console.warn('Could not restore the reference frame:', err);
  }
  setPositionAngle(extras.observer.positionAngle);
  setInclination(extras.observer.inclination);

  updateSpeedDisplay();
  updateObjectTypeButton();

  return {
    scenario,
    kind: payload.b ? 'full' : 'seeded',
    bodies: allBodies().length,
    extras,
  };
};

// Utility functions
/**
 * Update the speed display in the UI to show current simulation speed
 */
const updateSpeedDisplay = () => {
  const speedDisplay = document.getElementById('speedDisplay');
  if (speedDisplay) {
    // One decimal reads any speed below 0.05 as "0.0x", which looks like the
    // simulation is stopped. A compact scenario can legitimately run at 0.01.
    const v = SETTINGS.sim_speed;
    const shown = v === 0 ? '0' : v < 0.1 ? v.toFixed(2) : v.toFixed(1);
    speedDisplay.textContent = `${shown}\u00d7`;
  }
};

/**
 * Adjust simulation speed with custom stepping:
 * - From <=0.5x downward: 0.5 -> 0.3 -> 0.1 -> 0.0 (pause)
 * - From <=0.5x upward: 0.0 -> 0.1 -> 0.3 -> 0.5
 * - Above 0.5x: steps of 0.5x up to 5.0x
 */
const adjustSimSpeed = (current, direction) => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const epsilon = 1e-9;
  const stepsBelow = [0.0, 0.1, 0.3, 0.5]; // ascending

  // Normalize very small values to exact 0
  if (Math.abs(current) < epsilon) current = 0.0;

  // Handle <= 0.5x region with special stepping
  if (current < 0.5 - epsilon) {
    if (direction > 0) {
      for (let i = 0; i < stepsBelow.length; i++) {
        if (stepsBelow[i] > current + epsilon) return stepsBelow[i];
      }
      return 0.5;
    }
    if (direction < 0) {
      for (let i = stepsBelow.length - 1; i >= 0; i--) {
        if (stepsBelow[i] < current - epsilon) return stepsBelow[i];
      }
      return 0.0;
    }
    return current;
  }
  // If exactly ~0.5x, go up to 1.0 or down to 0.3
  if (Math.abs(current - 0.5) <= epsilon) {
    if (direction > 0) return 1.0;
    if (direction < 0) return 0.3;
    return current;
  }

  // Above 0.5x: increments of 0.5
  const next = current + (direction > 0 ? 0.5 : -0.5);
  return clamp(Number(next.toFixed(1)), 0.0, 5.0);
};

/**
 * What a captured frame should call itself.
 *
 * The scenario's translated title, or 'Sandbox' when the user has built the
 * scene by hand and there is no scenario to name. Either way the exported
 * image says which run it is a picture of, which - with the scale bar and the
 * clock beside it - is what makes it citable rather than decorative.
 *
 * @returns {string} The caption to burn into the frame
 */
const captureCaption = () => {
  const named = current_scenario_name && current_scenario_name !== 'None';
  return named
    ? scenarioTitle(current_scenario_name) || current_scenario_name
    : t('capture.caption.sandbox');
};

/**
 * Take a screenshot of the current simulation
 * Combines the starfield and simulation canvases into a single image
 */
const takeScreenshot = () => {
  // Ask for the provenance line - the simulated clock, the stopwatch, the
  // vector key - to be painted on the canvas, then let one frame be drawn
  // before reading the pixels back. Live, those readings are in the readout
  // panel and painting them over the simulation as well would say the same
  // thing twice; a saved image has no readout panel, so it needs them.
  setCaptureMode(true, { caption: captureCaption() });
  const capture = () => {
    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      tempCtx.drawImage(starfieldCanvas, 0, 0);
      tempCtx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = `gravitas-screenshot-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Screenshot failed. Please try again.');
    } finally {
      // A recording holds capture mode on for its whole length. A still taken
      // during one must not switch the burnt-in caption and clock off in the
      // middle of the clip.
      if (isRecording()) setCaptureMode(true, { caption: captureCaption() });
      else setCaptureMode(false);
    }
  };
  // Two frames: the first is the one that repaints with the flag set, the
  // second is where it is certainly on the canvas.
  requestAnimationFrame(() => requestAnimationFrame(capture));
};

// Object type cycling functionality
const objectTypes = [
  { type: 'Star', emoji: '⭐', label: 'objectType.stars' },
  { type: 'Planet', emoji: '🌍', label: 'objectType.rockyPlanets' },
  { type: 'GasGiant', emoji: '🪐', label: 'objectType.gasGiants' },
  { type: 'Asteroid', emoji: '☄️', label: 'objectType.asteroids' },
  { type: 'Comet', emoji: '☄️', label: 'objectType.comets' },
  { type: 'WhiteDwarf', emoji: '💎', label: 'objectType.whiteDwarfs' },
  { type: 'NeutronStar', emoji: '⚡', label: 'objectType.neutronStars' },
  { type: 'BlackHole', emoji: '⚫', label: 'objectType.blackHoles' },
];

let currentTypeIndex = 0;

// Function to generate random black hole mass based on existing black holes
const generateRandomBlackHoleMass = () => {
  // Find the largest black hole mass in the simulation
  let largestMass = SETTINGS.bh_mass * SOLAR_MASS_UNIT; // Default fallback

  if (bh_list.length > 0) {
    largestMass = Math.max(...bh_list.map(bh => bh.mass));
  }

  // Convert to solar masses for easier calculation
  const largestMassInSuns = largestMass / SOLAR_MASS_UNIT;

  // Generate random mass with normal distribution centered around largest mass
  // Use a wider spread for more variety (±50% of the largest mass)
  const spread = largestMassInSuns * 0.5;
  const minMass = Math.max(1.0, largestMassInSuns - spread); // At least 1 solar mass
  const maxMass = largestMassInSuns + spread;

  // Generate random value with bias toward center (using two random numbers for normal-ish distribution)
  const random1 = Math.random();
  const random2 = Math.random();
  const normalRandom = (random1 + random2) / 2; // Rough approximation of normal distribution

  const randomMassInSuns = minMass + (maxMass - minMass) * normalRandom;
  return randomMassInSuns * SOLAR_MASS_UNIT;
};

const updateObjectTypeButton = () => {
  const btn = document.getElementById('objectTypeBtn');
  if (!btn) return; // Guard against missing button
  const currentType = objectTypes[currentTypeIndex];
  btn.innerHTML = `${currentType.emoji} ${t(currentType.label)}`;
  btn.title = `Click to change what type of object you insert (currently: ${currentType.type})`;
  SETTINGS.input_object_type = currentType.type;
};

// Event handlers
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;

  // Mark that user has interacted with the page
  state.user_has_interacted = true;

  // Check if click is in UI area - improved detection with buffer zone
  const uiContainer = document.querySelector('.ui-container');
  const uiRect = uiContainer.getBoundingClientRect();
  const bufferZone = 5; // 5px buffer around UI elements

  // Check if click is within the UI container bounds (including buffer zone)
  if (
    e.clientX >= uiRect.left - bufferZone &&
    e.clientX <= uiRect.right + bufferZone &&
    e.clientY >= uiRect.top - bufferZone &&
    e.clientY <= uiRect.bottom + bufferZone
  ) {
    return;
  }

  // The measurement tools get first refusal on the press. A ruler end sitting
  // over a planet has to be grabbable, and without this the click would select
  // the planet underneath it instead - or, on empty space, start dragging a new
  // body into existence out of the handle the user meant to move.
  if (toolsPointerDown({ x: e.clientX, y: e.clientY })) {
    state.isHolding = false;
    state.adding_mass = false;
    state.isDragging = false;
    return;
  }

  const worldPos = screen_to_world({ x: e.clientX, y: e.clientY });
  const clickedObject = findObjectAtPosition(worldPos);

  if (clickedObject) {
    // Clicking an existing object should ONLY open inspector, never start add/hold
    state.isHolding = false;
    state.adding_mass = false;
    state.isDragging = false;
    showObjectInspector(clickedObject.object, clickedObject.type);
    return;
  }

  // Only close inspector if we clicked on empty space and inspector is open
  if (state.inspector_open && !clickedObject) {
    hideObjectInspector();
    // Do not add on this click when closing inspector
    return;
  }

  // Begin hold for orbit preview on empty space only
  state.isHolding = true;
  state.holdStart = { ...worldPos };
  state.holdCurrent = { ...worldPos };
  // Reset sticky orbit on new hold
  state.stickyOrbit.active = false;
  state.stickyOrbit.centralId = null;
  state.stickyOrbit.snappedVel = null;

  // Regular click handling for adding objects
  state.mouse.down = true;
  if (SETTINGS.interactive_add) {
    // Validate world coordinates before proceeding
    if (
      isNaN(worldPos.x) ||
      isNaN(worldPos.y) ||
      !isFinite(worldPos.x) ||
      !isFinite(worldPos.y)
    ) {
      console.warn('Invalid world coordinates:', worldPos);
      return;
    }

    state.adding_mass = true;
    state.add_start_screen = { x: e.clientX, y: e.clientY };
    state.add_start_world = worldPos;
    // Start drag preview
    state.isDragging = true;
    state.dragStart = { ...worldPos };
    state.dragCurrent = { ...worldPos };
  }
});

window.addEventListener('mousemove', e => {
  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
  if (toolsPointerMove({ x: e.clientX, y: e.clientY })) return;
  if (state.mouse.down && !state.adding_mass) {
    state.pan.x += e.movementX;
    state.pan.y += e.movementY;
  }
  if (state.adding_mass) {
    updateOrbitHelper(e.shiftKey);
    // Update drag preview current
    const worldPos = screen_to_world({ x: e.clientX, y: e.clientY });
    state.dragCurrent = worldPos;
    if (state.isHolding) state.holdCurrent = { ...worldPos };
  }
});

window.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  if (toolsPointerUp()) {
    state.mouse.down = false;
    return;
  }
  state.mouse.down = false;
  if (state.adding_mass) {
    state.adding_mass = false;
    state.isDragging = false;
    const add_end_world = screen_to_world({ x: e.clientX, y: e.clientY });

    // Validate both start and end world coordinates
    if (
      isNaN(add_end_world.x) ||
      isNaN(add_end_world.y) ||
      !isFinite(add_end_world.x) ||
      !isFinite(add_end_world.y) ||
      isNaN(state.add_start_world.x) ||
      isNaN(state.add_start_world.y) ||
      !isFinite(state.add_start_world.x) ||
      !isFinite(state.add_start_world.y)
    ) {
      console.warn('Invalid world coordinates during object placement:', {
        start: state.add_start_world,
        end: add_end_world,
      });
      return;
    }

    let vel = {
      x: (add_end_world.x - state.add_start_world.x) * 1.5,
      y: (add_end_world.y - state.add_start_world.y) * 1.5,
    };
    // If sticky orbit was active at release, use the snapped velocity for stable orbit
    if (state.stickyOrbit.active && state.stickyOrbit.snappedVel) {
      vel = { ...state.stickyOrbit.snappedVel };
    }
    // Snap to circular around dominant body if Shift key is held
    if (state.orbit_helper.enabled && e.shiftKey) {
      const prev = state.orbit_helper.preview;
      if (prev && prev.attractor) {
        vel = computeCircularVelocity(state.add_start_world, prev.attractor);
      }
    }
    const type = SETTINGS.input_object_type;
    let new_obj;
    if (type === 'Planet') new_obj = new Planet(state.add_start_world, vel);
    else if (type === 'Star')
      new_obj = new StarObject(state.add_start_world, vel);
    else if (type === 'Asteroid')
      new_obj = new Asteroid(state.add_start_world, vel);
    else if (type === 'GasGiant')
      new_obj = new GasGiant(state.add_start_world, vel);
    else if (type === 'NeutronStar')
      new_obj = new NeutronStar(state.add_start_world, vel, null, null);
    else if (type === 'WhiteDwarf')
      new_obj = new WhiteDwarf(state.add_start_world, vel);
    else if (type === 'Comet') new_obj = new Comet(state.add_start_world, vel);
    else if (type === 'BlackHole') {
      const randomMass = generateRandomBlackHoleMass();
      new_obj = new BlackHole(state.add_start_world, randomMass, vel, true);
    }

    // NB: Comet is checked before Asteroid and lands in `comets` - it used to
    // be pushed into `asteroids`, so every hand-placed comet behaved as a rock.
    if (new_obj instanceof Comet) comets.push(new_obj);
    else if (new_obj instanceof Planet) planets.push(new_obj);
    else if (new_obj instanceof StarObject) stars.push(new_obj);
    else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
    else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
    else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
    else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    else if (new_obj instanceof BlackHole) bh_list.push(new_obj);

    // Announced rather than called directly: controls.js already imports ui.js,
    // and a direct call back would close an import cycle.
    if (new_obj) {
      window.dispatchEvent(
        new CustomEvent('gravitasObjectPlaced', { detail: { object: new_obj } })
      );
    }
    // Clear helper after placement
    state.orbit_helper.preview = null;
    // Clear holding flags
    state.isHolding = false;
    state.holdStart = null;
    state.holdCurrent = null;
    // Clear sticky state after placement
    state.stickyOrbit.active = false;
    state.stickyOrbit.centralId = null;
    state.stickyOrbit.snappedVel = null;
  }
});

// Expose drag preview for rendering: returns { position, velocity } or null
export function getDragPreview() {
  if (!state.isDragging) return null;
  const position = { ...state.dragStart };
  // Use same scaling as placement velocity: factor 3 from delta world
  const velocity = {
    x: (state.dragCurrent.x - state.dragStart.x) * 3,
    y: (state.dragCurrent.y - state.dragStart.y) * 3,
  };
  return { position, velocity };
}

// Compute an orbit preview from current hold/drag state
export function getOrbitPreview() {
  if (!state.isHolding || !state.holdStart || !state.holdCurrent) return null;

  // Build array of all gravitating sources (alive only)
  const sources = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
    ...planets,
    ...asteroids,
    ...comets,
  ].filter(b => b && b.alive !== false && b.pos && typeof b.mass === 'number');
  if (sources.length === 0) return null;

  // Initial position and velocity in world frame
  const pos = { x: state.holdStart.x, y: state.holdStart.y };
  let vel = {
    x: (state.holdCurrent.x - state.holdStart.x) * 3,
    y: (state.holdCurrent.y - state.holdStart.y) * 3,
  };

  // Integrate forward using symplectic Euler under many-body gravity
  const dt = 0.02; // sim seconds per step
  // Extend grey path length by 1.5x for a given insertion speed
  const steps = Math.floor(160 * 1.5);
  const gravityBoost =
    (typeof SETTINGS !== 'undefined' && SETTINGS.preview_gravity_boost) || 4.0;
  const points = [{ x: pos.x, y: pos.y }];
  let collisionInfo = null;
  for (let i = 0; i < steps; i++) {
    const a = gravitational_acceleration(pos, sources);
    // Exaggerate bending by boosting gravity for preview path only
    vel.x += a.ax * gravityBoost * dt;
    vel.y += a.ay * gravityBoost * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    points.push({ x: pos.x, y: pos.y });

    // Predict collision with any source: stop early and mark collision
    if (!collisionInfo) {
      for (let sIdx = 0; sIdx < sources.length; sIdx++) {
        const s = sources[sIdx];
        if (!s || !s.pos || typeof s.radius !== 'number') continue;
        const dx = pos.x - s.pos.x;
        const dy = pos.y - s.pos.y;
        const distSq = dx * dx + dy * dy;
        // Use a reduced effective radius for black holes to avoid overly eager preview collisions
        const bhFactor =
          (typeof SETTINGS !== 'undefined' &&
            SETTINGS.preview_collision_bh_factor) ||
          0.6;
        const r =
          s.obj_type === 'BlackHole'
            ? Math.max(0, s.radius * bhFactor)
            : Math.max(0, s.radius);
        // Require inward radial motion for collision (reduces skim false positives)
        const radialDot = dx * vel.x + dy * vel.y; // < 0 means moving inward
        if (distSq <= r * r && radialDot < 0) {
          collisionInfo = {
            x: pos.x,
            y: pos.y,
            withId: s.id ?? null,
            withType: s.obj_type ?? null,
          };
          break;
        }
      }
      if (collisionInfo) break;
    }
  }

  // Attempt stable orbit detection around most massive body
  const primary = getMostMassiveBody(sources);
  if (primary && primary.pos && typeof primary.mass === 'number') {
    const last = points[points.length - 1];
    if (last) {
      // Relative initial state around primary (start of preview)
      const r0 = {
        x: points[0].x - primary.pos.x,
        y: points[0].y - primary.pos.y,
      };
      const v0 = {
        x: (state.holdCurrent.x - state.holdStart.x) * 3,
        y: (state.holdCurrent.y - state.holdStart.y) * 3,
      };
      // Specific energy sign test (using normal G, not boosted)
      const Gval =
        (typeof SETTINGS !== 'undefined' && SETTINGS.gravitational_constant) ||
        1.0;
      const rMag = Math.hypot(r0.x, r0.y);
      const vMag = Math.hypot(v0.x, v0.y);
      // Minimal drag/speed gate, but we will override this if direction-only condition is met
      const minSnapSpeed =
        (typeof SETTINGS !== 'undefined' && SETTINGS.snap_min_speed) || 2.0;
      // const E =
      //   0.5 * vMag * vMag - (Gval * primary.mass) / Math.max(rMag, 1e-9);

      // Sticky snapping: if velocity is roughly compatible with circular, snap
      // Compute ideal circular speed and allow both CCW and CW tangential directions
      const vCirc = Math.sqrt((Gval * primary.mass) / Math.max(rMag, 1e-9));
      const baseAngle = Math.atan2(r0.y, r0.x);
      const dirCCW = baseAngle + Math.PI / 2;
      const dirCW = baseAngle - Math.PI / 2;
      const vIdealCCW = {
        x: vCirc * Math.cos(dirCCW),
        y: vCirc * Math.sin(dirCCW),
      };
      const vIdealCW = {
        x: vCirc * Math.cos(dirCW),
        y: vCirc * Math.sin(dirCW),
      };
      // const dvx = v0.x - vIdeal.x;
      // const dvy = v0.y - vIdeal.y;
      // const velError = Math.hypot(dvx, dvy);
      // Dial down stickiness: require closer match to ideal
      // const baseTol =
      //   (typeof SETTINGS !== 'undefined' && SETTINGS.sticky_orbit_tolerance) ||
      //   5.0;
      // const speedScale = Math.max(1, vMag * 0.1);
      const denom = Math.max(1e-9, vMag * vCirc);
      const dotCCW = v0.x * vIdealCCW.x + v0.y * vIdealCCW.y;
      const cosCCW = Math.max(-1, Math.min(1, dotCCW / denom));
      const angErrCCW = Math.acos(cosCCW);
      const dotCW = v0.x * vIdealCW.x + v0.y * vIdealCW.y;
      const cosCW = Math.max(-1, Math.min(1, dotCW / denom));
      const angErrCW = Math.acos(cosCW);
      const angErr = Math.min(angErrCCW, angErrCW);
      // General angle tolerance removed in direction-only logic
      // Direction-only snap: if within this narrower angle, snap regardless of speed
      const dirOnlyDeg =
        (typeof SETTINGS !== 'undefined' &&
          SETTINGS.sticky_dir_only_angle_deg) ||
        15;
      const angleOkDirOnly = angErr <= (dirOnlyDeg * Math.PI) / 180;
      // Speed factor band removed in direction-only logic

      // If user hasn't dragged fast enough yet and not within direction-only band, show grey preview
      if (vMag < minSnapSpeed && !angleOkDirOnly) {
        return { points, snapped: false, collision: collisionInfo };
      }

      // Snap strictly by direction-only cone for seamless switching
      if (angleOkDirOnly) {
        const chosenIdeal = angErrCCW <= angErrCW ? vIdealCCW : vIdealCW;
        // Activate snap and store snapped velocity
        state.stickyOrbit.active = true;
        state.stickyOrbit.centralId = primary.id ?? null;
        state.stickyOrbit.snappedVel = { ...chosenIdeal };

        // Use snapped velocity only for the loop preview, keep live arrow responsive

        // Build a closed circular path (one full loop) for clear orbit outline
        const r = Math.max(1e-9, Math.hypot(r0.x, r0.y));
        const theta0 = Math.atan2(r0.y, r0.x);
        const samples = 240;
        const orbitPts = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const theta = theta0 + 2 * Math.PI * t;
          orbitPts.push({
            x: primary.pos.x + r * Math.cos(theta),
            y: primary.pos.y + r * Math.sin(theta),
          });
        }

        // Prepend starting segment from current hold point back to the first orbit point
        // So the dashed path appears continuous from drop to orbit
        const fullPoints = [];
        // When snapped, show only the closed orbit (no connector)
        // Then the full orbit
        fullPoints.push(...orbitPts);

        return { points: fullPoints, snapped: true };
      }
    }
  }

  // If previously in sticky mode, require a large deviation and angle change to break snap
  if (state.stickyOrbit.active) {
    const central = [...sources].find(
      s => s.id === state.stickyOrbit.centralId
    );
    if (central) {
      const r0 = {
        x: state.holdStart.x - central.pos.x,
        y: state.holdStart.y - central.pos.y,
      };
      const Gval =
        (typeof SETTINGS !== 'undefined' && SETTINGS.gravitational_constant) ||
        1.0;
      const rMag = Math.hypot(r0.x, r0.y);
      const vCirc = Math.sqrt((Gval * central.mass) / Math.max(rMag, 1e-9));
      const baseAngle2 = Math.atan2(r0.y, r0.x);
      const dirCCW2 = baseAngle2 + Math.PI / 2;
      const dirCW2 = baseAngle2 - Math.PI / 2;
      const vIdealCCW2 = {
        x: vCirc * Math.cos(dirCCW2),
        y: vCirc * Math.sin(dirCCW2),
      };
      const vIdealCW2 = {
        x: vCirc * Math.cos(dirCW2),
        y: vCirc * Math.sin(dirCW2),
      };
      // Choose ideal direction that is closest to current drag direction
      const denom2 = Math.max(1e-9, Math.hypot(vel.x, vel.y) * vCirc);
      const cosCCW2 = Math.max(
        -1,
        Math.min(1, (vel.x * vIdealCCW2.x + vel.y * vIdealCCW2.y) / denom2)
      );
      const cosCW2 = Math.max(
        -1,
        Math.min(1, (vel.x * vIdealCW2.x + vel.y * vIdealCW2.y) / denom2)
      );
      const angErrCCW2 = Math.acos(cosCCW2);
      const angErrCW2 = Math.acos(cosCW2);
      const useCCW2 = angErrCCW2 <= angErrCW2;
      const vIdeal = useCCW2 ? vIdealCCW2 : vIdealCW2;
      // deviation thresholds no longer used in direction-only maintain logic
      const dot2 = vel.x * vIdeal.x + vel.y * vIdeal.y;
      const cosTheta2 = Math.max(-1, Math.min(1, dot2 / denom2));
      const angErr2 = Math.acos(cosTheta2);
      // const breakAngleDeg =
      //   (typeof SETTINGS !== 'undefined' && SETTINGS.sticky_break_angle_deg) ||
      //   20;
      // const breakAngle = (breakAngleDeg * Math.PI) / 180;
      // Maintain snap only while within the direction-only cone
      const dirOnlyDeg2 =
        (typeof SETTINGS !== 'undefined' &&
          SETTINGS.sticky_dir_only_angle_deg) ||
        15;
      if (angErr2 <= (dirOnlyDeg2 * Math.PI) / 180) {
        // Stay snapped: show a simple closed circular orbit in blue (one full loop)
        const r = Math.max(1e-9, Math.hypot(r0.x, r0.y));
        const theta0 = Math.atan2(r0.y, r0.x);
        const samples = 240;
        const orbitPts = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const theta = theta0 + 2 * Math.PI * t;
          orbitPts.push({
            x: central.pos.x + r * Math.cos(theta),
            y: central.pos.y + r * Math.sin(theta),
          });
        }
        const fullPoints = [];
        // When snapped, show only the closed orbit (no connector)
        fullPoints.push(...orbitPts);
        return { points: fullPoints, snapped: true };
      }
    }
    // Break sticky if central not found or deviation too large
    state.stickyOrbit.active = false;
    state.stickyOrbit.centralId = null;
    state.stickyOrbit.snappedVel = null;
  }

  return { points, snapped: false, collision: collisionInfo };
}

// Merge toast removed per request

window.addEventListener(
  'wheel',
  e => {
    if (e.target !== canvas) return;
    e.preventDefault();

    // Use a smaller zoom factor for smoother zooming
    const zoomFactor = 1.05; // Reduced from 1.1
    const oldZoom = state.zoom;
    let newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    newZoom = Math.max(0.01, Math.min(newZoom, 100));

    // Get the world position at the mouse cursor (using current zoom and pan)
    const worldPos = screen_to_world({ x: e.clientX, y: e.clientY });

    // Update zoom
    state.zoom = newZoom;

    // Calculate where that world position should be on screen with the new zoom
    const newScreenPos = worldToScreen(worldPos, state, canvas);

    // Calculate the difference and adjust pan to keep the mouse position fixed
    const deltaX = newScreenPos.x - e.clientX;
    const deltaY = newScreenPos.y - e.clientY;

    state.pan.x -= deltaX;
    state.pan.y -= deltaY;
  },
  { passive: false }
);

/**
 * True when a key event came from somewhere that owns the keyboard.
 *
 * Kept local rather than imported from shortcuts.js: that module is loaded by
 * controls.js, which imports this one, and a static import here would close the
 * cycle for the sake of one predicate.
 *
 * @param {EventTarget} target - Event target
 * @returns {boolean} True if the user is typing
 */
const isTypingTarget = target => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

window.addEventListener('keydown', e => {
  // Typing into a field must not also drive the simulation. This handler binds
  // bare letters, so without the guard writing a planet's name into a lesson
  // answer pans the view on W, A, S and D, pauses on space and fires a
  // screenshot on P. shortcuts.js already guards its own registry the same way;
  // this listener predates it and was never given the check.
  if (isTypingTarget(e.target)) return;
  // A modifier means the key belongs to the browser or the OS, not to us.
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const panSpeed = 40 / state.zoom;
  if (e.key === ' ') {
    state.paused = !state.paused;
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
    state.pan.x += panSpeed;
  else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
    state.pan.x -= panSpeed;
  else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
    state.pan.y += panSpeed;
  else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
    state.pan.y -= panSpeed;
  else if (e.key.toLowerCase() === 'home') {
    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
  } else if (e.key === '-' || e.key === '_') {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
    updateSpeedDisplay();
  } else if (e.key === '=' || e.key === '+') {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
    updateSpeedDisplay();
  } else if (e.key.toLowerCase() === 'p') {
    takeScreenshot();
  } else if (e.key === 'Escape') {
    debugLog('Escape key pressed, inspector_open:', state.inspector_open);
    if (state.inspector_open) {
      hideObjectInspector();
    }
  }
});

// Button event handlers
document.getElementById('inspectorClose').onclick = hideObjectInspector;
const inspectorCloseChip = document.getElementById('inspectorCloseChip');
if (inspectorCloseChip) inspectorCloseChip.onclick = hideObjectInspector;

// Delete object functionality
const deleteSelectedObject = () => {
  if (state.selectedObject && state.selectedObject.object) {
    const object = state.selectedObject.object;
    const type = state.selectedObject.type;

    // Clear energy history for the object being deleted
    if (object.id) {
      clearObjectEnergyHistory(object.id);
      debugLog(`Cleared energy history for deleted ${type}: ${object.id}`);
    }

    // Mark the object as dead so it gets removed in the next physics update
    object.alive = false;

    // Close the inspector
    hideObjectInspector();

    // Show a brief notification
    debugLog(`Deleted ${type}: ${object.id}`);
  }
};

document.getElementById('inspectorDelete').onclick = deleteSelectedObject;
setupReferenceFrameControl();
const inspectorPinBtn = document.getElementById('inspectorPin');
if (inspectorPinBtn) inspectorPinBtn.onclick = pinCurrentObject;
// Cards are positioned in viewport coordinates against the inspector's edge,
// so a resize has to re-run the layout or they end up off screen.
window.addEventListener('resize', () => {
  const panel = document.getElementById('objectInspector');
  // A window that narrows can push a docked panel over the readout it was
  // measured to clear, so the measurement has to be redone.
  if (panel && state.inspector_open) dockInspector(panel);
  layoutPinnedCards();
});

document.getElementById('settingsBtn').onclick = () => {
  buildSettingsMenu();
  document.getElementById('settingsPanel').classList.remove('hidden');
  state.paused = true;
};
document.getElementById('refreshScenarioBtn').onclick = () => {
  // Preserve current scenario name and restart it
  const currentScenario = current_scenario_name || 'Binary BH';
  SETTINGS.preset_scenario = currentScenario;
  initialize_simulation();
  state.paused = false;
  show_scenario_info();
  updateSpeedDisplay();
};
document.getElementById('resetAllBtn').onclick = () => {
  // Reset to default settings and ensure Binary BH scenario
  SETTINGS = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  SETTINGS.preset_scenario = 'Binary BH'; // Ensure default scenario
  initialize_simulation();
  state.paused = false;
  show_scenario_info();
  updateSpeedDisplay();
};
document.getElementById('saveBtn').onclick = save_simulation_state;
document.getElementById('loadBtn').onclick = load_simulation_state;
// Settings that describe how the simulation is *built* - changing any of them
// genuinely requires a rebuild. Everything else is presentation or a live
// physics knob and can be applied to the running simulation, so that adjusting
// a trail style no longer throws away the system you were watching.
const REBUILD_KEYS = new Set([
  'preset_scenario',
  'num_planets',
  'num_gas_giants',
  'num_stars',
  'num_asteroids',
  'num_comets',
  'num_neutron_stars',
  'num_white_dwarfs',
  'num_black_holes',
  'bh_mass',
  'use_individual_bh_masses',
  'bh_masses',
  'placement',
  'sim_size',
  'init_velocity',
  'velocity_stddev',
  'enable_asteroids',
]);

/**
 * Which of the pending settings require a full rebuild.
 * @param {Object} next - The staged settings
 * @returns {Array<string>} Names of changed rebuild-scope settings
 */
const changedRebuildKeys = next =>
  [...REBUILD_KEYS].filter(
    k => JSON.stringify(next[k]) !== JSON.stringify(SETTINGS[k])
  );

document.getElementById('settingsApply').onclick = () => {
  const next = JSON.parse(JSON.stringify(localSettings));
  const needsRebuild = changedRebuildKeys(next);
  const starfieldChanged =
    next.star_density !== SETTINGS.star_density ||
    next.show_ambient_lighting !== SETTINGS.show_ambient_lighting;

  SETTINGS = next;
  document.getElementById('settingsPanel').classList.add('hidden');

  if (needsRebuild.length > 0) {
    initialize_simulation();
    show_scenario_info();
  } else {
    // Live path: push the new values into the physics layer and repaint the
    // background if it depends on anything that changed.
    updatePhysicsSettings(SETTINGS);
    if (starfieldChanged) generateStarfield();
    window.dispatchEvent(
      new CustomEvent('gravitasSettingsApplied', {
        detail: { rebuilt: false },
      })
    );
  }

  state.paused = false;
  updateSpeedDisplay();
};
document.getElementById('settingsReset').onclick = () => {
  localSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  buildSettingsMenu();
};
document.getElementById('settingsCancel').onclick = () => {
  document.getElementById('settingsPanel').classList.add('hidden');
  state.paused = false;
};
const settingsCloseChip = document.getElementById('settingsCloseChip');
if (settingsCloseChip)
  settingsCloseChip.onclick = () => {
    document.getElementById('settingsPanel').classList.add('hidden');
    state.paused = false;
  };

// Demo mode functionality
let demoModeInterval = null;
let demoModeActive = false;
let demoScenarios = Object.keys(SCENARIO_INFO).filter(key => key !== 'None');
let currentDemoIndex = 0;

const startDemoMode = () => {
  if (demoModeActive) return;

  demoModeActive = true;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.add('active');
  demoBtn.textContent = '⏹️ Stop Demo';

  // Start with a random scenario
  currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);

  const cycleScenario = () => {
    if (!demoModeActive) return;

    const scenario = demoScenarios[currentDemoIndex];
    SETTINGS.preset_scenario = scenario;
    initialize_simulation();
    state.paused = false;
    show_enhanced_scenario_info(scenario);
    updateSpeedDisplay();

    // Move to next scenario (randomly)
    currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);
  };

  // Start cycling every 20 seconds
  demoModeInterval = setInterval(cycleScenario, 20000);

  // Start immediately
  cycleScenario();
};

const stopDemoMode = () => {
  if (!demoModeActive) return;

  demoModeActive = false;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.remove('active');
  demoBtn.textContent = '🎬 Demo Mode';

  if (demoModeInterval) {
    clearInterval(demoModeInterval);
    demoModeInterval = null;
  }
};

document.getElementById('demoModeBtn').onclick = () => {
  if (demoModeActive) {
    stopDemoMode();
  } else {
    startDemoMode();
  }
};

// Cleanup demo mode on page unload
window.addEventListener('beforeunload', () => {
  if (demoModeActive) {
    stopDemoMode();
  }
});

// BH Masses Modal event handlers
document.getElementById('bhMassesDone').onclick = hideBHMassesModal;

// Speed control functionality
document.getElementById('slowDownBtn').onclick = () => {
  SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
  updateSpeedDisplay();
};

document.getElementById('speedUpBtn').onclick = () => {
  SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
  updateSpeedDisplay();
};

// Reset view functionality - improved to center on main objects
document.getElementById('resetViewBtn').onclick = () => {
  // Collect all objects to find the center of mass
  const allObjects = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
    ...planets,
    ...asteroids,
  ].filter(obj => obj.alive);

  if (allObjects.length > 0) {
    // Calculate center of mass
    let totalMass = 0;
    let centerX = 0;
    let centerY = 0;

    for (const obj of allObjects) {
      totalMass += obj.mass;
      centerX += obj.pos.x * obj.mass;
      centerY += obj.pos.y * obj.mass;
    }

    if (totalMass > 0) {
      centerX /= totalMass;
      centerY /= totalMass;
    }

    // Calculate bounds to determine appropriate zoom level
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const obj of allObjects) {
      minX = Math.min(minX, obj.pos.x);
      maxX = Math.max(maxX, obj.pos.x);
      minY = Math.min(minY, obj.pos.y);
      maxY = Math.max(maxY, obj.pos.y);
    }

    // Add some padding around the objects
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    // Calculate zoom to fit all objects on screen
    const zoomX = canvas.width / width;
    const zoomY = canvas.height / height;
    const newZoom = Math.min(zoomX, zoomY, 2.0); // Cap zoom at 2.0x

    // Set the view to center on the objects
    state.zoom = Math.max(0.1, newZoom);
    state.pan.x = -centerX * state.zoom;
    state.pan.y = centerY * state.zoom;
  } else {
    // Fallback to default view if no objects
    state.zoom = 1.0;
    state.pan = { x: 0.0, y: 0.0 };
  }
};

// Screenshot functionality
document.getElementById('screenshotBtn').onclick = takeScreenshot;

// --- Clip recording -----------------------------------------------------------
//
// A screenshot documents a moment and most of what this simulation shows is
// motion, so the same Capture group also records a stretch of the run to a
// video file. The recorder itself - the compositing, the container choice, the
// byte and time budgets - is in js/capture.js; what is here is the button, the
// indicator and the save, which are the parts that have to know about this
// page.

const recordBtn = document.getElementById('recordBtn');
const recordingBadge = document.getElementById('recordingBadge');
const recordingReadout = document.getElementById('recordingReadout');

/** mm:ss, for the indicator. @param {number} s - Seconds @returns {string} */
const clockText = s => {
  const whole = Math.max(0, Math.floor(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * Paint the button and the indicator from the recorder's own counters, so the
 * two can never disagree with what is actually being written.
 * @param {object|null} status - recordingStatus(), or null when idle
 */
const paintRecordingState = status => {
  const on = Boolean(status?.recording);
  if (recordBtn) {
    recordBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    recordBtn.textContent = on ? t('rail.record.stop') : t('rail.record');
    recordBtn.title = on ? t('rail.record.stop.hint') : t('rail.record.hint');
  }
  if (!recordingBadge || !recordingReadout) return;
  recordingBadge.hidden = !on;
  if (!on) {
    recordingBadge.removeAttribute('data-nearly');
    return;
  }
  const mb = status.bytes / (1024 * 1024);
  const capMb = status.maxBytes / (1024 * 1024);
  recordingReadout.textContent = `REC ${clockText(status.seconds)}  ${mb.toFixed(0)}/${capMb.toFixed(0)} MB`;
  // Within a tenth of either budget the recording is about to stop itself,
  // which is worth a colour rather than a surprise.
  const nearly =
    status.seconds > status.maxSeconds * 0.9 ||
    status.bytes > status.maxBytes * 0.9;
  if (nearly) recordingBadge.setAttribute('data-nearly', 'true');
  else recordingBadge.removeAttribute('data-nearly');
};

/**
 * Save a finished clip, and say why it ended when it was not the user who
 * ended it.
 * @param {Blob|null} blob - The assembled recording
 * @param {object} meta - {reason, seconds, bytes, type}
 */
const saveRecording = (blob, meta) => {
  setCaptureMode(false);
  paintRecordingState(null);
  if (!blob || !blob.size) {
    toast(t('capture.record.failed'));
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `gravitas-clip-${Date.now()}.${extensionFor(meta.type)}`;
  link.href = url;
  link.click();
  // The Blob is the last thing holding the recording; the URL keeps it alive
  // until it is revoked, so it is revoked as soon as the download has taken
  // its reference.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  const mb = (meta.bytes / (1024 * 1024)).toFixed(1);
  if (meta.reason === 'size') toast(t('capture.record.cappedSize', { mb }));
  else if (meta.reason === 'duration')
    toast(t('capture.record.cappedTime', { mb }));
  else toast(t('capture.record.saved', { s: clockText(meta.seconds), mb }));
};

const toggleRecording = () => {
  if (isRecording()) {
    stopRecording('user');
    return;
  }
  // The clip carries the same provenance a still does: the scenario title, the
  // scale bar and the simulated clock, burned in for every frame of it.
  setCaptureMode(true, { caption: captureCaption() });
  const started = startRecording({
    sources: [starfieldCanvas, canvas],
    onTick: status => {
      // Re-read the caption rather than holding the one the take started with:
      // a lecturer who loads a second scenario mid-clip would otherwise have
      // the rest of the recording labelled with the first one's name.
      setCaptureMode(true, { caption: captureCaption() });
      paintRecordingState(status);
    },
    onStop: saveRecording,
  });
  if (!started) {
    setCaptureMode(false);
    toast(t('capture.record.unsupported'));
    return;
  }
  paintRecordingState(recordingStatus());
};

if (recordBtn) {
  // Nothing to offer where MediaRecorder or captureStream is missing: a button
  // that can only apologise is worse than no button.
  if (!canRecord()) recordBtn.hidden = true;
  else recordBtn.onclick = toggleRecording;
}

// A language change rewrites every data-i18n element from its key, which would
// put "Record Clip" back on a button that is currently recording.
onLocaleChange(() => {
  if (isRecording()) paintRecordingState(recordingStatus());
});

// Leaving the page mid-take releases the encoder and the chunks it is holding.
// The file is lost - a download cannot be started from a page that is going
// away - but a take that is abandoned should not also leave a recorder running
// against a canvas that is about to be torn down.
window.addEventListener('pagehide', () => {
  if (isRecording()) stopRecording('user');
});

// --- Measurement tools --------------------------------------------------------
//
// The buttons only toggle state; every tool draws itself from the render loop
// and reads the world through the same transform the bodies are drawn with. See
// js/sandboxTools.js for why the handles are stored in world coordinates.

const stopwatchControls = document.getElementById('stopwatchControls');
const stopwatchLatchBtn = document.getElementById('stopwatchLatch');

/** Push the tools' state back onto their buttons. */
const syncToolButtons = () => {
  const pairs = [
    ['toggleRuler', 'ruler'],
    ['toggleProtractor', 'protractor'],
    ['toggleStopwatch', 'stopwatch'],
  ];
  for (const [id, name] of pairs) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', String(isToolActive(name)));
  }
  if (stopwatchControls) stopwatchControls.hidden = !isToolActive('stopwatch');
  if (stopwatchLatchBtn) {
    stopwatchLatchBtn.setAttribute('aria-pressed', String(!!stopwatchTarget()));
  }
};

const wireToolToggle = (id, name) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.onclick = () => {
    toggleTool(name, canvas);
    syncToolButtons();
  };
};
wireToolToggle('toggleRuler', 'ruler');
wireToolToggle('toggleProtractor', 'protractor');
wireToolToggle('toggleStopwatch', 'stopwatch');

const wireStopwatch = (id, fn) => {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = () => {
      fn();
      syncToolButtons();
    };
  }
};
wireStopwatch('stopwatchMark', () => {
  // A manual mark takes the clock off the latch: the two would otherwise both
  // be resetting the same interval and the reading would be whichever fired
  // last, which is not a measurement of anything.
  latchStopwatchTo(null);
  stopwatch().mark();
});
wireStopwatch('stopwatchStop', () => stopwatch().stop());
wireStopwatch('stopwatchReset', () => {
  latchStopwatchTo(null);
  stopwatch().reset();
});
wireStopwatch('stopwatchLatch', () => {
  if (stopwatchTarget()) {
    latchStopwatchTo(null);
    stopwatch().reset();
    return;
  }
  const selected = state.selectedObject && state.selectedObject.object;
  if (!selected) {
    toast(t('stopwatch.needBody'));
    return;
  }
  stopwatch().reset();
  latchStopwatchTo(selected);
});
syncToolButtons();

// Object type cycling functionality
document.getElementById('objectTypeBtn').onclick = () => {
  currentTypeIndex = (currentTypeIndex + 1) % objectTypes.length;
  updateObjectTypeButton();
};

document.getElementById('objectTypeBtn').addEventListener('contextmenu', e => {
  e.preventDefault();
  currentTypeIndex =
    (currentTypeIndex - 1 + objectTypes.length) % objectTypes.length;
  updateObjectTypeButton();
});

// Mobile instructions close button
document.getElementById('closeMobileInstructions').onclick = () => {
  document.getElementById('mobileInstructions').style.display = 'none';
};
// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const uiRail = document.querySelector('.ui-container');

// The narrow-screen menu used to be a second copy of the control rail: parallel
// markup with `mobile*` ids and ~260 lines of duplicated handlers, including a
// divergent scenario list that skipped the HTML sanitising the desktop one did.
// The hamburger now opens the rail itself, so there is one set of controls and
// one set of behaviors at every width.
if (mobileMenuToggle && uiRail) {
  const closeRail = () => {
    mobileMenuToggle.classList.remove('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    uiRail.classList.remove('is-open');
  };

  mobileMenuToggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = uiRail.classList.toggle('is-open');
    mobileMenuToggle.classList.toggle('active', open);
    mobileMenuToggle.setAttribute('aria-expanded', String(open));
  });

  // Any control in the rail dismisses the menu once it has run.
  uiRail.addEventListener('click', e => {
    if (e.target.closest('button') && uiRail.classList.contains('is-open')) {
      closeRail();
    }
  });

  document.addEventListener('click', e => {
    if (!uiRail.classList.contains('is-open')) return;
    if (mobileMenuToggle.contains(e.target) || uiRail.contains(e.target))
      return;
    closeRail();
  });

  window.addEventListener('gravitasEscape', closeRail);
}

// Scenario info box close button
const closeScenarioInfoBtn = document.getElementById('closeScenarioInfo');
if (closeScenarioInfoBtn) {
  // Add multiple event listeners to ensure it works
  closeScenarioInfoBtn.addEventListener('click', e => {
    debugLog('Close scenario info button clicked');
    e.preventDefault();
    e.stopPropagation();
    const infoBox = document.getElementById('scenarioInfoBox');
    if (infoBox) {
      debugLog('Removing showUI class from scenario info box');
      debugLog('Before removal - classes:', infoBox.className);
      infoBox.classList.remove('showUI');
      infoBox.classList.remove('show'); // Also remove show class for compatibility
      debugLog('After removal - classes:', infoBox.className);
    } else {
      console.error('Scenario info box element not found');
    }
  });

  // Also add mousedown event as backup
  closeScenarioInfoBtn.addEventListener('mousedown', e => {
    debugLog('Close scenario info button mousedown');
    e.preventDefault();
    e.stopPropagation();
    const infoBox = document.getElementById('scenarioInfoBox');
    if (infoBox) {
      debugLog('Removing showUI class from scenario info box (mousedown)');
      infoBox.classList.remove('showUI');
      infoBox.classList.remove('show'); // Also remove show class for compatibility
    }
  });
} else {
  console.error('Close scenario info button not found');
}

/**
 * Load a built-in scenario by its SCENARIO_INFO key.
 *
 * The one authoritative way to switch scenario from the UI. The scenario
 * browser and the welcome screen's featured gallery both call this, so the two
 * cannot drift: an unknown key is refused in one place, the rebuild happens in
 * one place, and the readouts that depend on the new world are refreshed in one
 * place.
 *
 * @param {string} key - A key of SCENARIO_INFO
 * @returns {boolean} True if the scenario existed and was loaded
 */
export function loadScenarioByKey(key) {
  if (!key || !SCENARIO_INFO[key]) {
    console.warn(`Unknown scenario key: ${key}`);
    return false;
  }
  SETTINGS.preset_scenario = key;
  // The rebuild raises the scenario card itself, through apply_preset, so this
  // must not call show_enhanced_scenario_info() as well: a second call stacks a
  // second 18-second auto-hide timer on the same element.
  initialize_simulation();
  // The small transient readout over the canvas. It refuses to fire before the
  // user has interacted and in the first few hundred frames, which is what
  // keeps it off the screen during start-up.
  show_scenario_info();
  updateSpeedDisplay();
  return true;
}

// The scenario gallery lives in js/scenarioBrowser.js. It renders the catalog,
// the concept chips and the search, and calls loadScenarioByKey() above when a
// card is chosen. It used to be built inline here, which put four hundred lines
// of list markup in the middle of the simulation module.

// Validation function for scenario data
const validateScenarioData = () => {
  const issues = [];

  Object.entries(SCENARIO_INFO).forEach(([key, info]) => {
    if (!info || typeof info !== 'object') {
      issues.push(`Invalid scenario object for key: ${key}`);
      return;
    }

    if (!info.title || typeof info.title !== 'string') {
      issues.push(`Missing or invalid title for scenario: ${key}`);
    }

    if (!info.summary || typeof info.summary !== 'string') {
      issues.push(`Missing or invalid summary for scenario: ${key}`);
    }

    if (info.title && info.title.length > 100) {
      issues.push(
        `Title too long for scenario: ${key} (${info.title.length} chars)`
      );
    }

    if (info.summary && info.summary.length > 500) {
      issues.push(
        `Summary too long for scenario: ${key} (${info.summary.length} chars)`
      );
    }

    // The gallery browses by concept and shows a picture, so a scenario with
    // no tags is unreachable through the chips and one with no thumbnail shows
    // a placeholder. Neither is fatal, which is why this warns rather than
    // throwing: a scenario added before its thumbnail is captured should still
    // load and still be searchable.
    if (!Array.isArray(info.tags) || info.tags.length === 0) {
      issues.push(`No concept tags for scenario: ${key}`);
    } else {
      const seen = new Set();
      for (const tag of info.tags) {
        if (!SCENARIO_TAGS[tag]) {
          issues.push(`Unknown tag "${tag}" on scenario: ${key}`);
        }
        if (seen.has(tag)) {
          issues.push(`Duplicate tag "${tag}" on scenario: ${key}`);
        }
        seen.add(tag);
      }
      if (info.tags.length > 4) {
        issues.push(
          `Too many tags on scenario: ${key} (${info.tags.length}); the card shows three`
        );
      }
    }

    if (!info.thumbnail || typeof info.thumbnail !== 'string') {
      issues.push(`No thumbnail path for scenario: ${key}`);
    }
  });

  if (issues.length > 0) {
    console.warn('Scenario data validation issues:', issues);
  } else {
    debugLog('All scenario data validated successfully');
  }

  return issues.length === 0;
};

// Run validation on page load
document.addEventListener('DOMContentLoaded', () => {
  validateScenarioData();
});

// Touch event handlers for mobile
canvas.addEventListener(
  'touchstart',
  e => {
    // Only call preventDefault if necessary (e.g., for custom drag/zoom)
    if (e.touches.length === 1) {
      e.preventDefault(); // Required to prevent scrolling during drag/zoom
    }
    const touchCount = e.touches.length;

    // Mark that user has interacted with the page
    state.user_has_interacted = true;

    if (touchCount === 1) {
      const touch = e.touches[0];
      const touchStartPos = { x: touch.clientX, y: touch.clientY };

      // Was: a bounding-box test against .ui-container. On mobile that element
      // is the closed menu - still laid out, just visibility:hidden - so its
      // 340x697 rect swallowed 78% of the screen and the canvas was mostly
      // untouchable. elementFromPoint only reports what is actually hit-
      // testable, so a hidden panel no longer blocks anything.
      const hit = document.elementFromPoint(touchStartPos.x, touchStartPos.y);
      if (
        hit &&
        hit !== canvas &&
        hit.closest(
          'button, input, select, a, [role="dialog"], .ui-container, #overlay, .timeline-bar'
        )
      ) {
        return;
      }

      state.touch_active = true;
      state.touch_id = touch.identifier;

      // Check for object interaction
      const worldPos = screen_to_world(touchStartPos);
      const clickedObject = findObjectAtPosition(worldPos);

      if (clickedObject) {
        // Always show inspector when touching an object
        showObjectInspector(clickedObject.object, clickedObject.type);
        return;
      }

      // Only close inspector if we touched empty space
      if (state.inspector_open && !clickedObject) {
        hideObjectInspector();
        return;
      }

      // A fresh touch must not inherit the previous one's position, or the
      // first move jumps by the distance between them.
      state.lastTouchPos = touchStartPos;

      if (SETTINGS.interactive_add) {
        if (!isFinite(worldPos.x) || !isFinite(worldPos.y)) {
          console.warn('Invalid world coordinates:', worldPos);
          return;
        }

        // Touch drag pans, the way every map behaves. Placement is armed by a
        // long press instead - previously a single finger could only ever
        // place an object, so the view could not be panned at all on a phone.
        state.touchHoldTimer = setTimeout(() => {
          if (!state.touch_active) return;
          state.adding_mass = true;
          state.isDragging = true;
          state.add_start_screen = touchStartPos;
          state.add_start_world = worldPos;
          state.dragStart = { ...worldPos };
          state.dragCurrent = { ...worldPos };
          if (navigator.vibrate) navigator.vibrate(12);
          window.dispatchEvent(new CustomEvent('gravitasPlacementArmed'));
        }, LONG_PRESS_MS);
      }
    }
  },
  { passive: false } // passive: false is required because we call preventDefault for custom drag/zoom
);

canvas.addEventListener(
  'touchmove',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;

    if (touchCount === 1 && state.touch_active) {
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };

      // Moving means this is a drag, not a hold: cancel the pending arm.
      if (state.touchHoldTimer && !state.adding_mass) {
        const moved = Math.hypot(
          currentPos.x - (state.add_start_screen?.x ?? currentPos.x),
          currentPos.y - (state.add_start_screen?.y ?? currentPos.y)
        );
        if (moved > 10) {
          clearTimeout(state.touchHoldTimer);
          state.touchHoldTimer = null;
        }
      }

      if (state.adding_mass) {
        state.dragCurrent = screen_to_world(currentPos);
        updateOrbitHelper(false);
      } else {
        // Pan the view
        const deltaX = currentPos.x - (state.lastTouchPos?.x || currentPos.x);
        const deltaY = currentPos.y - (state.lastTouchPos?.y || currentPos.y);
        state.pan.x += deltaX;
        state.pan.y += deltaY;
      }

      state.lastTouchPos = currentPos;
    } else if (touchCount === 2) {
      // A second finger cancels placement and switches to pinch-zoom.
      if (state.touchHoldTimer) {
        clearTimeout(state.touchHoldTimer);
        state.touchHoldTimer = null;
      }
      state.adding_mass = false;
      state.isDragging = false;
      // Pinch zoom handling
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (state.lastTouchDistance > 0) {
        const zoomFactor = currentDistance / state.lastTouchDistance;

        // Limit the zoom factor per frame to prevent excessive zooming
        // Was clamped to +/-5% per frame, which made pinching feel like it
        // barely responded. A wider clamp still guards against a jump if a
        // touch is momentarily lost.
        const limitedZoomFactor = Math.max(0.7, Math.min(zoomFactor, 1.4));

        const oldZoom = state.zoom;
        let newZoom = oldZoom * limitedZoomFactor;
        newZoom = Math.max(0.01, Math.min(newZoom, 100));

        // Zoom towards the center of the two touches
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        // Get the world position at the center of the pinch
        const worldPos = screen_to_world({ x: centerX, y: centerY });

        // Update zoom
        state.zoom = newZoom;

        // Calculate where the center point should be on screen with the new zoom
        const newScreenPos = worldToScreen(worldPos, state, canvas);

        // Calculate the difference and adjust pan to keep the pinch center fixed
        const deltaX = newScreenPos.x - centerX;
        const deltaY = newScreenPos.y - centerY;

        state.pan.x -= deltaX;
        state.pan.y -= deltaY;
      }

      state.lastTouchDistance = currentDistance;
    }
  },
  // Must be non-passive: this handler calls preventDefault to stop the page
  // rubber-banding while you drag the simulation. As a passive listener the
  // call was silently ignored.
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;

    if (touchCount === 0) {
      if (state.adding_mass) {
        // Add object with velocity
        const touch = e.changedTouches[0];
        const add_end_world = screen_to_world({
          x: touch.clientX,
          y: touch.clientY,
        });

        // Validate both start and end world coordinates
        if (
          isNaN(add_end_world.x) ||
          isNaN(add_end_world.y) ||
          !isFinite(add_end_world.x) ||
          !isFinite(add_end_world.y) ||
          isNaN(state.add_start_world.x) ||
          isNaN(state.add_start_world.y) ||
          !isFinite(state.add_start_world.x) ||
          !isFinite(state.add_start_world.y)
        ) {
          console.warn(
            'Invalid world coordinates during touch object placement:',
            {
              start: state.add_start_world,
              end: add_end_world,
            }
          );
          return;
        }

        const vel = {
          x: (add_end_world.x - state.add_start_world.x) * 3,
          y: (add_end_world.y - state.add_start_world.y) * 3,
        };
        const type = SETTINGS.input_object_type;
        let new_obj;
        if (type === 'Planet') new_obj = new Planet(state.add_start_world, vel);
        else if (type === 'Star')
          new_obj = new StarObject(state.add_start_world, vel);
        else if (type === 'Asteroid')
          new_obj = new Asteroid(state.add_start_world, vel);
        else if (type === 'GasGiant')
          new_obj = new GasGiant(state.add_start_world, vel);
        else if (type === 'NeutronStar')
          new_obj = new NeutronStar(state.add_start_world, vel, null, null);
        else if (type === 'WhiteDwarf')
          new_obj = new WhiteDwarf(state.add_start_world, vel);
        else if (type === 'Comet')
          new_obj = new Comet(state.add_start_world, vel);
        else if (type === 'BlackHole') {
          const randomMass = generateRandomBlackHoleMass();
          new_obj = new BlackHole(state.add_start_world, randomMass, vel, true);
        }

        // Comet first, and else-if throughout: this had the same defect as the
        // mouse path, pushing hand-placed comets into `asteroids`.
        if (new_obj instanceof Comet) comets.push(new_obj);
        else if (new_obj instanceof Planet) planets.push(new_obj);
        else if (new_obj instanceof StarObject) stars.push(new_obj);
        else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
        else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
        else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
        else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
        else if (new_obj instanceof BlackHole) bh_list.push(new_obj);

        if (new_obj) {
          window.dispatchEvent(
            new CustomEvent('gravitasObjectPlaced', {
              detail: { object: new_obj },
            })
          );
        }

        state.adding_mass = false;
        state.isDragging = false;
        state.orbit_helper.preview = null;
      }

      state.touch_active = false;
      state.touch_id = null;
      state.lastTouchPos = null;
    }

    // Reset the pinch baseline whenever fewer than two fingers remain, or
    // lifting one finger of a pinch makes the next one jump.
    if (touchCount < 2) state.lastTouchDistance = 0;

    if (state.touchHoldTimer) {
      clearTimeout(state.touchHoldTimer);
      state.touchHoldTimer = null;
    }
  },
  { passive: false }
);

// Export functions and variables
export {
  showObjectInspector,
  hideObjectInspector,
  getBlackHoleInfo,
  getStarInfo,
  getPlanetInfo,
  getGasGiantInfo,
  getAsteroidInfo,
  getNeutronStarInfo,
  getWhiteDwarfInfo,
  showBHMassesModal,
  hideBHMassesModal,
  show_scenario_info,
  show_enhanced_scenario_info,
  apply_preset,
  initialize_simulation,
  buildSettingsMenu,
  save_simulation_state,
  load_simulation_state,
  setAreaSweepWedges,
  getAreaSweepWedges,
  showAreaSweepFor,
  setAreaSweepSuppressed,
  isAreaSweepSuppressed,
  checkAreaSweepValidity,
  captureShareState,
  applyShareState,
  markWorldTouched,
  setInspectorSuppressed,
  updateSpeedDisplay,
  takeScreenshot,
  updateObjectTypeButton,
  setupOverlayMinimize,
  SETTINGS,
  state,
  current_scenario_name,
  DEFAULT_SETTINGS,
  localSettings,
};
// Tutorial lives in js/tutorial.js - see initTutorial(), wired from main.js.

// Helper: Ensure no two objects are initialized within a minimum separation distance
// Removed unused ensureMinSeparation helper

// Helper: Place an object with minimum separation, retrying up to maxTries
// (Removed unused placeWithSeparation helper)

// Helper: Get tooltip text for object properties
function getStatTooltip(statLabel, _objectType) {
  const tooltips = {
    Mass: 'Total mass. Determines gravitational strength and orbital dynamics.',
    Radius: 'Physical size. Affects collision detection and visual appearance.',
    Position: 'Current location in simulation space (x, y coordinates).',
    Velocity:
      'Speed and direction of movement. Determines kinetic energy and trajectory.',
    Speed: 'Magnitude of velocity (how fast the object is moving).',
    Distance: 'Distance from center of simulation or reference point.',
    'Orbital Period': 'Time for one complete orbit around primary object.',
    'Escape Velocity':
      'Minimum speed needed to escape gravitational influence.',
    'Surface Gravity': "Gravitational acceleration at object's surface.",
    Density: 'Mass per unit volume. Determines how compact the object is.',
    Temperature: 'Surface temperature (for stars and some planets).',
    'Surface Temperature':
      "Temperature at star's surface. Determines color and spectral type.",
    Luminosity: 'Total energy output per second (for stars).',
    Age: 'How long the object has existed in simulation.',
    'Life Expectancy': 'Estimated remaining lifetime (for stars).',
    Lifespan:
      'Total expected lifetime of the star. More massive stars live shorter lives.',
    'Spectral Type':
      'Star classification (O, B, A, F, G, K, M). Based on temperature and color.',
    'Event Horizon':
      'Boundary around black hole from which nothing can escape.',
    'Schwarzschild Radius':
      'Event horizon radius. Point of no return where escape velocity equals light speed.',
    'Escape Velocity at Rs':
      'Escape speed at Schwarzschild radius. Always equals light speed (100%).',
    'Average Density':
      'Mass per volume within event horizon. Extremely high density.',
    'Hawking Temperature':
      'Temperature of Hawking radiation. Smaller black holes are hotter.',
    'Hawking Lifetime':
      'Time until complete evaporation via Hawking radiation. Larger holes live longer.',
    'ISCO Period':
      'Orbital period at Innermost Stable Circular Orbit (3x Schwarzschild radius).',
    Type: 'Classification: Primordial, Stellar-Mass, Intermediate, or Supermassive.',
    'Accretion Rate': 'Rate at which matter falls into a black hole.',
    Spin: 'Rotational angular momentum of the object.',
    'Magnetic Field': "Strength of the object's magnetic field.",
    Atmosphere: 'Presence and composition of gaseous envelope.',
    Composition: "Chemical makeup of the object's material.",
    'Trail Length':
      "Number of positions recorded in the object's motion trail.",
    'Collision Count': 'Number of times this object has collided with others.',
    Energy: 'Total mechanical energy (kinetic + potential).',
    'Angular Momentum': "Rotational momentum around the object's axis.",
    'Tidal Force': 'Gravitational force gradient across the object.',
    'Roche Limit':
      'Distance at which tidal forces would break apart the object.',
    'Hill Sphere':
      "Region where the object's gravity dominates over other bodies.",
  };

  return tooltips[statLabel] || null;
}

document.addEventListener('DOMContentLoaded', () => {
  const cleanSimBtn = document.getElementById('cleanSimBtn');
  if (cleanSimBtn) {
    cleanSimBtn.onclick = () => {
      // Clear all simulation objects and arrays
      bh_list.length = 0;
      planets.length = 0;
      stars.length = 0;
      gas_giants.length = 0;
      asteroids.length = 0;
      comets.length = 0;
      neutron_stars.length = 0;
      white_dwarfs.length = 0;
      debris.length = 0;
      particles.length = 0;
      gravity_ripples.length = 0;
      accretion_disk_particles.length = 0;
      particlePool.clear && particlePool.clear();
      resetPhysicsObjectCounter && resetPhysicsObjectCounter();
      resetFrame();
      resetTrailTick();

      // Reset view to default
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };

      // Hide inspector and scenario info
      hideObjectInspector && hideObjectInspector();
      const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
      if (scenarioInfoDiv) scenarioInfoDiv.classList.remove('visible');

      // Set scenario to 'None' and update settings
      SETTINGS.preset_scenario = 'None';
      current_scenario_name = 'None';

      // Unpause simulation and set normal speed
      state.paused = false;
      SETTINGS.sim_speed = 1.0;

      // Redraw background/starfield if needed
      if (typeof generateStarfield === 'function') generateStarfield();

      // Optionally update UI overlays
      if (typeof show_scenario_info === 'function') show_scenario_info();
    };
  }
});
