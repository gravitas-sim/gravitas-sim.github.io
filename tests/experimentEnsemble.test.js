// =============================================================================
// The ensemble runner (Prompt 265, EXPERIMENT_ENSEMBLES.md)
// -----------------------------------------------------------------------------
// The record, the streams, the kinds, the pool client, the summary and replay.
// The engine kind runs in fresh Node processes (an engine realm remembers the
// last world it built, EXPERIMENTS.md), through tools/experiment-ensemble-child.mjs
// serially and on real worker_threads realms. The thorough legs, against an
// independent Python oracle, are tools/experiment-ensemble-validate.mjs, whose
// pinned results tests/experimentEnsembleResults.test.js holds.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import process from 'node:process';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { setTimeout } from 'node:timers';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ensembleManifest,
  validateEnsemble,
  withVersion,
  citation,
  recordDigest,
  verifyDigest,
  planJobs,
} from '../js/experiments/ensemble/record.js';
import {
  runSerial,
  startEnsemble,
  replay,
  reproducibility,
  keptRows,
  inputsOf,
} from '../js/experiments/ensemble/run.js';
import { runJob } from '../js/experiments/ensemble/trial.js';
import {
  describe as describeValues,
  summarize,
  summaryArtifact,
  legacySummary,
} from '../js/experiments/ensemble/summary.js';
import { stream } from '../js/random/streams.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { valid } from './jsonSchemaSubset.js';
import {
  migrateExperiment,
  validateExperiment,
  valuesFor,
  summarizeExperiment,
} from '../js/experiments/experimentManifest.js';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

// The page and the Worker have WebCrypto; Jest's realm for a test file does not (js/hash.js sha256Hex).
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = JSON.parse(
  readFileSync(
    path.join(REPO, 'tests/fixtures/experiments-ensemble/oracle-results.json'),
    'utf8'
  )
);
const analytic = (trials = 40, seed = 'unit') =>
  ensembleManifest({
    kind: 'ensemble',
    seed,
    trials,
    config: { world: 'analytic-draw' },
  });

/** Realms that answer after a delay that depends on the trial, so they finish out of order. */
function shuffledRealms(log = []) {
  return () => {
    const o = { onmessage: null, onerror: null, terminated: false };
    o.postMessage = msg => {
      log.push(msg.job.index);
      setTimeout(
        async () => {
          if (o.terminated) return;
          const row = await runJob(msg.manifest, msg.job);
          if (!o.terminated)
            o.onmessage?.({ data: { type: 'result', result: row } });
        },
        (msg.job.index * 7919) % 7
      );
    };
    o.terminate = () => {
      o.terminated = true;
    };
    return o;
  };
}

