import { describe, test, expect, beforeEach } from '@jest/globals';
import { measureFrameRatio } from '../js/experiments/frameRate.js';
import { comparisonSpec } from '../js/experiments/assistSweep.js';
import { validateSweepSpec } from '../js/experiments/sweep.js';
import { resetTimeline, tickTimeline } from '../js/timeline.js';
import { frameAdvance } from '../js/timestep.js';
import { state } from '../js/appState.js';
import { DT } from '../js/physics.js';

// The gravity-assist laboratory's own speed, so the ratios below are the ones
// its comparison is sized from.
const settings = { sim_speed: 400 };
const PREDICTED = frameAdvance(1 / 60, settings.sim_speed, DT);

/**
 * The render loop in miniature, as the measurement sees it.
 *
 * Each frame advances the real timeline clock the way js/render.js does - by
 * the frame's advance, and only while the world is unpaused - and then runs
 * whatever was waiting for the frame. `between(frame)` runs after the clock
 * and before the measurement reads it, which is where a pause-at-event, a
 * watcher finishing or a test freezing the world would act.
 *
 * @param {object} [opts] - `advance` per frame, and `between`
 * @returns {Function} A frame scheduler for measureFrameRatio
 */
function loop({ advance = PREDICTED, between = () => {} } = {}) {
  let frame = 0;
  return cb =>
    Promise.resolve().then(() => {
      frame++;
      tickTimeline(advance);
      between(frame);
      cb();
    });
}

beforeEach(() => {
  resetTimeline();
  state.paused = true;
});

describe('measureFrameRatio', () => {
  test('a world running at the predicted rate needs no help', async () => {
    const ratio = await measureFrameRatio({ settings, state, frames: loop() });
    expect(ratio).toBeCloseTo(1, 9);
  });

  test('a world advancing a quarter of the prediction asks for four times the budget', async () => {
    const ratio = await measureFrameRatio({
      settings,
      state,
      frames: loop({ advance: PREDICTED / 4 }),
    });
    expect(ratio).toBeCloseTo(4, 9);
  });

  // The e2e test that freezes the world under the comparison hit this
  // intermittently: one frame got through before the freeze re-paused the
  // world, the old average over all ten frames read that as a world running
  // at a tenth of its speed, and a comparison sized ten times too long was
  // refused as over the sweep's duration limit - so no report ever came, and
  // the test waited eight minutes for one.
  test('a world paused by someone else partway through is not reported as slow', async () => {
    const ratio = await measureFrameRatio({
      settings,
      state,
      frames: loop({
        between: frame => {
          if (frame === 1) state.paused = true;
        },
      }),
    });
    expect(ratio).toBeCloseTo(1, 9);
    expect(validateSweepSpec(comparisonSpec({ frameRatio: ratio })).ok).toBe(
      true
    );
  });

  test('a slow world keeps its rate when it is paused partway through', async () => {
    const ratio = await measureFrameRatio({
      settings,
      state,
      frames: loop({
        advance: PREDICTED / 4,
        between: frame => {
          if (frame === 3) state.paused = true;
        },
      }),
    });
    expect(ratio).toBeCloseTo(4, 9);
  });

  test('a world that never moves is a measurement of nothing, not an infinite slowdown', async () => {
    const ratio = await measureFrameRatio({
      settings,
      state,
      frames: loop({
        between: () => {
          state.paused = true;
        },
        advance: 0,
      }),
    });
    expect(ratio).toBe(1);
  });

  test('the world is left paused or running as it was found', async () => {
    state.paused = true;
    await measureFrameRatio({ settings, state, frames: loop() });
    expect(state.paused).toBe(true);
    state.paused = false;
    await measureFrameRatio({ settings, state, frames: loop() });
    expect(state.paused).toBe(false);
  });
});
