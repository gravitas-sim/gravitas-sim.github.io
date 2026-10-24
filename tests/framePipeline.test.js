// =============================================================================
// The frame pipeline (Prompt 185)
// -----------------------------------------------------------------------------
// tests/fixtures/framepipeline/thresholds.json fixed every bound before
// js/measure/frameSeries.js had been run. tools/frame-pipeline-validate.mjs runs
// them in plain Node (Jest's VM makes Math and Float64Array reads about ten
// times slower, so an ensemble here would time the harness); this file runs it
// in two processes and holds every row to its bound or to its recorded failure
// (failed-legs.json), and adds what needs no ensemble: the registration vote,
// the stability test, the sinusoid's arithmetic, the pipeline's nodes in the
// measurement registry, the light curve as an observation, the record and its
// replay, the words in both languages, and the lesson. Nothing here is an exact
// float that passes through exp, log, pow or a trigonometric function (Node 20,
// 22 and 24 differ in the last bits).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  RULES,
  STAGES,
  VERSION,
  checkSequence,
  constantFit,
  csvRows,
  fitCurve,
  observationOf,
  pairUp,
  parameterProblem,
  quantitiesOf,
  reductionOf,
  registerFrame,
  replay,
  runSequence,
  stability,
  viewOf,
  vote,
} from '../js/measure/frameSeries.js';
import { DEMO, demoSequence, digestOf } from '../js/measure/frameSource.js';
import CORE from '../js/data/investigations/a-variable-star-from-frames.js';
import DEEP from '../js/data/investigations/depth/a-variable-star-from-frames.js';
import {
  TOOLS,
  paramProblem,
  readPipeline,
  runNode,
  sameResult,
} from '../js/measure/pipeline.js';
import { permits } from '../js/dataKinds/contract.js';
import { validateObservation } from '../js/observatory/schema.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';
import { num } from '../js/csv.js';
import { EN_IMAGESEQUENCE } from '../js/i18n/en.imageSequence.js';
import { ES_IMAGESEQUENCE } from '../js/i18n/es.imageSequence.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/framepipeline');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const THRESHOLDS = read('thresholds.json');
const FAILED = read('failed-legs.json');
const hooks = { check: permits, yieldNow: async () => {} };
const TARGET = { x: DEMO.stars[0].x, y: DEMO.stars[0].y };
// A short sequence of the committed field: enough to run every stage in Jest.
const SHORT = () => demoSequence('fp-test-short', { count: 10 });
const params = (over = {}) => ({ target: TARGET, ...over });

// ---- the committed thresholds, as rows ------------------------------------------------

const runTool = legs =>
  new Promise((resolve, reject) =>
    execFile(
      process.execPath,
      [
        path.join(ROOT, 'tools/frame-pipeline-validate.mjs'),
        '--json',
        `--leg=${legs}`,
      ],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 },
      (err, out) => (err && !out ? reject(err) : resolve(JSON.parse(out).rows))
    )
  );

