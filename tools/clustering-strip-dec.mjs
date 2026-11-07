#!/usr/bin/env node
// =============================================================================
// SPIKE, never merged: the clustering gate's data legs (Prompt 263 follow-up)
// -----------------------------------------------------------------------------
//   node tools/clustering-strip-dec.mjs <data-legs-thresholds.json> <data-legs-oracle.json> \
//        <R4-slice-query.csv> <out.json>
// The thresholds (B8c, B10, B9) were committed before any of this ran; the oracle
// (python -E, scipy cKDTree) was pinned before this file existed. R4 is the
// pack's own SkyServer query, read as DATA (its sha256 is in SOURCES.json).
// Node, not Jest.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as C from '../js/kernels/crossmatch/clustering.js';
import { chi2Quantile } from '../js/kernels/statistics/special.js';
import { stream } from '../js/random/streams.js';
import { tableOf } from '../js/tableObservation.js';
import { PACK as SLICE } from '../js/data/observations/sdssDr18RedshiftSlice.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [thrPath, oraclePath, r4Path, outPath] = process.argv.slice(2);
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const THR = JSON.parse(readFileSync(thrPath, 'utf8'));
const ORACLE = JSON.parse(readFileSync(oraclePath, 'utf8'));
const check = id => THR.checks.find(c => c.id === id);
const EDGES = THR.constants.stripDeclinationBins.edgesDeg;
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

const lines = readFileSync(r4Path, 'utf8')
  .split(/\r?\n/)
  .filter(l => l && !l.startsWith('#'));
const head = lines[0].split(',');
const R4 = lines.slice(1).map(l => {
  const v = l.split(',');
  return Object.fromEntries(head.map((h, i) => [h, Number(v[i])]));
});
const strip = R4.filter(
  r => r.ra >= 120 && r.ra <= 240 && r.dec >= 0 && r.dec <= 0.5 && r.z <= 0.12
);
const n = strip.length;

// ---- B8c.sampleIdentity (AM1: sorted in units of the pack's step) -----------
const slice = JSON.parse(
  readFileSync(path.join(ROOT, 'cosmology/sdss-dr18-redshift-slice.json'), 'utf8')
);
const table = tableOf({ PACK: SLICE, SERIES: slice });
const pra = table.columns.find(c => c.id === 'ra').values;
const pz = table.columns.find(c => c.id === 'z').values;
const stepRa = slice.columns[0].step;
const stepZ = slice.columns[1].step;
{
  const mine = strip
    .map(r => ({ k: Math.round(r.ra / stepRa), ra: r.ra, z: r.z }))
    .sort((p, q) => p.k - q.k || p.z - q.z);
  const theirs = Array.from(pra, (ra, i) => ({
    k: Math.round(ra / stepRa),
    ra,
    z: pz[i],
  })).sort((p, q) => p.k - q.k || p.z - q.z);
  let frac = Infinity;
  if (mine.length === theirs.length) {
    frac = 0;
    mine.forEach((m, i) => {
      frac = Math.max(
        frac,
        Math.abs(m.ra - theirs[i].ra) / (stepRa / 2),
        Math.abs(m.z - theirs[i].z) / (stepZ / 2)
      );
    });
  }
  const L = check('B8c.sampleIdentity').limits;
  bound(
    'B8c.sampleIdentity',
    n === L.count && theirs.length === L.count && frac <= L.maxStepFraction,
    { selected: n, pack: theirs.length, maxStepFraction: frac },
    `the oracle's value ${ORACLE.B8c.maxStepFraction}`
  );
}

