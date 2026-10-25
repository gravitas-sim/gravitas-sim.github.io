#!/usr/bin/env node
// The inputs of the independent oracle (oracle.py): 48 epochs of the observing
// plan and the truth marks of every moon at the plan's epochs. Writes
// tests/fixtures/galilean/oracle-inputs.json. Nothing here is a result.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModel, marksOf } from '../galilean-validate.mjs';
import { designEpochs } from '../../js/satellites/cadence.js';
import { MOON_IDS } from '../../js/satellites/galilean.js';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const model = loadModel();
const epochs = designEpochs(model);
const { t, x } = marksOf(model, epochs);
// 48 epochs spread over the 51: every epoch except three, kept in order.
const pick = epochs.filter((_, i) => i % 17 !== 5 || i === 0).slice(0, 48);
const out = {
  note: 'Inputs for tools/galilean-oracle/oracle.py. jdTt are the plan epochs; marks are the kernel truth marks (R_J) the oracle refits.',
  geometryEpochsJdTt: pick.map(e => e.jdTt),
  fit: {
    sigmaRj: 0.03,
    t: Array.from(t),
    x: Object.fromEntries(MOON_IDS.map(id => [id, Array.from(x[id])])),
  },
};
writeFileSync(
  path.join(ROOT, 'tests/fixtures/galilean/oracle-inputs.json'),
  `${JSON.stringify(out)}\n`
);
console.log(
  `${out.geometryEpochsJdTt.length} geometry epochs, ${t.length} marks`
);
