// =============================================================================
// The engine's events and step listeners (D-DECOMP-18, slice S2)
// -----------------------------------------------------------------------------
// js/engine/events.js owns the collision and merger announcements, the worker
// failure notice and the step listeners; js/physics.js re-exports
// `onPhysicsStep` and `simulation`. What has to hold is that the same events
// fire with the same payloads in the same order as before the move.
// tests/fixtures/engineEventsGolden.json was recorded on the commit before the
// move from tools/events-trace.mjs (four scenarios, seeded, 1,500 steps, the
// clocks pinned): the order of the window events, the counts, the first
// payload of each kind and a hash of the whole trace.
// =============================================================================

import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as physics from '../js/physics.js';
import * as events from '../js/engine/events.js';

const golden = JSON.parse(
  readFileSync(
    new URL('./fixtures/engineEventsGolden.json', import.meta.url),
    'utf8'
  )
);

const trace = (key, seed) =>
  execFileSync(
    process.execPath,
    [
      new URL('../tools/events-trace.mjs', import.meta.url).pathname,
      key,
      String(seed),
      '1500',
    ],
    { maxBuffer: 1 << 28, encoding: 'utf8' }
  );

describe('the events fire as they did before the move', () => {
  for (const id of Object.keys(golden)) {
    const [key, seed] = id.split(':');
    test(`${key}: order, counts, first payloads and the whole trace`, () => {
      const text = trace(key, seed);
      const t = JSON.parse(text);
      const want = golden[id];
      const counts = {};
      const first = {};
      for (const e of t.events) {
        counts[e.name] = (counts[e.name] || 0) + 1;
        if (e.at === 'window' && !(e.name in first)) first[e.name] = e.detail;
      }
      expect(t.events.filter(e => e.at === 'window').map(e => e.name)).toEqual(
        want.order
      );
      expect(counts).toEqual(want.counts);
      expect(t.merges.length).toBe(want.mergeLog);
      expect(t.listenerCalls).toBe(want.listenerCalls);
      expect(first).toEqual(want.first);
      expect(createHash('sha256').update(text).digest('hex')).toBe(want.sha256);
    }, 120000);
  }

  test('the goldens cover a merger, a collision and a mixed order', () => {
    const names = new Set(Object.values(golden).flatMap(g => g.order));
    expect(names).toEqual(
      new Set(['gravitasSimulationReset', 'gravitasMerge', 'gravitasCollision'])
    );
  });
});

describe('the facade re-exports the events module', () => {
  test('onPhysicsStep and simulation are the module own', () => {
    expect(physics.onPhysicsStep).toBe(events.onPhysicsStep);
    expect(physics.simulation).toBe(events.simulation);
  });
});

describe('step listeners', () => {
  afterEach(() => jest.restoreAllMocks());

  test('run in subscription order with (dt, simulationTime)', () => {
    const calls = [];
    const offA = events.onPhysicsStep((dt, t) => calls.push(['a', dt, t]));
    const offB = events.onPhysicsStep((dt, t) => calls.push(['b', dt, t]));
    events.runStepListeners(0.01, 4.5);
    offA();
    events.runStepListeners(0.02, 4.51);
    offB();
    events.runStepListeners(0.03, 4.52);
    expect(calls).toEqual([
      ['a', 0.01, 4.5],
      ['b', 0.01, 4.5],
      ['b', 0.02, 4.51],
    ]);
  });

  test('a listener that throws cannot stop the others or the step', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const seen = [];
    const offBad = events.onPhysicsStep(() => {
      throw new Error('boom');
    });
    const offGood = events.onPhysicsStep(() => seen.push('good'));
    expect(() => events.runStepListeners(0.01, 1)).not.toThrow();
    expect(seen).toEqual(['good']);
    expect(warn).toHaveBeenCalledTimes(1);
    offBad();
    offGood();
  });

  test('a non-function subscribes to nothing and unsubscribes to nothing', () => {
    const off = events.onPhysicsStep('not a function');
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });
});

describe('the window dispatches', () => {
  const heard = [];
  const listen = name => {
    const fn = e => heard.push([name, e.detail]);
    window.addEventListener(name, fn);
    return () => window.removeEventListener(name, fn);
  };

  test('a collision reaches the page with the impact payload', () => {
    heard.length = 0;
    const off = listen('gravitasCollision');
    events.broadcastImpact(
      { pos: { x: 0, y: 0 }, vel: { x: 3, y: 0 }, mass: 2, obj_type: 'Star' },
      { pos: { x: 2, y: 4 }, vel: { x: 0, y: 4 }, mass: 1, kind: 'Planet' },
      'rocky-collision'
    );
    off();
    expect(heard).toEqual([
      [
        'gravitasCollision',
        {
          impactType: 'rocky-collision',
          sourceType: 'Star',
          targetType: 'Planet',
          relativeSpeed: 5,
          masses: [2, 1],
          position: { x: 1, y: 2 },
        },
      ],
    ]);
  });

  test('a missing body falls back as it always did', () => {
    heard.length = 0;
    const off = listen('gravitasCollision');
    events.broadcastImpact(null, null, 'x');
    off();
    expect(heard[0][1]).toEqual({
      impactType: 'x',
      sourceType: 'Unknown',
      targetType: 'x',
      relativeSpeed: 0,
      masses: [0, 0],
      position: { x: 0, y: 0 },
    });
  });

  test('the worker failure names the physics worker', () => {
    heard.length = 0;
    const off = listen('gravitasWorkerFailed');
    events.announceWorkerFailed();
    off();
    expect(heard).toEqual([['gravitasWorkerFailed', { worker: 'physics' }]]);
  });

  test('a merger is logged (last 1000) and announced, and a throwing page changes nothing', () => {
    heard.length = 0;
    const off = listen('gravitasMerge');
    const before = events.simulation.eventLog.length;
    events.announceMerge({ type: 'merge', primaryId: 1 });
    expect(heard).toEqual([['gravitasMerge', { type: 'merge', primaryId: 1 }]]);
    expect(events.simulation.eventLog.length).toBe(Math.min(1000, before + 1));
    off();
    const spy = jest.spyOn(window, 'dispatchEvent').mockImplementation(() => {
      throw new Error('no dispatch here');
    });
    expect(() => events.announceMerge({ type: 'merge' })).not.toThrow();
    spy.mockRestore();
    for (let i = 0; i < 1100; i++) events.announceMerge({ type: 'merge', i });
    expect(events.simulation.eventLog.length).toBe(1000);
    expect(events.simulation.getLatestEvents(1)[0].i).toBe(1099);
  });

  test('a realm with no window dispatches nothing and does not throw', () => {
    const code = `
      import * as e from ${JSON.stringify(
        new URL('../js/engine/events.js', import.meta.url).href
      )};
      if (typeof window !== 'undefined') throw new Error('window exists');
      e.dispatchSimulationEvent('gravitasCollision', {});
      e.broadcastImpact(null, null, 'x');
      e.announceMerge({ type: 'merge' });
      process.stdout.write(String(e.simulation.getLatestEvents(1)[0].type));
    `;
    expect(
      execFileSync(process.execPath, ['--input-type=module', '-e', code], {
        encoding: 'utf8',
      })
    ).toBe('merge');
  });
});
