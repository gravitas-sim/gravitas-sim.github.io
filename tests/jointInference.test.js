// =============================================================================
// The joint transit and radial-velocity model (Roadmap III, Prompt 227)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/joint-inference/thresholds.json,
// committed before the model existed. The quick analytic legs run live through
// tools/joint-inference-validate.mjs in a child process; the fits and the
// ensemble take minutes, so their table is pinned in
// tests/fixtures/joint-inference/results.json (`npm run joint-inference:validate
// -- --write-results`) and held here against failed-legs.json: a leg that crossed
// its bound is recorded there and this test holds that it still fails and that
// nothing else does. The other tests hold the model's public contract: the
// formulas, the refusals, the manifest and its schema, the panels' numbers and
// that rvMonteCarlo.js's percentile is the statistics kernel's.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { MODELS } from '../js/inference/models.js';
import { fitOnce } from '../js/inference/infer.js';
import { validateInference } from '../js/inference/manifest.js';
import { TRANSIT_RV_JOINT, refusalsFor } from '../js/inference/jointModel.js';
import {
  amplitude,
  bulkDensity,
  circularEquivalent,
  linearPlanet,
  massFromAmplitude,
  planetOf,
  sinInclination,
  stellarInputs,
  systemFromMass,
  trueFromCircular,
} from '../js/inference/jointPlanet.js';
import { percentile } from '../js/inference/rvMonteCarlo.js';
import { percentileInterval } from '../js/kernels/statistics/intervals.js';
import { syntheticJoint } from '../js/inference/synthetic.js';
import { STORED, COVERAGE, planetFrom } from '../js/jointField.js';
import { valid } from './jsonSchemaSubset.js';

const read = rel => JSON.parse(readFileSync(rel, 'utf8'));
const THR = read('tests/fixtures/joint-inference/thresholds.json');
const FAILED = read('tests/fixtures/joint-inference/failed-legs.json');
const PINNED = read('tests/fixtures/joint-inference/results.json').rows;

describe('the committed thresholds and the recorded table', () => {
  test('every check has a row, and the legs of failed-legs.json are exactly the failed rows', () => {
    expect(PINNED.map(r => r.id).sort()).toEqual(
      THR.checks.map(c => c.id).sort()
    );
    expect(
      PINNED.filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    ).toEqual(FAILED.failed.map(f => f.id).sort());
  });
  test('E1 was never supplied data and is NOT RUN and says why', () => {
    const r = PINNED.find(q => q.id === 'E1');
    expect(r.status).toBe('not-run');
    expect(r.note.length).toBeGreaterThan(40);
  });
  test('the amendments are recorded, in order, and say whether a bound moved (only AM3, before any S3 result)', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3', 'AM4']);
    expect(THR.amendments.filter(a => a.boundMoved).map(a => a.id)).toEqual([
      'AM3',
    ]);
    expect(THR.amendments.find(a => a.id === 'AM3').movedBefore).toMatch(
      /any Gravitas result on S3/
    );
  });
  test('the panel quotes the coverage the ensemble measured', () => {
    const rate = id => PINNED.find(r => r.id === id).measured;
    expect(COVERAGE.n).toBe(rate('C2').N);
    expect(COVERAGE.Mp).toBeCloseTo(rate('C1').rate, 9);
    expect(COVERAGE.MpAlone).toBeCloseTo(rate('C1').fitOnly, 9);
    expect(COVERAGE.Rp).toBeCloseTo(rate('C2').rate, 9);
    expect(COVERAGE.rhoP).toBeCloseTo(rate('C3').rate, 9);
    expect(COVERAGE.RpAlone).toBeCloseTo(rate('C4').radiusFitOnly, 9);
    expect(COVERAGE.rhoPAlone).toBeCloseTo(rate('C4').densityFitOnly, 9);
  });
});

describe('the quick legs (tools/joint-inference-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      [
        'tools/joint-inference-validate.mjs',
        '--json',
        '--only=A1,A2,A3,A4,A5,A6,A9',
      ],
      {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    rows = JSON.parse(out);
  }, 120_000);
  test('the analytic legs pass or are the recorded failures', () => {
    expect(rows).toHaveLength(7);
    for (const r of rows)
      if (!FAILED.failed.some(f => f.id === r.id))
        expect({ id: r.id, status: r.status }).toEqual({
          id: r.id,
          status: 'pass',
        });
  });
});

