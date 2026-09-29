// =============================================================================
// Transfer windows: a Lambert solve for every departure date and flight time
// -----------------------------------------------------------------------------
// The grid a "porkchop plot" is drawn from. For each departure date and each
// time of flight, the two planets' model positions (./bodies.js: circles in
// one plane) are the ends of a Lambert problem about the Sun (./lambert.js),
// and the cell records
//
//   c3      km^2/s^2, the square of the departure's hyperbolic excess speed
//   vinf    km/s, the arrival's excess speed
//   total   km/s, the two burns from and into circular parking orbits of the
//           altitudes asked (./patched.js hyperbolicBurn)
//   status  'ok', or the code the solver refused the cell with
//
// A refused cell is a hole in the plot, drawn as one, never smoothed over:
// the antipodal line (a transfer of 180 degrees, ./lambert.js) crosses every
// window, and it is where a textbook's minimum sits.
//
// Bounded: at most MAX_CELLS cells and MAX_STEPS along either axis, refused
// before any is computed. createWindow() computes in slices, advance(ms),
// row by row, so the Worker holding it reads a cancel message between
// slices; the answer is the same bytes however it is sliced.
// =============================================================================

import { BODIES, DAY, planetState } from './bodies.js';
import { lambert } from './lambert.js';
import { hyperbolicBurn } from './patched.js';
import { norm, sub } from './twobody.js';

export const MAX_CELLS = 40000;
export const MAX_STEPS = 400;
/** Every status a cell can have, in the order of its code in `status`. */
export const CELL_STATUS = Object.freeze([
  'ok',
  'collinear',
  'antipodal',
  'branchAmbiguous',
  'tooFast',
  'noConvergence',
  'checkFailed',
  'input',
]);

/** Why a window cannot be computed, as {path, code}; empty if it can. */
export function windowProblems(o) {
  const out = [];
  if (!o || typeof o !== 'object') return [{ path: '', code: 'input' }];
  for (const k of ['from', 'to'])
    if (!BODIES[o[k]]?.a) out.push({ path: k, code: 'planet' });
  if (!out.length && o.from === o.to)
    out.push({ path: 'to', code: 'samePlanet' });
  const finite = (k, ok) => {
    if (!(Number.isFinite(o[k]) && ok(o[k])))
      out.push({ path: k, code: 'value' });
  };
  finite('departStart', () => true);
  finite('departSpan', x => x >= 0);
  finite('tofMin', x => x > 0);
  finite('tofMax', x => x >= o.tofMin);
  for (const k of ['departSteps', 'tofSteps'])
    if (!(Number.isInteger(o[k]) && o[k] >= 1 && o[k] <= MAX_STEPS))
      out.push({ path: k, code: 'steps', vars: { max: MAX_STEPS } });
  if (!out.length && o.departSteps * o.tofSteps > MAX_CELLS)
    out.push({ path: 'tofSteps', code: 'cells', vars: { max: MAX_CELLS } });
  for (const k of ['fromAltitude', 'toAltitude'])
    if (o[k] !== undefined && !(Number.isFinite(o[k]) && o[k] >= 0))
      out.push({ path: k, code: 'value' });
  if (
    o.direction !== undefined &&
    o.direction !== 'prograde' &&
    o.direction !== 'retrograde'
  )
    out.push({ path: 'direction', code: 'value' });
  return out;
}

/** The value along an axis of `steps` points from `start` spanning `span`. */
export const axisAt = (start, span, steps, i) =>
  steps === 1 ? start : start + (span * i) / (steps - 1);

/**
 * One cell: depart on day `t` (from J2000.0) and fly for `tof` days.
 * @returns {{status: string, c3, vinf, total, iterations, v1?, v2?, r1?, r2?}}
 */
export function windowCell(o, t, tof) {
  const A = planetState(o.from, t);
  const B = planetState(o.to, t + tof);
  const s = lambert({
    mu: BODIES.sun.GM,
    r1: A.r,
    r2: B.r,
    tof: tof * DAY,
    direction: o.direction || 'prograde',
  });
  if (!s.ok)
    return {
      status: s.status,
      c3: NaN,
      vinf: NaN,
      total: NaN,
      iterations: s.iterations || 0,
    };
  const dep = norm(sub(s.v1, A.v));
  const arr = norm(sub(s.v2, B.v));
  const P = BODIES[o.from];
  const Q = BODIES[o.to];
  const total =
    hyperbolicBurn(P.GM, P.radius + (o.fromAltitude ?? 300), dep).dv +
    hyperbolicBurn(Q.GM, Q.radius + (o.toAltitude ?? 300), arr).dv;
  return {
    status: 'ok',
    c3: dep * dep,
    vinf: arr,
    total,
    iterations: s.iterations,
    v1: s.v1,
    v2: s.v2,
    r1: A.r,
    r2: B.r,
    transferAngle: s.transferAngle,
    residual: s.residual,
    miss: s.miss,
  };
}

/**
 * A window to compute in slices.
 * @returns {{advance(ms: number): boolean, cancel(): void, result(): object, fraction: number}}
 */
export function createWindow(o, { now = () => performance.now() } = {}) {
  const problems = windowProblems(o);
  if (problems.length) throw Object.assign(new Error('refused'), { problems });
  const nd = o.departSteps;
  const nt = o.tofSteps;
  const cells = nd * nt;
  const c3 = new Float64Array(cells);
  const vinf = new Float64Array(cells);
  const total = new Float64Array(cells);
  const status = new Uint8Array(cells);
  let row = 0;
  let canceled = false;
  let iterations = 0;
  let maxIterations = 0;
  const run = {
    fraction: 0,
    /** Compute rows for about `ms`; true when there is nothing left to do. */
    advance(ms = 30) {
      const t0 = now();
      while (row < nd && !canceled) {
        const t = axisAt(o.departStart, o.departSpan, nd, row);
        for (let j = 0; j < nt; j++) {
          const tof = axisAt(o.tofMin, o.tofMax - o.tofMin, nt, j);
          const cell = windowCell(o, t, tof);
          const k = row * nt + j;
          c3[k] = cell.c3;
          vinf[k] = cell.vinf;
          total[k] = cell.total;
          status[k] = CELL_STATUS.indexOf(cell.status);
          iterations += cell.iterations;
          if (cell.iterations > maxIterations) maxIterations = cell.iterations;
        }
        row++;
        run.fraction = row / nd;
        if (now() - t0 >= ms) break;
      }
      return canceled || row >= nd;
    },
    cancel() {
      canceled = true;
    },
    result() {
      let best = -1;
      const counts = Object.fromEntries(CELL_STATUS.map(s => [s, 0]));
      for (let k = 0; k < row * nt; k++) {
        counts[CELL_STATUS[status[k]]]++;
        if (status[k] === 0 && (best < 0 || total[k] < total[best])) best = k;
      }
      const at = k => ({
        depart: axisAt(o.departStart, o.departSpan, nd, Math.floor(k / nt)),
        tof: axisAt(o.tofMin, o.tofMax - o.tofMin, nt, k % nt),
      });
      return {
        status: canceled && row < nd ? 'canceled' : 'ok',
        rows: row,
        options: { ...o },
        c3,
        vinf,
        total,
        cellStatus: status,
        counts,
        iterations,
        maxIterations,
        best:
          best < 0
            ? null
            : {
                index: best,
                ...at(best),
                c3: c3[best],
                vinf: vinf[best],
                total: total[best],
              },
      };
    },
  };
  return run;
}

/** Compute a whole window at once (the tests and tools). */
export function computeWindow(o) {
  const w = createWindow(o);
  while (!w.advance(Infinity));
  return w.result();
}
