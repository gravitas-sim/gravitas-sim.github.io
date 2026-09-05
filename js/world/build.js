// =============================================================================
// World construction
// -----------------------------------------------------------------------------
// Everything that turns a scenario key into a populated world: the generic
// population and placement pass, the momentum balance that follows it, and the
// per-scenario special cases that build a system by hand because its geometry
// has to be exact.
//
// This was the largest single thing in js/ui.js. It is here instead because it
// is not user interface: it reads settings, writes bodies into the engine's
// arrays and returns. The only reasons it ever needed the UI module were a
// handful of callbacks - hiding the inspector, repainting the scenario card -
// and those now arrive explicitly through the context object rather than by
// closing over module state.
//
// Two invariants this module must not break, both of which other code depends
// on and neither of which is local:
//
//   Determinism. The whole build runs inside withSeed() in the caller, so it
//   must stay synchronous. An await here would let the seeded generator be
//   consumed by something else between draws and a shared link would stop
//   rebuilding its own world.
//
//   Identity. Bodies are created in a fixed order and their ids come from a
//   counter that restarts with the world. Lessons match bodies across runs by
//   id and index, so creating one body earlier or later is a behaviour change
//   even when the resulting picture is identical. e2e/worldConstruction.spec.js
//   pins this for all 53 scenarios.
// =============================================================================

import {
  EARTH_MASSES_PER_JUPITER_MASS,
  JUPITER_MASSES_PER_SOLAR_MASS,
} from '../constants.js';
import { haloEnclosedMass } from '../darkMatter.js';
import { HD209458 } from '../data/exoplanetSystems.js';
import { TRAPPIST1_PLANETS, TRAPPIST1_STAR } from '../data/trappist1.js';
import {
  Asteroid,
  BlackHole,
  Comet,
  EARTH_MASS_UNIT,
  Galaxy,
  GasGiant,
  JUPITER_MASS_UNIT,
  NeutronStar,
  Planet,
  SOLAR_MASS_UNIT,
  StarObject,
  WhiteDwarf,
  accretion_disk_particles,
  asteroids,
  bh_list,
  clearAllEnergyHistory,
  comets,
  debris,
  galaxies,
  gas_giants,
  getMostMassiveBody,
  gravity_ripples,
  neutron_stars,
  particlePool,
  particles,
  planets,
  resetPhysicsObjectCounter,
  resetTrailTick,
  setStateReference,
  stars,
  syncReportedMass,
  updatePhysicsSettings,
  white_dwarfs,
} from '../physics.js';
import { resetFrame } from '../referenceFrame.js';
import {
  GALILEAN,
  balance,
  galileanBodies,
  plutoBodies,
  trojanBodies,
} from '../resonance/systems.js';
import { applyPresetLayout } from '../scenarios.js';
import { populationCaps } from '../quality.js';
import { SIM_UNITS_PER_AU } from '../units.js';

/**
 * What world construction needs from the UI module.
 *
 * Deliberately small, and deliberately all callbacks rather than values: the
 * settings object is replaced wholesale when a saved state loads, and the
 * scenario name and the pending share-link settings are UI-owned mutable
 * bindings that this module reads once and hands back.
 *
 * @typedef {object} WorldBuildContext
 * @property {object} settings - The live settings object, mutated in place
 * @property {object} state - The shared UI state object
 * @property {() => void} applyPreset - Reset settings to the scenario's own
 * @property {() => (object|null)} takePendingSettings - Share-link settings, once
 * @property {(name: string) => void} setScenarioName - Record what was built
 * @property {() => void} hideObjectInspector - Close the inspector before rebuild
 * @property {(key: string) => void} showScenarioInfo - Repaint the scenario card
 * @property {() => void} updateObjectTypeButton - Sync the insertion-type button
 * @property {(obj: object, wedges?: number) => object} computeAreaSweep
 * @property {() => boolean} isAreaSweepSuppressed
 */

