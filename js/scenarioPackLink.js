// =============================================================================
// A scenario pack's bodies and its link, without the checks
// -----------------------------------------------------------------------------
// The half of js/scenarioPack.js the application itself can carry: the
// packed form of a body, the compiler from a pack to the share payload and
// the reading of an Orbital System Builder file as a pack. It imports only
// what the Sandbox already holds, so the builder can keep a system as a link
// (js/myWork/made.js) without the validators, and their words, that the
// Scenario Studio brings. js/scenarioPack.js re-exports all of it.
// =============================================================================

import { DEFAULT_SETTINGS } from './appState.js';
import { GasGiant } from './physics.js';
import { LINK_VERSION, linkNumber } from './shareState.js';
import { formatSeed } from './rng.js';
import {
  validateSystem,
  buildSystem,
  defaultRadius,
  simMass,
  systemFromFile,
  systemSeed,
} from './systemSpec.js';
import { FORMAT, FORMAT_VERSION } from './platform/scenario.js';

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
