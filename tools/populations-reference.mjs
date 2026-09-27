#!/usr/bin/env node
// =============================================================================
// Stars and their populations: the reference run, and its answer key
// -----------------------------------------------------------------------------
// npm run guides:populations-key [-- --json | --write]
//
// Does, in Node, what a reader does in the guides (js/observatory/guides/
// populations.js), with each panel's default settings: opens every target;
// measures H-alpha in the A star with the line tool's preset and TiO5 in the
// M star with the band tool's; makes g - r and the distance from the center
// in the cluster's photometry; crops SEGUE's table to the velocity window
// and compares the members with MIST's isochrones at two metallicities, and
// at one with the dust map's reddening; searches SU Dra's and HD 209458's
// light curves for a period and folds SU Dra's. Then js/observatory/guides/
// core.js answerKey() works every step's answer out of those results with
// the guides' own ANSWERS and CORRECT functions, and checks every `do` step
// against them; tools/guides/reference-kit.mjs holds the rest.
//
// --write commits the key as js/data/populationsAnswerKey.js, which
// tools/build-instructor-materials.js prints into the instructors' answer
// key; tests/populationsGuides.test.js runs this tool and fails when the
// committed key is not what it gives.
// =============================================================================

import { SUITE } from '../js/observatory/guides/populations.js';
import { seriesOf } from '../js/observatory/guides/core.js';
import { replay } from '../js/observatory/transforms.js';
import { LINES, presetWindows } from '../js/measure/spectrumLine.js';
import { BAND_PRESETS } from '../js/measure/bandIndex.js';
import {
  cli,
  measure,
  openTargets,
  periodDefaults,
} from './guides/reference-kit.mjs';

export { openTargets } from './guides/reference-kit.mjs';

export const KEY = {
  file: 'js/data/populationsAnswerKey.js',
  name: 'POPULATIONS_KEY',
  title: 'Stars and their populations: the answer key',
  tool: 'npm run guides:populations-key -- --write',
};

// What the reader is asked to do, where a step leaves a choice: the velocity
// window's ends, and the dust map's reddening.
export const CHOICES = {
  window: { min: 65, max: 85 },
  mapReddening: 0.042,
};

// The comparison's defaults, as js/observatory/measurePanel.js defaults()
// and readParams() set them.
const CURVE = {
  model: {
    id: 'mist-isochrones',
    color: ['g', 'r'],
    magnitude: 'g',
    by: 'logAge',
    segments: 'phase',
  },
  dm: [8, 16, 0.02],
  E: [0, 0.3, 0.005],
  R: 3.245,
  RCite: 'Schlafly & Finkbeiner 2011, ApJ 737, 103, Table 6',
  scale: [0.03, 0.15],
  cap: 3,
  tolerance: 0.02,
};

/**
 * Everything the guides ask a reader to do, done once.
 * @returns {Promise<{observations: object, nodes: object[], fits: object[],
 *   changes: object}>}
 */
export async function referenceRun() {
  const observations = await openTargets(SUITE.TARGETS);
  const A = observations['sdss-a'];
  const M = observations['sdss-m'];
  const ha = presetWindows(
    LINES.find(l => l.id === 'ha'),
    A.spectral.medium,
    A.spectral.redshift
  );
  const tio5 = BAND_PRESETS.tio5;
  const color = {
    op: 'derive',
    id: 'g-r-1',
    name: 'g - r',
    terms: [
      { column: 'g', factor: 1 },
      { column: 'r', factor: -1 },
    ],
    constant: 0,
  };
  const photometry = [
    color,
    {
      op: 'derive',
      id: 'distance-2',
      name: 'distance',
      separation: {
        ra: 'ra',
        dec: 'dec',
        center: [
          observations.photometry.object.ra,
          observations.photometry.object.dec,
        ],
      },
    },
  ];
  const segue = [
    { op: 'crop', column: 'rv', ...CHOICES.window },
    { ...color, id: 'g-r-2' },
  ];
  const members = replay(observations.segue, segue).o;
  const hooks = { model: async () => observations.isochrones };
  const curve = (feh, E = CURVE.E) =>
    measure(
      members,
      'curve',
      {
        ...CURVE,
        model: { ...CURVE.model, where: { feh } },
        x: 'g-r-2',
        y: 'g',
        E,
      },
      hooks
    );
  const su = observations['su-dra'];
  const hd = observations['hd209458-lc'];
  const nodes = [
    await measure(A, 'line', {
      blue: ha.blue,
      line: ha.line,
      red: ha.red,
      rest: ha.rest,
      restMedium: A.spectral.medium,
    }),
    await measure(M, 'band', {
      band: tio5.band,
      reference: tio5.reference,
      medium: tio5.medium,
      cite: tio5.cite,
    }),
    await curve(-0.25),
    await curve(0),
    await curve(-0.25, [CHOICES.mapReddening, CHOICES.mapReddening, 0.005]),
    await measure(su, 'period', periodDefaults(seriesOf(su).t)),
    await measure(hd, 'period', periodDefaults(seriesOf(hd).t)),
  ];
  const fold = { op: 'fold', ...nodes[5].suggest.fold };
  return {
    observations,
    nodes,
    fits: [],
    changes: { photometry, segue, 'su-dra': [fold] },
  };
}

/**
 * The reference run, as plain data: what the suite's test reads from this
 * tool's --json.
 */
export function summary(run) {
  return {
    nodes: run.nodes.map(n => ({
      tool: n.tool,
      observation: n.input.observation,
      feh: n.params.model?.where?.feh ?? null,
      E: n.params.E ?? null,
      quantities: n.quantities.map(q => ({ id: q.id, value: q.value })),
      warnings: n.warnings.map(w => w.code),
    })),
    changes: run.changes,
  };
}

if (import.meta.url === `file://${process.argv[1]}`)
  await cli({ suite: SUITE, referenceRun, summary, key: KEY });
