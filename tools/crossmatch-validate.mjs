#!/usr/bin/env node
// =============================================================================
// The crossmatch kernel against its committed thresholds (Prompt 263, Part A)
// -----------------------------------------------------------------------------
//   npm run crossmatch:validate                      print the table
//   npm run crossmatch:validate -- --json            print it as JSON
//   npm run crossmatch:validate -- --write-results   rewrite tests/fixtures/crossmatch/results.json
//   npm run crossmatch:validate -- --write-failed    rewrite tests/fixtures/crossmatch/failed-legs.json
//   --only=A1,E4                                     run the legs whose id starts with these
//   --followup [--write-results]                     run AM2's three follow-up legs (A6b, B1b, G2e) and write followup-results.json
//
// tests/fixtures/crossmatch/thresholds.json fixed every bound before
// js/kernels/crossmatch/ existed; this reads the bounds from that file. The B, C,
// D1, D2 and E1, E2 rows read oracle-results.json, which
// tools/crossmatch-oracle/oracle.py wrote (numpy, scipy, astropy; no Gravitas
// code). A leg that cannot be measured is NOT RUN and says why. Node, not Jest.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as X from '../js/kernels/crossmatch/index.js';
import { poissonInterval } from '../js/kernels/statistics/intervals.js';
import { lnGamma } from '../js/kernels/statistics/special.js';
import { stream, gaussian } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { PACK as GAIA } from '../js/data/observations/gaiaNgc2420.js';
import { PACK as NEIGH } from '../js/data/observations/gaiaSolarNeighbourhood.js';
import {
  PACK as SDSS,
  SERIES as SDSS_SERIES,
} from '../js/data/observations/sdssNgc2420Photometry.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/crossmatch';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const ORACLE = read(`${DIR}/oracle-results.json`);

const check = id =>
  THRESHOLDS.checks.find(c => c.id === id) ??
  THRESHOLDS.followUp.checks.find(c => c.id === id);
const ARCSEC = X.ARCSEC;
const STEP = { raDeg: 1e-5, decDeg: 1e-5 };
const FOOT = 14.1421 * 60;
const CENTRE = [114.602, 21.575];

// ---------------------------------------------------------------------------
// Small tools the legs share
// ---------------------------------------------------------------------------

const sepOf = (r1, d1, r2, d2) => {
  const u = X.unitVectors([r1, r2], [d1, d2]);
  return X.separationArcsec(u, 0, u, 1);
};

/** Tangent-plane offsets (arcsec; x east, y north) to (ra, dec) degrees: the inverse gnomonic projection. */
function planeToSky(x, y, ra0, dec0) {
  const X_ = x * ARCSEC;
  const Y_ = y * ARCSEC;
  const a0 = (ra0 * Math.PI) / 180;
  const d0 = (dec0 * Math.PI) / 180;
  const rho = Math.hypot(X_, Y_);
  const c = Math.atan(rho);
  const sd =
    Math.cos(c) * Math.sin(d0) +
    (rho > 0 ? (Y_ * Math.sin(c) * Math.cos(d0)) / rho : 0);
  const dec = Math.asin(Math.max(-1, Math.min(1, sd)));
  const ra =
    a0 +
    Math.atan2(
      X_ * Math.sin(c),
      rho * Math.cos(d0) * Math.cos(c) - Y_ * Math.sin(d0) * Math.sin(c)
    );
  return [((((ra * 180) / Math.PI) % 360) + 360) % 360, (dec * 180) / Math.PI];
}

const discPoint = (u, R) => {
  const r = R * Math.sqrt(u());
  const t = 2 * Math.PI * u();
  return [r * Math.cos(t), r * Math.sin(t)];
};

const poisson = (mean, u) => {
  const L = Math.exp(-mean);
  let k = 0;
  let p = L;
  let s = L;
  const x = u();
  while (x > s && k < 1000) {
    k++;
    p *= mean / k;
    s += p;
  }
  return k;
};

const cat = (ra, dec, extra = {}) => ({
  ra,
  dec,
  epoch: 2000,
  positionStep: STEP,
  ...extra,
});

const diffCount = (pairsA, pairsB) => {
  const sa = new Set(pairsA.map(p => `${p[0]},${p[1]}`));
  const sb = new Set(pairsB.map(p => `${p[0]},${p[1]}`));
  let n = 0;
  for (const k of sa) if (!sb.has(k)) n++;
  for (const k of sb) if (!sa.has(k)) n++;
  return n;
};

// The packs, decoded by the app's own reader, as catalogs
async function loadPacks() {
  const gaiaSeries = read('gaia/ngc2420.json');
  const neighSeries = read('gaia/solar-neighbourhood.json');
  const g = X.catalogFromPack(
    tableOf({ PACK: GAIA, SERIES: gaiaSeries }),
    GAIA
  );
  const s = X.catalogFromPack(
    tableOf({ PACK: SDSS, SERIES: SDSS_SERIES }),
    SDSS
  );
  const n = X.catalogFromPack(
    tableOf({ PACK: NEIGH, SERIES: neighSeries }),
    NEIGH
  );
  return { g, s, n };
}

// ---------------------------------------------------------------------------
// The legs
// ---------------------------------------------------------------------------

