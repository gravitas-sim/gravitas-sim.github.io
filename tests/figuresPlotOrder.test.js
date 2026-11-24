/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest } from '@jest/globals';

/* global setTimeout -- the test environment's timer */

// =============================================================================
// While the plot component loads, only the newest draw is kept
// -----------------------------------------------------------------------------
// js/investigations/figures.js fetches the plot component the first time a step
// draws. Each call made before it arrived used to draw the values it was made
// with when it did, so a re-render's call, landing late, drew over the readings
// typed in since: the plot and its table stayed empty beside a full form (the
// flaky "plot table is hidden" failure of e2e/viewportMatrix.spec.js on tides
// step 10). The component's arrival is held here by a gate, so the order is
// the test's rather than the network's.
// =============================================================================

const draws = [];
let open;
const gate = new Promise(r => (open = r));
jest.unstable_mockModule('../js/investigations/plotView.js', async () => {
  await gate;
  return {
    draw: (step, vals) => draws.push(vals.n),
    clear: () => draws.push('clear'),
  };
});

const figures = await import('../js/investigations/figures.js');

const step = { plot: { points: () => [] } };
const ctx = { canvas: {} };
const settle = () => new Promise(r => setTimeout(r, 0));

describe('figures.drawPlot while the plot component loads', () => {
  test('of several held calls only the newest draws, once the component lands', async () => {
    figures.drawPlot(step, { n: 0 }, ctx);
    figures.drawPlot(step, { n: 1 }, ctx);
    figures.drawPlot(step, { n: 2 }, ctx);
    await settle();
    expect(draws).toEqual([]);
    open();
    await settle();
    expect(draws).toEqual([2]);
  });

  test('once it has landed every call draws at once, and nothing draws late', async () => {
    draws.length = 0;
    figures.drawPlot(step, { n: 3 }, ctx);
    figures.drawPlot(step, { n: 4 }, ctx);
    expect(draws).toEqual([3, 4]);
    await settle();
    expect(draws).toEqual([3, 4]);
  });
});
