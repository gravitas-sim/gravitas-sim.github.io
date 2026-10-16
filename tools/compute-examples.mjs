#!/usr/bin/env node
// =============================================================================
// The compute page's two Gravitas-made example inputs
// -----------------------------------------------------------------------------
//   node tools/compute-examples.mjs           write what differs
//   node tools/compute-examples.mjs --check   fail when a file differs
//
// Roadmap II Prompt 102 (COMPUTE.md). The notebooks of the computational-
// astrophysics module read two documents Gravitas itself writes, so their
// examples are made by Gravitas's own code, not typed:
//
//   compute/inputs/kepler-16.gravitas-system.json
//       the Orbital System Builder's Kepler-16 template, saved exactly as the
//       builder saves it (js/systemSpec.js systemToFile, two-space JSON)
//   compute/inputs/binary-planet-population.experiment-result.json
//       a gravitas.experiment-result/1 of twenty planets with seeded uniform
//       starting distances in the Binary Planet Lab, every trial run by the
//       engine (js/experiments/trialRunner.js, the code an experiment Worker
//       runs). Two things differ from what the experiment page exports, so the
//       file is the same on every machine: the wall-clock fields are zero and
//       the per-trial series are left out (nothing here reads them; the file
//       is 40 times smaller). Dates are fixed.
//
// The notebooks' hashes of these files are in js/compute/catalogueHashes.js
// (node tools/compute.mjs). The result takes about ten seconds to make.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.join(ROOT, p);
const load = p => import(path.join(ROOT, p));

export const SYSTEM_FILE = 'compute/inputs/kepler-16.gravitas-system.json';
export const RESULT_FILE =
  'compute/inputs/binary-planet-population.experiment-result.json';

/** Kepler-16, from the builder's own template (js/systemBuilder.js). */
async function systemText() {
  const spec = await load('js/systemSpec.js');
  const app = await load('js/appState.js');
  const verdict = spec.validateSystem({
    bodies: [
      { name: 'Kepler-16 A', type: 'Star', mass: 0.6897 },
      {
        name: 'Kepler-16 B',
        type: 'Star',
        mass: 0.20255,
        primary: 0,
        a: 0.22431,
        e: 0.15944,
        omega: 263.464,
      },
      {
        name: 'Kepler-16 b',
        type: 'GasGiant',
        mass: 0.333,
        primary: 0,
        a: 0.7048,
        e: 0.0069,
        omega: 318,
      },
    ],
  });
  if (!verdict.ok) throw new Error('the Kepler-16 template did not validate');
  const built = spec.buildSystem(verdict.bodies, {
    G: app.DEFAULT_SETTINGS.gravitational_constant,
  });
  return `${JSON.stringify(spec.systemToFile(verdict.bodies, built), null, 2)}\n`;
}

/** Twenty planets, each its own engine trial. */
async function resultText() {
  const m = {
    physics: await load('js/physics.js'),
    build: await load('js/world/build.js'),
    scenarios: await load('js/scenarios.js'),
    appState: await load('js/appState.js'),
    rng: await load('js/rng.js'),
    timestep: await load('js/timestep.js'),
    units: await load('js/units.js'),
  };
  const R = await load('js/experiments/trialRunner.js');
  const E = await load('js/experiments/experimentManifest.js');
  const manifest = {
    format: E.FORMAT,
    formatVersion: E.FORMAT_VERSION,
    title: 'Binary Planet Lab: twenty planets, seeded starting distances',
    model: { scenario: 'binary-planet-lab', platform: E.PLATFORM_RANGE },
    initial: { settings: {} },
    seeds: ['population-102'],
    vary: [
      {
        parameter: 'binary_lab_planet_a',
        distribution: {
          kind: 'uniform',
          min: 0.12,
          max: 0.42,
          samples: 20,
          seed: 'population-102',
        },
      },
    ],
    observables: {
      metrics: ['distance_to_primary', 'energy_drift'],
      roles: { bodies: ['planet'], primary: 'Star A' },
    },
    stop: { duration: 100000, events: [] },
    numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
    limits: E.defaultLimits('desktop'),
    summaries: ['mean', 'min', 'max', 'status-counts'],
  };
  const problems = E.validateExperiment(manifest);
  if (problems.length) throw new Error(JSON.stringify(problems));
  const trials = E.planTrials(manifest).map(t => {
    const r = R.runTrial(m, manifest, t);
    const rest = { ...r };
    delete rest.series;
    return { ...rest, wallMs: 0, timing: null, series: undefined };
  });
  const clean = trials.map(t => JSON.parse(JSON.stringify(t)));
  return `${JSON.stringify(
    {
      format: E.RESULT_FORMAT,
      formatVersion: E.RESULT_VERSION,
      hash: E.experimentHash(manifest),
      manifest,
      engine: {
        fingerprint: R.engineFingerprint(m),
        app: 'gravitas',
        platform: '1.0.0',
      },
      environment: { profile: 'desktop', concurrency: 1, cores: null },
      startedAt: '2026-10-11T00:00:00.000Z',
      finishedAt: '2026-10-11T00:00:00.000Z',
      status: 'complete',
      stopReason: null,
      resumedTrials: [],
      elapsedMs: 0,
      trials: clean,
      summary: E.summarizeExperiment(manifest, clean),
    },
    null,
    2
  )}\n`;
}

/** Every file this writes: path to text. */
export async function generated() {
  return new Map([
    [SYSTEM_FILE, await systemText()],
    [RESULT_FILE, await resultText()],
  ]);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const check = process.argv.includes('--check');
  const bad = [];
  for (const [file, text] of await generated()) {
    const have = existsSync(rel(file)) ? readFileSync(rel(file), 'utf8') : null;
    if (have === text) continue;
    bad.push(file);
    if (!check) writeFileSync(rel(file), text);
  }
  if (check && bad.length) {
    console.error(`${bad.join('\n')}\nThese example inputs differ.`);
    process.exit(1);
  }
  console.log(
    check
      ? 'The compute example inputs are current.'
      : `Wrote ${bad.length} example inputs.`
  );
}
