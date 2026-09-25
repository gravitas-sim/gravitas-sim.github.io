// =============================================================================
// One trial of an experiment, in a realm of its own
// -----------------------------------------------------------------------------
// The body of the Worker that js/experiments/scheduler.js starts for each
// trial (js/experiments/experimentWorker.js), kept apart from the Worker's
// message handling so the same calculation can be run by a test in Node.
//
// A trial is what the bench's sweep does with the live world (bench.js
// runSweepTrial), done instead in a disposable realm: build the scenario with
// the trial's parameter values and seed, integrate at a fixed frame, sample the
// metrics, stop at the duration or at a stop event, reduce. Nothing is shared
// with the page or with any other trial - MULTI_WORLD_DECISION.md is why that
// needs no engine change - and the realm is thrown away afterwards, so the
// next trial cannot inherit an id counter, a conservation baseline or a cache.
//
// The engine modules are passed in rather than imported, so this file imports
// nothing that needs a browser and a test can hand it the modules it loaded.
// =============================================================================

import { TRIAL_STATUS } from './sweep.js';
import { sampleFrame, reduceRun, series, UNITS_PER_AU } from './metrics.js';

/** The body lists a role is looked up in, as the bench's picker does. */
const BODY_LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
];

/** How many points each metric's series keeps for a plot. */
export const SERIES_POINTS = 120;

/**
 * Find the bodies a measurement needs, in the world as built.
 * @param {object} physics - The realm's js/physics.js
 * @param {{bodies?: string[], primary?: string}} roles
 */
export function resolveRoles(physics, roles = {}) {
  const all = BODY_LISTS.flatMap(name => physics[name] || []);
  const pick = spec => {
    // 'planet' is the scenario's massive planet; in the assist labs the
    // spacecraft is also a planet object, so it is excluded by name first.
    if (spec === 'planet') {
      return (
        physics.planets.find(b => b.name !== 'Spacecraft') ||
        physics.gas_giants[0] ||
        null
      );
    }
    return all.find(b => b.name === spec) || null;
  };
  const bodies = (roles.bodies || []).map(pick);
  const primary = roles.primary ? pick(roles.primary) : null;
  return {
    bodies: bodies.filter(Boolean),
    primary,
    ok: bodies.every(Boolean) && (!roles.primary || Boolean(primary)),
    count: all.length,
  };
}

/** Is a body still in the world? A merged or destroyed body is not. */
function present(physics, body) {
  return BODY_LISTS.some(name => (physics[name] || []).includes(body));
}

/** A series thinned to at most `n` points, first and last kept. */
function thin(points, n) {
  if (points.length <= n) return points;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(points[Math.round((i * (points.length - 1)) / (n - 1))]);
  }
  return out;
}

/**
 * Build a scenario in this realm, the way the page builds it.
 *
 * @param {object} m - The realm's modules: physics, build, scenarios,
 *   appState, rng
 * @param {{scenario: string, settings?: object, seed: string}} spec
 * @returns {object} The settings the world was built with
 */
export function buildScenario(m, { scenario, settings = {}, seed }) {
  // Two builds, the way a reader does it: open the scenario, which stamps its
  // own settings block (its step cap among them), then change the variable
  // and rebuild, which carries the laboratory's variables across. A single
  // build with the variable already set would have it wiped by the stamp; a
  // second build in a realm that remembered a previous one would carry the
  // defaults instead of the scenario's own numerics. Forgetting the memory
  // first makes the result independent of whatever this realm built before.
  m.scenarios.resetPresetMemory();
  const SETTINGS = {
    ...m.appState.DEFAULT_SETTINGS,
    preset_scenario: scenario,
  };
  build(m, SETTINGS, seed);
  Object.assign(SETTINGS, settings, { preset_scenario: scenario });
  build(m, SETTINGS, seed);
  return SETTINGS;
}

