#!/usr/bin/env node
// =============================================================================
// Photometry fixtures: what is captured, and from what (Prompt 180)
// -----------------------------------------------------------------------------
//   node tools/photometry-fixtures.mjs golden   write the kernel golden
//
// `golden`: the numbers js/kernels/detector/reduce.js (estimateBackground,
// aperturePhotometry) and js/measure/aperture.js (measureFlux) gave on v3
// 80668d38, before Prompt 180 changed anything, on detector-kernel frames of
// fixed seeds. tests/photometry.test.js holds the current code to them
// (check k1.kernelUnchanged, 1e-12 relative): Prompt 180 extends the kernel and
// must not change its numbers. The oracle's frames and results come from
// tools/photometry-oracle/ (PHOTOMETRY.md, section "The oracle").
// =============================================================================

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateFrame } from '../js/kernels/detector/frame.js';
import {
  aperturePhotometry,
  estimateBackground,
} from '../js/kernels/detector/reduce.js';
import { measureFlux } from '../js/measure/aperture.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../tests/fixtures/photometry/kernel-golden.json');

export const GOLDEN_FRAMES = [
  {
    seed: 'photometry-180-golden-lab',
    detector: {},
    exposure: 20,
    scene: {
      sky: 3,
      sources: [
        { x: 20.3, y: 24.6, rate: 400 },
        { x: 33.8, y: 15.2, rate: 120 },
      ],
    },
  },
  {
    seed: 'photometry-180-golden-clean',
    detector: {
      width: 64,
      height: 64,
      vignette: 0,
      dustCount: 0,
      qeScatter: 0,
      hotFraction: 0,
      cosmicRate: 0,
      biasColumnSigma: 0,
    },
    exposure: 30,
    scene: { sky: 3, sources: [{ x: 31.6, y: 32.4, rate: 500 }] },
  },
];
export const GOLDEN_APERTURES = [
  { x: 20.3, y: 24.6, r: 5, rIn: 8, rOut: 13 },
  { x: 33.8, y: 15.2, r: 4.25, rIn: 7.5, rOut: 12.5 },
  { x: 31.6, y: 32.4, r: 6.1, rIn: 9.2, rOut: 15.4 },
];

/** The electron image and sidecar numbers of one golden frame. */
export function goldenFrame(spec) {
  const f = simulateFrame({
    seed: spec.seed,
    exposure: spec.exposure,
    detector: spec.detector,
    scene: spec.scene,
  });
  const gain = f.truth.detector.gain;
  const values = Float64Array.from(f.values, v => v * gain);
  return { width: f.width, height: f.height, values, gain, f };
}

/** Everything the two modules say about one aperture on one frame. */
export function goldenCase(img, a, gain, readNoise) {
  const bg = estimateBackground(img, a);
  const p = aperturePhotometry(img, { ...a, readNoise });
  const m = measureFlux({ ...img, values: img.values }, { ...a, gain });
  const strip = ({ node: _node, ...rest }) => rest;
  return {
    aperture: a,
    background: { level: bg.level, scatter: bg.scatter, n: bg.n },
    photometry: {
      net: p.net,
      sigma: p.sigma,
      snr: p.snr,
      npix: p.npix,
      sky: p.sky,
      terms: p.terms,
      warnings: p.warnings,
    },
    measureFlux: strip(m),
  };
}

export function buildGolden() {
  return GOLDEN_FRAMES.map(spec => {
    const { width, height, values, gain, f } = goldenFrame(spec);
    const img = { width, height, values, exposure: f.exposure };
    return {
      seed: spec.seed,
      cases: GOLDEN_APERTURES.filter(
        a =>
          a.x - a.rOut >= 0 &&
          a.y - a.rOut >= 0 &&
          a.x + a.rOut < width &&
          a.y + a.rOut < height
      ).map(a => goldenCase(img, a, gain, f.truth.detector.readNoise)),
    };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'golden') {
    const doc = {
      format: 'gravitas.photometry-kernel-golden/1',
      capturedFrom: 'v3 80668d38, node ' + process.version,
      frames: buildGolden(),
    };
    writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
    console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
  } else {
    console.error('usage: node tools/photometry-fixtures.mjs golden');
    process.exit(2);
  }
}
