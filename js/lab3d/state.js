// =============================================================================
// gravitas.system3d/1: a 3-D system as data
// -----------------------------------------------------------------------------
// What the 3-D kernel runs, and what is saved, shared and archived: units,
// the integrator, and every body as numbers.
//
//   {
//     format: 'gravitas.system3d', formatVersion: 1,
//     units: 'code' | 'solar',
//     integrator: { scheme, h } | { scheme: 'dopri5', tol },
//     t: 0,
//     bodies: [{ id, name?, m, radius, x: [3], v: [3] }],
//     provenance?: { from, note? }
//   }
//
// Units are a system, not a label per number, so every quantity in a file is
// in the same consistent set and G follows from it:
//
//   code   G = 1; length, time and mass in the code's own units
//   solar  AU, days and solar masses; G = k^2, the Gaussian gravitational
//          constant squared, 2.959122082855911e-4 AU^3 / (M_sun d^2)
//
// convertUnits() changes one system into another by scaling length, time and
// mass together, and checks that G comes out as the target's G: that is the
// dimensional check, and it fails loudly on a factor applied to the wrong
// quantity.
//
// Numbers, never a recipe (VALIDATED_3D_LAB_GATE.md): a body is its position
// and velocity. Elements are converted before a system is made
// (./elements.js), and a body that gives both elements and a state is refused
// as ambiguous rather than one of them silently winning.
//
// Pure: no DOM and no engine. The page, the Worker and the tests share it.
// =============================================================================

import { makeChecker } from '../platform/checker.js';
import { fromElements, elementsProblem } from './elements.js';
import { mulberry32 } from '../rng.js';

export const FORMAT = 'gravitas.system3d';
export const FORMAT_VERSION = 1;
export const MAX_BODIES = 50;
export const MIN_BODIES = 2;
/** The Gaussian gravitational constant, k (IAU 1938, exact by definition). */
export const GAUSSIAN_K = 0.01720209895;
export const UNIT_SYSTEMS = Object.freeze({
  code: { G: 1, length: null, time: null, mass: null },
  solar: {
    G: GAUSSIAN_K * GAUSSIAN_K,
    length: { unit: 'AU', meters: 1.495978707e11 },
    time: { unit: 'd', seconds: 86400 },
    mass: { unit: 'Msun', kilograms: 1.988409870698051e30 },
  },
});
/**
 * The integrators a system may name: ./kernel.js SCHEMES and its adaptive
 * dopri5, as data so that a page reading this module does not load the
 * kernel (tests/lab3d.test.js holds the two lists together).
 */
export const SCHEME_NAMES = Object.freeze([
  'leapfrog',
  'yoshida4',
  'yoshida4c',
  'rk4',
  'dopri5',
]);
/** The default: symplectic, fourth order, compensated (the gate's R1 to R5). */
export const DEFAULT_INTEGRATOR = Object.freeze({
  scheme: 'yoshida4c',
  h: 0.001,
});
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const vec3 = v =>
  Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/**
 * Every problem with a system, each on a path, with a code for its words.
 * A system that passes can be made into a kernel state and run.
 */
