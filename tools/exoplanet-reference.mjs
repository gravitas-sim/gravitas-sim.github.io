#!/usr/bin/env node
// =============================================================================
// The Exoplanet Observatory's reference run, and its answer key
// -----------------------------------------------------------------------------
// npm run guides:key [-- --json | --write]
//
// Does, in Node, what a reader does in the guides (js/observatory/guides/
// exoplanet.js), with each panel's default settings: opens every target, runs
// the aperture tool and the box search the way the measurement panel would,
// folds, and fits the transit model the way the fit panel would, with and
// without the adopted stellar radius and the dilution. Then
// js/observatory/guides/core.js answerKey() works every step's answer out of
// those results with the guides' own ANSWERS and CORRECT functions, and checks
// every `do` step against them; tools/guides/reference-kit.mjs holds the rest.
//
// That is the answer key: what a reader who follows the steps should find,
// and the proof that every check can be passed. --write commits it as
// js/data/exoplanetAnswerKey.js, which tools/build-instructor-materials.js
// prints into the instructors' answer key: the bundle depends on the key, not
// on the fitting code that produced it, so a change to the inference core
// does not by itself make the bundle stale. tests/exoplanetGuides.test.js runs
// this tool and fails when the committed key is not what it gives.
// =============================================================================

import { SUITE } from '../js/observatory/guides/exoplanet.js';
import { seriesOf } from '../js/observatory/guides/core.js';
import {
  boxDefaults,
  cli,
  fitDocument,
  measure,
  openTargets,
} from './guides/reference-kit.mjs';

export { openTargets } from './guides/reference-kit.mjs';

export const KEY = {
  file: 'js/data/exoplanetAnswerKey.js',
  name: 'EXOPLANET_KEY',
  title: "The Exoplanet Observatory's answer key",
  tool: 'npm run guides:key -- --write',
};

/**
 * Everything the guides ask a reader to do, done once.
 * @returns {Promise<{observations: object, nodes: object[], fits: object[],
 *   changes: object}>}
 */
export async function referenceRun() {
  const observations = await openTargets(SUITE.TARGETS);
  const hd = observations.hd209458;
  const nodes = [
    await measure(observations['hd209458-aperture'], 'aperture', {
      mode: 'bits',
      bit: 2,
    }),
    await measure(hd, 'box', boxDefaults(seriesOf(hd).t)),
  ];
  const fold = { op: 'fold', ...nodes[1].suggest.fold };
  const radius = { stellarRadius: { value: 1.19, sigma: 0.02 } };
  const k13 = observations['kepler13-sap'];
  const crowdsap = k13.pack.crowding.crowdsap;
  const fits = [
    fitDocument(hd, {}),
    fitDocument(hd, radius),
    fitDocument(k13, {}),
    fitDocument(k13, { dilution: 1 - crowdsap }),
  ];
  return { observations, nodes, fits, changes: { hd209458: [fold] } };
}

/**
 * The reference run, as plain data: what the suite's test reads from this
 * tool's --json.
 */
export function summary(run) {
  const fitOf = d => {
    const f = d.results.fit;
    return {
      observation: d.data.observation,
      settings: d.settings,
      parameters: f.parameters,
      derived: f.derived,
      free: f.free,
      correlation: f.correlation,
      redNoise: f.redNoise,
    };
  };
  return {
    nodes: run.nodes.map(n => ({ tool: n.tool, quantities: n.quantities })),
    fold: run.changes.hd209458[0],
    fits: run.fits.map(fitOf),
  };
}

if (import.meta.url === `file://${process.argv[1]}`)
  await cli({ suite: SUITE, referenceRun, summary, key: KEY });
