import { describe, test, expect } from '@jest/globals';
import { MessageChannel } from 'node:worker_threads';

import {
  JOB,
  adoptRealm,
  createLedger,
  createPool,
  ledger as pageLedger,
  sizeOf,
} from '../js/workers/pool.js';
import { stream } from '../js/random/streams.js';
import { PROFILES } from '../js/experiments/experimentManifest.js';
import { measure, readDataBudget } from '../tools/data-budget.mjs';
import { readFileSync } from 'node:fs';

// =============================================================================
// The Worker pool contract (Prompt 153, WORKER_POOL.md)
// -----------------------------------------------------------------------------
// Fake realms stand in for Workers so every way one can behave is staged on
// demand: hang, answer garbage, die, answer late, answer out of order. A fake
// clock drives the timeouts, so the suite takes milliseconds and never depends
// on how busy the machine is. e2e/inference.spec.js runs real Workers.
// =============================================================================

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

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

/**
 * Realms that behave as `how(message)` says: 'ok' (answers at once), 'hang',
 * 'garbage', 'error', 'crash', or 'manual' (the test answers by hand through
 * `made[i].answer(...)`). Records what each was sent.
 */
function realms(how = () => 'ok') {
  const made = [];
  let active = 0;
  let peak = 0;
  const spawn = () => {
    const w = {
      terminated: false,
      sent: null,
      transferred: null,
      terminate() {
        if (!this.terminated) active--;
        this.terminated = true;
      },
      /** Deliver a message even if terminated: how a late answer arrives. */
      answer(data) {
        w.onmessage?.({ data });
      },
      postMessage(msg, transfer) {
        w.sent = msg;
        w.transferred = transfer ?? null;
        const mode = how(msg);
        const reply = data =>
          queueMicrotask(() => !w.terminated && w.onmessage?.({ data }));
        if (mode === 'ok')
          reply({
            type: 'result',
            result: { index: msg.index, status: 'ok', value: msg.index * 10 },
          });
        else if (mode === 'garbage')
          reply({ type: 'result', result: { nonsense: true } });
        else if (mode === 'error') reply({ type: 'error', message: 'threw' });
        else if (mode === 'crash')
          queueMicrotask(() =>
            w.onerror?.({ message: 'realm died', preventDefault() {} })
          );
        // 'hang' and 'manual': nothing.
      },
    };
    made.push(w);
    active++;
    peak = Math.max(peak, active);
    return w;
  };
  return { spawn, made, peak: () => peak, active: () => active };
}

const accept = (r, job) => r?.index === job.index && r.status === 'ok';
const jobs = (n, extra = () => ({})) =>
  Array.from({ length: n }, (_, index) => ({ index, ...extra(index) }));

describe('the ledger', () => {
  test('counts what is held, whoever holds it, and says what fits', () => {
    const book = createLedger({ memoryBytes: 100, realms: 3 });
    expect(book.fits(100)).toBe(true);
    expect(book.fits(101)).toBe(false);
    const a = book.hold('physics', 60);
    expect(book.snapshot()).toMatchObject({ bytes: 60, realms: 1 });
    expect(book.fits(40)).toBe(true);
    expect(book.fits(41)).toBe(false);
    // The caps alone could admit 41; the page's holdings are why it waits.
    expect(book.possible(41)).toBe(true);
    expect(book.possible(101)).toBe(false);
    a();
    a();
    expect(book.snapshot()).toMatchObject({ bytes: 0, realms: 0 });
    book.hold('a', 0);
    book.hold('b', 0);
    book.hold('c', 0);
    expect(book.fits(0)).toBe(false);
  });

  test('tells a watcher when something is released or the caps change', () => {
    const book = createLedger({ memoryBytes: 10 });
    let told = 0;
    const stop = book.watch(() => told++);
    const r = book.hold('x', 5);
    expect(told).toBe(0);
    r();
    expect(told).toBe(1);
    book.configure({ memoryBytes: 20 });
    expect(told).toBe(2);
    stop();
    book.configure({ memoryBytes: 30 });
    expect(told).toBe(2);
  });

  test('the page has one, unlimited until a page configures it', () => {
    expect(pageLedger.snapshot().limit).toEqual({
      memoryBytes: Infinity,
      realms: Infinity,
    });
  });

  test('adoptRealm puts a Worker that is not the pool’s on the ledger until it ends', () => {
    const book = createLedger({ memoryBytes: 100 });
    let ended = 0;
    const worker = { terminate: () => ended++ };
    adoptRealm(worker, 'physics', 70, book);
    expect(book.snapshot().holders).toEqual([
      { owner: 'physics', bytes: 70, realms: 1 },
    ]);
    worker.terminate();
    expect(ended).toBe(1);
    expect(book.snapshot().bytes).toBe(0);
  });
});

