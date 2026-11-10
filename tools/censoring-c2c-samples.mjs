// SPIKE (Roadmap III, Prompt 262 follow-up, C2c): the sample writer. Never merged.
//   node tools/censoring-c2c-samples.mjs <followup-thresholds.json> <scratch-dir>
// Writes the four Gravitas-stream ensembles to <scratch-dir>/stream-<ensemble>.f64 for the
// oracle's second stage. No estimator is imported or run here: draws only.
import { readFileSync, openSync, writeSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { truncatedRows, designs, replicateBytes, sha256 } from './censoring-c2c-stream.mjs';

const [thrPath, scratch] = process.argv.slice(2);
const thr = JSON.parse(readFileSync(thrPath));
const manifest = {};
for (const d of designs(thr)) {
  const name = `stream-${d.key}.f64`;
  const fd = openSync(join(scratch, name), 'w');
  const h = sha256();
  for (let r = 0; r < d.replicates; r++) {
    const bytes = replicateBytes(truncatedRows(d.baseSeed + r, d.streamLabel, d.N));
    h.update(bytes);
    writeSync(fd, bytes);
  }
  closeSync(fd);
  manifest[d.key] = { file: name, sha256: h.digest('hex'), replicates: d.replicates, N: d.N };
}
console.log(JSON.stringify(manifest, null, 1));
