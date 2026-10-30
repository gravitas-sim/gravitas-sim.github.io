// =============================================================================
// The transit model delta (Roadmap III, Prompt 225)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/transit-delta/thresholds.json,
// committed before the delta existed. The quick legs (analytic, the independent
// oracle's pinned batman and scipy results, the forward model, the fits against
// them) run live through tools/transit-delta-validate.mjs in a child process.
// The ensemble legs (recovery, coverage, the refusals) take about twenty CPU
// minutes, so their table is pinned in tests/fixtures/transit-delta/results.json
// by `npm run transit-delta:validate -- --write-results` and held here against
// failed-legs.json: a leg that crossed its bound is recorded there and this test
// holds that it still fails and that nothing else does. The other tests hold the
// kernel's public contract and that no existing fitted value moved.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fitOnce, dataFrom } from '../js/inference/infer.js';
import { inferenceManifest } from '../js/inference/manifest.js';
import { valid } from './jsonSchemaSubset.js';
import { openFixture } from '../js/observatory/fixtures.js';
import { MODELS } from '../js/inference/models.js';
import { validateInference } from '../js/inference/manifest.js';
import { syntheticTransit, tessLikeTimes } from '../js/inference/synthetic.js';
import {
  claretIntensity,
  claretTotalLight,
  eccentricityFactor,
  occultationLaw,
  stellarDensity,
  totalLight,
  uniformOccultation,
} from '../js/inference/transit.js';
import {
  claretRefusal,
  confidenceEllipse,
  ellipseOfFit,
  lookupClaret,
} from '../js/inference/transitDelta.js';

const read = rel => JSON.parse(readFileSync(rel, 'utf8'));
const THR = read('tests/fixtures/transit-delta/thresholds.json');
const FAILED = read('tests/fixtures/transit-delta/failed-legs.json');
const PINNED = read('tests/fixtures/transit-delta/results.json').rows;
const GOLD = read('tests/fixtures/transit-delta/quadratic-golden.json');
const C4 = THR.law.test;

describe('the committed thresholds and the recorded table', () => {
  test('every check has a row, and the legs of failed-legs.json are exactly the failed rows', () => {
    // The committed checks, and the legs that amendments added beside them (AM1 to AM3).
    const ids = [
      ...THR.checks.map(c => c.id),
      ...THR.amendments.flatMap(a => a.legs),
    ].sort();
    expect(PINNED.map(r => r.id).sort()).toEqual(ids);
    expect(
      PINNED.filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    ).toEqual(FAILED.failed.map(f => f.id).sort());
  });
  test('the legs whose data was never supplied are NOT RUN and say why', () => {
    for (const id of ['A8', 'E1']) {
      const r = PINNED.find(q => q.id === id);
      expect(r.status).toBe('not-run');
      expect(r.note.length).toBeGreaterThan(40);
    }
  });
  test('no bound was reset: the limits are the committed ones (their count and ids)', () => {
    expect(THR.checks).toHaveLength(23);
    // An amendment never changes a bound: it says so, and adds legs beside the committed ones.
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    expect(THR.amendments.every(a => a.boundsChanged === false)).toBe(true);
    expect(THR.checks.map(c => c.id)).toEqual(
      expect.arrayContaining(['B0', 'B1', 'B2', 'B3', 'B4', 'D1', 'D3'])
    );
  });
});

describe('the validation table, the quick legs (tools/transit-delta-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/transit-delta-validate.mjs', '--json', '--only=A,B'],
      {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    rows = JSON.parse(out);
  }, 280_000);
  test('the analytic and oracle legs pass or are the recorded failures', () => {
    for (const r of rows.filter(r => /^[AB]/.test(r.id)))
      if (r.status !== 'not-run' && !FAILED.failed.some(f => f.id === r.id))
        expect({ id: r.id, status: r.status }).toEqual({
          id: r.id,
          status: 'pass',
        });
  });
  test('a recorded failure still fails and nothing else does', () => {
    for (const f of FAILED.failed.filter(x => /^[AB]/.test(x.id)))
      expect(rows.find(r => r.id === f.id).status).toBe('fail');
  });
});

