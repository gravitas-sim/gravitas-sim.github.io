#!/usr/bin/env node
// =============================================================================
// The oracle's inputs for Prompt 185 (FRAME_PIPELINE.md, leg b)
// -----------------------------------------------------------------------------
//   node tools/frame-pipeline-oracle/make-inputs.mjs > tests/fixtures/framepipeline/oracle-inputs.json
//
// One synthetic sequence of the committed scene (seed fp-b-1, 48 frames) and its
// calibration set, as whole detector counts, each frame deflated (zlib, level 9)
// and packed as base64 uint16 little-endian; the stars' true positions in the
// reference frame; the aperture radii Gravitas's marks stage chose (so the two
// pipelines measure the same circles); and the gain, read noise and times. The
// oracle (oracle.py) never sees Gravitas's detections, registrations or fluxes.
// The inputs are committed as data: tests read them, not this script, so a
// change in the last bits of Math.log between Node versions cannot change them.
// =============================================================================

import { Buffer } from 'node:buffer';
import process from 'node:process';
import { deflateSync } from 'node:zlib';
import { calibrationSet } from '../../js/kernels/detector/frame.js';
import { CALIBRATION } from '../../js/measure/frameSource.js';
import { runSequence } from '../../js/measure/frameSeries.js';
import {
  SCENE,
  STARS,
  check,
  sceneParams,
  sceneSequence,
} from '../frame-pipeline-synth.mjs';

const seed = `${SCENE.seedPrefix}-b-1`;
const seq = sceneSequence(seed);
const pack = values => {
  const b = Buffer.alloc(values.length * 2);
  for (let i = 0; i < values.length; i++) b.writeUInt16LE(values[i], 2 * i);
  return deflateSync(b, { level: 9 }).toString('base64');
};
const set = calibrationSet({ seed, detector: seq.spec.detector }, CALIBRATION);
const run = await runSequence(seq, sceneParams(), {
  check,
  yieldNow: async () => {},
});
if (!run.ok) throw new Error(`the sequence was refused: ${run.code}`);
const out = {
  format: 'gravitas.frame-pipeline-oracle-inputs/1',
  prompt: 185,
  seed,
  width: seq.width,
  height: seq.height,
  gain: seq.gain,
  readNoise: seq.readNoise,
  darkRate: seq.darkRate,
  fullWell: seq.fullWell,
  exposure: seq.exposure,
  darkExposure: CALIBRATION.darkExposure,
  flatExposure: CALIBRATION.flatExposure,
  times: Array.from(seq.times),
  encoding:
    'each frame: whole counts, uint16 little-endian, zlib level 9, base64',
  stars: STARS,
  target: 'V',
  comparison: ['C1', 'C2', 'C3', 'C4'],
  check: 'C5',
  aperture: run.aperture,
  bias: set.bias.map(f => pack(f.values)),
  dark: set.dark.map(f => pack(f.values)),
  flat: set.flat.map(f => pack(f.values)),
  frames: Array.from({ length: seq.count }, (_, k) =>
    pack(seq.frameAt(k).values)
  ),
};
process.stdout.write(`${JSON.stringify(out)}\n`);
