// =============================================================================
// Six more formats, each held to its JSON Schema
// -----------------------------------------------------------------------------
// sdk/schemas has a schema for each of these (Roadmap II Prompt 61), and each
// is held here the way observation-1 and pipeline-1 are held in their suites:
//
//   - a document the code itself produced fits it: an experiment run in real
//     Worker realms, the notebook's download, the evaluation kit's export
//     clicked on its own page, and the committed catalog and curation;
//   - documents the validator refuses, the schema refuses too, where a schema
//     can say it;
//   - every enumeration in a schema is the code's own table, so neither can
//     change without the other.
//
// The checker is tests/jsonSchemaSubset.js, shared with the other suites.
// =============================================================================

/* global document, Event, URL -- jsdom's, for the evaluation kit's page */
import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { LEGACY_NAMES } from './scenarioLegacyKeys.js';
import { sweepLab } from '../js/experiments/sweep.js';
import * as X from '../js/experiments/experimentManifest.js';
import { METRICS3D, validateLab3dExperiment } from '../js/lab3d/experiment.js';
import { FORMAT as SYSTEM3D, placeByElements } from '../js/lab3d/state.js';
import {
  KINDS,
  SCHEMA_VERSION,
  annotate,
  figureSeries,
  validateEntry,
} from '../js/notebook/entry.js';
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  buildBackup,
  restoreBackup,
  validateBackup,
} from '../js/notebook/notebook.js';
import {
  OBSERVED_FORMAT,
  OBSERVED_VERSION,
  observedEntry,
} from '../js/notebook/observed.js';
import { fromBenchComparison, fromSweep } from '../js/notebook/capture.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import {
  AGREE_SCALE,
  EVALUATION_KIND,
  EVALUATION_SCHEMA,
  INSTRUMENTS,
} from '../js/data/evaluation.js';
import { KINDS as PACKAGE_KINDS } from '../js/platform/manifest.js';
import { LOCALES } from '../sdk/lib/api.mjs';
import {
  ARCHIVE_TYPES,
  FORMAT as CATALOG_FORMAT,
  FORMAT_VERSION as CATALOG_VERSION,
  readCuration,
} from '../tools/catalog.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(REPO, file), 'utf8');
const schema = name => JSON.parse(read(`sdk/schemas/${name}.schema.json`));
const clone = v => JSON.parse(JSON.stringify(v));

// --- gravitas.experiment/1 ---------------------------------------------------

/** A 2-D experiment with each kind of `vary`, stop events and two axes. */
const twoAxes = () => ({
  format: X.FORMAT,
  formatVersion: X.FORMAT_VERSION,
  title: 'Impact parameter against speed at infinity',
  model: { scenario: 'gravity-assist-lab', platform: X.PLATFORM_RANGE },
  initial: { settings: {} },
  seeds: ['a', 'b'],
  vary: [
    { parameter: 'assist_impact_parameter', values: [-40, 40] },
    {
      parameter: 'assist_v_infinity',
      distribution: {
        kind: 'uniform',
        samples: 3,
        min: 0.5,
        max: 1.5,
        seed: 'draw',
      },
    },
  ],
  observables: {
    metrics: ['speed', 'closest_approach'],
    roles: X.SWEEPABLE['gravity-assist-lab'].roles,
  },
  stop: {
    duration: 4000,
    events: [{ kind: 'separation-above', au: 50 }],
  },
  numerics: { frameSeconds: 1 / 120, sampleEvery: 2 },
  limits: X.defaultLimits('desktop', { hardwareConcurrency: 8 }),
  summaries: [...X.SUMMARIES],
});

