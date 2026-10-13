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
//   id and index, so creating one body earlier or later is a behavior change
//   even when the resulting picture is identical. e2e/worldConstruction.spec.js
//   pins this for all 53 scenarios.
// =============================================================================

import { systemLayout } from '../binaryOrbits.js';
import { encounterState } from '../gravityAssist.js';
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
import {
  SCENARIO_GEOMETRY,
  applyPresetLayout,
  expandGeometry,
  scenarioId,
} from '../scenarios.js';
import { populationCaps } from '../quality.js';
import { SIM_UNITS_PER_AU } from '../units.js';

/**
 * Scenarios whose bodies are declared as data but are the engine's alone to
 * build (SCENARIO_GEOMETRY.md, slice 2): they take the bodies the generator
 * drew, read the drawn radius, draw a phase or set the engine's own
 * properties, none of which a scenario pack may do. They live here, with the
 * builder that reads them, and not in js/scenarios.js, which every route loads:
 * the start-up download pays for what only the builder uses. tests/
 * scenarioGeometry.test.js holds each to the world the code made.
 */
export const ENGINE_GEOMETRY = /* @__PURE__ */ Object.freeze({
  // The bodies the seeded generator drew for the scenario's own counts are
  // reused (`from`), so every id, every generated field and the generator's
  // place in its sequence are what the hand-built blocks left; a type in
  // `keep` leaves any further generated bodies of it in the world, as the
  // blocks did when a pack asked for more stars than the scenario places.
  // Nothing below is a pack's to carry: SCENARIO_GEOMETRY.md says why.
  //
  // Earth and the Moon, about their barycenter, at a phase the seeded
  // generator draws when the Moon is placed. G here carries the schematic's
  // exaggerated distance (js/scenarios.js, the scenario's settings).
  // prettier-ignore
  'earth-moon-system': { steps: [
    { body: { type: 'Planet', name: 'Earth', mass: { earths: 1 }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { diameter: 12742, orbital_period: 365, baseColor: '#4B7BE5', radius: 12, density: 'rocky', isEarth: true, temperature: 288, gravity: 9.81, rotation_period: 1, atmosphere: 'N2/O2', density_kg_m3: 5514, escape_velocity: 11.19, surface_pressure: 101325, magnetic_field: 25, albedo: 0.306 } } },
    { body: { type: 'Planet', name: 'Luna', mass: { earths: 0.0123 }, orbit: { around: 'Earth', distance: { units: 35 }, barycentric: true, angle: { random: true } }, set: { diameter: 3474, orbital_period: 27.3, baseColor: '#8B8B8B', radius: 3, density: 'rocky', isMoon: true, temperature: 250, gravity: 1.62, rotation_period: 27.3, atmosphere: 'none', density_kg_m3: 3344, escape_velocity: 2.38, surface_pressure: 0, magnetic_field: 0, albedo: 0.136 } } },
  ] },
  // 1I/'Oumuamua on its measured hyperbolic orbit, with Earth for scale. The
  // visitor's state is that orbit evaluated at four AU on the way in; its mass
  // is a billionth of a simulation unit, 3.329460487e-7 Earth masses.
  // prettier-ignore
  'interstellar-visitor': { steps: [
    { body: { type: 'Star', name: 'Sun', mass: { suns: 1 }, from: { generated: 0, ifMissing: 'make' }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { radiusInSuns: 1, luminosityInSuns: 1, radius: 9, temperature: 5772, spectralType: 'G2V', baseColor: '#ffd34d', persistent: true } } },
    { body: { type: 'Planet', name: 'Earth', mass: { earths: 1 }, orbit: { around: 'Sun', distance: { au: 1 }, angle: { pi: 0.5 } }, set: { radiusInEarths: 1, radius: 3, baseColor: '#4b90e2', persistent: true } } },
    { body: { type: 'Planet', name: "1I/'Oumuamua", mass: { earths: 3.329460487e-7 }, at: { x: -286.14, y: -279.48 }, velocity: { x: 2.9436, y: 2.0454 }, set: { radius: 2.2, baseColor: '#d96a4a', persistent: true } } },
  ] },
  // Two equal A stars about their common center, barycentric so the pair
  // circles a fixed point.
  // prettier-ignore
  'binary-pair': { keep: ['Star'], steps: [
    { body: { type: 'Star', name: 'Star A', mass: { suns: 2 }, from: { generated: 0 }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { radiusInSuns: 1.6, luminosityInSuns: 10, radius: 9, temperature: 8000, spectralType: 'A5V', baseColor: '#ffd97d', persistent: true } } },
    { body: { type: 'Star', name: 'Star B', mass: { suns: 2 }, from: { generated: 1 }, orbit: { around: 'Star A', distance: { au: 4 }, barycentric: true }, set: { radiusInSuns: 1.6, luminosityInSuns: 10, radius: 9, temperature: 8000, spectralType: 'A5V', baseColor: '#8fd4ff', persistent: true } } },
  ] },
  // One black hole and four planets on circular orbits at multiples of its
  // drawn radius, so the orbits stay outside it at any mass a step asks for.
  // Phases are i*pi/2 + 0.3 radians. Planet masses are explicit: the generator
  // makes them a sizeable fraction of a solar mass.
  // prettier-ignore
  'black-hole-lab': { keep: ['BlackHole'], steps: [
    { body: { type: 'BlackHole', name: 'Black Hole', from: { generated: 0 }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { persistent: true } } },
    { body: { type: 'Planet', name: 'Inner Orbiter', mass: { earths: 1 }, from: { generated: 0 }, orbit: { around: 'Black Hole', distance: { radii: 4.2 }, angle: { rad: 0.3 } }, set: { persistent: true } } },
    { body: { type: 'Planet', name: 'Second Orbiter', mass: { earths: 3 }, from: { generated: 1 }, orbit: { around: 'Black Hole', distance: { radii: 6.4 }, angle: { rad: 1.8707963267948966 } }, set: { persistent: true } } },
    { body: { type: 'Planet', name: 'Third Orbiter', mass: { earths: 0.5 }, from: { generated: 2 }, orbit: { around: 'Black Hole', distance: { radii: 9.2 }, angle: { rad: 3.441592653589793 } }, set: { persistent: true } } },
    { body: { type: 'Planet', name: 'Outer Orbiter', mass: { earths: 8 }, from: { generated: 3 }, orbit: { around: 'Black Hole', distance: { radii: 12.6 }, angle: { rad: 5.0123889803846895 } }, set: { persistent: true } } },
  ] },
  // The inner Solar System with the habitable zone drawn: real semi-major
  // axes (Mercury left out), phases i/4 * 2 pi + 0.4 radians, each world one
  // Earth mass (too small to perturb anything) and drawn large enough to click.
  // prettier-ignore
  'habitable-zone-lab': { keep: ['Star'], steps: [
    { body: { type: 'Star', name: 'Sun', mass: { suns: 1 }, from: { generated: 0 }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { luminosityInSuns: 1, radiusInSuns: 1, temperature: 5772, spectralType: 'G2V', radius: 6, baseColor: '#ffd27f', showHabitableZone: true, persistent: true } } },
    { body: { type: 'Planet', name: 'Venus', mass: { earths: 1 }, from: { generated: 0 }, orbit: { around: 'Sun', distance: { au: 0.723 }, angle: { rad: 0.4 } }, set: { radius: 4.6, baseColor: '#e8c39e', persistent: true } } },
    { body: { type: 'Planet', name: 'Earth', mass: { earths: 1 }, from: { generated: 1 }, orbit: { around: 'Sun', distance: { au: 1 }, angle: { rad: 1.9707963267948965 } }, set: { radius: 4.8, baseColor: '#6ec6ff', persistent: true } } },
    { body: { type: 'Planet', name: 'Mars', mass: { earths: 1 }, from: { generated: 2 }, orbit: { around: 'Sun', distance: { au: 1.524 }, angle: { rad: 3.541592653589793 } }, set: { radius: 3.6, baseColor: '#d9744a', persistent: true } } },
    { body: { type: 'Planet', name: 'Ceres', mass: { earths: 1 }, from: { generated: 3 }, orbit: { around: 'Sun', distance: { au: 2.77 }, angle: { rad: 5.11238898038469 } }, set: { radius: 2.4, baseColor: '#9aa3b5', persistent: true } } },
  ] },
  // TRAPPIST-1 from js/data/trappist1.js, which the habitable zone
  // instruments read too, so the scenario and the investigation cannot
  // describe two different systems.
  // prettier-ignore
  'trappist-1-system': { keep: ['Star', 'GasGiant', 'BlackHole', 'Asteroid', 'Comet', 'NeutronStar', 'WhiteDwarf', 'Debris'], steps: [{ rule: { name: 'published-system', params: { system: 'trappist-1' } } }] },
  //
  // The laboratory scenarios (slice 3). Their bodies are placed from settings a
  // student changes, which a table row cannot hold as a number: a named rule
  // reads the settings SCENARIO_GEOMETRY.md lists for it and builds the system
  // from a published formula (js/cr3bp.js's convention, js/binaryOrbits.js,
  // js/gravityAssist.js, the two-body circular speed), and the table keeps
  // everything the scenario says about itself: the names, the colors, the drawn
  // sizes and which formula. Every one replaces the generated population whole.
  //
  // The circular restricted three-body problem: two bodies on a circular orbit
  // about the barycenter and a tracer of negligible mass, in the rotating frame.
  // A drawn radius is `drawnSolarRadii` solar radii times the cube root of the
  // star's true radius, which keeps both visible where the L4/L5 triangle fits.
  // prettier-ignore
  'lagrange-point-lab': { steps: [{ rule: { name: 'restricted-three-body', params: { primaryName: 'Primary', primaryColor: '#ffd27f', primaryRadiusInSuns: 1, secondaryName: 'Secondary', secondaryColor: '#9fd0ff', secondaryRadiusInSuns: 0.35, drawnSolarRadii: 30, tracerName: 'Tracer', tracerColor: '#f07f7f', tracerRadius: 0.8 } } }] },
  // One star, a spacecraft and a target station on circular coplanar orbits.
  // prettier-ignore
  'orbital-transfer-lab': { steps: [{ rule: { name: 'circular-transfer', params: { starName: 'Sol', starDrawnSolarRadii: 10, probeName: 'Spacecraft', probeColor: '#e8f4ff', probeRadius: 0.5, targetName: 'Target Station', targetColor: '#f4c86a', targetRadius: 0.9, targetMassRatio: 1e-8 } } }] },
  // Two stars and a planet from closed-form elements, round one star or round
  // both; the stars are drawn ten times life size.
  // prettier-ignore
  'binary-planet-lab': { recenter: true, steps: [{ rule: { name: 'binary-lab', params: { mode: 'circumstellar', drawExaggeration: 10, starAName: 'Star A', starAColor: '#fff0d0', starBName: 'Star B', starBColor: '#ffc898', planetName: 'Planet', planetColor: '#7ec8ff', planetRadius: 1.5 } } }] },
  // prettier-ignore
  'circumbinary-planet-lab': { recenter: true, steps: [{ rule: { name: 'binary-lab', params: { mode: 'circumbinary', drawExaggeration: 10, starAName: 'Star A', starAColor: '#fff0d0', starBName: 'Star B', starBColor: '#ffc898', planetName: 'Planet', planetColor: '#7ec8ff', planetRadius: 1.5 } } }] },
  // HD 209458 and its planet about their barycenter, from js/data/
  // exoplanetSystems.js, which the exoplanet instruments read too.
  // prettier-ignore
  'exoplanet-characterization-lab': { recenter: true, steps: [{ rule: { name: 'published-system', params: { system: 'hd209458' } } }] },
  // HD 209458 at true relative scale (the radii are the published ones, so the
  // silhouette, the dip and the arithmetic in the investigation are one set of
  // numbers). The star is the generator's first star, made if it drew none, kept
  // with its id; the planet starts a quarter of an orbit before the first
  // transit. Worked in the primary's rest frame: the companion (Blended Binary
  // only: 300 AU out, half a magnitude fainter, 1.0 solar mass) circles it
  // retrograde at the two-body speed for the pair. The planet's Earth-mass
  // figure is 0.69 x 317.828, as the hand-built block computed it; the
  // gravitating mass is 0.02% less than that, because js/physics.js converts
  // Jupiter masses with its own constant. Kept, not corrected (D-GEOM-06).
  // prettier-ignore
  'transit-lab': { steps: [
    { body: { type: 'Star', name: 'HD 209458', mass: { suns: 1.148 }, born: { suns: 1 }, from: { generated: 0, ifMissing: 'make' }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { radiusInSuns: 1.155, luminosityInSuns: 1.77, radius: 0.537129285, temperature: 6065, spectralType: 'G0V', baseColor: '#fff3df', persistent: true } } },
    { body: { type: 'Planet', name: 'HD 209458 b', mass: { jupiters: 0.69 }, born: { earths: 1 }, orbit: { around: 'HD 209458', distance: { au: 0.04747 }, angle: { rad: -1.5707963267948966 } }, set: { massInEarths: 219.30132, radiusInJupiters: 1.38, radius: 0.06594968230817999, baseColor: '#b8875a', persistent: true } } },
  ] },
  // prettier-ignore
  'blended-binary': { steps: [
    { body: { type: 'Star', name: 'HD 209458', mass: { suns: 1.148 }, born: { suns: 1 }, from: { generated: 0, ifMissing: 'make' }, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, set: { radiusInSuns: 1.155, luminosityInSuns: 1.77, radius: 0.537129285, temperature: 6065, spectralType: 'G0V', baseColor: '#fff3df', persistent: true } } },
    { body: { type: 'Star', name: 'HD 209458 B (companion)', mass: { suns: 1 }, from: { generated: 1, ifMissing: 'make' }, orbit: { around: 'HD 209458', distance: { au: 300 }, angle: { rad: 0 }, mutual: true, retrograde: true }, set: { radiusInSuns: 0.95, luminosityInSuns: 1.1167944997299422, radius: 0.44179465, temperature: 5700, spectralType: 'G5V', baseColor: '#ffe9c4', persistent: true } } },
    { body: { type: 'Planet', name: 'HD 209458 b', mass: { jupiters: 0.69 }, born: { earths: 1 }, orbit: { around: 'HD 209458', distance: { au: 0.04747 }, angle: { rad: -1.5707963267948966 } }, set: { massInEarths: 219.30132, radiusInJupiters: 1.38, radius: 0.06594968230817999, baseColor: '#b8875a', persistent: true } } },
  ] },
  // Lagrange's equilateral solution: three equal stars rigidly rotating about
  // their center, linearly unstable (Gascheau), which is what the investigation
  // needs. 50 units circumradius, 6 solar masses each, named so the answer key
  // can say which one is perturbed.
  // prettier-ignore
  'three-body-sensitivity-lab': { steps: [{ rule: { name: 'equilateral-stars', params: { circumradius: 50, massSuns: 6, starRadius: 8, names: ['Alpha', 'Beta', 'Gamma'], colors: ['#FFD86B', '#7FB2F0', '#F08A6B'] } } }] },
  // A planet and a spacecraft on an exact encounter hyperbola, alone in space
  // or about a star the planet circles. No net-momentum balance: the planet's
  // recoil is the measurement.
  // prettier-ignore
  'gravity-assist-lab': { steps: [{ rule: { name: 'gravity-assist', params: { starName: 'Star', starColor: '#ffd34d', starRadius: 8, planetName: 'Planet', planetColor: '#c9a882', planetRadius: 2, planetRadiusInSuns: 0.102763, probeName: 'Spacecraft', probeColor: '#e8f4ff', probeRadius: 0.4 } } }] },
  // prettier-ignore
  'gravity-assist-heliocentric': { steps: [{ rule: { name: 'gravity-assist', params: { starName: 'Star', starColor: '#ffd34d', starRadius: 8, planetName: 'Planet', planetColor: '#c9a882', planetRadius: 2, planetRadiusInSuns: 0.102763, probeName: 'Spacecraft', probeColor: '#e8f4ff', probeRadius: 0.4 } } }] },
});

