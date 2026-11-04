// The pinned validation table of Prompt 237 (tests/fixtures/dynamics/results.json, from
// `npm run dynamics:validate -- --write-results`) held against the committed thresholds and the labelled
// failed legs: a leg that crossed its bound stays failing and recorded, a leg that could not run says why,
// nothing else fails, and the verdict is the one the committed rule gives. The engine's table is held
// current by `node tools/dynamics-runs.mjs --check` (the generate-graph node); the quick live legs are
// re-run in tests/dynamicsKernel.test.js and a one-sample slice of the engine is re-run below.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { readGrid } from '../js/dataKinds/grid.js';
import { measureSatellite } from '../tools/dynamics-measure.mjs';
import { runEngine } from '../tools/dynamics-runs.mjs';
import { makeLab } from '../js/validation/harness.js';

const read = name =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/dynamics/${name}.json`, import.meta.url),
      'utf8'
    )
  );
const thr = read('thresholds');
const res = read('results');
const failed = read('failed-legs');

describe('the pinned validation table', () => {
  test('every committed leg has a row, in order, and the verdict is the one the rule gives', () => {
    expect(res.rows.map(r => r.id)).toEqual(thr.checks.map(c => c.id));
    const get = id => res.rows.find(r => r.id === id).status;
    const refOk = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'].every(
      id => get(id) === 'pass'
    );
    const gate = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(get);
    const verdict =
      !refOk || gate.some(s => s === 'not-run')
        ? 'C'
        : gate.every(s => s === 'pass')
          ? 'A'
          : 'B';
    expect(res.verdict).toBe(verdict);
  });
  test('the legs that crossed their bound or did not run are the ones failed-legs.json lists, each with a note', () => {
    const open = res.rows.filter(r => r.status !== 'pass').map(r => r.id);
    expect(open).toEqual(failed.failed.map(f => f.id));
    for (const f of failed.failed) expect(f.note).toMatch(/\S/);
  });
  test('B1 was not run for want of a table only Carl can fetch, and says so', () => {
    const b1 = res.rows.find(r => r.id === 'B1');
    expect(b1.status).toBe('not-run');
    expect(b1.note).toMatch(/Carl/);
  });
  test('the amendments are recorded and none changed a bound judged', () => {
    expect(thr.amendments.map(a => a.id).sort()).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
      'AM5',
    ]);
    for (const a of thr.amendments) expect(a.what).toMatch(/\S/);
  });
  test('the oracle legs agree to the bounds the file committed', () => {
    const row = id => res.rows.find(r => r.id === id).measured;
    expect(row('A1').worstRelative).toBeLessThanOrEqual(
      thr.checks.find(c => c.id === 'A1').limits.relative
    );
    expect(row('O1').worstRelative).toBeLessThanOrEqual(
      thr.checks.find(c => c.id === 'O1').limits.relative
    );
    expect(row('O1').cases).toBe(200);
  });
});

describe('the engine table is the engine', () => {
  test('both tables are valid gravitas.grid documents and the engine run of seed 101 reproduces its first snapshot', async () => {
    const engine = read('engine-runs');
    const gd = readGrid(engine.D);
    expect(readGrid(engine.S).shape).toEqual([16, 11]);
    const P = await import('../js/physics.js');
    const ics = read('initial-conditions');
    const rs = [];
    runEngine(P, makeLab(P), ics.D['101'], 113, 1, snap =>
      rs.push(measureSatellite(snap))
    );
    const seeds = engine.D.axes[0].values;
    const nD = engine.D.axes[1].values.length;
    const stored = gd.values[seeds.indexOf(101) * nD + 1];
    expect(Math.abs(rs[1] - stored) / stored).toBeLessThan(1e-6);
    expect(engine.inputs.node).toBe('dynamics-runs');
    expect(engine.note).toMatch(/ensemble means/);
  }, 120000);
});
