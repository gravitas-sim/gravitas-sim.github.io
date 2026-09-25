import { describe, test, expect } from '@jest/globals';

import { createScheduler, RESUMABLE } from '../js/experiments/scheduler.js';
import {
  FORMAT,
  STATUS,
  SWEEPABLE,
  defaultLimits,
  planTrials,
} from '../js/experiments/experimentManifest.js';

// =============================================================================
// The scheduler, against realms that behave and realms that do not
// -----------------------------------------------------------------------------
// Fake Workers stand in for js/experiments/experimentWorker.js, so every way a
// realm can go wrong can be staged on demand: hang, answer garbage, die, fail
// to start, answer out of order. A fake clock drives the timeouts, so the
// suite takes milliseconds and never depends on how busy the machine is.
// e2e/experimentRunner.spec.js runs the real Worker.
// =============================================================================

const manifest = (over = {}) => ({
  format: FORMAT,
  formatVersion: 1,
  title: 't',
  model: { scenario: 'Binary Planet Lab', platform: '^1.0.0' },
  initial: { settings: {} },
  seeds: ['a', 'b'],
  vary: [{ parameter: 'binary_lab_planet_a', from: 0.1, to: 0.4, count: 4 }],
  observables: {
    metrics: ['distance_to_primary'],
    roles: SWEEPABLE['Binary Planet Lab'].roles,
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

/**
 * Realms that behave as `behave(trial)` says: 'ok', 'hang', 'garbage',
 * 'error', 'crash', 'unknown', or a delay in ms before answering.
 */
function realms(behave = () => 'ok') {
  const made = [];
  let active = 0;
  let peak = 0;
  const spawn = () => {
    const w = {
      terminated: false,
      trial: null,
      terminate() {
        if (!this.terminated) active--;
        this.terminated = true;
      },
      postMessage(msg) {
        this.trial = msg.trial;
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
        else if (how === 'error')
          reply({ type: 'error', message: 'engine threw' });
        else if (how === 'unknown') reply({ type: 'weather' });
        else if (how === 'crash')
          queueMicrotask(() =>
            w.onerror?.({ message: 'realm died', preventDefault() {} })
          );
        else if (typeof how === 'number')
          setTimeout(
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
    made.push(w);
    active++;
    peak = Math.max(peak, active);
    return w;
  };
  return { spawn, made, peak: () => peak, active: () => active };
}

const run = (m, r, extra = {}) => {
  const trials = planTrials(m);
  const s = createScheduler({
    manifest: m,
    trials,
    spawn: r.spawn,
    concurrency: 3,
    ...extra,
  });
  return { s, trials, done: s.run() };
};

describe('a run that goes well', () => {
  test('every trial is measured, in planned order, one disposable realm each', async () => {
    const r = realms(trial => [30, 1, 12, 5, 0, 20, 8, 2][trial.index]);
    const { done, trials } = run(manifest(), r);
    const out = await done;
    expect(out.status).toBe('complete');
    expect(out.trials.map(t => t.index)).toEqual(trials.map(t => t.index));
    expect(out.trials.every(t => t.status === STATUS.OK)).toBe(true);
    expect(r.made).toHaveLength(trials.length);
    expect(r.made.every(w => w.terminated)).toBe(true);
  });

  test('never more realms at once than the concurrency allows', async () => {
    const r = realms(() => 3);
    await run(manifest(), r).done;
    expect(r.peak()).toBe(3);
  });

  test('the same manifest gives the same result whatever order realms finish in', async () => {
    const a = await run(
      manifest(),
      realms(t => (t.index * 7) % 5)
    ).done;
    const b = await run(
      manifest(),
      realms(t => 5 - ((t.index * 3) % 5))
    ).done;
    expect(JSON.stringify(a.trials)).toBe(JSON.stringify(b.trials));
  });

  test('progress rises to the whole, and says how many are running', async () => {
    const seen = [];
    const r = realms(() => 1);
    await run(manifest(), r, { onProgress: s => seen.push(s) }).done;
    expect(seen.at(-1).fraction).toBe(1);
    expect(Math.max(...seen.map(s => s.running.length))).toBeLessThanOrEqual(3);
    const done = seen.map(s => s.done);
    expect(done).toEqual([...done].sort((x, y) => x - y));
  });
});

describe('realms that misbehave', () => {
  test('garbage, an unknown message, an error and a crash are four statuses, not exceptions', async () => {
    const how = [
      'garbage',
      'unknown',
      'error',
      'crash',
      'ok',
      'ok',
      'ok',
      'ok',
    ];
    const r = realms(t => how[t.index]);
    const out = await run(manifest(), r).done;
    expect(out.trials.map(t => t.status).slice(0, 5)).toEqual([
      STATUS.CORRUPT,
      STATUS.CORRUPT,
      STATUS.WORKER_FAILED,
      STATUS.WORKER_FAILED,
      STATUS.OK,
    ]);
    expect(out.trials[2].error).toBe('engine threw');
    expect(out.status).toBe('complete');
    expect(r.made.every(w => w.terminated)).toBe(true);
  });

  test('a realm that cannot be started is reported, and the run goes on', async () => {
    let n = 0;
    const r = realms();
    const spawn = () => {
      if (n++ === 1) throw new Error('no workers here');
      return r.spawn();
    };
    const out = await run(manifest(), { spawn }).done;
    expect(out.trials[1]).toMatchObject({
      status: STATUS.WORKER_FAILED,
      error: 'no workers here',
    });
    expect(out.trials.filter(t => t.status === STATUS.OK)).toHaveLength(7);
  });

  test('a trial past its time limit is terminated and reported', async () => {
    const clock = fakeTime();
    const r = realms(t => (t.index === 2 ? 'hang' : 'ok'));
    const { done } = run(manifest({ trialTimeoutMs: 5000 }), r, clock);
    await new Promise(res => setTimeout(res, 5));
    clock.advance(5000);
    const out = await done;
    expect(out.trials[2]).toMatchObject({ status: STATUS.TIMEOUT });
    expect(out.trials[2].error).toMatch(/5000 ms/);
    expect(r.made.find(w => w.trial.index === 2).terminated).toBe(true);
    expect(out.status).toBe('complete');
  });

  test('a run past its own limit stops, keeps what finished, and says why', async () => {
    const clock = fakeTime();
    const r = realms(t => (t.index < 2 ? 'ok' : 'hang'));
    const { done } = run(manifest({ totalTimeoutMs: 60000 }), r, clock);
    await new Promise(res => setTimeout(res, 5));
    clock.advance(60000);
    const out = await done;
    expect(out.status).toBe('partial');
    expect(out.stopReason).toMatch(/60000 ms/);
    expect(out.trials.map(t => t.status)).toEqual([
      STATUS.OK,
      STATUS.OK,
      STATUS.TIMEOUT,
      STATUS.TIMEOUT,
      STATUS.TIMEOUT,
      STATUS.CANCELED,
      STATUS.CANCELED,
      STATUS.CANCELED,
    ]);
    expect(r.active()).toBe(0);
  });

  test('a result that would take the run past its byte budget keeps its status and loses its numbers', async () => {
    // Sized as the scheduler keeps it: the realm's answer and how long the
    // realm lived, which here is well under 1000 ms.
    const size = JSON.stringify({
      ...answer(planTrials(manifest())[0]),
      realmMs: 999,
    }).length;
    const r = realms(() => 1);
    const out = await run(manifest({ maxResultBytes: size * 3 + 10 }), r).done;
    const statuses = out.trials.map(t => t.status);
    expect(statuses.filter(s => s === STATUS.OK)).toHaveLength(3);
    expect(statuses.filter(s => s === STATUS.RESOURCE_LIMIT)).toHaveLength(5);
    expect(out.bytes).toBeLessThanOrEqual(size * 3 + 10 + 5 * 400);
    expect(
      out.trials.find(t => t.status === STATUS.RESOURCE_LIMIT).results
    ).toEqual({});
  });
});

describe('stopping and picking up again', () => {
  test('cancel terminates every realm and reports every queued trial', async () => {
    const r = realms(() => 'hang');
    const { s, done } = run(manifest(), r);
    await new Promise(res => setTimeout(res, 5));
    s.cancel('stopped by a test');
    const out = await done;
    expect(out.status).toBe('canceled');
    expect(out.stopReason).toBe('stopped by a test');
    expect(out.trials.every(t => t.status === STATUS.CANCELED)).toBe(true);
    expect(r.made).toHaveLength(3);
    expect(r.made.every(w => w.terminated)).toBe(true);
  });

  test('a checkpoint’s finished trials are not run again; its scheduling failures are', async () => {
    const m = manifest();
    const trials = planTrials(m);
    const completed = [
      answer(trials[0]),
      { ...answer(trials[1]), status: STATUS.LOST_BODY },
      { ...answer(trials[2]), status: STATUS.TIMEOUT },
      { ...answer(trials[3]), status: STATUS.CANCELED },
      { ...answer(trials[4]), index: 99 },
    ];
    const r = realms();
    const out = await createScheduler({
      manifest: m,
      trials,
      spawn: r.spawn,
      concurrency: 2,
      completed,
    }).run();
    expect(out.resumed).toEqual([0, 1]);
    expect(r.made.map(w => w.trial.index).sort()).toEqual([2, 3, 4, 5, 6, 7]);
    expect(out.trials[1].status).toBe(STATUS.LOST_BODY);
    expect(RESUMABLE).not.toContain(STATUS.TIMEOUT);
  });

  test('a scheduler runs once', async () => {
    const { s, done } = run(manifest(), realms());
    await done;
    expect(() => s.run()).toThrow(/runs once/);
  });
});
