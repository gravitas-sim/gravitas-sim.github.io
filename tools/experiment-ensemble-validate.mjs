// The validator of Prompt 265 (EXPERIMENT_ENSEMBLES.md): every leg of
// tests/fixtures/experiments-ensemble/thresholds.json, measured against its bound as
// committed (and amendments.json), and written to results.json with the failing legs
// in failed-legs.json. Nothing here moves a bound; a crossed one is a failed leg.
//
//   node tools/experiment-ensemble-validate.mjs [--write]
//
// Legs that need a fresh realm (the engine ones) run in child processes; the
// others in this process. The oracle's output is tests/fixtures/experiments-ensemble/
// oracle-results.json (python -E, tools/experiment-ensemble-oracle/oracle.py).

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(REPO, 'tests/fixtures/experiments-ensemble');
const imp = p => import(pathToFileURL(path.join(REPO, p)));
const readJson = f => JSON.parse(readFileSync(path.join(FIX, f), 'utf8'));

const thresholds = readJson('thresholds.json');
const oracle = readJson('oracle-results.json');
const sha = f =>
  createHash('sha256')
    .update(readFileSync(path.join(FIX, f)))
    .digest('hex');

const rec = await imp('js/experiments/ensemble/record.js');
const run = await imp('js/experiments/ensemble/run.js');
const sum = await imp('js/experiments/ensemble/summary.js');
const kinds = await imp('js/experiments/ensemble/kinds.js');
const trialMod = await imp('js/experiments/ensemble/trial.js');
const { stream } = await imp('js/random/streams.js');
const { validateArtifact } = await imp('js/platform/artifact.js');
const manifestMod = await imp('js/experiments/experimentManifest.js');
const { runTrial } = await imp('js/experiments/trialRunner.js');

const results = [];
const add = (id, status, measured, limit, note) =>
  results.push({
    id,
    status,
    measured,
    ...(limit !== undefined ? { limit } : {}),
    ...(note ? { note } : {}),
  });
const bound = id => thresholds.checks.find(c => c.id === id).limits;
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);

const tmp = mkdtempSync(path.join(realpathSync(tmpdir()), 'p265-'));
let serialNo = 0;
const child = (mode, manifest) => {
  const f = path.join(tmp, `${mode}-${++serialNo}.json`);
  writeFileSync(f, JSON.stringify(manifest));
  return JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(REPO, 'tools/experiment-ensemble-child.mjs'), mode, f],
      {
        cwd: REPO,
        encoding: 'utf8',
        maxBuffer: 1 << 28,
      }
    )
  );
};
const quantityDiffs = (a, b) => {
  let n = 0;
  a.ensemble.result.trials.forEach((t, i) => {
    const u = t.artifact?.quantities ?? [];
    const v = b.ensemble.result.trials[i]?.artifact?.quantities ?? [];
    if (u.length !== v.length) n++;
    u.forEach((q, j) => {
      if (!Object.is(q.value, v[j]?.value)) n++;
    });
  });
  return n;
};
const envelopeProblems = r =>
  r.ensemble.result.trials.reduce(
    (n, t) => n + (t.artifact ? validateArtifact(t.artifact).length : 0),
    0
  ) + validateArtifact(sum.summaryArtifact(r)).length;

// --- A1: forks against the independent oracle -----------------------------------------
{
  let bad = 0;
  let total = 0;
  for (const f of oracle.forks) {
    f.draws.forEach((row, i) => {
      const d = stream('experiments', f.seed, 'trial', i);
      row.forEach(v => {
        total++;
        if (d() !== v) bad++;
      });
    });
  }
  add(
    'A1.streamForkOracle',
    bad <= bound('A1.streamForkOracle').maxMismatches ? 'pass' : 'fail',
    { mismatches: bad, compared: total },
    bound('A1.streamForkOracle')
  );
}

// --- A2, A3, A4: the analytic ensemble, serially, on the pool, cancelled ---------------
const analytic = rec.ensembleManifest({
  kind: 'ensemble',
  title: 'A2',
  seed: 'p265-a2',
  trials: 200,
  config: { world: 'analytic-draw' },
});
const serial = await run.runSerial(analytic);
{
  const again = await run.replay(serial, run.runSerial);
  const diffs = quantityDiffs(serial, again.record) + (again.identical ? 0 : 1);
  add(
    'A2.serialReplay',
    diffs === 0 ? 'pass' : 'fail',
    { differences: diffs, digest: serial.ensemble.result.digest },
    bound('A2.serialReplay')
  );
}

