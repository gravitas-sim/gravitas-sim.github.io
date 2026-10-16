// =============================================================================
// What every suite's reference run uses
// -----------------------------------------------------------------------------
// A suite's reference run (tools/<suite>-reference.mjs) does in Node what a
// reader does in its guides, with each panel's default settings, and turns
// the result into the suite's answer key with js/observatory/guides/core.js
// answerKey(). The parts no suite writes for itself are here:
//
//   openTargets   every target, opened as the page opens it: a fixture, or a
//                 catalog pack read from extensions/ as an install delivers it
//   measure       a measurement-pipeline tool run on an observation, as a node
//   periodDefaults  the period search's default range
//   boxDefaults   the box search's default range (js/observatory/
//                 measurePanel.js defaults())
//   fitDocument   a transit fit with the fit panel's default bounds
//                 (js/observatory/fitPanel.js defaults() and spacing())
//   keyModule     the committed answer key's text, a Prettier fixed point
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  lightCurveObservation,
  openFixture,
} from '../../js/observatory/fixtures.js';
import { TOOLS } from '../../js/measure/pipeline.js';
import { LIMITS } from '../../js/measure/periodogram.js';
import { skyOf, pixelScale } from '../../js/observatory/wcs.js';
import { dataFrom, fitOnce } from '../../js/inference/infer.js';
import { rounded } from '../../js/observatory/guides/core.js';

export const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

/** Every target of a suite, opened as the page opens it. */
export async function openTargets(targets) {
  const out = {};
  for (const [id, T] of Object.entries(targets)) {
    if (T.fixture) out[id] = await openFixture(T.fixture);
    else {
      const dir = T.install.replace(/^community\./, '');
      const mod = JSON.parse(
        readFileSync(path.join(REPO, 'extensions', dir, 'series.json'), 'utf8')
      );
      out[id] = await lightCurveObservation(mod, {
        citations: [],
        idPrefix: 'installed',
      });
    }
  }
  return out;
}

/**
 * The measurement a reader makes, as a pipeline node. `hooks` are what the
 * page lends a tool beyond the image's coordinates: the model table a curve
 * comparison reads, say.
 */
export async function measure(o, tool, params, hooks = {}) {
  const out = await TOOLS[tool].run(o, params, {
    skyOf,
    pixelScale,
    ...hooks,
  });
  return {
    tool,
    status: 'current',
    params,
    input: { observation: o.id },
    quantities: out.quantities,
    suggest: out.suggest ?? null,
    warnings: out.warnings ?? [],
  };
}

/**
 * The box search's default range, as js/observatory/measurePanel.js
 * defaults() sets it for a light curve in days.
 */
export function boxDefaults(t) {
  const T = t.at(-1) - t[0] || 1;
  const L =
    0.8 * Math.min(LIMITS.frequencies, LIMITS.work / Math.max(1, t.length));
  const round = x => +x.toPrecision(3);
  const durations = [0.08, 0.12, 0.16];
  const max = Math.min(T / 2, 20);
  const min = Math.max(0.5, (max * 4 * T) / (durations[0] * L + 4 * T));
  return { minPeriod: round(min * 1.01), maxPeriod: round(max), durations };
}

/**
 * The period search's default range, as js/observatory/measurePanel.js
 * defaults() sets it.
 */
export function periodDefaults(t) {
  const T = t.at(-1) - t[0] || 1;
  const L =
    0.8 * Math.min(LIMITS.frequencies, LIMITS.work / Math.max(1, t.length));
  const round = x => +x.toPrecision(3);
  const max = Math.min(T / 2, 1000);
  const min = Math.max(0.1, 1 / (L / (5 * T) + 1 / max));
  return { minPeriod: round(min * 1.01), maxPeriod: round(max), oversample: 5 };
}

/**
 * The fit panel's request for the transit model with its default bounds
 * (js/observatory/fitPanel.js defaults() and spacing()), and the settings a
 * step asks for.
 */
export function fitRequest(data, settings = {}) {
  const x0 = data.x[0];
  const span = data.x.at(-1) - x0;
  const Phi = Math.min(10, Math.max(1.2, span / 2));
  const d = [];
  for (let i = 1; i < data.x.length; i++) d.push(data.x[i] - data.x[i - 1]);
  d.sort((a, b) => a - b);
  return {
    model: { id: 'transit-quadratic' },
    parameters: { t0: { lo: x0, hi: x0 + Phi }, P: { lo: 1, hi: Phi } },
    settings: {
      exposure: Number((d[d.length >> 1] || 0).toPrecision(6)),
      supersample: 5,
      annuli: 32,
      dilution: 0,
      ...settings,
    },
  };
}

/** A transit fit as the fit panel records it: enough of its export. */
export function fitDocument(o, settings) {
  const data = dataFrom(o);
  const request = fitRequest(data, settings);
  const fit = fitOnce(request, data);
  return {
    data: { observation: o.id },
    model: { id: 'transit-quadratic' },
    settings: request.settings,
    results: { fit },
  };
}

/**
 * A committed answer key's text: a Prettier fixed point, as every generated
 * file must be.
 * @param {Array<object>} rows - From core.js answerKey()
 * @param {{file: string, name: string, title: string, tool: string}} o - The
 *   repository path, the export's name, what the file is, and the command
 */
export async function keyModule(rows, { file, name, title, tool }) {
  const text = `// =============================================================================
// ${title} (generated)
// -----------------------------------------------------------------------------
// Written by \`${tool}\`
// from a reference run on the committed data with each panel's default
// settings: every step of every guide on each path, with the answer that
// passes it. Do not edit by hand; the suite's test fails when it is not what
// the run gives. The instructors' answer key is rendered from it.
// =============================================================================

export const ${name} = ${JSON.stringify(rows.map(rounded))};
`;
  const prettier = await import('prettier');
  const at = path.join(REPO, file);
  const options = (await prettier.resolveConfig(at)) || {};
  return prettier.format(text, { ...options, filepath: at });
}

/**
 * A reference tool's command line: `--write` commits the answer key, `--json`
 * prints the key and a summary of the run (what a suite's test reads, because
 * fits run ten times slower inside Jest's module sandbox), and nothing prints
 * the advanced path's key.
 * @param {{suite: object, referenceRun: () => Promise<object>,
 *   summary: (run: object) => object, key: {file: string, name: string,
 *   title: string, tool: string}}} o
 */
export async function cli({ suite, referenceRun, summary, key }) {
  const say = text => process.stdout.write(`${text}\n`);
  const { answerKey } = await import('../../js/observatory/guides/core.js');
  const { writeFileSync } = await import('node:fs');
  const run = await referenceRun();
  const rows = answerKey(suite, run);
  if (process.argv.includes('--write')) {
    writeFileSync(path.join(REPO, key.file), await keyModule(rows, key));
    say(`Wrote ${key.file}: ${rows.length} rows.`);
  } else if (process.argv.includes('--json'))
    say(JSON.stringify({ key: rows, run: summary(run) }));
  else
    for (const r of rows.filter(x => x.path === 'advanced'))
      say(
        `${r.guide.padEnd(13)} ${r.step.padEnd(15)} ${r.kind.padEnd(7)} ${
          r.expected === null
            ? '-'
            : typeof r.expected === 'number'
              ? r.expected.toPrecision(6)
              : r.expected
        }${r.tolerance !== undefined ? ` ± ${r.tolerance}` : ''}${
          r.passes === false ? '   CHECK FAILS' : ''
        }`
      );
}
