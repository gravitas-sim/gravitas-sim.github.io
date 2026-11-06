#!/usr/bin/env node
// =============================================================================
// Writes tests/fixtures/agn/oracle-inputs-followup.json (Prompt 252 follow-up, AGN.md "Follow-up (252b)")
// -----------------------------------------------------------------------------
//   node tools/agn-oracle/make-inputs-followup.mjs > tests/fixtures/agn/oracle-inputs-followup.json
//
// The data oracle.py reads for leg B3b: eight noisy synthetic quasar spectra of the NON-HARMONIC world and its
// noise-free template (a forward model: the flux and error arrays and the stated grids, never an analysis result).
// The grids, high-pass window and redshift range are those of oracle-inputs.json; the sections B3b does not use
// (light curves, narrow lines, flux sets, masses, cosmologies) are empty, which oracle.py accepts.
// =============================================================================

import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as A from '../../js/kernels/agn/index.js';
import { LINES } from '../../js/data/radiation/lines.js';
import { stream } from '../../js/random/streams.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const FU = read('tests/fixtures/agn/followup-thresholds.json');
const OLD = read('tests/fixtures/agn/oracle-inputs.json');
const SEED = FU.seeds.oracleInputs;
const round = (a, d = 9) => Array.from(a, v => Number(v.toPrecision(d)));
const L = FU.checks.find(c => c.id === 'B3b.redshiftOracleNonHarmonic').limits;

export function build() {
  const draw = stream('forward', SEED, 'cases');
  const u = (a, b) => a + (b - a) * draw();
  const quasars = [];
  for (let i = 0; i < L.n; i++) {
    const z = Number(u(L.zRange[0], L.zRange[1]).toFixed(4));
    const snr = Number(u(L.snrRange[0], L.snrRange[1]).toFixed(2));
    const w = A.generateQuasar({
      lines: LINES,
      z,
      snr,
      lineSet: 'non-harmonic',
      seed: `oracle-fq${i}`,
    });
    quasars.push({
      id: `quasar${i}`,
      forwardZ: z,
      snr,
      flux: round(w.flux),
      sigmaPixel: w.truth.sigmaPixel,
    });
  }
  const tpl = A.quasarTemplate({ lines: LINES, lineSet: 'non-harmonic' });
  return {
    format: 'gravitas.agn-oracle-inputs/1',
    note: 'forward-model spectra and the template of the non-harmonic world only: no analysis output is in this file; the sections leg B3b does not use are empty',
    seed: SEED,
    grid: OLD.grid,
    templateGrid: OLD.templateGrid,
    narrowGrid: OLD.narrowGrid,
    zRange: OLD.zRange,
    highPassWindow: OLD.highPassWindow,
    template: { flux: round(tpl.flux), resolvingPower: tpl.resolvingPower },
    quasars,
    curves: [],
    narrow: [],
    bpt: { curves: OLD.bpt.curves, fluxSets: [], points: [] },
    timescale: OLD.timescale,
    eddington: { massesSolar: [], luminositiesW: [] },
    cosmologies: [],
    distanceZs: [],
    fluxWM2: OLD.fluxWM2,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.stdout.write(`${JSON.stringify(build())}\n`);