describe('the record', () => {
  test('names its streams and kernels, and is /2 only because it uses them', () => {
    const m = analytic();
    expect(m.formatVersion).toBe(2);
    expect(m.ensemble.fork).toBe('trial-index');
    expect(m.ensemble.streams).toEqual([
      {
        id: 'experiments',
        algorithm: 'mulberry32',
        version: 1,
        key: 'unit:trial',
      },
    ]);
    expect(Object.keys(m.ensemble.kernels).sort()).toEqual([
      'ensemble-runner',
      'random-streams',
      'statistics',
    ]);
    expect(validateEnsemble(m)).toEqual([]);
  });

  test('a manifest that uses no ensemble field is written as /1, byte for byte', () => {
    const v1 = {
      format: 'gravitas.experiment',
      formatVersion: 1,
      title: 't',
      seeds: ['a'],
    };
    expect(JSON.stringify(withVersion(v1))).toBe(JSON.stringify(v1));
    expect(
      withVersion({ ...v1, ensemble: { kind: 'sweep' } }).formatVersion
    ).toBe(2);
  });

  test('refuses what it cannot run, with a message naming the field', () => {
    const bad = (mutate, path) => {
      const m = analytic();
      mutate(m);
      const p = validateEnsemble(m);
      expect(p.length).toBeGreaterThan(0);
      expect(p.map(x => x.path).join(' ')).toContain(path);
    };
    bad(m => (m.ensemble.trials = 1), 'ensemble.trials');
    bad(m => (m.ensemble.kind = 'nope'), 'ensemble.kind');
    bad(m => (m.ensemble.streams[0].id = 'noise'), 'ensemble.streams[0].id');
    bad(
      m => (m.ensemble.streams[0].algorithm = 'xoshiro'),
      'ensemble.streams[0].algorithm'
    );
    bad(m => (m.ensemble.fork = 'legacy-sweep'), 'ensemble.fork');
    bad(m => (m.ensemble.config.world = 'galaxy'), 'ensemble.config.world');
    bad(m => (m.formatVersion = 1), 'formatVersion');
  });

  test('trial i draws only from its own fork: the order the trials run in is not in the answer', async () => {
    const m = analytic(30);
    const forward = await runSerial(m);
    const direct = [];
    for (const i of [...Array(30).keys()].reverse())
      direct[i] = await runJob(m, {
        index: i,
        stream: { id: 'experiments', seed: 'unit', labels: ['trial', i] },
      });
    expect(direct.map(r => r.artifact)).toEqual(
      forward.ensemble.result.trials.map(r => r.artifact)
    );
    const u = forward.ensemble.result.trials[7].artifact.quantities[0].value;
    expect(u).toBe(stream('experiments', 'unit', 'trial', 7)());
  });

  test('every trial is a gravitas.artifact envelope and the summary is one', async () => {
    const r = await runSerial(analytic());
    for (const t of r.ensemble.result.trials)
      expect(validateArtifact(t.artifact)).toEqual([]);
    expect(validateArtifact(summaryArtifact(r))).toEqual([]);
  });

  test('the digest covers the trials: an edit changes it, and a record that was edited says so', async () => {
    const r = await runSerial(analytic());
    expect((await verifyDigest(r)).ok).toBe(true);
    const edited = JSON.parse(JSON.stringify(r));
    edited.ensemble.result.trials[2].artifact.quantities[0].value += 1e-12;
    expect((await recordDigest(edited)) === r.ensemble.result.digest).toBe(
      false
    );
    const verdict = await reproducibility(edited);
    expect(verdict.reproducible).toBe(false);
    expect(verdict.reasons.join(' ')).toMatch(/edited after it ran/);
  });

  test('a report cites it by digest, as a provenance block the envelope accepts', async () => {
    const r = await runSerial(analytic());
    const doc = { ...summaryArtifact(r), provenance: citation(r) };
    expect(validateArtifact(doc)).toEqual([]);
    expect(doc.provenance.citations[0]).toMatchObject({
      digest: r.ensemble.result.digest,
      ensemble: 'ensemble',
    });
    expect(() => citation(analytic())).toThrow(/has run/);
  });
});

describe('replay', () => {
  test('a record re-runs from itself alone, to the digit', async () => {
    const r = await runSerial(analytic(120, 'replay'));
    const again = await replay(r, runSerial);
    expect(again.identical).toBe(true);
    expect(again.differences).toEqual([]);
    expect(again.verdict).toEqual({ reproducible: true, reasons: [] });
  });

  test('a kernel version that is not this build is reported, and the record is still replayed', async () => {
    const r = await runSerial(analytic(20));
    const old = JSON.parse(JSON.stringify(r));
    old.ensemble.kernels['ensemble-runner'] = '0';
    const again = await replay(old, runSerial);
    expect(again.verdict.reproducible).toBe(false);
    expect(again.verdict.reasons.join(' ')).toMatch(
      /kernel ensemble-runner was 0/
    );
    expect(again.record.ensemble.result.trials).toHaveLength(20);
  });

  test('a changed engine is reported when its fingerprint differs', async () => {
    const r = await runSerial(analytic(5), { engine: 'aaaaaaaa' });
    expect(
      (await reproducibility(r, { engine: 'bbbbbbbb' })).reasons.join(' ')
    ).toMatch(/integrates differently/);
    expect(
      (await reproducibility(r, { engine: 'aaaaaaaa' })).reproducible
    ).toBe(true);
  });
});

