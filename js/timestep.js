// =============================================================================
// How a frame's simulated time becomes integration steps
// -----------------------------------------------------------------------------
// Two small pieces of arithmetic that used to live inside the render loop, and
// were moved out when a second caller appeared. The bench's numerical
// reliability check has to halve the step the engine is really taking, and
// that is not the same as halving anything a student can see.
//
// The distinction is the whole reason this file exists. The frame advance and
// the integration step are different numbers whenever a scenario caps its
// step: halving the frame advance halves the simulated time each frame covers,
// so the substep count falls with it and the actual step barely moves. On
// Kepler's 2nd Law - sim_speed 5, max_timestep 0.05 - that takes the step from
// 0.0463 to 0.0417, a tenth, while doubling the frames needed to cover the
// same duration. What refines the integration is the cap.
//
// A convergence check built on the wrong lever compares a run against a near
// copy of itself and pronounces everything converged, so the rule lives in one
// place and every caller - the loop, the bench, the tests - reads it here.
//
// Deliberately free of imports, including of DT: the render loop has it and
// passes it in. That keeps this file testable without a canvas, which is what
// forced the extraction.
// =============================================================================

/**
 * The hard ceiling on substeps per frame.
 *
 * 64 rather than 16 because a tightly packed system needs a genuinely small
 * step: TRAPPIST-1's innermost planet has a year of a day and a half, and at
 * 16 substeps it was getting 225 steps per orbit, which symplectic Euler turns
 * into unbound orbits after a few hundred circuits.
 */
export const MAX_SUBSTEPS = 64;

/** The frame time one step of the period key stands for: 1/60 s. */
export const STEP_SECONDS = 1 / 60;

/**
 * How one frame's worth of simulated time is actually integrated.
 *
 * Symplectic Euler's error grows with the step, and it shows up first as a
 * slow change in eccentricity: an orbit that should be fixed visibly reshapes
 * over a minute or two. That is fine in a sandbox and fatal in a lesson that
 * asks students to measure a supposedly constant orbit, so a scenario can cap
 * the step it is integrated at and take several smaller ones per frame.
 *
 * @param {number} dtSim - Simulated time this frame advances by
 * @param {number} maxStep - SETTINGS.max_timestep; 0 or absent means no cap
 * @returns {{substeps: number, step: number, capped: boolean}} The plan,
 *   where `capped` means the ceiling above bit and the step is larger than
 *   the scenario asked for
 */
export function substepPlan(dtSim, maxStep) {
  const cap = maxStep > 0 ? maxStep : 0;
  // The magnitude decides how many substeps, the sign rides along.
  //
  // This compared dtSim to the cap directly, which is the right question only
  // for a forward step. A negative advance is never greater than a positive
  // cap, so `!(dtSim > cap)` was true for every backward step and the plan came
  // back as one uncapped leap - the scenarios that cap their step precisely to
  // keep symplectic Euler from wrecking a packed system would have been
  // integrated backwards at the full frame step, which is the one case the cap
  // exists for. Nothing ran backwards when this was written, so nothing caught
  // it; tools/reversibility-probe.mjs does now.
  const size = Math.abs(dtSim);
  if (!(cap > 0) || !(size > cap)) {
    return { substeps: 1, step: dtSim, capped: false };
  }
  const wanted = Math.ceil(size / cap);
  const substeps = Math.min(MAX_SUBSTEPS, wanted);
  return { substeps, step: dtSim / substeps, capped: wanted > MAX_SUBSTEPS };
}

// Who holds the frame time fixed. The loop steps by the last frame's real
// duration, so a 144 Hz screen and a throttled tab integrate the same scene
// with different steps. A pin replaces that duration: every frame stands for
// the same wall time, so the run is the same calculation on any display, at
// the cost of its pace following the frame rate. Each owner lifts only its
// own pin: the Experiment Bench ('bench', also any caller that names none),
// a lesson's controlled run ('runs') and a lesson step that measures from a
// scene the integrator moves ('lesson') all pin the bench's 1/60 s, and a
// recording that ends inside a pinned step leaves the step pinned.
const pins = new Map();

/**
 * Pin the frame time, or lift this owner's pin.
 * @param {number} seconds - Wall-clock seconds each frame stands for, or 0
 * @param {string} [owner] - Who is pinning
 */
export function setFixedStep(seconds, owner = 'bench') {
  if (Number.isFinite(seconds) && seconds > 0) pins.set(owner, seconds);
  else pins.delete(owner);
}

/** The pinned frame time (the first owner's), or 0 when nobody pins. */
export const pinnedStep = () => pins.values().next().value || 0;

/**
 * The simulated time one frame advances by, at a given real-time step.
 *
 * The 0.05 ceiling is what keeps a stalled tab from integrating a whole
 * second of wall clock in one leap when it wakes up.
 *
 * @param {number} seconds - Real seconds for the frame
 * @param {number} simSpeed - SETTINGS.sim_speed
 * @param {number} dt - The engine's DT constant
 * @returns {number} Simulated time units
 */
export function frameAdvance(seconds, simSpeed, dt) {
  return Math.min(seconds, 0.05) * simSpeed * 50 * dt;
}

/**
 * Whether a lesson step holds the clock: a reading step with nothing to watch
 * (no `motion`, instrument or `pauseAt`, and no `time` unless it starts
 * paused). js/appState.js holdClock() pauses for it and lets go on the next
 * step, and a held step is never pinned (js/lesson/stageGate.js).
 * @param {?object} step - The step on screen
 * @returns {boolean} Whether it holds
 */
export const holdsClock = step =>
  step?.type === 'read' &&
  !(
    step.motion ||
    step.tool ||
    step.pauseAt ||
    (step.time && step.time.paused !== true)
  );