/** Fake realms: each answers after a delay that depends on its trial, so completion order is shuffled. */
function fakeSpawn(manifest, log = []) {
  return () => {
    const o = {
      onmessage: null,
      onerror: null,
      onmessageerror: null,
      terminated: false,
    };
    o.postMessage = msg => {
      log.push(msg.job.index);
      const delay = (msg.job.index * 7919) % 11;
      setTimeout(async () => {
        if (o.terminated) return;
        const row = await trialMod.runJob(msg.manifest, msg.job);
        if (!o.terminated)
          o.onmessage?.({ data: { type: 'result', result: row } });
      }, delay);
    };
    o.terminate = () => {
      o.terminated = true;
    };
    return o;
  };
}
{
  const per = {};
  let diffs = 0;
  for (const c of [1, 3, 8]) {
    const r = await run
      .startEnsemble(analytic, { spawn: fakeSpawn(analytic), concurrency: c })
      .run();
    per[c] = r.ensemble.result.digest === serial.ensemble.result.digest;
    if (!per[c]) diffs++;
  }
  add(
    'A3.poolOrderIndependence',
    diffs === 0 ? 'pass' : 'fail',
    { digestEqualByConcurrency: per },
    bound('A3.poolOrderIndependence')
  );
}
{
  let handle;
  let finished = 0;
  handle = run.startEnsemble(analytic, {
    spawn: fakeSpawn(analytic),
    concurrency: 3,
    onTrial: r => {
      if (r.status === 'ok' && ++finished === 60)
        handle.cancel('stopped by the validator');
    },
  });
  const partial = await handle.run();
  const rows = partial.ensemble.result.trials;
  const kept = run.keptRows(partial);
  let diffs = 0;
  for (const r of kept)
    if (
      JSON.stringify(r.artifact) !==
      JSON.stringify(serial.ensemble.result.trials[r.index].artifact)
    )
      diffs++;
  const dropped = rows.filter(r => !r).length;
  const cancelled = rows.filter(r => r?.status === 'canceled').length;
  const sent = [];
  const resumed = await run
    .startEnsemble(analytic, {
      spawn: fakeSpawn(analytic, sent),
      concurrency: 3,
      completed: kept,
    })
    .run();
  const reran = sent.filter(i => kept.some(r => r.index === i)).length;
  const ok =
    diffs === 0 &&
    dropped === 0 &&
    rows.length === 200 &&
    rows.length === kept.length + cancelled &&
    partial.ensemble.result.summary.complete === false &&
    reran === 0 &&
    resumed.ensemble.result.digest === serial.ensemble.result.digest;
  add(
    'A4.cancelAndResume',
    ok ? 'pass' : 'fail',
    {
      kept: kept.length,
      canceled: cancelled,
      dropped,
      keptDifferences: diffs,
      rerunOfKeptTrials: reran,
      partialSummaryComplete: partial.ensemble.result.summary.complete,
      resumedDigestEqual:
        resumed.ensemble.result.digest === serial.ensemble.result.digest,
    },
    bound('A4.cancelAndResume')
  );
}

// --- A5: the engine kind, two fresh processes and real worker realms -------------------
let engineRecord;
{
  const m = rec.ensembleManifest({
    kind: 'ensemble',
    title: 'A5',
    seed: 'p265-a5',
    trials: 24,
    config: { world: 'three-body' },
  });
  const first = child('serial', m);
  const second = child('serial', m);
  const pooled = child('pool', m);
  engineRecord = first;
  const diffs =
    quantityDiffs(first, second) +
    quantityDiffs(first, pooled) +
    (first.ensemble.result.digest === second.ensemble.result.digest ? 0 : 1) +
    (first.ensemble.result.digest === pooled.ensemble.result.digest ? 0 : 1);
  add(
    'A5.engineReplay',
    diffs === 0 ? 'pass' : 'fail',
    {
      differences: diffs,
      digest: first.ensemble.result.digest,
      outcomes: Object.fromEntries(
        Object.entries(first.ensemble.result.summary.outcomes).map(([k, v]) => [
          k,
          v.count,
        ])
      ),
    },
    bound('A5.engineReplay')
  );
}