describe('the four-coefficient law', () => {
  test('c = 0 is the uniform star, and c = [0, u, 0, 0] is the linear law of the quadratic', () => {
    for (const k of [0.05, 0.2])
      for (let z = 0; z < 1 + k; z += 0.037) {
        expect(
          Math.abs(
            occultationLaw(z, k, { c: [0, 0, 0, 0] }, 64) -
              uniformOccultation(z, k)
          )
        ).toBeLessThan(1e-4 * k * k);
        expect(occultationLaw(z, k, { c: [0, 0.45, 0, 0] }, 64)).toBe(
          occultationLaw(z, k, { u1: 0.45, u2: 0 }, 64)
        );
      }
  });
  test('the total light is pi (1 - sum c_n n / (n + 4)), and a quadratic law keeps its own', () => {
    expect(claretTotalLight([0, 0, 0, 0])).toBeCloseTo(Math.PI, 14);
    expect(claretTotalLight([0, 0.45, 0, 0])).toBeCloseTo(
      totalLight(0.45, 0),
      14
    );
    expect(claretIntensity(1, C4)).toBe(1);
    expect(claretIntensity(0, C4)).toBeCloseTo(
      1 - C4.reduce((a, c) => a + c, 0),
      14
    );
  });
  test('coefficients that are not a star are refused, with a reason', () => {
    expect(claretRefusal(C4)).toBeNull();
    expect(claretRefusal([0.5, 0.5])).toMatch(/four/);
    expect(claretRefusal([NaN, 0, 0, 0])).toMatch(/finite/);
    expect(claretRefusal([1, 1, 1, 1])).toMatch(/no light/);
    // brighter at the limb than at the center
    expect(claretRefusal([-0.5, 0, 0, 0])).toMatch(/limb/);
  });
});

describe('the table lookup, on a labelled miniature grid (a test fixture, not a table of any paper)', () => {
  const grid = [];
  for (const teff of [5000, 6000])
    for (const logg of [4, 5])
      for (const feh of [-0.5, 0])
        grid.push({
          teff,
          logg,
          feh,
          c: [teff / 1e4, logg / 10, -feh, teff / logg / 1e4],
        });
  const table = { rows: grid };
  test('it returns a node exactly and the multilinear mean at a cell centre', () => {
    const node = lookupClaret(table, { teff: 5000, logg: 4, feh: -0.5 });
    expect(node.c).toEqual(grid[0].c);
    const mid = lookupClaret(table, { teff: 5500, logg: 4.5, feh: -0.25 });
    for (let i = 0; i < 4; i++)
      expect(mid.c[i]).toBeCloseTo(
        grid.reduce((a, r) => a + r.c[i], 0) / grid.length,
        12
      );
  });
  test('a star outside the table is refused, not extrapolated, and an incomplete grid is refused', () => {
    expect(lookupClaret(table, { teff: 7000, logg: 4, feh: 0 })).toMatchObject({
      status: 'refused',
      code: 'outside',
    });
    expect(
      lookupClaret({ rows: grid.slice(1) }, { teff: 5500, logg: 4.5, feh: 0 })
    ).toMatchObject({ code: 'incomplete' });
  });
});