const rows = [];
const add = (id, status, measured, note = null) => {
  const c = check(id) ?? check(id.split('.')[0]);
  rows.push({
    id,
    group: c?.group ?? null,
    status,
    measured,
    bound: c?.limits ?? null,
    note,
  });
};
const bound = (id, ok, measured, note) =>
  add(id, ok ? 'pass' : 'fail', measured, note);

function legsA() {
  // A1: pure north
  const decs = [-80, -30, 0, 30, 60, 85];
  const mus = [100, -3000, 8, 450, -20, 60];
  const dts = [25, -16, 40, 3, -50, 7];
  let worst = 0;
  decs.forEach((dec, i) => {
    const p = X.propagateCatalog(
      { ra: [10], dec: [dec], epoch: 0, pmra: [0], pmdec: [mus[i]] },
      dts[i]
    );
    const expect = dec + (Math.atan(mus[i] * X.MAS * dts[i]) * 180) / Math.PI;
    worst = Math.max(worst, sepOf(p.ra[0], p.dec[0], 10, expect));
  });
  bound('A1.north', worst <= check('A1.north').limits.maxAbsArcsec, worst);
  // A2: pure east
  worst = 0;
  decs.forEach((dec, i) => {
    const p = X.propagateCatalog(
      { ra: [10], dec: [dec], epoch: 0, pmra: [mus[i]], pmdec: [0] },
      dts[i]
    );
    const s = mus[i] * X.MAS * dts[i];
    const cd = Math.cos((dec * Math.PI) / 180);
    const raE = 10 + (Math.atan2(s, cd) * 180) / Math.PI;
    const decE =
      (Math.asin(Math.sin((dec * Math.PI) / 180) / Math.sqrt(1 + s * s)) *
        180) /
      Math.PI;
    worst = Math.max(worst, sepOf(p.ra[0], p.dec[0], raE, decE));
  });
  bound('A2.east', worst <= check('A2.east').limits.maxAbsArcsec, worst);
  // A3: zero interval
  const z = X.propagateCatalog(
    {
      ra: [12.5, 200.25],
      dec: [-3.5, 60.75],
      epoch: 2000,
      pmra: [5, NaN],
      pmdec: [7, NaN],
      sigmaPosArcsec: 0.05,
    },
    2000
  );
  const exact =
    z.ra[0] === 12.5 &&
    z.dec[0] === -3.5 &&
    z.ra[1] === 200.25 &&
    z.dec[1] === 60.75 &&
    z.sigmaRa[0] === 0.05 &&
    z.excluded === 0;
  bound('A3.zero', exact, exact ? 0 : 'changed');
  // A4: sigma
  let rel = 0;
  for (const s0 of [0.001, 0.05, 1])
    for (const sm of [0.01, 0.3, 5])
      for (const dt of [-30, 16, 50]) {
        const p = X.propagateCatalog(
          {
            ra: [10],
            dec: [20],
            epoch: 0,
            pmra: [3],
            pmdec: [-4],
            sigmaPosArcsec: s0,
            pmraErr: sm,
            pmdecErr: sm,
          },
          dt
        );
        const want = s0 * s0 + (sm * dt * 1e-3) ** 2;
        rel = Math.max(rel, Math.abs(p.sigmaRa[0] ** 2 - want) / want);
        rel = Math.max(rel, Math.abs(p.sigmaDec[0] ** 2 - want) / want);
      }
  bound('A4.sigma', rel <= check('A4.sigma').limits.maxRel, rel);
  // A5: small-angle limit
  const u = stream('noise', 'p263', 'A5', 0);
  let relS = 0;
  for (let i = 0; i < 50; i++) {
    const dec = Math.asin(2 * u() - 1) * (180 / Math.PI);
    const ra = 360 * u();
    const th = 2 * Math.PI * u();
    const mag = 0.2 + 0.8 * u(); // arcsec
    const mu = (mag / 10) * 1000; // mas/yr over 10 yr
    const p = X.propagateCatalog(
      {
        ra: [ra],
        dec: [dec],
        epoch: 0,
        pmra: [mu * Math.cos(th)],
        pmdec: [mu * Math.sin(th)],
      },
      10
    );
    relS = Math.max(
      relS,
      Math.abs(sepOf(ra, dec, p.ra[0], p.dec[0]) / mag - 1)
    );
  }
  bound('A5.small', relS <= check('A5.small').limits.maxRel, relS);
  // A6: large shift
  const big = X.propagateCatalog(
    { ra: [1], dec: [1], epoch: 0, pmra: [0], pmdec: [3.6e6 * 1.0001] },
    1
  );
  const edge = X.propagateCatalog(
    { ra: [1], dec: [1], epoch: 0, pmra: [0], pmdec: [3.6e6] },
    1
  );
  const pole = ORACLE.O1.ra.length - 1;
  const pc = X.propagateCatalog(
    {
      ra: [ORACLE.O1.ra[pole]],
      dec: [ORACLE.O1.dec[pole]],
      epoch: 0,
      pmra: [0],
      pmdec: [5],
    },
    25
  );
  const raMoved = Math.abs(((pc.ra[0] - ORACLE.O1.ra[pole] + 540) % 360) - 180);
  const a6 =
    big.status === 'refused' &&
    big.code === 'shift-too-large' &&
    edge.status === 'ok' &&
    Math.abs(pc.dec[0]) < 90 &&
    Math.abs(180 - raMoved) < 1e-6;
  bound('A6.largeShift', a6, {
    over: big.code,
    edge: edge.status,
    poleDec: pc.dec[0],
    poleRaMoved: raMoved,
  });
}