export function validateSystem(input) {
  const { out, need, guard } = makeChecker(input, { entities: [] });
  if (!guard()) return out;
  const s = input;
  for (const k of Object.keys(s))
    need(
      [
        'format',
        'formatVersion',
        'units',
        'integrator',
        't',
        'bodies',
        'provenance',
      ].includes(k),
      k,
      'field',
      `"${k}" is not a field of a system`,
      { field: k }
    );
  need(s.format === FORMAT, 'format', 'format', `must be "${FORMAT}"`);
  need(
    s.formatVersion === FORMAT_VERSION,
    'formatVersion',
    'formatVersion',
    `must be ${FORMAT_VERSION}`
  );
  need(
    Object.hasOwn(UNIT_SYSTEMS, s.units || ''),
    'units',
    'units',
    'code or solar'
  );
  need(s.t === undefined || Number.isFinite(s.t), 't', 'number', 'a number');
  if (s.provenance !== undefined) {
    const p = s.provenance;
    const ok =
      p &&
      typeof p === 'object' &&
      !Array.isArray(p) &&
      typeof p.from === 'string' &&
      p.from.length <= 120 &&
      (p.note === undefined ||
        (typeof p.note === 'string' && p.note.length <= 300)) &&
      Object.keys(p).every(k => k === 'from' || k === 'note');
    need(
      ok,
      'provenance',
      'provenance',
      'where the system came from, in words'
    );
  }
  const it = s.integrator;
  if (!it || typeof it !== 'object')
    need(false, 'integrator', 'integrator', 'a scheme and its step');
  else {
    need(
      SCHEME_NAMES.includes(it.scheme),
      'integrator.scheme',
      'scheme',
      `one of ${SCHEME_NAMES.join(', ')}`,
      {
        options: SCHEME_NAMES.join(', '),
      }
    );
    if (it.scheme === 'dopri5') {
      need(
        Number.isFinite(it.tol) && it.tol >= 1e-14 && it.tol <= 1e-6,
        'integrator.tol',
        'tolerance',
        'a tolerance from 1e-14 to 1e-6'
      );
      need(
        it.h === undefined,
        'integrator.h',
        'ambiguous',
        'an adaptive scheme chooses its own step'
      );
    } else {
      need(
        Number.isFinite(it.h) && it.h > 0,
        'integrator.h',
        'step',
        'a step greater than zero'
      );
      need(
        it.tol === undefined,
        'integrator.tol',
        'ambiguous',
        'a fixed-step scheme has no tolerance'
      );
    }
    for (const k of Object.keys(it))
      need(
        ['scheme', 'h', 'tol'].includes(k),
        `integrator.${k}`,
        'field',
        `"${k}" is not a field here`,
        { field: k }
      );
  }
  const bodies = Array.isArray(s.bodies) ? s.bodies : [];
  need(
    Array.isArray(s.bodies) &&
      bodies.length >= MIN_BODIES &&
      bodies.length <= MAX_BODIES,
    'bodies',
    'bodyCount',
    `from ${MIN_BODIES} to ${MAX_BODIES} bodies`,
    { min: MIN_BODIES, max: MAX_BODIES }
  );
  const ids = new Set();
  let massive = 0;
  bodies.forEach((b, i) => {
    const at = `bodies[${i}]`;
    if (!b || typeof b !== 'object' || Array.isArray(b))
      return need(false, at, 'object', 'a body');
    for (const k of Object.keys(b))
      need(
        ['id', 'name', 'm', 'radius', 'x', 'v'].includes(k),
        `${at}.${k}`,
        k === 'elements' ? 'ambiguous' : 'field',
        k === 'elements'
          ? 'elements are converted before a system is made; a body is its numbers'
          : `"${k}" is not a field of a body`,
        { field: k }
      );
    need(
      ID.test(b.id || ''),
      `${at}.id`,
      'id',
      'lower-case words joined by hyphens'
    );
    need(!ids.has(b.id), `${at}.id`, 'duplicate', `"${b.id}" is used above`, {
      id: b.id,
    });
    ids.add(b.id);
    need(
      b.name === undefined ||
        (typeof b.name === 'string' &&
          b.name.length <= 80 &&
          !/[<>]/.test(b.name)),
      `${at}.name`,
      'name',
      'a name of up to 80 characters'
    );
    need(
      Number.isFinite(b.m) && b.m >= 0,
      `${at}.m`,
      'mass',
      'a mass of zero (a test particle) or more'
    );
    if (b.m > 0) massive++;
    need(
      Number.isFinite(b.radius) && b.radius >= 0,
      `${at}.radius`,
      'radius',
      'a radius of zero or more'
    );
    need(vec3(b.x), `${at}.x`, 'vector', 'three finite numbers');
    need(vec3(b.v), `${at}.v`, 'vector', 'three finite numbers');
  });
  need(
    !bodies.length || massive >= 1,
    'bodies',
    'noMass',
    'at least one body with mass'
  );
  // Two bodies already in contact would merge before the first step, and which
  // of the two was meant is not something to guess.
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      if (!vec3(a?.x) || !vec3(b?.x)) continue;
      const d = Math.hypot(a.x[0] - b.x[0], a.x[1] - b.x[1], a.x[2] - b.x[2]);
      if (d === 0)
        need(
          false,
          `bodies[${j}].x`,
          'coincident',
          `in the same place as "${a.id}"`,
          { id: a.id }
        );
      else if (d < (a.radius || 0) + (b.radius || 0))
        need(false, `bodies[${j}].x`, 'overlap', `already touching "${a.id}"`, {
          id: a.id,
        });
    }
  return out;
}

/** The kernel state of a validated system (./kernel.js makeState's input). */
export function bodiesOf(system) {
  return system.bodies.map(b => ({
    m: b.m,
    radius: b.radius,
    x: [...b.x],
    v: [...b.v],
  }));
}

export const gravityOf = system => UNIT_SYSTEMS[system.units].G;

/**
 * The same system in another unit system, scaled by length L, time T and
 * mass Mu (target units per source unit). G must scale as L^3 / (Mu T^2);
 * the check is that it lands on the target's G to a part in 10^12.
 */
export function convertUnits(system, units, { length, time, mass } = {}) {
  const from = UNIT_SYSTEMS[system.units];
  const to = UNIT_SYSTEMS[units];
  if (!from || !to) throw new Error('units: unknown system');
  let L = length;
  let T = time;
  let Mu = mass;
  if (from.length && to.length) {
    L = from.length.meters / to.length.meters;
    T = from.time.seconds / to.time.seconds;
    Mu = from.mass.kilograms / to.mass.kilograms;
  }
  if (![L, T, Mu].every(q => Number.isFinite(q) && q > 0))
    throw new Error(
      'units: code units need an explicit length, time and mass scale'
    );
  const G = (from.G * L * L * L) / (Mu * T * T);
  if (Math.abs(G - to.G) > 1e-12 * to.G)
    throw new Error(
      `units: the scales do not carry G = ${from.G} to G = ${to.G} (got ${G})`
    );
  return {
    ...system,
    units,
    t: (system.t || 0) * T,
    integrator:
      system.integrator.scheme === 'dopri5'
        ? { ...system.integrator }
        : { ...system.integrator, h: system.integrator.h * T },
    bodies: system.bodies.map(b => ({
      ...b,
      m: b.m * Mu,
      radius: b.radius * L,
      x: b.x.map(q => q * L),
      v: b.v.map(q => (q * L) / T),
    })),
  };
}

