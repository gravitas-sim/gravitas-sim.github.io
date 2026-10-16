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
export async function measureFrameRatio({
  settings,
  state,
  frames = cb => requestAnimationFrame(cb),
}) {
  const timestep = await import('../timestep.js');
  const { getSimClock } = await import('../timeline.js');
  const { DT } = await import('../physics.js');
  const wanted = timestep.frameAdvance(1 / 60, settings.sim_speed, DT);
  if (!(wanted > 0)) return 1;

  // Unpaused for the measurement and put back afterwards, whatever it finds:
  // a paused world advances nothing and would report itself infinitely slow.
  //
  // Unpausing it once does not keep it unpaused, though. Anything else that
  // pauses the world during the ten frames - an event the reader asked to
  // stop at, a watcher finishing, a test freezing it - was counted as
  // slowness: one frame moved out of ten read as a world running at a tenth
  // of its speed, and the gravity-assist comparison, sized ten times too
  // long, was refused for exceeding the sweep's duration limit. So the rate is
  // taken over the frames that actually advanced. That is also the only rate
  // the runner can use: its budget counts frames on which the clock moved,
  // and a frame that did not move costs it nothing.
  const wasPaused = state.paused;
  state.paused = false;
  let last = getSimClock();
  let moved = 0;
  let covered = 0;
  await new Promise(resolve => {
    let n = 0;
    const tick = () => {
      const now = getSimClock();
      if (now > last) {
        moved++;
        covered += now - last;
      }
      last = now;
      if (++n >= FRAMES) resolve();
      else frames(tick);
    };
    frames(tick);
  });
  state.paused = wasPaused;
  if (!moved) return 1;
  const advanced = covered / moved;
  // Never below one. A world that runs FASTER than predicted needs no help,
  // and shrinking the budget on the strength of ten frames would turn a
  // measurement into a way of cutting trials short.
  return Math.max(1, wanted / advanced);
}
