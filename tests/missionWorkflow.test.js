// =============================================================================
// Prompt 272: the window-and-budget workflow and its validation record
// -----------------------------------------------------------------------------
// MISSION_LAB_II.md is the record. This file holds:
//   - the contract: thresholds.json was committed first, no amendment is in it,
//     and every leg of the table names its tier;
//   - the kernel: the ledger, its refusals, the grid in row ranges, the
//     workflow on a real ephemeris;
//   - the table: the legs evaluated live (tests/fixtures/mission-lab-ii/legs.mjs
//     against the pinned oracle output) equal the pinned results.json row for
//     row, and the verdict is the one recorded. A failing leg is a failing leg
//     here too: the test pins it, it never softens it.
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { evaluate, load } from './fixtures/mission-lab-ii/legs.mjs';
import {
  LEDGER_ROWS,
  NOT_FOR,
  budgetLedger,
  fillRow,
  ledgerProblems,
  missionWorkflow,
} from '../js/mission/workflow.js';
import { statesFrom } from '../js/mission/solar.js';
import { ephemeris } from '../js/mission/labReferences.js';
import { jdOfDate, JD_J2000 } from '../js/mission/ephemeris.js';
import { computeWindow } from '../js/mission/window.js';
import { createPool } from '../js/workers/pool.js';
import { DEFAULT_WINDOW } from '../js/mission/lab/curriculum.js';

const dir = new URL('./fixtures/mission-lab-ii/', import.meta.url);
const pinned = JSON.parse(readFileSync(new URL('results.json', dir), 'utf8'));
const doc = readFileSync(
  new URL('../MISSION_LAB_II.md', import.meta.url),
  'utf8'
);

const base = {
  from: 'earth',
  to: 'mars',
  parkingAltitudeKm: 300,
  captureOrbit: { periapsisAltitudeKm: 300, apoapsisRadiusKm: 20000 },
  launchLossesKmS: 1.5,
  correctionsKmS: 0.05,
  dryKg: 1000,
  ispS: 320,
};

describe('the contract', () => {
  const { T } = load();
  test('it names every leg of the prompt and carries one amendment, which moved no bound', () => {
    expect(T.amendments.map(a => [a.id, a.boundMoved])).toEqual([
      ['AM1', false],
    ]);
    expect(T.legs.map(l => l.id)).toEqual([
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'A9',
      'B1',
      'B2a',
      'B2b',
      'B2c',
      'B3',
      'B4',
      'C',
      'D1',
      'D2',
      'D3',
    ]);
    expect(T.committed).toMatch(/alone and first/);
  });
  test('the oracle reads no Gravitas code', () => {
    const src = readFileSync(new URL('oracle.py', dir), 'utf8');
    expect(src).not.toMatch(/js\/mission|labReferences|\.mjs/);
    expect(src).not.toMatch(/^\s*(import|from)\s+(gravitas|mission)/m);
    expect(src).not.toMatch(/subprocess|node /);
  });
});

describe('the ledger', () => {
  const good = { ...base, vinfDeparture: 3, vinfArrival: 2.7 };
  test('it has the five rows in flight order, each saying what it assumes', () => {
    const L = budgetLedger(good);
    expect(L.ok).toBe(true);
    expect(L.rows.map(r => r.id)).toEqual([...LEDGER_ROWS]);
    expect(L.notFor).toBe(NOT_FOR);
    expect(L.rows[0].carriedBy).toBe('launcher');
    expect(L.rows.slice(1).every(r => r.carriedBy === 'spacecraft')).toBe(true);
    expect(L.rows.every(r => r.assumes.length > 20 && r.unit === 'km/s')).toBe(
      true
    );
    expect(L.rows[2].dvKmS).toBe(0.05);
  });
  test('a circular capture orbit makes the capture row zero', () => {
    const c = budgetLedger({
      ...good,
      captureOrbit: {
        periapsisAltitudeKm: 300,
        apoapsisRadiusKm: 3396.19 + 300,
      },
    });
    expect(c.ok).toBe(true);
    expect(Math.abs(c.rows[4].dvKmS)).toBeLessThan(1e-12);
  });
  test('a refusal carries problems and no numbers', () => {
    const r = budgetLedger({ ...good, dryKg: 0 });
    expect(r).toEqual({
      ok: false,
      status: 'refused',
      problems: [{ path: 'dryKg', code: 'value' }],
    });
    expect(ledgerProblems(null)).toEqual([{ path: '', code: 'input' }]);
  });
  test('the same input gives the same bytes', () => {
    expect(JSON.stringify(budgetLedger(good))).toBe(
      JSON.stringify(budgetLedger({ ...good }))
    );
  });
});

