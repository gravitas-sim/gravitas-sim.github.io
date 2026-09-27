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
// without the adopted stellar radius and the dilution. Then it works every
// step's answer out of those results with the guides' own ANSWERS and CORRECT
// functions, and checks every `do` step's check against them.
//
// That is the answer key: what a reader who follows the steps should find,
// and the proof that every check can be passed. --write commits it as
// js/data/exoplanetAnswerKey.js, which tools/build-instructor-materials.js
// prints into the instructors' answer key: the bundle depends on the key, not
// on the fitting code that produced it, so a change to the inference core
// does not by itself make the bundle stale. tests/exoplanetGuides.test.js runs
// this tool and fails when the committed key is not what it gives. The
// Kepler-13 packs are read from extensions/, as a catalog install would
// deliver them.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANSWERS,
  CORRECT,
  GUIDES,
  PATHS,
  TARGETS,
  stepsOn,
} from '../js/observatory/guides/exoplanet.js';
import { seriesOf } from '../js/observatory/guides/science.js';
import { evaluateCheck, fitValue } from '../js/observatory/guidePanel.js';
import {
  lightCurveObservation,
  openFixture,
} from '../js/observatory/fixtures.js';
import { TOOLS } from '../js/measure/pipeline.js';
import { LIMITS } from '../js/measure/periodogram.js';
import { skyOf, pixelScale } from '../js/observatory/wcs.js';
import { dataFrom, fitOnce } from '../js/inference/infer.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every target, opened as the page opens it. */
export async function openTargets() {
  const out = {};
  for (const [id, T] of Object.entries(TARGETS)) {
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

/** A fit as the fit panel records it: enough of its export for a guide. */
function fitDocument(o, settings) {
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

/** The measurement a reader makes, as a pipeline node. */
async function measure(o, tool, params) {
  const out = await TOOLS[tool].run(o, params, { skyOf, pixelScale });
  return {
    tool,
    status: 'current',
    params,
    input: { observation: o.id },
    quantities: out.quantities,
    suggest: out.suggest ?? null,
  };
}

/**
 * Everything the guides ask a reader to do, done once.
 * @returns {Promise<{observations: object, nodes: object[], fits: object[],
 *   fold: object}>}
 */
export async function referenceRun() {
  const observations = await openTargets();
  const hd = observations.hd209458;
  const nodes = [
    await measure(observations['hd209458-aperture'], 'aperture', {
      mode: 'bits',
      bit: 2,
    }),
    await measure(hd, 'box', boxDefaults(seriesOf(hd).t)),
  ];
  const box = nodes[1];
  const fold = { op: 'fold', ...box.suggest.fold };
  const radius = { stellarRadius: { value: 1.19, sigma: 0.02 } };
  const k13 = observations['kepler13-sap'];
  const crowdsap = k13.pack.crowding.crowdsap;
  const fits = [
    fitDocument(hd, {}),
    fitDocument(hd, radius),
    fitDocument(k13, {}),
    fitDocument(k13, { dilution: 1 - crowdsap }),
  ];
  return { observations, nodes, fits, fold };
}

/**
 * The answer key: every step of every guide on each path, with what passes
 * it, worked out from a reference run.
 * @returns {Promise<Array<{guide: string, path: string, step: string,
 *   kind: string, expected: number|string|null, tolerance?: number,
 *   passes: boolean|null}>>} `passes` is whether the reference run passes a
 *   `do` step's check (null for the other kinds)
 */
export async function answerKey(run) {
  const r = run ?? (await referenceRun());
  const rows = [];
  for (const guide of GUIDES) {
    for (const p of PATHS) {
      const evidence = {};
      const seen = {};
      const context = {
        pack: t => r.observations[t]?.pack ?? null,
        series: t => (seen[t] ??= seriesOf(r.observations[t])),
        evidence: id => evidence[id] ?? null,
        quantity: (id, name) => {
          const e = evidence[id];
          if (!e) return null;
          if (e.quantities)
            return e.quantities.find(q => q.id === name)?.value ?? null;
          return fitValue(e, name);
        },
      };
      for (const step of stepsOn(guide, p)) {
        const row = {
          guide: guide.id,
          path: p,
          step: step.id,
          kind: step.kind,
        };
        if (step.kind === 'do') {
          // The workspace a reader has when this step is done: its target
          // open, and every measurement and fit made so far.
          const target = step.check.target;
          const o = r.observations[target];
          const got = evaluateCheck(step.check, {
            source: o,
            changes: step.check.kind === 'folded' ? [r.fold] : [],
            nodes: r.nodes,
            fits: r.fits,
          });
          if (got.ok) evidence[step.id] = got.evidence;
          row.passes = got.ok;
          row.expected = got.value ?? null;
        } else if (step.kind === 'answer') {
          const v = ANSWERS[step.expect.answer](context, step);
          row.expected = Number.isFinite(v) ? v : null;
          row.tolerance = step.expect.tolerance;
          row.passes = null;
        } else if (step.kind === 'choose') {
          row.expected =
            step.correct === null
              ? null
              : typeof step.correct === 'string'
                ? step.correct
                : (CORRECT[step.correct.answer](context, step) ?? null);
          row.passes = null;
        } else {
          row.expected = null;
          row.passes = null;
        }
        rows.push(row);
      }
    }
  }
  return rows;
}

/**
 * The reference run, as plain data: what a test reads from this tool's
 * --json, because the fits are ten times slower inside Jest's module sandbox
 * than in Node itself.
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
    fold: run.fold,
    fits: run.fits.map(fitOf),
  };
}

/** A key row with its numbers to six significant digits, as committed. */
export const rounded = r => ({
  ...r,
  expected:
    typeof r.expected === 'number'
      ? Number(r.expected.toPrecision(6))
      : r.expected,
});

export const KEY_FILE = 'js/data/exoplanetAnswerKey.js';

/** The committed key's text: a Prettier fixed point, as every generated file. */
export async function keyModule(rows) {
  const text = `// =============================================================================
// The Exoplanet Observatory's answer key (generated)
// -----------------------------------------------------------------------------
// Written by \`npm run guides:key -- --write\` (tools/exoplanet-reference.mjs)
// from a reference run on the committed data with each panel's default
// settings: every step of every guide on each path, with the answer that
// passes it. Do not edit by hand; tests/exoplanetGuides.test.js fails when it
// is not what the run gives. The instructors' answer key is rendered from it.
// =============================================================================

export const EXOPLANET_KEY = ${JSON.stringify(rows.map(rounded))};
`;
  const prettier = await import('prettier');
  const file = path.join(REPO, KEY_FILE);
  const options = (await prettier.resolveConfig(file)) || {};
  return prettier.format(text, { ...options, filepath: file });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const run = await referenceRun();
  const rows = await answerKey(run);
  if (process.argv.includes('--write')) {
    writeFileSync(path.join(REPO, KEY_FILE), await keyModule(rows));
    console.log(`Wrote ${KEY_FILE}: ${rows.length} rows.`);
  } else if (process.argv.includes('--json'))
    console.log(JSON.stringify({ key: rows, run: summary(run) }));
  else
    for (const r of rows.filter(x => x.path === 'advanced'))
      console.log(
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
