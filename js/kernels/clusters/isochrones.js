// =============================================================================
// Isochrones from a table of rows, and between them
// -----------------------------------------------------------------------------
// The table is the MIST pack's (js/data/observations/mistSdssIsochrones.js
// through js/tableObservation.js, the 157 grid's keyed layout): rows of
// [Fe/H], log age, phase, initial mass, absolute g and r, in evolutionary order
// within each cell. An isochrone is its phases' polylines; between two grid
// isochrones the curve is a morph: each phase of each is resampled to the same
// number of points at equal arc length (in the curve comparison's scaled units),
// and the points, masses included, are averaged with the weights of the age (or
// metallicity) between them. Nothing is extrapolated: a request outside the
// grid is refused. The morph is an interpolation, not a model: its leave-one-out
// error is a validation leg (A7).
// =============================================================================

const { Math, Float64Array, Map } = globalThis;
import { CURVE_SCALE } from './constants.js';
import { imfWeight } from './imf.js';

export class ClusterError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'ClusterError';
    this.code = code;
    this.detail = detail;
  }
}

const key = x => Math.round(x * 1000);
const col = (t, id) => t.columns.find(c => c.id === id)?.values;

/**
 * @param {{n: number, columns: Array<{id: string, values: ArrayLike<number>}>}} table
 *   Rows feh, logAge, phase, mass, g, r
 * @returns {{fehs: number[], logAges: number[], cells: Map<string, object>}}
 */
export function parseIsochrones(table) {
  const ids = ['feh', 'logAge', 'phase', 'mass', 'g', 'r'];
  const c = Object.fromEntries(ids.map(id => [id, col(table, id)]));
  for (const id of ids)
    if (!c[id])
      throw new ClusterError('columns', `the isochrone table has no ${id}`);
  const cells = new Map();
  const fehs = new Set();
  const ages = new Set();
  let cur = null;
  for (let i = 0; i < table.n; i++) {
    const k = `${key(c.feh[i])}|${key(c.logAge[i])}`;
    if (!cur || cur.k !== k) {
      if (cells.has(k))
        throw new ClusterError('contiguous', 'the rows of one isochrone are not together');
      cur = { k, feh: c.feh[i], logAge: c.logAge[i], rows: [] };
      cells.set(k, cur);
      fehs.add(c.feh[i]);
      ages.add(c.logAge[i]);
    }
    cur.rows.push(i);
  }
  const out = new Map();
  for (const [k, cell] of cells) {
    const phases = [];
    let p = null;
    for (const i of cell.rows) {
      if (!p || p.phase !== c.phase[i]) {
        p = { phase: c.phase[i], m: [], g: [], r: [] };
        phases.push(p);
      }
      p.m.push(c.mass[i]);
      p.g.push(c.g[i]);
      p.r.push(c.r[i]);
    }
    out.set(k, {
      feh: cell.feh,
      logAge: cell.logAge,
      phases: phases.map(q => ({
        phase: q.phase,
        m: Float64Array.from(q.m),
        g: Float64Array.from(q.g),
        r: Float64Array.from(q.r),
      })),
    });
  }
  return {
    fehs: [...fehs].sort((a, b) => a - b),
    logAges: [...ages].sort((a, b) => a - b),
    cells: out,
  };
}

const scaledStep = (g, r, i) =>
  Math.hypot(
    (g[i + 1] - r[i + 1] - (g[i] - r[i])) / CURVE_SCALE[0],
    (g[i + 1] - g[i]) / CURVE_SCALE[1]
  );

/** The length of a phase's polyline in the scaled units. */
export function scaledLength(p) {
  let s = 0;
  for (let i = 0; i + 1 < p.g.length; i++) s += scaledStep(p.g, p.r, i);
  return s;
}

/** A phase resampled to k points at equal scaled arc length. */
function resample(p, k) {
  const n = p.g.length;
  const cum = new Float64Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + scaledStep(p.g, p.r, i - 1);
  const total = cum[n - 1];
  const m = new Float64Array(k);
  const g = new Float64Array(k);
  const r = new Float64Array(k);
  let seg = 0;
  for (let j = 0; j < k; j++) {
    const s = k === 1 || total === 0 ? 0 : (total * j) / (k - 1);
    while (seg < n - 2 && cum[seg + 1] < s) seg++;
    const span = n > 1 ? cum[seg + 1] - cum[seg] : 0;
    const t = span > 0 ? (s - cum[seg]) / span : 0;
    const a = seg;
    const b = n > 1 ? seg + 1 : seg;
    m[j] = p.m[a] + t * (p.m[b] - p.m[a]);
    g[j] = p.g[a] + t * (p.g[b] - p.g[a]);
    r[j] = p.r[a] + t * (p.r[b] - p.r[a]);
  }
  return { phase: p.phase, m, g, r };
}

