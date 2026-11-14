// =============================================================================
// Taking a step of the simulation: one frame's worth, or one step on request
// -----------------------------------------------------------------------------
// The render loop used to hold this arithmetic inline, and a step taken while
// paused needs the same arithmetic. Two copies would be two definitions of
// "a step", so there is one: a frame advance from frameAdvance(), cut into
// substeps by substepPlan() when the scenario caps its step, each substep run
// through updatePhysics(), the stopwatch ticked by what was integrated.
//
// What one step is. A step is the simulated time one frame at 60 frames a
// second advances by at the current speed. At the same speed a running world
// takes that much 60 times a second, so pressing the step key once moves the
// world exactly as far as one frame of running would, and the label beside the
// transport ("1 step = x days") says how far that is.
// =============================================================================

import { updatePhysics, DT } from './physics.js';
import { SETTINGS, state } from './appState.js';
import { frameAdvance, substepPlan } from './timestep.js';
import { tickSandboxTools } from './sandboxTools.js';
import {
  isScrubbing,
  isUnrecorded,
  recordFrame,
  syncClock,
} from './timeline.js';

/** The frame time one step stands for: a frame at 60 frames a second. */
export const STEP_SECONDS = 1 / 60;

/**
 * Integrate one frame's simulated time.
 *
 * Symplectic Euler's error grows with the step, and it shows up first as a
 * slow change in eccentricity: an orbit that should be fixed visibly reshapes
 * over a minute or two. That is fine in a sandbox and fatal in a lesson that
 * asks students to measure a supposedly constant orbit, so a scenario can cap
 * the step it is integrated at and take several smaller ones per frame
 * instead. The ceiling is MAX_SUBSTEPS (js/timestep.js, which says why); only
 * scenarios that opt in pay for it, and those are small ones.
 *
 * The stopwatch runs on simulated time, so it is advanced by what was
 * actually integrated: a paused or scrubbed frame advances it by nothing, and
 * changing the simulation speed does not change a period the student times.
 *
 * @param {number} dtSim - Simulated time to advance by
 */
export function integrateFrame(dtSim) {
  const { substeps, step } = substepPlan(dtSim, SETTINGS.max_timestep);
  for (let i = 0; i < substeps; i++) updatePhysics(step);
  tickSandboxTools(dtSim);
  syncClock();
}

/** @returns {number} Simulated time one step advances by, in sim units */
export function stepSize() {
  return frameAdvance(STEP_SECONDS, SETTINGS.sim_speed, DT);
}

/**
 * Take one step of the simulation, when it is paused and live.
 *
 * Records one frame, and the starting frame first when nothing has been
 * recorded (a world that began paused, as Step by step starts it), so the step
 * back key has somewhere to go.
 *
 * @returns {boolean} False when the world is running or parked in history
 */
export function stepOnce() {
  if (!state.paused || isScrubbing()) return false;
  if (isUnrecorded()) recordFrame();
  integrateFrame(stepSize());
  recordFrame();
  return true;
}