/**
 * The named rules of the laboratory scenarios (ENGINE_GEOMETRY above;
 * SCENARIO_GEOMETRY.md lists the settings each reads). A rule is handed the
 * parameters its declaration carries and `env` ({G, units, settings}), and
 * returns the records expandGeometry makes bodies from, in the order the
 * hand-built blocks made them: each constructor draws from the seeded generator,
 * and a world is the same only if the draws keep their order. The formulas are
 * the blocks' own, written the same way.
 */
const laboratoryRules = {
  // The circular restricted three-body problem. The barycenter is the origin,
  // the heavier body sits at -mu and the lighter at 1-mu, in units of the
  // separation. That is the convention js/cr3bp.js states and works in, and
  // building the world any other way would mean the overlay and the simulation
  // disagreed about where the origin is.
  'restricted-three-body': (p, { G, units, settings: S }) => {
    const AU = units.AU;
    const m1 = S.lagrange_primary_mass * SOLAR_MASS_UNIT;
    const m2 = S.lagrange_secondary_mass * SOLAR_MASS_UNIT;
    const separation = S.lagrange_separation * AU;
    const total = m1 + m2;
    const mu = m2 / total;
    const n = Math.sqrt((G * total) / (separation * separation * separation));
    // Drawn well above life size so both are visible at a zoom that holds the
    // whole L4/L5 triangle. Nothing here comes within twenty times the drawn
    // radius, and js/physics.js collides on the drawn radius.
    const place = (fraction, mass, name, baseColor, radiusInSuns) => {
      const x = fraction * separation;
      return {
        type: 'Star',
        ctor: 0,
        pos: { x, y: 0 },
        vel: { x: 0, y: n * x },
        assign: {
          mass,
          massInSuns: mass / SOLAR_MASS_UNIT,
          name,
          radiusInSuns,
          radius: p.drawnSolarRadii * 0.00465047 * AU * Math.cbrt(radiusInSuns),
          baseColor,
          persistent: true,
        },
      };
    };
    // The tracer, placed and launched in the ROTATING frame. At t = 0 the
    // rotating and inertial frames coincide in orientation, so the position
    // carries over unchanged and the velocity picks up the frame's own motion:
    // v_inertial = v_rotating + omega x r, with omega along +z.
    const rx = S.lagrange_tracer_x * separation;
    const ry = S.lagrange_tracer_y * separation;
    const tracerMass = total * S.lagrange_tracer_fraction;
    return [
      place(-mu, m1, p.primaryName, p.primaryColor, p.primaryRadiusInSuns),
      place(
        1 - mu,
        m2,
        p.secondaryName,
        p.secondaryColor,
        p.secondaryRadiusInSuns
      ),
      {
        type: 'Planet',
        ctor: 1,
        pos: { x: rx, y: ry },
        vel: {
          x: S.lagrange_tracer_vx * separation * n - n * ry,
          y: S.lagrange_tracer_vy * separation * n + n * rx,
        },
        assign: {
          name: p.tracerName,
          mass: tracerMass,
          massInEarths: tracerMass / EARTH_MASS_UNIT,
          radius: p.tracerRadius,
          baseColor: p.tracerColor,
          persistent: true,
        },
      },
    ];
  },

  // A Hohmann transfer has an exact answer only between circular coplanar
  // orbits about a single dominant mass. Circular, exactly: the speed is
  // sqrt(GM/r) with the spacecraft's own mass included in mu, because
  // orbitalElements() includes it and a scenario that set up its orbit with a
  // different mu than the readout uses would open with a small eccentricity
  // nobody asked for. The star is drawn `starDrawnSolarRadii` solar radii
  // across so it is visible at a zoom that also holds a 2.5 AU orbit; the
  // spacecraft never comes within twenty times that, and js/physics.js collides
  // on the drawn radius. The target is given a real mass so it shows up in the
  // inspector as a body, and kept light enough not to perturb the transfer.
  'circular-transfer': (p, { G, units, settings: S }) => {
    const AU = units.AU;
    const starMass = S.transfer_star_mass * SOLAR_MASS_UNIT;
    const r1 = S.transfer_inner_au * AU;
    const r2 = S.transfer_outer_au * AU;
    const circular = (radius, mass, phaseDeg) => {
      const phase = (phaseDeg * Math.PI) / 180;
      const mu = G * (starMass + mass);
      const v = Math.sqrt(mu / radius);
      return {
        pos: { x: radius * Math.cos(phase), y: radius * Math.sin(phase) },
        vel: { x: -v * Math.sin(phase), y: v * Math.cos(phase) },
      };
    };
    const probeMass = starMass * S.transfer_probe_mass_ratio;
    const targetMass = starMass * p.targetMassRatio;
    const inner = circular(r1, probeMass, 0);
    const outer = circular(r2, targetMass, S.transfer_target_phase_deg);
    return [
      {
        type: 'Star',
        ctor: 0,
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        assign: {
          mass: starMass,
          massInSuns: S.transfer_star_mass,
          name: p.starName,
          radiusInSuns: 1,
          radius: p.starDrawnSolarRadii * 0.00465047 * AU,
          persistent: true,
        },
      },
      {
        type: 'Planet',
        ctor: 1,
        ...inner,
        // The reported mass and the gravitating mass, kept in step: the
        // constructor was handed one Earth mass and the mass it moves with is
        // replaced here.
        assign: {
          name: p.probeName,
          mass: probeMass,
          massInEarths: probeMass / EARTH_MASS_UNIT,
          radius: p.probeRadius,
          baseColor: p.probeColor,
          persistent: true,
        },
      },
      {
        type: 'Planet',
        ctor: 1,
        ...outer,
        assign: {
          name: p.targetName,
          mass: targetMass,
          massInEarths: targetMass / EARTH_MASS_UNIT,
          radius: p.targetRadius,
          baseColor: p.targetColor,
          persistent: true,
        },
      },
    ];
  },

  // Two stars and a planet from closed-form elements (js/binaryOrbits.js), the
  // planet round one star or round both. Nothing is randomized, so the same
  // settings give the same world to the bit. The planet is one Earth mass: not
  // zero, because a body with no mass drops out of the barycenter and out of
  // the energy bookkeeping the diagnostics depend on, and small enough that the
  // test-particle assumption behind the published stability boundary is not
  // being quietly violated by the thing being measured.
  //
  // Radii, and the one honest compromise in this scenario. js/physics.js
  // absorbs a planet when it comes within star.radius + planet.radius, so the
  // size these bodies are DRAWN at is the distance at which a collision is
  // recorded. At a 10 AU separation a true solar radius is a third of a pixel
  // and a star nobody can see is not usable, so the stars are drawn
  // `drawExaggeration` times their size from the main-sequence relation
  // R ~ M^0.8. A "collision" here is the planet passing within about thirteen
  // solar radii of a star's center, which destroys a planet in reality too, but
  // the split between "collided" and "ejected" does depend on this factor. The
  // split between disrupted and survived does not.
  'binary-lab': (p, { G, units, settings: S }) => {
    const AU = units.AU;
    const R_SUN = 0.00465047 * AU;
    const m1Solar = S.binary_lab_m1;
    const m2Solar = S.binary_lab_m2;
    const separation = S.binary_lab_separation * AU;
    const planetMass = EARTH_MASS_UNIT;
    const layout = systemLayout({
      mode: p.mode,
      m1: m1Solar * SOLAR_MASS_UNIT,
      m2: m2Solar * SOLAR_MASS_UNIT,
      separation,
      eccentricity: S.binary_lab_eccentricity,
      phaseDeg: S.binary_lab_binary_phase,
      planetMass,
      semiMajor: S.binary_lab_planet_a * separation,
      planetPhaseDeg: S.binary_lab_planet_phase,
      G,
    });
    const star = (at, solar, name, baseColor) => {
      const radiusInSuns = solar ** 0.8;
      return {
        type: 'Star',
        ctor: solar,
        pos: { ...at.pos },
        vel: { ...at.vel },
        assign: {
          name,
          radiusInSuns,
          radius: radiusInSuns * R_SUN * p.drawExaggeration,
          baseColor,
          persistent: true,
        },
      };
    };
    return [
      star(layout.star1, m1Solar, p.starAName, p.starAColor),
      star(layout.star2, m2Solar, p.starBName, p.starBColor),
      {
        type: 'Planet',
        ctor: 1,
        pos: { ...layout.planet.pos },
        vel: { ...layout.planet.vel },
        // An Earth radius at this scale is 4e-5 units, which cannot be drawn at
        // any zoom. 1.5 units is a third of the drawn star and a ten-thousandth
        // of the binary separation, so it adds almost nothing to the collision
        // threshold the star already sets. What makes the planet findable on
        // screen is its trail.
        assign: {
          name: p.planetName,
          mass: planetMass,
          radius: p.planetRadius,
          baseColor: p.planetColor,
          persistent: true,
        },
      },
    ];
  },

  // Lagrange's equilateral solution (1772): equal masses at the corners of an
  // equilateral triangle, rotating rigidly about their common center. Gascheau
  // (1843) proved it stable only when 27(m1m2 + m2m3 + m3m1) < (m1+m2+m3)^2; for
  // three equal masses that reads 81m^2 < 9m^2, false by a factor of nine, so
  // the configuration is linearly unstable, which is exactly what the
  // investigation needs. It starts perfectly regular, stays clear of every
  // collision radius and departs exponentially (the Pythagorean problem merges
  // in Gravitas and the figure eight is not chaotic). Measured over nine
  // combinations of integrator and timestep the e-folding time is 6.8 to 7.6
  // simulated seconds; theory gives sqrt(2)/omega = 6.0 s for the unstable
  // eigenvalue. Everything is derived: omega = sqrt(G * 3m / L^3), L the side.
  // Named rather than numbered, because the investigation asks the student to
  // perturb one by name; never culled and never randomly re-typed.
  'equilateral-stars': (p, { G }) => {
    const R = p.circumradius;
    const MASS = p.massSuns * SOLAR_MASS_UNIT;
    const side = R * Math.sqrt(3);
    const omega = Math.sqrt((G * 3 * MASS) / (side * side * side));
    return p.names.map((name, i) => {
      const theta = (i * 2 * Math.PI) / 3;
      const x = R * Math.cos(theta);
      const y = R * Math.sin(theta);
      return {
        type: 'Star',
        ctor: 1,
        pos: { x, y },
        // Rigid rotation: v = omega x r.
        vel: { x: -omega * y, y: omega * x },
        assign: {
          mass: MASS,
          massInSuns: p.massSuns,
          name,
          radius: p.starRadius,
          baseColor: p.colors[i],
          persistent: true,
        },
      };
    });
  },

  // A planet and a spacecraft on an exact encounter hyperbola. With a star the
  // planet is on a circular orbit and its speed is not ours to choose; without
  // one it drifts, and the speed is a stated parameter of the experiment. The
  // spacecraft is placed from the encounter's elements so the impact parameter
  // and the speed at infinity are exact inputs: pointing a probe at a planet
  // from a finite distance gives a different b and a different vInf, and the
  // comparison against theory would be measuring the setup. When no such
  // approach exists (the gate is closer than periapsis) no spacecraft is made.
  //
  // Deliberately NOT balanced to zero net momentum: the planet's velocity
  // change is its recoil from the encounter, and re-centering would mean it
  // does not start at the speed the settings say it does. The star and the
  // planet are drawn far larger than life (a true solar radius is under a
  // pixel here); the exaggeration cannot reach the physics, because no
  // configuration the investigation uses gets within twenty times the drawn
  // radius of either.
  'gravity-assist': (p, { G, settings: S }) => {
    const planetMass =
      S.assist_planet_mass *
      (1 / JUPITER_MASSES_PER_SOLAR_MASS) *
      SOLAR_MASS_UNIT;
    const mu = G * planetMass;
    const orbitRadius = S.assist_orbit_radius;
    const out = [];
    let planetPos = { x: 0, y: 0 };
    let planetVel = { x: S.assist_planet_speed, y: 0 };
    if (orbitRadius > 0) {
      out.push({
        type: 'Star',
        ctor: 1,
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        assign: {
          name: p.starName,
          mass: SOLAR_MASS_UNIT,
          massInSuns: 1,
          radiusInSuns: 1,
          luminosityInSuns: 1,
          radius: p.starRadius,
          temperature: 5772,
          spectralType: 'G2V',
          baseColor: p.starColor,
          persistent: true,
        },
      });
      planetPos = { x: orbitRadius, y: 0 };
      // The pair's mass, not just the star's: the planet is a thousandth of a
      // solar mass and ignoring it would start the orbit slightly eccentric.
      planetVel = {
        x: 0,
        y: Math.sqrt((G * (SOLAR_MASS_UNIT + planetMass)) / orbitRadius),
      };
    }
    out.push({
      type: 'GasGiant',
      pos: { ...planetPos },
      vel: { ...planetVel },
      assign: {
        name: p.planetName,
        mass: planetMass,
        massInJupiters: S.assist_planet_mass,
        radiusInSuns: p.planetRadiusInSuns,
        radius: p.planetRadius,
        baseColor: p.planetColor,
        persistent: true,
      },
    });
    const state = encounterState({
      mu,
      b: S.assist_impact_parameter,
      vInf: S.assist_v_infinity,
      distance: S.assist_gate,
      approachDeg: S.assist_approach_deg,
    });
    if (state) {
      const probeMass = planetMass * S.assist_probe_mass_ratio;
      out.push({
        type: 'Planet',
        ctor: 1,
        pos: { x: planetPos.x + state.pos.x, y: planetPos.y + state.pos.y },
        vel: { x: planetVel.x + state.vel.x, y: planetVel.y + state.vel.y },
        // The gravitating mass and the reported one, kept in step.
        assign: {
          name: p.probeName,
          mass: probeMass,
          massInEarths: probeMass / EARTH_MASS_UNIT,
          radius: p.probeRadius,
          baseColor: p.probeColor,
          persistent: true,
        },
      });
    }
    return out;
  },
};

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
 * @property {(name: string) => void} setScenarioName - Record what was built:
 *   a scenario id, or 'None'
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
  // Three is taken from the catalog rather than picked out of the air: of the
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
      // Galaxy Core it put neighbors about nine units apart, closer than the
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
      // A quarter-cell nudge, because one cell of a grid centered on the origin
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
    current_scenario_name === 'neutron-star-collision' &&
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
    current_scenario_name === 'white-dwarf-binary' &&
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
    current_scenario_name === 'tidal-disruption-event' &&
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
      case 'slingshot':
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

      case 'binary-bh':
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

      case 'triple-bh-system':
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

  // By id: preset_scenario may hold a key the scenario was known by before it
  // had one (a share link, a saved setting, an older lesson). 'None' and a key
  // that names nothing stay as they are, which is what they always built.
  const starting_preset =
    scenarioId(SETTINGS.preset_scenario) ?? SETTINGS.preset_scenario;
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
  // own document. It is what a share link serializes, what a saved state
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
  //
  // Guarded the way js/physics.js guards its own dispatches, and for a reason
  // that is no longer hypothetical: this is the only line in the builder that
  // touches the DOM, and without the guard it is the only thing stopping
  // buildWorld() from running in a Worker - which spike/lyapunov/ shows is
  // otherwise possible today. There is nothing listening in a Worker, so
  // announcing to nobody is the correct no-op rather than a lost event.
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));
  }

  // Add central stars for specific presets
  if (
    ['kuiper-belt', 'rogue-encounter', 'solar-system'].includes(starting_preset)
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

  // Add black holes.
  //
  // The scenario says what their surroundings are doing. It is a stated
  // property, not something inferred from mass: a quiescent supermassive hole
  // is dark and a feeding stellar-mass one is bright, and the old code showed
  // a disk on everything because a display toggle was on.
  const bhLook = {
    environment: SETTINGS.bh_environment,
    inclinationDeg: SETTINGS.bh_disk_inclination,
  };
  // The orientation is keyed on the black hole's index in this world, not on
  // its object id: ids come from a counter that keeps climbing across scenario
  // loads, so the same scenario drew its disk at a different angle every time
  // it was opened.
  const born = (mass, index) => {
    const bh = new BlackHole({ x: 0, y: 0 }, mass * SOLAR_MASS_UNIT);
    bh.setAppearance({
      ...bhLook,
      seed: `bh:${index}`,
      positionAngleDeg: (index * 53 + 18) % 360,
      spin: index % 2 === 0 ? 1 : -1,
    });
    return bh;
  };
  if (SETTINGS.use_individual_bh_masses && SETTINGS.bh_masses.length > 0) {
    for (let i = 0; i < SETTINGS.num_black_holes; i++) {
      bh_list.push(born(SETTINGS.bh_masses[i] || SETTINGS.bh_mass, i));
    }
  } else {
    for (let i = 0; i < SETTINGS.num_black_holes; i++) {
      bh_list.push(born(SETTINGS.bh_mass, i));
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
    // Enter from beyond the field, aimed across it and offset from dead center
    // so the first hole deflects rather than swallows.
    const entry = field * 1.5;
    const star = stars[0];
    star.pos.x = -entry;
    // Offset from dead center so the holes deflect it rather than eat it.
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
  if (starting_preset === 'gw150914' && bh_list.length >= 2) {
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
  if (starting_preset === 'binary-star-system') {
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
  } else if (starting_preset === 'tidal-disruption-event') {
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
  } else if (starting_preset === 'black-hole-billiards') {
    // Three light holes on staggered circular orbits around the heavy one, so
    // the scene opens as something recognizably in motion rather than four
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
  } else if (starting_preset === 'solar-system') {
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
        color: '#9E9E9E', // Mercury gray/rocky
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
  } else if (starting_preset === 'rogue-encounter') {
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
  } else if (starting_preset === 'kuiper-belt') {
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
  } else if (starting_preset === 'sagittarius-a') {
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
  } else if (starting_preset === 'galactic-center') {
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
  } else if (starting_preset === 'pulsar-system') {
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
  } else if (starting_preset === 'neutron-star-collision') {
    // Set up neutron star collision based on GW170817
    if (neutron_stars.length >= 2) {
      neutron_stars[0].name = 'GW170817-A';
      neutron_stars[1].name = 'GW170817-B';
    }
  }
  // --- Fix for Binary BH scenario: two black holes in mutual orbit, planets orbiting center of mass ---
  else if (starting_preset === 'binary-bh') {
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
    starting_preset === 'spiral-galaxy' ||
    starting_preset === 'milky-way-rotation'
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
    const flat = starting_preset === 'milky-way-rotation';

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
  if (starting_preset === 'coma-cluster') {
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

  // --- Scenarios whose bodies are declared as data ------------------------------
  // SCENARIO_GEOMETRY (js/scenarios.js) says what they are and expandGeometry
  // builds them through what only this module can supply: a live engine object
  // and the named rules. The generated population has already been drawn (the
  // seeded generator keeps its sequence); a geometry replaces it, emptying every
  // list but the galaxies as the hand-built blocks did. Bodies are made in the
  // declaration's order because each constructor draws from the generator, and
  // a body the declaration takes from the generated population (`from`) keeps
  // its id and everything else the generator gave it.
  const declared =
    SCENARIO_GEOMETRY[starting_preset] ?? ENGINE_GEOMETRY[starting_preset];
  if (declared) {
    const generated = {
      Star: [...stars],
      Planet: [...planets],
      GasGiant: [...gas_giants],
      BlackHole: [...bh_list],
    };
    // The generated bodies of a type the declaration keeps stay where they
    // are; the rest are emptied, as the hand-built blocks emptied them.
    const keep = new Set(declared.keep);
    if (!keep.has('Star')) stars.length = 0;
    if (!keep.has('Planet')) planets.length = 0;
    if (!keep.has('GasGiant')) gas_giants.length = 0;
    if (!keep.has('BlackHole')) bh_list.length = 0;
    if (!keep.has('Asteroid')) asteroids.length = 0;
    if (!keep.has('Comet')) comets.length = 0;
    if (!keep.has('NeutronStar')) neutron_stars.length = 0;
    if (!keep.has('WhiteDwarf')) white_dwarfs.length = 0;
    if (!keep.has('Debris')) debris.length = 0;

    // One body of a published system, whose masses are in simulation units. A
    // constructor derives the display masses from the mass it is handed, so all
    // four are set; each body is persistent because investigations match bodies
    // between samples by identity.
    const published = d => ({
      type:
        d.kind === 'star'
          ? 'Star'
          : d.kind === 'gasGiant'
            ? 'GasGiant'
            : 'Planet',
      ctor: d.kind === 'star' ? d.mass / SOLAR_MASS_UNIT : 1,
      pos: d.pos,
      vel: d.vel,
      assign: {
        mass: d.mass,
        massInSuns: d.mass / SOLAR_MASS_UNIT,
        massInEarths: d.mass / EARTH_MASS_UNIT,
        massInJupiters: d.mass / JUPITER_MASS_UNIT,
        name: d.name,
        radius: d.radius,
        baseColor: d.color,
        persistent: true,
      },
    });
    const geometryRules = {
      ...laboratoryRules,
      // The Trojans are built balanced already; the other two are balanced here.
      'published-system': ({ system, detuned }, env) => {
        const G = env.G;
        let spec;
        if (system === 'trappist-1') return trappist(G);
        if (system === 'hd209458') return hd209458(G);
        if (system === 'galilean') {
          spec = galileanBodies(G, detuned ? { detune: GALILEAN.detune } : {});
        } else if (system === 'pluto-neptune') spec = plutoBodies(G);
        else spec = trojanBodies(G);
        if (system !== 'jupiter-trojans')
          balance([spec.primary, ...spec.bodies]);
        return [spec.primary, ...spec.bodies].map(published);
      },
    };
    // HD 209458 and its planet about their common center, from js/data/
    // exoplanetSystems.js. Each body sits on the far side of the center of mass
    // from the other, at a distance set by the other's share of the mass, and
    // moves at the speed that keeps the pair circling that fixed point. The
    // star's share is 1/1700 of the planet's, which is exactly why the wobble
    // is invisible at true scale and has to be magnified to be taught. The
    // planet is made without a mass (the constructor draws one) and given its
    // own after, as the hand-built block did, so the generator is drawn the same.
    const hd209458 = G => {
      const sys = HD209458;
      const R_SUN = 0.00465047 * SIM_UNITS_PER_AU;
      const R_JUP_IN_SUNS = 0.102763;
      const starMass = sys.star.massSolar * SOLAR_MASS_UNIT;
      const planetMass =
        sys.planet.massJupiter *
        (1 / JUPITER_MASSES_PER_SOLAR_MASS) *
        SOLAR_MASS_UNIT;
      const total = starMass + planetMass;
      const a = sys.planet.semiMajorAU * SIM_UNITS_PER_AU;
      const vRel = Math.sqrt((G * total) / a);
      const rStar = (a * planetMass) / total;
      const rPlanet = (a * starMass) / total;
      const vStar = (vRel * planetMass) / total;
      const vPlanet = (vRel * starMass) / total;
      return [
        {
          type: 'Star',
          ctor: sys.star.massSolar,
          pos: { x: -rStar, y: 0 },
          vel: { x: 0, y: -vStar },
          assign: {
            name: sys.name,
            radiusInSuns: sys.star.radiusSolar,
            radius: sys.star.radiusSolar * R_SUN,
            luminosityInSuns: sys.star.luminositySolar,
            temperature: sys.star.temperatureK,
            spectralType: sys.star.spectralType,
            baseColor: '#fff3df',
            persistent: true,
            distancePc: sys.star.distancePc,
          },
        },
        {
          type: 'GasGiant',
          pos: { x: rPlanet, y: 0 },
          vel: { x: 0, y: vPlanet },
          assign: {
            name: sys.planetName,
            mass: planetMass,
            massInJupiters: sys.planet.massJupiter,
            radiusInSuns: sys.planet.radiusJupiter * R_JUP_IN_SUNS,
            radius: sys.planet.radiusJupiter * R_JUP_IN_SUNS * R_SUN,
            baseColor: '#c9a882',
            persistent: true,
          },
        },
      ];
    };
    // TRAPPIST-1: the star the generator drew (kept, with its id, and skipped if
    // there is none) and seven planets, every number from js/data/trappist1.js,
    // which the habitable zone instruments read too.
    const trappist = G => {
      const starMass = TRAPPIST1_STAR.massInSuns * SOLAR_MASS_UNIT;
      const records = [
        {
          type: 'Star',
          from: { generated: 0 },
          assign: {
            name: TRAPPIST1_STAR.name,
            mass: starMass,
            baseColor: TRAPPIST1_STAR.baseColor,
            // TRAPPIST-1 is barely larger than Jupiter. At 100 units per AU its
            // true radius is 0.054 units; 0.4 keeps it comfortably inside the
            // innermost orbit at 1.15 units, where the old value of 7 swallowed
            // three planets.
            radius: 0.4,
            // The true radius and luminosity, so the light curve reports the
            // real transit depths even though the star is drawn oversized to
            // keep the planets clickable.
            radiusInSuns: TRAPPIST1_STAR.radiusInSuns,
            luminosityInSuns: TRAPPIST1_STAR.luminosityInSuns,
            massInSuns: TRAPPIST1_STAR.massInSuns,
            temperature: TRAPPIST1_STAR.temperatureK,
            spectralType: TRAPPIST1_STAR.spectralType,
            // The one scenario where the habitable zone lands in the middle of
            // the planets, so the ring is on by default here.
            showHabitableZone: true,
          },
        },
      ];
      // Adjacent orbits are as little as 0.43 units apart, so the bodies have
      // to be small enough that neighbors cannot touch; the screen-space draw
      // floor keeps them visible anyway.
      const RADIUS_UNITS_PER_EARTH = 0.115;
      TRAPPIST1_PLANETS.forEach((p, i) => {
        const r = p.a * SIM_UNITS_PER_AU;
        // Evenly spaced in phase so no two start near each other.
        const theta = (i / TRAPPIST1_PLANETS.length) * 2 * Math.PI;
        const v = Math.sqrt((G * starMass) / r);
        records.push({
          type: 'Planet',
          ctor: p.mass,
          pos: { x: r * Math.cos(theta), y: r * Math.sin(theta) },
          vel: { x: -v * Math.sin(theta), y: v * Math.cos(theta) },
          assign: {
            name: `TRAPPIST-1${p.name}`,
            // Gravitationally negligible against a 0.0898 solar-mass star, so
            // each planet's two-body period is the star's alone.
            mass: Math.max(p.mass * EARTH_MASS_UNIT, 1e-7),
            massInEarths: p.mass,
            baseColor: '#6ec6ff',
            radius: p.radius * RADIUS_UNITS_PER_EARTH,
            // Drawn oversized, measured true: the transit depth comes from this.
            radiusInEarths: p.radius,
            isTrappist: true,
          },
        });
      });
      return records;
    };
    expandGeometry(declared, {
      G: SETTINGS.gravitational_constant,
      units: { AU: SIM_UNITS_PER_AU },
      settings: SETTINGS,
      rules: geometryRules,
      // A mass in `unit`, or in the type's own unit.
      simMass: (type, ctor, unit) =>
        ctor *
        {
          suns: SOLAR_MASS_UNIT,
          earths: EARTH_MASS_UNIT,
          jupiters: JUPITER_MASS_UNIT,
        }[
          unit ??
            (type === 'Star'
              ? 'suns'
              : type === 'GasGiant'
                ? 'jupiters'
                : 'earths')
        ],
      create: ({ type, ctor, pos, vel, assign, from }) => {
        const [Body, list] =
          type === 'Star'
            ? [StarObject, stars]
            : type === 'GasGiant'
              ? [GasGiant, gas_giants]
              : type === 'BlackHole'
                ? [null, bh_list]
                : [Planet, planets];
        let body = from ? generated[type][from.generated] : undefined;
        if (body) {
          // Placed only if the step places it; everything else is the
          // generator's, as the hand-built blocks left it. A kept type's body
          // is still in its list.
          if (pos) body.pos = { ...pos };
          if (vel) body.vel = { ...vel };
          Object.assign(body, assign);
          if (!keep.has(type)) list.push(body);
          return body;
        }
        if (from && from.ifMissing !== 'make') return null;
        body = new Body({ ...pos }, { ...vel }, ctor);
        Object.assign(body, assign);
        list.push(body);
        return body;
      },
    });
    // The pair was built in the center-of-mass frame, so this should be a
    // no-op; running it anyway means a laboratory cannot start drifting if a
    // parameter is ever edited by hand.
    if (declared.recenter) zeroNetMomentum();
  }

  // Earth and the Moon are declared; the size of the simulated space is a
  // setting the scenario sets once the world exists, not geometry, and stays
  // here.
  if (starting_preset === 'earth-moon-system') {
    SETTINGS.sim_size = 'Small';
  }

  // Kepler's 2nd Law: the bodies are declared; the overlay is behavior, not
  // geometry, and stays here.
  if (starting_preset === 'keplers-2nd-law') {
    const eccPlanet = planets.find(p => p.name === 'Eccentric Orbiter');
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
