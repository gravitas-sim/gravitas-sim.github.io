// =============================================================================
// How long a trail is, as a time
// -----------------------------------------------------------------------------
// A trail used to be a count of samples taken one per physics step. The step
// follows the frame rate (js/timestep.js), so the same setting covered a third
// as much orbit on a busy machine as on an idle one, and a faster simulation
// speed stretched it again. The stored setting `trail_length` keeps its name
// and its numbers, so saved settings, share links, scenario packs and the A/B
// bench's hash all stay valid; what changes is the unit it is read in.
//
// One trail sample is now one REFERENCE STEP of simulated time: the step the
// engine takes at 60 frames per second and a speed of 1. That is the condition
// every scenario's trail length was chosen under, so at the reference a saved
// number draws the trail it always drew. Anywhere else the span stays the
// same time - 15 samples is 15 reference steps whatever the frame rate - and
// only the number of points drawn changes.
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
 * @param {number} maxTimestep - SETTINGS.max_timestep; 0 or absent means no cap
 * @returns {number} Simulation time units
 */
export const trailReferenceStep = maxTimestep =>
  substepPlan(
    frameAdvance(STEP_SECONDS, 1, TRAIL_REFERENCE_DT),
    maxTimestep
  ).step;

/**
 * The simulated time a trail of `samples` samples covers.
 *
 * @param {number} samples - The stored trail_length
 * @param {number} maxTimestep - SETTINGS.max_timestep
 * @returns {number} Simulation time units
 */
export const trailSpanTime = (samples, maxTimestep) =>
  Math.max(1, Math.round(samples) || 1) * trailReferenceStep(maxTimestep);