/**
 * A system's body from elements about another body already placed, as the
 * builder offers it: the body's own numbers, computed once, here.
 */
export function placeByElements(
  system,
  { id, name, m, radius = 0, about, elements }
) {
  const primary = system.bodies.find(b => b.id === about);
  if (!primary) throw new Error(`elements: no body "${about}" to orbit`);
  const mu = gravityOf(system) * (primary.m + m);
  const problem = elementsProblem(elements, mu);
  if (problem) throw new Error(`elements: ${problem}`);
  const r = fromElements(elements, mu);
  return {
    id,
    ...(name ? { name } : {}),
    m,
    radius,
    x: primary.x.map((q, k) => q + r.x[k]),
    v: primary.v.map((q, k) => q + r.v[k]),
  };
}

/** Move a system to its barycenter at rest: a view many problems start from. */
export function atBarycenter(system) {
  let M = 0;
  const c = [0, 0, 0];
  const w = [0, 0, 0];
  for (const b of system.bodies) {
    M += b.m;
    for (let k = 0; k < 3; k++) {
      c[k] += b.m * b.x[k];
      w[k] += b.m * b.v[k];
    }
  }
  return {
    ...system,
    bodies: system.bodies.map(b => ({
      ...b,
      x: b.x.map((q, k) => q - c[k] / M),
      v: b.v.map((q, k) => q - w[k] / M),
    })),
  };
}

/**
 * Nudge every body by a seeded offset, for an experiment's seed set. Only
 * + - * / on mulberry32's output: a direction is found by rejection in the
 * unit cube, so the same seed gives the same numbers in every engine, which
 * sin and cos would not.
 */
export function perturb(system, seed, { position = 0, velocity = 0 } = {}) {
  const rand = mulberry32(seed >>> 0);
  const direction = () => {
    for (;;) {
      const d = [2 * rand() - 1, 2 * rand() - 1, 2 * rand() - 1];
      const q = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      if (q > 1e-6 && q <= 1) {
        const r = Math.sqrt(q);
        return d.map(c => c / r);
      }
    }
  };
  return {
    ...system,
    bodies: system.bodies.map(b => {
      const dx = direction();
      const dv = direction();
      return {
        ...b,
        x: b.x.map((q, k) => q + position * dx[k]),
        v: b.v.map((q, k) => q + velocity * dv[k]),
      };
    }),
  };
}

/**
 * Any file the lab reads, as a system of this version, or why not.
 *
 * - gravitas.system3d/1: as it is.
 * - gravitas.orbital-system/1, the 2-D Orbital System Builder's file: its
 *   recorded initial numbers (never its elements, rebuilt here), in the
 *   plane z = 0, in code units with the file's own G. Radii were not
 *   recorded, so the bodies are points: nothing collides.
 * - Anything newer, or anything else: refused, and said so.
 */
export function migrateSystem(data) {
  if (!data || typeof data !== 'object')
    return { ok: false, code: 'notSystem' };
  if (data.format === FORMAT) {
    if (data.formatVersion > FORMAT_VERSION)
      return {
        ok: false,
        code: 'newer',
        vars: { version: data.formatVersion },
      };
    if (data.formatVersion !== FORMAT_VERSION)
      return { ok: false, code: 'notSystem' };
    return { ok: true, system: data, migrated: false };
  }
  if (data.format === 'gravitas.orbital-system') {
    const version = Number(data.version);
    if (version !== 1)
      return {
        ok: false,
        code: version > 1 ? 'newer' : 'notSystem',
        vars: { version },
      };
    const init = data.initial;
    if (
      !init ||
      !Number.isFinite(init.G) ||
      init.G <= 0 ||
      !Array.isArray(init.bodies)
    )
      return { ok: false, code: 'noInitialState' };
    // The lab's code units have G = 1; the file's own G is folded into the
    // masses (G m is all gravity reads), which keeps every orbit as it was.
    const bodies = init.bodies.map((b, i) => ({
      id: `body-${i + 1}`,
      ...(typeof data.bodies?.[i]?.name === 'string'
        ? { name: data.bodies[i].name.slice(0, 80) }
        : {}),
      m: b.mass * init.G,
      radius: 0,
      x: [b.x, b.y, 0],
      v: [b.vx, b.vy, 0],
    }));
    return {
      ok: true,
      migrated: true,
      system: {
        format: FORMAT,
        formatVersion: FORMAT_VERSION,
        units: 'code',
        integrator: { ...DEFAULT_INTEGRATOR },
        t: 0,
        bodies,
        provenance: {
          from: 'gravitas.orbital-system/1',
          note: 'plane z = 0; masses times the file G, so G = 1',
        },
      },
    };
  }
  return { ok: false, code: 'notSystem' };
}
