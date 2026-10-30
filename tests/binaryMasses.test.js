// =============================================================================
// Binary masses and radii (Roadmap III, Prompt 218)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/binary-masses/thresholds.json,
// committed before the kernel existed. The quick legs (analytic, the independent
// oracle's pinned two-body velocities and joint solution, the speed) run live
// through tools/binary-masses-validate.mjs in a child process. The ensemble legs
// (coverage, the refusals, the residual tests) take about twenty CPU-minutes, so
// their table is pinned in tests/fixtures/binary-masses/results.json by
// `npm run binary-masses:validate -- --write-results` and held here against
// failed-legs.json: a leg that crossed its bound is recorded there and this test
// holds that it still fails and that nothing else does. The quick tests hold the
// kernel's public contract.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import '../js/inference/infer.js';
import {
  AU,
  DAY,
  GM_SUN,
  R_SUN,
  absoluteProperties,
  companionMinimumMass,
  elementsOf,
  massFunction,
  minimumMasses,
  rvPair,
} from '../js/inference/binaryMasses.js';
import { MODELS } from '../js/inference/models.js';
import { fitOnce } from '../js/inference/infer.js';
import { syntheticSb2 } from '../js/inference/synthetic.js';
import { validateInference } from '../js/inference/manifest.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/binary-masses/thresholds.json');
const FAILED = read('tests/fixtures/binary-masses/failed-legs.json');
const PINNED = read('tests/fixtures/binary-masses/results.json').rows;

describe('the committed thresholds', () => {
  test('every check of the contract is present, and no bound has moved', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.massChain',
      'A2.inclinationScaling',
      'A3.massFunction',
      'A4.rvExtrema',
      'A5.conjunctionSign',
      'A6.surfaceGravity',
      'B1.twoBodyRv',
      'B2.jointOracle',
      'B3.oracleSelf',
      'C1.coverageSb2',
      'C2.coverageJointCircular',
      'C3.coverageJointEccentric',
      'C4.recovery',
      'D1.singleLined',
      'D2.nonEclipsing',
      'D3.circularAssumed',
      'D4.grazing',
      'D5.swappedStars',
      'E1.authentic',
      'P1.speed',
    ]);
    expect(THR.amendments.every(a => a.boundMoved === false)).toBe(true);
  });
});

describe('the pinned table of the ensemble legs', () => {
  test('every leg of the contract has a row', () => {
    expect(PINNED.map(r => r.id)).toEqual(
      expect.arrayContaining(THR.checks.map(c => c.id))
    );
  });
  test('only the recorded legs fail, and the unmeasured legs are recorded as such', () => {
    expect(
      PINNED.filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    ).toEqual(FAILED.failed.map(f => f.id).sort());
    expect(
      PINNED.filter(r => r.status === 'not-run')
        .map(r => r.id)
        .sort()
    ).toEqual(FAILED.notMeasured.map(f => f.id).sort());
  });
});

describe('the validation table, the quick legs (tools/binary-masses-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/binary-masses-validate.mjs', '--json', '--only=A,B,P1'],
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
      if (!FAILED.failed.some(f => f.id === r.id))
        expect({ id: r.id, status: r.status }).toEqual({
          id: r.id,
          status: 'pass',
        });
  });
  test('the joint solution agrees with the oracle and the speed is recorded', () => {
    expect(rows.find(r => r.id === 'B2.jointOracle').status).toBe('pass');
    expect(
      rows.find(r => r.id === 'P1.speed').measured.cpuSeconds
    ).toBeGreaterThan(0);
  });
});

describe('the kernel', () => {
  test('two equal stars at 1 au: each mass is one solar mass and a is one au', () => {
    const Ps = 2 * Math.PI * Math.sqrt(AU ** 3 / (2 * GM_SUN));
    const K = (Math.PI * AU) / Ps / 1e3;
    const p = absoluteProperties({
      K1: K,
      K2: K,
      P: Ps / DAY,
      e: 0,
      inc: 90,
      rsum: 0.1,
      k: 1,
    });
    expect(p.M1).toBeCloseTo(1, 12);
    expect(p.M2).toBeCloseTo(1, 12);
    expect(p.a * R_SUN).toBeCloseTo(AU, 0);
    expect(p.q).toBe(1);
  });
  test('the mass ratio is the inverse ratio of the amplitudes and a minimum mass is never a mass', () => {
    const p = absoluteProperties({
      K1: 40,
      K2: 60,
      P: 5,
      e: 0.1,
      inc: 60,
      rsum: 0.2,
      k: 1,
    });
    expect(p.q).toBeCloseTo(40 / 60, 14);
    const m = minimumMasses({ K1: 40, K2: 60, P: 5, e: 0.1 });
    expect(p.M1 * Math.sin((60 * Math.PI) / 180) ** 3).toBeCloseTo(
      m.m1sin3i,
      12
    );
    expect(p.M1).toBeGreaterThan(m.m1sin3i);
  });
  test('the mass function and a companion minimum', () => {
    const f = massFunction(30, 10, 0.2);
    expect(f).toBeGreaterThan(0);
    const m2 = companionMinimumMass(f, 1);
    expect(m2 ** 3).toBeCloseTo(f * (1 + m2) ** 2, 10);
    expect(companionMinimumMass(0, 1)).toBeLessThan(1e-12);
    expect(Number.isNaN(companionMinimumMass(f, -1))).toBe(true);
  });
  test('the velocities of the two stars are opposite and in the ratio of the amplitudes', () => {
    const t = Float64Array.from({ length: 50 }, (_, i) => i * 0.37);
    const { v1, v2 } = rvPair(t, {
      tc: 0.1,
      P: 3.3,
      K1: 50,
      K2: 70,
      ecosw: 0.1,
      esinw: -0.05,
    });
    for (let i = 0; i < t.length; i++) {
      const g = v1[i] / 50;
      expect(v2[i] / -70).toBeCloseTo(g, 12);
    }
  });
});

