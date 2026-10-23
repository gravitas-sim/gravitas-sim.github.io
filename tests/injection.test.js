// =============================================================================
// Completeness by injection (Prompt 184)
// -----------------------------------------------------------------------------
// tests/fixtures/injection/thresholds.json fixed every bound before
// js/measure/inject.js had been run. tools/injection-validate.mjs runs them in
// plain Node (Jest's VM makes Math and Float64Array reads about ten times slower,
// so an ensemble here would time the harness); this file runs it and holds every
// row to its bound, and adds what needs no ensemble: the plan's rules, the
// injection's isolation from the frame, the matching, the curve's arithmetic, the
// record and its replay, and the selection function. Nothing here is an exact
// float that passes through exp, log, pow or a trigonometric function (Node 20,
// 22 and 24 differ in the last bits).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { TextEncoder as NodeTextEncoder } from 'node:util';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { makeFrame } from '../tools/detection-synth.mjs';
import {
  APPLIES,
  DEFAULTS,
  LIMITS,
  STEP,
  appliesTo,
  binomialInterval,
  checkSpec,
  completenessAt,
  conditionsOf,
  csvRows,
  curveOf,
  expectedMap,
  fluxForSnr,
  fluxOf,
  inject,
  logisticOf,
  magnitudeOf,
  match,
  memoryBytes,
  planTrial,
  quantitiesOf,
  reductionOf,
  replay,
  run,
  selectionOf,
  start,
  step,
  suggestRange,
} from '../js/measure/inject.js';
import { adapt } from '../js/measure/photometry.js';
import { permits } from '../js/dataKinds/contract.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';
import { all, selection } from '../js/kernels/statistics/selection.js';
import { sha256Hex } from '../js/hash.js';
import { num } from '../js/csv.js';

if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
if (!globalThis.TextEncoder) globalThis.TextEncoder = NodeTextEncoder;

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = path.join(ROOT, 'tests/fixtures/injection');
const read = name => JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
const THRESHOLDS = read('thresholds.json');
const NOISE = Math.sqrt(90 + 64 + 2.25 / 12);
const magAt = s => magnitudeOf(fluxForSnr(s, 3, NOISE), 30);

const frame = makeFrame({ seed: 'injection-184-test', stars: [] });
const a = adapt(frame, permits);
const digest = f =>
  sha256Hex(
    new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength)
  );
const SPEC = {
  seed: 't',
  count: 8,
  trials: 4,
  fwhm: 3,
  magnitude: { min: magAt(10), max: magAt(3) },
  binWidth: 0.25,
};

// ---- the committed thresholds, as rows ------------------------------------------

