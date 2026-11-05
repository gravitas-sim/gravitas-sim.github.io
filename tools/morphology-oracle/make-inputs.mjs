#!/usr/bin/env node
// Writes the oracle's inputs (Prompt 249): the forward-model manifests of the 8 B cases and of the main ensemble
// (parameters only; no kernel output). The oracle (oracle.py) reads this file and writes oracle-results.json.
//   node tools/morphology-oracle/make-inputs.mjs > tests/fixtures/morphology/oracle-inputs.json
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import {
  MORPHOLOGY_ORACLE_CASES,
  ORACLE_SAMPLE_PIXELS,
  morphologyEnsemble,
  MORPHOLOGY_WORLD,
} from '../../js/kernels/galaxy/morphology/index.js';

const thr = JSON.parse(
  readFileSync(
    new URL('../../tests/fixtures/morphology/thresholds.json', import.meta.url),
    'utf8'
  )
);
const w = MORPHOLOGY_WORLD;
const out = {
  format: 'gravitas.morphology-oracle-inputs/1',
  note: 'forward-model manifests only: no analysis output of the kernel is here',
  world: {
    width: w.width,
    height: w.height,
    skyElectrons: w.skyElectrons,
    readNoise: w.readNoise,
    subSamples: w.subSamples,
    coreSubSamples: w.coreSubSamples,
    coreRadius: w.coreRadius,
  },
  rule: thr.analysisRule.constants,
  samplePixels: ORACLE_SAMPLE_PIXELS,
  cases: MORPHOLOGY_ORACLE_CASES,
  ensemble: morphologyEnsemble(
    thr.checks.find(c => c.id === 'C1.sizeCoverage').limits.n,
    thr.seeds.ensemble
  ),
};
process.stdout.write(`${JSON.stringify(out)}\n`);
