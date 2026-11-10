// SPIKE (Roadmap III, Prompt 262 follow-up, C2c and the cross-feed): the follow-up stream. Never merged.
//   node tools/censoring-c2c-validate.mjs <followup-thresholds.json> <followup-oracle-results.json>
//        <partA oracle-results.json> <partA results.json> <scratch-dir> <out.json> <failed-legs.json>
// The prototype (js/kernels/statistics/truncation.js, unchanged since 4735488a) on the Gravitas-stream
// ensembles it regenerates in process and on the oracle's numpy sample files, against the pinned
// output of the follow-up's oracle. The bound of each leg is the committed one.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { lyndenBell } from '../js/kernels/statistics/truncation.js';
import { normalCdf } from '../js/kernels/statistics/special.js';
import { truncatedRows, designs, replicateBytes } from './censoring-c2c-stream.mjs';

const [thrPath, oraclePath, partAOraclePath, partAResultsPath, scratch, outPath, failedPath] =
  process.argv.slice(2);
const thrBytes = readFileSync(thrPath);
const thr = JSON.parse(thrBytes);
const oracleBytes = readFileSync(oraclePath);
const oracle = JSON.parse(oracleBytes);
const partAOracle = JSON.parse(readFileSync(partAOraclePath));
const partAResults = JSON.parse(readFileSync(partAResultsPath));
const sha = b => createHash('sha256').update(b).digest('hex');
const t0 = process.hrtime.bigint();
const BLOB_AT_4735488A = '0414726d99491b3e4106e210d515cbea6d4308b1';
const TOL = 1e-10;
const EDGE = 1e-9;

const phi = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
const truthCM = from => phi(from) / (1 - normalCdf(from));
const inRange = (v, lo, hi) => v >= lo && v <= hi;
const near = (a, b) => Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));
const relDiff = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b));

