// =============================================================================
// The inference and analysis formats, each held to its JSON Schema
// -----------------------------------------------------------------------------
// sdk/schemas has a schema for each of these (Roadmap II Prompt 61), held as
// tests/formatSchemas.test.js holds the six before them:
//
//   - documents the code itself produced fit: a fit of the Observatory's
//     light curve, fits of an orbit as the fit panel exports them, the
//     comparison of those fits, and the analysis laboratory's save of a
//     sweep;
//   - documents the reader refuses, the schema refuses too. Where the reader
//     refuses for a reason no schema can state - a rule across fields, a step
//     named somewhere else in the file - the case is listed as the
//     validator's alone, and tested there; where the reader accepts what the
//     schema, which states the format as written, refuses - a number typed as
//     text, a field it never looks at - the case is listed too, so each
//     difference is one somebody chose (./schemaCorpus.js holds());
//   - every table in a schema is the code's own, and each schema's title,
//     $id and version are its row in FORMATS.md (tools/formats.mjs).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { holds, isItsRow } from './schemaCorpus.js';
import * as IM from '../js/inference/manifest.js';
import { MODELS } from '../js/inference/models.js';
import { dataFrom, fitOnce } from '../js/inference/infer.js';
import { syntheticRv } from '../js/inference/synthetic.js';
import { openFixture } from '../js/observatory/fixtures.js';
import * as SA from '../js/analysis/sweepAnalysis.js';
import * as MC from '../js/analysis/modelCompare.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(REPO, file), 'utf8');
const schema = name => JSON.parse(read(`sdk/schemas/${name}.schema.json`));
const clone = v => JSON.parse(JSON.stringify(v));
const literals = (text, re) => [...text.matchAll(re)].map(m => m[1]);

describe('each schema', () => {
  test.each([
    ['inference-1', 'gravitas.inference', IM.FORMAT_VERSION],
    ['analysis-1', 'gravitas.analysis', SA.ANALYSIS_VERSION],
  ])('%s is its row in FORMATS.md, at the version the code writes', isItsRow);
});

// --- gravitas.inference/1 and gravitas.analysis/1 ----------------------------

/** A request as the fit panel builds one, blank fields left out. */
const panelRequest = (id, fields) => {
  const model = MODELS[id];
  const parameters = {};
  for (const p of [...model.parameters, ...(model.nuisance || [])])
    parameters[p.name] = fields[p.name] ?? { mode: 'fitted' };
  return {
    model: { id },
    parameters,
    settings:
      id === 'transit-quadratic'
        ? { exposure: 20 / 1440, supersample: 5, annuli: 32, dilution: 0 }
        : {},
    algorithm: { profile: { points: 11 } },
  };
};
const LIMITS = {
  concurrency: 2,
  trialTimeoutMs: 120000,
  totalTimeoutMs: 180000,
  maxResultBytes: 64000000,
};

/** A fit as the panel exports it (js/observatory/fitPanel.js exported()). */
const exportOf = (m, fit) => {
  const omit = (o, keys) =>
    Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
  return clone({
    ...m,
    results: {
      fit: {
        ...omit(fit, ['residuals', 'fit', 'rows']),
        residualCount: fit.residuals.length,
      },
      profiles: [],
    },
  });
};

const rvFits = () => {
  const truth = { P: 4.2308, tc: 100.3, K: 25, sqrtEcosw: 0, sqrtEsinw: 0 };
  const times = Array.from(
    { length: 40 },
    (_, i) => 100 + i * 0.61 + 0.2 * Math.sin(i * 7.1)
  );
  const data = syntheticRv({ seed: 'cmp', times, sigma: 5, gamma: 3, truth });
  const observation = {
    id: 'synthetic:rv',
    title: 'A synthetic orbit',
    source: { kind: 'builtin', id: 'synthetic', version: null },
    time: { format: 'BJD', scale: 'TDB' },
  };
  const base = {
    P: { mode: 'fitted', lo: 4.1, hi: 4.4 },
    tc: { mode: 'fitted', lo: 99.5, hi: 101.5 },
    jitter: { mode: 'fixed', value: 0 },
  };
  return [
    [
      'circular',
      {
        ...base,
        sqrtEcosw: { mode: 'fixed', value: 0 },
        sqrtEsinw: { mode: 'fixed', value: 0 },
      },
    ],
    ['eccentric', base],
  ].map(([label, fields]) => {
    const request = panelRequest('rv-keplerian', fields);
    const d = {
      ...data,
      counts: {
        total: 40,
        used: 40,
        masked: 0,
        missing: 0,
        withoutUncertainty: 0,
      },
      columns: { x: 'time', y: 'rv', sigma: 'sigma' },
      units: { x: 'd', y: 'm/s' },
      perDay: 1,
    };
    const m = clone(IM.inferenceManifest(observation, d, request, LIMITS));
    const fit = fitOnce(request, data);
    return { label, fit, request, data, document: exportOf(m, fit) };
  });
};