function legsB() {
  const o = ORACLE.O1;
  const n = o.ra.length;
  let worst = 0;
  const p = X.propagateCatalog(
    {
      ra: o.ra,
      dec: o.dec,
      epoch: o.dt.map(v => -v),
      pmra: o.pmra,
      pmdec: o.pmdec,
    },
    0
  );
  for (let i = 0; i < n; i++)
    worst = Math.max(worst, sepOf(p.ra[i], p.dec[i], o.raOut[i], o.decOut[i]));
  bound(
    'B1.propagation',
    worst <= check('B1.propagation').limits.maxSepArcsec,
    worst,
    `${n} sources`
  );
}

function w1Catalogs() {
  const w = ORACLE.O2;
  const A = {
    ra: w.A.ra,
    dec: w.A.dec,
    pmra: w.A.pmra,
    pmdec: w.A.pmdec,
    epoch: w.A.epoch,
    positionStep: STEP,
  };
  const B = { ra: w.B.ra, dec: w.B.dec, epoch: w.B.epoch, positionStep: STEP };
  return { A, B, w };
}

function legsC() {
  const { A, B, w } = w1Catalogs();
  const r = X.crossmatch(A, B, { radiusArcsec: 2, toEpoch: 2000 });
  const mine = r.pairs.map(p => [p.a, p.b, p.distanceArcsec]);
  const d = diffCount(mine, w.pairs);
  bound(
    'C1.pairs',
    d <= check('C1.pairs').limits.maxDifferences,
    d,
    `${mine.length} pairs`
  );
  const omap = new Map(w.pairs.map(p => [`${p[0]},${p[1]}`, p[2]]));
  let md = 0;
  for (const m of mine) {
    const q = omap.get(`${m[0]},${m[1]}`);
    if (q !== undefined) md = Math.max(md, Math.abs(q - m[2]));
  }
  bound('C2.distance', md <= check('C2.distance').limits.maxAbsArcsec, md);
  // C3
  let diffs = 0;
  for (const c of w.cones)
    for (const rad of [5, 20, 60]) {
      const got = X.coneSearch(B, {
        raDeg: c.ra,
        decDeg: c.dec,
        radiusArcsec: rad,
      });
      const have = new Set(got.members.map(m => m.index));
      const want = new Set(c.members[String(rad)]);
      for (const k of have) if (!want.has(k)) diffs++;
      for (const k of want) if (!have.has(k)) diffs++;
    }
  bound('C3.cone', diffs <= check('C3.cone').limits.maxDifferences, diffs);
  // C4: hand cases (derived on paper before any run)
  const dec = s => s / 3600;
  const Bc = cat([0], [0]);
  const i1 = cat([0, 0], [dec(0.3), dec(-0.5)]);
  const n1 = X.crossmatch(i1, Bc, { radiusArcsec: 2, toEpoch: 2000 });
  const o1 = X.crossmatch(i1, Bc, {
    radiusArcsec: 2,
    toEpoch: 2000,
    mode: 'oneToOne',
  });
  const case1 =
    n1.pairs.length === 2 &&
    n1.shared === 1 &&
    o1.pairs.length === 1 &&
    o1.pairs[0].a === 0;
  const tie = cat([0, 0], [dec(0.4), dec(-0.4)]);
  const t = X.crossmatch(tie, Bc, {
    radiusArcsec: 2,
    toEpoch: 2000,
    mode: 'oneToOne',
  });
  const case2 = t.pairs.length === 1 && t.pairs[0].a === 0;
  const on = X.crossmatch(cat([0], [0]), cat([0], [dec(2)]), {
    radiusArcsec: 2,
    toEpoch: 2000,
  });
  const off = X.crossmatch(cat([0], [0]), cat([0], [dec(2.0001)]), {
    radiusArcsec: 2,
    toEpoch: 2000,
  });
  const case3 = on.pairs.length === 1 && off.pairs.length === 0;
  bound('C4.oneToOne', case1 && case2 && case3, { case1, case2, case3 });
}

