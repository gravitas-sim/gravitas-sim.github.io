// =============================================================================
// Parameter degeneracies: a distance at fixed redshift as a contour in a plane of two parameters
// -----------------------------------------------------------------------------
// Prompt 255 (COSMOLOGY_II.md section 6, rule R9). Pure and Worker-safe. The contour is the set of
// (x, y) that give the same value of a quantity as the base cosmology at one redshift; the direction is its
// local tangent. Axes are chosen from H0, Om, Ode and w; Ode is an axis only for a set that is not flat.
// A base is {H0, Om, Or, Ode, w, flat}: flat (or no Ode) means Ode follows 1 - Om - Or whenever Om changes.
// =============================================================================

import { brent } from '../../../numeric/roots.js';
import { FriedmannDomainError, createFriedmann } from './friedmann.js';

const { Math } = globalThis;

export const AXES = Object.freeze(['H0', 'Om', 'Ode', 'w']);
const QUANTITIES = [
  'comoving',
  'transverse',
  'luminosity',
  'angularDiameter',
  'modulus',
  'lookback',
];
const SCAN = 64;
const SCALE_FLOOR = { H0: 1, Om: 0.1, Ode: 0.1, w: 0.1 };

const bad = message => {
  throw new FriedmannDomainError('bad-argument', message);
};

/** The parameters of the base with some axes changed (Ode follows for a flat base). */
function paramsFor(base, changes) {
  const flat = base.flat === true || base.Ode === undefined;
  const v = {
    H0: base.H0,
    Om: base.Om,
    Or: base.Or ?? 0,
    w: base.w ?? -1,
    ...changes,
  };
  if (flat) {
    if ('Ode' in changes) bad('Ode is not an axis of a flat set');
    return { ...v, Ode: 1 - v.Om - v.Or };
  }
  return { ...v, Ode: 'Ode' in changes ? changes.Ode : base.Ode };
}

/** One quantity of the base with some axes changed; throws FriedmannDomainError for a refused set. */
export function quantityAt(base, changes, z, quantity) {
  return createFriedmann(paramsFor(base, changes)).quantity(quantity, z).value;
}

function checkAxes(base, quantity, names) {
  if (!QUANTITIES.includes(quantity)) bad(`unknown quantity '${quantity}'`);
  for (const n of names) {
    if (!AXES.includes(n)) bad(`axis '${n}' is not one of ${AXES.join(', ')}`);
    if (n === 'Ode' && (base.flat === true || base.Ode === undefined))
      bad('Ode is not an axis of a flat set');
  }
  if (names[0] === names[1]) bad('the two axes must differ');
}

const linspace = (lo, hi, n) =>
  Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

/**
 * The contour of a quantity at redshift z in the (x, y) plane.
 * @param {{base: object, z: number, quantity: string, x: {name: string, min: number, max: number, n: number},
 *   y: {name: string, min: number, max: number}, target?: number}} spec - target defaults to the base's own value
 * @returns {{target: number, points: {x: number, y: number, multipleRoots?: boolean}[],
 *   skipped: {index: number, x: number, code: string}[]}}
 */
export function distanceContour({ base, z, quantity, x, y, target }) {
  checkAxes(base, quantity, [x.name, y.name]);
  if (!(x.n >= 2) || !(x.max > x.min) || !(y.max > y.min))
    bad('the axis ranges need min < max and n >= 2');
  const tgt = target ?? quantityAt(base, {}, z, quantity);
  const ys = linspace(y.min, y.max, SCAN);
  const points = [];
  const skipped = [];
  linspace(x.min, x.max, x.n).forEach((xv, index) => {
    const f = yv => {
      try {
        return quantityAt(base, { [x.name]: xv, [y.name]: yv }, z, quantity) - tgt;
      } catch (e) {
        if (e instanceof FriedmannDomainError) return null;
        throw e;
      }
    };
    const vals = ys.map(f);
    let first = -1;
    let changes = 0;
    for (let k = 0; k < SCAN - 1; k++) {
      if (vals[k] === null || vals[k + 1] === null) continue;
      if (vals[k] === 0 || vals[k] * vals[k + 1] < 0) {
        changes++;
        if (first < 0) first = k;
      }
    }
    if (first < 0) {
      skipped.push({
        index,
        x: xv,
        code: vals.every(v => v === null) ? 'all-refused' : 'no-root',
      });
      return;
    }
    let root;
    try {
      root = brent(
        yv => {
          const r = f(yv);
          if (r === null) throw new RangeError('refused inside the bracket');
          return r;
        },
        ys[first],
        ys[first + 1],
        { xTol: 1e-14, maxIter: 200 }
      ).x;
    } catch {
      skipped.push({ index, x: xv, code: 'no-root' });
      return;
    }
    points.push(changes > 1 ? { x: xv, y: root, multipleRoots: true } : { x: xv, y: root });
  });
  return { target: tgt, points, skipped };
}

/**
 * The local degeneracy direction at a point (the base's own values unless `at` is given): the gradient of the
 * quantity by five-point central differences with a step of 1 percent of each parameter's scale, the contour's
 * slope dy/dx and its unit tangent (x component positive).
 */
export function degeneracyDirection({ base, z, quantity, x, y, at }) {
  checkAxes(base, quantity, [x, y]);
  const v0 = paramsFor(base, {});
  const px = at?.x ?? v0[x];
  const py = at?.y ?? v0[y];
  const grad = (name, value, other, otherValue) => {
    const h = 0.01 * Math.max(Math.abs(value), SCALE_FLOOR[name]);
    const f = t =>
      quantityAt(base, { [name]: t, [other]: otherValue }, z, quantity);
    return (
      (-f(value + 2 * h) + 8 * f(value + h) - 8 * f(value - h) + f(value - 2 * h)) /
      (12 * h)
    );
  };
  const dx = grad(x, px, y, py);
  const dy = grad(y, py, x, px);
  if (dy === 0) bad('the quantity does not depend on the second axis here: no degeneracy direction');
  const n = Math.hypot(dx, dy);
  let t = { x: -dy / n, y: dx / n };
  if (t.x < 0) t = { x: -t.x, y: -t.y };
  return {
    at: { x: px, y: py },
    gradient: { dx, dy },
    slope: -dx / dy,
    tangent: t,
  };
}
