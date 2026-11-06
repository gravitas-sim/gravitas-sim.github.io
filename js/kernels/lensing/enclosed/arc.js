// =============================================================================
// The arc-radius measurement: a circle through marked points (Prompt 251)
// -----------------------------------------------------------------------------
// A student or a pipeline marks points along a lensed arc (pixel coordinates). The radius of the arc is
// the geometric least-squares circle: minimise the sum of ((d_i - r) / sigma_i)^2 with d_i the distance
// from the point to the centre. The caller declares the per-coordinate position sigma (no default,
// refused 'no-sigma'); the fit does not rescale it by the residual scatter.
//
// Fixed centre (the lens centre is known, as a cluster's brightest galaxy is): the radius is the weighted
// mean distance, variance 1 / sum(w), plus the first-order term from the centre's declared sigma,
// g = -sum(w u) / sum(w) with u the unit vector from the centre to each point, var += |g|^2 sigma_c^2.
// A short arc makes that term first order; a full ring cancels it.
//
// Free centre: Gauss-Newton with damping from the algebraic (Kasa) start; the covariance is
// (J^T J)^-1 from the Jacobian at the solution. A short arc cannot separate the radius from the centre,
// the covariance grows as the arc shortens, and the fit says 'not-constrained' with the code
// 'radius-unconstrained' when sigma_r / r exceeds 0.25 (R4), and with 'too-few-points' under five.
//
// The pixel scale (radians per pixel) is the caller's: the radius is returned in the points' own units.
// =============================================================================

const finitePos = v => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Angular extent (radians) of points about a centre: 2 pi less the largest gap. */
export function arcExtent(points, cx, cy) {
  const a = points
    .map(p => Math.atan2(p.y - cy, p.x - cx))
    .sort((u, v) => u - v);
  if (a.length < 2) return 0;
  let gap = a[0] + 2 * Math.PI - a[a.length - 1];
  for (let i = 1; i < a.length; i++) gap = Math.max(gap, a[i] - a[i - 1]);
  return 2 * Math.PI - gap;
}

/** The inverse of a symmetric 3x3 matrix by cofactors, or null when it is not invertible. */
function inv3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || !(Math.abs(det) > 1e-300)) return null;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

const sigmasOf = (sigma, n) => {
  if (Array.isArray(sigma) || ArrayBuffer.isView(sigma)) {
    if (sigma.length !== n || ![...sigma].every(finitePos)) return null;
    return Float64Array.from(sigma);
  }
  return finitePos(sigma) ? new Float64Array(n).fill(sigma) : null;
};

/** The algebraic (Kasa) circle through the points, weighted; centred coordinates for conditioning. */
function kasa(pts, w) {
  const n = pts.length;
  let mx = 0;
  let my = 0;
  let sw = 0;
  for (let i = 0; i < n; i++) {
    mx += w[i] * pts[i].x;
    my += w[i] * pts[i].y;
    sw += w[i];
  }
  mx /= sw;
  my /= sw;
  const N = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const rhs = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const x = pts[i].x - mx;
    const y = pts[i].y - my;
    const t = x * x + y * y;
    const row = [x, y, 1];
    for (let r = 0; r < 3; r++) {
      rhs[r] += w[i] * row[r] * t;
      for (let c = 0; c < 3; c++) N[r][c] += w[i] * row[r] * row[c];
    }
  }
  const inv = inv3(N);
  if (!inv) return null;
  const p = inv.map(row => row[0] * rhs[0] + row[1] * rhs[1] + row[2] * rhs[2]);
  const a = p[0] / 2;
  const b = p[1] / 2;
  const r2 = p[2] + a * a + b * b;
  if (!(r2 > 0)) return null;
  return { cx: a + mx, cy: b + my, r: Math.sqrt(r2) };
}

/**
 * Fit a circle to marked points.
 * @param {Array<{x: number, y: number}>} points
 * @param {{sigma: number|ArrayLike<number>, centre?: {x: number, y: number, sigma?: number}|null,
 *   maxRelSigma?: number}} opts
 */
