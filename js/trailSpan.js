// A trail's length in simulated time. trail_length keeps its key and numbers;
// one sample is one reference step: 60 fps at the speed and step cap the world
// was built with (pushed at a build or Apply). The span is then the same at any
// frame rate. D-R4-337-02. A leaf, safe for the engine and the settings panel.

import { STEP_SECONDS, substepPlan, frameAdvance } from './timestep.js';

// The engine's DT, copied to avoid a cycle; tests/trailSpan.test.js holds them equal.
export const TRAIL_REFERENCE_DT = 0.1;

/** Simulated time of one trail sample. */
export const trailReferenceStep = (maxTimestep, simSpeed = 1) =>
  substepPlan(
    frameAdvance(STEP_SECONDS, simSpeed > 0 ? simSpeed : 1, TRAIL_REFERENCE_DT),
    maxTimestep
  ).step;

/** Simulated time a trail of `samples` samples covers. */
export const trailSpanTime = (samples, maxTimestep, simSpeed = 1) =>
  Math.max(1, Math.round(samples) || 1) *
  trailReferenceStep(maxTimestep, simSpeed);
