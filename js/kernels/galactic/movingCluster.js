// =============================================================================
// Moving-cluster method: membership, convergent point, space speed, distance
// (Roadmap III, Prompt 234 Part A: a prototype on spike/moving-cluster-gate,
// never merged). Written from tests/fixtures/moving-cluster/thresholds.json
// ("contracts"), which was committed before this file existed. Pure: no DOM,
// no clock. Angles in degrees at the interface, parallaxes in mas, proper
// motions in mas/yr, velocities in km/s.
// =============================================================================

const { Math, Number, Float64Array } = globalThis;
const DEG = Math.PI / 180;

export const K = 4.740470446; // km/s per (mas/yr kpc), coords.js K_PM

export const CONTRACT = Object.freeze({
  sigma0: 1.0,
  rvErrorCut: 3.0,
  minSin: 0.1,
  minCos2: 0.05,
  seed: { bwParallax: 2.0, bwPm: 20.0, radius: 2, tol: 1e-6, maxSteps: 100 },
  offFloorDeg: 0.01,
  offCapDeg: 6,
  windowRel: 0.3,
  qFloor: 1e-4,
  qCap: 0.25,
  nSigma: 3,
  maxIter: 30,
  minMembers: 20,
  minRvMembers: 10,
  maxOffSigmaDeg: 3,
  maxRvScatter: 3,
  maxRelInterval: 0.1,
  maxDiscard: 0.05,
});

// ---- small linear algebra -----------------------------------------------------

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = a => Math.sqrt(dot(a, a));

/** Eigen decomposition of a symmetric 3x3 by cyclic Jacobi; ascending values. */
export function eigenSym3(S) {
  const a = [S[0].slice(), S[1].slice(), S[2].slice()];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 60; sweep++) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (off < 1e-300) break;
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t =
        Math.sign(theta || 1) /
        (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j]);
  return {
    values: order.map(i => a[i][i]),
    vectors: order.map(i => [v[0][i], v[1][i], v[2][i]]),
  };
}

export function median(values) {
  const s = Float64Array.from(values).sort();
  const n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
}
const mad = (values, med) => median(values.map(x => Math.abs(x - med)));

/** Percentile with linear interpolation of the sorted values (position (n-1) p). */
export function percentile(sorted, p) {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

// ---- the sample ---------------------------------------------------------------

/**
 * Per-star geometry. rows: {ra, dec, parallax, parallaxError, pmra, pmdec,
 * rv?, rvError?}; returns the stars that pass the sample cuts (the caller has
 * applied ruwe and the solution type) with their unit vectors.
 */
export function prepare(rows, rvErrorCut = CONTRACT.rvErrorCut) {
  const stars = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (
      !Number.isFinite(r.ra + r.dec + r.parallax + r.pmra + r.pmdec) ||
      !(r.parallaxError > 0)
    )
      continue;
    const a = r.ra * DEG;
    const d = r.dec * DEG;
    const n = [
      Math.cos(d) * Math.cos(a),
      Math.cos(d) * Math.sin(a),
      Math.sin(d),
    ];
    const e = [-Math.sin(a), Math.cos(a), 0];
    const g = [
      -Math.cos(a) * Math.sin(d),
      -Math.sin(a) * Math.sin(d),
      Math.cos(d),
    ];
    const p = [
      r.pmra * e[0] + r.pmdec * g[0],
      r.pmra * e[1] + r.pmdec * g[1],
      r.pmra * e[2] + r.pmdec * g[2],
    ];
    const mu = norm(p);
    if (!(mu > 0)) continue;
    const t = [p[0] / mu, p[1] / mu, p[2] / mu];
    const rvOk =
      Number.isFinite(r.rv) &&
      Number.isFinite(r.rvError) &&
      r.rvError <= rvErrorCut;
    stars.push({
      index: i,
      n,
      p,
      pmra: r.pmra,
      pmdec: r.pmdec,
      mu,
      t,
      b: cross(n, t),
      parallax: r.parallax,
      parallaxError: r.parallaxError,
      rv: rvOk ? r.rv : NaN,
      rvError: rvOk ? r.rvError : NaN,
      hasRv: rvOk,
      zeroPoint: r.zeroPoint ?? 0,
    });
  }
  return stars;
}

