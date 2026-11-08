// =============================================================================
// The compute page gate record (Roadmap III, Prompt 268)
// -----------------------------------------------------------------------------
// COMPUTE_GATE_II.md and tests/fixtures/compute-gate-ii/ are a record, not a notebook: the ten
// prototypes, the oracle and the validator are on spike/compute-gate and are never merged. This holds
// that the record agrees with itself and with the contract committed first:
//
//   - thresholds.json has the ten candidates, their legs, the page legs, nine sequential amendments
//     and requests R1 to R3; results.json names the thresholds file it ran against;
//   - every row is a committed leg; the statuses of the numeric legs are recomputed here from their
//     measured numbers and committed bounds; the verdict is the committed function's;
//   - failed-legs.json holds every failing row and nothing else; every NOT RUN row names a request;
//   - the first stream differs from the pinned one only in the three rows the amendments name;
//   - the example inputs kept here are the ones the oracle hashed; no fixture holds a home path;
//   - the document and the register state the counts and the verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/compute-gate-ii';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const results = read('results.json');
const first = read('first-run-results.json');
const failed = read('failed-legs.json');
const oracle = read('oracle-results.json');
const doc = readFileSync('COMPUTE_GATE_II.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');

const committed = new Map(
  [...thresholds.candidates.flatMap(c => c.legs), ...thresholds.pageLegs].map(
    l => [l.id, l]
  )
);
const row = id => results.legs.find(l => l.id === id);

