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
// pack, by the tests, and, lazily, by the Orbital System Builder, which keeps
// a system as a link in My work (js/myWork/made.js).
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
import {
  SCENARIO_IDS,
  SCENARIO_GEOMETRY,
  expandGeometry,
} from './scenarios.js';
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
  POPULATION_COUNTS,
  SETTING_RULES,
  validateScenarioPack,
} from './platform/scenario.js';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const UNSAFE_KEY = new Set(['__proto__', 'constructor', 'prototype']);

// --- Declarative geometry (SCENARIO_GEOMETRY.md) ------------------------------
// {steps: [...]}, one construct a step: `body` (a type, a name, a mass in the
// type's own unit, a place or an `orbit` round an earlier body) or `rule` (a
// named rule with parameters). A pack carries only the plain `body`; the rest
// (a rule, a body reused from the generator, a distance in drawn radii, a
// barycentric or random-phase orbit, the engine's own body properties) is
// engine code or reads engine state, so `validateGeometry(g, {rules: false})`
// refuses it and a pack that wants one names the built-in in `scenario`.
// The arithmetic is js/scenarios.js expandGeometry().

/** The most steps a geometry may hold. */
export const GEOMETRY_MAX_STEPS = 40;

/** The body types a geometry may make, and the unit each is massed in. */
export const GEOMETRY_TYPES = Object.freeze({
  Star: 'suns',
  Planet: 'earths',
  GasGiant: 'jupiters',
});

/** The look of a body, and nothing else, may be set after it is made. */
export const GEOMETRY_SET = Object.freeze({
  radius: 'positive',
  baseColor: 'color',
  persistent: 'bool',
});

/**
 * What a built-in may also set: the properties the engine's bodies carry and
 * the readouts, labels and renderers read (a star's true radius and
 * luminosity, a world's gravity and atmosphere). A kind is `positive` (a
 * number above 0), `nonneg` (0 or more), `text` or `bool`.
 */
export const GEOMETRY_ENGINE_SET = Object.freeze({
  radiusInSuns: 'positive',
  radiusInEarths: 'positive',
  luminosityInSuns: 'positive',
  temperature: 'positive',
  spectralType: 'text',
  showHabitableZone: 'bool',
  isEarth: 'bool',
  isMoon: 'bool',
  diameter: 'positive',
  orbital_period: 'positive',
  rotation_period: 'positive',
  density: 'text',
  density_kg_m3: 'positive',
  gravity: 'positive',
  escape_velocity: 'positive',
  atmosphere: 'text',
  surface_pressure: 'nonneg',
  magnetic_field: 'nonneg',
  albedo: 'nonneg',
});

/** The named rules, and what each takes. */
export const GEOMETRY_RULES = Object.freeze({
  'published-system': Object.freeze({
    system: Object.freeze([
      'galilean',
      'pluto-neptune',
      'jupiter-trojans',
      'trappist-1',
    ]),
    detuned: 'bool',
  }),
});

/** The types whose generated bodies a geometry may `keep`: every population. */
export const GEOMETRY_KEEP_TYPES = Object.freeze([
  'Star',
  'Planet',
  'GasGiant',
  'BlackHole',
  'Asteroid',
  'Comet',
  'NeutronStar',
  'WhiteDwarf',
  'Debris',
]);

/** The types a body can be reused as (`from`): the generator's own lists. */
export const GEOMETRY_REUSE_TYPES = Object.freeze([
  'Star',
  'Planet',
  'GasGiant',
  'BlackHole',
]);

const GEOMETRY_LIMIT = 1e6;
const GEOMETRY_COLOR = /^#[0-9a-fA-F]{6}$/;
const GEOMETRY_NAME = /^[^<>\p{Cc}]{1,40}$/u;

/**
 * Every problem with a geometry, each naming its field; `rules: false` refuses
 * the `rule` construct, as a pack must.
 * @param {unknown} g - {steps: [...]}
 * @param {{rules?: boolean}} [opts]
 * @returns {Array<{path: string, why: string}>}
 */
