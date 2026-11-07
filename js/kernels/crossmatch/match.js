// =============================================================================
// The crossmatch: a cone search, a nearest-neighbour match, and the shifted-
// match estimate of chance coincidences (Prompt 263, CROSSMATCH.md)
// -----------------------------------------------------------------------------
// A catalog is {id, ra, dec (degrees), epoch (Julian year, one or per row),
// positionStep: {raDeg, decDeg} (the stored rounding step), and optionally pmra,
// pmdec (mas/yr, pmra is mu_alpha*), pmraErr, pmdecErr, sigmaPosArcsec}. The
// kernel refuses before it matches when the epoch is absent, when a catalog
// without proper motions is at another epoch, when the radius is over the
// committed maximum, and when the stored positions are rounded too coarsely for
// the radius or the rounding is not stated. It never matches on the rounded
// neighbourhood pack and never ignores an epoch.
// =============================================================================

import { refused } from '../statistics/check.js';
import { poissonInterval } from '../statistics/intervals.js';
import {
  ARCSEC,
  LIMITS,
  MODEL_ID,
  RADIUS_TOLERANCE,
  VERSION,
} from './constants.js';
import { at, propagateCatalog } from './epoch.js';
import {
  makeSweep,
  offsetPosition,
  separationArcsec,
  unitVectors,
} from './geometry.js';

const DEG = Math.PI / 180;

export const ASSUMES = Object.freeze([
  'Positions move in straight lines in space with the radial velocity taken as zero; a radial velocity adds a perspective term that is neglected.',
  'Position and proper-motion errors are independent; where the catalogs state no position error the match distance carries no uncertainty.',
  'The match is to the nearest row within the radius; a row with another candidate in the radius is counted as ambiguous, because the pairing then chose.',
  'The false-match fraction is an upper bound on the share of the reported matches that are chance coincidences whenever true counterparts exist.',
]);

/** The largest on-sky rounding step of a catalog, arcsec, or null when it is not stated. */
export function onSkyStepArcsec(positionStep, dec) {
  if (!positionStep || !(positionStep.raDeg > 0) || !(positionStep.decDeg > 0))
    return null;
  let minAbsDec = 90;
  for (let i = 0; i < dec.length; i++)
    minAbsDec = Math.min(minAbsDec, Math.abs(dec[i]));
  return Math.max(
    positionStep.raDeg * 3600 * Math.cos(minAbsDec * DEG),
    positionStep.decDeg * 3600
  );
}

function checkShape(cat, role) {
  const n = cat?.ra?.length;
  const bad = why => refused('input', `catalog ${role}: ${why}`);
  if (!(n > 0)) return bad('it has no rows');
  if (n > LIMITS.rowLimit)
    return bad(`${n} rows; the limit is ${LIMITS.rowLimit}`);
  if (cat.dec?.length !== n) return bad('ra and dec differ in length');
  for (let i = 0; i < n; i++)
    if (!Number.isFinite(cat.ra[i]) || !Number.isFinite(cat.dec[i]))
      return bad(`row ${i} has a position that is not a finite number`);
  for (const k of ['pmra', 'pmdec'])
    if (cat[k] !== undefined && cat[k].length !== n)
      return bad(`${k} and ra differ in length`);
  return null;
}

function checkEpoch(cat, role) {
  const e = cat.epoch;
  const n = cat.ra.length;
  const ok =
    typeof e === 'number'
      ? Number.isFinite(e)
      : (Array.isArray(e) || ArrayBuffer.isView(e)) &&
        e.length === n &&
        Array.from(e).every(Number.isFinite);
  return ok
    ? null
    : refused(
        'epoch',
        `catalog ${role} has no epoch; a match without epochs is not made`
      );
}