describe('the formulas', () => {
  test('the mass from the amplitude inverts the amplitude of a mass, with the sum of the masses', () => {
    for (const [Mp, P, e, sini, Ms] of [
      [0.7, 3.5247, 0, 0.99, 1.1],
      [8, 2, 0.1, 1, 1.5],
      [0.054, 4.5, 0.3, 0.9, 1],
    ]) {
      const K = amplitude({ Mp, P, e, sini, Ms });
      expect(massFromAmplitude({ K, P, e, sini, Ms })).toBeCloseTo(Mp, 10);
    }
  });
  test('Jupiter around the Sun gives 12.46 m/s and the Earth 9 cm/s', () => {
    expect(amplitude({ Mp: 1, P: 4332.589, Ms: 1 })).toBeCloseTo(12.4591, 3);
    expect(
      amplitude({ Mp: 398600.4418e9 / 1.26686534e17, P: 365.25636, Ms: 1 })
    ).toBeCloseTo(0.08946, 4);
  });
  test('nothing is returned for an impossible input', () => {
    expect(massFromAmplitude({ K: 50, P: 3, e: 1, sini: 1, Ms: 1 })).toBeNaN();
    expect(massFromAmplitude({ K: 50, P: 3, e: 0, sini: 0, Ms: 1 })).toBeNaN();
    expect(massFromAmplitude({ K: 50, P: 3, e: 0, sini: 1, Ms: 0 })).toBeNaN();
    expect(sinInclination(2, 1.5, 0, 1)).toBeNaN();
  });
  test('the circular equivalent and the true a/R* are inverses, and 1 for a circle', () => {
    expect(circularEquivalent(9, 0, 1)).toBe(9);
    const w = 0.7;
    expect(trueFromCircular(circularEquivalent(9, 0.2, w), 0.2, w)).toBeCloseTo(
      9,
      12
    );
  });
  test('a system built from its mass gives that mass back through the fit-side formulas', () => {
    const s = systemFromMass({ P: 3.5247, Mp: 0.7, Ms: 1.1, Rs: 1.15, b: 0.5 });
    const p = planetOf(
      { K: s.K, P: 3.5247, e: 0, w: Math.PI / 2, aRs: s.aRs, b: 0.5, k: 0.12 },
      { Ms: 1.1, Rs: 1.15 }
    );
    expect(p.Mp).toBeCloseTo(0.7, 10);
    expect(p.Rp).toBeCloseTo(0.12 * 1.15 * (695700 / 71492), 10);
    expect(p.rhoP).toBeCloseTo(bulkDensity(0.7, p.Rp), 10);
  });
  test('the linearized planet carries the star: its sigma squared is the fit part plus the star part', () => {
    const star = {
      mass: { value: 1.1, sigma: 0.0495 },
      radius: { value: 1.15, sigma: 0.04025 },
      correlation: 0.5,
    };
    const p = linearPlanet({ ...STORED, star });
    for (const q of [p.Mp, p.Rp, p.rhoP])
      expect(q.sigma ** 2).toBeCloseTo(q.sigmaFit ** 2 + q.sigmaStar ** 2, 12);
    // the radius ratio times the star's radius: its star part is the radius sigma
    expect(p.Rp.sigmaStar / p.Rp.value).toBeCloseTo(0.035, 6);
    const zero = linearPlanet({
      ...STORED,
      star: {
        mass: { value: 1.1, sigma: 0 },
        radius: { value: 1.15, sigma: 0 },
      },
    });
    expect(zero.rhoP.sigmaStar).toBe(0);
    expect(zero.rhoP.sigma).toBeCloseTo(zero.rhoP.sigmaFit, 14);
  });
  test('stellar inputs without a sigma are read as not ok', () => {
    const s = stellarInputs({
      mass: { value: 1 },
      radius: { value: 1, sigma: 0.1 },
    });
    expect(s.massOk).toBe(false);
    expect(s.radiusOk).toBe(true);
  });
});