describe('the committed thresholds hold for the production module', () => {
  const rows = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'tools/injection-validate.mjs'), '--json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
    )
  );

  test('every committed row passes and the authentic leg is not run', () => {
    for (const r of rows) {
      if (r.id === 'g1.authentic' || r.evidence) continue;
      expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    }
    const g = rows.find(r => r.id === 'g1.authentic');
    expect(g.pass).toBeNull();
    expect(g.note).toMatch(/NOT RUN until Prompt 189/);
  });

  test('every committed check has rows', () => {
    // each committed check id and the prefix of the rows that judge it
    const prefix = {
      'a1.completeness': 'a1.',
      'a2.bookkeeping': 'a2.',
      'a3.rendering': 'a3.',
      'a4.psfWidth': 'a4.',
      'a5.interval': 'a5.',
      'b0.rendering': 'b0.',
      'b1.curve': 'b1.',
      'b2.interval': 'b2.',
      'c1.coverage': 'c1.',
      'd1.refusals': 'd1.',
      'd2.conditions': 'd2.',
      'd3.outsideRange': 'd3.',
      'e1.reproducible': 'e1.',
      'f1.selection': 'f1.',
    };
    for (const id of Object.keys(THRESHOLDS.checks)) {
      if (id === 'g1.authentic') continue;
      expect(prefix[id]).toBeDefined();
      expect(
        rows.filter(r => r.id.startsWith(prefix[id])).length
      ).toBeGreaterThan(0);
    }
    expect(Object.keys(THRESHOLDS.checks)).toHaveLength(
      Object.keys(prefix).length + 1
    );
  });

  test('the ensembles are the committed size', () => {
    const c = THRESHOLDS.checks;
    expect(c['a1.completeness'].trials * c['a1.completeness'].perTrial).toBe(
      1800
    );
    expect(c['c1.coverage'].runs).toBe(300);
    expect(rows.find(r => r.id === 'b2.interval').note).toMatch(/^111 cases/);
    expect(rows.find(r => r.id === 'c1.coverage68').note).toMatch(
      /of 300 runs/
    );
  });

  test('the committed bounds were not moved: each is the number the contract named first', () => {
    const c = THRESHOLDS.checks;
    expect(c['a1.completeness'].bounds).toEqual({
      pointwise: 0.25,
      halfPointWithin: 0.8,
      atTen: 0.99,
      atThreeAtMost: 0.1,
      monotoneSlack: 0.03,
    });
    expect(c['a2.bookkeeping'].bounds.binZ).toBe(4);
    expect(c['a3.rendering'].bounds.kernelDifferenceFraction).toBe(2e-6);
    expect(c['a4.psfWidth']).toMatchObject({
      expectedShift: -0.292,
      bound: 0.15,
    });
    expect(c['b0.rendering'].bound).toBe(1e-9);
    expect(c['b1.curve'].bounds).toMatchObject({ binZ: 4, m50Within: 0.05 });
    expect(c['b2.interval'].bound).toBe(1e-8);
    expect(c['c1.coverage'].bounds.level68).toEqual([0.65, 0.84]);
    expect(c['c1.coverage'].bounds.level95).toEqual([0.935, 0.995]);
    expect(c['f1.selection'].bounds).toEqual({
      sigmas: 4,
      logisticM50: 0.05,
      logisticSum: 0.03,
    });
    // the three corrections made before the module's results existed are on record
    expect(THRESHOLDS.corrections).toHaveLength(3);
    expect(THRESHOLDS.corrections[1]).toMatch(/0\.06/);
    expect(c['a5.interval'].bounds.meanExcess).toEqual({
      level68: 0.25,
      level95: 0.1,
    });
  });
});

// ---- the plan ---------------------------------------------------------------------

describe('the plan', () => {
  const plan = n =>
    planTrial({
      seed: 'p',
      trial: 3,
      count: n,
      width: 128,
      height: 128,
      exposure: 30,
      magnitude: { min: -3, max: -2 },
      fwhm: 3,
    });

  test('keeps 3 FWHM from the border and 4 FWHM apart, inside the magnitude range, and draws the same again', () => {
    const p = plan(20);
    expect(p.sources).toHaveLength(20);
    expect(p.unplaced).toBe(0);
    for (const [i, s] of p.sources.entries()) {
      expect(s.x).toBeGreaterThanOrEqual(9);
      expect(s.x).toBeLessThanOrEqual(118);
      expect(s.m).toBeGreaterThanOrEqual(-3);
      expect(s.m).toBeLessThanOrEqual(-2);
      expect(magnitudeOf(s.flux, 30)).toBeCloseTo(s.m, 10);
      for (const t of p.sources.slice(0, i))
        expect(Math.hypot(s.x - t.x, s.y - t.y)).toBeGreaterThanOrEqual(12);
    }
    expect(plan(20)).toEqual(p);
  });

  test('a shorter list is the start of a longer one, and a trial does not depend on the others', () => {
    expect(plan(20).sources.slice(0, 5)).toEqual(plan(5).sources);
    const t = n =>
      planTrial({
        seed: 'p',
        trial: n,
        count: 4,
        width: 128,
        height: 128,
        exposure: 30,
        magnitude: { min: -3, max: -2 },
        fwhm: 3,
      }).sources;
    expect(t(1)).not.toEqual(t(2));
    expect(t(2)).toEqual(t(2));
  });

  test('keeps clear of the sources the frame already holds, and says how many it could not place', () => {
    const existing = [{ x: 64, y: 64 }];
    const p = planTrial({
      seed: 'q',
      trial: 0,
      count: 60,
      width: 128,
      height: 128,
      exposure: 30,
      magnitude: { min: -3, max: -2 },
      fwhm: 3,
      existing,
    });
    for (const s of p.sources)
      expect(Math.hypot(s.x - 64, s.y - 64)).toBeGreaterThanOrEqual(12);
    expect(p.sources.length + p.unplaced).toBe(60);
    expect(p.unplaced).toBeGreaterThan(0);
  });

  test('a power law puts more sources at the faint end, a flat range does not', () => {
    const faint = slope => {
      const p = planTrial({
        seed: 'r',
        trial: 0,
        count: 500,
        width: 4096,
        height: 4096,
        exposure: 30,
        magnitude: { min: -4, max: -2, slope },
        fwhm: 3,
      });
      return p.sources.filter(s => s.m > -3).length / p.sources.length;
    };
    expect(faint(0.6)).toBeGreaterThan(0.7);
    expect(Math.abs(faint(0) - 0.5)).toBeLessThan(0.1);
  });
});