/** Validate and propagate one catalog for a match at `radius` to `toEpoch`. */
function prepare(cat, role, radius, toEpoch) {
  const shape = checkShape(cat, role);
  if (shape) return shape;
  const ep = checkEpoch(cat, role);
  if (ep) return ep;
  const step = onSkyStepArcsec(cat.positionStep, cat.dec);
  if (step === null)
    return refused(
      'resolution',
      `catalog ${role} does not state how coarsely its positions are stored; a match needs the rounding step`
    );
  const half = step / 2;
  if (half > LIMITS.roundingFraction * radius * (1 + 1e-9))
    return refused(
      'rounded-positions',
      `catalog ${role} stores positions to ${Math.round(step * 10) / 10} arcsec (rounding error up to ${Math.round(half * 10) / 10} arcsec), more than ${LIMITS.roundingFraction} of the ${radius} arcsec radius; use the precise table`
    );
  const differs = (() => {
    const e = cat.epoch;
    for (let i = 0; i < cat.ra.length; i++)
      if (at(e, i) !== toEpoch) return true;
    return false;
  })();
  if (differs && (cat.pmra === undefined || cat.pmdec === undefined))
    return refused(
      'proper-motion',
      `catalog ${role} has no proper motions and is not at the common epoch ${toEpoch}; its positions cannot be propagated`
    );
  const p = propagateCatalog(cat, toEpoch);
  if (p.status !== 'ok') return p;
  return { ...p, n: cat.ra.length, u: unitVectors(p.ra, p.dec) };
}

function checkRadius(radius, max) {
  if (!Number.isFinite(radius) || !(radius > 0))
    return refused('radius', 'the radius is not a number above zero');
  if (radius > max)
    return refused(
      'radius',
      `the radius ${radius} arcsec is over the maximum ${max} arcsec`
    );
  return null;
}

/**
 * The rows of a catalog within `radiusArcsec` of a position, nearest first.
 * @param {object} cat
 * @param {{raDeg: number, decDeg: number, radiusArcsec: number, toEpoch?: number}} q
 *   toEpoch propagates the catalog first; without it the stored positions are used.
 */
export function coneSearch(cat, { raDeg, decDeg, radiusArcsec, toEpoch }) {
  const bad = checkRadius(radiusArcsec, LIMITS.coneMaxRadiusArcsec);
  if (bad) return bad;
  if (![raDeg, decDeg].every(Number.isFinite))
    return refused('input', 'the centre is not a finite position');
  const shape = checkShape(cat, 'A');
  if (shape) return shape;
  let ra = cat.ra;
  let dec = cat.dec;
  let valid = null;
  if (toEpoch !== undefined) {
    const ep = checkEpoch(cat, 'A');
    if (ep) return ep;
    const p = propagateCatalog(cat, toEpoch);
    if (p.status !== 'ok') return p;
    ({ ra, dec, valid } = p);
  }
  const u = unitVectors(ra, dec);
  const c = unitVectors([raDeg], [decDeg]);
  const members = [];
  for (let j = 0; j < u.length / 3; j++) {
    if (valid && !valid[j]) continue;
    const d = separationArcsec(u, j, c, 0);
    if (d <= radiusArcsec * (1 + RADIUS_TOLERANCE))
      members.push({ index: j, distanceArcsec: d });
  }
  members.sort(
    (p, q) => p.distanceArcsec - q.distanceArcsec || p.index - q.index
  );
  return { status: 'ok', version: VERSION, members, n: members.length };
}

/** For each valid row of A: its candidates in B within the radius. */
function candidatesOf(A, B, radius) {
  const sweep = makeSweep(B.u);
  const out = [];
  for (let i = 0; i < A.n; i++) {
    if (!A.valid[i]) continue;
    const list = [];
    sweep(A.u[3 * i], A.u[3 * i + 1], A.u[3 * i + 2], radius, (j, d) => {
      if (B.valid[j]) list.push([j, d]);
    });
    out.push([i, list]);
  }
  return out;
}

