// Shared by the barycenter and source-rule tests: a scene built through the
// page's builder under a seed and stepped as the page steps it at a frame
// rate. Run directly with --write to record the identity fixture
// (tests/fixtures/source-rule-identity.json); that fixture was written on the
// tree before the engine's source rule moved, and the identity test compares
// every coordinate against it bit for bit.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as physics from '../js/physics.js';
import { build } from '../tools/tides-scenarios.mjs';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import { engine } from '../js/random/streams.js';

export const RATES = { 120: 1 / 120, 60: 1 / 60, 30: 1 / 30, clamp: 0.2 };
export const IDENTITY_SCENES = ['binary-pair', 'circumbinary-planet-lab'];

/**
 * Build a scene and the step plan the page would use for it.
 * @param {string} key - Scenario key
 * @param {number} seed - World seed
 * @param {string} rate - A key of RATES
 * @returns {{settings: object, plan: {substeps: number, step: number}}} The plan
 */
export function buildScene(key, seed = 1, rate = '60') {
  const settings = build(key, seed);
  const dtSim = frameAdvance(RATES[rate], settings.sim_speed, physics.DT);
  return { settings, plan: substepPlan(dtSim, settings.max_timestep) };
}

/** Every body the engine integrates or holds, in the engine's own order. */
export function allBodies() {
  return [
    ...physics.bh_list,
    ...physics.stars,
    ...physics.galaxies,
    ...physics.gas_giants,
    ...physics.neutron_stars,
    ...physics.white_dwarfs,
    ...physics.planets,
    ...physics.asteroids,
    ...physics.comets,
    ...physics.debris,
  ];
}

/**
 * Positions after `steps` engine steps of the page's step, as exact strings.
 * @param {string} key - Scenario key
 * @param {number} steps - Engine steps
 * @param {number} seed - World seed
 * @returns {Array<{name: string, x: string, y: string}>} Positions
 */
export function positionsAfter(key, steps = 500, seed = 1) {
  const { plan } = buildScene(key, seed, '60');
  engine(seed, () => {
    for (let i = 0; i < steps; i++) physics.updatePhysics(plan.step);
  });
  return allBodies().map(b => ({
    name: b.name,
    kind: b.kind,
    x: String(b.pos.x),
    y: String(b.pos.y),
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes('--write')) {
    console.log('usage: node tests/barycentreRuns.js --write');
    process.exit(2);
  }
  const out = { steps: 500, seed: 1, rate: '60', scenes: {} };
  for (const key of IDENTITY_SCENES) out.scenes[key] = positionsAfter(key);
  writeFileSync(
    new URL('./fixtures/source-rule-identity.json', import.meta.url),
    JSON.stringify(out, null, 2) + '\n'
  );
  console.log('wrote tests/fixtures/source-rule-identity.json');
}