describe('a run of jobs', () => {
  test('runs at most `concurrency` realms at once and reports by index', async () => {
    const r = realms(() => 'manual');
    const pool = createPool({ spawn: r.spawn, concurrency: 2 });
    const run = pool.batch(jobs(5), { accept });
    const done = run.run();
    expect(r.made).toHaveLength(2);
    expect(run.state()).toMatchObject({ queued: 3, total: 5 });
    // Answer out of order: 1 before 0, and so on.
    for (const i of [1, 0, 3, 2, 4]) {
      while (!r.made.some(w => w.sent?.index === i && !w.terminated))
        await flush();
      const w = r.made.find(x => x.sent?.index === i);
      w.answer({
        type: 'result',
        result: { index: i, status: 'ok', value: i },
      });
    }
    const out = await done;
    expect(out.status).toBe('complete');
    expect(out.trials.map(t => t.value)).toEqual([0, 1, 2, 3, 4]);
    expect(r.peak()).toBe(2);
    expect(r.active()).toBe(0);
  });

  test('a job that fails, answers garbage or dies is a status, not an exception', async () => {
    const r = realms(m => ['error', 'garbage', 'crash'][m.index] || 'ok');
    const pool = createPool({ spawn: r.spawn, concurrency: 4 });
    const out = await pool
      .batch(jobs(4), {
        accept,
        outcome: (j, status, extra) => ({ index: j.index, status, ...extra }),
      })
      .run();
    expect(out.trials.map(t => t.status)).toEqual([
      JOB.WORKER_FAILED,
      JOB.CORRUPT,
      JOB.WORKER_FAILED,
      JOB.OK,
    ]);
    expect(out.trials[0].error).toBe('threw');
    expect(out.trials[2].error).toBe('realm died');
  });

  test('a realm that cannot be made is a failed job, and the rest run', async () => {
    let n = 0;
    const r = realms();
    const spawn = () => {
      if (n++ === 1) throw new Error('no worker for you');
      return r.spawn();
    };
    const out = await createPool({ spawn, concurrency: 1 })
      .batch(jobs(3), { accept })
      .run();
    expect(out.trials.map(t => t.status)).toEqual([
      JOB.OK,
      JOB.WORKER_FAILED,
      JOB.OK,
    ]);
  });

  test('a job past its limit is terminated, and the whole run has its own limit', async () => {
    const t = fakeTime();
    const r = realms(m => (m.index < 2 ? 'ok' : 'hang'));
    const pool = createPool({
      spawn: r.spawn,
      concurrency: 2,
      now: t.now,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    });
    const run = pool.batch(jobs(5), {
      accept,
      jobTimeoutMs: 1000,
      totalTimeoutMs: 5000,
    });
    const done = run.run();
    await flush();
    t.advance(1000);
    await flush();
    expect(run.state().running.map(x => x.index)).toEqual([4]);
    t.advance(1000);
    const out = await done;
    expect(out.trials.map(x => x.status)).toEqual([
      JOB.OK,
      JOB.OK,
      JOB.TIMEOUT,
      JOB.TIMEOUT,
      JOB.TIMEOUT,
    ]);
    expect(r.active()).toBe(0);
    // The run's own limit: what is still running is timed out, the queued are canceled.
    const r2 = realms(() => 'hang');
    const run2 = createPool({
      spawn: r2.spawn,
      concurrency: 1,
      now: t.now,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    }).batch(jobs(3), { accept, jobTimeoutMs: 9000, totalTimeoutMs: 100 });
    const done2 = run2.run();
    t.advance(100);
    const out2 = await done2;
    expect(out2.status).toBe('partial');
    expect(out2.stopReason).toMatch(/100 ms/);
    expect(out2.trials.map(x => x.status)).toEqual([
      JOB.TIMEOUT,
      JOB.CANCELED,
      JOB.CANCELED,
    ]);
  });

  test('a limit that is not a number sets no timer (setTimeout(Infinity) fires at once)', async () => {
    const t = fakeTime();
    let timers = 0;
    const r = realms(() => 'manual');
    const run = createPool({
      spawn: r.spawn,
      concurrency: 1,
      now: t.now,
      setTimer: (fn, ms) => {
        timers++;
        return t.setTimer(fn, ms);
      },
      clearTimer: t.clearTimer,
    }).batch(jobs(1), { accept });
    const done = run.run();
    t.advance(1e12);
    expect(run.state().state).toBe('running');
    expect(timers).toBe(0);
    r.made[0].answer({ type: 'result', result: { index: 0, status: 'ok' } });
    expect((await done).status).toBe('complete');
  });

  test('a job may carry its own time limit', async () => {
    const t = fakeTime();
    const r = realms(() => 'hang');
    const run = createPool({
      spawn: r.spawn,
      concurrency: 2,
      now: t.now,
      setTimer: t.setTimer,
      clearTimer: t.clearTimer,
    }).batch([{ index: 0, timeoutMs: 50 }, { index: 1 }], {
      accept,
      jobTimeoutMs: 1000,
      totalTimeoutMs: 1e9,
    });
    run.run();
    t.advance(50);
    await flush();
    expect(run.state().running.map(x => x.index)).toEqual([1]);
  });

  test('cancel terminates every realm, keeps what finished and releases the ledger', async () => {
    const book = createLedger({ memoryBytes: 1000 });
    const r = realms(m => (m.index === 0 ? 'ok' : 'hang'));
    const pool = createPool({ spawn: r.spawn, concurrency: 2, book });
    const run = pool.batch(
      jobs(4, () => ({ memoryBytes: 100 })),
      { accept }
    );
    const done = run.run();
    await flush();
    expect(book.snapshot().bytes).toBe(100 * run.state().running.length);
    run.cancel('enough');
    const out = await done;
    expect(out.status).toBe('canceled');
    expect(out.stopReason).toBe('enough');
    expect(out.trials.map(x => x.status)).toEqual([
      JOB.OK,
      JOB.CANCELED,
      JOB.CANCELED,
      JOB.CANCELED,
    ]);
    expect(r.active()).toBe(0);
    expect(book.snapshot()).toMatchObject({ bytes: 0, realms: 0 });
    expect(() => run.run()).toThrow(/runs once/);
  });

  test('progress is the fraction of the run, from each realm and each outcome', async () => {
    const r = realms(() => 'manual');
    const seen = [];
    const run = createPool({ spawn: r.spawn, concurrency: 2 }).batch(jobs(2), {
      accept,
      onProgress: s => seen.push(s.fraction),
    });
    const done = run.run();
    r.made[0].answer({ type: 'progress', fraction: 0.5 });
    r.made[1].answer({ type: 'progress', fraction: 7 });
    expect(run.state().fraction).toBe((0.5 + 1) / 2);
    r.made[0].answer({ type: 'result', result: { index: 0, status: 'ok' } });
    r.made[1].answer({ type: 'result', result: { index: 1, status: 'ok' } });
    await done;
    expect(seen.at(-1)).toBe(1);
  });

  test('a run that was resumed does not run its finished jobs again', async () => {
    const r = realms();
    const run = createPool({ spawn: r.spawn, concurrency: 2 }).batch(jobs(3), {
      accept,
      completed: [{ index: 1, status: 'ok', value: 'kept' }],
    });
    const out = await run.run();
    expect(out.resumed).toEqual([1]);
    expect(out.trials.map(x => x.value)).toEqual([0, 'kept', 20]);
    expect(r.made).toHaveLength(2);
  });
});