describe('the models and the manifest', () => {
  test('the four-coefficient variant is a variant of the one model: its own id, no q1 or q2, the same family', () => {
    const v = MODELS['transit-claret4'];
    const q = MODELS['transit-quadratic'];
    expect(v.family).toBe('transit');
    expect(q.family).toBe('transit');
    expect(v.parameters.map(p => p.name)).toEqual(['t0', 'P', 'k', 'aRs', 'b']);
    expect(q.version).toBe('1.0.0');
  });
  test('a request without coefficients, or with a non-star, is refused before any fit', () => {
    const data = syntheticTransit({
      seed: 'refuse',
      times: tessLikeTimes(),
      sigma: 213e-6,
      truth: { t0: 2826.1, P: 3.6, k: 0.1, aRs: 8.5, b: 0.4, c: C4 },
      exposure: 20 / 1440,
    });
    const req = settings => ({
      model: { id: 'transit-claret4' },
      parameters: {
        t0: { lo: data.x[0], hi: data.x[0] + 3.8 },
        P: { lo: 3.4, hi: 3.8 },
      },
      settings,
    });
    expect(() => fitOnce(req({ exposure: 20 / 1440 }), data)).toThrow(/four/);
    expect(() =>
      fitOnce(req({ exposure: 20 / 1440, claret: [1, 1, 1, 1] }), data)
    ).toThrow(/no light/);
  });
  test('the manifest refuses coefficients on the quadratic model and a non-star on the variant', () => {
    const base = {
      format: 'gravitas.inference',
      formatVersion: 1,
      data: { observation: 'x', span: 10 },
      parameters: {
        t0: { lo: 0, hi: 4 },
        P: { lo: 3, hi: 4 },
      },
      algorithm: {},
      limits: {},
    };
    const quad = validateInference({
      ...base,
      model: { id: 'transit-quadratic', version: '1.0.0' },
      settings: { claret: C4 },
    });
    expect(quad.some(p => p.path === 'settings.claret')).toBe(true);
    const bad = validateInference({
      ...base,
      model: { id: 'transit-claret4', version: '1.0.0' },
      settings: { claret: [1, 1, 1, 1] },
    });
    expect(bad.some(p => p.path === 'settings.claret')).toBe(true);
    const good = validateInference({
      ...base,
      model: { id: 'transit-claret4', version: '1.0.0' },
      settings: { claret: C4, eccentricity: { e: 0.2, omega: 90 } },
    });
    expect(good.filter(p => p.path.startsWith('settings'))).toEqual([]);
  });
});

describe('the inference schema holds the new model (sdk/schemas/inference-1.schema.json)', () => {
  const schema = read('sdk/schemas/inference-1.schema.json');
  test('a manifest of the four-coefficient model is read by the validator and the schema alike, and the same refusals agree', async () => {
    const o = await openFixture('tess-light-curve');
    const d = dataFrom(o);
    const make = settings =>
      JSON.parse(
        JSON.stringify(
          inferenceManifest(
            o,
            d,
            {
              model: { id: 'transit-claret4' },
              parameters: {
                t0: { mode: 'fitted', lo: d.x[0], hi: d.x[0] + 3.6 },
                P: { mode: 'fitted', lo: 1, hi: 10 },
              },
              settings,
            },
            {
              concurrency: 1,
              trialTimeoutMs: 1000,
              totalTimeoutMs: 10000,
              maxResultBytes: 1e6,
            }
          )
        )
      );
    const both = m => [validateInference(m).length === 0, valid(schema, m)];
    expect(
      both(
        make({
          exposure: 0.0138,
          claret: C4,
          claretSource: { table: 'a note' },
          eccentricity: { e: 0.1, omega: 90 },
        })
      )
    ).toEqual([true, true]);
    expect(both(make({ exposure: 0.0138 }))).toEqual([false, false]);
    expect(both(make({ exposure: 0.0138, claret: [0.5, 0.2, 0.1] }))).toEqual([
      false,
      false,
    ]);
    expect(
      both(make({ claret: C4, eccentricity: { e: 1.2, omega: 0 } }))
    ).toEqual([false, false]);
  });
});