describe('the committed thresholds hold for the production module', () => {
  let rows = [];
  beforeAll(async () => {
    const parts = await Promise.all([
      runTool('a1,a2,a5,c1,a3,a4,d4,d5,e1,f1,g1'),
      runTool('b,d1,d2,d3'),
    ]);
    rows = parts.flat();
  }, 1_500_000);

  test('every committed row passes, or is a recorded failure; the authentic leg is not run', () => {
    for (const r of rows) {
      if (r.id === 'g1.authentic' || r.evidence) continue;
      if (FAILED.legs[r.id]) continue;
      expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    }
    const g = rows.find(r => r.id === 'g1.authentic');
    expect(g.notRun).toBe(true);
    expect(g.note).toMatch(/NOT RUN until Prompt 189/);
  });

  test('a recorded failure still fails, with its measured value: it cannot be fixed or hidden unnoticed', () => {
    for (const [id, rec] of Object.entries(FAILED.legs)) {
      const row = rows.find(r => r.id === id);
      expect(row).toBeDefined();
      expect(row.pass).toBe(false);
      expect(row.measured).toBe(rec.measured);
    }
  });

  test('every committed check has rows', () => {
    const prefix = {
      'a1.recovery': 'a1.',
      'a2.uncertainty': 'a2.',
      'a3.lab': 'a3.',
      'a4.calibration': 'a4.',
      'a5.registration': 'a5.',
      'b1.oraclePhotometry': 'b1.',
      'b2.oracleCalibration': 'b2.',
      'b3.oracleFit': 'b3.',
      'b4.oracleShifts': 'b4.',
      'c1.coverage': 'c1.',
      'd1.registrationRefusal': 'd1.',
      'd2.stability': 'd2.',
      'd3.refusals': 'd3.',
      'd4.constantStar': 'd4.',
      'd5.memory': 'd5.',
      'e1.reproducible': 'e1.',
      'f1.lesson': 'f1.',
    };
    for (const id of Object.keys(THRESHOLDS.checks)) {
      if (id === 'g1.authentic') continue;
      expect(prefix[id]).toBeDefined();
      if (prefix[id])
        expect(
          rows.filter(r => r.id.startsWith(prefix[id])).length
        ).toBeGreaterThan(0);
    }
    expect(Object.keys(THRESHOLDS.checks)).toHaveLength(
      Object.keys(prefix).length + 1
    );
  });
});

// ---- the contract's own numbers -----------------------------------------------------------

describe('the committed scene and algorithm are the code’s', () => {
  const S = THRESHOLDS.scene;
  test('the shared field is the committed scene', () => {
    expect(DEMO.detector.width).toBe(S.detector.width);
    expect(DEMO.detector.height).toBe(S.detector.height);
    expect(DEMO.detector.cosmicRate).toBe(S.detector.cosmicRate);
    expect(DEMO.exposure).toBe(S.exposure);
    expect(DEMO.sky).toBe(S.sky);
    expect(DEMO.count).toBe(S.frames);
    expect(DEMO.cadence).toBe(S.cadenceDays);
    expect(DEMO.period).toBe(S.variable.period);
    expect(DEMO.amplitude).toBe(S.variable.amplitude);
    expect(
      DEMO.stars.map(({ id, x, y, rate }) => ({ id, x, y, rate }))
    ).toEqual(S.stars.map(({ id, x, y, rate }) => ({ id, x, y, rate })));
  });
  test('the stars are at least 24 pixels apart, the corrected layout', () => {
    for (const a of DEMO.stars)
      for (const b of DEMO.stars)
        if (a !== b)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(24);
  });
  test('the constants are the algorithm block’s', () => {
    expect(RULES.frames).toBe(256);
    expect(RULES.planes).toBe(6);
    expect(RULES.minFrames).toBe(5);
    expect(RULES.detectSigma).toBe(5);
    expect(RULES.register).toMatchObject({
      sigma: 6,
      radius: 10,
      tolerance: 1,
      rmsMax: 0.5,
      minFraction: 0.5,
    });
    expect(RULES.comparison).toMatchObject({
      max: 5,
      minSnr: 20,
      alpha: 0.001,
    });
    expect(RULES.alpha).toBe(0.001);
  });
  test('the first layout stays on record as a correction made before any validation number', () => {
    expect(THRESHOLDS.corrections).toHaveLength(1);
    expect(THRESHOLDS.corrections[0].what).toMatch(/crowded/);
  });
});

// ---- registration -----------------------------------------------------------------------------

