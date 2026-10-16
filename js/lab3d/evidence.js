// =============================================================================
// The 3-D lab's measurements, as evidence envelopes
// -----------------------------------------------------------------------------
// Roadmap II Prompt 105 (LAB3D.md, "On the platform"). Every number the lab's
// instruments give (a body's orbital elements, a separation on the sky, the
// angle between two orbits, an event's time and distance) can be kept as a
// gravitas.artifact/1 (js/platform/artifact.js), so a report cites it the way
// it cites a fit: what made it, from what, with which numbers, and nothing
// rendered for one reader in one language. This module makes the envelopes
// and nothing else. It never integrates, and it reads only numbers: a frame
// (positions, velocities, masses, liveness at one time) and the system file.
//
// What kind of number is each. A reading is computed by the instrument from
// the simulation's numbers, by a stated relation, so it is `derived`; the
// body sizes the sky reading compares are `assumed`; an observer's line of
// sight and a star's temperature are `assumed`; a forward model's own
// parameters are `truth` (the values the synthetic data were built with). No
// reading carries an uncertainty, because there is none to state: the numbers
// are exact for the state, and the integrator's conserved-quantity errors are
// the lab's tables. The envelope says which integrator made the state.
//
// The source is the system: `source.digest` is the digest of its numbers
// (units, integrator, start time, and every body's mass, size, position and
// velocity, exactly), so two readings of one system share it and a changed
// system does not. Pure: no DOM, no storage.
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { canonicalJsonExact, fnvHex8 } from '../hash.js';
import { LAB3D_API } from './api.js';
import { gravityOf } from './state.js';
import {
  KM_S_PER_AU_DAY,
  angleAt,
  between,
  elementsAbout,
  hierarchy,
  onTheSky,
  relative,
} from './view/instruments.js';

const DEG = 180 / Math.PI;
const TURN = 2 * Math.PI;

/** The instruments an envelope can come from. */
export const TOOLS = Object.freeze([
  'distance',
  'relative',
  'angle',
  'elements',
  'sky',
  'between',
]);

/** The digest of a system's numbers: what every reading of it cites. */
export function systemDigest(system) {
  return fnvHex8(
    canonicalJsonExact({
      units: system.units,
      integrator: system.integrator,
      t: system.t || 0,
      bodies: system.bodies.map(b => ({
        id: b.id,
        m: b.m,
        radius: b.radius,
        x: b.x,
        v: b.v,
      })),
    })
  );
}

/** The units a system's lengths, times, masses and speeds are in, as registry ids. */
export function unitsOf(system) {
  return system.units === 'solar'
    ? { length: 'AU', time: 'd', mass: 'Msun', speed: 'km/s' }
    : { length: null, time: null, mass: null, speed: null };
}

const sigmaNone = { kind: 'none' };
const quantity = (id, value, unit, origin = 'derived') => ({
  id,
  value,
  unit,
  uncertainty: sigmaNone,
  origin,
});
const wrap = r => ((r % TURN) + TURN) % TURN;

/**
 * The quantities one instrument gives, from a frame.
 *
 * @param {object} system - The system being played
 * @param {{m: ArrayLike<number>, x: ArrayLike<number>, v: ArrayLike<number>,
 *   alive: ArrayLike<number>, t: number}} f - The frame the tables show
 * @param {{tool: string, a?: number, b?: number, v?: number,
 *   direction?: number[]}} r - The instrument and the bodies it reads
 * @returns {{quantities: object[], bodies: string[], warnings: string[]}|null}
 *   null when the reading is not one (a body missing, an unbound body's
 *   period, a hierarchy's root that orbits nothing)
 */