// --- A6: legacy distribution values ------------------------------------------------------
{
  let bad = 0;
  let total = 0;
  const seeds = [
    'a',
    'b',
    'orbit1',
    'orbit2',
    'sweep',
    'ünï',
    '7',
    '42',
    '2026',
    'x y',
    'kepler-3',
    'seed',
    'p265',
    'abc',
    '0',
    '999',
    'Z',
    'zz-top',
    'lab',
    'binary',
  ];
  for (const seed of seeds)
    for (const samples of [3, 5, 8, 13, 20]) {
      total++;
      const entry = {
        parameter: 'binary_lab_planet_a',
        distribution: { seed, samples, min: 0.1, max: 0.4 },
      };
      const legacy = manifestMod.valuesFor(entry);
      const d = stream('experiments', seed);
      const named = Array.from(
        { length: samples },
        () =>
          entry.distribution.min +
          d() * (entry.distribution.max - entry.distribution.min)
      ).sort((x, y) => x - y);
      if (
        !legacy.every((v, i) => Object.is(v, named[i])) ||
        legacy.length !== named.length
      )
        bad++;
    }
  add(
    'A6.legacyDistribution',
    bad === 0 ? 'pass' : 'fail',
    { mismatches: bad, compared: total },
    bound('A6.legacyDistribution')
  );
}

// --- A7: the sweep kind against runTrial -----------------------------------------------
let sweepRecord;
{
  const realm = await trialMod.loadRealm();
  const base = {
    format: 'gravitas.experiment',
    formatVersion: 1,
    title: 'Where does the planet stop being bound?',
    model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
    initial: { settings: {} },
    seeds: ['a', 'b'],
    vary: [{ parameter: 'binary_lab_planet_a', from: 0.1, to: 0.4, count: 4 }],
    observables: {
      metrics: ['distance_to_primary', 'orbital_period', 'energy_drift'],
      roles: manifestMod.SWEEPABLE['binary-planet-lab'].roles,
    },
    stop: { duration: 10000, events: [] },
    numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
    limits: manifestMod.defaultLimits('desktop', { hardwareConcurrency: 8 }),
    summaries: ['mean', 'status-counts'],
  };
  const sw = rec.ensembleManifest({ kind: 'sweep', sweep: base });
  const problems = rec.validateEnsemble(sw);
  const jobs = rec.planJobs(sw).slice(0, 3);
  let diffs = 0;
  const compared = [];
  for (const job of jobs) {
    const direct = runTrial(realm, sw, job.trial);
    const row = await trialMod.runJob(sw, job, { realm });
    const got = Object.fromEntries(
      (row.artifact?.quantities ?? []).map(q => [q.id, q.value])
    );
    for (const id of base.observables.metrics) {
      compared.push(id);
      if (!Object.is(direct.results[id], got[id])) diffs++;
    }
    if (direct.status !== row.status) diffs++;
  }
  sweepRecord = await run.runSerial(sw, { realm });
  add(
    'A7.legacyTrials',
    diffs === 0 && !problems.length ? 'pass' : 'fail',
    {
      differences: diffs,
      trialsCompared: jobs.length,
      valuesCompared: compared.length,
      manifestProblems: problems.length,
    },
    bound('A7.legacyTrials'),
    'the existing experiment suites pass unchanged is asserted by the full Jest run, not here'
  );
}

// --- A8 and A8b: the three-body kind against the regression group (Prompt 137) ----------
// Each in a fresh process: an engine realm remembers the previous build (amendment AM4).
for (const [id, mode] of [
  ['A8.regressionContext', 'default'],
  ['A8b.regressionContextLab', 'lab'],
]) {
  const out = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(REPO, 'tools/experiment-ensemble-regression-child.mjs'), mode],
      { cwd: REPO, encoding: 'utf8' }
    )
  );
  const dm = rel(out.median, out.groupMedian);
  const dp = rel(out.p90, out.groupP90);
  const within =
    out.median <= out.recorded.median * out.margin &&
    out.p90 <= out.recorded.p90 * out.margin;
  const lim = bound('A8.regressionContext');
  add(
    id,
    dm <= lim.maxRelDifference && dp <= lim.maxRelDifference && within
      ? 'pass'
      : 'fail',
    { ...out, relMedian: dm, relP90: dp, withinCommittedBound: within },
    lim,
    id === 'A8b.regressionContextLab'
      ? 'amendment AM3: a new leg'
      : 'amendment AM3 says this leg is expected to fail'
  );
}

