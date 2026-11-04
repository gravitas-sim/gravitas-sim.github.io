#!/usr/bin/env node
// =============================================================================
// The engine's precomputed cluster runs (Prompt 237, DYNAMICS_REFERENCE_GATE.md)
// -----------------------------------------------------------------------------
//   node tools/dynamics-runs.mjs --write            run every seed of both families, write the table
//   node tools/dynamics-runs.mjs --check            stale? compare the digest of the inputs with the recorded one
//   node tools/dynamics-runs.mjs --family=S --seeds=1 --print   run a slice and print it (nothing written)
//
// A node of the generate graph ('dynamics-runs', tools/generate-graph.mjs). The engine (js/physics.js,
// as the validation harness drives it) integrates the oracle's pinned starting points
// (tests/fixtures/dynamics/initial-conditions.json) with its default scheme and a fixed step; the
// measurement is the one tools/dynamics-measure.mjs holds. The output is two gravitas.grid documents
// (Prompt 157's kind: axes, outputs, the generator and its exact inputs, dense float64 values) in
// tests/fixtures/dynamics/engine-runs.json. A run is chaotic after a few crossing times: the table is
// compared with the reference by ensemble means (tools/dynamics-validate.mjs, legs G1 to G7).
//
// Units: the problem is in Heggie units (G = 1, cluster mass 1, virial radius 1). The engine runs it with
// lengths x 100 and masses x 100, G = 1, so velocities are unchanged and times are x 100: step 0.25,
// softening floor 2 (thresholds.json, ensembles.engine).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { measureCluster, measureSatellite } from './dynamics-measure.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(REPO, 'tests/fixtures/dynamics');
export const OUT = path.join(FIX, 'engine-runs.json');

export const SCALE = 100;
export const STEP = 0.25;
export const FLOOR = 2;
export const S_EVERY = 3394;
export const S_SAMPLES = 10;
export const D_EVERY = 113;
export const D_SNAPS = 150;
export const SEEDS_S = Array.from({ length: 16 }, (_, i) => i + 1);
export const SEEDS_D = Array.from({ length: 16 }, (_, i) => i + 101);
export const SETTINGS = Object.freeze({
  gravitational_constant: 1,
  min_interaction_distance: FLOOR,
  integrator: 'Symplectic Euler',
  mutual_gravity: true,
  use_barnes_hut: false,
  enable_star_merging: false,
});

const arg = name => {
  const hit = process.argv.slice(2).find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : null;
};
const flag = name => process.argv.slice(2).includes(`--${name}`);

/**
 * Run one cluster in the engine.
 * @param {object} P - The js/physics.js namespace
 * @param {object} lab - The validation harness lab
 * @param {object} ic - One entry of initial-conditions.json
 * @param {number} every - Steps between snapshots
 * @param {number} snaps - Snapshots after the first
 * @param {(snapshot: object, index: number) => void} onSnapshot
 * @returns {{bodies: number}} The number of bodies left at the end
 */
export function runEngine(P, lab, ic, every, snaps, onSnapshot) {
  lab.reset({ ...SETTINGS });
  P.resetSimulationTime();
  const bodies = [];
  for (let i = 0; i < ic.m.length; i++) {
    const s = new P.StarObject(
      { x: SCALE * ic.x[i], y: SCALE * ic.y[i] },
      { x: ic.vx[i], y: ic.vy[i] },
      1
    );
    s.mass = SCALE * ic.m[i];
    s.radius = 0.5;
    s.intact = true;
    s.persistent = true;
    P.stars.push(s);
    bodies.push(s);
  }
  lab.commit();
  const read = () => ({
    x: bodies.map(b => b.pos.x / SCALE),
    y: bodies.map(b => b.pos.y / SCALE),
    vx: bodies.map(b => b.vel.x),
    vy: bodies.map(b => b.vel.y),
    m: ic.m,
  });
  onSnapshot(read(), 0);
  for (let k = 1; k <= snaps; k++) {
    for (let s = 0; s < every; s++) P.updatePhysics(STEP);
    onSnapshot(read(), k);
  }
  return { bodies: bodies.filter(b => b.alive !== false).length };
}

const b64 = values => Buffer.from(new Float64Array(values).buffer).toString('base64');

