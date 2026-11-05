#!/usr/bin/env node
// The data the HI oracle needs from the kernel and nothing else: the two atomic constants (as inputs, so the oracle
// tests the arithmetic and not the constants), and the 24 noisy spectra of leg B4 plus the one noise-free spectrum of
// leg B5, exactly as the kernel's generator makes them. Nothing is computed here but the spectra.
//   node tools/radio-oracle/make-inputs.mjs > tests/fixtures/radio/oracle-inputs.json
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  HI_LINE,
  generateSpectrum,
  withNoise,
} from '../../js/kernels/radio/index.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THR = JSON.parse(readFileSync(path.join(ROOT, 'tests/fixtures/radio/thresholds.json'), 'utf8'));

/** The 24 spectra of B4: six worlds, longitudes 30 and 55 (first quadrant), 305 and 330 (fourth); noise from seed 'hi-241:b4'. */
export function b4Spectra() {
  const out = [];
  for (const world of THR.synthetic.worlds) {
    const [curveName, sv] = world.split(':');
    for (const l of [30, 55, 305, 330]) {
      const s = generateSpectrum({ l, curveName, sigmaV: Number(sv) });
      const noisy = withNoise(s, THR.synthetic.noiseK, 'hi-241', 'b4', world, l);
      out.push({
        world,
        l,
        sigmaV: Number(sv),
        temperature: noisy.temperature,
        circularSpeedTruth: s.truth.circularSpeedAtTangent,
      });
    }
  }
  return out;
}

export function b5Spectrum() {
  const s = generateSpectrum({ l: 30, curveName: 'flat', sigmaV: 5 });
  return { world: 'flat:5', l: 30, temperature: s.temperature, columnCm2: s.truth.columnCm2 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = {
    format: 'gravitas.radio-oracle-inputs/1',
    note: 'read as data by tools/radio-oracle/oracle.py; the spectra are the kernel generator\'s, regenerated and compared by the validator',
    atomic: { restFrequencyHz: HI_LINE.restFrequencyHz, spinFlipRateS: HI_LINE.spinFlipRateS },
    channels: THR.synthetic.channels,
    b4: b4Spectra(),
    b5: b5Spectrum(),
  };
  process.stdout.write(`${JSON.stringify(out)}\n`);
}