function tangentOffsets(A, i, B, j) {
  // B's offset from A's row in A's local east and north, arcsec.
  const a = A.ra[i] * DEG;
  const d = A.dec[i] * DEG;
  const dx = B.u[3 * j] - A.u[3 * i];
  const dy = B.u[3 * j + 1] - A.u[3 * i + 1];
  const dz = B.u[3 * j + 2] - A.u[3 * i + 2];
  const e = -Math.sin(a) * dx + Math.cos(a) * dy;
  const n =
    -Math.sin(d) * Math.cos(a) * dx -
    Math.sin(d) * Math.sin(a) * dy +
    Math.cos(d) * dz;
  return [e / ARCSEC, n / ARCSEC];
}

function pairSigma(A, i, B, j, d) {
  if (!A.sigmaRa || !B.sigmaRa) return null;
  const sa = A.sigmaRa[i] ** 2 + B.sigmaRa[j] ** 2;
  const sd = A.sigmaDec[i] ** 2 + B.sigmaDec[j] ** 2;
  if (!(d > 0)) return Math.sqrt((sa + sd) / 2);
  const [e, n] = tangentOffsets(A, i, B, j);
  return Math.sqrt((e * e * sa + n * n * sd) / (e * e + n * n));
}

/**
 * The shifted-match estimate: B is moved on the sky by `distanceArcsec` along
 * each bearing and matched again; the rows of A with a shifted row of B in the
 * radius are chance coincidences, because a shift removes every counterpart.
 */
function shiftedMatch(A, B, radius, nMatches, o) {
  const bearings = o.bearingsDeg ?? LIMITS.shiftBearings;
  const distance = o.distanceArcsec ?? LIMITS.shiftRadii * radius;
  const level = o.level ?? 0.95;
  if (!(distance > 0) || !(bearings.length > 0))
    return refused(
      'shifts',
      'the shifts need a distance above zero and a bearing'
    );
  const fp = o.footprint ?? null;
  if (fp && !(fp.radiusArcsec > radius))
    return refused(
      'footprint',
      'the footprint radius must exceed the match radius'
    );
  const counts = [];
  let C = 0;
  let E = 0;
  const bra = new Float64Array(B.n);
  const bdec = new Float64Array(B.n);
  for (const bearing of bearings) {
    for (let j = 0; j < B.n; j++)
      [bra[j], bdec[j]] = B.valid[j]
        ? offsetPosition(B.ra[j], B.dec[j], distance, bearing)
        : [0, 0];
    const shifted = { u: unitVectors(bra, bdec), valid: B.valid };
    const sweep = makeSweep(shifted.u);
    let centre = null;
    if (fp) {
      const [cr, cd] = offsetPosition(fp.raDeg, fp.decDeg, distance, bearing);
      centre = unitVectors([cr], [cd]);
    }
    let chance = 0;
    let eligible = 0;
    for (let i = 0; i < A.n; i++) {
      if (!A.valid[i]) continue;
      if (
        centre &&
        separationArcsec(A.u, i, centre, 0) > fp.radiusArcsec - radius
      )
        continue;
      eligible++;
      let hit = false;
      sweep(A.u[3 * i], A.u[3 * i + 1], A.u[3 * i + 2], radius, j => {
        if (shifted.valid[j]) hit = true;
      });
      if (hit) chance++;
    }
    counts.push({ bearingDeg: bearing, chance, eligible });
    C += chance;
    E += eligible;
  }
  if (E === 0)
    return refused(
      'footprint',
      'no row of A lies inside the shifted footprints'
    );
  const nA = A.valid.reduce((s, v) => s + v, 0);
  const p = C / E;
  const iv = poissonInterval([C], { level, method: 'garwood' });
  const lo = iv.lo / E;
  const hi = iv.hi / E;
  const fraction = x =>
    nMatches > 0 ? Math.min(1, (x * nA) / nMatches) : null;
  const unreliable = p > LIMITS.maxChance;
  return {
    status: unreliable ? 'unreliable' : 'ok',
    method: 'shifted-match',
    radiusArcsec: radius,
    distanceArcsec: distance,
    level,
    counts,
    chance: C,
    eligible: E,
    p,
    pLo: lo,
    pHi: hi,
    expectedChance: p * nA,
    fraction: fraction(p),
    fractionLo: fraction(lo),
    fractionHi: fraction(hi),
    footprint: Boolean(fp),
    bound: 'upper',
    warnings: [
      ...(fp
        ? []
        : [
            'no footprint was given: the count is biased low near the edge of the field',
          ]),
      ...(unreliable
        ? [
            `the chance of a row having an unrelated neighbour in the radius is ${Math.round(p * 100) / 100}, over ${LIMITS.maxChance}: the radius is too large for this density and the match is not reliable`,
          ]
        : []),
    ],
  };
}

