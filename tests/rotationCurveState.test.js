/**
 * @jest-environment jsdom
 */
// =============================================================================
// The last rotation-curve fit goes with the world it described
// -----------------------------------------------------------------------------
// js/rotationCurveState.js keeps the last fit so the readout does not flicker.
// A probe or the data export reads it before the panel (js/rotationCurve.js)
// has ever been fetched, so the module itself must drop it when a world is
// rebuilt.
// =============================================================================

/* global window */
import { describe, test, expect } from '@jest/globals';
import { planets } from '../js/physics.js';
import { rotationCurveState } from '../js/rotationCurveState.js';
import { EV_SIMULATION_RESET } from '../js/names.js';

const body = (x, v, mass = 1) => ({
  pos: { x, y: 0 },
  vel: { x: 0, y: v },
  mass,
  alive: true,
});

describe('a rebuilt world forgets the old fit with no panel loaded', () => {
  test('too few points after the reset means no fit, not the old one', () => {
    planets.length = 0;
    for (let r = 1; r <= 12; r++)
      planets.push(body(r, r ** -0.5, r < 2 ? 100 : 1));
    const first = rotationCurveState();
    expect(first.fit).not.toBeNull();

    // Two bodies: too few to fit, so the flicker guard would hand back the
    // old fit.
    planets.length = 0;
    planets.push(body(1, 3, 100), body(2, 2));
    expect(rotationCurveState().fit).toEqual(first.fit);

    window.dispatchEvent(new window.Event(EV_SIMULATION_RESET));
    expect(rotationCurveState().fit).toBeNull();
    planets.length = 0;
  });
});
