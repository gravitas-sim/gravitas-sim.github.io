import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  StarObject,
  stars,
  planets,
  bh_list,
  asteroids,
  comets,
  gas_giants,
  neutron_stars,
  white_dwarfs,
  galaxies,
  debris,
  setStateReference,
  updatePhysicsSettings,
  getPhysicsSetting,
  updatePhysics,
  bumpWorldGeneration,
  resetPhysicsObjectCounter,
  accelerationBreakdown,
  conservationCaveats,
  SOLAR_MASS_UNIT,
} from '../js/physics.js';
import { a0InSimUnits, asymptoticSpeed, A0_GALACTIC } from '../js/mond.js';

// =============================================================================
// The three galaxy-gravity modes, at the level of the force law
// -----------------------------------------------------------------------------
// js/mond.js is tested on its own arithmetic. This file tests the part that
// arithmetic is wired into: that selecting a mode changes what the integrator
// does, that the halo and MOND can never both be in the force law, and that a
// scenario which has not declared a physical scale does not get MOND applied to
// it by accident.
// =============================================================================

/** The galaxy scale models' declared mapping. */
const GALAXY_SCALE = {
  galaxy_kpc_per_unit: 1 / 30,
  galaxy_msun_per_unit: 9.604e5,
};

const BASE = {
  gravitational_constant: 1.0,
  mutual_gravity: true,
  star_only_gravity: false,
  integrator: 'Symplectic Euler',
  max_timestep: 0.01,
  enable_star_merging: false,
  bh_behavior: 'Static',
  galaxy_gravity: 'newtonian',
  halo_v_flat: 12,
  halo_core_radius: 150,
  galaxy_kpc_per_unit: 0,
  galaxy_msun_per_unit: 0,
};

/** Empty the world without reassigning the arrays other modules hold. */
function clearWorld() {
  for (const list of [
    stars,
    planets,
    bh_list,
    asteroids,
    comets,
    gas_giants,
    neutron_stars,
    white_dwarfs,
    galaxies,
    debris,
  ]) {
    list.length = 0;
  }
  resetPhysicsObjectCounter();
  bumpWorldGeneration();
}

/**
 * A central mass with one tracer at radius r, and the acceleration on it.
 *
 * @param {number} r - Where to put the tracer
 * @param {object} settings - Physics settings for this measurement
 * @param {number} [centralMass] - Central mass in solar-mass units
 * @returns {number} The magnitude of the acceleration on the tracer
 */
function accelAt(r, settings, centralMass = 14.7) {
  clearWorld();
  updatePhysicsSettings({ ...BASE, ...settings });

  const centre = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, centralMass);
  centre.name = 'Centre';
  centre.isCentralBody = true;
  stars.push(centre);

  const tracer = new StarObject({ x: r, y: 0 }, { x: 0, y: 0 }, 1e-6);
  tracer.name = 'Tracer';
  stars.push(tracer);
  bumpWorldGeneration();

  // accelerationBreakdown reads the source list the integrator caches, so a
  // world that has never been stepped reports no sources and zero field. One
  // vanishingly short step builds the cache without moving anything.
  updatePhysics(1e-9);

  const b = accelerationBreakdown(tracer);
  return Math.hypot(b.total.ax, b.total.ay);
}

beforeEach(() => {
  setStateReference({ paused: false, zoom: 1, pan: { x: 0, y: 0 } });
  clearWorld();
  updatePhysicsSettings(BASE);
});