describe('the pool', () => {
  test('finishes with the serial digest at every concurrency, whatever order realms finish in', async () => {
    const m = analytic(60);
    const serial = await runSerial(m);
    for (const concurrency of [1, 3, 8]) {
      const r = await startEnsemble(m, {
        spawn: shuffledRealms(),
        concurrency,
      }).run();
      expect(r.ensemble.result.digest).toBe(serial.ensemble.result.digest);
      expect(r.ensemble.result.status).toBe('complete');
    }
  });

  test('cancellation keeps what finished and reports the rest as canceled, and resume runs only the rest', async () => {
    const m = analytic(60);
    const serial = await runSerial(m);
    let done = 0;
    const h = startEnsemble(m, {
      spawn: shuffledRealms(),
      concurrency: 3,
      onTrial: r => {
        if (r.status === 'ok' && ++done === 20) h.cancel('stopped');
      },
    });
    const partial = await h.run();
    const rows = partial.ensemble.result.trials;
    expect(rows).toHaveLength(60);
    expect(rows.every(Boolean)).toBe(true);
    expect(partial.ensemble.result.status).toBe('canceled');
    expect(partial.ensemble.result.summary.complete).toBe(false);
    const kept = keptRows(partial);
    expect(kept.length).toBeGreaterThanOrEqual(20);
    for (const r of kept)
      expect(r.artifact).toEqual(
        serial.ensemble.result.trials[r.index].artifact
      );
    expect(rows.filter(r => r.status === 'canceled').length + kept.length).toBe(
      60
    );
    const sent = [];
    const resumed = await startEnsemble(m, {
      spawn: shuffledRealms(sent),
      concurrency: 3,
      completed: kept,
    }).run();
    expect(sent.some(i => kept.some(r => r.index === i))).toBe(false);
    expect(resumed.ensemble.result.digest).toBe(serial.ensemble.result.digest);
  });

  test('refuses to start a record it could not run', () => {
    const m = analytic();
    m.ensemble.trials = 1;
    expect(() => startEnsemble(m, { spawn: shuffledRealms() })).toThrow(
      /not a runnable ensemble/
    );
  });

  test('sends the inputs only: the result never goes to a realm', async () => {
    const m = analytic(4);
    const done = await runSerial(m);
    const seen = [];
    await startEnsemble(done, {
      spawn: () => {
        const o = { onmessage: null, terminated: false };
        o.postMessage = msg => {
          seen.push(msg);
          Promise.resolve().then(async () =>
            o.onmessage?.({
              data: {
                type: 'result',
                result: await runJob(msg.manifest, msg.job),
              },
            })
          );
        };
        o.terminate = () => {};
        return o;
      },
    }).run();
    expect(seen).toHaveLength(4);
    expect(seen.every(s => s.manifest.ensemble.result === undefined)).toBe(
      true
    );
    expect(inputsOf(done).ensemble.result).toBeUndefined();
  });
});