// ---- convergent point, speed, per-star distance --------------------------------

/** The convergent point of a set of stars: the unit vector or null. */
export function fitConvergentPoint(set) {
  const S = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const s of set)
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) S[i][j] += s.b[i] * s.b[j];
  const { vectors } = eigenSym3(S);
  let c = vectors[0];
  let sum = 0;
  for (const s of set) sum += towards(s, c).tu;
  if (sum < 0) c = [-c[0], -c[1], -c[2]];
  return c;
}

/** Geometry of star s relative to the convergent point c. */
export function towards(s, c) {
  const cn = dot(c, s.n);
  const w = [c[0] - cn * s.n[0], c[1] - cn * s.n[1], c[2] - cn * s.n[2]];
  const sin = norm(w);
  if (!(sin > 0)) return { cos: cn, sin: 0, tu: 0, muPar: 0 };
  const u = [w[0] / sin, w[1] / sin, w[2] / sin];
  return { cos: cn, sin, tu: dot(s.t, u), muPar: dot(s.p, u) };
}

const offDeg = (s, c) =>
  Math.asin(Math.max(-1, Math.min(1, dot(s.b, c)))) / DEG;

/** The moving-cluster parallax of one star (mas), or NaN. */
export function starParallax(muPar, sin, V) {
  if (!(sin >= CONTRACT.minSin) || !(muPar > 0) || !(V > 0)) return NaN;
  return (K * muPar) / (V * sin);
}

/** The space speed: weighted least squares of v_r on cos theta; null if unusable. */
export function fitSpeed(set, c) {
  let swc = 0;
  let swcc = 0;
  let n = 0;
  let c2 = 0;
  for (const s of set) {
    if (!s.hasRv) continue;
    const cos = dot(s.n, c);
    const w = 1 / (s.rvError * s.rvError + CONTRACT.sigma0 ** 2);
    swc += w * s.rv * cos;
    swcc += w * cos * cos;
    c2 += cos * cos;
    n++;
  }
  if (!n || !(swcc > 0)) return { n, V: NaN, meanCos2: n ? c2 / n : NaN };
  return { n, V: swc / swcc, meanCos2: c2 / n };
}

const toRaDec = c => {
  let ra = Math.atan2(c[1], c[0]) / DEG;
  if (ra < 0) ra += 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, c[2]))) / DEG };
};
export const angleBetween = (a, b) =>
  Math.atan2(norm(cross(a, b)), dot(a, b)) / DEG;

// ---- the seed -----------------------------------------------------------------

function seedSet(stars) {
  const { bwParallax, bwPm, radius, tol, maxSteps } = CONTRACT.seed;
  const n = stars.length;
  const x0 = new Float64Array(n);
  const x1 = new Float64Array(n);
  const x2 = new Float64Array(n);
  // proper motion in the components the file gives: mu_alpha*, mu_delta
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    x0[i] = s.parallax / bwParallax;
    x1[i] = s.pmra / bwPm;
    x2[i] = s.pmdec / bwPm;
  }
  // order by x0 so the sums can stop where exp(-d^2/2) is below 4e-18 (d > 9)
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (i, j) => x0[i] - x0[j]
  );
  const ox0 = Float64Array.from(order, i => x0[i]);
  const ox1 = Float64Array.from(order, i => x1[i]);
  const ox2 = Float64Array.from(order, i => x2[i]);
  const CUT = 9;
  const kernelSums = (a, b, c, wantMean) => {
    // first position with ox0 >= a - CUT
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (ox0[m] < a - CUT) lo = m + 1;
      else hi = m;
    }
    let sk = 0;
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    for (let j = lo; j < n && ox0[j] <= a + CUT; j++) {
      const d1 = ox1[j] - b;
      const d2 = ox2[j] - c;
      if (d1 > CUT || d1 < -CUT || d2 > CUT || d2 < -CUT) continue;
      const d0 = ox0[j] - a;
      const k = Math.exp(-0.5 * (d0 * d0 + d1 * d1 + d2 * d2));
      sk += k;
      if (wantMean) {
        s0 += k * ox0[j];
        s1 += k * ox1[j];
        s2 += k * ox2[j];
      }
    }
    return wantMean ? [s0 / sk, s1 / sk, s2 / sk] : sk;
  };
  let best = -1;
  let bestF = -Infinity;
  for (let i = 0; i < n; i++) {
    const f = kernelSums(x0[i], x1[i], x2[i], false);
    if (f > bestF) {
      bestF = f;
      best = i;
    }
  }
  let x = [x0[best], x1[best], x2[best]];
  for (let step = 0; step < maxSteps; step++) {
    const nx = kernelSums(x[0], x[1], x[2], true);
    const shift = Math.hypot(nx[0] - x[0], nx[1] - x[1], nx[2] - x[2]);
    x = nx;
    if (shift < tol) break;
  }
  const set = [];
  for (let i = 0; i < n; i++)
    if (Math.hypot(x0[i] - x[0], x1[i] - x[1], x2[i] - x[2]) <= radius)
      set.push(i);
  return { set, centre: x };
}

