#!/usr/bin/env node
// =============================================================================
// Writes tests/fixtures/galaxy/oracle-inputs.json (Prompt 248, GALAXY_SPECTRA.md)
// -----------------------------------------------------------------------------
//   node tools/galaxy-oracle/make-inputs.mjs > tests/fixtures/galaxy/oracle-inputs.json
//
// The data the independent oracle (oracle.py) reads: ten noisy synthetic galaxy spectra (a forward
// model: the flux and error arrays and the stated grid, never an analysis result), the two noise-free
// templates, the invented break bands and the pack's rest wavelengths of the lines the worlds name.
// The wavelength axes are the grids' arithmetic, written as their parameters. Nothing in the file is a
// kernel output.
// =============================================================================

import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from '../../js/kernels/galaxy/index.js';
import { LINES } from '../../js/data/radiation/lines.js';
import { stream } from '../../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THR = JSON.parse(
  readFileSync(path.join(ROOT, 'tests/fixtures/galaxy/thresholds.json'), 'utf8')
);
const SEED = THR.seeds.oracleInputs;
const round = (a, d = 8) => Array.from(a, v => Number(v.toPrecision(d)));

export function build() {
  const draw = stream('forward', SEED, 'cases');
  const u = (a, b) => a + (b - a) * draw();
  const cases = [];
  // 8 correlation cases (4 star-forming, 4 passive, alternating) and 2 more star-forming for the line leg
  for (let i = 0; i < 10; i++) {
    const kind = i < 8 ? (i % 2 ? 'passive' : 'star-forming') : 'star-forming';
    const z = Number(u(0.03, 0.3).toFixed(4));
    const snr = Number(u(8, 16).toFixed(2));
    const w = G.generateGalaxy({
      lines: LINES,
      kind,
      z,
      snr,
      seed: `oracle-${i}`,
    });
    cases.push({
      id: `case${i}`,
      kind,
      forwardZ: z,
      snr,
      flux: round(w.flux),
      sigmaPixel: w.truth.sigmaPixel,
      resolvingPower: w.resolvingPower,
      lines: w.truth.lines.map(l => ({
        id: l.id,
        kind: l.kind,
        restNm: l.restNm,
        observedNm: l.observedNm,
      })),
    });
  }
  const templates = {};
  for (const kind of ['star-forming', 'passive']) {
    const t = G.galaxyTemplate({ lines: LINES, kind });
    templates[kind] = {
      flux: round(t.flux),
      resolvingPower: t.resolvingPower,
    };
  }
  return {
    format: 'gravitas.galaxy-oracle-inputs/1',
    note: 'forward-model spectra, templates and grids only: no analysis output (no redshift, significance or break index) is in this file',
    seed: SEED,
    grid: {
      log10Start: G.GALAXY_WORLD.log10Start,
      log10Step: G.GALAXY_WORLD.log10Step,
      samples: G.GALAXY_WORLD.samples,
    },
    templateGrid: {
      log10Start: G.GALAXY_WORLD.templateLog10Start,
      log10Step: G.GALAXY_WORLD.log10Step,
      samples: G.GALAXY_WORLD.templateSamples,
    },
    zRange: THR.worlds.ensembles.zRange,
    breakBands: {
      blueNm: [...G.INVENTED_BREAK_BANDS.blueNm],
      redNm: [...G.INVENTED_BREAK_BANDS.redNm],
    },
    highPassWindow: G.HIGH_PASS_WINDOW,
    templates,
    cases,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.stdout.write(`${JSON.stringify(build())}\n`);
