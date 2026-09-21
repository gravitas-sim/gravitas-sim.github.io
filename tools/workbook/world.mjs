// =============================================================================
// A lesson's world, built and stepped with no browser in the room
// -----------------------------------------------------------------------------
// The seam this spike exists to test. Everything a printable workbook needs
// from Gravitas is here, and all of it is the application's own code:
//
//   js/scenarios.js      applyPreset, the scenario's own settings
//   js/world/build.js    buildWorld, the function ui.js calls on every reset
//   js/physics.js        updatePhysics, the integrator the tab runs at 60 Hz
//   js/timestep.js       substepPlan, the rule that turns time into steps
//   js/pauseAtEvent.js   armEvent, the periapsis/apoapsis detector the
//                        Pause at Event panel drives
//   js/orbital.js        orbitalElements / dominantPrimary, what the readout
//                        in the lesson panel is showing
//
// Nothing here computes an orbit. If a number in the workbook cannot be traced
// to one of those modules it does not belong in the workbook, and the point of
// the gate was to find out whether that is achievable. It is, with one gap,
// which is documented at `lessonContext` below.
//
// Why this is not `tools/dom-shim.mjs`
// -----------------------------------------------------------------------------
// It does not need to be. js/physics.js and js/world/build.js each carry a
// one-line guard that makes them evaluate in a realm with no `document` and no
// `window` - the Worker guards, regression-tested in
// tests/workerCompatibility.test.js - so this whole file runs in plain node
// with no shim at all. Installing the shim would be worse than useless: it
// would hide a regression in those guards behind a stub canvas.
// =============================================================================

import { substepPlan } from '../../js/timestep.js';
import {
  orbitalElements,
  dominantPrimary,
  pairEnergy,
} from '../../js/orbital.js';
import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatMass,
  timeUnitSeconds,
} from '../../js/units.js';

/** Seconds in a Julian day, the unit every Gravitas readout quotes. */
const SECONDS_PER_DAY = 86400;
/** Seconds in a Julian year, as js/investigations.js uses it. */
const SECONDS_PER_YEAR = 3.15576e7;

/**
 * Build one scenario's world, exactly as a reset in the running tab would.
 *
 * The injected context is the same block js/ui.js passes and the same block
 * tests/workerCompatibility.test.js passes: the callbacks that exist to move
 * the interface are no-ops here because there is no interface to move.
 *
 * @param {string} scenario - A `preset_scenario` key, e.g. 'Solar System'
 * @param {string} seed - The world seed, so a populated scenario is reproducible
 * @returns {Promise<object>} { physics, settings, state, scenario }
 */
export async function buildScenario(scenario, seed) {
  const physics = await import('../../js/physics.js');
  const { buildWorld } = await import('../../js/world/build.js');
  const { applyPreset } = await import('../../js/scenarios.js');
  const { DEFAULT_SETTINGS } = await import('../../js/appState.js');
  const { withSeed, normalizeSeed } = await import('../../js/rng.js');

  // A fresh settings object per world. applyPreset re-stamps the scenario's
  // own keys over whatever is handed to it, so sharing one object between two
  // scenarios leaks the first scenario's unstamped keys into the second.
  const settings = { ...DEFAULT_SETTINGS, preset_scenario: scenario };
  const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
  const noop = () => {};

  withSeed(normalizeSeed(seed), () =>
    buildWorld({
      settings,
      state,
      applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
      takePendingSettings: () => null,
      setScenarioName: noop,
      hideObjectInspector: noop,
      showScenarioInfo: noop,
      updateObjectTypeButton: noop,
      computeAreaSweep: noop,
      isAreaSweepSuppressed: () => true,
      regenerateStarfield: noop,
    })
  );

  // The other half of the reset, and the reason this function exists rather
  // than a bare call to buildWorld.
  //
  // buildWorld does not finish the job. js/ui.js:4288-4299 follows every
  // `withSeed(seed, () => build_simulation())` with five more calls, and four
  // of them are physics: the caches, the clock, the absorption ledger and the
  // conservation baseline all belong to the world that was torn down. Without
  // them the clock is a module-level global that simply carries on, so a
  // second scenario built in the same process starts hundreds of days in and
  // `advanceToDay` computes a negative advance, takes zero steps, and reports
  // a sample time that is an artifact of whatever ran before it. That is
  // exactly what happened the first time this ran.
  //
  // The fifth, `resetPotentialCache`, is js/vectorOverlay.js's - it caches a
  // drawn field, not a physical quantity - and is left out here on purpose.
  physics.bumpWorldGeneration();
  physics.resetSimulationTime();
  physics.resetAbsorptionAccounting();
  physics.resetConservationBaseline();

  return { physics, settings, state, scenario };
}

