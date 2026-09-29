// =============================================================================
// Points against a family of model curves, shifted
// -----------------------------------------------------------------------------
// The comparison behind every isochrone fit: a cluster's stars in a
// color-magnitude diagram against a model's curves, each shifted by what lies
// between the model and the sky. For a model curve at absolute magnitude M and
// intrinsic color c, a star is expected at
//
//   color = c + E              E the reddening, E(g - r) say
//   mag   = M + dm + R * E     dm the distance modulus, R the extinction in
//                              that band per unit of reddening, adopted
//
// For each model in the family (an age, say) and each shift on a grid of dm
// and E, every point's distance to the nearest point of the shifted curve is
// measured in scaled units - its color difference over `scale[0]` and its
// magnitude difference over `scale[1]`, added in quadrature - and capped at
// `cap`, so a field star far from any curve counts the same wherever it is.
// The statistic is the mean of the capped squared distances: the smaller, the
// closer the points lie to the curve.
//
// Every choice is a parameter and the result states it: the scales, the cap,
// R, the grid. The best model and shift are the smallest statistic; the models
// whose best statistic is within `tolerance` (a fraction) of it are ones these
// points cannot tell from the best, and their range is reported beside it -
// the degeneracy, measured rather than assumed away. It is a comparison, not a
// likelihood: it gives no standard errors, and says so.
//
// Fast because a curve is rasterized once into a distance field (Felzenszwalb
// and Huttenlocher's exact squared-distance transform) on a grid in the scaled
// units, and each point at each shift is then one lookup.
// =============================================================================

// Bound once, not read as globals: in Jest's vm context every free global read
// goes through the context, which made these loops 8-25x slower than in Node.
const { Math, Number, Float64Array, Int32Array } = globalThis;

export const VERSION = '1.0.0';

export class CurveError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'CurveError';
    this.code = code;
    this.detail = detail;
  }
}

export const LIMITS = Object.freeze({
  points: 20000,
  models: 40,
  shifts: 100000,
  // Grid cells of the distance field, per model.
  cells: 2e6,
  // Lookups in all: points times shifts times models. What the comparison
  // costs is this, not any one of them.
  work: 4e8,
});

const INF = 1e20;

/** The 1-D squared-distance transform of f, in place into d (Felzenszwalb). */
function dt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s;
    for (;;) {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
      if (s <= z[k]) k--;
      else break;
      if (k < 0) {
        k = 0;
        break;
      }
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

/**
 * A distance field for curves: the squared distance, in cells, from each
 * cell to the nearest cell a curve passes through.
 */
function field(segments, grid) {
  const { nx, ny, x0, y0, cell } = grid;
  const f = new Float64Array(nx * ny).fill(INF);
  const mark = (x, y) => {
    const i = Math.round((x - x0) / cell);
    const j = Math.round((y - y0) / cell);
    if (i >= 0 && i < nx && j >= 0 && j < ny) f[j * nx + i] = 0;
  };
  for (const seg of segments) {
    for (let k = 1; k < seg.length; k++) {
      const [ax, ay] = seg[k - 1];
      const [bx, by] = seg[k];
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(bx - ax, by - ay) / (cell / 2))
      );
      for (let s = 0; s <= steps; s++)
        mark(ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps);
    }
    if (seg.length === 1) mark(seg[0][0], seg[0][1]);
  }
  const n = Math.max(nx, ny);
  const col = new Float64Array(n);
  const out = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) col[j] = f[j * nx + i];
    dt1(col, ny, out, v, z);
    for (let j = 0; j < ny; j++) f[j * nx + i] = out[j];
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) col[i] = f[j * nx + i];
    dt1(col, nx, out, v, z);
    for (let i = 0; i < nx; i++) f[j * nx + i] = out[i];
  }
  return f;
}

const range = ([lo, hi, step]) => {
  const n = Math.round((hi - lo) / step) + 1;
  return Array.from({ length: n }, (_, k) =>
    Number((lo + k * step).toPrecision(12))
  );
};

/**
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>}} points - Observed
 *   colors and magnitudes
 * @param {Array<{key: object, segments: Array<Array<[number, number]>>}>}
 *   models - Each model's curves in (intrinsic color, absolute magnitude)
 * @param {{dm: [number, number, number], E: [number, number, number],
 *   R: number, scale?: [number, number], cap?: number, tolerance?: number,
 *   signal?: AbortSignal, onProgress?: (f: number) => void}} o - dm and E as
 *   [first, last, step]
 */
