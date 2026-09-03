// =============================================================================
// Perturbing one number in a captured state
// -----------------------------------------------------------------------------
// The whole of an A/B chaos experiment is: take one captured start, change a
// single coordinate by an amount too small to see, and run it again. This is
// the module that changes the number.
//
// It works on the share payload rather than on the live simulation, which is
// what makes the perturbation reproducible and reportable. The payload is the
// experiment's canonical start; a perturbed payload is a second canonical
// start that differs from the first in exactly one field, and both can be
// hashed, stored, exported and put in a link by machinery that already exists.
// Nudging a live body instead would leave nothing to point at afterwards when
// a student asks what, precisely, was different.
//
// The perturbation is described as data - which body, which component, how much
// - so the lesson can print the sentence "Alpha's x position, +1,496 km" rather
// than the student having to take it on trust.
// =============================================================================

/** Components that can be nudged. */
export const AXES = ['x', 'y', 'vx', 'vy'];

/** One simulation length unit in metres. 1 unit = 0.01 AU. */
const UNIT_M = 1.495978707e9;

/**
 * Apply a perturbation to one body in a captured state.
 *
 * Returns a new payload; the input is not touched. A caller that mutated the
 * captured start in place would have no unperturbed run left to compare
 * against, which is a mistake worth making impossible rather than documenting.
 *
 * @param {Object} payload - A captured share payload with packed bodies
 * @param {Object} spec
 * @param {number} spec.bodyId - Stable object id to perturb
 * @param {'x'|'y'|'vx'|'vy'} spec.axis - Which component
 * @param {number} spec.delta - How much, in simulation units
 * @returns {{ok:boolean, payload:Object|null, applied:Object|null,
 *   reason:string}} The perturbed state
 */
export function perturb(payload, { bodyId, axis, delta } = {}) {
  if (!payload || !Array.isArray(payload.b)) {
    return { ok: false, payload: null, applied: null, reason: 'no-bodies' };
  }
  if (!AXES.includes(axis)) {
    return { ok: false, payload: null, applied: null, reason: 'bad-axis' };
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, payload: null, applied: null, reason: 'bad-delta' };
  }

  const next = JSON.parse(JSON.stringify(payload));
  const body = next.b.find(b => b.id === bodyId);
  if (!body) {
    return { ok: false, payload: null, applied: null, reason: 'no-such-body' };
  }

  const before = readAxis(body, axis);
  if (before === null) {
    return { ok: false, payload: null, applied: null, reason: 'no-such-axis' };
  }
  writeAxis(body, axis, before + delta);

  return {
    ok: true,
    payload: next,
    reason: '',
    applied: {
      bodyId,
      bodyName: body.name || `#${bodyId}`,
      axis,
      delta,
      before,
      after: before + delta,
    },
  };
}

/** @param {Object} body - A packed body @param {string} axis - Component @returns {number|null} Value */
function readAxis(body, axis) {
  if (axis === 'x' || axis === 'y') {
    return Number.isFinite(body.pos?.[axis]) ? body.pos[axis] : null;
  }
  const key = axis === 'vx' ? 'x' : 'y';
  return Number.isFinite(body.vel?.[key]) ? body.vel[key] : null;
}

/** @param {Object} body - A packed body @param {string} axis - Component @param {number} v - New value */
function writeAxis(body, axis, v) {
  if (axis === 'x' || axis === 'y') body.pos[axis] = v;
  else body.vel[axis === 'vx' ? 'x' : 'y'] = v;
}

/**
 * The size of a system, for saying how small the perturbation was relative to it.
 *
 * The largest separation between any two bodies. A fraction of *that* is the
 * number that makes the point - "one part in a hundred thousand of the system"
 * means something, where "1,496 km" alone does not.
 *
 * @param {Object} payload - A captured state
 * @returns {number} Extent in simulation units, or 0
 */
export function systemExtent(payload) {
  const b = payload?.b;
  if (!Array.isArray(b) || b.length < 2) return 0;
  let worst = 0;
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) {
      const dx = (b[i].pos?.x ?? 0) - (b[j].pos?.x ?? 0);
      const dy = (b[i].pos?.y ?? 0) - (b[j].pos?.y ?? 0);
      const d = Math.hypot(dx, dy);
      if (d > worst) worst = d;
    }
  }
  return worst;
}

/**
 * A perturbation in words and in physical units.
 *
 * Simulation units mean nothing to a student. Kilometres do, and so does the
 * ratio to the size of the system: those two together are what make "a very
 * small change" a quantity rather than an adjective.
 *
 * @param {Object} applied - From perturb()
 * @param {number} [extent] - System extent in simulation units
 * @returns {{units:number, km:number, fraction:number|null,
 *   axisLabel:string}} The description
 */
export function describePerturbation(applied, extent = 0) {
  const units = applied?.delta ?? 0;
  return {
    units,
    km: (units * UNIT_M) / 1000,
    fraction: extent > 0 ? Math.abs(units) / extent : null,
    axisLabel:
      {
        x: 'x position',
        y: 'y position',
        vx: 'x velocity',
        vy: 'y velocity',
      }[applied?.axis] ||
      applied?.axis ||
      '',
  };
}

/**
 * Is this pair of states a valid controlled comparison?
 *
 * Exactly one number may differ. Two runs that differ in two coordinates are
 * not a sensitivity experiment, and the difference between them cannot be
 * attributed to either one.
 *
 * @param {Object} a - The unperturbed state
 * @param {Object} b - The perturbed state
 * @returns {{ok:boolean, differences:Array<Object>, reason:string}} The check
 */
export function differencesBetween(a, b) {
  const differences = [];
  const bodiesA = a?.b || [];
  const bodiesB = b?.b || [];
  if (bodiesA.length !== bodiesB.length) {
    return { ok: false, differences, reason: 'different-body-counts' };
  }
  const byId = new Map(bodiesB.map(x => [x.id, x]));
  for (const one of bodiesA) {
    const other = byId.get(one.id);
    if (!other) return { ok: false, differences, reason: 'unmatched-body' };
    for (const axis of AXES) {
      const p = readAxis(one, axis);
      const q = readAxis(other, axis);
      if (p === null || q === null) continue;
      if (p !== q) {
        differences.push({
          bodyId: one.id,
          bodyName: one.name || `#${one.id}`,
          axis,
          from: p,
          to: q,
          delta: q - p,
        });
      }
    }
  }
  return {
    ok: differences.length === 1,
    differences,
    reason:
      differences.length === 0
        ? 'identical'
        : differences.length === 1
          ? ''
          : 'more-than-one-coordinate',
  };
}