function grid(id, seeds, axisName, axisValues, outputs, valuesOf, generator) {
  // dense layout, output by output, the last axis varying fastest: [output][seed][time]
  const flat = [];
  for (const o of outputs) for (const s of seeds) for (const v of valuesOf(o, s)) flat.push(v);
  return {
    format: 'gravitas.grid',
    formatVersion: 1,
    id,
    title: `${id}: the engine's precomputed cluster runs`,
    axes: [
      { name: 'seed', unit: '', values: seeds },
      { name: axisName, unit: axisName === 'sample' ? 'sampling interval (3 crossing times)' : 'snapshot (0.1 crossing time)', values: axisValues },
    ],
    outputs: outputs.map(name => ({ name, unit: name === 'seg' || name === 'esc' ? '' : 'virial radius' })),
    generator,
    layout: 'dense',
    storage: { encoding: 'float64-le', data: b64(flat) },
  };
}

async function inputsDigest() {
  const { GRAPH } = await import(pathToFileURL(path.join(REPO, 'tools/generate-graph.mjs')));
  const { digest } = await import(pathToFileURL(path.join(REPO, 'tools/generate.mjs')));
  const node = GRAPH.find(n => n.id === 'dynamics-runs');
  return { digest: digest(node, REPO), node: node.id, paths: node.inputs };
}

async function main() {
  if (flag('check')) {
    const doc = JSON.parse(readFileSync(OUT, 'utf8'));
    const now = await inputsDigest();
    if (doc.inputs.digest !== now.digest) {
      console.error(
        `the engine's runs are stale: the inputs (the engine, the harness, the starting points or this generator) changed since ${path.relative(REPO, OUT)} was written; run node tools/dynamics-runs.mjs --write (about ten minutes) and judge the gate again`
      );
      return 1;
    }
    console.log('the engine runs are current');
    return 0;
  }
  const P = await import(pathToFileURL(path.join(REPO, 'js/physics.js')));
  const { makeLab } = await import(pathToFileURL(path.join(REPO, 'js/validation/harness.js')));
  const lab = makeLab(P);
  const ics = JSON.parse(readFileSync(path.join(FIX, 'initial-conditions.json'), 'utf8'));
  const family = arg('family') ?? 'both';
  const pick = (all, key) => (arg('seeds') ? arg('seeds').split(',').map(Number).filter(s => all.includes(s)) : all);
  const S = {};
  const D = {};
  const t0 = Date.now();
  if (family === 'S' || family === 'both')
    for (const seed of pick(SEEDS_S)) {
      const rows = [];
      const r = runEngine(P, lab, ics.S[seed], S_EVERY, S_SAMPLES, snap => rows.push(measureCluster(snap)));
      S[seed] = { rows, bodies: r.bodies };
      console.error(`S${seed}: ${((Date.now() - t0) / 1000).toFixed(0)} s, ${r.bodies} bodies`);
    }
  if (family === 'D' || family === 'both')
    for (const seed of pick(SEEDS_D)) {
      const rs = [];
      const r = runEngine(P, lab, ics.D[seed], D_EVERY, D_SNAPS, snap => rs.push(measureSatellite(snap)));
      D[seed] = { rs, bodies: r.bodies };
      console.error(`D${seed}: ${((Date.now() - t0) / 1000).toFixed(0)} s, ${r.bodies} bodies`);
    }
  if (flag('print')) {
    console.log(JSON.stringify({ S, D }));
    return 0;
  }
  if (!flag('write')) {
    console.error('nothing written: pass --write for the whole table or --print for a slice');
    return 2;
  }
  const inputs = await inputsDigest();
  const generator = {
    name: 'tools/dynamics-runs.mjs',
    version: '1',
    inputs: { settings: SETTINGS, step: STEP, scale: SCALE, sEvery: S_EVERY, dEvery: D_EVERY, initialConditions: 'tests/fixtures/dynamics/initial-conditions.json', measurement: 'tools/dynamics-measure.mjs', digest: inputs.digest },
  };
  const doc = {
    format: 'gravitas.dynamics-engine-runs/1',
    note: 'The engine, not a reference. Chaotic after a few crossing times: compare ensemble means with the reference runs (DYNAMICS_REFERENCE_GATE.md), never one run.',
    inputs,
    settings: { ...SETTINGS, stepEngineUnits: STEP, lengthAndMassScale: SCALE },
    integrity: {
      S: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, v.bodies])),
      D: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v.bodies])),
    },
    S: grid('dynamics-engine-family-s', SEEDS_S, 'sample', Array.from({ length: S_SAMPLES + 1 }, (_, i) => i), ['r10', 'r50', 'r90', 'seg', 'esc'], (o, s) => S[s].rows.map(r => r[o]), generator),
    D: grid('dynamics-engine-family-d', SEEDS_D, 'snapshot', Array.from({ length: D_SNAPS + 1 }, (_, i) => i), ['rs'], (o, s) => D[s].rs, generator),
  };
  writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`wrote ${path.relative(REPO, OUT)}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(await main());