// ---- the amended seed (AM1): a count in convergent-point space --------------------

export const SEED_CP = Object.freeze({ grid: 20000, tolDeg: 1.5, refine: 8 });

/** A Fibonacci lattice of unit vectors: z_i = 1 - (2i + 1) / N, phi_i = i * pi (3 - sqrt 5). */
export function fibonacciSphere(N) {
  const out = new Array(N);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const z = 1 - (2 * i + 1) / N;
    const r = Math.sqrt(1 - z * z);
    out[i] = [r * Math.cos(i * golden), r * Math.sin(i * golden), z];
  }
  return out;
}

const countAt = (stars, c, tolRad) => {
  const set = [];
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (Math.abs(dot(s.b, c)) <= tolRad && towards(s, c).tu > 0) set.push(i);
  }
  return set;
};

function seedCp(stars) {
  const tol = Math.sin(SEED_CP.tolDeg * DEG);
  let best = null;
  let bestN = -1;
  for (const c of fibonacciSphere(SEED_CP.grid)) {
    let n = 0;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (Math.abs(dot(s.b, c)) <= tol && towards(s, c).tu > 0) n++;
    }
    if (n > bestN) {
      bestN = n;
      best = c;
    }
  }
  let c = best;
  let set = countAt(stars, c, tol);
  for (let k = 0; k < SEED_CP.refine && set.length >= 3; k++) {
    c = fitConvergentPoint(set.map(i => stars[i]));
    const next = countAt(stars, c, tol);
    const same = sameSet(next, set);
    set = next;
    if (same) break;
  }
  return { set, centre: c };
}

// ---- the analysis ---------------------------------------------------------------

const sameSet = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const refused = (reason, extra = {}) => ({
  status: 'refused',
  reason,
  ...extra,
});

/**
 * The whole pipeline on prepared stars (membership to pi_MC). Returns
 * {status: 'ok' | 'cp-only' | 'refused', reason, members, cp, speed, ...}.
 */