export function readingQuantities(system, f, r) {
  const u = unitsOf(system);
  const G = gravityOf(system);
  const id = i => system.bodies[i]?.id;
  const ok = (...ix) =>
    ix.every(i => Number.isInteger(i) && f.alive[i] && system.bodies[i]);
  const q = [];
  const warnings = [];
  const out = bodies => ({
    quantities: [quantity('t', f.t, u.time), ...q],
    bodies: bodies.map(id),
    warnings,
  });
  const speed = v => (u.speed ? v * KM_S_PER_AU_DAY : v);
  const speedUnit = u.speed;

  switch (r.tool) {
    case 'distance': {
      if (!ok(r.a, r.b) || r.a === r.b) return null;
      q.push(quantity('distance', relative(f, r.a, r.b).distance, u.length));
      return out([r.a, r.b]);
    }
    case 'relative': {
      if (!ok(r.a, r.b) || r.a === r.b) return null;
      const d = relative(f, r.a, r.b);
      q.push(
        quantity('distance', d.distance, u.length),
        quantity('speed', speed(d.speed), speedUnit),
        quantity('radialRate', speed(d.radialRate), speedUnit)
      );
      return out([r.a, r.b]);
    }
    case 'angle': {
      if (!ok(r.a, r.v, r.b) || r.a === r.v || r.b === r.v) return null;
      q.push(quantity('angle', angleAt(f, r.a, r.v, r.b) * DEG, 'deg'));
      return out([r.a, r.v, r.b]);
    }
    case 'elements': {
      if (!ok(r.a)) return null;
      const p = hierarchy(f).primary[r.a];
      if (p < 0) return null;
      const e = elementsAbout(f, r.a, p, G);
      if (!e) return null;
      q.push(
        quantity('a', e.a, u.length),
        quantity('e', e.e, ''),
        quantity('i', e.i * DEG, 'deg'),
        quantity('Omega', wrap(e.Omega) * DEG, 'deg'),
        quantity('omega', wrap(e.omega) * DEG, 'deg'),
        quantity('M', wrap(e.M) * DEG, 'deg')
      );
      if (e.bound) q.push(quantity('period', e.period, u.time));
      else warnings.push('unbound');
      return out([r.a, p]);
    }
    case 'sky': {
      if (!ok(r.a, r.b) || r.a === r.b || !r.direction) return null;
      const s = onTheSky(f, r.a, r.b, r.direction);
      const n = Math.hypot(...r.direction);
      q.push(
        quantity('across', s.across, u.length),
        quantity('along', s.along, u.length),
        quantity(
          'sightInclination',
          Math.acos(Math.max(-1, Math.min(1, r.direction[2] / n))) * DEG,
          'deg',
          'assumed'
        ),
        quantity(
          'sightAzimuth',
          wrap(Math.atan2(r.direction[1], r.direction[0])) * DEG,
          'deg',
          'assumed'
        )
      );
      const sa = system.bodies[r.a].radius;
      const sb = system.bodies[r.b].radius;
      if (sa > 0 && sb > 0)
        q.push(quantity('radiiSum', sa + sb, u.length, 'assumed'));
      else warnings.push('noRadii');
      return out([r.a, r.b]);
    }
    case 'between': {
      if (!ok(r.a, r.b) || r.a === r.b) return null;
      const m = between(f, r.a, r.b, G);
      if (!m) return null;
      q.push(
        quantity('mutualInclination', m.angle * DEG, 'deg'),
        quantity('inclination.a', m.inclinations[0] * DEG, 'deg'),
        quantity('inclination.b', m.inclinations[1] * DEG, 'deg')
      );
      return out([r.a, r.b, ...m.about]);
    }
    default:
      return null;
  }
}

/** One event as its numbers: the kernel's own, never reworded. */
export function eventQuantities(system, e) {
  const u = unitsOf(system);
  const q = [quantity('t', e.t, u.time)];
  if (Number.isFinite(e.distance))
    q.push(quantity('distance', e.distance, u.length));
  return q;
}

const SOURCE = 'simulation';