/** A 3-D experiment, as js/lab3d/experiment.js and LAB3D.md describe one. */
function threeD() {
  const system = {
    format: SYSTEM3D,
    formatVersion: 1,
    units: 'code',
    integrator: { scheme: 'yoshida4c', h: (2 * Math.PI) / 500 },
    t: 0,
    bodies: [{ id: 'star', m: 1, radius: 0, x: [0, 0, 0], v: [0, 0, 0] }],
  };
  system.bodies.push(
    placeByElements(system, {
      id: 'planet',
      m: 1e-3,
      about: 'star',
      elements: { a: 1, e: 0.2, i: 0.4, Omega: 0, omega: 0, M: 0 },
    })
  );
  return {
    format: X.FORMAT,
    formatVersion: X.FORMAT_VERSION,
    id: 'inclined-orbit-steps',
    model: { kind: 'lab3d', api: '^1.0.0', system },
    seeds: [1, 2],
    perturb: { position: 1e-6 },
    vary: { parameter: 'integrator.h', values: [0.02, 0.01] },
    observables: {
      metrics: [
        { id: 'energyDrift' },
        { id: 'maxEccentricity', bodies: ['star', 'planet'] },
      ],
    },
    stop: { span: 10 * Math.PI, samples: 50 },
    limits: {
      concurrency: 2,
      trialTimeoutMs: 20000,
      totalTimeoutMs: 60000,
      maxResultBytes: 5e6,
    },
  };
}

describe('the experiment schema', () => {
  const s = schema('experiment-1');
  const [twoD, three] = s.anyOf;

  test('every manifest the code writes, and both validators accept, fits it', () => {
    const sweep = {
      scenario: 'binary-planet-lab',
      parameter: 'binary_lab_planet_a',
      from: 0.05,
      to: 0.4,
      count: 12,
      duration: 10000,
      metrics: ['distance_to_primary', 'speed'],
      seed: 'guided',
    };
    const manifests = [
      X.fromSweepSpec(sweep),
      X.fromSweepSpec({ ...sweep, values: [0.1, 0.2, 0.3] }),
      X.migrateExperiment(sweep).manifest,
      twoAxes(),
    ];
    for (const m of manifests) {
      expect(X.validateExperiment(m)).toEqual([]);
      expect(valid(s, clone(m))).toBe(true);
    }
    const m3 = threeD();
    expect(validateLab3dExperiment(m3)).toEqual([]);
    expect(valid(s, clone(m3))).toBe(true);
  });

  test('and refuses what the validators refuse, where a schema can say it', () => {
    const cases = [
      m => (m.format = 'gravitas-experiment'),
      m => (m.formatVersion = 2),
      m => (m.model.scenario = 'Solar System'),
      m => (m.model.platform = '^2.0.0'),
      m => (m.title = '  '),
      m => (m.seeds = []),
      m => (m.vary[0] = { parameter: 'assist_impact_parameter' }),
      m => (m.vary[0].parameter = 'mutual_gravity'),
      m => (m.observables.metrics = ['temperature']),
      m => (m.stop.events[0].kind = 'collision'),
      m => delete m.limits.maxResultBytes,
      m => (m.summaries = ['median']),
    ];
    for (const change of cases) {
      const m = twoAxes();
      change(m);
      expect({
        change: String(change),
        validator: X.validateExperiment(m).length > 0,
        schema: valid(s, m),
      }).toEqual({ change: String(change), validator: true, schema: false });
    }
    const cases3 = [
      m => (m.model.kind = 'lab4d'),
      m => (m.seeds = ['one']),
      m => (m.vary.parameter = 'gravity'),
      m => (m.observables.metrics = [{ id: 'temperature' }]),
      m => delete m.stop.span,
    ];
    for (const change of cases3) {
      const m = threeD();
      change(m);
      expect({
        change: String(change),
        validator: validateLab3dExperiment(m).length > 0,
        schema: valid(s, m),
      }).toEqual({ change: String(change), validator: true, schema: false });
    }
  });

  test('its tables are the code’s', () => {
    expect(s.properties.format.const).toBe(X.FORMAT);
    expect(s.properties.formatVersion.const).toBe(X.FORMAT_VERSION);
    const p = twoD.properties;
    // By id, or by the English name an experiment made before ids used.
    expect(p.model.properties.scenario.enum).toEqual([
      ...Object.keys(X.SWEEPABLE),
      ...LEGACY_NAMES.filter(n => sweepLab(n) && !X.SWEEPABLE[n]),
    ]);
    expect(p.model.properties.platform.const).toBe(X.PLATFORM_RANGE);
    expect(p.vary.items.properties.parameter.enum).toEqual([
      ...new Set(
        Object.values(X.SWEEPABLE).flatMap(l => l.parameters.map(q => q.key))
      ),
    ]);
    expect(p.observables.properties.metrics.items.enum).toEqual([
      ...X.EXPERIMENT_METRICS,
    ]);
    expect(p.stop.properties.events.items.properties.kind.enum).toEqual([
      ...X.STOP_EVENTS,
    ]);
    expect(p.summaries.items.enum).toEqual([...X.SUMMARIES]);
    expect(p.limits.required).toEqual(Object.keys(X.defaultLimits('desktop')));
    expect(
      three.properties.observables.properties.metrics.items.properties.id.enum
    ).toEqual(Object.keys(METRICS3D));
    expect(
      three.properties.model.properties.system.properties.format.const
    ).toBe(SYSTEM3D);
  });
});

