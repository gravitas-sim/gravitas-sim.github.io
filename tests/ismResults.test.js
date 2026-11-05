// =============================================================================
// The ISM validation contract and its pinned results (Prompt 247, Part A)
// -----------------------------------------------------------------------------
// tests/fixtures/ism/thresholds.json fixed every bound before the kernel existed. tools/ism-validate.mjs
// judges the kernel against it; the whole table takes about fifteen seconds, and this holds the pinned
// results.json and failed-legs.json against the thresholds file and re-runs the analytic, oracle and
// refusal legs in a child process to hold their statuses. A leg that crosses its bound stays in
// failed-legs.json; only Carl resets a bound. The plasma-diagnostics gate (gate-thresholds.json) has no
// result: every leg is NOT RUN until the atomic data and the independent pipeline are supplied.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/ism/thresholds.json');
const GATE = read('tests/fixtures/ism/gate-thresholds.json');
const RESULTS = read('tests/fixtures/ism/results.json');
const FAILED = read('tests/fixtures/ism/failed-legs.json');
const ORACLE = read('tests/fixtures/ism/oracle-results.json');
const INPUTS = read('tests/fixtures/ism/oracle-inputs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      THR.checks.map(c => c.id).sort()
    );
  });
  test('the failed-legs file is exactly the failing rows, each with its reason', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      RESULTS.rows
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    );
    for (const l of FAILED.legs) expect(l.note.length).toBeGreaterThan(40);
  });
  test('only the legs the thresholds call reported or that wait for a file or a tool are not judged', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status !== 'pass' && r.status !== 'fail')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual([
      'B6.toolkit:not-run',
      'E1.authenticNebula:not-run',
      'E2.authenticStarSodium:not-run',
      'E3.inTreeStars:reported',
      'R1.decrementMisspecification:reported',
      'R2.continuumSystematic:reported',
    ]);
  });
  test('every not-run row says why', () => {
    for (const r of RESULTS.rows.filter(x => x.status === 'not-run'))
      expect(r.note.length).toBeGreaterThan(60);
  });
  test('the thresholds file records every amendment with its reason and its date in the order of the run', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(
      Array.from({ length: THR.amendments.length }, (_, i) => `AM${i + 1}`)
    );
    for (const a of THR.amendments) {
      expect(a.what.length).toBeGreaterThan(40);
      expect(a.why.length).toBeGreaterThan(80);
      expect(a.why).toMatch(/No bound moved/);
    }
    expect(THR.amendments[0].why).toMatch(/design run on the design seed/);
  });
  test('the committed rule forbids typed published numbers and names the derived constant', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/DERIVED/);
    expect(THR.rule).toMatch(/no default/);
    expect(THR.analysisRule.constants.columnDensity).toMatch(/constants-source\.json/);
  });
  test("the committed analysis rule and worlds are the kernel's", async () => {
    const K = await import('../js/kernels/ism/index.js');
    expect(THR.worlds.label.startsWith(K.ISM_SYNTHETIC_LABEL)).toBe(true);
    expect(THR.worlds.nebula.resolvingPower).toBe(K.ISM_WORLD.resolvingPower);
    expect(THR.worlds.nebula.grid.log10Step).toBe(K.ISM_WORLD.log10Step);
    expect(THR.worlds.nebula.grid.samples).toBe(K.ISM_WORLD.samples);
    expect(THR.worlds.nebula.sigmaPixel).toBe(K.ISM_WORLD.sigmaPixel);
    expect(THR.worlds.nebula.intrinsicRatios['h-alpha/h-beta']).toBe(K.ISM_WORLD.intrinsic['h-alpha']);
    expect(THR.worlds.sodium.sigmaPixel).toBe(0.002);
    expect(K.DIP_CUT).toBe(0.1);
    expect(K.TAU0_MAX).toBe(0.3);
    expect(K.RATIO_SIGMAS).toBe(2);
    expect(K.MIN_LINE_SNR).toBe(5);
    expect(K.DETECTION_SNR).toBe(5);
    expect(K.MEDIAN_WINDOW).toBe(61);
    expect(K.NARROW_LSF_FACTOR).toBe(1.5);
    expect(K.NARROW_REF_FACTOR).toBe(0.5);
    expect(K.OFFSET_SIGMAS).toBe(3);
  });
});