/**
 * Every body the lesson panel would let a student click.
 *
 * The same union js/investigations.js builds for `ctx.bodies`, in the same
 * order, because a workbook that enumerated a different set of bodies from the
 * screen would be describing a different lesson.
 *
 * @param {object} P - The js/physics.js module namespace
 * @returns {Array<object>} The bodies
 */
export const allBodies = P => [
  ...P.bh_list,
  ...P.planets,
  ...P.stars,
  ...P.gas_giants,
  ...P.asteroids,
  ...P.comets,
  ...P.neutron_stars,
  ...P.white_dwarfs,
];

/** The bodies a `dominantPrimary` search considers, as the panel does. */
const primariesOf = P => [
  ...P.bh_list,
  ...P.stars,
  ...P.neutron_stars,
  ...P.white_dwarfs,
];

/**
 * The context object a lesson step's own `probe`, `importFromSelection` and
 * `validate` functions are handed.
 *
 * THIS IS THE SEAM, and it is the one thing in this file that is not the
 * application's own code.
 *
 * js/investigations.js builds this in a private function, `probeContext()`. It
 * is not exported, and the module it lives in cannot be imported outside a
 * browser: its import graph reaches js/render.js, whose starfield generator
 * runs at module scope and, given a stub canvas whose dimensions never match
 * the field it just generated, recurses between `drawStarfield` and
 * `generateStarfield` until the stack ends. tools/dom-shim.mjs does not help
 * and is not supposed to.
 *
 * So the members below are rebuilt here from the same modules `probeContext`
 * builds them from. What is deliberately NOT rebuilt is any threshold, any
 * expected value, or any part of a lesson's answer: those stay in
 * js/data/investigations/*.js and are called, never copied.
 *
 * tests/workbookSpike.test.js pins the two together: it asserts that
 * js/investigations.js still sources `elements` from js/orbital.js, so if the
 * application ever changes where a readout's orbital elements come from, this
 * file stops agreeing with it loudly rather than quietly.
 *
 * @param {object} world - From `buildScenario`
 * @param {?object} selected - The body standing in for the student's click
 * @returns {object} A lesson context
 */
export function lessonContext(world, selected = null) {
  const { physics: P, settings } = world;
  const G = settings.gravitational_constant;
  const primaryOf = body =>
    dominantPrimary(
      body,
      primariesOf(P).filter(p => p !== body)
    );

  return {
    selected,
    bodies: allBodies(P),
    G,
    elements: body => {
      const b = body || selected;
      if (!b) return null;
      const primary = primaryOf(b);
      return primary ? orbitalElements(b, primary, G) : null;
    },
    energy: body => {
      const b = body || selected;
      if (!b) return null;
      const primary = primaryOf(b);
      return primary ? pairEnergy(b, primary, G) : null;
    },
    distance: formatDistance,
    speed: formatSpeed,
    time: formatTime,
    mass: formatMass,
    clock: () => P.getSimulationTime(),
    years: simTime => (simTime * timeUnitSeconds()) / SECONDS_PER_YEAR,
    au: simDistance => simDistance * 0.01,
    // The legacy substring matcher. Two of the five Kepler steps whose
    // validators this spike calls still use it, so it is here in the shape
    // js/investigations.js has it, warts and all.
    find: name =>
      allBodies(P).find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(name).toLowerCase())
      ) || null,
  };
}

/**
 * The simulation clock, in days.
 *
 * Not `currentTimeDays` from js/lightCurve.js, which is what the Pause at
 * Event panel hands the watcher in the browser - and that is a trap worth
 * spelling out, because reusing it looks like the more faithful choice.
 *
 * It reads `getSimClock()` from js/timeline.js, which is the *recorder's*
 * clock: the simulated time of the frame currently on screen. Live, that
 * tracks the integrator. Headlessly nothing feeds the recorder, so it stays
 * at zero no matter how far the world is stepped. Measured, after advancing
 * this world by 100 days: the integrator says 99.9913 and
 * `currentTimeDays()` says 0.
 *
 * Handing that to the watcher would be silently fatal rather than loudly
 * wrong. js/pauseAtEvent.js drops any sample whose clock reading equals the
 * previous one, so a clock stuck at zero yields one sample, no bracket, and a
 * watch that never fires.
 *
 * So the integrator's own clock, through the same conversion
 * (`timeUnitSeconds() / 86400`) that js/lightCurve.js applies to the
 * recorder's.
 *
 * @param {object} P - The js/physics.js module namespace
 * @returns {number} Days
 */
export const clockDays = P => simDays(P.getSimulationTime());

/**
 * A simulation time, in days.
 *
 * Here rather than as a multiplication by 365.25 somewhere, so a period quoted
 * in days and a moment quoted in days go through one function.
 *
 * @param {number} simTime - Simulation time units
 * @returns {number} Days
 */
export const simDays = simTime =>
  (simTime * timeUnitSeconds()) / SECONDS_PER_DAY;