// --- gravitas.experiment-result/1 --------------------------------------------

// A real run: the manifest the bench's sweep converts to, every trial in its
// own realm running js/experiments/experimentWorker.js (a Node worker thread
// standing in for a Web Worker, `self` and all), through the real scheduler,
// in a fresh Node process. The envelope is the one js/experimentsPage.js
// writes; the test after this one holds its fields to the page's.
const RUN = `
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
const load = p => import(pathToFileURL(${JSON.stringify(REPO)} + '/' + p).href);
const M = await load('js/experiments/experimentManifest.js');
const { createScheduler } = await load('js/experiments/scheduler.js');
const url = pathToFileURL(${JSON.stringify(REPO)} + '/js/experiments/experimentWorker.js').href;
const REALM = \`const { parentPort } = require('node:worker_threads');
globalThis.self = globalThis;
globalThis.postMessage = m => parentPort.postMessage(m);
import(\${JSON.stringify(url)}).then(() =>
  parentPort.on('message', data => self.onmessage({ data })));\`;
const spawn = () => {
  // execArgv: [], or the realm inherits --input-type=module and is no
  // longer the CommonJS script it is written as.
  const w = new Worker(REALM, { eval: true, execArgv: [] });
  const h = { postMessage: m => w.postMessage(m), terminate: () => w.terminate() };
  w.on('message', data => h.onmessage?.({ data }));
  w.on('error', e => h.onerror?.(e));
  return h;
};
const ask = msg => new Promise((resolve, reject) => {
  const h = spawn();
  h.onmessage = e => { h.terminate(); resolve(e.data); };
  h.onerror = reject;
  h.postMessage(msg);
});
const nav = { hardwareConcurrency: 4 };
const manifest = M.fromSweepSpec({
  scenario: 'binary-planet-lab', parameter: 'binary_lab_planet_a',
  values: [0.1, 0.2], duration: 2000,
  metrics: ['distance_to_primary', 'energy_drift'], seed: 'schema',
}, { profile: 'desktop', nav });
const { fingerprint } = await ask({ type: 'fingerprint' });
const startedAt = new Date().toISOString();
const out = await createScheduler({
  manifest, trials: M.planTrials(manifest), spawn,
  concurrency: manifest.limits.concurrency,
}).run();
console.log(JSON.stringify({
  format: M.RESULT_FORMAT,
  formatVersion: M.RESULT_VERSION,
  hash: M.experimentHash(manifest),
  manifest,
  engine: { fingerprint, app: 'dev', platform: '1.0.0' },
  environment: { profile: 'desktop', concurrency: manifest.limits.concurrency, cores: nav.hardwareConcurrency },
  startedAt,
  finishedAt: new Date().toISOString(),
  status: out.status,
  stopReason: out.stopReason,
  resumedTrials: out.resumed,
  elapsedMs: Math.round(out.elapsedMs),
  trials: out.trials,
  summary: M.summarizeExperiment(manifest, out.trials),
}));
`;

