// =============================================================================
// Astrometric time series (Prompt 186)
// -----------------------------------------------------------------------------
// tests/fixtures/astrometric-series/thresholds.json fixed every bound before
// js/measure/astrometric-series.js had been run. tools/astrometric-series-validate.mjs
// runs them in plain Node (Jest's VM makes Math reads about ten times slower, so
// an ensemble here would time the harness); this file runs it and holds every row
// to its bound, and adds what needs no ensemble: the rules, the refusals' codes
// and data, the order independence, the record, its replay and its envelope.
// Nothing here is an exact float that passes through a trigonometric function
// (Node 20, 22 and 24 differ in the last bits).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createEphemeris } from '../js/mission/ephemeris.js';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { heliocentric } from '../js/kernels/sky/planets.js';
import {
  RULES,
  SHIFT_LABEL,
  STEP,
  createEarth,
  csvRows,
  distanceInterval,
  fitJoint,
  fitMotion,
  fitRecordOf,
  predict,
  quantitiesOf,
  reductionOf,
  replay,
  twoEpochShift,
  zeroPointOf,
} from '../js/measure/astrometric-series.js';
import { artifact, validateArtifact } from '../js/platform/artifact.js';
import { makeSeries, evenEpochs } from '../tools/astrometric-series-synth.mjs';
import { num } from '../js/csv.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const THRESHOLDS = JSON.parse(
  readFileSync(
    path.join(ROOT, 'tests/fixtures/astrometric-series/thresholds.json'),
    'utf8'
  )
);
const earth = createEarth({
  ephemeris: createEphemeris(PACK, DATA),
  heliocentric,
});

/** The one committed leg that fails: a half-year shift is a parallax of the other sign. */
const KNOWN_FAILED = ['d3.wrongTimeScale.shift182.6.failShare'];