describe('the model is registered and its refusals are named', () => {
  test('the registry holds it under its id and version', () => {
    expect(MODELS['transit-rv-joint']).toBe(TRANSIT_RV_JOINT);
    expect(TRANSIT_RV_JOINT.version).toBe('1.0.0');
    expect(TRANSIT_RV_JOINT.notClaimed.join(' ')).toMatch(/without the star/);
  });
  test('refusals: no transit, no velocities, no star, a star without its uncertainty', () => {
    const star = {
      mass: { value: 1.1, sigma: 0.05, source: 's' },
      radius: { value: 1.15, sigma: 0.04, source: 's' },
    };
    const names = r => [...new Set(r.map(x => `${x.quantity}:${x.code}`))];
    expect(names(refusalsFor({ stellar: star }, ['rv', 'rv']))).toEqual(
      expect.arrayContaining([
        'Mp:noTransit',
        'Rp:noTransit',
        'rhoP:noTransit',
        'inclination:noTransit',
      ])
    );
    expect(names(refusalsFor({ stellar: star }, ['flux']))).toEqual(
      expect.arrayContaining(['Mp:noVelocities', 'rhoP:noVelocities'])
    );
    expect(refusalsFor({ stellar: star }, ['flux', 'rv'])).toEqual([]);
    expect(names(refusalsFor({}, ['flux', 'rv']))).toEqual(
      expect.arrayContaining([
        'Mp:stellarMassMissing',
        'Rp:stellarRadiusMissing',
      ])
    );
    const bare = {
      mass: { value: 1.1, source: 's' },
      radius: { value: 1.15, source: 's' },
    };
    expect(names(refusalsFor({ stellar: bare }, ['flux', 'rv']))).toEqual(
      expect.arrayContaining([
        'Mp:stellarUncertaintyMissing',
        'Rp:stellarUncertaintyMissing',
        'rhoP:stellarUncertaintyMissing',
      ])
    );
  });
  test('velocities alone: the minimum mass is labelled and nothing of size or density appears', () => {
    const v = {
      t0: 2,
      P: 3.5,
      k: 0.1,
      aRs: 9,
      b: 0.3,
      q1: 0.3,
      q2: 0.3,
      K: 80,
      sqrtEcosw: 0,
      sqrtEsinw: 0,
    };
    const d = TRANSIT_RV_JOINT.derived(v, {
      roles: ['rv'],
      perDay: 1,
      stellar: {
        mass: { value: 1.1, sigma: 0.05, source: 's' },
        radius: { value: 1.15, sigma: 0.04, source: 's' },
      },
    });
    expect(Object.keys(d)).toEqual(
      expect.arrayContaining(['MpSini', 'massFunction'])
    );
    for (const n of ['Mp', 'Rp', 'rhoP', 'inclination'])
      expect(d).not.toHaveProperty(n);
    expect(d.MpSini.label).toMatch(/MINIMUM/);
  });
});

describe('the manifest and the schema', () => {
  const schema = read('sdk/schemas/inference-1.schema.json');
  const make = settings => ({
    format: 'gravitas.inference',
    formatVersion: 1,
    data: { observation: 'x', span: 10 },
    model: { id: 'transit-rv-joint', version: '1.0.0' },
    parameters: {
      t0: { mode: 'fitted', lo: 1.9, hi: 2.6 },
      P: { mode: 'fitted', lo: 3.4, hi: 3.6 },
    },
    settings,
  });
  test('the validator refuses a stellar input with no source and a role it does not know', () => {
    const star = { mass: { value: 1.1, sigma: 0.05, source: 'x' } };
    const ok = validateInference(
      make({ roles: ['flux', 'rv'], stellar: star })
    );
    expect(ok.filter(e => /settings\.(stellar|roles)/.test(e.path))).toEqual(
      []
    );
    const bad = validateInference(
      make({ roles: ['flux', 'banana'], stellar: { mass: { value: 1 } } })
    );
    expect(bad.map(e => e.path)).toEqual(
      expect.arrayContaining(['settings.roles', 'settings.stellar.mass'])
    );
  });
  test('the schema accepts the manifest and refuses an unknown role', () => {
    const star = { mass: { value: 1.1, sigma: 0.05, source: 'x' } };
    expect(valid(schema, make({ roles: ['flux', 'rv'], stellar: star }))).toBe(
      true
    );
    expect(valid(schema, make({ roles: ['flux', 'banana'] }))).toBe(false);
  });
});