describe('the experiment result schema', () => {
  const s = schema('experiment-result-1');

  test('a result from trials run in real realms fits it, and reproduces', () => {
    const result = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', RUN], {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
    expect(result.status).toBe('complete');
    expect(result.trials.map(t => t.status)).toEqual(['ok', 'ok']);
    expect(result.trials[0].realmMs).toEqual(expect.any(Number));
    expect(valid(s, result)).toBe(true);
    expect(valid(schema('experiment-1'), result.manifest)).toBe(true);
    expect(
      X.reproducibility(result, {
        engine: result.engine.fingerprint,
        app: 'dev',
      }).reproducible
    ).toBe(true);

    const broken = [
      r => (r.format = 'gravitas.experiment'),
      r => (r.formatVersion = 2),
      r => (r.hash = 'not-hex!'),
      r => delete r.trials,
      r => (r.trials[1].status = 'fine'),
      r => (r.trials[0].results.distance_to_primary = 'far'),
      r => (r.status = 'done'),
      r => (r.manifest.format = 'gravitas-experiment'),
    ];
    for (const change of broken) {
      const r = clone(result);
      change(r);
      expect({ change: String(change), schema: valid(s, r) }).toEqual({
        change: String(change),
        schema: false,
      });
    }
  }, 60_000);

  test('its fields are the ones the experiment runner writes', () => {
    // The page builds the result inline; its top-level keys are the schema's.
    const page = read('js/experimentsPage.js');
    const literal = page.match(/lastResult = \{\n([\s\S]*?)\n {2}\};/)[1];
    const keys = [...literal.matchAll(/^ {4}(\w+)\b/gm)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(10);
    expect(keys.sort()).toEqual(Object.keys(s.properties).sort());
  });

  test('its tables are the code’s', () => {
    expect(s.properties.format.const).toBe(X.RESULT_FORMAT);
    expect(s.properties.formatVersion.const).toBe(X.RESULT_VERSION);
    expect(s.properties.manifest.properties.format.const).toBe(X.FORMAT);
    expect(s.properties.trials.items.properties.status.enum).toEqual(
      Object.values(X.STATUS)
    );
    expect(s.properties.environment.properties.profile.enum).toEqual(
      Object.keys(X.PROFILES)
    );
    // How a run ends: the scheduler's end() calls, and nothing else.
    const scheduler = read('js/experiments/scheduler.js');
    const ends = [...scheduler.matchAll(/\bend\(([^)]*)\)/g)].flatMap(m =>
      [...m[1].matchAll(/'([a-z]+)'/g)].map(q => q[1])
    );
    expect([...new Set(ends)].sort()).toEqual(
      [...s.properties.status.enum].sort()
    );
  });
});

// --- gravitas.evidence.notebook/1 --------------------------------------------

// The prose is in the deferred half of the catalog; the bridge registers it at
// run time, and a unit test registers it itself.
registerMessages('en', EN_DEFERRED);

/** A notebook of real captures: a bench comparison, a sweep, an Observatory
 * measurement, and one of them revised. */