describe('registration', () => {
  const refs = [
    { id: 'a', x: 10, y: 10 },
    { id: 'b', x: 40, y: 12 },
    { id: 'c', x: 25, y: 40 },
    { id: 'd', x: 60, y: 55 },
    { id: 'e', x: 15, y: 70 },
  ];
  const shifted = (dx, dy) =>
    refs.map(r => ({ ...r, x: r.x + dx, y: r.y + dy }));
  test('the vote finds the shift most pairs agree on', () => {
    const v = vote(refs, shifted(3.2, -2.1), 10, 1);
    expect(v.n).toBe(5);
    expect(v.tx).toBeCloseTo(3.2, 9);
    expect(v.ty).toBeCloseTo(-2.1, 9);
  });
  test('the vote ignores shifts beyond the search radius', () => {
    expect(vote(refs, shifted(30, 0), 10, 1)).toBeNull();
  });
  test('a registered frame says its shift, turn and residual', () => {
    const turned = refs.map(r => {
      const c = Math.cos(0.002);
      const s = Math.sin(0.002);
      return { x: c * r.x - s * r.y + 2, y: s * r.x + c * r.y - 1 };
    });
    const r = registerFrame(refs, turned);
    expect(r.ok).toBe(true);
    expect(r.matched).toBe(5);
    expect(r.rms).toBeLessThan(1e-6);
    expect(r.tx).toBeCloseTo(2, 3);
    expect(r.thetaDeg).toBeCloseTo((0.002 * 180) / Math.PI, 6);
  });
  test('another field is refused, with how many stars matched', () => {
    const other = [
      { x: 5, y: 5 },
      { x: 52, y: 8 },
      { x: 33, y: 60 },
      { x: 8, y: 44 },
      { x: 70, y: 30 },
    ];
    const r = registerFrame(refs, other);
    expect(r.ok).toBe(false);
    expect(r.matched).toBeLessThan(4);
  });
  test('an empty frame is refused', () => {
    expect(registerFrame(refs, []).ok).toBe(false);
  });
  test('pairs are one to one, nearest first', () => {
    const pairs = pairUp(
      [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 1, y: 0 },
      ],
      [{ x: 0.4, y: 0 }],
      (x, y) => [x, y],
      1
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].id).toBe('a');
  });
});

// ---- the comparison stars -------------------------------------------------------------------------

describe('the stability test', () => {
  const N = 40;
  const make = (id, base, wob = 0, noise = 0.003) => {
    const net = [];
    const sigma = [];
    for (let k = 0; k < N; k++) {
      const wiggle = wob ? 1 + wob * Math.sin(k / 3) : 1;
      // a deterministic pseudo-noise of the stated size
      const e = noise * Math.sin(12.9898 * (k + base) + 78.233 * base);
      net.push(base * wiggle * (1 + e));
      sigma.push(base * noise);
    }
    return { id, net, sigma };
  };
  test('steady stars are not flagged', () => {
    const r = stability([
      make('a', 1000),
      make('b', 1500),
      make('c', 800),
      make('d', 1200),
    ]);
    expect(r.flagged).toEqual([]);
    expect(Object.values(r.stats).every(s => s.status === 'stable')).toBe(true);
  });
  test('a star that varies is flagged, and the rest are tested without it', () => {
    const r = stability([
      make('a', 1000),
      make('b', 1500, 0.05),
      make('c', 800),
      make('d', 1200),
      make('e', 900),
    ]);
    expect(r.flagged).toEqual(['b']);
    expect(r.stats.b.status).toBe('unstable');
    expect(r.stats.a.status).toBe('stable');
  });
  test('with fewer than three candidates nothing is tested', () => {
    const r = stability([make('a', 1000), make('b', 1500, 0.05)]);
    expect(r.flagged).toEqual([]);
    expect(Object.values(r.stats).every(s => s.status === 'untested')).toBe(
      true
    );
  });
});

// ---- the sinusoid and the constant ---------------------------------------------------------------------

