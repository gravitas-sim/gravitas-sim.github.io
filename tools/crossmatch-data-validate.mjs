#!/usr/bin/env node
// =============================================================================
// The crossmatch kernel's data legs (Prompt 263 follow-up: D5a to D5e, D4b)
// -----------------------------------------------------------------------------
//   node tools/crossmatch-data-validate.mjs --data <scratch-data dir> [--json] [--write-results]
//
// Reads tests/fixtures/crossmatch/data-legs-thresholds.json (every bound was
// committed before any computation on the downloaded data) and the oracle's
// pinned output (data-legs-oracle.json). The downloads (crossmatch263/ and
// gaia233/ngc2420.csv under the data directory, outside every repository; their
// sha256 are in SOURCES.json) are read as DATA only; nothing downloaded is run.
// The clustering legs (B8c, B10) need the gate's prototype, which lives on the
// spike branch; they are in tools/clustering-strip-dec.mjs there.
// Node, not Jest.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as X from '../js/kernels/crossmatch/index.js';
import { tableOf } from '../js/tableObservation.js';
import { PACK as GAIA } from '../js/data/observations/gaiaNgc2420.js';
import {
  PACK as SDSS,
  SERIES as SDSS_SERIES,
} from '../js/data/observations/sdssNgc2420Photometry.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/crossmatch';
const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const sha = file =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

const args = process.argv.slice(2);
const dataDir = args[args.indexOf('--data') + 1];
if (!args.includes('--data') || !dataDir) {
  console.error(
    'usage: crossmatch-data-validate.mjs --data <scratch-data dir>'
  );
  process.exit(2);
}
const XM = path.join(dataDir, 'crossmatch263');

const THR = readJson(`${DIR}/data-legs-thresholds.json`);
const ORACLE = readJson(`${DIR}/data-legs-oracle.json`);
const check = id => THR.checks.find(c => c.id === id);
const RADIUS = THR.constants.radiusArcsec;
const TOL = THR.constants.tolerance.value;

const rows = [];
const add = (id, status, measured, note = null) =>
  rows.push({
    id,
    group: check(id)?.group ?? null,
    status,
    measured,
    bound: check(id)?.limits ?? null,
    note,
  });
const bound = (id, ok, measured, note) =>
  add(id, ok ? 'pass' : 'fail', measured, note);

/** A SkyServer or archive csv (an optional '#Table1' line first) as an array of objects of strings. */
function readCsv(file) {
  const lines = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'));
  const head = lines[0].split(',');
  return lines.slice(1).map(l => {
    const v = l.split(',');
    return Object.fromEntries(head.map((h, i) => [h, v[i]]));
  });
}

// ---- the packs, decoded by the app's own reader ----------------------------
const gaiaSeries = readJson('gaia/ngc2420.json');
const g = X.catalogFromPack(tableOf({ PACK: GAIA, SERIES: gaiaSeries }), GAIA);
const s = X.catalogFromPack(tableOf({ PACK: SDSS, SERIES: SDSS_SERIES }), SDSS);
const tableG = tableOf({ PACK: GAIA, SERIES: gaiaSeries });
const tableS = tableOf({ PACK: SDSS, SERIES: SDSS_SERIES });
const stepsOf = (pack, series) =>
  Object.fromEntries(
    pack.columns.map((c, i) => [c.id, series.columns[i].step])
  );
const gStep = stepsOf(GAIA, gaiaSeries);
const sStep = stepsOf(SDSS, SDSS_SERIES);
const col = (table, id) => table.columns.find(c => c.id === id).values;

const G = readCsv(path.join(dataDir, 'gaia233/ngc2420.csv'));
const S = readCsv(path.join(XM, 'sdss/R1-ngc2420-mjd.csv'));
const BN = readCsv(path.join(XM, 'gaia/R2-bestneighbour.csv'));
const inputs = {
  gaiaCsvSha256: sha(path.join(dataDir, 'gaia233/ngc2420.csv')),
  R1Sha256: sha(path.join(XM, 'sdss/R1-ngc2420-mjd.csv')),
  R2BestNeighbourSha256: sha(path.join(XM, 'gaia/R2-bestneighbour.csv')),
};

