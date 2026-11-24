#!/usr/bin/env node
// =============================================================================
// Two cameras on one world give the same bodies, bit for bit
// -----------------------------------------------------------------------------
// Test (tests/cameraIndependence.test.js; Prompt 496, D-R4-496-01). Builds a
// scenario under a seed and steps it 600 frames of 1/60 s as the page steps
// them, once with no canvas and then under each view of the fixture in
// tests/fixtures/camera-removal/plan.json: three canvas sizes, zoom 0.25 and
// 3, pan 0 and 200 AU. Every run must end with the same live bodies at the
// same positions and velocities, compared exactly. Prints one JSON line.
//
//   node tools/camera-independence.mjs --scene solar-system [--frames 600]
// =============================================================================

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const scene = arg('--scene', 'solar-system');
const frames = Number(arg('--frames', 600));
const SEED = 7;
const CANVASES = [
  [800, 600],
  [1366, 800],
  [3840, 2160],
];
const ZOOMS = [0.25, 3];
const PAN_AU = [0, 200];

// js/engine/step.js reads the canvas element once, at module load; the runs
// below resize this one object between worlds.
const canvas = { width: 0, height: 0 };
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

const physics = await import('../js/physics.js');
const { build } = await import('./tides-scenarios.mjs');
const { engine } = await import('../js/random/streams.js');
const { frameAdvance, substepPlan } = await import('../js/timestep.js');
const { setTier } = await import('../js/quality.js');
const { resetPresetMemory } = await import('../js/scenarios.js');
const { SIM_UNITS_PER_AU } = await import('../js/units.js');
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

/** The live world as exact strings: list, id, position, velocity. */
const snapshot = () => {
  const out = new Map();
  for (const l of LISTS)
    for (const b of physics[l] || [])
      if (b.alive !== false)
        out.set(
          `${l}:${b.id}`,
          `${b.pos.x},${b.pos.y},${b.vel?.x},${b.vel?.y}`
        );
  return out;
};

const run = (width, height, zoom, panAU) => {
  resetPresetMemory();
  const settings = build(scene, SEED);
  canvas.width = width;
  canvas.height = height;
  physics.setStateReference({
    zoom,
    pan: { x: -panAU * SIM_UNITS_PER_AU * zoom, y: 0 },
    frameOffset: { x: 0, y: 0 },
    paused: true,
    frame_count: 0,
  });
  const plan = substepPlan(
    frameAdvance(1 / 60, settings.sim_speed, physics.DT),
    settings.max_timestep
  );
  engine(SEED, () => {
    for (let f = 0; f < frames; f++)
      for (let i = 0; i < plan.substeps; i++) physics.updatePhysics(plan.step);
  });
  return snapshot();
};

const reference = run(0, 0, 1, 0);
const comets = physics.comets.filter(c => c.alive !== false).map(c => c.name);
const views = [];
for (const [w, h] of CANVASES)
  for (const zoom of ZOOMS)
    for (const panAU of PAN_AU) {
      const got = run(w, h, zoom, panAU);
      let removed = 0;
      let moved = 0;
      for (const [k, v] of reference) {
        if (!got.has(k)) removed++;
        else if (got.get(k) !== v) moved++;
      }
      const added = [...got.keys()].filter(k => !reference.has(k)).length;
      views.push({ canvas: `${w}x${h}`, zoom, panAU, removed, moved, added });
    }

process.stdout.write(
  JSON.stringify({ scene, frames, live: reference.size, comets, views }) + '\n'
);