// --- B: summaries against the oracle ---------------------------------------------------
{
  let maxMeanSd = 0;
  let maxT = 0;
  let maxQ = 0;
  let uBad = 0;
  let zMax = 0;
  let classBad = 0;
  for (let k = 0; k < 5; k++) {
    const seed = `p265-b-${k}`;
    const m = rec.ensembleManifest({
      kind: 'ensemble',
      seed,
      trials: 40,
      config: { world: 'analytic-draw' },
    });
    const r = await run.runSerial(m);
    const s = r.ensemble.result.summary;
    const o = oracle.summaries[k];
    const arr = oracle.arrays[k];
    r.ensemble.result.trials.forEach((t, i) => {
      const [u, z] = t.artifact.quantities.map(q => q.value);
      if (u !== arr.u[i]) uBad++;
      zMax = Math.max(zMax, rel(z, arr.z[i]));
    });
    for (const id of ['u', 'z']) {
      const mine = s.metrics[id];
      maxMeanSd = Math.max(
        maxMeanSd,
        rel(mine.mean, o[id].mean),
        rel(mine.sd, o[id].sd)
      );
      maxT = Math.max(
        maxT,
        rel(mine.interval.lo, o[id].lo),
        rel(mine.interval.hi, o[id].hi)
      );
      for (const q of Object.keys(o[id].quantiles))
        maxQ = Math.max(maxQ, rel(mine.quantiles[q], o[id].quantiles[q]));
    }
    const counts = Object.fromEntries(
      Object.entries(s.outcomes).map(([c, v]) => [c, v.count])
    );
    if (
      JSON.stringify(Object.entries(counts).sort()) !==
      JSON.stringify(Object.entries(oracle.classes[k].counts).sort())
    )
      classBad++;
    const shares = Object.values(s.outcomes).reduce((a, v) => a + v.share, 0);
    if (Math.abs(shares - 1) > 1e-15) classBad++;
  }
  add(
    'B0.drawsAgree',
    uBad === 0 && zMax <= 1e-12 ? 'pass' : 'fail',
    { uMismatches: uBad, zMaxRel: zMax },
    { uMismatches: 0, zMaxRel: 1e-12 },
    'not a committed leg: the oracle regenerates the trial values (u exactly, z through libm); B1 to B5 are stated on them'
  );
  add(
    'B1.meanSd',
    maxMeanSd <= bound('B1.meanSd').maxRel ? 'pass' : 'fail',
    { maxRel: maxMeanSd },
    bound('B1.meanSd')
  );
  add(
    'B2.studentInterval',
    maxT <= bound('B2.studentInterval').maxRel ? 'pass' : 'fail',
    { maxRel: maxT },
    bound('B2.studentInterval')
  );
  add(
    'B3.quantiles',
    maxQ <= bound('B3.quantiles').maxRel ? 'pass' : 'fail',
    { maxRel: maxQ },
    bound('B3.quantiles')
  );
  const b = oracle.bootstrap;
  const vals = oracle.arrays[0].u;
  const d = sum.describe(vals, {
    seed: b.seed,
    metric: b.metric,
    level: b.level,
    draws: b.draws,
  });
  const mb = Math.max(
    rel(d.medianInterval.lo, b.lo),
    rel(d.medianInterval.value, b.value),
    rel(d.medianInterval.hi, b.hi),
    rel(d.median, b.estimate)
  );
  add(
    'B4.bootstrapInterval',
    mb <= bound('B4.bootstrapInterval').maxRel ? 'pass' : 'fail',
    {
      maxRel: mb,
      lo: d.medianInterval.lo,
      value: d.medianInterval.value,
      hi: d.medianInterval.hi,
    },
    bound('B4.bootstrapInterval')
  );
  add(
    'B5.outcomeShares',
    classBad === 0 ? 'pass' : 'fail',
    { mismatches: classBad },
    bound('B5.outcomeShares')
  );
}

