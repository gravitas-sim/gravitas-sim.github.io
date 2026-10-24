// =============================================================================
// The inputs of the authentic-leg oracle (Prompt 189, contract part 3)
// -----------------------------------------------------------------------------
//   node tools/image-packs-oracle/make-inputs-authentic.mjs > tests/fixtures/imagePacks/authentic/oracle-inputs.json
//   (then Prettier)
//
// Gravitas runs the contract's legs (and the variants of part 4) and writes what
// the oracle (oracle-authentic.py) is given: the matched stars and the solution,
// the apertures and the positions the pipeline measured. The oracle reads the
// pixels itself from the committed cutout.
// =============================================================================

import process from 'node:process';
import {
  VARIANTS,
  decide,
  loadAuthentic,
  oracleInputs,
} from '../image-packs-authentic.mjs';

const A = loadAuthentic();
const Ds = {};
for (const [name, opts] of Object.entries(VARIANTS))
  Ds[name] = await decide(A, opts);
process.stdout.write(JSON.stringify(oracleInputs(Ds)));
