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
import { INTEGRATORS, GasGiant, ABSORB_BUFFER } from './physics.js';
import { TAG_ORDER } from './data/scenarioTags.js';
import {
  LINK_VERSION,
  linkNumber,
  pristineSettingsFor,
  settingsDelta,
} from './shareState.js';
import { SCENARIO_IDS } from './scenarios.js';
import { formatSeed } from './rng.js';
import {
  BUILDER_TYPES,
  SYSTEM_TYPES,
  validateSystem,
  buildSystem,
  defaultRadius,
  simMass,
  systemFromFile,
  systemSeed,
} from './systemSpec.js';
import { LIMITS } from './place/preciseFields.js';
import { EN_BUILDER } from './i18n/en.builder.js';
import { EN_PLACEMENT } from './i18n/en.placement.js';
import { EN_STUDIO } from './i18n/en.studio.js';
import { SIM_UNITS_PER_AU } from './constants.js';
import {
  FORMAT,
  FORMAT_VERSION,
  SETTING_RULES,
  validateScenarioPack,
} from './platform/scenario.js';

/** The share link's class name for each body type a pack may hold. */
const CLASS_OF = Object.freeze({
  Star: 'StarObject',
  WhiteDwarf: 'WhiteDwarf',
  NeutronStar: 'NeutronStar',
  BlackHole: 'BlackHole',
  GasGiant: 'GasGiant',
  Planet: 'Planet',
});

/** Where each class keeps its mass in the unit it reports. */
const REPORTED = Object.freeze({
  Star: 'massInSuns',
  WhiteDwarf: 'massInSuns',
  NeutronStar: 'massInSuns',
  GasGiant: 'massInJupiters',
  Planet: 'massInEarths',
});

/** One precision with the share trimmer: LINK_PRECISION in js/shareState.js. */
const sig = linkNumber;

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

/**
 * One body, as the share link restores it.
 *
 * The class, the position and velocity, the mass in simulation units and in
 * the unit the class reports, the contact radius and the name. The class's
 * own look follows from the mass once the body is restored; a gas giant's
 * kind is computed here with its own rule, because a link that left it out
 * would restore the giant as the kind its constructor drew at random.
 */
function packedBody({ type, name, mass, radius, pos, vel }) {
  const out = {
    type: CLASS_OF[type],
    pos: { x: sig(pos.x), y: sig(pos.y) },
    vel: { x: sig(vel.x), y: sig(vel.y) },
    mass: sig(simMass(type, mass)),
    radius: sig(radius ?? defaultRadius(type, mass)),
    persistent: true,
  };
  if (name) out.name = name;
  if (REPORTED[type]) out[REPORTED[type]] = mass;
  if (type === 'GasGiant') {
    out.giantType = GasGiant.prototype.calculateGiantType.call({
      massInJupiters: mass,
    });
  }
  return out;
}

/**
 * The bodies a pack starts with, in the order the link will carry them:
 * the orbital system first, then the typed bodies.
 *
 * @param {object} pack - A valid pack
 * @returns {{bodies: Array<object>, built: ?object}} Packed bodies, and the
 *   built system (for its checks and extent) when there is one
 */
export function packBodies(pack) {
  const bodies = [];
  let built = null;
  if (pack.system) {
    const verdict = validateSystem({ bodies: pack.system.bodies });
    const G =
      pack.settings?.gravitational_constant ??
      DEFAULT_SETTINGS.gravitational_constant;
    built = buildSystem(verdict.bodies, { G });
    for (const b of built.bodies) {
      bodies.push(
        packedBody({
          type: b.type,
          name: b.name,
          mass: b.mass,
          radius: b.radiusGiven ? b.radius : null,
          pos: b.pos,
          vel: b.vel,
        })
      );
    }
  }
  for (const b of pack.bodies || []) {
    bodies.push(
      packedBody({
        type: b.type,
        name: b.name,
        mass: b.mass,
        radius: b.radius ?? null,
        pos: { x: b.x, y: b.y },
        vel: { x: b.vx, y: b.vy },
      })
    );
  }
  return { bodies, built };
}

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
 * Compile a pack into a share payload.
 *
 * `s: 'None'` with the pack's settings as the delta: the application rebuilds
 * a 'None' link from its default settings plus that delta (js/ui.js
 * applyShareState), which is what a built-in scenario's preset does to the
 * same defaults; a pack naming a built-in compiles to its id, the settings
 * over that scenario's own. The instruments to open, and the pack's identity
 * ({pack: {id, version}}, carried on into links made of the world), ride in
 * the extras, where an older build ignores them.
 *
 * @param {object} pack - A valid pack (checkPack(pack) is empty)
 * @returns {object} A payload for encodePayload()
 */
export function compileScenarioPack(pack) {
  const payload = {
    v: LINK_VERSION,
    s: pack.scenario ?? 'None',
    seed: formatSeed(pack.seed),
  };
  const d = { ...(pack.settings || {}) };
  if (Object.keys(d).length) payload.d = d;
  if (pack.camera) {
    payload.c = [
      pack.camera.zoom,
      pack.camera.pan?.x ?? 0,
      pack.camera.pan?.y ?? 0,
    ];
  }
  const { bodies } = packBodies(pack);
  if (bodies.length) payload.b = bodies;
  if (pack.paused) payload.p = 1;
  const x = { v: 1, pack: { id: pack.id, version: pack.version } };
  const inc = pack.observer?.inclination;
  const pa = pack.observer?.positionAngle;
  if (Number.isFinite(pa) && pa !== 0) x.pa = pa;
  if (Number.isFinite(inc) && inc !== 90) x.inc = inc;
  if (pack.tools?.length) x.tools = [...pack.tools].sort();
  if (pack.open?.length) x.open = [...pack.open];
  if (Object.keys(x).length > 1) payload.x = x;
  return payload;
}

/**
 * A new, empty pack: English and Spanish, a seed, and nothing else.
 * @param {number} seed - An unsigned 32-bit seed
 * @returns {object} A pack that needs a title and a summary to be valid
 */
export function blankPack(seed) {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    id: 'my-scenario',
    version: '1.0.0',
    locales: ['en', 'es'],
    title: { en: '', es: '' },
    summary: { en: '', es: '' },
    tags: [],
    seed: seed >>> 0,
    settings: {},
  };
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
 * A pack from an Orbital System Builder file (gravitas.orbital-system/1).
 *
 * The system becomes the pack's bodies and the builder's own world settings
 * become its settings, so the pack runs as the builder would have built it.
 * The seed is the builder's, derived from the system.
 *
 * @param {object} data - The parsed file
 * @returns {{ok: boolean, pack?: object, key?: string, vars?: object}}
 */
export function packFromOrbitalSystem(data) {
  const read = systemFromFile(data);
  if (!read.ok) return read;
  const verdict = validateSystem(read.system);
  if (!verdict.ok) return { ok: false, key: 'builder.file.notSystem' };
  const built = buildSystem(verdict.bodies, {
    G: DEFAULT_SETTINGS.gravitational_constant,
  });
  const pack = blankPack(systemSeed(verdict.bodies));
  pack.system = { bodies: data.bodies };
  const settings = {};
  for (const [key, value] of Object.entries(built.settings)) {
    if (value !== DEFAULT_SETTINGS[key]) settings[key] = value;
  }
  pack.settings = settings;
  return { ok: true, pack };
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
