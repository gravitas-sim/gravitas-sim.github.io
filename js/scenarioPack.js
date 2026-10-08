// =============================================================================
// A scenario pack, compiled into a link the application already opens
// -----------------------------------------------------------------------------
// js/platform/scenario.js says what a pack may hold. This turns one into a
// share payload: the door every Gravitas link already goes through, so a pack
// needs no loader of its own and no code from it is ever run. A pack whose
// population is generated compiles to a seeded link, which the application
// rebuilds from the settings and the seed exactly as it rebuilds a built-in
// scenario's world; a pack that brings its own bodies compiles to a full
// link that carries them.
//
// It also reads the two things a pack can start from: a built-in scenario,
// through pristineSettingsFor() - the settings that scenario's preset
// produces, with nothing hand-built copied, because hand-built geometry is
// code - and a file from the Orbital System Builder, whose system becomes the
// pack's bodies.
//
// Used by the Scenario Studio (/studio/), by the SDK's test of a scenario
// pack, and by the tests. Never by the application itself.
// =============================================================================

import { DEFAULT_SETTINGS } from './appState.js';
import { INTEGRATORS, ABSORB_BUFFER } from './physics.js';
import { TAG_ORDER } from './data/scenarioTags.js';
import { pristineSettingsFor, settingsDelta } from './shareState.js';
import { SCENARIO_IDS } from './scenarios.js';
import { BUILDER_TYPES, SYSTEM_TYPES, validateSystem } from './systemSpec.js';
import { LIMITS } from './place/preciseFields.js';
import { EN_BUILDER } from './i18n/en.builder.js';
import { EN_PLACEMENT } from './i18n/en.placement.js';
import { EN_STUDIO } from './i18n/en.studio.js';
import { SIM_UNITS_PER_AU } from './constants.js';
import { SETTING_RULES, validateScenarioPack } from './platform/scenario.js';
import { packBodies } from './scenarioPackLink.js';

// The compiler and the system reader are in js/scenarioPackLink.js, which the
// Sandbox carries; the Studio and the SDK reach them from here as before.
export {
  blankPack,
  compileScenarioPack,
  packBodies,
  packFromOrbitalSystem,
} from './scenarioPackLink.js';

/**
 * Judge one typed body of a pack: a type, a mass in the type's unit, a
 * position and a velocity in simulation units, and optionally a radius.
 *
 * @param {object} b - {type, mass, x, y, vx, vy, radius?, name?}
 * @returns {Array<{field: string, key: string, vars: object}>}
 */
export function validateBody(b) {
  const out = [];
  const fail = (field, key, vars = {}) => out.push({ field, key, vars });
  const spec = BUILDER_TYPES[b.type];
  if (!spec) {
    fail('type', 'builder.error.type');
    return out;
  }
  if (!Number.isFinite(b.mass)) fail('mass', 'builder.error.number');
  else if (b.mass < spec.min || b.mass > spec.max) {
    fail('mass', 'builder.error.massRange', { min: spec.min, max: spec.max });
  }
  for (const [field, limit] of [
    ['x', LIMITS.position],
    ['y', LIMITS.position],
    ['vx', LIMITS.velocity],
    ['vy', LIMITS.velocity],
  ]) {
    if (!Number.isFinite(b[field])) fail(field, 'builder.error.number');
    else if (Math.abs(b[field]) > limit) {
      fail(field, 'place.precise.error.range', { limit });
    }
  }
  if (b.radius !== undefined && b.radius !== null) {
    if (b.type === 'BlackHole') fail('radius', 'builder.error.blackHoleRadius');
    else if (!(b.radius > 0) || b.radius > 1e4) {
      fail('radius', 'builder.error.radiusRange', { max: 1e4 });
    }
  }
  return out;
}

/**
 * What the pack validator needs to know about this build of Gravitas.
 * @returns {object} The `api` of validateScenarioPack
 */
export function scenarioApi() {
  return {
    defaults: DEFAULT_SETTINGS,
    locales: ['en', 'es'],
    tags: [...TAG_ORDER],
    integrators: [...INTEGRATORS],
    scenarios: [...SCENARIO_IDS],
    validateSystem,
    validateBody,
    explain,
  };
}

/**
 * A builder or placement message key, in English, for the SDK and the tests.
 * The Studio says the same keys in its reader's language.
 */
function explain(key, vars = {}) {
  const text = EN_BUILDER[key] ?? EN_PLACEMENT[key] ?? EN_STUDIO[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m
  );
}

/** Every problem with a pack, against this build. */
export const checkPack = pack => validateScenarioPack(pack, scenarioApi());

/** Three significant figures, for a number said in a caution. */
const said = v => (typeof v === 'number' ? Number(v.toPrecision(3)) : v);

/**
 * The cautions a pack's bodies earn. Heuristics, said as cautions and never
 * as errors, because none of them proves what a system will do:
 *
 *   - the Orbital System Builder's own checks on the system: overlap,
 *     contact at periapsis, Hill spheres, crossing orbits and the stability
 *     criteria (ORBITAL_SYSTEM_BUILDER.md);
 *   - an integration step longer than the system's shortest orbit wants;
 *   - two bodies that start inside each other, by the builder's own rule,
 *     where one of them is a typed body (the builder has checked the
 *     system's pairs);
 *   - a typed body moving faster than the escape speed from everything
 *     else, taken as one mass at its barycenter. A two-body estimate: a body
 *     it names may still be captured, and one it passes may still be thrown
 *     out by a close encounter. The energy of a pair is the same seen from
 *     either side, so only a body no heavier than the rest together is
 *     named: a planet leaves its star, not the star the planet.
 *
 * @param {object} pack - A valid pack
 * @returns {Array<{key: string, vars: object, bodies: number[]}>} `bodies`
 *   index packBodies(pack).bodies, the system's first; numbers in `vars`
 *   are rounded to three significant figures
 */