function capturedNotebook() {
  const comparison = fromBenchComparison({
    experiment: {
      name: 'Two timesteps',
      metrics: ['separation'],
      diff: { variables: [{ key: 'gravity' }], multivariable: false },
      provenance: {
        scenario: 'Binary',
        seed: 's1',
        integrator: 'yoshida',
        timestep: 0.02,
        simSpeed: 1,
        units: { length: 'AU' },
        initialStateHash: 'h1',
      },
    },
    comparison: {
      rows: [
        {
          metric: 'separation',
          unit: 'AU',
          a: 1.2,
          b: 1.4,
          delta: 0.2,
          fraction: 0.16,
        },
      ],
      aligned: { separation: { a: [1, 2, 3], b: [1, 2.1, 3.2] } },
      warnings: [],
    },
    labelFor: id => id,
    provenance: {},
  });
  const sweep = fromSweep({
    sweep: {
      scenario: 'Binary',
      parameter: 'gravity',
      metrics: ['separation'],
      duration: 120,
      seed: 's1',
      canceled: false,
      numerics: { maxStep: 0.02, substeps: 4 },
      trials: [
        { value: 3, status: 'ok', results: { separation: 3.3 } },
        { value: 1, status: 'ok', results: { separation: 1.1 } },
        { value: 2, status: 'failed', results: {} },
      ],
      summaries: [
        {
          metric: 'separation',
          changed: true,
          direction: 'increasing',
          min: 1.1,
          max: 3.3,
          n: 2,
        },
      ],
    },
    labelFor: id => id,
  });
  const observed = observedEntry({
    node: {
      tool: 'period',
      version: '1.0.0',
      params: { minDays: 1, maxDays: 10 },
      at: 1,
      quantities: [
        { id: 'period', value: 3.52, unit: 'd', kind: 'measured', error: 0.01 },
        { id: 'rstar', value: 1.2, unit: 'Rsun', kind: 'assumed', cite: 'T' },
      ],
    },
    source: {
      id: 'hd209458-s56',
      title: 'HD 209458, TESS sector 56',
      source: { archive: 'MAST' },
      license: { status: 'public-domain' },
      credit: 'NASA TESS',
    },
    digest: 'a'.repeat(64),
    changes: [{ op: { kind: 'mask', from: 0, to: 1 } }],
    title: 'The transit period',
    labels: {
      quantity: q => q.id,
      note: () => '',
      rows: [['Tool', 'period 1.0.0']],
    },
  });
  expect([comparison, sweep, observed].every(Boolean)).toBe(true);
  return [
    annotate(comparison, { claim: 'The second run separates further.' }),
    sweep,
    observed,
  ];
}

describe('the evidence notebook schema', () => {
  const s = schema('evidence-notebook-1');

  test('a downloaded notebook of real captures fits it, and restores', () => {
    const file = JSON.parse(
      JSON.stringify(
        buildBackup({ entries: capturedNotebook(), revision: 'abc123' })
      )
    );
    expect(validateBackup(file)).toEqual({ ok: true, reason: '' });
    expect(restoreBackup(file).tampered).toBe(0);
    expect(file.entries[2].snapshot.observed.format).toBe(OBSERVED_FORMAT);
    expect(file.entries[0].revisedAt).toEqual(expect.any(Number));
    expect(valid(s, file)).toBe(true);
  });

  test('and refuses what validateBackup refuses, where a schema can say it', () => {
    const good = JSON.parse(
      JSON.stringify(buildBackup({ entries: capturedNotebook() }))
    );
    const cases = [
      d => (d.kind = 'gravitas.notebook'),
      d => (d.version = 2),
      d => delete d.version,
      d => (d.entries = {}),
      d => delete d.entries[0].id,
      d => delete d.entries[1].snapshot,
      d => (d.entries[1].snapshot.v = 2),
      d => (d.entries[0].snapshot.quantities = null),
      d => (d.entries[0].snapshot.quantities[0].kind = 'guessed'),
      d => delete d.entries[0].snapshot.quantities[0].label,
      d => (d.entries[1].snapshot.figure = { title: 'no series' }),
    ];
    for (const change of cases) {
      const d = clone(good);
      change(d);
      expect({
        change: String(change),
        validator: validateBackup(d).ok,
        schema: valid(s, d),
      }).toEqual({ change: String(change), validator: false, schema: false });
    }
  });

  test('its tables are the code’s', () => {
    expect(s.properties.kind.const).toBe(BACKUP_KIND);
    expect(s.properties.version.const).toBe(BACKUP_VERSION);
    expect(s.properties.entrySchema.const).toBe(SCHEMA_VERSION);
    const snap = s.properties.entries.items.properties.snapshot.properties;
    expect(snap.v.const).toBe(SCHEMA_VERSION);
    expect(snap.quantities.items.properties.kind.enum).toEqual(KINDS);
    const series = snap.figure.properties.series.items.properties;
    expect(series.kind.enum).toEqual(KINDS);
    const styles = ['line', 'points', 'bars'].map(
      style => figureSeries({ label: 'x', points: [[0, 1]], style }).style
    );
    expect(series.style.enum).toEqual([...new Set(styles)]);
    expect(snap.observed.properties.format.const).toBe(OBSERVED_FORMAT);
    expect(snap.observed.properties.formatVersion.const).toBe(OBSERVED_VERSION);
    // The one per-entry rule a file most plausibly breaks is refused by both.
    expect(validateEntry({ id: 'e', snapshot: {} }).ok).toBe(false);
  });
});