// ---- the injection --------------------------------------------------------------------

describe('the injection', () => {
  const psf = { model: 'gaussian', fwhm: 3 };
  test('never writes the frame it is given, and adds what the sources say', async () => {
    const before = await digest(frame);
    const copy = Float64Array.from(a.image.values);
    const sources = [{ x: 60.3, y: 61.6, flux: 4000, m: 0 }];
    const made = inject(a, sources, psf, { seed: 's', trial: 0 });
    expect(await digest(frame)).toBe(before);
    expect(a.image.values.every((v, i) => v === copy[i])).toBe(true);
    let added = 0;
    for (let i = 0; i < copy.length; i++)
      added += made.image.values[i] - copy[i];
    expect(Math.abs(added - 4000)).toBeLessThan(5 * Math.sqrt(4000));
    expect(made.image.values).not.toBe(a.image.values);
  });

  test('is the same expected light as the detector kernel renders, to a part in 1e6', () => {
    const k = makeFrame({
      seed: 'injection-184-k',
      stars: [{ x: 40.37, y: 70.81, flux: 5000 }],
    });
    const mine = expectedMap(
      128,
      128,
      [{ x: 40.37, y: 70.81, flux: 5000 }],
      psf
    ).map;
    let worst = 0;
    for (let i = 0; i < mine.length; i++)
      worst = Math.max(worst, Math.abs(mine[i] - k.truth.signal[i]));
    expect(worst / 5000).toBeLessThan(2e-6);
  });

  test('a Moffat source holds its light within a few tenths of a percent inside five FWHM', () => {
    const { map } = expectedMap(128, 128, [{ x: 64.2, y: 63.7, flux: 3000 }], {
      model: 'moffat',
      fwhm: 3,
      beta: 3,
    });
    const total = map.reduce((s, v) => s + v, 0);
    expect(total / 3000).toBeGreaterThan(0.99);
    expect(total / 3000).toBeLessThan(1.0001);
  });

  test('pixels with almost no light draw nothing and draws are whole electrons', () => {
    const made = inject(a, [{ x: 30, y: 30, flux: 300, m: 0 }], psf, {
      seed: 'w',
      trial: 1,
    });
    const delta = made.image.values.map((v, i) => v - a.image.values[i]);
    expect(delta.every(d => Number.isInteger(Math.round(d * 1e6) / 1e6))).toBe(
      true
    );
    expect(delta.every(d => d >= 0)).toBe(true);
    expect(delta.filter(d => d > 0).length).toBeLessThan(500);
  });
});

// ---- recovery ---------------------------------------------------------------------------

