#!/usr/bin/env node
// =============================================================================
// The oracle's input (Prompt 184)
// -----------------------------------------------------------------------------
//   node tools/injection-oracle/make-inputs.mjs <out.json>
//
// One blank frame (the detector kernel's sky and noise, bias subtracted, whole
// ADU: tools/detection-synth.mjs) and one plan of injected sources (position and
// total electrons), drawn here from the `injection` stream of Prompt 149 with the
// placement rule of tests/fixtures/injection/thresholds.json (3 FWHM from the
// border, 4 FWHM apart), not by js/measure/inject.js: the oracle's input exists
// before the module does. Both are packed as base64 so the file is small and
// neither side regenerates a number. The oracle draws its own noise.
// =============================================================================

import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { makeFrame, THRESHOLDS as DET } from '../detection-synth.mjs';
import { stream } from '../../js/random/streams.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(
  readFileSync(
    path.join(HERE, '../../tests/fixtures/injection/thresholds.json'),
    'utf8'
  )
);
const SCENE = T.scene;
const FWHM = SCENE.fwhm;
const SIGMA = FWHM / (2 * Math.sqrt(2 * Math.LN2));
const NOISE = Math.sqrt(90 + 8 * 8 + (1.5 * 1.5) / 12);
const FLUX_PER_S = Math.sqrt(4 * Math.PI) * SIGMA * NOISE;
const SEED = `${SCENE.seedPrefix}-oracle`;

const W = DET.scene.detector.width;
const frame = makeFrame({ seed: `${SEED}-base`, stars: [], rounded: true });
const adu = new Int16Array(frame.data.length);
for (let i = 0; i < adu.length; i++) adu[i] = frame.data[i];

const TRIALS = 400;
const PER_TRIAL = 10;
const S_HIGH = 12;
const S_LOW = 2.5;
const margin = 3 * FWHM;
const apart = 4 * FWHM;
const plan = new Float64Array(TRIALS * PER_TRIAL * 3);
for (let t = 0; t < TRIALS; t++) {
  const draw = stream('injection', SEED, 'plan', t);
  const placed = [];
  for (let j = 0; j < PER_TRIAL; j++) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = margin + draw() * (W - 1 - 2 * margin);
      const y = margin + draw() * (W - 1 - 2 * margin);
      if (placed.every(p => Math.hypot(p.x - x, p.y - y) >= apart)) {
        // uniform in magnitude between the two signal-to-noise ends
        const m =
          -2.5 * Math.log10((FLUX_PER_S * S_HIGH) / SCENE.exposure) +
          draw() * 2.5 * Math.log10(S_HIGH / S_LOW);
        const F = SCENE.exposure * 10 ** (-0.4 * m);
        placed.push({ x, y, F });
        break;
      }
    }
  }
  if (placed.length !== PER_TRIAL)
    throw new Error(`trial ${t}: placed ${placed.length}`);
  placed.forEach((p, j) => plan.set([p.x, p.y, p.F], (t * PER_TRIAL + j) * 3));
}

const b64 = a =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const cases = [];
for (const [n, ks] of [
  [1, [0, 1]],
  [2, [0, 1, 2]],
  [5, [0, 1, 2, 3, 4, 5]],
  [10, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [30, [0, 1, 15, 29, 30]],
  [100, [0, 1, 50, 99, 100]],
  [1000, [0, 1, 500, 999, 1000]],
])
  for (const k of ks)
    for (const level of [0.6827, 0.95, 0.99]) cases.push([k, n, level]);

const out = {
  format: 'gravitas.injection-oracle-inputs/1',
  prompt: 184,
  gain: DET.scene.detector.gain,
  width: W,
  height: frame.height,
  fwhm: FWHM,
  exposure: SCENE.exposure,
  matchRadius: SCENE.matchRadius,
  algorithm: {
    box: 16,
    clip: DET.algorithm.background.clip,
    sigma: 4,
    minArea: 5,
  },
  oracleSeed: 184001,
  frame: { id: `${SEED}-base`, adu: b64(adu) },
  plan: {
    trials: TRIALS,
    perTrial: PER_TRIAL,
    sHigh: S_HIGH,
    sLow: S_LOW,
    fluxPerSignalToNoise: FLUX_PER_S,
    xyF: b64(plan),
  },
  renderSample: { sources: 40, half: 3 },
  intervalCases: cases,
};
writeFileSync(process.argv[2], `${JSON.stringify(out)}\n`);
process.stdout.write(
  `wrote ${process.argv[2]}: ${plan.length / 3} sources, ${cases.length} cases\n`
);