// ---- D5a: row identity ------------------------------------------------------
{
  const worst = {};
  const countsEqual =
    G.length === g.ra.length &&
    S.length === s.ra.length &&
    G.length === 993 &&
    S.length === 2301;
  if (countsEqual) {
    const sMap = {
      ra: 'ra',
      dec: 'dec',
      g: 'psfMag_g',
      g_err: 'psfMagErr_g',
      r: 'psfMag_r',
      r_err: 'psfMagErr_r',
    };
    for (const [id, c] of Object.entries(sMap)) {
      const v = col(tableS, id);
      let w = 0;
      S.forEach((r, i) => {
        w = Math.max(w, Math.abs(v[i] - Number(r[c])) / (sStep[id] / 2));
      });
      worst[`sdss.${id}`] = w;
    }
    for (const id of ['ra', 'dec', 'pmra', 'pmdec']) {
      const v = col(tableG, id);
      let w = 0;
      G.forEach((r, i) => {
        w = Math.max(w, Math.abs(v[i] - Number(r[id])) / (gStep[id] / 2));
      });
      worst[`gaia.${id}`] = w;
    }
  }
  const maxFrac = Math.max(...Object.values(worst), 0);
  const L = check('D5a.rowIdentity').limits;
  bound(
    'D5a.rowIdentity',
    countsEqual === L.rowCountsEqual && maxFrac <= L.maxStepFraction,
    {
      rowCounts: { gaia: G.length, sdss: S.length },
      maxStepFraction: maxFrac,
      worst,
    },
    `oracle's maximum ${ORACLE.D5a.maxStepFraction}; the Gaia csv equals the pack's raw file: ${ORACLE.inputs.gaiaCsvEqualsPackRawFile}`
  );
}

// ---- the survey's epochs (D5b) ---------------------------------------------
const mjd = S.map(r => Number(r.mjd));
const epochOf = m => 2000.0 + (m - 51544.5) / 365.25;
const groups = [...new Set(mjd)].sort((a, b) => a - b);
add(
  'D5b.objectEpochs',
  'reported',
  {
    distinct: groups.map(m => ({
      mjd: m,
      epoch: Number(epochOf(m).toFixed(6)),
      rows: mjd.filter(x => x === m).length,
    })),
    spreadYears: Number(
      (epochOf(Math.max(...mjd)) - epochOf(Math.min(...mjd))).toFixed(6)
    ),
  },
  `the oracle reads the same ${ORACLE.D5b.distinct.length} epochs`
);

// ---- D5c: the grouped per-object-epoch run ---------------------------------
function grouped(radius) {
  /** per row of A: [b, distance] of the nearest candidate over the groups */
  const best = new Map();
  let refused = null;
  for (const m of groups) {
    const idx = [];
    mjd.forEach((x, i) => x === m && idx.push(i));
    const Bg = {
      id: `${SDSS.id}@${m}`,
      ra: idx.map(i => s.ra[i]),
      dec: idx.map(i => s.dec[i]),
      epoch: epochOf(m),
      positionStep: s.positionStep,
    };
    const r = X.crossmatch(g, Bg, {
      radiusArcsec: radius,
      toEpoch: epochOf(m),
    });
    if (r.status !== 'ok') {
      refused = r;
      continue;
    }
    for (const p of r.pairs) {
      const b = idx[p.b];
      const cur = best.get(p.a);
      if (
        !cur ||
        p.distanceArcsec < cur[1] ||
        (p.distanceArcsec === cur[1] && b < cur[0])
      )
        best.set(p.a, [b, p.distanceArcsec]);
    }
  }
  return { best, refused };
}
const key = (a, b) => `${a},${b}`;
const run1 = grouped(RADIUS);
const K = new Map([...run1.best].map(([a, [b, d]]) => [key(a, b), d]));
const oracleK = new Map(ORACLE.D5c.pairs.map(([a, b, d]) => [key(a, b), d]));
let differing = 0;
for (const k of K.keys()) if (!oracleK.has(k)) differing++;
for (const k of oracleK.keys()) if (!K.has(k)) differing++;
let maxDist = 0;
for (const [k, d] of K)
  if (oracleK.has(k)) maxDist = Math.max(maxDist, Math.abs(d - oracleK.get(k)));