export function packCautions(pack) {
  const out = [];
  const say = (key, vars, bodies) => {
    const v = {};
    for (const [k, x] of Object.entries(vars)) v[k] = said(x);
    out.push({ key, vars: v, bodies });
  };
  const { bodies, built } = packBodies(pack);
  if (built) {
    for (const c of built.checks) say(c.key, c.vars, [...c.bodies]);
    const step = pack.settings?.max_timestep ?? DEFAULT_SETTINGS.max_timestep;
    if (!(step > 0) || step > built.settings.max_timestep * 1.01) {
      say('studio.caution.step', { step: built.settings.max_timestep }, []);
    }
  }
  const first = bodies.length - (pack.bodies?.length ?? 0);
  const bh = b => b.type === 'BlackHole';
  for (let i = 0; i < bodies.length; i++) {
    for (let j = Math.max(i + 1, first); j < bodies.length; j++) {
      const [a, b] = [bodies[i], bodies[j]];
      const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
      const contact =
        a.radius + b.radius + (bh(a) || bh(b) ? ABSORB_BUFFER : 0);
      if (d < contact) {
        say(
          'builder.check.overlap',
          {
            distance: d / SIM_UNITS_PER_AU,
            contact: contact / SIM_UNITS_PER_AU,
          },
          [i, j]
        );
      }
    }
  }
  const G =
    pack.settings?.gravitational_constant ??
    DEFAULT_SETTINGS.gravitational_constant;
  for (let i = first; i < bodies.length && bodies.length > 1; i++) {
    const b = bodies[i];
    let [M, x, y, vx, vy] = [0, 0, 0, 0, 0];
    for (const [k, o] of bodies.entries()) {
      if (k === i) continue;
      M += o.mass;
      x += o.mass * o.pos.x;
      y += o.mass * o.pos.y;
      vx += o.mass * o.vel.x;
      vy += o.mass * o.vel.y;
    }
    const r = Math.hypot(b.pos.x - x / M, b.pos.y - y / M);
    if (!(M > 0) || !(r > 0)) continue;
    const speed = Math.hypot(b.vel.x - vx / M, b.vel.y - vy / M);
    const escape = Math.sqrt((2 * G * (M + b.mass)) / r);
    if (speed > escape && b.mass <= M) {
      say('studio.caution.unbound', { speed, escape }, [i]);
    }
  }
  return out;
}

/**
 * A caution in English, for the SDK: bodies by their names, or by their
 * place in the pack's list when they have none.
 *
 * @param {object} pack - The pack the caution is about
 * @param {{key: string, vars: object, bodies: number[]}} c - From packCautions
 * @returns {string}
 */
export function describeCaution(pack, c) {
  const names = packBodies(pack).bodies.map(
    (b, i) => b.name || `body ${i + 1}`
  );
  const [one, two] = c.bodies.map(i => names[i]);
  return explain(c.key, { ...c.vars, first: one, second: two, name: one });
}

/**
 * The settings a built-in scenario's preset produces, as a pack can carry
 * them, and the ones it cannot.
 *
 * Read through pristineSettingsFor(), which runs the scenario's own preset on
 * a scratch copy of the defaults: the same code the application runs, so the
 * settings are the scenario's exactly. What a pack cannot carry is reported
 * rather than dropped quietly. Hand-built geometry is never copied: it is code
 * in js/world/build.js, keyed on the scenario's id.
 *
 * @param {string} name - A key of SCENARIO_INFO
 * @returns {{settings: object, dropped: string[]}}
 */
export function settingsFromScenario(name) {
  const delta = settingsDelta(
    pristineSettingsFor(name, DEFAULT_SETTINGS),
    DEFAULT_SETTINGS,
    'None'
  );
  const settings = {};
  const dropped = [];
  for (const [key, value] of Object.entries(delta)) {
    if (SETTING_RULES[key]) settings[key] = value;
    else dropped.push(key);
  }
  return { settings, dropped: dropped.sort() };
}

/**
 * The built-in scenarios whose world is generated from their settings alone.
 *
 * A pack made from one of these (settingsFromScenario) builds exactly the
 * built-in's world under the same seed. Every other built-in places its
 * bodies by code in js/world/build.js, keyed on its id, so a pack made from
 * it carries its settings and not its bodies. tests/scenarioPack.test.js
 * builds all of them both ways and holds this list to the result.
 */
export const GENERATED_SCENARIOS = Object.freeze([
  'supermassive-bh',
  'star-cluster',
  'sagittarius-a',
  'pulsar-system',
  'stellar-graveyard',
  'galactic-center',
  'supernova-remnant',
  'compact-object-zoo',
  'millisecond-pulsar',
  'intermediate-mass-bh',
  'galactic-collision',
  'micro-bh-swarm',
  'exoplanet-lab',
  'quasar-cannon',
  'the-pinwheel-galaxy-core',
  'star-frisbee',
  'kessler-cascade',
  'alien-dyson-swarm-collapse',
  'tidal-arm-tango',
  'hungry-hungry-holes',
  'slingshot-gauntlet',
  'stellar-nursery',
]);

export { SYSTEM_TYPES, BUILDER_TYPES };