describe('the inference schema', () => {
  const s = schema('inference-1');
  const reads = d => IM.validateInference(d).length === 0;
  let transit;

  test('a manifest of the Observatory’s light curve fits it, and its fits’ exports', async () => {
    const o = await openFixture('tess-light-curve');
    const d = dataFrom(o);
    transit = clone(
      IM.inferenceManifest(
        o,
        d,
        panelRequest('transit-quadratic', {
          t0: { mode: 'fitted', lo: d.x[0], hi: d.x[0] + 3.6 },
          P: { mode: 'fitted', lo: 1, hi: 10 },
          q2: { mode: 'fixed', value: 0.3 },
        }),
        LIMITS
      )
    );
    expect(transit.data.used).toBe(1882);
    expect(transit.data.source.id).toMatch(/tess-hd209458-s56/);
    expect([reads(transit), valid(s, transit)]).toEqual([true, true]);
    for (const { document } of rvFits()) {
      expect(document.results.fit.status).toBe('ok');
      expect([reads(document), valid(s, document)]).toEqual([true, true]);
    }
  });

  test('the export is the panel’s: the fit without its residuals, and their count', () => {
    const panel = read('js/observatory/fitPanel.js');
    expect(panel).toContain(
      "...omit(out.fit, ['residuals', 'fit', 'rows']),\n          residualCount: out.fit.residuals.length,"
    );
  });

  test('and refuses what validateInference refuses', () => {
    const p = d => d.parameters;
    const cases = [
      ['both', 'another format', d => (d.format = 'gravitas.pipeline')],
      ['both', 'version 2', d => (d.formatVersion = 2)],
      ['both', 'a model it does not have', d => (d.model.id = 'nope')],
      ['both', 'another model version', d => (d.model.version = '0.9.0')],
      ['both', 'no observation', d => delete d.data.observation],
      ['both', 'no parameters', d => delete d.parameters],
      ['both', 'no period', d => delete p(d).P],
      ['both', 'a period with no bounds', d => (p(d).P = { mode: 'fitted' })],
      [
        'both',
        'a parameter the model lacks',
        d => (p(d).mass = { lo: 0, hi: 1 }),
      ],
      ['both', 'an orbit’s parameter', d => (p(d).K = { lo: 0, hi: 1 })],
      ['both', 'a mode it does not have', d => (p(d).k = { mode: 'guessed' })],
      [
        'both',
        'a fixed parameter with no value',
        d => (p(d).b = { mode: 'fixed' }),
      ],
      [
        'both',
        'bounds outside the range',
        d => (p(d).k = { lo: 0.001, hi: 0.1 }),
      ],
      ['both', 'a start that is not a number', d => (p(d).k = { value: 'x' })],
      ['both', 'a negative exposure', d => (d.settings.exposure = -1)],
      ['both', 'no supersampling', d => (d.settings.supersample = 0)],
      ['both', 'too many rings', d => (d.settings.annuli = 1000)],
      ['both', 'a fractional ring count', d => (d.settings.annuli = 32.5)],
      ['both', 'all the light diluted', d => (d.settings.dilution = 1)],
      [
        'both',
        'a star of no size',
        d => (d.settings.stellarRadius = { value: 0 }),
      ],
      [
        'both',
        'a negative sigma',
        d => (d.settings.stellarRadius = { value: 1, sigma: -1 }),
      ],
      ['both', 'a parameter that is not an object', d => (p(d).k = 5)],
      ['both', 'a parameter that is null', d => (p(d).k = null)],
      // Rules across a parameter's own fields.
      [
        'validator',
        'bounds the wrong way round',
        d => (p(d).k = { lo: 0.3, hi: 0.1 }),
      ],
      [
        'validator',
        'a start outside its bounds',
        d => (p(d).k = { lo: 0.1, hi: 0.2, value: 0.3 }),
      ],
      [
        'validator',
        'a start outside the range',
        d => (p(d).k = { value: 0.9 }),
      ],
      ['lenient', 'a mode of null', d => (p(d).k = { mode: null })],
      ['lenient', 'an exposure as text', d => (d.settings.exposure = '1')],
    ];
    holds(s, transit, reads, cases);
    const rv = rvFits()[1].document;
    holds(s, rv, reads, [
      [
        'both',
        'a transit’s parameter',
        d => (d.parameters.k = { lo: 0.01, hi: 0.1 }),
      ],
      [
        'both',
        'too much jitter',
        d => (d.parameters.jitter = { lo: 0, hi: 300 }),
      ],
      ['both', 'no conjunction', d => delete d.parameters.tc],
    ]);
  });

  test('its tables are the code’s', () => {
    expect(s.properties.format.const).toBe(IM.FORMAT);
    expect(s.properties.formatVersion.const).toBe(IM.FORMAT_VERSION);
    expect(s.properties.model.properties.id.enum).toEqual(Object.keys(MODELS));
    expect(s.properties.algorithm.properties.id.const).toBe(IM.ALGORITHM.id);
    expect(IM.ALGORITHM.version).toMatch(
      new RegExp(s.properties.algorithm.properties.version.pattern)
    );
    expect(s.anyOf).toHaveLength(Object.keys(MODELS).length);
    for (const [i, model] of Object.values(MODELS).entries()) {
      const branch = s.anyOf[i].properties;
      expect(branch.model.properties.id.const).toBe(model.id);
      expect(branch.model.properties.version.const).toBe(model.version);
      const specs = [...model.parameters, ...(model.nuisance || [])];
      const params = branch.parameters;
      expect(Object.keys(params.properties)).toEqual(specs.map(q => q.name));
      expect(params.required).toEqual(
        model.parameters.filter(q => q.lo === undefined).map(q => q.name)
      );
      for (const q of specs) {
        const got = params.properties[q.name];
        expect({ name: q.name, got }).toEqual({
          name: q.name,
          got:
            q.lo === undefined
              ? { $ref: '#/$defs/unbounded' }
              : {
                  $ref: '#/$defs/parameter',
                  properties: {
                    lo: { minimum: q.lo, exclusiveMaximum: q.hi },
                    hi: { exclusiveMinimum: q.lo, maximum: q.hi },
                  },
                },
        });
      }
    }
    expect(IM.engineFingerprint()).toMatch(
      new RegExp(s.properties.engine.properties.fingerprint.pattern)
    );
  });
});

