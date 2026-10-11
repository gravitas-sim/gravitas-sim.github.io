// The labelled sample of the "Which kind of variable" lesson, measured once.
//   node tools/variables-sample.mjs          write variables/class-sample.json
//   node tools/variables-sample.mjs --check  fail if the file is not what the kernel makes
// The sample is synthetic (js/kernels/variables/classify.js); measuring 120
// light curves takes seconds, so the instrument reads the result instead of
// repeating it. tests/variablesKernel.test.js holds the file to the kernel.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSample } from '../js/kernels/variables/classify.js';

export const SAMPLE_OPTIONS = Object.freeze({
  perClass: 24,
  seed: 'variables-sample',
});
const FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'variables',
  'class-sample.json'
);
const r = (v, d) => Number(v.toFixed(d));

export function sampleJson() {
  const rows = makeSample(SAMPLE_OPTIONS).map(s => ({
    id: s.id,
    cls: s.cls,
    truthPeriod: r(s.truthPeriod, 5),
    period: r(s.period, 5),
    amplitude: r(s.amplitude, 4),
    r21: r(s.r21, 4),
    phi21: r(s.phi21, 3),
  }));
  return `${JSON.stringify({
    format: 'gravitas.variables-sample',
    formatVersion: 1,
    origin: 'synthetic',
    options: SAMPLE_OPTIONS,
    rows,
  })}\n`;
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  const text = sampleJson();
  if (process.argv.includes('--check')) {
    if (readFileSync(FILE, 'utf8') !== text) {
      console.error('variables/class-sample.json is stale');
      process.exit(1);
    }
    console.log('variables/class-sample.json is current');
  } else {
    writeFileSync(FILE, text);
    console.log(`wrote ${FILE} (${text.length} bytes)`);
  }
}