describe('the summary (Prompt 154)', () => {
  test('agrees with the independent oracle on the first array (the validator has all five)', async () => {
    const arr = FIX.arrays[0];
    const o = FIX.summaries[0].u;
    const d = describeValues(arr.u, {
      seed: arr.seed,
      metric: 'u',
      level: 0.95,
      draws: 500,
    });
    expect(Math.abs(d.mean - o.mean)).toBeLessThan(1e-12);
    expect(Math.abs(d.sd - o.sd)).toBeLessThan(1e-12);
    expect(Math.abs(d.interval.lo - o.lo)).toBeLessThan(1e-9);
    expect(Math.abs(d.medianInterval.lo - FIX.bootstrap.lo)).toBeLessThan(
      1e-12
    );
    expect(Math.abs(d.medianInterval.hi - FIX.bootstrap.hi)).toBeLessThan(
      1e-12
    );
  });

  test('says "not constrained" where an interval has no width to estimate, and never invents one', () => {
    const o = { seed: 's', metric: 'x', level: 0.95, draws: 200 };
    expect(describeValues([3, 3, 3, 3], o).interval).toMatchObject({
      status: 'not-constrained',
      code: 'constant',
    });
    expect(describeValues([3], o).interval.status).toBe('not-constrained');
    expect(describeValues([], o).interval.status).toBe('not-constrained');
  });

  test('counts a trial without a number and leaves it out', () => {
    const m = analytic(4);
    m.ensemble.result = {
      status: 'complete',
      trials: [
        {
          index: 0,
          status: 'ok',
          outcome: 'a',
          artifact: { quantities: [{ id: 'x', value: 1, unit: null }] },
        },
        {
          index: 1,
          status: 'ok',
          outcome: 'a',
          artifact: { quantities: [{ id: 'x', value: 3, unit: null }] },
        },
        { index: 2, status: 'notFinite' },
        { index: 3, status: 'lostBody' },
      ],
    };
    const s = summarize(m);
    expect(s.used).toBe(2);
    expect(s.left).toBe(2);
    expect(s.statusCounts).toMatchObject({
      total: 4,
      ok: 2,
      notFinite: 1,
      lostBody: 1,
    });
    expect(s.metrics.x.mean).toBe(2);
    expect(s.outcomes.a).toEqual({ count: 2, share: 1 });
  });

  test('the bench and the analysis lab get the shape they read of a sweep', async () => {
    const r = await runSerial(analytic(30));
    const legacy = legacySummary(r);
    const sweepShape = summarizeExperiment(
      { observables: { metrics: ['u'] } },
      r.ensemble.result.trials.map(t => ({
        params: {},
        status: t.status,
        results: { u: t.artifact.quantities[0].value },
      }))
    );
    expect(legacy.metrics.u[0]).toEqual(sweepShape.metrics.u[0]);
  });
});

describe('the legacy sweep keeps its draws', () => {
  test('a distribution is the named stream of its own seed, equal to valuesFor', () => {
    for (const seed of ['a', 'orbit1', 'ünï', '42']) {
      const entry = {
        parameter: 'binary_lab_planet_a',
        distribution: { seed, samples: 8, min: 0.1, max: 0.4 },
      };
      const d = stream('experiments', seed);
      const named = Array.from(
        { length: 8 },
        () => 0.1 + d() * (0.4 - 0.1)
      ).sort((x, y) => x - y);
      expect(valuesFor(entry)).toEqual(named);
    }
  });

  test('a sweep is written /2 with the engine stream per seed, and plans the trials the runner plans', () => {
    const sweep = {
      format: 'gravitas.experiment',
      formatVersion: 1,
      title: 'sweep',
      model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
      initial: { settings: {} },
      seeds: ['a', 'b'],
      vary: [
        {
          parameter: 'binary_lab_planet_a',
          distribution: {
            kind: 'uniform',
            seed: 'd',
            samples: 3,
            min: 0.1,
            max: 0.4,
          },
        },
      ],
      observables: {
        metrics: ['distance_to_primary'],
        roles: { bodies: ['planet'], primary: 'Star A' },
      },
      stop: { duration: 1000, events: [] },
      numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
      limits: {
        concurrency: 1,
        trialTimeoutMs: 60000,
        totalTimeoutMs: 600000,
        maxSamplesPerTrial: 4000,
        maxResultBytes: 4000000,
      },
      summaries: ['mean'],
    };
    const m = ensembleManifest({ kind: 'sweep', sweep });
    expect(m.formatVersion).toBe(2);
    expect(m.ensemble.fork).toBe('legacy-sweep');
    expect(m.ensemble.streams.map(s => `${s.id}:${s.key}`)).toEqual([
      'engine:a',
      'engine:b',
      'experiments:d',
    ]);
    expect(m.ensemble.trials).toBe(6);
    expect(validateEnsemble(m)).toEqual([]);
    expect(planJobs(m).map(j => j.trial.seed)).toEqual([
      'a',
      'b',
      'a',
      'b',
      'a',
      'b',
    ]);
  });
});