async function legsD(packs) {
  const { g, s } = packs;
  const O = ORACLE.O3;
  const run = (radius, B = s, toEpoch = 2000, falseMatch = null) =>
    X.crossmatch(g, B, { radiusArcsec: radius, toEpoch, falseMatch });
  const sameInputs =
    g.ra.length === O.nA &&
    s.ra.length === O.nB &&
    g.epoch === O.epochA &&
    s.epoch === O.epochB;
  let r1 = run(1);
  const d1 = diffCount(
    r1.pairs.map(p => [p.a, p.b]),
    O.radii['1.0'].pairs
  );
  bound(
    'D1.packPairs',
    sameInputs && d1 <= 0,
    d1,
    `${r1.pairs.length} pairs; inputs equal the oracle's: ${sameInputs}`
  );
  const ds = [0.5, 2].map(r =>
    diffCount(
      run(r).pairs.map(p => [p.a, p.b]),
      O.radii[r.toFixed(1)].pairs
    )
  );
  bound(
    'D2.packRadii',
    ds.every(v => v <= 0),
    ds
  );
  // D3: counts
  const rep = {};
  for (const r of [1, 2]) {
    const m = run(r);
    const d = m.pairs.map(p => p.distanceArcsec).sort((a, b) => a - b);
    rep[r] = {
      pairs: m.pairs.length,
      unmatchedA: m.unmatchedA,
      unmatchedB: m.unmatchedB,
      ambiguous: m.ambiguous,
      shared: m.shared,
      medianArcsec: d[Math.floor(d.length / 2)],
      p95Arcsec: d[Math.floor(d.length * 0.95)],
    };
  }
  add('D3.packCounts', 'reported', rep);
  // D4: epoch sensitivity
  const base = new Set(run(1).pairs.map(p => `${p.a},${p.b}`));
  const sens = {};
  for (const e of [1992, 1996, 2000, 2004, 2008]) {
    const m = run(1, { ...s, epoch: e }, e);
    const set = new Set(m.pairs.map(p => `${p.a},${p.b}`));
    let differ = 0;
    for (const k of set) if (!base.has(k)) differ++;
    for (const k of base) if (!set.has(k)) differ++;
    sens[e] = {
      pairs: m.pairs.length,
      differ,
      oracleDiffer: O.epochSensitivity[e].differ,
    };
  }
  add('D4.epochSensitivity', 'reported', sens);
  add(
    'D5.publishedTool',
    'not run',
    null,
    'needs R1 (the SDSS per-object observation epoch) and R2 (a published crossmatch output); neither was fetched'
  );
  // E2: shifted counts on the packs
  const fm = X.crossmatch(g, s, {
    radiusArcsec: 1,
    toEpoch: 2000,
    falseMatch: {
      distanceArcsec: 20,
      footprint: { raDeg: CENTRE[0], decDeg: CENTRE[1], radiusArcsec: FOOT },
    },
  });
  const got = fm.falseMatch.counts.map(c => [c.chance, c.eligible]);
  let worst = 0;
  got.forEach((c, k) => {
    worst = Math.max(
      worst,
      Math.abs(c[0] - O.shifts.counts[k][0]),
      Math.abs(c[1] - O.shifts.counts[k][1])
    );
  });
  bound(
    'E2.shiftCountsPacks',
    worst <= 0,
    worst,
    `p_hat ${fm.falseMatch.p.toPrecision(4)}, false-match fraction ${fm.falseMatch.fraction?.toPrecision(4)}`
  );
  return fm;
}

function legsE() {
  const { A, B, w } = w1Catalogs();
  const fm = X.crossmatch(A, B, {
    radiusArcsec: 2,
    toEpoch: 2000,
    falseMatch: {
      distanceArcsec: w.shifts.distanceArcsec,
      footprint: {
        raDeg: w.centre[0],
        decDeg: w.centre[1],
        radiusArcsec: w.footprintArcsec,
      },
    },
  });
  let worst = 0;
  fm.falseMatch.counts.forEach((c, k) => {
    worst = Math.max(
      worst,
      Math.abs(c.chance - w.shifts.counts[k][0]),
      Math.abs(c.eligible - w.shifts.counts[k][1])
    );
  });
  bound(
    'E1.shiftCounts',
    worst <= check('E1.shiftCounts').limits.maxAbsDifference,
    worst
  );
}

// ---- ensemble worlds -----------------------------------------------------

function w2World(leg, i, { nB = 1500, radius = 3 } = {}) {
  const u = stream('noise', 'p263', leg, i);
  const A = { ra: [], dec: [] };
  const B = { ra: [], dec: [] };
  for (let k = 0; k < 1500; k++) {
    const [x, y] = discPoint(u, 540);
    const [r, d] = planeToSky(x, y, 150, 30);
    A.ra.push(r);
    A.dec.push(d);
  }
  for (let k = 0; k < nB; k++) {
    const [x, y] = discPoint(u, 600);
    const [r, d] = planeToSky(x, y, 150, 30);
    B.ra.push(r);
    B.dec.push(d);
  }
  return X.crossmatch(cat(A.ra, A.dec), cat(B.ra, B.dec), {
    radiusArcsec: radius,
    toEpoch: 2000,
    falseMatch: {
      footprint: { raDeg: 150, decDeg: 30, radiusArcsec: 600 },
    },
  });
}