describe('memory and concurrency caps', () => {
  test('the aggregate cap holds the run back, whatever the concurrency says', async () => {
    const book = createLedger({ memoryBytes: 100 });
    const r = realms(() => 'manual');
    const pool = createPool({ spawn: r.spawn, concurrency: 5, book });
    const run = pool.batch(
      jobs(4, () => ({ memoryBytes: 40 })),
      { accept }
    );
    const done = run.run();
    expect(r.made).toHaveLength(2);
    expect(book.snapshot().bytes).toBe(80);
    expect(run.state()).toMatchObject({ queued: 2, heldBytes: 80 });
    for (let i = 0; i < 4; i++) {
      while (!r.made[i]) await flush();
      r.made[i].answer({
        type: 'result',
        result: { index: r.made[i].sent.index, status: 'ok' },
      });
    }
    const out = await done;
    expect(out.status).toBe('complete');
    expect(r.peak()).toBe(2);
    expect(book.snapshot().bytes).toBe(0);
  });

  test('the aggregate cap is the page’s: a Worker the pool did not start counts', async () => {
    const book = createLedger({ memoryBytes: 100 });
    const physics = { terminate() {} };
    adoptRealm(physics, 'physics', 70, book);
    const r = realms();
    const run = createPool({ spawn: r.spawn, concurrency: 4, book }).batch(
      jobs(2, () => ({ memoryBytes: 50 })),
      { accept }
    );
    const done = run.run();
    await flush();
    // 70 held elsewhere: not even one 50-byte job fits.
    expect(r.made).toHaveLength(0);
    expect(run.state()).toMatchObject({ queued: 2, running: [] });
    physics.terminate();
    const out = await done;
    expect(out.status).toBe('complete');
    expect(r.peak()).toBe(2);
  });

  test('the aggregate concurrency cap counts every Worker too', async () => {
    const book = createLedger({ realms: 2 });
    adoptRealm({ terminate() {} }, 'chart', 0, book);
    const r = realms(() => 'manual');
    const run = createPool({ spawn: r.spawn, concurrency: 8, book }).batch(
      jobs(3),
      { accept }
    );
    run.run();
    expect(r.made).toHaveLength(1);
  });

  test('one pool’s own memory share holds across its runs', async () => {
    const r = realms(() => 'manual');
    const pool = createPool({
      spawn: r.spawn,
      concurrency: 9,
      memoryBytes: 100,
      defaultJobBytes: 40,
    });
    pool.batch(jobs(2), { accept }).run();
    pool.batch([{ index: 0 }], { accept }).run();
    expect(r.made).toHaveLength(2);
  });

  test('a job over the per-job cap, or one no wait could admit, is refused outright and never spawned', async () => {
    const book = createLedger({ memoryBytes: 300 });
    const r = realms();
    const pool = createPool({
      spawn: r.spawn,
      concurrency: 2,
      jobBytes: 200,
      book,
    });
    const out = await pool
      .batch(
        [
          { index: 0, memoryBytes: 100 },
          { index: 1, memoryBytes: 250 },
          { index: 2, memoryBytes: 301 },
        ],
        { accept }
      )
      .run();
    expect(out.trials.map(x => x.status)).toEqual([
      JOB.OK,
      JOB.RESOURCE_LIMIT,
      JOB.RESOURCE_LIMIT,
    ]);
    expect(out.trials[1].error).toMatch(/250 bytes/);
    expect(r.made).toHaveLength(1);
  });

  test('a declaration that is not a number is refused, not waited on forever', async () => {
    const r = realms();
    const out = await createPool({ spawn: r.spawn, concurrency: 1 })
      .batch(
        [
          { index: 0, memoryBytes: NaN },
          { index: 1, memoryBytes: -1 },
        ],
        {
          accept,
        }
      )
      .run();
    expect(out.trials.map(x => x.status)).toEqual([
      JOB.RESOURCE_LIMIT,
      JOB.RESOURCE_LIMIT,
    ]);
    expect(r.made).toHaveLength(0);
  });

  test('the caps are the data budget’s: the low-end profile refuses what its ceiling forbids', async () => {
    const low = PROFILES['low-end'];
    const budget = readDataBudget();
    const ceiling = key => budget.ceilings.find(c => c.key === key).ceiling;
    expect(low.maxConcurrency).toBe(ceiling('workerConcurrencyLowEnd'));
    expect(low.maxMemoryBytes).toBe(ceiling('workerMemoryBytesLowEnd'));
    const m = measure();
    expect(m.workerConcurrencyLowEnd).toBe(low.maxConcurrency);
    expect(m.workerMemoryBytesLowEnd).toBe(low.maxMemoryBytes);
    const book = createLedger({
      memoryBytes: low.maxMemoryBytes,
      realms: low.maxConcurrency,
    });
    const r = realms();
    const out = await createPool({
      spawn: r.spawn,
      concurrency: 8,
      book,
    })
      .batch(
        [
          { index: 0, memoryBytes: low.maxMemoryBytes },
          { index: 1, memoryBytes: low.maxMemoryBytes + 1 },
        ],
        { accept }
      )
      .run();
    expect(out.trials.map(x => x.status)).toEqual([JOB.OK, JOB.RESOURCE_LIMIT]);
  });

  test('results are sized by their bytes: a typed array counts for what it holds', () => {
    expect(sizeOf({ a: 1 })).toBe(JSON.stringify({ a: 1 }).length);
    expect(sizeOf({ a: new Float64Array(1000) })).toBe(
      JSON.stringify({ a: 0 }).length + 8000
    );
    expect(sizeOf({ b: new ArrayBuffer(10) })).toBe(
      JSON.stringify({ b: 0 }).length + 10
    );
  });

  test('a result that would take the run past its byte cap keeps its status and loses its numbers', async () => {
    const r = realms(() => 'manual');
    const run = createPool({ spawn: r.spawn, concurrency: 1 }).batch(jobs(2), {
      accept,
      maxResultBytes: 5000,
      outcome: (j, status, extra) => ({ index: j.index, status, ...extra }),
    });
    const done = run.run();
    r.made[0].answer({
      type: 'result',
      result: { index: 0, status: 'ok', samples: new Float64Array(1000) },
    });
    await flush();
    r.made[1].answer({ type: 'result', result: { index: 1, status: 'ok' } });
    const out = await done;
    expect(out.trials[0].status).toBe(JOB.RESOURCE_LIMIT);
    expect(out.trials[0].samples).toBeUndefined();
    expect(out.trials[1].status).toBe('ok');
  });
});