/** The morph of two isochrones with the weight t of B (0 gives A, 1 gives B). */
export function morph(A, B, t) {
  const by = iso => new Map(iso.phases.map(p => [p.phase, p]));
  const a = by(A);
  const b = by(B);
  const ids = [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y);
  const phases = [];
  for (const id of ids) {
    const pa = a.get(id);
    const pb = b.get(id);
    if (!pa || !pb) {
      phases.push(t < 0.5 ? (pa ?? pb) : (pb ?? pa));
      continue;
    }
    const k = Math.min(
      2000,
      Math.max(8, Math.ceil(Math.max(scaledLength(pa), scaledLength(pb)) / 0.3))
    );
    const ra = resample(pa, k);
    const rb = resample(pb, k);
    const m = new Float64Array(k);
    const g = new Float64Array(k);
    const r = new Float64Array(k);
    for (let i = 0; i < k; i++) {
      m[i] = (1 - t) * ra.m[i] + t * rb.m[i];
      g[i] = (1 - t) * ra.g[i] + t * rb.g[i];
      r[i] = (1 - t) * ra.r[i] + t * rb.r[i];
    }
    phases.push({ phase: id, m, g, r });
  }
  return { feh: A.feh + t * (B.feh - A.feh), logAge: A.logAge + t * (B.logAge - A.logAge), phases };
}

const bracket = (list, x) => {
  const eps = 1e-9;
  if (x < list[0] - eps || x > list.at(-1) + eps) return null;
  let i = 0;
  while (i < list.length - 2 && list[i + 1] <= x + eps) i++;
  const lo = list[i];
  const hi = list[Math.min(i + 1, list.length - 1)];
  const t = hi === lo ? 0 : (x - lo) / (hi - lo);
  return { lo, hi, t: Math.min(1, Math.max(0, t)) };
};

/**
 * The isochrone at a metallicity and age inside the grid: a grid isochrone as
 * it is, otherwise morphed from its neighbours. Never extrapolates.
 */
export function isochroneAt(set, feh, logAge) {
  const bf = bracket(set.fehs, feh);
  const ba = bracket(set.logAges, logAge);
  if (!bf || !ba)
    throw new ClusterError(
      'extrapolation',
      `[Fe/H] ${feh} and log age ${logAge} are outside the grid (${set.fehs[0]} to ${set.fehs.at(-1)}, ${set.logAges[0]} to ${set.logAges.at(-1)}): a grid is never extrapolated`,
      { feh, logAge }
    );
  const at = (f, a) => {
    const iso = set.cells.get(`${key(f)}|${key(a)}`);
    if (!iso)
      throw new ClusterError('missing', `no isochrone at [Fe/H] ${f}, log age ${a}`);
    return iso;
  };
  const alongAge = f => {
    const lo = at(f, ba.lo);
    if (ba.t === 0 || ba.lo === ba.hi) return lo;
    const hi = at(f, ba.hi);
    return ba.t === 1 ? hi : morph(lo, hi, ba.t);
  };
  const lo = alongAge(bf.lo);
  if (bf.t === 0 || bf.lo === bf.hi) return { ...lo, feh, logAge };
  const hi = alongAge(bf.hi);
  if (bf.t === 1) return { ...hi, feh, logAge };
  const out = morph(lo, hi, bf.t);
  return { ...out, feh, logAge };
}

/**
 * The isochrone as a chain of short pieces, each with the number of stars on
 * it (the IMF between its initial masses): the midpoints in colour and
 * absolute g, and the weights. A piece joining two phases is kept unless it is
 * longer than `bridge` mag (the fast phases leave no stars).
 */
export function pieces(iso, step = 0.01, bridge = 0.5) {
  const c = [];
  const g = [];
  const w = [];
  const mass = [];
  let prev = null;
  for (const p of iso.phases) {
    const n = p.g.length;
    const link = (a, b, join) => {
      const dc = b.g - b.r - (a.g - a.r);
      const dg = b.g - a.g;
      const len = Math.max(Math.abs(dc), Math.abs(dg));
      if (join && len > bridge) return;
      const weight = imfWeight(a.m, b.m);
      if (!(weight > 0)) return;
      const k = Math.max(1, Math.ceil(len / step));
      for (let s = 0; s < k; s++) {
        const f = (s + 0.5) / k;
        c.push(a.g - a.r + f * dc);
        g.push(a.g + f * dg);
        w.push(weight / k);
        mass.push(a.m + f * (b.m - a.m));
      }
    };
    if (prev) link(prev, { m: p.m[0], g: p.g[0], r: p.r[0] }, true);
    for (let i = 0; i + 1 < n; i++)
      link(
        { m: p.m[i], g: p.g[i], r: p.r[i] },
        { m: p.m[i + 1], g: p.g[i + 1], r: p.r[i + 1] },
        false
      );
    prev = { m: p.m[n - 1], g: p.g[n - 1], r: p.r[n - 1] };
  }
  return {
    c: Float64Array.from(c),
    g: Float64Array.from(g),
    w: Float64Array.from(w),
    m: Float64Array.from(mass),
  };
}

/** The main sequence's mass to (g, r): from phase 0, linear in mass; null below its faint end. */
export function mainSequenceOf(iso) {
  const p = iso.phases.find(q => q.phase === 0);
  if (!p) return () => null;
  return m => {
    if (m < p.m[0] || m > p.m[p.m.length - 1]) return null;
    let i = 0;
    while (i < p.m.length - 2 && p.m[i + 1] < m) i++;
    const t = (m - p.m[i]) / (p.m[i + 1] - p.m[i] || 1);
    return { g: p.g[i] + t * (p.g[i + 1] - p.g[i]), r: p.r[i] + t * (p.r[i + 1] - p.r[i]) };
  };
}
