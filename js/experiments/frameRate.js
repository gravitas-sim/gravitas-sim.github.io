// =============================================================================
// How fast the world really runs
// -----------------------------------------------------------------------------
// The sweep runner sizes a trial's frame budget from arithmetic: one sixtieth
// of a second at the current simulation speed is a known number of time units,
// so a run of N units needs N/dt frames. In several scenarios that arithmetic
// is wrong by a large factor - the binary laboratories advance about a quarter
// of what the formula predicts - and a budget taken from the prediction cuts
// every trial off a fifth of the way through its observation window and then
// reports it as incomplete.
//
// The fix is not a fudge factor per scenario. It is to run ten frames and look.
// =============================================================================

/** How many frames to watch before deciding. Enough to see the rate, short
 *  enough that nobody notices it happening. */
const FRAMES = 10;

/**
 * How much slower the world is than the frame arithmetic says.
 *
 * Returns a multiplier to scale a requested duration by, so that a caller
 * asking for N time units of simulation gets a frame budget that can actually
 * deliver them. One when the world runs at the predicted rate, or when nothing
 * could be measured - a caller with no measurement should still get a budget
 * rather than a NaN.
 *
 * @param {object} deps - The bits of the application this needs, injected so
 *   the caller controls the import graph: `settings`, `state`, and a `frames`
 *   scheduler defaulting to requestAnimationFrame.
 * @returns {Promise<number>} The multiplier, at least 1
 */
export async function measureFrameRatio({ settings, state }) {
  const timestep = await import('../timestep.js');
  const { getSimClock } = await import('../timeline.js');
  const { DT } = await import('../physics.js');
  const wanted = timestep.frameAdvance(1 / 60, settings.sim_speed, DT);
  if (!(wanted > 0)) return 1;

  // Unpaused for the measurement and put back afterwards, whatever it finds:
  // a paused world advances nothing and would report itself infinitely slow.
  const wasPaused = state.paused;
  state.paused = false;
  const before = getSimClock();
  await new Promise(resolve => {
    let n = 0;
    const tick = () =>
      ++n >= FRAMES ? resolve() : requestAnimationFrame(tick);
    requestAnimationFrame(tick);
  });
  const advanced = (getSimClock() - before) / FRAMES;
  state.paused = wasPaused;
  if (!(advanced > 0)) return 1;
  // Never below one. A world that runs FASTER than predicted needs no help,
  // and shrinking the budget on the strength of ten frames would turn a
  // measurement into a way of cutting trials short.
  return Math.max(1, wanted / advanced);
}