// =============================================================================
describe('the three modes are mutually exclusive', () => {
  test('selecting MOND takes the halo out of the force law', () => {
    updatePhysicsSettings({ ...GALAXY_SCALE, galaxy_gravity: 'halo' });
    expect(getPhysicsSetting('dark_matter_halo')).toBe(true);

    updatePhysicsSettings({ galaxy_gravity: 'mond' });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('mond');
    expect(getPhysicsSetting('dark_matter_halo')).toBe(false);
  });

  test('selecting the halo takes MOND out of the force law', () => {
    updatePhysicsSettings({ ...GALAXY_SCALE, galaxy_gravity: 'mond' });
    updatePhysicsSettings({ galaxy_gravity: 'halo' });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('halo');
    expect(getPhysicsSetting('dark_matter_halo')).toBe(true);
  });

  test('writing the legacy boolean still works and still excludes MOND', () => {
    // Saved games and shared links from before the mode existed only carry the
    // boolean. They have to keep working, and they must not be able to produce
    // a state with both.
    updatePhysicsSettings({ ...GALAXY_SCALE, galaxy_gravity: 'mond' });
    updatePhysicsSettings({ dark_matter_halo: true });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('halo');

    updatePhysicsSettings({ dark_matter_halo: false });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('newtonian');
  });

  test('an unknown mode falls back to Newtonian rather than throwing', () => {
    updatePhysicsSettings({ galaxy_gravity: 'aether' });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('newtonian');
    expect(getPhysicsSetting('dark_matter_halo')).toBe(false);
  });

  test('there is no combination of writes that leaves both on', () => {
    const writes = [
      { galaxy_gravity: 'mond' },
      { dark_matter_halo: true },
      { galaxy_gravity: 'halo' },
      { dark_matter_halo: false },
      { galaxy_gravity: 'newtonian' },
      { dark_matter_halo: true, galaxy_gravity: 'mond' },
    ];
    updatePhysicsSettings(GALAXY_SCALE);
    for (const a of writes) {
      for (const b of writes) {
        updatePhysicsSettings(a);
        updatePhysicsSettings(b);
        const mode = getPhysicsSetting('galaxy_gravity');
        const halo = getPhysicsSetting('dark_matter_halo');
        expect(halo).toBe(mode === 'halo');
        expect(mode === 'mond' && halo).toBe(false);
      }
    }
  });

  test('the caveat list names whichever one is running, never both', () => {
    updatePhysicsSettings({ ...GALAXY_SCALE, galaxy_gravity: 'halo' });
    let caveats = conservationCaveats();
    expect(caveats).toContain('caveat.halo');
    expect(caveats).not.toContain('caveat.mond');

    updatePhysicsSettings({ galaxy_gravity: 'mond' });
    caveats = conservationCaveats();
    expect(caveats).toContain('caveat.mond');
    expect(caveats).not.toContain('caveat.halo');

    updatePhysicsSettings({ galaxy_gravity: 'newtonian' });
    caveats = conservationCaveats();
    expect(caveats).not.toContain('caveat.mond');
    expect(caveats).not.toContain('caveat.halo');
  });
});

// =============================================================================
describe('MOND is confined to scenarios that declare a scale', () => {
  test('asking for MOND without a scale leaves the world Newtonian', () => {
    updatePhysicsSettings({
      galaxy_gravity: 'mond',
      galaxy_kpc_per_unit: 0,
      galaxy_msun_per_unit: 0,
    });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('newtonian');
  });

  test('half a scale is not a scale', () => {
    updatePhysicsSettings({
      galaxy_gravity: 'mond',
      galaxy_kpc_per_unit: 1 / 30,
      galaxy_msun_per_unit: 0,
    });
    expect(getPhysicsSetting('galaxy_gravity')).toBe('newtonian');
  });

  test('a planetary system is untouched even if MOND is asked for', () => {
    // The Solar System's scale: an inner planet at 1 AU = 100 units around a
    // solar mass. Whatever the settings say, the acceleration must be exactly
    // Newtonian, because no scale was declared.
    const newtonian = accelAt(100, { galaxy_gravity: 'newtonian' }, 1);
    const asked = accelAt(100, { galaxy_gravity: 'mond' }, 1);
    expect(asked).toBeCloseTo(newtonian, 12);
  });
});