describe('the light curve’s arithmetic', () => {
  const t = Float64Array.from({ length: 60 }, (_, i) => i * 0.01);
  const sig = new Float64Array(60).fill(0.004);
  const clean = Float64Array.from(
    t,
    x => 1.5 + 0.05 * Math.sin((2 * Math.PI * x) / 0.12 + 0.4)
  );
  test('a noiseless sinusoid gives its period and amplitude, and says so', () => {
    const f = fitCurve(t, clean, sig);
    expect(f.period).toBeCloseTo(0.12, 4);
    expect(f.amplitude).toBeCloseTo(0.05, 5);
    expect(f.chi2red).toBeLessThan(1e-6);
    expect(f.scaled).toBe(false);
  });
  test('the period’s stated error is the asymptotic formula', () => {
    const f = fitCurve(t, clean, sig);
    const want =
      (f.period * f.period * Math.sqrt(6) * 0.004) /
      (Math.PI * f.baseline * f.amplitude * Math.sqrt(60));
    expect(f.sigmaPeriod).toBeCloseTo(want, 12);
  });
  test('the uncertainty is widened when the sinusoid leaves more scatter than stated', () => {
    const noisy = Float64Array.from(
      clean,
      (v, i) => v + 0.02 * Math.sin(37 * i)
    );
    const f = fitCurve(t, noisy, sig);
    expect(f.chi2red).toBeGreaterThan(1);
    expect(f.scaled).toBe(true);
    expect(f.sigmaAmplitude).toBeCloseTo(
      f.sigmaAmplitudeFormal * Math.sqrt(f.chi2red),
      12
    );
  });
  test('a constant curve is consistent with a steady star, a varying one is not', () => {
    const flat = constantFit(new Float64Array(60).fill(2), sig);
    expect(flat.variable).toBe(false);
    expect(flat.chi2).toBe(0);
    expect(constantFit(clean, sig).variable).toBe(true);
  });
  test('the limits of the period scan follow the cadence and the baseline unless given', () => {
    const f = fitCurve(t, clean, sig);
    expect(f.limits.min).toBeCloseTo(0.04, 12);
    expect(f.limits.max).toBeCloseTo(0.295, 12);
    const g = fitCurve(t, clean, sig, { min: 0.1, max: 0.14 });
    expect(g.limits).toEqual({ min: 0.1, max: 0.14 });
  });
});

// ---- the refusals that need no frame -------------------------------------------------------------------

describe('refusals before a frame is read', () => {
  const fake = (o = {}) => ({
    count: 20,
    width: 96,
    height: 96,
    times: Float64Array.from({ length: 20 }, (_, i) => i * 0.01),
    calibration: 'electrons',
    ...o,
  });
  test('the codes, one by one', () => {
    expect(checkSequence(fake({ count: 257 }), params()).code).toBe(
      'too-many-frames'
    );
    expect(
      checkSequence(fake({ width: 2000, height: 2000 }), params()).code
    ).toBe('too-large');
    expect(checkSequence(fake({ calibration: 'raw' }), params()).code).toBe(
      'no-masters'
    );
    expect(
      checkSequence(
        fake(),
        params({
          exclude: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        })
      ).code
    ).toBe('too-few-frames');
    expect(
      checkSequence(fake(), params({ period: { min: 0.2, max: 0.1 } })).code
    ).toBe('bad-parameter');
    expect(checkSequence(fake(), params({ period: { min: 0.015 } })).code).toBe(
      'bad-parameter'
    );
    expect(checkSequence(fake(), {}).code).toBe('bad-parameter');
    expect(checkSequence(fake(), params()).ok).toBe(true);
  });
  test('every parameter is checked, by name', () => {
    const bad = o => parameterProblem(params(o), 20);
    expect(bad({ reference: 20 })).toBe('reference');
    expect(bad({ fwhm: 0.1 })).toBe('fwhm');
    expect(bad({ aperture: { r: 5, rIn: 4, rOut: 9 } })).toBe('aperture');
    expect(bad({ weighting: 'wide' })).toBe('weighting');
    expect(bad({ exclude: [99] })).toBe('exclude');
    expect(bad({ exclude: [0] })).toBe('exclude');
    expect(bad({ marks: [{ id: 'a', x: 1 }] })).toBe('marks');
    expect(bad({ comparison: { ids: [] } })).toBe('comparison');
    expect(bad({})).toBe(null);
  });
});

// ---- the pipeline, end to end on a short sequence -------------------------------------------------------

