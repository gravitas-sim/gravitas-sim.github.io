// =============================================================================
// The galaxy-spectra validation contract and its pinned results (Prompt 248)
// -----------------------------------------------------------------------------
// tests/fixtures/galaxy/thresholds.json fixed every bound before the kernel existed. tools/galaxy-validate.mjs
// judges the kernel against it; the whole table takes about a minute, and this holds the pinned results.json and
// failed-legs.json against the thresholds file and re-runs the analytic, oracle, refusal and authentic-file legs in
// a child process to hold their statuses. A leg that crosses its bound stays in failed-legs.json; only Carl resets
// a bound. The authentic legs (E1, E2) and the cited tool (B5) are NOT RUN until a file or a tool is supplied.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/galaxy/thresholds.json');
const RESULTS = read('tests/fixtures/galaxy/results.json');
const FAILED = read('tests/fixtures/galaxy/failed-legs.json');
const ORACLE = read('tests/fixtures/galaxy/oracle-results.json');
const INPUTS = read('tests/fixtures/galaxy/oracle-inputs.json');

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
      'B5.toolkit:not-run',
      'E1.authenticGalaxyRedshift:not-run',
      'E2.authenticBreak:not-run',
      'E3.starsAsMutualTemplates:reported',
      'R1.templateMisfit:reported',
      'R2.breakSystematics:reported',
      'R3.lineMethodDomain:reported',
    ]);
  });
  test('every not-run row says why', () => {
    for (const r of RESULTS.rows.filter(x => x.status === 'not-run'))
      expect(r.note.length).toBeGreaterThan(60);
  });
  test('the thresholds file records every amendment with its reason, in order, and none moves a bound', () => {
    expect(THR.amendments.map(a => a.id)).toEqual(
      Array.from({ length: THR.amendments.length }, (_, i) => `AM${i + 1}`)
    );
    for (const a of THR.amendments) {
      expect(a.what.length).toBeGreaterThan(40);
      expect(a.why.length).toBeGreaterThan(80);
      expect(a.why).toMatch(/No bound moved/);
      expect(a.why).toMatch(/Recorded after|Recorded before/);
    }
  });
  test('the committed rule forbids typed published numbers and names the missing defaults', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/DERIVED/);
    expect(THR.rule).toMatch(/no default/);
    expect(THR.rule).toMatch(/band edges are such a number/);
    expect(THR.scope.notRun).toMatch(/cited-template/);
  });
  test("the committed worlds and rule are the kernel's", async () => {
    const G = await import('../js/kernels/galaxy/index.js');
    expect(THR.worlds.label.startsWith(G.GALAXY_SYNTHETIC_LABEL)).toBe(true);
    expect(THR.worlds.resolvingPower).toBe(G.GALAXY_WORLD.resolvingPower);
    expect(THR.worlds.grid.log10Step).toBe(G.GALAXY_WORLD.log10Step);
    expect(THR.worlds.grid.samples).toBe(G.GALAXY_WORLD.samples);
    expect(THR.worlds.templateGrid.samples).toBe(
      G.GALAXY_WORLD.templateSamples
    );
    for (const kind of ['star-forming', 'passive']) {
      const c = THR.worlds.kinds[kind];
      const k = G.GALAXY_WORLD.kinds[kind];
      expect(c.alpha).toBe(k.alpha);
      expect(c.breakDepth).toBe(k.breakDepth);
      expect(c.breakWidthNm).toBe(k.breakWidthNm);
      expect(c.intrinsicSigmaKmS).toBe(k.intrinsicSigmaKmS);
    }
    expect(THR.worlds.kinds['star-forming'].emission['h-alpha']).toBe(
      G.GALAXY_WORLD.kinds['star-forming'].emission['h-alpha']
    );
    expect(THR.worlds.inventedBreakBands.blueNm).toEqual([
      ...G.INVENTED_BREAK_BANDS.blueNm,
    ]);
    expect(THR.worlds.inventedBreakBands.redNm).toEqual([
      ...G.INVENTED_BREAK_BANDS.redNm,
    ]);
    expect(G.Q_MIN).toBe(6);
    expect(G.Q_OK).toBe(10);
    expect(G.HIGH_PASS_WINDOW).toBe(101);
  });
});

describe('the oracle inputs and results', () => {
  test('the oracle read its inputs file: same case counts, versions recorded', () => {
    expect(ORACLE.b1).toHaveLength(8);
    expect(ORACLE.b2).toHaveLength(4);
    expect(ORACLE.b3).toHaveLength(8);
    expect(ORACLE.b4).toHaveLength(6);
    expect(INPUTS.cases).toHaveLength(10);
    expect(ORACLE.versions).toMatchObject({
      numpy: expect.any(String),
      scipy: expect.any(String),
    });
    expect(ORACLE.note).toMatch(/no Gravitas code/);
    expect(ORACLE.note).toMatch(/not a cited tool/);
  });
  test('the inputs hold forward-model data and no kernel output', () => {
    expect(INPUTS.format).toBe('gravitas.galaxy-oracle-inputs/1');
    expect(INPUTS.note).toMatch(/no analysis output/);
    const text = JSON.stringify(INPUTS.cases[0]).replace(/forwardZ/g, '');
    expect(text).not.toMatch(/"sigmaZ"|"significance"|"redshift"|"D"/);
  });
});

describe('the validator reproduces the pinned statuses of its cheap legs', () => {
  const run = () =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/galaxy-validate.mjs', '--json', '--only=A,B,D5,D6,D7,E1,E2,E3'],
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
  const pinned = RESULTS.rows.filter(r =>
    /^(A|B|D5|D6|D7|E1|E2|E3)/.test(r.id)
  );
  test('every status equals its pinned status (the CPU-time figure is recorded, not compared)', () => {
    expect(
      live
        .filter(r => r.id !== '_cpu')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual(pinned.map(r => `${r.id}:${r.status}`).sort());
  });
  test('the measured values are the pinned ones, byte for byte, for the deterministic legs', () => {
    for (const r of live.filter(x => x.id !== '_cpu')) {
      const p = pinned.find(x => x.id === r.id);
      expect(r.measured).toEqual(p.measured);
    }
  });
});