// --- C: coverage -------------------------------------------------------------------------
{
  const { studentInterval } = await imp('js/kernels/statistics/intervals.js');
  let hit = 0;
  const reps = 400;
  for (let r = 0; r < reps; r++) {
    const vals = [];
    for (let i = 0; i < 30; i++) {
      const t = await kinds.plainTrial(
        { kind: 'ensemble', config: { world: 'analytic-draw' } },
        stream('experiments', `p265-c1-${r}`, 'trial', i)
      );
      vals.push(t.quantities[1].value);
    }
    const iv = studentInterval(vals, { level: 0.95 });
    if (iv.lo <= 0 && 0 <= iv.hi) hit++;
  }
  const c1 = hit / reps;
  const l1 = bound('C1.meanIntervalCoverage');
  add(
    'C1.meanIntervalCoverage',
    c1 >= l1.min && c1 <= l1.max ? 'pass' : 'fail',
    { coverage: c1, replicates: reps },
    l1
  );
}
{
  let hit = 0;
  const reps = 200;
  for (let r = 0; r < reps; r++) {
    const vals = Array.from({ length: 50 }, (_, i) =>
      stream('experiments', `p265-c2-${r}`, 'trial', i)()
    );
    const d = sum.describe(vals, {
      seed: `p265-c2-${r}`,
      metric: 'u',
      level: 0.95,
      draws: 400,
    });
    if (
      d.medianInterval.status === 'ok' &&
      d.medianInterval.lo <= 0.5 &&
      0.5 <= d.medianInterval.hi
    )
      hit++;
  }
  const c2 = hit / reps;
  const l2 = bound('C2.medianIntervalCoverage');
  add(
    'C2.medianIntervalCoverage',
    c2 >= l2.min && c2 <= l2.max ? 'pass' : 'fail',
    { coverage: c2, replicates: reps },
    l2
  );
}
let injectionRecord;
{
  const l3 = bound('C3.injectionRecovery');
  const per = {};
  let ok = true;
  for (const S of [6.0, 7.1, 8.0]) {
    const m = rec.ensembleManifest({
      kind: 'injection',
      seed: `p265-c3-${S}`,
      trials: 2000,
      limits: { maxResultBytes: 16_000_000 },
      config: { client: 'matched-filter-229', S },
    });
    const r = await run.runSerial(m);
    injectionRecord ??= r;
    const mean = r.ensemble.result.summary.metrics.recovered;
    const analytic = oracle.analyticEfficiency[S.toFixed(1)];
    const holds =
      mean.interval.status === 'ok' &&
      mean.interval.lo <= analytic &&
      analytic <= mean.interval.hi;
    per[S] = {
      recovered: mean.mean,
      analytic,
      abs: Math.abs(mean.mean - analytic),
      intervalHoldsAnalytic: holds,
    };
    if (per[S].abs > l3.maxAbs || !holds) ok = false;
  }
  add('C3.injectionRecovery', ok ? 'pass' : 'fail', per, l3);
}

