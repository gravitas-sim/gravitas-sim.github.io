// Writes the B3 series of the pulsar contract (a dynamic spectrum of the synthetic pulsar) as a
// plain header and a raw little-endian float32 block, channel-major, so that a pulsar toolkit of
// Carl's choice can be run on it for leg B6 (PULSARS.md, "What to supply"). The truth is in the
// header on purpose, for comparison afterwards, and not for the toolkit to read.
//   node tools/pulsar-oracle/export-series.mjs <output-directory>
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';
import { generateDynamicSpectrum } from '../../js/kernels/radio/index.js';

const out = process.argv[2];
if (!out) {
  process.stderr.write(
    'usage: node tools/pulsar-oracle/export-series.mjs <output-directory>\n'
  );
  process.exit(2);
}
const inputs = JSON.parse(
  readFileSync(
    new URL('../../tests/fixtures/pulsars/oracle-inputs.json', import.meta.url),
    'utf8'
  )
);
const s = generateDynamicSpectrum({ ...inputs.b3.world });
mkdirSync(out, { recursive: true });
writeFileSync(
  path.join(out, 'series.f32'),
  Buffer.from(Float32Array.from(s.data).buffer)
);
writeFileSync(
  path.join(out, 'series.json'),
  `${JSON.stringify(
    {
      label: s.label,
      layout: 'little-endian float32, channel-major, nchan by nsamp',
      nchan: s.nchan,
      nsamp: s.nsamp,
      dtSeconds: s.dt,
      frequenciesMHz: s.frequencyMHz,
      truth: { period: s.truth.period, dm: s.truth.dm },
    },
    null,
    2
  )}\n`
);
process.stdout.write(`wrote ${out}/series.f32 and series.json\n`);