function legsEnsembleFalse() {
  const pTrue = 1 - (1 - (3 / 600) ** 2) ** 1500;
  const first = w2World('E4', 0);
  add(
    'E3.fractionRecovered',
    Math.abs(first.falseMatch.fraction - 1) <=
      check('E3.fractionRecovered').limits.maxAbs
      ? 'pass'
      : 'fail',
    {
      fraction: first.falseMatch.fraction,
      matches: first.pairs.length,
      pHat: first.falseMatch.p,
    }
  );
  // the same first world as E4 world 0 (a single stream key)
  const M = 1000;
  let sumRatio = 0;
  let covered = 0;
  for (let i = 0; i < M; i++) {
    const r = i === 0 ? first : w2World('E4', i);
    sumRatio += r.falseMatch.p / pTrue;
    if (r.falseMatch.pLo <= pTrue && pTrue <= r.falseMatch.pHi) covered++;
  }
  const bias = sumRatio / M - 1;
  bound(
    'E4.bias',
    Math.abs(bias) <= check('E4.bias').limits.maxAbs,
    bias,
    `${M} worlds, p_true ${pTrue.toPrecision(5)}`
  );
  bound(
    'E5.coverage',
    covered / M >= check('E5.coverage').limits.minCoverage,
    covered / M,
    `${M} worlds at level 0.95`
  );
  // E9
  const crowded = w2World('E9', 0, { nB: 20000 });
  const w3 = crowded.falseMatch.status;
  const w2 = first.falseMatch.status;
  bound('E9.crowded', w3 === 'unreliable' && w2 === 'ok', {
    w3,
    w2,
    w3p: crowded.falseMatch.p,
  });
}

function w1World(i) {
  const u = stream('noise', 'p263', 'E6', i);
  const g = gaussian(u);
  const N = 600;
  const nx = 200;
  const A = { ra: [], dec: [], pmra: [], pmdec: [] };
  const Tru = { ra: [], dec: [], pmra: [], pmdec: [] };
  for (let k = 0; k < N; k++) {
    const [x, y] = discPoint(u, 300);
    const [r, d] = planeToSky(x, y, 150, 30);
    const mu = [150 * g(), 150 * g()];
    Tru.ra.push(r);
    Tru.dec.push(d);
    Tru.pmra.push(mu[0]);
    Tru.pmdec.push(mu[1]);
    const [ra, dec] = planeToSky(x + 0.03 * g(), y + 0.03 * g(), 150, 30);
    A.ra.push(ra);
    A.dec.push(dec);
    A.pmra.push(mu[0] + 0.3 * g());
    A.pmdec.push(mu[1] + 0.3 * g());
  }
  for (let k = 0; k < nx; k++) {
    const [x, y] = discPoint(u, 300);
    const [r, d] = planeToSky(x, y, 150, 30);
    A.ra.push(r);
    A.dec.push(d);
    A.pmra.push(150 * g() + 0.3 * g());
    A.pmdec.push(150 * g() + 0.3 * g());
  }
  const back = X.propagateCatalog({ ...Tru, epoch: 2016 }, 2000);
  const B = { ra: [], dec: [] };
  for (let k = 0; k < N; k++) {
    const nxs = 0.1 * g();
    const nys = 0.1 * g();
    const dd = back.dec[k];
    B.ra.push(back.ra[k] + nxs / 3600 / Math.cos((dd * Math.PI) / 180));
    B.dec.push(dd + nys / 3600);
  }
  for (let k = 0; k < nx; k++) {
    const [x, y] = discPoint(u, 300);
    const [r, d] = planeToSky(x, y, 150, 30);
    B.ra.push(r);
    B.dec.push(d);
  }
  return { A, B, N };
}

function legsEnsembleTrue() {
  const M = 200;
  let boundHolds = 0;
  let recov = 0;
  let naive = 0;
  let sumEst = 0;
  let sumReal = 0;
  const foot = { raDeg: 150, decDeg: 30, radiusArcsec: 300 };
  for (let i = 0; i < M; i++) {
    const { A, B, N } = w1World(i);
    const Ac = { ...A, epoch: 2016, positionStep: STEP };
    const Bc = cat(B.ra, B.dec);
    const r = X.crossmatch(Ac, Bc, {
      radiusArcsec: 2,
      toEpoch: 2000,
      falseMatch: { footprint: foot },
    });
    let truePairs = 0;
    let falsePairs = 0;
    for (const p of r.pairs) {
      if (p.a < N && p.b === p.a) truePairs++;
      else falsePairs++;
    }
    const realized = r.pairs.length ? falsePairs / r.pairs.length : 0;
    if (r.falseMatch.fraction >= realized) boundHolds++;
    sumEst += r.falseMatch.fraction ?? 0;
    sumReal += realized;
    recov += truePairs / N;
    const nv = X.crossmatch(cat(A.ra, A.dec), Bc, {
      radiusArcsec: 2,
      toEpoch: 2000,
    });
    naive += nv.pairs.filter(p => p.a < N && p.b === p.a).length / N;
  }
  bound(
    'E6.upperBound',
    boundHolds / M >= check('E6.upperBound').limits.minFraction,
    boundHolds / M,
    `tightness (mean estimate over mean realized): ${(sumEst / sumReal).toPrecision(3)}; mean estimate ${(sumEst / M).toPrecision(3)}, mean realized ${(sumReal / M).toPrecision(3)}`
  );
  bound(
    'E7.recovery',
    recov / M >= check('E7.recovery').limits.minMean,
    recov / M,
    `${M} worlds`
  );
  bound(
    'E8.naiveControl',
    naive / M <= check('E8.naiveControl').limits.maxMean,
    naive / M,
    'proper motions removed and epochs declared equal'
  );
}

