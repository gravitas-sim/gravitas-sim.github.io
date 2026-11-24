#!/usr/bin/env node
// =============================================================================
// What keeping every body costs the engine
// -----------------------------------------------------------------------------
// Development (Prompt 496's cost gate, tests/fixtures/camera-removal/plan.json).
// Builds a scenario under a seed, with a stub canvas of the given size, steps
// it as the page steps it (frameAdvance, substepPlan, one updatePhysics per
// substep) for `frames` frames of 1/60 s, and prints the mean engine time per
// frame over the first and the last 500 frames and the live-body count at each
// quarter. `--root` points at another checkout's tree, so the base commit is
// timed by the same code:
//
//   node tools/removal-cost.mjs --scene star-cluster --canvas 375x812 \
//     [--frames 20000] [--root /path/to/base] [--seed 7]
// =============================================================================

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);

const root = path.resolve(
  arg('--root', new URL('..', import.meta.url).pathname)
);
const scene = arg('--scene');
const [width, height] = arg('--canvas', '375x812').split('x').map(Number);
const frames = Number(arg('--frames', 20000));
const seed = Number(arg('--seed', 7));
const WINDOW = 500;

// step.js reads the canvas element once, at module load.
const canvas = { width, height };
const nothing = () => null;
globalThis.document = {
  getElementById: id => (id === 'simulationCanvas' ? canvas : null),
  querySelector: nothing,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({
    style: {},
    getContext: nothing,
    addEventListener: () => {},
    setAttribute: () => {},
    appendChild: () => {},
  }),
  documentElement: { style: {}, classList: { add() {}, remove() {} } },
  body: { appendChild() {}, classList: { add() {}, remove() {} } },
};

const load = rel => import(pathToFileURL(path.join(root, rel)).href);
const physics = await load('js/physics.js');
const { applyPreset } = await load('js/scenarios.js');
const { buildWorld } = await load('js/world/build.js');
const { DEFAULT_SETTINGS, setScenarioName } = await load('js/appState.js');
const { withSeed } = await load('js/rng.js');
const { frameAdvance, substepPlan } = await load('js/timestep.js');
const { setTier } = await load('js/quality.js');
setTier('full');

const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'debris',
  'accretion_disk_particles',
];
const count = () => {
  const out = {};
  let total = 0;
  for (const l of LISTS) {
    const n = (physics[l] || []).filter(b => b.alive !== false).length;
    if (n) out[l] = n;
    total += n;
  }
  return { total, ...out };
};

const noop = () => {};
const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
settings.preset_scenario = scene;
const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
physics.setStateReference(state);
let startMs = 0;
let endMs = 0;
const counts = [];
withSeed(seed, () => {
  buildWorld({
    settings,
    state,
    applyPreset: () => applyPreset(settings, DEFAULT_SETTINGS, state),
    takePendingSettings: () => null,
    setScenarioName,
    hideObjectInspector: noop,
    showScenarioInfo: noop,
    updateObjectTypeButton: noop,
    computeAreaSweep: noop,
    isAreaSweepSuppressed: () => true,
    regenerateStarfield: noop,
  });
  state.frameOffset ??= { x: 0, y: 0 };
  const plan = substepPlan(
    frameAdvance(1 / 60, settings.sim_speed, physics.DT),
    settings.max_timestep
  );
  counts.push({ frame: 0, ...count() });
  for (let f = 1; f <= frames; f++) {
    const t0 = performance.now();
    for (let i = 0; i < plan.substeps; i++) physics.updatePhysics(plan.step);
    const ms = performance.now() - t0;
    if (f <= WINDOW) startMs += ms;
    if (f > frames - WINDOW) endMs += ms;
    if (f % (frames / 4) === 0) counts.push({ frame: f, ...count() });
  }
});

process.stdout.write(
  JSON.stringify({
    scene,
    canvas: `${width}x${height}`,
    zoom: state.zoom,
    frames,
    startMs: startMs / WINDOW,
    endMs: endMs / WINDOW,
    counts,
  }) + '\n'
);
