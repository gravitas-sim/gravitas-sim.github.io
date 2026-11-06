#!/usr/bin/env node
// =============================================================================
// The 200 seeded synthetic events of gate leg G7 (Prompt 251 Part B, AM2) as plain points
// -----------------------------------------------------------------------------
// Writes tests/fixtures/lensing2/oracle-finite-inputs.json: for each event its times, fluxes and sigmas
// (drawn with the merged lensing kernel's labelled syntheticEvent) and its truth manifest, for the
// independent scipy fit of tools/lensing2-oracle/finite-fit.py. SYNTHETIC; inputs only, no fit.
// =============================================================================

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { stream } from '../../js/random/streams.js';
import { syntheticEvent } from '../../js/kernels/lensing/fit.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** One G7 event (AM2): the draws are the 'noise' stream forked by the seed and the index. */
export function g7Event(seed, i) {
  const u = stream('noise', seed, String(i));
  const rho = Math.exp(Math.log(0.03) + u() * Math.log(10));
  const near = i < 100;
  const u0 = near ? (0.1 + u() * 1.9) * rho : (3 + u() * 3) * rho;
  const fs = 0.5 + u() * 0.5;
  const times = Array.from({ length: 61 }, (_, k) => -50 + (100 * k) / 60);
  const truth = { t0: 0, u0, tE: 20, fs, rho };
  const ev = syntheticEvent({ seed: `${seed}:${i}`, times, truth, noise: 0.01 });
  return { id: i, near, truth, x: Array.from(ev.x), y: Array.from(ev.y), sigma: Array.from(ev.sigma) };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const events = Array.from({ length: 200 }, (_, i) => g7Event('lensing2-G7', i));
  writeFileSync(
    path.join(ROOT, 'tests', 'fixtures', 'lensing2', 'oracle-finite-inputs.json'),
    `${JSON.stringify({ format: 'gravitas.lensing2-finite-inputs/1', note: 'SYNTHETIC events, inputs only', seed: 'lensing2-G7', events })}\n`
  );
  process.stdout.write('wrote oracle-finite-inputs.json: 200 events\n');
}