function legsF(packs) {
  const base = (n = 3, extra = {}) =>
    cat(
      Array.from({ length: n }, (_, i) => i * 0.01),
      Array.from({ length: n }, () => 10),
      extra
    );
  const m = (a, b, o = {}) =>
    X.crossmatch(a, b, { radiusArcsec: 1, toEpoch: 2000, ...o });
  // F1
  const noA = m({ ...base(), epoch: undefined }, base());
  const nanB = m(base(), { ...base(), epoch: NaN });
  bound('F1.epochAbsent', noA.code === 'epoch' && nanB.code === 'epoch', [
    noA.code,
    nanB.code,
  ]);
  // F2
  const other = { ...base(), epoch: 2016 };
  const f2a = m(other, base());
  const f2b = m({ ...other, pmra: [0, 0, 0], pmdec: [0, 0, 0] }, base());
  const f2c = m({ ...base(), epoch: 2000 }, base());
  bound(
    'F2.noProperMotion',
    f2a.code === 'proper-motion' && f2b.status === 'ok' && f2c.status === 'ok',
    [f2a.code, f2b.status, f2c.status]
  );
  // F3
  const codes = [1, 5, 10].map(r => m(packs.n, packs.s, { radiusArcsec: r }));
  const f3 = codes.every(
    c =>
      c.status === 'refused' &&
      c.code === 'rounded-positions' &&
      /arcsec/.test(c.why)
  );
  bound(
    'F3.roundedPack',
    f3,
    codes.map(c => c.code),
    codes[0].why
  );
  // F4
  const rr = [10, 10.0001, 0, -1, NaN].map(r =>
    m(base(), base(), { radiusArcsec: r })
  );
  bound(
    'F4.maxRadius',
    rr[0].status === 'ok' && rr.slice(1).every(r => r.code === 'radius'),
    rr.map(r => r.code ?? r.status)
  );
  // F5
  const f5a = m(base(3, { positionStep: undefined }), base());
  const noRec = X.catalogFromPack(
    {
      columns: [
        { id: 'ra', unit: 'deg', values: [1] },
        { id: 'dec', unit: 'deg', values: [2] },
      ],
    },
    {
      id: 'x',
      object: { frame: 'ICRS, epoch J2000' },
      reductions: ['Positions are somewhere.'],
    }
  );
  const f5b = m(noRec, base());
  bound(
    'F5.resolutionUnstated',
    f5a.code === 'resolution' &&
      f5b.code === 'resolution' &&
      noRec.positionStep === null,
    [f5a.code, f5b.code]
  );
  // F6
  const pre = m(packs.g, packs.s);
  const exact = m(
    base(3, { positionStep: { raDeg: 0.5 / 3600, decDeg: 0.5 / 3600 } }),
    base()
  );
  const over = m(
    base(3, { positionStep: { raDeg: 0.52 / 3600, decDeg: 0.52 / 3600 } }),
    base()
  );
  bound(
    'F6.precisePackAccepted',
    pre.status === 'ok' &&
      exact.status === 'ok' &&
      over.code === 'rounded-positions',
    [pre.status, exact.status, over.code]
  );
  // F7
  const bad = [
    m({ ...base(), ra: [NaN, 1, 2] }, base()),
    m({ ...base(), dec: [1, 2] }, base()),
    m({ ra: [], dec: [], epoch: 2000, positionStep: STEP }, base()),
    m(cat(new Array(20001).fill(1), new Array(20001).fill(1)), base()),
    m(base(), cat(new Array(20001).fill(1), new Array(20001).fill(1))),
  ];
  bound(
    'F7.badInput',
    bad.every(r => r.code === 'input'),
    bad.map(r => r.code)
  );
  // F8
  const a8 = {
    ...base(5),
    epoch: 2016,
    pmra: [1, NaN, 1, NaN, 1],
    pmdec: [1, 1, NaN, 1, 1],
  };
  const r8 = m(a8, base());
  bound('F8.missingProperMotion', r8.excluded.a === 3, r8.excluded);
}