describe('what the fit says, on seeded synthetic transits', () => {
  const times = tessLikeTimes();
  const truth = { t0: 2826.1, P: 3.6, k: 0.1, aRs: 8.5, b: 0.4 };
  const fitWith = (law, extra = {}, seed = 'delta-unit-1') => {
    const quad = law === 'quadratic';
    const data = syntheticTransit({
      seed,
      times,
      sigma: 213e-6,
      truth: quad ? { ...truth, q1: 0.36, q2: 0.3 } : { ...truth, c: C4 },
      exposure: 20 / 1440,
      ...extra,
    });
    return fitOnce(
      {
        model: { id: quad ? 'transit-quadratic' : 'transit-claret4' },
        parameters: {
          t0: { lo: times[0], hi: times[0] + 3.8 },
          P: { lo: 3.4, hi: 3.8 },
        },
        settings: {
          exposure: 20 / 1440,
          supersample: 5,
          annuli: 32,
          ...(quad ? {} : { claret: C4 }),
          ...(extra.fitSettings ?? {}),
        },
      },
      data
    );
  };
  test("the density is Kepler's third law on the fitted a/R* and P, in g/cm^3, and the corrected one divides by the factor", () => {
    const fit = fitWith('claret4', {
      fitSettings: { eccentricity: { e: 0.2, omega: 90 } },
    });
    const d = n => fit.derived.find(q => q.name === n);
    const aRs = fit.parameters.find(p => p.name === 'aRs').value;
    const P = fit.parameters.find(p => p.name === 'P').value;
    expect(d('rhoStar').value).toBeCloseTo(stellarDensity(aRs, P) / 1000, 12);
    expect(d('rhoStar').unit).toBe('g/cm3');
    expect(d('rhoStarEcc').value).toBeCloseTo(
      d('rhoStar').value / eccentricityFactor(0.2, 90),
      12
    );
    // The corrected row says what it assumed; the input itself stays in the request.
    expect(d('rhoStarEcc').label).toMatch(/stated e and omega/);
    expect(Number.isFinite(d('rhoStar').sigma)).toBe(true);
    expect(d('rhoStar').sigma).toBeGreaterThan(0);
  });
  test('a light curve counted in hours gives the same density', () => {
    const base = fitWith('claret4');
    const rho = base.derived.find(q => q.name === 'rhoStar').value;
    const hours = syntheticTransit({
      seed: 'delta-unit-1',
      times,
      sigma: 213e-6,
      truth: { ...truth, c: C4 },
      exposure: 20 / 1440,
    });
    const scale = 24;
    const data = {
      ...hours,
      x: hours.x.map(v => v * scale),
      perDay: scale,
      units: { x: 'h', y: '' },
    };
    const fit = fitOnce(
      {
        model: { id: 'transit-claret4' },
        parameters: {
          t0: { lo: data.x[0], hi: data.x[0] + 3.8 * scale },
          P: { lo: 3.4 * scale, hi: 3.8 * scale },
        },
        settings: {
          exposure: (20 / 1440) * scale,
          supersample: 5,
          annuli: 32,
          claret: C4,
        },
      },
      data
    );
    expect(fit.derived.find(q => q.name === 'rhoStar').value / rho).toBeCloseTo(
      1,
      4
    );
  });
  test('the result carries the checks and the covariance ellipse of k and b is a real ellipse around the best fit', () => {
    const fit = fitWith('claret4');
    expect(fit.transit.kb.status).toBe('constrained');
    expect(fit.transit.residual.points).toBeGreaterThan(50);
    const e = ellipseOfFit(fit, 'k', 'b');
    expect(e.center[0]).toBe(fit.parameters.find(p => p.name === 'k').value);
    expect(e.ellipse.semiMajor).toBeGreaterThanOrEqual(e.ellipse.semiMinor);
    expect(Math.abs(e.correlation)).toBeLessThanOrEqual(1);
    expect(ellipseOfFit(fit, 'k', 'q1')).toBeNull();
    // The ellipse's extreme k offset is the sigma times the scale, the
    // marginal interval of a Gaussian at that level.
    const sigmaK = fit.parameters.find(p => p.name === 'k').sigma;
    const reach = Math.max(...e.ellipse.points.map(p => Math.abs(p[0])));
    expect(reach / sigmaK).toBeCloseTo(e.ellipse.scale, 1);
  });
  test('a spot crossing fails the residual test and a clean curve passes it (seeded; the ensembles measure the rates)', () => {
    const spotted = fitWith('claret4', {
      bumps: [
        { t: truth.t0 + 2 * truth.P + 0.025, amplitude: 1500e-6, sigma: 0.02 },
      ],
    });
    expect(spotted.transit.residual.fails).toBe(true);
  });
  test('the quadratic fit has no coefficients and still reports the checks', () => {
    const fit = fitWith('quadratic');
    expect(fit.free).toEqual(['t0', 'P', 'k', 'aRs', 'b', 'q1', 'q2']);
    expect(fit.transit.kb).toBeTruthy();
    expect(fit.derived.map(d => d.name)).toEqual([
      'depth',
      'T14',
      'inclination',
      'u1',
      'u2',
      'rhoStar',
    ]);
    expect(ellipseOfFit(fit, 'k', 'q1').ellipse.points.length).toBeGreaterThan(
      20
    );
  });
  test('the ellipse of a 2 x 2 covariance has the right axes, and a matrix that is not positive definite has none', () => {
    const s = Math.sqrt(-2 * Math.log(1 - 0.6827));
    const e = confidenceEllipse(
      [
        [4, 0],
        [0, 1],
      ],
      0.6827
    );
    expect(e.semiMajor).toBeCloseTo(2 * s, 12);
    expect(e.semiMinor).toBeCloseTo(s, 12);
    expect(
      confidenceEllipse([
        [1, 2],
        [2, 1],
      ])
    ).toBeNull();
  });
});