export function analyse(
  stars,
  { seed: seedForm = 'density', qAlways = false, trace = null } = {}
) {
  const C = CONTRACT;
  if (stars.length < C.minMembers) return refused('no-cluster');
  const seed = seedForm === 'cp' ? seedCp(stars) : seedSet(stars);
  let M = seed.set.slice(); // indices into stars
  if (M.length < 5) return refused('no-cluster', { seedSize: M.length });
  let converged = false;
  let steps = 0;
  for (; steps < C.maxIter; steps++) {
    const Ms = M.map(i => stars[i]);
    const c = fitConvergentPoint(Ms);
    const offs = Ms.map(s => offDeg(s, c));
    const sigmaOff = Math.max(C.offFloorDeg, 1.4826 * mad(offs, median(offs)));
    const sp = fitSpeed(Ms, c);
    const vDefined =
      sp.n >= C.minRvMembers && sp.meanCos2 >= C.minCos2 && sp.V > 0;
    const V = vDefined ? sp.V : NaN;
    const medPlx = median(Ms.map(s => s.parallax));
    let medLnQ = NaN;
    let sigmaQ = NaN;
    // AM3: the magnitude rule is centred on the median, so the speed cancels and
    // a placeholder 1 serves where no speed is defined.
    const qOn = vDefined || qAlways;
    const Vq = vDefined ? V : 1;
    if (qOn) {
      const lq = [];
      for (const s of Ms) {
        const g = towards(s, c);
        const pi = starParallax(g.muPar, g.sin, Vq);
        if (Number.isFinite(pi)) lq.push(Math.log(pi / s.parallax));
      }
      if (lq.length) {
        medLnQ = median(lq);
        sigmaQ = Math.max(C.qFloor, 1.4826 * mad(lq, medLnQ));
      }
    }
    const next = [];
    const offThr = Math.min(C.nSigma * sigmaOff, C.offCapDeg);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const g = towards(s, c);
      if (!(g.tu > 0)) continue;
      if (Math.abs(offDeg(s, c)) > offThr) continue;
      if (Math.abs(s.parallax / medPlx - 1) > C.windowRel) continue;
      if (vDefined && s.hasRv) {
        const r = s.rv - V * g.cos;
        if (
          Math.abs(r) >
          C.nSigma * Math.sqrt(s.rvError * s.rvError + C.sigma0 ** 2)
        )
          continue;
      }
      if (qOn && g.sin >= C.minSin && Number.isFinite(medLnQ)) {
        const pi = starParallax(g.muPar, g.sin, Vq);
        if (
          Number.isFinite(pi) &&
          Math.abs(Math.log(pi / s.parallax) - medLnQ) >
            Math.min(C.nSigma * sigmaQ, C.qCap)
        )
          continue;
      }
      next.push(i);
    }
    if (trace)
      trace({
        step: steps,
        size: M.length,
        next: next.length,
        c,
        sigmaOff,
        V,
        sigmaQ,
        medLnQ,
        medPlx,
      });
    if (next.length < 5) return refused('no-cluster', { steps: steps + 1 });
    if (sameSet(next, M)) {
      converged = true;
      break;
    }
    M = next;
  }
  if (!converged) return refused('no-convergence', { steps });
  return finish(stars, M, steps);
}

/** Final fit on the converged member set and the refusals of the contract. */
function finish(stars, M, steps) {
  const C = CONTRACT;
  const Ms = M.map(i => stars[i]);
  const c = fitConvergentPoint(Ms);
  const offs = Ms.map(s => offDeg(s, c));
  const sigmaOff = Math.max(C.offFloorDeg, 1.4826 * mad(offs, median(offs)));
  const base = {
    members: M,
    nMembers: M.length,
    steps,
    cpVector: c,
    cp: toRaDec(c),
    sigmaOffDeg: sigmaOff,
  };
  const sp = fitSpeed(Ms, c);
  let rvScatter = NaN;
  if (sp.n >= 1 && sp.V > 0) {
    const res = Ms.filter(s => s.hasRv).map(s => s.rv - sp.V * dot(s.n, c));
    rvScatter = 1.4826 * mad(res, median(res));
  }
  base.rvMembers = sp.n;
  base.rvScatter = rvScatter;
  if (
    M.length < C.minMembers ||
    sigmaOff > C.maxOffSigmaDeg ||
    (Number.isFinite(rvScatter) && rvScatter > C.maxRvScatter)
  )
    return refused('no-cluster', base);
  if (sp.n < C.minRvMembers)
    return { ...base, status: 'cp-only', reason: 'no-rv' };
  if (sp.meanCos2 < C.minCos2)
    return { ...base, status: 'cp-only', reason: 'perpendicular' };
  if (!(sp.V > 0)) return { ...base, status: 'cp-only', reason: 'sign' };
  const V = sp.V;
  const used = [];
  const pis = [];
  for (const s of Ms) {
    const g = towards(s, c);
    const pi = starParallax(g.muPar, g.sin, V);
    if (Number.isFinite(pi)) {
      used.push(s);
      pis.push(pi);
    }
  }
  if (used.length < 5) return { ...base, status: 'cp-only', reason: 'no-rv' };
  const piMC = weightedMean(used, pis);
  return {
    ...base,
    status: 'ok',
    reason: null,
    V,
    used: used.map(s => s.index),
    usedStars: used,
    perStar: pis,
    piMC,
    nUsed: used.length,
  };
}