export function validateGeometry(g, { rules = true } = {}) {
  const out = [];
  const bad = (path, why) => out.push({ path, why });
  if (!isObject(g)) return [{ path: '', why: 'a geometry is {steps: [...]}' }];
  for (const k of Object.keys(g))
    if (k !== 'steps' && k !== 'keep') bad(k, `"${k}" is not a geometry field`);
  // `keep`: generated bodies of these types that no step reuses stay in the
  // world as the generator drew them, instead of being dropped.
  if (g.keep !== undefined && rules) {
    if (
      !Array.isArray(g.keep) ||
      new Set(g.keep).size !== g.keep.length ||
      g.keep.some(k => !GEOMETRY_KEEP_TYPES.includes(k))
    )
      bad('keep', `a list, once each, of ${GEOMETRY_KEEP_TYPES.join(', ')}`);
  } else if (g.keep !== undefined) {
    bad('keep', 'a scenario pack may not use generated bodies left in place');
  }
  if (!Array.isArray(g.steps) || g.steps.length === 0) {
    bad('steps', 'a list of at least one step');
    return out;
  }
  if (g.steps.length > GEOMETRY_MAX_STEPS)
    bad('steps', `at most ${GEOMETRY_MAX_STEPS} steps`);
  const names = new Set();
  const only = (o, path, allowed) => {
    for (const k of Object.keys(o))
      if (UNSAFE_KEY.has(k) || !allowed.includes(k))
        bad(`${path}.${k}`, `"${k}" is not allowed here`);
  };
  const num = (v, path, min, max, open) => {
    const ok =
      typeof v === 'number' &&
      Number.isFinite(v) &&
      (open ? v > min : v >= min) &&
      v <= max;
    if (!ok) bad(path, `a number from ${min} to ${max}`);
  };
  const unit = (v, path, kinds, min, max, open) => {
    if (!isObject(v) || Object.keys(v).length !== 1)
      return bad(path, `exactly one of ${kinds.join(', ')}, with a number`);
    const [k] = Object.keys(v);
    if (!kinds.includes(k))
      return bad(`${path}.${k}`, `one of ${kinds.join(', ')}`);
    num(v[k], `${path}.${k}`, min, max, open);
  };
  const xy = (v, path) => {
    if (!isObject(v)) return bad(path, 'an {x, y} pair');
    only(v, path, ['x', 'y']);
    num(v.x, `${path}.x`, -GEOMETRY_LIMIT, GEOMETRY_LIMIT);
    num(v.y, `${path}.y`, -GEOMETRY_LIMIT, GEOMETRY_LIMIT);
  };
  // What only a built-in may use: engine code or engine state.
  const engine = (path, what) => {
    if (!rules) bad(path, `a scenario pack may not use ${what}`);
    return rules;
  };
  const body = (b, p) => {
    if (!isObject(b)) return bad(p, 'a body: {type, name, mass, ...}');
    only(b, p, [
      'type',
      'name',
      'mass',
      'from',
      'at',
      'velocity',
      'orbit',
      'set',
    ]);
    // `from` reuses a body the generator drew; a black hole can only be reused.
    let reuse = false;
    if (b.from !== undefined) {
      const f = b.from;
      reuse = engine(`${p}.from`, 'a body reused from the generator');
      if (!isObject(f)) bad(`${p}.from`, 'an object: {generated: index}');
      else if (reuse) {
        only(f, `${p}.from`, ['generated', 'ifMissing']);
        if (!Number.isInteger(f.generated) || f.generated < 0)
          bad(`${p}.from.generated`, 'the index of a generated body, from 0');
        if (
          f.ifMissing !== undefined &&
          !['make', 'skip'].includes(f.ifMissing)
        )
          bad(`${p}.from.ifMissing`, 'make or skip');
        if (f.ifMissing === 'make' && b.mass === undefined)
          bad(`${p}.from.ifMissing`, 'make needs a mass to make the body with');
      }
    }
    const unitName = GEOMETRY_TYPES[b.type];
    if (!unitName && !(reuse && GEOMETRY_REUSE_TYPES.includes(b.type)))
      bad(
        `${p}.type`,
        `one of ${(reuse ? GEOMETRY_REUSE_TYPES : Object.keys(GEOMETRY_TYPES)).join(', ')}`
      );
    if (typeof b.name !== 'string' || !GEOMETRY_NAME.test(b.name))
      bad(`${p}.name`, 'a plain name of 1 to 40 characters');
    else if (names.has(b.name))
      bad(`${p}.name`, `"${b.name}" names two bodies`);
    if (b.type === 'BlackHole') {
      if (b.mass !== undefined)
        bad(
          `${p}.mass`,
          'a reused black hole keeps the mass it was drawn with'
        );
    } else if (b.mass !== undefined || !reuse) {
      unit(
        b.mass,
        `${p}.mass`,
        unitName ? [unitName] : Object.values(GEOMETRY_TYPES),
        0,
        1e9,
        true
      );
    }
    if (b.orbit !== undefined) {
      if (b.at !== undefined || b.velocity !== undefined)
        bad(p, 'an orbit gives the place and velocity: no `at` or `velocity`');
      const o = b.orbit;
      const op = `${p}.orbit`;
      if (!isObject(o)) bad(op, 'an orbit: {around, distance, ...}');
      else {
        only(o, op, [
          'around',
          'distance',
          'eccentricity',
          'angle',
          'barycentric',
        ]);
        if (typeof o.around !== 'string' || !names.has(o.around))
          bad(`${op}.around`, 'the name of a body made earlier');
        const radii = isObject(o.distance) && 'radii' in o.distance;
        if (radii && engine(`${op}.distance`, 'a distance in drawn radii'))
          unit(o.distance, `${op}.distance`, ['radii'], 0, 1e4, true);
        else if (!radii)
          unit(
            o.distance,
            `${op}.distance`,
            ['au', 'units'],
            0,
            GEOMETRY_LIMIT,
            true
          );
        if (o.barycentric !== undefined) {
          if (typeof o.barycentric !== 'boolean')
            bad(`${op}.barycentric`, 'true or false');
          else if (
            o.barycentric &&
            engine(`${op}.barycentric`, 'a barycentric orbit') &&
            o.eccentricity
          )
            bad(`${op}.eccentricity`, 'a barycentric orbit is circular');
        }
        if (
          o.eccentricity !== undefined &&
          !(
            typeof o.eccentricity === 'number' &&
            o.eccentricity >= 0 &&
            o.eccentricity < 1
          )
        )
          bad(`${op}.eccentricity`, 'from 0 up to, not including, 1');
        if (isObject(o.angle) && 'random' in o.angle) {
          if (
            engine(`${op}.angle`, 'a random angle') &&
            !(Object.keys(o.angle).length === 1 && o.angle.random === true)
          )
            bad(`${op}.angle`, 'exactly {random: true}');
        } else if (o.angle !== undefined)
          unit(o.angle, `${op}.angle`, ['deg', 'rad', 'pi'], -1e4, 1e4);
      }
    } else {
      if (b.at !== undefined) xy(b.at, `${p}.at`);
      if (b.velocity !== undefined) xy(b.velocity, `${p}.velocity`);
    }
    if (b.set !== undefined) {
      if (!isObject(b.set)) bad(`${p}.set`, 'an object');
      else {
        // An engine property is refused for a pack by name; any other key is
        // refused as not allowed here.
        for (const k of Object.keys(b.set)) {
          const at = `${p}.set.${k}`;
          if (UNSAFE_KEY.has(k)) bad(at, `"${k}" is not allowed here`);
          else if (Object.hasOwn(GEOMETRY_ENGINE_SET, k))
            engine(at, `an engine property (${k})`);
          else if (!Object.hasOwn(GEOMETRY_SET, k))
            bad(at, `"${k}" is not allowed here`);
        }
        for (const [k, v] of Object.entries(b.set)) {
          const engineKind = Object.hasOwn(GEOMETRY_ENGINE_SET, k);
          const kind = engineKind ? GEOMETRY_ENGINE_SET[k] : GEOMETRY_SET[k];
          const at = `${p}.set.${k}`;
          if (!kind || (engineKind && !rules)) continue;
          if (kind === 'bool' && typeof v !== 'boolean')
            bad(at, 'true or false');
          else if (kind === 'positive')
            num(v, at, 0, engineKind ? 1e9 : 1e4, true);
          else if (kind === 'nonneg') num(v, at, 0, 1e9);
          else if (
            kind === 'text' &&
            !(typeof v === 'string' && GEOMETRY_NAME.test(v))
          )
            bad(at, 'a short plain text');
          else if (
            kind === 'color' &&
            !(typeof v === 'string' && GEOMETRY_COLOR.test(v))
          )
            bad(at, 'a color such as #ffd86b');
        }
      }
    }
    if (typeof b.name === 'string') names.add(b.name);
  };
  const rule = (r, p) => {
    if (!rules) return bad(p, 'a scenario pack may not use a named rule');
    if (!isObject(r)) return bad(p, 'a rule: {name, params}');
    only(r, p, ['name', 'params']);
    const spec = GEOMETRY_RULES[r.name];
    if (!spec)
      return bad(
        `${p}.name`,
        `one of ${Object.keys(GEOMETRY_RULES).join(', ')}`
      );
    const params = r.params ?? {};
    if (!isObject(params)) return bad(`${p}.params`, 'an object');
    only(params, `${p}.params`, Object.keys(spec));
    if (!spec.system.includes(params.system))
      bad(`${p}.params.system`, `one of ${spec.system.join(', ')}`);
    if (params.detuned !== undefined && typeof params.detuned !== 'boolean')
      bad(`${p}.params.detuned`, 'true or false');
    if (params.detuned && params.system !== 'galilean')
      bad(`${p}.params.detuned`, 'only the Galilean system can be detuned');
  };
  g.steps.forEach((step, i) => {
    const at = `steps[${i}]`;
    if (!isObject(step) || Object.keys(step).length !== 1)
      return bad(at, 'a step with exactly one construct: body or rule');
    const [kind] = Object.keys(step);
    if (kind === 'body') body(step.body, `${at}.body`);
    else if (kind === 'rule') rule(step.rule, `${at}.rule`);
    else bad(`${at}.${kind}`, 'a construct this build knows: body or rule');
  });
  return out;
}

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
    validateGeometry,
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
function packedBody({
  type,
  name,
  mass,
  radius,
  pos,
  vel,
  baseColor,
  persistent = true,
}) {
  const out = {
    type: CLASS_OF[type],
    pos: { x: sig(pos.x), y: sig(pos.y) },
    vel: { x: sig(vel.x), y: sig(vel.y) },
    mass: sig(simMass(type, mass)),
    radius: sig(radius ?? defaultRadius(type, mass)),
    persistent,
  };
  if (!persistent) delete out.persistent;
  if (baseColor) out.baseColor = baseColor;
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
  if (pack.geometry) {
    const G =
      pack.settings?.gravitational_constant ??
      DEFAULT_SETTINGS.gravitational_constant;
    expandGeometry(pack.geometry, {
      G,
      units: { AU: SIM_UNITS_PER_AU },
      create: ({ type, ctor, pos, vel, assign }) => {
        const body = {
          type,
          name: assign.name,
          mass: simMass(type, ctor),
          pos,
          vel,
        };
        bodies.push(
          packedBody({
            type,
            name: assign.name,
            mass: ctor,
            radius: assign.radius ?? null,
            pos,
            vel,
            baseColor: assign.baseColor,
            persistent: assign.persistent === true,
          })
        );
        return body;
      },
    });
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
 * A built-in's declared geometry as a pack carries it, or null: generated,
 * still coded, or declared with a construct only a built-in may use (a named
 * rule, a body reused from the generator, an engine property; a pack names
 * that built-in in `scenario`).
 * @param {string} name - A key of SCENARIO_INFO
 * @returns {?{steps: object[]}} A copy
 */
export function geometryFromScenario(name) {
  const g = SCENARIO_GEOMETRY[name];
  if (!g || validateGeometry(g, { rules: false }).length) return null;
  return JSON.parse(JSON.stringify(g));
}

/** The built-ins whose declared geometry a pack can carry. */
export const GEOMETRY_SCENARIOS = Object.freeze(
  Object.keys(SCENARIO_GEOMETRY).filter(k => geometryFromScenario(k))
);

/**
 * settingsFromScenario with every population count at 0: the geometry replaces
 * the generated population.
 * @param {string} name - A key of SCENARIO_INFO
 * @returns {{settings: object, dropped: string[]}}
 */
export function settingsWithGeometry(name) {
  const { settings, dropped } = settingsFromScenario(name);
  for (const key of POPULATION_COUNTS) {
    if ((settings[key] ?? DEFAULT_SETTINGS[key]) > 0) settings[key] = 0;
  }
  return { settings, dropped };
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