describe('the fit through the core (one seeded joint table)', () => {
  test('a circular hot Jupiter is recovered and carries its star', () => {
    const S = { P: 3.5247, Mp: 0.7, Ms: 1.1, Rs: 1.15, b: 0.5, k: 0.12 };
    const o = systemFromMass(S);
    const times = [];
    for (let t = 1; t < 8; t += 1 / 36) times.push(t);
    const rvT = Array.from({ length: 24 }, (_, i) => (i + 0.5) * (30 / 24));
    const data = syntheticJoint({
      seed: 'joint-test',
      lc: { times, sigma: 0.0005, exposure: 1 / 36, supersample: 5 },
      rv: {
        times: rvT,
        groups: rvT.map((_, i) => (i < 12 ? 0 : 1)),
        sigma: 3,
        jitter: 0,
        zeroPoints: [10, -20],
      },
      truth: {
        t0: 2.25,
        P: S.P,
        k: S.k,
        aRs: o.aRs,
        b: S.b,
        q1: 0.36,
        q2: 0.3,
        K: o.K,
        sqrtEcosw: 0,
        sqrtEsinw: 0,
      },
    });
    const star = {
      mass: { value: 1.1, sigma: 0.05, source: 'test' },
      radius: { value: 1.15, sigma: 0.04, source: 'test' },
      correlation: 0.5,
    };
    const f = fitOnce(
      {
        model: { id: 'transit-rv-joint' },
        parameters: {
          t0: { lo: 1.9, hi: 2.6 },
          P: { lo: 3.45, hi: 3.6 },
          jitter: { lo: 0, hi: 20 },
          sqrtEcosw: { mode: 'fixed', value: 0 },
          sqrtEsinw: { mode: 'fixed', value: 0 },
        },
        settings: {
          exposure: 1 / 36,
          supersample: 5,
          annuli: 48,
          roles: ['flux', 'rv', 'rv'],
          stellar: star,
        },
      },
      data
    );
    const K = f.parameters.find(p => p.name === 'K');
    expect(Math.abs(K.value - o.K) / K.sigma).toBeLessThan(4);
    const mp = f.derived.find(d => d.name === 'Mp');
    expect(Math.abs(mp.value - 0.7) / mp.sigma).toBeLessThan(4);
    // the star's part is inside the sigma, and the result names its share
    expect(mp.stellar.sigmaFitOnly).toBeLessThan(mp.sigma);
    expect(mp.stellar.share).toBeGreaterThan(0);
    expect(f.refusals).toEqual([]);
    expect(f.nuisance.jitter.unit).toBe('m/s');
  }, 120_000);
});

describe('what the panels state', () => {
  test('the stored fit gives the planet its star-inclusive intervals', () => {
    const p = planetFrom({ massPct: 5, radiusPct: 3.5, correlation: 0.5 });
    expect(p.Mp.value).toBeCloseTo(0.684, 3);
    expect(p.Mp.sigma).toBeCloseTo(0.0245, 4);
    expect(p.Mp.share).toBeCloseTo(0.869, 3);
    expect(p.Rp.share).toBeCloseTo(0.517, 3);
    expect(p.rhoP.share).toBeCloseTo(0.457, 3);
    const none = planetFrom({ massPct: 0, radiusPct: 0, correlation: 0.5 });
    expect(none.rhoP.sigma).toBeCloseTo(p.rhoP.sigmaFit, 12);
  });
});

describe('the duplication removed where identical (the delta table)', () => {
  test('rvMonteCarlo.js percentile is the statistics kernel percentile interval', () => {
    const a = Array.from({ length: 501 }, (_, i) => Math.sin(i) * 5 + i * 0.01);
    const sorted = [...a].sort((x, y) => x - y);
    const iv = percentileInterval(a, { level: 0.9 });
    expect(Math.abs(iv.lo - percentile(sorted, 0.05))).toBeLessThan(1e-12);
    expect(Math.abs(iv.hi - percentile(sorted, 0.95))).toBeLessThan(1e-12);
    expect(Math.abs(iv.value - percentile(sorted, 0.5))).toBeLessThan(1e-12);
  });
});
