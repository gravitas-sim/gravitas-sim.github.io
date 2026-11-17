// =============================================================================
// How long a trail is, as a time
// -----------------------------------------------------------------------------
// A trail used to be a count of samples taken one per physics step. The step
// follows the frame rate (js/timestep.js), so the same setting covered a third
// as much orbit on a busy machine as on an idle one. The stored setting
// `trail_length` keeps its name and its numbers, so saved settings, share
// links, scenario packs and the A/B bench's hash all stay valid; what changes
// is the unit it is read in.
//
// One trail sample is now one REFERENCE STEP of simulated time: the step the
// engine takes at 60 frames per second at the speed the world was built with
// (the scenario's own sim_speed and step cap). That is the condition every
// scenario's trail length was chosen under, so on a 60 fps machine a saved
// number draws the trail it always drew. Anywhere else the span stays the same
// time, whatever the frame rate, and only the number of points drawn changes.
// The speed is the one pushed at a build or an Apply, not the live speed
// control's: moving that does not stretch a trail that states how long it is.
//
// A leaf: it imports only the pure step arithmetic, so the engine, the
// settings panel and the tests can all ask the same question.
// =============================================================================

import { STEP_SECONDS, substepPlan, frameAdvance } from './timestep.js';

/**
 * The engine's DT. Copied rather than imported: js/engine/bodies.js reaches the
 * engine state, which reaches this file, and a cycle for one constant is the
 * wrong trade. tests/trailSpan.test.js holds the two equal.
 */
export const TRAIL_REFERENCE_DT = 0.1;

/**
 * The simulated time one trail sample stands for.
 *
 * @param {number} maxTimestep - max_timestep; 0 or absent means no cap
 * @param {number} [simSpeed] - sim_speed the world was built with
 * @returns {number} Simulation time units
 */
export const trailReferenceStep = (maxTimestep, simSpeed = 1) =>
  substepPlan(
    frameAdvance(STEP_SECONDS, simSpeed > 0 ? simSpeed : 1, TRAIL_REFERENCE_DT),
    maxTimestep
  ).step;

/**
 * The simulated time a trail of `samples` samples covers.
 *
 * @param {number} samples - The stored trail_length
 * @param {number} maxTimestep - max_timestep
 * @param {number} [simSpeed] - sim_speed the world was built with
 * @returns {number} Simulation time units
 */
export const trailSpanTime = (samples, maxTimestep, simSpeed = 1) =>
  Math.max(1, Math.round(samples) || 1) *
  trailReferenceStep(maxTimestep, simSpeed);
