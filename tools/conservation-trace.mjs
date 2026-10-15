#!/usr/bin/env node
// =============================================================================
// The engine's conservation and energy numbers along a seeded run
// -----------------------------------------------------------------------------
// Development and test (tests/engineConservation.test.js). Builds a preset under
// a seed with the clocks pinned, steps it, and at the start and every `every`
// steps prints the conserved totals and the drift against the baseline, the
// absorption ledgers, the energy of the first bodies, and a hash of every
// energy history. Numbers are rounded to 12 significant figures (V8's last digit
// differs between Node 22 and 24). The output depends only on the engine, so it
// can be compared across checkouts: run it before a move and after.
//
//   node tools/conservation-trace.mjs stellar-graveyard 5 [1200] [300] [RK4]
// =============================================================================

import { createHash } from 'node:crypto';
import * as physics from '../js/physics.js';
import { applyPreset } from '../js/scenarios.js';
import { buildWorld } from '../js/world/build.js';
import { DEFAULT_SETTINGS, setScenarioName } from '../js/appState.js';
import { withSeed } from '../js/rng.js';

const noop = () => {};

const round = v => String(Number.isFinite(v) ? Number(v.toPrecision(12)) : v);

function canon(v, depth = 0) {
  if (typeof v === 'number') return round(v);
  if (v === null || typeof v !== 'object') return v ?? null;
  if (depth > 6) return '[deep]';
  if (Array.isArray(v)) return v.map(x => canon(x, depth + 1));
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = canon(v[k], depth + 1);
  return out;
}

const historyHash = () => {
  const h = createHash('sha256');
  for (const o of physics.getAllPhysicsObjects()) {
    h.update(`${o.id}:`);
    for (const e of physics.getObjectEnergyHistory(o.id))
      h.update(`${round(e.ke)},${round(e.pe)},${round(e.total)};`);
  }
  return h.digest('hex').slice(0, 16);
};

const sample = (frame, bodies) => {
  const first = bodies.slice(0, 3).map(o => ({
    id: o.id,
    energy: canon({
      ke: physics.calculateKineticEnergy(o),
      object: (({ ke, pe, total }) => ({ ke, pe, total }))(
        physics.calculateObjectEnergy(o, 1, bodies)
      ),
      stats: (({ average, min, max, dataPoints }) => ({
        average,
        min,
        max,
        dataPoints,
      }))(physics.getObjectEnergyStats(o.id)),
    }),
  }));
  return {
    frame,
    simTime: round(physics.getSimulationTime()),
    totals: canon(physics.conservedQuantities()),
    drift: canon(physics.conservationDrift(true)),
    spin: round(physics.getAbsorbedSpinAngularMomentum()),
    discarded: canon(physics.getDiscardedAbsorptionMomentum()),
    bodies: bodies.length,
    memory: canon(physics.getEnergySystemMemoryStats()),
    first,
    historyHash: historyHash(),
  };
};

/**
 * @param {string} key - A scenario's public id
 * @param {number} seed
 * @param {number} frames - Steps of 0.01
 * @param {number} every - Steps between samples
 * @param {string} [integrator] - The scheme, when not the default
 * @returns {{samples: object[]}}
 */
export function trace(key, seed, frames, every, integrator) {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.preset_scenario = key;
  const state = { zoom: 1, pan: { x: 0, y: 0 }, paused: true, frame_count: 0 };
  physics.setStateReference(state);
  let tick = 0;
  Date.now = () => 1.7e12 + tick++;
  performance.now = () => 5000 + tick++;
  const samples = [];
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
    // applyPreset re-stamps the scenario's settings, so the scheme is set after.
    if (integrator) physics.updatePhysicsSettings({ integrator });
    physics.resetAbsorptionAccounting();
    physics.resetConservationBaseline();
    samples.push(sample(0, physics.getAllPhysicsObjects()));
    for (let i = 1; i <= frames; i++) {
      physics.updatePhysics(0.01);
      if (i % every === 0)
        samples.push(sample(i, physics.getAllPhysicsObjects()));
    }
  });
  return { samples };
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop())
) {
  const [key, seed, frames = '1200', every = '300', integrator] =
    process.argv.slice(2);
  process.stdout.write(
    JSON.stringify(
      trace(key, Number(seed), Number(frames), Number(every), integrator)
    )
  );
}