function gitBlobId(path) {
  const body = readFileSync(path);
  return createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${body.length}\0`), body]))
    .digest('hex');
}

function bitmapHex(flags) {
  const out = Buffer.alloc(Math.ceil(flags.length / 8));
  for (let i = 0; i < flags.length; i++) if (flags[i]) out[i >> 3] |= 0x80 >> (i & 7);
  return out.toString('hex');
}

/** One sample through the prototype: the eight fields of the per-sample table. */
function judge(rows, from, truth) {
  const res = lyndenBell(rows, { from });
  if (res.status === 'refused') return [1, 0, 0, 0, 0, 0, 0, 0];
  const [lo, hi] = res.interval;
  return [
    0,
    res.riskAtFrom,
    res.support.length,
    res.mean,
    res.variance,
    lo,
    hi,
    lo <= truth && truth <= hi ? 1 : 0,
  ];
}

function readTable(name, pinnedSha, reps) {
  const bytes = readFileSync(join(scratch, name));
  const got = sha(bytes);
  const t = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.length / 8);
  if (t.length !== reps * 8) throw new Error(`${name}: ${t.length} numbers`);
  return { table: t, shaOk: got === pinnedSha, sha: got };
}

function summarise(table, d) {
  let hits = 0;
  let refused = 0;
  const risks = [];
  const covered = [];
  const refusedFlags = [];
  for (let r = 0; r < d.replicates; r++) {
    const row = table[r];
    refusedFlags.push(row[0] === 1);
    covered.push(row[7] === 1);
    if (row[0] === 1) refused++;
    else risks.push(row[1]);
    if (row[7] === 1) hits++;
  }
  risks.sort((a, b) => a - b);
  return {
    N: d.N,
    from: d.from,
    replicates: d.replicates,
    baseSeed: d.baseSeed,
    hits,
    coverage: hits / d.replicates,
    refused,
    medianRiskAtFrom: risks.length ? risks[Math.floor(risks.length / 2)] : null,
    coveredHex: bitmapHex(covered),
    refusedHex: bitmapHex(refusedFlags),
  };
}

/** The committed agreement of two implementations on every sample of an ensemble. */
function compare(mine, theirs, reps, truth) {
  const out = {
    samples: reps,
    refusalDiffers: 0,
    riskDiffers: 0,
    supportDiffers: 0,
    meanBeyond: 0,
    varianceBeyond: 0,
    flagDiffers: 0,
    flagExempt: 0,
    maxMeanRel: 0,
    maxVarianceRel: 0,
    bitIdenticalMeanAndVariance: 0,
  };
  for (let r = 0; r < reps; r++) {
    const a = mine[r];
    const b = theirs.subarray(8 * r, 8 * r + 8);
    if (a[0] !== b[0]) {
      out.refusalDiffers++;
      continue;
    }
    if (a[0] === 1) continue;
    if (a[1] !== b[1]) out.riskDiffers++;
    if (a[2] !== b[2]) out.supportDiffers++;
    if (!near(a[3], b[3])) out.meanBeyond++;
    if (!near(a[4], b[4])) out.varianceBeyond++;
    out.maxMeanRel = Math.max(out.maxMeanRel, relDiff(a[3], b[3]));
    out.maxVarianceRel = Math.max(out.maxVarianceRel, relDiff(a[4], b[4]));
    if (a[3] === b[3] && a[4] === b[4]) out.bitIdenticalMeanAndVariance++;
    const edge = [a[5], a[6], b[5], b[6]].some(e => Math.abs(e - truth) < EDGE);
    if (edge) out.flagExempt++;
    else if (a[7] !== b[7]) out.flagDiffers++;
  }
  out.agrees =
    out.refusalDiffers +
      out.riskDiffers +
      out.supportDiffers +
      out.meanBeyond +
      out.varianceBeyond +
      out.flagDiffers ===
    0;
  return out;
}

// ----------------------------------------------------------------------------
// the prototype on both generators' ensembles
// ----------------------------------------------------------------------------
const proto = { stream: {}, numpy: {} };
const xf1 = {};
const xf2 = {};
const integrity = { streamSampleSha: {}, numpySampleSha: {}, tableSha: {} };
for (const d of designs(thr)) {
  const truth = truthCM(d.from);
  // the Gravitas-stream ensemble, regenerated here
  {
    const h = createHash('sha256');
    const mine = [];
    for (let r = 0; r < d.replicates; r++) {
      const rows = truncatedRows(d.baseSeed + r, d.streamLabel, d.N);
      h.update(replicateBytes(rows));
      mine.push(judge(rows, d.from, truth));
    }
    const fed = oracle.fed[d.key];
    const digest = h.digest('hex');
    integrity.streamSampleSha[d.key] = digest === fed.sampleSha256;
    const t = readTable(fed.tableFile, fed.tableSha256, d.replicates);
    integrity.tableSha[fed.tableFile] = t.shaOk;
    proto.stream[d.key] = { ...summarise(mine, d), truth, sampleSha256: digest };
    xf2[d.key] = {
      ...compare(mine, t.table, d.replicates, truth),
      prototypeHits: proto.stream[d.key].hits,
      oracleHits: fed.hits,
    };
  }
  // the oracle's numpy ensemble, read from its file
  {
    const own = oracle.own[d.key];
    const bytes = readFileSync(join(scratch, own.sampleFile));
    const digest = sha(bytes);
    integrity.numpySampleSha[d.key] = digest === own.sampleSha256;
    const data = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.length / 8);
    if (data.length !== d.replicates * 2 * d.N) throw new Error(`${own.sampleFile}: size`);
    const mine = [];
    for (let r = 0; r < d.replicates; r++) {
      const base = r * 2 * d.N;
      const rows = new Array(d.N);
      for (let i = 0; i < d.N; i++) rows[i] = { x: data[base + i], u: data[base + d.N + i] };
      mine.push(judge(rows, d.from, truth));
    }
    const t = readTable(own.tableFile, own.tableSha256, d.replicates);
    integrity.tableSha[own.tableFile] = t.shaOk;
    proto.numpy[d.key] = { ...summarise(mine, d), truth, sampleSha256: digest };
    xf1[d.key] = {
      ...compare(mine, t.table, d.replicates, truth),
      prototypeHits: proto.numpy[d.key].hits,
      oracleHits: own.hits,
    };
  }
}

// ----------------------------------------------------------------------------
// the legs
// ----------------------------------------------------------------------------
const checks = Object.fromEntries(thr.checks.map(c => [c.id, c]));
const rows = [];
function leg(id, status, measured) {
  const c = checks[id];
  rows.push({ id, group: c.group, estimator: c.estimator, tier: c.tier, status, bound: c.bound, measured });
}
const all = o => Object.values(o).every(v => v === true);

{
  const blob = gitBlobId(new URL('../js/kernels/statistics/truncation.js', import.meta.url));
  const m = {
    thresholdsSha256: sha(thrBytes),
    oracleRecordedThresholds: oracle.thresholdsSha256,
    oracleSha256: sha(oracleBytes),
    streamSamplesEqualTheFilesTheOracleRead: integrity.streamSampleSha,
    numpySamplesReadEqualTheFilesTheOracleWrote: integrity.numpySampleSha,
    tablesEqualThePinnedSha256: integrity.tableSha,
    prototypeBlob: blob,
    prototypeBlobAt4735488a: BLOB_AT_4735488A,
    oracleFunctionsVerbatim: oracle.functionsVerbatimFromPartA === true && oracle.fedFunctionsVerbatimFromPartA === true,
    partAOracleSha256: oracle.partAOracleSha256,
  };
  const ok =
    m.thresholdsSha256 === m.oracleRecordedThresholds &&
    all(integrity.streamSampleSha) &&
    all(integrity.numpySampleSha) &&
    all(integrity.tableSha) &&
    blob === BLOB_AT_4735488A &&
    m.oracleFunctionsVerbatim;
  leg('F1.inputs', ok ? 'pass' : 'fail', m);
}
{
  const m = {};
  let ok = true;
  for (const name of ['T1', 'T2']) {
    const now = oracle.own[`orig-${name}`];
    const then = partAOracle.coverage[name];
    m[name] = {
      hits: now.hits,
      refused: now.refused,
      medianRiskAtFrom: now.medianRiskAtFrom,
      pinnedCoverage: then.coverage,
      pinnedRefused: then.refused,
      pinnedMedianRiskAtFrom: then.medianRiskAtFrom,
    };
    ok =
      ok &&
      now.hits / now.replicates === then.coverage &&
      now.replicates === then.replicates &&
      now.refused === then.refused &&
      now.medianRiskAtFrom === then.medianRiskAtFrom;
  }
  leg('F2.oracleReproduces', ok ? 'pass' : 'fail', m);
}
{
  const m = {};
  let ok = true;
  const pinned = { T1: 'C2a.cmCoverageT1', T2: 'C2b.cmCoverageT2' };
  for (const name of ['T1', 'T2']) {
    const now = proto.stream[`orig-${name}`];
    const then = partAResults.rows.find(r => r.id === pinned[name]).measured;
    m[name] = {
      hits: now.hits,
      refused: now.refused,
      medianRiskAtFrom: now.medianRiskAtFrom,
      pinnedCoverage: then.coverage,
      pinnedRefused: then.refused,
      pinnedMedianRiskAtFrom: then.medianRiskAtFrom,
    };
    ok =
      ok &&
      now.coverage === then.coverage &&
      now.replicates === then.replicates &&
      now.refused === then.refused &&
      now.medianRiskAtFrom === then.medianRiskAtFrom;
  }
  leg('F3.prototypeReproduces', ok ? 'pass' : 'fail', m);
}
for (const [id, xf] of [
  ['XF1.numpySamplesToPrototype', xf1],
  ['XF2.streamSamplesToOracle', xf2],
]) {
  const ok = Object.values(xf).every(e => e.agrees && e.prototypeHits === e.oracleHits);
  leg(id, ok ? 'pass' : 'fail', xf);
}
{
  const m = {
    T1: proto.stream['c2c-T1'].coverage,
    T2: proto.stream['c2c-T2'].coverage,
    T1hits: proto.stream['c2c-T1'].hits,
    T2hits: proto.stream['c2c-T2'].hits,
    T1refused: proto.stream['c2c-T1'].refused,
    T2refused: proto.stream['c2c-T2'].refused,
    replicates: 5000,
  };
  leg('C2c.cmCoveragePrototype', inRange(m.T1, 0.92, 0.98) && inRange(m.T2, 0.92, 0.98) ? 'pass' : 'fail', m);
}
{
  const o = oracle.own;
  const m = {
    T1: o['c2c-T1'].coverage,
    T2: o['c2c-T2'].coverage,
    T1hits: o['c2c-T1'].hits,
    T2hits: o['c2c-T2'].hits,
    T1refused: o['c2c-T1'].refused,
    T2refused: o['c2c-T2'].refused,
    replicates: 5000,
  };
  leg('C2c.cmCoverageOracle', inRange(m.T1, 0.92, 0.98) && inRange(m.T2, 0.92, 0.98) ? 'pass' : 'fail', m);
}
{
  const m = {};
  for (const group of ['c2c', 'orig'])
    for (const name of ['T1', 'T2']) {
      const a = proto.stream[`${group}-${name}`];
      const b = oracle.own[`${group}-${name}`];
      const n = a.replicates;
      const p = (a.hits + b.hits) / (2 * n);
      const diff = a.coverage - b.coverage;
      m[`${group}-${name}`] = {
        streamEnsemble: a.coverage,
        numpyEnsemble: b.coverage,
        difference: diff,
        z: diff / Math.sqrt((2 * p * (1 - p)) / n),
        replicates: n,
      };
    }
  leg('G1.ensembleDifference', 'reported', m);
}
{
  const m = {};
  const z = 1.959963984540054;
  for (const name of ['T1', 'T2']) {
    let hits = 0;
    let n = 0;
    for (const group of ['orig', 'c2c']) {
      for (const e of [proto.stream[`${group}-${name}`], proto.numpy[`${group}-${name}`]]) {
        hits += e.hits;
        n += e.replicates;
      }
    }
    const p = hits / n;
    const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
    const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
    m[name] = {
      hits,
      replicates: n,
      coverage: p,
      wilson95: [centre - half, centre + half],
      medianRiskAtFrom: proto.stream[`c2c-${name}`].medianRiskAtFrom,
      medianRiskAtFromNumpy: proto.numpy[`c2c-${name}`].medianRiskAtFrom,
    };
  }
  leg('G2.pooledCoverage', 'reported', m);
}

// ----------------------------------------------------------------------------
// the outcome, by the committed function
// ----------------------------------------------------------------------------
const JUDGED = new Set(['integrity', 'oracle', 'analytic', 'reference', 'accuracy', 'coverage', 'misspecified', 'refusals']);
const followUpPass = rows.filter(r => r.group !== 'reported').every(r => r.status === 'pass');
const partAKm = partAResults.verdict.km === true;
const partACmOther = partAResults.rows
  .filter(r => (r.estimator === 'cm' || r.estimator === 'all') && JUDGED.has(r.group))
  .filter(r => r.id !== 'C2o.cmCoverageOracle')
  .every(r => r.status === 'pass');
const partAC2o = partAResults.rows.find(r => r.id === 'C2o.cmCoverageOracle').status;
const letter = followUpPass && partAKm && partACmOther ? 'A through C2c' : 'B-KM stands';
const counts = {};
for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
const out = {
  format: 'gravitas.censoring-truncation-gate-followup-results/1',
  environment: {
    node: process.version,
    thresholdsSha256: sha(thrBytes),
    oracleSha256: sha(oracleBytes),
    prototypeBlob: gitBlobId(new URL('../js/kernels/statistics/truncation.js', import.meta.url)),
  },
  rows,
  prototype: proto,
  counts,
  carried: thr.carried,
  verdict: {
    followUpPass,
    partA: { letter: partAResults.verdict.letter, slice: partAResults.verdict.slice, km: partAKm, cmLegsOtherThanC2oPass: partACmOther, C2o: partAC2o },
    letter,
  },
  cpuSeconds: Number(process.hrtime.bigint() - t0) / 1e9,
};
writeFileSync(outPath, JSON.stringify(out, null, 1));
writeFileSync(
  failedPath,
  JSON.stringify(
    {
      format: 'gravitas.censoring-truncation-followup-failed-legs/1',
      note: 'Every failing row of followup-results.json and nothing else; left failing. C2o.cmCoverageOracle of Part A stays in failed-legs.json, failing.',
      legs: rows.filter(r => r.status === 'fail'),
    },
    null,
    1
  )
);
console.log(JSON.stringify({ counts, verdict: out.verdict, cpuSeconds: out.cpuSeconds }));
for (const r of rows) console.log(r.status.padEnd(9), r.id);
