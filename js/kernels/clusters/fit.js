// =============================================================================
// The fit: log age and distance modulus at a fixed metallicity and reddening
// -----------------------------------------------------------------------------
// The deviance (./deviance.js) of the model diagram (./hess.js) is scanned over
// a lattice of log age (0.02 dex) and distance modulus (0.02 mag): a coarse pass
// (0.04, 0.10) finds the valley, a fine box around its best point is evaluated
// and grown until its edge is more than 8 above the minimum or at the grid's
// limit. The intervals are Prompt 154's profile intervals (Delta D = 1, the
// 68.27 percent level of one parameter), each from the profile of the other
// parameter minimised over; an interval that does not close inside the grid is
// reported open, and the fit says "not constrained" for the parameter. The
// age-distance degeneracy is returned as the valley (the best distance at each
// age) and the correlation of age and distance in the 2.30 region.
// =============================================================================

const { Math, Float64Array, Map } = globalThis;
import { profileInterval } from '../statistics/intervals.js';
import {
  DEFAULT_CONTAMINATION,
  DEFAULT_REDDENING,
  DETECTION_DEVIANCE,
  EXTINCTION_RATIO,
  GRID,
  MINIMUM_MEMBERS,
  MODEL_ID,
  ONE_SIGMA,
  PRESENTED,
  VERSION,
} from './constants.js';
import { binStars, deviance, floorDeviance } from './deviance.js';
import { hessOf } from './hess.js';
import { ClusterError, isochroneAt, pieces } from './isochrones.js';

/**
 * A deviance function over (log age, distance modulus) for binned stars.
 * Isochrone pieces are kept per age, so a scan along distance is cheap.
 */
export function evaluator(set, data, o = {}) {
  const feh = o.feh;
  const E = o.E ?? DEFAULT_REDDENING;
  const R = o.R ?? EXTINCTION_RATIO;
  const eps = o.eps ?? DEFAULT_CONTAMINATION;
  const cache = new Map();
  const piecesAt = logAge => {
    const k = Math.round(logAge * 1e4);
    if (!cache.has(k))
      cache.set(
        k,
        pieces(isochroneAt(set, feh, logAge), +(process.env.PSTEP || 0.01))
      );
    return cache.get(k);
  };
  return {
    feh,
    E,
    R,
    eps,
    piecesAt,
    dev: (logAge, dm) =>
      deviance(
        hessOf(piecesAt(logAge), { dm, E, R, errorModel: o.errorModel }),
        data,
        eps
      ),
  };
}

const notConstrained = (reason, why, extra = {}) => ({
  status: 'not-constrained',
  reason,
  why,
  ...extra,
});

/**
 * @param {object} set - parseIsochrones
 * @param {ArrayLike<number>} g - the members' g
 * @param {ArrayLike<number>} colour - their g - r
 * @param {{feh: number, E?: number, R?: number, eps?: number,
 *   dmRange?: [number, number], ageRange?: [number, number],
 *   minMembers?: number, level?: number, onProgress?: (n: number) => void,
 *   errorModel?: object}} o
 */