describe('the pipeline end to end', () => {
  const seq = SHORT();
  let res;
  beforeAll(async () => {
    res = await runSequence(seq, params(), hooks);
  }, 120_000);

  test('every stage is a node, in order, and the light curve is made', () => {
    expect(res.ok).toBe(true);
    expect(res.nodes.map(n => n.id)).toEqual(STAGES.map(s => `frames-${s}`));
    expect(res.dm).toHaveLength(10);
    expect(res.marks.length).toBeGreaterThanOrEqual(6);
    expect(res.chosen.length).toBeGreaterThanOrEqual(1);
    expect(res.chosen).not.toContain(res.target);
  });
  test('every quantity says whether it was measured, derived or assumed', () => {
    for (const n of res.nodes)
      for (const q of n.quantities)
        expect(['measured', 'derived', 'assumed']).toContain(q.kind);
  });
  test('the frames were read one at a time through the provider’s release', async () => {
    let held = 0;
    let peak = 0;
    const base = demoSequence('fp-test-mem', { count: 6 });
    const probe = Object.create(base, {
      frameAt: {
        value: k => ((peak = Math.max(peak, ++held)), base.frameAt(k)),
      },
      release: { value: () => void held-- },
    });
    const r = await runSequence(
      probe,
      params({ comparison: { max: 2 } }),
      hooks
    );
    expect(r.ok).toBe(true);
    expect(peak).toBe(1);
  });
  test('a frame whose pointing is lost refuses the light curve and is named; leaving it out completes it', async () => {
    const bad = demoSequence('fp-test-lost', {
      count: 14,
      replace: { 10: 'turn' },
    });
    const r = await runSequence(bad, params(), hooks);
    expect(r.ok).toBe(false);
    expect(r.code).toBe('registration');
    expect(r.frames).toEqual([10]);
    expect('dm' in r).toBe(false);
    expect(r.nodes.map(n => n.id)).toContain('frames-register');
    const again = await runSequence(bad, params({ exclude: [10] }), hooks);
    expect(again.ok).toBe(true);
    expect(again.dm).toHaveLength(13);
  }, 120_000);
  test('the target must be among the marks', async () => {
    const r = await runSequence(SHORT(), { target: { x: 47.3, y: 5 } }, hooks);
    expect(r.code).toBe('target-not-found');
  });
  test('the record replays, and refuses a different sequence', async () => {
    const red = JSON.parse(
      JSON.stringify(await reductionOf(seq, params(), res, digestOf))
    );
    const same = await replay(red, SHORT(), hooks, digestOf);
    expect(same.ok && same.identical && same.chosenSame).toBe(true);
    const other = await replay(
      red,
      demoSequence('fp-test-other', { count: 10 }),
      hooks,
      digestOf
    );
    expect(other.code).toBe('sequence-changed');
  }, 120_000);
  test('the 150 quantities are envelopes the ledger can hold', () => {
    const qs = quantitiesOf(res);
    const env = artifact({
      id: 'sequence-test',
      source: { kind: 'observation', id: seq.id, digest: 'a'.repeat(64) },
      quantities: qs,
      made: { app: 'gravitas', tool: 'image-sequence' },
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(qs.find(q => q.id === 'lc.period').uncertainty.kind).toBe('sigma');
  });
  test('the light curve is a table of CSV rows and an observation the Observatory reads', async () => {
    const rows = csvRows(res, ['f', 't', 'dm', 's', 'a', 'b'], num);
    expect(rows).toHaveLength(11);
    const o = observationOf(res, seq, {
      title: 'x',
      names: { time: 't', dm: 'dm', sigma: 's' },
    });
    expect(validateObservation(o)).toEqual([]);
    const node = await runNode(
      o,
      {
        tool: 'period',
        params: { minPeriod: 0.03, maxPeriod: 0.3, oversample: 5 },
        at: 0,
        id: 'm1',
      },
      {}
    );
    expect(node.status).toBe('current');
  });
});

// ---- the measurement pipeline's registry ---------------------------------------------------------------

describe('the frame-sequence nodes of the measurement pipeline', () => {
  const ids = STAGES.map(s => `frames-${s}`);
  test('each stage is a registered tool of the image-sequence kind, at the module’s version', () => {
    for (const id of ids) {
      expect(TOOLS[id].kinds).toEqual(['image-sequence']);
      expect(TOOLS[id].version).toBe(VERSION);
    }
  });
  test('a node runs, is replayable and says the same twice', async () => {
    const view = viewOf(SHORT(), digestOf);
    const spec = {
      tool: 'frames-lightcurve',
      params: params(),
      at: 0,
      id: 'm1',
    };
    const a = await runNode(view, spec, hooks);
    expect(a.status).toBe('current');
    expect(a.quantities.map(q => q.id)).toContain('period');
    const b = await runNode(viewOf(SHORT(), digestOf), spec, hooks);
    expect(sameResult(a, b)).toBe(true);
    expect(a.input.digest).toBe(b.input.digest);
  }, 120_000);
  test('a node after a refusal fails with the frames named, and the stages before it still run', async () => {
    const view = viewOf(
      demoSequence('fp-test-node', { count: 14, replace: { 10: 'turn' } }),
      digestOf
    );
    const reg = await runNode(
      view,
      { tool: 'frames-register', params: params(), at: 0, id: 'm1' },
      hooks
    );
    expect(reg.status).toBe('current');
    const lc = await runNode(
      view,
      { tool: 'frames-lightcurve', params: params(), at: 0, id: 'm2' },
      hooks
    );
    expect(lc.status).toBe('failed');
    expect(lc.error.code).toBe('registration');
    expect(lc.error.detail.frames).toEqual([10]);
  }, 120_000);
  test('a saved pipeline with these nodes reads back, and a bad parameter is named', () => {
    const node = {
      id: 'm1',
      tool: 'frames-photometry',
      version: 1,
      params: params(),
      at: 0,
      input: { observation: 'x', digest: 'd' },
      status: 'current',
      quantities: [],
      warnings: [],
    };
    const doc = (n = node) =>
      JSON.stringify({
        format: 'gravitas.pipeline',
        formatVersion: 1,
        observation: {
          id: 'x',
          title: 'x',
          source: { kind: 'forward' },
          digest: 'd',
        },
        nodes: [n],
        fits: [],
        methods: [],
        workspace: { format: 'gravitas.observation' },
      });
    expect(readPipeline(doc()).ok).toBe(true);
    const bad = readPipeline(
      doc({ ...node, params: { ...params(), weighting: 3 } })
    );
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe('badParams');
    expect(
      paramProblem(
        TOOLS['frames-register'].params,
        { exclude: [1.5] },
        'params'
      )
    ).toMatch(/exclude/);
  });
});

// ---- the words ------------------------------------------------------------------------------------------------

describe('the panel’s words', () => {
  const holes = s =>
    [...s.matchAll(/\{(\w+)\}/g)]
      .map(m => m[1])
      .sort()
      .join();
  test('English and Spanish have the same ids and the same placeholders', () => {
    expect(Object.keys(ES_IMAGESEQUENCE).sort()).toEqual(
      Object.keys(EN_IMAGESEQUENCE).sort()
    );
    for (const k of Object.keys(EN_IMAGESEQUENCE))
      expect(holes(ES_IMAGESEQUENCE[k])).toBe(holes(EN_IMAGESEQUENCE[k]));
  });
  test('every id the panel uses is defined, and the dynamic ones have every value', () => {
    const src = readFileSync(
      path.join(ROOT, 'js/observatory/imageSequence.js'),
      'utf8'
    );
    const used = new Set(
      [...src.matchAll(/'(obs\.sq\.[\w.-]+)'/g)].map(m => m[1])
    );
    for (const id of used) {
      if (id === 'obs.sq.title' || id === 'obs.sq.offline') continue;
      expect(EN_IMAGESEQUENCE[id]).toBeDefined();
    }
    for (const s of STAGES) {
      for (const p of ['step', 'what'])
        expect(EN_IMAGESEQUENCE[`obs.sq.${p}.${s}`]).toBeDefined();
    }
    for (const c of [
      'registration',
      'photometry',
      'no-comparison',
      'target-not-found',
      'no-marks',
      'too-many-frames',
      'too-few-frames',
      'too-large',
      'no-masters',
      'frame-shape',
      'bad-parameter',
      'bad-frame',
      'no-frames',
    ])
      expect(EN_IMAGESEQUENCE[`obs.sq.no.${c}`]).toBeDefined();
    for (const w of [
      'fewBias',
      'alreadyCalibrated',
      'psfFallback',
      'registrationRefused',
      'registrationOff',
      'incompleteStar',
      'targetRefused',
      'unstableUsed',
      'stabilityNotRun',
      'singleComparison',
      'untestedAfterRemoval',
      'scaledUncertainty',
      'notVariable',
      'noAmplitude',
      'weakAmplitude',
    ])
      expect(EN_IMAGESEQUENCE[`obs.sq.w.${w}`]).toBeDefined();
  });
  test('the frame and size limits the panel states are the code’s', () => {
    expect(EN_IMAGESEQUENCE['obs.sq.limits']).toMatch(/256 frames/);
    expect(EN_IMAGESEQUENCE['obs.sq.limits']).toMatch(/1,398,101 pixels/);
    expect(ES_IMAGESEQUENCE['obs.sq.limits']).toMatch(/256 imágenes/);
    expect(ES_IMAGESEQUENCE['obs.sq.limits']).toMatch(/1\.398\.101 píxeles/);
  });
});

// ---- the lesson at its upper depth ---------------------------------------------------------------------

// The graded fields of every step of "A Variable Star From Frames" as they were at v3
// (27e4db69), before the upper depth gained its step.
const DIFF = m =>
  JSON.stringify({
    id: 'diff-photometry',
    values: { draw: 1, reduction: 3, truth: 0, mode: m },
  });
const PRE_185_CORE = [
  ['forty-frames', 'read', undefined, null, null, DIFF(0)],
  ['the-star-alone', 'measure', undefined, null, null, DIFF(0)],
  ['where-the-wander-comes-from', 'question', 'choice', 1, null, DIFF(1)],
  ['against-the-comparison', 'measure', undefined, null, null, DIFF(3)],
  ['predict-the-curve', 'predict', undefined, 1, null, DIFF(3)],
  ['the-sine', 'measure', undefined, null, null, DIFF(2)],
  ['is-it-real', 'question', 'choice', 1, null, DIFF(2)],
  ['what-you-worked-out', 'read', undefined, null, null, DIFF(2)],
];
const PRE_185_DEPTH = [
  [
    'magnitudes-to-percent',
    'quantitative',
    0.81,
    0.03,
    'against-the-comparison',
    DIFF(3),
  ],
  ['the-period-in-hours', 'quantitative', 2.93, 0.1, 'the-sine', DIFF(2)],
  ['how-many-errors', 'advanced', 23.5, 1.3, 'is-it-real', DIFF(2)],
  [
    'the-uncalibrated-night',
    'advanced',
    0.032,
    0.004,
    'is-it-real',
    JSON.stringify({
      id: 'diff-photometry',
      values: { draw: 1, reduction: 0, truth: 1, mode: 2 },
    }),
  ],
];

describe('A Variable Star From Frames at its upper depth', () => {
  test('every step that existed before this prompt grades exactly as it did', () => {
    expect(
      CORE.steps.map(s => [
        s.sid,
        s.type,
        s.kind,
        s.answer ?? null,
        s.tolerance ?? null,
        JSON.stringify(s.tool),
      ])
    ).toEqual(PRE_185_CORE);
    expect(
      DEEP.steps
        .slice(0, 4)
        .map(s => [
          s.sid,
          s.depth,
          s.answer,
          s.tolerance,
          s.after,
          JSON.stringify(s.tool),
        ])
    ).toEqual(PRE_185_DEPTH);
  });
  test('the new step is at the advanced depth, after the existing ones, and restates no core step', () => {
    expect(DEEP.steps).toHaveLength(5);
    const s = DEEP.steps[4];
    expect(s.sid).toBe('the-whole-pipeline');
    expect(s.depth).toBe('advanced');
    expect(s.restates).toBeUndefined();
    expect(s.tool.id).toBe('diff-photometry');
  });
  test('its answer is the pipeline’s period for seed 1 in hours (recomputed by the validation tool, row f1.stepAnswer)', () => {
    const s = DEEP.steps[4];
    // 24 hours a day times the committed period: the data's own period is the answer's anchor
    expect(Math.abs(s.answer - DEMO.period * 24)).toBeLessThan(s.tolerance);
  });
  test('its feedback does not give the answer away', () => {
    const s = DEEP.steps[4];
    for (const msg of Object.values(s.feedback))
      expect(msg).not.toMatch(/(^|[^0-9.])2\.88([^0-9]|$)/);
  });
});