/** A result as js/experimentsPage.js writes one, of a known slope. */
function sweepResult() {
  const values = [1, 2, 3, 4, 5];
  const seeds = ['s0', 's1', 's2', 's3'];
  const trials = [];
  for (const p of values)
    for (const [k, seed] of seeds.entries())
      trials.push({
        index: trials.length,
        params: { p },
        seed,
        status: 'ok',
        results: { m: 2 * p + 0.1 * Math.sin(7 * p + k) },
      });
  return {
    format: 'gravitas.experiment-result',
    formatVersion: 1,
    hash: 'abc123',
    manifest: {
      format: 'gravitas.experiment',
      formatVersion: 1,
      vary: [{ parameter: 'p', values }],
      seeds,
      observables: { metrics: ['m'] },
      numerics: { frameSeconds: 1 / 60, sampleEvery: 1 },
    },
    trials,
  };
}

describe('the analysis schema', () => {
  const s = schema('analysis-1');

  async function both() {
    // The analysis laboratory's save: the analysis whole, and its methods.
    const a = await SA.analyzeSweep(sweepResult(), { seed: 'a' });
    const sweep = clone({ ...a, methods: 'Resampled 1000 times.' });
    // The fit panel's comparison of two real fits of one dataset.
    const fits = rvFits();
    const c = MC.compareModels(fits, { models: MODELS });
    const models = clone({
      format: 'gravitas.analysis',
      formatVersion: 1,
      kind: 'models',
      tool: MC.MODEL_COMPARISON,
      observation: {
        id: 'synthetic:rv',
        rows: c.data?.rows ?? 0,
        key: c.data?.key ?? null,
      },
      engine: { fingerprint: fits[0].document.engine.fingerprint },
      consumed: [
        {
          kind: 'observation',
          id: 'synthetic:rv',
          digest: c.data?.key ?? null,
        },
      ],
      comparison: c,
      methods: 'Compared by AIC and BIC.',
      sources: fits.map(h => ({ label: h.label, document: h.document })),
    });
    return { sweep, models };
  }

  test('a sweep analysis and a model comparison, as the pages save them, fit it', async () => {
    const { sweep, models } = await both();
    expect(sweep.cells).toHaveLength(5);
    expect(models.comparison.models.map(m => m.label)).toEqual([
      'constant',
      'circular',
      'eccentric',
    ]);
    expect(valid(s, sweep)).toBe(true);
    expect(valid(s, models)).toBe(true);
    // Each source is a whole inference document.
    for (const src of models.sources)
      expect(valid(schema('inference-1'), src.document)).toBe(true);
  });

  test('the comparison’s fields are the ones the fit panel writes', () => {
    const panel = read('js/observatory/fitPanel.js');
    const literal = panel.match(
      /const doc = \{\n {8}format: 'gravitas\.analysis',([\s\S]*?)\n {6}\};/
    )[1];
    const keys = ['format', ...literals(literal, /^ {8}(\w+)\b/gm)];
    expect(keys.sort()).toEqual(
      [
        ...new Set([...Object.keys(s.properties), ...s.$defs.models.required]),
      ].sort()
    );
    expect(read('js/experiments/analysisPanel.js')).toContain(
      'JSON.stringify({ ...a, methods }, null, 2)'
    );
  });

  test('and refuses what neither page would write', async () => {
    const { sweep, models } = await both();
    // Nothing in Gravitas reads one: these are the writers' rules alone.
    const broken = [
      [sweep, d => (d.format = 'gravitas.inference')],
      [sweep, d => (d.formatVersion = 2)],
      [sweep, d => (d.kind = 'other')],
      [sweep, d => (d.tool.id = 'model-comparison')],
      [sweep, d => (d.options.resamples = 50)],
      [sweep, d => (d.design.kind = 'grid-3d')],
      [sweep, d => (d.source.format = 'gravitas.experiment')],
      [sweep, d => (d.source.manifest.format = 'gravitas-experiment')],
      [sweep, d => delete d.cells],
      [sweep, d => (d.warnings[0] = { detail: {} })],
      [models, d => (d.kind = 'sweep')],
      [models, d => delete d.sources],
      [models, d => (d.comparison.preferred.strength = 'huge')],
      [models, d => (d.comparison.models[0].weight = 2)],
      [models, d => (d.comparison.nested[0].p = 2)],
      [models, d => (d.sources[0].document.format = 'gravitas.pipeline')],
      [models, d => (d.comparison.refused = [{ label: 'x', reason: 'later' }])],
    ];
    expect(models.comparison.nested.length).toBeGreaterThan(0);
    expect(sweep.warnings.length).toBeGreaterThan(0);
    for (const [good, change] of broken) {
      const d = clone(good);
      change(d);
      expect({ change: String(change), schema: valid(s, d) }).toEqual({
        change: String(change),
        schema: false,
      });
    }
  });

  test('its tables are the code’s', () => {
    expect(s.properties.format.const).toBe(SA.ANALYSIS_FORMAT);
    expect(s.properties.formatVersion.const).toBe(SA.ANALYSIS_VERSION);
    expect(s.properties.tool.properties.id.enum).toEqual([
      SA.SWEEP_ANALYSIS.id,
      MC.MODEL_COMPARISON.id,
    ]);
    for (const t of [SA.SWEEP_ANALYSIS, MC.MODEL_COMPARISON])
      expect(t.version).toMatch(
        new RegExp(s.properties.tool.properties.version.pattern)
      );
    const o = s.$defs.sweep.properties.options.properties;
    expect([o.resamples.minimum, o.resamples.maximum]).toEqual([
      SA.LIMITS.resamples.min,
      SA.LIMITS.resamples.max,
    ]);
    expect([o.permutations.minimum, o.permutations.maximum]).toEqual([
      SA.LIMITS.permutations.min,
      SA.LIMITS.permutations.max,
    ]);
    const sweepSrc = read('js/analysis/sweepAnalysis.js');
    const designOf = sweepSrc.match(/const kind = sampled \?([^;]*);/)[1];
    expect(s.$defs.sweep.properties.design.properties.kind.enum.sort()).toEqual(
      literals(designOf, /'([a-z0-9-]+)'/g).sort()
    );
    const compare = read('js/analysis/modelCompare.js');
    const cmp = s.$defs.models.properties.comparison.properties;
    expect(cmp.refused.items.properties.reason.enum.sort()).toEqual(
      [...new Set(literals(compare, /reason: '([a-zA-Z]+)'/g))].sort()
    );
    const strength = compare.match(/const strength =([\s\S]*?);/)[1];
    expect(cmp.preferred.anyOf[1].properties.strength.enum.sort()).toEqual(
      literals(strength, /'([a-z]+)'/g).sort()
    );
  });
});
