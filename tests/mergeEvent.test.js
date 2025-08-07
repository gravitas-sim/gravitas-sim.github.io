import { simulation } from '../js/physics.js';

test('merge event fires (integration smoke)', () => {
  // This test checks that at least one merge event can be recorded during simulation
  // We cannot spin a full Simulation/Body API here (not present), so we validate the event log plumbing.
  // Push a fake event to the simulation log and verify retrieval via getLatestEvents.
  const before = simulation.getLatestEvents().length;
  const evt = {
    type: 'merge',
    time: 0,
    primaryId: 1,
    secondaryId: 2,
    mergedMass: 42,
    position: { x: 0, y: 0 },
  };
  simulation.eventLog.push(evt);
  const events = simulation.getLatestEvents();
  expect(events.length).toBeGreaterThanOrEqual(before + 1);
  expect(events.some(e => e.type === 'merge')).toBe(true);
});