// =============================================================================
// Cluster fitting at a fixed metallicity (Roadmap III, Prompt 219 Part A)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/cluster-fit/thresholds.json, committed
// before the kernel existed. The quick legs (analytic, interpolation, synthetic truth,
// the independent oracle's pinned results, the error model) run live through
// tools/cluster-fit-validate.mjs in a child process; the ensemble legs (coverage, the
// refusals, the misspecified clusters, NGC 2420) take about fifteen CPU-minutes, so
// their table is pinned in tests/fixtures/cluster-fit/results.json by
// `node tools/cluster-fit-validate.mjs --write-results` and held here against
// failed-legs.json: a leg that crossed its bound is recorded there, this test holds that
// it still fails and that nothing else does, and that an interval whose coverage leg
// failed is not presented (PRESENTED in the kernel).
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import * as K from '../js/kernels/clusters/index.js';
import * as MIST from '../js/data/observations/mistSdssIsochrones.js';
import { tableOf } from '../js/tableObservation.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { starsOf, guideDocument } from '../js/observatory/clusterPanel.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/cluster-fit/thresholds.json');
const FAILED = read('tests/fixtures/cluster-fit/failed-legs.json');
const PINNED = read('tests/fixtures/cluster-fit/results.json').rows;
const set = K.parseIsochrones(tableOf(MIST));

describe('the committed thresholds', () => {
  test('every check of the contract is present, and no bound has moved', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.imf',
      'A2.colourRow',
      'A3.normalisation',
      'A4.deviance',
      'A5.shiftLaws',
      'A6.interpolationExact',
      'A7.interpolationLOO',
      'A8.syntheticTruth',
      'B1.binnedAgreement',
      'B2.unbinned',
      'B3.posteriorWidth',
      'C1.coverageAge',
      'C2.coverageDm',
      'C3.coverageBinaries',
      'C4.recovery',
      'C5.valley',
      'D1.tooFew',
      'D2.fieldOnly',
      'D3.wrongMetallicity',
      'D4.wrongReddening',
      'D5.wrongContamination',
      'D6.edge',
      'E1.ngc2420',
      'E2.errorModel',
      'P1.speed',
    ]);
    expect(THR.amendments.every(a => a.boundMoved === false)).toBe(true);
  });
});

describe('the pinned table of the ensemble legs', () => {
  test('every committed leg has a row (the reported ones as reports)', () => {
    expect(PINNED.map(r => r.id)).toEqual(
      expect.arrayContaining(THR.checks.map(c => c.id))
    );
  });
  test('only the recorded legs fail', () => {
    expect(
      PINNED.filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    ).toEqual(FAILED.failed.map(f => f.id).sort());
  });
  test('an interval whose coverage leg failed is not presented', () => {
    const failed = id => PINNED.find(r => r.id === id).status === 'fail';
    if (failed('C1.coverageAge')) expect(K.PRESENTED.logAge).toBe(false);
    if (failed('C2.coverageDm')) expect(K.PRESENTED.dm).toBe(false);
    if (!failed('C1.coverageAge')) expect(K.PRESENTED.logAge).toBe(true);
    if (!failed('C2.coverageDm')) expect(K.PRESENTED.dm).toBe(true);
  });
});

describe('the validation table, the quick legs (tools/cluster-fit-validate.mjs, in a child process)', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/cluster-fit-validate.mjs', '--json', '--only=A,B,E2,P1'],
      {
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    rows = JSON.parse(out).rows;
  }, 280_000);
  test('the analytic, interpolation and oracle legs pass or are the recorded failures', () => {
    for (const r of rows.filter(r => /^[AB]/.test(r.id)))
      if (!FAILED.failed.some(f => f.id === r.id))
        expect({ id: r.id, status: r.status }).toEqual({
          id: r.id,
          status: 'pass',
        });
  });
  test('the error model sits within a factor of two of the SDSS pack’s own errors', () => {
    expect(rows.find(r => r.id === 'E2.errorModel').status).toBe('pass');
  });
});

describe('the kernel', () => {
  const spec = {
    logAge: 9.3,
    dm: 12.06,
    feh: -0.25,
    E: 0.042,
    N: 200,
    epsTrue: 0.15,
  };
  test('a synthetic cluster is recovered, with a record that validates and says what it assumes', () => {
    const d = K.drawCluster(set, spec, 'jest-1');
    expect(d.truth.origin).toBe('synthetic');
    const r = K.fitCluster(set, d.g, d.colour, { feh: -0.25 });
    expect(r.status).toBe('ok');
    expect(Math.abs(r.best.logAge - 9.3)).toBeLessThan(0.06);
    expect(Math.abs(r.best.dm - 12.06)).toBeLessThan(0.1);
    expect(r.correlation).toBeLessThan(0);
    const rec = K.clusterRecord(r, {
      source: { kind: 'forward-model', id: 'jest-1' },
    });
    expect(validateArtifact(rec)).toEqual([]);
    const q = id => rec.quantities.find(x => x.id === id);
    expect(q('feh').origin).toBe('fixed');
    expect(q('logAge').origin).toBe('fitted');
    expect(rec.provenance.reductions.join(' ')).toMatch(/Single stars/);
    expect(rec.fit.model.id).toBe(K.MODEL_ID);
  }, 60_000);
  test('too few stars, or no cluster at all, is not constrained and gives no age', () => {
    const few = K.drawCluster(set, { ...spec, N: 30 }, 'jest-few');
    const a = K.fitCluster(set, few.g, few.colour, { feh: -0.25 });
    expect([a.status, a.reason]).toEqual(['not-constrained', 'members']);
    expect(a.best).toBeUndefined();
    const field = K.drawCluster(set, { ...spec, epsTrue: 1 }, 'jest-field');
    const b = K.fitCluster(set, field.g, field.colour, { feh: -0.25 });
    expect(b.status).toBe('not-constrained');
    expect(b.reason).toBe('no-cluster');
  }, 60_000);
  test('a grid is never extrapolated', () => {
    expect(() => K.isochroneAt(set, -0.25, 9.7)).toThrow(/never extrapolated/);
    expect(() => K.isochroneAt(set, 0.3, 9.3)).toThrow(/outside the grid/);
  });
  test('the panel reads g and g - r from a table, leaving out masked and missing rows', () => {
    const o = {
      columns: [
        { id: 'g', values: [15, 16, 17, NaN] },
        { id: 'r', values: [14.8, 15.6, 16.5, 16] },
      ],
      masks: [{ rows: [1] }],
    };
    const s = starsOf(o);
    expect(s.g).toEqual([15, 17]);
    expect(s.colour[0]).toBeCloseTo(0.2, 12);
    expect(starsOf({ columns: [{ id: 'g', values: [1] }] })).toBeNull();
  });
  test('the guide’s check finds the fit in the shape of the fit panel’s document', () => {
    const doc = guideDocument({ best: { logAge: 9.3, dm: 12 } }, 'pack:x', {
      feh: -0.25,
    });
    expect(doc.results.fit.parameters.map(p => p.name)).toEqual([
      'logAge',
      'dm',
    ]);
    expect(doc.model.id).toBe(K.MODEL_ID);
    expect(doc.results.fit.derived[0].value).toBeCloseTo(10 ** 0.3, 12);
  });
});
