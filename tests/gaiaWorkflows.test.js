// =============================================================================
// Gaia parallax workflows and sample selection (Roadmap III, Prompt 233)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/gaia-workflows/thresholds.json, fixed
// before js/kernels/galactic/astrometry.js existed. The quick legs (the closed forms,
// the independent oracle, the refusals, the zero point against its second
// implementation, the packs' alignment) run live through tools/gaia-validate.mjs in a
// child process. The ensemble legs (coverage, the large Monte Carlo ones) take several
// seconds each, so their table is pinned in tests/fixtures/gaia-workflows/results.json by
// `npm run gaia:validate -- --write-results` and held here against failed-legs.json. The
// other tests hold the kernel's public contract.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
import * as Base from '../js/kernels/galactic/index.js';
import * as Gaia from '../js/kernels/galactic/gaia.js';

const K = { ...Base, ...Gaia };
import { PACK as NGC } from '../js/data/observations/gaiaNgc2420.js';
import { PACK as SOLAR } from '../js/data/observations/gaiaSolarNeighbourhood.js';
import { tableOf } from '../js/tableObservation.js';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/gaia-workflows/thresholds.json');
const RESULTS = read('tests/fixtures/gaia-workflows/results.json');
const FAILED = read('tests/fixtures/gaia-workflows/failed-legs.json');

const resultOf = id => RESULTS.rows.find(r => r.id === id);

describe('the committed legs and their results', () => {
  test('every committed check has a row, and no row is an uncommitted check', () => {
    const committed = THR.checks.map(c => c.id).sort();
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(committed);
  });
  test('the failed-legs file is exactly the failing rows, and it is empty only if nothing failed', () => {
    const failing = RESULTS.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id)
      .sort();
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(failing);
  });
  test('only the legs the thresholds call reported, and the one that could not be run, are not judged', () => {
    const notJudged = RESULTS.rows.filter(
      r => r.status !== 'pass' && r.status !== 'fail'
    );
    expect(notJudged.map(r => `${r.id}:${r.status}`).sort()).toEqual([
      'C4.coveragePriorWrong:reported',
      'C5.zeroPointUnmodelled:reported',
      'E1.ngc2420:not-run',
      'E3.neighbourhoodRounding:reported',
    ]);
  });
  test('NGC 2420 is NOT RUN against its committed contract, with the measured distance beside the sources that exist', () => {
    const e1 = resultOf('E1.ngc2420');
    expect(e1.status).toBe('not-run');
    expect(e1.note).toMatch(/no DR3-catalogue distance/);
    expect(Object.keys(e1.measured.sources)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
    ]);
    expect(e1.measured.measured.distanceKpc).toBeGreaterThan(0);
  });
  test('the zero-point leg says it is not a comparison with the authors’ package', () => {
    expect(resultOf('B2.zeroPointOracle').note).toMatch(
      /NOT the authors' package/
    );
  });
  test('the quick legs hold their bounds when run now', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/gaia-validate.mjs', '--only=A2,A3,A4,A5,B1,B2,D,S3,E2', '--json'],
      {
        cwd: new URL('..', import.meta.url).pathname,
        encoding: 'utf8',
        maxBuffer: 1 << 24,
      }
    );
    const rows = JSON.parse(out);
    expect(rows.map(r => r.id).sort()).toEqual([
      'A2.edsdMode',
      'A3.likelihoodInterval',
      'A4.zeroPointAlgebra',
      'A5.tangentialVelocityLinear',
      'B1.oracleTenStars',
      'B2.zeroPointOracle',
      'D1.negativeParallax',
      'D2.statusLadder',
      'D3.priorDominated',
      'D4.refusals',
      'D5.noBlanketCorrection',
      'E2.packAlignment',
      'S3.removedBookkeeping',
    ]);
    for (const r of rows) expect([r.id, r.status]).toEqual([r.id, 'pass']);
  }, 60000);
});