export async function compareCurves(points, models, o) {
  const { R, signal, onProgress } = o;
  const scale = o.scale ?? [0.03, 0.15];
  const cap = o.cap ?? 3;
  const tolerance = o.tolerance ?? 0.02;
  const n = points.x.length;
  const px = [];
  const py = [];
  for (let i = 0; i < n; i++)
    if (Number.isFinite(points.x[i]) && Number.isFinite(points.y[i])) {
      px.push(points.x[i] / scale[0]);
      py.push(points.y[i] / scale[1]);
    }
  if (px.length < 10)
    throw new CurveError(
      'tooFew',
      `${px.length} points; a comparison needs 10`,
      {
        n: px.length,
      }
    );
  if (px.length > LIMITS.points)
    throw new CurveError(
      'tooMany',
      `${px.length} points; the limit is ${LIMITS.points}`
    );
  if (!models.length || models.length > LIMITS.models)
    throw new CurveError(
      'models',
      `${models.length} models; one to ${LIMITS.models}`
    );
  if (!(Number.isFinite(R) && R >= 0))
    throw new CurveError(
      'R',
      'the extinction per unit reddening, R, is a number'
    );
  const dms = range(o.dm);
  const Es = range(o.E);
  if (!dms.length || !Es.length || dms.length * Es.length > LIMITS.shifts)
    throw new CurveError(
      'shifts',
      `${dms.length * Es.length} shifts; the limit is ${LIMITS.shifts}`
    );
  const work = px.length * dms.length * Es.length * models.length;
  if (work > LIMITS.work)
    throw new CurveError(
      'work',
      `${px.length} points at ${dms.length * Es.length} shifts of ${models.length} models is ${work.toPrecision(3)} comparisons; the limit is ${LIMITS.work}: fewer points, a coarser step or a narrower range`,
      { work }
    );

  // The grid, in scaled units: wide enough for every model shifted every way,
  // and a cell of a tenth of a scaled unit.
  const cell = 0.1;
  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const m of models)
    for (const seg of m.segments)
      for (const [x, y] of seg) {
        xLo = Math.min(xLo, x);
        xHi = Math.max(xHi, x);
        yLo = Math.min(yLo, y);
        yHi = Math.max(yHi, y);
      }
  const margin = cap + 1;
  const grid = {
    x0: xLo / scale[0] - margin,
    y0: yLo / scale[1] - margin,
    cell,
  };
  grid.nx = Math.ceil((xHi / scale[0] + margin - grid.x0) / cell) + 1;
  grid.ny = Math.ceil((yHi / scale[1] + margin - grid.y0) / cell) + 1;
  if (grid.nx * grid.ny > LIMITS.cells)
    throw new CurveError(
      'grid',
      'the models span too wide a grid at these scales'
    );

  const cap2 = cap * cap;
  const results = [];
  for (let m = 0; m < models.length; m++) {
    if (signal?.aborted)
      throw Object.assign(new Error('canceled'), { code: 'canceled' });
    const scaled = models[m].segments.map(seg =>
      seg.map(([x, y]) => [x / scale[0], y / scale[1]])
    );
    const f = field(scaled, grid);
    let best = null;
    for (const dm of dms) {
      for (const E of Es) {
        // A point's place on the model, in scaled units: shifted back.
        const sx = E / scale[0];
        const sy = (dm + R * E) / scale[1];
        let sum = 0;
        for (let i = 0; i < px.length; i++) {
          const gi = Math.round((px[i] - sx - grid.x0) / cell);
          const gj = Math.round((py[i] - sy - grid.y0) / cell);
          let d2 = cap2;
          if (gi >= 0 && gi < grid.nx && gj >= 0 && gj < grid.ny)
            d2 = Math.min(cap2, f[gj * grid.nx + gi] * cell * cell);
          sum += d2;
        }
        const stat = sum / px.length;
        if (!best || stat < best.stat) best = { stat, dm, E };
      }
    }
    results.push({ key: models[m].key, ...best });
    onProgress?.((m + 1) / models.length);
    // Let the page breathe between models.
    await new Promise(r => setTimeout(r, 0));
  }
  const order = results
    .map((r, i) => i)
    .sort((a, b) => results[a].stat - results[b].stat);
  const top = results[order[0]];
  const alike = results.filter(r => r.stat <= top.stat * (1 + tolerance));
  const warnings = [];
  // The best model first or last of the family: one beyond it might be better.
  if (order[0] === 0 || order[0] === models.length - 1)
    if (models.length > 1) warnings.push({ code: 'modelAtEdge' });
  if (top.dm === dms[0] || top.dm === dms.at(-1))
    warnings.push({ code: 'dmAtEdge' });
  if (top.E === Es[0] || top.E === Es.at(-1))
    warnings.push({ code: 'reddeningAtEdge' });
  if (alike.length > 1) warnings.push({ code: 'notUnique', n: alike.length });
  return {
    best: top,
    alike,
    models: results,
    points: px.length,
    settings: { dm: o.dm, E: o.E, R, scale, cap, tolerance },
    warnings,
  };
}