bound(
  'D5c.perObjectEpochPairs',
  !run1.refused &&
    differing <= check('D5c.perObjectEpochPairs').limits.maxDifferences,
  {
    kernelPairs: K.size,
    oraclePairs: oracleK.size,
    differing,
    maxDistanceDifferenceArcsec: maxDist,
  },
  run1.refused
    ? `a group was refused: ${run1.refused.reason ?? run1.refused.code}`
    : null
);

// ---- D5d, D5e: against the published best-neighbour table -----------------
const src = G.map(r => r.source_id);
const obj = S.map(r => r.objID);
const objRow = new Map(obj.map((o, i) => [o, i]));
const srcRow = new Map(src.map((o, i) => [o, i]));
const pub = new Map(
  BN.map(r => [
    srcRow.get(r.source_id),
    {
      o: r.original_ext_source_id,
      d: Number(r.angular_distance),
      flag: r.xm_flag,
      n: r.number_of_neighbours,
    },
  ])
);
const pubIn = new Set();
const pubIn1 = new Set();
for (const [a, p] of pub)
  if (objRow.has(p.o)) {
    pubIn.add(key(a, objRow.get(p.o)));
    if (p.d <= 1.0) pubIn1.add(key(a, objRow.get(p.o)));
  }
const compare = kset => {
  let kernelOnly = 0;
  let common = 0;
  let publishedOnly = 0;
  for (const k of kset) pubIn.has(k) ? common++ : kernelOnly++;
  for (const k of pubIn1) if (!kset.has(k)) publishedOnly++;
  return {
    nK: kset.size,
    publishedAll: pub.size,
    publishedInPack: pubIn.size,
    publishedInPackWithin1Arcsec: pubIn1.size,
    common,
    kernelOnly,
    publishedOnly1: publishedOnly,
    kernelOnlyFraction: kernelOnly / kset.size,
    publishedOnlyFraction: publishedOnly / kset.size,
  };
};
const kset = new Set(K.keys());
const cmp = compare(kset);
const L5 = check('D5d.publishedBestNeighbour').limits;
bound(
  'D5d.publishedBestNeighbour',
  cmp.kernelOnlyFraction <= L5.maxKernelOnlyFraction &&
    cmp.publishedOnlyFraction <= L5.maxPublishedOnlyFraction,
  { ...cmp, tolerance: TOL },
  `the oracle's own comparison: kernelOnly ${ORACLE.D5d.kernelOnly}, publishedOnly ${ORACLE.D5d.publishedOnly1}`
);

