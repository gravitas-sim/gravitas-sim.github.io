#!/usr/bin/env node
// =============================================================================
// The oracle's input frames (Prompt 183)
// -----------------------------------------------------------------------------
//   node tools/detection-oracle/make-inputs.mjs <out.json>
//
// Seeded synthetic frames (tools/detection-synth.mjs: the detector kernel's
// sky and noise, bias subtracted, in whole ADU, with stars of known truth) that
// the oracle (oracle.py: photutils and astropy) and the tests both read, so
// neither regenerates a pixel. The truth of every star is in `truth`; a mask is
// a list of pixel indices. The algorithm's parameters are copied from the
// committed thresholds file, so the oracle runs what the contract named.
// =============================================================================

import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  SCENE,
  THRESHOLDS,
  gridStars,
  makeFrame,
  rngOf,
} from '../detection-synth.mjs';

const rng = id => rngOf('oracle', id);
const kernelStars = (id, flux) => gridStars(rng(id)).map(p => ({ ...p, flux }));

const SPECS = [
  { id: 'moderate', stars: kernelStars('moderate', 1200) },
  { id: 'bright', stars: kernelStars('bright', 20000) },
  {
    id: 'ellipses',
    stars: gridStars(rng('ellipses')).map((p, i) => ({
      ...p,
      flux: 30000,
      psf: {
        kind: 'ellipse',
        sigmaA: 2.2,
        sigmaB: 1.2,
        thetaDeg: [-75, -30, 15, 45, 80][i % 5],
      },
    })),
  },
  {
    id: 'gradient',
    stars: kernelStars('gradient', 3000).slice(0, 8),
    plane: { x: 1.0, y: 0.7 },
  },
  {
    id: 'masked',
    stars: kernelStars('masked', 3000),
    maskBlocks: [
      { x0: 40, x1: 43, y0: 20, y1: 22 },
      { x0: 70, x1: 90, y0: 60, y1: 63 },
      { x0: 5, x1: 5, y0: 0, y1: 127 },
    ],
    hot: [{ x: 100, y: 100, adu: 60000 }],
    maskHot: true,
  },
  {
    id: 'wide',
    detector: { fwhm: 4.5 },
    stars: kernelStars('wide', 5000),
  },
  {
    id: 'moffat',
    stars: gridStars(rng('moffat')).map(p => ({
      ...p,
      flux: 20000,
      psf: { kind: 'moffat', fwhm: 3, beta: 2.5 },
    })),
  },
  {
    id: 'pairs',
    stars: [
      { x: 30, y: 30, flux: 6000 },
      { x: 35, y: 30, flux: 6000 },
      { x: 80, y: 30, flux: 6000 },
      { x: 94, y: 30, flux: 6000 },
      { x: 4, y: 80, flux: 3000 },
      { x: 60, y: 100, flux: 3000 },
    ],
  },
];

const frames = SPECS.map(s => {
  const W = SCENE.detector.width;
  const mask = s.maskBlocks ? new Uint8Array(W * W) : null;
  const masked = [];
  for (const b of s.maskBlocks ?? [])
    for (let y = b.y0; y <= b.y1; y++)
      for (let x = b.x0; x <= b.x1; x++) {
        mask[y * W + x] = 1;
        masked.push(y * W + x);
      }
  const hot = s.hot ?? [];
  if (s.maskHot)
    for (const h of hot) {
      mask[h.y * W + h.x] = 1;
      masked.push(h.y * W + h.x);
    }
  const f = makeFrame({
    seed: `detection-183-oracle-${s.id}`,
    stars: s.stars,
    detector: s.detector ?? {},
    plane: s.plane ?? null,
    hot,
    mask,
    rounded: true,
  });
  const adu = Int16Array.from(f.data);
  return {
    id: s.id,
    width: f.width,
    height: f.height,
    fwhm: s.detector?.fwhm ?? SCENE.detector.fwhm,
    adu: Buffer.from(adu.buffer).toString('base64'),
    mask: masked.sort((a, b) => a - b),
    truth: {
      stars: s.stars,
      plane: s.plane ?? null,
      hot,
      exposure: SCENE.exposure,
    },
  };
});

const doc = {
  format: 'gravitas.detection-oracle-inputs/1',
  convention:
    'pixel (0, 0) is the centre of the first pixel, x along a row; frames are bias-subtracted ADU (int16 little-endian, base64) times the gain make electrons; mask is a list of flat pixel indices (y * width + x)',
  gain: SCENE.detector.gain,
  readNoise: SCENE.detector.readNoise,
  algorithm: THRESHOLDS.algorithm,
  frames,
};
writeFileSync(process.argv[2], JSON.stringify(doc) + '\n');
process.stdout.write(
  `wrote ${process.argv[2]}: ${frames.length} frames, ${frames.reduce((n, f) => n + f.truth.stars.length, 0)} stars\n`
);