describe('the models of the inference core', () => {
  const sys = THR.systems.X1;
  const el = elementsOf(sys);
  const truth = {
    tc: sys.tc,
    P: sys.P,
    rsum: el.rsum,
    k: el.k,
    inc: sys.inc,
    J: sys.J,
    ecosw: el.ecosw,
    esinw: el.esinw,
    ldA: sys.ldA,
    ldB: sys.ldB,
    thirdLight: 0,
    K1: el.K1,
    K2: el.K2,
    annuli: 64,
  };
  const t0 = sys.tc - 0.15 * sys.P;
  const fluxTimes = Float64Array.from({ length: 300 }, (_, j) => t0 + j / 24);
  const make = (o = {}) =>
    syntheticSb2({
      seed: 'binary-masses-test',
      truth,
      fluxTimes,
      sigmaFlux: sys.sigmaFlux,
      span: [t0, t0 + 12.5],
      nRv: 16,
      sigmaRv: 0.8,
      gamma: 5,
      ...o,
    });
  const request = (model = 'eclipsing-sb2', over = {}) => ({
    model: { id: model, version: '1.0.0' },
    parameters: {
      tc: { mode: 'fitted', lo: sys.tc - 0.3, hi: sys.tc + 0.3 },
      P: { mode: 'fitted', lo: sys.P * 0.985, hi: sys.P * 1.015 },
      ecosw: { mode: 'fixed', value: 0 },
      esinw: { mode: 'fixed', value: 0 },
      ...over,
    },
    settings:
      model === 'eclipsing-sb2'
        ? { ldA: sys.ldA, ldB: sys.ldB, thirdLight: 0 }
        : {},
  });
  test('both models are registered with their parameters and say what they do not claim', () => {
    expect(MODELS['sb2-orbit'].parameters.map(p => p.name)).toEqual([
      'tc',
      'P',
      'K1',
      'K2',
      'ecosw',
      'esinw',
      'dgamma',
    ]);
    expect(MODELS['eclipsing-sb2'].parameters.map(p => p.name)).toEqual([
      'tc',
      'P',
      'rsum',
      'k',
      'inc',
      'J',
      'ecosw',
      'esinw',
      'K1',
      'K2',
      'dgamma',
    ]);
    expect(MODELS['sb2-orbit'].notClaimed.join(' ')).toMatch(/Absolute masses/);
    expect(MODELS['eclipsing-sb2'].notClaimed.join(' ')).toMatch(
      /single-lined/
    );
  });
  test('the joint solution recovers the masses and radii within three standard deviations', () => {
    const fit = fitOnce(request(), make());
    const q = n => fit.derived.find(d => d.name === n);
    for (const [n, v] of [
      ['M1', sys.M1],
      ['M2', sys.M2],
      ['R1', sys.R1],
      ['R2', sys.R2],
    ])
      expect(Math.abs(q(n).value - v)).toBeLessThan(
        3 * (q(n).sigmaScaled ?? q(n).sigma)
      );
    expect(fit.identifiability.status).toBe('constrained');
  });
  test('a single line returns the mass function and a minimum companion and no mass', () => {
    const fit = fitOnce(
      { ...request(), settings: { ...request().settings, assumedM1: sys.M1 } },
      make({ singleLined: true })
    );
    const names = fit.derived.map(d => d.name);
    expect(names).toEqual(expect.arrayContaining(['massFunction', 'm2min']));
    expect(names).not.toContain('M1');
    expect(names).not.toContain('R1');
    expect(fit.derived.find(d => d.name === 'm2min').label).toMatch(/minimum/);
  });
  test('velocities alone return minimum masses only, labelled', () => {
    const fit = fitOnce(request('sb2-orbit'), make({ fluxTimes: null }));
    const masses = fit.derived.filter(d => d.unit === 'Msun');
    expect(masses.map(d => d.name).sort()).toEqual(['m1sin3i', 'm2sin3i']);
    for (const d of masses) expect(d.label).toMatch(/minimum/);
  });
  test('a flat light curve is refused, naming the eclipse; a roles list without star 1 is refused', () => {
    const d = make();
    const flat = {
      ...d,
      y: Float64Array.from(d.y, (v, i) => (d.groups[i] === 0 ? 1 : v)),
    };
    expect(() => fitOnce(request(), flat)).toThrow(/eclipse/);
    const bad = {
      ...request(),
      settings: { ...request().settings, roles: ['flux', 'rv2', 'rv2'] },
    };
    expect(() => fitOnce(bad, make())).toThrow(/star 1/);
  });
  test('the manifest check refuses roles it does not know and a primary mass that is not positive', () => {
    const base = {
      format: 'gravitas.inference',
      formatVersion: 1,
      model: { id: 'eclipsing-sb2', version: '1.0.0' },
      data: { observation: 'x' },
      parameters: {
        tc: { mode: 'fixed', value: 0 },
        P: { mode: 'fixed', value: 3 },
      },
    };
    expect(
      JSON.stringify(
        validateInference({ ...base, settings: { roles: ['flux', 'nope'] } })
      )
    ).toMatch(/roles/);
    expect(
      JSON.stringify(
        validateInference({ ...base, settings: { assumedM1: -1 } })
      )
    ).toMatch(/assumedM1/);
    expect(
      validateInference({
        ...base,
        settings: { roles: ['flux', 'rv1', 'rv2'], assumedM1: 1.2 },
      })
    ).toEqual([]);
  });
});
