#!/usr/bin/env node
// Exports the radiation pack's bandpass tables the oracle integrates (data only: wavelengths in nm and the
// photon-counting response, as decoded by the radiation kernel's decodeBand). Nothing is computed here.
//   node tools/multimessenger-oracle/make-inputs.mjs > tests/fixtures/multimessenger/oracle-bands.json
import process from 'node:process';
import { BANDS } from '../../js/data/radiation/bandpasses.js';
import { decodeBand } from '../../js/kernels/radiation/photometry.js';

const WANT = ['g', 'r', 'i', 'z', 'J', 'H', 'Ks'];
const out = {
  format: 'gravitas.multimessenger-oracle-bands/1',
  note: 'bandpass tables of the radiation pack (js/data/radiation/bandpasses.js), decoded; read as data by tools/multimessenger-oracle/oracle.py',
  bands: {},
};
for (const id of WANT) {
  const b = decodeBand(BANDS.find(x => x.id === id));
  out.bands[id] = {
    lambdaNm: Array.from(b.lambdaNm),
    response: Array.from(b.s),
  };
}
process.stdout.write(`${JSON.stringify(out)}\n`);
