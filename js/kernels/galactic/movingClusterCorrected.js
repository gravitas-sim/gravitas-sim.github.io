// =============================================================================
// The corrected-eigenvector convergent point (CE), Prompt 234 Part A follow-up:
// a prototype on spike/moving-cluster-followup, never merged. Written from
// tests/fixtures/moving-cluster/followup-thresholds.json ("estimator"), committed
// (1d71cd33) before this file existed. It adds to movingCluster.js and changes
// nothing in it: the plain estimator, the membership iteration and every Part A
// leg are untouched. Pure: no DOM, no clock. Angles in degrees at the interface.
// =============================================================================

import * as MC from './movingCluster.js';

const { Math, Number, Float64Array } = globalThis;
const DEG = Math.PI / 180;
const { dot, norm } = MC;

export const CE = Object.freeze({ minSin: 0.1, tolRad: 1e-12, maxIter: 100 });

/** Plain prepare plus the proper-motion errors and the east and north vectors. */
export function prepareCE(rows, rvErrorCut) {
  const stars = MC.prepare(rows, rvErrorCut);
  for (const s of stars) {
    const r = rows[s.index];
    const ra = Math.atan2(s.n[1], s.n[0]);
    const dec = Math.asin(s.n[2]);
    s.e = [-Math.sin(ra), Math.cos(ra), 0];
    s.g = [
      -Math.cos(ra) * Math.sin(dec),
      -Math.sin(ra) * Math.sin(dec),
      Math.cos(dec),
    ];
    // the proper-motion errors: the file's columns; for a row without them the
    // star's parallax sigma (the committed synthetic law, correlations zero)
    s.pmraError = Number.isFinite(r.pmraError)
      ? r.pmraError
      : r.parallaxError;
    s.pmdecError = Number.isFinite(r.pmdecError)
      ? r.pmdecError
      : r.parallaxError;
  }
  return stars;
}

/** delta^2 = tau^2 / sin^2 theta + sPerp^2 / mu^2 (rad^2). */
export const noiseVariance = (tau2, sinTheta, sPerp2, mu) =>
  tau2 / (sinTheta * sinTheta) + sPerp2 / (mu * mu);

/** The variance of the proper motion across the track: (b.e)^2 s_ra^2 + (b.g)^2 s_dec^2. */
export const crossTrackVariance = s => {
  const be = dot(s.b, s.e);
  const bg = dot(s.b, s.g);
  return be * be * s.pmraError * s.pmraError + bg * bg * s.pmdecError ** 2;
};

/** tau^2 = max(0, (lambda n / (n - 2) - sum M) / n); NaN if n <= 2. */
export const tauSquared = (lambda, sumM, n) =>
  n > 2 ? Math.max(0, ((lambda * n) / (n - 2) - sumM) / n) : NaN;

const outer = (S, v, w) => {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] += w * v[i] * v[j];
};

/**
 * The corrected matrix at c: S* = sum_U b b^T - sum_U delta^2 t t^T over the
 * stars with sin theta >= 0.1, with tau^2 estimated from the offsets at c.
 */
export function correctedMatrix(set, c) {
  const U = [];
  let lambda = 0;
  let sumM = 0;
  for (const s of set) {
    const g = MC.towards(s, c);
    if (!(g.sin >= CE.minSin)) continue;
    const off = dot(s.b, c);
    const s2 = crossTrackVariance(s);
    lambda += off * off;
    sumM += (g.sin * g.sin * s2) / (s.mu * s.mu);
    U.push({ s, sin: g.sin, s2 });
  }
  const n = U.length;
  const tau2 = tauSquared(lambda, sumM, n);
  const S = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  if (!Number.isFinite(tau2)) return { S, tau2, n, lambda, sumM, U };
  for (const { s, sin, s2 } of U) {
    outer(S, s.b, 1);
    outer(S, s.t, -noiseVariance(tau2, sin, s2, s.mu));
  }
  return { S, tau2, n, lambda, sumM, U };
}

const sign = (set, c) => {
  let sum = 0;
  for (const s of set) {
    const g = MC.towards(s, c);
    if (g.sin >= CE.minSin) sum += g.tu;
  }
  return sum < 0 ? [-c[0], -c[1], -c[2]] : c;
};

const subsetAt = (set, c) =>
  set.filter(s => MC.towards(s, c).sin >= CE.minSin);

/**
 * CE of a set of stars: {converged, c, tau2, iterations, n}. c_0 is the plain
 * eigenvector of U_0, the stars with sin theta >= 0.1 at the plain point.
 */
export function fitConvergentPointCE(set) {
  const plain = MC.fitConvergentPoint(set);
  const U0 = subsetAt(set, plain);
  if (U0.length < 3) return { converged: false, reason: 'few', iterations: 0 };
  let c = MC.fitConvergentPoint(U0);
  let tau2 = NaN;
  let n = U0.length;
  for (let k = 1; k <= CE.maxIter; k++) {
    const cm = correctedMatrix(set, c);
    if (!Number.isFinite(cm.tau2))
      return { converged: false, reason: 'few', iterations: k };
    const { vectors } = MC.eigenSym3(cm.S);
    const next = sign(cm.U.map(u => u.s), vectors[0]);
    const angle = MC.angleBetween(next, c) * DEG;
    tau2 = cm.tau2;
    n = cm.n;
    c = next;
    if (angle <= CE.tolRad) return { converged: true, c, tau2, iterations: k, n };
  }
  return { converged: false, reason: 'iterations', c, tau2, iterations: CE.maxIter, n };
}

