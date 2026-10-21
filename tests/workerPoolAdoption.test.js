import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import * as legacyScheduler from '../js/experiments/scheduler.js';
import * as poolScheduler from './fixtures/poolAdopters/scheduler.js';
import { runInference as legacyRun } from '../js/inference/run.js';
import {
  runInference as poolRun,
  realmBytes,
} from './fixtures/poolAdopters/run.js';
import {
  FORMAT,
  STATUS,
  SWEEPABLE,
  defaultLimits,
  planTrials,
} from '../js/experiments/experimentManifest.js';
import { syntheticRv } from '../js/inference/synthetic.js';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

// =============================================================================
// Prompt 153: the first adopters, held to what they replace
// -----------------------------------------------------------------------------
// The experiment scheduler and the inference core's run (profile likelihoods)
// are written as clients of js/workers/pool.js in tests/fixtures/poolAdopters/:
// the files js/experiments/scheduler.js and js/inference/run.js become when the
// adoption lands. This holds each to the shipped one in one process, outcome
// for outcome, so the day the files are swapped nothing a student or a test
// can see has moved. The adoption itself waits (D-R10-30): importing the pool
// costs the first-visit install bytes it does not have, and a request on the
// routes that load either file.
// =============================================================================

const manifest = (over = {}) => ({
  format: FORMAT,
  formatVersion: 1,
  title: 't',
  model: { scenario: 'binary-planet-lab', platform: '^1.0.0' },
  initial: { settings: {} },
  seeds: ['a', 'b'],
  vary: [{ parameter: 'binary_lab_planet_a', from: 0.1, to: 0.4, count: 4 }],
  observables: {
    metrics: ['distance_to_primary'],
    roles: SWEEPABLE['binary-planet-lab'].roles,
  },
  stop: { duration: 1000, events: [] },
  numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
  limits: { ...defaultLimits('desktop', { hardwareConcurrency: 8 }), ...over },
  summaries: [],
});

const answer = trial => ({
  index: trial.index,
  params: trial.params,
  seed: trial.seed,
  status: STATUS.OK,
  results: { distance_to_primary: trial.params.binary_lab_planet_a * 10 },
  kinds: { distance_to_primary: 'mean' },
  series: { distance_to_primary: [[0, 1]] },
  frames: 10,
  steps: 630,
  samples: 11,
  simTime: 1000,
  wallMs: 5,
  numerics: null,
});

const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

