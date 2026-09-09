/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// The notebook's chunk is fetched on the first save, and everything about the
// capture boundary's correctness is what happens while that fetch is in
// flight. So the fetch is held open here: ensureNotebook() awaits the deferred
// message catalogue before it imports anything, and this mock never resolves
// until the test says so.
let releaseLoad;
const gate = new Promise(resolve => {
  releaseLoad = resolve;
});
jest.unstable_mockModule('../js/i18n/deferredMessages.js', () => ({
  ensureDeferredMessages: () => gate,
  registerDeferred: () => {},
}));

/** Every entry the panel was offered, in order. */
const offered = [];
jest.unstable_mockModule('../js/notebookPanel.js', () => ({
  setRevisionSource: () => {},
  ensurePanel: () => {},
  offerDraft: entry => offered.push(entry),
  isNotebookEnabled: () => false,
  setNotebookEnabled: () => {},
  notebookEntries: () => [],
}));
jest.unstable_mockModule('../js/notebook/capture.js', () => ({
  __esModule: true,
}));

const bridge = await import('../js/notebookBridge.js');
const physics = await import('../js/physics.js');
const observer = await import('../js/observerGeometry.js');
const { SETTINGS } = await import('../js/appState.js');

describe('a capture describes the moment it was asked for', () => {
  beforeEach(() => {
    offered.length = 0;
  });

  test('the world may move while the notebook loads, and the entry may not', async () => {
    observer.setPositionAngle(10);
    observer.setInclination(80);
    SETTINGS.integrator = 'Velocity Verlet';

    const before = {
      generation: physics.getWorldGeneration(),
      epoch: physics.getInterventionEpoch(),
      positionAngle: observer.getPositionAngle(),
      inclination: observer.getInclination(),
      integrator: SETTINGS.integrator,
    };

    // What the panel holds when the reader presses Keep. Copied at click time,
    // which is what every caller of captureToNotebook now does.
    const live = { fit: { period: 3.5 }, points: [1, 2, 3] };
    const kept = bridge.snapshot(live);

    // The press. Nothing is awaited before the provenance is read.
    const capturing = bridge.captureToNotebook((_capture, provenance) => ({
      provenance,
      source: kept,
    }));

    // While the chunk is in flight: a rebuild, an intervention, the observer
    // moved, a setting changed, and the panel's own result overwritten.
    physics.bumpWorldGeneration();
    physics.noteIntervention();
    observer.setPositionAngle(75);
    observer.setInclination(35);
    SETTINGS.integrator = 'RK4';
    live.fit.period = 99;
    live.points.push(4);

    expect(offered).toHaveLength(0);
    releaseLoad();
    await expect(capturing).resolves.toBe(true);

    expect(offered).toHaveLength(1);
    const entry = offered[0];

    // Every one of these is the value that existed at the click.
    expect(entry.provenance.worldGeneration).toBe(before.generation);
    expect(entry.provenance.interventionEpoch).toBe(before.epoch);
    expect(entry.provenance.observer).toEqual({
      positionAngleDeg: before.positionAngle,
      inclinationDeg: before.inclination,
    });
    expect(entry.provenance.integrator).toBe(before.integrator);

    // And the source is the copy, not the object the panel went on editing.
    expect(entry.source.fit.period).toBe(3.5);
    expect(entry.source.points).toEqual([1, 2, 3]);

    // The world really did move, so the assertions above are not vacuous.
    expect(physics.getWorldGeneration()).not.toBe(before.generation);
    expect(physics.getInterventionEpoch()).not.toBe(before.epoch);
    expect(observer.getPositionAngle()).not.toBe(before.positionAngle);
    expect(SETTINGS.integrator).not.toBe(before.integrator);
  });

  test('a capture that finds nothing to keep offers nothing', async () => {
    const capturing = bridge.captureToNotebook(() => null);
    await expect(capturing).resolves.toBe(false);
    expect(offered).toHaveLength(0);
  });

  test('the provenance is readable without awaiting anything', () => {
    // Not a style point: the whole guarantee is that this can be called from
    // inside a click handler and produce values before the browser runs
    // anything else. A promise here would mean it could not.
    const p = bridge.liveProvenance();
    expect(p).not.toBeInstanceOf(Promise);
    expect(typeof p.worldGeneration).toBe('number');
    expect(p.observer).toHaveProperty('positionAngleDeg');
  });

  test('snapshot detaches, and keeps the numbers JSON would lose', () => {
    const source = { a: { b: 1 }, big: Infinity, nan: Number.NaN };
    const copy = bridge.snapshot(source);
    source.a.b = 2;
    expect(copy.a.b).toBe(1);
    expect(copy.big).toBe(Infinity);
    expect(Number.isNaN(copy.nan)).toBe(true);
    expect(bridge.snapshot(null)).toBeNull();
  });
});
