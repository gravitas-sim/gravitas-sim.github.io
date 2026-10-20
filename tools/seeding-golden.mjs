#!/usr/bin/env node
// =============================================================================
// Every seeded sequence that moved onto js/random, recorded at full precision
// -----------------------------------------------------------------------------
// Development and test (tests/seedingEquivalence.test.js). Prompt 149 moves the
// seeded call sites in the forward models, the experiments and the noise models
// onto named streams (js/random/streams.js) and must not change one draw. This
// calls each site through its own public function with a fixed set of seeds,
// the odd ones included (a number that is not an integer, a negative one, NaN,
// null, undefined, the empty text, a word with an accent), and records for each
// case how many numbers came back, the first and the last, and a SHA-256 of all
// of them at full precision.
//
//   node tools/seeding-golden.mjs [--out tests/fixtures/seedingGolden.json]
//
// tests/fixtures/seedingGolden.json is this tool's answer on the commit before
// the call sites moved (v3 at 9847b6e5), byte for byte. It works in any
// checkout: it reads only the public functions the sites have always had.
// =============================================================================

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { gaussian } from '../js/inference/synthetic.js';
import { gaussianNoise } from '../js/kernels/lensing/noise.js';
import { syntheticHubbleDiagram } from '../js/kernels/cosmology/fit.js';
import {
  detectorPattern,
  simulateFrame,
  simulateSeries,
} from '../js/kernels/detector/frame.js';
import { uniformAt } from '../js/forward/setup.js';
import { nightlyEpochs, makeSample } from '../js/kernels/variables/classify.js';
import { bootstrapPeriod } from '../js/kernels/variables/period.js';
import { makeUniverse, observe } from '../js/survey/model.js';
import { synthesisePopulation } from '../js/stellar/population.js';
import { valuesFor } from '../js/experiments/experimentManifest.js';
import { coloredNoise } from '../js/gw/noise.js';
import { gaussianStream } from '../js/inference/rvMonteCarlo.js';
import { gaussianAt } from '../js/rvSurvey.js';
import { planSchedule } from '../js/rvSchedule.js';
import { variantStream } from '../js/composer/compile.js';
import { syntheticFlux } from '../js/light/model.js';
import { stream as statsStream, bootstrap } from '../js/analysis/stats.js';

/** Seeds as a caller might hand them: raw, so each site's own keying shows. */
export const SEEDS = [
  'a',
  'kepler-3',
  'été',
  '',
  '7',
  7,
  2024,
  1.5,
  -3,
  0,
  NaN,
  null,
  undefined,
];

const flat = v => {
  if (typeof v === 'number') return [v];
  if (typeof v === 'string' || v === null || v === undefined) return [v];
  if (ArrayBuffer.isView(v) || Array.isArray(v)) return [...v].flatMap(flat);
  if (typeof v === 'object')
    return Object.keys(v)
      .sort()
      .flatMap(k => flat(v[k]));
  return [String(v)];
};

/** A case's record: how many values, the first and last, and their digest. */
function record(value) {
  const all = flat(value).map(x =>
    typeof x === 'number' ? String(x) : JSON.stringify(x ?? String(x))
  );
  return {
    n: all.length,
    first: all[0],
    last: all[all.length - 1],
    sha256: createHash('sha256').update(all.join('\n')).digest('hex'),
  };
}

const draws = (next, n = 24) => Array.from({ length: n }, () => next());
const label = s =>
  Object.is(s, -0) ? '-0' : typeof s === 'string' ? `"${s}"` : String(s);