/**
 * The step this world is integrated at, and why it is that and not the
 * browser's.
 *
 * In a tab the step comes from `frameAdvance(realSeconds, sim_speed, DT)`,
 * clamped by `substepPlan`. The first argument is wall clock, so the browser's
 * integration step moves with the frame rate: js/timestep.js records that
 * Kepler's 2nd Law lands on 0.0463 at 60 fps and 0.0417 at 30 fps. A workbook
 * built from that would have a different table on every machine, which is the
 * failure mode section 3 of this spike exists to avoid.
 *
 * So the wall clock is removed and the scenario's own declared ceiling is used
 * as the advance. `substepPlan` then returns exactly one substep of
 * `max_timestep`: the largest step the scenario's author says this scenario
 * may be integrated at, and therefore the least accurate the running
 * application is ever allowed to be. Every student's browser integrates this
 * scenario at least as finely as the workbook did.
 *
 * A scenario that declares no ceiling gets FALLBACK_STEP, which is the step
 * the scientific validation suite uses in tools/physics-checks.mjs.
 *
 * @param {object} settings - The built world's settings
 * @returns {{step: number, substeps: number, source: string}} The plan
 */
export function fixedStepPlan(settings) {
  const cap = settings.max_timestep;
  if (!(cap > 0)) {
    return { step: FALLBACK_STEP, substeps: 1, source: 'fallback' };
  }
  const plan = substepPlan(cap, cap);
  return { step: plan.step, substeps: plan.substeps, source: 'max_timestep' };
}

/** What an uncapped scenario is integrated at. Matches the validation suite. */
export const FALLBACK_STEP = 0.002;

/**
 * Advance the world by whole fixed steps until the clock passes `days`.
 *
 * Steps are counted, not timed: the loop runs a whole number of identical
 * `updatePhysics(step)` calls, so the state at a named time is a function of
 * the step and the count and of nothing else. Nothing here reads a wall clock,
 * a frame callback or `Date.now()`.
 *
 * @param {object} world - From `buildScenario`
 * @param {number} days - Target simulated time, in days
 * @param {object} [opts] - `onStep` is called after each step
 * @returns {{steps: number, days: number}} What was actually taken
 */
export function advanceToDay(world, days, { onStep = null } = {}) {
  const { physics: P, settings } = world;
  const { step } = fixedStepPlan(settings);
  const perStepDays = (step * timeUnitSeconds()) / SECONDS_PER_DAY;
  const target = Math.max(0, days - clockDays(P));
  const steps = Math.round(target / perStepDays);
  for (let i = 0; i < steps; i++) {
    P.updatePhysics(step);
    if (onStep) onStep();
  }
  return { steps, days: clockDays(P) };
}

/**
 * Run the application's own Pause at Event watcher until it fires.
 *
 * js/pauseAtEvent.js takes its whole world through an injected dependency
 * block - body lookup, G, the clock, the step hook, the pause - which is why
 * it can be driven from here at all. The watcher's bracketing, its
 * interpolation of the crossing time and its refusal to arm on a circular
 * orbit are the panel's, unmodified.
 *
 * The one thing dropped from the fired event is `at`, which js/pauseAtEvent.js
 * stamps with `new Date().toISOString()`. It is right in a panel and fatal in
 * a reproducible artifact.
 *
 * @param {object} world - From `buildScenario`
 * @param {object} spec - { kind, bodyId, primaryId }
 * @param {Function} resolveBody - id -> body
 * @param {number} maxDays - Give up after this much simulated time
 * @returns {Promise<?object>} The event, minus its wall-clock stamp
 */
export async function runToEvent(world, spec, resolveBody, maxDays) {
  const PAE = await import('../../js/pauseAtEvent.js');
  const { physics: P, settings } = world;
  const { step } = fixedStepPlan(settings);

  const listeners = new Set();
  let fired = null;
  const unsubscribe = PAE.onEvent(payload => {
    if (payload?.type === 'fired') fired = payload.event;
  });

  const armed = PAE.armEvent(spec, {
    resolveBody,
    G: () => settings.gravitational_constant,
    clockDays: () => clockDays(P),
    onStep: fn => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // Nothing to pause: the loop below simply stops.
    pause: () => {},
  });
  if (!armed.ok) {
    unsubscribe();
    return { refused: armed.reason ?? 'unknown' };
  }

  const startDays = clockDays(P);
  while (!fired && clockDays(P) - startDays < maxDays) {
    P.updatePhysics(step);
    for (const fn of listeners) fn();
  }
  unsubscribe();
  PAE.disarm();
  if (!fired) return { refused: 'timeout' };

  // Everything but `at`, which js/pauseAtEvent.js stamps with the wall clock.
  const deterministic = { ...fired };
  delete deterministic.at;
  return deterministic;
}