describe('deterministic scheduling', () => {
  const order = async (deterministic, ledgerBytes = 100) => {
    const book = createLedger({ memoryBytes: ledgerBytes });
    const r = realms(() => 'manual');
    const run = createPool({ spawn: r.spawn, concurrency: 3, book }).batch(
      [
        { index: 0, memoryBytes: 60 },
        { index: 1, memoryBytes: 60 },
        { index: 2, memoryBytes: 30 },
      ],
      { accept, deterministic }
    );
    const done = run.run();
    const started = () => r.made.map(w => w.sent.index);
    const first = started();
    const answer = i => {
      const w = r.made.find(x => x.sent.index === i);
      w.answer({ type: 'result', result: { index: i, status: 'ok' } });
    };
    answer(0);
    await flush();
    const second = started();
    answer(1);
    await flush();
    answer(2);
    await done;
    return { first, second };
  };

  test('without it a job that fits is backfilled past one that does not', async () => {
    const o = await order(false);
    expect(o.first).toEqual([0, 2]);
    expect(o.second).toEqual([0, 2, 1]);
  });

  test('with it nothing passes a job that is waiting, so the start order is the submission order', async () => {
    const o = await order(true);
    expect(o.first).toEqual([0]);
    expect(o.second).toEqual([0, 1, 2]);
  });

  test('a deterministic job does not pass an earlier one that waits, either', async () => {
    const book = createLedger({ memoryBytes: 100 });
    const r = realms(() => 'manual');
    const run = createPool({ spawn: r.spawn, concurrency: 3, book }).batch(
      [
        { index: 0, memoryBytes: 60 },
        { index: 1, memoryBytes: 60 },
        { index: 2, memoryBytes: 30, deterministic: true },
      ],
      { accept }
    );
    run.run();
    expect(r.made.map(w => w.sent.index)).toEqual([0]);
  });

  test('two runs of one set of jobs report the same outcomes whatever order the realms finish in', async () => {
    const t = fakeTime();
    const once = async delays => {
      const r = realms(() => 'manual');
      const run = createPool({
        spawn: r.spawn,
        concurrency: 3,
        now: t.now,
        setTimer: t.setTimer,
        clearTimer: t.clearTimer,
      }).batch(jobs(3), { accept, deterministic: true });
      const done = run.run();
      for (const i of delays)
        r.made
          .find(w => w.sent.index === i)
          .answer({ type: 'result', result: { index: i, status: 'ok', v: i } });
      return (await done).trials.map(x => x.v);
    };
    expect(await once([0, 1, 2])).toEqual(await once([2, 0, 1]));
  });
});

