// =============================================================================
// An impulsive burn, and what it would do
// -----------------------------------------------------------------------------
// A student can already watch an orbit. What they cannot do is change one on
// purpose and see the consequence before committing to it, which is the whole
// content of orbital manoeuvring: a burn is a choice of direction and size, and
// the interesting thing is that the same push does different things depending
// on where in the orbit you make it.
//
// Everything here is arithmetic on one body's state relative to one primary.
// The world is not touched: the preview builds a hypothetical state vector and
// hands it to orbitalElements() in js/orbital.js, which is the same function
// the inspector and the lessons already read orbits with. There is no second
// implementation of the two-body problem in this file, and the burn that is
// eventually applied is the same vector the preview was computed from.
//
// The frame
// -----------------------------------------------------------------------------
// Radial and transverse, relative to the primary:
//
//   radial      away from the primary, along the line from it to the body
//   transverse  perpendicular to that, in the direction the body is going round
//
// Transverse is deliberately not "along the velocity vector". The two coincide
// only where the radial velocity is zero - on a circular orbit everywhere, on
// an ellipse at periapsis and apoapsis - and they differ everywhere else. A
// planner that called the velocity direction "tangential" would quietly mean
// something different at every other point of an eccentric orbit, and a student
// comparing two burns would be comparing two frames. Both Hohmann burns happen
// at an apsis, so for the transfer lesson the distinction does not arise; the
// readout names the frame anyway.
//
// What a preview is worth
// -----------------------------------------------------------------------------
// An osculating orbit is the orbit the body would follow if the only thing in
// the universe were it and its primary. In these scenarios that is often nearly
// true and sometimes badly false - a moon in a binary, a planet in a crowded
// belt - and the difference shows up as the preview and the actual trajectory
// parting company over an orbit or two. The panel says so, and the export
// records it, because a prediction whose assumptions are not stated is not a
// prediction anyone can check.
// =============================================================================

import { orbitalElements } from './orbital.js';

/** How a burn was expressed. Recorded with every entry in the log. */
export const BURN_FRAME = 'radial-transverse (RTN), relative to the primary';

/**
 * The radial and transverse unit vectors for a body about its primary.
 *
 * @param {object} body - The orbiting body
 * @param {object} primary - What it orbits
 * @returns {?{radial: {x: number, y: number}, transverse: {x: number, y: number}}}
 */
export function burnFrame(body, primary) {
  if (!body || !primary) return null;
  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const r = Math.hypot(rx, ry);
  if (!(r > 0)) return null;

  const radial = { x: rx / r, y: ry / r };
  // Perpendicular to radial, resolved so that it points the way the body is
  // travelling. The sign of the angular momentum is what says which way round
  // the orbit goes, and getting it wrong would make every prograde burn
  // retrograde on a clockwise orbit.
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;
  const h = rx * vy - ry * vx;
  const sign = h < 0 ? -1 : 1;
  return {
    radial,
    transverse: { x: -radial.y * sign, y: radial.x * sign },
  };
}

/**
 * What a burn would do, without doing it.
 *
 * @param {object} params - body, primary, G, radial, transverse
 * @returns {?object} The before and after orbits and the differences
 */
export function previewBurn({ body, primary, G, radial = 0, transverse = 0 }) {
  if (!body || !primary) return null;
  const before = orbitalElements(body, primary, G);
  const frame = burnFrame(body, primary);
  if (!before || !frame) return null;
  if (!Number.isFinite(radial) || !Number.isFinite(transverse)) return null;

  const dvx = frame.radial.x * radial + frame.transverse.x * transverse;
  const dvy = frame.radial.y * radial + frame.transverse.y * transverse;

  // A stand-in body carrying the post-burn velocity. Position is unchanged:
  // an impulsive burn is the idealisation in which the whole velocity change
  // happens at one point, which is exactly what makes it analysable by hand -
  // and what makes it an approximation to any real engine.
  const after = orbitalElements(
    {
      pos: body.pos,
      vel: { x: body.vel.x + dvx, y: body.vel.y + dvy },
      mass: body.mass,
    },
    primary,
    G
  );
  if (!after) return null;

  const change = (a, b) =>
    Number.isFinite(a) && Number.isFinite(b) ? b - a : null;

  return {
    before,
    after,
    delta: {
      // The vector as applied, in world axes, so the log records what was done
      // rather than what was asked for.
      vector: { x: dvx, y: dvy },
      radial,
      transverse,
      magnitude: Math.hypot(dvx, dvy),
      energy: change(before.energy, after.energy),
      angularMomentum: change(before.angularMomentum, after.angularMomentum),
      // Null against an unbound orbit rather than a difference from Infinity.
      periapsis: change(before.periapsis, after.periapsis),
      apoapsis: change(before.apoapsis, after.apoapsis),
      period: change(before.period, after.period),
    },
    // Called out on its own rather than left to be inferred from an apoapsis
    // of Infinity: leaving the system is the most consequential thing a burn
    // can do and the readout should not make a reader deduce it.
    becomesUnbound: before.bound && !after.bound,
    becomesBound: !before.bound && after.bound,
    unbound: !after.bound,
    frame: BURN_FRAME,
  };
}

