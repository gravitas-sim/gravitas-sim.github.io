// The engine half of instrument I3 (NUMERICS_INSTRUMENTS.md), in a fresh Node
// process: an engine realm remembers the world it built last, so the pairs do
// not share a process with anything that built another one.
//   node tools/numerics-instruments-engine-child.mjs
// prints one JSON line: for seeds 1000..1049 the separation series of the pair
// on A8b's settings; for seed 1000 the sampled positions of both runs; for
// seeds 1000..1002 run A's relative energy drift beside threeBodyTrial's own.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..'
);
const imp = p => import(pathToFileURL(path.join(repo, p)));
const { stream } = await imp('js/random/streams.js');
const { threeBodyTrial, THREE_BODY } = await imp(
  'js/experiments/ensemble/kinds.js'
);
const { loadRealm } = await imp('js/experiments/ensemble/trial.js');
const { buildScenario } = await imp('js/experiments/trialRunner.js');
const { applyLabSettings } = await imp('js/validation/harness.js');
const { threeBodyPair } = await imp('js/kernels/numerics/threeBodyPair.js');

const realm = await loadRealm();
const series = [];
const pairDrift = [];
let positions = null;
let settings = null;
for (let k = 0; k < 50; k++) {
  const p = threeBodyPair(
    realm,
    buildScenario,
    applyLabSettings,
    THREE_BODY,
    1000 + k
  );
  series.push(p.series);
  if (k === 0) {
    positions = { a: p.a, b: p.b };
    settings = p.settings;
  }
  if (k < 3) pairDrift.push(p.energyDrift);
}
const kindDrift = [0, 1, 2].map(
  k =>
    threeBodyTrial(
      realm,
      buildScenario,
      { physics: 'validation-lab' },
      stream('experiments', 1000 + k),
      applyLabSettings
    ).quantities[0].value
);
process.stdout.write(
  `${JSON.stringify({ settings, series, positions, pairDrift, kindDrift })}\n`
);
