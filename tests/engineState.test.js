// =============================================================================
// The engine's state module and the facade in front of it (D-DECOMP-18, S1)
// -----------------------------------------------------------------------------
// js/engine/state.js owns the body lists, the settings, the clocks and counters,
// the camera reference and the registries; js/physics.js re-exports them, so
// the 49 modules, 50 tests, 53 specs and 20 tools that import the engine did
// not change. What has to hold is that an importer's binding is the engine's
// binding: ES module bindings are live, a step that replaces a list is seen
// through every importer, and a name that left the facade would break a
// caller that nothing here imports. So the export list is pinned, and the
// bindings are compared with the state module's own after a step.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as physics from '../js/physics.js';
import * as engineState from '../js/engine/state.js';

const FACADE_EXPORTS = [
  'ABSORB_BUFFER',
  'ASTEROID_RADIUS',
  'AccretionDiskParticle',
  'Asteroid',
  'BH_RADIUS_BASE',
  'BlackHole',
  'CERES_MASS_UNIT',
  'Comet',
  'DEBRIS_MASS_UNIT',
  'DEBRIS_RADIUS',
  'DRAW_MIN_RADIUS_PX',
  'DT',
  'Debris',
  'EARTH_MASS_UNIT',
  'GALAXY_RADIUS',
  'GAS_GIANT_RADIUS',
  'GAS_GIANT_TO_STAR_THRESHOLD',
  'Galaxy',
  'GasGiant',
  'HALLEY_MASS_UNIT',
  'INTEGRATORS',
  'JUPITER_MASS_UNIT',
  'MASS_UNIT_KG',
  'MAX_STAR_MASS_BEFORE_BH',
  'MIN_INTERACTION_DISTANCE',
  'NEUTRON_STAR_RADIUS',
  'NOMINAL_RADIUS',
  'NeutronStar',
  'PLANET_RADIUS',
  'PhysicsObject',
  'PhysicsObject_id_counter',
  'Planet',
  'SOLAR_MASS_UNIT',
  'STAR_OBJ_RADIUS',
  'StarObject',
  'WHITE_DWARF_RADIUS',
  'WhiteDwarf',
  'absorb_into_black_hole',
  'accelerationBreakdown',
  'accretion_disk_particles',
  'activeIntegrator',
  'asteroids',
  'barycenterBodies',
  'bh_list',
  'bumpWorldGeneration',
  'calculateGravitationalPotentialEnergy',
  'calculateKineticEnergy',
  'calculateObjectEnergy',
  'calculateTotalPotentialEnergy',
  'check_stellar_collapse',
  'className',
  'clearAllEnergyHistory',
  'clearEnergyHistory',
  'clearObjectEnergyHistory',
  'comets',
  'conservationCaveats',
  'conservationDrift',
  'conservedQuantities',
  'currentTier',
  'debris',
  'defaultAppearance',
  'findObjectAtPosition',
  'galaxies',
  'gas_giants',
  'getAbsorbedSpinAngularMomentum',
  'getAllPhysicsObjects',
  'getDetailScale',
  'getDiscardedAbsorptionMomentum',
  'getEnergySystemMemoryStats',
  'getInterventionEpoch',
  'getMostMassiveBody',
  'getObjectEnergyHistory',
  'getObjectEnergyStats',
  'getPhysicsSetting',
  'getSimulationTime',
  'getTrailTick',
  'getWorldGeneration',
  'gravitational_acceleration',
  'gravitySourcesFor',
  'gravity_ripples',
  'gwaves',
  'handle_collisions',
  'handle_rocky_collisions',
  'handle_star_merging',
  'handle_star_object_collisions',
  'is_offscreen',
  'liveBodyCount',
  'minInteractionDistance',
  'neutron_stars',
  'noteIntervention',
  'onPhysicsStep',
  'particlePool',
  'particles',
  'physicsSettings',
  'planets',
  'registerBodyDrawers',
  'registerEffects',
  'resetAbsorptionAccounting',
  'resetConservationBaseline',
  'resetPhysicsObjectCounter',
  'resetSimulationTime',
  'resetTrailTick',
  'sampleTwoBodyOrbit',
  'screen_to_world',
  'setDetailScale',
  'setPhysicsObjectCounter',
  'setSimulationTime',
  'setStateReference',
  'simulation',
  'stars',
  'state',
  'stellarPropertiesFor',
  'syncReportedMass',
  'trailBudget',
  'trimAllEnergyHistory',
  'updateEnergyHistory',
  'updateEnergySystemConfig',
  'updatePhysics',
  'updatePhysicsSettings',
  'white_dwarfs',
  'world_to_screen',
];

describe('the physics facade', () => {
  test('exports exactly the names it exported before the state module', () => {
    expect(Object.keys(physics).sort()).toEqual(FACADE_EXPORTS);
  });

  test('every state name it exports is the state module own binding', () => {
    for (const name of Object.keys(engineState)) {
      if (name in physics) expect(physics[name]).toBe(engineState[name]);
    }
  });
});

describe('importers hold live bindings', () => {
  beforeEach(() => {
    physics.setStateReference({ frame_count: 0, zoom: 1.0, paused: false });
    physics.updatePhysicsSettings({
      follow_mode: 'None',
      bh_behavior: 'Static',
    });
    for (const list of ['planets', 'stars', 'bh_list', 'debris'])
      physics[list].length = 0;
  });

  test('setBodyList replaces a list for every importer', () => {
    const before = physics.debris;
    const next = [];
    engineState.setBodyList('debris', next);
    expect(physics.debris).toBe(next);
    expect(engineState.debris).toBe(next);
    expect(physics.debris).not.toBe(before);
    engineState.setBodyList('debris', before);
  });

  test('an unknown list name throws instead of creating a list', () => {
    expect(() => engineState.setBodyList('moons', [])).toThrow();
  });

  test('after a step that filters a list, the facade holds the engine list', () => {
    const planet = new physics.Planet({ x: 0, y: 0 }, { x: 1, y: 1 });
    physics.planets.push(planet);
    const captured = physics.planets;
    physics.updatePhysics(0.1);
    // The step filters each list into a new one, so a captured list is the
    // detached copy and the binding is what stays current.
    expect(physics.planets).toBe(engineState.planets);
    expect(physics.planets).not.toBe(captured);
    expect(physics.planets).toContain(planet);
  });

  test('the settings, the clock and the id counter are live', () => {
    physics.updatePhysicsSettings({ integrator: 'RK4' });
    expect(physics.physicsSettings).toBe(engineState.physicsSettings);
    expect(physics.physicsSettings.integrator).toBe('RK4');
    physics.updatePhysicsSettings({ integrator: 'Symplectic Euler' });

    const t0 = physics.getSimulationTime();
    physics.updatePhysics(0.1);
    expect(physics.getSimulationTime()).toBeCloseTo(t0 + 0.1, 12);

    const id0 = physics.PhysicsObject_id_counter;
    const planet = new physics.Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    expect(planet.id).toBe(id0);
    expect(physics.PhysicsObject_id_counter).toBe(id0 + 1);
  });

  test('a registered effects pool is the facade particlePool', () => {
    const original = physics.particlePool;
    const pool = { ...original };
    physics.registerEffects({ pool });
    expect(physics.particlePool).toBe(pool);
    physics.registerEffects({ pool: original });
    expect(physics.particlePool).toBe(original);
  });
});