function legsG() {
  // G1
  const u = stream('noise', 'p263', 'G1', 0);
  let maxd = 0;
  for (let i = 0; i < 40; i++) {
    const c = Math.floor(u() * 300);
    const d = X.distribution(new Array(c).fill(0.5), { edges: [0, 1] });
    const e = poissonInterval([c], { level: 0.95 });
    maxd = Math.max(
      maxd,
      Math.abs(d.bins[0].intervalLo - e.lo),
      Math.abs(d.bins[0].intervalHi - e.hi)
    );
  }
  bound('G1.intervals', maxd <= 0, maxd);
  // G2
  const means = [2, 5, 12, 30, 80, 150];
  const cover = new Array(6).fill(0);
  const W = 2000;
  for (let w = 0; w < W; w++) {
    const s = stream('noise', 'p263', 'G2', w);
    const vals = [];
    means.forEach((mu, k) => {
      const c = poisson(mu, s);
      for (let j = 0; j < c; j++) vals.push(k + 0.5);
    });
    const d = X.distribution(vals, { edges: [0, 1, 2, 3, 4, 5, 6] });
    d.bins.forEach((b, k) => {
      if (b.intervalLo <= means[k] && means[k] <= b.intervalHi) cover[k]++;
    });
  }
  const cv = cover.map(c => c / W);
  bound(
    'G2.coverage',
    Math.min(...cv) >= check('G2.coverage').limits.minCoveragePerBin,
    cv
  );
  // G3, G4, G6
  const pair = (n, shift, leg, i) => {
    const s = stream('noise', 'p263', leg, i);
    const g = gaussian(s);
    const x = Array.from({ length: n }, () => g() + shift);
    const y = Array.from({ length: n }, () => g());
    return X.compareSamples(x, y);
  };
  const P = 4000;
  const rate = (n, shift, leg) => {
    let rej = 0;
    let cov = 0;
    for (let i = 0; i < P; i++) {
      const r = pair(n, shift, leg, i);
      if (r.p < 0.05) rej++;
      if (r.lo <= shift && shift <= r.hi) cov++;
    }
    return { rej: rej / P, cov: cov / P };
  };
  const s30 = rate(30, 0, 'G3');
  const s100 = rate(100, 0, 'G3b');
  const L3 = check('G3.size').limits;
  bound(
    'G3.size',
    s30.rej >= L3.n30[0] &&
      s30.rej <= L3.n30[1] &&
      s100.rej >= L3.n100[0] &&
      s100.rej <= L3.n100[1],
    { n30: s30.rej, n100: s100.rej }
  );
  const pw = rate(100, 0.5, 'G4');
  bound('G4.power', pw.rej >= check('G4.power').limits.minPower, pw.rej);
  bound(
    'G6.coverage',
    pw.cov >= check('G6.coverage').limits.minCoverage,
    pw.cov
  );
  // G5
  const ok = Array.from({ length: 30 }, (_, i) => i);
  const g5 = [
    X.compareSamples(ok.slice(0, 29), ok),
    X.compareSamples([...ok.slice(0, 29), NaN], ok),
    X.compareSamples(new Array(30).fill(1), new Array(30).fill(1)),
  ];
  bound(
    'G5.refusal',
    g5.every(r => r.status !== 'ok' && (r.p === undefined || r.p === null)),
    g5.map(r => r.code ?? r.status)
  );
  // G7
  const expo = (n, leg) => {
    let rej = 0;
    for (let i = 0; i < P; i++) {
      const s = stream('noise', 'p263', leg, i);
      const x = Array.from({ length: n }, () => -Math.log(1 - s()));
      const y = Array.from({ length: n }, () => -Math.log(1 - s()));
      if (X.compareSamples(x, y).p < 0.05) rej++;
    }
    return rej / P;
  };
  add('G7.skewed', 'reported', { n30: expo(30, 'G7'), n100: expo(100, 'G7b') });
}

function legsH() {
  const { A, B, w } = w1Catalogs();
  const r = X.crossmatch(A, B, {
    radiusArcsec: 2,
    toEpoch: 2000,
    falseMatch: {
      footprint: {
        raDeg: w.centre[0],
        decDeg: w.centre[1],
        radiusArcsec: w.footprintArcsec,
      },
    },
  });
  const rec = X.crossmatchRecord(r, {
    source: { kind: 'pipeline', id: 'p263-w1' },
  });
  const problems = validateArtifact(rec);
  bound(
    'H1.record',
    problems.length === 0 && [1, 2].includes(rec.formatVersion),
    { problems: problems.length, formatVersion: rec.formatVersion }
  );
  const dq = rec.quantities.filter(q => q.id.endsWith('.epochDifference'));
  const sq = rec.quantities.filter(q => q.id.endsWith('.distance'));
  const exact =
    rec.quantities.length === 7 + 2 * r.pairs.length &&
    dq.every(q => q.value === 16) &&
    sq.every((q, k) => q.value === r.pairs[k].distanceArcsec);
  bound('H2.rows', exact, {
    quantities: rec.quantities.length,
    pairs: r.pairs.length,
  });
  const colsA = [{ id: 'g', unit: 'mag', values: A.ra.map((_, i) => i * 0.5) }];
  const colsB = [{ id: 'z', unit: '', values: B.ra.map((_, i) => i + 0.25) }];
  const t = X.joinedTable(
    r,
    { ...A, columns: colsA },
    { ...B, columns: colsB },
    { passA: ['g'], passB: ['z'] }
  );
  const okT =
    t.n === r.pairs.length &&
    t.columns.every(c => c.values.length === t.n) &&
    r.pairs.every(
      (p, k) =>
        t.columns.find(c => c.id === 'a.g').values[k] === p.a * 0.5 &&
        t.columns.find(c => c.id === 'b.z').values[k] === p.b + 0.25 &&
        t.columns.find(c => c.id === 'epochDifference').values[k] === 16
    );
  bound('H3.joined', okT, { rows: t.n, columns: t.columns.map(c => c.id) });
}

// ---- the follow-up legs (thresholds.json followUp, AM2) ---------------------

const followCheck = id => THRESHOLDS.followUp.checks.find(c => c.id === id);