/** sum(w x) / sum(w) with w = 1 / parallax_error^2 (233's weights). */
export function weightedMean(stars, values) {
  let sw = 0;
  let swx = 0;
  for (let i = 0; i < stars.length; i++) {
    const w = 1 / (stars[i].parallaxError * stars[i].parallaxError);
    sw += w;
    swx += w * values[i];
  }
  return swx / sw;
}

/** Convergent point, speed and pi_MC of a fixed set of stars (no membership step). */
export function estimate(set) {
  const c = fitConvergentPoint(set);
  const sp = fitSpeed(set, c);
  if (!(sp.V > 0)) return null;
  const used = [];
  const pis = [];
  for (const s of set) {
    const g = towards(s, c);
    const pi = starParallax(g.muPar, g.sin, sp.V);
    if (Number.isFinite(pi)) {
      used.push(s);
      pis.push(pi);
    }
  }
  if (used.length < 5) return null;
  return { c, V: sp.V, piMC: weightedMean(used, pis), used, perStar: pis };
}

// ---- the bootstrap --------------------------------------------------------------

/**
 * Bootstrap of a result's members: the convergent point and the speed are
 * refitted in every replicate (members fixed, no clipping). Returns the
 * replicates' pi_MC (sorted), the sigma and intervals, the replicates' vectors
 * and the discard count. rand: a uniform stream.
 */
export function bootstrap(stars, result, B, rand) {
  return bootstrapSet(
    result.members.map(i => stars[i]),
    B,
    rand
  );
}

/** The same bootstrap over an explicit set of stars (the real sample's halves). */
export function bootstrapSet(Ms, B, rand) {
  const n = Ms.length;
  const piRep = [];
  const cps = [];
  let discarded = 0;
  for (let r = 0; r < B; r++) {
    const set = new Array(n);
    for (let k = 0; k < n; k++) set[k] = Ms[Math.floor(rand() * n)];
    const c = fitConvergentPoint(set);
    cps.push(c);
    const sp = fitSpeed(set, c);
    if (!(sp.V > 0)) {
      discarded++;
      continue;
    }
    const used = [];
    const pis = [];
    for (const s of set) {
      const g = towards(s, c);
      const pi = starParallax(g.muPar, g.sin, sp.V);
      if (Number.isFinite(pi)) {
        used.push(s);
        pis.push(pi);
      }
    }
    if (used.length < 5) {
      discarded++;
      continue;
    }
    piRep.push(weightedMean(used, pis));
  }
  const sorted = Float64Array.from(piRep).sort();
  const out = { B, discarded, replicates: sorted.length, cps };
  if (sorted.length >= 2) {
    const lo = percentile(sorted, 0.15865);
    const hi = percentile(sorted, 0.84135);
    out.sigma = 0.5 * (hi - lo);
    out.i68 = [lo, hi];
    out.i95 = [percentile(sorted, 0.02275), percentile(sorted, 0.97725)];
  }
  return out;
}

/** The 68.27th percentile of the angles between replicate convergent points and c. */
export function cpRadius(cps, c) {
  const a = Float64Array.from(cps, v => angleBetween(v, c)).sort();
  return percentile(a, 0.6827);
}

/**
 * The full answer with its interval and the refusals that depend on it.
 * comparison: 233's clusterParallax result for the used stars (passed in so the
 * kernel does not import the astrometry module).
 */
export function withInterval(stars, result, B, rand) {
  if (result.status !== 'ok') return result;
  const bs = bootstrap(stars, result, B, rand);
  const out = { ...result, bootstrap: bs };
  if (bs.discarded > CONTRACT.maxDiscard * B)
    return { ...out, status: 'cp-only', reason: 'unstable' };
  out.sigmaMC = bs.sigma;
  if (!(bs.sigma / result.piMC <= CONTRACT.maxRelInterval))
    return { ...out, status: 'cp-only', reason: 'interval' };
  return out;
}

export { dot, cross, norm };