export function fitCluster(set, g, colour, o) {
  const E = o.E ?? DEFAULT_REDDENING;
  const R = o.R ?? EXTINCTION_RATIO;
  const eps = o.eps ?? DEFAULT_CONTAMINATION;
  const level = o.level ?? ONE_SIGMA;
  const minMembers = o.minMembers ?? MINIMUM_MEMBERS;
  const [dmLo, dmHi] = o.dmRange ?? GRID.dm;
  const [ageLo, ageHi] = o.ageRange ?? GRID.logAge;
  const stepAge = GRID.stepAge;
  const stepDm = GRID.stepDm;
  if (!(o.feh >= set.fehs[0] && o.feh <= set.fehs.at(-1)))
    throw new ClusterError(
      'metallicity',
      `[Fe/H] ${o.feh} is outside the grid`
    );
  const settings = {
    model: MODEL_ID,
    version: VERSION,
    feh: o.feh,
    E,
    R,
    eps,
    minMembers,
    level,
    dmRange: [dmLo, dmHi],
    ageRange: [ageLo, ageHi],
    stepAge,
    stepDm,
  };
  const data = binStars(g, colour);
  const members = data.n * (1 - eps);
  const base = { settings, stars: data.n, dropped: data.dropped, members };
  if (members < minMembers)
    return {
      ...base,
      ...notConstrained(
        'members',
        `${data.n} stars in the window at a contamination of ${eps} leave about ${Math.round(members)} members; the fit needs ${minMembers}`
      ),
    };
  const ev = evaluator(set, data, {
    feh: o.feh,
    E,
    R,
    eps,
    errorModel: o.errorModel,
  });
  let evaluations = 0;
  const scan = (aLo, aHi, hA, dLo, dHi, hD) => {
    const nA = Math.max(1, Math.round((aHi - aLo) / hA));
    const nD = Math.max(1, Math.round((dHi - dLo) / hD));
    const ages = Array.from({ length: nA + 1 }, (_, i) => aLo + i * hA);
    const dms = Array.from({ length: nD + 1 }, (_, i) => dLo + i * hD);
    const dev = new Float64Array((nA + 1) * (nD + 1));
    for (let i = 0; i <= nA; i++)
      for (let j = 0; j <= nD; j++) {
        dev[i * (nD + 1) + j] = ev.dev(ages[i], dms[j]);
        evaluations++;
      }
    o.onProgress?.(evaluations);
    return { ages, dms, dev, nD1: nD + 1, hA, hD };
  };
  // Zoom: a coarse lattice over the ranges, then lattices over the box that
  // holds the region within 12 of the minimum, until that region spans 24
  // steps (or the steps reach 0.002).
  let lat = scan(ageLo, ageHi, stepAge * 2, dmLo, dmHi, stepDm * 5);
  const minOf = l => {
    let k = 0;
    for (let i = 1; i < l.dev.length; i++) if (l.dev[i] < l.dev[k]) k = i;
    return { d: l.dev[k], ia: Math.floor(k / l.nD1), id: k % l.nD1 };
  };
  for (let round = 0; round < 5; round++) {
    const m = minOf(lat);
    let a0 = Infinity;
    let a1 = -Infinity;
    let d0 = Infinity;
    let d1 = -Infinity;
    for (let i = 0; i < lat.ages.length; i++)
      for (let j = 0; j < lat.nD1; j++)
        if (lat.dev[i * lat.nD1 + j] - m.d <= 12) {
          a0 = Math.min(a0, i);
          a1 = Math.max(a1, i);
          d0 = Math.min(d0, j);
          d1 = Math.max(d1, j);
        }
    const spanA = a1 - a0;
    const spanD = d1 - d0;
    const fine = lat.hA <= 0.0021 && lat.hD <= 0.0021;
    const wide = lat.ages.length - 1 <= 1 || lat.nD1 - 1 <= 1;
    if ((spanA >= 24 && spanD >= 24) || fine || wide) break;
    // the new box: the region padded by 2 steps (or 3 when it is a point), ranges respected
    const padA = Math.max(2, spanA === 0 ? 3 : 0);
    const padD = Math.max(2, spanD === 0 ? 3 : 0);
    const bA0 = Math.max(ageLo, lat.ages[a0] - padA * lat.hA);
    const bA1 = Math.min(ageHi, lat.ages[a1] + padA * lat.hA);
    const bD0 = Math.max(dmLo, lat.dms[d0] - padD * lat.hD);
    const bD1 = Math.min(dmHi, lat.dms[d1] + padD * lat.hD);
    const hA = Math.max(0.002, Math.min(lat.hA, (bA1 - bA0) / 24));
    const hD = Math.max(0.002, Math.min(lat.hD, (bD1 - bD0) / 24));
    if (
      hA === lat.hA &&
      hD === lat.hD &&
      bA0 === lat.ages[0] &&
      bD0 === lat.dms[0]
    )
      break;
    lat = scan(bA0, bA1, hA, bD0, bD1, hD);
  }
  const best = minOf(lat);
  const dMin = best.d;
  const d0 = floorDeviance(data);
  const bestPoint = { logAge: lat.ages[best.ia], dm: lat.dms[best.id] };
  const { ages, dms } = lat;
  const surface = new Float32Array(lat.dev.length);
  const profA = [];
  const valley = [];
  const dProf = dms.map(() => Infinity);
  ages.forEach((age, i) => {
    let m = Infinity;
    let md = 0;
    dms.forEach((dm, j) => {
      const v = lat.dev[i * lat.nD1 + j];
      surface[i * lat.nD1 + j] = v - dMin;
      if (v < m) {
        m = v;
        md = dm;
      }
      if (v < dProf[j]) dProf[j] = v;
    });
    profA.push({ value: age, chi2: m });
    valley.push({ logAge: age, dm: md, delta: m - dMin });
  });
  const profDm = dms.map((dm, j) => ({ value: dm, chi2: dProf[j] }));
  const interval = (points, lo, hi) => {
    const r = profileInterval(points, dMin, { level });
    if (r.status !== 'ok') return { status: 'refused', code: r.code };
    const open = [r.lo === null, r.hi === null];
    return {
      status: open[0] || open[1] ? 'open' : 'ok',
      lo: r.lo,
      hi: r.hi,
      open,
      atLimit: [points[0].value <= lo + 1e-9, points.at(-1).value >= hi - 1e-9],
      level: r.level,
      deltaChi2: r.deltaChi2,
      method: r.method,
      assumes: r.assumes,
    };
  };
  const intervals = {
    logAge: { ...interval(profA, ageLo, ageHi), withheld: !PRESENTED.logAge },
    dm: { ...interval(profDm, dmLo, dmHi), withheld: !PRESENTED.dm },
  };
  // correlation of age and distance in the 2.30 region (two parameters at 68.27 percent)
  let n = 0;
  let sa = 0;
  let sd = 0;
  let saa = 0;
  let sdd = 0;
  let sad = 0;
  ages.forEach((age, i) =>
    dms.forEach((dm, j) => {
      const v = surface[i * lat.nD1 + j];
      if (v <= 2.3) {
        n++;
        sa += age;
        sd += dm;
        saa += age * age;
        sdd += dm * dm;
        sad += age * dm;
      }
    })
  );
  const va = saa / n - (sa / n) ** 2;
  const vd = sdd / n - (sd / n) ** 2;
  const correlation =
    n >= 6 && va > 0 && vd > 0
      ? (sad / n - (sa / n) * (sd / n)) / Math.sqrt(va * vd)
      : null;
  const result = {
    ...base,
    deviance: dMin,
    floorDeviance: d0,
    evaluations,
    best: bestPoint,
    intervals,
    correlation,
    valley,
    stepAge: lat.hA,
    stepDm: lat.hD,
    surface: { ages, dms, delta: surface },
    warnings: [],
  };
  if (d0 - dMin < DETECTION_DEVIANCE)
    return {
      ...result,
      ...notConstrained(
        'no-cluster',
        `the model of a cluster beats the model of field stars alone by ${(d0 - dMin).toFixed(1)}; it needs ${DETECTION_DEVIANCE}`
      ),
    };
  const bad = key => intervals[key].status !== 'ok';
  const age = intervals.logAge;
  if (best.ia === 0 && ages[0] <= ageLo + 1e-9)
    result.warnings.push('ageAtYoungEdge');
  if (best.ia === ages.length - 1 && ages.at(-1) >= ageHi - 1e-9)
    result.warnings.push('ageAtOldEdge');
  if (
    (best.id === 0 && dms[0] <= dmLo + 1e-9) ||
    (best.id === dms.length - 1 && dms.at(-1) >= dmHi - 1e-9)
  )
    result.warnings.push('dmAtEdge');
  if (bad('logAge') || bad('dm'))
    return {
      ...result,
      status: 'open',
      reason: 'interval',
      why: 'an interval does not close inside the grid',
    };
  return { ...result, status: 'ok' };
}