describe('recovery', () => {
  test('the nearest pair answers first and a detection answers one source only', () => {
    const sources = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ];
    const found = [{ x: 10.9, y: 10 }];
    const { recovered, extra } = match(sources, found, 2);
    expect(recovered[1]).not.toBeNull();
    expect(recovered[0]).toBeNull();
    expect(extra).toEqual([]);
  });

  test('a detection that answers nothing is extra unless the frame already held a source there', () => {
    const { extra } = match(
      [{ x: 10, y: 10 }],
      [
        { x: 10.5, y: 10 },
        { x: 50, y: 50 },
        { x: 80, y: 80 },
      ],
      2,
      [{ x: 80.5, y: 80 }]
    );
    expect(extra).toEqual([{ x: 50, y: 50 }]);
  });

  test('a source farther than the match radius is not recovered', () => {
    expect(
      match([{ x: 10, y: 10 }], [{ x: 12.5, y: 10 }], 2).recovered
    ).toEqual([null]);
  });
});

// ---- the curve ---------------------------------------------------------------------------

describe('the curve', () => {
  const fake = (m, rec) => ({
    trial: 0,
    unplaced: 0,
    extra: 0,
    sources: m.map((v, i) => ({
      m: v,
      recovered: rec[i],
      x: 0,
      y: 0,
      flux: 1,
    })),
  });
  const spec = { magnitude: { min: 0, max: 2 }, binWidth: 0.5, level: 0.6827 };

  test('counts by bin, with the exact interval, and finds the half point by interpolation between bin centres', () => {
    // four bins of 0.5: completeness 1, 0.8, 0.2, 0 at ten sources each
    const m = [];
    const r = [];
    [10, 8, 2, 0].forEach((k, b) => {
      for (let i = 0; i < 10; i++) {
        m.push(b * 0.5 + 0.05 * i + 0.01);
        r.push(i < k);
      }
    });
    const c = curveOf([fake(m, r)], spec);
    expect(c.bins.map(b => [b.n, b.k])).toEqual([
      [10, 10],
      [10, 8],
      [10, 2],
      [10, 0],
    ]);
    expect(c.bins[1].interval.lo).toBeLessThan(0.8);
    expect(c.bins[1].interval.hi).toBeGreaterThan(0.8);
    expect(c.bins[3].interval.lo).toBe(0);
    // crossing 0.5 between centres 0.75 (0.8) and 1.25 (0.2): at 0.75 + 0.5 * 0.3/0.6 = 1.0
    expect(c.m50.m).toBeCloseTo(1.0, 12);
    expect(c.m50.lo).toBeLessThan(c.m50.m);
    expect(c.m50.hi).toBeGreaterThan(c.m50.m);
    // 0.9 is crossed between 0.25 (1.0) and 0.75 (0.8): at 0.25 + 0.5 * 0.1/0.2 = 0.5
    expect(c.m90.m).toBeCloseTo(0.5, 12);
    expect(c.injected).toBe(40);
    expect(c.recovered).toBe(20);
  });

  test('a curve that never falls below the target, or starts below it, has no crossing', () => {
    const up = curveOf(
      [fake([0.1, 0.6, 1.1, 1.6], [true, true, true, true])],
      spec
    );
    expect(up.m50.m).toBeNull();
    const low = curveOf(
      [fake([0.1, 0.6, 1.1, 1.6], [false, false, false, false])],
      spec
    );
    expect(low.m50.m).toBeNull();
    const q = quantitiesOf(up);
    expect(q.find(x => x.id === 'completeness.m50').uncertainty).toEqual({
      kind: 'failed',
      reason: 'never-crosses',
    });
  });

  test('a single magnitude is one bin centred on it', () => {
    const c = curveOf([fake([-2, -2, -2], [true, false, true])], {
      magnitude: { min: -2, max: -2 },
      binWidth: 0.1,
      level: 0.6827,
    });
    expect(c.bins).toHaveLength(1);
    expect(c.bins[0].center).toBeCloseTo(-2, 12);
    expect(c.bins[0].p).toBeCloseTo(2 / 3, 12);
  });

  test('the exact interval is the Clopper-Pearson one at its ends and never inverts', () => {
    const z = binomialInterval(0, 10, 0.95);
    expect(z.lo).toBe(0);
    expect(z.hi).toBeCloseTo(1 - 0.025 ** 0.1, 12);
    for (const [k, n] of [
      [1, 3],
      [5, 5],
      [37, 100],
    ]) {
      const i = binomialInterval(k, n, 0.6827);
      expect(i.lo).toBeLessThanOrEqual(k / n);
      expect(i.hi).toBeGreaterThanOrEqual(k / n);
      expect(i.method).toBe('clopper-pearson');
    }
  });

  test('the selection function is the curve between bin centres and refuses outside the range', () => {
    const m = [0.1, 0.1, 0.6, 0.6, 1.1, 1.1, 1.6, 1.6];
    const r = [true, true, true, false, false, false, false, false];
    const c = curveOf([fake(m, r)], spec);
    const sel = selectionOf(c, { psf: { fwhm: 3 } });
    expect(sel.inclusion({ m: 0.25 })).toBe(1);
    expect(sel.inclusion({ m: 0.5 })).toBeCloseTo(0.75, 10);
    expect(() => sel.inclusion({ m: -0.1 })).toThrow(/measured from 0 to 2/);
    expect(() => sel.inclusion({ m: 2.1 })).toThrow(/says nothing/);
    expect(() => completenessAt(c, 5)).toThrow(
      expect.objectContaining({ code: 'out-of-range' })
    );
    expect(sel.conditions.psf.fwhm).toBe(3);
    // it composes with Prompt 154's other selections
    const both = all(sel, selection({ observable: 'm', cut: { max: 1 } }));
    expect(both.inclusion({ m: 0.25 })).toBe(1);
    expect(both.inclusion({ m: 1.5 })).toBe(0);
  });

  test('a logistic is fitted through the bins strictly between 0 and 1 and is null with fewer than two', () => {
    const m = [];
    const r = [];
    [20, 17, 12, 6, 2, 0].forEach((k, b) => {
      for (let i = 0; i < 20; i++) {
        m.push(b * 0.4 + 0.01 * i);
        r.push(i < k);
      }
    });
    const c = curveOf([fake(m, r)], {
      magnitude: { min: 0, max: 2.4 },
      binWidth: 0.4,
      level: 0.6827,
    });
    const lg = logisticOf(c);
    expect(lg.m50).toBeGreaterThan(0.8);
    expect(lg.m50).toBeLessThan(1.4);
    expect(lg.width).toBeGreaterThan(0);
    expect(
      logisticOf(curveOf([fake([0.1, 0.6], [true, false])], spec))
    ).toBeNull();
  });
});