// --- D: refusals -------------------------------------------------------------------------
{
  const good = () =>
    rec.ensembleManifest({
      kind: 'ensemble',
      seed: 's',
      trials: 10,
      config: { world: 'analytic-draw' },
    });
  const say = (label, m) => {
    const p = rec.validateEnsemble(m);
    return {
      label,
      refused: p.length > 0,
      message: p[0] ? `${p[0].path} ${p[0].message}` : null,
    };
  };
  const set = (f, ...path) => {
    const m = good();
    let o = m;
    path.slice(0, -1).forEach(k => (o = o[k]));
    o[path.at(-1)] = f;
    return m;
  };
  const refusals = [
    say('fewer than 2 trials', set(1, 'ensemble', 'trials')),
    say('more trials than the cap', set(1e9, 'ensemble', 'trials')),
    say('unknown kind', set('nonsense', 'ensemble', 'kind')),
    say(
      'unknown stream identity',
      set(
        [
          {
            id: 'nonsense',
            algorithm: 'mulberry32',
            version: 1,
            key: 's:trial',
          },
        ],
        'ensemble',
        'streams'
      )
    ),
    say(
      'unknown client',
      rec.ensembleManifest({
        kind: 'injection',
        seed: 's',
        trials: 10,
        config: { client: 'nonsense' },
      })
    ),
    say(
      'unknown world',
      rec.ensembleManifest({
        kind: 'ensemble',
        seed: 's',
        trials: 10,
        config: { world: 'nonsense' },
      })
    ),
    say(
      'other algorithm',
      set('xoshiro', 'ensemble', 'streams', 0, 'algorithm')
    ),
  ];
  const misspecified = [
    say(
      'noise stream for an experiments kind',
      set('noise', 'ensemble', 'streams', 0, 'id')
    ),
    say('fork rule that is neither', set('per-worker', 'ensemble', 'fork')),
    say('legacy fork on an ensemble', set('legacy-sweep', 'ensemble', 'fork')),
    say(
      'bootstrap of one value',
      rec.ensembleManifest({
        kind: 'bootstrap',
        seed: 's',
        trials: 10,
        config: { source: { metric: 'u', values: [1] }, statistic: 'mean' },
      })
    ),
    say(
      'bootstrap with a non-finite value',
      rec.ensembleManifest({
        kind: 'bootstrap',
        seed: 's',
        trials: 10,
        config: {
          source: { metric: 'u', values: [1, NaN, 3] },
          statistic: 'mean',
        },
      })
    ),
  ];
  // Results that must be reported, not turned into numbers.
  const noNumbers = sum.summarize({
    ensemble: {
      ...good().ensemble,
      result: {
        status: 'complete',
        trials: [
          { index: 0, status: 'lostBody' },
          { index: 1, status: 'lostBody' },
        ],
      },
    },
  });
  const constant = sum.describe([3, 3, 3, 3], {
    seed: 's',
    metric: 'x',
    level: 0.95,
    draws: 200,
  });
  const single = sum.describe([3], {
    seed: 's',
    metric: 'x',
    level: 0.95,
    draws: 200,
  });
  const tampered = JSON.parse(JSON.stringify(serial));
  tampered.ensemble.result.trials[3].artifact.quantities[0].value += 1e-9;
  const edited = await run.reproducibility(tampered);
  const kernelSkew = JSON.parse(JSON.stringify(serial));
  kernelSkew.ensemble.kernels['ensemble-runner'] = '0';
  const skew = await run.reproducibility(kernelSkew);
  const engineSkew = JSON.parse(JSON.stringify(serial));
  engineSkew.ensemble.result.engine = { fingerprint: 'aaaaaaaa' };
  const eng = await run.reproducibility(engineSkew, { engine: 'bbbbbbbb' });
  const replayed = await run.replay(kernelSkew, run.runSerial);
  const checks = [
    [
      'an all-failed ensemble says not constrained',
      noNumbers.used === 0 &&
        noNumbers.statusCounts.lostBody === 2 &&
        Object.keys(noNumbers.metrics).length === 0,
    ],
    [
      'constant values: the interval is not constrained',
      constant.interval.status === 'not-constrained' &&
        constant.interval.code === 'constant',
    ],
    [
      'one value: the interval is not constrained',
      single.interval.status === 'not-constrained',
    ],
    [
      'an edited record is reported with its digests',
      !edited.reproducible &&
        /edited after it ran/.test(edited.reasons.join(' ')),
    ],
    [
      'a kernel version that differs is reported',
      !skew.reproducible &&
        /kernel ensemble-runner was 0/.test(skew.reasons.join(' ')),
    ],
    [
      'an engine fingerprint that differs is reported',
      !eng.reproducible && /integrates differently/.test(eng.reasons.join(' ')),
    ],
    [
      'a record that is not reproducible is still replayed',
      replayed.record?.ensemble?.result?.digest !== undefined &&
        replayed.verdict.reproducible === false,
    ],
  ];
  add(
    'D1.refusals',
    refusals.every(r => r.refused && r.message) && checks.every(c => c[1])
      ? 'pass'
      : 'fail',
    { refusals, reported: checks.map(c => ({ what: c[0], ok: c[1] })) },
    bound('D1.refusals')
  );
  add(
    'D2.misspecified',
    misspecified.every(r => r.refused && r.message) ? 'pass' : 'fail',
    misspecified,
    bound('D2.misspecified')
  );
}