describe('generations and stale results', () => {
  test('a newer run on a channel ends the older one, its unfinished jobs stale', async () => {
    const r = realms(() => 'manual');
    const pool = createPool({ spawn: r.spawn, concurrency: 1 });
    const first = pool.batch(jobs(2), { accept, channel: 'fit' });
    const firstDone = first.run();
    expect(pool.generation('fit')).toBe(first.state().generation);
    const second = pool.batch(jobs(1), { accept, channel: 'fit' });
    const secondDone = second.run();
    const a = await firstDone;
    expect(a.status).toBe('canceled');
    expect(a.stopReason).toMatch(/superseded by generation/);
    expect(a.trials.map(x => x.status)).toEqual([JOB.STALE, JOB.STALE]);
    expect(r.made[0].terminated).toBe(true);
    expect(second.state().generation).toBeGreaterThan(first.state().generation);
    expect(pool.generation('fit')).toBe(second.state().generation);
    r.made[1].answer({ type: 'result', result: { index: 0, status: 'ok' } });
    expect((await secondDone).trials[0].status).toBe('ok');
    expect(pool.generation('fit')).toBe(0);
  });

  test('what the superseded run’s realm says afterwards is dropped, and counted', async () => {
    const r = realms(() => 'manual');
    const pool = createPool({ spawn: r.spawn, concurrency: 1 });
    const first = pool.batch(jobs(1), { accept, channel: 'fit' });
    const firstDone = first.run();
    const stale = r.made[0];
    pool.batch(jobs(1), { accept, channel: 'fit' }).run();
    await firstDone;
    expect(pool.stats().suppressed).toBe(0);
    stale.answer({
      type: 'result',
      result: { index: 0, status: 'ok', v: 'old' },
    });
    stale.answer({ type: 'progress', fraction: 0.5 });
    expect(pool.stats().suppressed).toBe(2);
    expect(first.state().done).toBe(1);
  });

  test('supersede() ends the channel’s run without a successor', async () => {
    const r = realms(() => 'hang');
    const pool = createPool({ spawn: r.spawn, concurrency: 1 });
    const done = pool.batch(jobs(2), { accept, channel: 'grid' }).run();
    pool.supersede('grid', 'the slider moved');
    const out = await done;
    expect(out.stopReason).toBe('the slider moved');
    expect(out.trials.map(x => x.status)).toEqual([JOB.STALE, JOB.STALE]);
  });

  test('runs with no channel never supersede each other', async () => {
    const r = realms(() => 'manual');
    const pool = createPool({ spawn: r.spawn, concurrency: 2 });
    pool.batch(jobs(1), { accept }).run();
    pool.batch(jobs(1), { accept }).run();
    expect(r.made.every(w => !w.terminated)).toBe(true);
  });

  test('a realm that echoes its job and generation must echo the right ones', async () => {
    const r = realms(() => 'manual');
    const pool = createPool({ spawn: r.spawn, concurrency: 3 });
    const run = pool.batch(jobs(3), { accept });
    const done = run.run();
    const sent = r.made.map(w => w.sent);
    expect(sent[0]).toMatchObject({ type: 'run', index: 0 });
    expect(sent[0].jobId).toBe(`${sent[0].generation}.0`);
    r.made[0].answer({
      type: 'result',
      result: {
        index: 0,
        status: 'ok',
        jobId: sent[0].jobId,
        generation: sent[0].generation,
      },
    });
    r.made[1].answer({
      type: 'result',
      result: {
        index: 1,
        status: 'ok',
        jobId: sent[1].jobId,
        generation: sent[1].generation + 1,
      },
    });
    r.made[2].answer({
      type: 'result',
      result: { index: 2, status: 'ok', jobId: 'someone else' },
    });
    const out = await done;
    expect(out.trials.map(x => x.status)).toEqual([
      'ok',
      JOB.CORRUPT,
      JOB.CORRUPT,
    ]);
  });
});