// ---- B8c.stripWithDeclination ------------------------------------------------
const blockOf = ra => Math.max(0, Math.min(11, Math.floor((ra - 120) / 10)));
const raD = strip.map(r => r.ra);
const decD = strip.map(r => r.dec);
const sd1 = Math.sin((0.5 * Math.PI) / 180);
function randoms(label, lo, hi) {
  const u = stream('injection', 'p263', 'B:randoms', label);
  const ra = new Array(10 * n);
  const dec = new Array(10 * n);
  for (let i = 0; i < 10 * n; i++) {
    ra[i] = lo + (hi - lo) * u();
    dec[i] = (Math.asin(sd1 * u()) * 180) / Math.PI;
  }
  return { ra, dec };
}
function run(R) {
  const Dv = C.vectors(raD, decD);
  const Rv = C.vectors(R.ra, R.dec);
  const res = C.landySzalayJackknife(Dv, Rv, EDGES, {
    blockD: Int32Array.from(raD, blockOf),
    blockR: Int32Array.from(R.ra, blockOf),
    blocks: 12,
  });
  const sigP = C.poissonSigma(res.w, res.DD);
  const T = C.statisticT(res.w, res.sigma, res.DD);
  return {
    res,
    out: {
      nD: n,
      nR: R.ra.length,
      DD: Array.from(res.DD),
      DR: Array.from(res.DR),
      RR: Array.from(res.RR),
      w: Array.from(res.w, v => Number(v.toFixed(6))),
      sigmaPoisson: Array.from(sigP, v => Number(v.toFixed(6))),
      sigmaJackknife: Array.from(res.sigma, v => Number(v.toFixed(6))),
      T: Number(T.T.toFixed(4)),
      df: T.df,
      quantile99: Number(chi2Quantile(0.99, T.df || 1).toFixed(4)),
      detected: T.df > 0 && T.T > chi2Quantile(0.99, T.df),
    },
  };
}
const lo = Math.min(...raD);
const hi = Math.max(...raD);
const F1 = run(randoms('strip-dec', 120, 240));
const F2 = run(randoms('strip-dec-extent', lo, hi));
add(
  'B8c.stripWithDeclination',
  'reported',
  {
    n,
    edgesDeg: EDGES,
    extentRaDeg: [Number(lo.toFixed(4)), Number(hi.toFixed(4))],
    F1: F1.out,
    F2: F2.out,
  },
  `${n} galaxies with their own declination; the box is the footprint; no mask`
);

// ---- B10 ----------------------------------------------------------------------
{
  const L = check('B10.stripOracle').limits;
  const per = {};
  let ok = true;
  for (const [name, F] of [
    ['F1', F1],
    ['F2', F2],
  ]) {
    const o = ORACLE.B10[name];
    const ddDiff = F.out.DD.reduce(
      (m, v, k) => Math.max(m, Math.abs(v - o.DD[k])),
      0
    );
    const sig = F.out.w.map((w, k) => {
      const sp = F.out.sigmaPoisson[k];
      const so = o.sigmaPoisson[k];
      return Math.abs(w - o.w[k]) / Math.sqrt(sp * sp + so * so);
    });
    per[name] = { maxDDDifference: ddDiff, sigmaDifference: sig };
    ok &&=
      ddDiff <= L.maxDDDifference && Math.max(...sig) <= L.maxCombinedSigma;
  }
  bound('B10.stripOracle', ok, per);
}

add(
  'B9.authenticReference',
  'not run',
  null,
  'no published angular correlation of the spectroscopic main sample at r < 17.77 and no footprint of the strip was found (SOURCES.json notFetched)'
);

rows.sort((p, q) => p.id.localeCompare(q.id, 'en', { numeric: true }));
const failed = rows.filter(r => r.status === 'fail').map(r => r.id);
const out = {
  format: 'gravitas.crossmatch-data-legs-clustering-results/1',
  thresholdsSha256: sha(thrPath),
  oracleSha256: sha(oraclePath),
  node: process.version,
  inputs: { R4Sha256: sha(r4Path) },
  failed,
  counts: Object.fromEntries(
    ['pass', 'fail', 'reported', 'not run'].map(st => [
      st,
      rows.filter(r => r.status === st).length,
    ])
  ),
  rows,
};
for (const r of rows)
  console.log(
    `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(28)} ${JSON.stringify(r.measured)?.slice(0, 260)}${r.note ? '  # ' + r.note : ''}`
  );
console.log(`\n${JSON.stringify(out.counts)} failed: ${failed.join(', ') || 'none'}`);
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
process.exitCode = failed.length ? 1 : 0;