export function fitArc(points, opts = {}) {
  const pts = (points ?? []).filter(
    p => p && Number.isFinite(p.x) && Number.isFinite(p.y)
  );
  const n = pts.length;
  const sig = sigmasOf(opts.sigma, n);
  if (!sig) return { status: 'refused', code: 'no-sigma' };
  const maxRel = opts.maxRelSigma ?? 0.25;
  const w = Float64Array.from(sig, s => 1 / (s * s));
  const centre = opts.centre ?? null;

  if (centre) {
    if (n < 2) return { status: 'refused', code: 'too-few-points' };
    let sw = 0;
    let sd = 0;
    let gx = 0;
    let gy = 0;
    const d = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const dx = pts[i].x - centre.x;
      const dy = pts[i].y - centre.y;
      d[i] = Math.hypot(dx, dy);
      sw += w[i];
      sd += w[i] * d[i];
      gx += (w[i] * dx) / d[i];
      gy += (w[i] * dy) / d[i];
    }
    const r = sd / sw;
    let chi2 = 0;
    let ssr = 0;
    for (let i = 0; i < n; i++) {
      chi2 += w[i] * (d[i] - r) ** 2;
      ssr += (d[i] - r) ** 2;
    }
    const varStat = 1 / sw;
    const sc = centre.sigma ?? 0;
    const varCentre = ((gx * gx + gy * gy) / (sw * sw)) * sc * sc;
    const sigmaRadius = Math.sqrt(varStat + varCentre);
    return {
      status: 'ok',
      mode: 'fixed',
      centre: { x: centre.x, y: centre.y, sigma: sc },
      radius: r,
      sigmaRadius,
      terms: { statistical: Math.sqrt(varStat), centre: Math.sqrt(varCentre) },
      extentRad: arcExtent(pts, centre.x, centre.y),
      chi2,
      dof: n - 1,
      rms: Math.sqrt(ssr / n),
      n,
    };
  }

  if (n < 5) return { status: 'not-constrained', code: 'too-few-points', n };
  const start = kasa(pts, w);
  if (!start)
    return { status: 'not-constrained', code: 'radius-unconstrained', n };
  let [cx, cy, r] = [start.cx, start.cy, start.r];
  const chi2At = (x, y, rr) => {
    let c = 0;
    for (let i = 0; i < n; i++)
      c += w[i] * (Math.hypot(pts[i].x - x, pts[i].y - y) - rr) ** 2;
    return c;
  };
  let chi2 = chi2At(cx, cy, r);
  let mu = 0;
  let iterations = 0;
  let converged = false;
  let JTJ = null;
  for (; iterations < 200; iterations++) {
    const N = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const g = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const dx = pts[i].x - cx;
      const dy = pts[i].y - cy;
      const di = Math.hypot(dx, dy);
      const sw = Math.sqrt(w[i]);
      const row = [(-dx / di) * sw, (-dy / di) * sw, -sw];
      const e = (di - r) * sw;
      for (let a = 0; a < 3; a++) {
        g[a] += row[a] * e;
        for (let b = 0; b < 3; b++) N[a][b] += row[a] * row[b];
      }
    }
    JTJ = N.map(row => row.slice());
    let accepted = false;
    for (let tries = 0; tries < 60 && !accepted; tries++) {
      const M = N.map((row, a) =>
        row.map((v, b) => (a === b ? v * (1 + mu) : v))
      );
      const inv = inv3(M);
      if (!inv) {
        mu = mu ? mu * 10 : 1e-3;
        continue;
      }
      const step = inv.map(
        row => -(row[0] * g[0] + row[1] * g[1] + row[2] * g[2])
      );
      const nc = chi2At(cx + step[0], cy + step[1], r + step[2]);
      if (Number.isFinite(nc) && nc <= chi2 * (1 + 1e-15)) {
        cx += step[0];
        cy += step[1];
        r += step[2];
        chi2 = nc;
        mu = mu > 1e-12 ? mu / 10 : 0;
        accepted = true;
        const scale = 1e-13 * (1 + Math.abs(r));
        if (Math.max(...step.map(Math.abs)) < scale) converged = true;
      } else mu = mu ? mu * 10 : 1e-3;
    }
    if (!accepted || converged) {
      converged = converged || !accepted;
      break;
    }
  }
  const cov = JTJ ? inv3(JTJ) : null;
  const sigmaRadius = cov && cov[2][2] > 0 ? Math.sqrt(cov[2][2]) : Infinity;
  const spread = Math.max(
    ...pts.map(p => Math.hypot(p.x - start.cx, p.y - start.cy)),
    1
  );
  const base = {
    mode: 'free',
    centre: {
      x: cx,
      y: cy,
      sigma: cov && cov[0][0] > 0 ? Math.sqrt(cov[0][0]) : Infinity,
    },
    radius: r,
    sigmaRadius,
    extentRad: arcExtent(pts, cx, cy),
    chi2,
    dof: n - 3,
    iterations,
    converged,
    n,
  };
  if (
    !Number.isFinite(r) ||
    !(r > 0) ||
    r > 1e3 * spread ||
    !(sigmaRadius / r <= maxRel)
  )
    return { ...base, status: 'not-constrained', code: 'radius-unconstrained' };
  return { ...base, status: 'ok' };
}