describe('transfer ownership', () => {
  test('a job’s buffers move into its realm, and the caller no longer owns them', async () => {
    const buffer = new Float64Array([1, 2, 3, 4]).buffer;
    const seen = [];
    const spawn = () => {
      const w = {
        terminate() {},
        postMessage(msg, transfer) {
          // What a real Worker does: the message is cloned, the buffer moves.
          const { port1, port2 } = new MessageChannel();
          port2.once('message', copy => {
            seen.push(copy);
            port1.close();
            port2.close();
            w.onmessage({
              data: {
                type: 'result',
                result: {
                  index: 0,
                  status: 'ok',
                  sum: new Float64Array(copy.payload.buffer).reduce(
                    (a, b) => a + b
                  ),
                },
              },
            });
          });
          port1.postMessage(msg, transfer);
        },
      };
      return w;
    };
    const out = await createPool({ spawn })
      .batch([{ index: 0, payload: { buffer }, transfer: [buffer] }], {
        accept,
      })
      .run();
    expect(buffer.byteLength).toBe(0);
    expect(seen[0].payload.buffer.byteLength).toBe(32);
    expect(out.trials[0].sum).toBe(10);
  });

  test('a job with nothing to transfer is posted with the message alone', async () => {
    const r = realms();
    await createPool({ spawn: r.spawn }).batch(jobs(1), { accept }).run();
    expect(r.made[0].transferred).toBeNull();
  });
});