function envelope({
  system,
  kind,
  bodies,
  quantities,
  warnings,
  frame,
  tool,
  extra = {},
}) {
  const digest = systemDigest(system);
  const values = canonicalJsonExact(quantities.map(x => [x.id, x.value]));
  return artifact({
    id: `lab3d:${kind}:${digest}:${fnvHex8(values)}`,
    made: {
      lab3d: {
        api: LAB3D_API,
        instrument: tool,
        bodies,
        ...(frame ? { frame } : {}),
        ...extra,
        integrator: system.integrator,
        units: system.units,
      },
    },
    source: {
      kind: SOURCE,
      id: `lab3d:${system.provenance?.from ?? 'system'}`,
      version: LAB3D_API,
      digest,
    },
    quantities,
    ...(warnings?.length ? { warnings } : {}),
  });
}

/**
 * An instrument's reading as an envelope.
 * @param {object} system - The system being played
 * @param {object} f - The frame the tables show
 * @param {object} r - As readingQuantities
 * @param {string} [frame] - The reference frame the reading was taken in
 * @returns {object|null} The envelope, or null when the reading is not one
 */
export function readingEnvelope(system, f, r, frame) {
  const got = readingQuantities(system, f, r);
  if (!got) return null;
  return envelope({
    system,
    kind: r.tool,
    tool: r.tool,
    bodies: got.bodies,
    quantities: got.quantities,
    warnings: got.warnings,
    frame,
  });
}

/**
 * An event as an envelope.
 * @param {object} system
 * @param {{kind: string, t: number, bodies?: string[], distance?: number,
 *   direction?: string}} e - One of the run's events
 */
export function eventEnvelope(system, e) {
  const known = ['merger', 'closeApproach', 'crossing', 'escape'];
  if (!known.includes(e.kind) || !Number.isFinite(e.t)) return null;
  return envelope({
    system,
    kind: `event-${e.kind}`,
    tool: `event:${e.kind}`,
    bodies: e.bodies ?? [],
    quantities: eventQuantities(system, e),
    extra: e.direction ? { direction: e.direction } : {},
  });
}

/** A short label for a quantity id, in English, for a notebook row's fallback. */
export const quantityLabelId = id => `l3.ev.q.${id}`;

/**
 * What an observer would record, as an envelope: the observation's truth
 * manifest (origin truth), the observer and the star the models were given
 * (origin assumed), and the digest of the setup and the system.
 *
 * @param {object} system - The system the observation was made from
 * @param {object} observation - From observeSystem3d
 * @param {{observer: {inclinationDeg: number, positionAngleDeg: number},
 *   starProps?: object, setup: object, warnings?: string[], model: string,
 *   version: string}} o
 */
export function forwardEnvelope(system, observation, o) {
  const digest = systemDigest(system);
  const quantities = [];
  for (const p of observation.synthetic.truth.parameters)
    if (Number.isFinite(p.value))
      quantities.push(quantity(p.id, p.value, unitOrNull(p.unit), 'truth'));
  quantities.push(
    quantity('sightInclination', o.observer.inclinationDeg, 'deg', 'assumed'),
    quantity('sightAzimuth', o.observer.positionAngleDeg, 'deg', 'assumed')
  );
  const values = canonicalJsonExact(quantities.map(x => [x.id, x.value]));
  const setupDigest = fnvHex8(canonicalJsonExact(o.setup));
  return artifact({
    id: `lab3d:forward:${o.model}:${digest}:${fnvHex8(values + setupDigest)}`,
    made: {
      lab3d: { api: LAB3D_API, instrument: `forward:${o.model}` },
      forward: { model: o.model, version: o.version, setup: setupDigest },
    },
    source: {
      kind: 'forward-model',
      id: `lab3d:${o.model}`,
      version: o.version,
      digest: fnvHex8(`${digest}:${setupDigest}`),
    },
    quantities,
    warnings: o.warnings ?? [],
  });
}

const REGISTRY = new Set(['', 'd', 'deg', 'm/s', 'mas', 'AU', 'Msun', 'km/s']);
function unitOrNull(text) {
  if (text === undefined || text === null) return null;
  return REGISTRY.has(text) ? text : null;
}