// --- gravitas.evaluation/1 ---------------------------------------------------

const occasions = () =>
  [
    ...read('evaluation/index.html')
      .match(/<select id="ekOccasion">([\s\S]*?)<\/select>/)[1]
      .matchAll(/value="([^"]+)"/g),
  ].map(m => m[1]);

describe('the evaluation schema', () => {
  const s = schema('evaluation-1');

  test('the kit’s own JSON export, clicked on its page, fits it', async () => {
    document.body.innerHTML = read('evaluation/index.html').match(
      /<body[^>]*>([\s\S]*)<\/body>/
    )[1];
    const blobs = [];
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = blob => {
      blobs.push(blob);
      return 'blob:evaluation';
    };
    URL.revokeObjectURL = () => {};
    try {
      await import('../js/evaluationKit.js');
      const choose = (name, index) => {
        const input = document.getElementById(`${name}-${index}`);
        input.checked = true;
        input.dispatchEvent(new Event('change'));
      };
      const type = (name, value) => {
        const input = document.getElementById(`ek-${name}`);
        input.value = value;
        input.dispatchEvent(new Event('input'));
      };
      choose('q01', 1);
      choose('q12', 3);
      choose('setting', 1);
      type('minutes', '50');
      type('investigations', 'keplers-laws, then tides');
      choose('u1', 4);
      type('u8', 'The graphs were clear.');
      document.getElementById('ekOccasion').value = 'post';
      document.getElementById('ekParticipant').value = 'brisk-comet-41';
      document.getElementById('ekJson').click();
      expect(blobs).toHaveLength(1);
      const doc = JSON.parse(await blobs[0].text());
      expect(doc.records.map(r => [r.instrument, r.occasion])).toEqual([
        ['concept', 'post'],
        ['fidelity', 'post'],
        ['usability', 'post'],
      ]);
      expect(doc.records[0]).toMatchObject({ q01: '1', q12: '3' });
      expect(doc.records[1]).toMatchObject({ setting: '1', minutes: '50' });
      expect(valid(s, doc)).toBe(true);

      const broken = [
        d => (d.kind = 'something.else'),
        d => (d.schema = EVALUATION_SCHEMA + 1),
        d => (d.records = []),
        d => (d.records[0].instrument = 'survey'),
        d => (d.records[0].occasion = 'mid'),
        d => (d.records[0].q01 = '7'),
        d => (d.records[2].u1 = '5'),
        d => (d.exported = 'yesterday'),
      ];
      for (const change of broken) {
        const d = clone(doc);
        change(d);
        expect({ change: String(change), schema: valid(s, d) }).toEqual({
          change: String(change),
          schema: false,
        });
      }
    } finally {
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
      document.body.innerHTML = '';
    }
  });

  test('its tables are the kit’s', () => {
    expect(s.properties.kind.const).toBe(EVALUATION_KIND);
    expect(s.properties.schema.const).toBe(EVALUATION_SCHEMA);
    const r = s.properties.records.items.properties;
    expect(r.schema.const).toBe(EVALUATION_SCHEMA);
    expect(r.instrument.enum).toEqual(Object.keys(INSTRUMENTS));
    expect(r.occasion.enum).toEqual(occasions());
    const items = Object.values(INSTRUMENTS).flatMap(i => i.items);
    expect(Object.keys(r).sort()).toEqual(
      [
        'schema',
        'instrument',
        'occasion',
        'participant',
        ...items.map(i => i.id),
      ].sort()
    );
    const indices = n => Array.from({ length: n }, (_, i) => String(i));
    for (const item of items) {
      const want =
        item.kind === 'agree'
          ? { enum: indices(AGREE_SCALE.length) }
          : item.options
            ? { enum: indices(item.options.length) }
            : { type: 'string' };
      expect({ item: item.id, schema: r[item.id] }).toEqual({
        item: item.id,
        schema: want,
      });
    }
  });
});