describe('a stream for each job', () => {
  test('a job’s realm is told the fork of the stream its index names, and draws what the fork draws', async () => {
    const r = realms(() => 'manual');
    const run = createPool({ spawn: r.spawn, concurrency: 3 }).batch(
      jobs(3, () => ({
        stream: { id: 'noise', seed: 'obs-7', labels: ['profile'] },
      })),
      { accept }
    );
    run.run();
    for (const w of r.made) {
      const s = w.sent.stream;
      expect(s).toEqual({
        id: 'noise',
        seed: 'obs-7',
        labels: ['profile', w.sent.index],
      });
      const inRealm = stream(s.id, s.seed, ...s.labels);
      const forked = stream('noise', 'obs-7', 'profile').fork(w.sent.index);
      expect(inRealm.stream.key).toBe(forked.stream.key);
      expect([inRealm(), inRealm(), inRealm()]).toEqual([
        forked(),
        forked(),
        forked(),
      ]);
    }
    // Different jobs, different draws; and not the parent's.
    const draws = r.made.map(w =>
      stream(
        ...[w.sent.stream.id, w.sent.stream.seed, ...w.sent.stream.labels]
      )()
    );
    expect(new Set(draws).size).toBe(3);
  });

  test('the draws do not depend on which job a realm runs first', async () => {
    const draw = index => stream('noise', 's', 'g', index)();
    const forward = [0, 1, 2].map(draw);
    const backward = [2, 1, 0].map(draw).reverse();
    expect(backward).toEqual(forward);
  });
});

describe('the recorded probe (tools/worker-probe.mjs)', () => {
  const probe = JSON.parse(
    readFileSync(
      new URL('../tools/worker-probe-results.json', import.meta.url),
      'utf8'
    )
  );
  const budget = readDataBudget();
  const ceiling = key => budget.ceilings.find(c => c.key === key).ceiling;

  test('the Observatory with its largest pack open holds no Worker', () => {
    for (const name of ['low-end', 'desktop'])
      expect(probe.observatory[name].workersWithLargestOpen).toBe(0);
  });

  test('a profile run stays inside the caps: realms at once, and the aggregate bytes', () => {
    const low = probe.profileRun['low-end'];
    expect(low.peakRealmsAtOnce).toBeLessThanOrEqual(
      ceiling('workerConcurrencyLowEnd')
    );
    expect(low.concurrency).toBeLessThanOrEqual(
      ceiling('workerConcurrencyLowEnd')
    );
    expect(low.aggregatePeakHeldMB * 1e6).toBeLessThan(
      ceiling('workerMemoryBytesLowEnd')
    );
    const desktop = probe.profileRun.desktop;
    expect(desktop.peakRealmsAtOnce).toBeLessThanOrEqual(
      PROFILES.desktop.maxConcurrency
    );
    expect(desktop.aggregatePeakHeldMB * 1e6).toBeLessThan(
      PROFILES.desktop.maxMemoryBytes
    );
    // Every realm was seen: the fit, then one profile per fitted parameter.
    expect(low.realmsSampled).toBe(low.realmsSeen);
  });

  test('what a first visit leaves is under the storage ceiling, and the data budget reads it', () => {
    expect(probe.storage.usageBytes).toBeLessThan(
      ceiling('indexedDbAndCacheBytes')
    );
    expect(measure().indexedDbAndCacheBytes).toBe(probe.storage.usageBytes);
  });

  test('it says when and on what it was taken', () => {
    expect(probe.measuredAt).toMatch(/^[0-9a-f]{7,}$/);
    expect(probe.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(probe.environment.chromium).toBeTruthy();
  });
});
