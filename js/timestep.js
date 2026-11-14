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

// =============================================================================
// SPIKE (never merged): the candidate step policies of the step-policy gate
// =============================================================================
const H = { S2: 1 / 24, S3: 1 / 48, S4: 1 / 96 };
let policy = 'S0';
const carryState = {
  carry: 0,
  sign: 0,
  frames: 0,
  bound: 0,
  maxCarryOverH: 0,
};

/** @param {string} id S0 to S4 */
export function setStepPolicy(id) {
  policy = id;
  Object.assign(carryState, {
    carry: 0,
    sign: 0,
    frames: 0,
    bound: 0,
    maxCarryOverH: 0,
  });
}
export const stepPolicyStats = () => ({ policy, ...carryState });

/**
 * One frame's plan under the policy. A scenario with its own cap keeps
 * substepPlan; S1 is the unchanged substepPlan with a cap of 1/24 where there
 * is none; S2 to S4 take pieces of exactly h and carry the remainder.
 */
export function planFrame(dtSim, maxStep, id = policy, state = carryState, hOverride = 0) {
  if (maxStep > 0 || id === 'S0') return substepPlan(dtSim, maxStep);
  if (id === 'S1' && !hOverride) return substepPlan(dtSim, 1 / 24);
  const h = hOverride || H[id];
  const sign = dtSim < 0 ? -1 : 1;
  if (state.sign !== 0 && state.sign !== sign) state.carry = 0;
  state.sign = sign;
  const acc = state.carry + dtSim;
  const want = Math.floor(Math.abs(acc) / h + 1e-9);
  const n = Math.min(MAX_SUBSTEPS, want);
  state.carry = acc - n * h * sign;
  state.frames++;
  const bound = want > MAX_SUBSTEPS;
  if (bound) state.bound++;
  state.maxCarryOverH = Math.max(
    state.maxCarryOverH,
    Math.abs(state.carry) / h
  );
  return { substeps: n, step: h * sign, capped: bound };
}

/** The step the live loop takes per frame, with no carry (for the bench and the reliability check). */
export function livePlan(dtSim, maxStep, id = policy) {
  if (maxStep > 0 || id === 'S0' || id === 'S1')
    return planFrame(dtSim, maxStep, id);
  const h = H[id];
  return {
    substeps: Math.max(1, Math.min(MAX_SUBSTEPS, Math.round(dtSim / h))),
    step: h,
    capped: false,
  };
}