describe('the plasma-diagnostics gate has committed thresholds and no result', () => {
  test('its thresholds were committed before any datum and name what is needed', () => {
    expect(GATE.committed).toMatch(/Nothing of the atomic data has been read, typed or fetched/);
    expect(GATE.rule).toMatch(/NOT RUN/);
    expect(GATE.verdictRule.notDecided).toMatch(/no verdict/);
    expect(Object.keys(GATE.needs).sort()).toEqual(['atomicData', 'pipeline', 'spectra']);
    expect(GATE.checks.map(c => c.id)).toEqual([
      'G1.atomicDataPinned',
      'G2.ratioCurveVsOracle',
      'G3.inversionVsOracle',
      'G4.coverage',
      'G5.domainRefusals',
      'G6.authenticVsPipeline',
    ]);
    expect(GATE.amendments).toEqual([]);
  });
  test('no atomic datum, diagnostic or gate result exists in the tree', async () => {
    const K = await import('../js/kernels/ism/index.js');
    for (const name of Object.keys(K))
      expect(name).not.toMatch(/temperature|electronDensity|collision|nebularDiagnostic/i);
  });
});

describe('the oracle inputs and results', () => {
  test('the oracle read its inputs file: same case counts, versions recorded', () => {
    expect(ORACLE.b12).toHaveLength(INPUTS.cases.length);
    expect(ORACLE.b3).toHaveLength(INPUTS.ebv.cases.length);
    expect(ORACLE.b4).toHaveLength(INPUTS.columns.length);
    expect(ORACLE.b5).toHaveLength(INPUTS.authentic.lines.length);
    expect(ORACLE.versions).toMatchObject({
      numpy: expect.any(String),
      scipy: expect.any(String),
      astropy: expect.any(String),
    });
    expect(ORACLE.note).toMatch(/no Gravitas code/);
    expect(ORACLE.note).toMatch(/not a cited tool/);
  });
  test('the inputs hold forward-model data and parameters and no kernel output', () => {
    expect(INPUTS.format).toBe('gravitas.ism-oracle-inputs/1');
    expect(INPUTS.note).toMatch(/no analysis output/);
    const text = JSON.stringify(INPUTS.cases[0]);
    expect(text).not.toMatch(/"widthNm"|"velocityKmS"|"ebv"|"columnCm2"/);
  });
});

describe('the validator reproduces the pinned statuses of its cheap legs', () => {
  const run = () =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/ism-validate.mjs', '--json', '--only=A,B,D,E'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
          stdio: ['ignore', 'pipe', 'ignore'],
        }
      )
    );
  const live = (() => {
    try {
      return run();
    } catch (e) {
      // the validator exits 1 while a leg fails (left failing, labelled); its output is still the table
      return JSON.parse(e.stdout);
    }
  })();
  const pinned = RESULTS.rows.filter(r => /^[ABDE]\d/.test(r.id));
  test('every status equals its pinned status (the CPU-time figure is recorded, not compared)', () => {
    expect(
      live
        .filter(r => r.id !== '_cpu')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual(pinned.map(r => `${r.id}:${r.status}`).sort());
  });
  test('only the legs in failed-legs.json fail', () => {
    const failing = FAILED.legs.map(l => l.id);
    expect(
      live
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    ).toEqual(failing.filter(id => /^[ABDE]\d/.test(id)).sort());
  });
  test('the measured values are the pinned ones, byte for byte, for the deterministic legs', () => {
    for (const r of live.filter(x => x.id !== '_cpu')) {
      const p = pinned.find(x => x.id === r.id);
      expect(r.measured).toEqual(p.measured);
    }
  });
});