describe('the contract', () => {
  test('ten candidates, 56 candidate legs, 14 page legs, sequential amendments, three requests', () => {
    expect(thresholds.candidates.map(c => c.id)).toEqual([
      'N01',
      'N02',
      'N03',
      'N04',
      'N05',
      'N06',
      'N07',
      'N08',
      'N09',
      'N10',
    ]);
    expect(thresholds.candidates.flatMap(c => c.legs)).toHaveLength(56);
    expect(thresholds.pageLegs).toHaveLength(14);
    expect(thresholds.amendments.map(a => a.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => `AM${i + 1}`)
    );
    expect(thresholds.externalRequests.map(r => r.id)).toEqual([
      'R1',
      'R2',
      'R3',
    ]);
  });
  test('the pinned run names the contract it ran against, and the oracle was pinned before the notebooks', () => {
    expect(results.thresholdsSha256).toBe(sha(bytes('thresholds.json')));
    expect(oracle.thresholdsSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(oracle.python).toBe('3.9.6');
  });
});

describe('the rows', () => {
  test('every row is a committed leg and every committed leg has one row', () => {
    expect(results.legs.map(l => l.id).sort()).toEqual(
      [...committed.keys()].sort()
    );
    expect(results.legs).toHaveLength(70);
  });
  test('counts', () => {
    const n = s => results.legs.filter(l => l.status === s).length;
    expect(n('pass')).toBe(57);
    expect(n('fail')).toBe(6);
    expect(n('NOT RUN')).toBe(4);
    expect(n('reported')).toBe(3);
    expect(results.counts).toEqual({
      pass: 57,
      fail: 6,
      reported: 3,
      'NOT RUN': 4,
    });
  });
  test('the numeric legs are recomputed from their measured numbers', () => {
    expect(row('N01.a').measured.worstErrorRel > 1e-6).toBe(true);
    expect(row('N01.a').status).toBe('fail');
    const rms = row('N07.b').measured.rms;
    expect(rms.cubic <= rms.linear && rms.cubic <= 0.05).toBe(false);
    expect(row('N07.b').status).toBe('fail');
    const g = row('N09.g').measured;
    expect(
      g.monotone && g.rmsAt05 <= 0.05 && g.interactionsAt05 <= g.limit
    ).toBe(true);
    expect(g.rms.every((x, i) => i === 0 || x[1] >= g.rms[i - 1][1])).toBe(
      true
    );
    expect(row('N09.g').status).toBe('pass');
    const n2 = row('N02.a').measured;
    expect(Object.entries(n2).every(([, v]) => v.err_rel <= v.limit)).toBe(
      true
    );
    expect(row('N02.d').measured.refused).toBe(false);
    expect(row('N02.d').measured.timedOutAt60sWallWithoutRefusing).toBe(true);
    const g7 = row('G7.a').measured;
    expect(g7.projected.sourcesKb > g7.ceiling.sources.kb).toBe(true);
    expect(row('G7.a').status).toBe('fail');
    expect(row('G4.b').measured.toolchainNamesTheRuntime).toBe(false);
    expect(row('G4.b').measured.otherToolsMentioningPyodide).toEqual([]);
    expect(
      Object.keys(row('G5.b').measured.listedInABuiltInCourse)
    ).toHaveLength(5);
    const e = row('N04.a').measured.maxAbsRad;
    expect(e <= 1e-11 && row('N04.a').status === 'pass').toBe(true);
    expect(row('N04.o').measured.newtonOrder >= 1.8).toBe(true);
    expect(row('N06.a').measured.maxAbsPower <= 1e-9).toBe(true);
    expect(
      row('N10.b').measured.pooledRmsZ >= 0.8 &&
        row('N10.b').measured.pooledRmsZ <= 1.6
    ).toBe(true);
    expect(row('N10.b').measured.meanZ.every(m => Math.abs(m) <= 0.35)).toBe(
      true
    );
  });
  test('every candidate has a determinism row that passed, and refusals that all passed except the one named', () => {
    for (const c of thresholds.candidates) {
      expect(row(`${c.id}.c`).status).toBe('pass');
      const d = row(`${c.id}.d`) ?? row(`${c.id}.f`);
      expect(d.status).toBe(c.id === 'N02' ? 'fail' : 'pass');
    }
  });
  test('the failing rows are exactly failed-legs.json, and every NOT RUN row names a request', () => {
    expect(failed.legs.map(l => l.id)).toEqual(
      results.legs.filter(l => l.status === 'fail').map(l => l.id)
    );
    expect(failed.legs.map(l => l.id)).toEqual([
      'N01.a',
      'N02.d',
      'N07.b',
      'G4.b',
      'G5.b',
      'G7.a',
    ]);
    const requests = new Set(thresholds.externalRequests.map(r => r.id));
    const notRun = results.legs.filter(l => l.status === 'NOT RUN');
    expect(notRun.map(l => l.id)).toEqual(['G2.b', 'G3.b', 'G3.c', 'G4.c']);
    for (const l of notRun)
      expect(requests.has(committed.get(l.id).run)).toBe(true);
    expect(failed.notRun.map(l => l.id)).toEqual(notRun.map(l => l.id));
  });
});

describe('the verdict', () => {
  test('the committed function gives C, and no candidate passes', () => {
    const own = c => c.legs.filter(l => l.kind === 'verdict').map(l => l.id);
    const page = [
      'G2.b',
      'G3.b',
      'G1.a',
      'G1.b',
      'G1.c',
      'G2.a',
      'G4.a',
      'G4.b',
      'G4.c',
      'G5.a',
      'G5.b',
      'G6.a',
      'G7.a',
    ];
    const passes = thresholds.candidates.filter(c =>
      [...own(c), ...page].every(id => row(id).status === 'pass')
    );
    expect(passes).toHaveLength(0);
    expect(results.verdict).toBe('C');
    expect(results.passing).toEqual([]);
    const noOwnFailure = thresholds.candidates
      .filter(c => own(c).every(id => row(id).status !== 'fail'))
      .map(c => c.id);
    expect(noOwnFailure).toEqual([
      'N03',
      'N04',
      'N05',
      'N06',
      'N08',
      'N09',
      'N10',
    ]);
  });
  test('the page legs that fail decide it for every candidate, whatever R1 to R3 show', () => {
    for (const id of ['G4.b', 'G5.b', 'G7.a'])
      expect(row(id).status).toBe('fail');
  });
});

describe('the first stream', () => {
  test('is kept, has the counts the amendments cite, and differs in the three rows AM7 and AM8 name', () => {
    expect(first.counts).toEqual({
      pass: 54,
      fail: 9,
      reported: 3,
      'NOT RUN': 4,
    });
    const diff = results.legs
      .filter(
        l =>
          JSON.stringify(first.legs.find(f => f.id === l.id).status) !==
          JSON.stringify(l.status)
      )
      .map(l => l.id);
    expect(diff).toEqual(['N02.a', 'N02.b', 'N09.g']);
    expect(thresholds.amendments.find(a => a.id === 'AM7').text).toMatch(
      /one row early/
    );
    expect(first.thresholdsSha256).not.toBe(results.thresholdsSha256);
  });
});

describe('the fixtures', () => {
  test('the example inputs kept here are the ones the oracle hashed', () => {
    const files = readdirSync(`${DIR}/inputs`);
    expect(files.length).toBeGreaterThan(10);
    for (const f of files)
      expect(sha(readFileSync(`${DIR}/inputs/${f}`))).toBe(oracle.inputs[f]);
  });
  test('no fixture holds a home path', () => {
    for (const f of readdirSync(DIR).filter(f => f.endsWith('.json')))
      expect(bytes(f).toString('utf8')).not.toMatch(/\/Users\/|\/home\//);
  });
});

describe('the document and the register', () => {
  test('state the verdict, the counts, the failing legs and the requests', () => {
    expect(doc).toMatch(/Verdict by the committed function: C/i);
    for (const id of [
      'N01.a',
      'N02.d',
      'N07.b',
      'G4.b',
      'G5.b',
      'G7.a',
      'R1',
      'R2',
      'R3',
    ])
      expect(doc).toContain(id);
    expect(doc).toMatch(/Prompt 269 is not run/);
    for (let i = 1; i <= 5; i++) expect(register).toContain(`D-R10-268-0${i}`);
    expect(register).toMatch(/70 rows, 57 pass, 6 fail, 4 NOT RUN/);
    expect(register).toMatch(/verdict C by the committed function/);
  });
});