// --- E: record and envelopes -------------------------------------------------------------
{
  const corpus = {
    format: 'gravitas.experiment',
    formatVersion: 1,
    title: 't',
    model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
    vary: [],
    seeds: ['a'],
  };
  const same =
    JSON.stringify(rec.withVersion(corpus)) === JSON.stringify(corpus);
  const m =
    sweepRecord ??
    rec.ensembleManifest({
      kind: 'ensemble',
      seed: 'e1',
      trials: 4,
      config: { world: 'analytic-draw' },
    });
  const asTwo =
    rec.withVersion({ ...corpus, ensemble: { kind: 'sweep' } })
      .formatVersion === 2;
  const migrated = manifestMod.migrateExperiment(JSON.parse(JSON.stringify(m)));
  const read =
    !migrated.error &&
    manifestMod.validateExperiment(migrated.manifest).length === 0;
  const round =
    JSON.stringify(JSON.parse(JSON.stringify(m))) === JSON.stringify(m);
  add(
    'E1.recordCorpus',
    same && asTwo && read && round ? 'pass' : 'fail',
    {
      v1UnchangedByteForByte: same,
      ensembleWrittenAsV2: asTwo,
      currentReaderAccepts: read,
      roundTrip: round,
    },
    bound('E1.recordCorpus'),
    'the 2.0.0 reader refusing it and the rewrite check are tests/compat/boundary.test.js (row ensemble-fields), run by the full Jest'
  );
  let problems = 0;
  for (const r of [serial, engineRecord, injectionRecord])
    problems += envelopeProblems(r);
  add(
    'E2.trialEnvelope',
    problems === 0 ? 'pass' : 'fail',
    { problems, recordsChecked: 3 },
    bound('E2.trialEnvelope')
  );
  const base = sum.summaryArtifact(serial);
  const withCitation = { ...base, provenance: rec.citation(serial) };
  const cite = validateArtifact(withCitation).length;
  const tampered = JSON.parse(JSON.stringify(serial));
  tampered.ensemble.result.trials[5].artifact.quantities[1].value *= 1.0000001;
  const changed =
    (await rec.recordDigest(tampered)) !== serial.ensemble.result.digest;
  add(
    'E3.digestCitation',
    cite === 0 &&
      changed &&
      withCitation.provenance.citations[0].digest ===
        serial.ensemble.result.digest
      ? 'pass'
      : 'fail',
    { problems: cite, editChangesDigest: changed },
    bound('E3.digestCitation')
  );
}

// --- F: not applicable and not run --------------------------------------------------------
add(
  'F1.authenticData',
  'not-applicable',
  'the runner makes no statement about real data; no authentic dataset is used and no V claim is made',
  bound('F1.authenticData')
);
add(
  'F2.otherEngines',
  'not-run',
  'Node 20 and the browser engines are CI runs; no stored number passed through libm',
  bound('F2.otherEngines')
);

rmSync(tmp, { recursive: true, force: true });

const failed = results.filter(r => r.status === 'fail');
const counts = results.reduce(
  (o, r) => ((o[r.status] = (o[r.status] || 0) + 1), o),
  {}
);
const out = {
  format: 'gravitas.experiment-ensemble-results/1',
  thresholdsSha256: sha('thresholds.json'),
  amendmentsSha256: sha('amendments.json'),
  oracleSha256: sha('oracle-results.json'),
  node: process.version,
  counts,
  checks: results,
};
for (const r of results)
  console.log(
    `${r.status.toUpperCase().padEnd(15)} ${r.id}${r.status === 'fail' ? ` ${JSON.stringify(r.measured)}` : ''}`
  );
console.log(JSON.stringify(counts));
if (process.argv.includes('--write')) {
  writeFileSync(
    path.join(FIX, 'results.json'),
    `${JSON.stringify(out, null, 1)}\n`
  );
  writeFileSync(
    path.join(FIX, 'failed-legs.json'),
    `${JSON.stringify({ format: 'gravitas.experiment-ensemble-failed-legs/1', note: 'A crossed bound is a failed leg; nothing is moved after a result.', failed: failed.map(f => ({ id: f.id, measured: f.measured, limit: f.limit, note: f.note })) }, null, 1)}\n`
  );
}
process.exit(0);