function legsFollowUp() {
  // A6b: a pole crossing in closed form
  const dec0 = 90 - 0.00001;
  const ra0 = 33;
  const pm = 5;
  const dt = 25;
  const p = X.propagateCatalog(
    { ra: [ra0], dec: [dec0], epoch: 0, pmra: [0], pmdec: [pm] },
    dt
  );
  const s = pm * X.MAS * dt;
  const d0 = (dec0 * Math.PI) / 180;
  const h = Math.cos(d0) - s * Math.sin(d0);
  const decE =
    (Math.atan2(Math.sin(d0) + s * Math.cos(d0), Math.abs(h)) * 180) / Math.PI;
  const raE = (ra0 + (h < 0 ? 180 : 0)) % 360;
  const sepErr = sepOf(p.ra[0], p.dec[0], raE, decE);
  const raErr = Math.abs(((p.ra[0] - raE + 540) % 360) - 180);
  const L = followCheck('A6b.poleCrossing').limits;
  bound(
    'A6b.poleCrossing',
    h < 0 && sepErr <= L.maxAbsArcsec && raErr <= L.maxRaErrDeg,
    { crossed: h < 0, sepErr, raErr, dec: p.dec[0] }
  );
  // B1b: the oracle's pole-crossing sources
  const o = ORACLE.O1b;
  const q = X.propagateCatalog(
    {
      ra: o.ra,
      dec: o.dec,
      epoch: o.dt.map(v => -v),
      pmra: o.pmra,
      pmdec: o.pmdec,
    },
    0
  );
  let worst = 0;
  for (let i = 0; i < o.ra.length; i++)
    worst = Math.max(worst, sepOf(q.ra[i], q.dec[i], o.raOut[i], o.decOut[i]));
  bound(
    'B1b.poleCrossing',
    worst <= followCheck('B1b.poleCrossing').limits.maxSepArcsec,
    worst,
    `${o.ra.length} sources`
  );
  // G2e: exact coverage
  const means = [2, 5, 12, 30, 80, 150];
  const cover = means.map(mu => {
    let cov = 0;
    let mass = 0;
    for (let k = 0; k <= mu + 14 * Math.sqrt(mu) + 60; k++) {
      const pmf = Math.exp(k * Math.log(mu) - mu - lnGamma(k + 1));
      mass += pmf;
      const b = X.distribution(new Array(k).fill(0.5), { edges: [0, 1] })
        .bins[0];
      if (b.intervalLo <= mu && mu <= b.intervalHi) cov += pmf;
    }
    return { mean: mu, coverage: cov, mass };
  });
  bound(
    'G2e.exactCoverage',
    cover.every(c => 1 - c.mass < 1e-12) &&
      Math.min(...cover.map(c => c.coverage)) >=
        followCheck('G2e.exactCoverage').limits.minCoveragePerMean,
    cover.map(c => Number(c.coverage.toFixed(5)))
  );
}

// ---------------------------------------------------------------------------

function verdict() {
  const bounded = rows.filter(r => !['reported', 'not run'].includes(r.status));
  const failed = bounded.filter(r => r.status === 'fail').map(r => r.id);
  return failed.length
    ? { verdict: 'FAILED LEG(S)', failed }
    : { verdict: 'VALIDATED', failed };
}

async function main() {
  const args = process.argv.slice(2);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const on = id => only.length === 0 || only.some(p => p[0] === id[0]);
  const t0 = process.cpuUsage();
  const packs = await loadPacks();
  const followup = args.includes('--followup');
  const steps = followup
    ? [['X', legsFollowUp]]
    : [
        ['A', legsA],
        ['B', legsB],
        ['C', legsC],
        ['D', () => legsD(packs)],
        ['E1', legsE],
        ['E3', legsEnsembleFalse],
        ['E6', legsEnsembleTrue],
        ['F', () => legsF(packs)],
        ['G', legsG],
        ['H', legsH],
      ];
  for (const [id, fn] of steps) if (on(id)) await fn();
  if (only.length)
    for (let i = rows.length - 1; i >= 0; i--)
      if (!only.some(p => rows[i].id.startsWith(p))) rows.splice(i, 1);
  const cpu = process.cpuUsage(t0);
  rows.sort((p, q) => p.id.localeCompare(q.id, 'en', { numeric: true }));
  const v = verdict();
  const out = {
    format: 'gravitas.crossmatch-results/1',
    thresholdsSha: ORACLE.inputs.thresholdsSha256,
    node: process.version,
    cpuSeconds: Number(((cpu.user + cpu.system) / 1e6).toFixed(1)),
    ...v,
    counts: Object.fromEntries(
      ['pass', 'fail', 'reported', 'not run'].map(s => [
        s,
        rows.filter(r => r.status === s).length,
      ])
    ),
    rows,
  };
  if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(24)} ${JSON.stringify(r.measured)?.slice(0, 160)}${r.note ? '  # ' + r.note : ''}`
      );
    console.log(
      `\n${out.verdict}  ${JSON.stringify(out.counts)}  cpu ${out.cpuSeconds}s`
    );
  }
  if (args.includes('--write-results'))
    writeFileSync(
      path.join(ROOT, DIR, followup ? 'followup-results.json' : 'results.json'),
      JSON.stringify(out, null, 1) + '\n'
    );
  if (args.includes('--write-failed') && !followup) {
    const legs = rows
      .filter(r => r.status === 'fail')
      .map(r => ({ id: r.id, measured: r.measured, note: r.note }));
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      JSON.stringify(
        {
          format: 'gravitas.crossmatch-failed-legs/1',
          note: 'the legs that crossed a committed bound; they stay failing, only Carl resets a bound',
          legs,
        },
        null,
        1
      ) + '\n'
    );
  }
  process.exitCode = out.failed.length ? 1 : 0;
}

main();
