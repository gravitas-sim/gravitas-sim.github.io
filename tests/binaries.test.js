// =============================================================================
// Eclipsing binaries (Roadmap III, Prompt 217)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/binaries/thresholds.json, committed
// before the kernel existed. The quick legs (analytic, oracle, the refusal of a
// light curve with no eclipse, the speed) run live through tools/binaries-validate.mjs
// in a child process against the independent oracle's pinned results (batman and a
// brute-force quadrature). The ensemble legs (coverage, the grazing flag, the
// residual test) take about twenty CPU-minutes, so their table is pinned in
// tests/fixtures/binaries/results.json by `npm run binaries:validate --
// --write-results` and held here against failed-legs.json; a leg that crossed its
// bound is recorded there and this test holds that it still fails and that nothing
// else does. The quick tests hold the kernel's public contract.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import {
  contacts,
  eclipseFlux,
  identifiability,
  residualsFail,
  secondaryPhase,
} from '../js/inference/binaries.js';
import { MODELS } from '../js/inference/models.js';
import { fitOnce } from '../js/inference/infer.js';
import { syntheticEclipse } from '../js/inference/synthetic.js';
import { modelsFor } from '../js/observatory/fitPanel.js';
import { validateInference } from '../js/inference/manifest.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/binaries/thresholds.json');
const FAILED = read('tests/fixtures/binaries/failed-legs.json');
const PINNED = read('tests/fixtures/binaries/results.json').rows;

describe('the committed thresholds', () => {
  test('every check of the contract is present, and no bound has moved', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.depthCentral',
      'A2.contacts',
      'A3.secondaryPhase',
      'A4.swapSymmetry',
      'A5.outOfEclipse',
      'A6.derived',
      'A7.ecoswFromPhase',
      'A8.durationRatio',
      'B1.batman',
      'B2.bruteForce',
      'B3.batmanTiming',
      'C1.coverageCircular',
      'C2.coverageEccentric',
      'C3.coverageProfile',
      'C4.recovery',
      'D1.grazing',
      'D2.spots',
      'D3.noEclipse',
      'D4.circularAssumed',
      'D5.esinwWeak',
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

describe('the validation table, the quick legs (tools/binaries-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/binaries-validate.mjs', '--json', '--only=A,B,D3,P1'],
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
  test('a light curve with no eclipse in it is refused, naming the eclipse', () => {
    expect(rows.find(r => r.id === 'D3.noEclipse').status).toBe('pass');
  });
});

describe('the kernel', () => {
  const S1 = THR.systems.S1;
  test('out of eclipse the flux is exactly one, and both eclipses have contacts', () => {
    const f = eclipseFlux([S1.tc + 0.4 * S1.P, S1.tc + 0.7 * S1.P], S1);
    expect(Array.from(f)).toEqual([1, 1]);
    expect(contacts(S1, 'primary').duration).toBeGreaterThan(0.1);
    expect(contacts(S1, 'secondary').duration).toBeGreaterThan(0.1);
  });
  test('a circular orbit puts the secondary at exactly half an orbit', () => {
    expect(secondaryPhase(S1)).toBe(0.5);
    expect(secondaryPhase(THR.systems.S2)).toBeGreaterThan(0.5);
  });
  test('the model is registered with the core under its own id and says what it does not claim', () => {
    const m = MODELS['eclipsing-binary'];
    expect(m.parameters.map(p => p.name)).toEqual([
      'tc',
      'P',
      'rsum',
      'k',
      'inc',
      'J',
      'ecosw',
      'esinw',
    ]);
    expect(m.notClaimed.join(' ')).toMatch(/Masses/);
    expect(m.notClaimed.join(' ')).toMatch(/grazing/);
  });
  test('the residual test and the identifiability rule read a fit result', () => {
    expect(residualsFail({ reducedChi2: 2, redNoise: null })).toBe(true);
    expect(residualsFail({ reducedChi2: 1.1, redNoise: { beta: 1.2 } })).toBe(
      false
    );
    expect(residualsFail({ reducedChi2: 1.1, redNoise: { beta: 2 } })).toBe(
      true
    );
    const id = identifiability({
      rank: { notConstrained: [] },
      parameters: [
        { name: 'k', mode: 'fitted', value: 0.5, sigma: 0.3, atBound: false },
        { name: 'inc', mode: 'fitted', value: 88, sigma: 1, atBound: false },
      ],
    });
    expect(id.status).toBe('not constrained');
    expect(id.parameters.k.why).toBe('uncertain');
    expect(id.parameters.inc.status).toBe('constrained');
  });
  test('a well-determined pair is fitted and flagged constrained; a flat curve is refused', () => {
    const ens = THR.ensembles.circular;
    const times = Float64Array.from({ length: 700 }, (_, j) => j / 72);
    const data = syntheticEclipse({
      seed: 'binaries-test',
      times,
      sigma: ens.sigma,
      truth: { ...ens.system, annuli: 64 },
    });
    const req = {
      model: { id: 'eclipsing-binary', version: '1.0.0' },
      parameters: {
        tc: { mode: 'fitted', lo: 0.3, hi: 0.5 },
        P: { mode: 'fitted', lo: 3.168, hi: 3.232 },
        rsum: { mode: 'fitted' },
        k: { mode: 'fitted' },
        inc: { mode: 'fitted' },
        J: { mode: 'fitted' },
        ecosw: { mode: 'fixed', value: 0 },
        esinw: { mode: 'fixed', value: 0 },
      },
      settings: { ldA: ens.system.ldA, ldB: ens.system.ldB, thirdLight: 0 },
    };
    const fit = fitOnce(req, data);
    expect(fit.identifiability.status).toBe('constrained');
    expect(residualsFail(fit)).toBe(false);
    expect(
      Math.abs(fit.parameters.find(p => p.name === 'rsum').value - 0.19)
    ).toBeLessThan(0.001);
    const flat = { ...data, y: Float64Array.from(data.y, () => 1) };
    expect(() => fitOnce(req, flat)).toThrow(/eclipse/);
  });
});

describe('the Observatory fit panel', () => {
  test('offers the eclipse model beside the transit for a flux and not for a velocity', () => {
    const o = kind => ({
      kind: 'time-series',
      axes: { y: 'y' },
      columns: [{ id: 'y', unit: kind }],
    });
    const dim = u => (u === 'm/s' ? 'velocity' : 'ratio');
    expect(modelsFor(o('1'), dim)).toEqual([
      'transit-quadratic',
      'eclipsing-binary',
    ]);
    expect(modelsFor(o('m/s'), dim)).toEqual(['rv-keplerian']);
  });
  test('a request with limb darkening out of range is refused by the manifest check', () => {
    const request = {
      format: 'gravitas.inference-manifest',
      model: { id: 'eclipsing-binary', version: '1.0.0' },
      parameters: {},
      settings: { ldA: [2, 2], ldB: [0.5, 0.18], thirdLight: 0 },
    };
    const out = validateInference(request, { rows: 100 });
    expect(JSON.stringify(out)).toMatch(/ld/i);
  });
});