/**
 * Match the rows of A to the rows of B.
 * @param {object} a
 * @param {object} b
 * @param {{radiusArcsec: number, toEpoch: number, mode?: 'nearest'|'oneToOne',
 *   falseMatch?: object|null}} o
 */
export function crossmatch(a, b, o) {
  const { radiusArcsec: radius, toEpoch, mode = 'nearest' } = o ?? {};
  const bad = checkRadius(radius, LIMITS.maxRadiusArcsec);
  if (bad) return bad;
  if (!Number.isFinite(toEpoch))
    return refused('epoch', 'the common epoch is not a number');
  if (mode !== 'nearest' && mode !== 'oneToOne')
    return refused('mode', 'the mode is "nearest" or "oneToOne"');
  const A = prepare(a, 'A', radius, toEpoch);
  if (A.status === 'refused') return A;
  const B = prepare(b, 'B', radius, toEpoch);
  if (B.status === 'refused') return B;
  const cand = candidatesOf(A, B, radius);
  let chosen = [];
  let ambiguous = 0;
  for (const [i, list] of cand) {
    if (list.length > 1) ambiguous++;
    if (!list.length) continue;
    if (mode === 'nearest') {
      let best = list[0];
      for (const c of list)
        if (c[1] < best[1] || (c[1] === best[1] && c[0] < best[0])) best = c;
      chosen.push([i, best[0], best[1], list.length]);
    }
  }
  if (mode === 'oneToOne') {
    const edges = [];
    for (const [i, list] of cand)
      for (const [j, d] of list) edges.push([i, j, d, list.length]);
    edges.sort((p, q) => p[2] - q[2] || p[0] - q[0] || p[1] - q[1]);
    const usedA = new Set();
    const usedB = new Set();
    for (const e of edges) {
      if (usedA.has(e[0]) || usedB.has(e[1])) continue;
      usedA.add(e[0]);
      usedB.add(e[1]);
      chosen.push(e);
    }
    chosen.sort((p, q) => p[0] - q[0]);
  }
  const usedB = new Map();
  for (const c of chosen) usedB.set(c[1], (usedB.get(c[1]) ?? 0) + 1);
  const pairs = chosen.map(([i, j, d, k]) => ({
    a: i,
    b: j,
    distanceArcsec: d,
    epochDifferenceYr: at(a.epoch, i) - at(b.epoch, j),
    sigmaArcsec: pairSigma(A, i, B, j, d),
    candidates: k,
  }));
  const nA = A.valid.reduce((s, v) => s + v, 0);
  const nB = B.valid.reduce((s, v) => s + v, 0);
  let shared = 0;
  for (const k of usedB.values()) if (k > 1) shared++;
  const result = {
    status: 'ok',
    version: VERSION,
    model: MODEL_ID,
    toEpoch,
    radiusArcsec: radius,
    mode,
    nA,
    nB,
    pairs,
    unmatchedA: nA - pairs.length,
    unmatchedB: nB - usedB.size,
    ambiguous,
    shared,
    excluded: { a: A.excluded, b: B.excluded },
    falseMatch: null,
    assumes: [...ASSUMES],
  };
  if (o.falseMatch) {
    const f = shiftedMatch(A, B, radius, pairs.length, o.falseMatch);
    result.falseMatch = f;
  }
  return result;
}
