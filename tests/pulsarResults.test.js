// =============================================================================
// The pulsar validation contract and its pinned results (Prompt 242, Part A)
// -----------------------------------------------------------------------------
// tests/fixtures/pulsars/thresholds.json fixed every bound before the kernel existed.
// tools/pulsar-validate.mjs judges the kernel against it; the whole table takes several
// minutes (the ensembles), so this holds the pinned results.json and failed-legs.json
// against the thresholds file and re-runs the analytic, oracle and refusal legs (about
// twenty seconds) in a child process to hold their statuses. The ensembles are
// regenerated with `npm run pulsar:validate -- --write-results --write-failed`. A leg
// that crosses its bound stays in failed-legs.json; only Carl resets a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/pulsars/thresholds.json');
const RESULTS = read('tests/fixtures/pulsars/results.json');
const FAILED = read('tests/fixtures/pulsars/failed-legs.json');
const ORACLE = read('tests/fixtures/pulsars/oracle-results.json');
const INPUTS = read('tests/fixtures/pulsars/oracle-inputs.json');

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
  test('only the legs the thresholds call reported or that wait for a file are not judged', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status !== 'pass' && r.status !== 'fail')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual([
      'B6.toolkit:not-run',
      'C5.detectionPower:reported',
      'E1.authenticSeries:not-run',
      'R1.smearingBias:reported',
      'R2.profileEvolution:reported',
    ]);
  });
  test('the thresholds file records every amendment with its reason, and the first run is not hidden', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(
      Array.from({ length: THR.amendments.length }, (_, i) => `AM${i + 1}`)
    );
    for (const a of THR.amendments) {
      expect(a.what.length).toBeGreaterThan(40);
      expect(a.why.length).toBeGreaterThan(80);
    }
    expect(THR.amendments.find(a => a.id === 'AM9').why).toMatch(
      /first (partial )?(validator )?run/
    );
  });
  test('the committed rule forbids typed published numbers and names the derived constant', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/DERIVED/);
    expect(THR.rule).toMatch(/no default/);
    expect(THR.constants.source).toMatch(/constants-source\.json/);
  });
  test("the committed analysis rule is the kernel's", async () => {
    const K = await import('../js/kernels/radio/index.js');
    expect(THR.analysisRule.nbin).toBe(64);
    expect(THR.analysisRule.subintegrations).toBe(8);
    expect(THR.analysisRule.detection.trialCorrectedP).toBe(1e-3);
    expect(THR.distanceRule.label).toBe(K.DM_DISTANCE_LABEL);
    expect(THR.instrument.label.startsWith(K.PULSAR_SYNTHETIC_LABEL)).toBe(
      true
    );
    expect(THR.instrument.bandMHz).toEqual([...K.PULSAR_WORLD.bandMHz]);
    expect(THR.instrument.channels).toBe(K.PULSAR_WORLD.channels);
    expect(THR.instrument.dtS).toBe(K.PULSAR_WORLD.dt);
  });
  test('no analytic period is a whole number of samples, and they follow the golden-ratio rule (AM9, AM10)', () => {
    const phi = (Math.sqrt(5) - 1) / 2;
    THR.instrument.periodTruthS.analytic.forEach((p, i) => {
      const r = p / THR.instrument.dtS;
      expect(Math.abs(r - Math.round(r))).toBeGreaterThan(0.05);
      expect(p).toBeCloseTo(0.2 + 0.1 * (((i + 1) * phi) % 1), 6);
    });
  });
});

describe('the oracle inputs and results', () => {
  test('the oracle read its inputs file: same series count, versions recorded', () => {
    expect(ORACLE.b45).toHaveLength(INPUTS.b45.worlds.length);
    expect(ORACLE.versions).toMatchObject({
      numpy: expect.any(String),
      scipy: expect.any(String),
      astropy: expect.any(String),
    });
    expect(ORACLE.note).toMatch(/no Gravitas code/);
  });
  test('the inputs hold parameters and seeds and no kernel output', () => {
    expect(JSON.stringify(INPUTS)).not.toMatch(/"data"|"series"|"profile"/);
    expect(INPUTS.format).toBe('gravitas.pulsar-oracle-inputs/1');
  });
});

describe('the validator reproduces the pinned statuses of its cheap legs', () => {
  const run = () =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/pulsar-validate.mjs', '--json', '--only=A,B,D'],
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
  const pinned = RESULTS.rows.filter(r => /^[ABD]\d/.test(r.id));
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
    ).toEqual(failing.filter(id => /^[ABD]\d/.test(id)).sort());
  });
  test('the measured values are the pinned ones, byte for byte, for the deterministic legs', () => {
    for (const r of live.filter(x => x.id !== '_cpu')) {
      const p = pinned.find(x => x.id === r.id);
      expect(r.measured).toEqual(p.measured);
    }
  });
});