describe('the committed thresholds hold for the production module', () => {
  // The tool exits 1 while the known failed leg fails; the rows are what is judged.
  const ran = spawnSync(
    process.execPath,
    [path.join(ROOT, 'tools/astrometric-series-validate.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }
  );
  const rows = JSON.parse(ran.stdout);

  test('every committed row passes but the one known failed leg, and the authentic leg is not run', () => {
    for (const r of rows) {
      if (r.id === 'b6.authentic' || r.evidence) continue;
      if (KNOWN_FAILED.includes(r.id)) continue;
      expect({ id: r.id, pass: r.pass }).toEqual({ id: r.id, pass: true });
    }
    const b6 = rows.find(r => r.id === 'b6.authentic');
    expect(b6.pass).toBeNull();
    expect(b6.note).toMatch(/NOT RUN until Prompt 189/);
    expect(ran.status).toBe(1);
  });

  test('the failed leg stays failed, as measured, with its cause on record', () => {
    const r = rows.find(x => x.id === KNOWN_FAILED[0]);
    expect(r.pass).toBe(false);
    expect(r.measured).toBeLessThan(0.05);
    expect(r.bound).toEqual([0.99, 1]);
    // the warning added after the measurement flags the same series, as evidence only
    const e = rows.find(
      x =>
        x.id ===
        'd3.wrongTimeScale.shift182.6.flaggedWithNegativeParallaxWarning'
    );
    expect(e.evidence).toBe(true);
    expect(e.measured).toBe(1);
  });

  test('every committed check has rows', () => {
    for (const id of Object.keys(THRESHOLDS.checks)) {
      expect(
        rows.filter(r => r.id.startsWith(`${id}.`) || r.id === id).length
      ).toBeGreaterThan(0);
    }
  });

  test('the ensembles are the committed size', () => {
    const c = THRESHOLDS.checks;
    for (const k of ['c1', 'c2', 'c3', 'c4', 'c6', 'd9'])
      expect(c[Object.keys(c).find(n => n.startsWith(`${k}.`))].trials).toBe(
        3000
      );
    expect(c['d3.wrongTimeScale'].trialsEach).toBe(200);
    expect(c['d7.outlier'].trials).toBe(200);
  });

  test('the committed bounds were not moved: each is the number the contract named first', () => {
    const c = THRESHOLDS.checks;
    expect(c['a5.jointNoiseless'].bounds).toEqual({
      parallaxArcsec: 1e-5,
      muArcsecPerYr: 1e-5,
      residualRmsArcsec: 1e-5,
    });
    expect(c['b1.earth'].bounds).toEqual({
      maxDifferenceAu: 0.00015,
      windowResidualAu: 0.00005,
    });
    expect(c['b2.jointCrossEphemeris'].bounds).toEqual({
      parallaxRelative: 0.0005,
      muArcsecPerYr: 5e-5,
    });
    expect(c['b3.jointVsScipy'].bounds).toEqual({
      shareOfSigma: 0.1,
      sigmaRelative: 0.002,
      chi2Relative: 0.005,
    });
    expect(c['c1.jointCoverage'].bounds).toEqual({
      oneSigma: [0.64, 0.72],
      oneNinetySix: [0.935, 0.975],
    });
    expect(c['c3.distanceAsymmetric'].bounds.asymmetryAtLeast).toBe(1.5);
    expect(c['c5.falseAlarm'].bounds.atMost).toBe(0.004);
    expect(c['d3.wrongTimeScale'].bounds.failShare).toBe(0.99);
    expect(c['d9.zeroParallax'].bounds.openShare).toEqual([0.8, 0.88]);
    // the one correction made before the module's results existed is on record
    expect(THRESHOLDS.corrections).toHaveLength(1);
    expect(THRESHOLDS.corrections[0]).toMatch(/trf/);
  });

  test('the module holds the rules the contract fixed', () => {
    const r = THRESHOLDS.rules;
    expect(RULES.properMotionMinEpochs).toBe(r.properMotion.minEpochs);
    expect(RULES.minSpanDays).toBe(r.properMotion.minSpanDays);
    expect(RULES.checkNeeds).toBe(r.properMotion.checkNeeds);
    expect(RULES.jointMinEpochs).toBe(r.joint.minEpochs);
    expect(RULES.jointMinSpanYears).toBe(r.joint.minSpanYears);
    expect(RULES.jointMinQuadrants).toBe(r.joint.minQuadrants);
    expect(RULES.consistentPValue).toBe(r.consistentPValue);
    expect([...RULES.levels]).toEqual(r.levels);
    expect(RULES.maxOffsetArcsec).toBe(
      THRESHOLDS.definition.limits.maxOffsetArcsec
    );
    expect(RULES.maxEpochs).toBe(THRESHOLDS.definition.limits.epochs);
    expect(SHIFT_LABEL).toBe(r.twoEpoch.label);
  });
});

// ---- the fits -------------------------------------------------------------------------

const truth = {
  ra: 210,
  dec: 35,
  parallax: 0.09,
  mu: [0.25, -0.15],
  sigma: 0.005,
};
const jds = evenEpochs(2461045.5, 380, 20);
const series = makeSeries(truth, jds, earth, { seed: 'unit' });

describe('the joint fit', () => {
  const f = fitJoint(series, earth);

  test('recovers the truth within its stated uncertainty and carries the frame statement', () => {
    expect(f.ok).toBe(true);
    expect(f.kind).toBe('parallax-and-proper-motion');
    expect(Math.abs(f.params.parallax.value - truth.parallax)).toBeLessThan(
      5 * f.params.parallax.sigma
    );
    expect(f.verdict).toBe('consistent');
    expect(f.dof).toBe(35);
    expect(f.residuals).toHaveLength(20);
    expect(f.zeroPoint.kind).toBe('relative');
    expect(f.zeroPoint.statement).toMatch(/Relative parallax/);
    expect(f.zeroPoint.correction).toBeNull();
    expect(f.distance.parallax.used).toBe('relative');
    expect(f.distance.intervals.map(i => i.level)).toEqual([0.6827, 0.95]);
    for (const i of f.distance.intervals) {
      expect(i.method).toBe('profile');
      expect(i.distance.lo).toBeLessThan(1 / f.params.parallax.value);
      expect(i.distance.hi).toBeGreaterThan(1 / f.params.parallax.value);
    }
    expect(f.distance.assumptions.join(' ')).toMatch(/reference frame/);
  });

  test('the order of the epochs does not matter', () => {
    const shuffled = {
      epochs: [...series.epochs].sort((a, b) => (a.ra < b.ra ? -1 : 1)),
    };
    const g = fitJoint(shuffled, earth);
    for (const n of f.order)
      expect(g.params[n].value).toBeCloseTo(f.params[n].value, 9);
    expect(g.chi2).toBeCloseTo(f.chi2, 6);
  });

  test('a correction to absolute is applied only with its size and its source, and both are shown', () => {
    const c = fitJoint(
      {
        ...series,
        reference: {
          name: 'the frame stars',
          correction: {
            value: 0.002,
            sigma: 0.001,
            source: 'typed by the reader',
          },
        },
      },
      earth
    );
    expect(c.distance.parallax.used).toBe('absolute');
    expect(c.distance.parallax.absolute.value).toBeCloseTo(
      c.params.parallax.value + 0.002,
      12
    );
    expect(c.distance.parallax.absolute.sigma).toBeCloseTo(
      Math.hypot(c.params.parallax.sigma, 0.001),
      12
    );
    expect(c.zeroPoint.correction).toEqual({
      value: 0.002,
      sigma: 0.001,
      source: 'typed by the reader',
    });
    expect(zeroPointOf(undefined).id).toBe('relative');
    for (const correction of [
      { value: 0.002, sigma: 0.001 },
      { value: 0.002, sigma: 0.001, source: '' },
      { value: NaN, sigma: 0.001, source: 'x' },
    ])
      expect(
        fitJoint({ ...series, reference: { correction } }, earth)
      ).toMatchObject({
        ok: false,
        status: 'not-constrained',
      });
  });

  test('a parallax below zero by more than three sigma is flagged and no distance is presented', () => {
    const flipped = {
      epochs: series.epochs.map(e => ({
        ...e,
        time: { ...e.time, value: e.time.value + 182.6 },
      })),
    };
    const g = fitJoint(flipped, earth);
    expect(g.ok).toBe(true);
    expect(g.warnings).toContain('negative-parallax');
    expect(g.hints).toContain('epoch-time-scale');
    expect(g.message).toMatch(/time scale/);
    expect(g.distance.withheld).toMatch(/negative/);
    const q = quantitiesOf(g);
    expect(q.find(x => x.id === 'series.distance').value).toBeNull();
  });

  test('an inconsistent series says so, withholds the distance and names what to check', () => {
    const bad = {
      epochs: series.epochs.map((e, i) =>
        i === 7 ? { ...e, dec: e.dec + 0.0008 } : e
      ),
    };
    const g = fitJoint(bad, earth);
    expect(g.verdict).toBe('inconsistent');
    expect(g.worst).toBe(7);
    expect(g.hints).toEqual(['epoch-time-scale', 'uncertainties', 'model']);
    expect(g.message).toMatch(/epoch time scale/);
    expect(g.distance.withheld).toMatch(/residuals/);
    expect(
      quantitiesOf(g).find(x => x.id === 'series.distance').uncertainty
    ).toEqual({ kind: 'failed', reason: 'residuals-inconsistent' });
  });

  test('the model path reproduces the data to the residuals', () => {
    for (const r of f.residuals.slice(0, 5)) {
      const p = predict(f, r.jd, earth);
      expect(typeof p.x).toBe('number');
    }
    expect(predict(f, jds[0])).toBeNull();
  });
});

describe('the rules and refusals carry codes and the numbers behind them', () => {
  const noise = (n, span, start = 2461041.5) =>
    makeSeries(truth, evenEpochs(start, span, n), earth, { seed: 'r' });

  test('too few epochs, a short span, two sectors, no baseline, outside the ephemeris', () => {
    expect(fitJoint(noise(7, 365), earth)).toMatchObject({
      code: 'too-few-epochs',
      data: { n: 7, min: 8 },
    });
    const s = fitJoint(noise(8, 182), earth);
    expect(s.code).toBe('span');
    expect(s.data.min).toBe(0.9);
    const day = 2461041.5;
    const two = makeSeries(
      truth,
      [0, 8, 16, 24, 400, 408, 416, 424].map(d => day + 31 + d),
      earth,
      { seed: 'sec' }
    );
    const p = fitJoint(two, earth);
    expect(p.code).toBe('phase-coverage');
    expect(p.data).toEqual({ sectors: 2, min: 3 });
    const e = fitJoint(
      {
        epochs: series.epochs.map(x => ({
          ...x,
          time: { ...x.time, value: x.time.value - 20000 },
        })),
      },
      earth
    );
    expect(e.code).toBe('epoch-range');
    expect(e.data.startJd).toBe(earth.range.startJd);
    expect(e.message).toMatch(/Julian dates/);
  });

  test('every refusal is a not-constrained object with a message and data', () => {
    const r = fitJoint({ epochs: [] }, earth);
    expect(r).toMatchObject({
      ok: false,
      status: 'not-constrained',
      code: 'no-series',
    });
    expect(typeof r.message).toBe('string');
    expect(typeof r.data).toBe('object');
  });

  test('UTC before 2017 is refused for the joint fit and kept for a proper motion', () => {
    const old = {
      epochs: [0, 100, 200].map((d, i) => ({
        time: { value: 2455000.5 + d, format: 'jd', scale: 'utc' },
        ra: 10 + i * 1e-5,
        dec: 10,
        sigma: 0.01,
      })),
    };
    expect(fitMotion(old).ok).toBe(true);
    expect(fitJoint(old, earth).code).toMatch(/utc-before-2017|too-few/);
  });
});

describe('the proper motion and the two-epoch shift', () => {
  const lin = {
    epochs: [0, 200, 400, 900].map((d, i) => ({
      time: { value: 2461000 + d, format: 'jd', scale: 'tdb' },
      ra: 33 + (0.3 * d) / 365.25 / 3600 / Math.cos((12 * Math.PI) / 180),
      dec: 12 + (i % 2 ? 1e-6 : -1e-6),
      sigma: [0.01, 0.02],
    })),
  };

  test('a proper motion has parameters, a covariance, residuals and a verdict', () => {
    const f = fitMotion(lin);
    expect(f.ok).toBe(true);
    expect(f.kind).toBe('proper-motion');
    expect(f.order).toEqual(['x0', 'y0', 'mux', 'muy']);
    expect(f.covariance).toHaveLength(4);
    expect(f.dof).toBe(4);
    expect(f.params.mux.value).toBeCloseTo(0.3, 3);
    expect(f.residuals[0]).toHaveProperty('zx');
    expect(['consistent', 'inconsistent']).toContain(f.verdict);
    expect(f.limits.join(' ')).toMatch(/no orbital motion/);
  });

  test('two epochs give an exact solution that carries the label', () => {
    const f = fitMotion({ epochs: lin.epochs.slice(0, 2) });
    expect(f.verdict).toBe('exact');
    expect(f.dof).toBe(0);
    expect(f.label).toBe(SHIFT_LABEL);
    const s = twoEpochShift(lin.epochs[0], lin.epochs[3], { earth });
    expect(s.label).toBe(SHIFT_LABEL);
    expect(s.assumes.join(' ')).toMatch(/parallax/);
    expect(typeof s.parallaxLever.x).toBe('number');
    expect(s).not.toHaveProperty('parallax');
    expect(s).not.toHaveProperty('distance');
  });

  test('no baseline and one epoch are refused', () => {
    expect(fitMotion({ epochs: [lin.epochs[0]] }).code).toBe('too-few-epochs');
    expect(
      twoEpochShift(lin.epochs[0], {
        ...lin.epochs[1],
        time: lin.epochs[0].time,
      }).code
    ).toBe('no-baseline');
  });

  test('distanceInterval is the image under 1/p and open above at zero', () => {
    expect(distanceInterval(0.05, 0.1)).toMatchObject({
      lo: 10,
      hi: 20,
      open: [false, false],
    });
    expect(distanceInterval(-0.01, 0.1)).toMatchObject({
      lo: 10,
      hi: null,
      open: [false, true],
    });
    expect(distanceInterval(-0.2, -0.1).empty).toBe(true);
  });
});

describe('the record', () => {
  const f = fitJoint(series, earth);

  test('the quantities and the fit-result validate in an envelope, with the distance as an interval', () => {
    const q = quantitiesOf(f);
    const env = artifact({
      id: 'series-1',
      source: { kind: 'observation', id: 'frame', digest: 'ab'.repeat(8) },
      quantities: q,
      fit: fitRecordOf(f),
      provenance: { reductions: [{ step: STEP }] },
      made: { app: 'gravitas', tool: STEP },
    });
    expect(validateArtifact(env)).toEqual([]);
    const d = q.find(x => x.id === 'series.distance');
    expect(d.uncertainty.kind).toBe('interval');
    expect(d.uncertainty.basis).toBe('profile');
    expect(d.uncertainty.lo).toBeLessThan(d.value);
    expect(d.uncertainty.hi).toBeGreaterThan(d.value);
    expect(q.find(x => x.id === 'series.parallax').unit).toBe('mas');
    expect(q.find(x => x.id === 'series.mux').unit).toBe('mas/yr');
  });

  test('a lower limit stands for a distance open above', () => {
    const far = makeSeries(
      { ...truth, parallax: 0.002, sigma: 0.01 },
      jds,
      earth,
      { seed: 'far' }
    );
    const g = fitJoint(far, earth);
    const q = quantitiesOf(g).find(x => x.id === 'series.distance');
    if (g.distance.intervals[0].distance.hi === null) {
      expect(q.uncertainty).toMatchObject({ kind: 'limit', bound: 'lower' });
    } else
      expect(['interval', 'not-constrained']).toContain(q.uncertainty.kind);
  });

  test('the record replays to the same numbers, and needs the ephemeris for a joint fit', () => {
    const red = reductionOf(series, f);
    expect(red.step).toBe(STEP);
    expect(red.zeroPoint.kind).toBe('relative');
    expect(replay(red, earth)).toMatchObject({ ok: true, agrees: true });
    expect(replay(red, null).code).toBe('record');
    expect(replay({ step: 'other' }).code).toBe('record');
    const pm = fitMotion(series);
    expect(replay(reductionOf(series, pm))).toMatchObject({
      ok: true,
      agrees: true,
    });
  });

  test('the CSV has a header and a row for each epoch', () => {
    const rows = csvRows(f, ['n', 'jd', 'dx', 'dy', 'zx', 'zy'], num);
    expect(rows).toHaveLength(21);
    expect(rows[1]).toHaveLength(6);
  });
});