describe('the workflow on the pack', () => {
  const pack = statesFrom(ephemeris());
  const dep = jdOfDate('2026-11-20') - JD_J2000;
  test('one mission end to end: a transfer and its ledger', () => {
    const m = missionWorkflow({
      states: pack,
      departDay: dep,
      tofDays: 220,
      ...base,
    });
    expect(m.ok).toBe(true);
    expect(m.transfer.vinfDepartureKmS ** 2).toBeCloseTo(m.transfer.c3, 9);
    expect(m.ledger.rows[1].dvKmS).toBeGreaterThan(3);
    expect(m.ledger.propellantKg).toBeGreaterThan(m.ledger.dryKg);
  });
  test('a refused geometry gives a status and no ledger', () => {
    const { H } = load();
    const d = H.degenerate;
    const m = missionWorkflow({
      states: pack,
      departDay: d.departureJd - JD_J2000,
      tofDays: d.arrivalJd - d.departureJd,
      ...base,
    });
    expect(m.ok).toBe(false);
    expect(m.status).toBe('antipodal');
    expect('ledger' in m).toBe(false);
  });
  test('an arrival past the ephemeris is refused, not extrapolated', () => {
    const m = missionWorkflow({
      states: pack,
      span: { startDay: 0, stopDay: dep + 100 },
      departDay: dep,
      tofDays: 220,
      ...base,
    });
    expect(m.problems).toEqual([{ path: 'departDay', code: 'outOfRange' }]);
  });
});

describe('the grid on the Worker pool (Prompt 153 contract)', () => {
  jest.setTimeout(120000);
  // A realm that computes its row range in this thread, as a real Worker would.
  const spawn = () => {
    const w = {
      terminate() {},
      postMessage(msg) {
        const { from, to } = msg;
        const nt = DEFAULT_WINDOW.tofSteps;
        const out = {
          c3: new Float64Array((to - from) * nt),
          vinf: new Float64Array((to - from) * nt),
          total: new Float64Array((to - from) * nt),
          status: new Uint8Array((to - from) * nt),
        };
        for (let r = from; r < to; r++)
          fillRow(DEFAULT_WINDOW, r, statesFrom(ephemeris()), out, from);
        Promise.resolve().then(() =>
          w.onmessage({
            data: {
              type: 'result',
              result: { index: msg.index, status: 'ok', cells: out },
            },
          })
        );
      },
    };
    return w;
  };
  test('row-range jobs joined are the whole window, in any finishing order', async () => {
    const nt = DEFAULT_WINDOW.tofSteps;
    const cuts = [0, 40, 41, 100, DEFAULT_WINDOW.departSteps];
    const jobs = cuts
      .slice(0, -1)
      .map((from, index) => ({ index, from, to: cuts[index + 1] }));
    const run = await createPool({ spawn, concurrency: 3 })
      .batch(jobs, {
        message: (job, ids) => ({
          ...ids,
          index: job.index,
          from: job.from,
          to: job.to,
        }),
        accept: (r, job) => r?.index === job.index && r.status === 'ok',
      })
      .run();
    expect(run.status).toBe('complete');
    expect(run.trials.map(t => t.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    const whole = computeWindow(DEFAULT_WINDOW, {
      states: statesFrom(ephemeris()),
    });
    run.trials.forEach((t, i) => {
      for (let k = 0; k < t.cells.total.length; k++) {
        const g = jobs[i].from * nt + k;
        expect(Object.is(t.cells.total[k], whole.total[g])).toBe(true);
        expect(t.cells.status[k]).toBe(whole.cellStatus[g]);
      }
    });
  });
});

describe('the table', () => {
  const live = evaluate();
  jest.setTimeout(120000);
  test('every leg equals the pinned record, row for row', () => {
    expect(live.legs.map(l => [l.id, l.status])).toEqual(
      pinned.legs.map(l => [l.id, l.status])
    );
    expect(JSON.parse(JSON.stringify(live.legs))).toEqual(pinned.legs);
    expect(live.verdict).toBe(pinned.verdict);
    expect(live.counts).toEqual(pinned.counts);
  });
  test('the legs not run are declared before the run and say why', () => {
    for (const id of ['B1', 'B4']) {
      const l = live.legs.find(x => x.id === id);
      expect(l.status).toBe('NOT RUN');
      expect(l.reason.length).toBeGreaterThan(60);
    }
  });
  test('the record states the verdict and every failing leg', () => {
    expect(doc).toContain(`verdict ${pinned.verdict}`);
    for (const l of pinned.legs.filter(x => x.status === 'fail'))
      expect(doc).toContain(l.id);
  });
});