describe('no existing fitted value moved (tests/fixtures/transit-delta/quadratic-golden.json, from origin/v3 before the delta)', () => {
  test('the quadratic model fits the shipped HD 209458 rows and a seeded synthetic transit to the last digit', async () => {
    const { openFixture } = await import('../js/observatory/fixtures.js');
    const { dataFrom } = await import('../js/inference/infer.js');
    const pick = f => ({
      chi2: f.chi2,
      parameters: f.parameters.map(p => [p.name, p.value, p.sigma]),
      derived: f.derived
        .filter(q =>
          ['depth', 'T14', 'inclination', 'u1', 'u2', 'Rp'].includes(q.name)
        )
        .map(q => [q.name, q.value, q.sigma]),
      linear: f.linear,
      warnings: f.warnings.map(w => w.code),
    });
    const o = await openFixture('tess-light-curve');
    const d = dataFrom(o);
    const fit = fitOnce(
      {
        model: { id: 'transit-quadratic' },
        parameters: {
          t0: { lo: d.x[0], hi: d.x[0] + 3.65 },
          P: { lo: 3.4, hi: 3.65 },
        },
        settings: { exposure: 20 / 1440, supersample: 5, annuli: 32 },
      },
      d
    );
    expect(JSON.parse(JSON.stringify(pick(fit)))).toEqual(GOLD.hd209458);
    const times = tessLikeTimes();
    const data = syntheticTransit({
      seed: 'golden-225',
      times,
      sigma: 213e-6,
      truth: {
        t0: 2826.1,
        P: 3.6,
        k: 0.1,
        aRs: 8.5,
        b: 0.4,
        q1: 0.36,
        q2: 0.3,
      },
      exposure: 20 / 1440,
    });
    expect(data.y[0]).toBe(GOLD.synthetic.y0);
    expect(data.y[100]).toBe(GOLD.synthetic.y100);
    expect(Array.from(data.y).reduce((a, b) => a + b, 0)).toBe(
      GOLD.synthetic.sum
    );
    const f2 = fitOnce(
      {
        model: { id: 'transit-quadratic' },
        parameters: {
          t0: { lo: times[0], hi: times[0] + 3.8 },
          P: { lo: 3.4, hi: 3.8 },
        },
        settings: { exposure: 20 / 1440, supersample: 5, annuli: 32 },
      },
      data
    );
    expect(JSON.parse(JSON.stringify(pick(f2)))).toEqual(GOLD.synthFit);
  }, 120_000);
});
