// The regression-context legs (A8, A8b) of the ensemble validator, in a fresh Node
// process: an engine realm remembers the world it built last, so these two legs
// must not share a process with a leg that built another one (amendment AM4).
//   node tools/experiment-ensemble-regression-child.mjs <default|lab>
// prints one JSON line: the three-body kind's median and 90th percentile of the
// relative energy drift over the regression seeds 1000..1049, and the regression
// group's own (js/validation/groups/long-term-regression.js distribution()).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..'
);
const imp = p => import(pathToFileURL(path.join(repo, p)));
const { stream } = await imp('js/random/streams.js');
const { threeBodyTrial } = await imp('js/experiments/ensemble/kinds.js');
const { loadRealm } = await imp('js/experiments/ensemble/trial.js');
const { buildScenario } = await imp('js/experiments/trialRunner.js');
const { quantile } = await imp('js/experiments/ensemble/summary.js');
const lt = await imp('js/validation/groups/long-term-regression.js');
const { makeLab, applyLabSettings } = await imp('js/validation/harness.js');
const { REGRESSION } = await imp('js/validation/engineTolerances.js');

const lab = process.argv[2] === 'lab';
const realm = await loadRealm();
const drifts = Array.from(
  { length: REGRESSION.seeds },
  (_, k) =>
    threeBodyTrial(
      realm,
      buildScenario,
      lab ? { physics: 'validation-lab' } : {},
      stream('experiments', 1000 + k),
      lab ? applyLabSettings : undefined
    ).quantities[0].value
);
const sorted = [...drifts].sort((a, b) => a - b);
const group = lt.distribution(realm.physics, makeLab(realm.physics));
process.stdout.write(
  `${JSON.stringify({
    median: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    groupMedian: group.median,
    groupP90: group.p90,
    recorded: lt.RECORDED,
    margin: REGRESSION.margin,
  })}\n`
);