/** A clock and timers the test advances by hand. */
function fakeTime() {
  let now = 0;
  let next = 1;
  const timers = new Map();
  return {
    now: () => now,
    setTimer: (fn, ms) => {
      const id = next++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: id => timers.delete(id),
    advance(ms) {
      now += ms;
      for (const [id, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at <= now && timers.has(id)) {
          timers.delete(id);
          t.fn();
        }
      }
    },
  };
}

/** Realms that behave as `behave(trial)` says, recording what happened to them. */
function realms(behave, t, log) {
  let n = 0;
  return () => {
    const id = n++;
    log.push(['spawn', id]);
    const w = {
      terminated: false,
      terminate() {
        if (!this.terminated) log.push(['terminate', id]);
        this.terminated = true;
      },
      postMessage(msg, transfer) {
        log.push(['post', id, msg.trial.index, Boolean(transfer)]);
        const how = behave(msg.trial);
        const reply = data =>
          queueMicrotask(() => !w.terminated && w.onmessage?.({ data }));
        if (how === 'ok') {
          reply({ type: 'progress', fraction: 0.5 });
          reply({ type: 'result', result: answer(msg.trial) });
        } else if (how === 'garbage')
          reply({
            type: 'result',
            result: { index: msg.trial.index, nonsense: true },
          });
        else if (how === 'error') reply({ type: 'error', message: 'threw' });
        else if (how === 'unknown') reply({ type: 'weather' });
        else if (how === 'crash')
          queueMicrotask(() =>
            w.onerror?.({ message: 'realm died', preventDefault() {} })
          );
        else if (how === 'unreadable')
          queueMicrotask(() => w.onmessageerror?.());
        else if (typeof how === 'number')
          t.setTimer(
            () =>
              !w.terminated &&
              w.onmessage?.({
                data: { type: 'result', result: answer(msg.trial) },
              }),
            how
          );
        // 'hang': never answers.
      },
    };
    return w;
  };
}

/** What a run did, as everything a caller can observe of it. */
async function observe(impl, s) {
  const t = fakeTime();
  const log = [];
  const trials = planTrials(manifest());
  const m = manifest(s.limits);
  const spawn = realms(s.behave, t, log);
  const sched = impl.createScheduler({
    manifest: m,
    trials,
    spawn:
      s.spawn?.(spawn, log) ||
      (() => {
        const w = spawn();
        return w;
      }),
    concurrency: s.concurrency ?? 3,
    completed: s.completed?.(trials),
    now: t.now,
    setTimer: t.setTimer,
    clearTimer: t.clearTimer,
    onTrial: r => log.push(['trial', r.index, r.status]),
    onProgress: p => {
      // The pool adds the generation and the bytes held; nothing else differs.
      const { generation, heldBytes, ...rest } = p;
      void generation;
      void heldBytes;
      log.push(['progress', rest]);
    },
  });
  const done = sched.run();
  await flush();
  await s.drive?.({ t, sched, flush });
  const out = await done;
  log.push(['state', sched.state().state]);
  return { out, log };
}

const SCENARIOS = {
  'every trial answers, out of order': {
    behave: t => [30, 1, 12, 5, 0, 20, 8, 2][t.index] || 'ok',
    drive: async ({ t }) => {
      for (let i = 0; i < 12; i++) {
        t.advance(5);
        await flush();
      }
    },
  },
  'all ok on one realm': { behave: () => 'ok', concurrency: 1 },
  'garbage, unknown, error, crash and unreadable are statuses': {
    behave: t =>
      ['garbage', 'unknown', 'error', 'crash', 'unreadable', 'ok', 'ok', 'ok'][
        t.index
      ],
  },
  'a realm that cannot start': {
    behave: () => 'ok',
    spawn: (spawn, log) => {
      let n = 0;
      return () => {
        if (n++ === 1) {
          log.push(['spawn-throws']);
          throw new Error('no workers here');
        }
        return spawn();
      };
    },
  },
  'a trial past its limit': {
    behave: t => (t.index % 3 === 2 ? 'hang' : 'ok'),
    limits: { trialTimeoutMs: 1000, totalTimeoutMs: 1e9 },
    drive: async ({ t }) => {
      for (let i = 0; i < 6; i++) {
        t.advance(1000);
        await flush();
      }
    },
  },
  'the run reaches its own limit': {
    behave: t => (t.index < 2 ? 'ok' : 'hang'),
    limits: { trialTimeoutMs: 9e9, totalTimeoutMs: 500 },
    drive: async ({ t }) => t.advance(500),
  },
  'a cancel with realms running': {
    behave: () => 'hang',
    drive: async ({ sched }) => sched.cancel('stopped by a test'),
  },
  'a cancel with the default reason after some finished': {
    behave: t => (t.index < 3 ? 'ok' : 'hang'),
    drive: async ({ sched }) => sched.cancel(),
  },
  'a result past the byte budget': {
    behave: () => 'ok',
    limits: { maxResultBytes: 1500 },
  },
  'a checkpoint': {
    behave: () => 'ok',
    concurrency: 2,
    completed: trials => [
      answer(trials[0]),
      { ...answer(trials[1]), status: STATUS.LOST_BODY },
      { ...answer(trials[2]), status: STATUS.TIMEOUT },
      { ...answer(trials[3]), status: STATUS.CANCELED },
      { ...answer(trials[4]), index: 99 },
      { ...answer(trials[5]), seed: 'not this trial’s' },
    ],
  },
};

describe('the experiment scheduler as a client of the pool', () => {
  test('the pool client has the shipped scheduler’s exports', () => {
    expect(Object.keys(poolScheduler).sort()).toEqual(
      Object.keys(legacyScheduler).sort()
    );
    expect(poolScheduler.RESUMABLE).toEqual(legacyScheduler.RESUMABLE);
  });

  for (const [name, scenario] of Object.entries(SCENARIOS))
    test(`${name}: the same outcomes, callbacks, messages and terminations`, async () => {
      const was = await observe(legacyScheduler, scenario);
      const now = await observe(poolScheduler, scenario);
      expect(now.log).toEqual(was.log);
      expect(now.out).toEqual(was.out);
      // The scenarios are not empty.
      expect(was.out.trials).toHaveLength(8);
    });

  test('the realm is never sent anything the shipped scheduler did not send, and trials are the caller’s own objects', async () => {
    const seen = [];
    const trials = planTrials(manifest());
    const t = fakeTime();
    await poolScheduler
      .createScheduler({
        manifest: manifest(),
        trials,
        concurrency: 2,
        spawn: () => ({
          terminate() {},
          postMessage(msg) {
            seen.push(msg);
            queueMicrotask(() =>
              this.onmessage({
                data: { type: 'result', result: answer(msg.trial) },
              })
            );
          },
        }),
        now: t.now,
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      })
      .run();
    expect(
      seen.every(m => Object.keys(m).join() === 'type,manifest,trial')
    ).toBe(true);
    expect(seen.map(m => m.trial)).toEqual(trials);
    expect(seen[0].trial).toBe(trials[0]);
  });
});

// --- The inference run, on real realms ---------------------------------------

describe('the inference core’s run on the pool', () => {
  const truth = {
    P: 4.2308,
    tc: 100.3,
    K: 55.9,
    sqrtEcosw: 0.25,
    sqrtEsinw: -0.2,
  };
  const times = Array.from(
    { length: 48 },
    (_, i) => 100 + i * 0.61 + 0.2 * Math.sin(i * 7.1)
  );
  const data = syntheticRv({
    seed: 'rv-pool',
    times,
    sigma: 3,
    jitter: 4,
    gamma: -12,
    truth,
  });
  const request = {
    model: { id: 'rv-keplerian' },
    parameters: { P: { lo: 3.5, hi: 5 }, tc: { lo: 99, hi: 105 } },
  };
  const limits = {
    trialTimeoutMs: 600_000,
    totalTimeoutMs: 600_000,
    maxResultBytes: 64_000_000,
  };
  let current = null;
  let before;

  beforeAll(async () => {
    before = globalThis.self;
    globalThis.self = {
      postMessage: msg => {
        const to = current;
        setTimeout(() => to?.onmessage?.({ data: msg }), 0);
      },
    };
    await import('../js/inference/inferenceWorker.js');
  });
  afterAll(() => {
    globalThis.self = before;
  });

  /** The real inference realm, in this thread, behind a Worker's interface. */
  const spawnReal = made => () => {
    const realm = {
      onmessage: null,
      terminated: false,
      postMessage(msg) {
        setTimeout(() => {
          current = realm;
          if (!realm.terminated) globalThis.self.onmessage({ data: msg });
        }, 0);
      },
      terminate() {
        realm.terminated = true;
      },
    };
    made?.push(realm);
    return realm;
  };

  /** Equal to the bit: Object.is on every number, so 0 is not -0 and NaN is NaN. */
  const same = (a, b, where = 'result') => {
    if (typeof a === 'number' || typeof b === 'number') {
      if (!Object.is(a, b)) throw new Error(`${where}: ${a} is not ${b}`);
    } else if (a && b && typeof a === 'object') {
      expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
      for (const k of Object.keys(a)) same(a[k], b[k], `${where}.${k}`);
    } else expect([where, b]).toEqual([where, a]);
  };
  /** A realm's own clock is the one thing two runs do not share. */
  const untimed = o =>
    JSON.parse(
      JSON.stringify(o, (k, v) => (k === 'wallMs' || k === 'realmMs' ? 0 : v))
    );

  test('a fit and every profile are the shipped run’s, to the last bit, with the same progress', async () => {
    const run = async impl => {
      const progress = [];
      const out = await impl({
        request,
        data,
        spawn: spawnReal(),
        concurrency: 2,
        limits,
        onProgress: p => progress.push(p),
      }).done;
      return { out, progress };
    };
    const was = await run(legacyRun);
    const now = await run(poolRun);
    expect(was.out.status).toBe('ok');
    expect(was.out.profiles.length).toBeGreaterThanOrEqual(2);
    expect(was.out.profiles.every(p => p.status === 'ok')).toBe(true);
    same(untimed(was.out), untimed(now.out));
    expect(now.progress).toEqual(was.progress);
    // Ordered by parameter, which is the order the fit named them in.
    expect(now.out.profiles.map(p => p.parameter)).toEqual(was.out.fit.free);
  }, 120_000);

  test('a fit with no profiles asked for is the fit alone', async () => {
    const was = await legacyRun({
      request,
      data,
      spawn: spawnReal(),
      concurrency: 2,
      limits,
      profiles: false,
    }).done;
    const now = await poolRun({
      request,
      data,
      spawn: spawnReal(),
      concurrency: 2,
      limits,
      profiles: false,
    }).done;
    same(untimed(was), untimed(now));
    expect(now.profiles).toEqual([]);
  }, 60_000);

  test('a realm that fails ends the run the same way: status and reason', async () => {
    const failing = how => () => ({
      terminate() {},
      postMessage() {
        queueMicrotask(() =>
          how === 'error'
            ? this.onmessage({ data: { type: 'error', message: 'it threw' } })
            : this.onmessage({ data: { type: 'result', result: { odd: 1 } } })
        );
      },
    });
    for (const how of ['error', 'garbage']) {
      const was = await legacyRun({
        request,
        data,
        spawn: failing(how),
        concurrency: 2,
        limits,
      }).done;
      const now = await poolRun({
        request,
        data,
        spawn: failing(how),
        concurrency: 2,
        limits,
      }).done;
      expect(now).toEqual(was);
      expect(now.status).not.toBe('ok');
    }
  });

  test('a cancel mid-run terminates every realm and says canceled', async () => {
    for (const impl of [legacyRun, poolRun]) {
      const made = [];
      const spawn = () => {
        const w = {
          terminated: false,
          terminate() {
            this.terminated = true;
          },
          postMessage() {},
        };
        made.push(w);
        return w;
      };
      const job = impl({
        request,
        data,
        spawn,
        concurrency: 2,
        limits,
      });
      await flush();
      job.cancel('stop');
      const out = await job.done;
      expect(out.status).toBe('canceled');
      expect(made.every(w => w.terminated)).toBe(true);
    }
  });

  test('on one pool a newer inference supersedes the older, which ends stale', async () => {
    const { createPool } = await import('../js/workers/pool.js');
    const hang = () => ({ terminate() {}, postMessage() {} });
    const pool = createPool({ spawn: hang, concurrency: 2 });
    const first = poolRun({
      request,
      data,
      spawn: hang,
      concurrency: 2,
      limits,
      pool,
    });
    await flush();
    const second = poolRun({
      request,
      data,
      spawn: hang,
      concurrency: 2,
      limits,
      pool,
    });
    const out = await first.done;
    expect(out.status).toBe('stale');
    expect(out.error).toMatch(/superseded/);
    second.cancel();
    expect((await second.done).status).toBe('canceled');
  });

  test('what an inference realm holds is declared, in bytes, from the observation’s size', () => {
    expect(realmBytes(0, 0)).toBe(6e6);
    expect(realmBytes(50_000, 5)).toBe(6e6 + 50_000 * 8 * 14);
    // More rows or more free parameters never ask for less.
    expect(realmBytes(2000, 7)).toBeGreaterThan(realmBytes(2000, 6));
    expect(realmBytes(2001, 6)).toBeGreaterThan(realmBytes(2000, 6));
  });
});

// --- The install -------------------------------------------------------------

describe('the install', () => {
  const walk = dir =>
    readdirSync(dir).flatMap(name => {
      const p = path.posix.join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
    });
  const shipped = walk('js').filter(
    f =>
      f !== 'js/workers/pool.js' &&
      !NEVER_PRECACHED.some(re => re.test(f)) &&
      !f.startsWith('js/validation/')
  );
  const importers = shipped.filter(f =>
    /['"][./]*\/workers\/pool\.js['"]/.test(readFileSync(f, 'utf8'))
  );

  // While the adoption waits, no shipped module imports the pool and the build
  // does not install it. The day a shipped module imports it, this test fails
  // until the NEVER_PRECACHED entry and this describe's waiting half go, and
  // the bytes and requests of the change are that change's to find (and its
  // ceilings Carl's: D-R10-30).
  test('the pool is not installed while no shipped module imports it', async () => {
    expect(importers).toEqual([]);
    expect(NEVER_PRECACHED.some(re => re.test('js/workers/pool.js'))).toBe(
      true
    );
    const { paths } = await buildManifest();
    expect(paths).not.toContain('js/workers/pool.js');
  });

  test('the pool imports nothing: a realm and a page can both hold it', () => {
    expect(readFileSync('js/workers/pool.js', 'utf8')).not.toMatch(/^import /m);
  });

  test('the two adopters are the files they replace, and import only the pool and what those imported', () => {
    for (const [fixture, was] of [
      [
        'tests/fixtures/poolAdopters/scheduler.js',
        'js/experiments/scheduler.js',
      ],
      ['tests/fixtures/poolAdopters/run.js', 'js/inference/run.js'],
    ]) {
      const imports = f =>
        [...readFileSync(f, 'utf8').matchAll(/^import .* from '(.*)';$/gm)].map(
          m => path.posix.basename(m[1])
        );
      expect(imports(fixture)).toContain('pool.js');
      expect(imports(was)).not.toContain('pool.js');
    }
  });
});