// The Kuiper Belt scenario's schematic radial ladder: eight named objects,
// evenly spaced, ordered by real semi-major axis. See the scenario block below
// for why the spacing is not linear in AU.
const KUIPER_LADDER_INNER = 200;
const KUIPER_LADDER_STEP = 20;

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
export const zeroNetMomentum = () => {
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
 * Apply preset scenario settings to the simulation
 * @param {Object} settings_dict - Settings object to modify with preset values
 */

export const applyPlacement = (SETTINGS, current_scenario_name) => {
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
      // The keep-out floor has to move the whole ring stack outwards, not clamp
      // each ring to it. atLeastKeepOut() is a Math.max, and a central black
      // hole heavy enough to push the floor past the inner rings collapsed them
      // onto a single circle: with twenty objects per ring the angles repeat, so
      // object i and object i+20 landed on exactly the same point. Four
      // scenarios shipped with twenty perfectly superimposed pairs each -
      // Sagittarius A*, Galactic Center, Galactic Collision and Tidal Arm Tango
      // - and the contact test in physics.js skips a pair at zero separation,
      // so they stayed stacked and drew as one body forever.
      //
      // Spacing the rings from whichever is larger of the first ring and the
      // floor keeps every ring distinct. It is identical to the old arithmetic
      // whenever the floor sits inside the first ring, which is every scenario
      // that was already correct.
      const innerRing = Math.max(spread * 0.3, keepOut);
      all_objects.forEach((obj, i) => {
        const ring = Math.floor(i / 20); // 20 objects per ring
        const angle = ((i % 20) / 20) * 2 * Math.PI;
        const radius = innerRing + ring * spread * 0.2;
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
      // A quarter-cell nudge, because one cell of a grid centred on the origin
      // lands exactly on it - and the origin is where the central body is
      // pinned. Slingshot Gauntlet shipped with an asteroid at (0, 0) sitting
      // inside its own black hole; the contact test in physics.js skips a pair
      // at zero separation, so the two stayed superimposed and drew as one.
      // (col - grid_size / 2) * spacing is always a multiple of half a cell, so
      // a quarter cell can never sum to zero whatever the grid size.
      const nudge = spacing * 0.25;
      all_objects.forEach((obj, i) => {
        const row = Math.floor(i / grid_size);
        const col = i % grid_size;
        obj.pos.x = (col - grid_size / 2) * spacing + nudge;
        obj.pos.y = (row - grid_size / 2) * spacing + nudge;
        // And nothing inside the central body, the same rule the other three
        // placements follow through atLeastKeepOut.
        const r = Math.hypot(obj.pos.x, obj.pos.y);
        if (keepOut > 0 && r < keepOut) {
          const scale = keepOut / r;
          obj.pos.x *= scale;
          obj.pos.y *= scale;
        }

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
 * Initialize the physics simulation with current settings
 * Creates all physics objects and applies initial conditions
 */
export const buildWorld = ctx => {
  const {
    settings: SETTINGS,
    state,
    applyPreset: apply_preset,
    takePendingSettings,
    setScenarioName,
    hideObjectInspector,
    showScenarioInfo: show_enhanced_scenario_info,
    updateObjectTypeButton,
    computeAreaSweep,
    isAreaSweepSuppressed,
    regenerateStarfield,
  } = ctx;

  // Set the state reference in physics.js to ensure single source of truth
  setStateReference(state);

  const starting_preset = SETTINGS.preset_scenario;
  apply_preset();

  // Settings carried in a shared link land here rather than before the call,
  // because apply_preset() has just reset everything to the scenario's own
  // defaults and would have wiped them.
  const pendingSettingsOverride = takePendingSettings();
  if (pendingSettingsOverride) {
    Object.assign(SETTINGS, pendingSettingsOverride);
  }

  setScenarioName(starting_preset);

  // The low quality tier's population caps, applied here because this is the
  // only moment the counts mean anything: they are read once, while the world
  // is generated, and never again.
  //
  // Only the generic populations, and only for scenarios that use the generic
  // generator at all. A scenario with placement 'Empty' places every body by
  // hand - the resonance systems, TRAPPIST-1, the galaxy discs - and there the
  // body count is the physics. A Laplace resonance missing one of its three
  // moons is not a cheaper version of the lesson, it is a wrong one, so those
  // are left at full population and pay for it in frame rate instead.
  //
  // Applied as a read-time override, never written back.
  //
  // The first version of this assigned the caps into the live SETTINGS, on the
  // reasoning that the generator reads these keys in many places. It reads them
  // in nineteen, and the write was actively harmful: SETTINGS is the reader's
  // own document. It is what a share link serialises, what a saved state
  // restores and what the A/B bench hashes to decide whether two runs differ.
  // Writing a cap into it meant a teacher on a slow laptop silently exported
  // num_asteroids: 40 to a class on faster machines, and meant the bench could
  // report a difference between two runs that differed only in frame rate.
  //
  // The tier may spend fewer pixels and draw fewer bodies. It may not edit the
  // document.
  const caps = populationCaps();
  const capped = caps && SETTINGS.placement !== 'Empty' ? caps : null;

  /**
   * A generic population count, reduced to fit the current quality tier.
   *
   * @param {string} key - A num_* settings key
   * @returns {number} The count to actually build
   */
  const pop = key =>
    capped && typeof SETTINGS[key] === 'number' && SETTINGS[key] > capped[key]
      ? capped[key]
      : SETTINGS[key];

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
  if (pop('num_stars')) {
    for (let i = stars.length; i < pop('num_stars'); i++) {
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
  for (let i = 0; i < pop('num_planets'); i++) {
    planets.push(new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add gas giants
  for (let i = 0; i < pop('num_gas_giants'); i++) {
    gas_giants.push(new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }));
  }

  // Add asteroids
  if (SETTINGS.enable_asteroids) {
    for (let i = 0; i < pop('num_asteroids'); i++) {
      asteroids.push(new Asteroid({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Add comets
  if (pop('num_comets')) {
    for (let i = 0; i < pop('num_comets'); i++) {
      comets.push(new Comet({ x: 0, y: 0 }, { x: 0, y: 0 }));
    }
  }

  // Apply placement patterns to position objects
  applyPlacement(SETTINGS, starting_preset);

  // The micro-star cloud.
  //
  // `num_micro_stars`, `micro_star_mass` and `micro_star_high_velocity` have
  // been in DEFAULT_SETTINGS and set by the Kessler Cascade preset all along,
  // with a comment promising they were "handled in initialization". Nothing
  // read them. The scenario's card promises "hundreds of micro-stars orbiting
  // chaotically, colliding and ejecting like a debris cloud" and what it built
  // was a single black hole in an empty sky - which is what its committed
  // thumbnail shows.
  //
  // Keyed on the setting rather than on the scenario name, because that is what
  // the setting already claimed to mean, and generated after apply_placement so
  // the cloud is positioned by this block rather than scattered by the generic
  // one.
  if (pop('num_micro_stars') > 0) {
    const G = SETTINGS.gravitational_constant;
    const gravitating = [
      ...bh_list,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
    ];
    const central = gravitating.length ? getMostMassiveBody(gravitating) : null;
    // Clear of the central body's drawn radius, using the same 2.5x keep-out
    // factor apply_placement works to, and four times that deep so the swarm
    // reads as a cloud rather than a ring.
    const inner = Math.max(40, (central?.radius || 0) * 2.5);
    const outer = inner * 4;
    const count = Math.min(600, Math.floor(pop('num_micro_stars')));

    for (let i = 0; i < count; i++) {
      // A filled annulus: sqrt on the radius so the area density is even
      // rather than piling everything against the inner edge.
      const r = Math.sqrt(
        inner * inner + Math.random() * (outer * outer - inner * inner)
      );
      const theta = Math.random() * 2 * Math.PI;
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };

      const vCirc = central ? Math.sqrt((G * central.mass) / r) : 0;
      // The cascade needs orbits that cross. A pure circular disc never
      // collides; scattering the speed is what makes this a debris cloud
      // rather than a ring, and the setting says so by name.
      const scatter = SETTINGS.micro_star_high_velocity ? 0.3 : 0.12;
      const speed = vCirc * (1 + (Math.random() - 0.5) * 2 * scatter);
      const drift = (Math.random() - 0.5) * 2 * scatter * vCirc;
      const vel = {
        x: (-pos.y / r) * speed + (pos.x / r) * drift,
        y: (pos.x / r) * speed + (pos.y / r) * drift,
      };

      const micro = new StarObject(pos, vel, SETTINGS.micro_star_mass);
      micro.mass = SETTINGS.micro_star_mass * SOLAR_MASS_UNIT;
      micro.massInSuns = SETTINGS.micro_star_mass;
      micro.radius = 1.2;
      stars.push(micro);
    }
  }

  // The slingshot test star.
  //
  // Slingshot Gauntlet sets init_velocity and velocity_stddev to zero and asks
  // for one star, so every body in it - the star, fifteen planets, two gas
  // giants and ten asteroids - was placed at rest and fell straight into the
  // nearest of the five holes. Its card promises "a fast-moving star fired
  // through a black hole obstacle course"; what it built was a scenario in
  // which nothing was fired and nothing slingshotted.
  //
  // `test_star_slingshot` has been in DEFAULT_SETTINGS and set by that preset
  // all along, next to a comment saying it was "handled in initialization".
  // This is that handling.
  if (SETTINGS.test_star_slingshot && stars.length > 0) {
    const holes = [...bh_list, ...neutron_stars, ...white_dwarfs];
    const totalMass = holes.reduce((sum, h) => sum + (h.mass || 0), 0);
    const field = Math.max(
      120,
      ...holes.map(h => Math.hypot(h.pos.x, h.pos.y) + (h.radius || 0))
    );
    // Enter from beyond the field, aimed across it and offset from dead centre
    // so the first hole deflects rather than swallows.
    const entry = field * 1.5;
    const star = stars[0];
    star.pos.x = -entry;
    // Offset from dead centre so the holes deflect it rather than eat it.
    star.pos.y = field * 0.35;
    // Fast enough to cross rather than fall in, slow enough to be turned hard.
    // Measured against the engine over a grid of speeds and impact parameters:
    // at 1.15x the circular speed of the whole cluster the star is swallowed on
    // the first pass, and at 2.8x it barely bends, turning nine to twenty-one
    // degrees. 1.6x threads it - closest approach 49 units, a 95 degree
    // deflection, and it leaves the field after about seventy-five simulated
    // seconds.
    const v =
      totalMass > 0
        ? 1.6 * Math.sqrt((SETTINGS.gravitational_constant * totalMass) / field)
        : 20;
    star.vel.x = v;
    star.vel.y = 0;
    // Nothing else in the scene is meant to be stationary either: a field of
    // motionless targets is not an obstacle course, it is a queue.
    for (const body of [...planets, ...gas_giants, ...asteroids]) {
      const r = Math.hypot(body.pos.x, body.pos.y);
      if (!(r > 0) || totalMass <= 0) continue;
      const vCirc = Math.sqrt(
        (SETTINGS.gravitational_constant * totalMass) / r
      );
      body.vel.x = (-body.pos.y / r) * vCirc;
      body.vel.y = (body.pos.x / r) * vCirc;
    }
  }

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
    for (let i = 0; i < pop('num_planets'); i++) {
      const r = 150 + i * 30; // Orbital radius around binary center
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      planets[i].pos = pos;
      planets[i].vel = vel;
    }

    // Add gas giants
    for (let i = 0; i < pop('num_gas_giants'); i++) {
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
      for (let i = 0; i < pop('num_asteroids'); i++) {
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
        i < Math.min(pop('num_asteroids'), realAsteroids.length);
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
    if (pop('num_comets')) {
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
        i < Math.min(pop('num_comets'), famousComets.length);
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
    for (let i = 0; i < pop('num_planets'); i++) {
      const r = 50 + i * 25;
      const theta = Math.random() * 2 * Math.PI;
      const v = Math.sqrt((SETTINGS.gravitational_constant * centralMass) / r);
      const pos = { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      const vel = { x: -v * Math.sin(theta), y: v * Math.cos(theta) };
      planets[i].pos = pos;
      planets[i].vel = vel;
    }

    // Position gas giants
    for (let i = 0; i < pop('num_gas_giants'); i++) {
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
      for (let i = 0; i < pop('num_asteroids'); i++) {
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
        i < Math.min(pop('num_asteroids'), smallKBOs.length);
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

  // --- Three-Body Sensitivity Lab: Lagrange's equilateral solution ----------
  //
  // Three equal stars at the corners of an equilateral triangle, rotating
  // rigidly about their common centre. This is an exact solution of the
  // three-body problem, found by Lagrange in 1772, and it is here because of
  // what Gascheau proved about it in 1843: the equilateral solution is stable
  // only when 27(m1m2 + m2m3 + m3m1) < (m1 + m2 + m3)^2. For three equal
  // masses that reads 81m^2 < 9m^2, which is false by a factor of nine, so this
  // configuration is linearly unstable.
  //
  // That is exactly what the lesson needs, and it is why this configuration was
  // chosen over the two more famous candidates:
  //
  //   The Pythagorean (Burrau) problem is the classic chaotic three-body
  //   system, and in Gravitas it merges. Its close approaches pass inside the
  //   collision radius, the engine removes a body, and an experiment whose
  //   divergence measure matches bodies by identity has nothing left to
  //   measure. Measured: a merger every time, under all three integrators.
  //
  //   The Chenciner-Montgomery figure eight is a three-body system that is not
  //   chaotic - which makes it a fine counterexample and a poor subject. Its
  //   separation grows by a factor of 230 over thirteen orbits and no more,
  //   the same under every integrator.
  //
  // The equilateral solution starts perfectly regular, stays clear of every
  // collision radius, and departs exponentially. Measured over nine
  // combinations of integrator and timestep, the e-folding time comes out at
  // 6.8 to 7.6 simulated seconds with r^2 >= 0.98, which is the numerical
  // resolution the lesson's conclusion rests on.
  //
  // The geometry, all of it derived rather than tuned:
  //
  //   circumradius  50 units = 0.5 AU
  //   side          50*sqrt(3) = 86.6 units = 0.866 AU
  //   mass          6000 units = 6 solar masses each
  //   omega         sqrt(G * 3m / L^3) = 0.2354 rad per simulated second
  //   period        2*pi/omega = 26.7 simulated seconds
  //
  // Theory predicts an e-folding time of sqrt(2)/omega = 6.0 s for the unstable
  // eigenvalue; the measured 6.9 s is 15% longer, which is what a finite
  // perturbation measured over a finite window gives and is worth a question in
  // the lesson rather than a fudge here.
  if (starting_preset === 'Three-Body Sensitivity Lab') {
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
    const R = 50;
    const MASS = 6 * SOLAR_MASS_UNIT;
    const side = R * Math.sqrt(3);
    const omega = Math.sqrt((G * 3 * MASS) / (side * side * side));

    // Named rather than numbered, because the lesson asks the student to
    // perturb one of them by name and the answer key has to be able to say
    // which. Fixed names, not generated ones: a randomly named star would
    // change what the lesson text has to say from one load to the next.
    const names = ['Alpha', 'Beta', 'Gamma'];
    const colors = ['#FFD86B', '#7FB2F0', '#F08A6B'];
    for (let i = 0; i < 3; i++) {
      const theta = (i * 2 * Math.PI) / 3;
      const x = R * Math.cos(theta);
      const y = R * Math.sin(theta);
      const star = new StarObject(
        { x, y },
        // Rigid rotation: v = omega x r.
        { x: -omega * y, y: omega * x },
        1
      );
      star.mass = MASS;
      star.massInSuns = 6;
      star.name = names[i];
      star.radius = 8;
      star.baseColor = colors[i];
      // Never culled and never randomly re-typed: the experiment depends on
      // these three objects keeping their identities for the whole run.
      star.persistent = true;
      stars.push(star);
    }
  }

  // --- The three resonance scenarios ----------------------------------------
  //
  // All three are built from js/resonance/systems.js, which holds the published
  // elements and the paper each came from. Nothing numeric is written here: the
  // scenario, the validation suite in tools/physics-checks.mjs and the unit
  // tests all read the same table, so they cannot quote different values for
  // the same moon.
  //
  // What this function contributes is the part only it can: turning a plain
  // {name, mass, radius, pos, vel} into a live engine object with a stable
  // identity, a fixed name and the persistence flag that keeps it out of the
  // cull. The lesson perturbs bodies by name and matches them across runs by
  // id, so a randomly generated or recycled body would break it.
  const installResonanceSystem = spec => {
    stars.length = 0;
    planets.length = 0;
    gas_giants.length = 0;
    asteroids.length = 0;
    comets.length = 0;
    bh_list.length = 0;
    neutron_stars.length = 0;
    white_dwarfs.length = 0;
    debris.length = 0;

    for (const d of [spec.primary, ...spec.bodies]) {
      let body;
      if (d.kind === 'star') {
        body = new StarObject(
          { ...d.pos },
          { ...d.vel },
          d.mass / SOLAR_MASS_UNIT
        );
        body.massInSuns = d.mass / SOLAR_MASS_UNIT;
        body.intact = true;
        stars.push(body);
      } else if (d.kind === 'gasGiant') {
        body = new GasGiant({ ...d.pos }, { ...d.vel }, 1);
        gas_giants.push(body);
      } else {
        body = new Planet({ ...d.pos }, { ...d.vel }, 1);
        planets.push(body);
      }
      body.mass = d.mass;
      // The constructors derive their display masses from the mass they were
      // handed, and every one of these bodies has its mass overwritten
      // afterwards. Without this the inspector reports Ganymede as one Earth
      // mass, which it inherited from the Planet constructor's default rather
      // than from anything true.
      body.mass = d.mass;
      body.massInSuns = d.mass / SOLAR_MASS_UNIT;
      body.massInEarths = d.mass / EARTH_MASS_UNIT;
      body.massInJupiters = d.mass / JUPITER_MASS_UNIT;
      body.name = d.name;
      body.radius = d.radius;
      body.baseColor = d.color;
      // Never culled, never re-typed, never merged: every measurement in the
      // lesson matches bodies between samples by identity.
      body.persistent = true;
    }
  };

  // Io, Europa, Ganymede and Callisto. The only scale model of the three, and
  // the reason is arithmetic rather than taste: Io orbits 0.28 length units
  // from Jupiter at true scale, which is smaller than the softening floor and a
  // twentieth of the radius Jupiter would be drawn at. Distances are multiplied
  // by GALILEAN.scale, which under Newtonian gravity is exactly equivalent to
  // dividing every duration by scale^1.5, and leaves every ratio alone.
  if (starting_preset === 'Galilean Resonance') {
    const spec = galileanBodies(SETTINGS.gravitational_constant);
    balance([spec.primary, ...spec.bodies]);
    installResonanceSystem(spec);
  }

  // The same four moons with Europa moved out by one percent. Everything else
  // is identical, which is the point: one number changes and the Laplace
  // argument stops librating and starts going round, once every forty-six Io
  // orbits. The resonance's half-width in Europa's semi-major axis is between
  // one and two parts in a thousand, so a percent is well outside it.
  if (starting_preset === 'Broken Laplace Resonance') {
    const spec = galileanBodies(SETTINGS.gravitational_constant, {
      detune: GALILEAN.detune,
    });
    balance([spec.primary, ...spec.bodies]);
    installResonanceSystem(spec);
  }

  // Pluto, Neptune and a body on a Pluto-like orbit that is not in the 3:2.
  // True scale, so every distance and period the interface reports is the real
  // one.
  if (starting_preset === 'Pluto and Neptune') {
    const spec = plutoBodies(SETTINGS.gravitational_constant);
    balance([spec.primary, ...spec.bodies]);
    installResonanceSystem(spec);
  }

  // The Sun, Jupiter and four test bodies on Jupiter's orbit. Built in the
  // circular restricted frame - both massive bodies turning about a barycentre
  // at the origin - because the triangular points are only exact in that frame.
  // Already balanced by construction, so no balance() call.
  if (starting_preset === 'Jupiter Trojans') {
    installResonanceSystem(trojanBodies(SETTINGS.gravitational_constant));
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
        if (data && !isAreaSweepSuppressed()) {
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

  // Handed in rather than imported. The starfield is a backdrop the renderer
  // draws, and importing it here made the world builder - which is engine -
  // depend on js/render.js, which is a feature. That single edge closed five
  // of the eleven import cycles the architecture check reported, because
  // js/render.js imports js/ui.js and js/ui.js imports this module.
  regenerateStarfield();
};