// ---- the run, its record and its replay ------------------------------------------------------

describe('a run on a frame', () => {
  const r = run(a, SPEC);

  test('is reproducible by its seed, and another seed gives another run', () => {
    expect(r.ok).toBe(true);
    expect(JSON.stringify(run(a, SPEC).trials)).toBe(JSON.stringify(r.trials));
    expect(JSON.stringify(run(a, { ...SPEC, seed: 'u' }).trials)).not.toBe(
      JSON.stringify(r.trials)
    );
  });

  test('carries what the curve was measured under, and appliesTo reads it', () => {
    expect(r.conditions.psf).toEqual({
      model: 'gaussian',
      fwhm: 3,
      source: 'entered',
    });
    expect(r.conditions.noise).toBeGreaterThan(10);
    expect(r.conditions.noise).toBeLessThan(15);
    expect(appliesTo(r.conditions, r.conditions)).toEqual({ ok: true });
    const other = { ...r.conditions, psf: { ...r.conditions.psf, fwhm: 3.2 } };
    expect(appliesTo(r.conditions, other).ok).toBe(true);
    expect(Math.abs(3.2 / 3 - 1)).toBeLessThan(APPLIES.fwhm);
    expect(
      appliesTo(r.conditions, {
        ...r.conditions,
        noise: r.conditions.noise * 1.2,
      })
    ).toEqual({
      ok: false,
      code: 'not-applicable',
      differs: ['noise'],
    });
    expect(
      conditionsOf(a, { mesh: null, params: {} }, r.spec).noise
    ).toBeNull();
  });

  test('the 150 quantities validate in an envelope, each bin with its interval', () => {
    const q = quantitiesOf(r.curve);
    const env = artifact({
      id: 'inj-1',
      source: { kind: 'observation', id: 'frame', digest: 'ab'.repeat(8) },
      quantities: q,
      provenance: { reductions: [{ step: STEP }] },
      made: { app: 'gravitas', tool: STEP },
    });
    expect(validateArtifact(env)).toEqual([]);
    const bins = q.filter(x => x.id.startsWith('completeness.bin.'));
    expect(bins.length).toBe(r.curve.bins.filter(b => b.n).length);
    for (const b of bins) {
      expect(b.uncertainty.kind).toBe('interval');
      expect(b.uncertainty.lo).toBeLessThanOrEqual(b.value);
      expect(b.uncertainty.hi).toBeGreaterThanOrEqual(b.value);
      expect(b.uncertainty.level).toBe(DEFAULTS.level);
    }
  });

  test('the record holds the lists up to 2,000 sources and replays to the same counts; a changed frame is refused', async () => {
    const d = await digest(frame);
    const red = reductionOf(frame, d, r);
    expect(red.step).toBe(STEP);
    expect(red.listed).toBe(true);
    expect(red.sources).toHaveLength(r.curve.injected);
    expect(red.result.counts).toEqual(r.curve.bins.map(b => [b.n, b.k]));
    expect(red.streams.injection).toMatchObject({
      id: 'injection',
      algorithm: 'mulberry32',
    });
    expect(red.streams.noise.id).toBe('noise');
    const again = await replay(red, frame, { check: permits, digest });
    expect(again).toMatchObject({ ok: true, identical: true, agrees: true });
    const changed = {
      ...frame,
      data: Float64Array.from(frame.data, v => v + 1),
    };
    expect(
      await replay(red, changed, { check: permits, digest })
    ).toMatchObject({
      ok: false,
      code: 'image-changed',
    });
    const many = reductionOf(frame, d, {
      ...r,
      trials: [
        {
          ...r.trials[0],
          sources: Array.from({ length: 2001 }, () => r.trials[0].sources[0]),
        },
      ],
    });
    expect(many.listed).toBe(false);
    expect(many.sources).toBeUndefined();
  });

  test('the lists as CSV: one row per injected source with its position, magnitude, flux and what was found', () => {
    const rows = csvRows(
      r.trials,
      ['id', 'x', 'y', 'm', 'flux', 'found', 'fx', 'fy'],
      num
    );
    expect(rows).toHaveLength(1 + r.curve.injected);
    expect(rows[1][0]).toBe('t1.1');
    expect(rows[1]).toHaveLength(8);
    const s = r.trials[0].sources[0];
    expect(Number(rows[1][1])).toBeCloseTo(s.x + 1, 6);
  });

  test('a Moffat PSF and a magnitude range chosen from the frame run too', () => {
    const m = run(a, {
      seed: 'm',
      count: 6,
      trials: 2,
      fwhm: 3,
      model: 'moffat',
      beta: 3,
    });
    expect(m.ok).toBe(true);
    expect(m.conditions.psf).toMatchObject({ model: 'moffat', beta: 3 });
    expect(m.spec.magnitude.min).toBeLessThan(m.spec.magnitude.max);
    // signal to noise 12 down to 2.5 at the frame's own noise
    const want = suggestRange({
      fwhm: 3,
      noise: m.conditions.noise,
      exposure: 30,
    });
    expect(m.spec.magnitude.min).toBeCloseTo(want.min, 12);
  });
});