/**
 * The two burns and the coasting time of a Hohmann transfer.
 *
 * Closed form, for circular coplanar orbits about a body heavy enough that the
 * spacecraft's own mass does not enter. Used by the lesson to state what the
 * answer should be, and by the tests to check that the engine agrees with it.
 *
 * Both burns are purely transverse, because both are made at an apsis of the
 * transfer ellipse where the radial velocity is zero.
 *
 * @param {object} params - r1, r2, mu
 * @returns {?object} The manoeuvre, or null if the radii are unusable
 */
export function hohmann({ r1, r2, mu }) {
  if (!(r1 > 0) || !(r2 > 0) || !(mu > 0) || r1 === r2) return null;

  const v1 = Math.sqrt(mu / r1);
  const v2 = Math.sqrt(mu / r2);
  const aTransfer = (r1 + r2) / 2;

  // Vis-viva on the transfer ellipse at each end.
  const vDepart = Math.sqrt(mu * (2 / r1 - 1 / aTransfer));
  const vArrive = Math.sqrt(mu * (2 / r2 - 1 / aTransfer));

  return {
    r1,
    r2,
    aTransfer,
    circular: { inner: v1, outer: v2 },
    transfer: { depart: vDepart, arrive: vArrive },
    // Signed: positive is prograde. Going outwards both are positive; coming
    // inwards both are negative, and a student who expects "a burn is a push"
    // should see that the second one is a brake.
    dv1: vDepart - v1,
    dv2: v2 - vArrive,
    total: Math.abs(vDepart - v1) + Math.abs(v2 - vArrive),
    // Half the transfer ellipse's period.
    transferTime: Math.PI * Math.sqrt(aTransfer ** 3 / mu),
    period: {
      inner: 2 * Math.PI * Math.sqrt(r1 ** 3 / mu),
      outer: 2 * Math.PI * Math.sqrt(r2 ** 3 / mu),
      transfer: 2 * Math.PI * Math.sqrt(aTransfer ** 3 / mu),
    },
  };
}

/**
 * One entry in the burn log.
 *
 * Everything needed to say what was done and to check it afterwards: when, to
 * what, in which frame, how big, in what units, and where the body ended up.
 * A log that recorded only the delta-v would not let anybody reproduce the
 * result, because the same burn at a different point of the orbit is a
 * different manoeuvre.
 *
 * @param {object} params - The burn and its context
 * @returns {object} The record
 */
export function burnRecord({
  body,
  primary,
  preview,
  simTime,
  units,
  index = 0,
  scenario = null,
}) {
  return {
    index,
    scenario,
    // Simulated time, not wall clock: the same burn replayed from the same
    // start happens at the same simulated instant and at no particular real
    // one.
    simTime,
    body: { id: body?.id ?? null, name: body?.name ?? null },
    primary: { id: primary?.id ?? null, name: primary?.name ?? null },
    frame: BURN_FRAME,
    delta: {
      radial: preview.delta.radial,
      transverse: preview.delta.transverse,
      magnitude: preview.delta.magnitude,
      vector: { ...preview.delta.vector },
    },
    units: {
      velocity: 'simulation velocity units',
      velocityToMs: units?.velocityUnitToMs ?? null,
      length: 'simulation length units',
      lengthPerAu: units?.simUnitsPerAu ?? null,
      time: 'simulation time units',
      timeToSeconds: units?.timeUnitSeconds ?? null,
    },
    before: summariseOrbit(preview.before),
    after: summariseOrbit(preview.after),
    becameUnbound: preview.becomesUnbound,
    // Recorded with every burn, because it is a property of the prediction and
    // not a caveat somebody can be assumed to remember from the panel.
    assumption:
      'The predicted orbit is the osculating two-body orbit about this ' +
      'primary. Other bodies are ignored, so in a perturbed system the actual ' +
      'trajectory will differ.',
  };
}

/** The parts of an orbit worth writing down. @param {?object} el - Elements @returns {?object} */
function summariseOrbit(el) {
  if (!el) return null;
  return {
    semiMajorAxis: el.bound ? el.a : null,
    eccentricity: el.e,
    periapsis: el.periapsis,
    apoapsis: el.bound ? el.apoapsis : null,
    period: el.bound ? el.period : null,
    energy: el.energy,
    angularMomentum: el.angularMomentum,
    speed: el.v,
    radius: el.r,
    bound: el.bound,
  };
}