// --- gravitas.catalog/1 and gravitas.catalog-curation/1 ----------------------

describe('the catalog schemas', () => {
  const catalog = JSON.parse(read('catalog/catalog.json'));
  const s = schema('catalog-1');
  const c = schema('catalog-curation-1');

  test('the committed catalog, which `catalog check` holds to its generator, fits it', () => {
    expect(catalog.entries.some(e => e.delivery === 'built-in')).toBe(true);
    expect(catalog.entries.some(e => e.delivery === 'archive')).toBe(true);
    expect(valid(s, catalog)).toBe(true);
    const archive = catalog.entries.findIndex(e => e.delivery === 'archive');
    const builtIn = catalog.entries.findIndex(e => e.delivery === 'built-in');
    const broken = [
      d => (d.format = 'gravitas.catalog-curation'),
      d => (d.formatVersion = 2),
      d => delete d.lessons,
      d => (d.locales = ['fr']),
      d => (d.entries[builtIn].delivery = 'download'),
      d => (d.entries[builtIn].offline = 'always'),
      d => delete d.entries[archive].sha256,
      d =>
        (d.entries[archive].sha256 = d.entries[archive].sha256.toUpperCase()),
      d => (d.entries[archive].type = 'capability'),
      d => delete d.entries[archive].review.date,
      d => (d.entries[archive].licenses = []),
    ];
    for (const change of broken) {
      const d = clone(catalog);
      change(d);
      expect({ change: String(change), schema: valid(s, d) }).toEqual({
        change: String(change),
        schema: false,
      });
    }
  });

  test('the committed curation, as tools/catalog.mjs reads it, fits its schema', () => {
    const curation = readCuration();
    expect(curation.extensions.length).toBeGreaterThan(0);
    expect(valid(c, curation)).toBe(true);
    const broken = [
      d => (d.format = 'gravitas.catalog'),
      d => delete d.catalogVersion,
      d => (d.extensions[0].path = '../elsewhere'),
      d => delete d.extensions[0].review,
      d => (d.extensions[0].review.checks = []),
    ];
    for (const change of broken) {
      const d = clone(curation);
      change(d);
      expect({ change: String(change), schema: valid(c, d) }).toEqual({
        change: String(change),
        schema: false,
      });
    }
  });

  test('their tables are the code’s', () => {
    expect(s.properties.format.const).toBe(CATALOG_FORMAT);
    expect(s.properties.formatVersion.const).toBe(CATALOG_VERSION);
    expect(s.properties.locales.items.enum).toEqual([...LOCALES]);
    const [builtIn, archive] = s.properties.entries.items.anyOf;
    for (const e of [builtIn, archive])
      expect(e.properties.kind.enum).toEqual(PACKAGE_KINDS);
    expect(archive.properties.type.enum).toEqual([...ARCHIVE_TYPES]);
    // An entry's offline policy is its manifest's, or 'none' without one.
    expect(builtIn.properties.offline.enum).toEqual([
      ...schema('capability-package-1').properties.offline.properties.policy
        .enum,
      'none',
    ]);
    // The curation's review is what the catalog carries into each entry.
    expect(c.properties.extensions.items.properties.review).toEqual(
      archive.properties.review
    );
    expect(c.properties.catalogVersion).toEqual(s.properties.catalogVersion);
  });
});