// ---- limits and refusals ---------------------------------------------------------------------

describe('limits and refusals', () => {
  test('the limits are the committed ones', () => {
    expect(THRESHOLDS.definition.limits).toEqual({
      countPerTrial: LIMITS.countPerTrial,
      trials: LIMITS.trials,
      total: LIMITS.total,
      bins: LIMITS.bins,
      fwhm: [...LIMITS.fwhm],
    });
  });

  test('a parameter outside its limit names itself, and the defaults fill the rest', () => {
    expect(checkSpec({ seed: 's' }).spec).toMatchObject({
      count: 20,
      trials: 10,
      binWidth: 0.25,
    });
    for (const [over, name] of [
      [{ count: 0 }, 'count'],
      [{ trials: 201 }, 'trials'],
      [{ count: 500, trials: 100 }, 'total'],
      [{ fwhm: 51 }, 'fwhm'],
      [{ magnitude: { min: 1, max: 0 } }, 'magnitude'],
      [{ model: 'sersic' }, 'model'],
      [{ model: 'moffat', beta: 1 }, 'beta'],
      [{ matchRadius: 0 }, 'matchRadius'],
      [{ level: 1 }, 'level'],
    ])
      expect(checkSpec({ seed: 's', fwhm: 3, ...over })).toMatchObject({
        ok: false,
        code: 'bad-parameter',
        name,
      });
  });

  test('the memory bound is 157s with one more plane for the copy, and nothing is made before it passes', () => {
    const big = {
      ok: true,
      route: 'ccd',
      unit: 'electron',
      exposure: 30,
      limit: 1e9,
      image: { width: 2048, height: 2048, values: new Float64Array(1) },
      mask: new Uint8Array(1),
    };
    expect(memoryBytes(big)).toBe(2048 * 2048 * (8 + 2 + 8));
    const r = start(
      big,
      { seed: 'b', fwhm: 3 },
      {
        detector: () => {
          throw new Error('called');
        },
      }
    );
    expect(r).toMatchObject({ ok: false, code: 'too-large', limit: 67108864 });
    expect(memoryBytes(a)).toBe(128 * 128 * 16);
  });

  test('a variance frame in electrons runs; in another unit it is refused', () => {
    const side = {
      ...frame.sidecar,
      pixels: { ...frame.sidecar.pixels, unit: 'electron' },
      planes: {
        ...frame.sidecar.planes,
        variance: {
          encoding: 'float64-le',
          unit: 'electron2',
          source: 'the test',
        },
      },
    };
    const f = {
      ...frame,
      data: Float64Array.from(frame.data, v => v * 1.5),
      variance: new Float64Array(frame.data.length).fill(150),
      sidecar: side,
    };
    const av = adapt(f, permits);
    expect(av.route).toBe('variance');
    expect(run(av, { ...SPEC, trials: 1 }).ok).toBe(true);
    expect(run({ ...av, unit: 'adu' }, SPEC)).toMatchObject({
      ok: false,
      code: 'unit',
    });
  });

  test('a source brighter than the linearity limit allows is refused with the brightest allowed magnitude, before the detector runs', () => {
    let called = 0;
    const r = run(
      a,
      { ...SPEC, magnitude: { min: -12, max: -11 } },
      { detector: () => (called++, { ok: false, code: 'spy' }) }
    );
    expect(r).toMatchObject({ ok: false, code: 'beyond-linearity' });
    expect(r.allowed).toBeGreaterThan(-12);
    expect(r.allowed).toBeLessThan(-8);
    expect(called).toBe(0);
    expect(fluxOf(r.allowed, 30)).toBeGreaterThan(0);
  });

  test('a detector that refuses stops the run with its own code', () => {
    expect(
      run(a, SPEC, { detector: () => ({ ok: false, code: 'no-background' }) })
    ).toMatchObject({
      ok: false,
      code: 'no-background',
    });
  });

  test('a run steps trial by trial to the same curve as the whole run', () => {
    const s = start(a, SPEC);
    const trials = Array.from({ length: SPEC.trials }, (_, t) => step(s, t));
    expect(JSON.stringify(trials)).toBe(JSON.stringify(run(a, SPEC).trials));
  });
});