// Each probe: a name, the seeds it is run with, and what it returns.
const t = Float64Array.from({ length: 60 }, (_, i) => i * 0.37);
const y = Float64Array.from(t, x => Math.sin((2 * Math.PI * x) / 3.1));
const grid = Float64Array.from({ length: 40 }, (_, i) => 5400 + i * 5);
const PROBES = [
  ['inference.gaussian', SEEDS, s => draws(gaussian(s))],
  ['lensing.gaussianNoise', SEEDS, s => draws(gaussianNoise(s))],
  [
    'cosmology.syntheticHubbleDiagram',
    SEEDS,
    s => syntheticHubbleDiagram({ n: 16, seed: s }),
  ],
  [
    'detector.detectorPattern',
    SEEDS,
    s => detectorPattern(String(s), { width: 8, height: 8 }),
  ],
  [
    'detector.simulateFrame',
    SEEDS,
    s =>
      ['science', 'bias', 'dark', 'flat'].map(kind =>
        simulateFrame({
          seed: s,
          kind,
          exposure: 30,
          detector: { width: 12, height: 12 },
          scene: { sources: [{ x: 6, y: 6, flux: 4000 }] },
        })
      ),
  ],
  [
    'detector.simulateSeries',
    SEEDS,
    s =>
      simulateSeries(
        {
          seed: s,
          exposure: 30,
          detector: { width: 12, height: 12 },
          scene: { sources: [{ x: 6, y: 6, flux: 4000 }] },
        },
        { count: 6, cadence: 0.02, period: 0.3, amplitude: 0.1 }
      ),
  ],
  [
    'forward.uniformAt',
    SEEDS,
    s => Array.from({ length: 12 }, (_, i) => uniformAt(s, i)),
  ],
  ['variables.nightlyEpochs', SEEDS, s => nightlyEpochs(s, 12)],
  [
    'variables.makeSample',
    ['a', 'variables-sample', 7],
    s => makeSample({ perClass: 2, seed: s }),
  ],
  [
    'variables.bootstrapPeriod',
    SEEDS,
    s => bootstrapPeriod(t, y, 3.1, { K: 2, resamples: 6, seed: s }),
  ],
  [
    'survey.makeUniverse',
    ['a', 'survey-1', 7],
    s => [
      makeUniverse({ kind: 'population', count: 40, seed: s }),
      makeUniverse({ kind: 'gaussian', count: 40, seed: s }),
    ],
  ],
  [
    'survey.observe',
    ['a', 'survey-1', 7],
    s => observe(makeUniverse({ kind: 'gaussian', count: 60, seed: s })),
  ],
  [
    'stellar.synthesisePopulation',
    [
      ...SEEDS.filter(x => x !== undefined && x !== null),
      'stellar-population-1',
    ],
    s => synthesisePopulation({ count: 30, seed: s }),
  ],
  [
    'experiments.valuesFor',
    ['a', 'experiment-drift', 'été', '7'],
    s => valuesFor({ distribution: { seed: s, samples: 8, min: 1, max: 3 } }),
  ],
  [
    'gw.coloredNoise',
    SEEDS,
    s => coloredNoise({ samples: 128, sampleRate: 512, seed: s }),
  ],
  ['inference.gaussianStream', SEEDS, s => draws(gaussianStream(s))],
  [
    'rvSurvey.gaussianAt',
    SEEDS,
    s => Array.from({ length: 10 }, (_, i) => gaussianAt(s, i)),
  ],
  [
    'rvSchedule.planSchedule',
    ['a', 'rv-run', 7, '7', 2024],
    s =>
      planSchedule({
        kind: 'irregular',
        count: 14,
        baselineDays: 120,
        jitter: 0.3,
        seed: s,
      }),
  ],
  [
    'composer.variantStream',
    [0, 1, 7, 2024, 4294967295, -5],
    s =>
      ['item-a', 'item-b', 'q1'].flatMap(id => draws(variantStream(s, id), 8)),
  ],
  [
    'light.syntheticFlux',
    [0, 1, 2202, 3308, 4294967295],
    s => syntheticFlux(grid, { vKmS: 50, snr: 30, seed: s }),
  ],
  ['analysis.stream', SEEDS, s => draws(statsStream(s))],
  [
    'analysis.bootstrap',
    ['a', 'bootstrap', 7, undefined],
    s =>
      bootstrap(y, xs => xs.reduce((a, b) => a + b, 0) / xs.length, {
        resamples: 50,
        seed: s,
      }),
  ],
];

/** @returns {Promise<object>} case id -> record, in a fixed order */
export async function traceSeeding() {
  const out = {};
  for (const [name, seeds, fn] of PROBES)
    for (const s of seeds) {
      let value;
      try {
        value = fn(s);
      } catch (e) {
        value = `throws: ${e.message}`;
      }
      out[`${name}(${label(s)})`] = record(value);
    }
  return out;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const trace = await traceSeeding();
  const at = process.argv.indexOf('--out');
  const text = JSON.stringify(trace, null, 2) + '\n';
  if (at > 0) writeFileSync(process.argv[at + 1], text);
  else process.stdout.write(text);
  console.error(`${Object.keys(trace).length} cases`);
}