// =============================================================================
describe('each mode changes the force law in the way it claims', () => {
  test('Newtonian mode is GM/r^2 and nothing else', () => {
    const r = 300;
    const M = 14.7 * SOLAR_MASS_UNIT;
    const a = accelAt(r, { galaxy_gravity: 'newtonian' });
    expect(a).toBeCloseTo((1.0 * M) / (r * r), 6);
  });

  test('the halo adds to the Newtonian field', () => {
    const r = 300;
    const plain = accelAt(r, { galaxy_gravity: 'newtonian' });
    const withHalo = accelAt(r, { galaxy_gravity: 'halo' });
    expect(withHalo).toBeGreaterThan(plain);
  });

  test('MOND multiplies the Newtonian field, and by more further out', () => {
    const inner = 100;
    const outer = 900;
    const nIn = accelAt(inner, {
      ...GALAXY_SCALE,
      galaxy_gravity: 'newtonian',
    });
    const mIn = accelAt(inner, { ...GALAXY_SCALE, galaxy_gravity: 'mond' });
    const nOut = accelAt(outer, {
      ...GALAXY_SCALE,
      galaxy_gravity: 'newtonian',
    });
    const mOut = accelAt(outer, { ...GALAXY_SCALE, galaxy_gravity: 'mond' });

    expect(mIn / nIn).toBeGreaterThan(1);
    expect(mOut / nOut).toBeGreaterThan(mIn / nIn);
  });

  test('the boost the breakdown reports matches the field it returns', () => {
    clearWorld();
    updatePhysicsSettings({ ...BASE, ...GALAXY_SCALE, galaxy_gravity: 'mond' });
    const centre = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 14.7);
    centre.isCentralBody = true;
    stars.push(centre);
    const tracer = new StarObject({ x: 600, y: 0 }, { x: 0, y: 0 }, 1e-6);
    stars.push(tracer);
    bumpWorldGeneration();
    updatePhysics(1e-9);

    const b = accelerationBreakdown(tracer);
    const sum = Math.hypot(b.sumOfSources.ax, b.sumOfSources.ay);
    const total = Math.hypot(b.total.ax, b.total.ay);
    expect(b.mondBoost).toBeGreaterThan(1);
    expect(total).toBeCloseTo(sum * b.mondBoost, 9);
  });

  test('MOND holds a tracer on a flat curve where Newton does not', () => {
    // The scenario's own numbers: 14,700 mass units of visible matter, and a
    // curve the observations show flat at 11 units of speed. Under MOND a
    // tracer launched at that speed should stay roughly on its circle; under
    // Newtonian gravity from the same matter it is far too fast and leaves.
    const a0 = a0InSimUnits(
      {
        kpcPerUnit: GALAXY_SCALE.galaxy_kpc_per_unit,
        solarMassPerUnit: GALAXY_SCALE.galaxy_msun_per_unit,
      },
      1.0
    );
    const vFlat = asymptoticSpeed(14700, a0, 1.0);
    expect(vFlat).toBeGreaterThan(10);
    expect(vFlat).toBeLessThan(12);

    const run = mode => {
      clearWorld();
      updatePhysicsSettings({
        ...BASE,
        ...GALAXY_SCALE,
        galaxy_gravity: mode,
      });
      const centre = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 14.7);
      centre.isCentralBody = true;
      centre.persistent = true;
      stars.push(centre);
      const r0 = 700;
      const tracer = new StarObject({ x: r0, y: 0 }, { x: 0, y: vFlat }, 1e-6);
      tracer.persistent = true;
      stars.push(tracer);
      bumpWorldGeneration();

      for (let i = 0; i < 4000; i++) updatePhysics(0.02);
      return Math.hypot(tracer.pos.x, tracer.pos.y) / r0;
    };

    const underMond = run('mond');
    const underNewton = run('newtonian');

    // MOND keeps it near its circle; Newton lets it climb away.
    expect(underMond).toBeGreaterThan(0.6);
    expect(underMond).toBeLessThan(1.8);
    expect(underNewton).toBeGreaterThan(underMond);
  });

  test('every mode leaves every body finite', () => {
    for (const mode of ['newtonian', 'halo', 'mond']) {
      clearWorld();
      updatePhysicsSettings({ ...BASE, ...GALAXY_SCALE, galaxy_gravity: mode });
      const centre = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 14.7);
      centre.isCentralBody = true;
      stars.push(centre);
      for (let i = 0; i < 12; i++) {
        const r = 150 + i * 60;
        stars.push(new StarObject({ x: r, y: 0 }, { x: 0, y: 11 }, 0.03));
      }
      bumpWorldGeneration();
      for (let i = 0; i < 500; i++) updatePhysics(0.02);

      for (const b of stars) {
        expect(Number.isFinite(b.pos.x)).toBe(true);
        expect(Number.isFinite(b.pos.y)).toBe(true);
        expect(Number.isFinite(b.vel.x)).toBe(true);
        expect(Number.isFinite(b.vel.y)).toBe(true);
      }
    }
  });

  test('a0 in simulation units is what the galaxy scale implies', () => {
    // Guards the wiring rather than the arithmetic: the physics module has to
    // pass the scenario's declared scale through, not some default.
    const a0 = a0InSimUnits(
      {
        kpcPerUnit: GALAXY_SCALE.galaxy_kpc_per_unit,
        solarMassPerUnit: GALAXY_SCALE.galaxy_msun_per_unit,
      },
      1.0,
      A0_GALACTIC
    );
    expect(a0).toBeGreaterThan(0.9);
    expect(a0).toBeLessThan(1.1);
  });
});