describe('the distance kernel', () => {
  test('a high-signal parallax is a distance with a closed interval and its assumptions named', () => {
    const r = K.distanceFromParallax({ parallax: 2, error: 0.02 });
    expect(r.status).toBe('ok');
    expect(r.distance).toBeCloseTo(0.5, 12);
    expect(r.interval.lo).toBeLessThan(0.5);
    expect(r.interval.hi).toBeGreaterThan(0.5);
    expect(r.assumes.length).toBeGreaterThan(0);
    expect(r.correction).toMatch(/^none/);
  });
  test('a negative parallax has a likelihood and no distance, and so no velocity', () => {
    const r = K.distanceFromParallax({
      parallax: -0.2,
      error: 0.05,
      curve: 50,
    });
    expect(r.distance).toBeNull();
    expect(r.status).toBe('likelihood-only');
    expect(r.curve.relative).toHaveLength(50);
    const v = K.tangentialVelocity({
      pmra: 1,
      pmdec: 1,
      pmraError: 0.1,
      pmdecError: 0.1,
      parallax: -0.2,
      error: 0.05,
      draws: 200,
      seed: 7,
    });
    expect(v.status).toBe('no-distance');
    expect(v.value).toBeNull();
  });
  test('the zero point is subtracted and its error joins the total error, once', () => {
    const r = K.distanceFromParallax({
      parallax: 0.5,
      error: 0.03,
      zeroPoint: { value: -0.02, sigma: 0.04 },
    });
    expect(r.parallax.corrected).toBeCloseTo(0.52, 12);
    expect(r.parallax.totalError).toBeCloseTo(0.05, 12);
    expect(r.distance).toBeCloseTo(1 / 0.52, 12);
  });
  test('a prior is named, cited and labelled; the same star without one is the likelihood', () => {
    const plain = K.distanceFromParallax({ parallax: 0.4, error: 0.1 });
    const withPrior = K.distanceFromParallax({
      parallax: 0.4,
      error: 0.1,
      prior: { name: 'edsd', L: 1.35 },
    });
    expect(plain.posterior).toBeNull();
    expect(withPrior.priorCite).toMatch(/Bailer-Jones/);
    expect(withPrior.status).toBe('prior-dominated');
    expect(withPrior.distance).not.toBeCloseTo(plain.distance, 3);
  });
  test('a clipped cluster mean keeps the systematic once, and refuses an empty cluster', () => {
    const stars = [0.4, 0.41, 0.39, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.8].map(
      p => ({
        parallax: p,
        error: 0.02,
      })
    );
    const c = K.clusterParallax({ stars, systematic: 0.01, clipSigma: 3 });
    expect(c.clipped).toBe(1);
    expect(c.error).toBeGreaterThan(c.statError);
    expect(K.clusterParallax({ stars: [] }).status).toBe('refused');
  });
  test('the draws are a named stream: the same seed repeats, another seed differs', () => {
    const a = {
      pmra: 3,
      pmdec: -4,
      pmraError: 0.1,
      pmdecError: 0.1,
      parallax: 1,
      error: 0.05,
      draws: 500,
    };
    const x = K.tangentialVelocity({ ...a, seed: 5 });
    const y = K.tangentialVelocity({ ...a, seed: 5 });
    const z = K.tangentialVelocity({ ...a, seed: 6 });
    expect(x.value).toBe(y.value);
    expect(x.value).not.toBe(z.value);
    expect(x.stream.id).toBe('noise');
  });
  test('the distance as an envelope quantity: an interval, or a lower limit where the far end is open', () => {
    const q = K.distanceQuantity(
      K.distanceFromParallax({ parallax: 2, error: 0.02 })
    );
    expect(q.uncertainty.kind).toBe('interval');
    const open = K.distanceQuantity(
      K.distanceFromParallax({ parallax: 0.1, error: 0.1 })
    );
    expect(open.uncertainty).toEqual({ kind: 'limit', bound: 'lower' });
    expect(
      K.distanceQuantity(K.distanceFromParallax({ parallax: -1, error: 0.1 }))
        .value
    ).toBeNull();
  });
});

describe('the zero point', () => {
  test('it refuses a two-parameter solution and a colour that is missing', () => {
    expect(
      K.parallaxZeroPoint({ g: 15, nuEff: 1.5, eclLat: 0, params: 3 }).status
    ).toBe('refused');
    expect(
      K.parallaxZeroPoint({ g: 15, nuEff: null, eclLat: 0, params: 31 }).status
    ).toBe('refused');
  });
  test('it flags a star outside the range the fit covers and says why', () => {
    const z = K.parallaxZeroPoint({
      g: 15,
      nuEff: 1.95,
      eclLat: 10,
      params: 31,
    });
    expect(z.inRange).toBe(false);
    expect(z.reason).toMatch(/effective wavenumber/);
    expect(
      K.parallaxZeroPoint({ g: 15, nuEff: 1.5, eclLat: 10, params: 31 }).inRange
    ).toBe(true);
  });
  test('it states that its remaining systematic error is unknown to this build, and where its numbers come from', () => {
    expect(K.ZERO_POINT_SOURCE.sigma).toBeNull();
    expect(K.ZERO_POINT_SOURCE.tables.z5.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(K.ZERO_POINT_SOURCE.implementation).toMatch(/not the authors/);
  });
});

describe('what a sample’s cuts remove', () => {
  const rows = [
    { g: 10, poe: 50, ruwe: 1, rv: 3 },
    { g: 14, poe: 4, ruwe: 1, rv: NaN },
    { g: 16, poe: 20, ruwe: 2, rv: 1 },
    { g: 18, poe: 2, ruwe: 1, rv: NaN },
  ];
  test('each cut is a statistics-kernel selection and the counts are what the cut removes', () => {
    const r = K.applyCuts(
      rows,
      K.cutSelections({ magnitude: 15, parallaxOverError: 5 })
    );
    expect(r.alone.map(a => a.removed)).toEqual([2, 2]);
    expect(r.steps.map(s => s.removed)).toEqual([2, 1]);
    expect(r.kept).toBe(1);
    expect(
      K.applyCuts(rows, K.cutSelections({ radialVelocity: true })).kept
    ).toBe(2);
    expect(K.applyCuts(rows, []).kept).toBe(4);
  });
});

describe('the packs', () => {
  test('both Gaia packs carry the added columns, and their rows decode', () => {
    for (const [pack, file, n] of [
      [NGC, 'gaia/ngc2420.json', 993],
      [SOLAR, 'gaia/solar-neighbourhood.json', 1570],
    ]) {
      const t = tableOf({ PACK: pack, SERIES: read(file) });
      expect(t.n).toBe(n);
      const ids = t.columns.map(c => c.id);
      for (const id of [
        'plx_pmra_corr',
        'plx_pmdec_corr',
        'pm_corr',
        'ruwe',
        'params',
        'nu_eff',
        'pseudocolour',
        'ecl_lat',
      ])
        expect(ids).toContain(id);
      expect(pack.version).toBe('1.1.0');
      expect(pack.license.nonCommercial).toBe(true);
      expect(pack.license.status).toBe('cc-by-nc-3.0-igo');
    }
  });
  test('the neighbourhood pack says it is not used for a distance', () => {
    expect(SOLAR.reductions.join(' ')).toMatch(/not used for a distance/);
  });
});