const toRaDec = c => {
  let ra = Math.atan2(c[1], c[0]) / DEG;
  if (ra < 0) ra += 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, c[2]))) / DEG };
};

/** Speed, per-star and cluster parallax at c for the members Ms (no refusals on the radial-velocity count). */
function distanceAt(Ms, c) {
  const sp = MC.fitSpeed(Ms, c);
  if (sp.n < MC.CONTRACT.minRvMembers) return { sp, reason: 'no-rv' };
  if (sp.meanCos2 < MC.CONTRACT.minCos2) return { sp, reason: 'perpendicular' };
  if (!(sp.V > 0)) return { sp, reason: 'sign' };
  const used = [];
  const pis = [];
  for (const s of Ms) {
    const g = MC.towards(s, c);
    const pi = MC.starParallax(g.muPar, g.sin, sp.V);
    if (Number.isFinite(pi)) {
      used.push(s);
      pis.push(pi);
    }
  }
  if (used.length < 5) return { sp, reason: 'no-rv' };
  return { sp, used, pis, piMC: MC.weightedMean(used, pis) };
}

/**
 * The follow-up pipeline: the amended membership iteration (AM1 to AM3), then
 * CE on the members, then the speed and the parallax at the CE point. The plain
 * result is kept as .plain for the reported comparison.
 */
export function analyseCE(stars) {
  const plain = MC.analyse(stars, { seed: 'cp', qAlways: true });
  if (plain.status === 'refused') return plain;
  return refineCE(stars, plain);
}

export function refineCE(stars, plain) {
  const Ms = plain.members.map(i => stars[i]);
  const ce = fitConvergentPointCE(Ms);
  const base = {
    members: plain.members,
    nMembers: plain.nMembers,
    steps: plain.steps,
    sigmaOffDeg: plain.sigmaOffDeg,
    rvMembers: plain.rvMembers,
    rvScatter: plain.rvScatter,
    plain,
  };
  if (!ce.converged)
    return { ...base, status: 'refused', reason: 'ce-no-convergence', ceReason: ce.reason };
  const c = ce.c;
  const out = {
    ...base,
    cpVector: c,
    cp: toRaDec(c),
    tau2: ce.tau2,
    ceIterations: ce.iterations,
    ceStars: ce.n,
  };
  const d = distanceAt(Ms, c);
  if (!d.used) return { ...out, status: 'cp-only', reason: d.reason };
  return {
    ...out,
    status: 'ok',
    reason: null,
    V: d.sp.V,
    used: d.used.map(s => s.index),
    usedStars: d.used,
    perStar: d.pis,
    piMC: d.piMC,
    nUsed: d.used.length,
  };
}

/** Bootstrap with CE refitted in every replicate (members fixed, no clipping). */
export function bootstrapSetCE(Ms, B, rand) {
  const n = Ms.length;
  const piRep = [];
  const cps = [];
  let discarded = 0;
  for (let r = 0; r < B; r++) {
    const set = new Array(n);
    for (let k = 0; k < n; k++) set[k] = Ms[Math.floor(rand() * n)];
    const ce = fitConvergentPointCE(set);
    if (!ce.converged) {
      discarded++;
      continue;
    }
    cps.push(ce.c);
    const sp = MC.fitSpeed(set, ce.c);
    if (!(sp.V > 0)) {
      discarded++;
      continue;
    }
    const used = [];
    const pis = [];
    for (const s of set) {
      const g = MC.towards(s, ce.c);
      const pi = MC.starParallax(g.muPar, g.sin, sp.V);
      if (Number.isFinite(pi)) {
        used.push(s);
        pis.push(pi);
      }
    }
    if (used.length < 5) {
      discarded++;
      continue;
    }
    piRep.push(MC.weightedMean(used, pis));
  }
  const sorted = Float64Array.from(piRep).sort();
  const out = { B, discarded, replicates: sorted.length, cps };
  if (sorted.length >= 2) {
    const lo = MC.percentile(sorted, 0.15865);
    const hi = MC.percentile(sorted, 0.84135);
    out.sigma = 0.5 * (hi - lo);
    out.i68 = [lo, hi];
    out.i95 = [
      MC.percentile(sorted, 0.02275),
      MC.percentile(sorted, 0.97725),
    ];
  }
  return out;
}

/** The interval and the refusals that depend on it, for a CE result. */
export function withIntervalCE(stars, result, B, rand) {
  if (result.status !== 'ok') return result;
  const bs = bootstrapSetCE(
    result.members.map(i => stars[i]),
    B,
    rand
  );
  const out = { ...result, bootstrap: bs };
  if (bs.discarded > MC.CONTRACT.maxDiscard * B)
    return { ...out, status: 'cp-only', reason: 'unstable' };
  out.sigmaMC = bs.sigma;
  if (!(bs.sigma / result.piMC <= MC.CONTRACT.maxRelInterval))
    return { ...out, status: 'cp-only', reason: 'interval' };
  return out;
}

export { norm };