describe('the schema', () => {
  const schema = JSON.parse(
    readFileSync(
      path.join(REPO, 'sdk/schemas/experiment-2.schema.json'),
      'utf8'
    )
  );
  test('holds the records the code makes, before and after a run, and refuses what the validator refuses', async () => {
    const before = analytic();
    expect(valid(schema, before)).toBe(true);
    expect(valid(schema, await runSerial(before))).toBe(true);
    expect(
      valid(
        schema,
        ensembleManifest({
          kind: 'injection',
          seed: 's',
          trials: 10,
          config: { client: 'matched-filter-229' },
        })
      )
    ).toBe(true);
    const bad = JSON.parse(JSON.stringify(before));
    bad.ensemble.fork = 'per-worker';
    expect(valid(schema, bad)).toBe(false);
    expect(valid(schema, { ...before, formatVersion: 1 })).toBe(false);
  });
});

describe('the shipped reader of the record', () => {
  test('reads a /2 record without running it, and refuses an ensemble block on /1', async () => {
    const r = await runSerial(analytic(6));
    const read = migrateExperiment(JSON.parse(JSON.stringify(r)));
    expect(read.error).toBeNull();
    expect(read.notes.join(' ')).toMatch(/does not run it/);
    expect(validateExperiment(read.manifest)).toEqual([]);
    const lie = { ...JSON.parse(JSON.stringify(r)), formatVersion: 1 };
    expect(validateExperiment(lie).map(p => p.path)).toContain('ensemble');
    const v3 = { ...JSON.parse(JSON.stringify(r)), formatVersion: 3 };
    expect(migrateExperiment(v3).error).toMatch(
      /newer than this Gravitas reads/
    );
  });
});

describe('the engine kind, in fresh realms', () => {
  const tmp = mkdtempSync(path.join(realpathSync(tmpdir()), 'p265-test-'));
  const run = (mode, m, name) => {
    const f = path.join(tmp, `${name}.json`);
    writeFileSync(f, JSON.stringify(m));
    return JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(REPO, 'tools/experiment-ensemble-child.mjs'), mode, f],
        { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }
      )
    );
  };
  test('replays to the digit in another process and in a real worker realm per trial', () => {
    const m = ensembleManifest({
      kind: 'ensemble',
      seed: 'unit-engine',
      trials: 6,
      config: { world: 'three-body' },
    });
    const a = run('serial', m, 'a');
    const b = run('serial', m, 'b');
    const c = run('pool', m, 'c');
    expect(a.ensemble.result.digest).toBe(b.ensemble.result.digest);
    expect(c.ensemble.result.digest).toBe(a.ensemble.result.digest);
    expect(c.ensemble.result.status).toBe('complete');
    const q = a.ensemble.result.trials[0].artifact.quantities.map(x => x.id);
    expect(q).toEqual(['energy_drift', 'closest_separation', 'largest_radius']);
    for (const t of a.ensemble.result.trials)
      expect(validateArtifact(t.artifact)).toEqual([]);
    rmSync(tmp, { recursive: true, force: true });
  }, 60000);
});

describe('the module is lazy', () => {
  test('is never precached, and no shipped module imports it', async () => {
    expect(
      NEVER_PRECACHED.some(re => re.test('js/experiments/ensemble/run.js'))
    ).toBe(true);
    const { paths } = await buildManifest();
    expect(paths.filter(p => p.startsWith('js/experiments/ensemble/'))).toEqual(
      []
    );
    const importers = [];
    const walk = dir => {
      for (const e of readdirSync(path.join(REPO, dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (
          rel.endsWith('.js') &&
          !rel.startsWith('js/experiments/ensemble/')
        )
          if (
            /from\s+'[^']*experiments\/ensemble\/|from\s+'\.\/ensemble\/|import\('[^']*ensemble\//.test(
              readFileSync(path.join(REPO, rel), 'utf8')
            )
          )
            importers.push(rel);
      }
    };
    walk('js');
    expect(importers).toEqual([]);
  });
});
