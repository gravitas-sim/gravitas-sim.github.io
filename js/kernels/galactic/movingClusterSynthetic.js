// =============================================================================
// Synthetic moving clusters in a synthetic field (Prompt 234 Part A prototype,
// spike/moving-cluster-gate, never merged). Every number comes from
// tests/fixtures/moving-cluster/thresholds.json "syntheticTruth", committed
// before this file existed; it is a labelled synthetic truth, not the Hyades.
// =============================================================================

import { stream, gaussian } from '../../random/streams.js';
import { A_G, K_PM } from './coords.js';
import { dot, norm } from './movingCluster.js';

const { Math } = globalThis;
const DEG = Math.PI / 180;

const unitFromRaDec = (ra, dec) => [
  Math.cos(dec * DEG) * Math.cos(ra * DEG),
  Math.cos(dec * DEG) * Math.sin(ra * DEG),
  Math.sin(dec * DEG),
];
const scale = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = v => scale(v, 1 / norm(v));

function basisAt(n) {
  const ra = Math.atan2(n[1], n[0]);
  const dec = Math.asin(n[2]);
  return {
    e: [-Math.sin(ra), Math.cos(ra), 0],
    g: [
      -Math.cos(ra) * Math.sin(dec),
      -Math.sin(ra) * Math.sin(dec),
      Math.cos(dec),
    ],
  };
}

const toRaDec = n => {
  let ra = Math.atan2(n[1], n[0]) / DEG;
  if (ra < 0) ra += 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, n[2]))) / DEG };
};

/** Galactic (U, V, W) to ICRS Cartesian: A_G is orthogonal, so its transpose. */
const galToEq = v => [
  A_G[0][0] * v[0] + A_G[1][0] * v[1] + A_G[2][0] * v[2],
  A_G[0][1] * v[0] + A_G[1][1] * v[1] + A_G[2][1] * v[2],
  A_G[0][2] * v[0] + A_G[1][2] * v[1] + A_G[2][2] * v[2],
];

/**
 * One realization. truth: the thresholds' syntheticTruth block. opts:
 *   seed, variant (a label), index,
 *   members (default the truth's), internalSigma, expansion (km/s per pc),
 *   field (boolean, default true), cluster (default true), noiseFree,
 *   withRv (default true), separationDeg (the convergent point's distance from
 *   the cluster centre; null for the baseline).
 */
export function realization(truth, opts) {
  const T = truth;
  const {
    seed,
    variant = 'E1',
    index = 0,
    members = T.cluster.members,
    internalSigma = T.cluster.internalSigma,
    expansion = 0,
    field = true,
    cluster = true,
    noiseFree = false,
    withRv = true,
    separationDeg = null,
  } = opts;
  const draw = stream('noise', seed, variant, index);
  const gauss = gaussian(draw);
  const uni = (lo, hi) => lo + (hi - lo) * draw();
  const logUni = (lo, hi) => Math.exp(uni(Math.log(lo), Math.log(hi)));

  const nc = unitFromRaDec(T.cluster.centre.ra, T.cluster.centre.dec);
  const { e: ec, g: gc } = basisAt(nc);
  const c0 = unitFromRaDec(
    T.cluster.convergentPoint.ra,
    T.cluster.convergentPoint.dec
  );
  const t0 = unit(sub(c0, scale(nc, dot(c0, nc))));
  const cp =
    separationDeg === null
      ? c0
      : add(
          scale(nc, Math.cos(separationDeg * DEG)),
          scale(t0, Math.sin(separationDeg * DEG))
        );
  const Vvec = scale(cp, T.cluster.speed);
  const rCentre = scale(nc, 1000 / T.cluster.centreParallax);
  const cosCone = Math.cos(25 * DEG); // the query's 25 degree cone

  const E = T.errors;
  const rows = [];
  const isMember = [];
  const plxTrue = [];
  let generated = 0;

  const observe = (r, v, member) => {
    generated++;
    const d = norm(r);
    const n = scale(r, 1 / d);
    const { e, g } = basisAt(n);
    const dKpc = d / 1000;
    const plx = 1000 / d;
    const pmEast = dot(v, e) / (K_PM * dKpc);
    const pmNorth = dot(v, g) / (K_PM * dKpc);
    const rvTrue = dot(v, n);
    // fixed draw count per star, so options never shift the stream
    const sP = noiseFree
      ? 0.05
      : logUni(E.parallaxSigma.min, E.parallaxSigma.max);
    const sRv = noiseFree
      ? 0.1
      : logUni(E.radialVelocitySigma.min, E.radialVelocitySigma.max);
    const zp = noiseFree ? 0 : E.zeroPoint.mean + E.zeroPoint.sigma * gauss();
    const gP = gauss();
    const gE = gauss();
    const gN = gauss();
    const gR = gauss();
    const hasRv =
      draw() <
      (member
        ? T.cluster.radialVelocityFraction
        : T.field.radialVelocityFraction);
    const noise = noiseFree ? 0 : 1;
    const parallax = plx + zp + noise * sP * gP;
    const pmra = pmEast + noise * sP * gE;
    const pmdec = pmNorth + noise * sP * gN;
    const inCone = dot(n, nc) >= cosCone;
    const ok =
      inCone &&
      parallax >= 12 &&
      parallax <= 40 &&
      parallax / sP > 10 &&
      pmra >= 0 &&
      pmra <= 250 &&
      pmdec >= -150 &&
      pmdec <= 50;
    if (!ok) return false;
    const { ra, dec } = toRaDec(n);
    rows.push({
      ra,
      dec,
      parallax,
      parallaxError: sP,
      pmra,
      pmdec,
      rv: withRv && hasRv ? rvTrue + noise * sRv * gR : NaN,
      rvError: withRv && hasRv ? sRv : NaN,
      zeroPoint: zp,
    });
    isMember.push(member);
    plxTrue.push(plx);
    return true;
  };

  let clusterAccepted = 0;
  if (cluster) {
    for (let k = 0; k < members; k++) {
      const off = [
        T.cluster.positionSigma * gauss(),
        T.cluster.positionSigma * gauss(),
        T.cluster.positionSigma * gauss(),
      ];
      const r = add(rCentre, off);
      const v = add(
        add(Vvec, scale([gauss(), gauss(), gauss()], internalSigma)),
        scale(off, expansion)
      );
      if (observe(r, v, true)) clusterAccepted++;
    }
  }
  if (field) {
    const r1 = 1000 / 40;
    const r2 = 1000 / 12;
    let accepted = 0;
    const sig = T.field.velocity.sigma;
    const mean = T.field.velocity.mean;
    while (accepted < T.field.stars) {
      const ca = uni(cosCone, 1);
      const sa = Math.sqrt(1 - ca * ca);
      const phi = 2 * Math.PI * draw();
      const n = add(
        scale(nc, ca),
        add(scale(ec, sa * Math.cos(phi)), scale(gc, sa * Math.sin(phi)))
      );
      const dist = Math.cbrt(r1 ** 3 + (r2 ** 3 - r1 ** 3) * draw());
      const vGal = [
        mean[0] + sig[0] * gauss(),
        mean[1] + sig[1] * gauss(),
        mean[2] + sig[2] * gauss(),
      ];
      if (observe(scale(n, dist), galToEq(vGal), false)) accepted++;
    }
  }
  return {
    rows,
    truth: {
      isMember,
      plxTrue,
      cpVector: cp,
      speed: T.cluster.speed,
      clusterGenerated: cluster ? members : 0,
      clusterAccepted,
      generated,
      nc,
    },
  };
}
