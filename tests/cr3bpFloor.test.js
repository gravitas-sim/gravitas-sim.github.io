/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  minInteractionDistance,
  MIN_INTERACTION_DISTANCE,
  updatePhysicsSettings,
} from '../js/physics.js';
import {
  SOFTENING_MARGIN,
  VIOLATION,
  forceLawViolations,
} from '../js/cr3bp.js';
import { activeForceLaw } from '../js/cr3bpPanel.js';

// =============================================================================
// One floor, read the same way twice
// -----------------------------------------------------------------------------
// The engine clamps the separation in its force law at a floor, and the
// teaching overlay refuses to make closed-form claims about a system sitting
// inside that floor. The two used to disagree about what the floor was:
// `min_interaction_distance` is 0 in DEFAULT_SETTINGS, the engine reads that as
// "use the default" and the overlay read it as "there is no floor". A compact
// system deep inside the clamped region was therefore certified Newtonian.
// =============================================================================

/** Two bodies a fixed distance apart, on the x axis. */
const pair = separation => [
  { pos: { x: 0, y: 0 } },
  { pos: { x: separation, y: 0 } },
];

/** Put the engine's settings into a known state for one case. */
const withSettings = over =>
  updatePhysicsSettings({
    min_interaction_distance: 0,
    galaxy_gravity: 'newton',
    gravitational_constant: 1,
    ...over,
  });

describe('the effective floor is one number', () => {
  beforeEach(() => withSettings({}));

  test('zero means the default, not the absence of a floor', () => {
    withSettings({ min_interaction_distance: 0 });
    expect(minInteractionDistance()).toBe(MIN_INTERACTION_DISTANCE);
    expect(minInteractionDistance()).toBeGreaterThan(0);
    // And the overlay reports the same number the engine will apply.
    expect(activeForceLaw(pair(400), null).softening).toBe(
      minInteractionDistance()
    );
  });

  test('a scenario that states a floor gets the one it stated', () => {
    withSettings({ min_interaction_distance: 0.01 });
    expect(minInteractionDistance()).toBe(0.01);
    expect(activeForceLaw(pair(400), null).softening).toBe(0.01);
  });

  test('a negative or unreadable setting falls back rather than disabling it', () => {
    for (const bad of [-1, Number.NaN, null, undefined]) {
      withSettings({ min_interaction_distance: bad });
      expect(minInteractionDistance()).toBe(MIN_INTERACTION_DISTANCE);
    }
  });
});

describe('what the overlay refuses', () => {
  beforeEach(() => withSettings({}));

  test('a compact system inside the default floor is refused, at setting zero', () => {
    // The defect, exactly: the setting says 0, the engine is clamping at the
    // default, and the closest distance in play is well inside it.
    withSettings({ min_interaction_distance: 0 });
    const law = activeForceLaw(pair(MIN_INTERACTION_DISTANCE / 2), null);
    expect(law.minDistance).toBeLessThan(minInteractionDistance());
    expect(forceLawViolations(law)).toContain(VIOLATION.SOFTENED);
  });

  test('a distance safely outside the floor and its margin is accepted', () => {
    withSettings({ min_interaction_distance: 0 });
    const law = activeForceLaw(
      pair(MIN_INTERACTION_DISTANCE * SOFTENING_MARGIN * 20),
      null
    );
    expect(forceLawViolations(law)).toEqual([]);
  });

  test('the margin is respected: just outside the floor is still refused', () => {
    withSettings({ min_interaction_distance: 0 });
    const inside = MIN_INTERACTION_DISTANCE * SOFTENING_MARGIN * 0.99;
    expect(forceLawViolations(activeForceLaw(pair(inside), null))).toContain(
      VIOLATION.SOFTENED
    );
  });

  test('a scenario override is respected in both directions', () => {
    // A laboratory that lowers the floor to suit its own scale may then sit
    // where the default would have refused it.
    withSettings({ min_interaction_distance: 0.01 });
    expect(forceLawViolations(activeForceLaw(pair(1), null))).toEqual([]);
    // And one that raises it is refused at a distance the default allowed.
    withSettings({ min_interaction_distance: 500 });
    expect(forceLawViolations(activeForceLaw(pair(400), null))).toContain(
      VIOLATION.SOFTENED
    );
  });

  test('the tracer’s own distances count, not only the pair’s separation', () => {
    withSettings({ min_interaction_distance: 0 });
    const tracer = { pos: { x: 1, y: 0 } };
    const law = activeForceLaw(pair(400), tracer);
    expect(law.minDistance).toBeCloseTo(1, 9);
    expect(forceLawViolations(law)).toContain(VIOLATION.SOFTENED);
  });

  test('the Lagrange Point Lab’s own numbers stay valid', () => {
    // Two stars eight AU apart at 100 units per AU, and a tracer at 0.6 of the
    // separation from the barycentre: the closest distance in play is hundreds
    // of units against a five-unit floor.
    withSettings({ min_interaction_distance: 0.01 });
    const separation = 800;
    const mu = 0.03 / 1.03;
    const massive = [
      { pos: { x: -mu * separation, y: 0 } },
      { pos: { x: (1 - mu) * separation, y: 0 } },
    ];
    const tracer = { pos: { x: 0.6 * separation, y: 0 } };
    const law = activeForceLaw(massive, tracer);
    expect(law.minDistance).toBeGreaterThan(100);
    expect(forceLawViolations(law)).toEqual([]);
  });
});