function build(m, SETTINGS, seed) {
  const state = { zoom: 1, pan: { x: 0, y: 0 }, selectedObject: null };
  const noop = () => {};
  m.rng.withSeed(m.rng.normalizeSeed(seed), () =>
    m.build.buildWorld({
      settings: SETTINGS,
      state,
      applyPreset: () =>
        m.scenarios.applyPreset(SETTINGS, m.appState.DEFAULT_SETTINGS, state),
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
  // What initialize_simulation does after every build (js/ui.js), in the same
  // order. The physics caches hold the previous set of bodies until the
  // generation is bumped: without it the integrator goes on stepping the
  // discarded objects while the lists hold new ones that never move. The
  // clock, the absorption ledger and the conservation baseline belong to the
  // world just torn down.
  const p = m.physics;
  p.bumpWorldGeneration();
  p.resetSimulationTime?.();
  p.resetAbsorptionAccounting?.();
  p.resetConservationBaseline?.();
  p.resetPotentialCache?.();
}

/**
 * The plan a trial will follow, without running it: what the world is and how
 * many steps and samples the run will take. The scheduler's refusal of an
 * experiment too large for a device is made from this.
 */
export function planTrial(m, manifest, trial) {
  const settings = buildScenario(m, {
    scenario: manifest.model.scenario,
    settings: { ...manifest.initial?.settings, ...trial.params },
    seed: trial.seed,
  });
  const found = resolveRoles(m.physics, manifest.observables.roles);
  const frameAdvance = m.timestep.frameAdvance(
    manifest.numerics.frameSeconds,
    settings.sim_speed,
    m.physics.DT
  );
  const { substeps, step } = m.timestep.substepPlan(
    frameAdvance,
    settings.max_timestep
  );
  const frames = Math.ceil(manifest.stop.duration / frameAdvance);
  return {
    bodies: found.count,
    frameAdvance,
    substeps,
    step,
    frames,
    steps: frames * substeps,
    samples: Math.ceil(frames / manifest.numerics.sampleEvery) + 1,
    integrator: settings.integrator,
    settings,
  };
}

/**
 * How fast this realm integrates the world planTrial() has just built: the
 * planned frames, run for a moment and timed.
 *
 * What an experiment costs is priced from this, on the device that will run
 * it, rather than from a figure per class of device. The bench found the
 * speed differs fourfold between two laboratories with the same number of
 * bodies (EXPERIMENTS.md), because with three bodies a step's bookkeeping
 * costs more than its forces; no one rate per device is right for both.
 *
 * A fresh realm starts cold, in the interpreter, and speeds up as the engine
 * is compiled. The rate is taken from the second half of the burst, and the
 * first half's excess over that rate is reported as the warm-up a trial pays
 * once. A trial short enough to finish inside the burst is simply timed.
 *
 * @param {object} m - The realm's modules, holding the planned world
 * @param {object} plan - planTrial()'s answer for that world
 * @param {number} sampleEvery - Frames between samples, whose cost is included
 * @param {{now: Function, budgetMs?: number}} opts
 * @returns {{steps: number, ms: number, stepsPerMs: number|null,
 *   warmupMs: number, complete: boolean}} stepsPerMs is null when the clock
 *   was too coarse to time the burst
 */
export function calibrate(m, plan, sampleEvery, { now, budgetMs = 160 }) {
  const { physics } = m;
  const t0 = now();
  let steps = 0;
  let half = null;
  let elapsed = 0;
  for (let f = 0; f < plan.frames; f++) {
    for (let s = 0; s < plan.substeps; s++) physics.updatePhysics(plan.step);
    steps += plan.substeps;
    // The dearest part of a sample, so a trial that samples often is priced
    // as one.
    if ((f + 1) % sampleEvery === 0) physics.conservedQuantities();
    elapsed = now() - t0;
    if (!half && elapsed >= budgetMs / 2) half = { ms: elapsed, steps };
    if (elapsed >= budgetMs) break;
  }
  const complete = steps >= plan.steps;
  if (complete || !half) {
    return {
      steps,
      ms: elapsed,
      stepsPerMs: elapsed > 0 ? steps / elapsed : null,
      warmupMs: 0,
      complete,
    };
  }
  const warmMs = elapsed - half.ms;
  const stepsPerMs = warmMs > 0 ? (steps - half.steps) / warmMs : null;
  return {
    steps,
    ms: elapsed,
    stepsPerMs,
    warmupMs: stepsPerMs ? Math.max(0, half.ms - half.steps / stepsPerMs) : 0,
    complete,
  };
}

/**
 * Run one trial.
 *
 * @param {object} m - The realm's modules (see buildScenario), and timestep
 *   and units
 * @param {object} manifest - A validated gravitas.experiment/1 manifest
 * @param {{index: number, params: object, seed: string}} trial
 * @param {{onProgress?: Function, now?: Function}} [hooks]
 * @returns {object} The trial's result
 */
export function runTrial(m, manifest, trial, hooks = {}) {
  const now = hooks.now || (() => 0);
  const started = now();
  const out = {
    index: trial.index,
    params: trial.params,
    seed: trial.seed,
    status: TRIAL_STATUS.OK,
    results: {},
    kinds: {},
    series: {},
    frames: 0,
    steps: 0,
    samples: 0,
    simTime: 0,
    wallMs: 0,
    // Where the time went: building the world twice, and integrating it. A
    // trial's wall time is mostly the first for a short run, and the pricing
    // in experimentManifest.js:estimate() is made from both.
    timing: { buildMs: 0, integrateMs: 0 },
    numerics: null,
    stoppedBy: 'duration',
  };
  let plan;
  try {
    plan = planTrial(m, manifest, trial);
  } catch (err) {
    out.status = TRIAL_STATUS.BUILD_FAILED;
    out.error = String(err?.message || err);
    return out;
  }
  // The values have to have survived the rebuild, or every trial would run
  // the same world and report a flat line that looks like a finding.
  for (const [key, value] of Object.entries(trial.params)) {
    const applied = plan.settings[key];
    if (typeof value === 'number' && !(Math.abs(applied - value) <= 1e-9)) {
      out.status = TRIAL_STATUS.BUILD_FAILED;
      out.error = `${key} did not survive the rebuild: asked ${value}, got ${applied}`;
      return out;
    }
  }
  const found = resolveRoles(m.physics, manifest.observables.roles);
  if (!found.ok) {
    out.status = TRIAL_STATUS.BODIES_MISSING;
    return out;
  }
  out.numerics = {
    integrator: plan.integrator,
    frameSeconds: manifest.numerics.frameSeconds,
    frameAdvance: plan.frameAdvance,
    step: plan.step,
    substeps: plan.substeps,
  };

  const { physics } = m;
  const metrics = manifest.observables.metrics;
  const limits = manifest.limits;
  const secondsPerUnit = m.units.timeUnitSeconds();
  physics.resetConservationBaseline?.();
  const samples = [];
  const take = () => {
    // The engine's drift object as it comes: sampleFrame reads its
    // percentages, `energyDrift` and `angularDrift`, the way the bench does.
    samples.push(
      sampleFrame({
        t: physics.getSimulationTime(),
        bodies: found.bodies,
        primary: found.primary,
        conserved: physics.conservedQuantities(),
        drift: physics.conservationDrift(true),
        secondsPerUnit,
        metrics,
      })
    );
  };
  take();

  const events = manifest.stop.events || [];
  const t0 = physics.getSimulationTime();
  const integrating = now();
  out.timing.buildMs = Math.round(integrating - started);
  const progressEvery = Math.max(1, Math.floor(plan.frames / 20));
  for (let f = 0; f < plan.frames; f++) {
    for (let s = 0; s < plan.substeps; s++) physics.updatePhysics(plan.step);
    out.frames++;
    out.steps += plan.substeps;
    if (!found.bodies.every(b => present(physics, b))) {
      out.status = TRIAL_STATUS.LOST_BODY;
      out.stoppedBy = 'lost-body';
      break;
    }
    if ((f + 1) % manifest.numerics.sampleEvery === 0) {
      if (samples.length >= limits.maxSamplesPerTrial) {
        out.status = TRIAL_STATUS.CAPPED;
        out.stoppedBy = 'sample-cap';
        break;
      }
      take();
      const last = samples[samples.length - 1];
      const hit = events.find(e => eventHappened(e, last, found));
      if (hit) {
        out.stoppedBy = hit.kind;
        break;
      }
    }
    if (hooks.onProgress && (f + 1) % progressEvery === 0) {
      hooks.onProgress((f + 1) / plan.frames);
    }
  }
  out.timing.integrateMs = Math.round(now() - integrating);
  out.simTime = physics.getSimulationTime() - t0;
  out.samples = samples.length;

  const reduced = reduceRun(samples, metrics, 86400 / secondsPerUnit);
  for (const id of metrics) {
    const v = reduced[id]?.value;
    out.results[id] = Number.isFinite(v) ? v : null;
    out.kinds[id] = reduced[id]?.kind ?? 'none';
    out.series[id] = thin(series(samples, id), SERIES_POINTS).map(p => [
      p.t,
      p.v,
    ]);
  }
  if (
    out.status === TRIAL_STATUS.OK &&
    metrics.some(id => out.results[id] === null && out.kinds[id] !== 'none')
  ) {
    out.status = TRIAL_STATUS.NOT_FINITE;
  }
  out.wallMs = Math.round(now() - started);
  return out;
}

/** Whether a stop event has happened, judged on the latest sample. */
function eventHappened(event, sample, found) {
  if (event.kind === 'separation-below' || event.kind === 'separation-above') {
    const d = sample.distance_to_primary ?? sample.separation;
    if (!Number.isFinite(d) || !found.primary) return false;
    return event.kind === 'separation-below' ? d < event.au : d > event.au;
  }
  return false;
}

/**
 * What this realm's engine does, as one number: a reference world integrated
 * for a fixed number of frames, and its bodies' positions hashed.
 *
 * Recorded with every result. A later Gravitas whose integration differs in
 * any way gives a different fingerprint, and a result made before the change
 * can then say why it no longer reproduces rather than silently disagreeing.
 */
export function engineFingerprint(m) {
  buildScenario(m, { scenario: 'Binary Planet Lab', seed: 'fingerprint' });
  const plan = m.timestep.substepPlan(
    m.timestep.frameAdvance(
      1 / 60,
      m.appState.DEFAULT_SETTINGS.sim_speed,
      m.physics.DT
    ),
    0
  );
  for (let f = 0; f < 60; f++) {
    for (let s = 0; s < plan.substeps; s++) m.physics.updatePhysics(plan.step);
  }
  let h = 0x811c9dc5;
  const mix = x => {
    // FNV-1a over the position rounded to 1e-9 of a simulation unit: exact
    // enough to see any change to the integrator, loose enough to be the same
    // on every IEEE-754 machine running the same code.
    const s = Math.round(x * 1e9).toString(36);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  for (const name of BODY_LISTS) {
    for (const b of m.physics[name] || []) {
      mix(b.pos.x);
      mix(b.pos.y);
    }
  }
  return h.toString(16).padStart(8, '0');
}

export { UNITS_PER_AU };