// D5e breakdown (kernel side; nearest over 10 arcsec from a second grouped run)
{
  const wide = grouped(10).best;
  const split = {
    differentPackObject: 0,
    objectOutsidePack: 0,
    noPublishedRow: 0,
  };
  const kernelOnlyIds = [];
  for (const k of kset)
    if (!pubIn.has(k)) {
      const [a, b] = k.split(',').map(Number);
      const p = pub.get(a);
      if (!p) split.noPublishedRow++;
      else if (objRow.has(p.o)) split.differentPackObject++;
      else split.objectOutsidePack++;
      kernelOnlyIds.push([src[a], obj[b]]);
    }
  const publishedOnly = [];
  for (const k of pubIn1)
    if (!kset.has(k)) {
      const [a, b] = k.split(',').map(Number);
      const w = wide.get(a);
      publishedOnly.push({
        source_id: src[a],
        objID: obj[b],
        publishedArcsec: pub.get(a).d,
        kernelNearestWithin10: w ? [obj[w[0]], Number(w[1].toFixed(6))] : null,
      });
    }
  const pd = [...pub.values()]
    .filter(p => objRow.has(p.o))
    .map(p => p.d)
    .sort((a, b) => a - b);
  const quant = (arr, q) =>
    arr[Math.min(arr.length - 1, Math.floor(q * arr.length))];
  const diffs = [];
  for (const k of kset)
    if (pubIn.has(k)) {
      const a = Number(k.split(',')[0]);
      diffs.push(Math.abs(K.get(k) - pub.get(a).d));
    }
  diffs.sort((a, b) => a - b);
  const count = f => {
    const o = {};
    for (const p of pub.values())
      if (objRow.has(p.o)) o[f(p)] = (o[f(p)] ?? 0) + 1;
    return o;
  };
  add(
    'D5e.publishedBreakdown',
    'reported',
    {
      kernelOnlySplit: split,
      kernelOnlyIds,
      publishedOnly,
      publishedDistanceInPack: {
        n: pd.length,
        median: quant(pd, 0.5),
        p95: quant(pd, 0.95),
        max: pd[pd.length - 1],
        over1: pd.filter(v => v > 1).length,
      },
      commonDistanceAbsDifference: {
        n: diffs.length,
        max: diffs[diffs.length - 1],
        median: quant(diffs, 0.5),
      },
      xmFlag: count(p => p.flag),
      numberOfNeighbours: count(p => p.n),
    },
    `oracle: kernelOnlySplit ${JSON.stringify(ORACLE.D5e.kernelOnlySplit)}, common distance difference max ${ORACLE.D5e.commonDistanceAbsDifference.max}`
  );
}

// ---- D4b: the declared-epoch set against the per-object set ----------------
{
  const dec = X.crossmatch(g, s, { radiusArcsec: RADIUS, toEpoch: 2000 });
  const dset = new Set(dec.pairs.map(p => key(p.a, p.b)));
  let declaredOnly = 0;
  let perObjectOnly = 0;
  for (const k of dset) if (!kset.has(k)) declaredOnly++;
  for (const k of kset) if (!dset.has(k)) perObjectOnly++;
  add(
    'D4b.surveySpread',
    'reported',
    {
      declaredPairs: dset.size,
      perObjectPairs: kset.size,
      differ: declaredOnly + perObjectOnly,
      declaredOnly,
      perObjectOnly,
      publishedComparisonOfDeclared: compare(dset),
    },
    `oracle: differ ${ORACLE.D4b.differ}`
  );
}

add(
  'D5f.shiftedMatchCitation',
  'reported',
  {
    R3: 'Wilson and Naylor 2018, arXiv:1809.00018, section 4.2.3',
    R6: 'Landy and Szalay 1993, ApJ 412, 64-71, DOI 10.1086/172900',
  },
  'citations recorded in SOURCES.json and the documents'
);

rows.sort((p, q) => p.id.localeCompare(q.id, 'en', { numeric: true }));
const failed = rows.filter(r => r.status === 'fail').map(r => r.id);
const out = {
  format: 'gravitas.crossmatch-data-legs-results/1',
  thresholdsSha256: sha(path.join(ROOT, DIR, 'data-legs-thresholds.json')),
  oracleSha256: sha(path.join(ROOT, DIR, 'data-legs-oracle.json')),
  node: process.version,
  inputs,
  failed,
  counts: Object.fromEntries(
    ['pass', 'fail', 'reported', 'not run'].map(st => [
      st,
      rows.filter(r => r.status === st).length,
    ])
  ),
  rows,
};
if (args.includes('--json')) console.log(JSON.stringify(out, null, 1));
else {
  for (const r of rows)
    console.log(
      `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(28)} ${JSON.stringify(r.measured)?.slice(0, 220)}${r.note ? '  # ' + r.note : ''}`
    );
  console.log(
    `\n${JSON.stringify(out.counts)}  failed: ${failed.join(', ') || 'none'}`
  );
}
if (args.includes('--write-results'))
  writeFileSync(
    path.join(ROOT, DIR, 'data-legs-results.json'),
    JSON.stringify(out, null, 1) + '\n'
  );
process.exitCode = failed.length ? 1 : 0;
